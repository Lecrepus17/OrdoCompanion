import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CATEGORY_LABELS, ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { CompendiumEntity, EntityCategory, EntityClassFilter, ExcludableType } from '../../types/compendium';
import { EntityCard } from '../../components/EntityCard';

const CATEGORIES_ORDER: Array<EntityCategory | 'all'> = [
  'all',
  'ritual',
  'power',
  'origin',
  'class',
  'track',
  'weapon',
  'item',
  'creature',
  'skill',
  'condition',
  'rule',
];

const ELEMENTS_ORDER = ['all', 'Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'];

const POWER_TYPE_OPTIONS: Array<{ id: 'all' | 'class' | 'paranormal' | 'general'; label: string; icon: string }> = [
  { id: 'all', label: 'Todos os Poderes', icon: 'flash' },
  { id: 'class', label: 'Poderes de Classe', icon: 'shield' },
  { id: 'paranormal', label: 'Poderes Paranormais', icon: 'eye' },
  { id: 'general', label: 'Poderes Gerais', icon: 'star' },
];

interface ClassOption {
  id: EntityClassFilter | 'all';
  label: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const CLASS_OPTIONS: ClassOption[] = [
  {
    id: 'all',
    label: 'Todas as Classes',
    activeBg: 'rgba(59, 130, 246, 0.22)',
    activeBorder: '#3B82F6',
    activeText: '#93C5FD',
  },
  {
    id: 'Combatente',
    label: 'Combatente',
    activeBg: 'rgba(239, 68, 68, 0.22)',
    activeBorder: '#EF4444',
    activeText: '#FCA5A5',
  },
  {
    id: 'Especialista',
    label: 'Especialista',
    activeBg: 'rgba(6, 182, 212, 0.22)',
    activeBorder: '#06B6D4',
    activeText: '#67E8F9',
  },
  {
    id: 'Ocultista',
    label: 'Ocultista',
    activeBg: 'rgba(168, 85, 247, 0.22)',
    activeBorder: '#A855F7',
    activeText: '#E9D5FF',
  },
  {
    id: 'none',
    label: 'Sem classe',
    activeBg: 'rgba(156, 163, 175, 0.22)',
    activeBorder: '#9CA3AF',
    activeText: '#E5E7EB',
  },
];

interface ExcludableOption {
  id: ExcludableType;
  label: string;
  badgeLabel: string;
  countLabel: string;
}

const EXCLUDABLE_OPTIONS: ExcludableOption[] = [
  {
    id: 'rules',
    label: 'Regras & Capítulos',
    badgeLabel: 'Regras',
    countLabel: '126 regras',
  },
  {
    id: 'missionStories',
    label: 'História de Missões / Dossiês',
    badgeLabel: 'Histórias / Casos',
    countLabel: '247 dossiês (Arq. Secretos)',
  },
  {
    id: 'creatures',
    label: 'Ameaças & Criaturas',
    badgeLabel: 'Criaturas',
    countLabel: '186 fichas',
  },
  {
    id: 'items',
    label: 'Itens & Maldições',
    badgeLabel: 'Itens',
    countLabel: '274 itens',
  },
  {
    id: 'weapons',
    label: 'Armas',
    badgeLabel: 'Armas',
    countLabel: '58 armas',
  },
  {
    id: 'origins',
    label: 'Origens',
    badgeLabel: 'Origens',
    countLabel: '59 origens',
  },
  {
    id: 'conditions',
    label: 'Condições & Perícias',
    badgeLabel: 'Condições / Perícias',
    countLabel: '65 itens',
  },
  {
    id: 'rituals',
    label: 'Rituais',
    badgeLabel: 'Rituais',
    countLabel: '106 rituais',
  },
  {
    id: 'powers',
    label: 'Poderes',
    badgeLabel: 'Poderes',
    countLabel: '207 poderes',
  },
];

export default function CompendiumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const {
    ready,
    filteredEntities,
    entities,
    books,
    filters,
    setFilters,
    resetFilters,
    listingColumns,
    toggleListingColumns,
    setListingColumns,
    openManual,
    favoriteIds,
    toggleFavorite,
    rollFormula,
  } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = listingColumns === 2 ? Math.floor((windowWidth - 28 - 10) / 2) : undefined;
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@ordocompanion_filters_collapsed')
      .then((val) => {
        if (val !== null) {
          setFiltersCollapsed(val === 'true');
        }
      })
      .catch(() => {});
  }, []);

  const toggleFiltersCollapsed = useCallback(() => {
    setFiltersCollapsed((prev) => {
      const next = !prev;
      AsyncStorage.setItem('@ordocompanion_filters_collapsed', String(next)).catch(() => {});
      return next;
    });
  }, []);

  const handlePressEntity = useCallback((id: string) => {
    router.push({ pathname: '/entity/[id]', params: { id } });
  }, [router]);

  const renderEntityItem = useCallback(
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

  if (!ready) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando base de dados dos 10 livros...</Text>
      </View>
    );
  }

  const handleToggleClass = (classId: EntityClassFilter | 'all') => {
    if (classId === 'all') {
      setFilters((prev) => ({ ...prev, classes: [] }));
      return;
    }

    setFilters((prev) => {
      const current = prev.classes || [];
      const exists = current.includes(classId);
      const next = exists ? current.filter((c) => c !== classId) : [...current, classId];
      return { ...prev, classes: next };
    });
  };

  const handleToggleExclude = (type: ExcludableType) => {
    setFilters((prev) => {
      const current = prev.excludedTypes || [];
      const exists = current.includes(type);
      const next = exists ? current.filter((t) => t !== type) : [...current, type];
      return { ...prev, excludedTypes: next };
    });
  };

  const handleQuickToggleRulesAndStories = () => {
    setFilters((prev) => {
      const current = prev.excludedTypes || [];
      const hasBoth = current.includes('rules') && current.includes('missionStories');
      if (hasBoth) {
        return {
          ...prev,
          excludedTypes: current.filter((t) => t !== 'rules' && t !== 'missionStories'),
        };
      } else {
        const next = Array.from(
          new Set([...current, 'rules' as ExcludableType, 'missionStories' as ExcludableType])
        );
        return { ...prev, excludedTypes: next };
      }
    });
  };

  const hasRulesOrStoriesExcluded =
    Boolean(filters.excludedTypes?.includes('rules')) &&
    Boolean(filters.excludedTypes?.includes('missionStories'));

  const excludedCount = filters.excludedTypes?.length || 0;

  const isDefaultExclusions =
    Boolean(filters.excludedTypes) &&
    filters.excludedTypes!.length === 2 &&
    filters.excludedTypes!.includes('rules') &&
    filters.excludedTypes!.includes('missionStories');

  const hasActiveDirectFilters =
    filters.category !== 'all' ||
    (Boolean(filters.classes) && filters.classes!.length > 0) ||
    filters.element !== 'all' ||
    filters.circle !== 'all';

  const hasModalActiveFilters =
    filters.bookId !== 'all' ||
    filters.circle !== 'all' ||
    filters.itemCategory !== 'all' ||
    (Boolean(filters.classes) && filters.classes!.length > 0) ||
    !isDefaultExclusions ||
    filters.onlyFavorites ||
    filters.onlyCustomOrEdited ||
    typeof filters.minVd === 'number' ||
    typeof filters.maxVd === 'number';

  const hasActiveFilters =
    filters.query.trim() !== '' ||
    hasActiveDirectFilters ||
    filters.bookId !== 'all' ||
    filters.itemCategory !== 'all' ||
    !isDefaultExclusions ||
    typeof filters.minVd === 'number' ||
    typeof filters.maxVd === 'number' ||
    Boolean(filters.onlyFavorites) ||
    Boolean(filters.onlyCustomOrEdited);

  return (
    <View style={styles.container}>
      {/* Barra de Busca Global + Botão de Filtros Avançados + Botão Criar */}
      <View style={styles.topSearchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ritual, criatura, origem, arma, regra..."
            placeholderTextColor={colors.textMuted}
            value={filters.query}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, query: text }))}
          />
          {filters.query.length > 0 && (
            <TouchableOpacity onPress={() => setFilters((prev) => ({ ...prev, query: '' }))}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.iconBtn,
            hasModalActiveFilters && styles.iconBtnActive,
          ]}
          onPress={() => setFilterModalVisible(true)}
          accessibilityLabel="Filtros avançados"
        >
          <Ionicons name="options-outline" size={20} color={colors.text} />
          {!isDefaultExclusions && excludedCount > 0 && <View style={styles.filterDotBadge} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => openManual('compendium')}
          accessibilityLabel="Manual do Compêndio e Filtros"
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() =>
            router.push({
              pathname: '/entity/editor',
              params: { defaultCategory: filters.category === 'all' ? 'ritual' : filters.category },
            })
          }
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Seção de Filtros (Chips de Categoria, Classe e Elementos) */}
      {!filtersCollapsed && (
        <View style={styles.collapsibleFiltersWrap}>
          {/* Chips de Categoria */}
          <View style={styles.chipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {CATEGORIES_ORDER.map((cat) => {
                const active = filters.category === cat;
                const info = CATEGORY_LABELS[cat] || CATEGORY_LABELS.all;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                    ]}
                    onPress={() => setFilters((prev) => ({ ...prev, category: cat }))}
                  >
                    <Text style={[styles.chipText, active && { color: colors.primary, fontWeight: '800' }]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Chips de Classe */}
          <View style={styles.classChipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {CLASS_OPTIONS.map((item) => {
                const isAll = item.id === 'all';
                const selectedClasses = filters.classes || [];
                const active = isAll
                  ? selectedClasses.length === 0
                  : selectedClasses.includes(item.id as EntityClassFilter);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.subChip,
                      active && {
                        backgroundColor: item.activeBg,
                        borderColor: item.activeBorder,
                      },
                    ]}
                    onPress={() => handleToggleClass(item.id)}
                  >
                    <View style={styles.chipInner}>
                      {active && !isAll && (
                        <Ionicons name="checkmark" size={12} color={item.activeText} style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.subChipText,
                          active && { color: item.activeText, fontWeight: '800' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Chips de Elemento Paranormal + Círculo quando Ritual + Tipo de Poder */}
          <View style={styles.subChipsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {filters.category === 'power' &&
                POWER_TYPE_OPTIONS.map((opt) => {
                  const active = (filters.powerType || 'all') === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.subChip,
                        active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, powerType: opt.id }))
                      }
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons
                          name={opt.icon as any}
                          size={12}
                          color={active ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.subChipText, active && { color: colors.primary, fontWeight: '800' }]}>
                          {opt.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              {ELEMENTS_ORDER.map((el) => {
                const active = filters.element === el;
                return (
                  <TouchableOpacity
                    key={el}
                    style={[
                      styles.subChip,
                      active && { backgroundColor: colors.primarySoft, borderColor: colors.accent },
                    ]}
                    onPress={() => setFilters((prev) => ({ ...prev, element: el }))}
                  >
                    <Text style={[styles.subChipText, active && { color: colors.accent, fontWeight: '800' }]}>
                      {el === 'all' ? 'Todo Elemento' : el}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {filters.category === 'ritual' &&
                [1, 2, 3, 4].map((c) => {
                  const active = filters.circle === c;
                  return (
                    <TouchableOpacity
                      key={`circle_${c}`}
                      style={[
                        styles.subChip,
                        active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, circle: prev.circle === c ? 'all' : c }))
                      }
                    >
                      <Text style={[styles.subChipText, active && { color: colors.primary, fontWeight: '800' }]}>
                        {c}º Círculo
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Barra de Status de Resultados + Ações Rápidas */}
      <View style={styles.statusRow}>
        <View style={styles.statusTextWrap}>
          <Text style={styles.statusText}>
            Exibindo <Text style={styles.statusBold}>{filteredEntities.length}</Text> de {entities.length}
          </Text>
          {excludedCount > 0 && (
            <Text style={styles.statusExcludedText}>
              ({entities.length - filteredEntities.length} ocultos)
            </Text>
          )}
        </View>

        <View style={styles.statusActions}>
          {/* Botão Ocultar / Mostrar Filtro */}
          <TouchableOpacity
            style={[
              styles.quickHideBtn,
              filtersCollapsed && styles.quickHideBtnCollapsed,
              filtersCollapsed && hasActiveDirectFilters && styles.quickHideBtnFilterActive,
            ]}
            onPress={toggleFiltersCollapsed}
            activeOpacity={0.75}
            accessibilityLabel={filtersCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
          >
            <Ionicons
              name={filtersCollapsed ? 'funnel-outline' : 'funnel'}
              size={13}
              color={
                filtersCollapsed
                  ? (hasActiveDirectFilters ? colors.accent : colors.textMuted)
                  : colors.primary
              }
            />
            <Text
              style={[
                styles.quickHideBtnText,
                !filtersCollapsed && { color: colors.primary, fontWeight: '700' },
                filtersCollapsed && hasActiveDirectFilters && { color: colors.accent, fontWeight: '700' },
              ]}
            >
              {filtersCollapsed ? 'Mostrar filtros' : 'Ocultar filtros'}
            </Text>
            {filtersCollapsed && hasActiveDirectFilters && (
              <View style={[styles.filterDotBadgeSmall, { backgroundColor: colors.accent }]} />
            )}
          </TouchableOpacity>

          {/* Ação Rápida Ocultar Regras/Missões */}
          <TouchableOpacity
            style={[
              styles.quickHideBtn,
              hasRulesOrStoriesExcluded && styles.quickHideBtnActive,
            ]}
            onPress={handleQuickToggleRulesAndStories}
            activeOpacity={0.75}
            accessibilityLabel={
              hasRulesOrStoriesExcluded ? 'Mostrar regras e missões' : 'Ocultar regras e missões'
            }
          >
            <Ionicons
              name={hasRulesOrStoriesExcluded ? 'eye-off' : 'eye-outline'}
              size={13}
              color={hasRulesOrStoriesExcluded ? '#EF4444' : colors.textMuted}
            />
            <Text
              style={[
                styles.quickHideBtnText,
                hasRulesOrStoriesExcluded && styles.quickHideBtnTextActive,
              ]}
            >
              {hasRulesOrStoriesExcluded ? 'Regras/Missões ocultas' : 'Ocultar regras/missões'}
            </Text>
          </TouchableOpacity>

          {/* Botão de Alternar 1 vs 2 Colunas */}
          <TouchableOpacity
            style={[
              styles.columnsToggleBtn,
              listingColumns === 2 && styles.columnsToggleBtnActive,
            ]}
            onPress={toggleListingColumns}
            activeOpacity={0.75}
            accessibilityLabel={`Alternar layout para ${listingColumns === 1 ? '2 colunas' : '1 coluna'}`}
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

          {hasActiveFilters && (
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.clearFiltersText}>Limpar tudo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chips de Conteúdos Ocultados Ativos */}
      {!filtersCollapsed &&
        Boolean(filters.excludedTypes && filters.excludedTypes.length > 0) &&
        !isDefaultExclusions && (
          <View style={styles.activeExclusionsBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeExclusionsScroll}>
              <Text style={styles.activeExclusionsLabel}>Ocultando:</Text>
              {filters.excludedTypes!.map((t) => {
                const opt = EXCLUDABLE_OPTIONS.find((o) => o.id === t);
                if (!opt) return null;
                return (
                  <TouchableOpacity
                    key={`excluded_badge_${t}`}
                    style={styles.activeExclusionChip}
                    onPress={() => handleToggleExclude(t)}
                  >
                    <Ionicons name="close-circle" size={13} color="#F87171" />
                    <Text style={styles.activeExclusionChipText}>{opt.badgeLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

      {/* Lista de Entidades */}
      <FlatList
        key={`compendium_list_cols_${listingColumns}`}
        data={filteredEntities}
        keyExtractor={(item) => item.id}
        numColumns={listingColumns}
        columnWrapperStyle={listingColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}
        initialNumToRender={listingColumns === 2 ? 14 : 10}
        maxToRenderPerBatch={listingColumns === 2 ? 16 : 12}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        renderItem={renderEntityItem}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhum registro encontrado</Text>
            <Text style={styles.emptySub}>
              Tente ajustar os filtros ou clique no botão "+" no topo para adicionar manualmente um novo item nesta categoria.
            </Text>
          </View>
        }
      />

      {/* Modal de Filtros Avançados */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros Avançados</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.filterSectionHeaderRow}>
                <Text style={styles.filterGroupLabel}>🚫 Ocultar da Pesquisa / Visualização</Text>
                {Boolean(filters.excludedTypes && filters.excludedTypes.length > 0) && (
                  <TouchableOpacity
                    onPress={() => setFilters((p) => ({ ...p, excludedTypes: [] }))}
                  >
                    <Text style={styles.filterSectionSubAction}>Mostrar tudo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.filterGroupSub}>
                Toque nos tipos de conteúdo que não deseja listar nos resultados:
              </Text>
              <View style={styles.filterWrapGrid}>
                {EXCLUDABLE_OPTIONS.map((opt) => {
                  const isExcluded = Boolean(filters.excludedTypes?.includes(opt.id));
                  return (
                    <TouchableOpacity
                      key={`modal_exclude_${opt.id}`}
                      style={[
                        styles.filterOptionPill,
                        isExcluded && styles.filterOptionPillExcluded,
                      ]}
                      onPress={() => handleToggleExclude(opt.id)}
                    >
                      <View style={styles.chipInner}>
                        <Ionicons
                          name={isExcluded ? 'eye-off' : 'eye-outline'}
                          size={13}
                          color={isExcluded ? '#F87171' : colors.textMuted}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.filterOptionText,
                            isExcluded && styles.filterOptionTextExcluded,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text
                          style={[
                            styles.filterCountBadgeText,
                            isExcluded && styles.filterCountBadgeTextExcluded,
                          ]}
                        >
                          ({opt.countLabel})
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterGroupLabel}>Classe (Múltipla Seleção)</Text>
              <View style={styles.filterWrapGrid}>
                {CLASS_OPTIONS.map((item) => {
                  const isAll = item.id === 'all';
                  const selectedClasses = filters.classes || [];
                  const active = isAll
                    ? selectedClasses.length === 0
                    : selectedClasses.includes(item.id as EntityClassFilter);

                  return (
                    <TouchableOpacity
                      key={`modal_class_${item.id}`}
                      style={[
                        styles.filterOptionPill,
                        active && {
                          backgroundColor: item.activeBg,
                          borderColor: item.activeBorder,
                        },
                      ]}
                      onPress={() => handleToggleClass(item.id)}
                    >
                      <View style={styles.chipInner}>
                        {active && !isAll && (
                          <Ionicons name="checkmark" size={13} color={item.activeText} style={{ marginRight: 4 }} />
                        )}
                        <Text
                          style={[
                            styles.filterOptionText,
                            active && { color: item.activeText, fontWeight: '800' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterGroupLabel}>Livro / Fonte de Origem</Text>
              <View style={styles.filterWrapGrid}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionPill,
                    filters.bookId === 'all' && styles.filterOptionPillActive,
                  ]}
                  onPress={() => setFilters((p) => ({ ...p, bookId: 'all' }))}
                >
                  <Text style={styles.filterOptionText}>Todos os Livros (10)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOptionPill,
                    filters.bookId === 'custom' && styles.filterOptionPillActive,
                  ]}
                  onPress={() => setFilters((p) => ({ ...p, bookId: 'custom' }))}
                >
                  <Text style={styles.filterOptionText}>Criados / Editados (Homebrew)</Text>
                </TouchableOpacity>

                {books.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.filterOptionPill,
                      filters.bookId === b.id && styles.filterOptionPillActive,
                    ]}
                    onPress={() => setFilters((p) => ({ ...p, bookId: b.id }))}
                  >
                    <Text style={styles.filterOptionText}>{b.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterGroupLabel}>Círculo do Ritual</Text>
              <View style={styles.filterWrapGrid}>
                {(['all', 1, 2, 3, 4] as const).map((c) => (
                  <TouchableOpacity
                    key={String(c)}
                    style={[
                      styles.filterOptionPill,
                      filters.circle === c && styles.filterOptionPillActive,
                    ]}
                    onPress={() => setFilters((p) => ({ ...p, circle: c }))}
                  >
                    <Text style={styles.filterOptionText}>
                      {c === 'all' ? 'Todos' : `${c}º Círculo`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterGroupLabel}>Categoria de Equipamento / Arma</Text>
              <View style={styles.filterWrapGrid}>
                {['all', '0', 'I', 'II', 'III', 'IV'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.filterOptionPill,
                      filters.itemCategory === cat && styles.filterOptionPillActive,
                    ]}
                    onPress={() => setFilters((p) => ({ ...p, itemCategory: cat }))}
                  >
                    <Text style={styles.filterOptionText}>
                      {cat === 'all' ? 'Todas' : `Cat. ${cat}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterGroupLabel}>Faixa de VD (Ameaças & Criaturas)</Text>
              <View style={styles.filterWrapGrid}>
                {[
                  { label: 'Todos os VDs', min: undefined, max: undefined },
                  { label: 'VD 20 a 60 (Iniciante)', min: 20, max: 60 },
                  { label: 'VD 80 a 140 (Veterano)', min: 80, max: 140 },
                  { label: 'VD 160 a 240 (Elite)', min: 160, max: 240 },
                  { label: 'VD 260 a 340 (Mestre)', min: 260, max: 340 },
                  { label: 'VD 360+ (Lendário)', min: 360, max: undefined },
                ].map((tier) => {
                  const active = filters.minVd === tier.min && filters.maxVd === tier.max;
                  return (
                    <TouchableOpacity
                      key={tier.label}
                      style={[styles.filterOptionPill, active && styles.filterOptionPillActive]}
                      onPress={() =>
                        setFilters((p) => ({
                          ...p,
                          minVd: tier.min,
                          maxVd: tier.max,
                        }))
                      }
                    >
                      <Text style={styles.filterOptionText}>{tier.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.filterGroupLabel}>Filtros Rápidos</Text>
              <View style={styles.filterWrapGrid}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionPill,
                    filters.onlyFavorites && styles.filterOptionPillActive,
                  ]}
                  onPress={() =>
                    setFilters((p) => ({ ...p, onlyFavorites: !p.onlyFavorites }))
                  }
                >
                  <Text style={styles.filterOptionText}>Apenas Favoritos</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOptionPill,
                    filters.onlyCustomOrEdited && styles.filterOptionPillActive,
                  ]}
                  onPress={() =>
                    setFilters((p) => ({
                      ...p,
                      onlyCustomOrEdited: !p.onlyCustomOrEdited,
                    }))
                  }
                >
                  <Text style={styles.filterOptionText}>Apenas Criados / Editados</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.filterGroupLabel}>Layout da Listagem</Text>
              <View style={styles.filterWrapGrid}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionPill,
                    listingColumns === 1 && styles.filterOptionPillActive,
                  ]}
                  onPress={() => setListingColumns(1)}
                >
                  <Ionicons
                    name="list"
                    size={14}
                    color={listingColumns === 1 ? colors.primary : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.filterOptionText}>1 Coluna (Padrão)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterOptionPill,
                    listingColumns === 2 && styles.filterOptionPillActive,
                  ]}
                  onPress={() => setListingColumns(2)}
                >
                  <Ionicons
                    name="grid"
                    size={14}
                    color={listingColumns === 2 ? colors.primary : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.filterOptionText}>2 Colunas (Grade)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => {
                  resetFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalResetText}>Redefinir Tudo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.modalApplyText}>
                  Ver {filteredEntities.length} Resultados
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 12,
    },
    loadingText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    topSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipsSection: {
      paddingVertical: 4,
    },
    classChipsSection: {
      paddingBottom: 4,
    },
    subChipsSection: {
      paddingBottom: 6,
    },
    chipInner: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chipsScroll: {
      paddingHorizontal: 14,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    subChip: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      flexWrap: 'wrap',
      gap: 6,
    },
    statusTextWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    statusExcludedText: {
      color: '#F87171',
      fontSize: 11,
      fontWeight: '700',
    },
    statusActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    quickHideBtn: {
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
    quickHideBtnActive: {
      backgroundColor: 'rgba(239, 68, 68, 0.16)',
      borderColor: '#EF4444',
    },
    quickHideBtnText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    quickHideBtnTextActive: {
      color: '#FCA5A5',
      fontWeight: '700',
    },
    quickHideBtnCollapsed: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
    },
    quickHideBtnFilterActive: {
      backgroundColor: 'rgba(234, 179, 8, 0.16)',
      borderColor: '#EAB308',
    },
    filterDotBadgeSmall: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginLeft: 2,
    },
    collapsibleFiltersWrap: {
      overflow: 'hidden',
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
    activeExclusionsBar: {
      paddingHorizontal: 14,
      paddingBottom: 6,
    },
    activeExclusionsScroll: {
      alignItems: 'center',
      gap: 6,
    },
    activeExclusionsLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginRight: 2,
    },
    activeExclusionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    activeExclusionChipText: {
      color: '#FCA5A5',
      fontSize: 11,
      fontWeight: '700',
    },
    filterDotBadge: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    filterSectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 4,
    },
    filterSectionSubAction: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    filterGroupSub: {
      color: colors.textMuted,
      fontSize: 11,
      marginBottom: 8,
    },
    filterOptionPillExcluded: {
      backgroundColor: 'rgba(239, 68, 68, 0.18)',
      borderColor: '#EF4444',
    },
    filterOptionTextExcluded: {
      color: '#FCA5A5',
      fontWeight: '700',
    },
    filterCountBadgeText: {
      color: colors.textMuted,
      fontSize: 10,
      marginLeft: 4,
    },
    filterCountBadgeTextExcluded: {
      color: '#FCA5A5',
    },
    statusText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    statusBold: {
      color: colors.text,
      fontWeight: '800',
    },
    clearFiltersText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: 14,
      paddingBottom: 90,
    },
    columnWrapper: {
      gap: 10,
      justifyContent: 'flex-start',
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '82%',
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    modalScroll: {
      marginBottom: 14,
    },
    filterGroupLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 12,
      marginBottom: 8,
    },
    filterWrapGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    filterOptionPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterOptionPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    filterOptionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    modalFooter: {
      flexDirection: 'row',
      gap: 10,
    },
    modalResetBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    modalResetText: {
      color: colors.textSecondary,
      fontWeight: '700',
    },
    modalApplyBtn: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    modalApplyText: {
      color: '#FFF',
      fontWeight: '800',
    },
  });
