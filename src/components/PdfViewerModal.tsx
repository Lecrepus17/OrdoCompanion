import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { downloadPdfDocument, getRawPdfUrl, getRenderedPdfPageUrl, openPdfDocument } from '../utils/pdfUrl';

export type PdfViewerMode = 'pdf_scroll' | 'pdf_page' | 'pdf_native' | 'text';

interface PdfViewerModalProps {
  visible: boolean;
  onClose: () => void;
  book: BookInfo | null;
  initialPage?: number;
  highlightTerm?: string;
  initialMode?: PdfViewerMode;
}

interface PdfScrollPageItemProps {
  bookFileName: string;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  containerHeight: number;
  dpi: number;
  sectionTitle?: string;
  colors: ThemeColors;
  styles: any;
  screenWidth: number;
  isMaximized?: boolean;
  onImageLoaded?: (width: number, height: number) => void;
}

const PdfScrollPageItem: React.FC<PdfScrollPageItemProps> = React.memo(({
  bookFileName,
  pageNumber,
  pageWidth,
  pageHeight,
  containerHeight,
  dpi,
  sectionTitle,
  colors,
  styles,
  screenWidth,
  isMaximized = false,
  onImageLoaded,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const imageUrl = useMemo(
    () => `${getRenderedPdfPageUrl(bookFileName, pageNumber, dpi)}${retryKey > 0 ? `&retry=${retryKey}` : ''}`,
    [bookFileName, pageNumber, dpi, retryKey]
  );

  const canScrollHorizontal = pageWidth > screenWidth - (isMaximized ? 8 : 24);

  return (
    <View style={[styles.scrollPageWrap, { height: containerHeight }]}>
      {!isMaximized && (
        <View style={[styles.scrollPageHeader, { width: Math.min(pageWidth, screenWidth - 24) }]}>
          <View style={styles.scrollPageBadge}>
            <Ionicons name="document-text-outline" size={13} color={colors.primary} />
            <Text style={styles.scrollPageBadgeText}>Página {pageNumber}</Text>
          </View>
          {sectionTitle ? (
            <Text style={styles.scrollPageSectionText} numberOfLines={1}>
              {sectionTitle}
            </Text>
          ) : null}
        </View>
      )}

      <ScrollView
        horizontal
        scrollEnabled={canScrollHorizontal}
        showsHorizontalScrollIndicator={canScrollHorizontal}
        contentContainerStyle={styles.scrollPageHorizontalContent}
      >
        <View style={[styles.scrollPagePaper, { width: pageWidth, height: pageHeight }]}>
          {!error && (
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
          )}

          {loading && !error && (
            <View style={styles.scrollPageLoadingOverlay}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.scrollPageLoadingText}>Carregando página {pageNumber}...</Text>
            </View>
          )}

          {error && (
            <View style={styles.scrollPageErrorBox}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.danger || '#EF4444'} />
              <Text style={styles.scrollPageErrorTitle}>Página {pageNumber}</Text>
              <Text style={styles.scrollPageErrorSub}>Não foi possível carregar a imagem da página.</Text>
              <TouchableOpacity
                style={styles.scrollPageRetryBtn}
                onPress={() => {
                  setError(false);
                  setLoading(true);
                  setRetryKey((k) => k + 1);
                }}
              >
                <Ionicons name="reload-outline" size={14} color={colors.text} />
                <Text style={styles.scrollPageRetryText}>Tentar Novamente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

// Cache global em memória de documentos PDF.js já abertos na sessão Web
const pdfDocsCache: Record<string, any> = {};
let pdfJsLoadPromise: Promise<any> | null = null;

function ensurePdfJsLoaded(): Promise<any> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return Promise.reject(new Error('PDF.js disponível apenas na Web'));
  }

  const win = window as any;
  if (win.pdfjsLib) {
    return Promise.resolve(win.pdfjsLib);
  }

  if (pdfJsLoadPromise) {
    return pdfJsLoadPromise;
  }

  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/pdfjs/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        resolve(win.pdfjsLib);
      } else {
        pdfJsLoadPromise = null;
        reject(new Error('Falha ao inicializar window.pdfjsLib'));
      }
    };
    script.onerror = (err) => {
      pdfJsLoadPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  visible,
  onClose,
  book,
  initialPage = 1,
  highlightTerm = '',
  initialMode = 'pdf_scroll',
}) => {
  const { getBookPage, searchInBookPages, openManual } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [viewMode, setViewMode] = useState<PdfViewerMode>(initialMode);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [pageInputText, setPageInputText] = useState<string>(String(initialPage));
  const [showTocList, setShowTocList] = useState<boolean>(false);
  const [showInBookSearch, setShowInBookSearch] = useState<boolean>(false);
  const [inBookQuery, setInBookQuery] = useState<string>(highlightTerm);

  // Estados de carregamento e dimensões da página
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [canvasLoading, setCanvasLoading] = useState<boolean>(false);
  const [pageAspect, setPageAspect] = useState<number>(1211 / 1625);

  const canvasRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const flatListRef = useRef<FlatList<number>>(null);
  const isScrollingProgrammatically = useRef<boolean>(false);
  const currentPageRef = useRef<number>(currentPage);
  const prevZoomRef = useRef<number>(zoom);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const toggleMaximized = useCallback(() => {
    setIsMaximized((m) => !m);
  }, []);

  // Lista de páginas para o modo de rolagem contínua
  const pagesList = useMemo(() => {
    if (!book || !book.pageCount) return [];
    return Array.from({ length: book.pageCount }, (_, i) => i + 1);
  }, [book?.pageCount]);

  const clampedInitialIndex = useMemo(() => {
    if (!book || !book.pageCount) return 0;
    const initial = typeof initialPage === 'number' ? initialPage : 1;
    return Math.max(0, Math.min(book.pageCount - 1, initial - 1));
  }, [book?.pageCount, initialPage]);

  // Dimensões dinâmicas calculadas com base no zoom e aspect ratio
  // No modo maximizado, expande a largura máxima e reduz margens para exibir mais texto limpo
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth;
  const isCompact = windowWidth < 480;
  const isVerySmall = windowWidth < 390;
  const pageHorizontalMargin = isMaximized ? 8 : 24;
  const pageMaxWidth = isMaximized ? Math.min(screenWidth - 8, 1200) : 880;
  const basePageWidth = Math.min(screenWidth - pageHorizontalMargin, pageMaxWidth) * zoom;
  const basePageHeight = basePageWidth / pageAspect;
  const targetDpi = zoom >= 1.5 ? 200 : 150;
  const PAGE_GAP = isMaximized ? 14 : 20;
  const HEADER_HEIGHT = isMaximized ? 0 : 36;
  const itemTotalHeight = Math.round(basePageHeight + HEADER_HEIGHT + PAGE_GAP);

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: itemTotalHeight,
      offset: itemTotalHeight * index,
      index,
    }),
    [itemTotalHeight]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      setTimeout(() => {
        if (!flatListRef.current) return;
        try {
          flatListRef.current.scrollToIndex({ index: info.index, animated: false });
        } catch {
          flatListRef.current.scrollToOffset({
            offset: info.index * itemTotalHeight,
            animated: false,
          });
        }
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
      const clamped = Math.max(1, Math.min(book.pageCount, Math.round(target)));
      const isFarJump = Math.abs(clamped - currentPageRef.current) > 2;
      const shouldAnimate = isFarJump ? false : animated;

      setCurrentPage(clamped);
      currentPageRef.current = clamped;
      setPageInputText(String(clamped));

      if (viewMode === 'pdf_scroll' && flatListRef.current) {
        isScrollingProgrammatically.current = true;
        try {
          flatListRef.current.scrollToIndex({
            index: clamped - 1,
            animated: shouldAnimate,
            viewPosition: 0,
          });
        } catch {
          flatListRef.current.scrollToOffset({
            offset: (clamped - 1) * itemTotalHeight,
            animated: shouldAnimate,
          });
        }
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, shouldAnimate ? 450 : 120);
      }
    },
    [book, viewMode, itemTotalHeight]
  );

  // Preserva estritamente a página atual ao alterar o zoom (aumentar, diminuir ou resetar)
  // Previne que a alteração da altura dos itens mude a página atual de visualização
  useEffect(() => {
    if (prevZoomRef.current !== zoom) {
      prevZoomRef.current = zoom;
      if (viewMode === 'pdf_scroll' && flatListRef.current) {
        isScrollingProgrammatically.current = true;
        const targetPage = currentPageRef.current;
        const targetOffset = (targetPage - 1) * itemTotalHeight;
        try {
          flatListRef.current.scrollToOffset({
            offset: targetOffset,
            animated: false,
          });
        } catch {}

        setCurrentPage(targetPage);
        setPageInputText(String(targetPage));

        const timer = setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [zoom, itemTotalHeight, viewMode]);

  // Sincroniza página inicial e livro quando o modal abre
  useEffect(() => {
    if (visible && book) {
      const clamped = Math.max(1, Math.min(book.pageCount, initialPage || 1));
      setCurrentPage(clamped);
      currentPageRef.current = clamped;
      setPageInputText(String(clamped));
      setShowTocList(false);
      if (highlightTerm) {
        setInBookQuery(highlightTerm);
      }
      if (viewMode === 'pdf_scroll') {
        isScrollingProgrammatically.current = true;
        setTimeout(() => {
          if (flatListRef.current && clamped > 1) {
            try {
              flatListRef.current.scrollToIndex({
                index: clamped - 1,
                animated: false,
              });
            } catch {
              flatListRef.current.scrollToOffset({
                offset: (clamped - 1) * itemTotalHeight,
                animated: false,
              });
            }
          }
          setTimeout(() => {
            isScrollingProgrammatically.current = false;
          }, 350);
        }, 120);
      }
    }
  }, [visible, book?.id, initialPage]);

  // Garante posicionamento na página correta ao alternar para o modo de rolagem contínua
  useEffect(() => {
    if (viewMode === 'pdf_scroll' && visible && book) {
      isScrollingProgrammatically.current = true;
      setTimeout(() => {
        if (flatListRef.current && currentPage > 1) {
          try {
            flatListRef.current.scrollToIndex({
              index: currentPage - 1,
              animated: false,
            });
          } catch {
            flatListRef.current.scrollToOffset({
              offset: (currentPage - 1) * itemTotalHeight,
              animated: false,
            });
          }
        }
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 300);
      }, 100);
    }
  }, [viewMode]);

  useEffect(() => {
    setPageInputText(String(currentPage));
    setImageLoading(true);
    setImageError(false);
    setCanvasReady(false);
  }, [currentPage, book?.id]);

  // Atalhos de teclado na Web (Setas / PageUp / PageDown / Zoom +/- / F ou M para Maximizar / Escape)
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !book) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPage - 1);
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
  }, [visible, book, currentPage, goToPage, onClose, isMaximized, toggleMaximized]);

  // Pré-carrega a próxima página no servidor para navegação instantânea em página única
  useEffect(() => {
    if (!visible || !book || viewMode !== 'pdf_page') return;
    const nextPage = currentPage + 1;
    if (nextPage <= book.pageCount) {
      const nextUrl = getRenderedPdfPageUrl(book.fileName, nextPage, 150);
      Image.prefetch(nextUrl).catch(() => {});
    }
  }, [visible, book, currentPage, viewMode]);

  // Renderização via PDF.js em <canvas> na Web (em paralelo ao fallback de imagem para página única)
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !book || viewMode !== 'pdf_page') {
      return;
    }

    let cancelled = false;

    async function renderWithPdfJs() {
      try {
        setCanvasLoading(true);
        const pdfjsLib = await ensurePdfJsLoaded();
        if (cancelled || !book) return;

        const rawUrl = getRawPdfUrl(book.fileName);
        let pdfDoc = pdfDocsCache[book.fileName];
        if (!pdfDoc) {
          const loadingTask = pdfjsLib.getDocument({
            url: rawUrl,
            disableAutoFetch: true,
            disableStream: false,
            rangeChunkSize: 65536 * 4,
          });
          pdfDoc = await loadingTask.promise;
          pdfDocsCache[book.fileName] = pdfDoc;
        }

        if (cancelled) return;

        const page = await pdfDoc.getPage(currentPage);
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

        const screenWidth = Math.min(Dimensions.get('window').width - 28, 920);
        const baseScale = (screenWidth / baseViewport.width) * zoom;
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
  }, [visible, book, currentPage, zoom, viewMode]);

  const activePageData = useMemo(() => {
    if (!book) return undefined;
    return getBookPage(book.id, currentPage);
  }, [book, currentPage, getBookPage]);

  const inBookResults = useMemo(() => {
    if (!book || inBookQuery.trim().length < 2) return [];
    return searchInBookPages(book.id, inBookQuery.trim());
  }, [book, inBookQuery, searchInBookPages]);

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInputText, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInputText(String(currentPage));
    }
  };

  const isMobile =
    Platform.OS !== 'web' ||
    (typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  const handleOpenExternalPdf = () => {
    if (!book) return;
    openPdfDocument(book.fileName, currentPage);
  };

  const renderScrollPageItem = useCallback(
    ({ item }: { item: number }) => {
      if (!book) return null;
      const pageData = getBookPage(book.id, item);
      return (
        <PdfScrollPageItem
          bookFileName={book.fileName}
          pageNumber={item}
          pageWidth={basePageWidth}
          pageHeight={basePageHeight}
          containerHeight={itemTotalHeight}
          dpi={targetDpi}
          sectionTitle={pageData?.section}
          colors={colors}
          styles={styles}
          screenWidth={screenWidth}
          isMaximized={isMaximized}
          onImageLoaded={(w, h) => {
            if (w > 0 && h > 0) {
              setPageAspect(w / h);
            }
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
      colors,
      styles,
      screenWidth,
      isMaximized,
      getBookPage,
    ]
  );

  if (!book) return null;

  const renderedImageUrl = getRenderedPdfPageUrl(book.fileName, currentPage, targetDpi);
  const nativePdfIframeUrl = getRawPdfUrl(book.fileName, currentPage);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header (ocultado quando maximizado para leitura 100% limpa) */}
        {!isMaximized && (
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}>
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
                Página {currentPage} de {book.pageCount}
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

              {/* Botão de Maximizar Visualização (Rolagem Contínua e Página Única) */}
              <TouchableOpacity
                style={styles.maximizeBtn}
                onPress={toggleMaximized}
                accessibilityLabel="Maximizar visualização (Modo Foco)"
              >
                <Ionicons name="expand-outline" size={16} color={colors.primary} />
                {!isVerySmall && <Text style={styles.maximizeBtnText}>Maximizar</Text>}
              </TouchableOpacity>

              {/* No celular, oferece download para evitar tela cinza de navegadores móveis */}
              {isMobile ? (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => downloadPdfDocument(book.fileName)}
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
                  Texto Extraído
                </Text>
              </TouchableOpacity>
            </View>

            {(viewMode === 'pdf_scroll' || viewMode === 'pdf_page') && (
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
                        res.pageNumber === currentPage && styles.searchResultItemActive,
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
                const isCurrent = currentPage === entry.page;
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
                const isActive = currentPage === t.page;
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
                  Pág. {currentPage} / {book.pageCount}
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
                accessibilityLabel="Fechar leitor"
              >
                <Ionicons name="close" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {isMaximized && viewMode === 'pdf_page' && (
            <View style={[styles.floatingPageNavBottom, { bottom: Math.max(insets.bottom, 14) }]}>
              <TouchableOpacity
                style={[styles.floatingNavBtn, currentPage <= 1 && styles.btnDisabled]}
                disabled={currentPage <= 1}
                onPress={() => goToPage(currentPage - 1)}
                accessibilityLabel="Página anterior"
              >
                <Ionicons name="chevron-back" size={17} color="#FFF" />
                <Text style={styles.floatingNavBtnText}>Ant.</Text>
              </TouchableOpacity>

              <View style={styles.floatingPageIndicator}>
                <Text style={styles.floatingPageIndicatorText}>
                  {currentPage} / {book.pageCount}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.floatingNavBtn, currentPage >= book.pageCount && styles.btnDisabled]}
                disabled={currentPage >= book.pageCount}
                onPress={() => goToPage(currentPage + 1)}
                accessibilityLabel="Próxima página"
              >
                <Text style={styles.floatingNavBtnText}>Próx.</Text>
                <Ionicons name="chevron-forward" size={17} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* MODO 1: ROLAGEM CONTÍNUA COM TODAS AS PÁGINAS CARREGANDO */}
          {viewMode === 'pdf_scroll' && (
            <FlatList
              ref={flatListRef}
              data={pagesList}
              keyExtractor={(item) => `scroll_page_${item}`}
              renderItem={renderScrollPageItem}
              getItemLayout={getItemLayout}
              initialScrollIndex={clampedInitialIndex}
              onScrollToIndexFailed={handleScrollToIndexFailed}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              showsVerticalScrollIndicator
              initialNumToRender={Platform.OS === 'web' ? 4 : 5}
              maxToRenderPerBatch={Platform.OS === 'web' ? 4 : 6}
              windowSize={Platform.OS === 'web' ? 7 : 9}
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
              <ScrollView
                horizontal
                contentContainerStyle={styles.pageHorizontalWrap}
                showsHorizontalScrollIndicator={zoom > 1.0}
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
                  {/* Camada 1: Imagem de Alta Resolução renderizada pelo PyMuPDF no servidor */}
                  {!imageError && (
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
                  {imageLoading && !canvasReady && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.loadingText}>
                        Renderizando página {currentPage} de {book.title}...
                      </Text>
                      {canvasLoading && (
                        <Text style={styles.loadingSubText}>
                          Carregando PDF original ({book.fileName})
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Caso a imagem e o canvas estejam indisponíveis, exibe o conteúdo textual integrado e opções de leitura */}
                  {imageError && !canvasReady && !canvasLoading && (
                    <View style={styles.fallbackNotice}>
                      <View style={styles.fallbackAlertHeader}>
                        <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fallbackTitle}>
                            Página {currentPage} • {book.title}
                          </Text>
                          <Text style={styles.fallbackSub}>
                            Renderização gráfica não concluída. O texto oficial e regras desta página estão disponíveis abaixo:
                          </Text>
                        </View>
                      </View>

                      <View style={styles.fallbackTextCard}>
                        <View style={styles.fallbackTextHeader}>
                          <Text style={styles.fallbackTextSection} numberOfLines={1}>
                            {activePageData?.section || book.title}
                          </Text>
                          <Text style={styles.textModePageBadge}>Pág. {currentPage}</Text>
                        </View>
                        <Text style={styles.fallbackTextBody} numberOfLines={12}>
                          {activePageData?.text ||
                            'Esta página não possui camada textual extraível (pode conter apenas arte ou diagrama). Toque em "Abrir PDF" para ver o original.'}
                        </Text>
                      </View>

                      <View style={styles.fallbackBtnsRow}>
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

                        <TouchableOpacity
                          style={styles.externalBtn}
                          onPress={() => {
                            if (isMobile) {
                              downloadPdfDocument(book.fileName);
                            } else {
                              handleOpenExternalPdf();
                            }
                          }}
                        >
                          <Ionicons
                            name={isMobile ? 'download-outline' : 'open-outline'}
                            size={14}
                            color="#FFF"
                          />
                          <Text style={styles.externalBtnText}>
                            {isMobile ? 'Baixar PDF' : 'Abrir PDF'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.externalBtn, { backgroundColor: colors.surfaceElevated }]}
                          onPress={() => setViewMode('text')}
                        >
                          <Ionicons name="reader-outline" size={14} color={colors.text} />
                          <Text style={styles.externalBtnText}>Modo Texto</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </ScrollView>
          )}

          {/* MODO 3: PDF NATIVO / COMPLETO (WEB IFRAME) */}
          {viewMode === 'pdf_native' && Platform.OS === 'web' && (
            isMobile ? (
              <View style={styles.mobileNativeNotice}>
                <Ionicons name="document-attach-outline" size={46} color={colors.primary} />
                <Text style={styles.mobileNativeTitle}>Leitor Nativo no Celular</Text>
                <Text style={styles.mobileNativeSub}>
                  Navegadores móveis não renderizam PDFs integrais de 80 MB em quadros embutidos. Toque no botão abaixo para baixar o arquivo "{book.fileName}" diretamente para o seu aparelho:
                </Text>
                <TouchableOpacity
                  style={styles.mobileOpenBtn}
                  onPress={() => downloadPdfDocument(book.fileName)}
                >
                  <Ionicons name="download-outline" size={18} color="#FFF" />
                  <Text style={styles.mobileOpenBtnText}>Baixar PDF no Aparelho</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.retryBtn, { marginTop: 12 }]}
                  onPress={() => setViewMode('pdf_scroll')}
                >
                  <Text style={styles.retryBtnText}>Voltar para Leitor PDF</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.iframeContainer}>
                {React.createElement('iframe', {
                  key: `${book.fileName}_p${currentPage}`,
                  src: nativePdfIframeUrl,
                  title: `${book.title} - Página ${currentPage}`,
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#18181B',
                  },
                })}
              </View>
            )
          )}

          {/* MODO 4: TEXTO EXTRAÍDO */}
          {viewMode === 'text' && (
            <ScrollView contentContainerStyle={styles.textModeScroll}>
              <View style={styles.textModeCard}>
                <View style={styles.textModeCardHeader}>
                  <Text style={styles.textModeSection}>
                    {activePageData?.section || book.title}
                  </Text>
                  <Text style={styles.textModePageBadge}>Página {currentPage}</Text>
                </View>
                <Text style={styles.textModeContent}>
                  {activePageData?.text ||
                    'Esta página consiste em arte ou ilustração sem camada de texto extraível. Alterne para o modo "Rolagem Contínua" acima para visualizar a arte original.'}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Barra Inferior de Navegação de Páginas (ocultada quando maximizado) */}
        {!isMaximized && (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.navGroup}>
              <TouchableOpacity
                style={[styles.smallJumpBtn, currentPage <= 1 && styles.btnDisabled]}
                disabled={currentPage <= 1}
                onPress={() => goToPage(currentPage - 10, false)}
                hitSlop={{ top: 12, bottom: 12, left: 10, right: 6 }}
                accessibilityLabel="Voltar 10 páginas"
              >
                <Text style={styles.smallJumpText}>-10</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navBtn, currentPage <= 1 && styles.btnDisabled]}
                disabled={currentPage <= 1}
                onPress={() => goToPage(currentPage - 1)}
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
                style={[styles.navBtn, currentPage >= book.pageCount && styles.btnDisabled]}
                disabled={currentPage >= book.pageCount}
                onPress={() => goToPage(currentPage + 1)}
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
                style={[styles.smallJumpBtn, currentPage >= book.pageCount && styles.btnDisabled]}
                disabled={currentPage >= book.pageCount}
                onPress={() => goToPage(currentPage + 10, false)}
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
    // Estilos do modo rolagem contínua
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
    scrollPageHorizontalContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    scrollPageErrorBox: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    scrollPageErrorTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    scrollPageErrorSub: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
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
      marginTop: 6,
    },
    scrollPageRetryText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    // Estilos do modo página única
    pageScrollOuter: {
      flex: 1,
    },
    pageScrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    pageHorizontalWrap: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    loadingSubText: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
    },
    fallbackNotice: {
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      maxWidth: 560,
      width: '100%',
    },
    fallbackAlertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 6,
      width: '100%',
    },
    fallbackTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    fallbackSub: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    fallbackTextCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      width: '100%',
      marginVertical: 4,
    },
    fallbackTextHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 8,
    },
    fallbackTextSection: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
      flex: 1,
      marginRight: 8,
    },
    fallbackTextBody: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
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
  });
