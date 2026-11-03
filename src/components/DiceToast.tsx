import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export const DiceToast: React.FC = () => {
  const { latestRoll, dismissLatestRoll, rollWeaponDamage } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  if (!latestRoll) return null;

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);
  const bottomPosition = 56 + bottomInset + 10;
  const is20Natural = latestRoll.chosenDie === 20;

  return (
    <View style={[styles.container, { bottom: bottomPosition }]}>
      <View
        style={[
          styles.card,
          latestRoll.isCritical && styles.cardCritical,
          latestRoll.isFumble && styles.cardFumble,
          latestRoll.isMaxDamage && styles.cardMaxDamage,
        ]}
      >
        <View style={styles.mainRow}>
          <View style={styles.left}>
            <View style={styles.titleRow}>
              <Ionicons
                name={latestRoll.isMaxDamage ? 'sparkles' : 'dice'}
                size={18}
                color={latestRoll.isMaxDamage ? '#F59E0B' : colors.primary}
              />
              <Text style={styles.label} numberOfLines={1}>
                {latestRoll.label}
              </Text>
              {latestRoll.isMaxDamage && (
                <View style={styles.maxBadge}>
                  <Text style={styles.maxText}>DANO MÁXIMO</Text>
                </View>
              )}
              {!latestRoll.isMaxDamage && latestRoll.isCritical && (
                <View style={[styles.critBadge, is20Natural && styles.critBadge20]}>
                  <Text style={[styles.critText, is20Natural && styles.critText20]}>
                    {is20Natural ? '20 NATURAL!' : 'CRÍTICO!'}
                  </Text>
                </View>
              )}
              {latestRoll.isFumble && (
                <View style={[styles.critBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.critText}>DESASTRE!</Text>
                </View>
              )}
            </View>
            <Text style={styles.formulaText}>
              {latestRoll.formulaText} → Dados: [{latestRoll.diceResults.join(', ')}]
              {latestRoll.chosenDie !== undefined ? ` (Escolhido: ${latestRoll.chosenDie})` : ''}
            </Text>
          </View>

          <View style={styles.right}>
            <View
              style={[
                styles.totalBox,
                latestRoll.isMaxDamage && styles.totalBoxMax,
                latestRoll.isCritical && !latestRoll.isMaxDamage && styles.totalBoxCrit,
              ]}
            >
              <Text
                style={[
                  styles.totalValue,
                  latestRoll.isMaxDamage && { color: '#F59E0B' },
                  latestRoll.isCritical && !latestRoll.isMaxDamage && { color: colors.success },
                ]}
              >
                {latestRoll.total}
              </Text>
            </View>
            <TouchableOpacity onPress={dismissLatestRoll} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Atalhos Rápidos de Dano quando o teste foi um Ataque de Arma */}
        {latestRoll.attackContext && latestRoll.mode === 'skill' && (
          <View style={styles.attackActionsContainer}>
            <View style={styles.attackActionsHeader}>
              <Text style={styles.attackActionsTitle}>
                Ataque: {latestRoll.attackContext.weaponName}
              </Text>
              {is20Natural && (
                <Text style={styles.natural20Hint}>★ 20 no Dado: Opção de Dano Máximo disponível!</Text>
              )}
            </View>
            <View style={styles.quickDamageRow}>
              <TouchableOpacity
                style={styles.toastActionBtn}
                onPress={() => {
                  if (!latestRoll.attackContext) return;
                  rollWeaponDamage({
                    weaponName: latestRoll.attackContext.weaponName,
                    damage: latestRoll.attackContext.damage,
                    critical: latestRoll.attackContext.critical,
                    isCrit: false,
                    isMaxDamage: false,
                    attackContext: latestRoll.attackContext,
                  });
                }}
              >
                <Ionicons name="flame-outline" size={13} color="#FCA5A5" />
                <Text style={styles.toastActionBtnText}>Dano ({latestRoll.attackContext.damage})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toastActionBtn, styles.toastCritBtn]}
                onPress={() => {
                  if (!latestRoll.attackContext) return;
                  rollWeaponDamage({
                    weaponName: latestRoll.attackContext.weaponName,
                    damage: latestRoll.attackContext.damage,
                    critical: latestRoll.attackContext.critical,
                    isCrit: true,
                    isMaxDamage: false,
                    attackContext: latestRoll.attackContext,
                  });
                }}
              >
                <Ionicons name="flash" size={13} color="#FFF" />
                <Text style={styles.toastActionBtnText}>Crítico ({latestRoll.attackContext.critical})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toastActionBtn,
                  styles.toastMaxActionBtn,
                  is20Natural && styles.toastMaxActionBtnHighlight,
                ]}
                onPress={() => {
                  if (!latestRoll.attackContext) return;
                  rollWeaponDamage({
                    weaponName: latestRoll.attackContext.weaponName,
                    damage: latestRoll.attackContext.damage,
                    critical: latestRoll.attackContext.critical,
                    isCrit: true,
                    isMaxDamage: true,
                    attackContext: latestRoll.attackContext,
                  });
                }}
              >
                <Ionicons name="sparkles" size={13} color="#000" />
                <Text style={styles.toastMaxActionBtnText}>
                  {is20Natural ? 'Crítico Máx (20)!' : 'Crítico Máx'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 74,
      left: 14,
      right: 14,
      zIndex: 999,
    },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 10,
    },
    cardCritical: {
      borderColor: colors.success,
    },
    cardFumble: {
      borderColor: colors.danger,
    },
    cardMaxDamage: {
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {
      flex: 1,
      paddingRight: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 3,
    },
    label: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
      flexShrink: 1,
    },
    critBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    critBadge20: {
      backgroundColor: '#F59E0B',
    },
    critText: {
      color: '#000',
      fontSize: 10,
      fontWeight: '800',
    },
    critText20: {
      color: '#000',
      fontWeight: '900',
    },
    maxBadge: {
      backgroundColor: '#F59E0B',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    maxText: {
      color: '#000',
      fontSize: 10,
      fontWeight: '900',
    },
    formulaText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    totalBox: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 10,
      minWidth: 46,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    totalBoxCrit: {
      borderColor: colors.success,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    totalBoxMax: {
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    totalValue: {
      color: colors.primary,
      fontWeight: '900',
      fontSize: 19,
    },
    closeBtn: {
      padding: 4,
    },
    attackActionsContainer: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    attackActionsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    attackActionsTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    natural20Hint: {
      color: '#F59E0B',
      fontSize: 10,
      fontWeight: '800',
    },
    quickDamageRow: {
      flexDirection: 'row',
      gap: 6,
    },
    toastActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: 'rgba(239, 68, 68, 0.18)',
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    toastCritBtn: {
      backgroundColor: '#991B1B',
      borderColor: '#B91C1C',
    },
    toastMaxActionBtn: {
      backgroundColor: '#D97706',
      borderColor: '#F59E0B',
    },
    toastMaxActionBtnHighlight: {
      backgroundColor: '#F59E0B',
      borderWidth: 1.5,
      borderColor: '#FEF08A',
    },
    toastActionBtnText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '800',
    },
    toastMaxActionBtnText: {
      color: '#000',
      fontSize: 10,
      fontWeight: '900',
    },
  });
