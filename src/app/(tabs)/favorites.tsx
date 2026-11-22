import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { EntityCard } from '../../components/EntityCard';
import { confirmAction } from '../../utils/alert';
import { CompendiumEntity } from '../../types/compendium';
import { DEFAULT_LONG_PRESS_DELAY } from '../../types/recordPreview';

type SubTab = 'favorites' | 'lists' | 'homebrew';

export default function FavoritesAndListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const {
    entities,
    favoriteIds,
    savedLists,
    createSavedList,
    deleteSavedList,
    listingColumns,
    toggleListingColumns,
    toggleFavorite,
    rollFormula,
    openEntityPreview,
  } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = listingColumns === 2 ? Math.floor((windowWidth - 28 - 10) / 2) : undefined;

  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [subTab, setSubTab] = useState<SubTab>('favorites');
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  const handlePressEntity = useCallback((id: string) => {
    router.push({ pathname: '/entity/[id]', params: { id } });
  }, [router]);

  const favoriteEntities = useMemo(
    () => entities.filter((e) => favoriteIds.has(e.id)),
    [entities, favoriteIds]
  );

  const customOrEditedEntities = useMemo(
    () => entities.filter((e) => e.isCustom || e.isEdited),
    [entities]
  );

  const renderFavoriteItem = useCallback(
    ({ item }: { item: CompendiumEntity }) => (
      <EntityCard
        entity={item}
        numColumns={listingColumns}
        cardWidth={cardWidth}
        isFavorite={true}
        onPressItem={handlePressEntity}
        onToggleFavorite={toggleFavorite}
        onRollFormula={rollFormula}
      />
    ),
    [listingColumns, cardWidth, handlePressEntity, toggleFavorite, rollFormula]
  );

  const renderCustomItem = useCallback(
    ({ item }: { item: CompendiumEntity }) => (
      <EntityCard
        entity={item}
        numColumns={listingColumns}
        cardWidth={cardWidth}
        isFavorite={favoriteIds.has(item.id)}
        onPressItem={handlePressEntity}
        onToggleFavorite={toggleFavorite}
        onRollFormula={rollFormula}
      />
    ),
    [listingColumns, cardWidth, favoriteIds, handlePressEntity, toggleFavorite, rollFormula]
  );

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await createSavedList(newListName, newListDesc);
    setNewListName('');
    setNewListDesc('');
  };

  return (
    <View style={styles.container}>
      {/* Sub-abas */}
      <View style={styles.tabsRow}>
        {(
          [
            { key: 'favorites', label: `Favoritos (${favoriteEntities.length})` },
            { key: 'lists', label: `Listas (${savedLists.length})` },
            { key: 'homebrew', label: `Editados (${customOrEditedEntities.length})` },
          ] as const
        ).map((t) => {
          const active = subTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, active && styles.tabPillActive]}
              onPress={() => setSubTab(t.key)}
            >
              <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {subTab === 'favorites' && (
        <View style={{ flex: 1 }}>
          <View style={styles.listToolbarRow}>
            <Text style={styles.listToolbarCount}>
              {favoriteEntities.length} {favoriteEntities.length === 1 ? 'favorito' : 'favoritos'}
            </Text>
            <TouchableOpacity
              style={[
                styles.columnsToggleBtn,
                listingColumns === 2 && styles.columnsToggleBtnActive,
              ]}
              onPress={toggleListingColumns}
              activeOpacity={0.75}
            >
              <Ionicons
                name={listingColumns === 2 ? 'grid' : 'list'}
                size={13}
                color={listingColumns === 2 ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.columnsToggleBtnText,
                  listingColumns === 2 && styles.columnsToggleBtnTextActive,
                ]}
              >
                {listingColumns === 2 ? '2 colunas' : '1 coluna'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            key={`fav_list_cols_${listingColumns}`}
            data={favoriteEntities}
            keyExtractor={(item) => item.id}
            numColumns={listingColumns}
            columnWrapperStyle={listingColumns > 1 ? styles.columnWrapper : undefined}
            contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}
            initialNumToRender={listingColumns === 2 ? 14 : 10}
            maxToRenderPerBatch={listingColumns === 2 ? 16 : 12}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
            renderItem={renderFavoriteItem}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="bookmark-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum favorito salvo</Text>
                <Text style={styles.emptySub}>
                  Toque no ícone de marcador em qualquer ritual, criatura ou item do Compêndio para acessá-lo rapidamente aqui.
                </Text>
              </View>
            }
          />
        </View>
      )}

      {subTab === 'lists' && (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}>
          <View style={styles.createCard}>
            <Text style={styles.cardTitle}>Criar Nova Lista / Grimório / Missão</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da lista (ex: Grimório de Sangue, Ameaças da Sessão)"
              placeholderTextColor={colors.textMuted}
              value={newListName}
              onChangeText={setNewListName}
            />
            <TextInput
              style={styles.input}
              placeholder="Descrição opcional..."
              placeholderTextColor={colors.textMuted}
              value={newListDesc}
              onChangeText={setNewListDesc}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateList}>
              <Text style={styles.primaryBtnText}>Criar Lista</Text>
            </TouchableOpacity>
          </View>

          {savedLists.map((list) => (
            <View key={list.id} style={styles.savedListCard}>
              <View style={styles.savedListHeader}>
                <View>
                  <Text style={styles.savedListName}>{list.name}</Text>
                  {Boolean(list.description) && (
                    <Text style={styles.savedListDesc}>{list.description}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    confirmAction({
                      title: 'Excluir Lista',
                      message: `Tem certeza que deseja apagar a lista "${list.name}"?`,
                      onConfirm: () => deleteSavedList(list.id),
                      destructive: true,
                    })
                  }
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>

              {list.entityIds.length === 0 ? (
                <Text style={styles.emptyListHint}>
                  Lista vazia. Abra um registro no compêndio e use &quot;Adicionar a Lista&quot;.
                </Text>
              ) : (
                list.entityIds.map((id) => {
                  const ent = entities.find((e) => e.id === id);
                  if (!ent) return null;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={styles.listItemRow}
                      onPress={() =>
                        router.push({ pathname: '/entity/[id]', params: { id: ent.id } })
                      }
                      onLongPress={() =>
                        openEntityPreview(ent, { showOpenFullEntityButton: true })
                      }
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.listItemName}>{ent.name}</Text>
                        <Text style={styles.listItemMeta}>
                          {ent.category} • {ent.element || 'Geral'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openEntityPreview(ent, { showOpenFullEntityButton: true });
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {subTab === 'homebrew' && (
        <View style={{ flex: 1 }}>
          <View style={styles.listToolbarRow}>
            <Text style={styles.listToolbarCount}>
              {customOrEditedEntities.length} {customOrEditedEntities.length === 1 ? 'registro' : 'registros'}
            </Text>
            <TouchableOpacity
              style={[
                styles.columnsToggleBtn,
                listingColumns === 2 && styles.columnsToggleBtnActive,
              ]}
              onPress={toggleListingColumns}
              activeOpacity={0.75}
            >
              <Ionicons
                name={listingColumns === 2 ? 'grid' : 'list'}
                size={13}
                color={listingColumns === 2 ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.columnsToggleBtnText,
                  listingColumns === 2 && styles.columnsToggleBtnTextActive,
                ]}
              >
                {listingColumns === 2 ? '2 colunas' : '1 coluna'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            key={`homebrew_list_cols_${listingColumns}`}
            data={customOrEditedEntities}
            keyExtractor={(item) => item.id}
            numColumns={listingColumns}
            columnWrapperStyle={listingColumns > 1 ? styles.columnWrapper : undefined}
            contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}
            initialNumToRender={listingColumns === 2 ? 14 : 10}
            maxToRenderPerBatch={listingColumns === 2 ? 16 : 12}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
            renderItem={renderCustomItem}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum registro customizado</Text>
                <Text style={styles.emptySub}>
                  Você pode criar rituais, criaturas, itens ou regras próprias tocando no botão &quot;+&quot; no Compêndio, ou editando qualquer registro oficial existente.
                </Text>
              </View>
            }
          />
        </View>
      )}

    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    tabPill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    tabPillText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    tabPillTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    listToolbarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    listToolbarCount: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    columnsToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    columnsToggleBtnActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    columnsToggleBtnText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    columnsToggleBtnTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    listContent: {
      paddingHorizontal: 14,
      paddingBottom: 90,
      gap: 12,
    },
    columnWrapper: {
      gap: 10,
      justifyContent: 'flex-start',
    },
    layoutOptionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    layoutOptionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    layoutOptionBtnActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    layoutOptionText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    layoutOptionTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 28,
      gap: 8,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    emptySub: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
    },
    createCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 15,
      gap: 10,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    themeInfoText: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 4,
    },
    themeItemCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    themeItemTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    themeIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeItemName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    themeItemSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    themeRadio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeItemDesc: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    themeSwatchesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    swatchesLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    swatchesList: {
      flexDirection: 'row',
      gap: 6,
    },
    swatchCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
    },
    selectedPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
    },
    selectedPillText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
    },
    jsonArea: {
      minHeight: 200,
      textAlignVertical: 'top',
      fontFamily: 'monospace',
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 13,
    },
    secondaryBtn: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 13,
    },
    rowBtns: {
      flexDirection: 'row',
      gap: 10,
    },
    savedListCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    savedListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    savedListName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    savedListDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    emptyListHint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    listItemRow: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 10,
    },
    listItemName: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 14,
    },
    listItemMeta: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
  });
