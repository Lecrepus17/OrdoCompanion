import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Platform,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { CriticalModePromptModal } from '../../components/CriticalModePromptModal';
import { ItemEditorModal, ItemEditorSaveResult } from '../../components/ItemEditorModal';
import { WeaponEditorModal } from '../../components/WeaponEditorModal';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import {
  CriticalDamageMode,
  CustomCatalogItem,
  CustomWeapon,
  InventoryItemCategoryGroup,
} from '../../types/compendium';
import { confirmAction, showAlert } from '../../utils/alert';
import {
  buildCatalogItemFromCuratedItem,
  CuratedCompendiumItem,
  formatSpacesLabel,
  getCuratedCompendiumItems,
  OFFICIAL_ACCESSORY_MODS_MAP,
} from '../../utils/inventoryItems';
import {
  isAmmoModification,
  OFFICIAL_WEAPON_MODS,
  OFFICIAL_WEAPON_MODS_MAP,
} from '../../utils/weapons';
import { DEFAULT_LONG_PRESS_DELAY } from '../../types/recordPreview';
import {
  getCharacterProficiencies,
  checkWeaponProficiency,
} from '../../utils/proficiencies';

export default function WeaponsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);
  const {
    entities,
    customWeapons,
    upsertCustomWeapon,
    deleteCustomWeapon,
    equipWeaponToCharacter,
    customItems,
    upsertCustomItem,
    deleteCustomItem,
    equipCatalogItemToCharacter,
    characters,
    rollWeaponDamage,
    userProfile,
    openManual,
    openRecordPreview,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'weapons' | 'items'>('weapons');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [itemFilterGroup, setItemFilterGroup] = useState<'all' | InventoryItemCategoryGroup>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<CustomWeapon | null>(null);
  const [equipModalWeapon, setEquipModalWeapon] = useState<CustomWeapon | null>(null);
  const [equipMode, setEquipMode] = useState<'shared' | 'duplicate'>('shared');
  const [includeAmmoInEquip, setIncludeAmmoInEquip] = useState(true);
  const [critPromptTarget, setCritPromptTarget] = useState<{
    weapon: CustomWeapon;
    isMaxDamage: boolean;
  } | null>(null);

  const [itemEditorVisible, setItemEditorVisible] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CustomCatalogItem | null>(null);
  const [draftCatalogItem, setDraftCatalogItem] = useState<CustomCatalogItem | null>(null);
  const [equipModalItem, setEquipModalItem] = useState<CustomCatalogItem | null>(null);
  const [equipItemMode, setEquipItemMode] = useState<'shared' | 'duplicate'>('shared');
  const [equipItemQuantity, setEquipItemQuantity] = useState(1);
  const [compItemPickerVisible, setCompItemPickerVisible] = useState(false);
  const [compItemSearch, setCompItemSearch] = useState('');
  const [compItemFilter, setCompItemFilter] = useState<'all' | InventoryItemCategoryGroup>('all');

  const curatedCompendiumItems = useMemo(
    () => getCuratedCompendiumItems(entities),
    [entities]
  );

  const filteredCompendiumItems = useMemo(() => {
    const q = compItemSearch.trim().toLowerCase();
    return curatedCompendiumItems.filter((it) => {
      if (compItemFilter !== 'all' && it.subCategoryGroup !== compItemFilter) {
        return false;
      }
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        it.bookTitle.toLowerCase().includes(q)
      );
    });
  }, [curatedCompendiumItems, compItemFilter, compItemSearch]);

  // Intercepta botão de retorno físico (Android) e do navegador (Web) para fechar modais da tela
  useEffect(() => {
    if (equipModalWeapon === null && equipModalItem === null && !compItemPickerVisible) return;

    const handleBack = () => {
      if (compItemPickerVisible) {
        setCompItemPickerVisible(false);
        return true;
      }
      if (equipModalItem !== null) {
        setEquipModalItem(null);
        return true;
      }
      setEquipModalWeapon(null);
      return true;
    };

    let sub: any;
    if (Platform.OS !== 'web' && typeof document === 'undefined') {
      sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    }

    let popActive = true;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.history.pushState({ modal: 'weapons-modal' }, '');
      } catch {}
      const handlePop = () => {
        if (popActive) {
          handleBack();
        }
      };
      window.addEventListener('popstate', handlePop);
      return () => {
        popActive = false;
        sub?.remove();
        window.removeEventListener('popstate', handlePop);
        if (window.history.state?.modal === 'weapons-modal') {
          window.history.back();
        }
      };
    }

    return () => {
      sub?.remove();
    };
  }, [equipModalWeapon, equipModalItem, compItemPickerVisible]);

  const openNewWeaponEditor = () => {
    setEditingWeapon(null);
    setEditorVisible(true);
  };

  const openEditWeapon = (weapon: CustomWeapon) => {
    setEditingWeapon(weapon);
    setEditorVisible(true);
  };

  const handleSaveWeapon = async (weapon: CustomWeapon) => {
    await upsertCustomWeapon(weapon);
    setEditorVisible(false);
    setEditingWeapon(null);
  };

  const handleEquipWeaponToAgent = async (charId: string) => {
    if (!equipModalWeapon) return;
    const targetChar = characters.find((c) => c.id === charId);
    if (!targetChar) return;

    const equipResult = await equipWeaponToCharacter(equipModalWeapon, charId, {
      mode: equipMode,
      includeAmmo: includeAmmoInEquip,
    });
    if (!equipResult) return;
    const equippedWeapon = equipResult.weapon;

    const hasAmmo =
      includeAmmoInEquip &&
      equippedWeapon.weaponType !== 'Corpo a corpo' &&
      equippedWeapon.ammoCategory &&
      equippedWeapon.ammoCategory !== '—';

    setEquipModalWeapon(null);
    showAlert(
      equipMode === 'duplicate' ? 'Arma Duplicada e Equipada!' : 'Arma Equipada e Vinculada!',
      `"${equippedWeapon.name}" (Cat ${equippedWeapon.finalCategory})${
        hasAmmo
          ? ` e seu pacote de munição "${equippedWeapon.ammoName || equippedWeapon.ammoType}" (Cat ${equippedWeapon.ammoCategory}) foram adicionados`
          : ' foi adicionada'
      } aos Ataques e ao Inventário de ${targetChar.name}!`
    );
  };

  const handleWeaponRollDamage = (
    weapon: CustomWeapon,
    isCrit: boolean,
    isMaxDamage = false,
    chosenMode?: Exclude<CriticalDamageMode, 'ask_user'>
  ) => {
    if (isCrit && !chosenMode && userProfile.criticalDamageMode === 'ask_user') {
      setCritPromptTarget({ weapon, isMaxDamage });
      return;
    }

    rollWeaponDamage({
      damage: weapon.finalDamage,
      critical: weapon.finalCritical,
      weaponName: weapon.name,
      isCrit,
      isMaxDamage,
      mode: chosenMode || userProfile.criticalDamageMode,
    });
  };

  const openNewItemEditor = () => {
    setEditingCatalogItem(null);
    setDraftCatalogItem(null);
    setItemEditorVisible(true);
  };

  const openNewCatalogItemByType = (
    itemType: 'protecao' | 'vestimenta' | 'utensilio' | 'geral',
    subCategoryGroup: InventoryItemCategoryGroup,
    defaultName: string
  ) => {
    const baseCategory = itemType === 'protecao' ? 'I' : '0';
    const baseSpaces = itemType === 'protecao' ? 2 : 1;
    setEditingCatalogItem(null);
    setDraftCatalogItem({
      id: '',
      name: defaultName,
      baseItemName: defaultName,
      itemType,
      subCategoryGroup,
      baseCategory,
      baseSpaces,
      finalCategory: baseCategory,
      finalSpaces: baseSpaces,
      details: '',
      element: 'Nenhum',
      modifications: [],
      createdAt: '',
      updatedAt: '',
    });
    setItemEditorVisible(true);
  };

  const openCompendiumItemPicker = () => {
    setCompItemSearch('');
    setCompItemFilter('all');
    setCompItemPickerVisible(true);
  };

  const handleImportCompendiumItemToDepot = async (curated: CuratedCompendiumItem, openEditor = false) => {
    const catalogItem = buildCatalogItemFromCuratedItem(curated);
    if (openEditor) {
      setCompItemPickerVisible(false);
      setEditingCatalogItem(null);
      setDraftCatalogItem(catalogItem);
      setItemEditorVisible(true);
      return;
    }
    await upsertCustomItem(catalogItem);
    setCompItemPickerVisible(false);
    showAlert(
      'Importado para o Depósito!',
      `"${catalogItem.name}" (Cat ${catalogItem.finalCategory} • ${formatSpacesLabel(catalogItem.finalSpaces)} esp.) já está disponível no Depósito para equipar em qualquer agente.`
    );
  };

  const openEditCatalogItem = (item: CustomCatalogItem) => {
    setDraftCatalogItem(null);
    setEditingCatalogItem(item);
    setItemEditorVisible(true);
  };

  const handleSaveCatalogItem = async (result: ItemEditorSaveResult) => {
    await upsertCustomItem(result.catalogItem);
    setItemEditorVisible(false);
    setEditingCatalogItem(null);
    setDraftCatalogItem(null);
  };

  const handleEquipCatalogItemToAgent = async (charId: string) => {
    if (!equipModalItem) return;
    const targetChar = characters.find((c) => c.id === charId);
    if (!targetChar) return;
    const res = await equipCatalogItemToCharacter(equipModalItem, charId, {
      mode: equipItemMode,
      quantity: equipItemQuantity,
    });
    if (!res) return;
    setEquipModalItem(null);
    showAlert(
      equipItemMode === 'duplicate' ? 'Item Duplicado e Equipado!' : 'Item Equipado e Vinculado!',
      `"${res.catalogItem.name}" (Cat ${res.catalogItem.finalCategory}) foi adicionado ao inventário de ${targetChar.name}!`
    );
  };

  const filteredItems = useMemo(() => {
    return customItems.filter((it) => {
      if (itemFilterGroup !== 'all' && it.subCategoryGroup !== itemFilterGroup) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          it.baseItemName.toLowerCase().includes(q) ||
          it.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customItems, itemFilterGroup, searchQuery]);

  const filteredWeapons = useMemo(() => {
    return customWeapons.filter((w) => {
      if (filterType !== 'all' && w.weaponType !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.baseWeaponName.toLowerCase().includes(q) ||
          w.specialRules.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customWeapons, filterType, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Top action bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 160, marginRight: 8 }}>
          <Text style={styles.heading}>Armaria & Modificações</Text>
          <Text style={styles.subHeading}>
            Crie, customize e modifique armas, proteções, vestimentas e itens com maldições.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[
              styles.createBtn,
              {
                backgroundColor: colors.primarySoft,
                borderWidth: 1,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => openManual('weapons')}
          >
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.createBtnText, { color: colors.primary }]}>Manual</Text>
          </TouchableOpacity>
          {activeSection === 'items' ? (
            <TouchableOpacity
              style={[
                styles.createBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={openCompendiumItemPicker}
              testID="btn-depot-from-compendium"
            >
              <Ionicons name="book-outline" size={18} color={colors.text} />
              <Text style={[styles.createBtnText, { color: colors.text }]}>Compêndio</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={activeSection === 'weapons' ? openNewWeaponEditor : openNewItemEditor}
            testID={activeSection === 'weapons' ? 'btn-new-weapon' : 'btn-new-depot-item'}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.createBtnText}>
              {activeSection === 'weapons' ? 'Nova Arma' : 'Novo Item'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Switcher: Armas | Itens & Acessórios */}
      <View style={styles.sectionSwitcherRow}>
        <TouchableOpacity
          style={[
            styles.sectionSwitcherTab,
            activeSection === 'weapons' && styles.sectionSwitcherTabActive,
          ]}
          onPress={() => setActiveSection('weapons')}
          testID="armory-tab-weapons"
        >
          <Ionicons
            name="construct-outline"
            size={15}
            color={activeSection === 'weapons' ? '#FFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.sectionSwitcherText,
              activeSection === 'weapons' && styles.sectionSwitcherTextActive,
            ]}
            numberOfLines={1}
          >
            Armas ({customWeapons.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sectionSwitcherTab,
            activeSection === 'items' && styles.sectionSwitcherTabActive,
          ]}
          onPress={() => setActiveSection('items')}
          testID="armory-tab-items"
        >
          <Ionicons
            name="medkit-outline"
            size={15}
            color={activeSection === 'items' ? '#FFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.sectionSwitcherText,
              activeSection === 'items' && styles.sectionSwitcherTextActive,
            ]}
            numberOfLines={1}
          >
            Proteções & Itens ({customItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter / Search Row */}
      <View style={styles.filterWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeSection === 'weapons'
                ? 'Buscar por arma, efeito ou modificação...'
                : 'Buscar no depósito de itens, acessórios ou curativos...'
            }
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {activeSection === 'weapons' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterRow}>
            {['all', 'Fogo', 'Corpo a corpo', 'Disparo'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, filterType === t && styles.typePillActive]}
                onPress={() => setFilterType(t)}
              >
                <Text style={[styles.typePillText, filterType === t && styles.typePillTextActive]}>
                  {t === 'all' ? 'Todas as Armas' : t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={{ gap: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterRow}>
              <TouchableOpacity
                style={[styles.typePill, { borderColor: colors.elements.Medo.border, backgroundColor: colors.elements.Medo.bg }]}
                onPress={() => openNewCatalogItemByType('protecao', 'protecao', 'Nova Proteção')}
                testID="btn-quick-new-protecao"
              >
                <Text style={[styles.typePillText, { color: colors.elements.Medo.text }]}>+ Proteção</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typePill, { borderColor: colors.elements.Energia.border, backgroundColor: colors.elements.Energia.bg }]}
                onPress={() => openNewCatalogItemByType('vestimenta', 'acessorio', 'Nova Vestimenta')}
                testID="btn-quick-new-vestimenta"
              >
                <Text style={[styles.typePillText, { color: colors.elements.Energia.text }]}>+ Vestimenta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typePill, { borderColor: colors.elements.Variável.border, backgroundColor: colors.elements.Variável.bg }]}
                onPress={() => openNewCatalogItemByType('utensilio', 'acessorio', 'Novo Utensílio')}
                testID="btn-quick-new-utensilio"
              >
                <Text style={[styles.typePillText, { color: colors.elements.Variável.text }]}>+ Utensílio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typePill, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}
                onPress={() => openNewCatalogItemByType('geral', 'operacional', 'Novo Item')}
                testID="btn-quick-new-geral"
              >
                <Text style={[styles.typePillText, { color: colors.primary }]}>+ Item Geral</Text>
              </TouchableOpacity>
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeFilterRow}>
            {(
              [
                { value: 'all', label: 'Todos os Itens' },
                { value: 'cura', label: 'Cura' },
                { value: 'acessorio', label: 'Acessório' },
                { value: 'explosivo', label: 'Explosivo' },
                { value: 'operacional', label: 'Operacional' },
                { value: 'paranormal', label: 'Paranormal' },
                { value: 'amaldicoado', label: 'Amaldiçoado' },
                { value: 'protecao', label: 'Proteção' },
              ] as const
            ).map((grp) => (
              <TouchableOpacity
                key={grp.value}
                style={[styles.typePill, itemFilterGroup === grp.value && styles.typePillActive]}
                onPress={() => setItemFilterGroup(grp.value)}
              >
                <Text
                  style={[
                    styles.typePillText,
                    itemFilterGroup === grp.value && styles.typePillTextActive,
                  ]}
                >
                  {grp.label}
                </Text>
              </TouchableOpacity>
            ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Weapons or Items List */}
      {activeSection === 'items' ? (
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]} keyboardShouldPersistTaps="handled">
          {filteredItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum item no Depósito</Text>
              <Text style={styles.emptySub}>
                Crie itens, acessórios aprimorados, explosivos ou curativos reutilizáveis e equipe-os facilmente em qualquer agente.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.primary }]}
                  onPress={openCompendiumItemPicker}
                  testID="btn-depot-first-from-compendium"
                >
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                  <Text style={[styles.createBtnText, { color: colors.primary }]}>Importar do Compêndio</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={openNewItemEditor}
                  testID="btn-create-first-depot-item"
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.createBtnText}>Criar Personalizado</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            filteredItems.map((item) => {
              const elemDef =
                item.element && item.element !== 'Nenhum'
                  ? colors.elements[item.element as keyof typeof colors.elements]
                  : null;
              const elemColor = elemDef?.border || colors.textSecondary;

              return (
                <View key={item.id} style={styles.weaponCard} testID={`depot-item-card-${item.id}`}>
                  <View style={styles.weaponHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.weaponName}>{item.name}</Text>
                        {item.element && item.element !== 'Nenhum' ? (
                          <View style={[styles.elementBadge, { borderColor: elemColor }]}>
                            <Text style={[styles.elementBadgeText, { color: elemColor }]}>
                              {item.element}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.baseLabel}>
                        {item.itemType.toUpperCase()} • {item.subCategoryGroup.toUpperCase()}
                        {item.targetSkill ? ` • +${item.skillBonus || 2} ${item.targetSkill}` : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>Cat {item.finalCategory}</Text>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {formatSpacesLabel(item.finalSpaces)} esp.
                        </Text>
                      </View>
                    </View>
                  </View>

                  {item.details ? (
                    <Text style={styles.specialRulesText} numberOfLines={3}>
                      {item.details}
                    </Text>
                  ) : null}

                  {(item.modifications?.length || item.customModifications?.length || item.mechanics?.length) ? (
                    <View style={styles.modBadgesWrap}>
                      {item.modifications.map((mid) => {
                        const modDef = OFFICIAL_ACCESSORY_MODS_MAP.get(mid);
                        return (
                          <View key={mid} style={styles.modBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            <Text style={styles.modBadgeText}>{modDef?.name || mid}</Text>
                          </View>
                        );
                      })}
                      {item.customModifications?.map((cmod) => (
                        <View key={cmod.id} style={[styles.modBadge, { borderColor: '#818CF8' }]}>
                          <Ionicons name="sparkles" size={12} color="#818CF8" />
                          <Text style={styles.modBadgeText}>{cmod.name}</Text>
                        </View>
                      ))}
                      {item.mechanics?.map((mech) => (
                        <View
                          key={mech.id}
                          style={[
                            styles.modBadge,
                            { borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.08)' },
                          ]}
                        >
                          <Ionicons name="flash" size={11} color="#F59E0B" />
                          <Text style={[styles.modBadgeText, { color: '#FDE68A' }]}>
                            {mech.label}
                            {mech.formula ? ` (${mech.formula})` : mech.flatValue ? ` (+${mech.flatValue})` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.cardActionsRow}>
                    <View style={styles.cardActionsMain}>
                      <TouchableOpacity
                        style={styles.equipBtn}
                        onPress={() => {
                          setEquipItemMode('shared');
                          setEquipItemQuantity(1);
                          setEquipModalItem(item);
                        }}
                        testID={`btn-depot-item-equip-${item.id}`}
                      >
                        <Ionicons name="person-add-outline" size={14} color="#38BDF8" />
                        <Text style={styles.equipBtnText}>Equipar em Agente</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardActionsRight}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => openEditCatalogItem(item)}
                        testID={`btn-depot-item-edit-${item.id}`}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.deleteIconBtn]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => {
                          const linkedChars = characters.filter((c) =>
                            (c.inventory || []).some((it) => it.customItemId === item.id)
                          );
                          const warn =
                            linkedChars.length > 0
                              ? `\n\nAtenção: este item está equipado em ${linkedChars.length} agente(s) (${linkedChars
                                  .map((c) => c.name)
                                  .join(', ')}). Excluir também removerá o item dessas fichas.`
                              : '';
                          confirmAction({
                            title: 'Excluir Item do Depósito?',
                            message: `Tem certeza que deseja excluir "${item.name}"?${warn}`,
                            confirmText: 'Excluir',
                            destructive: true,
                            onConfirm: () => deleteCustomItem(item.id),
                          });
                        }}
                        testID={`btn-depot-item-delete-${item.id}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}>
        {filteredWeapons.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma arma customizada</Text>
            <Text style={styles.emptySub}>
              Crie uma arma ou escolha um modelo base (ex.: Fuzil de Precisão, Pistola, Katana) e adicione modificações como Mira Laser, Calibre Grosso ou Maldições Elementais.
            </Text>
            <TouchableOpacity style={[styles.createBtn, { marginTop: 12 }]} onPress={openNewWeaponEditor}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.createBtnText}>Criar Primeira Arma</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredWeapons.map((weapon) => {
            const elemDef =
              weapon.element && weapon.element !== 'Nenhum'
                ? colors.elements[weapon.element as keyof typeof colors.elements]
                : null;
            const elemColor = elemDef?.border || colors.textSecondary;

            const openWeaponPreview = () =>
              openRecordPreview({
                target: { kind: 'custom_weapon', weapon },
                primaryAction: {
                  label: 'Editar na Oficina',
                  icon: 'create-outline',
                  onPress: () => openEditWeapon(weapon),
                },
              });

            return (
              <TouchableOpacity
                key={weapon.id}
                style={styles.weaponCard}
                activeOpacity={0.92}
                onLongPress={openWeaponPreview}
                delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                testID={`weapon-card-${weapon.id}`}
              >
                <View style={styles.weaponHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.weaponName}>{weapon.name}</Text>
                      {weapon.element && weapon.element !== 'Nenhum' ? (
                        <View style={[styles.elementBadge, { borderColor: elemColor }]}>
                          <Text style={[styles.elementBadgeText, { color: elemColor }]}>
                            {weapon.element}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.baseLabel}>
                      Base: {weapon.baseWeaponName} • {weapon.weaponType} ({weapon.proficiency})
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <View
                      style={[
                        styles.categoryBadge,
                        weapon.proficiency === 'Pesada'
                          ? { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' }
                          : weapon.proficiency === 'Tática'
                          ? { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.12)' }
                          : { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.12)' },
                      ]}
                      testID={`weapon-prof-badge-${weapon.id}`}
                    >
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          weapon.proficiency === 'Pesada'
                            ? { color: '#EF4444' }
                            : weapon.proficiency === 'Tática'
                            ? { color: '#F59E0B' }
                            : { color: '#38BDF8' },
                        ]}
                      >
                        {weapon.proficiency}
                      </Text>
                    </View>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>Arma: Cat {weapon.finalCategory}</Text>
                    </View>
                    {weapon.weaponType !== 'Corpo a corpo' && weapon.ammoCategory && weapon.ammoCategory !== '—' ? (
                      <View style={[styles.categoryBadge, styles.ammoCategoryBadge]}>
                        <Ionicons name="disc" size={11} color="#F59E0B" style={{ marginRight: 3 }} />
                        <Text style={styles.ammoCategoryBadgeText}>Balas: Cat {weapon.ammoCategory}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Stat Badges */}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel} numberOfLines={1}>DANO</Text>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{weapon.finalDamage}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel} numberOfLines={1}>CRÍTICO</Text>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{weapon.finalCritical}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel} numberOfLines={1}>ALCANCE</Text>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{weapon.finalRange}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel} numberOfLines={1}>ESPAÇOS</Text>
                    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{weapon.finalSpaces}</Text>
                  </View>
                </View>

                {/* Applied Modifications summary */}
                <View style={styles.modsContainer}>
                  <View style={styles.modsHeaderRow}>
                    <Text style={styles.modsTitle}>
                      Modificações ({weapon.modifications.length + (weapon.customModifications?.length || 0)}):
                    </Text>
                    {weapon.weaponType !== 'Corpo a corpo' && weapon.ammoName ? (
                      <View style={styles.ammoBadgeInline}>
                        <Ionicons name="disc-outline" size={11} color="#F59E0B" />
                        <Text style={styles.ammoBadgeInlineText}>
                          {weapon.ammoName} (Cat {weapon.ammoCategory || '0'})
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.modBadgesWrap}>
                    {weapon.modifications.map((mid) => {
                      const def = OFFICIAL_WEAPON_MODS_MAP.get(mid) || OFFICIAL_WEAPON_MODS.find((m) => m.id === mid);
                      const isAmmo = isAmmoModification(def || mid);
                      const isCurse = def?.element && def.element !== 'Nenhum';
                      return (
                        <TouchableOpacity
                          key={mid}
                          style={[
                            styles.modBadge,
                            isAmmo && styles.ammoModBadge,
                            isCurse && styles.curseModBadge,
                          ]}
                          onPress={() => {
                            if (def) {
                              openRecordPreview({ target: { kind: 'weapon_mod', mod: def } });
                            }
                          }}
                          onLongPress={() => {
                            if (def) {
                              openRecordPreview({ target: { kind: 'weapon_mod', mod: def } });
                            }
                          }}
                          delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                        >
                          <Ionicons
                            name={isAmmo ? 'flame' : isCurse ? 'sparkles' : 'checkmark-circle'}
                            size={12}
                            color={isAmmo ? '#F59E0B' : isCurse ? '#A855F7' : '#10B981'}
                          />
                          <Text
                            style={[
                              styles.modBadgeText,
                              isAmmo && { color: '#FCD34D' },
                              isCurse && { color: '#D8B4FE' },
                            ]}
                          >
                            {def?.name || mid} {isAmmo ? '(Bala)' : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {weapon.customModifications?.map((cmod) => {
                      const isAmmo = cmod.targetType === 'ammo';
                      return (
                        <View
                          key={cmod.id}
                          style={[styles.modBadge, isAmmo ? styles.ammoModBadge : { borderColor: '#818CF8' }]}
                        >
                          <Ionicons
                            name={isAmmo ? 'flame' : 'sparkles'}
                            size={12}
                            color={isAmmo ? '#F59E0B' : '#818CF8'}
                          />
                          <Text
                            style={[
                              styles.modBadgeText,
                              isAmmo && { color: '#FCD34D' },
                            ]}
                          >
                            {cmod.name} {isAmmo ? '(Bala)' : '(Arma)'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {weapon.specialRules ? (
                  <Text style={styles.specialRulesText} numberOfLines={2}>
                    {weapon.specialRules}
                  </Text>
                ) : null}

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  <View style={styles.cardActionsMain}>
                    <TouchableOpacity
                      style={styles.rollActionBtn}
                      onPress={() => handleWeaponRollDamage(weapon, false)}
                      testID={`btn-weapon-roll-damage-${weapon.id}`}
                    >
                      <Ionicons name="dice" size={14} color="#FFF" />
                      <Text style={styles.rollActionBtnText}>Dano</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rollActionBtn, { backgroundColor: '#B91C1C' }]}
                      onPress={() => handleWeaponRollDamage(weapon, true, false)}
                      testID={`btn-weapon-roll-crit-${weapon.id}`}
                    >
                      <Ionicons name="flame" size={14} color="#FFF" />
                      <Text style={styles.rollActionBtnText}>Crítico</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.rollActionBtn, { backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#EF4444' }]}
                      onPress={() => handleWeaponRollDamage(weapon, true, true)}
                      testID={`btn-weapon-roll-crit-max-${weapon.id}`}
                    >
                      <Ionicons name="flash" size={14} color="#FDE047" />
                      <Text style={[styles.rollActionBtnText, { color: '#FEF08A' }]}>Crítico Máx</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.equipBtn}
                      onPress={() => {
                        setEquipMode('shared');
                        setEquipModalWeapon(weapon);
                      }}
                      testID={`btn-weapon-equip-${weapon.id}`}
                    >
                      <Ionicons name="person-add-outline" size={14} color="#38BDF8" />
                      <Text style={styles.equipBtnText}>Equipar em Agente</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardActionsRight}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={openWeaponPreview}
                      accessibilityLabel="Inspecionar arma"
                      testID={`weapon-info-${weapon.id}`}
                    >
                      <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => openEditWeapon(weapon)}
                      accessibilityLabel="Editar arma"
                      testID={`btn-weapon-edit-${weapon.id}`}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iconBtn, styles.deleteIconBtn]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        const linkedChars = characters.filter((c) =>
                          (c.attacks || []).some((a) => a.customWeaponId === weapon.id)
                        );
                        const linkedWarning =
                          linkedChars.length > 0
                            ? `\n\nAtenção: esta arma está vinculada a ${linkedChars.length} agente(s) (${linkedChars
                                .map((c) => c.name)
                                .join(', ')}). Excluir também removerá o ataque e os itens vinculados dessas fichas.`
                            : '';
                        confirmAction({
                          title: 'Excluir Arma?',
                          message: `Tem certeza que deseja excluir "${weapon.name}"?${linkedWarning}`,
                          confirmText: 'Excluir',
                          destructive: true,
                          onConfirm: () => deleteCustomWeapon(weapon.id),
                        });
                      }}
                      accessibilityLabel="Excluir arma"
                      testID={`btn-weapon-delete-${weapon.id}`}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      {/* Weapons List End */}
      </ScrollView>
      )}

      {/* MODAL UNIFICADO: Editor de Criação / Modificação de Item */}
      <ItemEditorModal
        visible={itemEditorVisible}
        onClose={() => {
          setItemEditorVisible(false);
          setEditingCatalogItem(null);
          setDraftCatalogItem(null);
        }}
        mode="depot"
        initialCatalogItem={editingCatalogItem}
        draftCatalogItem={draftCatalogItem}
        onSave={handleSaveCatalogItem}
        linkedAgentNames={
          editingCatalogItem
            ? characters
                .filter((c) =>
                  (c.inventory || []).some(
                    (it) => it.customItemId === editingCatalogItem.id && it.linkMode !== 'copied'
                  )
                )
                .map((c) => c.name)
            : undefined
        }
      />

      {/* MODAL: Equipar Item do Depósito em Agente */}
      <Modal
        visible={equipModalItem !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setEquipModalItem(null)}
      >
        <View style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
          <View style={styles.equipDialogCard}>
            <View style={styles.equipDialogHeader}>
              <Text style={styles.equipDialogTitle}>Equipar Item no Agente</Text>
              <TouchableOpacity
                onPress={() => setEquipModalItem(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.equipDialogSub}>
              Escolha se o agente usará o mesmo item vinculado ou uma cópia independente no Depósito.
            </Text>

            <View style={styles.equipModeRow}>
              <TouchableOpacity
                style={[styles.equipModePill, equipItemMode === 'shared' && styles.equipModePillActive]}
                onPress={() => setEquipItemMode('shared')}
                testID="btn-equip-item-mode-shared"
              >
                <Ionicons
                  name="link"
                  size={14}
                  color={equipItemMode === 'shared' ? '#38BDF8' : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.equipModeTitle, equipItemMode === 'shared' && { color: '#38BDF8' }]}>
                    Usar o Mesmo
                  </Text>
                  <Text style={styles.equipModeDesc}>Edições replicam entre Depósito e agente</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.equipModePill, equipItemMode === 'duplicate' && styles.equipModePillActive]}
                onPress={() => setEquipItemMode('duplicate')}
                testID="btn-equip-item-mode-duplicate"
              >
                <Ionicons
                  name="copy-outline"
                  size={14}
                  color={equipItemMode === 'duplicate' ? '#10B981' : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.equipModeTitle, equipItemMode === 'duplicate' && { color: '#10B981' }]}>
                    Duplicar
                  </Text>
                  <Text style={styles.equipModeDesc}>Cria cópia com o nome do agente</Text>
                </View>
              </TouchableOpacity>
            </View>

            {equipModalItem ? (
              <View style={styles.equipWeaponOverview}>
                <View style={styles.equipOverviewRow}>
                  <Text style={styles.equipOverviewTitle}>{equipModalItem.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      Cat {equipModalItem.finalCategory} • {formatSpacesLabel(equipModalItem.finalSpaces)} esp.
                    </Text>
                  </View>
                </View>
                <View style={styles.equipQtyRow}>
                  <Text style={styles.equipAmmoText}>Quantidade inicial:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                      style={styles.qtyMiniBtn}
                      onPress={() => setEquipItemQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Ionicons name="remove" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.equipOverviewTitle}>{equipItemQuantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyMiniBtn}
                      onPress={() => setEquipItemQuantity((q) => q + 1)}
                    >
                      <Ionicons name="add" size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {characters.length === 0 ? (
              <Text style={styles.noAgentsText}>
                Nenhum agente cadastrado ainda. Crie um agente na aba "Agentes".
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 250, marginTop: 10 }}>
                {characters.map((char) => (
                  <TouchableOpacity
                    key={char.id}
                    style={styles.charSelectRow}
                    onPress={() => handleEquipCatalogItemToAgent(char.id)}
                    testID={`btn-equip-item-agent-${char.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.charSelectName}>{char.name}</Text>
                      <Text style={styles.charSelectMeta}>
                        NEX {char.nex}% • {char.rank}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL UNIFICADO: Editor de Criação / Modificação de Arma */}
      <WeaponEditorModal
        visible={editorVisible}
        onClose={() => {
          setEditorVisible(false);
          setEditingWeapon(null);
        }}
        initialWeapon={editingWeapon}
        onSave={handleSaveWeapon}
        linkedAgentNames={
          editingWeapon
            ? characters
                .filter((c) => (c.attacks || []).some((a) => a.customWeaponId === editingWeapon.id))
                .map((c) => c.name)
            : undefined
        }
      />

      {/* MODAL: Escolha do modo de Crítico (quando configurado para "Perguntar Sempre") */}
      <CriticalModePromptModal
        visible={critPromptTarget !== null}
        weaponName={critPromptTarget?.weapon.name}
        isMaxDamage={critPromptTarget?.isMaxDamage}
        onClose={() => setCritPromptTarget(null)}
        onSelect={(mode) => {
          if (!critPromptTarget) return;
          const target = critPromptTarget;
          setCritPromptTarget(null);
          handleWeaponRollDamage(target.weapon, true, target.isMaxDamage, mode);
        }}
      />

      {/* MODAL: Equipar em Agente */}
      <Modal
        visible={equipModalWeapon !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setEquipModalWeapon(null)}
      >
        <View style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom + 16, 20) }]}>
          <View style={styles.equipDialogCard}>
            <View style={styles.equipDialogHeader}>
              <Text style={styles.equipDialogTitle}>Equipar no Agente</Text>
              <TouchableOpacity onPress={() => setEquipModalWeapon(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.equipDialogSub}>
              Escolha se o agente usará a mesma arma vinculada ou uma cópia independente na Armaria.
            </Text>

            <View style={styles.equipModeRow}>
              <TouchableOpacity
                style={[styles.equipModePill, equipMode === 'shared' && styles.equipModePillActive]}
                onPress={() => setEquipMode('shared')}
                testID="btn-equip-mode-shared"
              >
                <Ionicons
                  name="link"
                  size={14}
                  color={equipMode === 'shared' ? '#38BDF8' : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.equipModeTitle, equipMode === 'shared' && { color: '#38BDF8' }]}>
                    Usar a Mesma
                  </Text>
                  <Text style={styles.equipModeDesc}>Edições replicam entre Armaria e agente</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.equipModePill, equipMode === 'duplicate' && styles.equipModePillActive]}
                onPress={() => setEquipMode('duplicate')}
                testID="btn-equip-mode-duplicate"
              >
                <Ionicons
                  name="copy-outline"
                  size={14}
                  color={equipMode === 'duplicate' ? '#10B981' : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.equipModeTitle, equipMode === 'duplicate' && { color: '#10B981' }]}>
                    Duplicar
                  </Text>
                  <Text style={styles.equipModeDesc}>Cria cópia com o nome do agente</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Weapon & Ammo Preview Card */}
            {equipModalWeapon ? (
              <View style={styles.equipWeaponOverview}>
                <View style={styles.equipOverviewRow}>
                  <Text style={styles.equipOverviewTitle}>{equipModalWeapon.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>Arma: Cat {equipModalWeapon.finalCategory}</Text>
                  </View>
                </View>

                {equipModalWeapon.weaponType !== 'Corpo a corpo' &&
                equipModalWeapon.ammoCategory &&
                equipModalWeapon.ammoCategory !== '—' ? (
                  <>
                    <View style={styles.equipAmmoRow}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="disc" size={14} color="#F59E0B" />
                        <Text style={styles.equipAmmoText}>
                          {equipModalWeapon.ammoName || equipModalWeapon.ammoType || 'Munição'}
                        </Text>
                      </View>
                      <View style={[styles.categoryBadge, styles.ammoCategoryBadge]}>
                        <Text style={styles.ammoCategoryBadgeText}>Balas: Cat {equipModalWeapon.ammoCategory}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.equipAmmoCheckboxRow}
                      onPress={() => setIncludeAmmoInEquip(!includeAmmoInEquip)}
                    >
                      <Ionicons
                        name={includeAmmoInEquip ? 'checkbox' : 'square-outline'}
                        size={19}
                        color={includeAmmoInEquip ? colors.primary : colors.textMuted}
                      />
                      <Text style={styles.equipAmmoCheckboxText}>
                        Adicionar pacote de munição (Cat {equipModalWeapon.ammoCategory}) ao Inventário do Agente
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}

            {characters.length === 0 ? (
              <Text style={styles.noAgentsText}>
                Nenhum agente cadastrado ainda. Crie um agente na aba "Agentes".
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 250, marginTop: 10 }}>
                {characters.map((char) => {
                  const charProfs = getCharacterProficiencies(char);
                  const profCheck = equipModalWeapon
                    ? checkWeaponProficiency(
                        {
                          name: equipModalWeapon.name,
                          proficiency: equipModalWeapon.proficiency,
                          weaponType: equipModalWeapon.weaponType,
                          ammoType: equipModalWeapon.ammoType,
                        },
                        charProfs
                      )
                    : { isProficient: true };

                  return (
                    <TouchableOpacity
                      key={char.id}
                      style={styles.charSelectRow}
                      onPress={() => handleEquipWeaponToAgent(char.id)}
                      testID={`btn-equip-agent-${char.id}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.charSelectName}>{char.name}</Text>
                        <Text style={styles.charSelectMeta}>
                          NEX {char.nex}% • {char.rank}
                        </Text>
                        {!profCheck.isProficient && (
                          <View
                            style={styles.charSelectNonProficientRow}
                            testID={`equip-non-proficient-warning-${char.id}`}
                          >
                            <Ionicons name="warning" size={12} color="#EF4444" />
                            <Text style={styles.charSelectNonProficientText}>
                              ⚠️ Não Proficiente ({equipModalWeapon?.proficiency}): -2d20 no ataque
                            </Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="add-circle" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: Importar Item / Amaldiçoado do Compêndio para o Depósito */}
      <Modal
        visible={compItemPickerVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setCompItemPickerVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom + 16, 20),
            },
          ]}
        >
          <View style={[styles.equipDialogCard, { maxHeight: '88%', padding: 16 }]}>
            <View style={styles.equipDialogHeader}>
              <Text style={styles.equipDialogTitle}>Importar do Compêndio ({filteredCompendiumItems.length})</Text>
              <TouchableOpacity onPress={() => setCompItemPickerVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.equipDialogSub}>
              Escolha qualquer item comum, paranormal ou amaldiçoado oficial para salvar no Depósito pronto para uso.
            </Text>

            <View style={[styles.searchBox, { marginTop: 6 }]}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar item (ex: Vislumbre, Cicatrizante, Crânio...)"
                placeholderTextColor={colors.textMuted}
                value={compItemSearch}
                onChangeText={setCompItemSearch}
                testID="input-depot-compendium-search"
              />
              {compItemSearch ? (
                <TouchableOpacity onPress={() => setCompItemSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, maxHeight: 42, marginTop: 4 }}
              contentContainerStyle={styles.typeFilterRow}
            >
              {(
                [
                  { value: 'all', label: `Todos (${curatedCompendiumItems.length})` },
                  { value: 'amaldicoado', label: 'Amaldiçoado' },
                  { value: 'paranormal', label: 'Paranormal' },
                  { value: 'cura', label: 'Cura' },
                  { value: 'acessorio', label: 'Acessório' },
                  { value: 'explosivo', label: 'Explosivo' },
                  { value: 'operacional', label: 'Operacional' },
                  { value: 'protecao', label: 'Proteção' },
                ] as const
              ).map((grp) => (
                <TouchableOpacity
                  key={grp.value}
                  style={[styles.typePill, compItemFilter === grp.value && styles.typePillActive]}
                  onPress={() => setCompItemFilter(grp.value)}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      compItemFilter === grp.value && styles.typePillTextActive,
                    ]}
                  >
                    {grp.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {filteredCompendiumItems.map((it) => {
                const alreadyInDepot = customItems.some(
                  (ci) =>
                    (ci.baseItemId && ci.baseItemId === it.id) ||
                    ci.name.trim().toLowerCase() === it.name.trim().toLowerCase()
                );
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={styles.compendiumWeaponItem}
                    onPress={() => handleImportCompendiumItemToDepot(it, false)}
                    testID={`btn-depot-comp-pick-${it.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.compendiumWeaponName}>{it.name}</Text>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            Cat {it.category} • {formatSpacesLabel(it.spaces)} esp.
                          </Text>
                        </View>
                        {alreadyInDepot ? (
                          <View style={[styles.categoryBadge, { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                            <Text style={[styles.categoryBadgeText, { color: '#10B981' }]}>No Depósito</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.compendiumWeaponSub}>
                        {it.bookTitle}
                        {it.pageNumber ? ` p. ${it.pageNumber}` : ''} • {it.subCategoryGroup.toUpperCase()}
                        {it.element && it.element !== 'Nenhum' ? ` • ${it.element}` : ''}
                      </Text>
                      {it.mechanics.length > 0 ? (
                        <Text style={[styles.compendiumWeaponSub, { color: '#34D399', marginTop: 2 }]}>
                          ⚡ {it.mechanics.map((m) => `${m.label}${m.formula ? ` (${m.formula})` : ''}`).join(' • ')}
                        </Text>
                      ) : null}
                      {it.description ? (
                        <Text style={styles.compendiumWeaponStats} numberOfLines={2}>
                          {it.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleImportCompendiumItemToDepot(it, true);
                        }}
                        testID={`btn-depot-comp-edit-${it.id}`}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Ionicons name="add-circle" size={24} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subHeading: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  filterWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    padding: 0,
  },
  typeFilterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  typePillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  typePillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 14,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  weaponCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  weaponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  weaponName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  baseLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  elementBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  elementBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  statPillHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  statValueHighlight: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  modsContainer: {
    gap: 6,
  },
  modsTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  modBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  specialRulesText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardActionsMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  rollActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  rollActionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  equipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  equipBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteIconBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  saveHeaderBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  editorScroll: {
    padding: 14,
    paddingBottom: 80,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  basePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  basePickerBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  basePickerSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  smallPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  smallPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  smallPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  smallPillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  previewCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
  finalCatPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  finalCatText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  attackBonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attackBonusText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  previewSpecialText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  modsGrid: {
    gap: 8,
  },
  modSelectCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  modSelectCardActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  modSelectCardIncompatible: {
    opacity: 0.6,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  incompatibleWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
  },
  incompatibleWarningText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
    flex: 1,
  },
  compatibleTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 10,
  },
  compatibleTogglePillActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  compatibleToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  compatibleToggleTextActive: {
    color: '#10B981',
    fontWeight: '800',
  },
  modSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modSelectName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  modSourceTag: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  modSelectDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  addCustomModBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  addCustomModBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  customModItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: 8,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  customModItemName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  customModItemEffect: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  bigSaveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
  compendiumWeaponItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  compendiumWeaponName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  compendiumWeaponSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  compendiumWeaponStats: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  equipDialogCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
  },
  equipDialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipDialogTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  equipDialogSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  noAgentsText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 16,
  },
  charSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    gap: 8,
  },
  charSelectName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  charSelectMeta: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  ammoCategoryBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
  },
  ammoCategoryBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '900',
  },
  ammoModBadge: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  curseModBadge: {
    borderColor: '#A855F7',
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
  },
  modsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  ammoBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ammoBadgeInlineText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ammoNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  ammoNoticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  ammoTypeScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  ammoTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ammoTypePillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  ammoTypePillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  ammoTypePillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  finalAmmoCatPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ammoSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  ammoSummaryText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  modFilterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  modFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modFilterPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  modFilterPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  modFilterPillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  targetBadgeWeapon: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  targetBadgeWeaponText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  targetBadgeAmmo: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  targetBadgeAmmoText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  targetBadgeCurse: {
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  targetBadgeCurseText: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '800',
  },
  equipWeaponOverview: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  equipOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equipOverviewTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  equipAmmoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  equipAmmoText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  equipAmmoCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  equipAmmoCheckboxText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  charSelectNonProficientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  charSelectNonProficientText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  equipModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  equipModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 9,
  },
  equipModePillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  equipModeTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  equipModeDesc: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 1,
  },
  sectionSwitcherRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionSwitcherTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionSwitcherTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectionSwitcherText: {
    flexShrink: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionSwitcherTextActive: {
    color: '#FFF',
  },
  equipQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qtyMiniBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
