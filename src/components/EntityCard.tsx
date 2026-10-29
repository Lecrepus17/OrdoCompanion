import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CompendiumEntity } from '../types/compendium';
import { DEFAULT_LONG_PRESS_DELAY } from '../types/recordPreview';
import { CATEGORY_LABELS, getElementStyle, ThemeColors, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';

export interface EntityCardProps {
  entity: CompendiumEntity;
  onPress?: () => void;
  onPressItem?: (id: string) => void;
  onLongPress?: () => void;
  onInspectEntity?: (entity: CompendiumEntity) => void;
  numColumns?: number;
  cardWidth?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onRollFormula?: (formula: string, label?: string) => void;
}

export const EntityCardView = React.memo<EntityCardProps>(function EntityCardView({
  entity,
  onPress,
  onPressItem,
  onLongPress,
  onInspectEntity,
  numColumns = 1,
  cardWidth,
  isFavorite = false,
  onToggleFavorite,
  onRollFormula,
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const elStyle = useMemo(() => getElementStyle(entity.element, colors), [entity.element, colors]);
  const catInfo = CATEGORY_LABELS[entity.category] || CATEGORY_LABELS.all;
  const isGrid = numColumns > 1;

  const handlePress = useCallback(() => {
    if (onPressItem) {
      onPressItem(entity.id);
    } else if (onPress) {
      onPress();
    }
  }, [onPressItem, onPress, entity.id]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress();
    } else if (onInspectEntity) {
      onInspectEntity(entity);
    }
  }, [onLongPress, onInspectEntity, entity]);

  const handleToggleFav = useCallback(() => {
    onToggleFavorite?.(entity.id);
  }, [onToggleFavorite, entity.id]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isGrid && styles.cardGrid,
        cardWidth ? { width: cardWidth } : undefined,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
      activeOpacity={0.82}
      testID={`entity-card-${entity.id}`}
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
                numberOfLines={1}
                ellipsizeMode="tail"
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
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isGrid && entity.element.startsWith('Variável') ? 'Variável' : entity.element}
                </Text>
              </View>
            )}

            {Boolean(entity.prerequisite) && (
              <View
                style={[
                  styles.prereqBadge,
                  isGrid && styles.prereqBadgeGrid,
                  entity.prerequisite !== 'Nenhum'
                    ? styles.prereqBadgeRequired
                    : styles.prereqBadgeNone,
                ]}
              >
                <Ionicons
                  name={entity.prerequisite !== 'Nenhum' ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                  size={isGrid ? 10 : 11}
                  color={entity.prerequisite !== 'Nenhum' ? '#F59E0B' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.prereqBadgeText,
                    isGrid && styles.prereqBadgeTextGrid,
                    { color: entity.prerequisite !== 'Nenhum' ? '#F59E0B' : colors.textMuted },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isGrid
                    ? entity.prerequisite !== 'Nenhum'
                      ? `Req: ${entity.prerequisite}`
                      : 'Req: Nenhum'
                    : `Pré-req: ${entity.prerequisite}`}
                </Text>
              </View>
            )}

            {entity.isCustom && (
              <View style={[styles.customBadge, isGrid && styles.customBadgeGrid]}>
                <Text
                  style={[styles.customBadgeText, isGrid && styles.customBadgeTextGrid]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
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
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  EDITADO
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={styles.favBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                handleLongPress();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityLabel="Ver detalhes rápidos"
              testID={`entity-info-${entity.id}`}
            >
              <Ionicons
                name="information-circle-outline"
                size={isGrid ? 18 : 20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.favBtn}
              onPress={handleToggleFav}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
              accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Favoritar item'}
            >
              <Ionicons
                name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={isGrid ? 18 : 20}
                color={isFavorite ? colors.warning : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
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
                onPress={() => onRollFormula?.(formula, `${entity.name} (${formula})`)}
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
});

const EntityCardConnected: React.FC<EntityCardProps> = (props) => {
  const { favoriteIds, toggleFavorite, rollFormula, openEntityPreview } = useApp();
  const handleInspect = useCallback(
    (ent: CompendiumEntity) => {
      openEntityPreview(ent, { showOpenFullEntityButton: true });
    },
    [openEntityPreview]
  );
  return (
    <EntityCardView
      {...props}
      isFavorite={props.isFavorite !== undefined ? props.isFavorite : favoriteIds.has(props.entity.id)}
      onToggleFavorite={props.onToggleFavorite || toggleFavorite}
      onRollFormula={props.onRollFormula || rollFormula}
      onInspectEntity={props.onInspectEntity || handleInspect}
    />
  );
};

export const EntityCard = React.memo<EntityCardProps>(function EntityCard(props) {
  if (
    props.onToggleFavorite !== undefined &&
    props.isFavorite !== undefined &&
    props.onRollFormula !== undefined &&
    props.onInspectEntity !== undefined
  ) {
    return <EntityCardView {...props} />;
  }
  return <EntityCardConnected {...props} />;
});

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
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    favBtn: {
      paddingLeft: 4,
      paddingTop: 1,
    },
    badgesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      flex: 1,
      minWidth: 0,
      paddingRight: 6,
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
      maxWidth: '100%',
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
      maxWidth: '100%',
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
      maxWidth: '100%',
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
    prereqBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      maxWidth: '100%',
    },
    prereqBadgeGrid: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    prereqBadgeRequired: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    prereqBadgeNone: {
      backgroundColor: colors.surfaceElevated || 'rgba(255, 255, 255, 0.04)',
      borderColor: colors.border,
    },
    prereqBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    prereqBadgeTextGrid: {
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
      flexWrap: 'wrap',
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
