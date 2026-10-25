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
import { getRawPdfUrl, getRenderedPdfPageUrl, openPdfDocument } from '../../utils/pdfUrl';
import { sortBooksCanonical } from '../../repositories/OfflineDataRepository';

export default function BooksScreen() {
  const { books, searchInBookPages, openManual } = useApp();
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
    mode: PdfViewerMode = 'pdf_scroll'
  ) => {
    setSelectedBook(book);
    setCurrentPageNo(Math.max(1, Math.min(book.pageCount, pageNo)));
    setViewerMode(mode);
    setReaderOpen(true);
  }, []);

  const openExternalPdf = useCallback((book: BookInfo, pageNo: number = 1) => {
    openPdfDocument(book.fileName, pageNo);
  }, []);

  const renderSnippetItem = useCallback(({ item }: { item: ReturnType<typeof searchInBookPages>[0] }) => {
    const bookObj = booksMap.get(item.bookId);
    return (
      <TouchableOpacity
        style={styles.snippetCard}
        onPress={() => bookObj && openBookAtPage(bookObj, item.pageNumber, 'pdf_scroll')}
      >
        <View style={styles.snippetHeader}>
          <Text style={styles.snippetBook}>{item.bookTitle}</Text>
          <View style={styles.snippetPageBadge}>
            <Ionicons name="document-text-outline" size={12} color="#FCA5A5" />
            <Text style={styles.snippetPage}>Abrir PDF • Pág. {item.pageNumber}</Text>
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
                Visualizador de PDF Integrado + Extração Automática
              </Text>
            </View>
            <Text style={styles.pipelineDesc}>
              Todos os <Text style={styles.codeInline}>10 PDFs originais</Text> estão conectados
              diretamente ao leitor visual com suporte a zoom, sumário interativo, busca interna e
              renderização em alta definição (PDF.js + PyMuPDF). Para adicionar novos livros, basta
              colocar o arquivo <Text style={styles.codeInline}>.pdf</Text> na pasta{' '}
              <Text style={styles.codeInline}>pdfs/</Text> e executar{' '}
              <Text style={styles.codeInline}>npm run extract</Text>.
            </Text>
          </View>

          <Text style={styles.sectionHeading}>
            Biblioteca de PDFs Anexados ({sortedBooks.length} Livros • 1.261 Páginas)
          </Text>

          {sortedBooks.map((book) => {
            const coverThumbUrl = getRenderedPdfPageUrl(book.fileName, 1, 90);
            return (
              <View key={book.id} style={styles.bookCard}>
                <View style={styles.bookHeader}>
                  {/* Miniatura Real da Capa do PDF */}
                  <TouchableOpacity
                    style={styles.coverThumbWrap}
                    activeOpacity={0.85}
                    onPress={() => openBookAtPage(book, 1, 'pdf_scroll')}
                  >
                    <Image
                      source={{ uri: coverThumbUrl }}
                      style={styles.coverThumbImg}
                      resizeMode="cover"
                    />
                    <View style={styles.pdfTagCorner}>
                      <Text style={styles.pdfTagCornerText}>PDF</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.bookInfoCol}>
                    <Text style={styles.bookTitle}>{book.title}</Text>
                    <Text style={styles.bookMeta}>
                      {book.fileName} • {book.pageCount} páginas • {book.toc.length} capítulos
                    </Text>

                    <View style={styles.bookActionsRow}>
                      <TouchableOpacity
                        style={styles.readBookBtn}
                        onPress={() => openBookAtPage(book, 1, 'pdf_scroll')}
                      >
                        <Ionicons name="book-outline" size={14} color="#FFF" />
                        <Text style={styles.readBookBtnText}>Ler PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryBookBtn}
                        onPress={() => openExternalPdf(book, 1)}
                      >
                        <Ionicons name="open-outline" size={14} color={colors.text} />
                        <Text style={styles.secondaryBookBtnText}>Nova Aba</Text>
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
                          onPress={() => openBookAtPage(book, entry.page, 'pdf_scroll')}
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
      width: 62,
      height: 84,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
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
      fontSize: 9,
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
  });
