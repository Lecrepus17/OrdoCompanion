import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { CharacterSheet, CompendiumEntity } from '../types/compendium';
import {
  generateSheetHtml,
  printCharacterSheet,
  openPrintableTab,
  SheetType,
} from '../utils/sheetPrinter';

interface PrintSheetModalProps {
  visible: boolean;
  character: CharacterSheet | null;
  originEntity?: CompendiumEntity | null;
  classEntity?: CompendiumEntity | null;
  trackEntity?: CompendiumEntity | null;
  onClose: () => void;
}

export default function PrintSheetModal({
  visible,
  character,
  originEntity,
  classEntity,
  trackEntity,
  onClose,
}: PrintSheetModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [sheetType, setSheetType] = useState<SheetType>('livro_base');
  const [pageView, setPageView] = useState<'all' | 'front' | 'back'>('all');
  const [printing, setPrinting] = useState(false);

  const html = useMemo(() => {
    if (!character || !visible) return '';
    return generateSheetHtml({
      character,
      sheetType,
      pages: pageView,
      originEntity,
      classEntity,
      trackEntity,
    });
  }, [character, visible, sheetType, pageView, originEntity, classEntity, trackEntity]);

  if (!character) return null;

  const handlePrint = async () => {
    try {
      setPrinting(true);
      await printCharacterSheet({
        character,
        sheetType,
        pages: pageView,
        originEntity,
        classEntity,
        trackEntity,
      });
    } catch (err) {
      console.error('Erro ao imprimir ficha:', err);
    } finally {
      setPrinting(false);
    }
  };

  const handleOpenNewTab = () => {
    openPrintableTab({
      character,
      sheetType,
      pages: pageView,
      originEntity,
      classEntity,
      trackEntity,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Ionicons name="print" size={22} color={colors.primary} />
                <Text style={styles.modalTitle}>Imprimir Ficha de Agente</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                {character.name || 'Agente sem nome'} • NEX {character.nex}% • {classEntity?.name || 'Sem Classe'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Config Bar */}
          <View style={styles.configBar}>
            {/* Sheet Type */}
            <View style={styles.configGroup}>
              <Text style={styles.configLabel}>Modelo da Ficha:</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    sheetType === 'livro_base' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setSheetType('livro_base')}
                >
                  <Ionicons
                    name="book"
                    size={14}
                    color={sheetType === 'livro_base' ? '#FFF' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      sheetType === 'livro_base' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Livro Base
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    sheetType === 'sobrevivendo_horror' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setSheetType('sobrevivendo_horror')}
                >
                  <Ionicons
                    name="skull"
                    size={14}
                    color={sheetType === 'sobrevivendo_horror' ? '#FFF' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      sheetType === 'sobrevivendo_horror' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Sobrevivendo ao Horror
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Page View */}
            <View style={styles.configGroup}>
              <Text style={styles.configLabel}>Páginas:</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, pageView === 'all' && styles.toggleBtnActive]}
                  onPress={() => setPageView('all')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      pageView === 'all' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Frente & Verso
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, pageView === 'front' && styles.toggleBtnActive]}
                  onPress={() => setPageView('front')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      pageView === 'front' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Frente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, pageView === 'back' && styles.toggleBtnActive]}
                  onPress={() => setPageView('back')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      pageView === 'back' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Verso
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Preview / Status Box */}
          <View style={styles.previewContainer}>
            {Platform.OS === 'web' ? (
              <iframe
                key={`${sheetType}_${pageView}_${character.id}_${html.length}`}
                title="Pré-visualização da Ficha"
                srcDoc={html}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: 8,
                }}
              />
            ) : (
              <View style={styles.nativeFallback}>
                <Ionicons name="document-text-outline" size={48} color={colors.primary} />
                <Text style={styles.nativeFallbackTitle}>Pronto para Impressão</Text>
                <Text style={styles.nativeFallbackSub}>
                  Toque em "Imprimir / Salvar PDF" para gerar e imprimir o documento em formato A4 oficial com todos os campos preenchidos.
                </Text>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Fechar</Text>
            </TouchableOpacity>

            <View style={styles.rightActions}>
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={styles.openTabBtn}
                  onPress={handleOpenNewTab}
                >
                  <Ionicons name="open-outline" size={17} color={colors.textSecondary} />
                  <Text style={styles.openTabBtnText}>Abrir em Nova Aba</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.printBtn}
                onPress={handlePrint}
                disabled={printing}
              >
                {printing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="print" size={18} color="#FFF" />
                    <Text style={styles.printBtnText}>Imprimir / Salvar PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalBox: {
      width: '100%',
      maxWidth: 960,
      height: '92%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
    },
    configBar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.surfaceHighlight,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    configGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    configLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    toggleRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
    },
    toggleBtnText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '500',
    },
    toggleBtnTextActive: {
      color: '#FFF',
      fontWeight: '700',
    },
    previewContainer: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.background,
    },
    nativeFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
    },
    nativeFallbackTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    nativeFallbackSub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 400,
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
    },
    cancelBtnText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    openTabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    openTabBtnText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    printBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 8,
    },
    printBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '700',
    },
  });
