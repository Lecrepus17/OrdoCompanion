import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { ADMIN_UNLOCK_EMAIL } from '../services/pdf/PdfAccessService';
import { CatalogBookInfo } from '../types/compendium';

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
    requestAdminEmailUnlockCode,
    verifyAdminEmailUnlockCode,
    lockBook,
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

  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [emailSentConfirm, setEmailSentConfirm] = useState(false);

  const fileInputRef = useRef<any>(null);
  const targetBookFileNameRef = useRef<string | null>(null);

  const unlockedBooksCount = catalogBooks.filter((b) => b.isUnlocked).length;
  const totalEntitiesUnlocked = catalogBooks
    .filter((b) => b.isUnlocked)
    .reduce((acc, b) => acc + (b.entityCount || 0), 0);

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

  const triggerFilePicker = useCallback((suggestedFileName?: string) => {
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

    // Em dispositivos mobile/testes sem input DOM nativo, se um livro específico foi selecionado, valida o arquivo PDF
    if (suggestedFileName) {
      setUploading(true);
      uploadAndUnlockPdf({ fileName: suggestedFileName })
        .then((res) => {
          setStatusBanner({
            type: res.ok ? 'success' : 'error',
            text: res.message,
          });
        })
        .finally(() => setUploading(false));
    }
  }, [handleWebFileChange, uploadAndUnlockPdf]);

  const handleRequestEmailCode = useCallback(async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    setStatusBanner(null);
    try {
      const res = await requestAdminEmailUnlockCode();
      setEmailSentConfirm(true);
      setStatusBanner({
        type: res.ok ? 'info' : 'error',
        text: res.message,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err?.message || 'Não foi possível enviar o código.',
      });
    } finally {
      setSendingEmail(false);
    }
  }, [requestAdminEmailUnlockCode, sendingEmail]);

  const handleVerifyEmailCode = useCallback(async () => {
    if (verifyingCode) return;
    if (!emailCodeInput.trim()) {
      setStatusBanner({
        type: 'error',
        text: 'Digite o código enviado para pedro.eduardo1777@gmail.com.',
      });
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await verifyAdminEmailUnlockCode(emailCodeInput.trim());
      setStatusBanner({
        type: res.ok ? 'success' : 'error',
        text: res.message,
      });
      if (res.ok) {
        setEmailCodeInput('');
      }
    } finally {
      setVerifyingCode(false);
    }
  }, [emailCodeInput, verifyAdminEmailUnlockCode, verifyingCode]);

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
            <TouchableOpacity
              testID={`btn-upload-book-${book.id}`}
              style={styles.uploadBookBtn}
              onPress={() => triggerFilePicker(book.fileName)}
            >
              <Ionicons name="cloud-upload-outline" size={14} color="#FFF" />
              <Text style={styles.uploadBookBtnText}>Enviar PDF</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID={`btn-lock-book-${book.id}`}
              style={styles.lockBookBtn}
              onPress={() => lockBook(book.id)}
            >
              <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />
              <Text style={styles.lockBookBtnText}>Bloquear</Text>
            </TouchableOpacity>
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

            {/* SEÇÃO 2: LIBERAÇÃO RÁPIDA POR CÓDIGO NO E-MAIL */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="mail-unread-outline" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>
                  2. Liberação Automática via Código por E-mail
                </Text>
              </View>
              <Text style={styles.sectionDesc}>
                Se for você ou um amigo autorizado e não quiser fazer upload manual dos livros atuais,
                envie um código de verificação para{' '}
                <Text style={styles.bold}>{ADMIN_UNLOCK_EMAIL}</Text>. Ao digitar o código abaixo,
                todos os livros atuais são liberados automaticamente e salvos{' '}
                <Text style={styles.bold}>offline</Text> e no seu{' '}
                <Text style={styles.bold}>Google Drive</Text>.
              </Text>

              <TouchableOpacity
                testID="btn-send-admin-unlock-code"
                style={styles.sendEmailBtn}
                onPress={handleRequestEmailCode}
              >
                {sendingEmail ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Ionicons name="paper-plane-outline" size={16} color="#F59E0B" />
                )}
                <Text style={styles.sendEmailBtnText}>
                  {sendingEmail
                    ? 'Enviando código...'
                    : `Enviar Código para ${ADMIN_UNLOCK_EMAIL}`}
                </Text>
              </TouchableOpacity>

              <View style={styles.codeRow}>
                <TextInput
                  testID="input-admin-unlock-code"
                  style={styles.codeInput}
                  placeholder={
                    emailSentConfirm
                      ? 'Digite o código enviado ao e-mail...'
                      : 'Código de 6 dígitos do e-mail...'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={emailCodeInput}
                  onChangeText={setEmailCodeInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  testID="btn-verify-admin-unlock-code"
                  style={styles.verifyCodeBtn}
                  onPress={handleVerifyEmailCode}
                >
                  {verifyingCode ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="key-outline" size={16} color="#FFF" />
                  )}
                  <Text style={styles.verifyCodeBtnText}>Liberar Tudo</Text>
                </TouchableOpacity>
              </View>
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
  });
