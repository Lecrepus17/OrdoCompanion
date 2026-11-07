import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
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
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { CharacterSheet, CharacterInventoryItem } from '../types/compendium';
import {
  OFFICIAL_PROTECTIONS,
  OFFICIAL_PROTECTION_MODIFICATIONS,
  ProtectionItem,
  calculateEquippedProtections,
} from '../utils/protections';

export interface EquippedProtectionItemPayload {
  name: string;
  category: '0' | 'I' | 'II' | 'III' | 'IV';
  spaces: number;
  details: string;
  itemType: 'protecao' | 'escudo';
  isBodyArmor?: boolean;
  isShield?: boolean;
}

export interface ProtectionApplyPayload {
  defenseEquip: number;
  resistancesText: string;
  protectionText: string;
  equippedItems: EquippedProtectionItemPayload[];
  armorPenalty: number;
  totalSpaces: number;
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

export default function ProtectionModal({
  visible,
  onClose,
  onApply,
  character,
}: ProtectionModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  // Estados de seleção
  const [bodyArmorSelection, setBodyArmorSelection] = useState<string>('none');
  const [shieldSelection, setShieldSelection] = useState<string>('none');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);

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
    if (Platform.OS === 'web' || typeof document !== 'undefined' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  // Sincronizar estado inicial a partir do personagem quando o modal abre
  useEffect(() => {
    if (!visible || !character) return;

    const protectionText = (character.protection || '').toLowerCase();
    const inventory = character.inventory || [];

    // Tentar detectar armadura corporal existente
    let initialArmor = 'none';
    const equippedArmor = inventory.find(
      (item) =>
        item.equipped &&
        (item.itemType === 'protecao' ||
          item.name.toLowerCase().includes('proteção') ||
          item.name.toLowerCase().includes('capacete'))
    );

    if (equippedArmor) {
      const n = equippedArmor.name.toLowerCase();
      if (n.includes('pesada')) initialArmor = 'item__livro_base__protecao_pesada';
      else if (n.includes('leve')) initialArmor = 'item__livro_base__protecao_leve';
      else if (n.includes('capacete')) initialArmor = 'item__arquivos_secretos_09__capacete_tatico';
      else {
        initialArmor = 'custom';
        setCustomArmorName(equippedArmor.name);
        setCustomArmorSpaces(String(equippedArmor.spaces || 2));
        setCustomArmorCategory(equippedArmor.category || 'I');
      }
    } else if (protectionText) {
      if (protectionText.includes('pesada')) initialArmor = 'item__livro_base__protecao_pesada';
      else if (protectionText.includes('leve')) initialArmor = 'item__livro_base__protecao_leve';
      else if (protectionText.includes('capacete')) initialArmor = 'item__arquivos_secretos_09__capacete_tatico';
    }

    // Tentar detectar escudo existente
    let initialShield = 'none';
    const equippedShield = inventory.find(
      (item) =>
        item.equipped &&
        (item.itemType === 'escudo' || item.name.toLowerCase().includes('escudo'))
    );

    if (equippedShield) {
      const n = equippedShield.name.toLowerCase();
      if (n.includes('led') || n.includes('balístico') || n.includes('balistico')) {
        initialShield = 'item__arquivos_secretos_09__escudo_balistico_led';
      } else if (n.includes('escudo')) {
        initialShield = 'item__livro_base__escudo';
      } else {
        initialShield = 'custom';
        setCustomShieldName(equippedShield.name);
        setCustomShieldSpaces(String(equippedShield.spaces || 2));
        setCustomShieldCategory(equippedShield.category || '0');
      }
    } else if (protectionText) {
      if (protectionText.includes('led') || protectionText.includes('balístico')) {
        initialShield = 'item__arquivos_secretos_09__escudo_balistico_led';
      } else if (protectionText.includes('escudo')) {
        initialShield = 'item__livro_base__escudo';
      }
    }

    // Detectar modificações
    const initialMods: string[] = [];
    if (protectionText.includes('reforçada') || protectionText.includes('reforcada')) initialMods.push('Reforçada');
    if (protectionText.includes('blindada')) initialMods.push('Blindada');
    if (protectionText.includes('antibombas')) initialMods.push('Antibombas');
    if (protectionText.includes('discreta')) initialMods.push('Discreta');

    setBodyArmorSelection(initialArmor);
    setShieldSelection(initialShield);
    setSelectedMods(initialMods);
  }, [visible, character]);

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
            ? { ballistic: rdNum, physical: rdNum, description: `RD ${rdNum}` }
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

  // Cálculo canônico das proteções equipadas
  const calculation = useMemo(() => {
    return calculateEquippedProtections(
      effectiveBodyArmor,
      effectiveShield,
      activeCompatibleMods
    );
  }, [effectiveBodyArmor, effectiveShield, activeCompatibleMods]);

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

  // Desequipar tudo
  const handleClearAll = () => {
    setBodyArmorSelection('none');
    setShieldSelection('none');
    setSelectedMods([]);
  };

  // Equipar e aplicar alterações na ficha
  const handleConfirm = () => {
    const equippedItems: EquippedProtectionItemPayload[] = [];

    // Armadura corporal
    if (effectiveBodyArmor) {
      let catIncrease = 0;
      if (activeCompatibleMods.includes('Reforçada')) catIncrease += 1;
      if (activeCompatibleMods.includes('Blindada')) catIncrease += 1;
      if (activeCompatibleMods.includes('Antibombas')) catIncrease += 1;
      if (activeCompatibleMods.includes('Discreta')) catIncrease += 1;

      const finalCat = increaseCategory(effectiveBodyArmor.category, catIncrease);

      // Calcular espaços específicos da armadura
      let armorSpaces = effectiveBodyArmor.spaces;
      if (activeCompatibleMods.includes('Reforçada')) armorSpaces += 1;
      if (activeCompatibleMods.includes('Blindada')) armorSpaces += 1;
      if (activeCompatibleMods.includes('Discreta')) armorSpaces = Math.max(1, armorSpaces - 1);

      const modsSuffix =
        activeCompatibleMods.length > 0 ? ` (${activeCompatibleMods.join(', ')})` : '';

      equippedItems.push({
        name: `${effectiveBodyArmor.name}${modsSuffix}`,
        category: finalCat,
        spaces: armorSpaces,
        details: `Proteção Corporal (${effectiveBodyArmor.type}) • Defesa +${
          effectiveBodyArmor.defenseBonus +
          (activeCompatibleMods.includes('Reforçada') ? 2 : 0)
        }${calculation.resistancesText ? ` • RD: ${calculation.resistancesText}` : ''}`,
        itemType: 'protecao',
        isBodyArmor: true,
      });
    }

    // Escudo
    if (effectiveShield) {
      equippedItems.push({
        name: effectiveShield.name,
        category: effectiveShield.category,
        spaces: effectiveShield.spaces,
        details: `Escudo • Defesa +${effectiveShield.defenseBonus}${
          effectiveShield.damageReduction?.ballistic
            ? ` • RD Balístico ${effectiveShield.damageReduction.ballistic}`
            : ''
        }`,
        itemType: 'escudo',
        isShield: true,
      });
    }

    onApply({
      defenseEquip: calculation.totalDefenseEquip,
      resistancesText: calculation.resistancesText,
      protectionText: calculation.protectionText,
      equippedItems,
      armorPenalty: calculation.armorPenalty,
      totalSpaces: calculation.totalSpaces,
    });
  };

  if (!visible) return null;

  const isLeveSelected = effectiveBodyArmor?.type === 'Leve';
  const isPesadaSelected = effectiveBodyArmor?.type === 'Pesada';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer} testID="protection-modal">
          {/* Cabeçalho Fixo */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="shield-checkmark" size={20} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Assistente de Proteções</Text>
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
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Conteúdo com Scroll */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
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
                  <View style={styles.formRow}>
                    <View style={{ flex: 2 }}>
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Tipo</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
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

            {/* SEÇÃO 4: RESUMO DOS CÁLCULOS TÁTICOS */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeaderRow}>
                <Ionicons name="analytics-outline" size={16} color="#38BDF8" />
                <Text style={styles.previewTitle}>Resumo Tático dos Cálculos</Text>
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
            </View>
          </ScrollView>

          {/* Rodapé Fixo com Ações */}
          <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
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
                style={styles.cancelBtn}
                onPress={onClose}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleConfirm}
                testID="btn-apply-protections"
              >
                <Ionicons name="checkmark-sharp" size={16} color="#FFF" />
                <Text style={styles.applyBtnText}>Equipar e Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    },
    optionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
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
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#38BDF8',
      padding: 14,
    },
    previewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(56, 189, 248, 0.2)',
      paddingBottom: 6,
    },
    previewTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#38BDF8',
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
      color: '#38BDF8',
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      gap: 10,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
    },
    clearBtnText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    footerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cancelBtn: {
      paddingHorizontal: 12,
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
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: '#38BDF8',
    },
    applyBtnText: {
      fontSize: 12,
      color: '#0B1120',
      fontWeight: '800',
      textTransform: 'uppercase',
    },
  });
