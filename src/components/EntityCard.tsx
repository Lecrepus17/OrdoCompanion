import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompendiumEntity } from '../types/compendium';
import { CATEGORY_LABELS, getElementStyle, ThemeColors, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';

interface EntityCardProps {
  entity: CompendiumEntity;
  onPress: () => void;
  numColumns?: number;
  cardWidth?: number;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  onPress,
  numColumns = 1,
  cardWidth,
}) => {
  const { favoriteIds, toggleFavorite, rollFormula } = useApp();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const isFav = favoriteIds.has(entity.id);
  const elStyle = getElementStyle(entity.element, colors);
  const catInfo = CATEGORY_LABELS[entity.category] || CATEGORY_LABELS.all;
  const isGrid = numColumns > 1;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isGrid && styles.cardGrid,
        cardWidth ? { width: cardWidth } : undefined,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.topContent}>
        <View style={styles.headerRow}>
          <View style={[styles.badgesWrap, isGrid && styles.badgesWrapGrid]}>
            <View
              style={[
                styles.catBadge,
                isGrid && styles.catBadgeGrid,
                { borderColor: catInfo.color },
              ]}
            >
              <Text
                style={[
                  styles.catBadgeText,
                  isGrid && styles.catBadgeTextGrid,
                  { color: catInfo.color },
                ]}
              >
                {entity.subCategory || catInfo.singular}
              </Text>
            </View>

            {entity.element && entity.element !== 'Nenhum' && (
              <View
                style={[
                  styles.elBadge,
                  isGrid && styles.elBadgeGrid,
                  { backgroundColor: elStyle.bg, borderColor: elStyle.border },
                ]}
              >
                <Text
                  style={[
                    styles.elBadgeText,
                    isGrid && styles.elBadgeTextGrid,
                    { color: elStyle.text },
                  ]}
                >
                  {entity.element}
                </Text>
              </View>
            )}

            {entity.isCustom && (
              <View style={[styles.customBadge, isGrid && styles.customBadgeGrid]}>
                <Text style={[styles.customBadgeText, isGrid && styles.customBadgeTextGrid]}>
                  HOMEBREW
                </Text>
              </View>
            )}
            {entity.isEdited && !entity.isCustom && (
              <View
                style={[
                  styles.customBadge,
                  isGrid && styles.customBadgeGrid,
                  { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
                ]}
              >
                <Text
                  style={[
                    styles.customBadgeText,
                    isGrid && styles.customBadgeTextGrid,
                    { color: '#FBBF24' },
                  ]}
                >
                  EDITADO
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => toggleFavorite(entity.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFav ? 'bookmark' : 'bookmark-outline'}
              size={isGrid ? 18 : 20}
              color={isFav ? colors.warning : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={[styles.title, isGrid && styles.titleGrid]}
          numberOfLines={isGrid ? 2 : undefined}
        >
          {entity.name}
        </Text>

        <Text
          style={[styles.summary, isGrid && styles.summaryGrid]}
          numberOfLines={isGrid ? 2 : 3}
        >
          {entity.summary || entity.description}
        </Text>
      </View>

      <View style={[styles.footerRow, isGrid && styles.footerRowGrid]}>
        <View style={[styles.sourceWrap, isGrid && styles.sourceWrapGrid]}>
          <Ionicons name="book-outline" size={isGrid ? 11 : 13} color={colors.textMuted} />
          <Text
            style={[styles.sourceText, isGrid && styles.sourceTextGrid]}
            numberOfLines={1}
          >
            {entity.bookTitle} • pág. {entity.pageNumber}
          </Text>
        </View>

        {entity.diceFormulas && entity.diceFormulas.length > 0 && (
          <View style={[styles.diceRow, isGrid && styles.diceRowGrid]}>
            {entity.diceFormulas.slice(0, isGrid ? 1 : 2).map((formula) => (
              <TouchableOpacity
                key={formula}
                style={[styles.dicePill, isGrid && styles.dicePillGrid]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => rollFormula(formula, `${entity.name} (${formula})`)}
              >
                <Ionicons name="dice-outline" size={isGrid ? 11 : 13} color={colors.primary} />
                <Text style={[styles.dicePillText, isGrid && styles.dicePillTextGrid]}>
                  {formula}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    cardGrid: {
      padding: 10,
      borderRadius: 12,
      justifyContent: 'space-between',
    },
    topContent: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    badgesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
      paddingRight: 8,
    },
    badgesWrapGrid: {
      gap: 4,
      paddingRight: 4,
    },
    catBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      backgroundColor: colors.surfaceElevated,
    },
    catBadgeGrid: {
      paddingHorizontal: 5,
      paddingVertical: 1.5,
    },
    catBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    catBadgeTextGrid: {
      fontSize: 10,
    },
    elBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    elBadgeGrid: {
      paddingHorizontal: 5,
      paddingVertical: 1.5,
    },
    elBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    elBadgeTextGrid: {
      fontSize: 10,
    },
    customBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    customBadgeGrid: {
      paddingHorizontal: 4,
      paddingVertical: 1.5,
    },
    customBadgeText: {
      color: '#34D399',
      fontSize: 10,
      fontWeight: '800',
    },
    customBadgeTextGrid: {
      fontSize: 9,
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 4,
    },
    titleGrid: {
      fontSize: 14,
      lineHeight: 18,
      marginBottom: 4,
    },
    summary: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 10,
    },
    summaryGrid: {
      fontSize: 11.5,
      lineHeight: 16,
      marginBottom: 8,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    footerRowGrid: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 5,
      paddingTop: 6,
    },
    sourceWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    sourceWrapGrid: {
      maxWidth: '100%',
    },
    sourceText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    sourceTextGrid: {
      fontSize: 10.5,
    },
    diceRow: {
      flexDirection: 'row',
      gap: 6,
    },
    diceRowGrid: {
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 2,
    },
    dicePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    dicePillGrid: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    dicePillText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    dicePillTextGrid: {
      fontSize: 10,
    },
  });
