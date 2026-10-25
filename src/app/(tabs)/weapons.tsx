import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import {
  CustomWeapon,
  ParanormalElement,
  WeaponHandedness,
  WeaponProficiency,
  WeaponType,
} from '../../types/compendium';
import { confirmAction } from '../../utils/alert';
import {
  calculateWeaponStats,
  OFFICIAL_WEAPON_MODS,
  parseCritical,
} from '../../utils/weapons';

const WEAPON_TYPES: WeaponType[] = ['Fogo', 'Corpo a corpo', 'Disparo'];
const PROFICIENCIES: WeaponProficiency[] = ['Simples', 'Tática', 'Pesada'];
const HANDEDNESS_LIST: WeaponHandedness[] = ['Uma Mão', 'Duas Mãos', 'Leve'];
const ELEMENTS: ParanormalElement[] = [
  'Nenhum',
  'Sangue',
  'Morte',
  'Conhecimento',
  'Energia',
];

export default function WeaponsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);
  const {
    customWeapons,
    upsertCustomWeapon,
    deleteCustomWeapon,
    entities,
    characters,
    upsertCharacter,
    rollFormula,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const [baseWeaponPickerVisible, setBaseWeaponPickerVisible] = useState(false);
  const [baseWeaponSearch, setBaseWeaponSearch] = useState('');
  const [equipModalWeapon, setEquipModalWeapon] = useState<CustomWeapon | null>(null);

  // Editor form state
  const [editingWeaponId, setEditingWeaponId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [baseWeaponId, setBaseWeaponId] = useState<string | undefined>(undefined);
  const [baseWeaponName, setBaseWeaponName] = useState('Arma Personalizada');
  const [weaponType, setWeaponType] = useState<WeaponType>('Fogo');
  const [proficiency, setProficiency] = useState<WeaponProficiency>('Tática');
  const [handedness, setHandedness] = useState<WeaponHandedness>('Duas Mãos');
  const [baseDamage, setBaseDamage] = useState('2d10');
  const [baseCritical, setBaseCritical] = useState('19/x3');
  const [baseRange, setBaseRange] = useState('Médio');
  const [baseDamageType, setBaseDamageType] = useState('Balístico');
  const [baseSpaces, setBaseSpaces] = useState('2');
  const [baseCategory, setBaseCategory] = useState('I');
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [element, setElement] = useState<ParanormalElement>('Nenhum');
  const [notes, setNotes] = useState('');
  const [customModName, setCustomModName] = useState('');
  const [customModEffect, setCustomModEffect] = useState('');
  const [customMods, setCustomMods] = useState<
    Array<{ id: string; name: string; effect: string; categoryIncrease: number }>
  >([]);

  // Base weapons from compendium
  const compendiumWeapons = useMemo(
    () => entities.filter((e) => e.category === 'weapon'),
    [entities]
  );

  // Live calculation of weapon stats
  const calculated = useMemo(() => {
    return calculateWeaponStats(
      {
        damage: baseDamage,
        critical: baseCritical,
        range: baseRange,
        spaces: parseInt(baseSpaces, 10) || 1,
        category: baseCategory,
        damageType: baseDamageType,
        element,
      },
      selectedMods,
      customMods
    );
  }, [
    baseDamage,
    baseCritical,
    baseRange,
    baseSpaces,
    baseCategory,
    baseDamageType,
    element,
    selectedMods,
    customMods,
  ]);

  const openNewWeaponEditor = () => {
    setEditingWeaponId(null);
    setName('Fuzil de Precisão Modificado');
    setBaseWeaponId('weapon__livro_base__fuzil_de_precisao');
    setBaseWeaponName('Fuzil de precisão');
    setWeaponType('Fogo');
    setProficiency('Tática');
    setHandedness('Duas Mãos');
    setBaseDamage('2d10');
    setBaseCritical('19/x3');
    setBaseRange('Longo');
    setBaseDamageType('Balístico');
    setBaseSpaces('2');
    setBaseCategory('II');
    setSelectedMods(['mira_laser']);
    setElement('Nenhum');
    setNotes('');
    setCustomMods([]);
    setEditorVisible(true);
  };

  const openEditWeapon = (weapon: CustomWeapon) => {
    setEditingWeaponId(weapon.id);
    setName(weapon.name);
    setBaseWeaponId(weapon.baseWeaponId);
    setBaseWeaponName(weapon.baseWeaponName);
    setWeaponType(weapon.weaponType);
    setProficiency(weapon.proficiency);
    setHandedness(weapon.handedness);
    setBaseDamage(weapon.baseDamage);
    setBaseCritical(weapon.baseCritical);
    setBaseRange(weapon.baseRange);
    setBaseDamageType(weapon.baseDamageType);
    setBaseSpaces(String(weapon.baseSpaces));
    setBaseCategory(weapon.baseCategory);
    setSelectedMods(weapon.modifications || []);
    setElement(weapon.element || 'Nenhum');
    setNotes(weapon.notes || '');
    setCustomMods(weapon.customModifications || []);
    setEditorVisible(true);
  };

  const handleSelectCompendiumWeapon = (ent: any) => {
    setBaseWeaponId(ent.id);
    setBaseWeaponName(ent.name);
    setName(`${ent.name} Modificado`);
    setBaseDamage(ent.damage || '1d6');
    setBaseCritical(ent.critical || '20/x2');
    setBaseRange(ent.range || (ent.subCategory?.includes('Corpo') ? 'Corpo a corpo' : 'Curto'));
    setBaseDamageType(ent.damageType || 'B');
    setBaseSpaces(ent.spaces || '1');
    setBaseCategory(ent.itemCategory || '0');

    if (ent.handedness?.includes('Duas Mãos')) {
      setHandedness('Duas Mãos');
    } else if (ent.handedness?.includes('Leve')) {
      setHandedness('Leve');
    } else {
      setHandedness('Uma Mão');
    }

    if (ent.subCategory?.includes('Corpo a corpo')) {
      setWeaponType('Corpo a corpo');
    } else if (ent.subCategory?.includes('Fogo')) {
      setWeaponType('Fogo');
    } else {
      setWeaponType('Disparo');
    }

    if (ent.proficiency?.includes('Pesada')) {
      setProficiency('Pesada');
    } else if (ent.proficiency?.includes('Tática')) {
      setProficiency('Tática');
    } else {
      setProficiency('Simples');
    }

    setBaseWeaponPickerVisible(false);
  };

  const toggleMod = (modId: string) => {
    if (selectedMods.includes(modId)) {
      setSelectedMods(selectedMods.filter((id) => id !== modId));
    } else {
      setSelectedMods([...selectedMods, modId]);
    }
  };

  const handleAddCustomMod = () => {
    if (!customModName.trim()) return;
    const newMod = {
      id: `cmod_${Date.now()}`,
      name: customModName.trim(),
      effect: customModEffect.trim() || 'Modificação caseira',
      categoryIncrease: 1,
    };
    setCustomMods([...customMods, newMod]);
    setCustomModName('');
    setCustomModEffect('');
  };

  const handleSaveWeapon = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da arma.');
      return;
    }

    const weapon: CustomWeapon = {
      id: editingWeaponId || `weapon_${Date.now()}`,
      name: name.trim(),
      baseWeaponId,
      baseWeaponName,
      weaponType,
      proficiency,
      handedness,
      baseDamage,
      baseCritical,
      baseRange,
      baseDamageType,
      baseSpaces: parseInt(baseSpaces, 10) || 1,
      baseCategory,
      modifications: selectedMods,
      customModifications: customMods,
      finalDamage: calculated.finalDamage,
      finalCritical: calculated.finalCritical,
      finalRange: calculated.finalRange,
      finalCategory: calculated.finalCategory,
      finalSpaces: calculated.finalSpaces,
      attackBonus: calculated.attackBonus,
      damageBonus: calculated.damageBonus,
      element: calculated.element,
      specialRules: calculated.specialRules,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await upsertCustomWeapon(weapon);
    setEditorVisible(false);
  };

  const handleEquipWeaponToAgent = async (charId: string) => {
    if (!equipModalWeapon) return;
    const targetChar = characters.find((c) => c.id === charId);
    if (!targetChar) return;

    // Build attack entry
    const attackId = `atk_${Date.now()}`;
    const testBonusText =
      equipModalWeapon.attackBonus > 0 ? ` +${equipModalWeapon.attackBonus}` : '';
    const skillHint =
      equipModalWeapon.weaponType === 'Corpo a corpo' ? 'Luta' : 'Pontaria';

    const newAttack = {
      id: attackId,
      name: equipModalWeapon.name,
      test: `${skillHint}${testBonusText}`,
      skillName: skillHint,
      attackBonus: equipModalWeapon.attackBonus,
      damage: equipModalWeapon.finalDamage,
      critical: equipModalWeapon.finalCritical,
      range: equipModalWeapon.finalRange,
      special: equipModalWeapon.specialRules || equipModalWeapon.baseDamageType,
      customWeaponId: equipModalWeapon.id,
    };

    // Add to attacks and inventory
    const newInventoryItem = {
      id: `inv_${Date.now()}`,
      name: equipModalWeapon.name,
      category: equipModalWeapon.finalCategory.split(' ')[0] as any,
      spaces: equipModalWeapon.finalSpaces,
      details: `Arma (${equipModalWeapon.finalDamage}, Crítico: ${equipModalWeapon.finalCritical}) • ${equipModalWeapon.specialRules}`,
      equipped: true,
    };

    const existingAttacks = targetChar.attacks || [];
    const existingInventory = targetChar.inventory || [];

    await upsertCharacter({
      ...targetChar,
      attacks: [...existingAttacks, newAttack],
      inventory: [...existingInventory, newInventoryItem],
      updatedAt: new Date().toISOString(),
    });

    setEquipModalWeapon(null);
    Alert.alert(
      'Arma Equipada!',
      `"${equipModalWeapon.name}" foi vinculada aos Ataques e ao Inventário de ${targetChar.name}!`
    );
  };

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
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Armaria & Modificações</Text>
          <Text style={styles.subHeading}>
            Crie, customize e modifique armas do Livro Base e Sobrevivendo ao Horror.
          </Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={openNewWeaponEditor}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createBtnText}>Nova Arma</Text>
        </TouchableOpacity>
      </View>

      {/* Filter / Search Row */}
      <View style={styles.filterWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por arma, efeito ou modificação..."
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
      </View>

      {/* Weapons List */}
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

            return (
              <View key={weapon.id} style={styles.weaponCard}>
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

                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>Cat {weapon.finalCategory}</Text>
                  </View>
                </View>

                {/* Stat Badges */}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>DANO</Text>
                    <Text style={styles.statValue}>{weapon.finalDamage}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>CRÍTICO</Text>
                    <Text style={styles.statValue}>{weapon.finalCritical}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>ALCANCE</Text>
                    <Text style={styles.statValue}>{weapon.finalRange}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statLabel}>ESPAÇOS</Text>
                    <Text style={styles.statValue}>{weapon.finalSpaces}</Text>
                  </View>
                </View>

                {/* Applied Modifications summary */}
                <View style={styles.modsContainer}>
                  <Text style={styles.modsTitle}>Modificações ({weapon.modifications.length}):</Text>
                  <View style={styles.modBadgesWrap}>
                    {weapon.modifications.map((mid) => {
                      const def = OFFICIAL_WEAPON_MODS.find((m) => m.id === mid);
                      return (
                        <View key={mid} style={styles.modBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                          <Text style={styles.modBadgeText}>{def?.name || mid}</Text>
                        </View>
                      );
                    })}
                    {weapon.customModifications?.map((cmod) => (
                      <View key={cmod.id} style={[styles.modBadge, { borderColor: '#818CF8' }]}>
                        <Ionicons name="sparkles" size={12} color="#818CF8" />
                        <Text style={styles.modBadgeText}>{cmod.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {weapon.specialRules ? (
                  <Text style={styles.specialRulesText} numberOfLines={2}>
                    {weapon.specialRules}
                  </Text>
                ) : null}

                {/* Card Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.rollActionBtn}
                    onPress={() => {
                      const damageOnly = weapon.finalDamage.split('+')[0].trim();
                      rollFormula(damageOnly, `Dano de ${weapon.name}`);
                    }}
                  >
                    <Ionicons name="dice" size={14} color="#FFF" />
                    <Text style={styles.rollActionBtnText}>Rolar Dano</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rollActionBtn, { backgroundColor: '#B91C1C' }]}
                    onPress={() => {
                      const parsed = parseCritical(weapon.finalCritical);
                      const baseDiceMatch = weapon.finalDamage.match(/^(\d+)d(\d+)/i);
                      if (baseDiceMatch) {
                        const count = parseInt(baseDiceMatch[1], 10) * parsed.mult;
                        const die = baseDiceMatch[2];
                        const bonusPart = weapon.finalDamage.replace(/^\d+d\d+/, '');
                        const critFormula = `${count}d${die}${bonusPart}`;
                        rollFormula(critFormula, `CRÍTICO de ${weapon.name} (x${parsed.mult})`);
                      } else {
                        rollFormula(weapon.finalDamage, `CRÍTICO de ${weapon.name}`);
                      }
                    }}
                  >
                    <Ionicons name="flame" size={14} color="#FFF" />
                    <Text style={styles.rollActionBtnText}>Crítico</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.equipBtn}
                    onPress={() => setEquipModalWeapon(weapon)}
                  >
                    <Ionicons name="person-add-outline" size={14} color="#38BDF8" />
                    <Text style={styles.equipBtnText}>Equipar em Agente</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEditWeapon(weapon)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() =>
                      confirmAction({
                        title: 'Excluir Arma?',
                        message: `Tem certeza que deseja excluir "${weapon.name}"?`,
                        confirmText: 'Excluir',
                        destructive: true,
                        onConfirm: () => deleteCustomWeapon(weapon.id),
                      })
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL: Editor de Criação / Modificação de Arma */}
      <Modal
        visible={editorVisible}
        animationType="slide"
        onRequestClose={() => setEditorVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <TouchableOpacity onPress={() => setEditorVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingWeaponId ? 'Modificar Arma' : 'Nova Arma Customizada'}
            </Text>
            <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSaveWeapon}>
              <Text style={styles.saveHeaderBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={[styles.editorScroll, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
            {/* Seção 1: Modelo Base */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>1. Modelo Base da Arma</Text>
              <TouchableOpacity
                style={styles.basePickerBtn}
                onPress={() => {
                  setBaseWeaponSearch('');
                  setBaseWeaponPickerVisible(true);
                }}
              >
                <View>
                  <Text style={styles.fieldLabel}>Arma Base Selecionada</Text>
                  <Text style={styles.basePickerBtnText}>{baseWeaponName}</Text>
                  <Text style={styles.basePickerSub}>
                    Dano: {baseDamage} • Crítico: {baseCritical} • {baseRange} • Cat {baseCategory}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>Nome Customizado da Arma</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    placeholder="Ex: Fuzil de Caça Silenciado"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={setName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Tipo de Dano</Text>
                  <TextInput
                    style={styles.input}
                    value={baseDamageType}
                    placeholder="Ex: B, C, P"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={setBaseDamageType}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Tipo de Arma</Text>
                  <View style={styles.smallPillsRow}>
                    {WEAPON_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.smallPill, weaponType === t && styles.smallPillActive]}
                        onPress={() => setWeaponType(t)}
                      >
                        <Text style={[styles.smallPillText, weaponType === t && styles.smallPillTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Seção 2: Estatísticas Base Customizáveis */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>2. Dados Base (Pré-Modificação)</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Dano Base</Text>
                  <TextInput
                    style={styles.input}
                    value={baseDamage}
                    onChangeText={setBaseDamage}
                    placeholder="2d10"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Crítico Base</Text>
                  <TextInput
                    style={styles.input}
                    value={baseCritical}
                    onChangeText={setBaseCritical}
                    placeholder="19/x3"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Alcance</Text>
                  <TextInput
                    style={styles.input}
                    value={baseRange}
                    onChangeText={setBaseRange}
                    placeholder="Longo"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={[styles.row, { marginTop: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Categoria Base</Text>
                  <TextInput
                    style={styles.input}
                    value={baseCategory}
                    onChangeText={setBaseCategory}
                    placeholder="I"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Espaços</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={baseSpaces}
                    onChangeText={setBaseSpaces}
                    placeholder="2"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Empunhadura</Text>
                  <TextInput
                    style={styles.input}
                    value={handedness}
                    onChangeText={(v) => setHandedness(v as any)}
                    placeholder="Duas Mãos"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Seção 3: Painel de Estatísticas Finais Calculadas */}
            <View style={[styles.sectionCard, styles.previewCard]}>
              <View style={styles.previewHeaderRow}>
                <Text style={styles.previewTitle}>Estatísticas Finais com Modificações</Text>
                <View style={styles.finalCatPill}>
                  <Text style={styles.finalCatText}>Cat {calculated.finalCategory}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={[styles.statPill, styles.statPillHighlight]}>
                  <Text style={styles.statLabel}>DANO FINAL</Text>
                  <Text style={styles.statValueHighlight}>{calculated.finalDamage}</Text>
                </View>
                <View style={[styles.statPill, styles.statPillHighlight]}>
                  <Text style={styles.statLabel}>CRÍTICO FINAL</Text>
                  <Text style={styles.statValueHighlight}>{calculated.finalCritical}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statLabel}>ALCANCE</Text>
                  <Text style={styles.statValue}>{calculated.finalRange}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statLabel}>ESPAÇOS</Text>
                  <Text style={styles.statValue}>{calculated.finalSpaces}</Text>
                </View>
              </View>

              {calculated.attackBonus > 0 ? (
                <View style={styles.attackBonusBanner}>
                  <Ionicons name="flash" size={14} color="#F59E0B" />
                  <Text style={styles.attackBonusText}>
                    Bônus nos testes de Ataque: +{calculated.attackBonus}
                  </Text>
                </View>
              ) : null}

              {calculated.specialRules ? (
                <Text style={styles.previewSpecialText}>{calculated.specialRules}</Text>
              ) : null}
            </View>

            {/* Seção 4: Seletor de Modificações e Maldições */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>3. Modificações & Maldições Oficiais</Text>
              <Text style={styles.sectionSub}>
                Toque para adicionar ou remover modificações do Livro Base e Sobrevivendo ao Horror. Cada modificação aumenta a Categoria da arma em +1.
              </Text>

              <View style={styles.modsGrid}>
                {OFFICIAL_WEAPON_MODS.map((mod) => {
                  const active = selectedMods.includes(mod.id);
                  const isCurse = mod.element && mod.element !== 'Nenhum';
                  const elemDef = isCurse ? colors.elements[mod.element as keyof typeof colors.elements] : null;
                  const badgeColor = elemDef?.border || colors.primary;

                  return (
                    <TouchableOpacity
                      key={mod.id}
                      style={[
                        styles.modSelectCard,
                        active && styles.modSelectCardActive,
                        active && { borderColor: badgeColor },
                      ]}
                      onPress={() => toggleMod(mod.id)}
                    >
                      <View style={styles.modSelectHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modSelectName, active && { color: '#FFF' }]}>
                            {mod.name}
                          </Text>
                          <Text style={styles.modSourceTag}>
                            {mod.source} • {mod.appliesTo === 'firearm' ? 'Fogo' : mod.appliesTo === 'melee' ? 'Corpo a corpo' : 'Geral'}
                          </Text>
                        </View>
                        <View style={[styles.checkCircle, active && { backgroundColor: badgeColor }]}>
                          {active ? (
                            <Ionicons name="checkmark" size={14} color="#FFF" />
                          ) : (
                            <Ionicons name="add" size={14} color={colors.textMuted} />
                          )}
                        </View>
                      </View>
                      <Text style={styles.modSelectDesc}>{mod.description}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Seção 5: Modificações Caseiras / Homebrew */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>4. Modificação Caseira / Homebrew</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Nome da Modificação</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Coronha de Fibra de Carbono"
                    placeholderTextColor={colors.textMuted}
                    value={customModName}
                    onChangeText={setCustomModName}
                  />
                </View>
              </View>
              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={{ flex: 3 }}>
                  <Text style={styles.fieldLabel}>Efeito / Regra</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: +2 em testes de Atletismo ao golpear"
                    placeholderTextColor={colors.textMuted}
                    value={customModEffect}
                    onChangeText={setCustomModEffect}
                  />
                </View>
                <TouchableOpacity
                  style={styles.addCustomModBtn}
                  onPress={handleAddCustomMod}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.addCustomModBtnText}>Adicionar</Text>
                </TouchableOpacity>
              </View>

              {customMods.map((cm) => (
                <View key={cm.id} style={styles.customModItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customModItemName}>{cm.name} (+1 Cat)</Text>
                    <Text style={styles.customModItemEffect}>{cm.effect}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCustomMods(customMods.filter((x) => x.id !== cm.id))}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Seção 6: Anotações da Arma */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>5. Anotações & Descrição</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                multiline
                placeholder="Anotações especiais sobre quem fabricou a arma, rituais gravados no cano..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <TouchableOpacity style={styles.bigSaveBtn} onPress={handleSaveWeapon}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.bigSaveBtnText}>Salvar na Armaria</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL: Seletor de Arma do Compêndio */}
      <Modal
        visible={baseWeaponPickerVisible}
        animationType="slide"
        onRequestClose={() => setBaseWeaponPickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <TouchableOpacity onPress={() => setBaseWeaponPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Escolher Arma Base</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={{ padding: 14 }}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={17} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrar armas do compêndio..."
                placeholderTextColor={colors.textMuted}
                value={baseWeaponSearch}
                onChangeText={setBaseWeaponSearch}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom + 24, 40), gap: 8 }}>
            {compendiumWeapons
              .filter((w) =>
                w.name.toLowerCase().includes(baseWeaponSearch.toLowerCase())
              )
              .map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={styles.compendiumWeaponItem}
                  onPress={() => handleSelectCompendiumWeapon(w)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compendiumWeaponName}>{w.name}</Text>
                    <Text style={styles.compendiumWeaponSub}>
                      {w.subCategory} • Cat {w.itemCategory || '0'}
                    </Text>
                    <Text style={styles.compendiumWeaponStats}>
                      Dano: {w.damage} • Crítico: {w.critical} • Alcance: {w.range || 'Corpo a corpo'} • Espaços: {w.spaces || '1'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </Modal>

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
              Escolha qual agente receberá a arma "{equipModalWeapon?.name}". Ela será adicionada à tabela de ATAQUES e ao INVENTÁRIO.
            </Text>

            {characters.length === 0 ? (
              <Text style={styles.noAgentsText}>
                Nenhum agente cadastrado ainda. Crie um agente na aba "Agentes".
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 280, marginTop: 10 }}>
                {characters.map((char) => (
                  <TouchableOpacity
                    key={char.id}
                    style={styles.charSelectRow}
                    onPress={() => handleEquipWeaponToAgent(char.id)}
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
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rollActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
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
  },
  equipBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 6,
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
});
