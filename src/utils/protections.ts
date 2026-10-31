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
  allowedArmorTypes: ('Leve' | 'Pesada')[];
  incompatibleWith?: string[];
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
    allowedArmorTypes: ['Leve', 'Pesada'],
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
 * Formata um dicionário de resistências a dano (RD) em string canônica.
 * Ex: { 'Balístico': 2, 'Corte': 2, 'Impacto': 2, 'Perfuração': 2 } => "Balístico 2, Corte 2, Impacto 2, Perfuração 2"
 */
export function formatDamageResistances(resistances: Record<string, number>): string {
  if (!resistances || Object.keys(resistances).length === 0) return '';

  const canonicalOrder = [
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
}

/**
 * Calcula os atributos combinados de uma proteção corporal, escudo e modificações equipadas.
 */
export function calculateEquippedProtections(
  bodyArmor?: ProtectionItem | null,
  shield?: ProtectionItem | null,
  modifications: string[] = []
): EquippedProtectionsResult {
  let totalDefenseEquip = 0;
  let totalSpaces = 0;
  let armorPenalty = 0;
  const resistances: Record<string, number> = {};
  const protectionParts: string[] = [];

  const normalizedMods = (modifications || []).map((m) => m.trim().toLowerCase());
  const isReforcada = normalizedMods.includes('reforçada') || normalizedMods.includes('reforcada');
  const isBlindada = normalizedMods.includes('blindada');
  const isDiscreta = normalizedMods.includes('discreta');

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

    totalDefenseEquip += bodyDef;
    totalSpaces += bodySpaces;

    if (bodyArmor.armorPenalty) {
      armorPenalty += bodyArmor.armorPenalty;
    }

    // RD da Proteção Corporal
    if (bodyArmor.damageReduction) {
      let phys = bodyArmor.damageReduction.physical || 0;
      if (isBlindada && bodyArmor.type === 'Pesada') {
        phys = 5;
      }

      if (phys > 0) {
        resistances['Balístico'] = Math.max(resistances['Balístico'] || 0, phys);
        resistances['Corte'] = Math.max(resistances['Corte'] || 0, phys);
        resistances['Impacto'] = Math.max(resistances['Impacto'] || 0, phys);
        resistances['Perfuração'] = Math.max(resistances['Perfuração'] || 0, phys);
      }

      if (bodyArmor.damageReduction.ballistic) {
        resistances['Balístico'] = Math.max(
          resistances['Balístico'] || 0,
          bodyArmor.damageReduction.ballistic
        );
      }
    }

    // Construção do texto da armadura corporal
    const appliedModsLabels: string[] = [];
    if (isReforcada) appliedModsLabels.push('Reforçada');
    if (isBlindada) appliedModsLabels.push('Blindada');
    if (isDiscreta) appliedModsLabels.push('Discreta');

    const modsSuffix = appliedModsLabels.length > 0 ? ` ${appliedModsLabels.join(' ')}` : '';
    const rdLabel =
      bodyArmor.type === 'Pesada'
        ? isBlindada
          ? ', RD 5'
          : ', RD 2'
        : bodyArmor.damageReduction?.physical
        ? `, RD ${bodyArmor.damageReduction.physical}`
        : '';

    protectionParts.push(`${bodyArmor.name}${modsSuffix} (+${bodyDef} Defesa${rdLabel})`);
  }

  // 2. Processar Escudo
  if (shield) {
    totalDefenseEquip += shield.defenseBonus;
    totalSpaces += shield.spaces;

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

    protectionParts.push(`${shield.name} (+${shield.defenseBonus} Defesa${shieldRdLabel})`);
  }

  const resistancesText = formatDamageResistances(resistances);
  const protectionText = protectionParts.join(' • ');

  return {
    totalDefenseEquip,
    resistancesText,
    protectionText,
    totalSpaces,
    armorPenalty,
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
