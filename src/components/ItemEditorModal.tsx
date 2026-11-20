import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import {
  CharacterInventoryItem,
  CustomCatalogItem,
  CustomItemModEntry,
  InventoryItemCategoryGroup,
  ItemMechanic,
  ItemMechanicType,
  ParanormalElement,
} from '../types/compendium';
import { showAlert } from '../utils/alert';
import {
  ALL_CATALOG_MODS_AND_CURSES,
  buildCatalogItemFromInventoryItem,
  calculateCatalogItemStats,
  CuratedCompendiumItem,
  formatSpacesLabel,
  getCuratedCompendiumItems,
  ITEM_CATEGORIES_ORDER,
  OFFICIAL_ACCESSORY_CURSES,
  OFFICIAL_ACCESSORY_MODS,
  OFFICIAL_PROTECTION_CURSES_FOR_CATALOG,
  OFFICIAL_PROTECTION_MODS_FOR_CATALOG,
  parseSpacesInput,
} from '../utils/inventoryItems';
import { areElementsIncompatible } from '../utils/protections';
import { BANNED_ITEM_SKILLS } from '../utils/inventorySkills';
import { OFFICIAL_SKILLS_LIST } from '../utils/progression';

const ITEM_TYPE_OPTIONS: Array<{
  value: 'geral' | 'vestimenta' | 'utensilio' | 'protecao' | 'escudo';
  label: string;
}> = [
  { value: 'geral', label: 'Geral' },
  { value: 'utensilio', label: 'Utensílio' },
  { value: 'vestimenta', label: 'Vestimenta' },
  { value: 'protecao', label: 'Proteção' },
  { value: 'escudo', label: 'Escudo' },
];

const SUBCATEGORY_OPTIONS: Array<{ value: InventoryItemCategoryGroup; label: string }> = [
  { value: 'acessorio', label: 'Acessório' },
  { value: 'cura', label: 'Cura' },
  { value: 'explosivo', label: 'Explosivo' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'paranormal', label: 'Paranormal' },
  { value: 'amaldicoado', label: 'Amaldiçoado' },
  { value: 'protecao', label: 'Proteção' },
  { value: 'municao', label: 'Munição' },
  { value: 'outro', label: 'Outro' },
];

const MECHANIC_TYPE_OPTIONS: Array<{ value: ItemMechanicType; label: string; hint: string }> = [
  { value: 'heal_pv', label: 'Curar PV', hint: 'Ex: 2d8+2' },
  { value: 'heal_pe', label: 'Recuperar PE', hint: 'Ex: 1d4 ou 2d6' },
  { value: 'heal_san', label: 'Curar SAN', hint: 'Ex: 1d6' },
  { value: 'temp_pv', label: 'PV Temp.', hint: 'Ex: 10 ou 2d6' },
  { value: 'temp_pe', label: 'PE Temp.', hint: 'Ex: 5 ou 1d4' },
  { value: 'damage_roll', label: 'Dano / Explosivo', hint: 'Ex: 6d6 (DT AGI)' },
  { value: 'pe_activation', label: 'Ativar (PE)', hint: 'Gasta PE p/ efeito' },
  { value: 'utility_roll', label: 'Rolagem / Teste', hint: 'Ex: 1d6, 2d4' },
  { value: 'load_bonus', label: 'Carga (+Espaços)', hint: 'Ex: +2 espaços' },
  { value: 'block_rd_bonus', label: 'RD Bloqueio', hint: 'Ex: +2 RD' },
  { value: 'skill_bonus', label: 'Bônus Perícia', hint: 'Ex: +2 Medicina' },
];

const ELEMENTS_LIST: ParanormalElement[] = ['Nenhum', 'Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'];

const ELIGIBLE_ITEM_SKILLS = OFFICIAL_SKILLS_LIST.map((s) => s.name).filter(
  (s) => !BANNED_ITEM_SKILLS.some((b) => b.toLowerCase() === s.toLowerCase())
);

export interface ItemEditorSaveResult {
  catalogItem: CustomCatalogItem;
  quantity: number;
  charges?: number;
  alsoSaveToDepot: boolean;
}

export interface ItemEditorModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'depot' | 'character';
  initialCatalogItem?: CustomCatalogItem | null;
  draftCatalogItem?: CustomCatalogItem | null;
  initialInventoryItem?: CharacterInventoryItem | null;
  onSave: (result: ItemEditorSaveResult) => void | Promise<void>;
  linkedAgentNames?: string[];
  title?: string;
  saveButtonLabel?: string;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  visible,
  onClose,
  mode,
  initialCatalogItem,
  draftCatalogItem,
  initialInventoryItem,
  onSave,
  linkedAgentNames,
  title,
  saveButtonLabel,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { entities } = useApp();

  const [baseItemPickerVisible, setBaseItemPickerVisible] = useState(false);
  const [baseItemSearch, setBaseItemSearch] = useState('');
  const [baseItemFilter, setBaseItemFilter] = useState<'all' | InventoryItemCategoryGroup>('all');

  // Form states
  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [baseItemId, setBaseItemId] = useState<string | undefined>(undefined);
  const [baseItemName, setBaseItemName] = useState('Item Personalizado');
  const [itemType, setItemType] = useState<'geral' | 'vestimenta' | 'utensilio' | 'protecao' | 'escudo'>('geral');
  const [subCategoryGroup, setSubCategoryGroup] = useState<InventoryItemCategoryGroup>('operacional');
  const [baseCategory, setBaseCategory] = useState<'0' | 'I' | 'II' | 'III' | 'IV'>('0');
  const [baseSpaces, setBaseSpaces] = useState('1');
  const [element, setElement] = useState<ParanormalElement>('Nenhum');
  const [details, setDetails] = useState('');

  const [quantity, setQuantity] = useState('1');
  const [consumable, setConsumable] = useState(false);
  const [maxCharges, setMaxCharges] = useState('');
  const [currentCharges, setCurrentCharges] = useState<number | undefined>(undefined);

  const [targetSkill, setTargetSkill] = useState('');
  const [skillBonus, setSkillBonus] = useState('2');
  const [secondarySkill, setSecondarySkill] = useState('');
  const [secondaryBonus, setSecondaryBonus] = useState('2');
  const [instrumentalSkill, setInstrumentalSkill] = useState('');
  const [justification, setJustification] = useState('');
  const [loadBonus, setLoadBonus] = useState('');
  const [blockRdBonus, setBlockRdBonus] = useState('');

  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [customMods, setCustomMods] = useState<CustomItemModEntry[]>([]);
  const [customModName, setCustomModName] = useState('');
  const [customModEffect, setCustomModEffect] = useState('');
  const [customModCatDelta, setCustomModCatDelta] = useState('1');
  const [customModSpacesDelta, setCustomModSpacesDelta] = useState('0');

  const [mechanics, setMechanics] = useState<ItemMechanic[]>([]);
  const [newMechType, setNewMechType] = useState<ItemMechanicType>('heal_pv');
  const [newMechLabel, setNewMechLabel] = useState('');
  const [newMechFormula, setNewMechFormula] = useState('');
  const [newMechFlat, setNewMechFlat] = useState('');
  const [newMechPeCost, setNewMechPeCost] = useState('');
  const [newMechAction, setNewMechAction] = useState('');
  const [newMechDt, setNewMechDt] = useState('');
  const [newMechSkill, setNewMechSkill] = useState('');

  const [alsoSaveToDepot, setAlsoSaveToDepot] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setBaseItemPickerVisible(false);
    setBaseItemSearch('');
    setBaseItemFilter('all');
    setCustomModName('');
    setCustomModEffect('');
    setCustomModCatDelta('1');
    setCustomModSpacesDelta('0');
    setNewMechLabel('');
    setNewMechFormula('');
    setNewMechFlat('');
    setNewMechPeCost('');
    setNewMechAction('');
    setNewMechDt('');
    setNewMechSkill('');

    const sourceCatalog: CustomCatalogItem | null = initialCatalogItem
      ? initialCatalogItem
      : draftCatalogItem
      ? draftCatalogItem
      : initialInventoryItem
      ? buildCatalogItemFromInventoryItem(initialInventoryItem)
      : null;

    if (sourceCatalog) {
      setEditingCatalogId(
        initialCatalogItem
          ? initialCatalogItem.id
          : draftCatalogItem
          ? null
          : initialInventoryItem?.customItemId || null
      );
      setCreatedAt(sourceCatalog.createdAt);
      setName(sourceCatalog.name);
      setBaseItemId(sourceCatalog.baseItemId);
      setBaseItemName(sourceCatalog.baseItemName || sourceCatalog.name);
      setItemType(sourceCatalog.itemType || 'geral');
      setSubCategoryGroup(sourceCatalog.subCategoryGroup || 'operacional');
      setBaseCategory(sourceCatalog.baseCategory || '0');
      setBaseSpaces(formatSpacesLabel(sourceCatalog.baseSpaces ?? 1));
      setElement(sourceCatalog.element || 'Nenhum');
      setDetails(sourceCatalog.details || '');
      setQuantity(String(initialInventoryItem?.quantity ?? 1));
      setConsumable(Boolean(sourceCatalog.consumable));
      setMaxCharges(
        sourceCatalog.maxCharges !== undefined && sourceCatalog.maxCharges > 0
          ? String(sourceCatalog.maxCharges)
          : ''
      );
      setCurrentCharges(initialInventoryItem?.charges);
      setTargetSkill(sourceCatalog.targetSkill || '');
      setSkillBonus(String(sourceCatalog.skillBonus || 2));
      setSecondarySkill(sourceCatalog.secondarySkill || '');
      setSecondaryBonus(String(sourceCatalog.secondaryBonus || 2));
      setInstrumentalSkill(sourceCatalog.instrumentalSkill || '');
      setJustification(sourceCatalog.justification || '');
      setLoadBonus(
        sourceCatalog.loadBonus !== undefined && sourceCatalog.loadBonus > 0
          ? String(sourceCatalog.loadBonus)
          : ''
      );
      setBlockRdBonus(
        sourceCatalog.blockRdBonus !== undefined && sourceCatalog.blockRdBonus > 0
          ? String(sourceCatalog.blockRdBonus)
          : ''
      );
      setSelectedMods(sourceCatalog.modifications || []);
      setCustomMods(sourceCatalog.customModifications || []);
      setMechanics((sourceCatalog.mechanics || []).map((m) => ({ ...m })));
      setAlsoSaveToDepot(Boolean(initialInventoryItem?.customItemId));
    } else {
      setEditingCatalogId(null);
      setCreatedAt(undefined);
      setName('');
      setBaseItemId(undefined);
      setBaseItemName('Item Personalizado');
      setItemType('geral');
      setSubCategoryGroup('operacional');
      setBaseCategory('0');
      setBaseSpaces('1');
      setElement('Nenhum');
      setDetails('');
      setQuantity('1');
      setConsumable(false);
      setMaxCharges('');
      setCurrentCharges(undefined);
      setTargetSkill('');
      setSkillBonus('2');
      setSecondarySkill('');
      setSecondaryBonus('2');
      setInstrumentalSkill('');
      setJustification('');
      setLoadBonus('');
      setBlockRdBonus('');
      setSelectedMods([]);
      setCustomMods([]);
      setMechanics([]);
      setAlsoSaveToDepot(mode === 'depot');
    }
  }, [visible, mode, initialCatalogItem, draftCatalogItem, initialInventoryItem]);

  const handleBackPress = useCallback(() => {
    if (baseItemPickerVisible) {
      setBaseItemPickerVisible(false);
      return true;
    }
    onClose();
    return true;
  }, [baseItemPickerVisible, onClose]);

  const handleBackPressRef = useRef(handleBackPress);
  handleBackPressRef.current = handleBackPress;

  useEffect(() => {
    if (!visible) return;
    const onHardwareBack = () => handleBackPressRef.current();

    let sub: any;
    if (Platform.OS === 'android') {
      sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    }

    let popActive = true;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.history.pushState({ modal: 'item-editor-modal' }, '');
      } catch {}
      const handlePop = () => {
        if (popActive) handleBackPressRef.current();
      };
      window.addEventListener('popstate', handlePop);
      return () => {
        popActive = false;
        sub?.remove();
        window.removeEventListener('popstate', handlePop);
        if (window.history.state?.modal === 'item-editor-modal') {
          window.history.back();
        }
      };
    }

    return () => {
      sub?.remove();
    };
  }, [visible]);

  const curatedItems = useMemo(() => getCuratedCompendiumItems(entities), [entities]);

  const filteredBaseItems = useMemo(() => {
    const q = baseItemSearch.trim().toLowerCase();
    return curatedItems.filter((item) => {
      if (baseItemFilter !== 'all' && item.subCategoryGroup !== baseItemFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.bookTitle.toLowerCase().includes(q)
      );
    });
  }, [curatedItems, baseItemSearch, baseItemFilter]);

  const calculated = useMemo(() => {
    const baseStats = calculateCatalogItemStats({
      baseCategory,
      baseSpaces: parseSpacesInput(baseSpaces, 1),
      itemType,
      skillBonus: parseInt(skillBonus, 10) || 2,
      modifications: selectedMods,
      customModifications: customMods,
    });
    // Livro Base p. 74: Aprimorado pode ser aplicado uma segunda vez à perícia de Função Adicional (+1 Cat)
    const hasSecondAprimorado =
      (itemType === 'vestimenta' || itemType === 'utensilio') &&
      selectedMods.includes('mod_acc_funcao_adicional') &&
      secondaryBonus === '5';
    if (!hasSecondAprimorado) return baseStats;
    const curIdx = ITEM_CATEGORIES_ORDER.indexOf(baseStats.finalCategory);
    const nextCategory =
      ITEM_CATEGORIES_ORDER[Math.min(ITEM_CATEGORIES_ORDER.length - 1, curIdx + 1)] ||
      baseStats.finalCategory;
    return {
      ...baseStats,
      finalCategory: nextCategory,
    };
  }, [baseCategory, baseSpaces, itemType, skillBonus, secondaryBonus, selectedMods, customMods]);

  const handleSelectBaseItem = (item: CuratedCompendiumItem) => {
    setBaseItemPickerVisible(false);
    setBaseItemId(item.sourceEntity?.id || item.id);
    setBaseItemName(item.name);
    setName(item.name);
    setBaseCategory(item.category);
    setBaseSpaces(formatSpacesLabel(item.spaces));
    setItemType(item.itemType);
    setSubCategoryGroup(item.subCategoryGroup);
    setElement(item.element || 'Nenhum');
    setDetails(item.description);
    setConsumable(Boolean(item.consumable));
    setMaxCharges(item.maxCharges ? String(item.maxCharges) : '');
    setCurrentCharges(item.maxCharges);
    setLoadBonus(item.loadBonus ? String(item.loadBonus) : '');
    setBlockRdBonus(item.blockRdBonus ? String(item.blockRdBonus) : '');
    setTargetSkill(item.targetSkill || '');
    setSkillBonus(item.skillBonus ? String(item.skillBonus) : '2');
    setMechanics(item.mechanics.map((m) => ({ ...m })));
  };

  const toggleMod = (modId: string) => {
    const isRemoving = selectedMods.includes(modId);
    if (isRemoving) {
      setSelectedMods((prev) => prev.filter((m) => m !== modId));
      return;
    }

    const modDef = ALL_CATALOG_MODS_AND_CURSES.find((m) => m.id === modId);
    const incompatibleModPair: Record<string, { otherId: string; label: string }> = {
      mod__reforcada: { otherId: 'mod__discreta', label: 'Discreta' },
      mod__discreta: { otherId: 'mod__reforcada', label: 'Reforçada' },
    };
    const conflictPair = incompatibleModPair[modId];
    if (conflictPair && selectedMods.includes(conflictPair.otherId)) {
      showAlert(
        'Modificações Incompatíveis',
        `"${modDef?.name || modId}" não pode ser combinada com "${conflictPair.label}" (Livro Base p. 72).`
      );
      return;
    }

    if (modDef?.isCurse && modDef.element) {
      if (
        element !== 'Nenhum' &&
        element !== 'Variável' &&
        areElementsIncompatible(element, modDef.element)
      ) {
        showAlert(
          'Elementos Opressivos',
          `A maldição "${modDef.name}" (${modDef.element}) é incompatível com o elemento base do item (${element}) segundo a regra canônica (Livro Base p. 111 / p. 154).`
        );
        return;
      }
      const conflictingId = selectedMods.find((otherId) => {
        const otherDef = ALL_CATALOG_MODS_AND_CURSES.find((m) => m.id === otherId);
        return (
          otherDef?.isCurse &&
          otherDef.element &&
          areElementsIncompatible(otherDef.element, modDef.element)
        );
      });
      if (conflictingId) {
        const otherDef = ALL_CATALOG_MODS_AND_CURSES.find((m) => m.id === conflictingId);
        showAlert(
          'Elementos Opressivos',
          `A maldição "${modDef.name}" (${modDef.element}) é incompatível com "${otherDef?.name}" (${otherDef?.element}) segundo a regra canônica (Livro Base p. 111 / p. 154).`
        );
        return;
      }
      if (
        element === 'Nenhum' &&
        (modDef.element === 'Sangue' ||
          modDef.element === 'Morte' ||
          modDef.element === 'Conhecimento' ||
          modDef.element === 'Energia' ||
          modDef.element === 'Medo')
      ) {
        setElement(modDef.element);
      }
    }

    setSelectedMods((prev) => [...prev, modId]);
  };

  const handleAddCustomMod = () => {
    const cleanName = customModName.trim();
    if (!cleanName) {
      showAlert('Nome obrigatório', 'Informe o nome da melhoria caseira.');
      return;
    }
    const entry: CustomItemModEntry = {
      id: `cmod_it_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: cleanName,
      effect: customModEffect.trim() || 'Efeito personalizado',
      categoryIncrease: parseInt(customModCatDelta, 10) || 0,
      spacesChange: parseInt(customModSpacesDelta, 10) || 0,
    };
    setCustomMods((prev) => [...prev, entry]);
    setCustomModName('');
    setCustomModEffect('');
    setCustomModCatDelta('1');
    setCustomModSpacesDelta('0');
  };

  const handleAddMechanic = () => {
    const defaultLabel =
      MECHANIC_TYPE_OPTIONS.find((m) => m.value === newMechType)?.label || 'Efeito';
    const label = newMechLabel.trim() || defaultLabel;
    const flatParsed = parseInt(newMechFlat, 10);
    const peParsed = parseInt(newMechPeCost, 10);

    if (
      (newMechType === 'heal_pv' ||
        newMechType === 'heal_pe' ||
        newMechType === 'heal_san' ||
        newMechType === 'heal_all' ||
        newMechType === 'temp_pv' ||
        newMechType === 'temp_pe' ||
        newMechType === 'damage_roll' ||
        newMechType === 'utility_roll') &&
      !newMechFormula.trim() &&
      !Number.isFinite(flatParsed)
    ) {
      showAlert('Fórmula ou valor obrigatório', 'Informe uma fórmula de dados (ex: 2d8+2) ou um valor fixo.');
      return;
    }

    const mech: ItemMechanic = {
      id: `mech_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: newMechType,
      label,
      formula: newMechFormula.trim() || undefined,
      flatValue: Number.isFinite(flatParsed) && flatParsed !== 0 ? flatParsed : undefined,
      peCost: Number.isFinite(peParsed) && peParsed > 0 ? peParsed : undefined,
      actionCost: newMechAction.trim() || undefined,
      dtFormula: newMechDt.trim() || undefined,
      targetSkill: newMechType === 'skill_bonus' ? newMechSkill.trim() || undefined : undefined,
    };
    setMechanics((prev) => [...prev, mech]);
    setNewMechLabel('');
    setNewMechFormula('');
    setNewMechFlat('');
    setNewMechPeCost('');
    setNewMechAction('');
    setNewMechDt('');
    setNewMechSkill('');
  };

  const handleSavePress = () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showAlert('Nome obrigatório', 'Informe o nome do item.');
      return;
    }

    const parsedQty = Math.max(0, parseInt(quantity, 10) || (mode === 'depot' ? 1 : 1));
    const parsedMaxCharges = parseInt(maxCharges, 10);
    const finalMaxCharges = Number.isFinite(parsedMaxCharges) && parsedMaxCharges > 0 ? parsedMaxCharges : undefined;
    const parsedLoadBonus = parseInt(loadBonus, 10);
    const parsedBlockRdBonus = parseInt(blockRdBonus, 10);

    const isAccessory = itemType === 'vestimenta' || itemType === 'utensilio';
    const hasFuncAdicional = selectedMods.includes('mod_acc_funcao_adicional');
    const hasInstrumental = selectedMods.includes('mod_acc_instrumental');

    const now = new Date().toISOString();
    const catalogItem: CustomCatalogItem = {
      id: editingCatalogId || `citem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      baseItemId,
      baseItemName: baseItemName || cleanName,
      itemType,
      subCategoryGroup,
      baseCategory,
      baseSpaces: parseSpacesInput(baseSpaces, 1),
      finalCategory: calculated.finalCategory,
      finalSpaces: calculated.finalSpaces,
      details: details.trim(),
      element,
      modifications: [...selectedMods],
      customModifications: customMods.length > 0 ? customMods.map((m) => ({ ...m })) : undefined,
      targetSkill: isAccessory && targetSkill.trim() ? targetSkill.trim() : undefined,
      skillBonus: isAccessory && targetSkill.trim() ? calculated.effectiveSkillBonus : undefined,
      secondarySkill: hasFuncAdicional && secondarySkill.trim() ? secondarySkill.trim() : undefined,
      secondaryBonus:
        hasFuncAdicional && secondarySkill.trim() ? parseInt(secondaryBonus, 10) || 2 : undefined,
      instrumentalSkill: hasInstrumental && instrumentalSkill.trim() ? instrumentalSkill.trim() : undefined,
      justification: isAccessory && justification.trim() ? justification.trim() : undefined,
      consumable,
      maxCharges: finalMaxCharges,
      loadBonus: Number.isFinite(parsedLoadBonus) && parsedLoadBonus > 0 ? parsedLoadBonus : undefined,
      blockRdBonus:
        Number.isFinite(parsedBlockRdBonus) && parsedBlockRdBonus > 0 ? parsedBlockRdBonus : undefined,
      mechanics: mechanics.map((m) => ({ ...m })),
      createdAt: createdAt || now,
      updatedAt: now,
    };

    const nextCharges =
      finalMaxCharges !== undefined
        ? currentCharges !== undefined
          ? Math.min(currentCharges, finalMaxCharges)
          : finalMaxCharges
        : undefined;

    onSave({
      catalogItem,
      quantity: parsedQty,
      charges: nextCharges,
      alsoSaveToDepot: mode === 'depot' ? true : alsoSaveToDepot,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        handleBackPress();
      }}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12) },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                handleBackPress();
              }}
              style={styles.headerBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="btn-close-item-editor"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title || (editingCatalogId || initialInventoryItem ? 'Editar Item' : 'Novo Item / Equipamento')}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                Cat {calculated.finalCategory} • {formatSpacesLabel(calculated.finalSpaces)} esp.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSavePress}
              style={styles.saveBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="btn-save-item-editor"
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveBtnText} numberOfLines={1}>
                {saveButtonLabel || 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>

          {baseItemPickerVisible ? (
            <View style={{ flex: 1 }}>
              <View style={styles.pickerTopBar}>
                <TouchableOpacity
                  style={styles.pickerBackBtn}
                  onPress={() => setBaseItemPickerVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="arrow-back" size={18} color={colors.text} />
                  <Text style={styles.pickerBackText} numberOfLines={1}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle} numberOfLines={1}>Escolher Modelo do Compêndio</Text>
              </View>
            <View style={styles.pickerSearchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Buscar item oficial (ex: Cicatrizante, Mochila)..."
                placeholderTextColor={colors.textMuted}
                value={baseItemSearch}
                onChangeText={setBaseItemSearch}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
              style={{ maxHeight: 42 }}
            >
              <TouchableOpacity
                style={[styles.filterPill, baseItemFilter === 'all' && styles.filterPillActive]}
                onPress={() => setBaseItemFilter('all')}
              >
                <Text style={[styles.filterPillText, baseItemFilter === 'all' && styles.filterPillTextActive]}>
                  Todos ({curatedItems.length})
                </Text>
              </TouchableOpacity>
              {SUBCATEGORY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.filterPill, baseItemFilter === opt.value && styles.filterPillActive]}
                  onPress={() => setBaseItemFilter(opt.value)}
                >
                  <Text
                    style={[styles.filterPillText, baseItemFilter === opt.value && styles.filterPillTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView contentContainerStyle={styles.pickerListContent} keyboardShouldPersistTaps="handled">
              {filteredBaseItems.map((it) => (
                <TouchableOpacity
                  key={it.id}
                  style={styles.pickerCard}
                  onPress={() => handleSelectBaseItem(it)}
                  testID={`base-item-pick-${it.id}`}
                >
                  <View style={styles.pickerCardHeader}>
                    <Text style={styles.pickerCardTitle}>{it.name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        Cat {it.category} • {formatSpacesLabel(it.spaces)} esp.
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pickerCardMeta}>
                    {it.bookTitle}
                    {it.pageNumber ? ` p. ${it.pageNumber}` : ''} • {it.subCategoryGroup.toUpperCase()}
                  </Text>
                  <Text style={styles.pickerCardDesc} numberOfLines={2}>
                    {it.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {linkedAgentNames && linkedAgentNames.length > 0 ? (
              <View style={styles.sharedBanner}>
                <Ionicons name="link" size={16} color={colors.elements.Medo.text} />
                <Text style={styles.sharedBannerText}>
                  Compartilhado com {linkedAgentNames.join(', ')}. Alterações aqui sincronizam com esses agentes.
                </Text>
              </View>
            ) : null}

            {/* Base Item Picker Trigger */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Modelo Base</Text>
              <TouchableOpacity
                style={styles.basePickerBtn}
                onPress={() => setBaseItemPickerVisible(true)}
                testID="btn-pick-base-item"
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.basePickerBtnText}>{baseItemName || 'Personalizado'}</Text>
                  <Text style={styles.basePickerSub}>
                    Toque para importar estatísticas e mecânicas de um item oficial
                  </Text>
                </View>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Nome do Item *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Cicatrizante Aprimorado, Vestimenta de Percepção..."
                placeholderTextColor={colors.textMuted}
                testID="input-item-name"
              />

              <Text style={styles.fieldLabel}>Tipo no Inventário</Text>
              <View style={styles.smallPillsRow}>
                {ITEM_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.smallPill, itemType === opt.value && styles.smallPillActive]}
                    onPress={() => setItemType(opt.value)}
                  >
                    <Text
                      style={[
                        styles.smallPillText,
                        itemType === opt.value && styles.smallPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Grupo / Categoria Funcional</Text>
              <View style={styles.smallPillsRow}>
                {SUBCATEGORY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.smallPill,
                      subCategoryGroup === opt.value && styles.smallPillActive,
                    ]}
                    onPress={() => setSubCategoryGroup(opt.value)}
                  >
                    <Text
                      style={[
                        styles.smallPillText,
                        subCategoryGroup === opt.value && styles.smallPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Categoria Base</Text>
                  <View style={styles.smallPillsRow}>
                    {ITEM_CATEGORIES_ORDER.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.smallPill, baseCategory === cat && styles.smallPillActive]}
                        onPress={() => setBaseCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            baseCategory === cat && styles.smallPillTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Espaços Base (ex: 0, 0.5, 1, 2)</Text>
                  <TextInput
                    style={styles.input}
                    value={baseSpaces}
                    onChangeText={setBaseSpaces}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    testID="input-item-spaces"
                  />
                </View>
                {mode === 'character' ? (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Quantidade</Text>
                    <TextInput
                      style={styles.input}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>Elemento Paranormal</Text>
              <View style={styles.smallPillsRow}>
                {ELEMENTS_LIST.map((el) => (
                  <TouchableOpacity
                    key={el}
                    style={[styles.smallPill, element === el && styles.smallPillActive]}
                    onPress={() => setElement(el)}
                  >
                    <Text style={[styles.smallPillText, element === el && styles.smallPillTextActive]}>
                      {el}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Descrição / Efeito no Jogo</Text>
              <TextInput
                style={[styles.input, { minHeight: 74, textAlignVertical: 'top' }]}
                value={details}
                onChangeText={setDetails}
                multiline
                placeholder="Descreva regras, usos ou observações do item..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Consumível, Cargas & Bônus Passivos */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Consumível, Cargas & Bônus Passivos</Text>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setConsumable((v) => !v)}
              >
                <Ionicons
                  name={consumable ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={consumable ? colors.primary : colors.textMuted}
                />
                <Text style={styles.checkRowText}>
                  Item consumível / com usos (ao chegar a 0 usos, permanece no inventário bloqueado para registro)
                </Text>
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Cargas por Unidade (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={maxCharges}
                    onChangeText={setMaxCharges}
                    keyboardType="number-pad"
                    placeholder="Ex: 2 ou 3"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Bônus de Carga (+Espaços)</Text>
                  <TextInput
                    style={styles.input}
                    value={loadBonus}
                    onChangeText={setLoadBonus}
                    keyboardType="number-pad"
                    placeholder="Ex: 2 (Mochila)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
              <View>
                <Text style={styles.fieldLabel}>RD ao Bloqueio (+)</Text>
                <TextInput
                  style={styles.input}
                  value={blockRdBonus}
                  onChangeText={setBlockRdBonus}
                  keyboardType="number-pad"
                  placeholder="Ex: 2"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Acessórios & Modificações Oficiais */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderWithBadge}>
                <Text style={styles.sectionTitle}>Acessório & Modificações</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    Cat Final: {calculated.finalCategory} • {formatSpacesLabel(calculated.finalSpaces)} esp.
                  </Text>
                </View>
              </View>

              {(itemType === 'vestimenta' || itemType === 'utensilio') ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.fieldLabel}>
                    Perícia Principal ({selectedMods.includes('mod_acc_aprimorado') ? '+5 Aprimorado' : '+2 padrão'})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {ELIGIBLE_ITEM_SKILLS.map((sk) => (
                      <TouchableOpacity
                        key={sk}
                        style={[styles.filterPill, targetSkill === sk && styles.filterPillActive]}
                        onPress={() => setTargetSkill(targetSkill === sk ? '' : sk)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            targetSkill === sk && styles.filterPillTextActive,
                          ]}
                        >
                          {sk}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.fieldLabel}>Justificativa Narrativa (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={justification}
                    onChangeText={setJustification}
                    placeholder="Ex: Lupa forense da Ordem para análise de vestígios"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ) : null}

              {(() => {
                const isProtType = itemType === 'protecao' || itemType === 'escudo';
                const modsList = isProtType
                  ? OFFICIAL_PROTECTION_MODS_FOR_CATALOG
                  : OFFICIAL_ACCESSORY_MODS.filter(
                      (m) => !m.appliesTo || m.appliesTo.includes(itemType)
                    );
                const cursesList = (
                  isProtType ? OFFICIAL_PROTECTION_CURSES_FOR_CATALOG : OFFICIAL_ACCESSORY_CURSES
                ).filter((m) => (isProtType ? true : !m.appliesTo || m.appliesTo.includes(itemType)));
                return (
                  <>
                    <Text style={styles.sectionSub}>
                      {isProtType
                        ? 'Modificações Oficiais de Proteção (Livro Base p. 72):'
                        : itemType === 'geral'
                        ? 'Itens Gerais (Discreto e Maldições; Aprimorado/Função/Instrumental exigem Vestimenta ou Utensílio):'
                        : 'Modificações Oficiais de Acessórios (Livro Base p. 74):'}
                    </Text>
                    <View style={styles.modsList}>
                      {modsList.map((mod) => {
                        const active = selectedMods.includes(mod.id);
                        return (
                          <TouchableOpacity
                            key={mod.id}
                            style={[styles.modCard, active && styles.modCardActive]}
                            onPress={() => toggleMod(mod.id)}
                            testID={`toggle-item-mod-${mod.id}`}
                          >
                            <View style={styles.modCardHeader}>
                              <Ionicons
                                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                size={18}
                                color={active ? colors.primary : colors.textMuted}
                              />
                              <Text style={[styles.modCardTitle, active && { color: colors.text }]}>
                                {mod.name}
                              </Text>
                              <View style={styles.modCatTag}>
                                <Text style={styles.modCatTagText}>+{mod.categoryIncrease} Cat</Text>
                              </View>
                            </View>
                            <Text style={styles.modCardDesc}>{mod.description}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={[styles.sectionSub, { marginTop: 12 }]}>
                      {isProtType
                        ? 'Maldições Paranormais de Proteções & Escudos (Livro Base p. 156-157):'
                        : 'Maldições Paranormais de Acessórios & Utensílios (Livro Base p. 157):'}
                    </Text>
                    <Text style={[styles.modCardDesc, { marginBottom: 8 }]}>
                      1ª maldição soma +II Categoria; cada maldição extra +I. Elementos opostos não coexistem.
                    </Text>
                    <View style={styles.modsList}>
                      {cursesList.map((curse) => {
                        const active = selectedMods.includes(curse.id);
                        const elColors =
                          (curse.element && colors.elements[curse.element]) || colors.elements.Energia;
                        return (
                          <TouchableOpacity
                            key={curse.id}
                            style={[styles.modCard, active && styles.modCardActive]}
                            onPress={() => toggleMod(curse.id)}
                            testID={`toggle-item-mod-${curse.id}`}
                          >
                            <View style={styles.modCardHeader}>
                              <Ionicons
                                name={active ? 'flame' : 'flame-outline'}
                                size={18}
                                color={active ? elColors.border : colors.textMuted}
                              />
                              <Text style={[styles.modCardTitle, active && { color: colors.text }]}>
                                {curse.name}
                              </Text>
                              {curse.element && (
                                <View
                                  style={[
                                    styles.modCatTag,
                                    {
                                      borderColor: elColors.border,
                                      backgroundColor: elColors.bg,
                                      borderWidth: 1,
                                    },
                                  ]}
                                >
                                  <Text style={[styles.modCatTagText, { color: elColors.text }]}>
                                    {curse.element}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.modCardDesc}>{curse.description}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                );
              })()}

              {selectedMods.includes('mod_acc_funcao_adicional') ? (
                <View style={styles.nestedCard}>
                  <Text style={styles.fieldLabel}>Segunda Perícia (Função Adicional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {ELIGIBLE_ITEM_SKILLS.map((sk) => (
                      <TouchableOpacity
                        key={sk}
                        style={[styles.filterPill, secondarySkill === sk && styles.filterPillActive]}
                        onPress={() => setSecondarySkill(secondarySkill === sk ? '' : sk)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            secondarySkill === sk && styles.filterPillTextActive,
                          ]}
                        >
                          {sk}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.smallPillsRow}>
                    {['2', '5'].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.smallPill, secondaryBonus === val && styles.smallPillActive]}
                        onPress={() => setSecondaryBonus(val)}
                      >
                        <Text
                          style={[
                            styles.smallPillText,
                            secondaryBonus === val && styles.smallPillTextActive,
                          ]}
                        >
                          +{val} {val === '5' ? '(+1 Cat • Aprimorado 2x)' : '(Padrão)'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedMods.includes('mod_acc_instrumental') ? (
                <View style={styles.nestedCard}>
                  <Text style={styles.fieldLabel}>Kit de Perícia Embutido (Instrumental)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {OFFICIAL_SKILLS_LIST.map((sk) => (
                      <TouchableOpacity
                        key={sk.name}
                        style={[styles.filterPill, instrumentalSkill === sk.name && styles.filterPillActive]}
                        onPress={() =>
                          setInstrumentalSkill(instrumentalSkill === sk.name ? '' : sk.name)
                        }
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            instrumentalSkill === sk.name && styles.filterPillTextActive,
                          ]}
                        >
                          {sk.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* Modificações caseiras */}
              {customMods.length > 0 ? (
                <View style={{ gap: 6, marginTop: 4 }}>
                  {customMods.map((cm) => (
                    <View key={cm.id} style={styles.customModRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customModName}>
                          {cm.name} (+{cm.categoryIncrease} Cat
                          {cm.spacesChange ? `, ${cm.spacesChange > 0 ? '+' : ''}${cm.spacesChange} esp.` : ''})
                        </Text>
                        <Text style={styles.customModEffect}>{cm.effect}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setCustomMods((prev) => prev.filter((x) => x.id !== cm.id))}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.nestedCard}>
                <Text style={styles.fieldLabel}>Adicionar Melhoria / Maldição Personalizada</Text>
                <TextInput
                  style={styles.input}
                  value={customModName}
                  onChangeText={setCustomModName}
                  placeholder="Nome (ex: Reforçado)"
                  placeholderTextColor={colors.textMuted}
                />
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      value={customModCatDelta}
                      onChangeText={setCustomModCatDelta}
                      keyboardType="number-pad"
                      placeholder="+Cat"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.input}
                      value={customModSpacesDelta}
                      onChangeText={setCustomModSpacesDelta}
                      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                      placeholder="Esp (ex: -1)"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={customModEffect}
                    onChangeText={setCustomModEffect}
                    placeholder="Efeito mecânico..."
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity style={styles.inlineAddBtn} onPress={handleAddCustomMod}>
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.inlineAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Construtor de Mecânicas Interativas */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Mecânicas Interativas ({mechanics.length})</Text>
              <Text style={styles.sectionSub}>
                Configure botões clicáveis no inventário para curar PV/PE/SAN, ganhar temporários, rolar explosivos ou ativar efeitos por PE.
              </Text>

              {mechanics.map((m) => (
                <View key={m.id} style={styles.mechRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mechRowTitle}>{m.label}</Text>
                    <Text style={styles.mechRowSub}>
                      {m.type}
                      {m.formula ? ` • Fórmula: ${m.formula}` : ''}
                      {m.flatValue ? ` • Valor: +${m.flatValue}` : ''}
                      {m.peCost ? ` • Custo: ${m.peCost} PE` : ''}
                      {m.dtFormula ? ` • DT ${m.dtFormula}` : ''}
                      {m.actionCost ? ` • ${m.actionCost}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setMechanics((prev) => prev.filter((x) => x.id !== m.id))}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.nestedCard}>
                <Text style={styles.fieldLabel}>Tipo de Mecânica</Text>
                <View style={styles.smallPillsRow}>
                  {MECHANIC_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.smallPill, newMechType === opt.value && styles.smallPillActive]}
                      onPress={() => setNewMechType(opt.value)}
                    >
                      <Text
                        style={[
                          styles.smallPillText,
                          newMechType === opt.value && styles.smallPillTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Rótulo do Botão</Text>
                    <TextInput
                      style={styles.input}
                      value={newMechLabel}
                      onChangeText={setNewMechLabel}
                      placeholder={
                        MECHANIC_TYPE_OPTIONS.find((x) => x.value === newMechType)?.label || 'Rótulo'
                      }
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Fórmula de Dados</Text>
                    <TextInput
                      style={styles.input}
                      value={newMechFormula}
                      onChangeText={setNewMechFormula}
                      placeholder={
                        MECHANIC_TYPE_OPTIONS.find((x) => x.value === newMechType)?.hint || '2d8+2'
                      }
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Valor Fixo</Text>
                    <TextInput
                      style={styles.input}
                      value={newMechFlat}
                      onChangeText={setNewMechFlat}
                      keyboardType="number-pad"
                      placeholder="Ex: 5"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Custo PE</Text>
                    <TextInput
                      style={styles.input}
                      value={newMechPeCost}
                      onChangeText={setNewMechPeCost}
                      keyboardType="number-pad"
                      placeholder="Ex: 2"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>DT (Atrib. ou Nº)</Text>
                    <TextInput
                      style={styles.input}
                      value={newMechDt}
                      onChangeText={setNewMechDt}
                      placeholder="AGI / 15"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={[styles.row, { flexWrap: 'wrap' }]}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newMechAction}
                    onChangeText={setNewMechAction}
                    placeholder="Ação (ex: Padrão, Movimento, Reação)"
                    placeholderTextColor={colors.textMuted}
                  />
                  {newMechType === 'skill_bonus' ? (
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={newMechSkill}
                      onChangeText={setNewMechSkill}
                      placeholder="Perícia (ex: Furtividade)"
                      placeholderTextColor={colors.textMuted}
                    />
                  ) : null}
                  <TouchableOpacity
                    style={styles.inlineAddBtn}
                    onPress={handleAddMechanic}
                    testID="btn-add-item-mechanic"
                  >
                    <Ionicons name="flash" size={15} color="#FFF" />
                    <Text style={styles.inlineAddBtnText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {mode === 'character' ? (
              <TouchableOpacity
                style={styles.depotToggleCard}
                onPress={() => setAlsoSaveToDepot((v) => !v)}
                testID="toggle-save-to-depot"
              >
                <Ionicons
                  name={alsoSaveToDepot ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={alsoSaveToDepot ? colors.elements.Medo.border : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.depotToggleTitle}>
                    Salvar também no Depósito Compartilhado
                  </Text>
                  <Text style={styles.depotToggleSub}>
                    Permite importar este item facilmente para outros agentes na Armaria & Depósito.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.72)' : colors.background,
      ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {}),
    },
    container: {
      flex: 1,
      width: '100%',
      ...(Platform.OS === 'web' ? { maxWidth: 620 } : {}),
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerBtn: {
      padding: 4,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    headerSub: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    saveBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    content: {
      padding: 14,
      gap: 14,
    },
    sharedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.elements.Medo.bg,
      borderWidth: 1,
      borderColor: colors.elements.Medo.border,
      borderRadius: 12,
      padding: 11,
    },
    sharedBannerText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    sectionHeaderWithBadge: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
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
      fontWeight: '800',
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
      gap: 10,
    },
    basePickerBtnText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    basePickerSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
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
    row: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    smallPillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    smallPill: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
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
    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    checkRowText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    modsList: {
      gap: 8,
    },
    modCard: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    modCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    modCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    modCardTitle: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    modCatTag: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    modCatTagText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '800',
    },
    modCardDesc: {
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    nestedCard: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    customModRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 8,
    },
    customModName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    customModEffect: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    inlineAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    inlineAddBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    mechRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
    },
    mechRowTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    mechRowSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    depotToggleCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: '#38BDF8',
      borderRadius: 12,
      padding: 12,
    },
    depotToggleTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    depotToggleSub: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    pickerTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    pickerBackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
    },
    pickerBackText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    pickerTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      flex: 1,
    },
    pickerSearchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      margin: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    pickerSearchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    filterPillsRow: {
      paddingHorizontal: 12,
      gap: 6,
      alignItems: 'center',
    },
    filterPill: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    filterPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    filterPillText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    filterPillTextActive: {
      color: colors.text,
      fontWeight: '800',
    },
    pickerListContent: {
      padding: 12,
      gap: 8,
    },
    pickerCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    pickerCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    pickerCardTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      flex: 1,
    },
    pickerCardMeta: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    pickerCardDesc: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
  });
