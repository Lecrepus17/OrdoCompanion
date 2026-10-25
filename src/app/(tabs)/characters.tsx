import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { useApp } from '../../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import {
  CharacterAbility,
  CharacterAttack,
  CharacterAttributes,
  CharacterInventoryItem,
  CharacterSheet,
  CompendiumEntity,
  CustomWeapon,
  ParanormalElement,
  TrainingDegree,
} from '../../types/compendium';
import { confirmAction } from '../../utils/alert';
import { parseCritical } from '../../utils/weapons';
import PrintSheetModal from '../../components/PrintSheetModal';

const RANKS = [
  'Recruta',
  'Operador',
  'Agente Especial',
  'Oficial de Operações',
  'Agente de Elite',
] as const;

const AFFINITIES: ParanormalElement[] = [
  'Nenhum',
  'Sangue',
  'Morte',
  'Conhecimento',
  'Energia',
];

export const RANK_ITEM_LIMITS = {
  Recruta: { cat1: 2, cat2: 0, cat3: 0, cat4: 0, credit: 'Baixo' as const },
  Operador: { cat1: 3, cat2: 1, cat3: 0, cat4: 0, credit: 'Médio' as const },
  'Agente Especial': { cat1: 3, cat2: 2, cat3: 1, cat4: 0, credit: 'Médio' as const },
  'Oficial de Operações': { cat1: 3, cat2: 3, cat3: 2, cat4: 1, credit: 'Alto' as const },
  'Agente de Elite': { cat1: 3, cat2: 3, cat3: 3, cat4: 2, credit: 'Ilimitado' as const },
};

export interface SkillDefinition {
  name: string;
  attr: keyof CharacterAttributes;
  trainedOnly?: boolean;
  armorPenalty?: boolean;
}

export const OFFICIAL_SKILLS_LIST: SkillDefinition[] = [
  { name: 'Acrobacia', attr: 'AGI', armorPenalty: true },
  { name: 'Adestramento', attr: 'PRE', trainedOnly: true },
  { name: 'Artes', attr: 'PRE', trainedOnly: true },
  { name: 'Atletismo', attr: 'FOR' },
  { name: 'Atualidades', attr: 'INT' },
  { name: 'Ciências', attr: 'INT', trainedOnly: true },
  { name: 'Crime', attr: 'AGI', trainedOnly: true, armorPenalty: true },
  { name: 'Diplomacia', attr: 'PRE' },
  { name: 'Enganação', attr: 'PRE' },
  { name: 'Fortitude', attr: 'VIG' },
  { name: 'Furtividade', attr: 'AGI', armorPenalty: true },
  { name: 'Iniciativa', attr: 'AGI' },
  { name: 'Intimidação', attr: 'PRE' },
  { name: 'Intuição', attr: 'PRE' },
  { name: 'Investigação', attr: 'INT' },
  { name: 'Luta', attr: 'FOR' },
  { name: 'Medicina', attr: 'INT' },
  { name: 'Ocultismo', attr: 'INT', trainedOnly: true },
  { name: 'Percepção', attr: 'PRE' },
  { name: 'Pilotagem', attr: 'AGI', trainedOnly: true },
  { name: 'Pontaria', attr: 'AGI' },
  { name: 'Profissão', attr: 'INT', trainedOnly: true },
  { name: 'Reflexos', attr: 'AGI' },
  { name: 'Religião', attr: 'PRE', trainedOnly: true },
  { name: 'Sobrevivência', attr: 'INT' },
  { name: 'Tática', attr: 'INT', trainedOnly: true },
  { name: 'Tecnologia', attr: 'INT', trainedOnly: true },
  { name: 'Vontade', attr: 'PRE' },
];

function calculateMaxStats(
  className: string,
  nex: number,
  attrs: CharacterAttributes
): { pvMax: number; peMax: number; sanMax: number } {
  const levels = Math.max(1, Math.floor(nex / 5));
  const extraLevels = Math.max(0, levels - 1);

  if (className.toLowerCase().includes('combatente')) {
    return {
      pvMax: 20 + attrs.VIG + extraLevels * (4 + attrs.VIG),
      peMax: 2 + attrs.PRE + extraLevels * (2 + attrs.PRE),
      sanMax: 12 + extraLevels * 3,
    };
  }
  if (className.toLowerCase().includes('ocultista')) {
    return {
      pvMax: 12 + attrs.VIG + extraLevels * (2 + attrs.VIG),
      peMax: 4 + attrs.PRE + extraLevels * (4 + attrs.PRE),
      sanMax: 20 + extraLevels * 5,
    };
  }
  if (className.toLowerCase().includes('sobrevivente')) {
    const stage = Math.min(5, Math.max(1, levels));
    return {
      pvMax: 8 + attrs.VIG + (stage - 1) * 2,
      peMax: 2 + attrs.PRE + (stage - 1) * 1,
      sanMax: 8 + (stage - 1) * 2,
    };
  }
  // Especialista (default)
  return {
    pvMax: 16 + attrs.VIG + extraLevels * (3 + attrs.VIG),
    peMax: 3 + attrs.PRE + extraLevels * (3 + attrs.PRE),
    sanMax: 16 + extraLevels * 4,
  };
}

export default function CharactersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);
  const {
    characters,
    upsertCharacter,
    deleteCharacter,
    customWeapons,
    entities,
    getEntityById,
    rollSkillTest,
    rollFormula,
    userProfile,
  } = useApp();

  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'geral' | 'ataques' | 'pericias' | 'habilidades' | 'inventario' | 'descricao'
  >('geral');

  // Modals
  const [pickerModalType, setPickerModalType] = useState<
    | null
    | 'origin'
    | 'class'
    | 'track'
    | 'link_compendium'
    | 'add_weapon_armaria'
    | 'add_weapon_compendium'
  >(null);
  const [pickerSearch, setPickerSearch] = useState('');

  // Manual Attack Modal
  const [attackModalVisible, setAttackModalVisible] = useState(false);
  const [editingAttackId, setEditingAttackId] = useState<string | null>(null);
  const [atkName, setAtkName] = useState('');
  const [atkTest, setAtkTest] = useState('');
  const [atkSkill, setAtkSkill] = useState('Pontaria');
  const [atkBonus, setAtkBonus] = useState('0');
  const [atkDamage, setAtkDamage] = useState('2d10');
  const [atkCritical, setAtkCritical] = useState('19/x3');
  const [atkRange, setAtkRange] = useState('Médio');
  const [atkSpecial, setAtkSpecial] = useState('Balístico');

  // Manual Ability Modal
  const [abilityModalVisible, setAbilityModalVisible] = useState(false);
  const [abName, setAbName] = useState('');
  const [abCost, setAbCost] = useState('1 PE');
  const [abOrigin, setAbOrigin] = useState('');
  const [abDesc, setAbDesc] = useState('');
  const [abType, setAbType] = useState<'habilidade' | 'ritual' | 'poder'>('habilidade');

  // Manual Inventory Item Modal
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [itName, setItName] = useState('');
  const [itCat, setItCat] = useState<'0' | 'I' | 'II' | 'III' | 'IV'>('I');
  const [itSpaces, setItSpaces] = useState('1');
  const [itDetails, setItDetails] = useState('');

  // Print Sheet Modal
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printingChar, setPrintingChar] = useState<CharacterSheet | null>(null);

  const activeChar = useMemo(
    () => characters.find((c) => c.id === activeCharId) || null,
    [characters, activeCharId]
  );

  const originsList = useMemo(
    () => entities.filter((e) => e.category === 'origin'),
    [entities]
  );
  const classesList = useMemo(
    () => entities.filter((e) => e.category === 'class'),
    [entities]
  );
  const tracksList = useMemo(
    () => entities.filter((e) => e.category === 'track'),
    [entities]
  );
  const compendiumWeapons = useMemo(
    () => entities.filter((e) => e.category === 'weapon'),
    [entities]
  );
  const equipableEntities = useMemo(
    () =>
      entities.filter((e) =>
        ['ritual', 'power', 'weapon', 'item'].includes(e.category)
      ),
    [entities]
  );

  const handleCreateNewAgent = async () => {
    const defaultOrigin = originsList[0];
    const preferredClassEntity = classesList.find((c) =>
      userProfile?.preferredClass &&
      c.name.toLowerCase().includes(userProfile.preferredClass.toLowerCase())
    );
    const defaultClass = preferredClassEntity || classesList[0];
    const defaultAttrs: CharacterAttributes = { AGI: 2, FOR: 1, INT: 2, PRE: 2, VIG: 2 };
    const stats = calculateMaxStats(defaultClass?.name || 'Combatente', 5, defaultAttrs);
    const standardLimits = RANK_ITEM_LIMITS['Recruta'];

    const newSheet: CharacterSheet = {
      id: `char_${Date.now()}`,
      name: 'Novo Agente',
      player: userProfile?.playerName || '',
      nex: 5,
      displacement: '9m',
      peRound: 1,
      dtRituals: 13,
      rank: 'Recruta',
      prestige: 0,
      creditLimit: 'Baixo',
      maxLoadBonus: 0,
      itemLimits: {
        cat1: standardLimits.cat1,
        cat2: standardLimits.cat2,
        cat3: standardLimits.cat3,
        cat4: standardLimits.cat4,
      },
      originId: defaultOrigin?.id || '',
      classId: defaultClass?.id || '',
      trackId: '',
      affinity: 'Nenhum',
      attributes: defaultAttrs,
      pvCurrent: stats.pvMax,
      pvMax: stats.pvMax,
      peCurrent: stats.peMax,
      peMax: stats.peMax,
      sanCurrent: stats.sanMax,
      sanMax: stats.sanMax,
      defenseBonus: 0,
      defenseEquip: 0,
      defenseOther: 0,
      protection: '',
      resistances: '',
      skills: {},
      attacks: [],
      abilities: [],
      inventory: [],
      appearance: '',
      personality: '',
      history: '',
      objective: '',
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    await upsertCharacter(newSheet);
    setActiveCharId(newSheet.id);
    setActiveTab('geral');
  };

  const updateActiveChar = async (patch: Partial<CharacterSheet>) => {
    if (!activeChar) return;
    const updated: CharacterSheet = {
      ...activeChar,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await upsertCharacter(updated);
  };

  const handleRecalculateStats = async () => {
    if (!activeChar) return;
    const cls = getEntityById(activeChar.classId);
    const calc = calculateMaxStats(
      cls?.name || 'Especialista',
      activeChar.nex,
      activeChar.attributes
    );
    const peRodada = Math.max(1, Math.floor(activeChar.nex / 5));
    const dtRitual = 10 + peRodada + activeChar.attributes.PRE;

    await updateActiveChar({
      pvMax: calc.pvMax,
      pvCurrent: calc.pvMax,
      peMax: calc.peMax,
      peCurrent: calc.peMax,
      sanMax: calc.sanMax,
      sanCurrent: calc.sanMax,
      peRound: peRodada,
      dtRituals: dtRitual,
    });
  };

  const handleRankChange = async (rk: typeof RANKS[number]) => {
    const limits = RANK_ITEM_LIMITS[rk];
    await updateActiveChar({
      rank: rk,
      creditLimit: limits.credit,
      itemLimits: {
        cat1: limits.cat1,
        cat2: limits.cat2,
        cat3: limits.cat3,
        cat4: limits.cat4,
      },
    });
  };

  const cycleSkillDegree = async (skillName: string) => {
    if (!activeChar) return;
    const current = activeChar.skills[skillName]?.degree || 0;
    const nextOrder: TrainingDegree[] = [0, 5, 10, 15];
    const nextDegree = nextOrder[(nextOrder.indexOf(current) + 1) % nextOrder.length];
    await updateActiveChar({
      skills: {
        ...activeChar.skills,
        [skillName]: {
          degree: nextDegree,
          bonus: activeChar.skills[skillName]?.bonus || 0,
          customName: activeChar.skills[skillName]?.customName,
        },
      },
    });
  };

  const updateSkillOtherBonus = async (skillName: string, delta: number) => {
    if (!activeChar) return;
    const currentEntry = activeChar.skills[skillName] || { degree: 0, bonus: 0 };
    const nextBonus = Math.max(-10, Math.min(20, (currentEntry.bonus || 0) + delta));
    await updateActiveChar({
      skills: {
        ...activeChar.skills,
        [skillName]: {
          ...currentEntry,
          bonus: nextBonus,
        },
      },
    });
  };

  // Attacks actions
  const openNewAttackModal = () => {
    setEditingAttackId(null);
    setAtkName('');
    setAtkSkill('Pontaria');
    setAtkBonus('0');
    setAtkTest('Pontaria');
    setAtkDamage('2d10');
    setAtkCritical('19/x3');
    setAtkRange('Médio');
    setAtkSpecial('Balístico');
    setAttackModalVisible(true);
  };

  const handleSaveAttack = async () => {
    if (!activeChar || !atkName.trim()) return;
    const existing = activeChar.attacks || [];
    const bonusNum = parseInt(atkBonus, 10) || 0;

    const attackEntry: CharacterAttack = {
      id: editingAttackId || `atk_${Date.now()}`,
      name: atkName.trim(),
      skillName: atkSkill,
      attackBonus: bonusNum,
      test: `${atkSkill}${bonusNum > 0 ? ` +${bonusNum}` : ''}`,
      damage: atkDamage.trim() || '1d6',
      critical: atkCritical.trim() || '20/x2',
      range: atkRange.trim() || 'Curto',
      special: atkSpecial.trim(),
    };

    const next = editingAttackId
      ? existing.map((a) => (a.id === editingAttackId ? attackEntry : a))
      : [...existing, attackEntry];

    await updateActiveChar({ attacks: next });
    setAttackModalVisible(false);
  };

  const handleAddWeaponFromArmaria = async (weapon: CustomWeapon) => {
    if (!activeChar) return;
    const existingAttacks = activeChar.attacks || [];
    const existingInventory = activeChar.inventory || [];
    const skillHint = weapon.weaponType === 'Corpo a corpo' ? 'Luta' : 'Pontaria';

    const newAttack: CharacterAttack = {
      id: `atk_${Date.now()}`,
      name: weapon.name,
      skillName: skillHint,
      attackBonus: weapon.attackBonus,
      test: `${skillHint}${weapon.attackBonus > 0 ? ` +${weapon.attackBonus}` : ''}`,
      damage: weapon.finalDamage,
      critical: weapon.finalCritical,
      range: weapon.finalRange,
      special: weapon.specialRules || weapon.baseDamageType,
      customWeaponId: weapon.id,
    };

    const newInv: CharacterInventoryItem = {
      id: `inv_${Date.now()}`,
      name: weapon.name,
      category: weapon.finalCategory.split(' ')[0] as any,
      spaces: weapon.finalSpaces,
      details: `Arma (${weapon.finalDamage}, Crítico: ${weapon.finalCritical}) • ${weapon.specialRules}`,
      equipped: true,
    };

    await updateActiveChar({
      attacks: [...existingAttacks, newAttack],
      inventory: [...existingInventory, newInv],
    });
    setPickerModalType(null);
  };

  const handleAddWeaponFromCompendium = async (ent: CompendiumEntity) => {
    if (!activeChar) return;
    const isMelee = ent.subCategory?.includes('Corpo');
    const skillHint = isMelee ? 'Luta' : 'Pontaria';

    const newAttack: CharacterAttack = {
      id: `atk_${Date.now()}`,
      name: ent.name,
      skillName: skillHint,
      attackBonus: 0,
      test: skillHint,
      damage: ent.damage || '1d6',
      critical: ent.critical || '20/x2',
      range: ent.range || (isMelee ? 'Corpo a corpo' : 'Curto'),
      special: `${ent.damageType || 'B'} • Cat ${ent.itemCategory || '0'}`,
    };

    const newInv: CharacterInventoryItem = {
      id: `inv_${Date.now()}`,
      name: ent.name,
      category: (ent.itemCategory || '0') as any,
      spaces: parseInt(ent.spaces || '1', 10) || 1,
      details: ent.summary || `Arma (${ent.damage}, ${ent.critical})`,
      equipped: true,
    };

    await updateActiveChar({
      attacks: [...(activeChar.attacks || []), newAttack],
      inventory: [...(activeChar.inventory || []), newInv],
    });
    setPickerModalType(null);
  };

  const handleRollAttackTest = (attack: CharacterAttack) => {
    if (!activeChar) return;
    const skillName = attack.skillName || (attack.range === 'Corpo a corpo' ? 'Luta' : 'Pontaria');
    const skillDef = OFFICIAL_SKILLS_LIST.find((s) => s.name === skillName);
    const attrKey = skillDef?.attr || (attack.range === 'Corpo a corpo' ? 'FOR' : 'AGI');
    const attrVal = activeChar.attributes[attrKey];
    const skillEntry = activeChar.skills[skillName] || { degree: 0, bonus: 0 };
    const totalBonus = (skillEntry.degree || 0) + (skillEntry.bonus || 0) + (attack.attackBonus || 0);

    rollSkillTest(attrVal, totalBonus, `Ataque: ${attack.name} (${skillName})`);
  };

  const handleRollAttackDamage = (attack: CharacterAttack, isCrit: boolean) => {
    const parsed = parseCritical(attack.critical);
    if (!isCrit) {
      rollFormula(attack.damage, `Dano de ${attack.name}`);
      return;
    }

    // Multiply base damage dice by crit multiplier
    const diceMatch = attack.damage.match(/^(\d+)d(\d+)/i);
    if (diceMatch) {
      const count = parseInt(diceMatch[1], 10) * parsed.mult;
      const die = diceMatch[2];
      const rest = attack.damage.replace(/^\d+d\d+/, '');
      const critFormula = `${count}d${die}${rest}`;
      rollFormula(critFormula, `Dano CRÍTICO de ${attack.name} (x${parsed.mult})`);
    } else {
      rollFormula(attack.damage, `Dano CRÍTICO de ${attack.name}`);
    }
  };

  // Abilities actions
  const handleSaveAbility = async () => {
    if (!activeChar || !abName.trim()) return;
    const existing = activeChar.abilities || [];
    const newAb: CharacterAbility = {
      id: `ab_${Date.now()}`,
      name: abName.trim(),
      cost: abCost.trim(),
      originPage: abOrigin.trim(),
      description: abDesc.trim(),
      type: abType,
    };
    await updateActiveChar({ abilities: [...existing, newAb] });
    setAbilityModalVisible(false);
  };

  const handleSpendAbilityPE = async (costText: string, abilityName: string) => {
    if (!activeChar) return;
    const match = costText.match(/(\d+)/);
    const peCost = match ? parseInt(match[1], 10) : 1;
    const nextPE = Math.max(0, activeChar.peCurrent - peCost);
    await updateActiveChar({ peCurrent: nextPE });
    Alert.alert('PE Gasto', `-${peCost} PE usado em "${abilityName}". PE restante: ${nextPE}/${activeChar.peMax}`);
  };

  // Inventory actions
  const handleSaveInventoryItem = async () => {
    if (!activeChar || !itName.trim()) return;
    const existing = activeChar.inventory || [];
    const newItem: CharacterInventoryItem = {
      id: `inv_${Date.now()}`,
      name: itName.trim(),
      category: itCat,
      spaces: parseInt(itSpaces, 10) || 1,
      details: itDetails.trim(),
    };
    await updateActiveChar({ inventory: [...existing, newItem] });
    setItemModalVisible(false);
  };

  // Carga Calculation
  const maxLoad = useMemo(() => {
    if (!activeChar) return 2;
    const base = activeChar.attributes.FOR <= 0 ? 2 : activeChar.attributes.FOR * 5;
    return base + (activeChar.maxLoadBonus || 0);
  }, [activeChar]);

  const currentLoad = useMemo(() => {
    if (!activeChar || !activeChar.inventory) return 0;
    return activeChar.inventory.reduce((acc, item) => acc + (item.spaces || 0), 0);
  }, [activeChar]);

  // Total Defense Calculation
  const totalDefense = useMemo(() => {
    if (!activeChar) return 10;
    return (
      10 +
      activeChar.attributes.AGI +
      (activeChar.defenseEquip || 0) +
      (activeChar.defenseOther || 0)
    );
  }, [activeChar]);

  if (!activeChar) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.heading}>Fichas de Agentes</Text>
              <Text style={styles.subHeading}>
                Ficha completa de Ordem Paranormal: Livro Base & Sobrevivendo ao Horror.
              </Text>
            </View>
            <TouchableOpacity style={styles.newBtn} onPress={handleCreateNewAgent}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.newBtnText}>Novo Agente</Text>
            </TouchableOpacity>
          </View>

          {characters.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="person-add-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum agente cadastrado</Text>
              <Text style={styles.emptySub}>
                Toque em "Novo Agente" para criar sua primeira ficha com suporte a todas as informações oficiais, ataques, armas modificadas, inventário e histórico.
              </Text>
            </View>
          ) : (
            characters.map((char) => {
              const cls = getEntityById(char.classId);
              const orig = getEntityById(char.originId);
              const trk = getEntityById(char.trackId);
              const def = 10 + char.attributes.AGI + (char.defenseEquip || 0) + (char.defenseOther || 0);

              return (
                <TouchableOpacity
                  key={char.id}
                  style={styles.charCard}
                  onPress={() => {
                    setActiveCharId(char.id);
                    setActiveTab('geral');
                  }}
                >
                  <View style={styles.charCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.charName}>{char.name}</Text>
                      <Text style={styles.charMeta}>
                        NEX {char.nex}% • {char.rank} • {cls?.name || 'Sem Classe'}{' '}
                        {trk ? `(${trk.name})` : ''} • {orig?.name || 'Sem Origem'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity
                        style={styles.cardPrintBtn}
                        onPress={() => {
                          setPrintingChar(char);
                          setPrintModalVisible(true);
                        }}
                      >
                        <Ionicons name="print-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          confirmAction({
                            title: 'Excluir Ficha?',
                            message: `Deseja excluir "${char.name}"?`,
                            confirmText: 'Excluir',
                            destructive: true,
                            onConfirm: () => deleteCharacter(char.id),
                          })
                        }
                      >
                        <Ionicons name="trash-outline" size={19} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.barsPreviewRow}>
                    <View style={[styles.barPill, { borderColor: '#EF4444' }]}>
                      <Text style={styles.barPillText}>
                        PV: {char.pvCurrent}/{char.pvMax}
                      </Text>
                    </View>
                    <View style={[styles.barPill, { borderColor: '#F59E0B' }]}>
                      <Text style={styles.barPillText}>
                        PE: {char.peCurrent}/{char.peMax}
                      </Text>
                    </View>
                    <View style={[styles.barPill, { borderColor: '#38BDF8' }]}>
                      <Text style={styles.barPillText}>
                        SAN: {char.sanCurrent}/{char.sanMax}
                      </Text>
                    </View>
                    <View style={[styles.barPill, { borderColor: '#10B981' }]}>
                      <Text style={styles.barPillText}>DEF: {def}</Text>
                    </View>
                    <View style={[styles.barPill, { borderColor: '#818CF8' }]}>
                      <Text style={styles.barPillText}>
                        Armas: {char.attacks?.length || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <PrintSheetModal
          visible={printModalVisible}
          character={printingChar}
          originEntity={getEntityById(printingChar?.originId || '')}
          classEntity={getEntityById(printingChar?.classId || '')}
          trackEntity={getEntityById(printingChar?.trackId || '')}
          onClose={() => {
            setPrintModalVisible(false);
            setPrintingChar(null);
          }}
        />
      </View>
    );
  }

  const originObj = getEntityById(activeChar.originId);
  const classObj = getEntityById(activeChar.classId);
  const trackObj = getEntityById(activeChar.trackId);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.sheetTopBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setActiveCharId(null)}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backBtnText}>Todas as Fichas</Text>
        </TouchableOpacity>

        <View style={styles.topBarRightActions}>
          <TouchableOpacity
            style={styles.printHeaderBtn}
            onPress={() => {
              setPrintingChar(activeChar);
              setPrintModalVisible(true);
            }}
          >
            <Ionicons name="print-outline" size={16} color="#FFF" />
            <Text style={styles.printHeaderBtnText}>Imprimir Ficha</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.recalcBtn} onPress={handleRecalculateStats}>
            <Ionicons name="calculator-outline" size={16} color="#FCA5A5" />
            <Text style={styles.recalcBtnText}>Recalcular Status</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub navigation bar for sections */}
      <View style={styles.tabNavWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabNavContent}>
          {[
            { id: 'geral', label: 'Geral & Status', icon: 'person' },
            { id: 'ataques', label: `Ataques (${activeChar.attacks?.length || 0})`, icon: 'flash' },
            { id: 'pericias', label: 'Perícias (28)', icon: 'dice' },
            { id: 'habilidades', label: `Habilidades & Rituais (${activeChar.abilities?.length || 0})`, icon: 'sparkles' },
            { id: 'inventario', label: `Inventário (${activeChar.inventory?.length || 0})`, icon: 'briefcase' },
            { id: 'descricao', label: 'Histórico & Roleplay', icon: 'document-text' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.sheetTabPill, active && styles.sheetTabPillActive]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={active ? '#FFF' : colors.textSecondary}
                />
                <Text style={[styles.sheetTabPillText, active && styles.sheetTabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.sheetScroll, { paddingBottom: 100 + bottomInset }]}>
        {/* ============================================================ */}
        {/* ABA 1: GERAL & STATUS VITALS                                 */}
        {/* ============================================================ */}
        {activeTab === 'geral' && (
          <>
            {/* Cabeçalho do Personagem */}
            <View style={styles.sectionCard}>
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.fieldLabel}>Nome do Personagem</Text>
                  <TextInput
                    style={styles.input}
                    value={activeChar.name}
                    onChangeText={(v) => updateActiveChar({ name: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.fieldLabel}>Jogador</Text>
                    {!!userProfile?.playerName && !activeChar.player && (
                      <TouchableOpacity
                        onPress={() => updateActiveChar({ player: userProfile.playerName })}
                        style={{ paddingHorizontal: 2 }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={{ fontSize: 9, color: colors.primary, fontWeight: '700' }}>
                          Usar Perfil
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={userProfile?.playerName || 'Nome do Jogador'}
                    placeholderTextColor={colors.textMuted}
                    value={activeChar.player || ''}
                    onChangeText={(v) => updateActiveChar({ player: v })}
                  />
                </View>
              </View>

              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>NEX (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(activeChar.nex)}
                    onChangeText={(v) => {
                      const n = Math.min(99, Math.max(0, parseInt(v, 10) || 0));
                      const peR = Math.max(1, Math.floor(n / 5));
                      const dt = 10 + peR + activeChar.attributes.PRE;
                      updateActiveChar({ nex: n, peRound: peR, dtRituals: dt });
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>PE / Rodada</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(activeChar.peRound || 1)}
                    onChangeText={(v) =>
                      updateActiveChar({ peRound: parseInt(v, 10) || 1 })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>DESL (Desloc.)</Text>
                  <TextInput
                    style={styles.input}
                    value={activeChar.displacement || '9m'}
                    onChangeText={(v) => updateActiveChar({ displacement: v })}
                  />
                </View>
              </View>

              {/* Patente & Afinidade */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.fieldLabel}>Patente (Define Limite de Itens)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                  {RANKS.map((rk) => {
                    const active = activeChar.rank === rk;
                    return (
                      <TouchableOpacity
                        key={rk}
                        style={[styles.rankPill, active && styles.rankPillActive]}
                        onPress={() => handleRankChange(rk)}
                      >
                        <Text style={[styles.rankPillText, active && styles.rankPillTextActive]}>{rk}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={styles.fieldLabel}>Afinidade Paranormal</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 4 }}>
                  {AFFINITIES.map((aff) => {
                    const active = (activeChar.affinity || 'Nenhum') === aff;
                    return (
                      <TouchableOpacity
                        key={aff}
                        style={[styles.rankPill, active && styles.rankPillActive]}
                        onPress={() => updateActiveChar({ affinity: aff })}
                      >
                        <Text style={[styles.rankPillText, active && styles.rankPillTextActive]}>{aff}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Origem, Classe e Trilha */}
              <View style={[styles.selectorsGrid, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={styles.selectorBox}
                  onPress={() => {
                    setPickerSearch('');
                    setPickerModalType('origin');
                  }}
                >
                  <Text style={styles.fieldLabel}>Origem</Text>
                  <Text style={styles.selectorValue}>{originObj?.name || 'Escolher Origem'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectorBox}
                  onPress={() => {
                    setPickerSearch('');
                    setPickerModalType('class');
                  }}
                >
                  <Text style={styles.fieldLabel}>Classe</Text>
                  <Text style={styles.selectorValue}>{classObj?.name || 'Escolher Classe'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectorBox}
                  onPress={() => {
                    setPickerSearch('');
                    setPickerModalType('track');
                  }}
                >
                  <Text style={styles.fieldLabel}>Trilha</Text>
                  <Text style={styles.selectorValue}>{trackObj?.name || 'Escolher Trilha'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Atributos */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Atributos (Toque no dado para testar)</Text>
              <View style={styles.attrsGrid}>
                {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => {
                  const val = activeChar.attributes[attr];
                  return (
                    <View key={attr} style={styles.attrControlCard}>
                      <Text style={styles.attrCode}>{attr}</Text>
                      <View style={styles.attrStepper}>
                        <TouchableOpacity
                          onPress={() =>
                            updateActiveChar({
                              attributes: {
                                ...activeChar.attributes,
                                [attr]: Math.max(-1, val - 1),
                              },
                            })
                          }
                        >
                          <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <Text style={styles.attrNumber}>{val}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            updateActiveChar({
                              attributes: {
                                ...activeChar.attributes,
                                [attr]: Math.min(10, val + 1),
                              },
                            })
                          }
                        >
                          <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.attrRollBtn}
                        onPress={() => rollSkillTest(val, 0, `Atributo ${attr}`)}
                      >
                        <Ionicons name="dice-outline" size={13} color="#FCA5A5" />
                        <Text style={styles.attrRollText}>Rolar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Status Vital: PV, PE, SAN */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Status Vital (PV, PE & Sanidade)</Text>
              <StatCounterRow
                label="PV (Vida)"
                color="#EF4444"
                current={activeChar.pvCurrent}
                max={activeChar.pvMax}
                onChangeCurrent={(v) => updateActiveChar({ pvCurrent: Math.max(0, v) })}
              />
              <StatCounterRow
                label="PE (Esforço)"
                color="#F59E0B"
                current={activeChar.peCurrent}
                max={activeChar.peMax}
                onChangeCurrent={(v) => updateActiveChar({ peCurrent: Math.max(0, v) })}
              />
              <StatCounterRow
                label="SAN (Sanidade)"
                color="#38BDF8"
                current={activeChar.sanCurrent}
                max={activeChar.sanMax}
                onChangeCurrent={(v) => updateActiveChar({ sanCurrent: Math.max(0, v) })}
              />
            </View>

            {/* Defesa, Proteção & Resistências (Da ficha oficial) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Defesa, Proteção & Resistências</Text>

              <View style={styles.defenseCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Bônus Equipamento</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      onPress={() =>
                        updateActiveChar({
                          defenseEquip: Math.max(-5, (activeChar.defenseEquip || 0) - 1),
                        })
                      }
                    >
                      <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.defenseBonusNum}>+{activeChar.defenseEquip || 0}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateActiveChar({
                          defenseEquip: Math.min(30, (activeChar.defenseEquip || 0) + 1),
                        })
                      }
                    >
                      <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Bônus Outros</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      onPress={() =>
                        updateActiveChar({
                          defenseOther: Math.max(-5, (activeChar.defenseOther || 0) - 1),
                        })
                      }
                    >
                      <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.defenseBonusNum}>+{activeChar.defenseOther || 0}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateActiveChar({
                          defenseOther: Math.min(30, (activeChar.defenseOther || 0) + 1),
                        })
                      }
                    >
                      <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.totalDefenseBadge}>
                  <Text style={styles.totalDefLabel}>DEFESA TOTAL</Text>
                  <Text style={styles.totalDefVal}>{totalDefense}</Text>
                  <Text style={styles.totalDefFormula}>
                    10 + AGI ({activeChar.attributes.AGI}) + Equip ({activeChar.defenseEquip || 0}) + Outros ({activeChar.defenseOther || 0})
                  </Text>
                </View>
              </View>

              <View style={[styles.row, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Proteção (Armadura / Colete / Escudo)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Proteção Leve (+5 Defesa)"
                    placeholderTextColor={colors.textMuted}
                    value={activeChar.protection || ''}
                    onChangeText={(v) => updateActiveChar({ protection: v })}
                  />
                </View>
              </View>

              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Resistências a Dano</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Balística 2, Corte 2, Sangue 5"
                    placeholderTextColor={colors.textMuted}
                    value={activeChar.resistances || ''}
                    onChangeText={(v) => updateActiveChar({ resistances: v })}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {/* ============================================================ */}
        {/* ABA 2: ATAQUES & ARMAS (A Tabela ATAQUES da Ficha)           */}
        {/* ============================================================ */}
        {activeTab === 'ataques' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Tabela de Ataques & Armas</Text>
                <Text style={styles.subHeading}>
                  Role testes de ataque, dano normal e dano crítico com 1 toque.
                </Text>
              </View>
            </View>

            {/* Botoes de Adicionar Ataque */}
            <View style={styles.addAttackButtonsRow}>
              <TouchableOpacity
                style={styles.addAtkBtnPrimary}
                onPress={() => {
                  setPickerSearch('');
                  setPickerModalType('add_weapon_armaria');
                }}
              >
                <Ionicons name="construct" size={15} color="#FFF" />
                <Text style={styles.addAtkBtnText}>Vincular da Armaria</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addAtkBtnSecondary}
                onPress={() => {
                  setPickerSearch('');
                  setPickerModalType('add_weapon_compendium');
                }}
              >
                <Ionicons name="book-outline" size={15} color="#FFF" />
                <Text style={styles.addAtkBtnText}>Do Compêndio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addAtkBtnGhost}
                onPress={openNewAttackModal}
              >
                <Ionicons name="add" size={15} color={colors.text} />
                <Text style={styles.addAtkBtnGhostText}>Manual</Text>
              </TouchableOpacity>
            </View>

            {(!activeChar.attacks || activeChar.attacks.length === 0) ? (
              <View style={styles.emptyAttackBox}>
                <Ionicons name="flash-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum ataque cadastrado</Text>
                <Text style={styles.emptySub}>
                  Toque em "Vincular da Armaria" para escolher uma arma criada/modificada, ou "Do Compêndio" para adicionar uma arma oficial.
                </Text>
              </View>
            ) : (
              activeChar.attacks.map((atk) => (
                <View key={atk.id} style={styles.attackCard}>
                  <View style={styles.attackCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attackCardName}>{atk.name}</Text>
                      <Text style={styles.attackCardSub}>
                        Teste: {atk.test} • Alcance: {atk.range}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        updateActiveChar({
                          attacks: (activeChar.attacks || []).filter((a) => a.id !== atk.id),
                        })
                      }
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.attackStatsRow}>
                    <View style={styles.statPill}>
                      <Text style={styles.statLabel}>DANO</Text>
                      <Text style={styles.statValue}>{atk.damage}</Text>
                    </View>
                    <View style={styles.statPill}>
                      <Text style={styles.statLabel}>CRÍTICO</Text>
                      <Text style={styles.statValue}>{atk.critical}</Text>
                    </View>
                    <View style={styles.statPill}>
                      <Text style={styles.statLabel}>ALCANCE</Text>
                      <Text style={styles.statValue}>{atk.range}</Text>
                    </View>
                  </View>

                  {atk.special ? (
                    <Text style={styles.attackSpecialText}>
                      Especial: {atk.special}
                    </Text>
                  ) : null}

                  {/* Rolagens do Ataque */}
                  <View style={styles.attackRollsRow}>
                    <TouchableOpacity
                      style={styles.rollAttackBtn}
                      onPress={() => handleRollAttackTest(atk)}
                    >
                      <Ionicons name="dice" size={15} color="#FFF" />
                      <Text style={styles.rollAttackBtnText}>Testar Ataque</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rollDamageBtn}
                      onPress={() => handleRollAttackDamage(atk, false)}
                    >
                      <Ionicons name="flash-outline" size={14} color="#FFF" />
                      <Text style={styles.rollDamageBtnText}>Dano ({atk.damage})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rollCritBtn}
                      onPress={() => handleRollAttackDamage(atk, true)}
                    >
                      <Ionicons name="flame" size={14} color="#FFF" />
                      <Text style={styles.rollCritBtnText}>Crítico ({atk.critical})</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* ABA 3: PERÍCIAS (28 Perícias Oficiais)                       */}
        {/* ============================================================ */}
        {activeTab === 'pericias' && (
          <View style={styles.sectionCard}>
            <View>
              <Text style={styles.sectionTitle}>Perícias de Ordem Paranormal</Text>
              <Text style={styles.subHeading}>
                Toque no grau de treino (+0, +5, +10, +15) e ajuste bônus de equipamentos (+/-).
              </Text>
            </View>

            {OFFICIAL_SKILLS_LIST.map((sk) => {
              const entry = activeChar.skills[sk.name] || { degree: 0, bonus: 0 };
              const degree = entry.degree || 0;
              const bonus = entry.bonus || 0;
              const totalBonus = degree + bonus;
              const attrVal = activeChar.attributes[sk.attr];

              return (
                <View key={sk.name} style={styles.skillOfficialRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skillOfficialName}>
                      {sk.name}
                      {sk.trainedOnly ? '*' : ''}
                      {sk.armorPenalty ? '+' : ''}
                      <Text style={styles.skillAttr}> ({sk.attr})</Text>
                    </Text>
                    {sk.name === 'Profissão' ? (
                      <TextInput
                        style={styles.skillCustomInput}
                        placeholder="Ex: Jornalista, TI, Militar"
                        placeholderTextColor={colors.textMuted}
                        value={entry.customName || ''}
                        onChangeText={(v) =>
                          updateActiveChar({
                            skills: {
                              ...activeChar.skills,
                              [sk.name]: { ...entry, customName: v },
                            },
                          })
                        }
                      />
                    ) : null}
                  </View>

                  {/* Grau de treino */}
                  <TouchableOpacity
                    style={[
                      styles.degreeBadge,
                      degree > 0 && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primarySoft,
                      },
                    ]}
                    onPress={() => cycleSkillDegree(sk.name)}
                  >
                    <Text style={styles.degreeText}>+{degree}</Text>
                  </TouchableOpacity>

                  {/* Outros bônus (+/-) */}
                  <View style={styles.skillOtherBonusStepper}>
                    <TouchableOpacity
                      onPress={() => updateSkillOtherBonus(sk.name, -1)}
                    >
                      <Ionicons name="remove-circle-outline" size={17} color={colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={styles.skillOtherBonusText}>
                      {bonus >= 0 ? `+${bonus}` : bonus}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateSkillOtherBonus(sk.name, 1)}
                    >
                      <Ionicons name="add-circle-outline" size={17} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Botão de rolagem */}
                  {(() => {
                    const diceDesc =
                      attrVal <= 0
                        ? `${2 + Math.abs(attrVal)}d20 (menor)`
                        : `${attrVal}d20`;
                    const displayBadge =
                      totalBonus !== 0
                        ? `${diceDesc}${totalBonus > 0 ? `+${totalBonus}` : totalBonus}`
                        : diceDesc;

                    return (
                      <TouchableOpacity
                        style={styles.skillRollBtn}
                        onPress={() =>
                          rollSkillTest(
                            attrVal,
                            totalBonus,
                            `${sk.name} (${displayBadge})`
                          )
                        }
                      >
                        <Ionicons name="dice" size={14} color="#FFF" />
                        <Text style={styles.skillRollText}>{displayBadge}</Text>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              );
            })}
          </View>
        )}

        {/* ============================================================ */}
        {/* ABA 4: HABILIDADES & RITUAIS                                 */}
        {/* ============================================================ */}
        {activeTab === 'habilidades' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Habilidades & Rituais</Text>
                <Text style={styles.subHeading}>
                  Poderes de classe, origem, trilha e rituais com custo de PE.
                </Text>
              </View>
            </View>

            {/* DT de Rituais */}
            <View style={styles.dtRitualRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>DT de Rituais (10 + PE/Rodada + PRE)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(activeChar.dtRituals || 10 + (activeChar.peRound || 1) + activeChar.attributes.PRE)}
                  onChangeText={(v) =>
                    updateActiveChar({ dtRituals: parseInt(v, 10) || 10 })
                  }
                />
              </View>
              <View style={styles.dtRitualBadge}>
                <Text style={styles.dtRitualBadgeLabel}>DT RITUAL</Text>
                <Text style={styles.dtRitualBadgeVal}>
                  {activeChar.dtRituals || 10 + (activeChar.peRound || 1) + activeChar.attributes.PRE}
                </Text>
              </View>
            </View>

            <View style={styles.addAttackButtonsRow}>
              <TouchableOpacity
                style={styles.addAtkBtnPrimary}
                onPress={() => {
                  setPickerSearch('');
                  setPickerModalType('link_compendium');
                }}
              >
                <Ionicons name="book-outline" size={15} color="#FFF" />
                <Text style={styles.addAtkBtnText}>Vincular do Compêndio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addAtkBtnGhost}
                onPress={() => {
                  setAbName('');
                  setAbCost('1 PE');
                  setAbOrigin('');
                  setAbDesc('');
                  setAbType('habilidade');
                  setAbilityModalVisible(true);
                }}
              >
                <Ionicons name="add" size={15} color={colors.text} />
                <Text style={styles.addAtkBtnGhostText}>Criar Manual</Text>
              </TouchableOpacity>
            </View>

            {(!activeChar.abilities || activeChar.abilities.length === 0) &&
            activeChar.entityIds.length === 0 ? (
              <Text style={styles.emptyHint}>
                Nenhuma habilidade ou ritual adicionado ainda. Toque em "Vincular do Compêndio" ou "Criar Manual".
              </Text>
            ) : (
              <>
                {activeChar.abilities?.map((ab) => (
                  <View key={ab.id} style={styles.abilityCard}>
                    <View style={styles.abilityCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.abilityCardName}>{ab.name}</Text>
                        <Text style={styles.abilityCardOrigin}>
                          {ab.originPage || ab.type}
                        </Text>
                      </View>
                      {ab.cost ? (
                        <TouchableOpacity
                          style={styles.spendPeBtn}
                          onPress={() => handleSpendAbilityPE(ab.cost, ab.name)}
                        >
                          <Ionicons name="flash" size={12} color="#F59E0B" />
                          <Text style={styles.spendPeBtnText}>{ab.cost}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={() =>
                          updateActiveChar({
                            abilities: (activeChar.abilities || []).filter((a) => a.id !== ab.id),
                          })
                        }
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    {ab.description ? (
                      <Text style={styles.abilityCardDesc}>{ab.description}</Text>
                    ) : null}
                  </View>
                ))}

                {/* Entidades vinculadas do compêndio */}
                {activeChar.entityIds.map((eid) => {
                  const ent = getEntityById(eid);
                  if (!ent) return null;
                  return (
                    <View key={eid} style={styles.abilityCard}>
                      <View style={styles.abilityCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.abilityCardName}>{ent.name}</Text>
                          <Text style={styles.abilityCardOrigin}>
                            {ent.subCategory} • {ent.bookTitle}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            updateActiveChar({
                              entityIds: activeChar.entityIds.filter((x) => x !== eid),
                            })
                          }
                        >
                          <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.abilityCardDesc}>{ent.summary || ent.description}</Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* ABA 5: INVENTÁRIO & CARGA                                    */}
        {/* ============================================================ */}
        {activeTab === 'inventario' && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Inventário & Limites</Text>
                <Text style={styles.subHeading}>
                  Patente: {activeChar.rank} • Crédito: {activeChar.creditLimit || 'Baixo'}
                </Text>
              </View>
            </View>

            {/* Carga Máxima vs Carga Atual */}
            <View style={styles.loadSummaryCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loadLabel}>CARGA ATUAL / MÁXIMA</Text>
                <Text
                  style={[
                    styles.loadValue,
                    currentLoad > maxLoad && { color: '#EF4444' },
                  ]}
                >
                  {currentLoad} / {maxLoad} espaços
                </Text>
                <Text style={styles.loadSub}>
                  Base: 5x FOR ({activeChar.attributes.FOR}) + Mochila ({activeChar.maxLoadBonus || 0})
                </Text>
              </View>
              <View style={styles.stepperRow}>
                <Text style={styles.fieldLabel}>Mochila:</Text>
                <TouchableOpacity
                  onPress={() =>
                    updateActiveChar({
                      maxLoadBonus: Math.max(0, (activeChar.maxLoadBonus || 0) - 2),
                    })
                  }
                >
                  <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.defenseBonusNum}>+{activeChar.maxLoadBonus || 0}</Text>
                <TouchableOpacity
                  onPress={() =>
                    updateActiveChar({
                      maxLoadBonus: Math.min(20, (activeChar.maxLoadBonus || 0) + 2),
                    })
                  }
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Limites de Itens por Categoria da Patente */}
            <View style={styles.itemLimitsGrid}>
              <View style={styles.limitPill}>
                <Text style={styles.limitLabel}>CAT I</Text>
                <Text style={styles.limitNum}>{activeChar.itemLimits?.cat1 ?? 2}</Text>
              </View>
              <View style={styles.limitPill}>
                <Text style={styles.limitLabel}>CAT II</Text>
                <Text style={styles.limitNum}>{activeChar.itemLimits?.cat2 ?? 0}</Text>
              </View>
              <View style={styles.limitPill}>
                <Text style={styles.limitLabel}>CAT III</Text>
                <Text style={styles.limitNum}>{activeChar.itemLimits?.cat3 ?? 0}</Text>
              </View>
              <View style={styles.limitPill}>
                <Text style={styles.limitLabel}>CAT IV</Text>
                <Text style={styles.limitNum}>{activeChar.itemLimits?.cat4 ?? 0}</Text>
              </View>
            </View>

            {/* Botoes de Adicionar Item */}
            <View style={styles.addAttackButtonsRow}>
              <TouchableOpacity
                style={styles.addAtkBtnPrimary}
                onPress={() => {
                  setItName('');
                  setItCat('I');
                  setItSpaces('1');
                  setItDetails('');
                  setItemModalVisible(true);
                }}
              >
                <Ionicons name="add" size={15} color="#FFF" />
                <Text style={styles.addAtkBtnText}>Novo Item</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Itens */}
            {(!activeChar.inventory || activeChar.inventory.length === 0) ? (
              <Text style={styles.emptyHint}>
                Inventário vazio. Adicione itens ou vincule armas da Armaria.
              </Text>
            ) : (
              activeChar.inventory.map((it) => (
                <View key={it.id} style={styles.invItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invItemName}>
                      {it.name} <Text style={styles.invItemCat}>(Cat {it.category})</Text>
                    </Text>
                    {it.details ? (
                      <Text style={styles.invItemDetails}>{it.details}</Text>
                    ) : null}
                  </View>
                  <View style={styles.invSpacesBadge}>
                    <Text style={styles.invSpacesText}>{it.spaces} esp.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      updateActiveChar({
                        inventory: (activeChar.inventory || []).filter((x) => x.id !== it.id),
                      })
                    }
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============================================================ */}
        {/* ABA 6: DESCRIÇÃO, ROLEPLAY & HISTÓRICO                       */}
        {/* ============================================================ */}
        {activeTab === 'descricao' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Página 2 da Ficha Oficial</Text>

            <View>
              <Text style={styles.fieldLabel}>Aparência</Text>
              <TextInput
                style={[styles.input, styles.roleplayArea]}
                multiline
                placeholder="Roupas, cicatrizes, feições marcantes..."
                placeholderTextColor={colors.textMuted}
                value={activeChar.appearance || ''}
                onChangeText={(v) => updateActiveChar({ appearance: v })}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.fieldLabel}>Personalidade</Text>
              <TextInput
                style={[styles.input, styles.roleplayArea]}
                multiline
                placeholder="Comportamento, manias, postura sob estresse..."
                placeholderTextColor={colors.textMuted}
                value={activeChar.personality || ''}
                onChangeText={(v) => updateActiveChar({ personality: v })}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.fieldLabel}>Histórico</Text>
              <TextInput
                style={[styles.input, styles.roleplayArea]}
                multiline
                placeholder="Passado antes de ingressar na Ordem, traumas paranormais..."
                placeholderTextColor={colors.textMuted}
                value={activeChar.history || ''}
                onChangeText={(v) => updateActiveChar({ history: v })}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.fieldLabel}>Objetivo</Text>
              <TextInput
                style={[styles.input, styles.roleplayArea]}
                multiline
                placeholder="O que o agente busca alcançar ou proteger..."
                placeholderTextColor={colors.textMuted}
                value={activeChar.objective || ''}
                onChangeText={(v) => updateActiveChar({ objective: v })}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.fieldLabel}>Anotações Gerais & Casos</Text>
              <TextInput
                style={[styles.input, styles.notesArea]}
                multiline
                placeholder="Pistas de investigação, contatos, rituais aprendidos em missões..."
                placeholderTextColor={colors.textMuted}
                value={activeChar.notes || ''}
                onChangeText={(v) => updateActiveChar({ notes: v })}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: Novo Ataque Manual                                    */}
      {/* ============================================================ */}
      <Modal
        visible={attackModalVisible}
        animationType="slide"
        onRequestClose={() => setAttackModalVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <Text style={styles.modalTitle}>Novo Ataque / Arma</Text>
            <TouchableOpacity onPress={() => setAttackModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 24, 34), gap: 12 }}>
            <View>
              <Text style={styles.fieldLabel}>Nome do Ataque / Arma</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Fuzil de Precisão Modificado"
                placeholderTextColor={colors.textMuted}
                value={atkName}
                onChangeText={setAtkName}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Perícia Base</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Pontaria ou Luta"
                  placeholderTextColor={colors.textMuted}
                  value={atkSkill}
                  onChangeText={setAtkSkill}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Bônus no Teste (+X)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Ex: 2"
                  placeholderTextColor={colors.textMuted}
                  value={atkBonus}
                  onChangeText={setAtkBonus}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Dano</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 2d10+2"
                  placeholderTextColor={colors.textMuted}
                  value={atkDamage}
                  onChangeText={setAtkDamage}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Crítico</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 18/x3"
                  placeholderTextColor={colors.textMuted}
                  value={atkCritical}
                  onChangeText={setAtkCritical}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Alcance</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Médio, Longo"
                  placeholderTextColor={colors.textMuted}
                  value={atkRange}
                  onChangeText={setAtkRange}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Especial / Notas</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Balístico, Mira Laser"
                  placeholderTextColor={colors.textMuted}
                  value={atkSpecial}
                  onChangeText={setAtkSpecial}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveHeaderBtnLarge} onPress={handleSaveAttack}>
              <Text style={styles.saveHeaderBtnText}>Salvar Ataque</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Nova Habilidade Manual                                */}
      {/* ============================================================ */}
      <Modal
        visible={abilityModalVisible}
        animationType="slide"
        onRequestClose={() => setAbilityModalVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <Text style={styles.modalTitle}>Nova Habilidade ou Ritual</Text>
            <TouchableOpacity onPress={() => setAbilityModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 24, 34), gap: 12 }}>
            <View>
              <Text style={styles.fieldLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Ataque Especial"
                placeholderTextColor={colors.textMuted}
                value={abName}
                onChangeText={setAbName}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Custo em PE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 2 PE ou Passivo"
                  placeholderTextColor={colors.textMuted}
                  value={abCost}
                  onChangeText={setAbCost}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Origem / Página</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: NEX 10%, Trilha"
                  placeholderTextColor={colors.textMuted}
                  value={abOrigin}
                  onChangeText={setAbOrigin}
                />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Descrição Completa</Text>
              <TextInput
                style={[styles.input, styles.roleplayArea]}
                multiline
                placeholder="Efeito detalhado da habilidade..."
                placeholderTextColor={colors.textMuted}
                value={abDesc}
                onChangeText={setAbDesc}
              />
            </View>

            <TouchableOpacity style={styles.saveHeaderBtnLarge} onPress={handleSaveAbility}>
              <Text style={styles.saveHeaderBtnText}>Salvar Habilidade</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Novo Item de Inventário                               */}
      {/* ============================================================ */}
      <Modal
        visible={itemModalVisible}
        animationType="slide"
        onRequestClose={() => setItemModalVisible(false)}
      >
        <View style={styles.modalWrap}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <Text style={styles.modalTitle}>Novo Item no Inventário</Text>
            <TouchableOpacity onPress={() => setItemModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 24, 34), gap: 12 }}>
            <View>
              <Text style={styles.fieldLabel}>Nome do Item</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Kit de Primeiros Socorros"
                placeholderTextColor={colors.textMuted}
                value={itName}
                onChangeText={setItName}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Categoria (0, I, II, III, IV)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="I"
                  placeholderTextColor={colors.textMuted}
                  value={itCat}
                  onChangeText={(v) => setItCat(v as any)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Espaços Ocupados</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  value={itSpaces}
                  onChangeText={setItSpaces}
                />
              </View>
            </View>

            <View>
              <Text style={styles.fieldLabel}>Detalhes / Descrição</Text>
              <TextInput
                style={[styles.input, styles.roleplayArea]}
                multiline
                placeholder="Detalhes ou propriedades do item..."
                placeholderTextColor={colors.textMuted}
                value={itDetails}
                onChangeText={setItDetails}
              />
            </View>

            <TouchableOpacity style={styles.saveHeaderBtnLarge} onPress={handleSaveInventoryItem}>
              <Text style={styles.saveHeaderBtnText}>Salvar Item</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Seletor de Origem, Classe, Trilha ou Armas            */}
      {/* ============================================================ */}
      <Modal
        visible={pickerModalType !== null}
        animationType="slide"
        onRequestClose={() => setPickerModalType(null)}
      >
        <View style={styles.modalWrap}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 14) }]}>
            <Text style={styles.modalTitle}>
              {pickerModalType === 'origin'
                ? 'Selecionar Origem'
                : pickerModalType === 'class'
                ? 'Selecionar Classe'
                : pickerModalType === 'track'
                ? 'Selecionar Trilha'
                : pickerModalType === 'add_weapon_armaria'
                ? 'Vincular da Armaria'
                : pickerModalType === 'add_weapon_compendium'
                ? 'Vincular do Compêndio'
                : 'Selecionar do Compêndio'}
            </Text>
            <TouchableOpacity onPress={() => setPickerModalType(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { margin: 14 }]}
            placeholder="Filtrar por nome..."
            placeholderTextColor={colors.textMuted}
            value={pickerSearch}
            onChangeText={setPickerSearch}
          />

          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: Math.max(insets.bottom + 24, 40), gap: 8 }}>
            {pickerModalType === 'add_weapon_armaria' ? (
              customWeapons.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Nenhuma arma na Armaria</Text>
                  <Text style={styles.emptySub}>
                    Acesse a aba "Armaria" para criar armas modificadas (como Fuzil com Mira Laser ou Katana Sanguinária).
                  </Text>
                </View>
              ) : (
                customWeapons
                  .filter((w) => w.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map((w) => (
                    <TouchableOpacity
                      key={w.id}
                      style={styles.pickerItem}
                      onPress={() => handleAddWeaponFromArmaria(w)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemTitle}>{w.name}</Text>
                        <Text style={styles.pickerItemSub}>
                          Dano: {w.finalDamage} • Crítico: {w.finalCritical} • Cat {w.finalCategory} • {w.specialRules}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  ))
              )
            ) : pickerModalType === 'add_weapon_compendium' ? (
              compendiumWeapons
                .filter((w) => w.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .slice(0, 80)
                .map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={styles.pickerItem}
                    onPress={() => handleAddWeaponFromCompendium(w)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemTitle}>{w.name}</Text>
                      <Text style={styles.pickerItemSub}>
                        {w.subCategory} • Dano: {w.damage} • Crítico: {w.critical} • Cat {w.itemCategory || '0'}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={colors.primary} />
                  </TouchableOpacity>
                ))
            ) : (
              (pickerModalType === 'origin'
                ? originsList
                : pickerModalType === 'class'
                ? classesList
                : pickerModalType === 'track'
                ? tracksList
                : equipableEntities
              )
                .filter((e) =>
                  e.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())
                )
                .slice(0, 80)
                .map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.pickerItem}
                    onPress={async () => {
                      if (pickerModalType === 'origin') {
                        await updateActiveChar({ originId: item.id });
                      } else if (pickerModalType === 'class') {
                        await updateActiveChar({ classId: item.id });
                      } else if (pickerModalType === 'track') {
                        await updateActiveChar({ trackId: item.id });
                      } else if (pickerModalType === 'link_compendium') {
                        if (!activeChar.entityIds.includes(item.id)) {
                          await updateActiveChar({
                            entityIds: [...activeChar.entityIds, item.id],
                          });
                        }
                      }
                      setPickerModalType(null);
                    }}
                  >
                    <Text style={styles.pickerItemTitle}>{item.name}</Text>
                    <Text style={styles.pickerItemSub}>
                      {item.subCategory} • {item.bookTitle} • {item.summary}
                    </Text>
                  </TouchableOpacity>
                ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <PrintSheetModal
        visible={printModalVisible}
        character={printingChar || activeChar}
        originEntity={originObj}
        classEntity={classObj}
        trackEntity={trackObj}
        onClose={() => {
          setPrintModalVisible(false);
          setPrintingChar(null);
        }}
      />
    </View>
  );
}

const StatCounterRow: React.FC<{
  label: string;
  color: string;
  current: number;
  max: number;
  onChangeCurrent: (val: number) => void;
}> = ({ label, color, current, max, onChangeCurrent }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statCounterWrap}>
    <Text style={[styles.statCounterLabel, { color }]}>{label}</Text>
    <View style={styles.statCounterControls}>
      <TouchableOpacity style={styles.cntBtn} onPress={() => onChangeCurrent(current - 5)}>
        <Text style={styles.cntBtnText}>-5</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cntBtn} onPress={() => onChangeCurrent(current - 1)}>
        <Text style={styles.cntBtnText}>-1</Text>
      </TouchableOpacity>
      <Text style={styles.cntVal}>
        {current} / {max}
      </Text>
      <TouchableOpacity style={styles.cntBtn} onPress={() => onChangeCurrent(current + 1)}>
        <Text style={styles.cntBtnText}>+1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cntBtn} onPress={() => onChangeCurrent(current + 5)}>
        <Text style={styles.cntBtnText}>+5</Text>
      </TouchableOpacity>
    </View>
  </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 14,
    paddingBottom: 90,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subHeading: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    maxWidth: 260,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  newBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  charCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  charCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  charMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  barsPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  barPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceElevated,
  },
  barPillText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  cardPrintBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  topBarRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  printHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  printHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recalcBtnText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '800',
  },
  tabNavWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  tabNavContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  sheetTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sheetTabPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  sheetTabPillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  sheetScroll: {
    padding: 14,
    paddingBottom: 100,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
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
  selectorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorBox: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  selectorValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  attrsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attrControlCard: {
    flex: 1,
    minWidth: 62,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    gap: 5,
  },
  attrCode: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  attrStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attrNumber: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  attrRollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attrRollText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
  },
  statCounterWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statCounterLabel: {
    fontWeight: '800',
    fontSize: 13,
  },
  statCounterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cntBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  cntBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  cntVal: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14,
    minWidth: 66,
    textAlign: 'center',
  },
  defenseCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  defenseBonusNum: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 26,
    textAlign: 'center',
  },
  totalDefenseBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  totalDefLabel: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  totalDefVal: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  totalDefFormula: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addAttackButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  addAtkBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addAtkBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addAtkBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  addAtkBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  addAtkBtnGhostText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyAttackBox: {
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  attackCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginTop: 6,
  },
  attackCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attackCardName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  attackCardSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  attackStatsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  statValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  attackSpecialText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  attackRollsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rollAttackBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    borderRadius: 6,
  },
  rollAttackBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  rollDamageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 7,
    borderRadius: 6,
  },
  rollDamageBtnText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
  },
  rollCritBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#991B1B',
    paddingVertical: 7,
    borderRadius: 6,
  },
  rollCritBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  skillOfficialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 6,
    gap: 6,
  },
  skillOfficialName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  skillAttr: {
    color: colors.textMuted,
    fontSize: 11,
  },
  skillCustomInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: colors.text,
    fontSize: 11,
    marginTop: 2,
  },
  degreeBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  degreeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  skillOtherBonusStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillOtherBonusText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  skillRollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  skillRollText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dtRitualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dtRitualBadge: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dtRitualBadgeLabel: {
    color: '#A855F7',
    fontSize: 9,
    fontWeight: '900',
  },
  dtRitualBadgeVal: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginVertical: 8,
  },
  abilityCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginTop: 6,
  },
  abilityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  abilityCardName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  abilityCardOrigin: {
    color: colors.textMuted,
    fontSize: 11,
  },
  spendPeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spendPeBtnText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  abilityCardDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  loadSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
  },
  loadLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  loadValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  loadSub: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  itemLimitsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  limitPill: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  limitNum: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  invItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  invItemName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  invItemCat: {
    color: colors.primary,
    fontSize: 11,
  },
  invItemDetails: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  invSpacesBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invSpacesText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  roleplayArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  notesArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  modalWrap: {
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
    fontSize: 16,
    fontWeight: '800',
  },
  saveHeaderBtnLarge: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveHeaderBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  pickerItemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  pickerItemSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  rankPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  rankPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  rankPillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
});
