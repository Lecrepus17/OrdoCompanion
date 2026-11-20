/**
 * protections.ts - Regras canônicas de Proteções e Escudos no Ordem Paranormal RPG v1.1
 * 
 * Livro Base p. 64 (Tabela 3.6 e Tabela 3.7) e suplementos oficiais.
 */

export interface DamageReduction {
  physical?: number;
  ballistic?: number;
  cutting?: number;
  impact?: number;
  piercing?: number;
  description: string;
}

export interface ProtectionItem {
  id: string;
  name: string;
  type: 'Leve' | 'Pesada' | 'Escudo';
  defenseBonus: number;
  damageReduction?: DamageReduction;
  spaces: number;
  category: '0' | 'I' | 'II' | 'III' | 'IV';
  armorPenalty?: number; // -5 para proteção pesada em Acrobacia, Crime, Furtividade
  requiredProficiency: 'Proteções Leves' | 'Proteções Pesadas';
  description?: string;
}

export interface ProtectionModification {
  id: string;
  name: string;
  defenseBonus?: number;
  damageReductionPhysical?: number;
  spacesChange?: number;
  categoryIncrease: number;
  allowedArmorTypes: ('Leve' | 'Pesada' | 'Escudo')[];
  incompatibleWith?: string[];
  description: string;
}

export interface ProtectionCurse {
  id: string;
  name: string;
  element: 'Conhecimento' | 'Energia' | 'Morte' | 'Sangue';
  defenseBonus?: number;
  rdGeneralLightOrShield?: number;
  rdGeneralHeavy?: number;
  rdElement?: { element: string; value: number };
  description: string;
}

export const OFFICIAL_PROTECTIONS: ProtectionItem[] = [
  {
    id: 'item__livro_base__protecao_leve',
    name: 'Proteção Leve',
    type: 'Leve',
    defenseBonus: 5,
    spaces: 2,
    category: 'I',
    requiredProficiency: 'Proteções Leves',
    description: 'Jaqueta de couro pesada ou um colete de kevlar. Fornece +5 de Defesa.',
  },
  {
    id: 'item__livro_base__protecao_pesada',
    name: 'Proteção Pesada',
    type: 'Pesada',
    defenseBonus: 10,
    damageReduction: {
      physical: 2,
      description: 'RD 2 contra Balístico, Corte, Impacto e Perfuração',
    },
    spaces: 5,
    category: 'II',
    armorPenalty: -5,
    requiredProficiency: 'Proteções Pesadas',
    description:
      'Colete tático de kevlar reforçado, ombreiras, joelheiras e capacete. Fornece +10 Defesa, RD 2 física, mas impõe -5 em perícias que sofrem penalidade de carga.',
  },
  {
    id: 'item__livro_base__escudo',
    name: 'Escudo',
    type: 'Escudo',
    defenseBonus: 2,
    spaces: 2,
    category: '0',
    requiredProficiency: 'Proteções Pesadas',
    description:
      'Escudo medieval ou de tropa de choque moderna. Fornece +2 Defesa e conta como proteção pesada para proficiência. Empunhado em uma mão.',
  },
  {
    id: 'item__arquivos_secretos_09__capacete_tatico',
    name: 'Capacete Tático',
    type: 'Pesada',
    defenseBonus: 0,
    spaces: 1,
    category: 'II',
    requiredProficiency: 'Proteções Pesadas',
    description:
      'Capacete balístico com comunicador. Conta como proteção pesada vestida. Fortificação 25% (ignora acertos críticos e ataques furtivos em 1 em 1d4).',
  },
  {
    id: 'item__arquivos_secretos_09__escudo_balistico_led',
    name: 'Escudo Balístico LED',
    type: 'Escudo',
    defenseBonus: 2,
    damageReduction: {
      ballistic: 10,
      description: 'RD Balístico 10',
    },
    spaces: 2,
    category: 'II',
    requiredProficiency: 'Proteções Pesadas',
    description:
      'Escudo tático com lanterna LED e visor balístico reforçado. Fornece +2 Defesa, RD Balístico 10 e conta como proteção pesada. Empunhado em uma mão.',
  },
];

export const OFFICIAL_PROTECTION_MODIFICATIONS: ProtectionModification[] = [
  {
    id: 'mod__reforcada',
    name: 'Reforçada',
    defenseBonus: 2,
    spacesChange: 1,
    categoryIncrease: 1,
    allowedArmorTypes: ['Leve', 'Pesada', 'Escudo'],
    incompatibleWith: ['Discreta'],
    description: 'Placas adicionais aumentam a proteção (+2 Defesa, +1 Espaço, +I Categoria).',
  },
  {
    id: 'mod__blindada',
    name: 'Blindada',
    damageReductionPhysical: 5,
    spacesChange: 1,
    categoryIncrease: 1,
    allowedArmorTypes: ['Pesada'],
    description: 'Camadas extras de cerâmica e aramida elevam a RD física para 5 (+1 Espaço, +I Categoria).',
  },
  {
    id: 'mod__antibombas',
    name: 'Antibombas',
    categoryIncrease: 1,
    allowedArmorTypes: ['Pesada'],
    description: 'Reforço contra estilhaços e calor (+5 em testes de resistência contra efeitos de área, +I Categoria).',
  },
  {
    id: 'mod__discreta',
    name: 'Discreta',
    spacesChange: -1,
    categoryIncrease: 1,
    allowedArmorTypes: ['Leve'],
    incompatibleWith: ['Reforçada'],
    description: 'Disfarçada sob roupas comuns (-1 Espaço, mínimo 1; +5 em testes de Crime para ocultar, +I Categoria).',
  },
];

/**
 * Maldições oficiais para Proteções e Escudos (Livro Base p. 156-157).
 * Regra canônica (p. 154): 1ª maldição aumenta a categoria em +II; subsequentes em +I.
 */
export const OFFICIAL_PROTECTION_CURSES: ProtectionCurse[] = [
  {
    id: 'curse__prot_abascanta',
    name: 'Abascanta',
    element: 'Conhecimento',
    description:
      '+5 em testes de resistência contra rituais. 1x por cena, gaste uma reação e PE igual ao custo de um ritual que o tenha como alvo para refleti-lo de volta ao conjurador.',
  },
  {
    id: 'curse__prot_profetica',
    name: 'Profética',
    element: 'Conhecimento',
    rdElement: { element: 'Conhecimento', value: 10 },
    description:
      'Resistência a Conhecimento 10. Ao fazer um teste de resistência, você pode gastar 2 PE para rolá-lo novamente.',
  },
  {
    id: 'curse__prot_sombria',
    name: 'Sombria',
    element: 'Conhecimento',
    description:
      '+5 em Furtividade e ignora penalidade de carga nessa perícia. Ação de movimento + 1 PE disfarça a proteção como roupa comum mantendo suas propriedades.',
  },
  {
    id: 'curse__prot_cinetica',
    name: 'Cinética',
    element: 'Energia',
    defenseBonus: 2,
    rdGeneralLightOrShield: 2,
    rdGeneralHeavy: 5,
    description:
      'Barreira invisível que concede +2 em Defesa e RD 2 (proteção leve/escudo) ou RD 5 (proteção pesada).',
  },
  {
    id: 'curse__prot_lepida',
    name: 'Lépida',
    element: 'Energia',
    description:
      '+10 em Atletismo e +3m de deslocamento. Gastando 2 PE até o fim do turno, ignora terreno difícil, ganha escalada igual ao deslocamento e imunidade a queda de até 9m.',
  },
  {
    id: 'curse__prot_voltaica',
    name: 'Voltaica',
    element: 'Energia',
    rdElement: { element: 'Energia', value: 10 },
    description:
      'Resistência a Energia 10. Ação de movimento + 2 PE emite arcos elétricos até o fim da cena, causando 2d6 de Energia no fim dos seus turnos em seres adjacentes.',
  },
  {
    id: 'curse__prot_letargica',
    name: 'Letárgica',
    element: 'Morte',
    defenseBonus: 2,
    description:
      '+2 em Defesa e 25% de chance (leve/escudo) ou 50% de chance (pesada) de ignorar o dano extra de acertos críticos e ataques furtivos.',
  },
  {
    id: 'curse__prot_repulsiva',
    name: 'Repulsiva',
    element: 'Morte',
    rdElement: { element: 'Morte', value: 10 },
    description:
      'Resistência a Morte 10. Ação de movimento + 2 PE cobre seu corpo com Lodo preto até o fim da cena: quem atacar você corpo a corpo sofre 2d8 de dano de Morte.',
  },
  {
    id: 'curse__prot_regenerativa',
    name: 'Regenerativa',
    element: 'Sangue',
    rdElement: { element: 'Sangue', value: 10 },
    description:
      'Resistência a Sangue 10. Ação de movimento + 1 PE para recuperar 1d12 pontos de vida.',
  },
  {
    id: 'curse__prot_sadica',
    name: 'Sádica',
    element: 'Sangue',
    description:
      'No início de seu turno, recebe +1 em testes de ataque e rolagens de dano para cada 10 pontos de dano sofridos desde o fim do seu último turno.',
  },
];

const ELEMENT_OPPRESSOR_PAIRS: ReadonlyArray<[string, string]> = [
  ['sangue', 'conhecimento'],
  ['conhecimento', 'energia'],
  ['energia', 'morte'],
  ['morte', 'sangue'],
];

/**
 * Verifica se dois elementos possuem relação de opressão mútua (Livro Base p. 111 / p. 154).
 */
export function areElementsIncompatible(elA?: string | null, elB?: string | null): boolean {
  const norm = (s?: string | null) =>
    (s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const a = norm(elA);
  const b = norm(elB);
  if (!a || !b || a === 'nenhum' || b === 'nenhum' || a === 'variavel' || b === 'variavel' || a === 'medo' || b === 'medo') {
    return false;
  }
  if (a === b) return false;
  return ELEMENT_OPPRESSOR_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a)
  );
}

/**
 * Regra canônica (Livro Base p. 154):
 * A 1ª maldição aumenta a categoria em +2; cada maldição subsequente aumenta em +1.
 */
export function calculateCurseCategoryIncrease(curseCount: number): number {
  if (curseCount <= 0) return 0;
  return 2 + (curseCount - 1);
}

export function findProtectionCurse(nameOrId: string): ProtectionCurse | undefined {
  const clean = (nameOrId || '').trim().toLowerCase();
  return OFFICIAL_PROTECTION_CURSES.find(
    (c) => c.id.toLowerCase() === clean || c.name.toLowerCase() === clean
  );
}

/**
 * Formata um dicionário de resistências a dano (RD) em string canônica.
 * Ex: { 'Balístico': 2, 'Corte': 2, 'Impacto': 2, 'Perfuração': 2 } => "Balístico 2, Corte 2, Impacto 2, Perfuração 2"
 */
export function formatDamageResistances(resistances: Record<string, number>): string {
  if (!resistances || Object.keys(resistances).length === 0) return '';

  const canonicalOrder = [
    'Geral',
    'Balístico',
    'Corte',
    'Impacto',
    'Perfuração',
    'Eletricidade',
    'Fogo',
    'Frio',
    'Químico',
    'Mental',
    'Sangue',
    'Morte',
    'Conhecimento',
    'Energia',
    'Medo',
  ];

  const presentKeys = Object.keys(resistances).filter((k) => resistances[k] > 0);
  if (presentKeys.length === 0) return '';

  const orderedKeys = [
    ...canonicalOrder.filter((k) => presentKeys.includes(k)),
    ...presentKeys.filter((k) => !canonicalOrder.includes(k)).sort(),
  ];

  return orderedKeys.map((k) => `${k} ${resistances[k]}`).join(', ');
}

export interface EquippedProtectionsResult {
  totalDefenseEquip: number;
  resistancesText: string;
  protectionText: string;
  totalSpaces: number;
  armorPenalty: number;
  appliedCurses?: string[];
}

/**
 * Calcula os atributos combinados de uma proteção corporal, escudo, modificações e maldições equipadas.
 */
export function calculateEquippedProtections(
  bodyArmor?: ProtectionItem | null,
  shield?: ProtectionItem | null,
  modifications: string[] = [],
  curses: string[] = [],
  shieldCurses: string[] = []
): EquippedProtectionsResult {
  let totalDefenseEquip = 0;
  let totalSpaces = 0;
  let armorPenalty = 0;
  const resistances: Record<string, number> = {};
  const protectionParts: string[] = [];

  const normalizedMods = (modifications || []).map((m) => m.trim().toLowerCase());
  const isReforcada = normalizedMods.includes('reforçada') || normalizedMods.includes('reforcada');
  const isBlindada = normalizedMods.includes('blindada');
  const isAntibombas = normalizedMods.includes('antibombas');
  const isDiscreta = normalizedMods.includes('discreta');

  const resolveCurseList = (rawList: string[]): ProtectionCurse[] => {
    const out: ProtectionCurse[] = [];
    for (const rawCurse of rawList || []) {
      const def = findProtectionCurse(rawCurse);
      if (def && !out.some((c) => c.id === def.id)) {
        out.push(def);
      }
    }
    return out;
  };

  const resolvedCurses = resolveCurseList(curses);
  const resolvedShieldCurses =
    shieldCurses.length > 0
      ? resolveCurseList(shieldCurses)
      : !bodyArmor
      ? resolvedCurses
      : [];

  // 1. Processar Proteção Corporal
  if (bodyArmor) {
    let bodyDef = bodyArmor.defenseBonus;
    let bodySpaces = bodyArmor.spaces;

    if (isReforcada) {
      bodyDef += 2;
      bodySpaces += 1;
    }

    if (isBlindada) {
      bodySpaces += 1;
    }

    if (isDiscreta) {
      bodySpaces = Math.max(1, bodySpaces - 1);
    }

    for (const c of resolvedCurses) {
      if (c.defenseBonus) {
        bodyDef += c.defenseBonus;
      }
      if (c.rdGeneralLightOrShield || c.rdGeneralHeavy) {
        const val = bodyArmor.type === 'Pesada' ? (c.rdGeneralHeavy || 5) : (c.rdGeneralLightOrShield || 2);
        resistances['Geral'] = (resistances['Geral'] || 0) + val;
      }
      if (c.rdElement) {
        resistances[c.rdElement.element] = Math.max(
          resistances[c.rdElement.element] || 0,
          c.rdElement.value
        );
      }
    }

    totalDefenseEquip += bodyDef;
    totalSpaces += bodySpaces;

    if (bodyArmor.armorPenalty) {
      armorPenalty += bodyArmor.armorPenalty;
    }

    // RD da Proteção Corporal
    const basePhys = bodyArmor.damageReduction?.physical || 0;
    const effectivePhysicalRd = isBlindada && bodyArmor.type === 'Pesada' ? 5 : basePhys;

    if (effectivePhysicalRd > 0) {
      resistances['Balístico'] = Math.max(resistances['Balístico'] || 0, effectivePhysicalRd);
      resistances['Corte'] = Math.max(resistances['Corte'] || 0, effectivePhysicalRd);
      resistances['Impacto'] = Math.max(resistances['Impacto'] || 0, effectivePhysicalRd);
      resistances['Perfuração'] = Math.max(resistances['Perfuração'] || 0, effectivePhysicalRd);
    }

    if (bodyArmor.damageReduction?.ballistic) {
      resistances['Balístico'] = Math.max(
        resistances['Balístico'] || 0,
        bodyArmor.damageReduction.ballistic
      );
    }

    // Construção do texto da armadura corporal
    const appliedModsLabels: string[] = [];
    if (isReforcada) appliedModsLabels.push('Reforçada');
    if (isBlindada) appliedModsLabels.push('Blindada');
    if (isAntibombas) appliedModsLabels.push('Antibombas');
    if (isDiscreta) appliedModsLabels.push('Discreta');
    for (const c of resolvedCurses) {
      appliedModsLabels.push(c.name);
    }

    const modsSuffix = appliedModsLabels.length > 0 ? ` ${appliedModsLabels.join(' ')}` : '';
    const rdLabel = effectivePhysicalRd > 0 ? `, RD ${effectivePhysicalRd}` : '';

    protectionParts.push(`${bodyArmor.name}${modsSuffix} (+${bodyDef} Defesa${rdLabel})`);
  }

  // 2. Processar Escudo
  if (shield) {
    let shieldDef = shield.defenseBonus;
    let shieldSpaces = shield.spaces;
    const shieldLabels: string[] = [];

    if (!bodyArmor && isReforcada) {
      shieldDef += 2;
      shieldSpaces += 1;
      shieldLabels.push('Reforçada');
    }

    for (const c of resolvedShieldCurses) {
      if (c.defenseBonus) {
        shieldDef += c.defenseBonus;
      }
      if (c.rdGeneralLightOrShield) {
        resistances['Geral'] = (resistances['Geral'] || 0) + c.rdGeneralLightOrShield;
      }
      if (c.rdElement) {
        resistances[c.rdElement.element] = Math.max(
          resistances[c.rdElement.element] || 0,
          c.rdElement.value
        );
      }
      shieldLabels.push(c.name);
    }

    totalDefenseEquip += shieldDef;
    totalSpaces += shieldSpaces;

    if (shield.damageReduction) {
      if (shield.damageReduction.ballistic) {
        resistances['Balístico'] = Math.max(
          resistances['Balístico'] || 0,
          shield.damageReduction.ballistic
        );
      }
      if (shield.damageReduction.physical) {
        const phys = shield.damageReduction.physical;
        resistances['Balístico'] = Math.max(resistances['Balístico'] || 0, phys);
        resistances['Corte'] = Math.max(resistances['Corte'] || 0, phys);
        resistances['Impacto'] = Math.max(resistances['Impacto'] || 0, phys);
        resistances['Perfuração'] = Math.max(resistances['Perfuração'] || 0, phys);
      }
    }

    const shieldRdLabel = shield.damageReduction?.ballistic
      ? `, RD Balístico ${shield.damageReduction.ballistic}`
      : shield.damageReduction?.physical
      ? `, RD ${shield.damageReduction.physical}`
      : '';
    const shieldCursesSuffix =
      shieldLabels.length > 0 ? ` ${shieldLabels.join(' ')}` : '';

    protectionParts.push(`${shield.name}${shieldCursesSuffix} (+${shieldDef} Defesa${shieldRdLabel})`);
  }

  const resistancesText = formatDamageResistances(resistances);
  const protectionText = protectionParts.join(' • ');
  const combinedCurses = Array.from(
    new Set([
      ...(bodyArmor ? resolvedCurses.map((c) => c.name) : []),
      ...resolvedShieldCurses.map((c) => c.name),
    ])
  );

  return {
    totalDefenseEquip,
    resistancesText,
    protectionText,
    totalSpaces,
    armorPenalty,
    appliedCurses: combinedCurses,
  };
}

/**
 * Busca proteção oficial pelo ID.
 */
export function getProtectionById(id: string): ProtectionItem | undefined {
  return OFFICIAL_PROTECTIONS.find((p) => p.id === id);
}

/**
 * Busca proteção oficial pelo nome (aproximação case-insensitive).
 */
export function findProtectionByName(name: string): ProtectionItem | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return OFFICIAL_PROTECTIONS.find((p) => p.name.toLowerCase() === clean);
}
