import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
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
import { useApp } from '../../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { BookInfo } from '../../types/compendium';
import { PdfViewerModal, PdfViewerMode } from '../../components/PdfViewerModal';
import { getRawPdfUrl, getRenderedPdfPageUrl, isPdfServerConfigured, openPdfDocument } from '../../utils/pdfUrl';
import { sortBooksCanonical } from '../../repositories/OfflineDataRepository';
import { confirmAction } from '../../utils/alert';
import { localPdfStorage } from '../../services/pdf/PdfAccessService';

interface BookThemeMeta {
  badge: string;
  accent: string;
  bgTint: string;
  icon: keyof typeof Ionicons.glyphMap;
  primaryLabel: string;
  subLabel: string;
}

const getBookThemeInfo = (book: BookInfo): BookThemeMeta => {
  const id = (book.id || '').toLowerCase();
  const title = (book.title || '').toLowerCase();

  if (id === 'livro_base' || title.includes('livro base') || title.includes('regras')) {
    return {
      badge: 'BASE',
      accent: '#F59E0B',
      bgTint: 'rgba(245, 158, 11, 0.1)',
      icon: 'shield-outline',
      primaryLabel: 'LIVRO BASE',
      subLabel: 'REGRAS v1.3',
    };
  }

  if (id === 'sobrevivendo_ao_horror' || title.includes('horror') || title.includes('sobrevivendo')) {
    return {
      badge: 'EXPANSÃO',
      accent: '#EF4444',
      bgTint: 'rgba(239, 68, 68, 0.1)',
      icon: 'skull-outline',
      primaryLabel: 'HORROR',
      subLabel: 'SUPLEMENTO',
    };
  }

  const matchNum = id.match(/arquivos_secretos_(\d+)/) || title.match(/#(\d+)/) || title.match(/arquivo.*?(\d+)/i);
  if (matchNum) {
    const rawNum = parseInt(matchNum[1], 10);
    const num = String(rawNum).padStart(2, '0');
    const colorMap: Record<string, { accent: string; bgTint: string }> = {
      '01': { accent: '#38BDF8', bgTint: 'rgba(56, 189, 248, 0.1)' },
      '02': { accent: '#10B981', bgTint: 'rgba(16, 185, 129, 0.1)' },
      '03': { accent: '#A855F7', bgTint: 'rgba(168, 85, 247, 0.1)' },
      '04': { accent: '#F97316', bgTint: 'rgba(249, 115, 22, 0.1)' },
      '05': { accent: '#F43F5E', bgTint: 'rgba(244, 63, 94, 0.1)' },
      '06': { accent: '#6366F1', bgTint: 'rgba(99, 102, 241, 0.1)' },
      '07': { accent: '#14B8A6', bgTint: 'rgba(20, 184, 166, 0.1)' },
      '09': { accent: '#E11D48', bgTint: 'rgba(225, 29, 72, 0.1)' },
    };
    const c = colorMap[num] || { accent: '#06B6D4', bgTint: 'rgba(6, 182, 212, 0.1)' };
    return {
      badge: `#${num}`,
      accent: c.accent,
      bgTint: c.bgTint,
      icon: 'document-text-outline',
      primaryLabel: 'CASOS',
      subLabel: `ARQUIVO #${num}`,
    };
  }

  return {
    badge: 'DOSSIÊ',
    accent: '#3B82F6',
    bgTint: 'rgba(59, 130, 246, 0.1)',
    icon: 'folder-open-outline',
    primaryLabel: book.title ? book.title.toUpperCase().slice(0, 14) : 'LIVRO',
    subLabel: `${book.pageCount} PÁG.`,
  };
};

const BookCoverCard: React.FC<{
  book: BookInfo;
  colors: ThemeColors;
  styles: any;
  onPress: () => void;
}> = ({ book, colors, styles, onPress }) => {
  const [imgError, setImgError] = useState(false);
  const isServerActive = isPdfServerConfigured();
  const coverThumbUrl = isServerActive ? getRenderedPdfPageUrl(book.fileName, 1, 90) : '';
  const theme = useMemo(() => getBookThemeInfo(book), [book]);

  return (
    <TouchableOpacity
      style={[styles.coverThumbWrap, { borderColor: theme.accent }]}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel={`Capa do livro ${book.title}`}
    >
      {coverThumbUrl && !imgError ? (
        <Image
          source={{ uri: coverThumbUrl }}
          style={styles.coverThumbImg}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={styles.coverFallbackCard}>
          <View style={[styles.coverTopStrip, { backgroundColor: theme.accent }]} />
          <View style={[styles.coverBadgePill, { borderColor: theme.accent, backgroundColor: theme.bgTint }]}>
            <Text style={[styles.coverBadgePillText, { color: theme.accent }]}>
              {theme.badge}
            </Text>
          </View>
          <View style={styles.coverIconWrap}>
            <Ionicons name={theme.icon} size={22} color={theme.accent} />
          </View>
          <View style={styles.coverTextWrap}>
            <Text style={styles.coverFallbackTitle} numberOfLines={2}>
              {theme.primaryLabel}
            </Text>
            <Text style={[styles.coverFallbackSub, { color: theme.accent }]} numberOfLines={1}>
              {theme.subLabel}
            </Text>
          </View>
        </View>
      )}
      <View style={[styles.pdfTagCorner, { backgroundColor: theme.accent }]}>
        <Text style={styles.pdfTagCornerText}>PDF</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function BooksScreen() {
  const { books, catalogBooks, searchInBookPages, openManual, openPdfAccessModal, deletePdfBook } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);
  const sortedBooks = books;
  const booksMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const [pageQuery, setPageQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  const [currentPageNo, setCurrentPageNo] = useState(1);
  const [viewerMode, setViewerMode] = useState<PdfViewerMode>('pdf_scroll');
  const [readerOpen, setReaderOpen] = useState(false);

  const pageSearchResults = useMemo(() => {
    if (pageQuery.trim().length < 2) return [];
    return searchInBookPages('all', pageQuery.trim());
  }, [pageQuery, searchInBookPages]);

  const openBookAtPage = useCallback((
    book: BookInfo,
    pageNo: number,
    mode?: PdfViewerMode
  ) => {
    setSelectedBook(book);
    setCurrentPageNo(Math.max(1, Math.min(book.pageCount, pageNo)));
    const hasDirect = Boolean(
      book.hasLocalPdf ||
      book.localPdfAvailable ||
      book.driveSynced ||
      book.driveFileId ||
      localPdfStorage.hasPdfOffline(book.id)
    );
    const defaultMode = mode || (hasDirect || isPdfServerConfigured() ? 'pdf_scroll' : 'text');
    setViewerMode(defaultMode);
    setReaderOpen(true);
  }, []);

  const openExternalPdf = useCallback(async (book: BookInfo, pageNo: number = 1) => {
    try {
      const isOffline = localPdfStorage.hasPdfOffline(book.id);
      if (isOffline) {
        const opened = await openPdfDocument(book.fileName, pageNo);
        if (opened) return;
      }
      const opened = await openPdfDocument(book.fileName, pageNo, book.driveFileId);
      if (!opened) {
        openBookAtPage(book, pageNo, 'text');
      }
    } catch {
      openBookAtPage(book, pageNo, 'text');
    }
  }, [openBookAtPage]);

  const handleDeletePdf = useCallback(
    (book: BookInfo) => {
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
          await deletePdfBook(book.id);
        },
      });
    },
    [deletePdfBook]
  );

  const renderSnippetItem = useCallback(({ item }: { item: ReturnType<typeof searchInBookPages>[0] }) => {
    const bookObj = booksMap.get(item.bookId);
    return (
      <TouchableOpacity
        style={styles.snippetCard}
        onPress={() => bookObj && openBookAtPage(bookObj, item.pageNumber)}
      >
        <View style={styles.snippetHeader}>
          <Text style={styles.snippetBook}>{item.bookTitle}</Text>
          <View style={styles.snippetPageBadge}>
            <Ionicons name="document-text-outline" size={12} color="#FCA5A5" />
            <Text style={styles.snippetPage}>Abrir Livro • Pág. {item.pageNumber}</Text>
          </View>
        </View>
        <Text style={styles.snippetSection}>{item.section}</Text>
        <Text style={styles.snippetText}>{item.snippet}</Text>
      </TouchableOpacity>
    );
  }, [booksMap, openBookAtPage, styles]);

  return (
    <View style={styles.container}>
      {/* Busca Textual nas 1.261 Páginas dos Livros */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, marginBottom: 8 }}>
        <View style={[styles.searchBarWrap, { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar trecho nas 1.261 páginas..."
            placeholderTextColor={colors.textMuted}
            value={pageQuery}
            onChangeText={setPageQuery}
          />
          {pageQuery.length > 0 && (
            <TouchableOpacity onPress={() => setPageQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          testID="btn-open-pdf-access-modal"
          onPress={openPdfAccessModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            height: 42,
            borderRadius: 10,
            backgroundColor: colors.primary,
          }}
          accessibilityLabel="Disponibilizar PDFs e Senha do Mestre"
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>Disponibilizar PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openManual('books')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            height: 42,
            borderRadius: 10,
            backgroundColor: colors.primarySoft,
            borderWidth: 1,
            borderColor: colors.primary,
          }}
          accessibilityLabel="Manual dos Livros e PDFs"
        >
          <Ionicons name="help-circle-outline" size={17} color={colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Manual</Text>
        </TouchableOpacity>
      </View>

      {pageQuery.trim().length >= 2 ? (
        <FlatList
          data={pageSearchResults}
          keyExtractor={(item, idx) => `${item.bookId}_${item.pageNumber}_${idx}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}
          initialNumToRender={10}
          maxToRenderPerBatch={15}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          ListHeaderComponent={
            <Text style={styles.resultsHeader}>
              {pageSearchResults.length} ocorrências encontradas — toque para abrir a página real do PDF
            </Text>
          }
          renderItem={renderSnippetItem}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}>
          {/* Banner informativo sobre o Visualizador Real de PDFs e Pipeline */}
          <View style={styles.pipelineBanner}>
            <View style={styles.pipelineHeader}>
              <Ionicons name="document-attach" size={18} color={colors.primary} />
              <Text style={styles.pipelineTitle}>
                Visualizador de PDF Integrado • 10 Livros
              </Text>
              <View
                style={[
                  styles.bannerServerPill,
                  { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                ]}
              >
                <View
                  style={[
                    styles.bannerServerDot,
                    { backgroundColor: '#10B981' },
                  ]}
                />
                <Text
                  style={[
                    styles.bannerServerPillText,
                    { color: '#10B981' },
                  ]}
                >
                  100% Integrado
                </Text>
              </View>
            </View>
            <Text style={styles.pipelineDesc}>
              Todas as 1.261 páginas oficiais estão conectadas diretamente ao leitor integrado com suporte a busca textual,
              sumário hierárquico e visualização offline. Faça upload dos PDFs que você tem acesso (ou use a Senha do Mestre) para liberar os dados no Compêndio e ler os livros offline.
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: colors.primarySoft,
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 10,
                paddingVertical: 9,
                paddingHorizontal: 12,
                marginTop: 4,
              }}
              onPress={openPdfAccessModal}
            >
              <Ionicons name="key-outline" size={15} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>
                Enviar PDFs / Liberar com Senha do Mestre ({sortedBooks.length}/{catalogBooks.length} liberados)
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeading}>
            Biblioteca de PDFs Anexados ({sortedBooks.length} Livros • 1.261 Páginas)
          </Text>

          {sortedBooks.length === 0 && (
            <View style={styles.bookCard}>
              <View style={{ alignItems: 'center', paddingVertical: 14, gap: 8 }}>
                <Ionicons name="lock-closed-outline" size={34} color={colors.primary} />
                <Text style={[styles.bookTitle, { textAlign: 'center' }]}>
                  Nenhum PDF disponibilizado ainda
                </Text>
                <Text style={[styles.pipelineDesc, { textAlign: 'center' }]}>
                  Envie seus arquivos PDF (ex.: Livro Base, Arquivos Secretos #01, #03) ou digite a Senha do Mestre para liberar os livros no leitor e no Compêndio.
                </Text>
                <TouchableOpacity style={styles.readBookBtn} onPress={openPdfAccessModal}>
                  <Ionicons name="cloud-upload-outline" size={15} color="#FFF" />
                  <Text style={styles.readBookBtnText}>Disponibilizar Meus PDFs / Senha Mestre</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {sortedBooks.map((book) => {
            return (
              <View key={book.id} style={styles.bookCard}>
                <View style={styles.bookHeader}>
                  {/* Miniatura / Capa Estilizada Oficial */}
                  <BookCoverCard
                    book={book}
                    colors={colors}
                    styles={styles}
                    onPress={() => openBookAtPage(book, 1)}
                  />

                  <View style={styles.bookInfoCol}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookMeta}>
                      {book.fileName} • {book.pageCount} páginas • {book.toc.length} capítulos
                    </Text>

                    <View style={styles.bookActionsRow}>
                      <TouchableOpacity
                        style={styles.readBookBtn}
                        onPress={() => openBookAtPage(book, 1)}
                      >
                        <Ionicons name="book-outline" size={14} color="#FFF" />
                        <Text style={styles.readBookBtnText}>Ler PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryBookBtn}
                        onPress={() => openExternalPdf(book, 1)}
                      >
                        <Ionicons name="open-outline" size={14} color={colors.text} />
                        <Text style={styles.secondaryBookBtnText}>
                          {Platform.OS === 'web' ? 'Nova Aba' : 'Abrir PDF'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        testID={`btn-delete-pdf-${book.id}`}
                        style={styles.deleteBookBtn}
                        onPress={() => handleDeletePdf(book)}
                        accessibilityLabel={`Excluir PDF de ${book.title}`}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={styles.deleteBookBtnText}>Excluir PDF</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {book.toc && book.toc.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tocChipsRow}
                  >
                    {book.toc
                      .filter(
                        (t) =>
                          t.level <= 2 && !['Capa', 'Créditos', 'Sumário'].includes(t.title)
                      )
                      .slice(0, 14)
                      .map((entry, idx) => (
                        <TouchableOpacity
                          key={`${book.id}_toc_${idx}`}
                          style={styles.tocChip}
                          onPress={() => openBookAtPage(book, entry.page)}
                        >
                          <Text style={styles.tocChipText}>
                            {entry.title} (p. {entry.page})
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal Visualizador Real de PDF */}
      <PdfViewerModal
        visible={readerOpen}
        onClose={() => setReaderOpen(false)}
        book={selectedBook}
        initialPage={currentPageNo}
        highlightTerm={pageQuery.trim()}
        initialMode={viewerMode}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchBarWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      margin: 14,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    listContent: {
      paddingHorizontal: 14,
      paddingBottom: 90,
      gap: 12,
    },
    resultsHeader: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
    },
    snippetCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
      marginBottom: 10,
    },
    snippetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    snippetBook: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
    snippetPageBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    snippetPage: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    snippetSection: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
    },
    snippetText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    pipelineBanner: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 6,
    },
    pipelineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pipelineTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
    },
    pipelineDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    codeInline: {
      color: colors.primary,
      fontWeight: '800',
    },
    sectionHeading: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 4,
    },
    bookCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    bookHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    coverThumbWrap: {
      width: 68,
      height: 96,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
      position: 'relative',
    },
    coverThumbImg: {
      width: '100%',
      height: '100%',
    },
    pdfTagCorner: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderTopLeftRadius: 5,
    },
    pdfTagCornerText: {
      color: '#FFF',
      fontSize: 8,
      fontWeight: '900',
    },
    bookInfoCol: {
      flex: 1,
      gap: 4,
    },
    bookTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    bookMeta: {
      color: colors.textMuted,
      fontSize: 12,
    },
    bookActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
      flexWrap: 'wrap',
    },
    readBookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 9,
    },
    readBookBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 12,
    },
    secondaryBookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 9,
    },
    secondaryBookBtnText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 12,
    },
    tocChipsRow: {
      gap: 8,
      paddingVertical: 2,
    },
    tocChip: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    tocChipText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    coverFallbackCard: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 5,
      paddingHorizontal: 4,
    },
    coverTopStrip: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    coverBadgePill: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      borderWidth: 1,
      marginTop: 2,
    },
    coverBadgePillText: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    coverIconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 1,
    },
    coverTextWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingBottom: 2,
    },
    coverFallbackTitle: {
      color: colors.text,
      fontSize: 8.5,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0.2,
      lineHeight: 11,
    },
    coverFallbackSub: {
      fontSize: 7,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 1,
      letterSpacing: 0.3,
    },
    bannerServerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginLeft: 'auto',
    },
    bannerServerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    bannerServerPillText: {
      fontSize: 10,
      fontWeight: '800',
    },
    deleteBookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    deleteBookBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#EF4444',
    },
  });
