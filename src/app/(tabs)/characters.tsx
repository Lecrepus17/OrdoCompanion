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
import { useRouter } from 'expo-router';
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
  CriticalDamageMode,
  CustomCatalogItem,
  CustomWeapon,
  InventoryItemCategoryGroup,
  ItemMechanic,
  ParanormalElement,
  ResolvedAttackDamage,
  SituationalDamageToggles,
  TrainingDegree,
} from '../../types/compendium';
import { confirmAction, showAlert } from '../../utils/alert';
import { copyToClipboard } from '../../utils/clipboard';
import { normalizeCriticalDamageMode } from '../../utils/dice';
import {
  buildAttackFromCustomWeapon,
  buildCustomWeaponFromCompendiumEntity,
  buildCustomWeaponFromLegacyAttack,
  parseCritical,
} from '../../utils/weapons';
import {
  detectAgentDamageModifiers,
  resolveAgentAttackDamage,
  resolveAgentRitualDamage,
} from '../../utils/damageModifiers';
import { AttackPreparationModal } from '../../components/AttackPreparationModal';
import { CriticalModePromptModal } from '../../components/CriticalModePromptModal';
import { ItemEditorModal, ItemEditorSaveResult } from '../../components/ItemEditorModal';
import { WeaponEditorModal } from '../../components/WeaponEditorModal';
import {
  buildCatalogItemFromCuratedItem,
  buildInventoryItemFromCuratedItem,
  calculateInventoryMechanicsSummary,
  calculateItemSaveDt,
  CuratedCompendiumItem,
  formatSpacesLabel,
  getCuratedCompendiumItems,
} from '../../utils/inventoryItems';
import PrintSheetModal from '../../components/PrintSheetModal';
import CreateAgentModal from '../../components/CreateAgentModal';
import LevelUpModal from '../../components/LevelUpModal';
import ProtectionModal, { ProtectionApplyPayload } from '../../components/ProtectionModal';
import { encodeAgentShareCode, formatAgentSummary } from '../../utils/agentSharing';
import {
  OFFICIAL_SKILLS_LIST,
  SkillDefinition,
  calculateStatIncreases,
  calculateMaxStats,
  calculateCharacterVitals,
  checkPrerequisite,
  confirmUnmetPrerequisites,
  getPeRoundLimit,
  getRitualDt,
} from '../../utils/progression';
import { DEFAULT_LONG_PRESS_DELAY } from '../../types/recordPreview';
import {
  getCharacterProficiencies,
  checkWeaponProficiency,
  checkProtectionProficiency,
  getProtectionDicePenalty,
  WeaponProficiencyCheckInput,
} from '../../utils/proficiencies';
import {
  calculateActiveItemSkillBonuses,
  BANNED_ITEM_SKILLS,
  isBannedItemSkill,
} from '../../utils/inventorySkills';

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

export default function CharactersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);
  const {
    characters,
    upsertCharacter,
    deleteCharacter,
    customWeapons,
    upsertCustomWeapon,
    equipWeaponToCharacter,
    removeAttackFromCharacter,
    customItems,
    upsertCustomItem,
    equipCatalogItemToCharacter,
    entities,
    getEntityById,
    rollSkillTest,
    rollFormula,
    rollWeaponDamage,
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
      try {
        window.history.pushState({ screen: 'character-sheet' }, '');
      } catch {}
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
    | 'add_item_compendium'
    | 'add_item_depot'
  >(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [itemCompendiumFilter, setItemCompendiumFilter] = useState<'all' | InventoryItemCategoryGroup>('all');

  // Weapon Editor & Unified Attack Modals
  const [weaponEditorVisible, setWeaponEditorVisible] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<CustomWeapon | null>(null);
  const [editingLegacyAttack, setEditingLegacyAttack] = useState<CharacterAttack | null>(null);
  const [importChoiceWeapon, setImportChoiceWeapon] = useState<CustomWeapon | null>(null);
  const [deleteAttackChoice, setDeleteAttackChoice] = useState<CharacterAttack | null>(null);
  const [prepModalAttack, setPrepModalAttack] = useState<CharacterAttack | null>(null);
  const [ritualTierById, setRitualTierById] = useState<
    Record<string, 'padrao' | 'discente' | 'verdadeiro'>
  >({});
  const [critPromptAttack, setCritPromptAttack] = useState<{
    attack: CharacterAttack;
    isMaxDamage: boolean;
    resolved?: ResolvedAttackDamage;
  } | null>(null);

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

  // Unified Item Editor & Item Mechanics Modals
  const [itemEditorVisible, setItemEditorVisible] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState<CharacterInventoryItem | null>(null);
  const [importChoiceItem, setImportChoiceItem] = useState<CustomCatalogItem | null>(null);
  const [healChoiceModal, setHealChoiceModal] = useState<{
    item: CharacterInventoryItem;
    mechanic: ItemMechanic;
  } | null>(null);

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
  const [protectionModalVisible, setProtectionModalVisible] = useState(false);

  const activeChar = useMemo(
    () => characters.find((c) => c.id === activeCharId) || null,
    [characters, activeCharId]
  );

  // Proficiências Canônicas do Agente (R2)
  const characterProficiencies = useMemo(() => {
    if (!activeChar) return null;
    return getCharacterProficiencies(activeChar);
  }, [activeChar]);

  // Perfil dinâmico de modificadores de dano por agente
  const agentDamageProfile = useMemo(() => {
    if (!activeChar) return null;
    return detectAgentDamageModifiers(activeChar, getEntityById);
  }, [activeChar, getEntityById]);

  // Bônus de Vestimentas e Utensílios Canônicos (R3)
  const itemSkillBonuses = useMemo(() => {
    if (!activeChar?.inventory) {
      return {
        effectiveBonuses: {},
        activeClothesCount: 0,
        isOverLimit: false,
        exceededClothes: [],
        warnings: [],
      };
    }
    return calculateActiveItemSkillBonuses(activeChar.inventory);
  }, [activeChar?.inventory]);

  // Resumo mecânico do inventário (Espaços decimais, bônus de Mochila Militar, Braçadeira Reforçada e limites por patente)
  const inventorySummary = useMemo(
    () => calculateInventoryMechanicsSummary(activeChar?.inventory || []),
    [activeChar?.inventory]
  );

  // Lista curada e enriquecida de itens do compêndio
  const curatedCompendiumItems = useMemo(
    () => getCuratedCompendiumItems(entities),
    [entities]
  );

  // Intercepta botão de retorno físico (Android) para fechar sub-modais de confirmação de armas e itens
  useEffect(() => {
    if (!importChoiceWeapon && !deleteAttackChoice && !importChoiceItem && !healChoiceModal) return;
    if (Platform.OS !== 'web' && typeof document === 'undefined') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (healChoiceModal) {
          setHealChoiceModal(null);
          return true;
        }
        if (importChoiceItem) {
          setImportChoiceItem(null);
          return true;
        }
        if (deleteAttackChoice) {
          setDeleteAttackChoice(null);
          return true;
        }
        if (importChoiceWeapon) {
          setImportChoiceWeapon(null);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }
    return undefined;
  }, [importChoiceWeapon, deleteAttackChoice, importChoiceItem, healChoiceModal]);

  // Helper para resolver informações de arma para checagem de proficiência
  const getAttackWeaponInfo = (atk: CharacterAttack): WeaponProficiencyCheckInput => {
    if (atk.proficiency) {
      return {
        name: atk.name,
        proficiency: atk.proficiency,
        weaponType: atk.range === 'Corpo a corpo' ? 'Corpo a corpo' : 'Fogo',
      };
    }
    if (atk.customWeaponId) {
      const cw = customWeapons.find((w) => w.id === atk.customWeaponId);
      if (cw) {
        return {
          name: cw.name,
          proficiency: cw.proficiency,
          weaponType: cw.weaponType,
          ammoType: cw.ammoType,
        };
      }
    }
    const ent = entities.find((e) => e.name.toLowerCase() === atk.name.toLowerCase());
    if (ent) {
      const prof = (ent.proficiency ||
        (ent.subCategory?.includes('Tática')
          ? 'Tática'
          : ent.subCategory?.includes('Pesada')
          ? 'Pesada'
          : 'Simples')) as any;
      const isMelee = ent.subCategory?.includes('Corpo') || ent.range === 'Corpo a corpo';
      const ammo = (ent.description || '').includes('Balas longas') ? 'Balas longas' : undefined;
      return {
        name: ent.name,
        proficiency: prof,
        weaponType: isMelee ? 'Corpo a corpo' : 'Fogo',
        ammoType: ammo,
      };
    }
    return {
      name: atk.name,
      proficiency: 'Simples',
      weaponType: atk.range === 'Corpo a corpo' ? 'Corpo a corpo' : 'Fogo',
    };
  };

  const handleToggleEquipItem = async (itemId: string) => {
    if (!activeChar?.inventory) return;
    const updated = activeChar.inventory.map((it) => {
      if (it.id === itemId) {
        return { ...it, equipped: !it.equipped };
      }
      return it;
    });
    await updateActiveChar({ inventory: updated });
  };

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
        if (Boolean(e.damage)) {
          weapons.push(e);
        }
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
    const calc = calculateCharacterVitals(activeChar, getEntityById);

    // Atualiza bônus de perícias concedidos por vitais (Fortitude, Vontade)
    const updatedSkills = { ...(activeChar.skills || {}) };
    if (calc.skillBonuses) {
      for (const [skName, bVal] of Object.entries(calc.skillBonuses)) {
        if (bVal !== undefined) {
          updatedSkills[skName] = {
            degree: updatedSkills[skName]?.degree || 0,
            bonus: bVal,
          };
        }
      }
    }

    await updateActiveChar({
      pvMax: calc.pvMax,
      pvCurrent: calc.pvMax,
      peMax: calc.peMax,
      peCurrent: calc.peMax,
      sanMax: calc.sanMax,
      sanCurrent: calc.sanMax,
      peRound: calc.peRound,
      dtRituals: calc.dtRituals,
      skills: updatedSkills,
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
    setEditingWeapon(null);
    setEditingLegacyAttack(null);
    setWeaponEditorVisible(true);
  };

  const openEditAttackModal = (atk: CharacterAttack) => {
    const linked = atk.customWeaponId
      ? customWeapons.find((w) => w.id === atk.customWeaponId)
      : undefined;
    const weaponToEdit = linked || buildCustomWeaponFromLegacyAttack(atk, entities, atk.customWeaponId);
    setEditingWeapon(weaponToEdit);
    setEditingLegacyAttack(atk);
    setWeaponEditorVisible(true);
  };

  const handleSaveAgentWeapon = async (savedWeapon: CustomWeapon) => {
    const existedInArmory = customWeapons.some((w) => w.id === savedWeapon.id);
    await upsertCustomWeapon(savedWeapon);

    if (activeChar) {
      if (!editingWeapon) {
        // Arma recém-criada direto na ficha do agente: vincula em Ataques e Inventário
        await equipWeaponToCharacter(savedWeapon, activeChar.id, {
          mode: 'shared',
          includeAmmo: true,
        });
      } else if (!existedInArmory && editingLegacyAttack) {
        // Caso especial de ataque legado ainda não presente na Armaria (ex.: ficha importada/mock)
        const syncedAttack = buildAttackFromCustomWeapon(savedWeapon, {
          existingAttack: editingLegacyAttack,
          linkMode: editingLegacyAttack.linkMode || 'shared',
          sourceWeaponId: editingLegacyAttack.sourceWeaponId,
        });
        await updateActiveChar({
          attacks: (activeChar.attacks || []).map((a) =>
            a.id === editingLegacyAttack.id ? syncedAttack : a
          ),
        });
      }
    }

    setWeaponEditorVisible(false);
    setEditingWeapon(null);
    setEditingLegacyAttack(null);
  };

  const handleAddWeaponFromArmaria = (weapon: CustomWeapon) => {
    if (!activeChar) return;
    setPickerModalType(null);
    setImportChoiceWeapon(weapon);
  };

  const handleConfirmImportArmariaWeapon = async (mode: 'shared' | 'duplicate') => {
    if (!activeChar || !importChoiceWeapon) return;
    const weapon = importChoiceWeapon;
    setImportChoiceWeapon(null);
    await equipWeaponToCharacter(weapon, activeChar.id, {
      mode,
      includeAmmo: true,
    });
    setPickerModalType(null);
  };

  const handleAddWeaponFromCompendium = async (ent: CompendiumEntity) => {
    if (!activeChar) return;
    const newWeapon = buildCustomWeaponFromCompendiumEntity(ent);
    await upsertCustomWeapon(newWeapon);
    await equipWeaponToCharacter(newWeapon, activeChar.id, {
      mode: 'shared',
      includeAmmo: true,
    });
    setPickerModalType(null);
  };

  const resolveAttackForActiveChar = (
    attack: CharacterAttack,
    toggles?: SituationalDamageToggles
  ): ResolvedAttackDamage | undefined => {
    if (!activeChar) return undefined;
    const linked = attack.customWeaponId
      ? customWeapons.find((w) => w.id === attack.customWeaponId)
      : undefined;
    return resolveAgentAttackDamage({
      attack,
      character: activeChar,
      customWeapon: linked,
      toggles,
      profile: agentDamageProfile || undefined,
      getEntityById,
    });
  };

  const handleRollAttackTest = (
    attack: CharacterAttack,
    resolvedOverride?: ResolvedAttackDamage
  ) => {
    if (!activeChar) return;
    const resolved = resolvedOverride || resolveAttackForActiveChar(attack);
    const skillName = attack.skillName || (attack.range === 'Corpo a corpo' ? 'Luta' : 'Pontaria');
    const skillDef = OFFICIAL_SKILLS_LIST.find((s) => s.name === skillName);
    const attrKey = skillDef?.attr || (attack.range === 'Corpo a corpo' ? 'FOR' : 'AGI');
    const attrVal = activeChar.attributes[attrKey];
    const skillEntry = activeChar.skills[skillName] || { degree: 0, bonus: 0 };
    const totalBonus =
      (skillEntry.degree || 0) +
      (skillEntry.bonus || 0) +
      (attack.attackBonus || 0) +
      (resolved?.attackBonusFromToggles || 0);

    const weaponInfo = getAttackWeaponInfo(attack);
    const profCheck = characterProficiencies
      ? checkWeaponProficiency(weaponInfo, characterProficiencies)
      : { isProficient: true };

    let effectiveDice = attrVal;
    let penaltySuffix = '';

    if (!profCheck.isProficient) {
      effectiveDice = Math.max(-5, effectiveDice - 2);
      penaltySuffix += ' [Sem Proficiência: -2d20]';
    }

    const protPen = getProtectionDicePenalty(activeChar, attrKey);
    if (protPen !== 0) {
      effectiveDice = Math.max(-5, effectiveDice + protPen);
      penaltySuffix += ' [Penalidade de Proteção: -2d20]';
    }

    const effectiveDamage = resolved?.displayDamage || attack.damage;
    const effectiveCritical = resolved?.formattedCritical || attack.critical;
    const parsedCrit = parseCritical(effectiveCritical);
    rollSkillTest(
      effectiveDice,
      totalBonus,
      `Ataque: ${attack.name} (${skillName})${penaltySuffix}`,
      parsedCrit.threat,
      {
        weaponName: attack.name,
        damage: effectiveDamage,
        critical: effectiveCritical,
        attackId: attack.id,
        normalFormula: resolved?.normalFormula,
        criticalFormula: resolved?.criticalFormula,
      }
    );
  };

  const handleRollAttackDamage = (
    attack: CharacterAttack,
    isCrit: boolean,
    chosenMode?: CriticalDamageMode,
    isMaxDamage = false,
    resolvedOverride?: ResolvedAttackDamage
  ) => {
    const resolved = resolvedOverride || resolveAttackForActiveChar(attack);
    const rawMode =
      chosenMode ||
      (attack.criticalDamageMode && attack.criticalDamageMode !== 'default'
        ? attack.criticalDamageMode
        : activeChar?.criticalDamageMode && activeChar.criticalDamageMode !== 'default'
        ? activeChar.criticalDamageMode
        : userProfile?.criticalDamageMode || 'multiply_dice');
    const effectiveMode = normalizeCriticalDamageMode(rawMode);

    if (isCrit && effectiveMode === 'ask_user') {
      setCritPromptAttack({ attack, isMaxDamage, resolved });
      return;
    }

    const effectiveDamage = resolved?.displayDamage || attack.damage;
    const effectiveCritical = resolved?.formattedCritical || attack.critical;

    rollWeaponDamage({
      weaponName: attack.name,
      damage: effectiveDamage,
      critical: effectiveCritical,
      normalFormula: resolved?.normalFormula,
      criticalFormula: resolved?.criticalFormula,
      isCrit,
      isMaxDamage,
      mode: effectiveMode,
      attackContext: {
        weaponName: attack.name,
        damage: effectiveDamage,
        critical: effectiveCritical,
        attackId: attack.id,
        normalFormula: resolved?.normalFormula,
        criticalFormula: resolved?.criticalFormula,
      },
    });
  };

  const handleConfirmPreparedRoll = async ({
    mode,
    resolved,
  }: {
    mode: 'attack' | 'damage' | 'crit';
    resolved: ResolvedAttackDamage;
    toggles: SituationalDamageToggles;
  }) => {
    if (!activeChar || !prepModalAttack) return;
    const attack = prepModalAttack;
    setPrepModalAttack(null);

    if (resolved.totalPeCost > 0) {
      const nextPe = Math.max(0, (activeChar.peCurrent || 0) - resolved.totalPeCost);
      await updateActiveChar({ peCurrent: nextPe });
    }

    if (mode === 'attack') {
      handleRollAttackTest(attack, resolved);
    } else if (mode === 'crit') {
      handleRollAttackDamage(attack, true, undefined, false, resolved);
    } else {
      handleRollAttackDamage(attack, false, undefined, false, resolved);
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
  const handleSaveUnifiedItem = async (result: ItemEditorSaveResult) => {
    if (!activeChar) return;
    const { catalogItem, quantity, charges, alsoSaveToDepot } = result;
    const existing = activeChar.inventory || [];

    if (alsoSaveToDepot) {
      await upsertCustomItem(catalogItem);
    }

    if (editingInventoryItem) {
      const updatedInvItem: CharacterInventoryItem = {
        ...editingInventoryItem,
        name: catalogItem.name,
        category: catalogItem.finalCategory,
        spaces: catalogItem.finalSpaces,
        details: catalogItem.details,
        itemType: catalogItem.itemType,
        isVestimenta: catalogItem.itemType === 'vestimenta',
        isUtensilio: catalogItem.itemType === 'utensilio',
        skillBonus: catalogItem.skillBonus,
        targetSkill: catalogItem.targetSkill,
        secondarySkill: catalogItem.secondarySkill,
        secondaryBonus: catalogItem.secondaryBonus,
        instrumentalSkill: catalogItem.instrumentalSkill,
        justification: catalogItem.justification,
        quantity,
        consumable: catalogItem.consumable,
        maxCharges: catalogItem.maxCharges,
        charges:
          catalogItem.maxCharges !== undefined
            ? Math.min(charges ?? catalogItem.maxCharges, catalogItem.maxCharges)
            : undefined,
        subCategoryGroup: catalogItem.subCategoryGroup,
        element: catalogItem.element,
        sourceEntityId: catalogItem.baseItemId,
        customItemId: alsoSaveToDepot ? catalogItem.id : editingInventoryItem.customItemId,
        linkMode: alsoSaveToDepot
          ? editingInventoryItem.linkMode || 'shared'
          : editingInventoryItem.linkMode,
        modifications: [...(catalogItem.modifications || [])],
        customModifications: catalogItem.customModifications
          ? catalogItem.customModifications.map((m) => ({ ...m }))
          : undefined,
        loadBonus: catalogItem.loadBonus,
        blockRdBonus: catalogItem.blockRdBonus,
        mechanics: (catalogItem.mechanics || []).map((m) => ({ ...m })),
      };
      await updateActiveChar({
        inventory: existing.map((it) => (it.id === editingInventoryItem.id ? updatedInvItem : it)),
      });
    } else {
      const newItem: CharacterInventoryItem = {
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: catalogItem.name,
        category: catalogItem.finalCategory,
        spaces: catalogItem.finalSpaces,
        details: catalogItem.details,
        equipped: true,
        itemType: catalogItem.itemType,
        isVestimenta: catalogItem.itemType === 'vestimenta',
        isUtensilio: catalogItem.itemType === 'utensilio',
        skillBonus: catalogItem.skillBonus,
        targetSkill: catalogItem.targetSkill,
        secondarySkill: catalogItem.secondarySkill,
        secondaryBonus: catalogItem.secondaryBonus,
        instrumentalSkill: catalogItem.instrumentalSkill,
        justification: catalogItem.justification,
        quantity,
        charges,
        maxCharges: catalogItem.maxCharges,
        consumable: catalogItem.consumable,
        subCategoryGroup: catalogItem.subCategoryGroup,
        element: catalogItem.element,
        sourceEntityId: catalogItem.baseItemId,
        customItemId: alsoSaveToDepot ? catalogItem.id : undefined,
        linkMode: alsoSaveToDepot ? 'shared' : undefined,
        modifications: [...(catalogItem.modifications || [])],
        customModifications: catalogItem.customModifications
          ? catalogItem.customModifications.map((m) => ({ ...m }))
          : undefined,
        loadBonus: catalogItem.loadBonus,
        blockRdBonus: catalogItem.blockRdBonus,
        mechanics: (catalogItem.mechanics || []).map((m) => ({ ...m })),
      };
      await updateActiveChar({ inventory: [...existing, newItem] });
    }

    setItemEditorVisible(false);
    setEditingInventoryItem(null);
  };

  const handleConfirmImportDepotItem = async (mode: 'shared' | 'duplicate') => {
    if (!activeChar || !importChoiceItem) return;
    const item = importChoiceItem;
    setImportChoiceItem(null);
    await equipCatalogItemToCharacter(item, activeChar.id, { mode, quantity: 1 });
  };

  const isInventoryItemDepleted = (it: CharacterInventoryItem): boolean => {
    const qty = it.quantity !== undefined ? it.quantity : 1;
    if (qty <= 0) return true;
    if (it.maxCharges && it.maxCharges > 0 && (it.charges ?? it.maxCharges) <= 0 && qty <= 1) {
      return true;
    }
    return false;
  };

  const consumeInventoryItemUse = (
    inventory: CharacterInventoryItem[],
    itemId: string
  ): CharacterInventoryItem[] => {
    return inventory.map((it) => {
      if (it.id !== itemId) return it;
      const hasCharges = Boolean(it.maxCharges && it.maxCharges > 0);
      if (hasCharges) {
        const curCharges = it.charges ?? it.maxCharges ?? 0;
        const curQty = it.quantity ?? 1;
        if (curCharges > 1) {
          return { ...it, charges: curCharges - 1 };
        }
        if (curQty > 1) {
          return { ...it, quantity: curQty - 1, charges: it.maxCharges };
        }
        return { ...it, charges: 0 };
      }
      if (it.consumable) {
        const curQty = it.quantity ?? 1;
        return { ...it, quantity: Math.max(0, curQty - 1) };
      }
      return it;
    });
  };

  const handleAdjustItemQuantity = async (itemId: string, delta: number) => {
    if (!activeChar) return;
    const nextInv = (activeChar.inventory || []).map((it) => {
      if (it.id !== itemId) return it;
      const cur = it.quantity ?? 1;
      const next = Math.max(0, cur + delta);
      return {
        ...it,
        quantity: next,
        charges:
          next > 0 && cur === 0 && it.maxCharges && it.charges === 0
            ? it.maxCharges
            : it.charges,
      };
    });
    await updateActiveChar({ inventory: nextInv });
  };

  const handleRechargeInventoryItem = async (itemId: string) => {
    if (!activeChar) return;
    const nextInv = (activeChar.inventory || []).map((it) => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        quantity: Math.max(1, it.quantity ?? 1),
        charges: it.maxCharges ? it.maxCharges : it.charges,
      };
    });
    await updateActiveChar({ inventory: nextInv });
  };

  const spendPeWithTempFirst = (peCost: number) => {
    if (!activeChar || peCost <= 0) {
      return { peCurrent: activeChar?.peCurrent || 0, peTemp: activeChar?.peTemp || 0 };
    }
    const curTemp = activeChar.peTemp || 0;
    const fromTemp = Math.min(curTemp, peCost);
    const remCost = peCost - fromTemp;
    return {
      peTemp: curTemp - fromTemp,
      peCurrent: Math.max(0, (activeChar.peCurrent || 0) - remCost),
    };
  };

  const handleExecuteItemMechanic = async (
    item: CharacterInventoryItem,
    mechanic: ItemMechanic,
    targetMode?: 'self' | 'ally'
  ) => {
    if (!activeChar) return;
    if (isInventoryItemDepleted(item)) {
      showAlert('Item Esgotado', `"${item.name}" está com 0 usos. Recarregue ou reponha para usar novamente.`);
      return;
    }

    const peCost = mechanic.peCost || 0;
    const totalAvailablePe = (activeChar.peCurrent || 0) + (activeChar.peTemp || 0);
    if (peCost > 0 && totalAvailablePe < peCost) {
      showAlert('PE Insuficiente', `São necessários ${peCost} PE para ativar "${item.name}".`);
      return;
    }

    const isHealingOrTemp =
      mechanic.type === 'heal_pv' ||
      mechanic.type === 'heal_pe' ||
      mechanic.type === 'heal_san' ||
      mechanic.type === 'heal_all' ||
      mechanic.type === 'temp_pv' ||
      mechanic.type === 'temp_pe';

    if (isHealingOrTemp && !targetMode) {
      setHealChoiceModal({ item, mechanic });
      return;
    }

    let rolledTotal = mechanic.flatValue || 0;
    if (mechanic.formula && mechanic.formula.trim()) {
      const dtInfo = mechanic.dtFormula ? calculateItemSaveDt(activeChar, mechanic.dtFormula) : null;
      const rollLabel = `${item.name}: ${mechanic.label}${dtInfo ? ` (${dtInfo.label})` : ''}${
        targetMode === 'ally' ? ' [Aliado]' : ''
      }`;
      const res = rollFormula(mechanic.formula, rollLabel);
      rolledTotal = res.total;
    }

    const patch: Partial<CharacterSheet> = {};
    if (peCost > 0) {
      const peSpend = spendPeWithTempFirst(peCost);
      patch.peCurrent = peSpend.peCurrent;
      patch.peTemp = peSpend.peTemp;
    }

    if (targetMode === 'self' && rolledTotal > 0) {
      const basePeAfterCost = patch.peCurrent ?? activeChar.peCurrent;
      if (mechanic.type === 'heal_pv') {
        patch.pvCurrent = Math.min(activeChar.pvMax, activeChar.pvCurrent + rolledTotal);
      } else if (mechanic.type === 'heal_pe') {
        patch.peCurrent = Math.min(activeChar.peMax, basePeAfterCost + rolledTotal);
      } else if (mechanic.type === 'heal_san') {
        patch.sanCurrent = Math.min(activeChar.sanMax, activeChar.sanCurrent + rolledTotal);
      } else if (mechanic.type === 'heal_all') {
        patch.pvCurrent = Math.min(activeChar.pvMax, activeChar.pvCurrent + rolledTotal);
        patch.peCurrent = Math.min(activeChar.peMax, basePeAfterCost + rolledTotal);
        patch.sanCurrent = Math.min(activeChar.sanMax, activeChar.sanCurrent + rolledTotal);
      } else if (mechanic.type === 'temp_pv') {
        patch.pvTemp = (activeChar.pvTemp || 0) + rolledTotal;
      } else if (mechanic.type === 'temp_pe') {
        patch.peTemp = (patch.peTemp ?? activeChar.peTemp ?? 0) + rolledTotal;
      }
    }

    if (item.consumable || (item.maxCharges && item.maxCharges > 0)) {
      patch.inventory = consumeInventoryItemUse(activeChar.inventory || [], item.id);
    }

    if (Object.keys(patch).length > 0) {
      await updateActiveChar(patch);
    }

    if (mechanic.type === 'pe_activation' && !mechanic.formula) {
      showAlert(
        `${item.name} Ativado`,
        `-${peCost} PE aplicados para "${mechanic.label}".${mechanic.notes ? `\n\n${mechanic.notes}` : ''}`
      );
    } else if (isHealingOrTemp && targetMode === 'self' && !mechanic.formula) {
      showAlert(
        `${item.name} Aplicado`,
        `+${rolledTotal} aplicado em ${activeChar.name}.`
      );
    } else if (!mechanic.formula) {
      const dtInfo = mechanic.dtFormula ? calculateItemSaveDt(activeChar, mechanic.dtFormula) : null;
      const infoLines = [
        peCost > 0 ? `-${peCost} PE gastos.` : '',
        mechanic.actionCost ? `Ação: ${mechanic.actionCost}` : '',
        dtInfo ? dtInfo.label : '',
        mechanic.notes || item.details || '',
      ]
        .filter(Boolean)
        .join('\n');
      showAlert(`${item.name} — ${mechanic.label}`, infoLines || 'Efeito ativado!');
    }
  };

  // Protection Assistant action
  const handleApplyProtections = async (payload: ProtectionApplyPayload) => {
    if (!activeChar) return;

    // 1. Filtrar do inventário anterior quaisquer itens de proteção/escudo gerenciados pelo assistente
    const existingInventory = activeChar.inventory || [];
    const cleanInventory = existingInventory.filter(
      (item) =>
        !(
          item.itemType === 'protecao' ||
          item.itemType === 'escudo' ||
          (item.id && item.id.startsWith('inv_prot_')) ||
          (item.equipped &&
            (item.name.toLowerCase().includes('proteção leve') ||
              item.name.toLowerCase().includes('proteção pesada') ||
              item.name.toLowerCase().includes('escudo') ||
              item.name.toLowerCase().includes('capacete tático')))
        )
    );

    // 2. Criar novos itens de inventário para as proteções equipadas
    const newInventoryItems: CharacterInventoryItem[] = payload.equippedItems.map(
      (item, idx) => ({
        id: `inv_prot_${Date.now()}_${idx}`,
        name: item.name,
        category: item.category,
        spaces: item.spaces,
        details: item.details,
        equipped: true,
        itemType: item.itemType,
      })
    );

    const updatedInventory = [...cleanInventory, ...newInventoryItems];

    // 3. Atualizar ficha do personagem
    await updateActiveChar({
      defenseEquip: payload.defenseEquip,
      defenseBonus: payload.defenseEquip + (activeChar.defenseOther || 0),
      resistances: payload.resistancesText,
      protection: payload.protectionText,
      inventory: updatedInventory,
    });

    setProtectionModalVisible(false);
  };

  // Carga Calculation
  const maxLoad = useMemo(() => {
    if (!activeChar) return 2;
    const base = activeChar.attributes.FOR <= 0 ? 2 : activeChar.attributes.FOR * 5;
    return base + (activeChar.maxLoadBonus || 0) + inventorySummary.totalLoadBonusFromItems;
  }, [activeChar, inventorySummary.totalLoadBonusFromItems]);

  const currentLoad = inventorySummary.totalSpacesUsed;

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
  const bloqueioRD =
    (fortitudeEntry.degree || 0) + (fortitudeEntry.bonus || 0) + inventorySummary.totalBlockRdBonus;

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
                    await copyToClipboard(code, `Ficha de ${sharingChar.name}`);
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.topBarActionsScroll}
          contentContainerStyle={styles.topBarRightActions}
        >
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
        </ScrollView>
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
                    const itemInitBonus = itemSkillBonuses.effectiveBonuses['Iniciativa']?.bonus || 0;
                    const bonus = (initEntry.degree || 0) + (initEntry.bonus || 0) + itemInitBonus;
                    const protPen = getProtectionDicePenalty(activeChar, 'AGI');
                    const effectiveAgi = protPen !== 0 ? Math.max(-5, agi + protPen) : agi;
                    let label = `Iniciativa: ${activeChar.name}`;
                    if (itemInitBonus > 0) {
                      label += ` [Item: +${itemInitBonus} ${itemSkillBonuses.effectiveBonuses['Iniciativa']?.sourceItemName}]`;
                    }
                    if (protPen !== 0) {
                      label += ' [Penalidade de Proteção: -2d20]';
                    }
                    const roll = rollSkillTest(effectiveAgi, bonus, label);
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

              {/* Regra Caseira da Ficha: Transcender a cada 5% de NEX */}
              <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="bonfire" size={16} color="#8B5CF6" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                        Regra Caseira: Transcender a cada 5% de NEX
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 }}>
                      Regra opcional de mesa: em qualquer avanço de NEX (+5%), além dos benefícios normais, o agente pode opcionalmente Transcender (escolher 1 poder paranormal adicional) ao custo de não receber Sanidade naquele avanço.
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
                        onPress={() => {
                          const attrKey = attr as 'FOR' | 'AGI' | 'INT' | 'PRE' | 'VIG';
                          const protPen = activeChar ? getProtectionDicePenalty(activeChar, attrKey) : 0;
                          const effectiveAttrDice = protPen !== 0 ? Math.max(-5, val + protPen) : val;
                          const label = protPen !== 0
                            ? `Atributo ${attr} [Penalidade de Proteção: -2d20]`
                            : `Atributo ${attr}`;
                          rollSkillTest(effectiveAttrDice, 0, label);
                        }}
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
                onChangeCurrent={(v) => {
                  const delta = v - activeChar.pvCurrent;
                  if (delta < 0 && (activeChar.pvTemp || 0) > 0) {
                    const dmg = -delta;
                    const curTemp = activeChar.pvTemp || 0;
                    const fromTemp = Math.min(curTemp, dmg);
                    const remDmg = dmg - fromTemp;
                    updateActiveChar({
                      pvTemp: curTemp - fromTemp,
                      pvCurrent: Math.max(0, activeChar.pvCurrent - remDmg),
                    });
                    return;
                  }
                  updateActiveChar({ pvCurrent: Math.max(0, v) });
                }}
                onChangeMax={(v) => updateActiveChar({ pvMax: Math.max(1, v) })}
              />
              <StatCounterRow
                label="PE (Esforço)"
                color="#F59E0B"
                current={activeChar.peCurrent}
                max={activeChar.peMax}
                onChangeCurrent={(v) => {
                  const delta = v - activeChar.peCurrent;
                  if (delta < 0 && (activeChar.peTemp || 0) > 0) {
                    const spent = -delta;
                    const curTemp = activeChar.peTemp || 0;
                    const fromTemp = Math.min(curTemp, spent);
                    const remSpent = spent - fromTemp;
                    updateActiveChar({
                      peTemp: curTemp - fromTemp,
                      peCurrent: Math.max(0, activeChar.peCurrent - remSpent),
                    });
                    return;
                  }
                  updateActiveChar({ peCurrent: Math.max(0, v) });
                }}
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

              {/* Badges & Controles de PV / PE Temporários */}
              <View style={styles.tempStatsRow} testID="status-vital-temp-badges">
                <View style={[styles.tempStatBadge, { borderColor: 'rgba(16, 185, 129, 0.45)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tempStatLabel, { color: '#34D399' }]}>PV TEMPORÁRIOS</Text>
                    <Text style={styles.tempStatVal} testID="pv-temp-value">
                      +{activeChar.pvTemp || 0} PV Temp
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.tempMiniBtn}
                    onPress={() => updateActiveChar({ pvTemp: Math.max(0, (activeChar.pvTemp || 0) - 1) })}
                  >
                    <Text style={styles.tempMiniBtnText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tempMiniBtn}
                    onPress={() => updateActiveChar({ pvTemp: (activeChar.pvTemp || 0) + 1 })}
                  >
                    <Text style={styles.tempMiniBtnText}>+1</Text>
                  </TouchableOpacity>
                  {(activeChar.pvTemp || 0) > 0 ? (
                    <TouchableOpacity
                      style={[styles.tempMiniBtn, { borderColor: '#EF4444' }]}
                      onPress={() => updateActiveChar({ pvTemp: 0 })}
                    >
                      <Ionicons name="close" size={12} color="#EF4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={[styles.tempStatBadge, { borderColor: 'rgba(245, 158, 11, 0.45)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tempStatLabel, { color: '#FBBF24' }]}>PE TEMPORÁRIOS</Text>
                    <Text style={styles.tempStatVal} testID="pe-temp-value">
                      +{activeChar.peTemp || 0} PE Temp
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.tempMiniBtn}
                    onPress={() => updateActiveChar({ peTemp: Math.max(0, (activeChar.peTemp || 0) - 1) })}
                  >
                    <Text style={styles.tempMiniBtnText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.tempMiniBtn}
                    onPress={() => updateActiveChar({ peTemp: (activeChar.peTemp || 0) + 1 })}
                  >
                    <Text style={styles.tempMiniBtnText}>+1</Text>
                  </TouchableOpacity>
                  {(activeChar.peTemp || 0) > 0 ? (
                    <TouchableOpacity
                      style={[styles.tempMiniBtn, { borderColor: '#EF4444' }]}
                      onPress={() => updateActiveChar({ peTemp: 0 })}
                    >
                      <Ionicons name="close" size={12} color="#EF4444" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

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
              <View style={[styles.cardHeaderRow, { marginBottom: 10, flexWrap: 'wrap', gap: 8 }]}>
                <Text style={[styles.sectionTitle, { flexShrink: 1 }]}>Defesa, Proteção & Resistências</Text>
                <TouchableOpacity
                  style={styles.defenseAssistantBtn}
                  onPress={() => setProtectionModalVisible(true)}
                  testID="btn-open-protection-assistant"
                >
                  <Ionicons name="shield-checkmark-outline" size={16} color="#38BDF8" />
                  <Text style={styles.defenseAssistantBtnText}>Assistente de Proteções</Text>
                </TouchableOpacity>
              </View>

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
                  onPress={() => {
                    const protPen = activeChar ? getProtectionDicePenalty(activeChar, 'AGI') : 0;
                    const effectiveAgi = protPen !== 0 ? Math.max(-5, activeChar.attributes.AGI + protPen) : activeChar.attributes.AGI;
                    const label = protPen !== 0
                      ? 'Teste de Reflexos (Esquiva) [Penalidade de Proteção: -2d20]'
                      : 'Teste de Reflexos (Esquiva)';
                    rollSkillTest(
                      effectiveAgi,
                      reflexosBonus,
                      label
                    );
                  }}
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
                    Fortitude + Itens (+{bloqueioRD})
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
                  onPress={() => {
                    const protPen = activeChar ? getProtectionDicePenalty(activeChar, 'FOR') : 0;
                    const effectiveFor = protPen !== 0 ? Math.max(-5, activeChar.attributes.FOR + protPen) : activeChar.attributes.FOR;
                    const label = protPen !== 0
                      ? 'Teste de Luta (Contra-ataque) [Penalidade de Proteção: -2d20]'
                      : 'Teste de Luta (Contra-ataque)';
                    rollSkillTest(
                      effectiveFor,
                      contraAtaqueBonus,
                      label
                    );
                  }}
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

              {/* Alerta de Falta de Proficiência em Proteção */}
              {activeChar && getProtectionDicePenalty(activeChar, 'FOR') !== 0 && (
                <View
                  style={styles.protectionPenaltyWarningBox}
                  testID="sheet-protection-non-proficient-warning"
                >
                  <Ionicons name="warning" size={16} color="#EF4444" />
                  <Text style={styles.protectionPenaltyWarningText}>
                    ⚠️ Proteção sem Proficiência: -2d20 em testes de Força e Agilidade
                  </Text>
                </View>
              )}

              {Boolean(
                activeChar.protection &&
                  (activeChar.protection.toLowerCase().includes('pesada') ||
                    activeChar.protection.toLowerCase().includes('capacete'))
              ) && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    padding: 8,
                    borderRadius: 6,
                    marginTop: 8,
                  }}
                >
                  <Ionicons name="warning-outline" size={14} color="#EF4444" />
                  <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600', flex: 1 }}>
                    Penalidade de Carga: –5 em Acrobacia, Crime e Furtividade (Proteção Pesada).
                  </Text>
                </View>
              )}
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
                testID="btn-add-weapon-new"
              >
                <Ionicons name="add" size={15} color={colors.text} />
                <Text style={styles.addAtkBtnGhostText}>Nova Arma</Text>
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
                const linkedWeapon = atk.customWeaponId
                  ? customWeapons.find((w) => w.id === atk.customWeaponId)
                  : undefined;
                const resolvedAttack = resolveAttackForActiveChar(atk);
                const effectiveDamageText = resolvedAttack ? resolvedAttack.displayDamage : atk.damage;
                const effectiveCritText = resolvedAttack ? resolvedAttack.formattedCritical : atk.critical;
                const passiveBadgeComponents = (resolvedAttack?.breakdown || []).filter(
                  (b) => b.source !== 'Base da Arma'
                );

                const openAttackPreview = () =>
                  openRecordPreview({
                    target: {
                      kind: 'character_attack',
                      attack: atk,
                      customWeapon: linkedWeapon,
                      character: activeChar,
                      resolvedDamage: resolvedAttack,
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
                        {(() => {
                          const wInfo = getAttackWeaponInfo(atk);
                          const profCheck = characterProficiencies
                            ? checkWeaponProficiency(wInfo, characterProficiencies)
                            : { isProficient: true };
                          if (!profCheck.isProficient) {
                            return (
                              <View
                                style={styles.nonProficientBadge}
                                testID={`sheet-attack-non-proficient-${atk.id}`}
                              >
                                <Ionicons name="warning" size={12} color="#EF4444" />
                                <Text style={styles.nonProficientBadgeText}>
                                  ⚠️ Não Proficiente (-2d20)
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                        {passiveBadgeComponents.length > 0 ? (
                          <View
                            style={styles.attackBadgesRow}
                            testID={`sheet-attack-badges-${atk.id}`}
                          >
                            {passiveBadgeComponents.map((comp, bIdx) => (
                              <View key={`${comp.source}_${bIdx}`} style={styles.attackModBadge}>
                                <Text style={styles.attackModBadgeText}>
                                  {comp.source} ({comp.expression})
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.();
                            openEditAttackModal(atk);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          testID={`sheet-attack-edit-${atk.id}`}
                          accessibilityLabel={`Editar arma ${atk.name}`}
                        >
                          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
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
                          onPress={() => setDeleteAttackChoice(atk)}
                          testID={`sheet-attack-delete-${atk.id}`}
                          accessibilityLabel={`Remover arma ${atk.name}`}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.attackStatsRow}>
                      <View style={styles.statPill}>
                        <Text style={styles.statLabel}>DANO</Text>
                        <Text
                          style={styles.statValue}
                          testID={`sheet-attack-effective-damage-${atk.id}`}
                        >
                          {effectiveDamageText}
                        </Text>
                        {effectiveDamageText !== atk.damage ? (
                          <Text
                            style={styles.statBaseSub}
                            testID={`sheet-attack-base-damage-${atk.id}`}
                          >
                            Base: {atk.damage}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.statPill}>
                        <Text style={styles.statLabel}>CRÍTICO</Text>
                        <Text style={styles.statValue}>{effectiveCritText}</Text>
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

                    {atk.customWeaponId ? (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 6,
                          alignSelf: 'flex-start',
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          backgroundColor: colors.surfaceHighlight,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                        onPress={() => router.push('/(tabs)/weapons')}
                        accessibilityLabel="Abrir na Armaria"
                      >
                        <Ionicons name="shield-outline" size={13} color={colors.primary} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                          Abrir na Armaria
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={styles.prepareAttackBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setPrepModalAttack(atk);
                      }}
                      testID={`sheet-attack-prepare-${atk.id}`}
                      accessibilityLabel={`Preparar golpe tático com ${atk.name}`}
                    >
                      <Ionicons name="options-outline" size={15} color="#A855F7" />
                      <Text style={styles.prepareAttackBtnText}>Preparar Golpe Tático</Text>
                    </TouchableOpacity>

                    {/* Rolagens do Ataque */}
                    <View style={styles.attackRollsRow}>
                      <TouchableOpacity
                        style={styles.rollAttackBtn}
                        onPress={() => handleRollAttackTest(atk, resolvedAttack)}
                        testID={`sheet-attack-roll-test-${atk.id}`}
                      >
                        <Ionicons name="dice" size={15} color="#FFF" />
                        <Text style={styles.rollAttackBtnText}>Testar Ataque</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rollDamageBtn}
                        onPress={() =>
                          handleRollAttackDamage(atk, false, undefined, false, resolvedAttack)
                        }
                        testID={`sheet-attack-roll-damage-${atk.id}`}
                      >
                        <Ionicons name="flash-outline" size={14} color="#FFF" />
                        <Text style={styles.rollDamageBtnText}>
                          Dano ({effectiveDamageText})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rollCritBtn}
                        onPress={() =>
                          handleRollAttackDamage(atk, true, undefined, false, resolvedAttack)
                        }
                        testID={`sheet-attack-roll-crit-${atk.id}`}
                      >
                        <Ionicons name="flame" size={14} color="#FFF" />
                        <Text style={styles.rollCritBtnText}>
                          Crítico ({effectiveCritText})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rollCritMaxBtn}
                        onPress={() =>
                          handleRollAttackDamage(atk, true, undefined, true, resolvedAttack)
                        }
                        testID={`sheet-attack-roll-crit-max-${atk.id}`}
                      >
                        <Ionicons name="flash" size={14} color="#FDE047" />
                        <Text style={styles.rollCritMaxBtnText}>Crítico Máx</Text>
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
              const itemBonusInfo = itemSkillBonuses.effectiveBonuses[sk.name];
              const itemBonus = itemBonusInfo ? itemBonusInfo.bonus : 0;
              const totalBonus = degree + bonus + itemBonus;
              const attrVal = activeChar.attributes[sk.attr];

              const protPen = activeChar ? getProtectionDicePenalty(activeChar, sk.attr) : 0;
              const effectiveAttrDice = protPen !== 0 ? Math.max(-5, attrVal + protPen) : attrVal;

              return (
                <TouchableOpacity
                  key={sk.name}
                  style={styles.skillOfficialRow}
                  activeOpacity={0.85}
                  onLongPress={() => openSkillPreview(sk)}
                  delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                  testID={`char-skill-row-${sk.name}`}
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
                    {itemBonusInfo ? (
                      <View style={styles.itemSkillBonusBadge} testID={`sheet-skill-item-bonus-${sk.name}`}>
                        <Text style={styles.itemSkillBonusBadgeText}>
                          +{itemBonusInfo.bonus} ({itemBonusInfo.itemType === 'vestimenta' ? 'Vestimenta' : 'Utensílio'}: {itemBonusInfo.sourceItemName})
                        </Text>
                      </View>
                    ) : null}
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
                      effectiveAttrDice <= 0
                        ? `${2 + Math.abs(effectiveAttrDice)}d20 (menor)`
                        : `${effectiveAttrDice}d20`;
                    const displayBadge =
                      totalBonus !== 0
                        ? `${diceDesc}${totalBonus > 0 ? `+${totalBonus}` : totalBonus}`
                        : diceDesc;

                    let rollLabel = `${sk.name} (${displayBadge})`;
                    if (itemBonusInfo) {
                      rollLabel += ` [Item: +${itemBonusInfo.bonus} ${itemBonusInfo.sourceItemName}]`;
                    }
                    if (protPen !== 0) {
                      rollLabel += ` [Penalidade de Proteção: -2d20]`;
                    }

                    return (
                      <TouchableOpacity
                        style={styles.skillRollBtn}
                        onPress={() =>
                          rollSkillTest(
                            effectiveAttrDice,
                            totalBonus,
                            rollLabel
                          )
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        testID={`btn-roll-skill-${sk.name}`}
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
                ritualEntity?: Partial<CompendiumEntity> & {
                  name: string;
                  description?: string;
                  cost?: string;
                };
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

                const extractedElem = (ab.originPage || '').match(/Sangue|Morte|Conhecimento|Energia|Medo/i)?.[0] as
                  | ParanormalElement
                  | undefined;

                unifiedList.push({
                  id: ab.id,
                  name: ab.name,
                  originText: ab.originPage || ab.type,
                  cost: ab.cost,
                  description: ab.description,
                  isEntity: false,
                  categoryGroup: group,
                  element: extractedElem,
                  ritualEntity:
                    group === 'ritual'
                      ? {
                          id: ab.id,
                          name: ab.name,
                          description: ab.description,
                          cost: ab.cost,
                          element: extractedElem,
                        }
                      : undefined,
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
                  ritualEntity: ent.category === 'ritual' ? ent : undefined,
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

                const selectedTier = ritualTierById[item.id] || 'padrao';
                const resolvedRitual =
                  item.categoryGroup === 'ritual' && item.ritualEntity
                    ? resolveAgentRitualDamage({
                        ritual: item.ritualEntity,
                        character: activeChar,
                        tier: selectedTier,
                        profile: agentDamageProfile || undefined,
                        getEntityById,
                      })
                    : null;

                const ritualPowerBadges = (resolvedRitual?.breakdown || []).filter(
                  (b) => !b.source.startsWith('Ritual (') && b.source !== 'Bônus Base do Ritual'
                );

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
                    {resolvedRitual ? (
                      <View style={styles.ritualControlBox}>
                        <View
                          style={styles.ritualBadgesRow}
                          testID={`ritual-badges-${item.id}`}
                        >
                          <View style={styles.ritualDtBadge} testID={`ritual-dt-${item.id}`}>
                            <Text style={styles.ritualDtBadgeText}>
                              DT {resolvedRitual.dtResistance}
                            </Text>
                          </View>
                          <View style={styles.ritualModBadge}>
                            <Text style={styles.ritualModBadgeText}>
                              {resolvedRitual.totalPeCost} PE
                            </Text>
                          </View>
                          {ritualPowerBadges.map((b, idx) => (
                            <View key={`${b.source}_${idx}`} style={styles.ritualModBadge}>
                              <Text style={styles.ritualModBadgeText}>
                                {b.source} ({b.expression})
                              </Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.ritualTierRow}>
                          {(['padrao', 'discente', 'verdadeiro'] as const).map((tier) => {
                            const active = selectedTier === tier;
                            const label =
                              tier === 'padrao'
                                ? 'Padrão'
                                : tier === 'discente'
                                ? 'Discente'
                                : 'Verdadeiro';
                            return (
                              <TouchableOpacity
                                key={tier}
                                style={[
                                  styles.ritualTierPill,
                                  active && styles.ritualTierPillActive,
                                ]}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  setRitualTierById((prev) => ({
                                    ...prev,
                                    [item.id]: tier,
                                  }));
                                }}
                                testID={`ritual-tier-${item.id}-${tier}`}
                              >
                                <Text
                                  style={[
                                    styles.ritualTierPillText,
                                    active && styles.ritualTierPillTextActive,
                                  ]}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <TouchableOpacity
                          style={styles.ritualRollBtn}
                          onPress={async (e) => {
                            e.stopPropagation?.();
                            const tierLabel =
                              selectedTier === 'padrao'
                                ? 'Padrão'
                                : selectedTier === 'discente'
                                ? 'Discente'
                                : 'Verdadeiro';
                            const nextPe = Math.max(
                              0,
                              (activeChar.peCurrent || 0) - resolvedRitual.totalPeCost
                            );
                            await updateActiveChar({ peCurrent: nextPe });
                            if (resolvedRitual.hasDamageFormula && resolvedRitual.rollFormula) {
                              rollFormula(
                                resolvedRitual.rollFormula,
                                `${item.name} (${tierLabel})`
                              );
                            } else {
                              Alert.alert(
                                'Ritual Conjurado',
                                `"${item.name}" (${tierLabel}) conjurado! -${resolvedRitual.totalPeCost} PE (DT ${resolvedRitual.dtResistance}). PE restante: ${nextPe}/${activeChar.peMax}`
                              );
                            }
                          }}
                          testID={`ritual-roll-damage-${item.id}`}
                        >
                          <Ionicons name="sparkles" size={14} color="#FFF" />
                          <Text style={styles.ritualRollBtnText}>
                            {resolvedRitual.hasDamageFormula
                              ? `Conjurar & Rolar (${resolvedRitual.displayDamage})`
                              : `Conjurar Ritual (${resolvedRitual.totalPeCost} PE)`}
                          </Text>
                        </TouchableOpacity>
                      </View>
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
                  {formatSpacesLabel(currentLoad)} / {maxLoad} espaços
                </Text>
                <Text style={styles.loadSub}>
                  Base: 5x FOR ({activeChar.attributes.FOR}) + Mochila ({activeChar.maxLoadBonus || 0})
                  {inventorySummary.totalLoadBonusFromItems > 0
                    ? ` + Itens (+${inventorySummary.totalLoadBonusFromItems})`
                    : ''}
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
                    Carga excedida ({formatSpacesLabel(currentLoad)}/{maxLoad} espaços). Você sofre –2d20 em testes de Força e Agilidade e seu deslocamento é reduzido em 3m.
                  </Text>
                </View>
              </View>
            )}

            {/* Limites de Itens por Categoria da Patente */}
            <View style={styles.itemLimitsGrid}>
              {(
                [
                  { label: 'CAT I', catKey: 'I' as const, maxVal: activeChar.itemLimits?.cat1 ?? 2 },
                  { label: 'CAT II', catKey: 'II' as const, maxVal: activeChar.itemLimits?.cat2 ?? 0 },
                  { label: 'CAT III', catKey: 'III' as const, maxVal: activeChar.itemLimits?.cat3 ?? 0 },
                  { label: 'CAT IV', catKey: 'IV' as const, maxVal: activeChar.itemLimits?.cat4 ?? 0 },
                ] as const
              ).map((entry) => {
                const usedVal = inventorySummary.categoryCounts[entry.catKey] || 0;
                const overLimit = usedVal > entry.maxVal;
                return (
                  <View
                    key={entry.catKey}
                    style={[
                      styles.limitPill,
                      overLimit && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                    ]}
                  >
                    <Text style={styles.limitLabel}>{entry.label}</Text>
                    <Text style={[styles.limitNum, overLimit && { color: '#EF4444' }]}>
                      {usedVal} / {entry.maxVal}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Painel Didático de Vestimentas (R3) */}
            <View style={styles.clothingSummaryCard} testID="sheet-clothing-counter-card">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="shirt-outline" size={18} color="#A855F7" />
                  <Text style={styles.clothingSummaryTitle}>
                    Vestimentas Ativas: {itemSkillBonuses.activeClothesCount}/2
                  </Text>
                </View>
                <Text style={[styles.clothingSummarySub, itemSkillBonuses.isOverLimit && { color: '#EF4444' }]}>
                  {itemSkillBonuses.activeClothesCount <= 2 ? 'Dentro do limite canônico' : 'Limite canônico excedido'}
                </Text>
              </View>

              {itemSkillBonuses.isOverLimit && (
                <View style={styles.clothingLimitWarning} testID="sheet-clothing-limit-warning">
                  <Ionicons name="warning" size={16} color="#EF4444" />
                  <Text style={styles.clothingLimitWarningText}>
                    ⚠️ Limite Canônico Excedido: Máximo de 2 vestimentas ativas simultâneas (Livro Base p. 63). Itens excedentes não concedem bônus.
                  </Text>
                </View>
              )}
            </View>

            {/* Botoes de Adicionar Item */}
            <View style={styles.addAttackButtonsRow}>
              <TouchableOpacity
                style={styles.addAtkBtnPrimary}
                onPress={() => {
                  setEditingInventoryItem(null);
                  setItemEditorVisible(true);
                }}
                testID="btn-add-item-new"
              >
                <Ionicons name="add" size={15} color="#FFF" />
                <Text style={styles.addAtkBtnText}>Novo Item</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addAtkBtnSecondary}
                onPress={() => {
                  setPickerSearch('');
                  setPickerModalType('add_item_depot');
                }}
                testID="btn-add-item-depot"
              >
                <Ionicons name="briefcase-outline" size={15} color="#38BDF8" />
                <Text style={styles.addAtkBtnText}>Do Depósito</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addAtkBtnSecondary}
                onPress={() => {
                  setPickerSearch('');
                  setItemCompendiumFilter('all');
                  setPickerModalType('add_item_compendium');
                }}
                testID="btn-add-item-compendium"
              >
                <Ionicons name="book-outline" size={15} color="#FFF" />
                <Text style={styles.addAtkBtnText}>Do Compêndio</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Itens */}
            {(!activeChar.inventory || activeChar.inventory.length === 0) ? (
              <Text style={styles.emptyHint}>
                Inventário vazio. Adicione itens do Compêndio, do Depósito ou vincule armas da Armaria.
              </Text>
            ) : (
              activeChar.inventory.map((it) => {
                const openInvPreview = () =>
                  openRecordPreview({
                    target: { kind: 'character_inventory', item: it },
                  });
                const isVest = it.itemType === 'vestimenta' || it.isVestimenta;
                const isUten = it.itemType === 'utensilio' || it.isUtensilio;
                const isExceeded = isVest && it.equipped && itemSkillBonuses.exceededClothes.includes(it.name);
                const qty = it.quantity !== undefined ? it.quantity : 1;
                const hasCharges = Boolean(it.maxCharges && it.maxCharges > 0);
                const curCharges = it.charges ?? it.maxCharges ?? 0;
                const depleted = isInventoryItemDepleted(it);
                const totalSpacesForItem = (it.spaces || 0) * qty;
                const actionMechanics = (it.mechanics || []).filter(
                  (m) => m.type !== 'none' && m.type !== 'load_bonus' && m.type !== 'block_rd_bonus'
                );

                return (
                  <TouchableOpacity
                    key={it.id}
                    style={[
                      styles.invItemCard,
                      depleted && { opacity: 0.72, borderColor: 'rgba(239, 68, 68, 0.45)' },
                    ]}
                    activeOpacity={0.88}
                    onPress={openInvPreview}
                    onLongPress={openInvPreview}
                    delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    testID={`sheet-inv-${it.id}`}
                  >
                    <View style={styles.invItemRowTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.invItemName}>
                            {qty > 1 ? `${qty}× ` : ''}
                            {it.name} <Text style={styles.invItemCat}>(Cat {it.category})</Text>
                          </Text>
                          {isVest && (
                            <View style={[styles.invItemTypeBadge, { borderColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                              <Text style={[styles.invItemTypeBadgeText, { color: '#C084FC' }]}>Vestimenta</Text>
                            </View>
                          )}
                          {isUten && (
                            <View style={[styles.invItemTypeBadge, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                              <Text style={[styles.invItemTypeBadgeText, { color: '#38BDF8' }]}>Utensílio</Text>
                            </View>
                          )}
                          {it.customItemId ? (
                            <View style={[styles.invItemTypeBadge, { borderColor: it.linkMode === 'copied' ? '#10B981' : '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                              <Text style={[styles.invItemTypeBadgeText, { color: it.linkMode === 'copied' ? '#34D399' : '#38BDF8' }]}>
                                {it.linkMode === 'copied' ? 'Cópia Depósito' : 'Vinculado'}
                              </Text>
                            </View>
                          ) : null}
                          {depleted ? (
                            <View style={[styles.invItemTypeBadge, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.14)' }]} testID={`sheet-inv-depleted-${it.id}`}>
                              <Text style={[styles.invItemTypeBadgeText, { color: '#FCA5A5' }]}>0 usos</Text>
                            </View>
                          ) : hasCharges ? (
                            <View style={[styles.invItemTypeBadge, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                              <Text style={[styles.invItemTypeBadgeText, { color: '#FCD34D' }]}>
                                ⚡ {curCharges}/{it.maxCharges} usos
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {it.targetSkill && it.skillBonus ? (
                          <Text style={{ fontSize: 11, color: '#A855F7', fontWeight: '700', marginTop: 2 }}>
                            +{it.skillBonus} em {it.targetSkill}
                            {it.secondarySkill ? ` • +${it.secondaryBonus || 2} ${it.secondarySkill}` : ''}
                            {isExceeded ? ' (⚠️ Excedente: sem bônus)' : !it.equipped ? ' (Desativado)' : ''}
                          </Text>
                        ) : null}
                        {it.instrumentalSkill ? (
                          <Text style={{ fontSize: 10, color: '#38BDF8', fontWeight: '700', marginTop: 2 }}>
                            Kit Instrumental: {it.instrumentalSkill}
                          </Text>
                        ) : null}
                        {(it.loadBonus || it.blockRdBonus) ? (
                          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700', marginTop: 2 }}>
                            {it.loadBonus ? `+${it.loadBonus} espaços de carga` : ''}
                            {it.loadBonus && it.blockRdBonus ? ' • ' : ''}
                            {it.blockRdBonus ? `+${it.blockRdBonus} RD no Bloqueio` : ''}
                          </Text>
                        ) : null}
                        {it.justification ? (
                          <Text style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                            "{it.justification}"
                          </Text>
                        ) : null}
                        {it.details ? (
                          <Text style={styles.invItemDetails}>{it.details}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Mecânicas Interativas do Item (Curar, Temporários, Rolar Dano/DT, Ativar PE) */}
                    {actionMechanics.length > 0 ? (
                      <View style={styles.invMechanicsRow}>
                        {actionMechanics.map((mech) => {
                          const dtInfo = mech.dtFormula
                            ? calculateItemSaveDt(activeChar, mech.dtFormula)
                            : null;
                          const isHeal =
                            mech.type === 'heal_pv' ||
                            mech.type === 'heal_pe' ||
                            mech.type === 'heal_san' ||
                            mech.type === 'heal_all' ||
                            mech.type === 'temp_pv' ||
                            mech.type === 'temp_pe';
                          const isDmg = mech.type === 'damage_roll';
                          return (
                            <TouchableOpacity
                              key={mech.id}
                              disabled={depleted}
                              style={[
                                styles.invMechBtn,
                                isHeal && { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: '#10B981' },
                                isDmg && { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: '#EF4444' },
                                depleted && { opacity: 0.4 },
                              ]}
                              onPress={(e) => {
                                e.stopPropagation?.();
                                handleExecuteItemMechanic(it, mech);
                              }}
                              testID={`btn-use-mech-${it.id}-${mech.id}`}
                            >
                              <Ionicons
                                name={isHeal ? 'medkit' : isDmg ? 'flame' : 'flash'}
                                size={13}
                                color={isHeal ? '#34D399' : isDmg ? '#FCA5A5' : '#FCD34D'}
                              />
                              <Text style={styles.invMechBtnText}>
                                {depleted
                                  ? 'Esgotado'
                                  : `${mech.label}${mech.formula ? ` (${mech.formula})` : mech.flatValue ? ` (+${mech.flatValue})` : ''}${mech.peCost ? ` • -${mech.peCost} PE` : ''}${dtInfo ? ` • ${dtInfo.label}` : ''}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {depleted ? (
                          <TouchableOpacity
                            style={[styles.invMechBtn, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.14)' }]}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              handleRechargeInventoryItem(it.id);
                            }}
                            testID={`btn-recharge-item-${it.id}`}
                          >
                            <Ionicons name="refresh" size={13} color="#38BDF8" />
                            <Text style={[styles.invMechBtnText, { color: '#38BDF8' }]}>Recarregar</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : depleted ? (
                      <View style={styles.invMechanicsRow}>
                        <TouchableOpacity
                          style={[styles.invMechBtn, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.14)' }]}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleRechargeInventoryItem(it.id);
                          }}
                          testID={`btn-recharge-item-${it.id}`}
                        >
                          <Ionicons name="refresh" size={13} color="#38BDF8" />
                          <Text style={[styles.invMechBtnText, { color: '#38BDF8' }]}>Repor Unidade</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {/* Rodapé: Quantidade, Toggle Equipado, Espaços, Editar, Info, Remover */}
                    <View style={styles.invItemFooter}>
                      <View style={styles.invQtyStepper}>
                        <TouchableOpacity
                          style={styles.invQtyBtn}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleAdjustItemQuantity(it.id, -1);
                          }}
                          testID={`btn-qty-minus-${it.id}`}
                        >
                          <Ionicons name="remove" size={13} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.invQtyText}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.invQtyBtn}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleAdjustItemQuantity(it.id, 1);
                          }}
                          testID={`btn-qty-plus-${it.id}`}
                        >
                          <Ionicons name="add" size={13} color={colors.text} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.invToggleBtn,
                          it.equipped
                            ? { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }
                            : { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleToggleEquipItem(it.id);
                        }}
                        testID={`btn-toggle-equip-${it.id}`}
                      >
                        <Ionicons
                          name={it.equipped ? 'checkmark-circle' : 'ellipse-outline'}
                          size={13}
                          color={it.equipped ? '#10B981' : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.invToggleBtnText,
                            { color: it.equipped ? '#10B981' : colors.textMuted },
                          ]}
                        >
                          {isVest
                            ? it.equipped
                              ? 'Vestida'
                              : 'Despida'
                            : isUten
                            ? it.equipped
                              ? 'Empunhado'
                              : 'Guardado'
                            : it.equipped
                            ? 'Equipado'
                            : 'Guardado'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.invSpacesBadge}>
                        <Text style={styles.invSpacesText}>{formatSpacesLabel(totalSpacesForItem)} esp.</Text>
                      </View>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setEditingInventoryItem(it);
                          setItemEditorVisible(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        testID={`sheet-inv-edit-${it.id}`}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>

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
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        testID={`sheet-inv-delete-${it.id}`}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
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
      {/* MODAL UNIFICADO: Editor Completo de Arma (Armaria <-> Agente) */}
      {/* ============================================================ */}
      <WeaponEditorModal
        visible={weaponEditorVisible}
        onClose={() => {
          setWeaponEditorVisible(false);
          setEditingWeapon(null);
          setEditingLegacyAttack(null);
        }}
        initialWeapon={editingWeapon}
        onSave={handleSaveAgentWeapon}
        saveButtonLabel={editingWeapon ? 'Salvar Arma e Sincronizar' : 'Criar e Equipar Arma'}
        linkedAgentNames={
          editingWeapon
            ? characters
                .filter((c) => (c.attacks || []).some((a) => a.customWeaponId === editingWeapon.id))
                .map((c) => c.name)
            : undefined
        }
      />

      {/* MODAL: Preparação de Golpe Tático */}
      {activeChar && agentDamageProfile ? (
        <AttackPreparationModal
          visible={prepModalAttack !== null}
          attack={prepModalAttack}
          character={activeChar}
          customWeapon={
            prepModalAttack?.customWeaponId
              ? customWeapons.find((w) => w.id === prepModalAttack.customWeaponId)
              : undefined
          }
          profile={agentDamageProfile}
          onClose={() => setPrepModalAttack(null)}
          onConfirmRoll={handleConfirmPreparedRoll}
        />
      ) : null}

      {/* MODAL: Escolha do modo de Crítico ("Perguntar Sempre") */}
      <CriticalModePromptModal
        visible={critPromptAttack !== null}
        weaponName={critPromptAttack?.attack.name}
        isMaxDamage={critPromptAttack?.isMaxDamage}
        onClose={() => setCritPromptAttack(null)}
        onSelect={(mode) => {
          if (!critPromptAttack) return;
          const target = critPromptAttack;
          setCritPromptAttack(null);
          handleRollAttackDamage(target.attack, true, mode, target.isMaxDamage, target.resolved);
        }}
      />

      {/* MODAL: Escolha ao Importar Arma da Armaria (Usar a Mesma vs Duplicar) */}
      <Modal
        visible={importChoiceWeapon !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setImportChoiceWeapon(null)}
      >
        <View style={styles.weaponChoiceOverlay}>
          <View style={styles.weaponChoiceCard}>
            <View style={styles.weaponChoiceHeader}>
              <Text style={styles.weaponChoiceTitle}>Importar da Armaria</Text>
              <TouchableOpacity
                onPress={() => setImportChoiceWeapon(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.weaponChoiceSub}>
              Como deseja adicionar "{importChoiceWeapon?.name}" à ficha de {activeChar?.name}?
            </Text>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={() => handleConfirmImportArmariaWeapon('shared')}
              testID="btn-import-weapon-shared"
            >
              <Ionicons name="link" size={18} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>Usar a Mesma (Vinculada)</Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Qualquer edição na Armaria ou neste agente atualiza os dois lados automaticamente.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={() => handleConfirmImportArmariaWeapon('duplicate')}
              testID="btn-import-weapon-duplicate"
            >
              <Ionicons name="copy-outline" size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>
                  Duplicar ({importChoiceWeapon?.name} ({activeChar?.name || 'Agente'}))
                </Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Cria uma cópia independente na Armaria com o nome atual do agente; edições futuras não afetam a original.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weaponChoiceCancelBtn}
              onPress={() => {
                setImportChoiceWeapon(null);
                setPickerModalType('add_weapon_armaria');
              }}
              testID="btn-import-weapon-cancel"
            >
              <Text style={styles.weaponChoiceCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Confirmação de Remoção de Arma no Agente */}
      <Modal
        visible={deleteAttackChoice !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteAttackChoice(null)}
      >
        <View style={styles.weaponChoiceOverlay}>
          <View style={styles.weaponChoiceCard}>
            <View style={styles.weaponChoiceHeader}>
              <Text style={styles.weaponChoiceTitle}>Remover Arma</Text>
              <TouchableOpacity
                onPress={() => setDeleteAttackChoice(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.weaponChoiceSub}>
              Deseja remover "{deleteAttackChoice?.name}" apenas da ficha de {activeChar?.name} ou também excluí-la da Armaria?
            </Text>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={async () => {
                if (!activeChar || !deleteAttackChoice) return;
                const target = deleteAttackChoice;
                setDeleteAttackChoice(null);
                await removeAttackFromCharacter(activeChar.id, target.id, {
                  alsoDeleteFromArmory: false,
                });
              }}
              testID="btn-delete-attack-agent-only"
            >
              <Ionicons name="person-remove-outline" size={18} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>Remover só do Agente</Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Remove o ataque e os itens vinculados desta ficha, mantendo a arma na Armaria.
                </Text>
              </View>
            </TouchableOpacity>

            {deleteAttackChoice?.customWeaponId ? (
              <TouchableOpacity
                style={[styles.weaponChoiceBtn, { borderColor: 'rgba(239, 68, 68, 0.45)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}
                onPress={async () => {
                  if (!activeChar || !deleteAttackChoice) return;
                  const target = deleteAttackChoice;
                  setDeleteAttackChoice(null);
                  await removeAttackFromCharacter(activeChar.id, target.id, {
                    alsoDeleteFromArmory: true,
                  });
                }}
                testID="btn-delete-attack-and-armory"
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.weaponChoiceBtnTitle, { color: '#EF4444' }]}>
                    Remover do Agente e da Armaria
                  </Text>
                  <Text style={styles.weaponChoiceBtnDesc}>
                    Exclui permanentemente a arma da Armaria e desvincula de todos os agentes que a utilizam.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.weaponChoiceCancelBtn}
              onPress={() => setDeleteAttackChoice(null)}
              testID="btn-delete-attack-cancel"
            >
              <Text style={styles.weaponChoiceCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
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
      {/* MODAL UNIFICADO: Criar / Editar Item no Inventário           */}
      {/* ============================================================ */}
      <ItemEditorModal
        visible={itemEditorVisible}
        onClose={() => {
          setItemEditorVisible(false);
          setEditingInventoryItem(null);
        }}
        mode="character"
        initialInventoryItem={editingInventoryItem}
        onSave={handleSaveUnifiedItem}
      />

      {/* MODAL: Escolha ao Importar Item do Depósito (Vinculado vs Duplicado) */}
      <Modal
        visible={importChoiceItem !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setImportChoiceItem(null)}
      >
        <View style={styles.weaponChoiceOverlay}>
          <View style={styles.weaponChoiceCard}>
            <View style={styles.weaponChoiceHeader}>
              <Text style={styles.weaponChoiceTitle}>Importar do Depósito</Text>
              <TouchableOpacity
                onPress={() => setImportChoiceItem(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.weaponChoiceSub}>
              Como deseja adicionar "{importChoiceItem?.name}" à ficha de {activeChar?.name}?
            </Text>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={() => handleConfirmImportDepotItem('shared')}
              testID="btn-import-item-shared"
            >
              <Ionicons name="link" size={18} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>Usar o Mesmo (Vinculado)</Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Alterações neste item no Depósito atualizam automaticamente esta ficha.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={() => handleConfirmImportDepotItem('duplicate')}
              testID="btn-import-item-duplicate"
            >
              <Ionicons name="copy-outline" size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>
                  Duplicar ({importChoiceItem?.name} ({activeChar?.name || 'Agente'}))
                </Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Cria uma cópia independente no Depósito para este agente.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weaponChoiceCancelBtn}
              onPress={() => {
                setImportChoiceItem(null);
                setPickerModalType('add_item_depot');
              }}
            >
              <Text style={styles.weaponChoiceCancelText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Aplicar Cura / Temporário em Mim vs Em Aliado */}
      <Modal
        visible={healChoiceModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setHealChoiceModal(null)}
      >
        <View style={styles.weaponChoiceOverlay}>
          <View style={styles.weaponChoiceCard}>
            <View style={styles.weaponChoiceHeader}>
              <Text style={styles.weaponChoiceTitle}>
                Usar {healChoiceModal?.item.name}
              </Text>
              <TouchableOpacity
                onPress={() => setHealChoiceModal(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.weaponChoiceSub}>
              {healChoiceModal?.mechanic.label}
              {healChoiceModal?.mechanic.formula ? ` (${healChoiceModal.mechanic.formula})` : ''}
              {healChoiceModal?.mechanic.flatValue ? ` (+${healChoiceModal.mechanic.flatValue})` : ''}
              . Onde deseja aplicar o efeito?
            </Text>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={() => {
                if (!healChoiceModal) return;
                const target = healChoiceModal;
                setHealChoiceModal(null);
                void handleExecuteItemMechanic(target.item, target.mechanic, 'self');
              }}
              testID="btn-heal-choice-self"
            >
              <Ionicons name="person" size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>Aplicar em Mim ({activeChar?.name})</Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Rola os dados, soma diretamente nos seus pontos atuais/temporários e consome 1 uso.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weaponChoiceBtn}
              onPress={() => {
                if (!healChoiceModal) return;
                const target = healChoiceModal;
                setHealChoiceModal(null);
                void handleExecuteItemMechanic(target.item, target.mechanic, 'ally');
              }}
              testID="btn-heal-choice-ally"
            >
              <Ionicons name="people" size={18} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.weaponChoiceBtnTitle}>Aplicar em Aliado (Apenas Rolar)</Text>
                <Text style={styles.weaponChoiceBtnDesc}>
                  Rola o resultado na tela e na mesa virtual para o aliado, consumindo 1 uso sem alterar seus pontos.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.weaponChoiceCancelBtn}
              onPress={() => setHealChoiceModal(null)}
            >
              <Text style={styles.weaponChoiceCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
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
                : pickerModalType === 'add_item_depot'
                ? 'Importar do Depósito'
                : pickerModalType === 'add_item_compendium'
                ? 'Adicionar Item do Compêndio'
                : 'Selecionar do Compêndio'}
            </Text>
            <TouchableOpacity onPress={() => setPickerModalType(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.input,
              {
                margin: 14,
                marginBottom:
                  pickerModalType === 'link_compendium' || pickerModalType === 'add_item_compendium'
                    ? 6
                    : 14,
              },
            ]}
            placeholder="Filtrar por nome..."
            placeholderTextColor={colors.textMuted}
            value={pickerSearch}
            onChangeText={setPickerSearch}
          />

          {pickerModalType === 'add_item_compendium' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, height: 46 }}
              contentContainerStyle={{
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 4,
                alignItems: 'center',
              }}
            >
              {(
                [
                  { id: 'all', label: `Todos (${curatedCompendiumItems.length})` },
                  { id: 'cura', label: 'Cura' },
                  { id: 'acessorio', label: 'Acessório' },
                  { id: 'explosivo', label: 'Explosivo' },
                  { id: 'operacional', label: 'Operacional' },
                  { id: 'paranormal', label: 'Paranormal' },
                  { id: 'amaldicoado', label: 'Amaldiçoado' },
                  { id: 'protecao', label: 'Proteção' },
                ] as const
              ).map((tab) => {
                const active = itemCompendiumFilter === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.rankPill, active && styles.rankPillActive]}
                    onPress={() => setItemCompendiumFilter(tab.id)}
                  >
                    <Text style={[styles.rankPillText, active && styles.rankPillTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {pickerModalType === 'link_compendium' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, height: 46 }}
              contentContainerStyle={{
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 4,
                alignItems: 'center',
              }}
            >
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
            ) : pickerModalType === 'add_item_depot' ? (
              customItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Nenhum item no Depósito</Text>
                  <Text style={styles.emptySub}>
                    Crie itens na aba "Armaria ➔ Itens & Acessórios" ou salve um item marcando "Salvar também no Depósito".
                  </Text>
                </View>
              ) : (
                customItems
                  .filter((it) => it.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map((it) => (
                    <TouchableOpacity
                      key={it.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setPickerModalType(null);
                        setImportChoiceItem(it);
                      }}
                      testID={`picker-depot-item-${it.id}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemTitle}>{it.name}</Text>
                        <Text style={styles.pickerItemSub}>
                          Cat {it.finalCategory} • {formatSpacesLabel(it.finalSpaces)} esp. • {it.itemType.toUpperCase()}
                          {it.targetSkill ? ` • +${it.skillBonus || 2} ${it.targetSkill}` : ''}
                        </Text>
                        {it.mechanics && it.mechanics.length > 0 ? (
                          <Text style={[styles.pickerItemSub, { color: '#38BDF8', marginTop: 2 }]}>
                            Mecânicas: {it.mechanics.map((m) => m.label).join(', ')}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="add-circle" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  ))
              )
            ) : pickerModalType === 'add_item_compendium' ? (
              curatedCompendiumItems
                .filter((it) => {
                  if (itemCompendiumFilter !== 'all' && it.subCategoryGroup !== itemCompendiumFilter) {
                    return false;
                  }
                  if (!pickerSearch.trim()) return true;
                  const q = pickerSearch.trim().toLowerCase();
                  return (
                    it.name.toLowerCase().includes(q) ||
                    it.description.toLowerCase().includes(q) ||
                    it.bookTitle.toLowerCase().includes(q)
                  );
                })
                .map((it: CuratedCompendiumItem) => (
                  <TouchableOpacity
                    key={it.id}
                    style={styles.pickerItem}
                    onPress={async () => {
                      const invItem = buildInventoryItemFromCuratedItem(it);
                      await updateActiveChar({
                        inventory: [...(activeChar.inventory || []), invItem],
                      });
                      setPickerModalType(null);
                    }}
                    onLongPress={() => {
                      if (it.sourceEntity) {
                        openEntityPreview(it.sourceEntity);
                      }
                    }}
                    delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    testID={`picker-comp-item-${it.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.pickerItemTitle}>{it.name}</Text>
                        <View style={styles.invSpacesBadge}>
                          <Text style={styles.invSpacesText}>
                            Cat {it.category} • {formatSpacesLabel(it.spaces)} esp.
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.pickerItemSub}>
                        {it.bookTitle}
                        {it.pageNumber ? ` p. ${it.pageNumber}` : ''} • {it.subCategoryGroup.toUpperCase()}
                      </Text>
                      {it.mechanics.length > 0 ? (
                        <Text style={[styles.pickerItemSub, { color: '#34D399', marginTop: 2 }]}>
                          ⚡ {it.mechanics.map((m) => `${m.label}${m.formula ? ` (${m.formula})` : ''}`).join(' • ')}
                        </Text>
                      ) : null}
                      {it.description ? (
                        <Text style={[styles.pickerItemSub, { marginTop: 2 }]} numberOfLines={2}>
                          {it.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.depotMiniBtn}
                        onPress={async (e) => {
                          e.stopPropagation?.();
                          const catalogItem = buildCatalogItemFromCuratedItem(it);
                          await equipCatalogItemToCharacter(catalogItem, activeChar.id, {
                            mode: 'shared',
                            quantity: 1,
                          });
                          setPickerModalType(null);
                          showAlert(
                            'Adicionado à Ficha & Depósito',
                            `"${catalogItem.name}" foi salvo no Depósito e equipado em ${activeChar.name}!`
                          );
                        }}
                        testID={`picker-comp-item-depot-${it.id}`}
                      >
                        <Ionicons name="briefcase-outline" size={12} color="#38BDF8" />
                        <Text style={styles.depotMiniBtnText}>+ Depósito</Text>
                      </TouchableOpacity>
                      <Ionicons name="add-circle" size={22} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                ))
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
                      return (
                        e.category === 'power' &&
                        (sub.includes('combatente') ||
                          sub.includes('especialista') ||
                          sub.includes('ocultista') ||
                          sub.includes('geral') ||
                          sub.includes('intenção') ||
                          sub.includes('intencao'))
                      );
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
                    const isNoPrereq = !item.prerequisite || item.prerequisite === 'Nenhum' || item.prerequisite === '—';
                    const prereqStatus = isNoPrereq
                      ? { met: true, details: 'Nenhum', unmetDetails: [] as string[] }
                      : checkPrerequisite(item.prerequisite, activeChar, getEntityById);

                    const applyPickerItem = async () => {
                      if (pickerModalType === 'origin') {
                        await updateActiveChar({ originId: item.id });
                      } else if (pickerModalType === 'class') {
                        await updateActiveChar({ classId: item.id });
                      } else if (pickerModalType === 'track') {
                        await updateActiveChar({ trackId: item.id });
                      } else if (pickerModalType === 'link_compendium') {
                        if (!activeChar.entityIds.includes(item.id)) {
                          const nextEntityIds = [...activeChar.entityIds, item.id];
                          const tempChar = { ...activeChar, entityIds: nextEntityIds };
                          const vitals = calculateCharacterVitals(tempChar, getEntityById);
                          const pvDiff = Math.max(0, vitals.pvMax - activeChar.pvMax);
                          const peDiff = Math.max(0, vitals.peMax - activeChar.peMax);
                          const sanDiff = Math.max(0, vitals.sanMax - activeChar.sanMax);
                          const updatedSkills = { ...(activeChar.skills || {}) };
                          if (vitals.skillBonuses) {
                            for (const [skName, bVal] of Object.entries(vitals.skillBonuses)) {
                              if (bVal !== undefined) {
                                updatedSkills[skName] = {
                                  degree: updatedSkills[skName]?.degree || 0,
                                  bonus: bVal,
                                };
                              }
                            }
                          }
                          await updateActiveChar({
                            entityIds: nextEntityIds,
                            pvMax: vitals.pvMax,
                            pvCurrent: activeChar.pvCurrent + pvDiff,
                            peMax: vitals.peMax,
                            peCurrent: activeChar.peCurrent + peDiff,
                            sanMax: vitals.sanMax,
                            sanCurrent: activeChar.sanCurrent + sanDiff,
                            peRound: vitals.peRound,
                            dtRituals: vitals.dtRituals,
                            skills: updatedSkills,
                          });
                        }
                      }
                      setPickerModalType(null);
                    };

                    const selectPickerItem = () => {
                      if (pickerModalType === 'link_compendium' && !prereqStatus.met) {
                        confirmUnmetPrerequisites(
                          item.name,
                          prereqStatus.unmetDetails || prereqStatus.details,
                          () => {
                            void applyPickerItem();
                          }
                        );
                        return;
                      }
                      void applyPickerItem();
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.pickerItemTitle}>{item.name}</Text>
                            {Boolean(item.prerequisite) && (
                              <View
                                style={[
                                  styles.pickerPrereqBadge,
                                  isNoPrereq
                                    ? { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                                    : prereqStatus.met
                                    ? { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: 'rgba(34, 197, 94, 0.35)' }
                                    : { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.4)' },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    isNoPrereq
                                      ? 'checkmark-circle-outline'
                                      : prereqStatus.met
                                      ? 'checkmark-circle'
                                      : 'alert-circle'
                                  }
                                  size={10}
                                  color={
                                    isNoPrereq
                                      ? colors.textMuted
                                      : prereqStatus.met
                                      ? '#22C55E'
                                      : '#EF4444'
                                  }
                                />
                                <Text
                                  style={[
                                    styles.pickerPrereqText,
                                    {
                                      color: isNoPrereq
                                        ? colors.textMuted
                                        : prereqStatus.met
                                        ? '#22C55E'
                                        : '#EF4444',
                                    },
                                  ]}
                                >
                                  {isNoPrereq
                                    ? 'Pré-req: Nenhum'
                                    : prereqStatus.met
                                    ? `Pré-req: ${item.prerequisite} (Atendido)`
                                    : `Pré-req: ${item.prerequisite} (${prereqStatus.details})`}
                                </Text>
                              </View>
                            )}
                          </View>
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

      <ProtectionModal
        visible={protectionModalVisible}
        character={activeChar}
        onClose={() => setProtectionModalVisible(false)}
        onApply={handleApplyProtections}
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
                  await copyToClipboard(code, `Ficha de ${sharingChar.name}`);
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

export const createStyles = (colors: ThemeColors) =>
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
    flexShrink: 0,
    marginRight: 10,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  topBarActionsScroll: {
    flexShrink: 1,
    flexGrow: 0,
  },
  topBarRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
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
    flexWrap: 'wrap',
    gap: 8,
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
  rollCritMaxBtn: {
    flex: 1,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rollCritMaxBtnText: {
    color: '#FEF08A',
    fontSize: 10,
    fontWeight: '900',
  },
  weaponChoiceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  weaponChoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  weaponChoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  weaponChoiceTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  weaponChoiceSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  weaponChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  weaponChoiceBtnTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  weaponChoiceBtnDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  weaponChoiceCancelBtn: {
    marginTop: 2,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  weaponChoiceCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
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
  pickerPrereqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  pickerPrereqText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rankPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  rankPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  rankPillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  defenseAssistantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  defenseAssistantBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nonProficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  nonProficientBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  protectionPenaltyWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  protectionPenaltyWarningText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  clothingSummaryCard: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: '#A855F7',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  clothingSummaryTitle: {
    color: '#A855F7',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  clothingSummarySub: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  clothingLimitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 8,
    borderRadius: 6,
  },
  clothingLimitWarningText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  itemSkillBonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: '#A855F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  itemSkillBonusBadgeText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '700',
  },
  invToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invToggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  invItemTypeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  invItemTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemTypePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  itemTypePillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: '#A855F7',
  },
  itemTypePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  itemTypePillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  bonusConfigBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  pedagogicalHint: {
    fontSize: 11,
    color: '#EAB308',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillChipActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: '#A855F7',
  },
  skillChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  skillChipTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  bonusPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  bonusPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#A855F7',
  },
  bonusPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  bonusPillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  attackBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  attackModBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attackModBadgeText: {
    color: '#D8B4FE',
    fontSize: 10,
    fontWeight: '700',
  },
  statBaseSub: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  prepareAttackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    marginTop: 6,
  },
  prepareAttackBtnText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '800',
  },
  ritualControlBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  ritualBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  ritualDtBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ritualDtBadgeText: {
    color: '#FCA5A5',
    fontSize: 10,
    fontWeight: '800',
  },
  ritualModBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ritualModBadgeText: {
    color: '#D8B4FE',
    fontSize: 10,
    fontWeight: '700',
  },
  ritualTierRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ritualTierPill: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  ritualTierPillActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#A855F7',
  },
  ritualTierPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  ritualTierPillTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  ritualRollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  ritualRollBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tempStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tempStatBadge: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tempStatLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tempStatVal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  tempMiniBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    minWidth: 26,
    alignItems: 'center',
  },
  tempMiniBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  invItemCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  invItemRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  invMechanicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  invMechBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  invMechBtnText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  invItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  invQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  invQtyBtn: {
    padding: 2,
  },
  invQtyText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 14,
    textAlign: 'center',
  },
  depotMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  depotMiniBtnText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
});
