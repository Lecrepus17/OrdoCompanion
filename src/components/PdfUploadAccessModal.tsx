import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import * as DocumentPicker from 'expo-document-picker';
import { deleteCachedFile } from '../services/pdf/PdfCacheService';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { getMasterGoogleDriveFolderUrl } from '../utils/pdfUrl';
import { confirmAction } from '../utils/alert';
import { CatalogBookInfo } from '../types/compendium';
import {
  downloadBookPdfOffline,
  downloadAllUnlockedBooksOffline,
} from '../services/pdf/PdfAccessService';

interface PdfUploadAccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PdfUploadAccessModal: React.FC<PdfUploadAccessModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    catalogBooks,
    uploadAndUnlockPdf,
    unlockWithMasterPassword,
    lockBook,
    deletePdfBook,
    syncAuthState,
  } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const [uploading, setUploading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const fileInputRef = useRef<any>(null);
  const targetBookFileNameRef = useRef<string | null>(null);

  const unlockedBooksCount = catalogBooks.filter((b: CatalogBookInfo) => b.isUnlocked).length;
  const totalEntitiesUnlocked = catalogBooks
    .filter((b: CatalogBookInfo) => b.isUnlocked)
    .reduce((acc: number, b: CatalogBookInfo) => acc + (b.entityCount || 0), 0);

  const handleWebFileChange = useCallback(
    async (e: any) => {
      const files: FileList | undefined = e?.target?.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      setStatusBanner({
        type: 'info',
        text: `Analisando ${files.length} arquivo(s) PDF...`,
      });

      const messages: string[] = [];
      let anyError = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const effectiveName = targetBookFileNameRef.current || file.name;
          const res = await uploadAndUnlockPdf({
            fileName: effectiveName,
            bytes,
            fileSize: file.size,
          });
          messages.push(res.message);
          if (!res.ok) anyError = true;
        } catch (err: any) {
          anyError = true;
          messages.push(`Erro ao ler ${file.name}: ${err?.message || 'Falha desconhecida'}`);
        }
      }

      targetBookFileNameRef.current = null;
      if (e?.target) {
        e.target.value = '';
      }

      setUploading(false);
      setStatusBanner({
        type: anyError && messages.length === 1 ? 'error' : 'success',
        text: messages.join('\n'),
      });
    },
    [uploadAndUnlockPdf]
  );

  const triggerFilePicker = useCallback(
    async (suggestedFileName?: string) => {
      targetBookFileNameRef.current = suggestedFileName || null;
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        if (!fileInputRef.current) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,application/pdf';
          input.multiple = true;
          input.style.display = 'none';
          input.onchange = handleWebFileChange;
          document.body.appendChild(input);
          fileInputRef.current = input;
        } else {
          fileInputRef.current.onchange = handleWebFileChange;
        }
        fileInputRef.current.click();
        return;
      }

      // No Android / iOS (Nativo / APK): Abre o seletor nativo do sistema de arquivos
      try {
        setUploading(true);
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf'],
          copyToCacheDirectory: true,
          multiple: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          // Se o usuário cancelou e era um teste/mock sem arquivos reais
          if (suggestedFileName) {
            const res = await uploadAndUnlockPdf({ fileName: suggestedFileName });
            setStatusBanner({
              type: res.ok ? 'success' : 'error',
              text: res.message,
            });
          }
          setUploading(false);
          return;
        }

        setStatusBanner({
          type: 'info',
          text: `Analisando ${result.assets.length} arquivo(s) PDF...`,
        });

        const messages: string[] = [];
        let anyError = false;

        for (const asset of result.assets) {
          try {
            const effectiveName = targetBookFileNameRef.current || asset.name;

            // NO CELULAR (Android/iOS): NUNCA carregar o arquivo na RAM via fetch(asset.uri)!
            // O DocumentPicker já fornece o arquivo em disco no asset.uri e o asset.size.
            // Para arquivos oficiais e suplementos, identificamos e salvamos em disco com consumo ZERO de RAM!
            const res = await uploadAndUnlockPdf({
              fileName: effectiveName,
              fileSize: asset.size,
              fileUri: asset.uri,
            });

            await deleteCachedFile(asset.uri);
            messages.push(res.message);
            if (!res.ok) anyError = true;
          } catch (fileErr: any) {
            await deleteCachedFile(asset.uri);
            anyError = true;
            messages.push(
              `Erro ao ler ${asset.name}: ${fileErr?.message || 'Falha ao processar arquivo'}`
            );
          }
        }

        targetBookFileNameRef.current = null;
        setUploading(false);
        setStatusBanner({
          type: anyError && messages.length === 1 ? 'error' : 'success',
          text: messages.join('\n'),
        });
      } catch (err: any) {
        setUploading(false);
        setStatusBanner({
          type: 'error',
          text: `Erro ao selecionar arquivo: ${err?.message || 'Falha desconhecida'}`,
        });
      }
    },
    [handleWebFileChange, uploadAndUnlockPdf]
  );

  const handleVerifyMasterPassword = useCallback(async () => {
    if (verifyingCode) return;
    if (!masterPasswordInput.trim()) {
      setStatusBanner({
        type: 'error',
        text: 'Digite a Senha Mestre fornecida para liberar o acervo.',
      });
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await unlockWithMasterPassword(masterPasswordInput.trim());
      setStatusBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) {
        setMasterPasswordInput('');
      }
    } finally {
      setVerifyingCode(false);
    }
  }, [masterPasswordInput, unlockWithMasterPassword, verifyingCode]);

  const handleOpenMasterDrive = useCallback(async () => {
    const driveUrl = getMasterGoogleDriveFolderUrl();
    if (!driveUrl) {
      setStatusBanner({
        type: 'info',
        text: 'A pasta compartilhada do Google Drive ainda não foi disponibilizada pelo Mestre da mesa.',
      });
      return;
    }
    try {
      await Linking.openURL(driveUrl);
    } catch {
      setStatusBanner({
        type: 'error',
        text: `Não foi possível abrir o link da pasta: ${driveUrl}`,
      });
    }
  }, []);

  const handleDownloadAllOffline = useCallback(async () => {
    if (downloadingOffline) return;
    setDownloadingOffline(true);
    setDownloadProgress('Iniciando download dos PDFs...');
    setStatusBanner({
      type: 'info',
      text: 'Baixando livros liberados para o armazenamento offline do aparelho...',
    });
    try {
      const res = await downloadAllUnlockedBooksOffline((cur, tot, title) => {
        setDownloadProgress(`Baixando ${cur} de ${tot}: ${title}...`);
      });
      setDownloadingOffline(false);
      setDownloadProgress('');
      if (res.downloaded > 0) {
        setStatusBanner({
          type: 'success',
          text: `${res.downloaded} livro(s) salvo(s) offline no aparelho! Agora disponíveis sem precisar do servidor.`,
        });
      } else {
        setStatusBanner({
          type: 'info',
          text: 'Servidor local não encontrado ou livros já baixados. Você também pode enviar os PDFs diretamente pelo botão "Enviar PDF" para tê-los offline.',
        });
      }
    } catch (err: any) {
      setDownloadingOffline(false);
      setDownloadProgress('');
      setStatusBanner({
        type: 'error',
        text: `Erro ao baixar acervo: ${err?.message || 'Falha de conexão'}`,
      });
    }
  }, [downloadingOffline]);

  const handleDownloadSingleBook = useCallback(async (book: CatalogBookInfo) => {
    setStatusBanner({
      type: 'info',
      text: `Baixando "${book.title}" para o aparelho (leitura offline)...`,
    });
    try {
      const res = await downloadBookPdfOffline(book.id, (msg) => {
        setStatusBanner({ type: 'info', text: msg });
      });
      setStatusBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: `Erro ao baixar ${book.title}: ${err?.message || 'Falha desconhecida'}`,
      });
    }
  }, []);

  const handleDeleteBook = useCallback(
    (book: CatalogBookInfo) => {
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
          const res = await deletePdfBook(book.id);
          setStatusBanner({
            type: res.ok ? 'success' : 'error',
            text: res.message,
          });
        },
      });
    },
    [deletePdfBook]
  );

  const renderBookRow = (book: CatalogBookInfo) => {
    return (
      <View
        key={book.id}
        style={[
          styles.bookItemCard,
          book.isUnlocked && { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.06)' },
        ]}
      >
        <View style={styles.bookItemMain}>
          <View style={styles.bookItemTitleRow}>
            <Ionicons
              name={book.isUnlocked ? 'checkmark-circle' : 'lock-closed'}
              size={18}
              color={book.isUnlocked ? '#10B981' : colors.textMuted}
            />
            <Text style={styles.bookItemTitle}>{book.title}</Text>
            {book.isCustomBook && (
              <View style={styles.pyBadge}>
                <Text style={styles.pyBadgeText}>Extraído via .py</Text>
              </View>
            )}
          </View>
          <Text style={styles.bookItemMeta}>
            Origem: {book.fileName} • {book.pageCount} págs • {book.entityCount} itens no Compêndio
          </Text>

          <View style={styles.badgesRow}>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: book.isUnlocked
                    ? 'rgba(16, 185, 129, 0.16)'
                    : colors.surfaceElevated,
                  borderColor: book.isUnlocked ? '#10B981' : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: book.isUnlocked ? '#10B981' : colors.textMuted },
                ]}
              >
                {book.isUnlocked ? 'Dados & Leitor Liberados' : 'Bloqueado (Envie o PDF)'}
              </Text>
            </View>

            {book.isUnlocked && book.localPdfAvailable && (
              <View style={styles.offlinePill}>
                <Ionicons name="cloud-done-outline" size={11} color="#60A5FA" />
                <Text style={styles.offlinePillText}>Disponível Offline</Text>
              </View>
            )}

            {book.isUnlocked && (book.driveSynced || syncAuthState.isAuthenticated) && (
              <View style={styles.drivePill}>
                <Ionicons name="logo-google" size={10} color="#A78BFA" />
                <Text style={styles.drivePillText}>Salvo no Drive</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bookItemActions}>
          {!book.isUnlocked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {book.isCustomBook && (
                <TouchableOpacity
                  testID={`btn-delete-catalog-book-${book.id}`}
                  style={styles.deleteBookBtn}
                  onPress={() => handleDeleteBook(book)}
                  accessibilityLabel={`Excluir ${book.title}`}
                >
                  <Ionicons name="trash-outline" size={13} color="#EF4444" />
                  <Text style={styles.deleteBookBtnText}>Excluir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID={`btn-upload-book-${book.id}`}
                style={styles.uploadBookBtn}
                onPress={() => triggerFilePicker(book.fileName)}
              >
                <Ionicons name="cloud-upload-outline" size={14} color="#FFF" />
                <Text style={styles.uploadBookBtnText}>Enviar PDF</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!book.localPdfAvailable && (
                <TouchableOpacity
                  style={[styles.uploadBookBtn, { backgroundColor: '#2563EB', paddingHorizontal: 10 }]}
                  onPress={() => handleDownloadSingleBook(book)}
                >
                  <Ionicons name="download-outline" size={13} color="#FFF" />
                  <Text style={styles.uploadBookBtnText}>Baixar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                testID={`btn-lock-book-${book.id}`}
                style={styles.lockBookBtn}
                onPress={() => lockBook(book.id)}
              >
                <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
                <Text style={styles.lockBookBtnText}>Bloquear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID={`btn-delete-catalog-book-${book.id}`}
                style={styles.deleteBookBtn}
                onPress={() => handleDeleteBook(book)}
                accessibilityLabel={`Excluir PDF de ${book.title}`}
              >
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
                <Text style={styles.deleteBookBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalBox,
            { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gerenciar Acesso aos Livros & PDFs</Text>
              <Text style={styles.headerSubtitle}>
                {unlockedBooksCount} de {catalogBooks.length} livros liberados • {totalEntitiesUnlocked} entidades ativas
              </Text>
            </View>
            <TouchableOpacity
              testID="btn-close-pdf-access-modal"
              style={styles.closeBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {statusBanner && (
              <View
                style={[
                  styles.bannerBox,
                  statusBanner.type === 'success' && styles.bannerSuccess,
                  statusBanner.type === 'error' && styles.bannerError,
                  statusBanner.type === 'info' && styles.bannerInfo,
                ]}
              >
                <Ionicons
                  name={
                    statusBanner.type === 'success'
                      ? 'checkmark-circle'
                      : statusBanner.type === 'error'
                      ? 'alert-circle'
                      : 'information-circle'
                  }
                  size={18}
                  color={
                    statusBanner.type === 'success'
                      ? '#10B981'
                      : statusBanner.type === 'error'
                      ? '#EF4444'
                      : '#3B82F6'
                  }
                />
                <Text style={styles.bannerText}>{statusBanner.text}</Text>
              </View>
            )}

            {/* SEÇÃO 1: UPLOAD DE PDF */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>1. Disponibilizar Meus Arquivos PDF</Text>
              </View>
              <Text style={styles.sectionDesc}>
                Envie os arquivos <Text style={styles.bold}>.pdf</Text> que você possui acesso (como{' '}
                <Text style={styles.bold}>Livro Base</Text>,{' '}
                <Text style={styles.bold}>Sobrevivendo ao Horror</Text>,{' '}
                <Text style={styles.bold}>Arquivos Secretos #01, #03</Text>, etc.).{'\n'}• Se for um
                livro registrado, o sistema valida o arquivo e libera imediatamente os dados desse
                livro no Compêndio e o PDF no Leitor.{'\n'}• Se for um PDF inédito (não registrado),
                ele será extraído <Text style={styles.bold}>100% com os scripts .py</Text> e
                adicionado ao seu Compêndio e Leitor.{'\n'}• Todos os PDFs enviados ficam salvos{' '}
                <Text style={styles.bold}>offline</Text> e sincronizados no seu{' '}
                <Text style={styles.bold}>Google Drive</Text>.
              </Text>

              <TouchableOpacity
                testID="btn-pick-pdf-files"
                style={styles.primaryUploadBtn}
                onPress={() => {
                  if (!uploading) triggerFilePicker();
                }}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="cloud-upload" size={18} color="#FFF" />
                )}
                <Text style={styles.primaryUploadBtnText}>
                  {uploading ? 'Processando PDF...' : 'Selecionar Arquivo(s) PDF para Liberar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SEÇÃO 2: LIBERAÇÃO POR SENHA DO MESTRE & GOOGLE DRIVE */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="key-outline" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>
                  2. Liberação por Senha do Mestre & Google Drive
                </Text>
              </View>
              <Text style={styles.sectionDesc}>
                Se você joga com um Mestre autorizado, insira a senha secreta fornecida por ele para liberar
                todos os livros canônicos e o compêndio automaticamente.{'\n'}
                • <Text style={styles.bold}>100% Offline e Instantâneo:</Text> Não depende de e-mails ou servidores externos.{'\n'}
                • <Text style={styles.bold}>Google Drive do Mestre:</Text> Acesse a pasta compartilhada pelo autor para obter os arquivos PDF oficiais.
              </Text>

              <View style={styles.codeRow}>
                <TextInput
                  testID="input-admin-unlock-code"
                  style={styles.codeInput}
                  placeholder="Digite a Senha Mestre fornecida..."
                  placeholderTextColor={colors.textMuted}
                  value={masterPasswordInput}
                  onChangeText={setMasterPasswordInput}
                  autoCapitalize="characters"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={{ paddingHorizontal: 8, justifyContent: 'center' }}
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityLabel="Alternar visualização da senha"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  testID="btn-verify-admin-unlock-code"
                  style={styles.verifyCodeBtn}
                  onPress={handleVerifyMasterPassword}
                >
                  {verifyingCode ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="key" size={16} color="#FFF" />
                  )}
                  <Text style={styles.verifyCodeBtnText}>Liberar Tudo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                testID="btn-open-master-gdrive"
                style={[styles.sendEmailBtn, { marginTop: 12, borderColor: '#3B82F6' }]}
                onPress={handleOpenMasterDrive}
              >
                <Ionicons name="logo-google" size={16} color="#3B82F6" />
                <Text style={[styles.sendEmailBtnText, { color: '#3B82F6' }]}>
                  {getMasterGoogleDriveFolderUrl()
                    ? 'Acessar Pasta de Livros no Google Drive'
                    : 'Pasta de Livros no Google Drive'}
                </Text>
              </TouchableOpacity>

              {unlockedBooksCount > 0 && (
                <TouchableOpacity
                  testID="btn-download-all-offline"
                  style={[
                    styles.primaryUploadBtn,
                    { backgroundColor: '#059669', marginTop: 10 },
                  ]}
                  onPress={handleDownloadAllOffline}
                  disabled={downloadingOffline}
                >
                  {downloadingOffline ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
                  )}
                  <Text style={styles.primaryUploadBtnText}>
                    {downloadingOffline
                      ? downloadProgress || 'Baixando acervo offline...'
                      : 'Baixar PDFs Liberados para o Celular (Uso Offline)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SEÇÃO 3: CATÁLOGO DE ORIGENS (LIVROS REGISTRADOS + EXTRAS .PY) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="library-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  3. Origem dos Dados ({unlockedBooksCount}/{catalogBooks.length} PDFs Liberados)
                </Text>
              </View>
              <Text style={styles.sectionDesc}>
                Cada entidade do aplicativo referencia seu PDF de origem. Apenas os livros marcados
                como liberados abaixo têm seus dados exibidos no Compêndio e nas ferramentas.
              </Text>

              <View style={{ gap: 10, marginTop: 6 }}>
                {catalogBooks.map(renderBookRow)}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    modalBox: {
      width: '100%',
      maxWidth: 720,
      maxHeight: '92%',
      backgroundColor: colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
    },
    headerSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 16,
      gap: 14,
    },
    bannerBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    bannerSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: '#10B981',
    },
    bannerError: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: '#EF4444',
    },
    bannerInfo: {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: '#3B82F6',
    },
    bannerText: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    sectionDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    bold: {
      color: colors.text,
      fontWeight: '800',
    },
    primaryUploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginTop: 4,
    },
    primaryUploadBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    sendEmailBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      borderWidth: 1,
      borderColor: '#F59E0B',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    sendEmailBtnText: {
      color: '#F59E0B',
      fontSize: 12,
      fontWeight: '800',
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    codeInput: {
      flex: 1,
      height: 42,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    verifyCodeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 42,
      backgroundColor: '#10B981',
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    verifyCodeBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    bookItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 11,
      gap: 10,
    },
    bookItemMain: {
      flex: 1,
      gap: 4,
    },
    bookItemTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    bookItemTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    bookItemMeta: {
      color: colors.textMuted,
      fontSize: 11,
    },
    badgesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusPillText: {
      fontSize: 10,
      fontWeight: '800',
    },
    offlinePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(59, 130, 246, 0.14)',
      borderWidth: 1,
      borderColor: '#3B82F6',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    offlinePillText: {
      color: '#93C5FD',
      fontSize: 10,
      fontWeight: '700',
    },
    drivePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(139, 92, 246, 0.14)',
      borderWidth: 1,
      borderColor: '#8B5CF6',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    drivePillText: {
      color: '#C4B5FD',
      fontSize: 10,
      fontWeight: '700',
    },
    pyBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.18)',
      borderWidth: 1,
      borderColor: '#10B981',
      borderRadius: 5,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    pyBadgeText: {
      color: '#6EE7B7',
      fontSize: 9,
      fontWeight: '800',
    },
    bookItemActions: {
      alignItems: 'flex-end',
    },
    uploadBookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
    },
    uploadBookBtnText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '800',
    },
    lockBookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },
    lockBookBtnText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    deleteBookBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },
    deleteBookBtnText: {
      color: '#EF4444',
      fontSize: 11,
      fontWeight: '700',
    },
  });
