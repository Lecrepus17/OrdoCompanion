import compendiumSeedRaw from '../data/seed/compendium_seed.json';
import {
  AgentDamageProfile,
  CharacterAttack,
  CharacterSheet,
  CompendiumEntity,
  CustomWeapon,
  DynamicDamageComponent,
  ParanormalElement,
  ResolvedAttackDamage,
  ResolvedRitualDamage,
  SituationalDamageToggles,
  WeaponType,
} from '../types/compendium';
import { getPeRoundLimit } from './progression';
import { parseCritical } from './weapons';

const SEED_ENTITY_MAP = new Map<string, CompendiumEntity>(
  ((compendiumSeedRaw as { entities?: CompendiumEntity[] }).entities || []).map((e) => [e.id, e])
);

function normalizeStr(s?: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
}

const AGILE_WEAPON_KEYWORDS = [
  'faca',
  'punhal',
  'cajado',
  'nunchaku',
  'florete',
  'katana',
  'adaga',
  'espada curta',
  'manopla',
  'soqueira',
  'baioneta',
  'shuriken',
  'bastao policial',
  'garra do harpia',
];

const LIGHT_MELEE_KEYWORDS = [
  'faca',
  'punhal',
  'nunchaku',
  'machadinha',
  'adaga',
  'soqueira',
  'manopla',
  'baioneta',
  'gancho de carne',
  'coronhada',
  'martelo',
  'desarmado',
  'soco',
];

const THROWN_WEAPON_KEYWORDS = [
  'arremesso',
  'azagaia',
  'shuriken',
  'faca tatica',
  'punhal x',
  'faca predadora',
  'primeira adaga',
];

const LONG_BULLET_FIREARM_KEYWORDS = [
  'fuzil',
  'metralhadora',
  'sniper',
  'balas longas',
];

/**
 * Calcula o bônus numérico de Ataque Especial do Combatente com base no PE gasto.
 */
export function getAtaqueEspecialBonus(peSpent: number): number {
  if (peSpent >= 5) return 20;
  if (peSpent === 4) return 15;
  if (peSpent === 3) return 10;
  if (peSpent === 2) return 5;
  return 0;
}

/**
 * Inspeciona a ficha do agente (classe, trilha, origem, poderes, habilidades, inventário e atributos)
 * e retorna o perfil consolidado de modificadores de dano.
 */
export function detectAgentDamageModifiers(
  character: CharacterSheet,
  getEntityById?: (id: string) => CompendiumEntity | undefined
): AgentDamageProfile {
  const resolveEntity = (id: string): CompendiumEntity | undefined =>
    getEntityById ? getEntityById(id) : SEED_ENTITY_MAP.get(id);

  const attrs = character.attributes || { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 };
  const nex = character.nex ?? 5;

  const classEnt = character.classId ? resolveEntity(character.classId) : undefined;
  const originEnt = character.originId ? resolveEntity(character.originId) : undefined;
  const trackEnt = character.trackId ? resolveEntity(character.trackId) : undefined;

  const classStr = `${normalizeStr(character.classId)} ${normalizeStr(classEnt?.name)}`;
  const originStr = `${normalizeStr(character.originId)} ${normalizeStr(originEnt?.name)}`;
  const trackStr = `${normalizeStr(character.trackId)} ${normalizeStr(trackEnt?.name)}`;

  let hasGolpePesado = false;
  let hasTiroCerteiro = false;
  let hasArtistaMarcial = false;
  let hasMilitarParaBellum = originStr.includes('militar') || originStr.includes('para bellum');
  let hasLutadorMaoPesada = originStr.includes('lutador') || originStr.includes('mao pesada');
  let operarioWeaponName: string | undefined = (
    character as unknown as { operarioWeaponName?: string }
  ).operarioWeaponName;
  let hasNinjaUrbano = false;
  let hasBalisticaAvancada = false;
  let hasMiraDeElite =
    trackStr.includes('atirador de elite') && nex >= 10;
  let hasAniquiladorMaquinaDeMatar =
    trackStr.includes('aniquilador') && nex >= 99;
  let hasAniquiladorDestruidor =
    trackStr.includes('aniquilador') && nex >= 40;
  let hasGuerreiroPotenciaMaxima =
    trackStr.includes('guerreiro') && nex >= 99;
  let hasPunhosEnraivecidos = false;
  let hasInfiltrador = trackStr.includes('infiltrador') && nex >= 10;
  let hasInfiltradorAssassinar = trackStr.includes('infiltrador') && nex >= 65;
  let hasRitualPotente = false;
  let hasRitualIntenso = false;
  let hasCajadoCruzSangue = false;
  let hasCatalisadorPotencializador = false;
  let hasCatalisadorPerturbador = false;
  let hasParareligiosidade = trackStr.includes('exorcista') && nex >= 65;

  let hasAtaqueEspecial = classStr.includes('combatente');

  const scanText = (rawName: string, rawDesc: string = '') => {
    const n = normalizeStr(rawName);
    const d = normalizeStr(rawDesc);

    if (n.includes('golpe pesado')) hasGolpePesado = true;
    if (n.includes('tiro certeiro')) hasTiroCerteiro = true;
    if (n.includes('artista marcial')) hasArtistaMarcial = true;
    if (n.includes('para bellum') || n.includes('militar')) hasMilitarParaBellum = true;
    if (n.includes('mao pesada')) hasLutadorMaoPesada = true;
    if (n.includes('ninja urbano')) hasNinjaUrbano = true;
    if (n.includes('balistica avancada')) hasBalisticaAvancada = true;
    if (n.includes('mira de elite')) hasMiraDeElite = true;
    if (n.includes('maquina de matar')) hasAniquiladorMaquinaDeMatar = true;
    if (n.includes('destruidor') && (n.includes('aniquilador') || d.includes('multiplicador'))) {
      hasAniquiladorDestruidor = true;
    }
    if (n.includes('potencia maxima')) hasGuerreiroPotenciaMaxima = true;
    if (n.includes('punhos enraivecidos')) hasPunhosEnraivecidos = true;
    if (n.includes('ataque especial')) hasAtaqueEspecial = true;
    if (n.includes('ataque furtivo')) hasInfiltrador = true;
    if (n.includes('assassinar')) hasInfiltradorAssassinar = true;
    if (n.includes('ritual potente')) hasRitualPotente = true;
    if (n.includes('ritual intenso')) hasRitualIntenso = true;
    if (n.includes('cajado da cruz de sangue')) hasCajadoCruzSangue = true;
    if (n.includes('catalisador potencializador')) hasCatalisadorPotencializador = true;
    if (n.includes('catalisador perturbador')) hasCatalisadorPerturbador = true;
    if (n.includes('parareligiosidade')) hasParareligiosidade = true;

    if (!operarioWeaponName && (n.includes('ferramenta de trabalho') || n.includes('operario'))) {
      const match = rawDesc.match(/arma escolhida:\s*([^.\n]+)/i);
      if (match && match[1]) {
        operarioWeaponName = match[1].trim();
      }
    }
  };

  if (Array.isArray(character.abilities)) {
    for (const ab of character.abilities) {
      scanText(ab.name || '', ab.description || '');
    }
  }

  if (Array.isArray(character.entityIds)) {
    for (const eid of character.entityIds) {
      const ent = resolveEntity(eid);
      scanText(ent?.name || eid, ent?.description || ent?.powerDescription || '');
    }
  }

  if (Array.isArray(character.inventory)) {
    for (const item of character.inventory) {
      if (item.equipped === false) continue;
      scanText(item.name || '', item.details || '');
    }
  }

  if (character.notes && !operarioWeaponName) {
    const noteMatch = character.notes.match(/ferramenta de trabalho\s*[:\-]\s*([^\n.,;]+)/i);
    if (noteMatch && noteMatch[1]) {
      operarioWeaponName = noteMatch[1].trim();
    }
  }

  // Escala de Artista Marcial por NEX
  let artistaMarcialDice = '1d6';
  if (nex >= 70) artistaMarcialDice = '1d10';
  else if (nex >= 35) artistaMarcialDice = '1d8';

  // Escala de Ataque Especial por NEX
  let ataqueEspecialMaxPe = 0;
  if (hasAtaqueEspecial) {
    if (nex >= 85) ataqueEspecialMaxPe = 5;
    else if (nex >= 55) ataqueEspecialMaxPe = 4;
    else if (nex >= 25) ataqueEspecialMaxPe = 3;
    else if (nex >= 5) ataqueEspecialMaxPe = 2;
  }

  // Escala de Ataque Furtivo por NEX (Infiltrador)
  let ataqueFurtivoDice: string | undefined = undefined;
  if (hasInfiltrador) {
    if (nex >= 99) ataqueFurtivoDice = '4d6';
    else if (nex >= 65) ataqueFurtivoDice = '3d6';
    else if (nex >= 40) ataqueFurtivoDice = '2d6';
    else ataqueFurtivoDice = '1d6';
  }

  const maskCfg = character.maskConfig;
  const hasActiveSupremeMask = Boolean(maskCfg?.enabled && maskCfg?.isActive);
  const maskBonusTests =
    hasActiveSupremeMask && maskCfg?.grantBonusTests !== false ? 5 : 0;
  const maskBonusDt =
    hasActiveSupremeMask && maskCfg?.grantBonusDt !== false ? 5 : 0;
  const maskExtraDamageDice =
    hasActiveSupremeMask && maskCfg?.grantBonusDiceDamage !== false ? 2 : 0;

  return {
    forValue: attrs.FOR ?? 1,
    agiValue: attrs.AGI ?? 1,
    intValue: attrs.INT ?? 1,
    preValue: attrs.PRE ?? 1,
    vigValue: attrs.VIG ?? 1,

    hasGolpePesado,
    hasTiroCerteiro,
    hasArtistaMarcial,
    artistaMarcialDice,
    hasMilitarParaBellum,
    hasLutadorMaoPesada,
    operarioWeaponName,
    hasNinjaUrbano,
    hasBalisticaAvancada,
    hasMiraDeElite,
    hasAniquiladorMaquinaDeMatar,
    hasGuerreiroPotenciaMaxima,
    hasPunhosEnraivecidos,

    ataqueEspecialMaxPe,
    ataqueFurtivoDice,
    hasInfiltradorAssassinar,
    hasAniquiladorDestruidor,

    hasRitualPotente,
    hasRitualIntenso,
    hasCajadoCruzSangue,
    hasCatalisadorPotencializador,
    hasCatalisadorPerturbador,
    hasParareligiosidade,

    hasActiveSupremeMask,
    maskBonusTests,
    maskBonusDt,
    maskExtraDamageDice,
  };
}

interface ParsedDiceParts {
  primaryCount: number;
  primaryFaces: number;
  hasPrimaryDice: boolean;
  extraDice: Array<{ count: number; faces: number; tag?: string; element?: ParanormalElement }>;
  flatBonus: number;
}

function parseDamageParts(expr: string): ParsedDiceParts {
  const result: ParsedDiceParts = {
    primaryCount: 0,
    primaryFaces: 0,
    hasPrimaryDice: false,
    extraDice: [],
    flatBonus: 0,
  };
  if (!expr) return result;

  // Considerar apenas a fórmula primária caso haja alternativa com "/" (ex: "1d8/1d10")
  const primarySegment = expr.split('/')[0].trim();

  // Regex linear seguro para Hermes (sem lookbehinds)
  const diceRegex = /([+\-]?)\s*(\d*)d(\d+)(?:\s+(Sangue|Morte|Conhecimento|Energia|Medo|Fogo|Impacto|Corte|Perfuração|Perfuracao))?/gi;
  const consumedRanges: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  let isFirst = true;

  while ((match = diceRegex.exec(primarySegment)) !== null) {
    consumedRanges.push({ start: match.index, end: match.index + match[0].length });
    const sign = match[1] === '-' ? -1 : 1;
    const count = (match[2] ? parseInt(match[2], 10) : 1) * sign;
    const faces = parseInt(match[3], 10);
    const elementTag = match[4] as ParanormalElement | undefined;

    if (isFirst) {
      result.primaryCount = Math.max(1, count);
      result.primaryFaces = Math.max(2, faces);
      result.hasPrimaryDice = true;
      isFirst = false;
    } else {
      result.extraDice.push({
        count,
        faces,
        tag: elementTag || undefined,
        element: elementTag,
      });
    }
  }

  // Extrair constantes numéricas fora das expressões de dados (sem lookahead negativo complexo no Hermes)
  let remaining = '';
  let cursor = 0;
  for (const range of consumedRanges) {
    remaining += primarySegment.slice(cursor, range.start) + ' ';
    cursor = range.end;
  }
  remaining += primarySegment.slice(cursor);

  const flatRegex = /([+\-]?)\s*(\d+)/g;
  while ((match = flatRegex.exec(remaining)) !== null) {
    const sign = match[1] === '-' ? -1 : 1;
    const val = parseInt(match[2], 10) || 0;
    result.flatBonus += sign * val;
  }

  return result;
}

interface WeaponClassification {
  weaponType: WeaponType;
  isUnarmed: boolean;
  isThrown: boolean;
  isAgile: boolean;
  isLightMelee: boolean;
  isArcoComposto: boolean;
  usesLongBullets: boolean;
}

function classifyAttackWeapon(
  attack: CharacterAttack,
  customWeapon?: CustomWeapon
): WeaponClassification {
  const nameNorm = normalizeStr(attack.name);
  const baseNameNorm = normalizeStr(customWeapon?.baseWeaponName);
  const combinedName = `${nameNorm} ${baseNameNorm}`;
  const specialNorm = normalizeStr(attack.special);
  const rangeNorm = normalizeStr(customWeapon?.finalRange || attack.range);
  const ammoNorm = normalizeStr(customWeapon?.ammoType);

  const isUnarmed =
    combinedName.includes('desarmad') ||
    combinedName.includes('soco') ||
    combinedName.includes('chute') ||
    combinedName.includes('manopla');

  const isThrown =
    THROWN_WEAPON_KEYWORDS.some((kw) => combinedName.includes(kw)) ||
    specialNorm.includes('arremesso') ||
    ((combinedName.includes('lanca') || combinedName.includes('faca') || combinedName.includes('machadinha') || combinedName.includes('punhal') || combinedName.includes('adaga')) &&
      rangeNorm.includes('curto') &&
      !combinedName.includes('fuzil') &&
      !combinedName.includes('pistola') &&
      !combinedName.includes('revolver'));

  let weaponType: WeaponType = 'Corpo a corpo';
  if (customWeapon?.weaponType) {
    weaponType = customWeapon.weaponType;
  } else if (
    combinedName.includes('pistola') ||
    combinedName.includes('revolver') ||
    combinedName.includes('fuzil') ||
    combinedName.includes('espingarda') ||
    combinedName.includes('submetralhadora') ||
    combinedName.includes('metralhadora') ||
    combinedName.includes('bazuca') ||
    combinedName.includes('chamas') ||
    combinedName.includes('sniper') ||
    combinedName.includes('arcabuz') ||
    specialNorm.includes('balistico') ||
    specialNorm.includes('arma de fogo') ||
    specialNorm.includes('balas curtas') ||
    specialNorm.includes('balas longas') ||
    specialNorm.includes('cartuchos')
  ) {
    weaponType = 'Fogo';
  } else if (
    combinedName.includes('arco') ||
    combinedName.includes('besta') ||
    combinedName.includes('balestra') ||
    combinedName.includes('estilingue') ||
    combinedName.includes('pregador') ||
    specialNorm.includes('disparo') ||
    specialNorm.includes('flechas')
  ) {
    weaponType = 'Disparo';
  } else if (
    rangeNorm &&
    !rangeNorm.includes('corpo') &&
    rangeNorm !== '—' &&
    rangeNorm !== '-' &&
    !isThrown &&
    attack.skillName === 'Pontaria'
  ) {
    weaponType = 'Fogo';
  }

  const isArcoComposto = combinedName.includes('arco composto');

  const isAgile =
    weaponType === 'Corpo a corpo' &&
    (AGILE_WEAPON_KEYWORDS.some((kw) => combinedName.includes(kw)) ||
      specialNorm.includes('arma agil') ||
      specialNorm.includes('agil'));

  const isLightMelee =
    weaponType === 'Corpo a corpo' &&
    (customWeapon?.handedness === 'Leve' ||
      LIGHT_MELEE_KEYWORDS.some((kw) => combinedName.includes(kw)) ||
      specialNorm.includes('leve'));

  const usesLongBullets =
    weaponType === 'Fogo' &&
    (ammoNorm.includes('balas longas') ||
      specialNorm.includes('balas longas') ||
      LONG_BULLET_FIREARM_KEYWORDS.some((kw) => combinedName.includes(kw)));

  return {
    weaponType,
    isUnarmed,
    isThrown,
    isAgile,
    isLightMelee,
    isArcoComposto,
    usesLongBullets,
  };
}

/**
 * Formata uma lista de componentes atômicos em uma descrição textual legível.
 */
export function formatDamageBreakdown(breakdown: DynamicDamageComponent[]): string {
  if (!breakdown || breakdown.length === 0) return '';
  return breakdown.map((c) => `${c.source}: ${c.expression}`).join(' • ');
}

/**
 * Resolve dinamicamente todas as fórmulas, componentes, bônus de atributos, poderes,
 * buffs situacionais, custos de PE e acerto crítico de um ataque para um agente específico,
 * sem alterar a CustomWeapon compartilhada na Armaria.
 */
export function resolveAgentAttackDamage(options: {
  attack: CharacterAttack;
  character: CharacterSheet;
  customWeapon?: CustomWeapon;
  toggles?: SituationalDamageToggles;
  profile?: AgentDamageProfile;
  getEntityById?: (id: string) => CompendiumEntity | undefined;
}): ResolvedAttackDamage {
  const { attack, character, customWeapon, toggles = {}, getEntityById } = options;
  const profile = options.profile || detectAgentDamageModifiers(character, getEntityById);
  const cls = classifyAttackWeapon(attack, customWeapon);

  const breakdown: DynamicDamageComponent[] = [];
  const rawWeaponExpr = customWeapon
    ? customWeapon.baseDamage || attack.damage || '1d6'
    : attack.damage || '1d6';
  const parsed = parseDamageParts(rawWeaponExpr);

  // Passo 1: Base da Arma
  let baseCount = parsed.primaryCount || 1;
  let baseFaces = parsed.primaryFaces || 6;

  if (cls.isUnarmed && profile.hasArtistaMarcial) {
    const amMatch = profile.artistaMarcialDice.match(/(\d+)d(\d+)/i);
    if (amMatch) {
      const amCount = parseInt(amMatch[1], 10);
      const amFaces = parseInt(amMatch[2], 10);
      if (amCount * amFaces > baseCount * baseFaces || !parsed.hasPrimaryDice) {
        baseCount = amCount;
        baseFaces = amFaces;
      }
    }
  }

  const baseDiceStr = parsed.hasPrimaryDice || cls.isUnarmed
    ? `${baseCount}d${baseFaces}`
    : rawWeaponExpr;

  if (parsed.hasPrimaryDice || cls.isUnarmed) {
    breakdown.push({
      source: cls.isUnarmed && profile.hasArtistaMarcial ? 'Artista Marcial (Base)' : 'Base da Arma',
      type: 'base_dice',
      expression: baseDiceStr,
      multipliesOnCrit: true,
    });
  }

  // Passo 2: Passos e dados adicionais que integram a base da arma (multiplicam no crítico)
  let totalMultiplicativeBaseCount = baseCount;
  const modsList = (customWeapon?.modifications || []).map((m) => normalizeStr(m));
  const specialNorm = normalizeStr(attack.special);

  const hasCalibreGrosso = modsList.some((m) => m.includes('calibre grosso'));
  if (hasCalibreGrosso && cls.weaponType === 'Fogo') {
    totalMultiplicativeBaseCount += 1;
    breakdown.push({
      source: 'Calibre Grosso',
      type: 'base_dice',
      expression: `+1d${baseFaces}`,
      multipliesOnCrit: true,
    });
  }

  const isMeleeAttack = cls.weaponType === 'Corpo a corpo' && !cls.isUnarmed;
  if (isMeleeAttack && profile.hasGolpePesado) {
    totalMultiplicativeBaseCount += 1;
    breakdown.push({
      source: 'Golpe Pesado',
      type: 'base_dice',
      expression: `+1d${baseFaces}`,
      multipliesOnCrit: true,
    });
  }

  if (profile.hasAniquiladorMaquinaDeMatar) {
    totalMultiplicativeBaseCount += 1;
    breakdown.push({
      source: 'Máquina de Matar',
      type: 'base_dice',
      expression: `+1d${baseFaces}`,
      multipliesOnCrit: true,
    });
  }

  if (toggles.rajadaActive) {
    totalMultiplicativeBaseCount += 1;
    breakdown.push({
      source: 'Rajada',
      type: 'base_dice',
      expression: `+1d${baseFaces}`,
      multipliesOnCrit: true,
    });
  }

  // Passo 3: Maldições e munições presentes na própria arma
  const extraDiceGroups: Array<{
    count: number;
    faces: number;
    tag?: string;
    multipliesOnCrit: boolean;
  }> = [];

  const hasLancinanteMod =
    modsList.some((m) => m.includes('lancinante')) ||
    (!customWeapon && specialNorm.includes('lancinante'));

  // Dados secundários já presentes em baseDamage (ex: "1d8 + 1d8 Sangue" do Machado do Mutilador)
  // ou em attack.damage quando sem customWeapon
  let lancinanteHandled = false;
  for (const ex of parsed.extraDice) {
    if (
      !customWeapon &&
      hasLancinanteMod &&
      !lancinanteHandled &&
      ex.count === 1 &&
      ex.faces === 8
    ) {
      lancinanteHandled = true;
      extraDiceGroups.push({
        count: 1,
        faces: 8,
        tag: 'Sangue',
        multipliesOnCrit: true,
      });
      breakdown.push({
        source: 'Lancinante',
        type: 'base_dice',
        expression: '+1d8 Sangue',
        multipliesOnCrit: true,
        element: 'Sangue',
      });
    } else {
      extraDiceGroups.push({
        count: ex.count,
        faces: ex.faces,
        tag: ex.tag,
        multipliesOnCrit: false,
      });
      breakdown.push({
        source: ex.tag ? `Dano Extra (${ex.tag})` : 'Dano Extra da Arma',
        type: 'extra_dice',
        expression: `+${ex.count}d${ex.faces}${ex.tag ? ` ${ex.tag}` : ''}`,
        multipliesOnCrit: false,
        element: ex.element,
      });
    }
  }

  if (hasLancinanteMod && !lancinanteHandled) {
    lancinanteHandled = true;
    extraDiceGroups.push({
      count: 1,
      faces: 8,
      tag: 'Sangue',
      multipliesOnCrit: true,
    });
    breakdown.push({
      source: 'Lancinante',
      type: 'base_dice',
      expression: '+1d8 Sangue',
      multipliesOnCrit: true,
      element: 'Sangue',
    });
  }

  if (customWeapon) {
    if (modsList.some((m) => m.includes('hemofagica'))) {
      extraDiceGroups.push({ count: 1, faces: 6, tag: 'Sangue', multipliesOnCrit: false });
      breakdown.push({
        source: 'Hemofágica',
        type: 'extra_dice',
        expression: '+1d6 Sangue',
        multipliesOnCrit: false,
        element: 'Sangue',
      });
    }
    if (modsList.some((m) => m.includes('consumidora'))) {
      extraDiceGroups.push({ count: 1, faces: 6, tag: 'Morte', multipliesOnCrit: false });
      breakdown.push({
        source: 'Consumidora',
        type: 'extra_dice',
        expression: '+1d6 Morte',
        multipliesOnCrit: false,
        element: 'Morte',
      });
    }
    if (modsList.some((m) => m.includes('erosiva'))) {
      extraDiceGroups.push({ count: 1, faces: 8, tag: 'Morte', multipliesOnCrit: false });
      breakdown.push({
        source: 'Erosiva',
        type: 'extra_dice',
        expression: '+1d8 Morte',
        multipliesOnCrit: false,
        element: 'Morte',
      });
    }
    if (modsList.some((m) => m.includes('faisca'))) {
      extraDiceGroups.push({ count: 1, faces: 6, tag: 'Energia', multipliesOnCrit: false });
      breakdown.push({
        source: 'Faísca',
        type: 'extra_dice',
        expression: '+1d6 Energia',
        multipliesOnCrit: false,
        element: 'Energia',
      });
    }
    if (modsList.some((m) => m.includes('explosiva'))) {
      extraDiceGroups.push({ count: 2, faces: 6, multipliesOnCrit: false });
      breakdown.push({
        source: 'Munição Explosiva',
        type: 'extra_dice',
        expression: '+2d6',
        multipliesOnCrit: false,
      });
    }
  }

  // Acessório Punhos Enraivecidos em ataque desarmado
  if (cls.isUnarmed && profile.hasPunhosEnraivecidos && !normalizeStr(attack.name).includes('punhos enraivecidos')) {
    extraDiceGroups.push({ count: 1, faces: 8, tag: 'Sangue', multipliesOnCrit: false });
    breakdown.push({
      source: 'Punhos Enraivecidos',
      type: 'extra_dice',
      expression: '+1d8 Sangue',
      multipliesOnCrit: false,
      element: 'Sangue',
    });
  }

  // Passo 4: Bônus Numéricos Fixos da Arma
  let totalFlatBonus = 0;

  if (parsed.flatBonus !== 0) {
    totalFlatBonus += parsed.flatBonus;
    breakdown.push({
      source: 'Bônus Base da Arma',
      type: 'flat_bonus',
      expression: parsed.flatBonus >= 0 ? `+${parsed.flatBonus}` : `${parsed.flatBonus}`,
      numericValue: parsed.flatBonus,
      multipliesOnCrit: false,
    });
  }

  if (customWeapon) {
    const hasCruelMod = modsList.some((m) => m.includes('cruel'));
    if (hasCruelMod) {
      totalFlatBonus += 2;
      breakdown.push({
        source: 'Modificação Cruel',
        type: 'flat_bonus',
        expression: '+2',
        numericValue: 2,
        multipliesOnCrit: false,
      });
    } else if (customWeapon.damageBonus && customWeapon.damageBonus !== parsed.flatBonus) {
      totalFlatBonus += customWeapon.damageBonus;
      breakdown.push({
        source: 'Modificações da Arma',
        type: 'flat_bonus',
        expression: `+${customWeapon.damageBonus}`,
        numericValue: customWeapon.damageBonus,
        multipliesOnCrit: false,
      });
    }
  }

  // Passo 5: Resolução de Atributo do Agente (NUNCA multiplica no crítico)
  let attributeApplied: 'FOR' | 'AGI' | 'INT' | undefined = undefined;
  const effectiveAgile = cls.isAgile || (cls.isUnarmed && profile.hasArtistaMarcial);

  if (cls.weaponType === 'Corpo a corpo' || cls.isThrown || cls.isUnarmed) {
    if (effectiveAgile && profile.agiValue > profile.forValue) {
      attributeApplied = 'AGI';
      if (profile.agiValue !== 0) {
        totalFlatBonus += profile.agiValue;
        breakdown.push({
          source: 'Agilidade',
          type: 'flat_bonus',
          expression: `+${profile.agiValue}`,
          numericValue: profile.agiValue,
          multipliesOnCrit: false,
        });
      }
    } else {
      attributeApplied = 'FOR';
      if (profile.forValue !== 0) {
        totalFlatBonus += profile.forValue;
        breakdown.push({
          source: 'Força',
          type: 'flat_bonus',
          expression: profile.forValue >= 0 ? `+${profile.forValue}` : `${profile.forValue}`,
          numericValue: profile.forValue,
          multipliesOnCrit: false,
        });
      }
    }
  } else if (cls.weaponType === 'Disparo') {
    if (cls.isArcoComposto && profile.forValue !== 0) {
      attributeApplied = 'FOR';
      totalFlatBonus += profile.forValue;
      breakdown.push({
        source: 'Força (Arco Composto)',
        type: 'flat_bonus',
        expression: `+${profile.forValue}`,
        numericValue: profile.forValue,
        multipliesOnCrit: false,
      });
    }
    if (profile.hasTiroCerteiro && profile.agiValue !== 0) {
      if (!attributeApplied) attributeApplied = 'AGI';
      totalFlatBonus += profile.agiValue;
      breakdown.push({
        source: 'Tiro Certeiro (AGI)',
        type: 'flat_bonus',
        expression: `+${profile.agiValue}`,
        numericValue: profile.agiValue,
        multipliesOnCrit: false,
      });
    }
  } else if (cls.weaponType === 'Fogo') {
    if (cls.usesLongBullets && profile.hasMiraDeElite && profile.intValue !== 0) {
      attributeApplied = 'INT';
      totalFlatBonus += profile.intValue;
      breakdown.push({
        source: 'Mira de Elite (INT)',
        type: 'flat_bonus',
        expression: `+${profile.intValue}`,
        numericValue: profile.intValue,
        multipliesOnCrit: false,
      });
    }
  }

  // Passo 6: Poderes Fixos e Origens (NUNCA multiplicam no crítico)
  if (profile.hasLutadorMaoPesada && (cls.weaponType === 'Corpo a corpo' || cls.isUnarmed)) {
    totalFlatBonus += 2;
    breakdown.push({
      source: 'Mão Pesada (Lutador)',
      type: 'flat_bonus',
      expression: '+2',
      numericValue: 2,
      multipliesOnCrit: false,
    });
  }

  if (profile.hasMilitarParaBellum && cls.weaponType === 'Fogo') {
    totalFlatBonus += 2;
    breakdown.push({
      source: 'Para Bellum (Militar)',
      type: 'flat_bonus',
      expression: '+2',
      numericValue: 2,
      multipliesOnCrit: false,
    });
  }

  if (profile.hasBalisticaAvancada && cls.weaponType === 'Fogo') {
    totalFlatBonus += 2;
    breakdown.push({
      source: 'Balística Avançada',
      type: 'flat_bonus',
      expression: '+2',
      numericValue: 2,
      multipliesOnCrit: false,
    });
  }

  if (profile.hasNinjaUrbano && (cls.isLightMelee || cls.weaponType === 'Disparo')) {
    totalFlatBonus += 2;
    breakdown.push({
      source: 'Ninja Urbano',
      type: 'flat_bonus',
      expression: '+2',
      numericValue: 2,
      multipliesOnCrit: false,
    });
  }

  if (profile.operarioWeaponName) {
    const toolNorm = normalizeStr(profile.operarioWeaponName);
    const atkNameNorm = normalizeStr(attack.name);
    const baseWeaponNorm = normalizeStr(customWeapon?.baseWeaponName);
    if (
      toolNorm &&
      (atkNameNorm.includes(toolNorm) || (baseWeaponNorm && baseWeaponNorm.includes(toolNorm)))
    ) {
      totalFlatBonus += 1;
      breakdown.push({
        source: 'Ferramenta de Trabalho',
        type: 'flat_bonus',
        expression: '+1',
        numericValue: 1,
        multipliesOnCrit: false,
      });
    }
  }

  // Passo 7: Modificadores Situacionais (PE / Buffs)
  let totalPeCost = 0;
  let attackBonusFromToggles = 0;

  if (toggles.ataqueEspecialPeSpent && toggles.ataqueEspecialPeSpent >= 2) {
    totalPeCost += toggles.ataqueEspecialPeSpent;
    let specialBonus = getAtaqueEspecialBonus(toggles.ataqueEspecialPeSpent);
    if (profile.hasGuerreiroPotenciaMaxima && (cls.weaponType === 'Corpo a corpo' || cls.isUnarmed)) {
      specialBonus *= 2;
    }
    const alloc = toggles.ataqueEspecialAllocation || 'damage';
    if (alloc === 'damage') {
      totalFlatBonus += specialBonus;
      breakdown.push({
        source: 'Ataque Especial',
        type: 'flat_bonus',
        expression: `+${specialBonus}`,
        numericValue: specialBonus,
        multipliesOnCrit: false,
      });
    } else if (alloc === 'split') {
      const dmgPart = Math.floor(specialBonus / 10) * 5;
      const atkPart = specialBonus - dmgPart;
      if (dmgPart > 0) {
        totalFlatBonus += dmgPart;
        breakdown.push({
          source: 'Ataque Especial (Dividido)',
          type: 'flat_bonus',
          expression: `+${dmgPart}`,
          numericValue: dmgPart,
          multipliesOnCrit: false,
        });
      }
      attackBonusFromToggles += atkPart;
    } else if (alloc === 'attack') {
      attackBonusFromToggles += specialBonus;
    }
  }

  if (toggles.odioIncontrolavelBuff) {
    const odioBonus = toggles.odioIncontrolavelBuff.tier === 'verdadeiro' ? 5 : 2;
    totalFlatBonus += odioBonus;
    breakdown.push({
      source: 'Ódio Incontrolável',
      type: 'flat_bonus',
      expression: `+${odioBonus}`,
      numericValue: odioBonus,
      multipliesOnCrit: false,
    });
  }

  if (toggles.ataqueFurtivoActive) {
    totalPeCost += 1;
    const sneakFormula = profile.ataqueFurtivoDice || '1d6';
    const sneakMatch = sneakFormula.match(/(\d+)d(\d+)/i);
    if (sneakMatch) {
      let sneakCount = parseInt(sneakMatch[1], 10);
      const sneakFaces = parseInt(sneakMatch[2], 10);
      if (toggles.assassinarActive && profile.hasInfiltradorAssassinar) {
        totalPeCost += 3;
        sneakCount *= 2;
      }
      extraDiceGroups.push({
        count: sneakCount,
        faces: sneakFaces,
        tag: 'Furtivo',
        multipliesOnCrit: false,
      });
      breakdown.push({
        source: toggles.assassinarActive && profile.hasInfiltradorAssassinar
          ? 'Ataque Furtivo + Assassinar'
          : 'Ataque Furtivo',
        type: 'extra_dice',
        expression: `+${sneakCount}d${sneakFaces}`,
        multipliesOnCrit: false,
      });
    }
  }

  if (toggles.amaldicoarArmaBuff) {
    const { element, tier } = toggles.amaldicoarArmaBuff;
    const diceCount = tier === 'verdadeiro' ? 4 : tier === 'discente' ? 2 : 1;
    extraDiceGroups.push({
      count: diceCount,
      faces: 6,
      tag: element,
      multipliesOnCrit: false,
    });
    breakdown.push({
      source: `Amaldiçoar Arma (${element})`,
      type: 'extra_dice',
      expression: `+${diceCount}d6 ${element}`,
      multipliesOnCrit: false,
      element,
    });
  }

  if (toggles.chamasDoCaosBuff) {
    extraDiceGroups.push({
      count: 1,
      faces: 6,
      tag: 'Fogo',
      multipliesOnCrit: false,
    });
    breakdown.push({
      source: 'Chamas do Caos (Chamejar)',
      type: 'extra_dice',
      expression: '+1d6 Fogo',
      multipliesOnCrit: false,
      element: 'fogo',
    });
  }

  if (profile.hasActiveSupremeMask && (profile.maskExtraDamageDice ?? 0) > 0) {
    const maskDice = profile.maskExtraDamageDice || 2;
    extraDiceGroups.push({
      count: maskDice,
      faces: baseFaces,
      multipliesOnCrit: false,
    });
    breakdown.push({
      source: 'Forma Suprema: Máscara',
      type: 'extra_dice',
      expression: `+${maskDice}d${baseFaces}`,
      multipliesOnCrit: false,
    });
  }

  // Passo 8: Crítico e Montagem das Fórmulas
  const critRaw = customWeapon?.finalCritical || attack.critical || '20/x2';
  const parsedCrit = parseCritical(critRaw);
  const criticalThreat = parsedCrit.threat;
  let criticalMultiplier = parsedCrit.mult;

  if (toggles.destruidorActive && profile.hasAniquiladorDestruidor) {
    totalPeCost += 2;
    criticalMultiplier += 1;
  }

  const formattedCritical =
    criticalThreat >= 20 && criticalMultiplier <= 2
      ? '20/x2'
      : criticalThreat >= 20
      ? `x${criticalMultiplier}`
      : `${criticalThreat}/x${criticalMultiplier}`;

  const flatSuffix =
    totalFlatBonus > 0 ? `+${totalFlatBonus}` : totalFlatBonus < 0 ? `${totalFlatBonus}` : '';

  let normalFormula = '';
  let criticalFormula = '';
  let displayDamage = '';

  if (!parsed.hasPrimaryDice && !cls.isUnarmed) {
    // Dano não-numérico ou estático sem dados (ex: "Variável")
    normalFormula = flatSuffix ? `${rawWeaponExpr}${flatSuffix}` : rawWeaponExpr;
    criticalFormula = normalFormula;
    displayDamage = normalFormula;
  } else {
    const baseNormalTerm = `${totalMultiplicativeBaseCount}d${baseFaces}`;
    const baseCritTerm = `${totalMultiplicativeBaseCount * criticalMultiplier}d${baseFaces}`;

    const normalExtraTerms = extraDiceGroups.map((g) => `${g.count}d${g.faces}`);
    const critExtraTerms = extraDiceGroups.map((g) =>
      g.multipliesOnCrit ? `${g.count * criticalMultiplier}d${g.faces}` : `${g.count}d${g.faces}`
    );

    const normalDicePart = [baseNormalTerm, ...normalExtraTerms].join('+');
    const critDicePart = [baseCritTerm, ...critExtraTerms].join('+');

    normalFormula = `${normalDicePart}${flatSuffix}`;
    criticalFormula = `${critDicePart}${flatSuffix}`;

    const displayExtraParts = extraDiceGroups.map(
      (g) => ` + ${g.count}d${g.faces}${g.tag ? ` ${g.tag}` : ''}`
    );
    displayDamage = `${baseNormalTerm}${flatSuffix}${displayExtraParts.join('')}`;
  }

  const peRound = character.peRound || getPeRoundLimit(character.nex ?? 5);
  const currentEffort = character.useDeterminationPoints
    ? (character.pdCurrent ?? 0) + (character.pdTemp ?? 0)
    : (character.peCurrent ?? 0) + (character.peTemp ?? 0);
  const peCostExceedsLimit = totalPeCost > peRound;
  const peCostExceedsCurrent = totalPeCost > currentEffort;

  return {
    displayDamage,
    normalFormula,
    criticalFormula,
    criticalThreat,
    criticalMultiplier,
    formattedCritical,
    breakdown,
    totalPeCost,
    peCostExceedsLimit,
    peCostExceedsCurrent,
    attributeApplied,
    attackBonusFromToggles,
  };
}

function getBaseCirclePeCost(circle?: number, fallbackCost?: string): number {
  if (circle === 1) return 1;
  if (circle === 2) return 3;
  if (circle === 3) return 6;
  if (circle === 4) return 10;
  if (fallbackCost) {
    const m = fallbackCost.match(/(\d+)\s*PE/i);
    if (m) return parseInt(m[1], 10) || 1;
  }
  return 1;
}

function extractFirstDiceFromText(text?: string): string {
  if (!text) return '';
  // Priorizar dados de dano típicos (d4, d6, d8, d10, d12)
  const damageMatch = text.match(/(\d+d(?:4|6|8|10|12|100)(?:\s*[+\-]\s*\d+)?)/i);
  if (damageMatch && damageMatch[1]) {
    return damageMatch[1].replace(/\s+/g, '');
  }
  const anyMatch = text.match(/(\d+d\d+(?:\s*[+\-]\s*\d+)?)/i);
  if (anyMatch && anyMatch[1]) {
    return anyMatch[1].replace(/\s+/g, '');
  }
  return '';
}

function extractUpgradePe(upgradeText?: string): number {
  if (!upgradeText) return 0;
  const m = upgradeText.match(/\+\s*(\d+)\s*PE/i);
  return m ? parseInt(m[1], 10) || 0 : 0;
}

/**
 * Extrai a fórmula de dados e o custo em PE de um ritual para o círculo selecionado.
 */
export function extractRitualDiceFormula(
  ritual: Partial<CompendiumEntity> & { name: string; description?: string; cost?: string },
  tier: 'padrao' | 'discente' | 'verdadeiro' = 'padrao'
): { formula: string; peCost: number } {
  const basePe = getBaseCirclePeCost(ritual.circle, ritual.cost);
  const padraoFormula =
    (ritual.diceFormulas && ritual.diceFormulas.length > 0 ? ritual.diceFormulas[0] : '') ||
    extractFirstDiceFromText(ritual.description);

  if (tier === 'discente') {
    const discenteFormula = extractFirstDiceFromText(ritual.discente) || padraoFormula;
    const upgradePe = extractUpgradePe(ritual.discente) || 2;
    return { formula: discenteFormula, peCost: basePe + upgradePe };
  }

  if (tier === 'verdadeiro') {
    const verdFormula =
      extractFirstDiceFromText(ritual.verdadeiro) ||
      extractFirstDiceFromText(ritual.discente) ||
      padraoFormula;
    const upgradePe = extractUpgradePe(ritual.verdadeiro) || 5;
    return { formula: verdFormula, peCost: basePe + upgradePe };
  }

  return { formula: padraoFormula, peCost: basePe };
}

/**
 * Resolve o dano dinâmico e a DT de resistência de um ritual conjurado por um agente,
 * aplicando Ritual Potente (+INT), Ritual Intenso (+PRE) e catalisadores.
 */
export function resolveAgentRitualDamage(options: {
  ritual: Partial<CompendiumEntity> & { name: string; description?: string; cost?: string };
  character: CharacterSheet;
  tier?: 'padrao' | 'discente' | 'verdadeiro';
  toggles?: SituationalDamageToggles;
  profile?: AgentDamageProfile;
  getEntityById?: (id: string) => CompendiumEntity | undefined;
}): ResolvedRitualDamage {
  const { ritual, character, toggles = {}, getEntityById } = options;
  const tier = options.tier || toggles.ritualTier || 'padrao';
  const profile = options.profile || detectAgentDamageModifiers(character, getEntityById);

  const peRound = character.peRound || getPeRoundLimit(character.nex ?? 5);
  const dtCatalystBonus =
    toggles.catalisadorPerturbadorActive || profile.hasCatalisadorPerturbador ? 2 : 0;
  const maskDtBonus = profile.maskBonusDt || 0;
  const dtResistance = 10 + peRound + profile.preValue + dtCatalystBonus + maskDtBonus;

  const { formula: baseFormula, peCost: extractedPeCost } = extractRitualDiceFormula(ritual, tier);
  const useFreeAdvanced = Boolean(
    character.maskConfig?.enabled &&
      character.maskConfig?.isActive &&
      character.maskConfig?.freeAdvancedRituals &&
      tier !== 'padrao'
  );
  const peCost = useFreeAdvanced
    ? extractRitualDiceFormula(ritual, 'padrao').peCost
    : extractedPeCost;
  const totalPeCost = peCost + (toggles.parareligiosidadeActive ? 2 : 0);
  const currentEffort = character.useDeterminationPoints
    ? (character.pdCurrent ?? 0) + (character.pdTemp ?? 0)
    : (character.peCurrent ?? 0) + (character.peTemp ?? 0);
  const peCostExceedsLimit = totalPeCost > peRound;
  const peCostExceedsCurrent = totalPeCost > currentEffort;

  if (!baseFormula) {
    return {
      ritualName: ritual.name,
      tier,
      peCost,
      dtResistance,
      displayDamage: 'Sem rolagem de dano',
      rollFormula: '',
      breakdown: [],
      totalPeCost,
      peCostExceedsLimit,
      peCostExceedsCurrent,
      hasDamageFormula: false,
    };
  }

  const parsed = parseDamageParts(baseFormula);
  const breakdown: DynamicDamageComponent[] = [];
  let totalCount = parsed.primaryCount || 1;
  const faces = parsed.primaryFaces || 6;
  let totalFlatBonus = parsed.flatBonus;

  breakdown.push({
    source: `Ritual (${tier === 'padrao' ? 'Padrão' : tier === 'discente' ? 'Discente' : 'Verdadeiro'})`,
    type: 'base_dice',
    expression: `${totalCount}d${faces}`,
    multipliesOnCrit: false,
  });

  if (parsed.flatBonus !== 0) {
    breakdown.push({
      source: 'Bônus Base do Ritual',
      type: 'flat_bonus',
      expression: parsed.flatBonus > 0 ? `+${parsed.flatBonus}` : `${parsed.flatBonus}`,
      numericValue: parsed.flatBonus,
      multipliesOnCrit: false,
    });
  }

  if (toggles.catalisadorPotencializadorActive || profile.hasCatalisadorPotencializador) {
    totalCount += 1;
    breakdown.push({
      source: 'Catalisador Potencializador',
      type: 'extra_dice',
      expression: `+1d${faces}`,
      multipliesOnCrit: false,
    });
  }

  const ritualElemNorm = normalizeStr(ritual.element);
  if (profile.hasCajadoCruzSangue && ritualElemNorm === 'sangue') {
    totalCount += 1;
    breakdown.push({
      source: 'Cajado da Cruz de Sangue',
      type: 'extra_dice',
      expression: `+1d${faces}`,
      multipliesOnCrit: false,
      element: 'Sangue',
    });
  }

  if (profile.hasActiveSupremeMask && (profile.maskExtraDamageDice ?? 0) > 0) {
    const maskDice = profile.maskExtraDamageDice || 2;
    totalCount += maskDice;
    breakdown.push({
      source: 'Forma Suprema: Máscara',
      type: 'extra_dice',
      expression: `+${maskDice}d${faces}`,
      multipliesOnCrit: false,
    });
  }

  if (profile.hasRitualPotente && profile.intValue !== 0) {
    totalFlatBonus += profile.intValue;
    breakdown.push({
      source: 'Ritual Potente (INT)',
      type: 'flat_bonus',
      expression: `+${profile.intValue}`,
      numericValue: profile.intValue,
      multipliesOnCrit: false,
    });
  }

  if (profile.hasRitualIntenso && profile.preValue !== 0) {
    totalFlatBonus += profile.preValue;
    breakdown.push({
      source: 'Ritual Intenso (PRE)',
      type: 'flat_bonus',
      expression: `+${profile.preValue}`,
      numericValue: profile.preValue,
      multipliesOnCrit: false,
    });
  }

  const extraDiceStr = parsed.extraDice.map((g) => `+${g.count}d${g.faces}`).join('');
  const flatStr = totalFlatBonus > 0 ? `+${totalFlatBonus}` : totalFlatBonus < 0 ? `${totalFlatBonus}` : '';
  const rollFormula = `${totalCount}d${faces}${extraDiceStr}${flatStr}`;

  return {
    ritualName: ritual.name,
    tier,
    peCost,
    dtResistance,
    displayDamage: rollFormula,
    rollFormula,
    breakdown,
    totalPeCost,
    peCostExceedsLimit,
    peCostExceedsCurrent,
    hasDamageFormula: true,
  };
}
