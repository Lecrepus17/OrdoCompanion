import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';

export const DiceToast: React.FC = () => {
  const { latestRoll, dismissLatestRoll } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  if (!latestRoll) return null;

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 6);
  const bottomPosition = 56 + bottomInset + 10;

  return (
    <View style={[styles.container, { bottom: bottomPosition }]}>
      <View
        style={[
          styles.card,
          latestRoll.isCritical && styles.cardCritical,
          latestRoll.isFumble && styles.cardFumble,
        ]}
      >
        <View style={styles.left}>
          <View style={styles.titleRow}>
            <Ionicons name="dice" size={18} color={colors.primary} />
            <Text style={styles.label} numberOfLines={1}>
              {latestRoll.label}
            </Text>
            {latestRoll.isCritical && (
              <View style={styles.critBadge}>
                <Text style={styles.critText}>
                  {latestRoll.chosenDie === 20 ? '20 NATURAL!' : 'CRÍTICO!'}
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
          <View style={styles.totalBox}>
            <Text style={styles.totalValue}>{latestRoll.total}</Text>
          </View>
          <TouchableOpacity onPress={dismissLatestRoll} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
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
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    critText: {
      color: '#000',
      fontSize: 10,
      fontWeight: '800',
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
    totalValue: {
      color: colors.primary,
      fontWeight: '900',
      fontSize: 19,
    },
    closeBtn: {
      padding: 4,
    },
  });
