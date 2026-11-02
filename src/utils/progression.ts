import {
  CharacterAttributes,
  CharacterSheet,
  CharacterSkillEntry,
  CompendiumEntity,
  ParanormalElement,
} from '../types/compendium';
import { confirmAction } from './alert';

export type Character = CharacterSheet;

export interface StatIncreases {
  pvGain: number;
  peGain: number;
  sanGain: number;
  basePv: number;
  basePe: number;
  baseSan: number;
}

export interface VitalsModifierBreakdown {
  name: string;
  value: number;
}

export interface CharacterVitalsOptions {
  className?: string;
  nex?: number;
  attributes?: CharacterAttributes;
  origin?: string;
  hasVitalidadeReforcada?: boolean;
  hasSangueDeFerro?: boolean;
  hasSangueDeFerroAffinity?: boolean;
  hasPotencialAprimorado?: boolean;
  hasPotencialAprimoradoAffinity?: boolean;
  hasVontadeInabalavel?: boolean;
  hasCombatenteEsforcado?: boolean;
  hasCascaGrossa?: boolean;
  hasDesgarrado?: boolean;
  hasUniversitario?: boolean;
  hasVitima?: boolean;
  hasCultistaArrependido?: boolean;
  hasMergulhador?: boolean;
  hasPersonalidadeEsoterica?: boolean;
  transcendedCount?: number;
}

export interface CharacterVitalsResult {
  pvMax: number;
  peMax: number;
  sanMax: number;
  peRound: number;
  dtRituals: number;
  defense: number;
  skillBonuses: Record<string, number>;
  breakdown: {
    basePv: number;
    basePe: number;
    baseSan: number;
    pvFromNex: number;
    peFromNex: number;
    sanFromNex: number;
    pvBonuses: VitalsModifierBreakdown[];
    peBonuses: VitalsModifierBreakdown[];
    sanBonuses: VitalsModifierBreakdown[];
    skillBonusesList: Array<{ skill: string; bonus: number; source: string }>;
  };
}

export type AgentRank =
  | 'Recruta'
  | 'Operador'
  | 'Agente Especial'
  | 'Oficial de Operações'
  | 'Agente de Elite';

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

export interface NexMilestone {
  nex: number;
  title: string;
  description: string;
  needsTrackChoice?: boolean;
  needsClassPower?: boolean;
  canTranscend?: boolean;
  isTranscendRuleActive?: boolean;
  canTranscendSeparately?: boolean; // Regra opcional: em marcos de classe oficiais, ganha poder de classe E pode transcender separadamente
  onlyParanormal?: boolean; // Regra opcional: nesta subida SÓ é permitido escolher Poder Paranormal (não pode ser poder de classe)
  needsAttributeIncrease?: boolean;
  needsSkillTrainingIncrease?: boolean; // promotion to Veterano (+10) or Expert (+15)
  skillTrainingTargetDegree?: 10 | 15;
  skillTrainingQuota?: number;
  needsAffinityChoice?: boolean;
  needsRitualChoice?: boolean;
  maxRitualCircle?: number;
  trackAbility?: { title: string; description: string };
  classAbilityUpgrade?: string;
  recommendedRank?: AgentRank;
}

/**
 * Retorna a quantidade de passos de 5% de NEX para escalonamento de vitais.
 * - NEX 0% = 0 passos (para habilidades que escalam a cada 5% de NEX)
 * - NEX 5% = 1 passo
 * - NEX 10% = 2 passos ... NEX 50% = 10 passos ... NEX 99% = 20 passos (20º patamar / nível 20)
 */
export function getStepCount(nex: number): number {
  if (nex <= 0) return 0;
  if (nex >= 99) return 20;
  return Math.max(1, Math.floor(nex / 5));
}

/**
 * Retorna a quantidade de passos de 10% de NEX (usado por Vontade Inabalável).
 * - NEX 0% e 5% = 0 passos
 * - NEX 10% = 1 passo ... NEX 20% = 2 passos ... NEX 50% = 5 passos ... NEX 99% = 10 passos
 */
export function getTenPercentStepCount(nex: number): number {
  if (nex < 10) return 0;
  if (nex >= 99) return 10;
  return Math.floor(nex / 10);
}

/**
 * Calcula os ganhos de PV, PE e SAN para um avanço de 5% de NEX.
 * Suporta modificadores opcionais por patamar (Desgarrado, Universitário, Vítima, etc.).
 */
export function calculateStatIncreases(
  className: string,
  attrs: CharacterAttributes,
  options?: Partial<CharacterVitalsOptions>
): StatIncreases {
  const norm = (className || '').toLowerCase();
  let basePv = 3;
  let basePe = 3;
  let baseSan = 4;
  let pvGain = Math.max(1, 3 + attrs.VIG);
  let peGain = Math.max(1, 3 + attrs.PRE);
  let sanGain = 4;

  if (norm.includes('combatente')) {
    basePv = 4;
    basePe = 2;
    baseSan = 3;
    pvGain = Math.max(1, 4 + attrs.VIG);
    peGain = Math.max(1, 2 + attrs.PRE);
    sanGain = 3;
  } else if (norm.includes('ocultista')) {
    basePv = 2;
    basePe = 4;
    baseSan = 5;
    pvGain = Math.max(1, 2 + attrs.VIG);
    peGain = Math.max(1, 4 + attrs.PRE);
    sanGain = 5;
  } else if (norm.includes('sobrevivente')) {
    basePv = 2;
    basePe = 1;
    baseSan = 2;
    pvGain = 2;
    peGain = 1;
    sanGain = 2;
  }

  if (options) {
    if (options.hasDesgarrado) pvGain += 1;
    if (options.hasCascaGrossa) pvGain += 1;
    if (options.hasVitalidadeReforcada) pvGain += 1;
    if (options.hasSangueDeFerro) pvGain += options.hasSangueDeFerroAffinity ? 3 : 2;
    if (options.hasUniversitario) peGain += 1;
    if (options.hasCombatenteEsforcado) peGain += 1;
    if (options.hasPotencialAprimorado) peGain += options.hasPotencialAprimoradoAffinity ? 2 : 1;
    if (options.hasVitima) sanGain += 1;
  }

  return {
    pvGain,
    peGain,
    sanGain,
    basePv,
    basePe,
    baseSan,
  };
}

/**
 * Calcula o escalonamento total canônico de PV, PE e SAN de um agente conforme seu NEX,
 * classe, atributos, origem e poderes especiais:
 * - Vitalidade Reforçada: +1 PV para cada 5% de NEX e +2 em Fortitude.
 * - Sangue de Ferro: +2 PV por 5% de NEX (com afinidade: +3 PV por 5% de NEX e +5 em Fortitude).
 * - Potencial Aprimorado: +1 PE por nível/passo de NEX (com afinidade: +2 PE por nível/passo).
 * - Vontade Inabalável: +1 PE para cada 10% de NEX e +2 em Vontade.
 * - Desgarrado (Calejado): +1 PV para cada 5% de NEX.
 * - Universitário (Dedicação): +1 PE para cada 5% de NEX e +1 limite de PE por turno.
 * - Vítima (Cicatrizes Psicológicas): +1 SAN para cada 5% de NEX.
 * - Cultista Arrependido: -5 SAN fixa.
 */
export function calculateMaxStats(
  className: string,
  nex: number,
  attrs: CharacterAttributes,
  options?: Partial<CharacterVitalsOptions>
): CharacterVitalsResult {
  const normClass = (className || '').toLowerCase();
  const isSobrevivente = normClass.includes('sobrevivente');
  const isCombatente = normClass.includes('combatente');
  const isOcultista = normClass.includes('ocultista');

  // Quantidade de passos de 5% e 10%
  const nexSteps = getStepCount(nex);
  const tenPercentSteps = getTenPercentStepCount(nex);

  // Níveis extras além da base de NEX 5% (ou estágio 1)
  const totalLevels = nex <= 0 ? 1 : nex >= 99 ? 20 : Math.max(1, Math.floor(nex / 5));
  const extraAdvances = Math.max(0, totalLevels - 1);

  let basePv = 16 + attrs.VIG;
  let pvPerLevel = Math.max(1, 3 + attrs.VIG);
  let basePe = 3 + attrs.PRE;
  let pePerLevel = Math.max(1, 3 + attrs.PRE);
  let baseSan = 16;
  let sanPerLevel = 4;

  if (isCombatente) {
    basePv = 20 + attrs.VIG;
    pvPerLevel = Math.max(1, 4 + attrs.VIG);
    basePe = 2 + attrs.PRE;
    pePerLevel = Math.max(1, 2 + attrs.PRE);
    baseSan = 12;
    sanPerLevel = 3;
  } else if (isOcultista) {
    basePv = 12 + attrs.VIG;
    pvPerLevel = Math.max(1, 2 + attrs.VIG);
    basePe = 4 + attrs.PRE;
    pePerLevel = Math.max(1, 4 + attrs.PRE);
    baseSan = 20;
    sanPerLevel = 5;
  } else if (isSobrevivente) {
    const stage = nex <= 0 ? 1 : Math.min(5, Math.max(1, Math.floor(nex / 5)));
    basePv = 8 + attrs.VIG;
    pvPerLevel = 2;
    basePe = 2 + attrs.PRE;
    pePerLevel = 1;
    baseSan = 8;
    sanPerLevel = 2;
  }

  const actualExtraAdvances = isSobrevivente && nex <= 0 ? 0 : extraAdvances;

  const pvFromNex = actualExtraAdvances * pvPerLevel;
  const peFromNex = actualExtraAdvances * pePerLevel;
  let sanFromNex = actualExtraAdvances * sanPerLevel;

  // Desconto de Sanidade de avanços em que o agente Transcendeu
  if (options?.transcendedCount && options.transcendedCount > 0) {
    sanFromNex = Math.max(0, sanFromNex - options.transcendedCount * sanPerLevel);
  }

  // Origens
  const normOrigin = (options?.origin || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const hasDesgarrado =
    options?.hasDesgarrado ??
    (normOrigin.includes('desgarrado') || normOrigin.includes('calejado'));
  const hasUniversitario =
    options?.hasUniversitario ??
    (normOrigin.includes('universit') || normOrigin.includes('dedica'));
  const hasVitima =
    options?.hasVitima ??
    (normOrigin.includes('vitima') || normOrigin.includes('cicatrizes'));
  const hasCultistaArrependido =
    options?.hasCultistaArrependido ??
    (normOrigin.includes('cultista') || normOrigin.includes('tracos'));
  const hasMergulhador =
    options?.hasMergulhador ??
    (normOrigin.includes('mergulhador') || normOrigin.includes('folego de nadador'));

  // Poderes
  const hasVitalidadeReforcada = Boolean(options?.hasVitalidadeReforcada);
  const hasSangueDeFerro = Boolean(options?.hasSangueDeFerro);
  const hasSangueDeFerroAffinity = Boolean(options?.hasSangueDeFerroAffinity);
  const hasPotencialAprimorado = Boolean(options?.hasPotencialAprimorado);
  const hasPotencialAprimoradoAffinity = Boolean(options?.hasPotencialAprimoradoAffinity);
  const hasVontadeInabalavel = Boolean(options?.hasVontadeInabalavel);
  const hasCombatenteEsforcado = Boolean(options?.hasCombatenteEsforcado);
  const hasCascaGrossa = Boolean(options?.hasCascaGrossa);
  const hasPersonalidadeEsoterica = Boolean(options?.hasPersonalidadeEsoterica);

  const pvBonuses: VitalsModifierBreakdown[] = [];
  const peBonuses: VitalsModifierBreakdown[] = [];
  const sanBonuses: VitalsModifierBreakdown[] = [];
  const skillBonusesList: Array<{ skill: string; bonus: number; source: string }> = [];
  const skillBonuses: Record<string, number> = {};

  // 1. Vitalidade Reforçada: +1 PV para cada 5% de NEX e +2 em Fortitude
  if (hasVitalidadeReforcada) {
    const val = nexSteps * 1;
    pvBonuses.push({ name: 'Vitalidade Reforçada', value: val });
    skillBonusesList.push({ skill: 'Fortitude', bonus: 2, source: 'Vitalidade Reforçada' });
    skillBonuses['Fortitude'] = (skillBonuses['Fortitude'] || 0) + 2;
  }

  // 2. Sangue de Ferro: +2 PV por 5% de NEX (com afinidade: +3 PV por 5% de NEX e +5 em Fortitude)
  if (hasSangueDeFerro) {
    const perStep = hasSangueDeFerroAffinity ? 3 : 2;
    const val = nexSteps * perStep;
    pvBonuses.push({
      name: hasSangueDeFerroAffinity ? 'Sangue de Ferro (Afinidade)' : 'Sangue de Ferro',
      value: val,
    });
    if (hasSangueDeFerroAffinity) {
      skillBonusesList.push({ skill: 'Fortitude', bonus: 5, source: 'Sangue de Ferro (Afinidade)' });
      skillBonuses['Fortitude'] = (skillBonuses['Fortitude'] || 0) + 5;
    }
  }

  // 3. Casca Grossa: +1 PV por 5% de NEX
  if (hasCascaGrossa) {
    const val = nexSteps * 1;
    pvBonuses.push({ name: 'Casca Grossa', value: val });
  }

  // 4. Desgarrado: +1 PV para cada 5% de NEX
  if (hasDesgarrado) {
    const val = nexSteps * 1;
    pvBonuses.push({ name: 'Desgarrado (Calejado)', value: val });
  }

  // 5. Mergulhador: +5 PV fixos
  if (hasMergulhador) {
    pvBonuses.push({ name: 'Mergulhador', value: 5 });
  }

  // 6. Potencial Aprimorado: +1 PE por nível/passo de NEX (com afinidade: +2 PE)
  if (hasPotencialAprimorado) {
    const perStep = hasPotencialAprimoradoAffinity ? 2 : 1;
    const val = nexSteps * perStep;
    peBonuses.push({
      name: hasPotencialAprimoradoAffinity ? 'Potencial Aprimorado (Afinidade)' : 'Potencial Aprimorado',
      value: val,
    });
  }

  // 7. Vontade Inabalável: +1 PE para cada 10% de NEX e +2 em Vontade
  if (hasVontadeInabalavel) {
    const val = tenPercentSteps * 1;
    peBonuses.push({ name: 'Vontade Inabalável', value: val });
    skillBonusesList.push({ skill: 'Vontade', bonus: 2, source: 'Vontade Inabalável' });
    skillBonuses['Vontade'] = (skillBonuses['Vontade'] || 0) + 2;
  }

  // 8. Combatente Esforçado: +1 PE por 5% de NEX
  if (hasCombatenteEsforcado) {
    const val = nexSteps * 1;
    peBonuses.push({ name: 'Combatente Esforçado', value: val });
  }

  // 9. Universitário: +1 PE para cada 5% de NEX e +1 limite de PE por turno
  if (hasUniversitario) {
    const val = nexSteps * 1;
    peBonuses.push({ name: 'Universitário (Dedicação)', value: val });
  }

  // 10. Personalidade Esotérica: +3 PE fixos
  if (hasPersonalidadeEsoterica) {
    peBonuses.push({ name: 'Personalidade Esotérica', value: 3 });
  }

  // 11. Vítima: +1 SAN para cada 5% de NEX
  if (hasVitima) {
    const val = nexSteps * 1;
    sanBonuses.push({ name: 'Vítima (Cicatrizes Psicológicas)', value: val });
  }

  // 12. Cultista Arrependido: -5 SAN fixa
  if (hasCultistaArrependido) {
    sanBonuses.push({ name: 'Cultista Arrependido', value: -5 });
  }

  const totalPvBonuses = pvBonuses.reduce((acc, b) => acc + b.value, 0);
  const totalPeBonuses = peBonuses.reduce((acc, b) => acc + b.value, 0);
  const totalSanBonuses = sanBonuses.reduce((acc, b) => acc + b.value, 0);

  const pvMax = Math.max(1, basePv + pvFromNex + totalPvBonuses);
  const peMax = Math.max(1, basePe + peFromNex + totalPeBonuses);
  const sanMax = Math.max(1, baseSan + sanFromNex + totalSanBonuses);

  let peRound = getPeRoundLimit(nex);
  if (hasUniversitario) {
    peRound += 1;
  }
  const dtRituals = 10 + peRound + attrs.PRE;
  const defense = 10 + attrs.AGI;

  return {
    pvMax,
    peMax,
    sanMax,
    peRound,
    dtRituals,
    defense,
    skillBonuses,
    breakdown: {
      basePv,
      basePe,
      baseSan,
      pvFromNex,
      peFromNex,
      sanFromNex,
      pvBonuses,
      peBonuses,
      sanBonuses,
      skillBonusesList,
    },
  };
}

/**
 * Inspeciona a ficha de um personagem e detecta automaticamente modificadores de vitais
 * presentes em sua origem, poderes, habilidades e afinidade paranormal.
 */
export function detectVitalsModifiers(
  character: CharacterSheet,
  getEntityById?: (id: string) => CompendiumEntity | undefined
): CharacterVitalsOptions {
  const norm = (s?: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/_/g, ' ');

  const originEnt = getEntityById && character.originId ? getEntityById(character.originId) : null;
  const originStr = norm(character.originId) + ' ' + norm(originEnt?.name);

  let hasDesgarrado = originStr.includes('desgarrado') || originStr.includes('calejado');
  let hasUniversitario = originStr.includes('universit') || originStr.includes('dedica');
  let hasVitima = originStr.includes('vitima') || originStr.includes('cicatrizes');
  let hasCultistaArrependido = originStr.includes('cultista') || originStr.includes('tracos');
  let hasMergulhador = originStr.includes('mergulhador') || originStr.includes('folego de nadador');

  let hasVitalidadeReforcada = false;
  let hasSangueDeFerro = false;
  let hasSangueDeFerroAffinity = false;
  let hasPotencialAprimorado = false;
  let hasPotencialAprimoradoAffinity = false;
  let hasVontadeInabalavel = false;
  let hasCombatenteEsforcado = false;
  let hasCascaGrossa = false;
  let hasPersonalidadeEsoterica = false;

  const checkTextForPowers = (name: string, desc: string) => {
    const n = norm(name);
    const d = norm(desc);

    if (n.includes('calejado') || d.includes('calejado') || n.includes('desgarrado')) {
      hasDesgarrado = true;
    }
    if (n.includes('dedica') || d.includes('dedica') || n.includes('universit')) {
      hasUniversitario = true;
    }
    if (n.includes('cicatrizes') || d.includes('cicatrizes') || n.includes('vitima')) {
      hasVitima = true;
    }
    if (n.includes('tracos do outro lado') || d.includes('tracos do outro lado') || n.includes('cultista')) {
      hasCultistaArrependido = true;
    }
    if (n.includes('mergulhador') || n.includes('folego de nadador') || d.includes('folego de nadador')) {
      hasMergulhador = true;
    }

    if (n.includes('vitalidade reforcada')) {
      hasVitalidadeReforcada = true;
    }
    if (n.includes('sangue de ferro')) {
      hasSangueDeFerro = true;
      if (
        n.includes('afinidade') ||
        d.includes('afinidade: você recebe +5 em fortitude') ||
        d.includes('afinidade: voce recebe +5 em fortitude') ||
        (character.affinity === 'Sangue' && (character.nex ?? 0) >= 50)
      ) {
        hasSangueDeFerroAffinity = true;
      }
    }
    if (n.includes('potencial aprimorado')) {
      hasPotencialAprimorado = true;
      if (
        n.includes('afinidade') ||
        (character.affinity === 'Morte' && (character.nex ?? 0) >= 50)
      ) {
        hasPotencialAprimoradoAffinity = true;
      }
    }
    if (n.includes('vontade inabalavel')) {
      hasVontadeInabalavel = true;
    }
    if (n.includes('combatente esforcado') || n.includes('combatente esforçado') || d.includes('combatente esforcado')) {
      hasCombatenteEsforcado = true;
    }
    if (n.includes('personalidade esoterica') || n.includes('personalidade esotérica') || d.includes('personalidade esoterica')) {
      hasPersonalidadeEsoterica = true;
    }
    if (n.includes('casca grossa') || d.includes('casca grossa')) {
      hasCascaGrossa = true;
    }
  };

  if (character.abilities && Array.isArray(character.abilities)) {
    for (const ab of character.abilities) {
      checkTextForPowers(ab.name, ab.description || '');
    }
  }

  if (character.entityIds && Array.isArray(character.entityIds)) {
    for (const id of character.entityIds) {
      const ent = getEntityById ? getEntityById(id) : null;
      checkTextForPowers(ent?.name || id, ent?.description || '');
    }
  }

  const classEnt = getEntityById && character.classId ? getEntityById(character.classId) : null;
  const className = classEnt?.name || character.classId || 'Especialista';

  return {
    className,
    nex: character.nex ?? 5,
    attributes: character.attributes,
    origin: originEnt?.name || character.originId,
    hasVitalidadeReforcada,
    hasSangueDeFerro,
    hasSangueDeFerroAffinity,
    hasPotencialAprimorado,
    hasPotencialAprimoradoAffinity,
    hasVontadeInabalavel,
    hasCombatenteEsforcado,
    hasCascaGrossa,
    hasDesgarrado,
    hasUniversitario,
    hasVitima,
    hasCultistaArrependido,
    hasMergulhador,
    hasPersonalidadeEsoterica,
  };
}

/**
 * Calcula os vitais de um personagem completo, integrando sua ficha e o compêndio.
 */
export function calculateCharacterVitals(
  character: CharacterSheet,
  getEntityById?: (id: string) => CompendiumEntity | undefined,
  optionsOverride?: Partial<CharacterVitalsOptions>
): CharacterVitalsResult {
  const detected = detectVitalsModifiers(character, getEntityById);
  const mergedOptions: CharacterVitalsOptions = {
    ...detected,
    ...optionsOverride,
  };

  const className = mergedOptions.className || detected.className || 'Especialista';
  const nex = mergedOptions.nex ?? character.nex ?? 5;
  const attrs = mergedOptions.attributes || character.attributes || { FOR: 1, AGI: 1, INT: 1, PRE: 1, VIG: 1 };

  return calculateMaxStats(className, nex, attrs, mergedOptions);
}

/**
 * Calcula o limite de PE que um agente pode gastar por rodada com base no seu NEX
 * Regra canônica: NEX / 5 (mínimo 1), com NEX >= 99 retornando 20 (Tabela 1.2 do Livro Base p. 20)
 */
export function getPeRoundLimit(nex: number): number {
  if (nex >= 99) return 20;
  return Math.max(1, Math.floor(nex / 5));
}

/**
 * Calcula a Dificuldade do Teste (DT) de rituais e habilidades
 * Regra: 10 + limite de PE por rodada + Presença
 */
export function getRitualDt(nex: number, pre: number): number {
  return 10 + getPeRoundLimit(nex) + pre;
}

/**
 * Retorna a patente canônica recomendada conforme o patamar de NEX
 */
export function getRecommendedRank(nex: number): AgentRank {
  if (nex >= 95) return 'Agente de Elite';
  if (nex >= 70) return 'Oficial de Operações';
  if (nex >= 50) return 'Agente Especial';
  if (nex >= 20) return 'Operador';
  return 'Recruta';
}

/**
 * Extrai a introdução narrativa completa de uma trilha do compêndio, sem cortes
 */
export function getTrackDescription(track?: CompendiumEntity | null): string {
  if (!track) return '';
  const desc = track.description || '';
  if (desc) {
    const parts = desc.split(/(?:NEX\s*)?\b\d+%\s*[-–—]/i);
    if (parts && parts[0] && parts[0].trim().length > 10) {
      return parts[0].replace(/\s+/g, ' ').trim();
    }
  }
  return (track.summary || desc || '').replace(/\s+/g, ' ').trim();
}

/**
 * Extrai as habilidades de uma trilha por patamar de NEX (10%, 40%, 65%, 99%)
 */
export function parseTrackAbilities(
  trackDescription: string
): Record<number, { title: string; description: string }> {
  const result: Record<number, { title: string; description: string }> = {};
  if (!trackDescription) return result;

  // Regex para blocos no formato: NEX 10% - Título. Descrição... (ou 10% - Título)
  const pattern = /(?:NEX\s*)?(\d+)%\s*[-–—]\s*([^.\n]+)[.:]?\s*([\s\S]*?)(?=(?:(?:NEX\s*)?\d+%\s*[-–—]|$))/gi;
  let match;

  while ((match = pattern.exec(trackDescription)) !== null) {
    const nexVal = parseInt(match[1], 10);
    const title = match[2].trim();
    const desc = match[3].trim();
    result[nexVal] = { title, description: desc };
  }

  return result;
}

/**
 * Retorna as regras e seleções oficiais para um patamar de NEX específico
 */
export function getNexMilestone(
  className: string,
  targetNex: number,
  trackEntity?: CompendiumEntity,
  currentAttrs?: CharacterAttributes,
  options?: { transcendEvery5Nex?: boolean }
): NexMilestone {
  const norm = (className || '').toLowerCase();
  const trackAbilities = trackEntity ? parseTrackAbilities(trackEntity.description) : {};
  const trackAbilityForThisNex = trackAbilities[targetNex];
  const recRank = getRecommendedRank(targetNex);
  const intVal = currentAttrs ? currentAttrs.INT : 2;

  // Cota de perícias para promoção de grau (Regras Oficiais: Combatente 1 + Int, Especialista 5 + Int, Ocultista 3 + Int)
  let veteranoQuota = 1 + Math.max(0, intVal);
  if (norm.includes('especialista')) {
    veteranoQuota = 5 + Math.max(0, intVal);
  } else if (norm.includes('ocultista')) {
    veteranoQuota = 3 + Math.max(0, intVal);
  }

  const milestone: NexMilestone = {
    nex: targetNex,
    title: `Avanço para NEX ${targetNex}%`,
    description: '',
    recommendedRank: recRank,
  };

  if (trackAbilityForThisNex) {
    milestone.trackAbility = trackAbilityForThisNex;
  }

  switch (targetNex) {
    case 10:
      milestone.title = 'NEX 10%: Escolha de Trilha';
      milestone.description =
        'Você escolhe uma Trilha para seu agente e ganha a primeira habilidade da trilha.';
      milestone.needsTrackChoice = true;
      break;

    case 15:
    case 30:
    case 45:
    case 60:
    case 90:
      milestone.title = `NEX ${targetNex}%: Poder de Classe`;
      milestone.description =
        'Você ganha um Poder de Classe ou pode escolher um Poder Geral / Poder Paranormal.';
      milestone.needsClassPower = true;
      break;

    case 20:
      milestone.title = 'NEX 20%: Aumento de Atributo';
      milestone.description =
        'Você recebe +1 em um atributo à sua escolha (máximo 5).';
      milestone.needsAttributeIncrease = true;
      break;

    case 25:
      milestone.title = 'NEX 25%: Aprimoramento de Classe';
      if (norm.includes('combatente')) {
        milestone.description =
          'Ataque Especial aprimorado: pode gastar 3 PE para receber +10 no teste ou dano.';
        milestone.classAbilityUpgrade = 'Ataque Especial (3 PE / +10)';
      } else if (norm.includes('especialista')) {
        milestone.description =
          'Perito aprimorado: o bônus nas perícias peritas aumenta para +1d8.';
        milestone.classAbilityUpgrade = 'Perito (+1d8)';
      } else if (norm.includes('ocultista')) {
        milestone.description =
          'Escolhido pelo Outro Lado: você desbloqueia o 2º Círculo de Rituais e aprende 1 novo ritual.';
        milestone.needsRitualChoice = true;
        milestone.maxRitualCircle = 2;
        milestone.classAbilityUpgrade = 'Rituais de 2º Círculo';
      } else {
        milestone.description = 'Avanço de estágio e fortalecimento do agente.';
      }
      break;

    case 35:
      milestone.title = 'NEX 35%: Grau de Treinamento';
      milestone.description =
        'Suas perícias treinadas avançam para o grau de Veterano (+10).';
      milestone.needsSkillTrainingIncrease = true;
      milestone.skillTrainingTargetDegree = 10;
      milestone.skillTrainingQuota = veteranoQuota;
      break;

    case 40:
      milestone.title = 'NEX 40%: Habilidade de Trilha';
      if (norm.includes('especialista')) {
        milestone.description =
          'Você ganha a segunda habilidade de sua Trilha e a habilidade Engenhosidade (ao usar Eclético, pode gastar +2 PE para agir como Veterano).';
        milestone.classAbilityUpgrade = 'Engenhosidade (Veterano)';
      } else {
        milestone.description =
          'Você ganha a segunda habilidade concedida pela sua Trilha de Classe.';
      }
      break;

    case 50:
      milestone.title = 'NEX 50%: Aumento de Atributo, Versatilidade & Afinidade';
      milestone.description =
        'Você recebe +1 em um atributo (máx 5), Versatilidade (um poder de sua classe ou o 1º poder de outra trilha) e escolhe uma Afinidade com um Elemento Paranormal.';
      milestone.needsAttributeIncrease = true;
      milestone.needsAffinityChoice = true;
      milestone.needsClassPower = true;
      break;

    case 55:
      milestone.title = 'NEX 55%: Aprimoramento de Classe';
      if (norm.includes('combatente')) {
        milestone.description =
          'Ataque Especial aprimorado: pode gastar 4 PE para receber +15 no teste ou dano.';
        milestone.classAbilityUpgrade = 'Ataque Especial (4 PE / +15)';
      } else if (norm.includes('especialista')) {
        milestone.description =
          'Perito aprimorado: o bônus nas perícias peritas aumenta para +1d10.';
        milestone.classAbilityUpgrade = 'Perito (+1d10)';
      } else if (norm.includes('ocultista')) {
        milestone.description =
          'Escolhido pelo Outro Lado: você desbloqueia o 3º Círculo de Rituais e aprende 1 novo ritual.';
        milestone.needsRitualChoice = true;
        milestone.maxRitualCircle = 3;
        milestone.classAbilityUpgrade = 'Rituais de 3º Círculo';
      }
      break;

    case 65:
      milestone.title = 'NEX 65%: Habilidade de Trilha';
      milestone.description =
        'Você ganha a terceira habilidade concedida pela sua Trilha de Classe.';
      break;

    case 70:
      milestone.title = 'NEX 70%: Grau de Treinamento (Expert)';
      milestone.description =
        'Suas perícias de grau Veterano (+10) avançam para o grau de Expert (+15).';
      milestone.needsSkillTrainingIncrease = true;
      milestone.skillTrainingTargetDegree = 15;
      milestone.skillTrainingQuota = veteranoQuota;
      break;

    case 75:
      milestone.title = 'NEX 75%: Poder de Classe';
      if (norm.includes('especialista')) {
        milestone.description =
          'Você ganha um Poder de Especialista e aprimora Engenhosidade (ao usar Eclético, pode gastar +4 PE para agir como Expert).';
        milestone.classAbilityUpgrade = 'Engenhosidade (Expert)';
      } else {
        milestone.description =
          'Você ganha um Poder de Classe ou pode escolher um Poder Geral / Poder Paranormal.';
      }
      milestone.needsClassPower = true;
      break;

    case 80:
      milestone.title = 'NEX 80%: Aumento de Atributo';
      milestone.description =
        'Você recebe +1 em um atributo à sua escolha (máximo 5).';
      milestone.needsAttributeIncrease = true;
      break;

    case 85:
      milestone.title = 'NEX 85%: Aprimoramento de Classe';
      if (norm.includes('combatente')) {
        milestone.description =
          'Ataque Especial aprimorado: pode gastar 5 PE para receber +20 no teste ou dano.';
        milestone.classAbilityUpgrade = 'Ataque Especial (5 PE / +20)';
      } else if (norm.includes('especialista')) {
        milestone.description =
          'Perito aprimorado: o bônus nas perícias peritas aumenta para +1d12.';
        milestone.classAbilityUpgrade = 'Perito (+1d12)';
      } else if (norm.includes('ocultista')) {
        milestone.description =
          'Escolhido pelo Outro Lado: você desbloqueia o 4º Círculo de Rituais e aprende 1 novo ritual.';
        milestone.needsRitualChoice = true;
        milestone.maxRitualCircle = 4;
        milestone.classAbilityUpgrade = 'Rituais de 4º Círculo';
      }
      break;

    case 95:
      milestone.title = 'NEX 95%: Aumento de Atributo';
      milestone.description =
        'Você recebe +1 em um atributo à sua escolha (máximo 5).';
      milestone.needsAttributeIncrease = true;
      break;

    case 99:
      milestone.title = 'NEX 99%: Habilidade Suprema de Trilha';
      milestone.description =
        'Você atinge o ápice paranormal de sua trilha e recebe a habilidade definitiva de NEX 99%.';
      break;

    default:
      milestone.title = `NEX ${targetNex}%: Evolução Geral`;
      milestone.description =
        'Aumento padrão de pontos vitais, limite de PE por rodada e DT de rituais.';
      break;
  }

  const officialClassPowerNex = [15, 30, 45, 50, 60, 75, 90];
  const hasOfficialClassPower = officialClassPowerNex.includes(targetNex);

  if (options?.transcendEvery5Nex) {
    milestone.isTranscendRuleActive = true;
    milestone.canTranscend = true;

    if (hasOfficialClassPower) {
      // Nos patamares oficiais: ganha o Poder de Classe E escolhe o Poder Paranormal SEPARADAMENTE
      milestone.needsClassPower = true;
      milestone.canTranscendSeparately = true;
      milestone.onlyParanormal = false;
      milestone.description = milestone.description
        ? `${milestone.description} (Regra Caseira Ativa: Você ganha o Poder de Classe oficial e pode escolher um Poder Paranormal separadamente).`
        : 'Você ganha o Poder de Classe oficial e, pela regra caseira opcional, pode escolher um Poder Paranormal separadamente.';
    } else {
      // Nos patamares não-oficiais de classe: SÓ pode escolher Poder Paranormal (não pode ser poder de classe)
      milestone.needsClassPower = false;
      milestone.canTranscendSeparately = false;
      milestone.onlyParanormal = true;
      milestone.description = milestone.description
        ? `${milestone.description} (Regra Caseira: Você pode opcionalmente Transcender escolhendo um Poder Paranormal ao custo de não ganhar Sanidade).`
        : 'Regra Caseira Ativa: Você pode opcionalmente Transcender escolhendo um Poder Paranormal nesta subida ao custo de não ganhar Sanidade.';
    }
  } else {
    // Regra desativada (Oficial RAW): apenas os patamares oficiais ganham poder (podendo ser poder de classe, geral ou paranormal sem SAN)
    milestone.canTranscendSeparately = false;
    milestone.onlyParanormal = false;
    milestone.isTranscendRuleActive = false;
    if (hasOfficialClassPower) {
      milestone.needsClassPower = true;
      milestone.canTranscend = true;
    } else {
      milestone.needsClassPower = false;
      milestone.canTranscend = false;
    }
  }

  return milestone;
}

/**
 * Informações de perícias para a criação do agente em 5% NEX
 */
export function getClassSkillRules(
  className: string,
  intAttr: number
): {
  freeChoicesCount: number;
  mandatorySkills: string[];
  choiceGroups: Array<{ options: string[]; selectCount: number }>;
} {
  const norm = (className || '').toLowerCase();
  const intBonus = Math.max(0, intAttr);

  if (norm.includes('combatente')) {
    return {
      freeChoicesCount: 1 + intBonus,
      mandatorySkills: [],
      choiceGroups: [
        { options: ['Luta', 'Pontaria'], selectCount: 1 },
        { options: ['Fortitude', 'Reflexos'], selectCount: 1 },
      ],
    };
  }

  if (norm.includes('ocultista')) {
    return {
      freeChoicesCount: 3 + intBonus,
      mandatorySkills: ['Ocultismo', 'Vontade'],
      choiceGroups: [],
    };
  }

  if (norm.includes('sobrevivente')) {
    return {
      freeChoicesCount: 1 + intBonus,
      mandatorySkills: [],
      choiceGroups: [],
    };
  }

  // Especialista
  return {
    freeChoicesCount: 7 + intBonus,
    mandatorySkills: [],
    choiceGroups: [],
  };
}

/**
 * Retorna as perícias concedidas e escolhas extras de uma origem oficial.
 * Regra Oficial de Ordem Paranormal: Toda origem concede exatamente 2 perícias treinadas no total.
 * - Para 55 origens padrão: 2 perícias fixas identificadas no campo trainedSkills.
 * - Para Amnésico ("Duas à escolha do mestre"): 0 fixas, 2 escolhas livres extras.
 * - Para Profetizado ("Vontade e mais uma à sua escolha"): 1 fixa ('Vontade'), 1 escolha livre extra.
 * - Para Ferido por Ritual: 1 fixa ('Ocultismo'), 1 escolha livre extra.
 * - Para Treinado pela Hell Hunters: 0 fixas, 2 escolhas livres extras.
 */
export function getOriginSkillsInfo(trainedSkillsText?: string): {
  originGrantedSkills: string[];
  extraOriginChoices: number;
} {
  if (!trainedSkillsText) {
    return { originGrantedSkills: [], extraOriginChoices: 2 };
  }
  const text = trainedSkillsText;
  const list: string[] = [];
  for (const sk of OFFICIAL_SKILLS_LIST) {
    const regex = new RegExp(
      '(?:^|[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])' +
        sk.name +
        '(?:[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]|$)',
      'i'
    );
    if (regex.test(text)) {
      list.push(sk.name);
    }
  }

  if (list.length === 2) {
    return { originGrantedSkills: list, extraOriginChoices: 0 };
  }
  if (list.length === 1) {
    return { originGrantedSkills: list, extraOriginChoices: 1 };
  }
  if (list.length === 0) {
    return { originGrantedSkills: [], extraOriginChoices: 2 };
  }

  // Mais de 2 detectadas (origens com escolhas alternativas no texto de trainedSkills)
  if (
    text.toLowerCase().includes('ocultismo e 1 perícia') ||
    text.toLowerCase().includes('ocultismo e uma perícia')
  ) {
    return { originGrantedSkills: ['Ocultismo'], extraOriginChoices: 1 };
  }

  return { originGrantedSkills: [], extraOriginChoices: 2 };
}

export interface InitialSkillBudget {
  originGrantedSkills: string[];
  extraOriginChoices: number;
  effectiveMandatorySkills: string[];
  choiceGroups: Array<{ options: string[]; selectCount: number; isSatisfiedByOrigin: boolean }>;
  totalFreeChoices: number;
  totalTrainedExpected: number;
}

/**
 * Calcula o orçamento oficial de perícias na criação assistida em NEX 5%.
 * Garante que a soma total de perícias treinadas respeite exatamente as regras oficiais.
 */
export function calculateInitialSkillBudget(
  className: string,
  intAttr: number,
  originTrainedSkillsText?: string,
  groupExchanges?: Record<number, boolean>
): InitialSkillBudget {
  const { originGrantedSkills, extraOriginChoices } = getOriginSkillsInfo(originTrainedSkillsText);
  const classRules = getClassSkillRules(className, intAttr);

  const effectiveMandatorySkills = classRules.mandatorySkills.filter(
    (sk) => !originGrantedSkills.includes(sk)
  );
  const duplicateMandatoryCount = classRules.mandatorySkills.filter((sk) =>
    originGrantedSkills.includes(sk)
  ).length;

  let extraGroupChoices = 0;
  const choiceGroups = classRules.choiceGroups.map((grp, idx) => {
    const isSatisfiedByOrigin = grp.options.every((opt) => originGrantedSkills.includes(opt));
    if (isSatisfiedByOrigin || groupExchanges?.[idx]) {
      extraGroupChoices += 1;
    }
    return {
      options: grp.options,
      selectCount: grp.selectCount,
      isSatisfiedByOrigin,
    };
  });

  const totalFreeChoices =
    classRules.freeChoicesCount +
    extraOriginChoices +
    duplicateMandatoryCount +
    extraGroupChoices;

  const norm = (className || '').toLowerCase();
  const intVal = Math.max(0, intAttr);
  let classTotal = 7 + intVal;
  if (norm.includes('combatente')) {
    classTotal = 3 + intVal;
  } else if (norm.includes('ocultista')) {
    classTotal = 5 + intVal;
  } else if (norm.includes('sobrevivente')) {
    classTotal = 1 + intVal;
  }

  const totalTrainedExpected = 2 + classTotal;

  return {
    originGrantedSkills,
    extraOriginChoices,
    effectiveMandatorySkills,
    choiceGroups,
    totalFreeChoices,
    totalTrainedExpected,
  };
}

export interface PrereqContext {
  targetNex?: number;
  targetAttributes?: CharacterAttributes;
}

export interface PrerequisiteCheckResult {
  met: boolean;
  details: string;
  unmetDetails: string[];
}

function normalizePrereqStr(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function checkPrerequisiteClause(
  clause: string,
  character: CharacterSheet,
  getEntityById?: (id: string) => CompendiumEntity | undefined,
  context?: PrereqContext
): { met: boolean; details: string } {
  const c = clause.trim();
  const cNorm = normalizePrereqStr(c);
  if (!c || cNorm === 'nenhum' || cNorm === '—' || cNorm === '-') {
    return { met: true, details: 'Nenhum' };
  }

  // 1. Contagem de poderes paranormais: 'Morte 1', 'Sangue 2', 'Energia 1', 'Conhecimento 1'
  const elemMatch = c.match(/^(Conhecimento|Energia|Morte|Sangue)\s+(\d+)$/i);
  if (elemMatch) {
    const elemName = elemMatch[1];
    const needed = parseInt(elemMatch[2], 10);
    const normElem = normalizePrereqStr(elemName);
    let count = 0;
    const countedNames = new Set<string>();

    if (character.entityIds && Array.isArray(character.entityIds)) {
      for (const id of character.entityIds) {
        const ent = getEntityById ? getEntityById(id) : null;
        if (ent && ent.category === 'power') {
          if (normalizePrereqStr(ent.element).includes(normElem)) {
            countedNames.add(normalizePrereqStr(ent.name));
            count++;
          }
        } else if (!getEntityById && id.toLowerCase().includes(normElem)) {
          count++;
        }
      }
    }

    if (character.abilities && Array.isArray(character.abilities)) {
      for (const ab of character.abilities) {
        const abNormName = normalizePrereqStr(ab.name);
        if (ab.type === 'poder' && !countedNames.has(abNormName)) {
          if (normalizePrereqStr(ab.description + ' ' + (ab.originPage || '')).includes(normElem)) {
            countedNames.add(abNormName);
            count++;
          }
        }
      }
    }

    const met = count >= needed;
    return {
      met,
      details: met
        ? `Possui ${count}/${needed} poderes de ${elemName}`
        : `Requer ${needed} ${needed === 1 ? 'poder prévio' : 'poderes prévios'} de ${elemName} (possui ${count})`,
    };
  }

  // 2. NEX: 'NEX 30%', 'NEX 60%'
  const nexMatch = c.match(/NEX\s*(\d+)%/i);
  if (nexMatch) {
    const neededNex = parseInt(nexMatch[1], 10);
    const currNex = context?.targetNex ?? character.nex ?? 5;
    const met = currNex >= neededNex;
    return {
      met,
      details: met ? `NEX ${currNex}% >= ${neededNex}%` : `Requer NEX ${neededNex}% (atual: ${currNex}%)`,
    };
  }

  // 3. Atributo com 'ou': 'For 2 ou Agi 2', 'For 3 ou Vig 3'
  const attrOrMatch = c.match(/^(For|Agi|Int|Pre|Vig)\s*\+?(\d+)\s+ou\s+(For|Agi|Int|Pre|Vig)\s*\+?(\d+)$/i);
  if (attrOrMatch) {
    const a1 = attrOrMatch[1].toUpperCase() as keyof CharacterAttributes;
    const v1 = parseInt(attrOrMatch[2], 10);
    const a2 = attrOrMatch[3].toUpperCase() as keyof CharacterAttributes;
    const v2 = parseInt(attrOrMatch[4], 10);
    const attrs = context?.targetAttributes || character.attributes || { FOR: 1, AGI: 1, INT: 1, PRE: 1, VIG: 1 };
    const val1 = attrs[a1] ?? 0;
    const val2 = attrs[a2] ?? 0;
    const met = val1 >= v1 || val2 >= v2;
    return {
      met,
      details: met
        ? `${a1} ${val1} ou ${a2} ${val2}`
        : `Requer ${a1} ${v1} ou ${a2} ${v2} (atual: ${a1} ${val1}, ${a2} ${val2})`,
    };
  }

  // 4. Atributo simples: 'For 2', 'Int 2', 'For +2', 'Agi 3', 'Pre 2', 'Vig 2'
  const singleAttrMatch = c.match(/^(For|Agi|Int|Pre|Vig)\s*\+?(\d+)$/i);
  if (singleAttrMatch) {
    const a = singleAttrMatch[1].toUpperCase() as keyof CharacterAttributes;
    const v = parseInt(singleAttrMatch[2], 10);
    const attrs = context?.targetAttributes || character.attributes || { FOR: 1, AGI: 1, INT: 1, PRE: 1, VIG: 1 };
    const val = attrs[a] ?? 0;
    const met = val >= v;
    return {
      met,
      details: met ? `${a} ${val} >= ${v}` : `Requer ${a} ${v} (atual: ${val})`,
    };
  }

  // 5. Perícias: 'treinado em Luta', 'veterano em Medicina', 'treinado em Luta ou Pontaria'
  const skillMatch = c.match(/^(treinado|veterano|expert)\s+(?:em|na perícia)\s*(.*)$/i);
  if (skillMatch) {
    const levelStr = skillMatch[1].toLowerCase();
    const reqDegree = levelStr === 'veterano' ? 10 : levelStr === 'expert' ? 15 : 5;
    const skillTarget = (skillMatch[2] || '').trim();

    if (!skillTarget) {
      return { met: true, details: 'Treinado na perícia' };
    }

    const checkSkill = (skName: string) => {
      const norm = normalizePrereqStr(skName);
      for (const [key, val] of Object.entries(character.skills || {})) {
        if (normalizePrereqStr(key) === norm && (val.degree ?? 0) >= reqDegree) {
          return true;
        }
      }
      return false;
    };

    if (skillTarget.includes(' ou ')) {
      const parts = skillTarget.split(' ou ');
      const met = parts.some((p) => checkSkill(p));
      return {
        met,
        details: met ? `${skillMatch[1]} em ${skillTarget}` : `Requer ${skillMatch[1]} em ${skillTarget}`,
      };
    }

    if (skillTarget.includes(' e ')) {
      const parts = skillTarget.split(' e ');
      const met = parts.every((p) => checkSkill(p));
      return {
        met,
        details: met ? `${skillMatch[1]} em ${skillTarget}` : `Requer ${skillMatch[1]} em ${skillTarget}`,
      };
    }

    const met = checkSkill(skillTarget);
    return {
      met,
      details: met ? `${skillMatch[1]} em ${skillTarget}` : `Requer ${skillMatch[1]} em ${skillTarget}`,
    };
  }

  // 6. Rituais: 'conjurar ritual de 1° círculo', 'conjurar ritual de Sangue'
  if (cNorm.includes('conjurar ritual')) {
    let count = 0;
    let maxCircle = 0;
    let hasSangue = false;
    const isSangueReq = cNorm.includes('sangue');
    const circMatch = cNorm.match(/(\d+)[°º]\s*circulo/);
    const reqCircle = circMatch ? parseInt(circMatch[1], 10) : 1;

    if (character.entityIds && Array.isArray(character.entityIds)) {
      for (const id of character.entityIds) {
        const ent = getEntityById ? getEntityById(id) : null;
        if (ent && ent.category === 'ritual') {
          count++;
          if ((ent.circle || 1) > maxCircle) maxCircle = ent.circle || 1;
          if (normalizePrereqStr(ent.element).includes('sangue')) hasSangue = true;
        }
      }
    }
    if (character.abilities && Array.isArray(character.abilities)) {
      for (const ab of character.abilities) {
        if (ab.type === 'ritual') {
          count++;
          if (normalizePrereqStr(ab.description).includes('sangue')) hasSangue = true;
        }
      }
    }

    const met = isSangueReq ? hasSangue : count > 0 && maxCircle >= reqCircle;
    return {
      met,
      details: met ? 'Conjura rituais necessários' : `Requer ${c}`,
    };
  }

  // 7. Verificação por nome de poder/habilidade/recurso
  const hasNamed =
    (character.entityIds || []).some((id) => {
      const ent = getEntityById ? getEntityById(id) : null;
      return (
        ent &&
        (normalizePrereqStr(ent.name) === cNorm || normalizePrereqStr(ent.name).includes(cNorm))
      );
    }) ||
    (character.abilities || []).some((ab) => {
      const abNorm = normalizePrereqStr(ab.name);
      return abNorm === cNorm || abNorm.includes(cNorm);
    });

  return {
    met: hasNamed,
    details: hasNamed ? `Possui "${c}"` : `Requer "${c}"`,
  };
}

export function checkPrerequisite(
  prerequisite: string | undefined | null,
  character: CharacterSheet | null | undefined,
  getEntityById?: (id: string) => CompendiumEntity | undefined,
  context?: PrereqContext
): PrerequisiteCheckResult {
  if (
    !prerequisite ||
    prerequisite.trim() === '' ||
    prerequisite === 'Nenhum' ||
    prerequisite === '—' ||
    prerequisite === '-'
  ) {
    return { met: true, details: 'Nenhum', unmetDetails: [] };
  }

  if (!character) {
    return { met: true, details: 'Nenhum', unmetDetails: [] };
  }

  const clauses = prerequisite
    .split(/,(?![^(]*\))/)
    .map((cl) => cl.trim())
    .filter(Boolean);

  const results = clauses.map((cl) =>
    checkPrerequisiteClause(cl, character, getEntityById, context)
  );
  const met = results.every((r) => r.met);
  const unmetDetails = results.filter((r) => !r.met).map((r) => r.details);

  return {
    met,
    details: met ? 'Requisito atendido' : unmetDetails.join('; '),
    unmetDetails,
  };
}

/**
 * Exibe um alerta permissivo de pré-requisitos não atendidos ao selecionar ou vincular um elemento,
 * permitindo ao jogador escolher 'Adicionar mesmo assim' ou cancelar sem bloqueio forçado.
 */
export function confirmUnmetPrerequisites(
  entityName: string,
  unmetDetails: string[] | string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  const detailsStr = Array.isArray(unmetDetails) ? unmetDetails.join('\n• ') : unmetDetails;
  const message = `O agente atualmente não atende a todos os pré-requisitos para "${entityName}":\n\n• ${detailsStr}\n\nDeseja adicionar mesmo assim?`;

  confirmAction({
    title: 'Pré-requisitos Não Atendidos',
    message,
    confirmText: 'Adicionar mesmo assim',
    cancelText: 'Cancelar',
    destructive: false,
    onConfirm,
    onCancel,
  });
}

/**
 * Aplica a concessão canônica de perícia proveniente de habilidade de origem ou classe:
 * - Se a perícia não constar no registro ou for destreinada (degree === 0 ou undefined), torna-se Treinada (degree: 5),
 *   preservando qualquer bônus existente e customName.
 * - Se a perícia já for previamente treinada (degree >= 5, ex: 5, 10 ou 15), mantém o grau de treinamento
 *   (sem duplicar ou pular grau) e adiciona um bônus fixo de +2 (entry.bonus + 2), preservando customName.
 * - Retorna um clone raso imutável do objeto de perícias.
 */
export function applyCanonicalSkillGrant(
  skills: Record<string, CharacterSkillEntry>,
  skillName: string
): Record<string, CharacterSkillEntry> {
  const baseSkills = skills || {};
  const current = baseSkills[skillName];
  const currentDegree = current?.degree || 0;

  if (currentDegree === 0) {
    const updatedEntry: CharacterSkillEntry = {
      ...(current || {}),
      degree: 5,
      bonus: current?.bonus || 0,
    };
    return {
      ...baseSkills,
      [skillName]: updatedEntry,
    };
  }

  const updatedEntry: CharacterSkillEntry = {
    ...current,
    degree: current.degree,
    bonus: (current.bonus || 0) + 2,
  };
  return {
    ...baseSkills,
    [skillName]: updatedEntry,
  };
}

/**
 * Extrai as perícias canônicas concedidas passivamente pelo texto/nome de uma habilidade
 * de origem, classe, trilha ou poder.
 */
export function extractCanonicalSkillGrants(
  description?: string,
  abilityName?: string,
  currentSkills?: Record<string, CharacterSkillEntry>
): string[] {
  if (!description && !abilityName) return [];
  const cleanDesc = (description || '').replace(/\s+/g, ' ').trim();
  if (!cleanDesc) return [];

  const granted: string[] = [];
  const sentences = cleanDesc.split(/(?<=[.!?\n])\s+/);

  for (const sentence of sentences) {
    const sLower = sentence.toLowerCase();
    // Ignorar habilidades temporárias ativadas por gasto de PE ou limitadas à cena
    if (
      sLower.includes('gastar') ||
      sLower.includes('gaste') ||
      sLower.includes('até o fim da cena') ||
      sLower.includes('até o final da cena') ||
      sLower.includes('próximo teste')
    ) {
      continue;
    }

    // 1. Escolha entre duas perícias (ex: "Escolha uma perícia entre Diplomacia ou Enganação. Você recebe treinamento",
    //    ou "Você recebe treinamento em Pilotagem ou Tecnologia (escolha uma)")
    const matchedInSentence = OFFICIAL_SKILLS_LIST.filter((sk) => {
      const rx = new RegExp(
        `(?:^|[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])${sk.name}(?:[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]|$)`,
        'i'
      );
      return rx.test(sentence);
    });

    if (
      matchedInSentence.length === 2 &&
      (sLower.includes('recebe treinamento') ||
        sLower.includes('escolha uma perícia entre') ||
        sLower.includes('escolha uma)'))
    ) {
      const [optA, optB] = matchedInSentence;
      if (currentSkills) {
        const degA = currentSkills[optA.name]?.degree || 0;
        const degB = currentSkills[optB.name]?.degree || 0;
        if (degA === 0 && degB > 0) {
          if (!granted.includes(optA.name)) granted.push(optA.name);
        } else if (degB === 0 && degA > 0) {
          if (!granted.includes(optB.name)) granted.push(optB.name);
        } else {
          if (!granted.includes(optA.name)) granted.push(optA.name);
        }
      } else {
        if (!granted.includes(optA.name)) granted.push(optA.name);
      }
      continue;
    }

    // 2. Concessão direta de treinamento em perícia única ("Você recebe treinamento em X")
    for (const sk of OFFICIAL_SKILLS_LIST) {
      const trainRx = new RegExp(
        `(?:recebe|ganha|concede|torna-se)\\s+(?:treinamento\\s+(?:em|na\\s+per[íi]cia)|treinado\\s+(?:em|na\\s+per[íi]cia))\\s+${sk.name}(?:[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]|$)`,
        'i'
      );
      const bonusRx = new RegExp(
        `(?:você\\s+recebe|recebe)\\s+\\+2\\s+em\\s+${sk.name}(?:\\s*\\([^)]+\\))?\\s*[.,;]`,
        'i'
      );
      if (trainRx.test(sentence) || bonusRx.test(sentence)) {
        if (!granted.includes(sk.name)) {
          granted.push(sk.name);
        }
      }
    }
  }

  // Caso em que "Escolha uma perícia entre X ou Y." está na primeira frase e "Você recebe treinamento na perícia escolhida" na segunda
  if (
    granted.length === 0 &&
    /escolha\s+uma\s+per[íi]cia\s+entre/i.test(cleanDesc) &&
    /recebe\s+treinamento\s+na\s+per[íi]cia\s+escolhida/i.test(cleanDesc)
  ) {
    const choiceMatch = cleanDesc.match(
      /escolha\s+uma\s+per[íi]cia\s+entre\s+([^.]+)/i
    );
    if (choiceMatch) {
      const opts = OFFICIAL_SKILLS_LIST.filter((sk) =>
        new RegExp(sk.name, 'i').test(choiceMatch[1])
      );
      if (opts.length >= 2) {
        const [optA, optB] = opts;
        if (currentSkills) {
          const degA = currentSkills[optA.name]?.degree || 0;
          const degB = currentSkills[optB.name]?.degree || 0;
          if (degA === 0 && degB > 0) {
            granted.push(optA.name);
          } else if (degB === 0 && degA > 0) {
            granted.push(optB.name);
          } else {
            granted.push(optA.name);
          }
        } else {
          granted.push(optA.name);
        }
      }
    }
  }

  return granted;
}


/**
 * Avalia os pré-requisitos de um ritual (círculo máximo de acesso e pré-requisitos descritivos):
 * - Se (ritual.circle || 1) > maxCircle, registra pendência de círculo:
 *   "Requer acesso a rituais de Xº círculo (atual: Yº círculo)".
 * - Se ritual.prerequisite estiver preenchido, avalia checkPrerequisite e mescla as pendências.
 * - Retorna { met: boolean, details: string, unmetDetails: string[] }.
 */
export function checkRitualPrerequisites(
  ritual: { circle?: number; prerequisite?: string; name?: string },
  character: Character | null | undefined,
  maxCircle: number,
  getEntityById?: (id: string) => CompendiumEntity | undefined,
  context?: PrereqContext
): { met: boolean; details: string; unmetDetails: string[] } {
  const unmetDetails: string[] = [];
  const requiredCircle = ritual.circle || 1;

  if (requiredCircle > maxCircle) {
    unmetDetails.push(
      `Requer acesso a rituais de ${requiredCircle}º círculo (atual: ${maxCircle}º círculo)`
    );
  }

  if (ritual.prerequisite) {
    const prereqRes = checkPrerequisite(
      ritual.prerequisite,
      character,
      getEntityById,
      context
    );
    if (!prereqRes.met) {
      if (prereqRes.unmetDetails && prereqRes.unmetDetails.length > 0) {
        unmetDetails.push(...prereqRes.unmetDetails);
      } else if (prereqRes.details) {
        unmetDetails.push(prereqRes.details);
      }
    }
  }

  const met = unmetDetails.length === 0;
  return {
    met,
    details: met ? 'Requisitos atendidos' : unmetDetails.join('; '),
    unmetDetails,
  };
}

