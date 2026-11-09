import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { BookInfo } from '../types/compendium';
import { AnnotationStroke, AnnotationToolType } from '../types/annotations';
import { confirmAction, showAlert } from '../utils/alert';
import { localPdfStorage, slugifyPdfName } from '../services/pdf/PdfAccessService';
import { GoogleDriveService } from '../services/sync/GoogleDriveService';
import { pageAnnotationsService } from '../services/annotations/pageAnnotationsService';
import { PageAnnotationOverlay } from './PageAnnotationOverlay';
import { AnnotationToolbar } from './AnnotationToolbar';
import {
  downloadPdfDocument,
  getCleanPdfUrl,
  getRawPdfUrl,
  getRenderedPdfPageUrl,
  isPdfServerConfigured,
  openPdfDocument,
} from '../utils/pdfUrl';
import {
  NativePdfReader,
  NativePdfReaderRef,
  isNativePdfReaderAvailable,
} from './pdf/NativePdfReader';
import { resolveNativePdfUri } from '../utils/nativePdfSource';

export type PdfViewerMode = 'pdf_scroll' | 'pdf_page' | 'pdf_native' | 'text';

interface PdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  book: BookInfo | null;
  initialPage?: number;
  highlightTerm?: string;
  initialMode?: PdfViewerMode;
}

// Cache global em memória de documentos PDF.js já abertos na sessão Web
const pdfDocsCache: Record<string, any> = {};

/**
 * Limpa instâncias de documentos PDF.js mantidas em cache na memória da aplicação,
 * garantindo liberação de memória RAM quando um PDF for excluído ou descarregado.
 */
export function clearPdfJsCache(bookId?: string, fileName?: string): void {
  const keysToDelete: string[] = [];
  if (bookId) keysToDelete.push(bookId);
  if (fileName) {
    keysToDelete.push(fileName);
    keysToDelete.push(slugifyPdfName(fileName));
  }
  if (!bookId && !fileName) {
    keysToDelete.push(...Object.keys(pdfDocsCache));
  }

  for (const key of keysToDelete) {
    if (pdfDocsCache[key]) {
      try {
        pdfDocsCache[key].destroy?.();
      } catch {}
      delete pdfDocsCache[key];
    }
  }
}
let pdfJsLoadPromise: Promise<any> | null = null;

const PDFJS_CDN_SCRIPT = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_CDN_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadScriptTag(src: string): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

function ensurePdfJsLoaded(): Promise<any> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('PDF.js disponível apenas na Web'));
  }

  const win = window as any;
  if (win.pdfjsLib) {
    return Promise.resolve(win.pdfjsLib);
  }

  if (pdfJsLoadPromise) {
    return pdfJsLoadPromise;
  }

  pdfJsLoadPromise = (async () => {
    try {
      await loadScriptTag('/pdfjs/pdf.min.js');
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        return win.pdfjsLib;
      }
    } catch {
      // Fallback automático para CDN oficial caso o middleware local não esteja servindo /pdfjs/
    }

    try {
      await loadScriptTag(PDFJS_CDN_SCRIPT);
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN_WORKER;
        return win.pdfjsLib;
      }
    } catch (err) {
      pdfJsLoadPromise = null;
      throw err;
    }

    pdfJsLoadPromise = null;
    throw new Error('Falha ao inicializar window.pdfjsLib');
  })();

  return pdfJsLoadPromise;
}

async function getOrLoadPdfJsDocument(
  fileName: string,
  bookId?: string,
  driveFileId?: string
): Promise<any> {
  const pdfjsLib = await ensurePdfJsLoaded();
  const cacheKey = bookId || fileName;
  if (pdfDocsCache[cacheKey]) {
    return pdfDocsCache[cacheKey];
  }

  // 1. Tenta carregar os bytes diretamente do armazenamento local offline
  let bytes: Uint8Array | null = null;
  const effectiveId = bookId || slugifyPdfName(fileName);
  if (effectiveId) {
    try {
      bytes = await localPdfStorage.getPdfBytes(effectiveId);
    } catch {}
  }
  if (!bytes) {
    try {
      bytes = await localPdfStorage.getPdfBytes(fileName);
    } catch {}
  }

  // 2. Se o usuário fez upload anteriormente e o arquivo está salvo na pasta oculta (appDataFolder) do seu Drive
  if (!bytes && driveFileId && GoogleDriveService.getInstance().getAuthState().isAuthenticated) {
    try {
      bytes = await GoogleDriveService.getInstance().downloadPdfFromDrive(driveFileId);
      if (bytes && bytes.length > 0) {
        await localPdfStorage.savePdfOffline(effectiveId || fileName, fileName, bytes);
      }
    } catch (e) {
      console.warn('[PdfViewer] Falha ao recuperar PDF do Drive protegido:', e);
    }
  }

  // 3. Se temos os bytes do arquivo enviado pelo usuário, renderiza direto na memória sem precisar de servidor
  if (bytes && bytes.length > 0) {
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      disableAutoFetch: false,
      disableStream: true,
    });
    const doc = await loadingTask.promise;
    pdfDocsCache[cacheKey] = doc;
    return doc;
  }

  // Se temos um objectUrl local persistido (Blob no IndexedDB)
  const localBlobUrl =
    localPdfStorage.getPdfObjectUrlByFileNameSync(fileName) ||
    (effectiveId ? localPdfStorage.getPdfObjectUrlSync(effectiveId) : null);
  if (localBlobUrl) {
    const loadingTask = pdfjsLib.getDocument({
      url: localBlobUrl,
      disableAutoFetch: false,
      disableStream: true,
    });
    const doc = await loadingTask.promise;
    pdfDocsCache[cacheKey] = doc;
    return doc;
  }

  // 4. Fallback: Se não houver bytes locais, tenta a URL direta (do servidor ativo)
  const cleanUrl = getCleanPdfUrl(fileName);
  if (cleanUrl) {
    // Na Web (Desktop): Tenta baixar e salvar no IndexedDB
    if (Platform.OS === 'web') {
      try {
        const res = await fetch(cleanUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (buf && buf.byteLength > 100) {
            bytes = new Uint8Array(buf);
            await localPdfStorage.savePdfOffline(effectiveId || fileName, fileName, bytes);
            const loadingTask = pdfjsLib.getDocument({
              data: bytes,
              disableAutoFetch: false,
              disableStream: true,
            });
            const doc = await loadingTask.promise;
            pdfDocsCache[cacheKey] = doc;
            return doc;
          }
        }
      } catch {}
    }

    const loadingTask = pdfjsLib.getDocument({
      url: cleanUrl,
      disableAutoFetch: true,
      disableStream: false,
      rangeChunkSize: 65536 * 4,
    });
    const doc = await loadingTask.promise;
    pdfDocsCache[cacheKey] = doc;
    return doc;
  }

  throw new Error(`PDF não disponível localmente para ${fileName}`);
}

interface PdfScrollPageItemProps {
  bookFileName: string;
  bookTitle: string;
  bookId?: string;
  driveFileId?: string;
  pageNumber: number;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
  containerHeight: number;
  dpi: number;
  zoom: number;
  sectionTitle?: string;
  pageText?: string;
  colors: ThemeColors;
  styles: any;
  screenWidth: number;
  isMaximized?: boolean;
  onImageLoaded?: (width: number, height: number) => void;
  onOpenExternalPdf?: () => void;
  onSelectPageForSingleView?: (page: number) => void;
}

const PdfScrollPageItem: React.FC<PdfScrollPageItemProps> = React.memo(({
  bookFileName,
  bookTitle,
  bookId,
  driveFileId,
  pageNumber,
  pageCount,
  pageWidth,
  pageHeight,
  containerHeight,
  dpi,
  zoom,
  sectionTitle,
  pageText,
  colors,
  styles,
  screenWidth,
  isMaximized = false,
  onImageLoaded,
  onOpenExternalPdf,
  onSelectPageForSingleView,
}) => {
  const isServerConfigured = isPdfServerConfigured();
  const rawImageUrl = useMemo(
    () => (isServerConfigured ? getRenderedPdfPageUrl(bookFileName, pageNumber, dpi) : ''),
    [bookFileName, pageNumber, dpi, isServerConfigured]
  );
  const [retryKey, setRetryKey] = useState(0);
  const hasImageSource = Boolean(rawImageUrl);
  const [loading, setLoading] = useState(() => (hasImageSource || Platform.OS === 'web'));
  const [error, setError] = useState(() => (!hasImageSource && Platform.OS !== 'web'));
  const [webCanvasReady, setWebCanvasReady] = useState(false);
  const [scrollStrokes, setScrollStrokes] = useState<AnnotationStroke[]>([]);
  const itemCanvasRef = useRef<any>(null);

  // No Android APK / offline: se não há servidor gráfico configurado ou a URL da imagem é vazia,
  // finaliza imediatamente o loading para evitar trava infinita e exibe a folha de texto oficial.
  useEffect(() => {
    if (Platform.OS !== 'web' && (!isServerConfigured || !rawImageUrl)) {
      setLoading(false);
      setError(true);
    }
  }, [isServerConfigured, rawImageUrl]);

  // Timeout de segurança no mobile para nunca travar a rolagem se a imagem demorar
  useEffect(() => {
    if (loading && !error && Platform.OS !== 'web') {
      const timer = setTimeout(() => {
        setLoading(false);
        setError(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, error]);

  useEffect(() => {
    if (!bookId || pageNumber < 1) return;
    let isMounted = true;
    pageAnnotationsService.getPageAnnotations(bookId, pageNumber).then((strokes) => {
      if (isMounted) setScrollStrokes(strokes);
    });
    return () => {
      isMounted = false;
    };
  }, [bookId, pageNumber]);

  const imageUrl = useMemo(
    () => (rawImageUrl ? `${rawImageUrl}${retryKey > 0 ? `&retry=${retryKey}` : ''}` : ''),
    [rawImageUrl, retryKey]
  );

  // Na Web, renderiza diretamente o PDF do usuário via PDF.js <canvas> sem precisar de servidor
  useEffect(() => {
    if (Platform.OS !== 'web' || !bookFileName) return;
    if (rawImageUrl && !error) return;
    let cancelled = false;
    let renderTask: any = null;

    (async () => {
      try {
        setLoading(true);
        const pdfDoc = await getOrLoadPdfJsDocument(bookFileName, bookId, driveFileId);
        if (cancelled) return;
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        if (baseViewport.width && baseViewport.height && onImageLoaded) {
          onImageLoaded(baseViewport.width, baseViewport.height);
        }
        const canvas: HTMLCanvasElement | null = itemCanvasRef.current;
        if (!canvas) return;
        const scale = pageWidth / (baseViewport.width || pageWidth);
        const dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
        if (!cancelled) {
          setWebCanvasReady(true);
          setLoading(false);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [error, rawImageUrl, bookFileName, pageNumber, pageWidth, retryKey]);

  const showFallbackTextSheet = (error || !rawImageUrl) && !webCanvasReady && !loading;

  return (
    <View style={[styles.scrollPageWrap, { height: containerHeight }]}>
      {!isMaximized && (
        <View style={[styles.scrollPageHeader, { width: Math.min(pageWidth, screenWidth - 24) }]}>
          <View style={styles.scrollPageBadge}>
            <Ionicons name="document-text-outline" size={13} color={colors.primary} />
            <Text style={styles.scrollPageBadgeText}>
              Página {pageNumber} de {pageCount}
            </Text>
          </View>
          {sectionTitle ? (
            <Text style={styles.scrollPageSectionText} numberOfLines={1}>
              {sectionTitle}
            </Text>
          ) : null}
          {!isServerConfigured && (
            <View style={styles.scrollPageOfflinePill}>
              <Text style={styles.scrollPageOfflinePillText}>Integrado</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.scrollPagePaper, { width: pageWidth, height: pageHeight }]}>
        {Boolean(imageUrl) && !error ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: pageWidth, height: pageHeight }}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoad={(e) => {
              setLoading(false);
              const src = e.nativeEvent?.source;
              if (src?.width && src?.height && onImageLoaded) {
                onImageLoaded(src.width, src.height);
              }
            }}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        ) : null}

        {Platform.OS === 'web' &&
          error &&
          React.createElement('canvas', {
            ref: itemCanvasRef,
            style: {
              display: webCanvasReady ? 'block' : 'none',
              maxWidth: '100%',
              maxHeight: '100%',
            },
          })}

        {loading && (!error || Platform.OS === 'web') && !webCanvasReady && (
          <View style={styles.scrollPageLoadingOverlay}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.scrollPageLoadingText}>Carregando página {pageNumber}...</Text>
          </View>
        )}

        {Boolean(bookId) && scrollStrokes.length > 0 && (
          <PageAnnotationOverlay
            bookId={bookId!}
            pageNumber={pageNumber}
            width={pageWidth}
            height={pageHeight}
            strokes={scrollStrokes}
            onStrokesChange={() => {}}
            isDrawingActive={false}
            readOnly={true}
            currentTool="pen"
            currentColor="#EF4444"
            currentWidth={3}
          />
        )}

        {showFallbackTextSheet && !loading && (
          <View style={[styles.scrollPageFallbackBox, { width: pageWidth, height: pageHeight }]}>
            <View style={styles.scrollPageFallbackHeader}>
              <View style={styles.scrollPageFallbackBadge}>
                <Ionicons name="book-outline" size={14} color={colors.primary} />
                <Text style={styles.scrollPageFallbackBadgeText}>
                  {bookTitle} • Pág. {pageNumber}
                </Text>
              </View>
              {sectionTitle ? (
                <Text style={styles.scrollPageFallbackSection} numberOfLines={1}>
                  {sectionTitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.scrollPageFallbackScroll}>
              <Text
                style={[
                  styles.scrollPageFallbackBody,
                  {
                    fontSize: Math.max(12, Math.min(18, Math.round(13 * zoom))),
                    lineHeight: Math.max(18, Math.min(26, Math.round(20 * zoom))),
                  },
                ]}
                numberOfLines={Math.max(8, Math.floor((pageHeight - 110) / Math.max(18, Math.round(20 * zoom))))}
              >
                {pageText ||
                  'Esta página consiste em arte, capa, mapa ou diagrama oficial do livro.'}
              </Text>
            </View>

            <View style={styles.scrollPageFallbackFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {onSelectPageForSingleView && (
                  <TouchableOpacity
                    style={styles.scrollPageConfigServerBtn}
                    onPress={() => onSelectPageForSingleView(pageNumber)}
                  >
                    <Ionicons name="reader-outline" size={13} color={colors.primary} />
                    <Text style={styles.scrollPageConfigServerText}>Ler Página Inteira</Text>
                  </TouchableOpacity>
                )}

                {onOpenExternalPdf && (
                  <TouchableOpacity
                    style={styles.scrollPageRetryBtn}
                    onPress={onOpenExternalPdf}
                  >
                    <Ionicons name="open-outline" size={13} color={colors.text} />
                    <Text style={styles.scrollPageRetryText}>Abrir Leitor In-App</Text>
                  </TouchableOpacity>
                )}

                {isServerConfigured && (
                  <TouchableOpacity
                    style={styles.scrollPageRetryBtn}
                    onPress={() => {
                      setError(false);
                      setLoading(true);
                      setRetryKey((k) => k + 1);
                    }}
                  >
                    <Ionicons name="reload-outline" size={13} color={colors.text} />
                    <Text style={styles.scrollPageRetryText}>Recarregar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

export function renderFormattedBookText(
  rawText: string | undefined,
  zoom: number,
  colors: ThemeColors,
  styles: any
) {
  const text = (rawText || '').trim();
  if (!text) {
    return (
      <View style={styles.textEmptyStateWrap}>
        <Ionicons name="image-outline" size={28} color={colors.textMuted} />
        <Text style={[styles.textModeContent, { fontSize: Math.max(13, Math.round(14 * zoom)), textAlign: 'center' }]}>
          Esta página consiste em arte, capa, mapa ou diagrama oficial do livro sem camada textual extraível.
        </Text>
      </View>
    );
  }

  const lines = text.split('\n');
  return (
    <View style={styles.formattedTextContainer}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <View key={`spacer_${idx}`} style={{ height: 6 }} />;
        }

        const isHeading =
          trimmed.length <= 65 &&
          trimmed === trimmed.toUpperCase() &&
          /[A-ZÀ-Ú]/.test(trimmed) &&
          !/^\d+$/.test(trimmed) &&
          !trimmed.startsWith('PÁG') &&
          !trimmed.startsWith('PAG');

        if (isHeading) {
          return (
            <View key={`heading_${idx}`} style={styles.formattedHeadingWrap}>
              <View style={styles.formattedHeadingBar} />
              <Text
                style={[
                  styles.formattedHeadingText,
                  {
                    fontSize: Math.max(14, Math.round(16 * zoom)),
                    lineHeight: Math.max(20, Math.round(23 * zoom)),
                  },
                ]}
                selectable
              >
                {trimmed}
              </Text>
            </View>
          );
        }

        return (
          <Text
            key={`line_${idx}`}
            style={[
              styles.formattedParaText,
              {
                fontSize: Math.max(12, Math.round(14 * zoom)),
                lineHeight: Math.max(19, Math.round(23 * zoom)),
              },
            ]}
            selectable
          >
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  visible,
  onClose,
  book,
  initialPage = 1,
  highlightTerm = '',
  initialMode = 'pdf_scroll',
}) => {
  const { getBookPage, searchInBookPages, openManual, deletePdfBook } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const hasDirectPdf = Boolean(
    book?.hasLocalPdf ||
    book?.localPdfAvailable ||
    book?.driveFileId ||
    book?.driveSynced ||
    book?.pdfUrl ||
    (book?.id ? localPdfStorage.hasPdfOffline(book.id) : false) ||
    (book?.fileName ? localPdfStorage.getLocalPdfFileUriByFileNameSync(book.fileName) : false)
  );
  const serverConfigured = isPdfServerConfigured();
  const computedInitialMode: PdfViewerMode =
    !hasDirectPdf && !serverConfigured && Platform.OS !== 'web' && (initialMode === 'pdf_scroll' || initialMode === 'pdf_page')
      ? 'text'
      : initialMode;

  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [viewMode, setViewMode] = useState<PdfViewerMode>(computedInitialMode);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [pageInputText, setPageInputText] = useState<string>(String(initialPage || 1));
  const [showTocList, setShowTocList] = useState<boolean>(false);
  const [showInBookSearch, setShowInBookSearch] = useState<boolean>(false);
  const [inBookQuery, setInBookQuery] = useState<string>(highlightTerm);

  // Estados de anotações desenhadas na página (Tablet, Stylus e Gestos)
  const [isAnnotationModeActive, setIsAnnotationModeActive] = useState<boolean>(false);
  const [currentTool, setCurrentTool] = useState<AnnotationToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>('#EF4444');
  const [currentWidth, setCurrentWidth] = useState<number>(3.5);
  const [currentPageStrokes, setCurrentPageStrokes] = useState<AnnotationStroke[]>([]);
  const [annotatedPages, setAnnotatedPages] = useState<number[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationStroke[][]>([]);

  // Estados de carregamento e dimensões da página
  const [imageLoading, setImageLoading] = useState<boolean>(serverConfigured);
  const [imageError, setImageError] = useState<boolean>(!serverConfigured);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [canvasLoading, setCanvasLoading] = useState<boolean>(false);
  const [pageAspect, setPageAspect] = useState<number>(1211 / 1625);

  const canvasRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const flatListRef = useRef<FlatList<number>>(null);
  const textFlatListRef = useRef<FlatList<number>>(null);
  const isScrollingProgrammatically = useRef<boolean>(false);
  const [textLayout, setTextLayout] = useState<'scroll' | 'page'>('scroll');

  // Estados e ref para o leitor de PDF nativo offline (Android / iOS)
  const [nativePdfUri, setNativePdfUri] = useState<string | null>(null);
  const [isResolvingNativePdf, setIsResolvingNativePdf] = useState<boolean>(false);
  const [nativePdfFailed, setNativePdfFailed] = useState<boolean>(false);
  const [totalNativePages, setTotalNativePages] = useState<number | null>(null);
  const nativeReaderRef = useRef<NativePdfReaderRef>(null);
  const hasInitialNativeLoadRef = useRef<boolean>(false);

  const useNativeReader = Boolean(
    Platform.OS !== 'web' &&
    isNativePdfReaderAvailable &&
    nativePdfUri &&
    !nativePdfFailed &&
    (viewMode === 'pdf_scroll' || viewMode === 'pdf_page' || viewMode === 'pdf_native')
  );

  const totalPages = Math.max(1, book?.pageCount || 1);
  const effectiveTotalPages = totalNativePages && totalNativePages > 0 ? totalNativePages : totalPages;
  const safeCurrentPage = Math.max(1, Math.min(effectiveTotalPages, currentPage || 1));
  const currentPageRef = useRef<number>(safeCurrentPage);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    currentPageRef.current = safeCurrentPage;
  }, [safeCurrentPage]);

  // Resolução da URI local do PDF nativo em plataformas móveis
  useEffect(() => {
    if (!visible || !book || Platform.OS === 'web') {
      setNativePdfUri(null);
      setIsResolvingNativePdf(false);
      setNativePdfFailed(false);
      setTotalNativePages(null);
      return;
    }

    let isMounted = true;
    setIsResolvingNativePdf(true);
    setNativePdfFailed(false);

    resolveNativePdfUri(book)
      .then((resolvedUri) => {
        if (!isMounted) return;
        setNativePdfUri(resolvedUri);
        setIsResolvingNativePdf(false);
        if (resolvedUri) {
          if (initialMode === 'pdf_scroll' || initialMode === 'pdf_page' || initialMode === 'pdf_native') {
            setViewMode((prev) => (prev === 'text' ? initialMode : prev));
          }
        } else if (!isPdfServerConfigured() && (viewMode === 'pdf_scroll' || viewMode === 'pdf_page' || viewMode === 'pdf_native')) {
          setViewMode('text');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[PdfViewerModal] Erro ao resolver URI do PDF nativo:', err);
        setNativePdfUri(null);
        setNativePdfFailed(true);
        setIsResolvingNativePdf(false);
        if (!isPdfServerConfigured()) {
          setViewMode('text');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, book?.id, book?.fileName]);

  // Abertura segura de PDF externo (Android Scoped Storage / Content URI / Web)
  const handleOpenExternalPdf = useCallback(async () => {
    if (!book) return;

    // 1. Tenta abrir o arquivo local offline do dispositivo via Sharing ou Linking
    let fileUri = nativePdfUri;
    if (!fileUri && Platform.OS !== 'web') {
      try {
        fileUri = await resolveNativePdfUri(book);
      } catch {}
    }

    if (fileUri && Platform.OS !== 'web') {
      try {
        let shareUri = fileUri;
        // No Android, converte file:// para content:// via FileSystem para evitar FileUriExposedException
        if (
          Platform.OS === 'android' &&
          shareUri.startsWith('file://') &&
          typeof (FileSystem as any)?.getContentUriAsync === 'function'
        ) {
          try {
            shareUri = await (FileSystem as any).getContentUriAsync(shareUri);
          } catch (contentUriError) {
            console.warn('[PdfViewerModal] getContentUriAsync falhou, usando fileUri:', contentUriError);
            shareUri = fileUri;
          }
        }

        const canShare = await Sharing.isAvailableAsync().catch(() => false);
        if (canShare) {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Abrir ${book.title}`,
            UTI: 'com.adobe.pdf',
          });
          return;
        }

        const canOpen = await Linking.canOpenURL(shareUri).catch(() => false);
        if (canOpen) {
          await Linking.openURL(shareUri);
          return;
        }
      } catch (shareErr) {
        console.warn('[PdfViewerModal] Erro ao abrir PDF local com visualizador externo:', shareErr);
      }
    }

    // 2. Fallback geral para openPdfDocument (Web, servidor local HTTP ou Google Drive)
    try {
      await openPdfDocument(book.fileName, safeCurrentPage, book.driveFileId);
    } catch (e) {
      console.warn('[PdfViewerModal] Falha ao abrir documento externo:', e);
      showAlert(
        'Não foi possível abrir o PDF',
        'Verifique se há um aplicativo leitor de PDF instalado no dispositivo.'
      );
    }
  }, [book, nativePdfUri, safeCurrentPage]);

  // Callbacks para o leitor de PDF nativo
  const handleNativePageChanged = useCallback((newPage: number, numberOfPages?: number) => {
    if (typeof newPage === 'number' && newPage > 0 && newPage !== currentPageRef.current) {
      currentPageRef.current = newPage;
      setCurrentPage(newPage);
      setPageInputText(String(newPage));
    }
    if (typeof numberOfPages === 'number' && numberOfPages > 0) {
      setTotalNativePages((prev) => (prev === numberOfPages ? prev : numberOfPages));
    }
  }, []);

  const handleNativeLoadComplete = useCallback((numberOfPages: number, _filePath: string) => {
    if (numberOfPages > 0) {
      setTotalNativePages((prev) => (prev === numberOfPages ? prev : numberOfPages));
    }
    if (currentPageRef.current > 1 && nativeReaderRef.current) {
      try {
        nativeReaderRef.current.setPage(currentPageRef.current);
      } catch {}
    }
  }, []);

  // Ajusta a página inicial caso o PDF nativo possua mais páginas que o metadado inicial do livro
  useEffect(() => {
    if (visible && book && totalNativePages && totalNativePages > 0 && !hasInitialNativeLoadRef.current) {
      hasInitialNativeLoadRef.current = true;
      if (initialPage && initialPage > (book.pageCount || 1)) {
        const reclamped = Math.max(1, Math.min(totalNativePages, Math.round(initialPage)));
        setCurrentPage(reclamped);
        currentPageRef.current = reclamped;
        setPageInputText(String(reclamped));
        if (nativeReaderRef.current) {
          try {
            nativeReaderRef.current.setPage(reclamped);
          } catch {}
        }
      }
    }
  }, [visible, book, totalNativePages, initialPage]);

  const handleNativeError = useCallback(
    (error: any) => {
      console.warn('[PdfViewerModal] Erro no leitor de PDF nativo:', error);
      setNativePdfFailed(true);
      setViewMode('text');
      confirmAction({
        title: 'Falha na Leitura do PDF',
        message:
          'Não foi possível renderizar o arquivo PDF no leitor integrado. Deseja abrir em um aplicativo externo?',
        confirmText: 'Abrir no Celular',
        cancelText: 'Ler Texto Oficial',
        onConfirm: () => {
          handleOpenExternalPdf();
        },
      });
    },
    [handleOpenExternalPdf]
  );

  // Garante que o modo de anotação seja desativado ao engajar o leitor nativo
  useEffect(() => {
    if (useNativeReader && isAnnotationModeActive) {
      setIsAnnotationModeActive(false);
    }
  }, [useNativeReader, isAnnotationModeActive]);

  const toggleMaximized = useCallback(() => {
    setIsMaximized((m) => !m);
  }, []);

  // Carrega os traços da página atual ao navegar ou abrir modal (apenas quando fora do leitor nativo)
  useEffect(() => {
    if (!book || useNativeReader) {
      setCurrentPageStrokes((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let isMounted = true;
    pageAnnotationsService.getPageAnnotations(book.id, safeCurrentPage).then((strokes) => {
      if (isMounted) {
        setCurrentPageStrokes(strokes);
        setUndoStack([]);
        setRedoStack([]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [book?.id, safeCurrentPage, useNativeReader]);

  // Carrega índice de páginas anotadas neste livro
  useEffect(() => {
    if (!book || useNativeReader) {
      setAnnotatedPages((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let isMounted = true;
    pageAnnotationsService.listAnnotatedPages(book.id).then((pages) => {
      if (isMounted) setAnnotatedPages(pages);
    });
    return () => {
      isMounted = false;
    };
  }, [book?.id, currentPageStrokes, useNativeReader]);

  const handleStrokesChange = useCallback(
    (newStrokes: AnnotationStroke[]) => {
      if (!book) return;
      setUndoStack((prev) => [...prev, currentPageStrokes]);
      setRedoStack([]);
      setCurrentPageStrokes(newStrokes);
      pageAnnotationsService.savePageAnnotations(book.id, safeCurrentPage, newStrokes);
    },
    [book, safeCurrentPage, currentPageStrokes]
  );

  const handleUndo = useCallback(() => {
    if (!book || undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, currentPageStrokes]);
    setCurrentPageStrokes(previous);
    pageAnnotationsService.savePageAnnotations(book.id, safeCurrentPage, previous);
  }, [book, safeCurrentPage, undoStack, currentPageStrokes]);

  const handleRedo = useCallback(() => {
    if (!book || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, currentPageStrokes]);
    setCurrentPageStrokes(next);
    pageAnnotationsService.savePageAnnotations(book.id, safeCurrentPage, next);
  }, [book, safeCurrentPage, redoStack, currentPageStrokes]);

  const handleClearPageAnnotations = useCallback(() => {
    if (!book) return;
    confirmAction({
      title: 'Limpar Anotações da Página',
      message: `Deseja realmente apagar todos os traços desenhados na Página ${safeCurrentPage}?`,
      confirmText: 'Limpar',
      cancelText: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        setUndoStack((prev) => [...prev, currentPageStrokes]);
        setRedoStack([]);
        setCurrentPageStrokes([]);
        await pageAnnotationsService.clearPageAnnotations(book.id, safeCurrentPage);
      },
    });
  }, [book, safeCurrentPage, currentPageStrokes]);

  const toggleAnnotationMode = useCallback(() => {
    if (useNativeReader) {
      showAlert(
        'Anotações Indisponíveis',
        'O recurso de anotações manuscritas não está disponível durante a leitura nativa de PDF.'
      );
      return;
    }
    if (!isAnnotationModeActive && viewMode === 'pdf_scroll') {
      setViewMode('pdf_page');
    }
    setIsAnnotationModeActive((prev) => !prev);
  }, [useNativeReader, isAnnotationModeActive, viewMode]);

  // Lista de páginas para o modo de rolagem contínua
  const pagesList = useMemo(() => {
    if (!book || !book.pageCount) return [];
    return Array.from({ length: book.pageCount }, (_, i) => i + 1);
  }, [book?.id, book?.pageCount]);

  // Dimensões dinâmicas seguras calculadas com base no zoom e aspect ratio
  const { width: rawWindowWidth } = useWindowDimensions();
  const screenWidth = Math.max(300, rawWindowWidth || 360);
  const isCompact = screenWidth < 480;
  const isVerySmall = screenWidth < 390;
  const isSmallScreen = screenWidth < 400;
  const isNarrow = screenWidth < 440;
  const safeAspect = pageAspect > 0.1 && Number.isFinite(pageAspect) ? pageAspect : 1211 / 1625;
  const pageHorizontalMargin = isMaximized ? 8 : 24;
  const pageMaxWidth = isMaximized ? Math.min(screenWidth - 8, 1200) : 880;
  const basePageWidth = Math.max(240, Math.min(screenWidth - pageHorizontalMargin, pageMaxWidth) * zoom);
  const basePageHeight = Math.max(320, basePageWidth / safeAspect);
  const targetDpi = zoom >= 1.5 ? 200 : 150;
  const PAGE_GAP = isMaximized ? 14 : 20;
  const HEADER_HEIGHT = isMaximized ? 0 : 36;
  const itemTotalHeight = Math.max(360, Math.round(basePageHeight + HEADER_HEIGHT + PAGE_GAP));

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: itemTotalHeight,
      offset: itemTotalHeight * index,
      index,
    }),
    [itemTotalHeight]
  );

  const scrollFlatListToPage = useCallback(
    (pageNum: number, animated: boolean) => {
      if (!flatListRef.current || !book) return;
      const clamped = Math.max(1, Math.min(book.pageCount || 1, Math.round(pageNum)));
      const offset = Math.max(0, (clamped - 1) * itemTotalHeight);
      try {
        flatListRef.current.scrollToOffset({
          offset,
          animated,
        });
      } catch {}
    },
    [book, itemTotalHeight]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      setTimeout(() => {
        if (!flatListRef.current) return;
        try {
          flatListRef.current.scrollToOffset({
            offset: Math.max(0, info.index * itemTotalHeight),
            animated: false,
          });
        } catch {}
      }, 50);
    },
    [itemTotalHeight]
  );

  // Monitora qual página está no centro de visão durante a rolagem contínua
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: number; isViewable: boolean }> }) => {
      if (isScrollingProgrammatically.current) return;
      if (viewableItems && viewableItems.length > 0) {
        const top = viewableItems[0];
        if (top && typeof top.item === 'number') {
          setCurrentPage(top.item);
          currentPageRef.current = top.item;
          setPageInputText(String(top.item));
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
  }).current;

  const goToPage = useCallback(
    (target: number, animated = true) => {
      if (!book) return;
      const clamped = Math.max(1, Math.min(effectiveTotalPages, Math.round(target)));
      const isFarJump = Math.abs(clamped - currentPageRef.current) > 2;
      const shouldAnimate = isFarJump ? false : animated;

      setCurrentPage(clamped);
      currentPageRef.current = clamped;
      setPageInputText(String(clamped));

      if (useNativeReader && nativeReaderRef.current) {
        try {
          nativeReaderRef.current.setPage(clamped);
        } catch {}
      }

      if (viewMode === 'pdf_scroll' && flatListRef.current) {
        isScrollingProgrammatically.current = true;
        scrollFlatListToPage(clamped, shouldAnimate);
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, shouldAnimate ? 400 : 120);
      } else if (viewMode === 'text' && textLayout === 'scroll' && textFlatListRef.current) {
        try {
          textFlatListRef.current.scrollToIndex({
            index: clamped - 1,
            animated: shouldAnimate,
          });
        } catch {}
      }
    },
    [book, effectiveTotalPages, useNativeReader, viewMode, scrollFlatListToPage, textLayout]
  );

  // Preserva estritamente a página atual ao alterar o zoom
  useEffect(() => {
    if (prevZoomRef.current !== zoom) {
      prevZoomRef.current = zoom;
      if (viewMode === 'pdf_scroll' && flatListRef.current) {
        isScrollingProgrammatically.current = true;
        const targetPage = currentPageRef.current;
        scrollFlatListToPage(targetPage, false);
        setCurrentPage(targetPage);
        setPageInputText(String(targetPage));

        const timer = setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 250);
        return () => clearTimeout(timer);
      }
    }
  }, [zoom, itemTotalHeight, viewMode, scrollFlatListToPage]);

  // Sincroniza página inicial e livro quando o modal abre
  useEffect(() => {
    if (visible && book) {
      hasInitialNativeLoadRef.current = false;
      const hasDirectPdf = Boolean(
        nativePdfUri ||
        book.hasLocalPdf ||
        book.localPdfAvailable ||
        book.driveFileId ||
        book.driveSynced ||
        book.pdfUrl ||
        (book.id ? localPdfStorage.hasPdfOffline(book.id) : false) ||
        (book.fileName ? localPdfStorage.getLocalPdfFileUriByFileNameSync(book.fileName) : false)
      );
      const isServerActive = isPdfServerConfigured();
      const targetMode: PdfViewerMode =
        !hasDirectPdf && !isServerActive && Platform.OS !== 'web' && (initialMode === 'pdf_scroll' || initialMode === 'pdf_page')
          ? 'text'
          : initialMode;
      setViewMode(targetMode);

      const clamped = Math.max(1, Math.min(effectiveTotalPages, Math.round(initialPage || 1)));
      setCurrentPage(clamped);
      currentPageRef.current = clamped;
      setPageInputText(String(clamped));
      setShowTocList(false);
      if (highlightTerm) {
        setInBookQuery(highlightTerm);
      }

      if (useNativeReader && nativeReaderRef.current) {
        try {
          nativeReaderRef.current.setPage(clamped);
        } catch {}
      }

      if (targetMode === 'pdf_scroll') {
        isScrollingProgrammatically.current = true;
        setTimeout(() => {
          scrollFlatListToPage(clamped, false);
          setTimeout(() => {
            isScrollingProgrammatically.current = false;
          }, 250);
        }, 80);
      }
    }
  }, [visible, book?.id, initialPage, initialMode]);

  // Garante posicionamento na página correta ao alternar para o modo de rolagem contínua
  useEffect(() => {
    if (viewMode === 'pdf_scroll' && visible && book && !useNativeReader) {
      isScrollingProgrammatically.current = true;
      setTimeout(() => {
        scrollFlatListToPage(currentPageRef.current, false);
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 250);
      }, 60);
    }
  }, [viewMode, useNativeReader]);

  useEffect(() => {
    setPageInputText(String(safeCurrentPage));
    if (useNativeReader) return;
    const url = book ? getRenderedPdfPageUrl(book.fileName, safeCurrentPage, targetDpi) : '';
    const hasValidImageUrl = Boolean(url);
    setImageLoading(hasValidImageUrl);
    setImageError(!hasValidImageUrl);
    setCanvasReady(false);
  }, [safeCurrentPage, book?.id, useNativeReader]);

  // Navegação hierárquica do botão Voltar (Android APK / Hardware Back Press)
  const handleBackNavigation = useCallback(() => {
    if (isAnnotationModeActive) {
      setIsAnnotationModeActive(false);
      return true;
    }
    if (showInBookSearch) {
      setShowInBookSearch(false);
      return true;
    }
    if (showTocList) {
      setShowTocList(false);
      return true;
    }
    if (isMaximized) {
      setIsMaximized(false);
      return true;
    }
    onClose();
    return true;
  }, [isAnnotationModeActive, showInBookSearch, showTocList, isMaximized, onClose]);

  // Intercepta botão de retorno físico no Android nativo
  useEffect(() => {
    if (Platform.OS === 'web' || typeof document !== 'undefined' || !visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackNavigation);
    return () => sub.remove();
  }, [visible, handleBackNavigation]);

  // Intercepta a seta de retorno do navegador na Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;

    const modalHistoryState = { modal: 'ordo-pdf-viewer', time: Date.now() };
    try {
      window.history?.pushState?.(modalHistoryState, '');
    } catch {}

    const handlePopState = () => {
      onClose();
    };

    try {
      window.addEventListener?.('popstate', handlePopState);
    } catch {}

    return () => {
      try {
        window.removeEventListener?.('popstate', handlePopState);
        if (window.history?.state?.modal === 'ordo-pdf-viewer') {
          window.history.back();
        }
      } catch {}
    };
  }, [visible, onClose]);

  // Atalhos de teclado na Web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !visible || !book) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToPage(safeCurrentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(safeCurrentPage - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMaximized();
      } else if (e.key === 'Escape') {
        if (isMaximized) {
          e.preventDefault();
          setIsMaximized(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, book, safeCurrentPage, goToPage, onClose, isMaximized, toggleMaximized]);

  // Pré-carrega a próxima página somente quando houver URL válida de servidor gráfico
  useEffect(() => {
    if (!visible || !book || viewMode !== 'pdf_page' || !isPdfServerConfigured()) return;
    const nextPage = safeCurrentPage + 1;
    if (nextPage <= book.pageCount) {
      const nextUrl = getRenderedPdfPageUrl(book.fileName, nextPage, 150);
      if (nextUrl && nextUrl.startsWith('http')) {
        Image.prefetch(nextUrl).catch(() => {});
      }
    }
  }, [visible, book, safeCurrentPage, viewMode]);

  // Renderização via PDF.js em <canvas> na Web para página única
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !book || viewMode !== 'pdf_page') {
      return;
    }

    let cancelled = false;

    async function renderWithPdfJs() {
      try {
        setCanvasLoading(true);
        if (!book) return;
        const pdfDoc = await getOrLoadPdfJsDocument(book.fileName, book.id, book.driveFileId);
        if (cancelled) return;

        const page = await pdfDoc.getPage(safeCurrentPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        if (baseViewport.width && baseViewport.height) {
          setPageAspect(baseViewport.width / baseViewport.height);
        }

        const canvas: HTMLCanvasElement | null = canvasRef.current;
        if (!canvas) return;

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const targetW = Math.min(Dimensions.get('window').width - 28, 920);
        const baseScale = (targetW / (baseViewport.width || targetW)) * zoom;
        const dpr = Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2);
        const viewport = page.getViewport({ scale: baseScale * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!cancelled) {
          setCanvasReady(true);
          setCanvasLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCanvasLoading(false);
        }
      }
    }

    renderWithPdfJs();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [visible, book, safeCurrentPage, zoom, viewMode]);

  const activePageData = useMemo(() => {
    if (!book) return undefined;
    return getBookPage(book.id, safeCurrentPage);
  }, [book, safeCurrentPage, getBookPage]);

  const inBookResults = useMemo(() => {
    if (!book || inBookQuery.trim().length < 2) return [];
    return searchInBookPages(book.id, inBookQuery.trim());
  }, [book, inBookQuery, searchInBookPages]);

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInputText, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInputText(String(safeCurrentPage));
    }
  };

  const isMobile =
    Platform.OS !== 'web' ||
    (typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  const handleDownloadPdf = useCallback(async () => {
    if (!book) return;
    await downloadPdfDocument(book.fileName, book.driveFileId);
  }, [book]);

  const handleDeletePdf = useCallback(() => {
    if (!book) return;
    const isCustom = Boolean(book.isCustomBook);
    confirmAction({
      title: isCustom ? 'Excluir PDF Personalizado' : 'Excluir Arquivo do PDF',
      message: isCustom
        ? `Deseja realmente excluir permanentemente o PDF "${book.title}" e todos os seus dados vinculados?`
        : `Deseja remover o arquivo offline de "${book.title}" e bloquear seu acesso? Você poderá adicioná-lo novamente a qualquer momento.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        onClose();
        await deletePdfBook(book.id);
      },
    });
  }, [book, deletePdfBook, onClose]);

  const renderScrollPageItem = useCallback(
    ({ item }: { item: number }) => {
      if (!book) return null;
      const pageData = getBookPage(book.id, item);
      return (
        <PdfScrollPageItem
          bookFileName={book.fileName}
          bookTitle={book.title}
          bookId={book.id}
          driveFileId={book.driveFileId}
          pageNumber={item}
          pageCount={book.pageCount}
          pageWidth={basePageWidth}
          pageHeight={basePageHeight}
          containerHeight={itemTotalHeight}
          dpi={targetDpi}
          zoom={zoom}
          sectionTitle={pageData?.section}
          pageText={pageData?.text}
          colors={colors}
          styles={styles}
          screenWidth={screenWidth}
          isMaximized={isMaximized}
          onImageLoaded={(w, h) => {
            if (w > 0 && h > 0) {
              setPageAspect(w / h);
            }
          }}
          onOpenExternalPdf={handleOpenExternalPdf}
          onSelectPageForSingleView={(p) => {
            goToPage(p, false);
            setViewMode('text');
          }}
        />
      );
    },
    [
      book,
      basePageWidth,
      basePageHeight,
      itemTotalHeight,
      targetDpi,
      zoom,
      colors,
      styles,
      screenWidth,
      isMaximized,
      getBookPage,
      handleOpenExternalPdf,
      goToPage,
    ]
  );

  if (!book) return null;

  const renderedImageUrl = getRenderedPdfPageUrl(book.fileName, safeCurrentPage, targetDpi);
  const nativePdfIframeUrl = getRawPdfUrl(book.fileName, safeCurrentPage);
  const hasValidRenderedImageUrl = Boolean(renderedImageUrl && renderedImageUrl.startsWith('http'));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => { handleBackNavigation(); }}>
      <View style={styles.container}>
        {/* Top Header (ocultado quando maximizado para leitura 100% limpa) */}
        {!isMaximized && (
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
            <TouchableOpacity
              style={[styles.modalBackBtn, isSmallScreen && { paddingHorizontal: 6, gap: 0 }]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Voltar para a listagem de livros"
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={styles.modalBackBtnText}>Voltar</Text>
            </TouchableOpacity>

            <View style={[styles.titleWrap, isSmallScreen && { minWidth: 0, flexShrink: 1, marginRight: 4 }]}>
              <View style={styles.bookBadgeRow}>
                <Ionicons name="document-attach" size={16} color={colors.primary} />
                <Text style={[styles.bookTitle, isSmallScreen && { fontSize: 13 }]} numberOfLines={1}>
                  {book.title}
                </Text>
                {!isNarrow && (
                  <View style={styles.filePill}>
                    <Text style={styles.filePillText} numberOfLines={1}>
                      {book.fileName}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.pageSubTitle, isSmallScreen && { fontSize: 10 }]} numberOfLines={1}>
                Página {safeCurrentPage} de {effectiveTotalPages}
                {activePageData?.section ? ` • ${activePageData.section}` : ''}
              </Text>
            </View>

            <View style={[styles.topActions, isSmallScreen && { gap: 3 }]}>
              <TouchableOpacity
                style={[styles.iconBtn, isSmallScreen && styles.iconBtnSmall]}
                onPress={() => {
                  onClose();
                  openManual('books');
                }}
                accessibilityLabel="Manual do Leitor de PDF"
              >
                <Ionicons name="help-circle-outline" size={isSmallScreen ? 16 : 19} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, isSmallScreen && styles.iconBtnSmall, showInBookSearch && styles.iconBtnActive]}
                onPress={() => {
                  setShowInBookSearch((s) => !s);
                  setShowTocList(false);
                }}
                accessibilityLabel="Buscar no livro"
              >
                <Ionicons name="search" size={isSmallScreen ? 16 : 18} color={colors.text} />
              </TouchableOpacity>

              {book.toc && book.toc.length > 0 && (
                <TouchableOpacity
                  style={[styles.iconBtn, isSmallScreen && styles.iconBtnSmall, showTocList && styles.iconBtnActive]}
                  onPress={() => {
                    setShowTocList((s) => !s);
                    setShowInBookSearch(false);
                  }}
                  accessibilityLabel="Sumário do livro"
                >
                  <Ionicons name="list" size={isSmallScreen ? 16 : 19} color={colors.text} />
                </TouchableOpacity>
              )}

              {/* Indicador de Status do Livro (PDF Original ou Modo Integrado) */}
              <View
                style={[styles.serverStatusPill, isNarrow && styles.serverStatusPillCompact]}
                accessibilityLabel="Status do Acervo"
              >
                <View
                  style={[
                    styles.serverStatusDot,
                    {
                      backgroundColor:
                        book.hasLocalPdf || book.driveSynced || (book.id && localPdfStorage.hasPdfOffline(book.id))
                          ? '#10B981'
                          : colors.primary,
                    },
                  ]}
                />
                {!isNarrow && (
                  <Text style={styles.serverStatusText}>
                    {book.hasLocalPdf || book.driveSynced || (book.id && localPdfStorage.hasPdfOffline(book.id))
                      ? 'PDF Próprio'
                      : 'Modo Integrado'}
                  </Text>
                )}
              </View>

              {/* Botão de Anotações Desenhadas / Tablet Stylus */}
              <TouchableOpacity
                testID="btn-toggle-annotations"
                style={[
                  styles.annotationToggleBtn,
                  isNarrow && styles.annotationToggleBtnCompact,
                  isAnnotationModeActive && styles.annotationToggleBtnActive,
                  useNativeReader && styles.btnDisabled,
                ]}
                disabled={useNativeReader}
                onPress={toggleAnnotationMode}
                accessibilityLabel={
                  useNativeReader
                    ? 'Anotações não disponíveis no leitor nativo de PDF'
                    : 'Anotar na página (Suporte a Tablet e Stylus)'
                }
                accessibilityHint={
                  useNativeReader
                    ? 'Recurso de anotação desativado no leitor nativo.'
                    : undefined
                }
                accessibilityState={{ disabled: useNativeReader }}
              >
                <Ionicons
                  name={isAnnotationModeActive ? 'pencil' : 'pencil-outline'}
                  size={15}
                  color={
                    useNativeReader
                      ? colors.textSecondary
                      : isAnnotationModeActive
                      ? '#FFF'
                      : colors.primary
                  }
                />
                {!isNarrow && (
                  <Text
                    style={[
                      styles.annotationToggleBtnText,
                      isAnnotationModeActive && styles.annotationToggleBtnTextActive,
                      useNativeReader && { color: colors.textSecondary },
                    ]}
                  >
                    Anotar
                  </Text>
                )}
                {annotatedPages.includes(safeCurrentPage) && !useNativeReader && (
                  <View style={styles.hasAnnotationIndicator} />
                )}
              </TouchableOpacity>

              {/* Botão de Maximizar Visualização */}
              <TouchableOpacity
                style={[styles.maximizeBtn, isNarrow && styles.maximizeBtnCompact]}
                onPress={toggleMaximized}
                accessibilityLabel="Maximizar visualização (Modo Foco)"
              >
                <Ionicons name="expand-outline" size={16} color={colors.primary} />
                {!isNarrow && <Text style={styles.maximizeBtnText}>Maximizar</Text>}
              </TouchableOpacity>

              {/* No celular ou desktop, permite abrir/baixar o PDF original diretamente */}
              {isMobile ? (
                <TouchableOpacity
                  style={[styles.iconBtn, isSmallScreen && styles.iconBtnSmall]}
                  onPress={handleDownloadPdf}
                  accessibilityLabel="Baixar arquivo PDF original"
                >
                  <Ionicons name="download-outline" size={isSmallScreen ? 16 : 18} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.externalBtn}
                  onPress={handleOpenExternalPdf}
                  accessibilityLabel="Abrir PDF em nova aba"
                >
                  <Ionicons name="open-outline" size={16} color="#FFF" />
                  {!isCompact && <Text style={styles.externalBtnText}>Abrir PDF</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                testID="btn-delete-pdf-viewer"
                style={[styles.iconBtn, isSmallScreen && styles.iconBtnSmall]}
                onPress={handleDeletePdf}
                accessibilityLabel="Excluir este PDF"
              >
                <Ionicons name="trash-outline" size={isSmallScreen ? 16 : 18} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Fechar">
                <Ionicons name="close" size={isSmallScreen ? 20 : 24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Secondary Toolbar: Seletor de Modo + Zoom (ocultado quando maximizado) */}
        {!isMaximized && (
          <View style={styles.subToolbar}>
            <View style={styles.modeTabs}>
              {/* Grupo 1: Tipo de Leitura (Leitura Direta PDF vs Texto Oficial) */}
              <TouchableOpacity
                style={[styles.modeTab, viewMode !== 'text' && styles.modeTabActive]}
                onPress={() => {
                  if (textLayout === 'page') {
                    setViewMode('pdf_page');
                  } else {
                    setViewMode('pdf_scroll');
                  }
                }}
              >
                <Ionicons
                  name="document-outline"
                  size={14}
                  color={viewMode !== 'text' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[styles.modeTabText, viewMode !== 'text' && styles.modeTabTextActive]}
                >
                  Leitura Direta PDF
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'text' && styles.modeTabActive]}
                onPress={() => setViewMode('text')}
              >
                <Ionicons
                  name="reader-outline"
                  size={14}
                  color={viewMode === 'text' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, viewMode === 'text' && styles.modeTabTextActive]}>
                  Texto Oficial
                </Text>
              </TouchableOpacity>

              <View style={{ width: 1, height: 18, backgroundColor: colors.border, marginHorizontal: 2 }} />

              {/* Grupo 2: Layout de Visualização (Rolagem Contínua vs Página Única) */}
              <TouchableOpacity
                style={[
                  styles.modeTab,
                  (viewMode === 'pdf_scroll' || (viewMode === 'text' && textLayout === 'scroll')) &&
                    styles.modeTabActive,
                ]}
                onPress={() => {
                  if (viewMode === 'text') {
                    setTextLayout('scroll');
                  } else {
                    setViewMode('pdf_scroll');
                  }
                }}
              >
                <Ionicons
                  name="albums-outline"
                  size={14}
                  color={
                    viewMode === 'pdf_scroll' || (viewMode === 'text' && textLayout === 'scroll')
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modeTabText,
                    (viewMode === 'pdf_scroll' || (viewMode === 'text' && textLayout === 'scroll')) &&
                      styles.modeTabTextActive,
                  ]}
                >
                  Rolagem Contínua
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTab,
                  (viewMode === 'pdf_page' || (viewMode === 'text' && textLayout === 'page')) &&
                    styles.modeTabActive,
                ]}
                onPress={() => {
                  if (viewMode === 'text') {
                    setTextLayout('page');
                  } else {
                    setViewMode('pdf_page');
                  }
                }}
              >
                <Ionicons
                  name="book-outline"
                  size={14}
                  color={
                    viewMode === 'pdf_page' || (viewMode === 'text' && textLayout === 'page')
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.modeTabText,
                    (viewMode === 'pdf_page' || (viewMode === 'text' && textLayout === 'page')) &&
                      styles.modeTabTextActive,
                  ]}
                >
                  Página Única
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={[styles.modeTab, viewMode === 'pdf_native' && styles.modeTabActive]}
                  onPress={() => setViewMode('pdf_native')}
                >
                  <Ionicons
                    name="browsers-outline"
                    size={14}
                    color={viewMode === 'pdf_native' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modeTabText,
                      viewMode === 'pdf_native' && styles.modeTabTextActive,
                    ]}
                  >
                    PDF Completo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {!useNativeReader && (viewMode === 'pdf_scroll' || viewMode === 'pdf_page' || viewMode === 'text') && (
              <View style={styles.zoomRow}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  accessibilityLabel="Diminuir Zoom"
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomBadge}
                  onPress={() => setZoom(1.0)}
                  accessibilityLabel="Resetar Zoom"
                >
                  <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                  accessibilityLabel="Aumentar Zoom"
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subToolbarMaximizeBtn}
                  onPress={toggleMaximized}
                  accessibilityLabel="Maximizar visualização"
                >
                  <Ionicons name="expand-outline" size={15} color={colors.primary} />
                  {!isVerySmall && (
                    <Text style={styles.subToolbarMaximizeText}>Maximizar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Painel Expansível: Busca dentro deste livro */}
        {!isMaximized && showInBookSearch && (
          <View style={styles.drawerPanel}>
            <View style={styles.inBookSearchInputRow}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.inBookSearchInput}
                placeholder={`Buscar termo nas ${book.pageCount} páginas de ${book.title}...`}
                placeholderTextColor={colors.textMuted}
                value={inBookQuery}
                onChangeText={setInBookQuery}
                autoFocus
              />
              {inBookQuery.length > 0 && (
                <TouchableOpacity onPress={() => setInBookQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {inBookQuery.trim().length >= 2 && (
              <ScrollView style={styles.searchResultsScroll}>
                {inBookResults.length === 0 ? (
                  <Text style={styles.noResultText}>
                    Nenhuma ocorrência encontrada para "{inBookQuery}".
                  </Text>
                ) : (
                  inBookResults.map((res, idx) => (
                    <TouchableOpacity
                      key={`inbook_${res.pageNumber}_${idx}`}
                      style={[
                        styles.searchResultItem,
                        res.pageNumber === safeCurrentPage && styles.searchResultItemActive,
                      ]}
                      onPress={() => {
                        goToPage(res.pageNumber);
                        setShowInBookSearch(false);
                      }}
                    >
                      <View style={styles.searchResultHeader}>
                        <Text style={styles.searchResultSection}>{res.section}</Text>
                        <Text style={styles.searchResultPage}>Pág. {res.pageNumber}</Text>
                      </View>
                      <Text style={styles.searchResultSnippet} numberOfLines={2}>
                        {res.snippet}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* Painel Expansível: Sumário Completo */}
        {!isMaximized && showTocList && book.toc && book.toc.length > 0 && (
          <View style={styles.drawerPanel}>
            <Text style={styles.drawerHeading}>Sumário de {book.title}</Text>
            <ScrollView style={styles.tocVerticalScroll}>
              {book.toc.map((entry, idx) => {
                const isCurrent = safeCurrentPage === entry.page;
                return (
                  <TouchableOpacity
                    key={`toc_v_${idx}`}
                    style={[
                      styles.tocVerticalItem,
                      { paddingLeft: 10 + (entry.level - 1) * 14 },
                      isCurrent && styles.tocVerticalItemActive,
                    ]}
                    onPress={() => {
                      goToPage(entry.page);
                      setShowTocList(false);
                    }}
                  >
                    <Text
                      style={[styles.tocVerticalTitle, isCurrent && { color: '#FCA5A5' }]}
                      numberOfLines={1}
                    >
                      {entry.title}
                    </Text>
                    <Text style={styles.tocVerticalPage}>p. {entry.page}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Faixa rápida de capítulos */}
        {!isMaximized && book.toc && book.toc.length > 0 && !showTocList && !showInBookSearch && (
          <View style={styles.tocStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tocStripScroll}
            >
              {book.toc.map((t, i) => {
                const isActive = safeCurrentPage === t.page;
                return (
                  <TouchableOpacity
                    key={`strip_toc_${i}`}
                    style={[styles.tocChip, isActive && styles.tocChipActive]}
                    onPress={() => goToPage(t.page)}
                  >
                    <Text style={[styles.tocChipText, isActive && styles.tocChipTextActive]}>
                      {t.title} ({t.page})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Barra de Ferramentas de Anotação Manual / Tablet */}
        {!useNativeReader && isAnnotationModeActive && (
          <AnnotationToolbar
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
            currentColor={currentColor}
            onSelectColor={setCurrentColor}
            currentWidth={currentWidth}
            onSelectWidth={setCurrentWidth}
            canUndo={undoStack.length > 0}
            onUndo={handleUndo}
            canRedo={redoStack.length > 0}
            onRedo={handleRedo}
            onClearPage={handleClearPageAnnotations}
            onCloseToolbar={() => setIsAnnotationModeActive(false)}
            isTablet={screenWidth >= 600}
          />
        )}

        {/* Área Principal do Visualizador */}
        <View style={styles.viewportArea}>
          {/* Controles Flutuantes no Modo Maximizado */}
          {isMaximized && (
            <View style={[styles.floatingControlsTop, { top: Math.max(insets.top, 10) }]}>
              <View style={styles.floatingBadge}>
                <Ionicons name="document-text" size={13} color={colors.primary} />
                <Text style={styles.floatingBadgeText}>
                  Pág. {safeCurrentPage} / {effectiveTotalPages}
                </Text>
              </View>

              {!useNativeReader && (
                <TouchableOpacity
                  style={[
                    styles.floatingActionBtn,
                    isAnnotationModeActive && { backgroundColor: '#DC2626' },
                  ]}
                  onPress={toggleAnnotationMode}
                  accessibilityLabel="Anotar na página"
                >
                  <Ionicons
                    name={isAnnotationModeActive ? 'pencil' : 'pencil-outline'}
                    size={16}
                    color={isAnnotationModeActive ? '#FFF' : colors.text}
                  />
                  {!isCompact && (
                    <Text style={styles.floatingBtnText}>
                      {isAnnotationModeActive ? 'Anotando' : 'Anotar'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.floatingActionBtn}
                onPress={toggleMaximized}
                accessibilityLabel="Restaurar visualização normal"
              >
                <Ionicons name="contract-outline" size={17} color="#FFF" />
                {!isCompact && <Text style={styles.floatingBtnText}>Restaurar</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.floatingActionBtn, styles.floatingCloseBtn]}
                onPress={onClose}
                accessibilityLabel="Voltar para a listagem de livros"
              >
                <Ionicons name="arrow-back" size={17} color="#FFF" />
                <Text style={styles.floatingBtnText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          )}

          {isMaximized && viewMode === 'pdf_page' && (
            <View style={[styles.floatingPageNavBottom, { bottom: Math.max(insets.bottom, 14) }]}>
              <TouchableOpacity
                style={[styles.floatingNavBtn, safeCurrentPage <= 1 && styles.btnDisabled]}
                disabled={safeCurrentPage <= 1}
                onPress={() => goToPage(safeCurrentPage - 1)}
                accessibilityLabel="Página anterior"
              >
                <Ionicons name="chevron-back" size={17} color="#FFF" />
                <Text style={styles.floatingNavBtnText}>Ant.</Text>
              </TouchableOpacity>

              <View style={styles.floatingPageIndicator}>
                <Text style={styles.floatingPageIndicatorText}>
                  {safeCurrentPage} / {effectiveTotalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.floatingNavBtn, safeCurrentPage >= effectiveTotalPages && styles.btnDisabled]}
                disabled={safeCurrentPage >= effectiveTotalPages}
                onPress={() => goToPage(safeCurrentPage + 1)}
                accessibilityLabel="Próxima página"
              >
                <Text style={styles.floatingNavBtnText}>Próx.</Text>
                <Ionicons name="chevron-forward" size={17} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Leitor Nativo Android / iOS para arquivos locais */}
          {useNativeReader ? (
            <View style={styles.nativePdfContainer}>
              <NativePdfReader
                ref={nativeReaderRef}
                key={`${book.id}_${viewMode === 'pdf_page' ? 'page' : 'scroll'}`}
                uri={nativePdfUri!}
                page={safeCurrentPage}
                horizontal={viewMode === 'pdf_page'}
                enablePaging={viewMode === 'pdf_page'}
                onPageChanged={handleNativePageChanged}
                onLoadComplete={handleNativeLoadComplete}
                onError={handleNativeError}
                backgroundColor={colors.background}
                testID="native-pdf-reader"
                style={styles.nativePdfView}
              />
            </View>
          ) : (
            <>
              {/* MODO 1: ROLAGEM CONTÍNUA COM TODAS AS PÁGINAS */}
              {viewMode === 'pdf_scroll' && (
            <FlatList
              key={`pdf_scroll_list_${book.id}`}
              ref={flatListRef}
              data={pagesList}
              keyExtractor={(item) => `scroll_page_${book.id}_${item}`}
              renderItem={renderScrollPageItem}
              getItemLayout={getItemLayout}
              onLayout={() => {
                if (currentPageRef.current > 1) {
                  scrollFlatListToPage(currentPageRef.current, false);
                }
              }}
              onScrollToIndexFailed={handleScrollToIndexFailed}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              showsVerticalScrollIndicator
              initialNumToRender={Platform.OS === 'web' ? 4 : 3}
              maxToRenderPerBatch={Platform.OS === 'web' ? 4 : 4}
              windowSize={Platform.OS === 'web' ? 7 : 5}
              removeClippedSubviews={false}
              contentContainerStyle={[
                styles.scrollListContent,
                isMaximized && { paddingVertical: 8, paddingHorizontal: 2 },
              ]}
              extraData={itemTotalHeight}
            />
          )}

          {/* MODO 2: PÁGINA ÚNICA (FOLHEAR INDIVIDUALMENTE) */}
          {viewMode === 'pdf_page' && (
            <ScrollView
              style={styles.pageScrollOuter}
              contentContainerStyle={styles.pageScrollContent}
              maximumZoomScale={3.0}
              minimumZoomScale={0.5}
              showsVerticalScrollIndicator
              showsHorizontalScrollIndicator
            >
              <View
                style={[
                  styles.pdfPagePaper,
                  {
                    width: basePageWidth,
                    minHeight: basePageHeight,
                  },
                ]}
              >
                {/* Camada 1: Imagem de Alta Resolução renderizada pelo servidor quando configurada */}
                {hasValidRenderedImageUrl && !imageError && (
                  <Image
                    source={{ uri: renderedImageUrl }}
                    style={{
                      width: basePageWidth,
                      height: basePageHeight,
                      opacity: canvasReady ? 0 : 1,
                      position: canvasReady ? 'absolute' : 'relative',
                    }}
                    resizeMode="contain"
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={(e) => {
                      const src = e.nativeEvent?.source;
                      if (src?.width && src?.height) {
                        setPageAspect(src.width / src.height);
                      }
                      setImageLoading(false);
                    }}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                )}

                {/* Camada 2 (Web): Canvas vetorial PDF.js direto do arquivo .pdf original */}
                {Platform.OS === 'web' &&
                  React.createElement('canvas', {
                    ref: canvasRef,
                    style: {
                      display: canvasReady ? 'block' : 'none',
                      maxWidth: '100%',
                      borderRadius: 6,
                    },
                  })}

                {/* Indicador de carregamento */}
                {(imageLoading || canvasLoading) && !canvasReady && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>
                      Carregando página {safeCurrentPage} de {book.title}...
                    </Text>
                  </View>
                )}

                {/* Visualização da Página Integrada (no APK ou quando sem servidor de imagens ativo) */}
                {(!hasValidRenderedImageUrl || imageError) && !canvasReady && !canvasLoading && (
                  <View style={styles.fallbackNotice}>
                    <View style={styles.fallbackTextCard}>
                      <View style={styles.fallbackTextHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                          <Ionicons name="book-outline" size={16} color={colors.primary} />
                          <Text style={styles.fallbackTextSection} numberOfLines={1}>
                            {activePageData?.section || book.title}
                          </Text>
                        </View>
                        <View style={styles.fontScalingRow}>
                          <TouchableOpacity
                            style={styles.fontScaleBtn}
                            onPress={() => setZoom((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
                            accessibilityLabel="Diminuir tamanho da fonte"
                          >
                            <Text style={styles.fontScaleBtnText}>A-</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.fontScaleResetBtn}
                            onPress={() => setZoom(1.0)}
                            accessibilityLabel="Restaurar tamanho da fonte"
                          >
                            <Text style={styles.fontScaleLabel}>{Math.round(zoom * 100)}%</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.fontScaleBtn}
                            onPress={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                            accessibilityLabel="Aumentar tamanho da fonte"
                          >
                            <Text style={styles.fontScaleBtnText}>A+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.textModePageBadge}>
                          Pág. {safeCurrentPage} / {book.pageCount}
                        </Text>
                      </View>
                      {renderFormattedBookText(activePageData?.text, zoom, colors, styles)}
                    </View>

                    <View style={[styles.fallbackBtnsRow, { flexWrap: 'wrap', gap: 8, justifyContent: 'center' }]}>
                      <TouchableOpacity
                        style={styles.externalBtn}
                        onPress={handleOpenExternalPdf}
                      >
                        <Ionicons name="open-outline" size={14} color="#FFF" />
                        <Text style={styles.externalBtnText}>Abrir Leitor In-App</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={handleDownloadPdf}
                      >
                        <Ionicons name="download-outline" size={14} color={colors.text} />
                        <Text style={styles.retryBtnText}>Baixar PDF</Text>
                      </TouchableOpacity>

                      {hasValidRenderedImageUrl && (
                        <TouchableOpacity
                          style={styles.retryBtn}
                          onPress={() => {
                            setImageError(false);
                            setImageLoading(true);
                          }}
                        >
                          <Ionicons name="reload-outline" size={14} color={colors.text} />
                          <Text style={styles.retryBtnText}>Tentar Novamente</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Camada 3: Anotações Desenhadas na Página (Tablet, Stylus e Gestos) */}
                {Boolean(book) && !useNativeReader && (
                  <PageAnnotationOverlay
                    bookId={book!.id}
                    pageNumber={safeCurrentPage}
                    width={basePageWidth}
                    height={basePageHeight}
                    strokes={currentPageStrokes}
                    onStrokesChange={handleStrokesChange}
                    isDrawingActive={isAnnotationModeActive}
                    currentTool={currentTool}
                    currentColor={currentColor}
                    currentWidth={currentWidth}
                    readOnly={!isAnnotationModeActive}
                  />
                )}
              </View>
            </ScrollView>
          )}

          {/* MODO 3: PDF NATIVO / COMPLETO (WEB IFRAME OU LEITOR IN-APP NO CELULAR) */}
          {viewMode === 'pdf_native' && Platform.OS === 'web' && (
            <View style={styles.iframeContainer}>
              {isMobile && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#27272A' }}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {book.title} (Pág. {safeCurrentPage})
                  </Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                    onPress={handleOpenExternalPdf}
                  >
                    <Ionicons name="open-outline" size={13} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Abrir no Celular</Text>
                  </TouchableOpacity>
                </View>
              )}
              {React.createElement('iframe', {
                key: `${book.fileName}_p${safeCurrentPage}`,
                src: nativePdfIframeUrl,
                title: `${book.title} - Página ${safeCurrentPage}`,
                style: {
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#18181B',
                },
              })}
            </View>
          )}

          {viewMode === 'pdf_native' && Platform.OS !== 'web' && (
            <ScrollView contentContainerStyle={styles.textModeScroll}>
              <View style={styles.textModeCard}>
                <View style={styles.textModeCardHeader}>
                  <View style={styles.textModeHeaderLeft}>
                    <Ionicons name="book-outline" size={18} color={colors.primary} />
                    <Text style={styles.textModeSection} numberOfLines={1}>
                      {activePageData?.section || book.title}
                    </Text>
                  </View>
                  <View style={styles.textModeHeaderRight}>
                    <View style={styles.textModeOfflineBadge}>
                      <Text style={styles.textModeOfflineBadgeText}>Leitor In-App</Text>
                    </View>
                    <Text style={styles.textModePageBadge}>
                      Pág. {safeCurrentPage} / {effectiveTotalPages}
                    </Text>
                  </View>
                </View>

                <View style={{ padding: 20, alignItems: 'center', gap: 12 }}>
                  <Ionicons name="document-text-outline" size={44} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                    Visualizador de PDF no Aplicativo
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                    Toque no botão abaixo para abrir o documento original na Página {safeCurrentPage} com controle completo de zoom, navegação e sem sair do aplicativo.
                  </Text>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: colors.primary,
                      paddingHorizontal: 20,
                      paddingVertical: 12,
                      borderRadius: 10,
                      marginTop: 4,
                    }}
                    onPress={handleOpenExternalPdf}
                  >
                    <Ionicons name="open-outline" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>
                      Abrir Página {safeCurrentPage} no Leitor Integrado
                    </Text>
                  </TouchableOpacity>
                </View>

                {Boolean(activePageData?.text) && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', padding: 16 }}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' }}>
                      Texto Oficial da Página {safeCurrentPage}:
                    </Text>
                    {renderFormattedBookText(activePageData?.text, zoom, colors, styles)}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/* Indicador de carregamento enquanto resolve URI nativa */}
      {isResolvingNativePdf && Platform.OS !== 'web' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando documento PDF...</Text>
        </View>
      )}

      {/* MODO 4: TEXTO OFICIAL (100% OFFLINE) */}
          {viewMode === 'text' && textLayout === 'scroll' && (
            <FlatList
              key={`text_scroll_list_${book.id}`}
              ref={textFlatListRef}
              data={pagesList}
              keyExtractor={(item) => `text_page_${book.id}_${item}`}
              initialNumToRender={Platform.OS === 'web' ? 5 : 4}
              maxToRenderPerBatch={Platform.OS === 'web' ? 5 : 4}
              windowSize={Platform.OS === 'web' ? 7 : 5}
              renderItem={({ item: pageNum }) => {
                const pageData = getBookPage(book.id, pageNum);
                return (
                  <View style={[styles.textModeCard, { marginVertical: 8, marginHorizontal: 12 }]}>
                    <View style={styles.textModeCardHeader}>
                      <View style={styles.textModeHeaderLeft}>
                        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                        <Text style={styles.textModeSection} numberOfLines={1}>
                          {pageData?.section || book.title}
                        </Text>
                      </View>
                      <View style={styles.textModeHeaderRight}>
                        <View style={styles.textModeOfflineBadge}>
                          <Text style={styles.textModeOfflineBadgeText}>100% Offline</Text>
                        </View>
                        <Text style={styles.textModePageBadge}>
                          Pág. {pageNum} / {book.pageCount}
                        </Text>
                      </View>
                    </View>
                    {renderFormattedBookText(pageData?.text, zoom, colors, styles)}
                  </View>
                );
              }}
              contentContainerStyle={[styles.textModeScroll, { paddingBottom: 60 }]}
            />
          )}

          {viewMode === 'text' && textLayout === 'page' && (
            <ScrollView contentContainerStyle={styles.textModeScroll}>
              <View style={styles.textModeCard}>
                <View style={styles.textModeCardHeader}>
                  <View style={styles.textModeHeaderLeft}>
                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                    <Text style={styles.textModeSection} numberOfLines={1}>
                      {activePageData?.section || book.title}
                    </Text>
                  </View>
                  <View style={styles.textModeHeaderRight}>
                    <View style={styles.fontScalingRow}>
                      <TouchableOpacity
                        style={styles.fontScaleBtn}
                        onPress={() => setZoom((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
                        accessibilityLabel="Diminuir tamanho da fonte"
                      >
                        <Text style={styles.fontScaleBtnText}>A-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.fontScaleResetBtn}
                        onPress={() => setZoom(1.0)}
                        accessibilityLabel="Restaurar tamanho padrão da fonte"
                      >
                        <Text style={styles.fontScaleLabel}>{Math.round(zoom * 100)}%</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.fontScaleBtn}
                        onPress={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                        accessibilityLabel="Aumentar tamanho da fonte"
                      >
                        <Text style={styles.fontScaleBtnText}>A+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.textModeOfflineBadge}>
                      <Text style={styles.textModeOfflineBadgeText}>100% Offline</Text>
                    </View>
                    <Text style={styles.textModePageBadge}>
                      Pág. {safeCurrentPage} / {book.pageCount}
                    </Text>
                  </View>
                </View>
                {renderFormattedBookText(activePageData?.text, zoom, colors, styles)}

                <View style={[styles.fallbackBtnsRow, { marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }]}>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={handleOpenExternalPdf}
                  >
                    <Ionicons name="open-outline" size={14} color={colors.text} />
                    <Text style={styles.retryBtnText}>Abrir PDF Original</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={handleDownloadPdf}
                  >
                    <Ionicons name="download-outline" size={14} color={colors.text} />
                    <Text style={styles.retryBtnText}>Baixar PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Barra Inferior de Navegação de Páginas (ocultada quando maximizado) */}
        {!isMaximized && (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.navGroup}>
              <TouchableOpacity
                style={[styles.smallJumpBtn, safeCurrentPage <= 1 && styles.btnDisabled]}
                disabled={safeCurrentPage <= 1}
                onPress={() => goToPage(safeCurrentPage - 10, false)}
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 6 }}
                accessibilityLabel="Voltar 10 páginas"
              >
                <Text style={styles.smallJumpText}>-10</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navBtn, safeCurrentPage <= 1 && styles.btnDisabled]}
                disabled={safeCurrentPage <= 1}
                onPress={() => goToPage(safeCurrentPage - 1)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityLabel="Página anterior"
              >
                <Ionicons name="chevron-back" size={17} color={colors.text} />
                {!isVerySmall && (
                  <Text style={styles.navBtnText}>
                    {isCompact ? 'Ant.' : 'Anterior'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Seletor Direto de Página */}
            <View style={styles.pageInputWrap}>
              <Text style={styles.pageLabel}>Pág.</Text>
              <TextInput
                style={styles.pageNumberInput}
                value={pageInputText}
                onChangeText={setPageInputText}
                onSubmitEditing={handlePageInputSubmit}
                onBlur={handlePageInputSubmit}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.pageTotalLabel}>/ {effectiveTotalPages}</Text>
            </View>

            <View style={styles.navGroup}>
              <TouchableOpacity
                style={[styles.navBtn, safeCurrentPage >= effectiveTotalPages && styles.btnDisabled]}
                disabled={safeCurrentPage >= effectiveTotalPages}
                onPress={() => goToPage(safeCurrentPage + 1)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                accessibilityLabel="Próxima página"
              >
                {!isVerySmall && (
                  <Text style={styles.navBtnText}>
                    {isCompact ? 'Próx.' : 'Próxima'}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={17} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallJumpBtn, safeCurrentPage >= effectiveTotalPages && styles.btnDisabled]}
                disabled={safeCurrentPage >= effectiveTotalPages}
                onPress={() => goToPage(safeCurrentPage + 10, false)}
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 10 }}
                accessibilityLabel="Avançar 10 páginas"
              >
                <Text style={styles.smallJumpText}>+10</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    modalBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalBackBtnText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    titleWrap: {
      flex: 1,
      gap: 2,
    },
    bookBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    bookTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    filePill: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    filePillText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    pageSubTitle: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    maximizeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 9,
    },
    maximizeBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    subToolbarMaximizeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      marginLeft: 4,
    },
    subToolbarMaximizeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    floatingControlsTop: {
      position: 'absolute',
      right: 14,
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    floatingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(24, 24, 27, 0.90)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    floatingBadgeText: {
      color: '#F4F4F5',
      fontSize: 12,
      fontWeight: '700',
    },
    floatingActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(24, 24, 27, 0.92)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 6,
    },
    floatingBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    floatingCloseBtn: {
      borderColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 7,
    },
    floatingPageNavBottom: {
      position: 'absolute',
      alignSelf: 'center',
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(24, 24, 27, 0.92)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      shadowColor: '#000',
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    floatingNavBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    floatingNavBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    floatingPageIndicator: {
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    floatingPageIndicatorText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    iconBtnSmall: {
      width: 32,
      height: 32,
      borderRadius: 7,
    },
    serverStatusPillCompact: {
      paddingHorizontal: 6,
      paddingVertical: 6,
    },
    annotationToggleBtnCompact: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    maximizeBtnCompact: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    formattedTextContainer: {
      gap: 4,
      width: '100%',
    },
    formattedHeadingWrap: {
      marginTop: 14,
      marginBottom: 6,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(239, 68, 68, 0.25)',
    },
    formattedHeadingBar: {
      width: 20,
      height: 2,
      backgroundColor: colors.primary,
      marginBottom: 4,
      borderRadius: 1,
    },
    formattedHeadingText: {
      color: colors.primary,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    formattedParaText: {
      color: colors.text,
      lineHeight: 23,
      marginBottom: 6,
    },
    textEmptyStateWrap: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    fontScalingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    fontScaleBtn: {
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    fontScaleBtnText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '800',
    },
    fontScaleResetBtn: {
      paddingHorizontal: 4,
    },
    fontScaleLabel: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '800',
      minWidth: 32,
      textAlign: 'center',
    },
    externalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 9,
    },
    externalBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    closeBtn: {
      padding: 4,
      marginLeft: 2,
    },
    subToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexWrap: 'wrap',
      gap: 8,
    },
    modeTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    modeTab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeTabActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    modeTabText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    modeTabTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    zoomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    zoomBtn: {
      width: 30,
      height: 30,
      borderRadius: 7,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 7,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 52,
      alignItems: 'center',
    },
    zoomText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    drawerPanel: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxHeight: 260,
    },
    drawerHeading: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    inBookSearchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      height: 38,
      gap: 8,
    },
    inBookSearchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
    },
    searchResultsScroll: {
      marginTop: 8,
      maxHeight: 190,
    },
    noResultText: {
      color: colors.textMuted,
      fontSize: 12,
      paddingVertical: 8,
    },
    searchResultItem: {
      padding: 9,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 6,
    },
    searchResultItemActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    searchResultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    searchResultSection: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    searchResultPage: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    searchResultSnippet: {
      color: colors.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
    tocVerticalScroll: {
      maxHeight: 210,
    },
    tocVerticalItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
      paddingRight: 10,
      borderRadius: 7,
      marginBottom: 2,
    },
    tocVerticalItemActive: {
      backgroundColor: colors.primarySoft,
    },
    tocVerticalTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    tocVerticalPage: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginLeft: 8,
    },
    tocStrip: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tocStripScroll: {
      gap: 8,
    },
    tocChip: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tocChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    tocChipText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    tocChipTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    viewportArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    nativePdfContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    nativePdfView: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    scrollListContent: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    scrollPageWrap: {
      alignItems: 'center',
      paddingBottom: 20,
    },
    scrollPageHeader: {
      height: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    scrollPageBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    scrollPageBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    scrollPageSectionText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
      textAlign: 'right',
      marginLeft: 8,
    },
    scrollPagePaper: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    scrollPageLoadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 10, 14, 0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    scrollPageLoadingText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    scrollPageRetryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 7,
    },
    scrollPageRetryText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    pageScrollOuter: {
      flex: 1,
    },
    pageScrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    pdfPagePaper: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 10, 14, 0.78)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 10,
    },
    loadingText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    fallbackNotice: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      width: '100%',
      flex: 1,
    },
    fallbackTextCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      width: '100%',
      flex: 1,
    },
    fallbackTextHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
      marginBottom: 12,
    },
    fallbackTextSection: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
      flex: 1,
      marginRight: 8,
    },
    fallbackTextBody: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    fallbackBtnsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
      width: '100%',
    },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    retryBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    mobileNativeNotice: {
      flex: 1,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 440,
      alignSelf: 'center',
      width: '100%',
      gap: 12,
    },
    mobileNativeTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
    },
    mobileNativeSub: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: 'center',
    },
    mobileOpenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 8,
    },
    mobileOpenBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
    },
    iframeContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    textModeScroll: {
      padding: 16,
      paddingBottom: 40,
    },
    textModeCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      maxWidth: 860,
      width: '100%',
      alignSelf: 'center',
    },
    textModeCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 10,
      marginBottom: 12,
    },
    textModeSection: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    textModePageBadge: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    textModeContent: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 23,
    },
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 3,
    },
    navGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      flexShrink: 1,
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
      minHeight: 38,
    },
    navBtnText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    smallJumpBtn: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 36,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallJumpText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    btnDisabled: {
      opacity: 0.35,
    },
    pageInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    pageLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    pageNumberInput: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
      minWidth: 32,
      textAlign: 'center',
      paddingVertical: 1,
      paddingHorizontal: 3,
      backgroundColor: colors.background,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pageTotalLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    serverStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    serverStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    serverStatusText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    textModeHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    textModeHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    textModeOfflineBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    textModeOfflineBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
    },
    scrollPageOfflinePill: {
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrollPageOfflinePillText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
    },
    scrollPageFallbackBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      justifyContent: 'space-between',
    },
    scrollPageFallbackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 8,
      gap: 8,
    },
    scrollPageFallbackBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    scrollPageFallbackBadgeText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    scrollPageFallbackSection: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
    },
    scrollPageFallbackScroll: {
      flex: 1,
      marginVertical: 4,
    },
    scrollPageFallbackBody: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 21,
    },
    scrollPageFallbackFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      alignItems: 'center',
    },
    scrollPageConfigServerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    scrollPageConfigServerText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    annotationToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      position: 'relative',
    },
    annotationToggleBtnActive: {
      backgroundColor: '#DC2626',
      borderColor: '#EF4444',
    },
    annotationToggleBtnText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '800',
    },
    annotationToggleBtnTextActive: {
      color: '#FFF',
    },
    hasAnnotationIndicator: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#EAB308',
      position: 'absolute',
      top: -2,
      right: -2,
      borderWidth: 1,
      borderColor: '#18181B',
    },
  });
