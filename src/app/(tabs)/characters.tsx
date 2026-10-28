import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
import CreateAgentModal from '../../components/CreateAgentModal';
import LevelUpModal from '../../components/LevelUpModal';
import { encodeAgentShareCode, formatAgentSummary } from '../../utils/agentSharing';
import {
  OFFICIAL_SKILLS_LIST,
  SkillDefinition,
  calculateStatIncreases,
  getPeRoundLimit,
  getRitualDt,
} from '../../utils/progression';
import { DEFAULT_LONG_PRESS_DELAY } from '../../types/recordPreview';

export { OFFICIAL_SKILLS_LIST, SkillDefinition };

const RANKS = [
  'Civil',
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
  Civil: { cat1: 1, cat2: 0, cat3: 0, cat4: 0, credit: 'Baixo' as const },
  Recruta: { cat1: 2, cat2: 0, cat3: 0, cat4: 0, credit: 'Baixo' as const },
  Operador: { cat1: 3, cat2: 1, cat3: 0, cat4: 0, credit: 'Médio' as const },
  'Agente Especial': { cat1: 3, cat2: 2, cat3: 1, cat4: 0, credit: 'Médio' as const },
  'Oficial de Operações': { cat1: 3, cat2: 3, cat3: 2, cat4: 1, credit: 'Alto' as const },
  'Agente de Elite': { cat1: 3, cat2: 3, cat3: 3, cat4: 2, credit: 'Ilimitado' as const },
};



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
    openManual,
    tableStatus,
    virtualTable,
    rollTableInitiative,
    openRecordPreview,
    openEntityPreview,
    openSkillPreview,
  } = useApp();

  const [activeCharId, setActiveCharId] = useState<string | null>(null);

  // Intercepta botão de retorno físico (Android) e do navegador (Web) para fechar a ficha e voltar à listagem de agentes
  useEffect(() => {
    if (!activeCharId) return;

    let sub: any;
    if (Platform.OS !== 'web' && typeof document === 'undefined') {
      const onBackPress = () => {
        setActiveCharId(null);
        return true;
      };
      sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    }

    let popActive = true;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.pushState({ screen: 'character-sheet' }, '');
      const handlePop = () => {
        if (popActive) {
          setActiveCharId(null);
        }
      };
      window.addEventListener('popstate', handlePop);
      return () => {
        popActive = false;
        sub?.remove();
        window.removeEventListener('popstate', handlePop);
        if (window.history.state?.screen === 'character-sheet') {
          window.history.back();
        }
      };
    }

    return () => {
      sub?.remove();
    };
  }, [activeCharId]);
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
  const [abSubCategory, setAbSubCategory] = useState<'classe' | 'paranormal' | 'trilha' | 'geral' | 'ritual'>('geral');
  const [abElement, setAbElement] = useState<string>('Nenhum');
  const [compendiumFilterTab, setCompendiumFilterTab] = useState<'all' | 'class_powers' | 'paranormal_powers' | 'rituals' | 'items'>('all');

  // Manual Inventory Item Modal
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [itName, setItName] = useState('');
  const [itCat, setItCat] = useState<'0' | 'I' | 'II' | 'III' | 'IV'>('I');
  const [itSpaces, setItSpaces] = useState('1');
  const [itDetails, setItDetails] = useState('');

  // Print Sheet Modal
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printingChar, setPrintingChar] = useState<CharacterSheet | null>(null);

  // Share Agent Modal
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingChar, setSharingChar] = useState<CharacterSheet | null>(null);
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);

  // Assisted Creation & Level Up Modals
  const [createAgentModalVisible, setCreateAgentModalVisible] = useState(false);
  const [levelUpModalVisible, setLevelUpModalVisible] = useState(false);

  const activeChar = useMemo(
    () => characters.find((c) => c.id === activeCharId) || null,
    [characters, activeCharId]
  );

  const {
    originsList,
    classesList,
    tracksList,
    ritualsList,
    powersList,
    compendiumWeapons,
    equipableEntities,
  } = useMemo(() => {
    const origins: CompendiumEntity[] = [];
    const classes: CompendiumEntity[] = [];
    const tracks: CompendiumEntity[] = [];
    const rituals: CompendiumEntity[] = [];
    const powers: CompendiumEntity[] = [];
    const weapons: CompendiumEntity[] = [];
    const equipables: CompendiumEntity[] = [];

    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const cat = e.category;
      if (cat === 'origin') origins.push(e);
      else if (cat === 'class') classes.push(e);
      else if (cat === 'track') tracks.push(e);
      else if (cat === 'ritual') {
        rituals.push(e);
        equipables.push(e);
      } else if (cat === 'power') {
        powers.push(e);
        equipables.push(e);
      } else if (cat === 'weapon') {
        weapons.push(e);
        equipables.push(e);
      } else if (cat === 'item') {
        equipables.push(e);
      }
    }

    return {
      originsList: origins,
      classesList: classes,
      tracksList: tracks,
      ritualsList: rituals,
      powersList: powers,
      compendiumWeapons: weapons,
      equipableEntities: equipables,
    };
  }, [entities]);

  const handleFinishAssistedAgent = async (sheet: CharacterSheet) => {
    setCreateAgentModalVisible(false);
    await upsertCharacter(sheet);
    setActiveCharId(sheet.id);
    setActiveTab('geral');
  };

  const handleApplyLevelUp = async (updated: CharacterSheet) => {
    await upsertCharacter(updated);
  };

  const handleCreateNewAgent = async () => {
    setCreateAgentModalVisible(false);
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
      transcendEvery5Nex: false,
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
      category: (weapon.finalCategory || weapon.weaponCategory || 'I').split(' ')[0] as any,
      spaces: weapon.finalSpaces,
      details: `Arma (${weapon.finalDamage}, Crítico: ${weapon.finalCritical}) • ${weapon.specialRules}`,
      equipped: true,
    };

    const newItems: CharacterInventoryItem[] = [newInv];
    if (weapon.ammoCategory && weapon.ammoCategory !== '—' && weapon.weaponType !== 'Corpo a corpo') {
      const ammoTitle = weapon.ammoName || `${weapon.ammoType || 'Munição'} (${weapon.name})`;
      newItems.push({
        id: `inv_ammo_${Date.now()}`,
        name: ammoTitle,
        category: (weapon.ammoCategory || '0').split(' ')[0] as any,
        spaces: 1,
        details: `Pacote de Munição para ${weapon.name}`,
        equipped: true,
      });
    }

    await updateActiveChar({
      attacks: [...existingAttacks, newAttack],
      inventory: [...existingInventory, ...newItems],
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

    const parsedCrit = parseCritical(attack.critical);
    rollSkillTest(
      attrVal,
      totalBonus,
      `Ataque: ${attack.name} (${skillName})`,
      parsedCrit.threat
    );
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
    const defaultOrigin =
      abSubCategory === 'paranormal'
        ? `Poder Paranormal${abElement !== 'Nenhum' ? ` (${abElement})` : ''}`
        : abSubCategory === 'classe'
        ? `Poder de ${classObj?.name || 'Classe'}`
        : abType === 'ritual'
        ? `Ritual${abElement !== 'Nenhum' ? ` (${abElement})` : ''}`
        : 'Habilidade Manual';

    const newAb: CharacterAbility = {
      id: `ab_${Date.now()}`,
      name: abName.trim(),
      cost: abCost.trim() || 'Passiva',
      originPage: abOrigin.trim() || defaultOrigin,
      description: abDesc.trim(),
      type: abType,
    };
    // Adicionar habilidade manual não aumenta NEX
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

  // Reações de Defesa de Ordem Paranormal (Esquiva = Defesa + Reflexos; Bloqueio RD = Fortitude; Contra-ataque = Luta)
  const reflexosEntry = activeChar?.skills?.['Reflexos'] || { degree: 0, bonus: 0 };
  const reflexosBonus = (reflexosEntry.degree || 0) + (reflexosEntry.bonus || 0);
  const esquivaTotal = totalDefense + reflexosBonus;

  const fortitudeEntry = activeChar?.skills?.['Fortitude'] || { degree: 0, bonus: 0 };
  const bloqueioRD = (fortitudeEntry.degree || 0) + (fortitudeEntry.bonus || 0);

  const lutaEntry = activeChar?.skills?.['Luta'] || { degree: 0, bonus: 0 };
  const contraAtaqueBonus = (lutaEntry.degree || 0) + (lutaEntry.bonus || 0);

  if (!activeChar) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 90 + bottomInset }]}>
          <View style={styles.topRow}>
            <View style={{ flex: 1, minWidth: 160, marginRight: 8 }}>
              <Text style={styles.heading}>Fichas de Agentes</Text>
              <Text style={styles.subHeading}>
                Ficha completa de Ordem Paranormal: Livro Base & Sobrevivendo ao Horror.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={[
                  styles.newBtn,
                  {
                    backgroundColor: colors.primarySoft,
                    borderWidth: 1,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => openManual('characters')}
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.newBtnText, { color: colors.primary }]}>Manual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.newBtn,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleCreateNewAgent}
              >
                <Ionicons name="create-outline" size={18} color={colors.text} />
                <Text style={[styles.newBtnText, { color: colors.text }]}>Criar Manual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={() => setCreateAgentModalVisible(true)}
              >
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={styles.newBtnText}>Criar Assistido</Text>
              </TouchableOpacity>
            </View>
          </View>

          {characters.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="person-add-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum agente cadastrado</Text>
              <Text style={styles.emptySub}>
                Escolha como prefere criar seu agente da Ordem Paranormal:
              </Text>

              <View style={styles.emptyActionsGrid}>
                <TouchableOpacity
                  style={styles.emptyActionCard}
                  onPress={handleCreateNewAgent}
                >
                  <View style={[styles.emptyActionIconCircle, { backgroundColor: colors.surfaceHighlight }]}>
                    <Ionicons name="create-outline" size={24} color={colors.text} />
                  </View>
                  <Text style={styles.emptyActionTitle}>Criar Agente Manual</Text>
                  <Text style={styles.emptyActionDesc}>
                    Crie a ficha imediatamente com total liberdade para editar tudo: atributos, perícias e os valores máximos de PV, PE e Sanidade.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.emptyActionCard, { borderColor: colors.primary }]}
                  onPress={() => setCreateAgentModalVisible(true)}
                >
                  <View style={[styles.emptyActionIconCircle, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="sparkles" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.emptyActionTitle, { color: colors.primary }]}>
                    Criar Agente Assistido
                  </Text>
                  <Text style={styles.emptyActionDesc}>
                    Guia passo a passo pelas regras oficiais: Origem, Classe, Atributos (4 pontos livres), Perícias e Habilidades de 5% NEX.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            characters.map((char) => {
              const cls = getEntityById(char.classId);
              const orig = getEntityById(char.originId);
              const trk = getEntityById(char.trackId);
              const def = 10 + char.attributes.AGI + (char.defenseEquip || 0) + (char.defenseOther || 0);

              const openCharPreview = () =>
                openRecordPreview({
                  target: { kind: 'character', character: char },
                  primaryAction: {
                    label: 'Abrir Ficha Completa',
                    icon: 'open-outline',
                    onPress: () => {
                      setActiveCharId(char.id);
                      setActiveTab('geral');
                    },
                  },
                });

              return (
                <TouchableOpacity
                  key={char.id}
                  style={styles.charCard}
                  onPress={() => {
                    setActiveCharId(char.id);
                    setActiveTab('geral');
                  }}
                  onLongPress={openCharPreview}
                  delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                  testID={`char-card-${char.id}`}
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
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openCharPreview();
                        }}
                        accessibilityLabel="Inspecionar Ficha"
                        testID={`char-info-${char.id}`}
                      >
                        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cardPrintBtn}
                        onPress={() => {
                          setSharingChar(char);
                          setCopiedCodeToast(false);
                          setShareModalVisible(true);
                        }}
                        accessibilityLabel="Compartilhar Ficha com o Mestre"
                      >
                        <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
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

        {/* Modal de Compartilhamento de Ficha de Agente */}
        <Modal visible={shareModalVisible} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12, maxHeight: '85%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>Compartilhar Agente</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {sharingChar ? formatAgentSummary(sharingChar) : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShareModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                Envie este código para o Mestre da sua campanha. Ele poderá vincular sua ficha à mesa na <Text style={{ color: colors.primary, fontWeight: '800' }}>Aba de Mestre</Text> colando este código!
              </Text>

              <View style={{ backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 }}>
                <TextInput
                  style={{ color: colors.text, fontSize: 12, minHeight: 90, textAlignVertical: 'top' }}
                  multiline
                  editable={false}
                  selectTextOnFocus
                  value={sharingChar ? encodeAgentShareCode(sharingChar) : ''}
                />
              </View>

              {copiedCodeToast && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B98122', padding: 8, borderRadius: 8 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '800' }}>
                    Código copiado para a área de transferência!
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}
                  onPress={() => setShareModalVisible(false)}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
                  onPress={async () => {
                    if (!sharingChar) return;
                    const code = encodeAgentShareCode(sharingChar);
                    try {
                      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(code);
                      }
                    } catch {}
                    setCopiedCodeToast(true);
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Copiar Código</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <CreateAgentModal
          visible={createAgentModalVisible}
          onClose={() => setCreateAgentModalVisible(false)}
          onFinish={handleFinishAssistedAgent}
          userProfile={userProfile}
          originsList={originsList}
          classesList={classesList}
          ritualsList={ritualsList}
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
            style={[
              styles.recalcBtn,
              {
                backgroundColor: colors.primarySoft,
                borderColor: colors.primary,
                borderWidth: 1,
              },
            ]}
            onPress={() => setLevelUpModalVisible(true)}
          >
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={[styles.recalcBtnText, { color: colors.primary, fontWeight: '800' }]}>
              +5% NEX (Assistido)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recalcBtn}
            onPress={() => openManual('characters')}
          >
            <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.recalcBtnText, { color: colors.primary }]}>Manual</Text>
          </TouchableOpacity>

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

          <TouchableOpacity
            style={[styles.recalcBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => {
              setSharingChar(activeChar);
              setCopiedCodeToast(false);
              setShareModalVisible(true);
            }}
          >
            <Ionicons name="share-social-outline" size={16} color={colors.primary} />
            <Text style={[styles.recalcBtnText, { color: colors.primary }]}>Compartilhar</Text>
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
            {/* Banner de Sincronização com a Mesa Virtual */}
            {tableStatus === 'connected' && virtualTable && (
              <View
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  borderWidth: 1,
                  borderColor: '#10B981',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name="radio" size={18} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 12 }}>
                      MESA VIRTUAL CONECTADA [{virtualTable.roomId}]
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                      Rolagens e alterações de PV/PE/SAN sincronizam ao vivo na mesa.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#10B981',
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  onPress={() => {
                    const agi = activeChar.attributes.AGI || 1;
                    const initEntry = activeChar.skills['Iniciativa'] || { degree: 0, bonus: 0 };
                    const bonus = (initEntry.degree || 0) + (initEntry.bonus || 0);
                    const roll = rollSkillTest(agi, bonus, `Iniciativa: ${activeChar.name}`);
                    rollTableInitiative(roll.total, activeChar.name);
                  }}
                >
                  <Ionicons name="dice" size={14} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Iniciativa</Text>
                </TouchableOpacity>
              </View>
            )}

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
                <View style={{ flex: 1.2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.fieldLabel}>NEX (%)</Text>
                    <TouchableOpacity
                      style={styles.nexLevelUpBadge}
                      onPress={() => setLevelUpModalVisible(true)}
                    >
                      <Ionicons name="arrow-up" size={11} color={colors.primary} />
                      <Text style={styles.nexLevelUpBadgeText}>Subir +5%</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      keyboardType="numeric"
                      value={String(activeChar.nex)}
                      onChangeText={(v) => {
                        const n = Math.min(99, Math.max(0, parseInt(v, 10) || 0));
                        const peR = Math.max(1, Math.floor(n / 5));
                        const dt = 10 + peR + activeChar.attributes.PRE;
                        updateActiveChar({ nex: n, peRound: peR, dtRituals: dt });
                      }}
                    />
                    <TouchableOpacity
                      style={styles.nexQuickPlusBtn}
                      onPress={() => setLevelUpModalVisible(true)}
                    >
                      <Ionicons name="sparkles" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
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

              {/* Regra Opcional da Ficha: Transcender a cada 5% de NEX */}
              <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="bonfire" size={16} color="#8B5CF6" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                        Transcender a cada 5% de NEX
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 }}>
                      Regra da mesa: permite que este agente escolha um Poder Paranormal (Transcender) a cada avanço de 5% de NEX.
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(activeChar.transcendEvery5Nex ?? userProfile?.transcendEvery5Nex)}
                    onValueChange={(val: boolean) => updateActiveChar({ transcendEvery5Nex: val })}
                    trackColor={{ false: colors.border, true: '#8B5CF6' }}
                    thumbColor={Boolean(activeChar.transcendEvery5Nex ?? userProfile?.transcendEvery5Nex) ? '#FFF' : colors.textSecondary}
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
                  onLongPress={() => {
                    if (originObj) {
                      openEntityPreview(originObj, {
                        primaryAction: {
                          label: 'Trocar Origem',
                          icon: 'swap-horizontal-outline',
                          onPress: () => {
                            setPickerSearch('');
                            setPickerModalType('origin');
                          },
                        },
                      });
                    }
                  }}
                  delayLongPress={DEFAULT_LONG_PRESS_DELAY}
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
                  onLongPress={() => {
                    if (classObj) {
                      openEntityPreview(classObj, {
                        primaryAction: {
                          label: 'Trocar Classe',
                          icon: 'swap-horizontal-outline',
                          onPress: () => {
                            setPickerSearch('');
                            setPickerModalType('class');
                          },
                        },
                      });
                    }
                  }}
                  delayLongPress={DEFAULT_LONG_PRESS_DELAY}
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
                  onLongPress={() => {
                    if (trackObj) {
                      openEntityPreview(trackObj, {
                        primaryAction: {
                          label: 'Trocar Trilha',
                          icon: 'swap-horizontal-outline',
                          onPress: () => {
                            setPickerSearch('');
                            setPickerModalType('track');
                          },
                        },
                      });
                    }
                  }}
                  delayLongPress={DEFAULT_LONG_PRESS_DELAY}
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={styles.sectionTitle}>Status Vital (PV, PE & Sanidade)</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  Toque em "Editar Máx" para alterar máximos
                </Text>
              </View>
              <StatCounterRow
                label="PV (Vida)"
                color="#EF4444"
                current={activeChar.pvCurrent}
                max={activeChar.pvMax}
                onChangeCurrent={(v) => updateActiveChar({ pvCurrent: Math.max(0, v) })}
                onChangeMax={(v) => updateActiveChar({ pvMax: Math.max(1, v) })}
              />
              <StatCounterRow
                label="PE (Esforço)"
                color="#F59E0B"
                current={activeChar.peCurrent}
                max={activeChar.peMax}
                onChangeCurrent={(v) => updateActiveChar({ peCurrent: Math.max(0, v) })}
                onChangeMax={(v) => updateActiveChar({ peMax: Math.max(1, v) })}
              />
              <StatCounterRow
                label="SAN (Sanidade)"
                color="#38BDF8"
                current={activeChar.sanCurrent}
                max={activeChar.sanMax}
                onChangeCurrent={(v) => updateActiveChar({ sanCurrent: Math.max(0, v) })}
                onChangeMax={(v) => updateActiveChar({ sanMax: Math.max(1, v) })}
              />

              {/* Avisos de Condições Vitais de Ordem Paranormal */}
              {activeChar.pvCurrent <= 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 1,
                    borderColor: '#EF4444',
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 12 }}>
                      ⚠️ MORRENDO (0 PV)
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      Inconsciente! No início de cada rodada, faça teste de Fortitude (DT 20).
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#EF4444',
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                    onPress={() => {
                      const fortitudeEntry = activeChar.skills['Fortitude'] || { degree: 0, bonus: 0 };
                      const fortitudeBonus = (fortitudeEntry.degree || 0) + (fortitudeEntry.bonus || 0);
                      rollSkillTest(
                        activeChar.attributes.VIG,
                        fortitudeBonus,
                        'Teste de Fortitude (Estabilizar / Morrendo)'
                      );
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                      DT 20
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeChar.pvCurrent > 0 &&
                activeChar.pvCurrent <= Math.floor(activeChar.pvMax / 2) && (
                  <View
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      borderWidth: 1,
                      borderColor: '#F59E0B',
                      borderRadius: 8,
                      padding: 8,
                      marginTop: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="water" size={16} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 12 }}>
                        MACHUCADO (PV ≤ {Math.floor(activeChar.pvMax / 2)})
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                        Menos da metade da vida. Habilidades de Sangue ativadas.
                      </Text>
                    </View>
                  </View>
                )}

              {activeChar.sanCurrent <= 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    borderWidth: 1,
                    borderColor: '#38BDF8',
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: '#38BDF8', fontWeight: '800', fontSize: 12 }}>
                      🧠 ENLOUQUECENDO (0 SAN)
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      Sanidade zerada! Faça teste de Vontade no início do seu turno.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#38BDF8',
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 6,
                    }}
                    onPress={() => {
                      const vontadeEntry = activeChar.skills['Vontade'] || { degree: 0, bonus: 0 };
                      const vontadeBonus = (vontadeEntry.degree || 0) + (vontadeEntry.bonus || 0);
                      rollSkillTest(
                        activeChar.attributes.PRE,
                        vontadeBonus,
                        'Teste de Vontade (Resistir à Loucura)'
                      );
                    }}
                  >
                    <Text style={{ color: '#000', fontSize: 11, fontWeight: '800' }}>
                      Rolar Vontade
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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

              {/* Reações de Defesa de Ordem Paranormal */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  marginTop: 10,
                  flexWrap: 'wrap',
                }}
              >
                {/* Esquiva */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    minWidth: 95,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#38BDF8',
                    alignItems: 'center',
                  }}
                  onPress={() =>
                    rollSkillTest(
                      activeChar.attributes.AGI,
                      reflexosBonus,
                      'Teste de Reflexos (Esquiva)'
                    )
                  }
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#38BDF8', textTransform: 'uppercase' }}>
                    Esquiva
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginVertical: 2 }}>
                    {esquivaTotal}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                    Defesa + Reflexos (+{reflexosBonus})
                  </Text>
                </TouchableOpacity>

                {/* Bloqueio */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    minWidth: 95,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#F59E0B',
                    alignItems: 'center',
                  }}
                  onPress={() =>
                    rollSkillTest(
                      activeChar.attributes.VIG,
                      bloqueioRD,
                      'Teste de Fortitude (Bloqueio / RD)'
                    )
                  }
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B', textTransform: 'uppercase' }}>
                    Bloqueio (RD)
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginVertical: 2 }}>
                    RD {bloqueioRD}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                    Reduz dano por Fortitude (+{bloqueioRD})
                  </Text>
                </TouchableOpacity>

                {/* Contra-ataque */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    minWidth: 95,
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: '#EF4444',
                    alignItems: 'center',
                  }}
                  onPress={() =>
                    rollSkillTest(
                      activeChar.attributes.FOR,
                      contraAtaqueBonus,
                      'Teste de Luta (Contra-ataque)'
                    )
                  }
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' }}>
                    Contra-ataque
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginVertical: 2 }}>
                    +{contraAtaqueBonus}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                    Teste oposto de Luta
                  </Text>
                </TouchableOpacity>
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
              activeChar.attacks.map((atk) => {
                const openAttackPreview = () =>
                  openRecordPreview({
                    target: {
                      kind: 'character_attack',
                      attack: atk,
                      customWeapon: atk.customWeaponId
                        ? customWeapons.find((w) => w.id === atk.customWeaponId)
                        : undefined,
                    },
                  });
                return (
                  <TouchableOpacity
                    key={atk.id}
                    style={styles.attackCard}
                    activeOpacity={0.92}
                    onLongPress={openAttackPreview}
                    delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    testID={`sheet-attack-${atk.id}`}
                  >
                    <View style={styles.attackCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attackCardName}>{atk.name}</Text>
                        <Text style={styles.attackCardSub}>
                          Teste: {atk.test} • Alcance: {atk.range}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            openAttackPreview();
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          testID={`sheet-attack-info-${atk.id}`}
                        >
                          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
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
                  </TouchableOpacity>
                );
              })
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
                Toque no grau de treino (+0, +5, +10, +15) e ajuste bônus de equipamentos (+/-). Segure na perícia para ver detalhes.
              </Text>
            </View>

            {OFFICIAL_SKILLS_LIST.map((sk) => {
              const entry = activeChar.skills[sk.name] || { degree: 0, bonus: 0 };
              const degree = entry.degree || 0;
              const bonus = entry.bonus || 0;
              const totalBonus = degree + bonus;
              const attrVal = activeChar.attributes[sk.attr];

              return (
                <TouchableOpacity
                  key={sk.name}
                  style={styles.skillOfficialRow}
                  activeOpacity={0.85}
                  onLongPress={() => openSkillPreview(sk)}
                  delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                  testID={`sheet-skill-${sk.name}`}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={styles.skillOfficialName}>
                        {sk.name}
                        {sk.trainedOnly ? '*' : ''}
                        {sk.armorPenalty ? '+' : ''}
                        <Text style={styles.skillAttr}> ({sk.attr})</Text>
                      </Text>
                      <TouchableOpacity
                        onPress={() => openSkillPreview(sk)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        testID={`sheet-skill-info-${sk.name}`}
                      >
                        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
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
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel={`Grau de treino de ${sk.name}: +${degree}`}
                  >
                    <Text style={styles.degreeText}>+{degree}</Text>
                  </TouchableOpacity>

                  {/* Outros bônus (+/-) */}
                  <View style={styles.skillOtherBonusStepper}>
                    <TouchableOpacity
                      onPress={() => updateSkillOtherBonus(sk.name, -1)}
                      hitSlop={{ top: 12, bottom: 12, left: 10, right: 6 }}
                      style={{ padding: 4 }}
                      accessibilityLabel="Diminuir bônus"
                    >
                      <Ionicons name="remove-circle-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={styles.skillOtherBonusText}>
                      {bonus >= 0 ? `+${bonus}` : bonus}
                    </Text>
                    <TouchableOpacity
                      onPress={() => updateSkillOtherBonus(sk.name, 1)}
                      hitSlop={{ top: 12, bottom: 12, left: 6, right: 10 }}
                      style={{ padding: 4 }}
                      accessibilityLabel="Aumentar bônus"
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
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
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      >
                        <Ionicons name="dice" size={14} color="#FFF" />
                        <Text style={styles.skillRollText} numberOfLines={1} adjustsFontSizeToFit>
                          {displayBadge}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </TouchableOpacity>
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

            {(() => {
              const allAbs = activeChar.abilities || [];
              const allEids = activeChar.entityIds || [];

              if (allAbs.length === 0 && allEids.length === 0) {
                return (
                  <Text style={styles.emptyHint}>
                    Nenhuma habilidade ou ritual adicionado ainda. Toque em "Vincular do Compêndio" ou "Criar Manual".
                  </Text>
                );
              }

              // Separar itens por categoria oficial
              type UnifiedAbility = {
                id: string;
                name: string;
                originText: string;
                cost?: string;
                description: string;
                isEntity: boolean;
                categoryGroup: 'class_power' | 'paranormal_power' | 'ritual' | 'general';
                element?: string;
              };

              const unifiedList: UnifiedAbility[] = [];

              allAbs.forEach((ab) => {
                const orig = (ab.originPage || '').toLowerCase();
                const nm = ab.name.toLowerCase();
                let group: 'class_power' | 'paranormal_power' | 'ritual' | 'general' = 'general';

                if (ab.type === 'ritual' || orig.includes('ritual')) {
                  group = 'ritual';
                } else if (
                  orig.includes('paranormal') ||
                  orig.includes('sangue') ||
                  orig.includes('morte') ||
                  orig.includes('conhecimento') ||
                  orig.includes('energia') ||
                  nm.includes('transcender')
                ) {
                  group = 'paranormal_power';
                } else if (
                  ab.type === 'poder' &&
                  (orig.includes('combatente') || orig.includes('especialista') || orig.includes('ocultista') || orig.includes('classe'))
                ) {
                  group = 'class_power';
                }

                unifiedList.push({
                  id: ab.id,
                  name: ab.name,
                  originText: ab.originPage || ab.type,
                  cost: ab.cost,
                  description: ab.description,
                  isEntity: false,
                  categoryGroup: group,
                });
              });

              allEids.forEach((eid) => {
                const ent = getEntityById(eid);
                if (!ent) return;
                const sub = (ent.subCategory || '').toLowerCase();
                const isClass = sub.includes('combatente') || sub.includes('especialista') || sub.includes('ocultista');
                const isParanormal = sub.includes('paranormal') || (!isClass && ent.element && ent.element !== 'Nenhum');

                let group: 'class_power' | 'paranormal_power' | 'ritual' | 'general' = 'general';
                if (ent.category === 'ritual') {
                  group = 'ritual';
                } else if (ent.category === 'power' && isClass) {
                  group = 'class_power';
                } else if (ent.category === 'power' && isParanormal) {
                  group = 'paranormal_power';
                }

                unifiedList.push({
                  id: eid,
                  name: ent.name,
                  originText: `${ent.subCategory} • ${ent.bookTitle}`,
                  description: ent.summary || ent.description,
                  isEntity: true,
                  categoryGroup: group,
                  element: ent.element,
                });
              });

              const classPowers = unifiedList.filter((x) => x.categoryGroup === 'class_power');
              const paranormalPowers = unifiedList.filter((x) => x.categoryGroup === 'paranormal_power');
              const rituals = unifiedList.filter((x) => x.categoryGroup === 'ritual');
              const generalAbilities = unifiedList.filter((x) => x.categoryGroup === 'general');

              const renderCard = (item: UnifiedAbility) => {
                const openAbilityPreview = () => {
                  if (item.isEntity) {
                    openEntityPreview(item.id);
                  } else {
                    openRecordPreview({
                      target: {
                        kind: 'character_ability',
                        ability: {
                          id: item.id,
                          name: item.name,
                          cost: item.cost || '',
                          originPage: item.originText,
                          description: item.description,
                          type:
                            item.categoryGroup === 'ritual'
                              ? 'ritual'
                              : item.categoryGroup === 'general'
                              ? 'habilidade'
                              : 'poder',
                        },
                      },
                    });
                  }
                };

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.abilityCard}
                    activeOpacity={0.85}
                    onPress={openAbilityPreview}
                    onLongPress={openAbilityPreview}
                    delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    testID={`sheet-ability-${item.id}`}
                  >
                    <View style={styles.abilityCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.abilityCardName}>{item.name}</Text>
                        <Text style={styles.abilityCardOrigin}>
                          {item.originText}{item.element && item.element !== 'Nenhum' ? ` • ${item.element}` : ''}
                        </Text>
                      </View>
                      {item.cost ? (
                        <TouchableOpacity
                          style={styles.spendPeBtn}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleSpendAbilityPE(item.cost!, item.name);
                          }}
                        >
                          <Ionicons name="flash" size={12} color="#F59E0B" />
                          <Text style={styles.spendPeBtnText}>{item.cost}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openAbilityPreview();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        testID={`sheet-ability-info-${item.id}`}
                      >
                        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          if (item.isEntity) {
                            updateActiveChar({
                              entityIds: activeChar.entityIds.filter((x) => x !== item.id),
                            });
                          } else {
                            updateActiveChar({
                              abilities: (activeChar.abilities || []).filter((a) => a.id !== item.id),
                            });
                          }
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    {item.description ? (
                      <Text style={styles.abilityCardDesc}>{item.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              };

              return (
                <View style={{ gap: 14 }}>
                  {/* SEÇÃO 1: PODERES DE CLASSE */}
                  {classPowers.length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 2 }}>
                        <Ionicons name="shield" size={16} color="#F59E0B" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                          Poderes de Classe ({classPowers.length})
                        </Text>
                      </View>
                      <View style={{ gap: 8 }}>{classPowers.map(renderCard)}</View>
                    </View>
                  )}

                  {/* SEÇÃO 2: PODERES PARANORMAIS */}
                  {paranormalPowers.length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 2 }}>
                        <Ionicons name="eye" size={16} color="#8B5CF6" />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                          Poderes Paranormais ({paranormalPowers.length})
                        </Text>
                      </View>
                      <View style={{ gap: 8 }}>{paranormalPowers.map(renderCard)}</View>
                    </View>
                  )}

                  {/* SEÇÃO 3: RITUAIS */}
                  {rituals.length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 2 }}>
                        <Ionicons name="sparkles" size={16} color={colors.primary} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                          Rituais ({rituals.length})
                        </Text>
                      </View>
                      <View style={{ gap: 8 }}>{rituals.map(renderCard)}</View>
                    </View>
                  )}

                  {/* SEÇÃO 4: HABILIDADES DE ORIGEM, TRILHA & GERAIS */}
                  {generalAbilities.length > 0 && (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 2 }}>
                        <Ionicons name="star" size={16} color={colors.accent} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                          Habilidades de Origem, Trilha & Gerais ({generalAbilities.length})
                        </Text>
                      </View>
                      <View style={{ gap: 8 }}>{generalAbilities.map(renderCard)}</View>
                    </View>
                  )}
                </View>
              );
            })()}
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

            {/* Alerta de Sobrecarga (Regra Oficial de Carga Excedida) */}
            {currentLoad > maxLoad && (
              <View
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderWidth: 1,
                  borderColor: '#EF4444',
                  borderRadius: 8,
                  padding: 10,
                  marginTop: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="warning" size={20} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 12 }}>
                    CONDIÇÃO: SOBRECARREGADO
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    Carga excedida ({currentLoad}/{maxLoad} espaços). Você sofre –2d20 em testes de Força e Agilidade e seu deslocamento é reduzido em 3m.
                  </Text>
                </View>
              </View>
            )}

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
              activeChar.inventory.map((it) => {
                const openInvPreview = () =>
                  openRecordPreview({
                    target: { kind: 'character_inventory', item: it },
                  });
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={styles.invItemRow}
                    activeOpacity={0.85}
                    onPress={openInvPreview}
                    onLongPress={openInvPreview}
                    delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    testID={`sheet-inv-${it.id}`}
                  >
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
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openInvPreview();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      testID={`sheet-inv-info-${it.id}`}
                    >
                      <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation?.();
                        updateActiveChar({
                          inventory: (activeChar.inventory || []).filter((x) => x.id !== it.id),
                        });
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
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
            {/* Seletor de Categoria */}
            <View>
              <Text style={styles.fieldLabel}>Tipo de Habilidade</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {[
                  { id: 'trilha', label: 'Habilidade de Trilha', type: 'habilidade' as const },
                  { id: 'classe', label: 'Poder de Classe', type: 'poder' as const },
                  { id: 'paranormal', label: 'Poder Paranormal', type: 'poder' as const },
                  { id: 'ritual', label: 'Ritual', type: 'ritual' as const },
                ].map((item) => {
                  const active = abSubCategory === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.rankPill,
                        active && (item.id === 'paranormal' ? { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' } : styles.rankPillActive),
                      ]}
                      onPress={() => {
                        setAbSubCategory(item.id as any);
                        setAbType(item.type);
                      }}
                    >
                      <Text style={[styles.rankPillText, active && styles.rankPillTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Elemento quando Paranormal ou Ritual */}
            {(abSubCategory === 'paranormal' || abSubCategory === 'ritual') && (
              <View>
                <Text style={styles.fieldLabel}>Elemento Paranormal</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {['Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'].map((el) => {
                    const active = abElement === el;
                    return (
                      <TouchableOpacity
                        key={el}
                        style={[styles.rankPill, active && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
                        onPress={() => setAbElement(el)}
                      >
                        <Text style={[styles.rankPillText, active && styles.rankPillTextActive]}>{el}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Atalho para importar do Compêndio */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surfaceElevated,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                alignSelf: 'flex-start',
              }}
              onPress={() => {
                setAbilityModalVisible(false);
                setPickerSearch('');
                if (abSubCategory === 'paranormal') {
                  setCompendiumFilterTab('paranormal_powers');
                } else if (abSubCategory === 'classe') {
                  setCompendiumFilterTab('class_powers');
                } else if (abSubCategory === 'ritual') {
                  setCompendiumFilterTab('rituals');
                } else {
                  setCompendiumFilterTab('all');
                }
                setPickerModalType('link_compendium');
              }}
            >
              <Ionicons name="book-outline" size={14} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                Ou escolher diretamente do Compêndio
              </Text>
            </TouchableOpacity>

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
                  placeholder={
                    abSubCategory === 'paranormal'
                      ? 'Poder Paranormal'
                      : abSubCategory === 'classe'
                      ? 'Poder de Classe'
                      : 'Ex: NEX 10%, Trilha'
                  }
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
            style={[styles.input, { margin: 14, marginBottom: pickerModalType === 'link_compendium' ? 6 : 14 }]}
            placeholder="Filtrar por nome..."
            placeholderTextColor={colors.textMuted}
            value={pickerSearch}
            onChangeText={setPickerSearch}
          />

          {pickerModalType === 'link_compendium' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 14, paddingBottom: 10 }}>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'class_powers', label: 'Poderes de Classe' },
                { id: 'paranormal_powers', label: 'Poderes Paranormais' },
                { id: 'rituals', label: 'Rituais' },
                { id: 'items', label: 'Itens & Armas' },
              ].map((tab) => {
                const active = compendiumFilterTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.rankPill,
                      active && (tab.id === 'paranormal_powers' ? { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' } : styles.rankPillActive),
                    ]}
                    onPress={() => setCompendiumFilterTab(tab.id as any)}
                  >
                    <Text style={[styles.rankPillText, active && styles.rankPillTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

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
                  .map((w) => {
                    const openArmariaPreview = () =>
                      openRecordPreview({
                        target: { kind: 'custom_weapon', weapon: w },
                        primaryAction: {
                          label: 'Equipar na Ficha',
                          onPress: () => handleAddWeaponFromArmaria(w),
                        },
                      });
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={styles.pickerItem}
                        onPress={() => handleAddWeaponFromArmaria(w)}
                        onLongPress={openArmariaPreview}
                        delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickerItemTitle}>{w.name}</Text>
                          <Text style={styles.pickerItemSub}>
                            Dano: {w.finalDamage} • Crítico: {w.finalCritical} • Cat {w.finalCategory}
                            {w.ammoCategory && w.ammoCategory !== '—' && w.weaponType !== 'Corpo a corpo' ? ` • Balas Cat ${w.ammoCategory}` : ''} • {w.specialRules}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openArmariaPreview();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <Ionicons name="add-circle" size={22} color={colors.primary} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
              )
            ) : pickerModalType === 'add_weapon_compendium' ? (
              compendiumWeapons
                .filter((w) => w.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .slice(0, 80)
                .map((w) => {
                  const openCompWeaponPreview = () =>
                    openEntityPreview(w, {
                      primaryAction: {
                        label: 'Equipar na Ficha',
                        onPress: () => handleAddWeaponFromCompendium(w),
                      },
                    });
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={styles.pickerItem}
                      onPress={() => handleAddWeaponFromCompendium(w)}
                      onLongPress={openCompWeaponPreview}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemTitle}>{w.name}</Text>
                        <Text style={styles.pickerItemSub}>
                          {w.subCategory} • Dano: {w.damage} • Crítico: {w.critical} • Cat {w.itemCategory || '0'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            openCompWeaponPreview();
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <Ionicons name="add-circle" size={22} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  );
                })
            ) : (
              (() => {
                let baseList =
                  pickerModalType === 'origin'
                    ? originsList
                    : pickerModalType === 'class'
                    ? classesList
                    : pickerModalType === 'track'
                    ? tracksList
                    : equipableEntities;

                if (pickerModalType === 'link_compendium') {
                  if (compendiumFilterTab === 'class_powers') {
                    baseList = baseList.filter((e) => {
                      const sub = (e.subCategory || '').toLowerCase();
                      return e.category === 'power' && (sub.includes('combatente') || sub.includes('especialista') || sub.includes('ocultista'));
                    });
                  } else if (compendiumFilterTab === 'paranormal_powers') {
                    baseList = baseList.filter((e) => {
                      const sub = (e.subCategory || '').toLowerCase();
                      const isClass = sub.includes('combatente') || sub.includes('especialista') || sub.includes('ocultista');
                      return e.category === 'power' && (sub.includes('paranormal') || (!isClass && e.element && e.element !== 'Nenhum'));
                    });
                  } else if (compendiumFilterTab === 'rituals') {
                    baseList = baseList.filter((e) => e.category === 'ritual');
                  } else if (compendiumFilterTab === 'items') {
                    baseList = baseList.filter((e) => e.category === 'item' || e.category === 'weapon');
                  }
                }

                return baseList
                  .filter((e) => e.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()))
                  .slice(0, 80)
                  .map((item) => {
                    const selectPickerItem = async () => {
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
                    };

                    const openPickerPreview = () =>
                      openEntityPreview(item, {
                        primaryAction: {
                          label:
                            pickerModalType === 'link_compendium'
                              ? 'Vincular à Ficha'
                              : 'Escolher este Registro',
                          onPress: () => {
                            void selectPickerItem();
                          },
                        },
                      });

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.pickerItem}
                        onPress={selectPickerItem}
                        onLongPress={openPickerPreview}
                        delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pickerItemTitle}>{item.name}</Text>
                          <Text style={styles.pickerItemSub}>
                            {item.subCategory} • {item.bookTitle} • {item.summary}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            openPickerPreview();
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  });
              })()
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

      <CreateAgentModal
        visible={createAgentModalVisible}
        onClose={() => setCreateAgentModalVisible(false)}
        onFinish={handleFinishAssistedAgent}
        userProfile={userProfile}
        originsList={originsList}
        classesList={classesList}
        ritualsList={ritualsList}
      />

      <LevelUpModal
        visible={levelUpModalVisible}
        character={activeChar}
        classEntity={classObj}
        trackEntity={trackObj}
        allTracksList={tracksList}
        allPowersList={powersList}
        allRitualsList={ritualsList}
        userProfile={userProfile}
        onClose={() => setLevelUpModalVisible(false)}
        onApplyLevelUp={handleApplyLevelUp}
      />

      {/* Modal de Compartilhamento de Ficha de Agente */}
      <Modal visible={shareModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, gap: 12, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>Compartilhar Agente</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {sharingChar ? formatAgentSummary(sharingChar) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShareModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              Envie este código para o Mestre da sua campanha. Ele poderá vincular sua ficha à mesa na <Text style={{ color: colors.primary, fontWeight: '800' }}>Aba de Mestre</Text> colando este código!
            </Text>

            <View style={{ backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 }}>
              <TextInput
                style={{ color: colors.text, fontSize: 12, minHeight: 90, textAlignVertical: 'top' }}
                multiline
                editable={false}
                selectTextOnFocus
                value={sharingChar ? encodeAgentShareCode(sharingChar) : ''}
              />
            </View>

            {copiedCodeToast && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B98122', padding: 8, borderRadius: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '800' }}>
                  Código copiado para a área de transferência!
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }}
                onPress={() => setShareModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Fechar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
                onPress={async () => {
                  if (!sharingChar) return;
                  const code = encodeAgentShareCode(sharingChar);
                  try {
                    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(code);
                    }
                  } catch {}
                  setCopiedCodeToast(true);
                }}
              >
                <Ionicons name="copy-outline" size={16} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Copiar Código</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const StatCounterRow: React.FC<{
  label: string;
  color: string;
  current: number;
  max: number;
  onChangeCurrent: (val: number) => void;
  onChangeMax?: (val: number) => void;
}> = ({ label, color, current, max, onChangeCurrent, onChangeMax }) => {
  const styles = useThemedStyles(createStyles);
  const [editingMax, setEditingMax] = useState(false);
  const [maxInputVal, setMaxInputVal] = useState(String(max));

  useEffect(() => {
    setMaxInputVal(String(max));
  }, [max]);

  return (
    <View style={styles.statCounterWrap}>
      <View style={styles.statCounterRowTop}>
        <Text style={[styles.statCounterLabel, { color }]}>{label}</Text>
        {onChangeMax && (
          <TouchableOpacity
            style={styles.editMaxToggle}
            onPress={() => setEditingMax(!editingMax)}
          >
            <Ionicons name={editingMax ? 'checkmark' : 'pencil'} size={12} color={color} />
            <Text style={[styles.editMaxToggleText, { color }]}>
              {editingMax ? 'Concluir' : 'Editar Máx'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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

      {editingMax && onChangeMax && (
        <View style={styles.editMaxBox}>
          <Text style={styles.editMaxLabel}>Valor Máximo Personalizado:</Text>
          <View style={styles.editMaxControls}>
            <TouchableOpacity
              style={styles.cntBtn}
              onPress={() => {
                const next = Math.max(1, max - 5);
                onChangeMax(next);
                setMaxInputVal(String(next));
              }}
            >
              <Text style={styles.cntBtnText}>-5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cntBtn}
              onPress={() => {
                const next = Math.max(1, max - 1);
                onChangeMax(next);
                setMaxInputVal(String(next));
              }}
            >
              <Text style={styles.cntBtnText}>-1</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.editMaxInput}
              keyboardType="numeric"
              value={maxInputVal}
              onChangeText={(txt) => {
                setMaxInputVal(txt);
                const n = parseInt(txt, 10);
                if (!isNaN(n) && n >= 1) onChangeMax(n);
              }}
            />
            <TouchableOpacity
              style={styles.cntBtn}
              onPress={() => {
                const next = max + 1;
                onChangeMax(next);
                setMaxInputVal(String(next));
              }}
            >
              <Text style={styles.cntBtnText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cntBtn}
              onPress={() => {
                const next = max + 5;
                onChangeMax(next);
                setMaxInputVal(String(next));
              }}
            >
              <Text style={styles.cntBtnText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    flexWrap: 'wrap',
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
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  statCounterRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCounterLabel: {
    fontWeight: '800',
    fontSize: 13,
  },
  editMaxToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surfaceHighlight,
  },
  editMaxToggleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  editMaxBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 2,
  },
  editMaxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  editMaxControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editMaxInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 50,
    textAlign: 'center',
  },
  emptyActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
    width: '100%',
  },
  emptyActionCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
    alignItems: 'center',
  },
  emptyActionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyActionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  emptyActionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  nexLevelUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nexLevelUpBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  nexQuickPlusBtn: {
    backgroundColor: colors.primary,
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rollAttackBtn: {
    flex: 1.2,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rollAttackBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  rollDamageBtn: {
    flex: 1,
    minWidth: 85,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rollDamageBtnText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
  },
  rollCritBtn: {
    flex: 1,
    minWidth: 85,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#991B1B',
    paddingVertical: 7,
    paddingHorizontal: 8,
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
    paddingVertical: 6,
    minHeight: 32,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
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
