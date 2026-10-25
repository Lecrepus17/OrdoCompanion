import { ParanormalElement, WeaponModificationDef } from '../types/compendium';

export const OFFICIAL_WEAPON_MODS: WeaponModificationDef[] = [
  // --- Modificações do Livro Base ---
  {
    id: 'mira_laser',
    name: 'Mira Laser',
    categoryIncrease: 1,
    description: 'Reduz a margem de ameaça de acerto crítico em –1 (ex.: 19 vira 18) e concede +2 em Pontaria.',
    appliesTo: 'firearm',
    criticalRangeReduction: 1,
    attackBonus: 2,
    source: 'Livro Base',
  },
  {
    id: 'perigosa',
    name: 'Perigosa',
    categoryIncrease: 1,
    description: 'Aumenta a margem de ameaça de acerto crítico em +2 (ou seja, reduz o dado necessário em –2, ex.: 20 vira 18, 19 vira 17).',
    appliesTo: 'all',
    criticalRangeReduction: 2,
    source: 'Livro Base',
  },
  {
    id: 'certeira',
    name: 'Certeira',
    categoryIncrease: 1,
    description: 'Concede +2 em testes de ataque realizados com a arma.',
    appliesTo: 'all',
    attackBonus: 2,
    source: 'Livro Base',
  },
  {
    id: 'calibre_grosso',
    name: 'Calibre Grosso',
    categoryIncrease: 1,
    description: 'Aumenta o dano da arma em um passo (ex.: 1d8 vira 1d10, 2d10 vira 2d12).',
    appliesTo: 'firearm',
    damageStepIncrease: 1,
    source: 'Livro Base',
  },
  {
    id: 'cruel',
    name: 'Cruel',
    categoryIncrease: 1,
    description: 'Concede +2 em todas as rolagens de dano com a arma.',
    appliesTo: 'all',
    damageBonus: 2,
    source: 'Livro Base',
  },
  {
    id: 'mira_telescopica',
    name: 'Mira Telescópica',
    categoryIncrease: 1,
    description: 'Aumenta o alcance da arma em uma categoria (ex.: Médio vira Longo) e mirar se torna uma ação de movimento.',
    appliesTo: 'ranged',
    rangeStepIncrease: 1,
    source: 'Livro Base',
  },
  {
    id: 'silenciador',
    name: 'Silenciador',
    categoryIncrease: 1,
    description: 'Amortece o som do disparo. O teste de Percepção para ouvir o disparo sofre –5 de penalidade.',
    appliesTo: 'firearm',
    source: 'Livro Base',
  },
  {
    id: 'compensador',
    name: 'Compensador',
    categoryIncrease: 1,
    description: 'Reduz o recuo da arma, diminuindo a penalidade de ataque em rajada/automático.',
    appliesTo: 'firearm',
    source: 'Livro Base',
  },
  {
    id: 'discreta',
    name: 'Discreta',
    categoryIncrease: 1,
    description: 'Ocupa –1 espaço (mínimo 1) e concede +5 em testes de Furtividade/Crime para ocultar a arma.',
    appliesTo: 'all',
    spacesChange: -1,
    source: 'Livro Base',
  },
  {
    id: 'equilibrada',
    name: 'Equilibrada',
    categoryIncrease: 1,
    description: 'Concede +2 em testes de manobra de combate com a arma.',
    appliesTo: 'melee',
    source: 'Livro Base',
  },
  {
    id: 'leve',
    name: 'Leve',
    categoryIncrease: 1,
    description: 'Reduz o peso da arma, diminuindo em –1 o espaço ocupado (mínimo 1) e penalidades de carga.',
    appliesTo: 'all',
    spacesChange: -1,
    source: 'Livro Base',
  },
  {
    id: 'tatica',
    name: 'Tática',
    categoryIncrease: 1,
    description: 'Pode ser sacada ou guardada como uma ação livre em combate.',
    appliesTo: 'all',
    source: 'Livro Base',
  },

  // --- Modificações Sobrevivendo ao Horror ---
  {
    id: 'alongada',
    name: 'Alongada / Cano Longo',
    categoryIncrease: 1,
    description: 'Aumenta o alcance da arma de fogo em uma categoria de distância.',
    appliesTo: 'firearm',
    rangeStepIncrease: 1,
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'carregador_rapido',
    name: 'Carregador Rápido',
    categoryIncrease: 1,
    description: 'Recarregar a arma se torna uma ação livre ao invés de ação de movimento.',
    appliesTo: 'firearm',
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'carregador_expandido',
    name: 'Carregador Expandido',
    categoryIncrease: 1,
    description: 'Dobra a quantidade de munição antes de necessitar de recarga.',
    appliesTo: 'firearm',
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'mira_termica',
    name: 'Mira Térmica',
    categoryIncrease: 1,
    description: 'Combina visão infravermelha. Você ignora qualquer camuflagem ou escuridão ao disparar.',
    appliesTo: 'firearm',
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'municao_dumdum',
    name: 'Munição Dum-Dum',
    categoryIncrease: 1,
    description: 'Projéteis expansivos que aumentam o multiplicador de crítico em +1 (ex.: x2 vira x3, x3 vira x4).',
    appliesTo: 'firearm',
    criticalMultiplierIncrease: 1,
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'municao_perfurante',
    name: 'Munição Perfurante',
    categoryIncrease: 1,
    description: 'Projéteis de alta penetração que ignoram até 5 pontos de Resistência a Dano (RD) do alvo.',
    appliesTo: 'firearm',
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'municao_explosiva',
    name: 'Munição Explosiva',
    categoryIncrease: 1,
    description: 'Deteriora a blindagem do alvo e causa dano de impacto em raio curto.',
    appliesTo: 'firearm',
    source: 'Sobrevivendo ao Horror',
  },

  // --- Maldições Paranormais (Elementais) ---
  {
    id: 'maldicao_carniceira',
    name: 'Maldição: Carniceira',
    categoryIncrease: 1,
    description: 'Multiplicador de crítico aumenta em +1 (ex.: x2 vira x3). Em acerto crítico, recupera PV igual ao dano do crítico.',
    appliesTo: 'all',
    criticalMultiplierIncrease: 1,
    element: 'Sangue',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_hemofagica',
    name: 'Maldição: Hemofágica',
    categoryIncrease: 1,
    description: 'Causa +1d6 pontos de dano de Sangue e cura o agente em metade do dano bônus causado.',
    appliesTo: 'all',
    element: 'Sangue',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_vibrante',
    name: 'Maldição: Vibrante',
    categoryIncrease: 1,
    description: 'Uma vez por rodada, gastando 2 PE, você pode fazer um ataque adicional como uma ação livre.',
    appliesTo: 'all',
    element: 'Sangue',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_sanguinaria',
    name: 'Maldição: Sanguinária',
    categoryIncrease: 1,
    description: 'Seus golpes dilaceram a carne, infligindo sangramento contínuo que enfraquece a criatura.',
    appliesTo: 'all',
    element: 'Sangue',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_consumidora',
    name: 'Maldição: Consumidora',
    categoryIncrease: 1,
    description: 'Causa +1d6 pontos de dano de Morte e deteriora a matéria orgânica e vitalidade da vítima.',
    appliesTo: 'all',
    element: 'Morte',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_decadente',
    name: 'Maldição: Decadente',
    categoryIncrease: 1,
    description: 'Você pode canalizar a espiral de decomposição do ritual Decadência diretamente através do ataque da arma.',
    appliesTo: 'all',
    element: 'Morte',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_velocidade',
    name: 'Maldição: Velocidade',
    categoryIncrease: 1,
    description: 'Acelera a sua percepção temporal, concedendo +1 ação de movimento adicional em cada rodada.',
    appliesTo: 'all',
    element: 'Morte',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_ritualistica',
    name: 'Maldição: Ritualística',
    categoryIncrease: 1,
    description: 'Permite armazenar um ritual de até 2º círculo na arma para ser disparado automaticamente no primeiro acerto.',
    appliesTo: 'all',
    element: 'Conhecimento',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_sadica',
    name: 'Maldição: Sádica',
    categoryIncrease: 1,
    description: 'A cada dano massivo ou ferimento sofrido pelo portador na cena, a arma acumula poder concedendo +1d6 no dano.',
    appliesTo: 'all',
    element: 'Conhecimento',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_ligeira',
    name: 'Maldição: Ligeira',
    categoryIncrease: 1,
    description: 'O conhecimento sussurra as ações futuras dos inimigos, concedendo +5 em testes de Iniciativa.',
    appliesTo: 'all',
    element: 'Conhecimento',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_energetica',
    name: 'Maldição: Energética',
    categoryIncrease: 1,
    description: 'Concede +5 em testes de ataque, todo o dano da arma se torna do tipo Energia pura e ignora qualquer Resistência a Dano (RD)!',
    appliesTo: 'all',
    attackBonus: 5,
    element: 'Energia',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_faisca',
    name: 'Maldição: Faísca / Eletrocutante',
    categoryIncrease: 1,
    description: 'Descarrega arcos elétricos caóticos, causando +1d6 de dano adicional de Choque/Energia.',
    appliesTo: 'all',
    element: 'Energia',
    source: 'Livro Base',
  },
];

const DAMAGE_STEPS = [
  '1d3',
  '1d4',
  '1d6',
  '1d8',
  '1d10',
  '1d12',
  '2d8',
  '2d10',
  '2d12',
  '4d8',
  '4d10',
  '4d12',
];

const RANGE_STEPS = ['Corpo a corpo', 'Curto', 'Médio', 'Longo', 'Extremo'];

export function parseCritical(critStr: string): { threat: number; mult: number } {
  if (!critStr) return { threat: 20, mult: 2 };
  const clean = critStr.trim().toLowerCase();

  // Pattern: "19/x3", "18/x2", "20/x4", "x3", "19", "18"
  if (clean.includes('/')) {
    const [tPart, mPart] = clean.split('/');
    const t = parseInt(tPart.replace(/\D/g, ''), 10) || 20;
    const m = parseInt(mPart.replace(/\D/g, ''), 10) || 2;
    return { threat: Math.min(20, Math.max(12, t)), mult: Math.max(2, m) };
  }

  if (clean.startsWith('x')) {
    const m = parseInt(clean.replace(/\D/g, ''), 10) || 2;
    return { threat: 20, mult: Math.max(2, m) };
  }

  const num = parseInt(clean.replace(/\D/g, ''), 10);
  if (!isNaN(num) && num > 1) {
    if (num <= 5) {
      return { threat: 20, mult: num };
    }
    return { threat: Math.min(20, Math.max(12, num)), mult: 2 };
  }

  return { threat: 20, mult: 2 };
}

export function formatCritical(threat: number, mult: number): string {
  if (threat >= 20 && mult <= 2) {
    return '20/x2';
  }
  if (threat >= 20) {
    return `x${mult}`;
  }
  return `${threat}/x${mult}`;
}

export function stepUpDamage(damageStr: string, steps: number): string {
  if (!damageStr || steps <= 0) return damageStr;

  // Extract base dice and existing modifier, e.g. "2d10+2" -> dice: "2d10", mod: "+2"
  const match = damageStr.trim().match(/^(\d+d\d+)(.*)$/i);
  if (!match) return damageStr;

  const baseDice = match[1].toLowerCase();
  const rest = match[2];

  const idx = DAMAGE_STEPS.indexOf(baseDice);
  if (idx !== -1) {
    const nextIdx = Math.min(DAMAGE_STEPS.length - 1, idx + steps);
    return `${DAMAGE_STEPS[nextIdx]}${rest}`;
  }

  // Fallback: if not in exact step list, increase dice count or size
  if (baseDice.startsWith('1d')) {
    const size = parseInt(baseDice.replace('1d', ''), 10);
    return `1d${size + 2 * steps}${rest}`;
  } else if (baseDice.startsWith('2d')) {
    const size = parseInt(baseDice.replace('2d', ''), 10);
    return `2d${size + 2 * steps}${rest}`;
  }

  return damageStr;
}

export function stepUpRange(rangeStr: string, steps: number): string {
  if (!rangeStr || steps <= 0) return rangeStr;
  const current = rangeStr.trim();
  const idx = RANGE_STEPS.findIndex((r) => r.toLowerCase() === current.toLowerCase());
  if (idx === -1) {
    return current;
  }
  const nextIdx = Math.min(RANGE_STEPS.length - 1, idx + steps);
  return RANGE_STEPS[nextIdx];
}

export function categoryToNumber(catStr: string): number {
  const c = (catStr || '').trim().toUpperCase();
  if (c === '0' || c === '—' || c === '-') return 0;
  if (c === 'I' || c === '1') return 1;
  if (c === 'II' || c === '2') return 2;
  if (c === 'III' || c === '3') return 3;
  if (c === 'IV' || c === '4') return 4;
  return 1;
}

export function numberToCategory(num: number): string {
  if (num <= 0) return '0';
  if (num === 1) return 'I';
  if (num === 2) return 'II';
  if (num === 3) return 'III';
  if (num === 4) return 'IV';
  return `IV (+${num - 4})`;
}

export function calculateWeaponStats(
  base: {
    damage: string;
    critical: string;
    range: string;
    spaces: number;
    category: string;
    damageType: string;
    element?: ParanormalElement;
  },
  selectedModIds: string[],
  customMods: Array<{ name: string; effect: string; categoryIncrease: number }> = []
) {
  const chosenDefs = OFFICIAL_WEAPON_MODS.filter((m) => selectedModIds.includes(m.id));

  // Category calculation
  let catNum = categoryToNumber(base.category);
  for (const m of chosenDefs) {
    catNum += m.categoryIncrease || 1;
  }
  for (const cm of customMods) {
    catNum += cm.categoryIncrease || 1;
  }
  const finalCategory = numberToCategory(catNum);

  // Critical calculation
  const parsedCrit = parseCritical(base.critical);
  let finalThreat = parsedCrit.threat;
  let finalMult = parsedCrit.mult;

  for (const m of chosenDefs) {
    if (m.criticalRangeReduction) {
      finalThreat -= m.criticalRangeReduction;
    }
    if (m.criticalMultiplierIncrease) {
      finalMult += m.criticalMultiplierIncrease;
    }
  }
  finalThreat = Math.max(10, finalThreat);
  const finalCritical = formatCritical(finalThreat, finalMult);

  // Damage calculation
  let damageStepTotal = 0;
  let damageBonusTotal = 0;
  let extraDamageDiceText = '';

  for (const m of chosenDefs) {
    if (m.damageStepIncrease) damageStepTotal += m.damageStepIncrease;
    if (m.damageBonus) damageBonusTotal += m.damageBonus;
    if (m.id === 'maldicao_hemofagica') extraDamageDiceText += ' + 1d6 Sangue';
    if (m.id === 'maldicao_consumidora') extraDamageDiceText += ' + 1d6 Morte';
    if (m.id === 'maldicao_faisca') extraDamageDiceText += ' + 1d6 Energia';
    if (m.id === 'municao_explosiva') extraDamageDiceText += ' + 2d6 Fogo/Impacto';
  }

  let finalDamage = stepUpDamage(base.damage, damageStepTotal);
  if (damageBonusTotal > 0) {
    finalDamage = `${finalDamage}+${damageBonusTotal}`;
  }
  if (extraDamageDiceText) {
    finalDamage = `${finalDamage}${extraDamageDiceText}`;
  }

  // Attack test bonus
  let attackBonus = 0;
  for (const m of chosenDefs) {
    if (m.attackBonus) attackBonus += m.attackBonus;
  }

  // Range calculation
  let rangeSteps = 0;
  for (const m of chosenDefs) {
    if (m.rangeStepIncrease) rangeSteps += m.rangeStepIncrease;
  }
  const finalRange = stepUpRange(base.range, rangeSteps);

  // Spaces calculation
  let finalSpaces = base.spaces;
  for (const m of chosenDefs) {
    if (m.spacesChange) finalSpaces += m.spacesChange;
  }
  finalSpaces = Math.max(1, finalSpaces);

  // Element
  let element: ParanormalElement = base.element || 'Nenhum';
  for (const m of chosenDefs) {
    if (m.element && m.element !== 'Nenhum') {
      element = m.element;
    }
  }

  // Special rules summary
  const specialParts: string[] = [];
  if (base.damageType) specialParts.push(`Tipo: ${base.damageType}`);
  if (element !== 'Nenhum') specialParts.push(`Elemento: ${element}`);
  for (const m of chosenDefs) {
    specialParts.push(`${m.name}: ${m.description}`);
  }
  for (const cm of customMods) {
    specialParts.push(`${cm.name}: ${cm.effect}`);
  }

  return {
    finalDamage,
    finalCritical,
    finalRange,
    finalCategory,
    finalSpaces,
    attackBonus,
    damageBonus: damageBonusTotal,
    element,
    specialRules: specialParts.join(' • '),
  };
}
