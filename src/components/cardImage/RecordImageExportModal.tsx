import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { CompendiumEntity } from '../../types/compendium';
import { RecordPreviewTarget } from '../../types/recordPreview';
import { extractRecordCardData } from '../../services/cardImage/cardDataExtractor';
import {
  downloadCardImage,
  formatRecordTextForSharing,
  shareCardImage,
} from '../../services/cardImage/cardExportService';
import {
  getAllCardThemes,
  getCardThemeById,
  resolveRecordTheme,
} from '../../services/cardImage/themeRegistry';
import { CardThemeDefinition } from '../../services/cardImage/types';
import { RecordImageCard } from './RecordImageCard';
import { copyToClipboard } from '../../utils/clipboard';

export interface RecordImageExportModalProps {
  visible: boolean;
  target: CompendiumEntity | RecordPreviewTarget | null;
  onClose: () => void;
}

export const RecordImageExportModal: React.FC<RecordImageExportModalProps> = ({
  visible,
  target,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isLandscape = windowWidth > windowHeight || windowHeight < 520;
  const isNarrowScreen = windowWidth < 460;

  // 1. Extração dos dados do card
  const cardData = useMemo(() => {
    if (!target) return null;
    return extractRecordCardData(target);
  }, [target]);

  // 2. Tema recomendado automaticamente (pelo elemento ou categoria)
  const recommendedTheme = useMemo(() => {
    if (!target) return getCardThemeById('padrao_ordo');
    return resolveRecordTheme(target);
  }, [target]);

  // 3. Tema selecionado atualmente (permite o usuário testar outros estilos)
  const [selectedThemeId, setSelectedThemeId] = useState<string>(recommendedTheme.id);
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Sincroniza tema recomendado quando o target mudar
  useEffect(() => {
    if (visible && recommendedTheme) {
      setSelectedThemeId(recommendedTheme.id);
      setFeedbackMsg(null);
    }
  }, [visible, recommendedTheme]);

  // Interceptação de hardware back press no Android
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const activeTheme: CardThemeDefinition = useMemo(() => {
    return getCardThemeById(selectedThemeId);
  }, [selectedThemeId]);

  const allThemes = useMemo(() => getAllCardThemes(), []);

  if (!visible || !cardData) return null;

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3200);
  };

  // Handler de Download
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      const res = await downloadCardImage(cardData, activeTheme, { format: exportFormat });
      if (res.success) {
        if (Platform.OS === 'web') {
          showFeedback(`Download concluído: ${res.fileName}`);
        } else {
          showFeedback(`Card ${exportFormat.toUpperCase()} salvo com sucesso!`);
        }
      } else {
        showFeedback(`Aviso: ${res.error || 'Não foi possível exportar'}`);
      }
    } catch (err: any) {
      showFeedback(`Erro: ${err?.message || 'Falha ao baixar imagem'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handler de Compartilhamento
  const handleShare = async () => {
    try {
      setIsExporting(true);
      const res = await shareCardImage(cardData, activeTheme, { format: exportFormat });
      if (res.success) {
        showFeedback(res.sharedAsFile ? 'Imagem compartilhada!' : 'Registro compartilhado!');
      }
    } catch (err: any) {
      showFeedback(`Erro ao compartilhar: ${err?.message || 'Falha'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handler de Cópia de Texto
  const handleCopyText = async () => {
    try {
      const text = formatRecordTextForSharing(cardData, activeTheme);
      const ok = await copyToClipboard(text, cardData.name);
      if (ok) {
        showFeedback('Texto do registro copiado/compartilhado com sucesso!');
      } else {
        showFeedback('Falha ao copiar texto.');
      }
    } catch {
      showFeedback('Falha ao copiar texto.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Fechar ao tocar fora"
        />

        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              height: isLandscape ? '98%' : '92%',
              maxHeight: isLandscape ? '98%' : '94%',
              maxWidth: isLandscape ? 740 : 620,
            },
          ]}
        >
          {/* 1. Header do Modal */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingVertical: isLandscape ? 8 : 14,
              },
            ]}
          >
            <View style={styles.headerTitleWrap}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="image" size={isLandscape ? 18 : 20} color={colors.primary} />
                <Text
                  style={[
                    styles.headerTitle,
                    { color: colors.text, fontSize: isLandscape ? 15 : 17 },
                  ]}
                >
                  Gerar Imagem do Registro
                </Text>
              </View>
              {!isLandscape && (
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Tema automático baseado no {cardData.element ? `elemento (${cardData.element})` : `tipo (${cardData.categoryLabel})`}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.surfaceElevated }]}
              onPress={onClose}
              accessibilityLabel="Fechar modal"
              testID="close-card-modal-btn"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Feedback Toast */}
          {feedbackMsg && (
            <View style={[styles.feedbackBanner, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={[styles.feedbackText, { color: colors.text }]}>{feedbackMsg}</Text>
            </View>
          )}

          {/* 2. Seletor de Temas e Fundos (Carrossel Horizontal) */}
          <View
            style={[
              styles.themeSelectorContainer,
              { paddingVertical: isLandscape ? 4 : 10 },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.textMuted, marginBottom: isLandscape ? 4 : 8 },
              ]}
            >
              ESTILO &amp; FUNDO DA IMAGEM:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.themeScroll}
            >
              {allThemes.map((th) => {
                const isSelected = th.id === selectedThemeId;
                const isRecommended = th.id === recommendedTheme.id;

                return (
                  <TouchableOpacity
                    key={th.id}
                    style={[
                      styles.themePill,
                      {
                        backgroundColor: isSelected ? th.colors.surfaceBg : colors.surfaceElevated,
                        borderColor: isSelected ? th.colors.borderColor : colors.border,
                        paddingVertical: isLandscape ? 4 : 7,
                        paddingHorizontal: isLandscape ? 9 : 12,
                      },
                    ]}
                    onPress={() => setSelectedThemeId(th.id)}
                    testID={`theme-pill-${th.id}`}
                  >
                    <View style={[styles.themeColorDot, { backgroundColor: th.colors.primary }]} />
                    <Text style={[styles.themeGlyph, { color: th.colors.accent }]}>
                      {th.elementGlyph}
                    </Text>
                    <Text
                      style={[
                        styles.themeName,
                        { color: isSelected ? th.colors.textColor : colors.textSecondary },
                      ]}
                    >
                      {th.name}
                    </Text>
                    {isRecommended && (
                      <View style={[styles.recBadge, { backgroundColor: th.colors.badgeBg }]}>
                        <Text style={[styles.recBadgeText, { color: th.colors.accent }]}>
                          Auto
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Área de Pré-Visualização do Cartão */}
          <ScrollView
            style={[
              styles.previewScrollView,
              { minHeight: isLandscape ? 80 : 180 },
            ]}
            contentContainerStyle={[
              styles.previewScrollContent,
              { padding: isLandscape ? 10 : 16 },
            ]}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cardWrapper}>
              <RecordImageCard data={cardData} theme={activeTheme} />
            </View>
          </ScrollView>

          {/* 4. Barra de Ações Inferior (Responsiva contra sobreposição e corte em landscape) */}
          <View
            style={[
              styles.footerBar,
              isNarrowScreen && !isLandscape ? styles.footerBarNarrow : styles.footerBarWide,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surfaceElevated,
                paddingVertical: isLandscape ? 6 : 10,
              },
            ]}
          >
            {/* Seletor de formato (PNG ou SVG) */}
            <View style={isNarrowScreen && !isLandscape ? styles.formatRowNarrow : styles.formatRowWide}>
              <Text style={[styles.formatLabel, { color: colors.textMuted }]}>FORMATO:</Text>
              <View style={styles.formatToggle}>
                <TouchableOpacity
                  style={[
                    styles.formatBtn,
                    exportFormat === 'png' && [styles.formatBtnActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setExportFormat('png')}
                  testID="format-btn-png"
                >
                  <Text
                    style={[
                      styles.formatBtnText,
                      { color: exportFormat === 'png' ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    PNG
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatBtn,
                    exportFormat === 'svg' && [styles.formatBtnActive, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => setExportFormat('svg')}
                  testID="format-btn-svg"
                >
                  <Text
                    style={[
                      styles.formatBtnText,
                      { color: exportFormat === 'svg' ? '#FFFFFF' : colors.textMuted },
                    ]}
                  >
                    SVG
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ações Principais */}
            <View
              style={[
                styles.mainActionsRow,
                isNarrowScreen && !isLandscape && styles.mainActionsRowNarrow,
              ]}
            >
              {/* Copiar Texto */}
              <TouchableOpacity
                style={[
                  styles.secondaryActionBtn,
                  { borderColor: colors.border },
                  isNarrowScreen && !isLandscape && { flex: 1 },
                ]}
                onPress={handleCopyText}
                accessibilityLabel="Copiar texto formatado"
                testID="btn-copy-card-text"
              >
                <Ionicons name="copy-outline" size={16} color={colors.text} />
                <Text style={[styles.secondaryActionBtnText, { color: colors.text }]}>Copiar</Text>
              </TouchableOpacity>

              {/* Compartilhar */}
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.accent },
                  isNarrowScreen && !isLandscape && { flex: 1.4 },
                ]}
                onPress={handleShare}
                disabled={isExporting}
                accessibilityLabel="Compartilhar imagem estilizada"
                testID="btn-share-card-image"
              >
                <Ionicons name="share-social-outline" size={17} color={colors.accent || colors.primary} />
                <Text
                  style={[styles.primaryActionBtnText, { color: colors.accent || colors.primary }]}
                  numberOfLines={1}
                >
                  Compartilhar
                </Text>
              </TouchableOpacity>

              {/* Baixar Imagem */}
              <TouchableOpacity
                style={[
                  styles.downloadBtn,
                  { backgroundColor: colors.primary },
                  isNarrowScreen && !isLandscape && { flex: 1.2 },
                ]}
                onPress={handleDownload}
                disabled={isExporting}
                accessibilityLabel="Baixar imagem"
                testID="btn-download-card-image"
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="download" size={17} color="#FFFFFF" />
                    <Text style={styles.downloadBtnText} numberOfLines={1}>Baixar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  feedbackText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  themeSelectorContainer: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  themeScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  themePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  themeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeGlyph: {
    fontSize: 13,
  },
  themeName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  recBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 2,
  },
  recBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  previewScrollView: {
    flex: 1,
    flexGrow: 1,
    backgroundColor: '#05070B',
  },
  previewScrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 480,
  },
  footerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  footerBarWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  footerBarNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  formatRowWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatRowNarrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  formatLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  formatToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 2,
  },
  formatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  formatBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  formatBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  mainActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  mainActionsRowNarrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    width: '100%',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
