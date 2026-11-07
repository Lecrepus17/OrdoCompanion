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
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
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
  const { openManual } = useApp();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const [sheetType, setSheetType] = useState<SheetType>('livro_base');
  const [pageView, setPageView] = useState<'all' | 'front' | 'back'>('all');
  const [printing, setPrinting] = useState(false);

  // Intercepta botão físico de retorno no Android
  useEffect(() => {
    if (Platform.OS === 'web' || typeof document !== 'undefined' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

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

  const trainedSkills = useMemo(() => {
    if (!character?.skills) return [];
    return Object.entries(character.skills)
      .filter(([_, data]) => (data.degree || 0) > 0 || (data.bonus || 0) > 0)
      .map(([name, data]) => ({
        name,
        total: (data.degree || 0) + (data.bonus || 0),
        degree: data.degree || 0,
      }));
  }, [character?.skills]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  onClose();
                  openManual('print_sheet');
                }}
                accessibilityLabel="Manual de Impressão de Fichas"
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
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
              <ScrollView
                style={styles.mobilePreviewScroll}
                contentContainerStyle={styles.mobilePreviewContent}
                showsVerticalScrollIndicator={true}
                testID="agent-sheet-preview-card"
              >
                {/* Sheet Visual Mockup (Representing the Official A4 Document) */}
                <View style={styles.sheetMockup}>
                  {/* Official Header */}
                  <View style={styles.sheetHeader}>
                    <View style={styles.sheetHeaderLeft}>
                      <Text style={styles.sheetDocType}>
                        {sheetType === 'sobrevivendo_horror'
                          ? 'SOBREVIVENDO AO HORROR • FICHA DE SOBREVIVENTE'
                          : 'ORDO REALITAS • ARQUIVO OFICIAL DE AGENTE'}
                      </Text>
                      <Text style={styles.sheetAgentName}>
                        {character.name || 'Agente Desconhecido'}
                      </Text>
                    </View>
                    <View style={styles.sheetHeaderBadge}>
                      <Text style={styles.sheetPageBadgeText}>
                        {pageView === 'front'
                          ? 'Pág. 1 • Frente'
                          : pageView === 'back'
                          ? 'Pág. 2 • Verso'
                          : 'Frente & Verso'}
                      </Text>
                    </View>
                  </View>

                  {/* Identity Info Bar */}
                  <View style={styles.sheetMetaRow}>
                    <View style={styles.sheetMetaCol}>
                      <Text style={styles.sheetMetaLabel}>CLASSE</Text>
                      <Text style={styles.sheetMetaVal}>{classEntity?.name || character.classId || '—'}</Text>
                    </View>
                    <View style={styles.sheetMetaCol}>
                      <Text style={styles.sheetMetaLabel}>ORIGEM</Text>
                      <Text style={styles.sheetMetaVal}>{originEntity?.name || character.originId || '—'}</Text>
                    </View>
                    <View style={styles.sheetMetaCol}>
                      <Text style={styles.sheetMetaLabel}>TRILHA</Text>
                      <Text style={styles.sheetMetaVal}>{trackEntity?.name || character.trackId || '—'}</Text>
                    </View>
                    <View style={styles.sheetMetaCol}>
                      <Text style={styles.sheetMetaLabel}>NEX / PATENTE</Text>
                      <Text style={styles.sheetMetaVal}>{character.nex}% • {character.rank || 'Recruta'}</Text>
                    </View>
                  </View>

                  {/* Attributes Grid */}
                  <View style={styles.sheetAttrRow}>
                    {[
                      { key: 'AGI', label: 'AGILIDADE', val: character.attributes?.AGI ?? 1 },
                      { key: 'FOR', label: 'FORÇA', val: character.attributes?.FOR ?? 1 },
                      { key: 'INT', label: 'INTELECTO', val: character.attributes?.INT ?? 1 },
                      { key: 'PRE', label: 'PRESENÇA', val: character.attributes?.PRE ?? 1 },
                      { key: 'VIG', label: 'VIGOR', val: character.attributes?.VIG ?? 1 },
                    ].map((attr) => (
                      <View key={attr.key} style={styles.sheetAttrBox}>
                        <Text style={styles.sheetAttrKey}>{attr.key}</Text>
                        <Text style={styles.sheetAttrVal}>{attr.val}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Vitals (PV, SAN, PE, Defesa) */}
                  <View style={styles.sheetVitalsRow}>
                    <View style={[styles.sheetVitalBox, { borderColor: '#EF4444' }]}>
                      <Text style={[styles.sheetVitalLabel, { color: '#EF4444' }]}>VIDA (PV)</Text>
                      <Text style={styles.sheetVitalValue}>
                        {character.pvCurrent ?? character.pvMax}/{character.pvMax}
                      </Text>
                    </View>
                    <View style={[styles.sheetVitalBox, { borderColor: '#38BDF8' }]}>
                      <Text style={[styles.sheetVitalLabel, { color: '#38BDF8' }]}>SANIDADE (SAN)</Text>
                      <Text style={styles.sheetVitalValue}>
                        {character.sanCurrent ?? character.sanMax}/{character.sanMax}
                      </Text>
                    </View>
                    <View style={[styles.sheetVitalBox, { borderColor: '#A855F7' }]}>
                      <Text style={[styles.sheetVitalLabel, { color: '#A855F7' }]}>ESFORÇO (PE)</Text>
                      <Text style={styles.sheetVitalValue}>
                        {character.peCurrent ?? character.peMax}/{character.peMax}
                      </Text>
                    </View>
                    <View style={[styles.sheetVitalBox, { borderColor: '#10B981' }]}>
                      <Text style={[styles.sheetVitalLabel, { color: '#10B981' }]}>DEFESA</Text>
                      <Text style={styles.sheetVitalValue}>
                        {character.defenseBonus || (10 + (character.attributes?.AGI || 0))}
                      </Text>
                    </View>
                  </View>

                  {/* Page Content: Frente (Ataques & Perícias) */}
                  {(pageView === 'all' || pageView === 'front') && (
                    <View style={styles.sheetSection}>
                      <View style={styles.sheetSectionHeader}>
                        <Ionicons name="flash-outline" size={14} color={colors.primary} />
                        <Text style={styles.sheetSectionTitle}>ATAQUES & ARMAS</Text>
                      </View>
                      {(!character.attacks || character.attacks.length === 0) ? (
                        <Text style={styles.sheetEmptyText}>Nenhum ataque cadastrado.</Text>
                      ) : (
                        <View style={styles.sheetAttacksTable}>
                          <View style={styles.sheetTableRowHeader}>
                            <Text style={[styles.sheetTableColHeader, { flex: 2 }]}>ARMA</Text>
                            <Text style={[styles.sheetTableColHeader, { flex: 1.2 }]}>TESTE</Text>
                            <Text style={[styles.sheetTableColHeader, { flex: 1.2 }]}>DANO</Text>
                            <Text style={[styles.sheetTableColHeader, { flex: 1 }]}>CRÍTICO</Text>
                            <Text style={[styles.sheetTableColHeader, { flex: 1 }]}>ALCANCE</Text>
                          </View>
                          {character.attacks.map((atk) => (
                            <View key={atk.id} style={styles.sheetTableRow}>
                              <Text style={[styles.sheetTableCell, styles.sheetTableCellBold, { flex: 2 }]} numberOfLines={1}>
                                {atk.name}
                              </Text>
                              <Text style={[styles.sheetTableCell, { flex: 1.2 }]} numberOfLines={1}>
                                {atk.test}
                              </Text>
                              <Text style={[styles.sheetTableCell, { flex: 1.2 }]} numberOfLines={1}>
                                {atk.damage}
                              </Text>
                              <Text style={[styles.sheetTableCell, { flex: 1 }]} numberOfLines={1}>
                                {atk.critical}
                              </Text>
                              <Text style={[styles.sheetTableCell, { flex: 1 }]} numberOfLines={1}>
                                {atk.range}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={[styles.sheetSectionHeader, { marginTop: 12 }]}>
                        <Ionicons name="dice-outline" size={14} color={colors.primary} />
                        <Text style={styles.sheetSectionTitle}>PERÍCIAS TREINADAS</Text>
                      </View>
                      {trainedSkills.length === 0 ? (
                        <Text style={styles.sheetEmptyText}>Nenhuma perícia treinada.</Text>
                      ) : (
                        <View style={styles.sheetSkillsGrid}>
                          {trainedSkills.map((sk) => (
                            <View key={sk.name} style={styles.sheetSkillPill}>
                              <Text style={styles.sheetSkillName}>{sk.name}</Text>
                              <Text style={styles.sheetSkillBonus}>+{sk.total}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Page Content: Verso (Habilidades & Inventário) */}
                  {(pageView === 'all' || pageView === 'back') && (
                    <View style={styles.sheetSection}>
                      <View style={styles.sheetSectionHeader}>
                        <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                        <Text style={styles.sheetSectionTitle}>HABILIDADES & RITUAIS</Text>
                      </View>
                      {(!character.abilities || character.abilities.length === 0) ? (
                        <Text style={styles.sheetEmptyText}>Nenhuma habilidade cadastrada.</Text>
                      ) : (
                        <View style={styles.sheetAbilitiesList}>
                          {character.abilities.slice(0, 8).map((ab) => (
                            <View key={ab.id} style={styles.sheetAbilityItem}>
                              <Text style={styles.sheetAbilityName}>{ab.name}</Text>
                              {ab.description ? (
                                <Text style={styles.sheetAbilityDesc} numberOfLines={2}>
                                  {ab.description}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                          {character.abilities.length > 8 && (
                            <Text style={styles.sheetMoreText}>
                              +{character.abilities.length - 8} outras habilidades inclusas na impressão completa.
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={[styles.sheetSectionHeader, { marginTop: 12 }]}>
                        <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
                        <Text style={styles.sheetSectionTitle}>INVENTÁRIO & ITENS</Text>
                      </View>
                      {(!character.inventory || character.inventory.length === 0) ? (
                        <Text style={styles.sheetEmptyText}>Nenhum item cadastrado no inventário.</Text>
                      ) : (
                        <View style={styles.sheetInventoryGrid}>
                          {character.inventory.map((item) => (
                            <View key={item.id} style={styles.sheetInventoryItem}>
                              <Text style={styles.sheetInventoryName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.sheetInventoryMeta}>
                                Cat. {item.category || '0'} • {item.spaces || 1} esp.
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Official Stamp */}
                  <View style={styles.sheetOfficialFooter}>
                    <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
                    <Text style={styles.sheetOfficialFooterText}>
                      Pré-visualização gerada com sucesso • Formato A4 Oficial Pronto para Impressão
                    </Text>
                  </View>
                </View>
              </ScrollView>
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
      flexWrap: 'wrap',
      gap: 8,
    },
    configLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    toggleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 2,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
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
      padding: 8,
      backgroundColor: colors.background,
    },
    mobilePreviewScroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mobilePreviewContent: {
      paddingVertical: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
    },
    sheetMockup: {
      width: '100%',
      maxWidth: 680,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
    },
    sheetHeaderLeft: {
      flex: 1,
    },
    sheetDocType: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sheetAgentName: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
      marginTop: 2,
    },
    sheetHeaderBadge: {
      backgroundColor: colors.surfaceHighlight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetPageBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    sheetMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 8,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetMetaCol: {
      flex: 1,
      minWidth: 110,
    },
    sheetMetaLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
    },
    sheetMetaVal: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginTop: 1,
    },
    sheetAttrRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    sheetAttrBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetAttrKey: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.textMuted,
    },
    sheetAttrVal: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
      marginTop: 2,
    },
    sheetVitalsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    sheetVitalBox: {
      flex: 1,
      minWidth: 70,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: colors.surface,
    },
    sheetVitalLabel: {
      fontSize: 9,
      fontWeight: '900',
    },
    sheetVitalValue: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
      marginTop: 2,
    },
    sheetSection: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 4,
    },
    sheetSectionTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: colors.primary,
      letterSpacing: 0.5,
    },
    sheetEmptyText: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: 'italic',
      paddingVertical: 4,
    },
    sheetAttacksTable: {
      gap: 4,
    },
    sheetTableRowHeader: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    sheetTableColHeader: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
    },
    sheetTableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sheetTableCell: {
      fontSize: 11,
      color: colors.text,
    },
    sheetTableCellBold: {
      fontWeight: '700',
    },
    sheetSkillsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    sheetSkillPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetSkillName: {
      fontSize: 11,
      color: colors.text,
      fontWeight: '600',
    },
    sheetSkillBonus: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '800',
    },
    sheetAbilitiesList: {
      gap: 6,
    },
    sheetAbilityItem: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingBottom: 4,
    },
    sheetAbilityName: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.text,
    },
    sheetAbilityDesc: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
    },
    sheetMoreText: {
      fontSize: 10,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginTop: 2,
    },
    sheetInventoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    sheetInventoryItem: {
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 120,
    },
    sheetInventoryName: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    sheetInventoryMeta: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 1,
    },
    sheetOfficialFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      marginTop: 4,
    },
    sheetOfficialFooterText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10B981',
      textAlign: 'center',
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
