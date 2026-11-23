import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import {
  AgentDamageProfile,
  CharacterAttack,
  CharacterSheet,
  CustomWeapon,
  ParanormalElement,
  ResolvedAttackDamage,
  SituationalDamageToggles,
} from '../types/compendium';
import { getAtaqueEspecialBonus, resolveAgentAttackDamage } from '../utils/damageModifiers';
import { getPeRoundLimit } from '../utils/progression';

export interface AttackPreparationModalProps {
  visible: boolean;
  attack: CharacterAttack | null;
  character: CharacterSheet | null;
  customWeapon?: CustomWeapon;
  profile: AgentDamageProfile;
  onClose: () => void;
  onConfirmRoll: (params: {
    mode: 'attack' | 'damage' | 'crit';
    resolved: ResolvedAttackDamage;
    toggles: SituationalDamageToggles;
  }) => void;
}

const AMALDI_ELEMENTS: ParanormalElement[] = ['Sangue', 'Morte', 'Conhecimento', 'Energia'];

export const AttackPreparationModal: React.FC<AttackPreparationModalProps> = ({
  visible,
  attack,
  character,
  customWeapon,
  profile,
  onClose,
  onConfirmRoll,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [toggles, setToggles] = useState<SituationalDamageToggles>({});

  useEffect(() => {
    if (visible) {
      setToggles({});
    }
  }, [visible, attack?.id]);

  // Intercepta botão físico de retorno no Android APK
  useEffect(() => {
    if (!visible) return;
    if (Platform.OS !== 'web' && typeof document === 'undefined') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => sub.remove();
    }
    return undefined;
  }, [visible, onClose]);

  const resolved = useMemo<ResolvedAttackDamage | null>(() => {
    if (!attack || !character) return null;
    return resolveAgentAttackDamage({
      attack,
      character,
      customWeapon,
      toggles,
      profile,
    });
  }, [attack, character, customWeapon, toggles, profile]);

  const passiveResolved = useMemo<ResolvedAttackDamage | null>(() => {
    if (!attack || !character) return null;
    return resolveAgentAttackDamage({
      attack,
      character,
      customWeapon,
      toggles: {},
      profile,
    });
  }, [attack, character, customWeapon, profile]);

  if (!visible || !attack || !character || !resolved || !passiveResolved) {
    return null;
  }

  const peRound = character.peRound || getPeRoundLimit(character.nex ?? 5);
  const effortLabel = character.useDeterminationPoints ? 'PD' : 'PE';
  const peCurrent = character.useDeterminationPoints
    ? (character.pdCurrent ?? 0) + (character.pdTemp ?? 0)
    : (character.peCurrent ?? 0) + (character.peTemp ?? 0);
  const peBlocked =
    resolved.totalPeCost > 0 && (resolved.peCostExceedsLimit || resolved.peCostExceedsCurrent);

  const isFirearmOrAuto =
    customWeapon?.weaponType === 'Fogo' ||
    (attack.special || '').toLowerCase().includes('automátic') ||
    (attack.special || '').toLowerCase().includes('balístico') ||
    (attack.name || '').toLowerCase().includes('submetralhadora') ||
    (attack.name || '').toLowerCase().includes('fuzil') ||
    (attack.name || '').toLowerCase().includes('metralhadora');

  const specialPeOptions = [0, 2, 3, 4, 5];
  const currentSpecialPe = toggles.ataqueEspecialPeSpent || 0;
  const currentAlloc = toggles.ataqueEspecialAllocation || 'damage';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} testID="attack-preparation-modal">
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={styles.card}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTag}>PREPARAÇÃO DE GOLPE TÁTICO</Text>
              <Text style={styles.title} numberOfLines={1}>
                {attack.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="prep-btn-close"
              accessibilityLabel="Fechar preparação de golpe"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* SEÇÃO 1: BÔNUS PERMANENTES DO AGENTE */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>1. BÔNUS PERMANENTES DO AGENTE</Text>
              {passiveResolved.breakdown.map((comp, idx) => (
                <View key={`${comp.source}_${idx}`} style={styles.breakdownRow}>
                  <Text style={styles.breakdownSource}>{comp.source}</Text>
                  <Text
                    style={[
                      styles.breakdownExpr,
                      comp.multipliesOnCrit && styles.breakdownMultTag,
                    ]}
                  >
                    {comp.expression}
                    {comp.multipliesOnCrit ? ' (×crít)' : ''}
                  </Text>
                </View>
              ))}
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Subtotal Passivo</Text>
                <Text style={styles.subtotalValue}>{passiveResolved.displayDamage}</Text>
              </View>
            </View>

            {/* SEÇÃO 2: MODIFICADORES SITUACIONAIS & GASTO DE PE */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionHeader}>2. MODIFICADORES SITUACIONAIS & GASTO DE PE</Text>

              {/* Ataque Especial (Combatente) */}
              {profile.ataqueEspecialMaxPe > 0 && (
                <View style={styles.subGroup}>
                  <Text style={styles.subGroupTitle}>
                    Ataque Especial (Máx {profile.ataqueEspecialMaxPe} PE / +{getAtaqueEspecialBonus(profile.ataqueEspecialMaxPe)})
                  </Text>
                  <View style={styles.chipsRow}>
                    {specialPeOptions.map((pe) => {
                      const disabled = pe > 0 && pe > profile.ataqueEspecialMaxPe;
                      const active = currentSpecialPe === pe;
                      const rawBonus = pe > 0 ? getAtaqueEspecialBonus(pe) : 0;
                      const label = pe === 0 ? '0 PE' : `${pe} PE (+${rawBonus})`;
                      return (
                        <TouchableOpacity
                          key={pe}
                          disabled={disabled}
                          style={[
                            styles.chipBtn,
                            active && styles.chipBtnActive,
                            disabled && styles.chipBtnDisabled,
                          ]}
                          onPress={() =>
                            setToggles((prev) => ({
                              ...prev,
                              ataqueEspecialPeSpent: pe,
                            }))
                          }
                          testID={`prep-ataque-especial-pe-${pe}`}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              active && styles.chipTextActive,
                              disabled && styles.chipTextDisabled,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {currentSpecialPe >= 2 && (
                    <View style={styles.allocRow}>
                      <Text style={styles.allocLabel}>Alocar em:</Text>
                      {(['damage', 'attack', 'split'] as const).map((alloc) => {
                        const active = currentAlloc === alloc;
                        const label =
                          alloc === 'damage' ? 'Dano' : alloc === 'attack' ? 'Ataque' : 'Dividir';
                        return (
                          <TouchableOpacity
                            key={alloc}
                            style={[styles.allocBtn, active && styles.allocBtnActive]}
                            onPress={() =>
                              setToggles((prev) => ({
                                ...prev,
                                ataqueEspecialAllocation: alloc,
                              }))
                            }
                            testID={`prep-alloc-${alloc}`}
                          >
                            <Text style={[styles.allocBtnText, active && styles.allocBtnTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Ataque Furtivo / Assassinar (Infiltrador) */}
              {Boolean(profile.ataqueFurtivoDice) && (
                <View style={styles.togglesList}>
                  <TouchableOpacity
                    style={[styles.toggleRow, toggles.ataqueFurtivoActive && styles.toggleRowActive]}
                    onPress={() =>
                      setToggles((prev) => ({
                        ...prev,
                        ataqueFurtivoActive: !prev.ataqueFurtivoActive,
                        assassinarActive: !prev.ataqueFurtivoActive ? prev.assassinarActive : false,
                      }))
                    }
                    testID="prep-toggle-furtivo"
                  >
                    <Ionicons
                      name={toggles.ataqueFurtivoActive ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={toggles.ataqueFurtivoActive ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.toggleText}>
                      Ataque Furtivo (+{profile.ataqueFurtivoDice} • 1 PE)
                    </Text>
                  </TouchableOpacity>

                  {profile.hasInfiltradorAssassinar && toggles.ataqueFurtivoActive && (
                    <TouchableOpacity
                      style={[styles.toggleRow, toggles.assassinarActive && styles.toggleRowActive]}
                      onPress={() =>
                        setToggles((prev) => ({
                          ...prev,
                          assassinarActive: !prev.assassinarActive,
                        }))
                      }
                      testID="prep-toggle-assassinar"
                    >
                      <Ionicons
                        name={toggles.assassinarActive ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={toggles.assassinarActive ? colors.primary : colors.textSecondary}
                      />
                      <Text style={styles.toggleText}>Assassinar (Dobra Furtivo • +3 PE)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Destruidor (Aniquilador NEX 40%) */}
              {profile.hasAniquiladorDestruidor && (
                <TouchableOpacity
                  style={[styles.toggleRow, toggles.destruidorActive && styles.toggleRowActive]}
                  onPress={() =>
                    setToggles((prev) => ({
                      ...prev,
                      destruidorActive: !prev.destruidorActive,
                    }))
                  }
                  testID="prep-toggle-destruidor"
                >
                  <Ionicons
                    name={toggles.destruidorActive ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={toggles.destruidorActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.toggleText}>Destruidor (+1 Multiplicador Crítico • 2 PE)</Text>
                </TouchableOpacity>
              )}

              {/* Rajada (Armas Automáticas / Fogo) */}
              {isFirearmOrAuto && (
                <TouchableOpacity
                  style={[styles.toggleRow, toggles.rajadaActive && styles.toggleRowActive]}
                  onPress={() =>
                    setToggles((prev) => ({
                      ...prev,
                      rajadaActive: !prev.rajadaActive,
                    }))
                  }
                  testID="prep-toggle-rajada"
                >
                  <Ionicons
                    name={toggles.rajadaActive ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={toggles.rajadaActive ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.toggleText}>Rajada (-1d20 no ataque, +1 dado de dano)</Text>
                </TouchableOpacity>
              )}

              {/* Buffs de Rituais na Arma */}
              <View style={styles.subGroup}>
                <Text style={styles.subGroupTitle}>Buffs de Rituais Ativos</Text>

                {/* Amaldiçoar Arma */}
                <View style={styles.chipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.chipBtn,
                      !toggles.amaldicoarArmaBuff && styles.chipBtnActive,
                    ]}
                    onPress={() =>
                      setToggles((prev) => ({ ...prev, amaldicoarArmaBuff: undefined }))
                    }
                    testID="prep-buff-amaldicoar-none"
                  >
                    <Text
                      style={[
                        styles.chipText,
                        !toggles.amaldicoarArmaBuff && styles.chipTextActive,
                      ]}
                    >
                      Sem Amaldiçoar
                    </Text>
                  </TouchableOpacity>

                  {AMALDI_ELEMENTS.map((elem) => {
                    const active = toggles.amaldicoarArmaBuff?.element === elem;
                    return (
                      <TouchableOpacity
                        key={elem}
                        style={[styles.chipBtn, active && styles.chipBtnActive]}
                        onPress={() =>
                          setToggles((prev) => ({
                            ...prev,
                            amaldicoarArmaBuff: {
                              element: elem,
                              tier: prev.amaldicoarArmaBuff?.tier || 'padrao',
                            },
                          }))
                        }
                        testID={`prep-buff-amaldicoar-${elem}`}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {elem}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {toggles.amaldicoarArmaBuff && (
                  <View style={styles.allocRow}>
                    {(['padrao', 'discente', 'verdadeiro'] as const).map((tier) => {
                      const active = toggles.amaldicoarArmaBuff?.tier === tier;
                      const dice = tier === 'verdadeiro' ? '+4d6' : tier === 'discente' ? '+2d6' : '+1d6';
                      const label =
                        tier === 'verdadeiro'
                          ? `Verdadeiro (${dice})`
                          : tier === 'discente'
                          ? `Discente (${dice})`
                          : `Padrão (${dice})`;
                      return (
                        <TouchableOpacity
                          key={tier}
                          style={[styles.allocBtn, active && styles.allocBtnActive]}
                          onPress={() =>
                            setToggles((prev) => ({
                              ...prev,
                              amaldicoarArmaBuff: prev.amaldicoarArmaBuff
                                ? { ...prev.amaldicoarArmaBuff, tier }
                                : undefined,
                            }))
                          }
                          testID={`prep-buff-amaldicoar-tier-${tier}`}
                        >
                          <Text style={[styles.allocBtnText, active && styles.allocBtnTextActive]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Ódio Incontrolável */}
                <TouchableOpacity
                  style={[styles.toggleRow, toggles.odioIncontrolavelBuff && styles.toggleRowActive]}
                  onPress={() =>
                    setToggles((prev) => {
                      if (!prev.odioIncontrolavelBuff) {
                        return { ...prev, odioIncontrolavelBuff: { tier: 'padrao' } };
                      }
                      if (prev.odioIncontrolavelBuff.tier === 'padrao') {
                        return { ...prev, odioIncontrolavelBuff: { tier: 'verdadeiro' } };
                      }
                      return { ...prev, odioIncontrolavelBuff: undefined };
                    })
                  }
                  testID="prep-buff-odio"
                >
                  <Ionicons
                    name={toggles.odioIncontrolavelBuff ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={toggles.odioIncontrolavelBuff ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.toggleText}>
                    Ódio Incontrolável{' '}
                    {toggles.odioIncontrolavelBuff
                      ? toggles.odioIncontrolavelBuff.tier === 'verdadeiro'
                        ? '(Verdadeiro +5)'
                        : '(Padrão +2)'
                      : '(+2 ou +5 CC)'}
                  </Text>
                </TouchableOpacity>

                {/* Chamas do Caos */}
                <TouchableOpacity
                  style={[styles.toggleRow, toggles.chamasDoCaosBuff && styles.toggleRowActive]}
                  onPress={() =>
                    setToggles((prev) => ({
                      ...prev,
                      chamasDoCaosBuff: !prev.chamasDoCaosBuff,
                    }))
                  }
                  testID="prep-buff-chamas"
                >
                  <Ionicons
                    name={toggles.chamasDoCaosBuff ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={toggles.chamasDoCaosBuff ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.toggleText}>Chamas do Caos — Chamejar (+1d6 Fogo)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SEÇÃO 3: PAINEL DE PROJEÇÃO EM TEMPO REAL */}
            <View style={[styles.sectionBox, styles.projectionBox]}>
              <Text style={styles.sectionHeader}>3. PROJEÇÃO EM TEMPO REAL</Text>
              <View style={styles.peSummaryRow}>
                <Text style={styles.peSummaryText}>
                  Custo de {effortLabel}: <Text style={styles.peHighlight}>{resolved.totalPeCost} {effortLabel}</Text>
                </Text>
                <Text style={styles.peSummaryText}>
                  Limite/Turno: {peRound} {effortLabel} • Atual: {peCurrent} {effortLabel}
                </Text>
              </View>

              {resolved.peCostExceedsLimit && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={15} color="#EF4444" />
                  <Text style={styles.warningText} testID="prep-pe-limit-warning">
                    Excede o Limite de PE por Turno (máx {peRound})
                  </Text>
                </View>
              )}

              {resolved.peCostExceedsCurrent && (
                <View style={styles.warningBanner}>
                  <Ionicons name="alert-circle" size={15} color="#F59E0B" />
                  <Text style={styles.warningText} testID="prep-pe-current-warning">
                    {effortLabel} Insuficiente (atual: {peCurrent})
                  </Text>
                </View>
              )}

              <View style={styles.projStatRow}>
                <Text style={styles.projLabel}>Dano Normal Projetado:</Text>
                <Text style={styles.projValue} testID="prep-projected-normal">
                  {resolved.displayDamage}
                </Text>
              </View>

              <View style={styles.projStatRow}>
                <Text style={styles.projLabel}>Dano Crítico ({resolved.formattedCritical}):</Text>
                <Text style={[styles.projValue, { color: '#EF4444' }]} testID="prep-projected-crit">
                  {resolved.criticalFormula}
                </Text>
              </View>

              {Boolean(resolved.attackBonusFromToggles) && (
                <View style={styles.projStatRow}>
                  <Text style={styles.projLabel}>Bônus de Ataque (PE):</Text>
                  <Text style={[styles.projValue, { color: colors.success }]}>
                    +{resolved.attackBonusFromToggles}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.attackBtn, peBlocked && styles.footerBtnDisabled]}
              disabled={peBlocked}
              onPress={() => onConfirmRoll({ mode: 'attack', resolved, toggles })}
              testID="prep-btn-roll-attack"
            >
              <Ionicons name="dice" size={16} color="#FFF" />
              <Text style={styles.footerBtnText}>Ataque</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, styles.damageBtn, peBlocked && styles.footerBtnDisabled]}
              disabled={peBlocked}
              onPress={() => onConfirmRoll({ mode: 'damage', resolved, toggles })}
              testID="prep-btn-roll-damage"
            >
              <Ionicons name="flash" size={16} color="#FFF" />
              <Text style={styles.footerBtnText}>
                {resolved.totalPeCost > 0
                  ? `Dano (-${resolved.totalPeCost} PE)`
                  : 'Rolar Dano'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, styles.critBtn, peBlocked && styles.footerBtnDisabled]}
              disabled={peBlocked}
              onPress={() => onConfirmRoll({ mode: 'crit', resolved, toggles })}
              testID="prep-btn-roll-crit"
            >
              <Ionicons name="flame" size={16} color="#FFF" />
              <Text style={styles.footerBtnText}>Crítico</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 20,
    },
    card: {
      width: '100%',
      maxWidth: 600,
      maxHeight: '90%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      gap: 10,
    },
    headerTag: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: 0.8,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    closeBtn: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    body: {
      flexGrow: 0,
    },
    bodyContent: {
      padding: 14,
      gap: 12,
    },
    sectionBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 8,
    },
    projectionBox: {
      borderColor: colors.primary,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 0.6,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    breakdownSource: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    breakdownExpr: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    breakdownMultTag: {
      color: colors.warning,
    },
    subtotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      marginTop: 4,
    },
    subtotalLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    subtotalValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    subGroup: {
      gap: 8,
      marginTop: 4,
    },
    subGroupTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chipBtn: {
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chipBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    chipBtnDisabled: {
      opacity: 0.4,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.text,
    },
    chipTextDisabled: {
      color: colors.textMuted,
    },
    allocRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    allocLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    allocBtn: {
      minHeight: 36,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      justifyContent: 'center',
    },
    allocBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    allocBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    allocBtnTextActive: {
      color: colors.text,
    },
    togglesList: {
      gap: 6,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toggleRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    peSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 6,
    },
    peSummaryText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    peHighlight: {
      color: colors.warning,
      fontWeight: '800',
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.4)',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    warningText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#EF4444',
      flex: 1,
    },
    projStatRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    projLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    projValue: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    footer: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    footerBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
    },
    footerBtnDisabled: {
      opacity: 0.45,
    },
    attackBtn: {
      backgroundColor: '#374151',
    },
    damageBtn: {
      backgroundColor: colors.primary,
    },
    critBtn: {
      backgroundColor: '#991B1B',
    },
    footerBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
