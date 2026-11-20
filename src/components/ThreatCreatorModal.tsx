import React, { useEffect, useRef, useState } from 'react';
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
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import {
  CampaignMonster,
  CharacterAttributes,
  CompendiumEntity,
  ParanormalElement,
  ThreatAbilityEntry,
  ThreatAttackAction,
} from '../types/compendium';
import { showAlert } from '../utils/alert';

export const THREAT_VD_PRESETS = [20, 40, 60, 80, 100, 140, 180, 220, 260, 300, 340, 380, 400] as const;

const THREAT_TYPES: ReadonlyArray<{
  value: 'Criatura' | 'Pessoa' | 'Animal' | 'Relíquia';
  label: string;
}> = [
  { value: 'Criatura', label: 'Criatura Paranormal' },
  { value: 'Pessoa', label: 'Humano / Cultista' },
  { value: 'Animal', label: 'Animal / Besta' },
  { value: 'Relíquia', label: 'Relíquia / Boss' },
];
const THREAT_SIZES = ['Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Colossal'] as const;
type ThreatSizeType = (typeof THREAT_SIZES)[number];
type ThreatCreatureType = 'Criatura' | 'Pessoa' | 'Animal' | 'Relíquia';
const THREAT_ELEMENTS: ParanormalElement[] = ['Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo', 'Nenhum'];
const ATTACK_ACTION_TYPES: Array<ThreatAttackAction['actionType']> = ['Padrão', 'Movimento', 'Livre', 'Reação', 'Completa'];
const ABILITY_ACTION_TYPES: Array<NonNullable<ThreatAbilityEntry['actionType']>> = [
  'Passiva',
  'Livre',
  'Movimento',
  'Padrão',
  'Completa',
  'Reação',
];

export interface GeneratedThreatStats {
  pv: number;
  defense: number;
  saves: { fortitude: number; reflexos: number; vontade: number };
  attributes: CharacterAttributes;
  disturbingPresence: string;
  attackDice: number;
  attackBonus: number;
  damageFormula: string;
  rdSuggestion: string;
}

/**
 * Gera estatísticas balanceadas por VD inspiradas nas tabelas oficiais de ameaças (C.R.I.S. / Ordem Paranormal).
 */
export function generateThreatStatsForVd(rawVd: number): GeneratedThreatStats {
  const vd = Math.max(5, Math.min(400, Number.isFinite(rawVd) ? rawVd : 20));
  const tier = Math.max(1, Math.round(vd / 20)); // 1 (VD 20) .. 20 (VD 400)

  const pv =
    vd <= 20
      ? 40
      : vd <= 100
      ? Math.round(40 + (vd - 20) * 1.65)
      : vd <= 260
      ? Math.round(172 + (vd - 100) * 2.65)
      : Math.round(600 + (vd - 260) * 7);

  const defense = Math.min(60, Math.round(13 + tier * 2.25));
  const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
  const fort = roundTo5(4 + tier * 1.35);
  const ref = roundTo5(4 + tier * 1.25);
  const von = roundTo5(3 + tier * 1.2);

  const primaryAttr = Math.min(6, 2 + Math.floor(tier / 4));
  const secondaryAttr = Math.max(1, primaryAttr - 1);
  const lowAttr = Math.max(1, Math.min(3, Math.floor(tier / 6) + 1));

  const dpDt = Math.min(48, Math.round(12 + tier * 1.55));
  const dpDiceCount = Math.max(1, Math.min(10, Math.ceil(tier / 2)));
  const dpFaces = vd >= 300 ? 8 : 6;
  const immuneNex = vd <= 340 ? Math.min(95, 20 + tier * 5) : 0;
  const immunityNote = immuneNex > 0 ? ` • NEX ${immuneNex}%+ é imune` : '';
  const disturbingPresence = `DT ${dpDt} • ${dpDiceCount}d${dpFaces} mental${immunityNote}`;

  const attackDice = Math.min(5, Math.max(2, primaryAttr));
  const attackBonus = roundTo5(5 + tier * 1.75);

  const dmgDice = Math.max(1, Math.min(6, Math.ceil(tier / 3)));
  const dmgFaces = tier >= 10 ? 12 : tier >= 4 ? 10 : 8;
  const dmgFlat = Math.round(3 + tier * 1.5);
  const damageFormula = `${dmgDice}d${dmgFaces}+${dmgFlat}`;

  const rdVal = tier <= 2 ? 0 : tier <= 6 ? 5 : tier <= 12 ? 10 : tier <= 16 ? 15 : 20;
  const rdSuggestion = rdVal > 0 ? `Balístico, Corte, Impacto e Perfuração ${rdVal}` : '';

  return {
    pv,
    defense,
    saves: { fortitude: fort, reflexos: ref, vontade: von },
    attributes: {
      AGI: secondaryAttr,
      FOR: primaryAttr,
      INT: lowAttr,
      PRE: secondaryAttr,
      VIG: primaryAttr,
    },
    disturbingPresence,
    attackDice,
    attackBonus,
    damageFormula,
    rdSuggestion,
  };
}

export interface ThreatCreatorSavePayload {
  monster: CampaignMonster;
  compendiumEntity: Omit<CompendiumEntity, 'id'>;
  alsoSaveToCompendium?: boolean;
}

export interface ThreatCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: ThreatCreatorSavePayload) => void | Promise<void>;
  initialMonster?: CampaignMonster | null;
  initialEntity?: CompendiumEntity | null;
  mode?: 'campaign' | 'compendium';
}

export function formatStructuredAttacksSummary(attacks: ThreatAttackAction[], manualText?: string): string {
  const lines = attacks.map((atk) => {
    const typeTag = atk.actionType ? `[${atk.actionType}] ` : '';
    const dmgType = atk.damageType ? ` ${atk.damageType}` : '';
    const crit = atk.critical ? ` (${atk.critical})` : '';
    return `• ${typeTag}${atk.name}: ${atk.testFormula} | Dano ${atk.damageFormula}${dmgType}${crit}`;
  });
  const extraManual = (manualText || '').trim();
  if (extraManual) lines.push(extraManual);
  return lines.join('\n').trim();
}

export function formatStructuredAbilitiesSummary(
  abilities: ThreatAbilityEntry[],
  extras: {
    senses?: { perception: string; initiative: string; vision?: string };
    displacement?: string;
    saves?: { fortitude?: string | number; reflexos?: string | number; vontade?: string | number };
    resistancesText?: string;
    immunitiesText?: string;
    vulnerabilitiesText?: string;
    skillsText?: string;
    fearEnigma?: string;
    manualText?: string;
  }
): string {
  const blocks: string[] = [];
  if (extras.senses) {
    blocks.push(
      `Sentidos: Percepção ${extras.senses.perception}, Iniciativa ${extras.senses.initiative}${
        extras.senses.vision ? ` (${extras.senses.vision})` : ''
      }`
    );
  }
  if (extras.displacement) blocks.push(`Deslocamento: ${extras.displacement}`);
  if (
    extras.saves &&
    (extras.saves.fortitude !== undefined ||
      extras.saves.reflexos !== undefined ||
      extras.saves.vontade !== undefined)
  ) {
    blocks.push(
      `Resistências: Fortitude ${extras.saves.fortitude ?? '+0'}, Reflexos ${extras.saves.reflexos ?? '+0'}, Vontade ${extras.saves.vontade ?? '+0'}`
    );
  }
  if (extras.resistancesText) blocks.push(`RD: ${extras.resistancesText}`);
  if (extras.immunitiesText) blocks.push(`Imunidades: ${extras.immunitiesText}`);
  if (extras.vulnerabilitiesText) blocks.push(`Vulnerabilidades: ${extras.vulnerabilitiesText}`);
  if (extras.skillsText) blocks.push(`Perícias: ${extras.skillsText}`);
  for (const ab of abilities) {
    const header = `[${ab.actionType || 'Passiva'}] ${ab.name}`;
    blocks.push(`• ${header}: ${ab.description}`);
  }
  if (extras.fearEnigma) {
    blocks.push(`Enigma de Medo: ${extras.fearEnigma}`);
  }
  if (extras.manualText?.trim()) {
    blocks.push(extras.manualText.trim());
  }
  return blocks.join('\n').trim();
}

export function ThreatCreatorModal({
  visible,
  onClose,
  onSave,
  initialMonster,
  initialEntity,
  mode = 'campaign',
}: ThreatCreatorModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  // Identidade e VD
  const [name, setName] = useState('');
  const [vdText, setVdText] = useState('20');
  const [creatureType, setCreatureType] = useState<ThreatCreatureType>('Criatura');
  const [size, setSize] = useState<ThreatSizeType>('Médio');
  const [element, setElement] = useState<string>('Sangue');
  const [secondaryElements, setSecondaryElements] = useState<string[]>([]);

  // Atributos e Combate
  const [pvMaxText, setPvMaxText] = useState('40');
  const [defenseText, setDefenseText] = useState('15');
  const [attributes, setAttributes] = useState<CharacterAttributes>({
    AGI: 2,
    FOR: 2,
    INT: 1,
    PRE: 2,
    VIG: 2,
  });
  const [fortitudeText, setFortitudeText] = useState('+5');
  const [reflexosText, setReflexosText] = useState('+5');
  const [vontadeText, setVontadeText] = useState('+3');

  // Detalhes C.R.I.S.
  const [perceptionText, setPerceptionText] = useState('+5');
  const [initiativeText, setInitiativeText] = useState('+5');
  const [visionText, setVisionText] = useState('Visão no escuro');
  const [displacement, setDisplacement] = useState('9m / 6q');
  const [disturbingPresence, setDisturbingPresence] = useState('DT 14 • 1d6 mental');
  const [resistancesText, setResistancesText] = useState('');
  const [immunitiesText, setImmunitiesText] = useState('');
  const [vulnerabilitiesText, setVulnerabilitiesText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [fearEnigma, setFearEnigma] = useState('');
  const [notes, setNotes] = useState('');

  // Construtor de Ataques
  const [structuredAttacks, setStructuredAttacks] = useState<ThreatAttackAction[]>([]);
  const [atkName, setAtkName] = useState('');
  const [atkActionType, setAtkActionType] = useState<ThreatAttackAction['actionType']>('Padrão');
  const [atkTestFormula, setAtkTestFormula] = useState('2d20+8');
  const [atkDamageFormula, setAtkDamageFormula] = useState('1d10+4');
  const [atkDamageType, setAtkDamageType] = useState('Corte');
  const [atkCritical, setAtkCritical] = useState('20/x2');
  const [atkRange, setAtkRange] = useState('Adjacente');
  const [atkExtra, setAtkExtra] = useState('');
  const [manualAttacksText, setManualAttacksText] = useState('');

  // Construtor de Habilidades
  const [structuredAbilities, setStructuredAbilities] = useState<ThreatAbilityEntry[]>([]);
  const [abName, setAbName] = useState('');
  const [abActionType, setAbActionType] = useState<NonNullable<ThreatAbilityEntry['actionType']>>('Padrão');
  const [abDesc, setAbDesc] = useState('');
  const [abFormula, setAbFormula] = useState('');
  const [abDt, setAbDt] = useState('');
  const [manualAbilitiesText, setManualAbilitiesText] = useState('');

  // Exportação ao Compêndio
  const [alsoSaveToCompendium, setAlsoSaveToCompendium] = useState(false);
  const wasVisibleRef = useRef(false);

  // Intercepta botão físico de retorno no Android APK
  useEffect(() => {
    if (Platform.OS !== 'android' || typeof document !== 'undefined' || !visible) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return;
    wasVisibleRef.current = true;

    const parseAttr = (raw: unknown, fallback: number) => {
      const parsed = parseInt(String(raw ?? ''), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const src = initialMonster || initialEntity;
    if (src) {
      setName(src.name || '');
      const srcVd = src.vd || 20;
      setVdText(String(srcVd));
      setCreatureType((src.creatureType as ThreatCreatureType) || 'Criatura');
      setSize((src.size as ThreatSizeType) || 'Médio');
      setElement(src.element || 'Sangue');
      setSecondaryElements(src.secondaryElements ? [...src.secondaryElements] : []);
      const srcPv = initialMonster ? initialMonster.pvMax : initialEntity?.pv || 40;
      setPvMaxText(String(srcPv || 40));
      setDefenseText(String(src.defense || 15));
      if (src.attributes) {
        setAttributes({
          AGI: parseAttr(src.attributes.AGI, 2),
          FOR: parseAttr(src.attributes.FOR, 2),
          INT: parseAttr(src.attributes.INT, 1),
          PRE: parseAttr(src.attributes.PRE, 2),
          VIG: parseAttr(src.attributes.VIG, 2),
        });
      } else {
        setAttributes({ AGI: 2, FOR: 2, INT: 1, PRE: 2, VIG: 2 });
      }
      setFortitudeText(String(src.saves?.fortitude ?? '+5'));
      setReflexosText(String(src.saves?.reflexos ?? '+5'));
      setVontadeText(String(src.saves?.vontade ?? '+3'));
      if (src.senses && typeof src.senses === 'object') {
        setPerceptionText(src.senses.perception || '+5');
        setInitiativeText(src.senses.initiative || '+5');
        setVisionText(src.senses.vision || '');
      } else {
        setPerceptionText('+5');
        setInitiativeText('+5');
        setVisionText('Visão no escuro');
      }
      setDisplacement(src.displacement || '9m / 6q');
      setDisturbingPresence(src.disturbingPresence || '');
      setResistancesText(src.resistancesText || '');
      setImmunitiesText(src.immunitiesText || '');
      setVulnerabilitiesText(src.vulnerabilitiesText || '');
      setSkillsText(src.skillsText || '');
      setFearEnigma(src.fearEnigma || '');
      setNotes(initialMonster?.notes || '');
      setStructuredAttacks(
        src.structuredAttacks ? src.structuredAttacks.map((a) => ({ ...a })) : []
      );
      setStructuredAbilities(
        src.structuredAbilities ? src.structuredAbilities.map((a) => ({ ...a })) : []
      );
      setManualAttacksText(
        !src.structuredAttacks?.length ? initialMonster?.attacks || '' : ''
      );
      setManualAbilitiesText(
        !src.structuredAbilities?.length
          ? initialMonster?.abilities || initialEntity?.description || ''
          : ''
      );
    } else {
      const defaults = generateThreatStatsForVd(20);
      setName('');
      setVdText('20');
      setCreatureType('Criatura');
      setSize('Médio');
      setElement('Sangue');
      setSecondaryElements([]);
      setPvMaxText(String(defaults.pv));
      setDefenseText(String(defaults.defense));
      setAttributes(defaults.attributes);
      setFortitudeText(`+${defaults.saves.fortitude}`);
      setReflexosText(`+${defaults.saves.reflexos}`);
      setVontadeText(`+${defaults.saves.vontade}`);
      setPerceptionText('+5');
      setInitiativeText('+5');
      setVisionText('Visão no escuro');
      setDisplacement('9m / 6q');
      setDisturbingPresence(defaults.disturbingPresence);
      setResistancesText('');
      setImmunitiesText('');
      setVulnerabilitiesText('');
      setSkillsText('');
      setFearEnigma('');
      setNotes('');
      setStructuredAttacks([]);
      setStructuredAbilities([]);
      setManualAttacksText('');
      setManualAbilitiesText('');
    }
    setAlsoSaveToCompendium(false);
    setAtkName('');
    setAbName('');
    setAbDesc('');
    setAbFormula('');
    setAbDt('');
  }, [visible, initialMonster, initialEntity]);

  const applyVdPreset = (targetVd: number) => {
    const preset = generateThreatStatsForVd(targetVd);
    setVdText(String(targetVd));
    setPvMaxText(String(preset.pv));
    setDefenseText(String(preset.defense));
    setAttributes(preset.attributes);
    setFortitudeText(`+${preset.saves.fortitude}`);
    setReflexosText(`+${preset.saves.reflexos}`);
    setVontadeText(`+${preset.saves.vontade}`);
    setPerceptionText(`+${preset.saves.reflexos}`);
    setInitiativeText(`+${preset.saves.reflexos}`);
    setDisturbingPresence(
      creatureType === 'Pessoa' || creatureType === 'Animal' ? '' : preset.disturbingPresence
    );
    setAtkTestFormula(`${preset.attackDice}d20+${preset.attackBonus}`);
    setAtkDamageFormula(preset.damageFormula);
    setResistancesText(preset.rdSuggestion);
  };

  const toggleSecondaryElement = (el: string) => {
    if (el === element || el === 'Nenhum') return;
    setSecondaryElements((prev) =>
      prev.includes(el) ? prev.filter((item) => item !== el) : [...prev, el]
    );
  };

  const updateAttr = (key: keyof CharacterAttributes, delta: number) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(10, (prev[key] ?? 0) + delta)),
    }));
  };

  const handleAddAttack = () => {
    const cleanName = atkName.trim() || 'Ataque Corpo a Corpo';
    if (!atkDamageFormula.trim()) {
      showAlert('Fórmula Obrigatória', 'Informe a fórmula de dano do ataque (ex: 2d8+5).');
      return;
    }
    const extraParts = [
      atkRange.trim() ? `Alcance: ${atkRange.trim()}` : '',
      atkExtra.trim() ? atkExtra.trim() : '',
    ].filter(Boolean);
    const damageTypeFull = [atkDamageType.trim() || 'Corte', ...extraParts].join(' • ');
    const newAtk: ThreatAttackAction = {
      id: `tatk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      actionType: atkActionType,
      testFormula: atkTestFormula.trim() || '2d20+8',
      damageFormula: atkDamageFormula.trim(),
      damageType: damageTypeFull,
      critical: atkCritical.trim() || '20/x2',
    };
    setStructuredAttacks((prev) => [...prev, newAtk]);
    setAtkName('');
    setAtkExtra('');
  };

  const handleAddAbility = () => {
    const cleanName = abName.trim();
    if (!cleanName) {
      showAlert('Nome Obrigatório', 'Informe o nome da habilidade ou poder da ameaça.');
      return;
    }
    const descParts = [abDesc.trim() || 'Efeito especial da criatura.'];
    if (abDt.trim()) descParts.push(`(DT ${abDt.trim()})`);
    if (abFormula.trim()) descParts.push(`[${abFormula.trim()}]`);
    const newAb: ThreatAbilityEntry = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      actionType: abActionType,
      description: descParts.join(' '),
    };
    setStructuredAbilities((prev) => [...prev, newAb]);
    setAbName('');
    setAbDesc('');
    setAbFormula('');
    setAbDt('');
  };

  const handleConfirmSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showAlert('Nome Obrigatório', 'Informe o nome da ameaça.');
      return;
    }

    const vd = Math.max(1, parseInt(vdText, 10) || 20);
    const pvMax = Math.max(1, parseInt(pvMaxText, 10) || 40);
    const defense = Math.max(1, parseInt(defenseText, 10) || 15);
    const formatSave = (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return '+0';
      return trimmed.startsWith('+') || trimmed.startsWith('-') ? trimmed : `+${trimmed}`;
    };
    const saves = {
      fortitude: formatSave(fortitudeText),
      reflexos: formatSave(reflexosText),
      vontade: formatSave(vontadeText),
    };
    const sensesObj = {
      perception: formatSave(perceptionText),
      initiative: formatSave(initiativeText),
      ...(visionText.trim() ? { vision: visionText.trim() } : {}),
    };
    const attrsRecord: Record<string, string> = {
      AGI: String(attributes.AGI ?? 2),
      FOR: String(attributes.FOR ?? 2),
      INT: String(attributes.INT ?? 1),
      PRE: String(attributes.PRE ?? 2),
      VIG: String(attributes.VIG ?? 2),
    };

    const formattedAttacks = formatStructuredAttacksSummary(structuredAttacks, manualAttacksText);
    const formattedAbilities = formatStructuredAbilitiesSummary(structuredAbilities, {
      senses: sensesObj,
      displacement: displacement.trim(),
      saves,
      resistancesText: resistancesText.trim(),
      immunitiesText: immunitiesText.trim(),
      vulnerabilitiesText: vulnerabilitiesText.trim(),
      skillsText: skillsText.trim(),
      fearEnigma: fearEnigma.trim(),
      manualText: manualAbilitiesText,
    });

    const monster: CampaignMonster = {
      id: initialMonster?.id || `mon_${Date.now()}`,
      name: cleanName,
      compendiumEntityId: initialMonster?.compendiumEntityId || initialEntity?.id,
      vd,
      pvCurrent: initialMonster ? Math.min(initialMonster.pvCurrent, pvMax) : pvMax,
      pvMax,
      defense,
      element,
      secondaryElements: secondaryElements.length > 0 ? secondaryElements : undefined,
      size,
      creatureType,
      disturbingPresence: disturbingPresence.trim(),
      senses: sensesObj,
      displacement: displacement.trim() || undefined,
      attributes: attrsRecord,
      saves,
      resistancesText: resistancesText.trim() || undefined,
      immunitiesText: immunitiesText.trim() || undefined,
      vulnerabilitiesText: vulnerabilitiesText.trim() || undefined,
      skillsText: skillsText.trim() || undefined,
      fearEnigma: fearEnigma.trim() || undefined,
      structuredAttacks: structuredAttacks.length > 0 ? structuredAttacks : undefined,
      structuredAbilities: structuredAbilities.length > 0 ? structuredAbilities : undefined,
      attacks: formattedAttacks,
      abilities: formattedAbilities,
      notes: notes.trim(),
    };

    const abilityFormulas = structuredAbilities.flatMap((ab) => {
      const m = (ab.description || '').match(/\d+d\d+(?:\s*[+\-]\s*\d+)?/gi);
      return m ? m.map((s) => s.replace(/\s+/g, '')) : [];
    });
    const diceFormulas: string[] = Array.from(
      new Set([
        ...structuredAttacks.flatMap((a) => [a.testFormula, a.damageFormula].filter(Boolean)),
        ...abilityFormulas,
      ])
    );

    const compendiumEntity: Omit<CompendiumEntity, 'id'> = {
      name: cleanName,
      category: 'creature',
      subCategory: `${creatureType} • ${size}`,
      bookId: initialEntity?.bookId || 'custom',
      bookTitle: initialEntity?.bookTitle || 'Homebrew do Mestre (C.R.I.S.)',
      pageNumber: initialEntity?.pageNumber || 1,
      element,
      secondaryElements: monster.secondaryElements,
      size,
      creatureType,
      summary: `VD ${vd} • ${size} • Defesa ${defense} • PV ${pvMax}`,
      description: `${formattedAttacks ? `Ataques:\n${formattedAttacks}\n\n` : ''}${formattedAbilities}${notes.trim() ? `\n\nNotas: ${notes.trim()}` : ''}`.trim(),
      tags: ['Ameaça', creatureType, size, element, ...secondaryElements].filter(Boolean),
      vd,
      defense,
      pv: pvMax,
      disturbingPresence: disturbingPresence.trim() || undefined,
      senses: sensesObj,
      displacement: monster.displacement,
      attributes: attrsRecord,
      saves,
      resistancesText: monster.resistancesText,
      immunitiesText: monster.immunitiesText,
      vulnerabilitiesText: monster.vulnerabilitiesText,
      skillsText: monster.skillsText,
      fearEnigma: monster.fearEnigma,
      structuredAttacks: monster.structuredAttacks,
      structuredAbilities: monster.structuredAbilities,
      diceFormulas: diceFormulas.length > 0 ? diceFormulas : undefined,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    await onSave({
      monster,
      compendiumEntity,
      alsoSaveToCompendium: mode === 'compendium' ? true : alsoSaveToCompendium,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={Platform.OS === 'web'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container} testID="threat-creator-modal">
          {/* Header */}
          <View
            style={[
              styles.header,
              Platform.OS !== 'web' && {
                paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12),
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.iconBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Fechar"
              testID="btn-close-threat-creator"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {initialMonster || initialEntity
                  ? 'Editar Ameaça (C.R.I.S.)'
                  : 'Criador Completo de Ameaças'}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                VD {vdText || '20'} • PV {pvMaxText || '40'} • Def {defenseText || '15'} • {element}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleConfirmSave}
              style={styles.saveBtn}
              testID="btn-save-threat-creator"
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
          {/* Presets de VD & Auto-balanceamento */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Escala de VD & Auto-Balanceamento</Text>
              <TouchableOpacity
                style={styles.autoBalanceBtn}
                onPress={() => applyVdPreset(parseInt(vdText, 10) || 20)}
                testID="btn-threat-autobalance"
              >
                <Ionicons name="sparkles" size={14} color="#FFF" />
                <Text style={styles.autoBalanceBtnText}>Auto-Balancear VD</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {THREAT_VD_PRESETS.map((presetVd) => {
                const active = String(presetVd) === vdText.trim();
                return (
                  <TouchableOpacity
                    key={presetVd}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => applyVdPreset(presetVd)}
                    testID={`threat-vd-preset-${presetVd}`}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      VD {presetVd}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Identidade & Elementos */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>1. Identidade, Tamanho & Elementos</Text>

            <Text style={styles.fieldLabel}>Nome da Ameaça *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Aberração de Sangue, Cultista Veterano..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              testID="input-threat-name"
            />

            <View style={styles.row3}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>VD *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={vdText}
                  onChangeText={setVdText}
                  testID="input-threat-vd"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>PV Máx *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={pvMaxText}
                  onChangeText={setPvMaxText}
                  testID="input-threat-pv"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Defesa *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={defenseText}
                  onChangeText={setDefenseText}
                  testID="input-threat-defense"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Classificação / Tipo</Text>
            <View style={styles.wrapPills}>
              {THREAT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.pill, creatureType === t.value && styles.pillActive]}
                  onPress={() => setCreatureType(t.value)}
                >
                  <Text style={[styles.pillText, creatureType === t.value && styles.pillTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Tamanho</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {THREAT_SIZES.map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[styles.pill, size === sz && styles.pillActive]}
                  onPress={() => setSize(sz)}
                >
                  <Text style={[styles.pillText, size === sz && styles.pillTextActive]}>
                    {sz}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Elemento Principal</Text>
            <View style={styles.wrapPills}>
              {THREAT_ELEMENTS.map((el) => (
                <TouchableOpacity
                  key={el}
                  style={[styles.pill, element === el && styles.pillActive]}
                  onPress={() => {
                    setElement(el);
                    setSecondaryElements((prev) => prev.filter((item) => item !== el));
                  }}
                >
                  <Text style={[styles.pillText, element === el && styles.pillTextActive]}>
                    {el}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Elementos Complementares (Opcional)</Text>
            <View style={styles.wrapPills}>
              {THREAT_ELEMENTS.filter((el) => el !== 'Nenhum' && el !== element).map((el) => {
                const active = secondaryElements.includes(el);
                return (
                  <TouchableOpacity
                    key={el}
                    style={[styles.pill, active && styles.pillSecondaryActive]}
                    onPress={() => toggleSecondaryElement(el)}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{el}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Atributos & Testes de Resistência */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>2. Atributos, Sentidos & Resistências</Text>

            <View style={styles.attrsGrid}>
              {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => (
                <View key={attr} style={styles.attrStepperCard}>
                  <Text style={styles.attrLabel}>{attr}</Text>
                  <Text style={styles.attrVal}>{attributes[attr]}</Text>
                  <View style={styles.attrBtns}>
                    <TouchableOpacity onPress={() => updateAttr(attr, -1)} style={styles.attrBtn}>
                      <Ionicons name="remove" size={12} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateAttr(attr, 1)} style={styles.attrBtn}>
                      <Ionicons name="add" size={12} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.row3}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Fortitude (+)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={fortitudeText}
                  onChangeText={setFortitudeText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Reflexos (+)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={reflexosText}
                  onChangeText={setReflexosText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Vontade (+)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={vontadeText}
                  onChangeText={setVontadeText}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Presença Perturbadora</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: DT 18 • 3d6 mental • NEX 50%+ imune"
              placeholderTextColor={colors.textMuted}
              value={disturbingPresence}
              onChangeText={setDisturbingPresence}
            />

            <Text style={styles.fieldLabel}>Sentidos</Text>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Percepção</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+5"
                  placeholderTextColor={colors.textMuted}
                  value={perceptionText}
                  onChangeText={setPerceptionText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Iniciativa</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+5"
                  placeholderTextColor={colors.textMuted}
                  value={initiativeText}
                  onChangeText={setInitiativeText}
                />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Visão / Sentidos Extras</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Visão no escuro, Percepção às cegas"
              placeholderTextColor={colors.textMuted}
              value={visionText}
              onChangeText={setVisionText}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Deslocamento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="9m / 6q"
                  placeholderTextColor={colors.textMuted}
                  value={displacement}
                  onChangeText={setDisplacement}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Perícias Relevantes</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Atletismo +12, Furtividade +8"
                  placeholderTextColor={colors.textMuted}
                  value={skillsText}
                  onChangeText={setSkillsText}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Resistências a Dano (RD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Balístico, Corte e Perfuração 10; Sangue 10"
              placeholderTextColor={colors.textMuted}
              value={resistancesText}
              onChangeText={setResistancesText}
            />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Imunidades</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Condições mentais, Morte"
                  placeholderTextColor={colors.textMuted}
                  value={immunitiesText}
                  onChangeText={setImmunitiesText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Vulnerabilidades</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Conhecimento"
                  placeholderTextColor={colors.textMuted}
                  value={vulnerabilitiesText}
                  onChangeText={setVulnerabilitiesText}
                />
              </View>
            </View>
          </View>

          {/* Construtor de Ataques Estruturados */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>3. Ataques & Ações Ofensivas</Text>

            {structuredAttacks.map((atk) => (
              <View key={atk.id} style={styles.addedEntryCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addedEntryTitle}>
                    [{atk.actionType}] {atk.name}
                  </Text>
                  <Text style={styles.addedEntryMeta}>
                    Teste: {atk.testFormula} • Dano: {atk.damageFormula} {atk.damageType} ({atk.critical})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setStructuredAttacks((prev) => prev.filter((item) => item.id !== atk.id))
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID={`btn-remove-threat-attack-${atk.id}`}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.builderBox}>
              <Text style={styles.fieldLabel}>Nome do Ataque</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Garras Dilacerantes, Disparo..."
                placeholderTextColor={colors.textMuted}
                value={atkName}
                onChangeText={setAtkName}
                testID="input-threat-attack-name"
              />
              <Text style={styles.fieldLabel}>Ação do Ataque</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                {ATTACK_ACTION_TYPES.map((tp) => (
                  <TouchableOpacity
                    key={tp}
                    style={[styles.pill, atkActionType === tp && styles.pillActive]}
                    onPress={() => setAtkActionType(tp)}
                  >
                    <Text style={[styles.pillText, atkActionType === tp && styles.pillTextActive]}>
                      {tp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.row3}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Teste</Text>
                  <TextInput
                    style={styles.input}
                    value={atkTestFormula}
                    onChangeText={setAtkTestFormula}
                    placeholder="3d20+15"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Dano</Text>
                  <TextInput
                    style={styles.input}
                    value={atkDamageFormula}
                    onChangeText={setAtkDamageFormula}
                    placeholder="2d10+8"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Crítico</Text>
                  <TextInput
                    style={styles.input}
                    value={atkCritical}
                    onChangeText={setAtkCritical}
                    placeholder="19/x2"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Tipo de Dano</Text>
                  <TextInput
                    style={styles.input}
                    value={atkDamageType}
                    onChangeText={setAtkDamageType}
                    placeholder="Corte / Sangue..."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Alcance</Text>
                  <TextInput
                    style={styles.input}
                    value={atkRange}
                    onChangeText={setAtkRange}
                    placeholder="Adjacente / Médio"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Efeito Adicional (Opcional)</Text>
              <TextInput
                style={styles.input}
                value={atkExtra}
                onChangeText={setAtkExtra}
                placeholder="Ex: Agarrou (Fortitude DT 18 evita), Sangramento..."
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={styles.addEntryBtn}
                onPress={handleAddAttack}
                testID="btn-add-threat-attack"
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                <Text style={styles.addEntryBtnText}>Adicionar Ataque à Ameaça</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
              Anotações Livres de Ataques (Complemento)
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={manualAttacksText}
              onChangeText={setManualAttacksText}
              placeholder="Texto livre adicional de ações ofensivas..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Construtor de Habilidades & Enigma de Medo */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>4. Habilidades, Poderes & Enigma de Medo</Text>

            {structuredAbilities.map((ab) => (
              <View key={ab.id} style={styles.addedEntryCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addedEntryTitle}>
                    [{ab.actionType}] {ab.name}
                  </Text>
                  <Text style={styles.addedEntryDesc}>{ab.description}</Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setStructuredAbilities((prev) => prev.filter((item) => item.id !== ab.id))
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.builderBox}>
              <Text style={styles.fieldLabel}>Nome da Habilidade / Poder</Text>
              <TextInput
                style={styles.input}
                value={abName}
                onChangeText={setAbName}
                placeholder="Ex: Frenesi de Sangue, Sopro Entrópico..."
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Tipo de Ação</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                {ABILITY_ACTION_TYPES.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[styles.pill, abActionType === act && styles.pillActive]}
                    onPress={() => setAbActionType(act)}
                  >
                    <Text style={[styles.pillText, abActionType === act && styles.pillTextActive]}>
                      {act}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Fórmula (Opc.)</Text>
                  <TextInput
                    style={styles.input}
                    value={abFormula}
                    onChangeText={setAbFormula}
                    placeholder="Ex: 4d6 ou 3d8+5"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>DT / Teste (Opc.)</Text>
                  <TextInput
                    style={styles.input}
                    value={abDt}
                    onChangeText={setAbDt}
                    placeholder="Ex: 20 Reflexos"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Descrição do Efeito</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                multiline
                value={abDesc}
                onChangeText={setAbDesc}
                placeholder="Descreva regras, custos e condições aplicadas..."
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={styles.addEntryBtn}
                onPress={handleAddAbility}
                testID="btn-add-threat-ability"
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                <Text style={styles.addEntryBtnText}>Adicionar Habilidade</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
              Enigma de Medo (Opcional / Criaturas de Medo)
            </Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={fearEnigma}
              onChangeText={setFearEnigma}
              placeholder="Condição para anular imunidade a dano ou resolver o Enigma..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Habilidades / Descrição Complementar</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={manualAbilitiesText}
              onChangeText={setManualAbilitiesText}
              placeholder="Detalhes narrativos ou habilidades extras..."
              placeholderTextColor={colors.textMuted}
            />

            {mode === 'campaign' ? (
              <>
                <Text style={styles.fieldLabel}>Notas do Mestre (Privadas)</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Comportamento tático, tesouro ou ganchos da cena..."
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity
                  style={styles.compendiumToggleRow}
                  onPress={() => setAlsoSaveToCompendium((prev) => !prev)}
                  testID="toggle-threat-save-compendium"
                >
                  <Ionicons
                    name={alsoSaveToCompendium ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={alsoSaveToCompendium ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.compendiumToggleText}>
                    Salvar também no Compêndio Geral para reutilizar em outras campanhas
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
            </ScrollView>
            <View
              style={[
                styles.footer,
                { paddingBottom: Platform.OS === 'web' ? 12 : Math.max(12, insets.bottom) },
              ]}
            >
              <TouchableOpacity style={styles.footerCancelBtn} onPress={onClose}>
                <Text style={styles.footerCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerSaveBtn} onPress={handleConfirmSave}>
                <Ionicons name="checkmark-sharp" size={16} color="#FFF" />
                <Text style={styles.footerSaveText}>Salvar Ameaça</Text>
              </TouchableOpacity>
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
      backgroundColor: Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.72)' : colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Platform.OS === 'web' ? 20 : 0,
    },
    container: {
      width: '100%',
      maxWidth: Platform.OS === 'web' ? 640 : undefined,
      maxHeight: Platform.OS === 'web' ? '92%' : '100%',
      flex: Platform.OS === 'web' ? undefined : 1,
      borderRadius: Platform.OS === 'web' ? 14 : 0,
      overflow: 'hidden',
      borderWidth: Platform.OS === 'web' ? 1 : 0,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    footerCancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    footerCancelText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    footerSaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    footerSaveText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    headerSub: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 1,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    saveBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    scrollContent: {
      padding: 14,
      gap: 14,
      paddingBottom: 40,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    autoBalanceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#7C3AED',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    autoBalanceBtnText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '800',
    },
    pillsRow: {
      gap: 6,
      paddingVertical: 4,
    },
    wrapPills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    pillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    pillSecondaryActive: {
      borderColor: '#A855F7',
      backgroundColor: 'rgba(168, 85, 247, 0.16)',
    },
    pillText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    pillTextActive: {
      color: colors.text,
      fontWeight: '800',
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 2,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 13,
    },
    multilineInput: {
      minHeight: 62,
      textAlignVertical: 'top',
    },
    row2: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    row3: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
    },
    attrsGrid: {
      flexDirection: 'row',
      gap: 4,
      flexWrap: 'wrap',
    },
    attrStepperCard: {
      flex: 1,
      minWidth: 52,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 4,
      alignItems: 'center',
      gap: 3,
    },
    attrLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '800',
    },
    attrVal: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    attrBtns: {
      flexDirection: 'row',
      gap: 4,
    },
    attrBtn: {
      padding: 3,
      borderRadius: 5,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    builderBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 6,
    },
    addEntryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#2563EB',
      borderRadius: 8,
      paddingVertical: 9,
      marginTop: 4,
    },
    addEntryBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    addedEntryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
    },
    addedEntryTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    addedEntryMeta: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
    },
    addedEntryDesc: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    compendiumToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    compendiumToggleText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
  });

export default ThreatCreatorModal;
