import React, { useEffect, useMemo, useState } from 'react';
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
import { CharacterSheet, CustomCatalogItem } from '../types/compendium';
import { showAlert } from '../utils/alert';
import {
  areElementsIncompatible,
  calculateCurseCategoryIncrease,
  calculateEquippedProtections,
  calculateMultipleEquippedProtections,
  EquippedProtectionEntry,
  isProtectionInventoryEntry,
  OFFICIAL_PROTECTION_CURSES,
  OFFICIAL_PROTECTIONS,
  ProtectionItem,
  resolveProtectionInventoryEntry,
} from '../utils/protections';

export interface EquippedProtectionItemPayload {
  name: string;
  category: '0' | 'I' | 'II' | 'III' | 'IV';
  spaces: number;
  details: string;
  itemType: 'protecao' | 'escudo';
  equipped?: boolean;
  sourceInventoryId?: string;
  isBodyArmor?: boolean;
  isShield?: boolean;
  modifications?: string[];
  curses?: string[];
}

export interface ProtectionApplyPayload {
  defenseEquip: number;
  resistancesText: string;
  protectionText: string;
  equippedItems: EquippedProtectionItemPayload[];
  armorPenalty: number;
  totalSpaces: number;
  replaceExisting?: boolean;
}

interface ExtraProtectionSlot {
  id: string;
  prot: ProtectionItem;
  mods: string[];
  curses: string[];
  equipped: boolean;
  payloadItem: EquippedProtectionItemPayload;
}

interface ProtectionModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (payload: ProtectionApplyPayload) => void;
  character?: CharacterSheet | null;
}

const CATEGORY_ORDER: Array<'0' | 'I' | 'II' | 'III' | 'IV'> = ['0', 'I', 'II', 'III', 'IV'];

function increaseCategory(
  baseCategory: '0' | 'I' | 'II' | 'III' | 'IV',
  increase: number
): '0' | 'I' | 'II' | 'III' | 'IV' {
  const currentIdx = CATEGORY_ORDER.indexOf(baseCategory);
  const nextIdx = Math.min(CATEGORY_ORDER.length - 1, Math.max(0, currentIdx + increase));
  return CATEGORY_ORDER[nextIdx];
}

function getCurseElementColor(element: string, colors: ThemeColors): string {
  switch (element) {
    case 'Sangue':
      return colors.elements.Sangue.text;
    case 'Morte':
      return colors.elements.Morte.text;
    case 'Conhecimento':
      return colors.elements.Conhecimento.text;
    case 'Energia':
      return colors.elements.Energia.text;
    default:
      return colors.elements.Medo.text;
  }
}

function buildPayloadItemForEntry(
  prot: ProtectionItem,
  mods: string[],
  curses: string[],
  equipped = true,
  sourceInventoryId?: string
): EquippedProtectionItemPayload {
  const curseCatIncrease = calculateCurseCategoryIncrease(curses.length);

  if (prot.type === 'Escudo') {
    const isReforcada = mods.some(
      (m) => m.toLowerCase().includes('reforç') || m.toLowerCase().includes('reforc')
    );
    const shieldMods = isReforcada ? ['Reforçada'] : [];
    const shieldFinalCat = increaseCategory(
      prot.category,
      (isReforcada ? 1 : 0) + curseCatIncrease
    );
    const shieldCurseDefense = curses.reduce((acc, cName) => {
      const curseDef = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === cName);
      return acc + (curseDef?.defenseBonus || 0);
    }, 0);
    const allSuffixes = [...shieldMods, ...curses];
    const shieldSuffix = allSuffixes.length > 0 ? ` (${allSuffixes.join(', ')})` : '';
    const shieldSpaces = prot.spaces + (isReforcada ? 1 : 0);
    const shieldDefTotal = prot.defenseBonus + (isReforcada ? 2 : 0) + shieldCurseDefense;

    return {
      name: `${prot.name}${shieldSuffix}`,
      category: shieldFinalCat,
      spaces: shieldSpaces,
      details: `Escudo • Defesa +${shieldDefTotal}${
        prot.damageReduction?.ballistic
          ? ` • RD Balístico ${prot.damageReduction.ballistic}`
          : ''
      }`,
      itemType: 'escudo',
      equipped,
      ...(sourceInventoryId ? { sourceInventoryId } : {}),
      isShield: true,
      ...(shieldMods.length > 0 ? { modifications: shieldMods } : {}),
      ...(curses.length > 0 ? { curses } : {}),
    };
  }

  let catIncrease = curseCatIncrease;
  if (mods.includes('Reforçada')) catIncrease += 1;
  if (mods.includes('Blindada')) catIncrease += 1;
  if (mods.includes('Antibombas')) catIncrease += 1;
  if (mods.includes('Discreta')) catIncrease += 1;

  const finalCat = increaseCategory(prot.category, catIncrease);

  let armorSpaces = prot.spaces;
  if (mods.includes('Reforçada')) armorSpaces += 1;
  if (mods.includes('Blindada')) armorSpaces += 1;
  if (mods.includes('Discreta')) armorSpaces = Math.max(1, armorSpaces - 1);

  const allSuffixes = [...mods, ...curses];
  const modsSuffix = allSuffixes.length > 0 ? ` (${allSuffixes.join(', ')})` : '';
  const curseDefenseDelta = curses.reduce((acc, cName) => {
    const curseDef = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === cName);
    return acc + (curseDef?.defenseBonus || 0);
  }, 0);

  const bodyPhysRd =
    mods.includes('Blindada') && prot.type === 'Pesada'
      ? 5
      : prot.damageReduction?.physical || 0;
  const bodyCurseRdParts = curses
    .map((cName) => {
      const curseDef = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === cName);
      if (!curseDef) return '';
      if (curseDef.rdElement) return `${curseDef.rdElement.element} ${curseDef.rdElement.value}`;
      if (curseDef.rdGeneralHeavy || curseDef.rdGeneralLightOrShield) {
        return `Geral ${
          prot.type === 'Pesada'
            ? curseDef.rdGeneralHeavy || 5
            : curseDef.rdGeneralLightOrShield || 2
        }`;
      }
      return '';
    })
    .filter(Boolean);
  const bodyRdParts = [
    bodyPhysRd > 0 ? `Física ${bodyPhysRd}` : '',
    ...bodyCurseRdParts,
  ].filter(Boolean);

  return {
    name: `${prot.name}${modsSuffix}`,
    category: finalCat,
    spaces: armorSpaces,
    details: `Proteção Corporal (${prot.type}) • Defesa +${
      prot.defenseBonus + (mods.includes('Reforçada') ? 2 : 0) + curseDefenseDelta
    }${bodyRdParts.length > 0 ? ` • RD: ${bodyRdParts.join(', ')}` : ''}`,
    itemType: 'protecao',
    equipped,
    ...(sourceInventoryId ? { sourceInventoryId } : {}),
    isBodyArmor: true,
    ...(mods.length > 0 ? { modifications: mods } : {}),
    ...(curses.length > 0 ? { curses } : {}),
  };
}

export default function ProtectionModal({
  visible,
  onClose,
  onApply,
  character,
}: ProtectionModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { customItems, upsertCustomItem } = useApp();

  // Estados de seleção
  const [bodyArmorSelection, setBodyArmorSelection] = useState<string>('none');
  const [shieldSelection, setShieldSelection] = useState<string>('none');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [selectedCurses, setSelectedCurses] = useState<string[]>([]);
  const [extraProtections, setExtraProtections] = useState<ExtraProtectionSlot[]>([]);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);

  // Campos para Armadura Customizada
  const [customArmorName, setCustomArmorName] = useState('Colete Customizado');
  const [customArmorType, setCustomArmorType] = useState<'Leve' | 'Pesada'>('Leve');
  const [customArmorDefense, setCustomArmorDefense] = useState('5');
  const [customArmorSpaces, setCustomArmorSpaces] = useState('2');
  const [customArmorCategory, setCustomArmorCategory] = useState<'0' | 'I' | 'II' | 'III' | 'IV'>('I');
  const [customArmorRd, setCustomArmorRd] = useState('0');

  // Campos para Escudo Customizado
  const [customShieldName, setCustomShieldName] = useState('Escudo Customizado');
  const [customShieldDefense, setCustomShieldDefense] = useState('2');
  const [customShieldSpaces, setCustomShieldSpaces] = useState('2');
  const [customShieldCategory, setCustomShieldCategory] = useState<'0' | 'I' | 'II' | 'III' | 'IV'>('0');
  const [customShieldRd, setCustomShieldRd] = useState('0');

  // Intercepta botão de retorno físico no Android
  useEffect(() => {
    if (Platform.OS !== 'android' || typeof document !== 'undefined' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  // Sincronizar estado inicial a partir do personagem quando o modal abre
  useEffect(() => {
    if (!visible) return;
    if (!character) {
      setExtraProtections([]);
      return;
    }

    const protectionText = (character.protection || '').toLowerCase();
    const inventory = character.inventory || [];
    const allProtectionItems = inventory.filter(isProtectionInventoryEntry);

    // Tentar detectar primeira armadura corporal equipada
    let initialArmor = 'none';
    const equippedArmor = allProtectionItems.find((item) => {
      if (!item.equipped) return false;
      return !resolveProtectionInventoryEntry(item).isShield;
    });

    const parsedEquippedArmor = equippedArmor
      ? resolveProtectionInventoryEntry(equippedArmor)
      : null;

    if (equippedArmor && parsedEquippedArmor) {
      if (OFFICIAL_PROTECTIONS.some((p) => p.id === parsedEquippedArmor.prot.id)) {
        initialArmor = parsedEquippedArmor.prot.id;
      } else {
        initialArmor = 'custom';
        setCustomArmorName(parsedEquippedArmor.prot.name);
        setCustomArmorType(parsedEquippedArmor.prot.type === 'Pesada' ? 'Pesada' : 'Leve');
        setCustomArmorDefense(String(parsedEquippedArmor.prot.defenseBonus));
        setCustomArmorRd(String(parsedEquippedArmor.prot.damageReduction?.physical || 0));
        setCustomArmorSpaces(String(parsedEquippedArmor.prot.spaces || 2));
        setCustomArmorCategory(parsedEquippedArmor.prot.category || 'I');
      }
    } else if (allProtectionItems.length === 0 && protectionText) {
      if (protectionText.includes('pesada')) initialArmor = 'item__livro_base__protecao_pesada';
      else if (protectionText.includes('leve')) initialArmor = 'item__livro_base__protecao_leve';
      else if (protectionText.includes('capacete')) initialArmor = 'item__arquivos_secretos_09__capacete_tatico';
    }

    // Tentar detectar primeiro escudo equipado
    let initialShield = 'none';
    const equippedShield = allProtectionItems.find((item) => {
      if (!item.equipped || item === equippedArmor) return false;
      return resolveProtectionInventoryEntry(item).isShield;
    });

    const parsedEquippedShield = equippedShield
      ? resolveProtectionInventoryEntry(equippedShield)
      : null;

    if (equippedShield && parsedEquippedShield) {
      if (OFFICIAL_PROTECTIONS.some((p) => p.id === parsedEquippedShield.prot.id)) {
        initialShield = parsedEquippedShield.prot.id;
      } else {
        initialShield = 'custom';
        setCustomShieldName(parsedEquippedShield.prot.name);
        setCustomShieldDefense(String(parsedEquippedShield.prot.defenseBonus));
        setCustomShieldRd(String(parsedEquippedShield.prot.damageReduction?.ballistic || 0));
        setCustomShieldSpaces(String(parsedEquippedShield.prot.spaces || 2));
        setCustomShieldCategory(parsedEquippedShield.prot.category || '0');
      }
    } else if (allProtectionItems.length === 0 && protectionText) {
      if (protectionText.includes('led') || protectionText.includes('balístico')) {
        initialShield = 'item__arquivos_secretos_09__escudo_balistico_led';
      } else if (protectionText.includes('escudo')) {
        initialShield = 'item__livro_base__escudo';
      }
    }

    // Detectar modificações e maldições da proteção principal carregada no construtor
    const initialMods: string[] = [];
    const initialCurses: string[] = [];

    if (parsedEquippedArmor || parsedEquippedShield) {
      for (const m of [
        ...(parsedEquippedArmor?.mods || []),
        ...(parsedEquippedShield?.mods || []),
      ]) {
        if (!initialMods.includes(m)) initialMods.push(m);
      }
      for (const c of [
        ...(parsedEquippedArmor?.curses || []),
        ...(parsedEquippedShield?.curses || []),
      ]) {
        if (!initialCurses.includes(c)) initialCurses.push(c);
      }
    } else if (allProtectionItems.length === 0 && protectionText) {
      if (protectionText.includes('reforçada') || protectionText.includes('reforcada')) initialMods.push('Reforçada');
      if (protectionText.includes('blindada')) initialMods.push('Blindada');
      if (protectionText.includes('antibombas')) initialMods.push('Antibombas');
      if (protectionText.includes('discreta')) initialMods.push('Discreta');
      for (const curse of OFFICIAL_PROTECTION_CURSES) {
        if (protectionText.includes(curse.name.toLowerCase())) {
          initialCurses.push(curse.name);
        }
      }
    }

    // Carregar demais proteções/armaduras da ficha (ativas ou guardadas na mochila)
    const remainingSlots: ExtraProtectionSlot[] = allProtectionItems
      .filter((item) => item !== equippedArmor && item !== equippedShield)
      .map((item, idx) => {
        const parsed = resolveProtectionInventoryEntry(item);
        const isEquipped = Boolean(item.equipped);
        const payloadItem = buildPayloadItemForEntry(
          parsed.prot,
          parsed.mods,
          parsed.curses,
          isEquipped,
          item.id
        );
        return {
          id: item.id || `extra_sync_${idx}`,
          prot: parsed.prot,
          mods: parsed.mods,
          curses: parsed.curses,
          equipped: isEquipped,
          payloadItem,
        };
      });

    setBodyArmorSelection(initialArmor);
    setShieldSelection(initialShield);
    setSelectedMods(initialMods);
    setSelectedCurses(initialCurses);
    setExtraProtections(remainingSlots);
    setReplaceExisting(true);
  }, [visible, character]);

  const depotProtections = useMemo(
    () =>
      (customItems || []).filter(
        (item) => item.itemType === 'protecao' || item.itemType === 'escudo'
      ),
    [customItems]
  );

  const handleImportFromDepot = (depotItem: CustomCatalogItem) => {
    const modLabels: string[] = [];
    const curseLabels: string[] = [];
    for (const rawMod of depotItem.modifications || []) {
      const lower = rawMod.toLowerCase();
      if (lower.includes('reforç') || lower.includes('reforc')) modLabels.push('Reforçada');
      if (lower.includes('blindad')) modLabels.push('Blindada');
      if (lower.includes('antibomba')) modLabels.push('Antibombas');
      if (lower.includes('discret')) modLabels.push('Discreta');
      for (const curse of OFFICIAL_PROTECTION_CURSES) {
        if (lower === curse.id.toLowerCase() || lower.includes(curse.name.toLowerCase())) {
          if (!curseLabels.includes(curse.name)) curseLabels.push(curse.name);
        }
      }
    }

    const officialMatch = depotItem.baseItemId
      ? OFFICIAL_PROTECTIONS.find((p) => p.id === depotItem.baseItemId)
      : undefined;

    if (officialMatch) {
      if (officialMatch.type === 'Escudo') {
        setShieldSelection(officialMatch.id);
      } else {
        setBodyArmorSelection(officialMatch.id);
      }
    } else if (depotItem.itemType === 'escudo') {
      const defMatch = (depotItem.details || '').match(/Defesa\s*\+?(\d+)/i);
      const rdMatch = (depotItem.details || '').match(/RD\s*(?:Bal[íi]stico\s*)?(\d+)/i);
      setShieldSelection('custom');
      setCustomShieldName(depotItem.baseItemName || depotItem.name);
      setCustomShieldSpaces(String(depotItem.baseSpaces || depotItem.finalSpaces || 2));
      setCustomShieldCategory(depotItem.baseCategory || depotItem.finalCategory || '0');
      setCustomShieldDefense(defMatch ? defMatch[1] : '2');
      setCustomShieldRd(rdMatch ? rdMatch[1] : '0');
    } else {
      const lowerName = (depotItem.baseItemName || depotItem.name).toLowerCase();
      const isHeavy = lowerName.includes('pesad');
      const defMatch = (depotItem.details || '').match(/Defesa\s*\+?(\d+)/i);
      const rdMatch = (depotItem.details || '').match(/RD(?:\s*F[íi]sica)?\s*:?\s*(\d+)/i);
      setBodyArmorSelection('custom');
      setCustomArmorName(depotItem.baseItemName || depotItem.name);
      setCustomArmorType(isHeavy ? 'Pesada' : 'Leve');
      setCustomArmorDefense(defMatch ? defMatch[1] : isHeavy ? '10' : '5');
      setCustomArmorRd(rdMatch ? rdMatch[1] : isHeavy ? '2' : '0');
      setCustomArmorSpaces(String(depotItem.baseSpaces || depotItem.finalSpaces || (isHeavy ? 5 : 2)));
      setCustomArmorCategory(depotItem.baseCategory || depotItem.finalCategory || 'I');
    }

    setSelectedMods(modLabels);
    setSelectedCurses(curseLabels);
  };

  // Resolver armadura corporal ativa
  const effectiveBodyArmor: ProtectionItem | null = useMemo(() => {
    if (bodyArmorSelection === 'none') return null;
    if (bodyArmorSelection === 'custom') {
      const defNum = parseInt(customArmorDefense, 10) || 0;
      const spNum = Math.max(1, parseInt(customArmorSpaces, 10) || 1);
      const rdNum = parseInt(customArmorRd, 10) || 0;
      return {
        id: 'custom_armor',
        name: customArmorName.trim() || 'Colete Customizado',
        type: customArmorType,
        defenseBonus: defNum,
        spaces: spNum,
        category: customArmorCategory,
        armorPenalty: customArmorType === 'Pesada' ? -5 : 0,
        damageReduction: rdNum > 0 ? { physical: rdNum, description: `RD ${rdNum}` } : undefined,
        requiredProficiency: customArmorType === 'Pesada' ? 'Proteções Pesadas' : 'Proteções Leves',
        description: `Armadura customizada ${customArmorType.toLowerCase()}.`,
      };
    }
    return OFFICIAL_PROTECTIONS.find((p) => p.id === bodyArmorSelection) || null;
  }, [
    bodyArmorSelection,
    customArmorName,
    customArmorType,
    customArmorDefense,
    customArmorSpaces,
    customArmorCategory,
    customArmorRd,
  ]);

  // Resolver escudo ativo
  const effectiveShield: ProtectionItem | null = useMemo(() => {
    if (shieldSelection === 'none') return null;
    if (shieldSelection === 'custom') {
      const defNum = parseInt(customShieldDefense, 10) || 0;
      const spNum = Math.max(1, parseInt(customShieldSpaces, 10) || 1);
      const rdNum = parseInt(customShieldRd, 10) || 0;
      return {
        id: 'custom_shield',
        name: customShieldName.trim() || 'Escudo Customizado',
        type: 'Escudo',
        defenseBonus: defNum,
        spaces: spNum,
        category: customShieldCategory,
        damageReduction:
          rdNum > 0
            ? { ballistic: rdNum, description: `RD Balístico ${rdNum}` }
            : undefined,
        requiredProficiency: 'Proteções Pesadas',
        description: 'Escudo customizado.',
      };
    }
    return OFFICIAL_PROTECTIONS.find((p) => p.id === shieldSelection) || null;
  }, [
    shieldSelection,
    customShieldName,
    customShieldDefense,
    customShieldSpaces,
    customShieldCategory,
    customShieldRd,
  ]);

  // Filtrar modificações compatíveis com a armadura selecionada
  const activeCompatibleMods = useMemo(() => {
    if (!effectiveBodyArmor) return [];
    return selectedMods.filter((modName) => {
      if (modName === 'Blindada' || modName === 'Antibombas') {
        return effectiveBodyArmor.type === 'Pesada';
      }
      if (modName === 'Discreta') {
        return effectiveBodyArmor.type === 'Leve' && !selectedMods.includes('Reforçada');
      }
      if (modName === 'Reforçada') {
        return !selectedMods.includes('Discreta');
      }
      return true;
    });
  }, [effectiveBodyArmor, selectedMods]);

  // Cálculo canônico das proteções equipadas (incluindo múltiplas armaduras/proteções ativas)
  const calculation = useMemo(() => {
    const activeExtraEntries: EquippedProtectionEntry[] = extraProtections
      .filter((slot) => slot.equipped)
      .map((slot) => ({
        prot: slot.prot,
        mods: slot.mods,
        curses: slot.curses,
      }));

    if (activeExtraEntries.length === 0) {
      return calculateEquippedProtections(
        effectiveBodyArmor,
        effectiveShield,
        activeCompatibleMods,
        selectedCurses
      );
    }

    const allActiveEntries: EquippedProtectionEntry[] = [...activeExtraEntries];
    if (effectiveBodyArmor) {
      allActiveEntries.push({
        prot: effectiveBodyArmor,
        mods: activeCompatibleMods,
        curses: selectedCurses,
      });
    }
    if (effectiveShield) {
      allActiveEntries.push({
        prot: effectiveShield,
        mods: [],
        curses: !effectiveBodyArmor ? selectedCurses : [],
      });
    }

    return calculateMultipleEquippedProtections(allActiveEntries);
  }, [
    extraProtections,
    effectiveBodyArmor,
    effectiveShield,
    activeCompatibleMods,
    selectedCurses,
  ]);

  // Guardar proteção atual na lista de múltiplas proteções e liberar construtor para criar outra
  const handleAddCurrentToExtraList = () => {
    if (!effectiveBodyArmor && !effectiveShield) return;

    const newSlots: ExtraProtectionSlot[] = [];
    const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (effectiveBodyArmor) {
      const payloadItem = buildPayloadItemForEntry(
        effectiveBodyArmor,
        activeCompatibleMods,
        selectedCurses,
        true
      );
      newSlots.push({
        id: `extra_armor_${stamp}`,
        prot: effectiveBodyArmor,
        mods: [...activeCompatibleMods],
        curses: [...selectedCurses],
        equipped: true,
        payloadItem,
      });
    }

    if (effectiveShield) {
      const shieldCurses = !effectiveBodyArmor ? [...selectedCurses] : [];
      const payloadItem = buildPayloadItemForEntry(
        effectiveShield,
        [],
        shieldCurses,
        true
      );
      newSlots.push({
        id: `extra_shield_${stamp}`,
        prot: effectiveShield,
        mods: [],
        curses: shieldCurses,
        equipped: true,
        payloadItem,
      });
    }

    setExtraProtections((prev) => [...prev, ...newSlots]);
    setBodyArmorSelection('none');
    setShieldSelection('none');
    setSelectedMods([]);
    setSelectedCurses([]);
  };

  const handleToggleExtraSlot = (slotId: string) => {
    setExtraProtections((prev) =>
      prev.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              equipped: !slot.equipped,
              payloadItem: {
                ...slot.payloadItem,
                equipped: !slot.equipped,
              },
            }
          : slot
      )
    );
  };

  const handleRemoveExtraSlot = (slotId: string) => {
    setExtraProtections((prev) => prev.filter((slot) => slot.id !== slotId));
  };

  // Alternar modificações
  const toggleModification = (modName: string) => {
    if (selectedMods.includes(modName)) {
      setSelectedMods(selectedMods.filter((m) => m !== modName));
    } else {
      let next = [...selectedMods, modName];
      // Incompatibilidade canônica: Reforçada x Discreta
      if (modName === 'Reforçada') {
        next = next.filter((m) => m !== 'Discreta');
      } else if (modName === 'Discreta') {
        next = next.filter((m) => m !== 'Reforçada');
      }
      setSelectedMods(next);
    }
  };

  // Alternar maldições validando elementos opressivos
  const toggleCurse = (curseName: string) => {
    if (selectedCurses.includes(curseName)) {
      setSelectedCurses((prev) => prev.filter((c) => c !== curseName));
      return;
    }
    const targetCurse = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === curseName);
    if (!targetCurse) return;

    const conflictingName = selectedCurses.find((existingName) => {
      const existing = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === existingName);
      return existing ? areElementsIncompatible(existing.element, targetCurse.element) : false;
    });

    if (conflictingName) {
      const existing = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === conflictingName);
      showAlert(
        'Elementos Opressivos',
        `A maldição "${targetCurse.name}" (${targetCurse.element}) não pode coexistir com "${conflictingName}" (${existing?.element}) segundo o Livro Base (p. 111 / p. 154).`
      );
      return;
    }

    setSelectedCurses((prev) => [...prev, curseName]);
  };

  // Salvar configuração atual no Depósito da Armaria
  const handleSaveToDepot = async () => {
    const primaryItem = effectiveBodyArmor || effectiveShield;
    if (!primaryItem) {
      showAlert('Selecione uma Proteção', 'Escolha uma proteção corporal ou escudo para salvar no Depósito.');
      return;
    }
    const isShieldOnly = !effectiveBodyArmor && Boolean(effectiveShield);
    const modsForArmor = isShieldOnly ? [] : activeCompatibleMods;
    const curseIncrease = calculateCurseCategoryIncrease(selectedCurses.length);
    let modSpacesDelta = 0;
    if (!isShieldOnly) {
      if (modsForArmor.includes('Reforçada')) modSpacesDelta += 1;
      if (modsForArmor.includes('Blindada')) modSpacesDelta += 1;
      if (modsForArmor.includes('Discreta')) modSpacesDelta -= 1;
    }
    const finalSpaces = Math.max(1, primaryItem.spaces + modSpacesDelta);
    const finalCat = increaseCategory(primaryItem.category, modsForArmor.length + curseIncrease);
    const suffixParts = [...modsForArmor, ...selectedCurses];
    const displayName =
      suffixParts.length > 0 ? `${primaryItem.name} (${suffixParts.join(', ')})` : primaryItem.name;

    const modIds = [
      ...modsForArmor.map((m) => `mod__${m.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`),
      ...selectedCurses
        .map((cName) => OFFICIAL_PROTECTION_CURSES.find((c) => c.name === cName)?.id)
        .filter((id): id is string => Boolean(id)),
    ];

    const firstCurseObj = OFFICIAL_PROTECTION_CURSES.find((c) => c.name === selectedCurses[0]);
    const now = new Date().toISOString();
    const depotItem: CustomCatalogItem = {
      id: `citem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: displayName,
      baseItemId: primaryItem.id,
      baseItemName: primaryItem.name,
      itemType: isShieldOnly ? 'escudo' : 'protecao',
      subCategoryGroup: selectedCurses.length > 0 ? 'amaldicoado' : 'protecao',
      baseCategory: primaryItem.category,
      baseSpaces: primaryItem.spaces,
      finalCategory: finalCat,
      finalSpaces,
      details: calculation.protectionText || primaryItem.description || '',
      element: firstCurseObj?.element || 'Nenhum',
      modifications: modIds,
      createdAt: now,
      updatedAt: now,
    };

    await upsertCustomItem(depotItem);
    showAlert('Salvo no Depósito', `"${displayName}" foi salvo no Depósito da Armaria.`);
  };

  // Desequipar tudo
  const handleClearAll = () => {
    setBodyArmorSelection('none');
    setShieldSelection('none');
    setSelectedMods([]);
    setSelectedCurses([]);
    setExtraProtections([]);
  };

  // Equipar e aplicar alterações na ficha
  const handleConfirm = () => {
    const equippedItems: EquippedProtectionItemPayload[] = extraProtections.map((slot) => ({
      ...slot.payloadItem,
      equipped: slot.equipped,
    }));

    // Armadura corporal atual do construtor
    if (effectiveBodyArmor) {
      equippedItems.push(
        buildPayloadItemForEntry(
          effectiveBodyArmor,
          activeCompatibleMods,
          selectedCurses,
          true
        )
      );
    }

    // Escudo atual do construtor
    if (effectiveShield) {
      const cursesOnShield = !effectiveBodyArmor ? selectedCurses : [];
      equippedItems.push(
        buildPayloadItemForEntry(effectiveShield, [], cursesOnShield, true)
      );
    }

    onApply({
      defenseEquip: calculation.totalDefenseEquip,
      resistancesText: calculation.resistancesText,
      protectionText: calculation.protectionText,
      equippedItems,
      armorPenalty: calculation.armorPenalty,
      totalSpaces: calculation.totalSpaces,
      ...(replaceExisting === false ? { replaceExisting: false } : {}),
    });
  };

  if (!visible) return null;

  const isLeveSelected = effectiveBodyArmor?.type === 'Leve';
  const isPesadaSelected = effectiveBodyArmor?.type === 'Pesada';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer} testID="protection-modal">
          {/* Cabeçalho Fixo */}
          <View
            style={[
              styles.header,
              Platform.OS !== 'web' && {
                paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 14),
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>Assistente de Proteções</Text>
                <Text style={styles.headerSubtitle}>
                  Selecione armaduras, escudos e modificações táticas oficiais
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              testID="btn-close-modal"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Conteúdo com Scroll */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
            {/* IMPORTAÇÃO DO DEPÓSITO DA ARMARIA */}
            {depotProtections.length > 0 && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="archive-outline" size={16} color={colors.warning} />
                  <Text style={styles.sectionTitle}>Importar do Depósito ({depotProtections.length})</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingTop: 4 }}
                >
                  {depotProtections.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.depotImportChip}
                      onPress={() => handleImportFromDepot(item)}
                      testID={`btn-import-depot-${item.id}`}
                    >
                      <Text style={styles.depotImportTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.depotImportMeta}>
                        Cat {item.finalCategory} • {item.finalSpaces} esp.
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* PROTEÇÕES ADICIONAIS NA FICHA (MÚLTIPLAS ARMADURAS) */}
            {extraProtections.length > 0 && (
              <View style={styles.sectionBox} testID="extra-protections-section">
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="layers-outline" size={16} color="#38BDF8" />
                  <Text style={styles.sectionTitle}>
                    Proteções na Ficha ({extraProtections.length})
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Todas marcadas como "Ativa na Defesa" somam automaticamente na Defesa e RD.
                </Text>

                <View style={styles.extraSlotsList}>
                  {extraProtections.map((slot, idx) => (
                    <View
                      key={slot.id}
                      style={[
                        styles.extraSlotCard,
                        slot.equipped && styles.extraSlotCardActive,
                      ]}
                      testID={`extra-prot-slot-${idx}`}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.extraSlotTitleRow}>
                          <Text style={styles.extraSlotTitle} numberOfLines={2}>
                            {slot.payloadItem.name}
                          </Text>
                          <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText}>
                              Cat {slot.payloadItem.category}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.extraSlotMeta}>
                          {slot.payloadItem.spaces} esp. • {slot.payloadItem.details}
                        </Text>
                      </View>

                      <View style={styles.extraSlotActions}>
                        <TouchableOpacity
                          style={[
                            styles.extraSlotToggleBtn,
                            slot.equipped
                              ? styles.extraSlotToggleBtnActive
                              : styles.extraSlotToggleBtnInactive,
                          ]}
                          onPress={() => handleToggleExtraSlot(slot.id)}
                          testID={`btn-toggle-extra-prot-${idx}`}
                        >
                          <Ionicons
                            name={slot.equipped ? 'shield-checkmark' : 'briefcase-outline'}
                            size={13}
                            color={slot.equipped ? '#10B981' : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.extraSlotToggleText,
                              { color: slot.equipped ? '#10B981' : colors.textSecondary },
                            ]}
                          >
                            {slot.equipped ? 'Ativa na Defesa' : 'Na Mochila'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.extraSlotRemoveBtn}
                          onPress={() => handleRemoveExtraSlot(slot.id)}
                          testID={`btn-remove-extra-prot-${idx}`}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={`Remover ${slot.payloadItem.name}`}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* SEÇÃO 1: PROTEÇÃO CORPORAL */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shirt-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionTitle}>1. Proteção Corporal</Text>
              </View>

              <View style={styles.optionsGrid}>
                {/* Opção Nenhuma */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    bodyArmorSelection === 'none' && styles.optionCardActive,
                  ]}
                  onPress={() => setBodyArmorSelection('none')}
                  testID="btn-armor-none"
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      bodyArmorSelection === 'none' && styles.optionTitleActive,
                    ]}
                  >
                    Nenhuma
                  </Text>
                  <Text style={styles.optionDetail}>Sem proteção corporal</Text>
                </TouchableOpacity>

                {/* Opção Proteção Leve */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    bodyArmorSelection === 'item__livro_base__protecao_leve' &&
                      styles.optionCardActive,
                  ]}
                  onPress={() => setBodyArmorSelection('item__livro_base__protecao_leve')}
                  testID="btn-armor-leve"
                >
                  <View style={styles.optionTitleRow}>
                    <Text
                      style={[
                        styles.optionTitle,
                        bodyArmorSelection === 'item__livro_base__protecao_leve' &&
                          styles.optionTitleActive,
                      ]}
                    >
                      Proteção Leve
                    </Text>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>Cat I</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDetail}>+5 Defesa • 2 espaços</Text>
                </TouchableOpacity>

                {/* Opção Proteção Pesada */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    bodyArmorSelection === 'item__livro_base__protecao_pesada' &&
                      styles.optionCardActive,
                  ]}
                  onPress={() => setBodyArmorSelection('item__livro_base__protecao_pesada')}
                  testID="btn-armor-pesada"
                >
                  <View style={styles.optionTitleRow}>
                    <Text
                      style={[
                        styles.optionTitle,
                        bodyArmorSelection === 'item__livro_base__protecao_pesada' &&
                          styles.optionTitleActive,
                      ]}
                    >
                      Proteção Pesada
                    </Text>
                    <View style={[styles.catBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                      <Text style={[styles.catBadgeText, { color: '#EF4444' }]}>Cat II</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDetail}>
                    +10 Defesa • 5 esp. • RD 2 física • –5 em carga
                  </Text>
                </TouchableOpacity>

                {/* Opção Capacete Tático */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    bodyArmorSelection === 'item__arquivos_secretos_09__capacete_tatico' &&
                      styles.optionCardActive,
                  ]}
                  onPress={() =>
                    setBodyArmorSelection('item__arquivos_secretos_09__capacete_tatico')
                  }
                  testID="btn-armor-capacete"
                >
                  <View style={styles.optionTitleRow}>
                    <Text
                      style={[
                        styles.optionTitle,
                        bodyArmorSelection ===
                          'item__arquivos_secretos_09__capacete_tatico' &&
                          styles.optionTitleActive,
                      ]}
                    >
                      Capacete Tático
                    </Text>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>Cat II</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDetail}>1 esp. • Fortificação 25% (pesada)</Text>
                </TouchableOpacity>

                {/* Opção Customizada */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    bodyArmorSelection === 'custom' && styles.optionCardActive,
                  ]}
                  onPress={() => setBodyArmorSelection('custom')}
                  testID="btn-armor-custom"
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      bodyArmorSelection === 'custom' && styles.optionTitleActive,
                    ]}
                  >
                    Customizada...
                  </Text>
                  <Text style={styles.optionDetail}>Armadura personalizada / homebrew</Text>
                </TouchableOpacity>
              </View>

              {/* Formulário de Armadura Customizada */}
              {bodyArmorSelection === 'custom' && (
                <View style={styles.customFormContainer}>
                  <Text style={styles.customFormHeading}>Configurar Armadura Customizada</Text>
                  <View style={{ gap: 8 }}>
                    <View>
                      <Text style={styles.inputLabel}>Nome da Proteção</Text>
                      <TextInput
                        style={styles.input}
                        value={customArmorName}
                        onChangeText={setCustomArmorName}
                        placeholder="Ex: Colete Tático Especial"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-armor-name"
                      />
                    </View>
                    <View>
                      <Text style={styles.inputLabel}>Tipo</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[
                            styles.typeChip,
                            customArmorType === 'Leve' && styles.typeChipActive,
                          ]}
                          onPress={() => setCustomArmorType('Leve')}
                        >
                          <Text
                            style={[
                              styles.typeChipText,
                              customArmorType === 'Leve' && styles.typeChipTextActive,
                            ]}
                          >
                            Leve
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.typeChip,
                            customArmorType === 'Pesada' && styles.typeChipActive,
                          ]}
                          onPress={() => setCustomArmorType('Pesada')}
                        >
                          <Text
                            style={[
                              styles.typeChipText,
                              customArmorType === 'Pesada' && styles.typeChipTextActive,
                            ]}
                          >
                            Pesada
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.formRow, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Bônus Defesa</Text>
                      <TextInput
                        style={styles.input}
                        value={customArmorDefense}
                        onChangeText={setCustomArmorDefense}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-armor-defense"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>RD Física</Text>
                      <TextInput
                        style={styles.input}
                        value={customArmorRd}
                        onChangeText={setCustomArmorRd}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-armor-rd"
                      />
                    </View>
                  </View>

                  <View style={[styles.formRow, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Espaços</Text>
                      <TextInput
                        style={styles.input}
                        value={customArmorSpaces}
                        onChangeText={setCustomArmorSpaces}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-armor-spaces"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Cat.</Text>
                      <TextInput
                        style={styles.input}
                        value={customArmorCategory}
                        onChangeText={(v) =>
                          setCustomArmorCategory((v.toUpperCase() as any) || 'I')
                        }
                        placeholder="I"
                        placeholderTextColor={colors.textMuted}
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* SEÇÃO 2: MODIFICAÇÕES DE ARMADURA */}
            {effectiveBodyArmor && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="construct-outline" size={16} color={colors.warning} />
                  <Text style={styles.sectionTitle}>
                    2. Modificações para {effectiveBodyArmor.name}
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Cada modificação adiciona +I Categoria e adapta bônus/espaços da armadura.
                </Text>

                <View style={styles.modsGrid}>
                  {/* Reforçada */}
                  <TouchableOpacity
                    style={[
                      styles.modPill,
                      activeCompatibleMods.includes('Reforçada') && styles.modPillActive,
                      selectedMods.includes('Discreta') && styles.modPillDisabled,
                    ]}
                    onPress={() => toggleModification('Reforçada')}
                    testID="mod-reforcada"
                  >
                    <View style={styles.modCheckbox}>
                      {activeCompatibleMods.includes('Reforçada') && (
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modTitle,
                          activeCompatibleMods.includes('Reforçada') && styles.modTitleActive,
                        ]}
                      >
                        Reforçada
                      </Text>
                      <Text style={styles.modDesc}>+2 Defesa • +1 Espaço • +I Cat</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Blindada (apenas Pesada) */}
                  {isPesadaSelected && (
                    <TouchableOpacity
                      style={[
                        styles.modPill,
                        activeCompatibleMods.includes('Blindada') && styles.modPillActive,
                      ]}
                      onPress={() => toggleModification('Blindada')}
                      testID="mod-blindada"
                    >
                      <View style={styles.modCheckbox}>
                        {activeCompatibleMods.includes('Blindada') && (
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.modTitle,
                            activeCompatibleMods.includes('Blindada') && styles.modTitleActive,
                          ]}
                        >
                          Blindada
                        </Text>
                        <Text style={styles.modDesc}>
                          RD física sobe para 5 • +1 Espaço • +I Cat
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Antibombas (apenas Pesada) */}
                  {isPesadaSelected && (
                    <TouchableOpacity
                      style={[
                        styles.modPill,
                        activeCompatibleMods.includes('Antibombas') && styles.modPillActive,
                      ]}
                      onPress={() => toggleModification('Antibombas')}
                      testID="mod-antibombas"
                    >
                      <View style={styles.modCheckbox}>
                        {activeCompatibleMods.includes('Antibombas') && (
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.modTitle,
                            activeCompatibleMods.includes('Antibombas') && styles.modTitleActive,
                          ]}
                        >
                          Antibombas
                        </Text>
                        <Text style={styles.modDesc}>
                          +5 em testes contra área • +I Cat
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Discreta (apenas Leve) */}
                  {isLeveSelected && (
                    <TouchableOpacity
                      style={[
                        styles.modPill,
                        activeCompatibleMods.includes('Discreta') && styles.modPillActive,
                        selectedMods.includes('Reforçada') && styles.modPillDisabled,
                      ]}
                      onPress={() => toggleModification('Discreta')}
                      testID="mod-discreta"
                    >
                      <View style={styles.modCheckbox}>
                        {activeCompatibleMods.includes('Discreta') && (
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.modTitle,
                            activeCompatibleMods.includes('Discreta') && styles.modTitleActive,
                          ]}
                        >
                          Discreta
                        </Text>
                        <Text style={styles.modDesc}>
                          –1 Espaço (mín. 1) • +5 Crime • +I Cat
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* SEÇÃO 3: ESCUDO */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shield-outline" size={16} color="#38BDF8" />
                <Text style={styles.sectionTitle}>3. Escudo Tático</Text>
              </View>

              <View style={styles.optionsGrid}>
                {/* Opção Nenhum */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    shieldSelection === 'none' && styles.optionCardActive,
                  ]}
                  onPress={() => setShieldSelection('none')}
                  testID="btn-shield-none"
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      shieldSelection === 'none' && styles.optionTitleActive,
                    ]}
                  >
                    Nenhum
                  </Text>
                  <Text style={styles.optionDetail}>Sem escudo empunhado</Text>
                </TouchableOpacity>

                {/* Opção Escudo Padrão */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    shieldSelection === 'item__livro_base__escudo' && styles.optionCardActive,
                  ]}
                  onPress={() => setShieldSelection('item__livro_base__escudo')}
                  testID="btn-shield-escudo"
                >
                  <View style={styles.optionTitleRow}>
                    <Text
                      style={[
                        styles.optionTitle,
                        shieldSelection === 'item__livro_base__escudo' && styles.optionTitleActive,
                      ]}
                    >
                      Escudo
                    </Text>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>Cat 0</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDetail}>
                    +2 Defesa • 2 espaços • conta como Pesada
                  </Text>
                </TouchableOpacity>

                {/* Opção Escudo Balístico LED */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    shieldSelection === 'item__arquivos_secretos_09__escudo_balistico_led' &&
                      styles.optionCardActive,
                  ]}
                  onPress={() =>
                    setShieldSelection('item__arquivos_secretos_09__escudo_balistico_led')
                  }
                  testID="btn-shield-escudo-led"
                >
                  <View style={styles.optionTitleRow}>
                    <Text
                      style={[
                        styles.optionTitle,
                        shieldSelection ===
                          'item__arquivos_secretos_09__escudo_balistico_led' &&
                          styles.optionTitleActive,
                      ]}
                    >
                      Escudo Balístico LED
                    </Text>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>Cat II</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDetail}>
                    +2 Defesa • 2 esp. • RD Balístico 10 • Lanterna
                  </Text>
                </TouchableOpacity>

                {/* Opção Escudo Customizado */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    shieldSelection === 'custom' && styles.optionCardActive,
                  ]}
                  onPress={() => setShieldSelection('custom')}
                  testID="btn-shield-custom"
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      shieldSelection === 'custom' && styles.optionTitleActive,
                    ]}
                  >
                    Customizado...
                  </Text>
                  <Text style={styles.optionDetail}>Escudo personalizado / modificado</Text>
                </TouchableOpacity>
              </View>

              {/* Formulário de Escudo Customizado */}
              {shieldSelection === 'custom' && (
                <View style={styles.customFormContainer}>
                  <Text style={styles.customFormHeading}>Configurar Escudo Customizado</Text>
                  <View style={styles.formRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.inputLabel}>Nome do Escudo</Text>
                      <TextInput
                        style={styles.input}
                        value={customShieldName}
                        onChangeText={setCustomShieldName}
                        placeholder="Ex: Escudo Tático Pesado"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-shield-name"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Cat.</Text>
                      <TextInput
                        style={styles.input}
                        value={customShieldCategory}
                        onChangeText={(v) =>
                          setCustomShieldCategory((v.toUpperCase() as any) || '0')
                        }
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        maxLength={3}
                      />
                    </View>
                  </View>

                  <View style={[styles.formRow, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Bônus Defesa</Text>
                      <TextInput
                        style={styles.input}
                        value={customShieldDefense}
                        onChangeText={setCustomShieldDefense}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-shield-defense"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>RD (Balístico)</Text>
                      <TextInput
                        style={styles.input}
                        value={customShieldRd}
                        onChangeText={setCustomShieldRd}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-shield-rd"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Espaços</Text>
                      <TextInput
                        style={styles.input}
                        value={customShieldSpaces}
                        onChangeText={setCustomShieldSpaces}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor={colors.textMuted}
                        testID="input-custom-shield-spaces"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* SEÇÃO 2B: MALDIÇÕES PARANORMAIS PARA PROTEÇÕES & ESCUDOS */}
            {(effectiveBodyArmor || effectiveShield) && (
              <View style={styles.sectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="flame-outline" size={16} color="#A855F7" />
                  <Text style={styles.sectionTitle}>
                    Maldições Paranormais ({effectiveBodyArmor ? effectiveBodyArmor.name : effectiveShield?.name})
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Livro Base p. 154/156-157: +II Cat na 1ª maldição, +I Cat nas seguintes. Elementos opressores não coexistem.
                </Text>

                <View style={styles.modsGrid}>
                  {OFFICIAL_PROTECTION_CURSES.map((curse) => {
                    const active = selectedCurses.includes(curse.name);
                    const incompatible =
                      !active &&
                      selectedCurses.some((existingName) => {
                        const existing = OFFICIAL_PROTECTION_CURSES.find(
                          (c) => c.name === existingName
                        );
                        return existing
                          ? areElementsIncompatible(existing.element, curse.element)
                          : false;
                      });
                    const elColor = getCurseElementColor(curse.element, colors);
                    return (
                      <TouchableOpacity
                        key={curse.id}
                        style={[
                          styles.modPill,
                          active && {
                            borderColor: elColor,
                            backgroundColor: 'rgba(168, 85, 247, 0.08)',
                          },
                          incompatible && styles.modPillDisabled,
                        ]}
                        onPress={() => toggleCurse(curse.name)}
                        testID={`curse-${curse.id}`}
                      >
                        <View style={styles.modCheckbox}>
                          {active && <Ionicons name="checkmark" size={14} color={elColor} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text
                              style={[
                                styles.modTitle,
                                { flexShrink: 1 },
                                active && { color: elColor },
                              ]}
                            >
                              {curse.name}
                            </Text>
                            <View
                              style={[
                                styles.catBadge,
                                { borderWidth: 1, borderColor: elColor },
                              ]}
                            >
                              <Text style={[styles.catBadgeText, { color: elColor }]}>
                                {curse.element}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.modDesc}>{curse.description}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* BOTÃO PARA ADICIONAR PROTEÇÃO ATUAL À LISTA E CRIAR OUTRA ARMADURA */}
            {(effectiveBodyArmor || effectiveShield) && (
              <TouchableOpacity
                style={styles.addExtraProtectionCard}
                onPress={handleAddCurrentToExtraList}
                testID="btn-add-extra-protection"
              >
                <View style={styles.addExtraProtectionRow}>
                  <Ionicons name="add-circle-outline" size={18} color="#38BDF8" />
                  <Text style={styles.addExtraProtectionTitle}>
                    Guardar Esta e Criar Outra Armadura / Escudo
                  </Text>
                </View>
                <Text style={styles.addExtraProtectionSubtitle}>
                  Mantém a seleção acima ativa na Defesa da ficha e limpa o editor para adicionar mais uma proteção.
                </Text>
              </TouchableOpacity>
            )}

            {/* SEÇÃO 4: RESUMO DOS CÁLCULOS TÁTICOS */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeaderRow}>
                <Ionicons name="analytics-outline" size={16} color="#38BDF8" />
                <Text style={styles.previewTitle}>
                  Resumo Tático dos Cálculos
                  {extraProtections.some((s) => s.equipped)
                    ? ` (${
                        extraProtections.filter((s) => s.equipped).length +
                        (effectiveBodyArmor ? 1 : 0) +
                        (effectiveShield ? 1 : 0)
                      } ativas)`
                    : ''}
                </Text>
              </View>

              <View style={styles.previewGrid}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>DEFESA (EQUIPAMENTO)</Text>
                  <Text style={styles.previewValueDefense} testID="preview-defense">
                    +{calculation.totalDefenseEquip}
                  </Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>CARGA NO INVENTÁRIO</Text>
                  <Text style={styles.previewValue} testID="preview-spaces">
                    {calculation.totalSpaces} esp.
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.previewLabel}>RESISTÊNCIAS A DANO (RD)</Text>
                <Text style={styles.previewRdText} testID="preview-resistances">
                  {calculation.resistancesText || 'Nenhuma RD ativa'}
                </Text>
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={styles.previewLabel}>DESCRIÇÃO REGISTRADA</Text>
                <Text style={styles.previewDescText} testID="preview-text">
                  {calculation.protectionText || 'Nenhuma proteção equipada'}
                </Text>
              </View>

              {calculation.armorPenalty < 0 && (
                <View style={styles.penaltyAlertRow}>
                  <Ionicons name="warning-outline" size={14} color="#EF4444" />
                  <Text style={styles.penaltyAlertText}>
                    Penalidade de Carga: {calculation.armorPenalty} em Acrobacia, Crime e
                    Furtividade.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.replaceToggleRow}
                onPress={() => setReplaceExisting((prev) => !prev)}
                testID="toggle-replace-protection"
              >
                <Ionicons
                  name={replaceExisting ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={replaceExisting ? colors.elements.Medo.text : colors.textSecondary}
                />
                <Text style={styles.replaceToggleText}>
                  Substituir proteção equipada anteriormente (desmarque p/ guardar extras no inventário)
                </Text>
              </TouchableOpacity>

              {(effectiveBodyArmor || effectiveShield) && (
                <TouchableOpacity
                  style={styles.saveDepotBtn}
                  onPress={handleSaveToDepot}
                  testID="btn-save-protection-depot"
                >
                  <Ionicons name="archive-outline" size={14} color={colors.warning} />
                  <Text style={styles.saveDepotBtnText}>Salvar Configuração no Depósito</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Rodapé Fixo com Ações */}
          <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 12 : Math.max(12, insets.bottom) }]}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearAll}
              testID="btn-clear-protections"
            >
              <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.clearBtnText}>Desequipar Tudo</Text>
            </TouchableOpacity>

            <View style={styles.footerRight}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleConfirm}
                testID="btn-apply-protections"
              >
                <Ionicons name="checkmark-sharp" size={16} color="#0B1120" />
                <Text style={styles.applyBtnText}>Equipar e Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 0,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 620,
      maxHeight: Platform.OS === 'web' ? '92%' : '100%',
      backgroundColor: colors.surface,
      borderRadius: Platform.OS === 'web' ? 14 : 0,
      flex: Platform.OS === 'web' ? undefined : 1,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    headerIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: 'rgba(56, 189, 248, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#38BDF8',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: colors.surfaceHighlight,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    sectionBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      flex: 1,
      flexShrink: 1,
    },
    sectionSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    optionsGrid: {
      gap: 8,
    },
    optionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },
    optionCardActive: {
      borderColor: '#38BDF8',
      backgroundColor: 'rgba(56, 189, 248, 0.08)',
    },
    optionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    optionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      flexShrink: 1,
    },
    optionTitleActive: {
      color: '#38BDF8',
    },
    optionDetail: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    catBadge: {
      backgroundColor: colors.surfaceHighlight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    catBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    customFormContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    customFormHeading: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    formRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    inputLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      fontSize: 12,
      color: colors.text,
    },
    typeChip: {
      flex: 1,
      paddingVertical: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      alignItems: 'center',
    },
    typeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    typeChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    typeChipTextActive: {
      color: colors.primary,
    },
    modsGrid: {
      gap: 8,
    },
    modPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
    },
    modPillActive: {
      borderColor: colors.warning,
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
    },
    modPillDisabled: {
      opacity: 0.4,
    },
    modCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceElevated,
    },
    modTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    modTitleActive: {
      color: colors.warning,
    },
    modDesc: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
    },
    previewBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.elements.Medo.border,
      padding: 14,
    },
    previewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.elements.Medo.border,
      paddingBottom: 6,
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.elements.Medo.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    previewGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    previewItem: {
      flex: 1,
    },
    previewLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    previewValueDefense: {
      fontSize: 20,
      fontWeight: '900',
      color: colors.elements.Medo.text,
    },
    previewValue: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    previewRdText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.warning,
    },
    previewDescText: {
      fontSize: 11,
      color: colors.text,
      lineHeight: 16,
    },
    penaltyAlertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      padding: 8,
      borderRadius: 6,
      marginTop: 10,
    },
    penaltyAlertText: {
      fontSize: 11,
      color: '#EF4444',
      fontWeight: '600',
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      gap: 8,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 6,
    },
    clearBtnText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    footerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
    },
    cancelBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: colors.surfaceHighlight,
    },
    cancelBtnText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    applyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: '#38BDF8',
      flexShrink: 1,
    },
    applyBtnText: {
      fontSize: 11,
      color: '#0B1120',
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    depotImportChip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.warning,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      maxWidth: 180,
    },
    depotImportTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    depotImportMeta: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 1,
    },
    replaceToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.elements.Medo.border,
    },
    replaceToggleText: {
      fontSize: 11,
      color: colors.textSecondary,
      flex: 1,
    },
    saveDepotBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    saveDepotBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warning,
      textTransform: 'uppercase',
    },
    extraSlotsList: {
      gap: 8,
    },
    extraSlotCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      gap: 8,
    },
    extraSlotCardActive: {
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
    },
    extraSlotTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    extraSlotTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      flexShrink: 1,
    },
    extraSlotMeta: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    extraSlotActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    extraSlotToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
    },
    extraSlotToggleBtnActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderColor: '#10B981',
    },
    extraSlotToggleBtnInactive: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.border,
    },
    extraSlotToggleText: {
      fontSize: 11,
      fontWeight: '700',
    },
    extraSlotRemoveBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    addExtraProtectionCard: {
      backgroundColor: 'rgba(56, 189, 248, 0.08)',
      borderWidth: 1,
      borderColor: '#38BDF8',
      borderStyle: 'dashed',
      borderRadius: 10,
      padding: 12,
      gap: 4,
    },
    addExtraProtectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addExtraProtectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#38BDF8',
      textTransform: 'uppercase',
      flex: 1,
      flexShrink: 1,
    },
    addExtraProtectionSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 15,
    },
  });
