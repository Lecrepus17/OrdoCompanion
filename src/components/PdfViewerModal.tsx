import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { BookInfo } from '../types/compendium';
import { confirmAction } from '../utils/alert';
import { localPdfStorage, slugifyPdfName } from '../services/pdf/PdfAccessService';
import { GoogleDriveService } from '../services/sync/GoogleDriveService';
import {
  downloadPdfDocument,
  getCleanPdfUrl,
  getRawPdfUrl,
  getRenderedPdfPageUrl,
  isPdfServerConfigured,
  openPdfDocument,
} from '../utils/pdfUrl';

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
    // Tenta baixar e salvar offline no aparelho para que os próximos acessos nunca mais precisem do servidor!
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [webCanvasReady, setWebCanvasReady] = useState(false);
  const itemCanvasRef = useRef<any>(null);

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
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

  const showFallbackTextSheet = error && !webCanvasReady && !loading;

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
                    <Text style={styles.scrollPageRetryText}>Abrir PDF Original</Text>
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
    (book?.id ? localPdfStorage.hasPdfOffline(book.id) : false)
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

  // Estados de carregamento e dimensões da página
  const [imageLoading, setImageLoading] = useState<boolean>(serverConfigured);
  const [imageError, setImageError] = useState<boolean>(!serverConfigured);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [canvasLoading, setCanvasLoading] = useState<boolean>(false);
  const [pageAspect, setPageAspect] = useState<number>(1211 / 1625);

  const canvasRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const flatListRef = useRef<FlatList<number>>(null);
  const isScrollingProgrammatically = useRef<boolean>(false);

  const totalPages = Math.max(1, book?.pageCount || 1);
  const safeCurrentPage = Math.max(1, Math.min(totalPages, currentPage || 1));
  const currentPageRef = useRef<number>(safeCurrentPage);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    currentPageRef.current = safeCurrentPage;
  }, [safeCurrentPage]);

  const toggleMaximized = useCallback(() => {
    setIsMaximized((m) => !m);
  }, []);

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
      const clamped = Math.max(1, Math.min(book.pageCount || 1, Math.round(target)));
      const isFarJump = Math.abs(clamped - currentPageRef.current) > 2;
      const shouldAnimate = isFarJump ? false : animated;

      setCurrentPage(clamped);
      currentPageRef.current = clamped;
      setPageInputText(String(clamped));

      if (viewMode === 'pdf_scroll' && flatListRef.current) {
        isScrollingProgrammatically.current = true;
        scrollFlatListToPage(clamped, shouldAnimate);
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, shouldAnimate ? 400 : 120);
      }
    },
    [book, viewMode, scrollFlatListToPage]
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
      const hasDirectPdf = Boolean(
        book.hasLocalPdf ||
        book.localPdfAvailable ||
        book.driveFileId ||
        book.driveSynced ||
        book.pdfUrl ||
        (book.id ? localPdfStorage.hasPdfOffline(book.id) : false)
      );
      const isServerActive = isPdfServerConfigured();
      const targetMode: PdfViewerMode =
        !hasDirectPdf && !isServerActive && Platform.OS !== 'web' && (initialMode === 'pdf_scroll' || initialMode === 'pdf_page')
          ? 'text'
          : initialMode;
      setViewMode(targetMode);

      const clamped = Math.max(1, Math.min(book.pageCount || 1, initialPage || 1));
      setCurrentPage(clamped);
      currentPageRef.current = clamped;
      setPageInputText(String(clamped));
      setShowTocList(false);
      if (highlightTerm) {
        setInBookQuery(highlightTerm);
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
  }, [visible, book?.id, initialPage]);

  // Garante posicionamento na página correta ao alternar para o modo de rolagem contínua
  useEffect(() => {
    if (viewMode === 'pdf_scroll' && visible && book) {
      isScrollingProgrammatically.current = true;
      setTimeout(() => {
        scrollFlatListToPage(currentPageRef.current, false);
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 250);
      }, 60);
    }
  }, [viewMode]);

  useEffect(() => {
    setPageInputText(String(safeCurrentPage));
    const url = book ? getRenderedPdfPageUrl(book.fileName, safeCurrentPage, targetDpi) : '';
    const hasValidImageUrl = Boolean(url);
    setImageLoading(hasValidImageUrl);
    setImageError(!hasValidImageUrl);
    setCanvasReady(false);
  }, [safeCurrentPage, book?.id]);

  // Intercepta botão de retorno físico no Android nativo
  useEffect(() => {
    if (Platform.OS === 'web' || typeof document !== 'undefined' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

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
    if (Platform.OS !== 'web' || !visible || !book) return;

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
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

  const handleOpenExternalPdf = useCallback(async () => {
    if (!book) return;
    await openPdfDocument(book.fileName, safeCurrentPage);
  }, [book, safeCurrentPage]);

  const handleDownloadPdf = useCallback(async () => {
    if (!book) return;
    await downloadPdfDocument(book.fileName);
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header (ocultado quando maximizado para leitura 100% limpa) */}
        {!isMaximized && (
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
            <TouchableOpacity
              style={styles.modalBackBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Voltar para a listagem de livros"
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={styles.modalBackBtnText}>Voltar</Text>
            </TouchableOpacity>

            <View style={styles.titleWrap}>
              <View style={styles.bookBadgeRow}>
                <Ionicons name="document-attach" size={16} color={colors.primary} />
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <View style={styles.filePill}>
                  <Text style={styles.filePillText} numberOfLines={1}>
                    {book.fileName}
                  </Text>
                </View>
              </View>
              <Text style={styles.pageSubTitle} numberOfLines={1}>
                Página {safeCurrentPage} de {book.pageCount}
                {activePageData?.section ? ` • ${activePageData.section}` : ''}
              </Text>
            </View>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => {
                  onClose();
                  openManual('books');
                }}
                accessibilityLabel="Manual do Leitor de PDF"
              >
                <Ionicons name="help-circle-outline" size={19} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, showInBookSearch && styles.iconBtnActive]}
                onPress={() => {
                  setShowInBookSearch((s) => !s);
                  setShowTocList(false);
                }}
                accessibilityLabel="Buscar no livro"
              >
                <Ionicons name="search" size={18} color={colors.text} />
              </TouchableOpacity>

              {book.toc && book.toc.length > 0 && (
                <TouchableOpacity
                  style={[styles.iconBtn, showTocList && styles.iconBtnActive]}
                  onPress={() => {
                    setShowTocList((s) => !s);
                    setShowInBookSearch(false);
                  }}
                  accessibilityLabel="Sumário do livro"
                >
                  <Ionicons name="list" size={19} color={colors.text} />
                </TouchableOpacity>
              )}

              {/* Indicador de Status do Livro (PDF Original ou Modo Integrado) */}
              <View
                style={styles.serverStatusPill}
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
                <Text style={styles.serverStatusText}>
                  {book.hasLocalPdf || book.driveSynced || (book.id && localPdfStorage.hasPdfOffline(book.id))
                    ? 'PDF Próprio'
                    : 'Modo Integrado'}
                </Text>
              </View>

              {/* Botão de Maximizar Visualização */}
              <TouchableOpacity
                style={styles.maximizeBtn}
                onPress={toggleMaximized}
                accessibilityLabel="Maximizar visualização (Modo Foco)"
              >
                <Ionicons name="expand-outline" size={16} color={colors.primary} />
                {!isVerySmall && <Text style={styles.maximizeBtnText}>Maximizar</Text>}
              </TouchableOpacity>

              {/* No celular ou desktop, permite abrir/baixar o PDF original diretamente */}
              {isMobile ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleDownloadPdf}
                  accessibilityLabel="Baixar arquivo PDF original"
                >
                  <Ionicons name="download-outline" size={18} color={colors.text} />
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
                style={styles.iconBtn}
                onPress={handleDeletePdf}
                accessibilityLabel="Excluir este PDF"
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Fechar">
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Secondary Toolbar: Seletor de Modo + Zoom (ocultado quando maximizado) */}
        {!isMaximized && (
          <View style={styles.subToolbar}>
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'pdf_scroll' && styles.modeTabActive]}
                onPress={() => setViewMode('pdf_scroll')}
              >
                <Ionicons
                  name="albums-outline"
                  size={14}
                  color={viewMode === 'pdf_scroll' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[styles.modeTabText, viewMode === 'pdf_scroll' && styles.modeTabTextActive]}
                >
                  Rolagem Contínua
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'pdf_page' && styles.modeTabActive]}
                onPress={() => setViewMode('pdf_page')}
              >
                <Ionicons
                  name="book-outline"
                  size={14}
                  color={viewMode === 'pdf_page' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[styles.modeTabText, viewMode === 'pdf_page' && styles.modeTabTextActive]}
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
            </View>

            {(viewMode === 'pdf_scroll' || viewMode === 'pdf_page' || viewMode === 'text') && (
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

        {/* Área Principal do Visualizador */}
        <View style={styles.viewportArea}>
          {/* Botão Flutuante de Maximizar no canto superior do documento */}
          {!isMaximized && (viewMode === 'pdf_scroll' || viewMode === 'pdf_page') && (
            <TouchableOpacity
              style={styles.floatingQuickMaximizeBtn}
              onPress={toggleMaximized}
              accessibilityLabel="Maximizar documento para tela cheia"
            >
              <Ionicons name="expand-outline" size={15} color="#FFF" />
              <Text style={styles.floatingQuickMaximizeText}>Maximizar Tela</Text>
            </TouchableOpacity>
          )}

          {/* Controles Flutuantes no Modo Maximizado */}
          {isMaximized && (
            <View style={[styles.floatingControlsTop, { top: Math.max(insets.top, 10) }]}>
              <View style={styles.floatingBadge}>
                <Ionicons name="document-text" size={13} color={colors.primary} />
                <Text style={styles.floatingBadgeText}>
                  Pág. {safeCurrentPage} / {book.pageCount}
                </Text>
              </View>

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
                  {safeCurrentPage} / {book.pageCount}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.floatingNavBtn, safeCurrentPage >= book.pageCount && styles.btnDisabled]}
                disabled={safeCurrentPage >= book.pageCount}
                onPress={() => goToPage(safeCurrentPage + 1)}
                accessibilityLabel="Próxima página"
              >
                <Text style={styles.floatingNavBtnText}>Próx.</Text>
                <Ionicons name="chevron-forward" size={17} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons name="book-outline" size={16} color={colors.primary} />
                          <Text style={styles.fallbackTextSection} numberOfLines={1}>
                            {activePageData?.section || book.title}
                          </Text>
                        </View>
                        <Text style={styles.textModePageBadge}>
                          Pág. {safeCurrentPage} / {book.pageCount}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.fallbackTextBody,
                          {
                            fontSize: Math.round(14 * zoom),
                            lineHeight: Math.round(22 * zoom),
                          },
                        ]}
                        selectable
                      >
                        {activePageData?.text ||
                          'Esta página consiste em capa, arte de capítulo, mapa ou diagrama oficial do livro.'}
                      </Text>
                    </View>

                    <View style={styles.fallbackBtnsRow}>
                      <TouchableOpacity
                        style={styles.externalBtn}
                        onPress={handleOpenExternalPdf}
                      >
                        <Ionicons name="open-outline" size={14} color="#FFF" />
                        <Text style={styles.externalBtnText}>Abrir PDF Original</Text>
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
              </View>
            </ScrollView>
          )}

          {/* MODO 3: PDF NATIVO / COMPLETO (WEB IFRAME) */}
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

          {/* MODO 4: TEXTO OFICIAL (100% OFFLINE) */}
          {viewMode === 'text' && (
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
                    <View style={styles.textModeOfflineBadge}>
                      <Text style={styles.textModeOfflineBadgeText}>100% Offline</Text>
                    </View>
                    <Text style={styles.textModePageBadge}>
                      Pág. {safeCurrentPage} / {book.pageCount}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.textModeContent,
                    {
                      fontSize: Math.round(15 * zoom),
                      lineHeight: Math.round(25 * zoom),
                    },
                  ]}
                  selectable
                >
                  {activePageData?.text ||
                    'Esta página consiste em arte, mapa ou diagrama oficial do livro sem camada textual extraível.'}
                </Text>

                <View style={[styles.fallbackBtnsRow, { marginTop: 16, justifyContent: 'flex-end' }]}>
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
              <Text style={styles.pageTotalLabel}>/ {book.pageCount}</Text>
            </View>

            <View style={styles.navGroup}>
              <TouchableOpacity
                style={[styles.navBtn, safeCurrentPage >= book.pageCount && styles.btnDisabled]}
                disabled={safeCurrentPage >= book.pageCount}
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
                style={[styles.smallJumpBtn, safeCurrentPage >= book.pageCount && styles.btnDisabled]}
                disabled={safeCurrentPage >= book.pageCount}
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
    floatingQuickMaximizeBtn: {
      position: 'absolute',
      top: 12,
      right: 14,
      zIndex: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(24, 24, 27, 0.90)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    floatingQuickMaximizeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
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
  });
