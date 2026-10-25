import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { BookInfo } from '../types/compendium';
import { getRawPdfUrl, getRenderedPdfPageUrl } from '../utils/pdfUrl';

export type PdfViewerMode = 'pdf_page' | 'pdf_native' | 'text';

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
  initialMode = 'pdf_page',
}) => {
  const { getBookPage, searchInBookPages } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [viewMode, setViewMode] = useState<PdfViewerMode>(initialMode);
  const [zoom, setZoom] = useState<number>(1.0);
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

  // Sincroniza página inicial e livro quando o modal abre
  useEffect(() => {
    if (visible && book) {
      const clamped = Math.max(1, Math.min(book.pageCount, initialPage || 1));
      setCurrentPage(clamped);
      setPageInputText(String(clamped));
      setShowTocList(false);
      if (highlightTerm) {
        setInBookQuery(highlightTerm);
      }
    }
  }, [visible, book?.id, initialPage, highlightTerm]);

  useEffect(() => {
    setPageInputText(String(currentPage));
    setImageLoading(true);
    setImageError(false);
    setCanvasReady(false);
  }, [currentPage, book?.id]);

  // Atalhos de teclado na Web (Setas Esquerda/Direita para trocar página, +/- para zoom)
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || !book) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage((p) => Math.min(book.pageCount, p + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, book, onClose]);

  //Pré-carrega a próxima página no servidor para navegação instantânea
  useEffect(() => {
    if (!visible || !book || viewMode !== 'pdf_page') return;
    const nextPage = currentPage + 1;
    if (nextPage <= book.pageCount) {
      const nextUrl = getRenderedPdfPageUrl(book.fileName, nextPage, 150);
      Image.prefetch(nextUrl).catch(() => {});
    }
  }, [visible, book, currentPage, viewMode]);

  // Renderização via PDF.js em <canvas> na Web (em paralelo ao fallback de imagem)
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

  if (!book) return null;

  const goToPage = (target: number) => {
    const clamped = Math.max(1, Math.min(book.pageCount, Math.round(target)));
    setCurrentPage(clamped);
    setPageInputText(String(clamped));
  };

  const handlePageInputSubmit = () => {
    const parsed = parseInt(pageInputText, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInputText(String(currentPage));
    }
  };

  const handleOpenExternalPdf = () => {
    const url = getRawPdfUrl(book.fileName, currentPage);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const basePageWidth = Math.min(screenWidth - 24, 880) * zoom;
  const basePageHeight = basePageWidth / pageAspect;
  const targetDpi = zoom >= 1.5 ? 200 : 150;
  const renderedImageUrl = getRenderedPdfPageUrl(book.fileName, currentPage, targetDpi);
  const nativePdfIframeUrl = getRawPdfUrl(book.fileName, currentPage);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
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
              style={[styles.iconBtn, showInBookSearch && styles.iconBtnActive]}
              onPress={() => {
                setShowInBookSearch((s) => !s);
                setShowTocList(false);
              }}
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
              >
                <Ionicons name="list" size={19} color={colors.text} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.externalBtn} onPress={handleOpenExternalPdf}>
              <Ionicons name="open-outline" size={16} color="#FFF" />
              <Text style={styles.externalBtnText}>Abrir PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Secondary Toolbar: Seletor de Modo (PDF Página / PDF Nativo / Texto) + Controles de Zoom */}
        <View style={styles.subToolbar}>
          <View style={styles.modeTabs}>
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
                Página PDF
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

          {viewMode === 'pdf_page' && (
            <View style={styles.zoomRow}>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              >
                <Ionicons name="remove" size={16} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.zoomBadge} onPress={() => setZoom(1.0)}>
                <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
              >
                <Ionicons name="add" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Painel Expansível: Busca dentro deste livro */}
        {showInBookSearch && (
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
        {showTocList && book.toc && book.toc.length > 0 && (
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
        {book.toc && book.toc.length > 0 && !showTocList && !showInBookSearch && (
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

                  {/* Caso tanto a imagem quanto o canvas falhem, exibe aviso com botão de abrir PDF e texto */}
                  {imageError && !canvasReady && !canvasLoading && (
                    <View style={styles.fallbackNotice}>
                      <Ionicons name="document-text-outline" size={40} color={colors.primary} />
                      <Text style={styles.fallbackTitle}>
                        Visualização direta via navegador disponível
                      </Text>
                      <Text style={styles.fallbackSub}>
                        Você pode alternar para a aba "PDF Completo" ou "Texto Extraído" acima, ou
                        abrir o arquivo {book.fileName} diretamente na página {currentPage}.
                      </Text>
                      <View style={styles.fallbackBtnsRow}>
                        {Platform.OS === 'web' && (
                          <TouchableOpacity
                            style={styles.externalBtn}
                            onPress={() => setViewMode('pdf_native')}
                          >
                            <Text style={styles.externalBtnText}>Usar Leitor Nativo</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.externalBtn,
                            { backgroundColor: colors.surfaceElevated },
                          ]}
                          onPress={() => setViewMode('text')}
                        >
                          <Text style={styles.externalBtnText}>Ver Texto da Página</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </ScrollView>
          )}

          {viewMode === 'pdf_native' && Platform.OS === 'web' && (
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
          )}

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
                    'Esta página consiste em arte ou ilustração sem camada de texto extraível. Alterne para o modo "Página PDF" acima para visualizar a arte original.'}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Barra Inferior de Navegação de Páginas */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.navGroup}>
            <TouchableOpacity
              style={[styles.smallJumpBtn, currentPage <= 1 && styles.btnDisabled]}
              disabled={currentPage <= 1}
              onPress={() => goToPage(currentPage - 10)}
            >
              <Text style={styles.smallJumpText}>-10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, currentPage <= 1 && styles.btnDisabled]}
              disabled={currentPage <= 1}
              onPress={() => goToPage(currentPage - 1)}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={styles.navBtnText}>Anterior</Text>
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
            >
              <Text style={styles.navBtnText}>Próxima</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallJumpBtn, currentPage >= book.pageCount && styles.btnDisabled]}
              disabled={currentPage >= book.pageCount}
              onPress={() => goToPage(currentPage + 10)}
            >
              <Text style={styles.smallJumpText}>+10</Text>
            </TouchableOpacity>
          </View>
        </View>
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
      padding: 28,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      maxWidth: 420,
    },
    fallbackTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    fallbackSub: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    fallbackBtnsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
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
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    navGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
    },
    navBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    smallJumpBtn: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
    },
    smallJumpText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    btnDisabled: {
      opacity: 0.4,
    },
    pageInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    pageLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    pageNumberInput: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
      minWidth: 38,
      textAlign: 'center',
      paddingVertical: 2,
      backgroundColor: colors.background,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pageTotalLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
  });
