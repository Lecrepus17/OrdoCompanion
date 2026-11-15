import {
  AccessoryModificationDef,
  CharacterInventoryItem,
  CharacterSheet,
  CompendiumEntity,
  CustomCatalogItem,
  CustomItemModEntry,
  InventoryItemCategoryGroup,
  ItemMechanic,
  ParanormalElement,
} from '../types/compendium';

export const ITEM_CATEGORIES_ORDER: ReadonlyArray<'0' | 'I' | 'II' | 'III' | 'IV'> = [
  '0',
  'I',
  'II',
  'III',
  'IV',
];

export const OFFICIAL_ACCESSORY_MODS: AccessoryModificationDef[] = [
  {
    id: 'mod_acc_aprimorado',
    name: 'Aprimorado',
    categoryIncrease: 1,
    description:
      'O bônus em perícia concedido pelo acessório aumenta de +2 para +5. Se tiver Função Adicional, pode ser aplicado novamente na segunda perícia.',
    source: 'Livro Base',
  },
  {
    id: 'mod_acc_discreto',
    name: 'Discreto',
    categoryIncrease: 1,
    spacesChange: -1,
    description:
      'Miniaturizado ou disfarçado. Reduz os espaços ocupados em -1 e concede +5 em testes de Crime para ocultar (mesmo sem treinamento).',
    source: 'Livro Base',
  },
  {
    id: 'mod_acc_funcao_adicional',
    name: 'Função Adicional',
    categoryIncrease: 1,
    description:
      'O acessório também fornece +2 em uma perícia adicional à sua escolha (sujeito à aprovação do mestre).',
    source: 'Livro Base',
  },
  {
    id: 'mod_acc_instrumental',
    name: 'Instrumental',
    categoryIncrease: 1,
    description:
      'O acessório passa a funcionar também como um Kit de Perícia específico (evitando a penalidade de -5).',
    source: 'Livro Base',
  },
];

export const OFFICIAL_ACCESSORY_MODS_MAP = new Map<string, AccessoryModificationDef>(
  OFFICIAL_ACCESSORY_MODS.map((m) => [m.id, m])
);

export function normalizeItemCategory(raw?: string | null): '0' | 'I' | 'II' | 'III' | 'IV' {
  const clean = (raw || '').trim().toUpperCase();
  if (clean === '0' || clean === 'I' || clean === 'II' || clean === 'III' || clean === 'IV') {
    return clean;
  }
  if (clean === '1') return 'I';
  if (clean === '2') return 'II';
  if (clean === '3') return 'III';
  if (clean === '4') return 'IV';
  return '0';
}

export function increaseItemCategory(
  baseCat: '0' | 'I' | 'II' | 'III' | 'IV',
  steps: number
): '0' | 'I' | 'II' | 'III' | 'IV' {
  const idx = ITEM_CATEGORIES_ORDER.indexOf(normalizeItemCategory(baseCat));
  const safeIdx = idx >= 0 ? idx : 0;
  const nextIdx = Math.min(ITEM_CATEGORIES_ORDER.length - 1, Math.max(0, safeIdx + steps));
  return ITEM_CATEGORIES_ORDER[nextIdx];
}

export function roundSpaces(val: number): number {
  return Math.round(val * 100) / 100;
}

export function formatSpacesLabel(spaces: number): string {
  const rounded = roundSpaces(spaces);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

export function parseSpacesInput(raw: string | number | undefined, fallback = 1): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? roundSpaces(raw) : fallback;
  }
  if (raw === undefined || raw === null) return fallback;
  const trimmed = String(raw).trim().replace(',', '.');
  if (!trimmed || trimmed === '-' || trimmed === '—') return fallback;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? roundSpaces(parsed) : fallback;
}

export interface CalculatedItemStats {
  finalCategory: '0' | 'I' | 'II' | 'III' | 'IV';
  finalSpaces: number;
  effectiveSkillBonus: number;
}

export function calculateCatalogItemStats(params: {
  baseCategory: '0' | 'I' | 'II' | 'III' | 'IV';
  baseSpaces: number;
  itemType: 'geral' | 'vestimenta' | 'utensilio' | 'protecao' | 'escudo';
  skillBonus?: number;
  modifications?: string[];
  customModifications?: CustomItemModEntry[];
}): CalculatedItemStats {
  const mods = params.modifications || [];
  const customMods = params.customModifications || [];

  let categoryDelta = 0;
  let spacesDelta = 0;

  for (const modId of mods) {
    const def = OFFICIAL_ACCESSORY_MODS_MAP.get(modId);
    if (def) {
      categoryDelta += def.categoryIncrease || 0;
      spacesDelta += def.spacesChange || 0;
    }
  }

  for (const cm of customMods) {
    categoryDelta += cm.categoryIncrease || 0;
    spacesDelta += cm.spacesChange || 0;
  }

  const finalCategory = increaseItemCategory(params.baseCategory, categoryDelta);
  const baseSp = Number.isFinite(params.baseSpaces) && params.baseSpaces >= 0 ? params.baseSpaces : 1;
  const finalSpaces = roundSpaces(Math.max(0, baseSp + spacesDelta));

  const isAccessory = params.itemType === 'vestimenta' || params.itemType === 'utensilio';
  let effectiveSkillBonus = params.skillBonus ?? (isAccessory ? 2 : 0);
  if (isAccessory && mods.includes('mod_acc_aprimorado')) {
    effectiveSkillBonus = 5;
  }

  return {
    finalCategory,
    finalSpaces,
    effectiveSkillBonus,
  };
}

export interface CuratedCompendiumItem {
  id: string;
  name: string;
  bookId: string;
  bookTitle: string;
  pageNumber?: number;
  category: '0' | 'I' | 'II' | 'III' | 'IV';
  spaces: number;
  itemType: 'geral' | 'vestimenta' | 'utensilio' | 'protecao' | 'escudo';
  subCategoryGroup: InventoryItemCategoryGroup;
  element: ParanormalElement;
  description: string;
  consumable?: boolean;
  maxCharges?: number;
  loadBonus?: number;
  blockRdBonus?: number;
  skillBonus?: number;
  targetSkill?: string;
  mechanics: ItemMechanic[];
  sourceEntity?: CompendiumEntity;
}

interface OfficialItemTemplate {
  id: string;
  matchNames: string[];
  name: string;
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  category: '0' | 'I' | 'II' | 'III' | 'IV';
  spaces: number;
  itemType: 'geral' | 'vestimenta' | 'utensilio' | 'protecao' | 'escudo';
  subCategoryGroup: InventoryItemCategoryGroup;
  element?: ParanormalElement;
  description: string;
  consumable?: boolean;
  maxCharges?: number;
  loadBonus?: number;
  blockRdBonus?: number;
  skillBonus?: number;
  targetSkill?: string;
  mechanics: ItemMechanic[];
}

export const OFFICIAL_ITEM_TEMPLATES: OfficialItemTemplate[] = [
  // --- ACESSÓRIOS (Livro Base p. 73-74) ---
  {
    id: 'item__livro_base__kit_de_pericia',
    matchNames: ['kit de perícia', 'kit de pericia'],
    name: 'Kit de Perícia',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 73,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'acessorio',
    description:
      'Conjunto de ferramentas necessárias para determinadas perícias (ex.: Medicina, Tecnologia, Crime, Ocultismo). Sem o kit adequado, o agente sofre -5 no teste.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__utensilio',
    matchNames: ['utensílio', 'utensilio'],
    name: 'Utensílio',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 73,
    category: 'I',
    spaces: 1,
    itemType: 'utensilio',
    subCategoryGroup: 'acessorio',
    skillBonus: 2,
    description:
      'Item comum com utilidade específica (canivete, smartphone, notebook, lupa). Concede +2 em uma perícia escolhida (exceto Luta e Pontaria) enquanto empunhado.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__vestimenta',
    matchNames: ['vestimenta'],
    name: 'Vestimenta',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 73,
    category: 'I',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'acessorio',
    skillBonus: 2,
    description:
      'Peça de vestuário funcional ou simbólica (botas militares, terno, manto). Concede +2 em uma perícia escolhida (exceto Luta e Pontaria). Máximo de 2 vestimentas ativas.',
    mechanics: [],
  },

  // --- CURA & MEDICAMENTOS ---
  {
    id: 'item__livro_base__cicatrizante',
    matchNames: ['cicatrizante'],
    name: 'Cicatrizante',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Spray com potente efeito cicatrizante. Gaste uma ação padrão e o item para curar 2d8+2 PV em você ou em um ser adjacente.',
    mechanics: [
      {
        id: 'mech_cicatrizante_pv',
        type: 'heal_pv',
        label: 'Aplicar Cicatrizante',
        formula: '2d8+2',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_02__bandagem',
    matchNames: ['bandagem'],
    name: 'Bandagem',
    bookId: 'arquivos_secretos_02',
    bookTitle: 'Arquivos Secretos 02',
    pageNumber: 21,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Tecido esterilizado eficiente para estancar sangramentos. Gaste uma ação padrão e este item para curar 2d4+2 PV e remover a condição Sangrando em você ou em um ser adjacente.',
    mechanics: [
      {
        id: 'mech_bandagem_pv',
        type: 'heal_pv',
        label: 'Aplicar Bandagem',
        formula: '2d4+2',
        actionCost: 'Ação Padrão',
        removesCondition: 'Sangrando',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__alimento_energetico',
    matchNames: ['alimento energético', 'alimento energetico'],
    name: 'Alimento Energético',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 43,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Alimento e suplemento de alta tecnologia capaz de restaurar as energias mentais. Gaste uma ação padrão para consumir e recuperar 1d4 PE.',
    mechanics: [
      {
        id: 'mech_alimento_pe',
        type: 'heal_pe',
        label: 'Consumir Energético',
        formula: '1d4',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_03__pacoca',
    matchNames: ['paçoca', 'pacoca'],
    name: 'Paçoca',
    bookId: 'arquivos_secretos_03',
    bookTitle: 'Arquivos Secretos 03',
    pageNumber: 112,
    category: '0',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Iguaria brasileira (prato rápido). Uma vez por dia, ao comer, o personagem recupera 1d8+1 PV, PE e SAN (a critério do mestre).',
    mechanics: [
      {
        id: 'mech_pacoca_all',
        type: 'heal_all',
        label: 'Comer Paçoca',
        formula: '1d8+1',
        actionCost: '1x por dia',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__anti_inflamatorio',
    matchNames: ['anti-inflamatório', 'anti-inflamatorio', 'anti inflamatorio'],
    name: 'Anti-inflamatório',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão em si ou ser adjacente): reduz reações inflamatórias, dor e inchaço, fornecendo 1d8+2 PV temporários.',
    mechanics: [
      {
        id: 'mech_anti_inflamatorio',
        type: 'temp_pv',
        label: 'Aplicar Anti-inflamatório',
        formula: '1d8+2',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_06__aplicador_de_adrenalina',
    matchNames: ['aplicador de adrenalina'],
    name: 'Aplicador de Adrenalina',
    bookId: 'arquivos_secretos_06',
    bookTitle: 'Arquivos Secretos 06',
    pageNumber: 73,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Caneta aplicadora com alta carga de epinefrina. Ação padrão: fornece 2d8+2 PV temporários, +3m de deslocamento e +2 em testes de FOR, AGI e VIG até o fim da cena (rebote: fatigado ao terminar).',
    mechanics: [
      {
        id: 'mech_adrenalina',
        type: 'temp_pv',
        label: 'Injetar Adrenalina',
        formula: '2d8+2',
        actionCost: 'Ação Padrão',
        notes: '+3m deslocamento e +2 FOR/AGI/VIG na cena; fatigado após o fim.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__antibiotico',
    matchNames: ['antibiótico', 'antibiotico'],
    name: 'Antibiótico',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão): fortalece a imunidade contra vírus e bactérias, fornecendo +5 no próximo teste de Fortitude contra doença até o fim do dia.',
    mechanics: [
      {
        id: 'mech_antibiotico',
        type: 'utility_roll',
        label: 'Aplicar Antibiótico',
        actionCost: 'Ação Padrão',
        notes: '+5 no próximo teste de Fortitude contra doença até o fim do dia.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__antidoto',
    matchNames: ['antídoto', 'antidoto'],
    name: 'Antídoto',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão): fornece +5 no próximo teste de Fortitude contra efeitos de veneno até o fim do dia (ou remove veneno específico).',
    mechanics: [
      {
        id: 'mech_antidoto',
        type: 'utility_roll',
        label: 'Aplicar Antídoto',
        actionCost: 'Ação Padrão',
        notes: '+5 em Fortitude contra venenos (ou cura veneno específico).',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__antiemetico',
    matchNames: ['antiemético', 'antiemetico'],
    name: 'Antiemético',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão): remove a condição Enjoado e fornece +5 em testes para evitar essa condição até o fim da cena.',
    mechanics: [
      {
        id: 'mech_antiemetico',
        type: 'utility_roll',
        label: 'Tomar Antiemético',
        actionCost: 'Ação Padrão',
        removesCondition: 'Enjoado',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__antihistaminico',
    matchNames: ['antihistamínico', 'antihistaminico', 'anti-histamínico'],
    name: 'Antihistamínico',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão): reduz reações alérgicas perigosas (+5 no próximo teste contra alergias até o fim do dia).',
    mechanics: [
      {
        id: 'mech_antihistaminico',
        type: 'utility_roll',
        label: 'Usar Antihistamínico',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__antitermico',
    matchNames: ['antitérmico', 'antitermico'],
    name: 'Antitérmico',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão, 1x por cena): reduz febre e alivia dores, permitindo um novo teste contra uma condição mental em curso.',
    mechanics: [
      {
        id: 'mech_antitermico',
        type: 'utility_roll',
        label: 'Tomar Antitérmico',
        actionCost: 'Ação Padrão',
        notes: 'Permite novo teste contra condição mental (1x por cena).',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__broncodilatador',
    matchNames: ['broncodilatador'],
    name: 'Broncodilatador',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão): auxilia na respiração e fornece +5 em testes para evitar as condições Asfixiado ou Fatigado até o fim do dia.',
    mechanics: [
      {
        id: 'mech_broncodilatador',
        type: 'utility_roll',
        label: 'Usar Broncodilatador',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__coagulante',
    matchNames: ['coagulante'],
    name: 'Coagulante',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 44,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    consumable: true,
    description:
      'Medicamento (ação padrão): fornece +5 em testes para estabilizar da condição Sangrando até o fim do dia e +5 em testes de Medicina para remover Morrendo.',
    mechanics: [
      {
        id: 'mech_coagulante',
        type: 'utility_roll',
        label: 'Aplicar Coagulante',
        actionCost: 'Ação Padrão',
        notes: '+5 para estabilizar Sangrando e +5 em Medicina contra Morrendo.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__aplicador_de_medicamentos',
    matchNames: ['aplicador de medicamentos'],
    name: 'Aplicador de Medicamentos',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 43,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'cura',
    maxCharges: 3,
    consumable: true,
    description:
      'Bomba injetora presa ao braço/perna para aplicar substâncias (como cicatrizante ou medicamentos) com uma ação de movimento. Comporta até 3 doses.',
    mechanics: [
      {
        id: 'mech_aplicador_med',
        type: 'utility_roll',
        label: 'Disparar Dose',
        actionCost: 'Ação de Movimento',
        notes: 'Aplica uma dose carregada no aplicador.',
      },
    ],
  },

  // --- EXPLOSIVOS (Livro Base p. 74 & Sobrevivendo ao Horror p. 41-42) ---
  {
    id: 'item__livro_base__atordoamento',
    matchNames: ['atordoamento', 'granada de atordoamento'],
    name: 'Granada de Atordoamento',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 74,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Flash-bang arremessada em alcance médio (raio 6m). Seres na área ficam atordoados por 1 rodada (Fortitude DT Agi reduz para ofuscado e surdo por 1 rodada).',
    mechanics: [
      {
        id: 'mech_granada_atord',
        type: 'utility_roll',
        label: 'Lançar Flash-bang',
        actionCost: 'Ação Padrão',
        dtFormula: 'AGI',
        notes: 'Atordoado 1 rodada (Fortitude DT Agi reduz para ofuscado/surdo).',
      },
    ],
  },
  {
    id: 'item__livro_base__fragmentacao',
    matchNames: ['fragmentação', 'fragmentacao', 'granada de fragmentação', 'granada de fragmentacao'],
    name: 'Granada de Fragmentação',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 74,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Arremessada em alcance médio (raio 6m). Espalha estilhaços que causam 8d6 pontos de dano de perfuração (Reflexos DT Agi reduz à metade).',
    mechanics: [
      {
        id: 'mech_granada_frag',
        type: 'damage_roll',
        label: 'Detonar Fragmentação',
        formula: '8d6',
        damageType: 'Perfuração',
        dtFormula: 'AGI',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__livro_base__fumaca',
    matchNames: ['fumaça', 'fumaca', 'granada de fumaça', 'granada de fumaca'],
    name: 'Granada de Fumaça',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 74,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Arremessada em alcance médio (raio 6m). Produz fumaça densa por 2 rodadas: seres na área ficam cegos e sob camuflagem total.',
    mechanics: [
      {
        id: 'mech_granada_fumaca',
        type: 'utility_roll',
        label: 'Lançar Fumaça',
        actionCost: 'Ação Padrão',
        notes: 'Raio 6m: cegueira e camuflagem total por 2 rodadas.',
      },
    ],
  },
  {
    id: 'item__livro_base__granada_incendiaria',
    matchNames: ['granada incendiária', 'granada incendiaria'],
    name: 'Granada Incendiária',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 74,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Arremessada em alcance médio (raio 6m). Labaredas causam 6d6 pontos de dano de fogo e deixam alvos em chamas (Reflexos DT Agi reduz à metade e evita chamas).',
    mechanics: [
      {
        id: 'mech_granada_inc',
        type: 'damage_roll',
        label: 'Detonar Incendiária',
        formula: '6d6',
        damageType: 'Fogo',
        dtFormula: 'AGI',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__livro_base__mina_antipessoal',
    matchNames: ['mina antipessoal'],
    name: 'Mina Antipessoal',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 74,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Instalação com ação completa e Tática DT 15. Detonação remota (ação padrão, alcance longo) dispara esferas em cone de 6m causando 12d6 de perfuração (Reflexos DT Int reduz à metade).',
    mechanics: [
      {
        id: 'mech_mina_antipessoal',
        type: 'damage_roll',
        label: 'Detonar Mina',
        formula: '12d6',
        damageType: 'Perfuração',
        dtFormula: 'INT',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__dinamite',
    matchNames: ['dinamite'],
    name: 'Dinamite',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 42,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Acenda e arremesse em alcance médio (raio 6m). Causa 4d6 de impacto + 4d6 de fogo e deixa em chamas (Reflexos DT Agi reduz à metade e evita chamas).',
    mechanics: [
      {
        id: 'mech_dinamite',
        type: 'damage_roll',
        label: 'Detonar Dinamite',
        formula: '4d6+4d6',
        damageType: 'Impacto + Fogo',
        dtFormula: 'AGI',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__explosivo_plastico',
    matchNames: ['explosivo plástico', 'explosivo plastico'],
    name: 'Explosivo Plástico',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 42,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Massa adesiva com detonador remoto (2 rodadas para preparar). Detonação (ação livre, alcance longo): 16d6 de impacto em raio de 3m (Reflexos DT Int reduz à metade; dobro de dano em estruturas).',
    mechanics: [
      {
        id: 'mech_explosivo_plastico',
        type: 'damage_roll',
        label: 'Detonar C4 / Plástico',
        formula: '16d6',
        damageType: 'Impacto',
        dtFormula: 'INT',
        actionCost: 'Ação Livre',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__galao_vermelho',
    matchNames: ['galão vermelho', 'galao vermelho'],
    name: 'Galão Vermelho',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 42,
    category: '0',
    spaces: 2,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Ao sofrer dano de fogo ou balístico, explode em esfera de 6m de raio: 12d6 de fogo e condição Em Chamas (Reflexos DT 25 reduz à metade).',
    mechanics: [
      {
        id: 'mech_galao_vermelho',
        type: 'damage_roll',
        label: 'Explodir Galão',
        formula: '12d6',
        damageType: 'Fogo',
        dtFormula: '25',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__granada_gas_sonifero',
    matchNames: ['granada de gás sonífero', 'granada de gas sonifero'],
    name: 'Granada de Gás Sonífero',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 42,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Libera gás branco em raio de 6m. Seres que comecem o turno na área fazem teste de Fortitude ou ficam inconscientes e caídos.',
    mechanics: [
      {
        id: 'mech_granada_sonifera',
        type: 'utility_roll',
        label: 'Lançar Gás Sonífero',
        actionCost: 'Ação Padrão',
        dtFormula: 'AGI',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__granada_pem',
    matchNames: ['granada de pem'],
    name: 'Granada de PEM',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 42,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'explosivo',
    consumable: true,
    description:
      'Pulso eletromagnético em raio de 6m que desativa equipamentos eletrônicos não protegidos pela cena.',
    mechanics: [
      {
        id: 'mech_granada_pem',
        type: 'utility_roll',
        label: 'Detonar PEM',
        actionCost: 'Ação Padrão',
        notes: 'Desativa eletrônicos em raio de 6m.',
      },
    ],
  },

  // --- ITENS OPERACIONAIS (Livro Base p. 73-76 & Sobrevivendo ao Horror p. 41-45) ---
  {
    id: 'item__livro_base__mochila_militar',
    matchNames: ['mochila militar'],
    name: 'Mochila Militar',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'I',
    spaces: 0,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    loadBonus: 2,
    description:
      'Mochila leve e de alta qualidade. Não ocupa nenhum espaço e aumenta sua capacidade de carga máxima em +2 espaços.',
    mechanics: [
      {
        id: 'mech_mochila_carga',
        type: 'load_bonus',
        label: 'Capacidade +2 Espaços',
        flatValue: 2,
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__bracadeira_reforcada',
    matchNames: ['braçadeira reforçada', 'bracadeira reforcada'],
    name: 'Braçadeira Reforçada',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 43,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    blockRdBonus: 2,
    description:
      'Proteções reforçadas para os antebraços. Aumentam em +2 a RD que você recebe ao usar a reação Bloqueio.',
    mechanics: [
      {
        id: 'mech_bracadeira_rd',
        type: 'block_rd_bonus',
        label: '+2 RD no Bloqueio',
        flatValue: 2,
      },
    ],
  },
  {
    id: 'item__livro_base__taser',
    matchNames: ['taser'],
    name: 'Taser',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    maxCharges: 2,
    consumable: true,
    description:
      'Dispositivo de eletrochoque (alcance adjacente, ação padrão). Causa 1d6 pontos de dano de eletricidade e deixa o alvo atordoado por 1 rodada (Fortitude DT Agi evita). Bateria dura 2 usos.',
    mechanics: [
      {
        id: 'mech_taser_dano',
        type: 'damage_roll',
        label: 'Disparar Taser',
        formula: '1d6',
        damageType: 'Eletricidade',
        dtFormula: 'AGI',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__livro_base__spray_de_pimenta',
    matchNames: ['spray de pimenta'],
    name: 'Spray de Pimenta',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    maxCharges: 2,
    consumable: true,
    description:
      'Ação padrão em alvo adjacente: deixa o alvo cego por 1d4 rodadas (Fortitude DT Agi evita). A carga dura 2 usos.',
    mechanics: [
      {
        id: 'mech_spray_pimenta',
        type: 'utility_roll',
        label: 'Borrifar Spray',
        formula: '1d4',
        dtFormula: 'AGI',
        actionCost: 'Ação Padrão',
        notes: 'Cego pelo número de rodadas rolado (Fortitude DT Agi evita).',
      },
    ],
  },
  {
    id: 'item__livro_base__pistola_sinalizadora',
    matchNames: ['pistola sinalizadora'],
    name: 'Pistola Sinalizadora',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    maxCharges: 2,
    consumable: true,
    description:
      'Dispara sinalizador luminoso. Pode ser usada como arma de disparo leve (alcance curto) causando 2d6 pontos de dano de fogo. Vem com 2 cargas.',
    mechanics: [
      {
        id: 'mech_sinalizadora',
        type: 'damage_roll',
        label: 'Disparar Sinalizador',
        formula: '2d6',
        damageType: 'Fogo',
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__livro_base__pistola_de_dardos',
    matchNames: ['pistola de dardos'],
    name: 'Pistola de Dardos',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    maxCharges: 2,
    consumable: true,
    description:
      'Arma leve que dispara dardos soníferos em alcance curto. Acerto deixa o alvo inconsciente até o fim da cena (Fortitude DT Agi reduz para desprevenido e lento por 1 rodada). Vem com 2 dardos.',
    mechanics: [
      {
        id: 'mech_pistola_dardos',
        type: 'utility_roll',
        label: 'Disparar Dardo',
        dtFormula: 'AGI',
        actionCost: 'Ação Padrão',
        notes: 'Inconsciente (Fortitude DT Agi reduz para desprevenido/lento 1 rodada).',
      },
    ],
  },
  {
    id: 'item__livro_base__binoculos',
    matchNames: ['binóculos', 'binoculos'],
    name: 'Binóculos',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: 'Binóculos militares que fornecem +5 em testes de Percepção para observar coisas distantes.',
    mechanics: [
      {
        id: 'mech_binoculos',
        type: 'skill_bonus',
        label: '+5 Percepção (Distância)',
        flatValue: 5,
        targetSkill: 'Percepção',
        isSituationalSkillBonus: true,
      },
    ],
  },
  {
    id: 'item__livro_base__algemas',
    matchNames: ['algemas'],
    name: 'Algemas',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 74,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Algemas de aço. Prendem ambos os pulsos (-5 em testes manuais, impede conjuração) ou um pulso a objeto imóvel. Escapar exige Acrobacia DT 30.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__arpeu',
    matchNames: ['arpéu', 'arpeu'],
    name: 'Arpéu',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Gancho de aço para amarrar em corda. Prender exige Pontaria DT 15; subir com corda fornece +5 em Atletismo.',
    mechanics: [
      {
        id: 'mech_arpeu',
        type: 'skill_bonus',
        label: '+5 Atletismo (Escalada)',
        flatValue: 5,
        targetSkill: 'Atletismo',
        isSituationalSkillBonus: true,
      },
    ],
  },
  {
    id: 'item__livro_base__bandoleira',
    matchNames: ['bandoleira'],
    name: 'Bandoleira',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: 'Cinto tático. Uma vez por rodada, permite sacar ou guardar um item no inventário como ação livre.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__bloqueador_de_sinal',
    matchNames: ['bloqueador de sinal'],
    name: 'Bloqueador de Sinal',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: 'Emite interferência que impede celulares em alcance médio de se conectarem.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__corda',
    matchNames: ['corda'],
    name: 'Corda',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: '10 metros de corda resistente. Concede +5 em Atletismo para descer/subir e serve para amarrar alvos.',
    mechanics: [
      {
        id: 'mech_corda',
        type: 'skill_bonus',
        label: '+5 Atletismo (Corda)',
        flatValue: 5,
        targetSkill: 'Atletismo',
        isSituationalSkillBonus: true,
      },
    ],
  },
  {
    id: 'item__livro_base__equipamento_de_sobrevivencia',
    matchNames: ['equipamento de sobrevivência', 'equipamento de sobrevivencia'],
    name: 'Equipamento de Sobrevivência',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: '0',
    spaces: 2,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Saco de dormir, panelas e GPS. Fornece +5 em Sobrevivência para acampar/orientar-se e permite esses testes sem treinamento.',
    mechanics: [
      {
        id: 'mech_sobrevivencia',
        type: 'skill_bonus',
        label: '+5 Sobrevivência (Acampar)',
        flatValue: 5,
        targetSkill: 'Sobrevivência',
        isSituationalSkillBonus: true,
      },
    ],
  },
  {
    id: 'item__livro_base__lanterna_tatica',
    matchNames: ['lanterna tática', 'lanterna tatica'],
    name: 'Lanterna Tática',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 75,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Ilumina cone de 9m. Ação de movimento: mira nos olhos de um ser em alcance curto, deixando-o ofuscado por 1 rodada (1x por cena por alvo).',
    mechanics: [],
  },
  {
    id: 'item__livro_base__mascara_de_gas',
    matchNames: ['máscara de gás', 'mascara de gas'],
    name: 'Máscara de Gás',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: 'Cobre o rosto inteiro com filtro. Fornece +10 em testes de Fortitude contra efeitos respiratórios.',
    mechanics: [
      {
        id: 'mech_mascara_gas',
        type: 'skill_bonus',
        label: '+10 Fortitude (Respiração)',
        flatValue: 10,
        targetSkill: 'Fortitude',
        isSituationalSkillBonus: true,
      },
    ],
  },
  {
    id: 'item__livro_base__oculos_de_visao_termica',
    matchNames: ['óculos de visão térmica', 'oculos de visao termica'],
    name: 'Óculos de Visão Térmica',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: 'Eliminam penalidades em testes causadas por camuflagem.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__pe_de_cabra',
    matchNames: ['pé de cabra', 'pe de cabra'],
    name: 'Pé de Cabra',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description: 'Barra de ferro. Fornece +5 em testes de Força para arrombar portas (pode ser usada como bastão em combate).',
    mechanics: [],
  },
  {
    id: 'item__livro_base__soqueira',
    matchNames: ['soqueira'],
    name: 'Soqueira',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Fornece +1 em rolagens de dano desarmado e os torna letais. Pode receber modificações e maldições de armas corpo a corpo.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__traje_hazmat',
    matchNames: ['traje hazmat'],
    name: 'Traje Hazmat',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'I',
    spaces: 2,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Roupa impermeável que protege contra materiais tóxicos. Fornece +5 em testes de resistência contra efeitos químicos/ambientais.',
    mechanics: [],
  },
  {
    id: 'item__sobrevivendo_ao_horror__traje_de_mergulho',
    matchNames: ['traje de mergulho'],
    name: 'Traje de Mergulho',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 45,
    category: 'I',
    spaces: 2,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Garante 1 hora de oxigênio, +5 em testes de resistência contra efeitos ambientais e RD Químico 5.',
    mechanics: [],
  },
  {
    id: 'item__sobrevivendo_ao_horror__traje_espacial',
    matchNames: ['traje espacial'],
    name: 'Traje Espacial',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 45,
    category: 'II',
    spaces: 5,
    itemType: 'geral',
    subCategoryGroup: 'operacional',
    description:
      'Suprimento de 8 horas de oxigênio e água, +10 em testes de resistência ambientais e RD Químico 20.',
    mechanics: [],
  },

  // --- ITENS PARANORMAIS & AMALDIÇOADOS ESPECIAIS ---
  {
    id: 'item__livro_base__componentes_ritualisticos_de_elemento',
    matchNames: ['componentes ritualísticos de (elemento)', 'componentes ritualisticos'],
    name: 'Componentes Ritualísticos',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: '0',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    description:
      'Conjunto de objetos de um elemento (Sangue, Morte, Conhecimento ou Energia) necessários para conjurar rituais daquele elemento.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__emissor_de_pulsos_paranormais',
    matchNames: ['emissor de pulsos paranormais'],
    name: 'Emissor de Pulsos Paranormais',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 77,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    description:
      'Isca paranormal. Ação completa e 1 PE: emite pulso de um elemento que atrai criaturas do mesmo elemento e afasta do oposto (Vontade DT Pre).',
    mechanics: [
      {
        id: 'mech_emissor_pulsos',
        type: 'pe_activation',
        label: 'Ativar Emissor',
        peCost: 1,
        actionCost: 'Ação Completa',
        dtFormula: 'PRE',
      },
    ],
  },
  {
    id: 'item__livro_base__escuta_de_ruidos_paranormais',
    matchNames: ['escuta de ruídos paranormais', 'escuta de ruidos paranormais'],
    name: 'Escuta de Ruídos Paranormais',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 77,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    description:
      'Microfone que grava ruídos paranormais por até 24h (Ação completa e 2 PE). Ouvir a gravação fornece +5 em Ocultismo para identificar criaturas.',
    mechanics: [
      {
        id: 'mech_escuta_ruidos',
        type: 'pe_activation',
        label: 'Ativar Gravação',
        peCost: 2,
        actionCost: 'Ação Completa',
      },
    ],
  },
  {
    id: 'item__livro_base__medidor_de_estabilidade_da_membrana',
    matchNames: ['medidor de estabilidade da membrana'],
    name: 'Medidor de Estabilidade da Membrana',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 77,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    description:
      'Permite a um agente treinado em Ocultismo avaliar o estado da Membrana em uma área.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__camera_de_aura_paranormal',
    matchNames: ['câmera de aura paranormal', 'camera de aura paranormal'],
    name: 'Câmera de Aura Paranormal',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 76,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    element: 'Energia',
    description: 'Câmera modificada com sigilos capaz de registrar auras paranormais em fotografias.',
    mechanics: [],
  },
  {
    id: 'item__sobrevivendo_ao_horror__catalisadores_ritualisticos',
    matchNames: ['catalisadores ritualísticos', 'catalisadores ritualisticos'],
    name: 'Catalisadores Ritualísticos',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 45,
    category: 'I',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    consumable: true,
    description:
      'Consumido ao conjurar um ritual (1 por ritual). Tipos: Ampliador (alcance/área), Perturbador (+2 DT), Potencializador (+1 dado de dano), Prolongador (duração x2).',
    mechanics: [
      {
        id: 'mech_catalisador',
        type: 'utility_roll',
        label: 'Consumir Catalisador',
        actionCost: 'Livre (ao conjurar)',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__medidor_de_condicao_vertebral',
    matchNames: ['medidor de condição vertebral', 'medidor de condicao vertebral'],
    name: 'Medidor de Condição Vertebral',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 45,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'paranormal',
    skillBonus: 2,
    targetSkill: 'Fortitude',
    description:
      'Conta como vestimenta que fornece +2 em Fortitude. Também indica saúde do usuário e concede +5 em testes de Medicina feitos para auxiliá-lo.',
    mechanics: [],
  },
  {
    id: 'item__sobrevivendo_ao_horror__pe_de_morto',
    matchNames: ['pé de morto', 'pe de morto'],
    name: 'Pé de Morto',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 46,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'paranormal',
    element: 'Morte',
    skillBonus: 5,
    targetSkill: 'Furtividade',
    description:
      'Botas macabras que mantêm seus passos quase inaudíveis: fornece +5 em Furtividade.',
    mechanics: [],
  },
  {
    id: 'item__livro_base__frasco_de_lodo',
    matchNames: ['frasco de lodo'],
    name: 'Frasco de Lodo',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 159,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    consumable: true,
    description:
      'Ação padrão (1 uso). Em ferimento recente (até 1 rodada): recupera 6d8+20 PV. Ferida anterior: role 1d6 (par cura 3d8+10 PV; ímpar causa 3d8+10 dano de Morte).',
    mechanics: [
      {
        id: 'mech_frasco_lodo_recente',
        type: 'heal_pv',
        label: 'Ferida Recente (6d8+20)',
        formula: '6d8+20',
        actionCost: 'Ação Padrão',
      },
      {
        id: 'mech_frasco_lodo_antiga',
        type: 'heal_pv',
        label: 'Ferida Antiga (3d8+10)',
        formula: '3d8+10',
        actionCost: 'Ação Padrão',
        notes: 'Atenção: se o teste de sorte der ímpar, causa dano de Morte em vez de curar.',
      },
    ],
  },
  {
    id: 'item__livro_base__pergaminho_da_pertinacia',
    matchNames: ['pergaminho da pertinácia', 'pergaminho da pertinacia'],
    name: 'Pergaminho da Pertinácia',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    description:
      'Ação padrão: recebe 5 PE temporários até o fim da cena (requer teste contra preço da maldição).',
    mechanics: [
      {
        id: 'mech_pergaminho_pe',
        type: 'temp_pe',
        label: 'Encarar Sigilos (+5 PE Temp)',
        flatValue: 5,
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__livro_base__lantern_reveladora',
    matchNames: ['lanterna reveladora'],
    name: 'Lanterna Reveladora',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 159,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    description: 'Ativar gasta 1 ação padrão e 1 PE para revelar o que está oculto na luz dourada.',
    mechanics: [
      {
        id: 'mech_lanterna_rev',
        type: 'pe_activation',
        label: 'Ativar Lanterna',
        peCost: 1,
        actionCost: 'Ação Padrão',
      },
    ],
  },
  {
    id: 'item__livro_base__relogio_de_arnaldo',
    matchNames: ['relógio de arnaldo', 'relogio de arnaldo'],
    name: 'Relógio de Arnaldo',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 161,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description: 'Uma vez por rodada, pode gastar 1 PE para rolar novamente um dado com resultado 1.',
    mechanics: [
      {
        id: 'mech_relogio_arnaldo',
        type: 'pe_activation',
        label: 'Re-rolar Dado',
        peCost: 1,
        actionCost: 'Livre (1x/rodada)',
      },
    ],
  },
  {
    id: 'item__livro_base__mascara_das_pessoas_nas_sombras',
    matchNames: ['máscara das pessoas nas sombras', 'mascara das pessoas nas sombras'],
    name: 'Máscara das Pessoas nas Sombras',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    description: 'Permite teletransportar-se entre sombras gastando 2 PE (e fornece RD Conhecimento 10).',
    mechanics: [
      {
        id: 'mech_mascara_sombras',
        type: 'pe_activation',
        label: 'Salto nas Sombras',
        peCost: 2,
        actionCost: 'Ação de Movimento',
      },
    ],
  },
  {
    id: 'item__livro_base__cranio_espiral',
    matchNames: ['crânio espiral', 'cranio espiral'],
    name: 'Crânio Espiral',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 159,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      '1x/rodada (ação livre): ganha uma ação padrão adicional na rodada. Teste de Vontade (DT 15 + 5 por uso no dia) ou envelhece 1d4 anos.',
    mechanics: [
      {
        id: 'mech_cranio_espiral',
        type: 'utility_roll',
        label: 'Ativar Ação Extra (1d4 anos)',
        formula: '1d4',
        actionCost: 'Ação Livre',
        notes: 'Recebe 1 ação padrão adicional; teste de Vontade DT 15 (+5/uso).',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_07__sal_dourado',
    matchNames: ['sal dourado'],
    name: 'Sal Dourado',
    bookId: 'arquivos_secretos_07',
    bookTitle: 'Arquivos Secretos 07',
    pageNumber: 79,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    element: 'Conhecimento',
    maxCharges: 3,
    consumable: true,
    description:
      'Afasta criaturas de Sangue VD ≤ 80 (Vontade DT 20). Linha em porta/janela consome 1 uso (3 usos); círculo completo esvazia o saleiro.',
    mechanics: [
      {
        id: 'mech_sal_dourado',
        type: 'utility_roll',
        label: 'Espalhar Linha de Sal',
        dtFormula: '20',
        notes: 'Criaturas de Sangue VD ≤ 80 fazem Vontade DT 20.',
      },
    ],
  },
  // ==========================================
  // ITENS AMALDIÇOADOS ESPECIAIS (LIVRO BASE PP. 158–161)
  // ==========================================
  {
    id: 'item__livro_base__vislumbre_do_fim',
    matchNames: ['vislumbre do fim'],
    name: 'Vislumbre do Fim',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 159,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Óculos escuros com símbolos e espirais metálicas. Ação de movimento: concentra-se em um ser visível para enxergar o contador de tempo de vida (comuns) ou a pior resistência e vulnerabilidades (Marcados/criaturas).',
    mechanics: [
      {
        id: 'mech_vislumbre_do_fim',
        type: 'utility_roll',
        label: 'Concentrar (Ver Fim)',
        actionCost: 'Ação de Movimento',
        notes: 'Revela tempo restante de pessoas comuns ou pior resistência e vulnerabilidades do alvo.',
      },
    ],
  },
  {
    id: 'item__livro_base__coracao_pulsante',
    matchNames: ['coração pulsante', 'coracao pulsante'],
    name: 'Coração Pulsante',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Ao sofrer dano empunhando o coração, gaste uma reação para reduzir o dano pela metade. Fortitude DT 15 (+5/uso no dia) ou o item é destruído.',
    mechanics: [
      {
        id: 'mech_coracao_pulsante',
        type: 'utility_roll',
        label: 'Espremer (½ Dano)',
        actionCost: 'Reação',
        dtFormula: '15',
        notes: 'Reduz o dano pela metade; faça Fortitude DT 15 (+5 por uso no dia) ou o item se destrói.',
      },
    ],
  },
  {
    id: 'item__livro_base__coroa_de_espinhos',
    matchNames: ['coroa de espinhos'],
    name: 'Coroa de Espinhos',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      '1x/rodada (reação): converte qualquer dano mental que sofreria em dano de Sangue (exige 1 semana de uso; impede recuperar SAN por descanso).',
    mechanics: [
      {
        id: 'mech_coroa_de_espinhos',
        type: 'utility_roll',
        label: 'Converter Dano Mental → Sangue',
        actionCost: 'Reação (1x/rodada)',
        notes: 'Converte dano mental em dano de Sangue; não recupera SAN em descanso enquanto vestir.',
      },
    ],
  },
  {
    id: 'item__livro_base__frasco_de_vitalidade',
    matchNames: ['frasco de vitalidade'],
    name: 'Frasco de Vitalidade',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Armazena até 20 PV do próprio sangue (1 min). Ação padrão: bebe o sangue armazenado recuperando até 20 PV (Fortitude DT 20 ou enjoado 1 rodada).',
    mechanics: [
      {
        id: 'mech_frasco_vitalidade',
        type: 'heal_pv',
        label: 'Beber Sangue (até 20 PV)',
        flatValue: 20,
        actionCost: 'Ação Padrão',
        dtFormula: '20',
        notes: 'Cura os PV armazenados (máx. 20); Fortitude DT 20 ou fica enjoado por 1 rodada.',
      },
    ],
  },
  {
    id: 'item__livro_base__perola_de_sangue',
    matchNames: ['pérola de sangue', 'perola de sangue'],
    name: 'Pérola de Sangue',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Ação de movimento: absorve a pérola e recebe +5 em testes de AGI, FOR e VIG até o fim da cena (Fortitude DT 20 ao final ou fadiga/parada cardíaca).',
    mechanics: [
      {
        id: 'mech_perola_sangue',
        type: 'utility_roll',
        label: 'Absorver (+5 AGI/FOR/VIG)',
        actionCost: 'Ação de Movimento',
        dtFormula: '20',
        notes: '+5 em testes de AGI, FOR e VIG na cena. Ao fim da cena: Fortitude DT 20.',
      },
    ],
  },
  {
    id: 'item__livro_base__punhos_enraivecidos',
    matchNames: ['punhos enraivecidos'],
    name: 'Punhos Enraivecidos',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Soqueiras que causam +1d8 dano de Sangue letal em ataques desarmados. Ao acertar, gaste 2 PE (+2 por ataque extra anterior no turno) para atacar novamente.',
    mechanics: [
      {
        id: 'mech_punhos_enraivecidos',
        type: 'damage_roll',
        label: 'Dano Extra Desarmado',
        formula: '1d8',
        peCost: 2,
        actionCost: 'Ao Acertar',
        notes: '+1d8 Sangue letal; gasta 2 PE (4, 6...) para realizar ataque desarmado extra.',
      },
    ],
  },
  {
    id: 'item__livro_base__seringa_de_transfiguracao',
    matchNames: ['seringa de transfiguração', 'seringa de transfiguracao'],
    name: 'Seringa de Transfiguração',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Ação padrão para coletar sangue ou injetar em alvo adjacente (assume a aparência do doador por 1 dia; 1 em 1d6 ao encerrar reduz 1 PV permanente).',
    mechanics: [
      {
        id: 'mech_seringa_transfig',
        type: 'utility_roll',
        label: 'Testar Sequela (1d6)',
        formula: '1d6',
        actionCost: 'Fim do Efeito',
        notes: 'No resultado 1 em 1d6, o alvo perde 1 PV permanentemente.',
      },
    ],
  },
  {
    id: 'item__livro_base__amarras_mortais',
    matchNames: ['amarras mortais'],
    name: 'Amarras Mortais',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 158,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      '1x/rodada (ação padrão + 2 PE): manobra agarrar à distância curta com +10 no teste oposto (ação de movimento para puxar).',
    mechanics: [
      {
        id: 'mech_amarras_mortais',
        type: 'pe_activation',
        label: 'Agarrar Correntes (+10)',
        peCost: 2,
        actionCost: 'Ação Padrão',
        notes: 'Manobra agarrar em alcance curto com +10 no teste oposto.',
      },
    ],
  },
  {
    id: 'item__livro_base__casaco_de_lodo',
    matchNames: ['casaco de lodo'],
    name: 'Casaco de Lodo',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 159,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Fornece RD 5 a corte, impacto, Morte e perfuração, porém impõe vulnerabilidade a dano balístico e de Energia.',
    mechanics: [
      {
        id: 'mech_casaco_lodo',
        type: 'utility_roll',
        label: 'Proteção de Lodo (RD 5)',
        notes: 'Passivo: RD 5 Corte/Impacto/Perfuração/Morte; vulnerável a Balístico e Energia.',
      },
    ],
  },
  {
    id: 'item__livro_base__coletora',
    matchNames: ['coletora'],
    name: 'Coletora',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 159,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Ação completa para apunhalar alvo morrendo, matando-o e armazenando 1d8 PE (máximo 20 PE utilizáveis após 1 semana portando).',
    mechanics: [
      {
        id: 'mech_coletora_pe',
        type: 'heal_pe',
        label: 'Absorver Vida (1d8 PE)',
        formula: '1d8',
        actionCost: 'Ação Completa',
        notes: 'Armazena 1d8 PE (até 20 PE) ao finalizar alvo morrendo.',
      },
    ],
  },
  {
    id: 'item__livro_base__municao_jurada',
    matchNames: ['munição jurada', 'municao jurada'],
    name: 'Munição Jurada',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    consumable: true,
    maxCharges: 1,
    description:
      'Após 1h vinculando a um alvo, fornece +10 no ataque, dobra a margem de ameaça e causa +6d12 dano de Conhecimento contra ele (-2 Def/Ataque vs outros).',
    mechanics: [
      {
        id: 'mech_municao_jurada',
        type: 'damage_roll',
        label: 'Disparo Jurado (+6d12 Conhec.)',
        formula: '6d12',
        notes: '+10 no ataque e dobra margem de ameaça contra o alvo jurado.',
      },
    ],
  },
  {
    id: 'item__livro_base__arcabuz_dos_moretti',
    matchNames: ['arcabuz dos moretti'],
    name: 'Arcabuz dos Moretti',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Arma simples de fogo (+2 ataque, Energia, crítico x3, alcance curto, sem munição). Role 1d6 para definir o dano: 1=2d4, 2=2d6, 3=2d8, 4=2d10, 5=2d12, 6=2d20.',
    mechanics: [
      {
        id: 'mech_arcabuz_moretti',
        type: 'utility_roll',
        label: 'Sortear Dano (1d6)',
        formula: '1d6',
        actionCost: 'Ataque',
        notes: '1=2d4 | 2=2d6 | 3=2d8 | 4=2d10 | 5=2d12 | 6=2d20 (Energia, x3).',
      },
    ],
  },
  {
    id: 'item__livro_base__bateria_reversa',
    matchNames: ['bateria reversa'],
    name: 'Bateria Reversa',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Ação padrão + 2 PE absorve carga de eletrônico em alcance curto; ação padrão transfere para recarregar outro. Ocultismo DT 15 (+5/uso) ou explode em 12d6 Energia (3m).',
    mechanics: [
      {
        id: 'mech_bateria_reversa_pe',
        type: 'pe_activation',
        label: 'Drenar Eletrônico',
        peCost: 2,
        actionCost: 'Ação Padrão',
        dtFormula: '15',
        notes: 'Teste de Ocultismo DT 15 (+5/uso no dia) para não sobrecarregar.',
      },
      {
        id: 'mech_bateria_reversa_boom',
        type: 'damage_roll',
        label: 'Explosão de Sobrecarga',
        formula: '12d6',
        notes: 'Dano de Energia em todos os seres a até 3m se falhar no teste.',
      },
    ],
  },
  {
    id: 'item__livro_base__peitoral_da_segunda_chance',
    matchNames: ['peitoral da segunda chance'],
    name: 'Peitoral da Segunda Chance',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Ao chegar a 0 PV, gasta automaticamente 5 PE para reanimar com 4d10 PV. Em 1 no 1d10, a descarga mata instantaneamente.',
    mechanics: [
      {
        id: 'mech_peitoral_segunda_chance',
        type: 'heal_pv',
        label: 'Reanimar (4d10 PV)',
        formula: '4d10',
        peCost: 5,
        actionCost: 'Automática (0 PV)',
        notes: 'Role 1d10 após reanimar: no resultado 1, descarga fatal instantânea.',
      },
    ],
  },
  {
    id: 'item__livro_base__talisma_da_sorte',
    matchNames: ['talismã da sorte', 'talisma da sorte'],
    name: 'Talismã da Sorte',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Ao sofrer dano (reação + 3 PE): role 1d4 (2-3 evita dano; 4 evita e vira cinzas; 1 sofre o dobro e vira cinzas).',
    mechanics: [
      {
        id: 'mech_talisma_sorte',
        type: 'utility_roll',
        label: 'Testar Sorte (1d4)',
        formula: '1d4',
        peCost: 3,
        actionCost: 'Reação',
        notes: '2-3: evita dano | 4: evita e destrói | 1: dobro do dano e destrói.',
      },
    ],
  },
  {
    id: 'item__livro_base__teclado_de_conexao_neural',
    matchNames: ['teclado de conexão neural', 'teclado de conexao neural'],
    name: 'Teclado de Conexão Neural',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 160,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Ação de movimento para plugar: +10 em Tecnologia para hackear e metade do tempo p/ arquivos, mas sofre 1d6 dano mental por rodada conectado.',
    mechanics: [
      {
        id: 'mech_teclado_neural_dmg',
        type: 'utility_roll',
        label: 'Sobrecarga Neural (1d6 Mental)',
        formula: '1d6',
        actionCost: 'Por Rodada',
        notes: 'Concede +10 p/ hackear; usuário sofre 1d6 dano mental/rodada.',
      },
    ],
  },
  {
    id: 'item__livro_base__tela_do_pesadelo',
    matchNames: ['tela do pesadelo'],
    name: 'Tela do Pesadelo',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 161,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Ação padrão + 2 PE: próximo que tocar faz Vontade (DT do usuário +5) ou fica atordoado e sofre 4d6 dano mental por rodada até passar.',
    mechanics: [
      {
        id: 'mech_tela_pesadelo',
        type: 'damage_roll',
        label: 'Ativar Ilusão (4d6 Mental)',
        formula: '4d6',
        peCost: 2,
        actionCost: 'Ação Padrão',
        dtFormula: 'PRE',
        notes: 'Vontade DT (Usuário +5) ou alvo fica atordoado e sofre 4d6 Mental/rodada.',
      },
    ],
  },
  {
    id: 'item__livro_base__jaqueta_de_verissimo',
    matchNames: ['jaqueta de veríssimo', 'jaqueta de verissimo'],
    name: 'Jaqueta de Veríssimo',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 161,
    category: 'IV',
    spaces: 2,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Medo',
    description:
      'Item único. Concede RD Paranormal 15. Reação + 2 PE: torna-se o alvo de qualquer dano que um aliado adjacente fosse sofrer.',
    mechanics: [
      {
        id: 'mech_jaqueta_verissimo',
        type: 'pe_activation',
        label: 'Proteger Aliado (Assumir Dano)',
        peCost: 2,
        actionCost: 'Reação',
        notes: 'Passivo: RD Paranormal 15. Reação: intercepta dano em aliado adjacente.',
      },
    ],
  },
  {
    id: 'item__livro_base__dedo_decepado',
    matchNames: ['dedo decepado'],
    name: 'Dedo Decepado',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 161,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    description:
      'Concede 1 poder paranormal após 1 semana vestido (-10 Diplomacia se visível). Em dormir/relaxar no interlúdio, role 1d4: no 1 não recupera PV/PE/SAN.',
    mechanics: [
      {
        id: 'mech_dedo_decepado',
        type: 'utility_roll',
        label: 'Pesadelo no Interlúdio (1d4)',
        formula: '1d4',
        actionCost: 'Interlúdio',
        notes: 'Resultado 1: assombrado, não recupera PV/PE/SAN no descanso.',
      },
    ],
  },
  {
    id: 'item__livro_base__selos_paranormais',
    matchNames: ['selos paranormais'],
    name: 'Selos Paranormais',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 161,
    category: 'I',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    consumable: true,
    maxCharges: 1,
    description:
      'Selo consumível com um ritual inscrito (Categoria = círculo do ritual). Empunhar + ler ativa sem componentes; exige conhecer ou Ocultismo DT 20 + PE.',
    mechanics: [
      {
        id: 'mech_selo_paranormal',
        type: 'utility_roll',
        label: 'Ativar Ritual do Selo',
        actionCost: 'Ação Padrão / Ritual',
        notes: 'Se não conhecer o ritual, exige Ocultismo DT 20 + custo em PE.',
      },
    ],
  },
  // ==========================================
  // PARANORMAIS E AMALDIÇOADOS (SaH & ARQUIVOS SECRETOS)
  // ==========================================
  {
    id: 'item__sobrevivendo_ao_horror__ampulheta_do_tempo_sofrido',
    matchNames: ['ampulheta do tempo sofrido'],
    name: 'Ampulheta do Tempo Sofrido',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 59,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Empunhando a ampulheta, gaste 5 PE para receber imediatamente os benefícios de 1 ação de interlúdio (1x até devolver o tempo em um interlúdio).',
    mechanics: [
      {
        id: 'mech_ampulheta_tempo',
        type: 'pe_activation',
        label: 'Ação de Interlúdio Imediata',
        peCost: 5,
        actionCost: 'Livre',
        notes: 'Recarrega somente ao gastar uma ação de interlúdio devolvendo o tempo.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__injecao_de_lodo',
    matchNames: ['injeção de lodo', 'injecao de lodo'],
    name: 'Injeção de Lodo',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 60,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    consumable: true,
    maxCharges: 1,
    description:
      'Ação padrão: aplica em si ou aliado adjacente. Até o fim da cena ganha vulnerabilidade a Balístico/Energia, mas na próxima vez que iria a 0 PV fica com 1 PV.',
    mechanics: [
      {
        id: 'mech_injecao_lodo',
        type: 'utility_roll',
        label: 'Injetar Proteção Letal (1 PV)',
        actionCost: 'Ação Padrão',
        notes: 'Evita cair a 0 PV uma vez na cena (fica com 1 PV). Vulnerável a Balístico/Energia.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__instantaneo_mortal',
    matchNames: ['instantâneo mortal', 'instantaneo mortal'],
    name: 'Instantâneo Mortal',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 60,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Empunhando a foto em teste para procurar pistas relacionado à morte retratada, gaste 1 PE para receber +1d20 no teste.',
    mechanics: [
      {
        id: 'mech_instantaneo_mortal',
        type: 'pe_activation',
        label: '+1d20 Investigar Pista',
        peCost: 1,
        actionCost: 'Livre no Teste',
        notes: 'Concede +1d20 em perícia de investigação relacionada à cena da foto.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__camera_obscura',
    matchNames: ['câmera obscura', 'camera obscura'],
    name: 'Câmera Obscura',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 60,
    category: 'III',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Ação padrão + 1 PE: fotografa criatura em alcance curto (DT Pre +10). Se falhar perde invisibilidade/camuflagem/incorporeidade e sofre 6d6 dano de frio.',
    mechanics: [
      {
        id: 'mech_camera_obscura',
        type: 'damage_roll',
        label: 'Fotografar (6d6 Frio)',
        formula: '6d6',
        peCost: 1,
        actionCost: 'Ação Padrão',
        dtFormula: 'PRE',
        notes: 'DT Pre +10. Criatura invisível/incorpórea que falhar sofre 6d6 frio e se materializa.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__repositorio_do_fracasso',
    matchNames: ['repositório do fracasso', 'repositorio do fracasso'],
    name: 'Repositório do Fracasso',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 61,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    maxCharges: 6,
    description:
      'Acumula cargas (máx. 6) quando criaturas tiram 1 no d20. 1x/rodada consome 1 carga para recuperar 1d4 PE (-1 cumulativo em Vontade até o interlúdio).',
    mechanics: [
      {
        id: 'mech_repo_fracasso',
        type: 'heal_pe',
        label: 'Consumir Carga (+1d4 PE)',
        formula: '1d4',
        actionCost: '1x/rodada',
        notes: 'Consome 1 carga; aplica -1 cumulativo em Vontade até o próximo interlúdio.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__arreio_neural',
    matchNames: ['arreio neural'],
    name: 'Arreio Neural',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 61,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    description:
      'Sempre que sofre 5+ dano de eletricidade ou Energia usando o arreio, recupera 1 PE (até 2x VIG por dia).',
    mechanics: [
      {
        id: 'mech_arreio_neural',
        type: 'heal_pe',
        label: 'Converter Choque (+1 PE)',
        flatValue: 1,
        actionCost: 'Ao Sofrer 5+ Energia',
        notes: 'Máximo de PE recuperados por dia igual a 2x Vigor.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__centrifugador_existencial',
    matchNames: ['centrifugador existencial'],
    name: 'Centrifugador Existencial',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 61,
    category: 'III',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    description:
      'Ação padrão + 3 PE: divide-se em duas linhas temporais e recebe um turno adicional na última iniciativa desta rodada.',
    mechanics: [
      {
        id: 'mech_centrifugador',
        type: 'pe_activation',
        label: 'Turno Adicional',
        peCost: 3,
        actionCost: 'Ação Padrão',
        notes: 'Recebe turno extra no fim da iniciativa; uma versão se dissipa ao fim da rodada.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__espelho_refletor',
    matchNames: ['espelho refletor'],
    name: 'Espelho Refletor',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 62,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    description:
      'Ação de movimento: observa fora do ângulo de visão (+1d20 Percepção). Pode sacrificar o espelho ao sofrer dano de Energia para refleti-lo à origem.',
    mechanics: [
      {
        id: 'mech_espelho_refletor',
        type: 'utility_roll',
        label: 'Observar Ângulo (+1d20 Perc.)',
        actionCost: 'Ação de Movimento',
        notes: '+1d20 em Percepção; pode sacrificar p/ refletir dano de Energia.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__valete_da_salvacao',
    matchNames: ['valete da salvação', 'valete da salvacao'],
    name: 'Valete da Salvação',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 46,
    category: 'II',
    spaces: 0.5,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    element: 'Conhecimento',
    consumable: true,
    maxCharges: 1,
    description:
      'Ação padrão: aponta a melhor rota de fuga em alcance médio ou concede sucesso automático ao cortar caminho em perseguição (consumido).',
    mechanics: [
      {
        id: 'mech_valete_salvacao',
        type: 'utility_roll',
        label: 'Revelar Rota / Cortar Caminho',
        actionCost: 'Ação Padrão',
        notes: 'Sucesso automático em Cortar Caminho em perseguição; carta se desfaz.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__lente_de_revelacao',
    matchNames: ['lente de revelação', 'lente de revelacao'],
    name: 'Lente de Revelação',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 46,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    element: 'Conhecimento',
    description:
      'Modificação para câmera de aura: ignora invisibilidade/camuflagem. Ação padrão + 1 PE: revela e materializa criatura (Vontade DT Pre evita).',
    mechanics: [
      {
        id: 'mech_lente_revelacao',
        type: 'pe_activation',
        label: 'Materializar Criatura',
        peCost: 1,
        actionCost: 'Ação Padrão',
        dtFormula: 'PRE',
        notes: 'Vontade DT Pre evita; retira invisibilidade, camuflagem e incorporeidade na cena.',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_02__catalisador_sofisticado_e_horrorizado',
    matchNames: ['catalisador sofisticado e horrorizado'],
    name: 'Catalisador Sofisticado e Horrorizado',
    bookId: 'arquivos_secretos_02',
    bookTitle: 'Arquivos Secretos 02',
    pageNumber: 75,
    category: 'III',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'paranormal',
    maxCharges: 3,
    description:
      'Vestimenta que não é consumida. 1x/cena recebe 3 dados d6; gaste 1d6 como ação livre para +1d6 dano, +1d6 cura PV ou +1d6 na DT de um ritual.',
    mechanics: [
      {
        id: 'mech_catalisador_horrorizado',
        type: 'utility_roll',
        label: 'Gastar 1d6 Catalisador',
        formula: '1d6',
        actionCost: 'Ação Livre',
        notes: 'Soma +1d6 em dano, cura de PV ou DT de ritual na cena (3 cargas/cena).',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_03__gaiola_do_corvo',
    matchNames: ['gaiola do corvo'],
    name: 'Gaiola do Corvo',
    bookId: 'arquivos_secretos_03',
    bookTitle: 'Arquivos Secretos 03',
    pageNumber: 113,
    category: 'IV',
    spaces: 2,
    itemType: 'geral',
    subCategoryGroup: 'paranormal',
    element: 'Morte',
    description:
      'Ação padrão abre no chão (raio 18m terreno difícil de Lodo): início da rodada causa 3d10 dano de Morte (Fortitude DT Vig reduz à metade).',
    mechanics: [
      {
        id: 'mech_gaiola_corvo',
        type: 'damage_roll',
        label: 'Pulso de Lodo (3d10 Morte)',
        formula: '3d10',
        actionCost: 'Início da Rodada',
        dtFormula: 'VIG',
        notes: 'Fortitude DT Vig reduz à metade; consome corpos que ficarem morrendo no Lodo.',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_05__joias_da_mente',
    matchNames: ['joias da mente'],
    name: 'Joias da Mente',
    bookId: 'arquivos_secretos_05',
    bookTitle: 'Arquivos Secretos 05',
    pageNumber: 60,
    category: 'III',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Conhecimento',
    skillBonus: 2,
    targetSkill: 'Diplomacia',
    description:
      'Vestimenta (piercing e brinco usados juntos) que fornece +2 em Diplomacia e resistência a dano mental 10.',
    mechanics: [
      {
        id: 'mech_joias_mente',
        type: 'skill_bonus',
        label: '+2 Diplomacia (RD Mental 10)',
        targetSkill: 'Diplomacia',
        flatValue: 2,
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_05__faixas_da_videncia',
    matchNames: ['faixas da vidência', 'faixas da videncia'],
    name: 'Faixas da Vidência',
    bookId: 'arquivos_secretos_05',
    bookTitle: 'Arquivos Secretos 05',
    pageNumber: 60,
    category: 'III',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    skillBonus: 2,
    targetSkill: 'Intimidação',
    description: 'Vestimenta amaldiçoada de Morte que fornece +2 em Intimidação.',
    mechanics: [
      {
        id: 'mech_faixas_videncia',
        type: 'skill_bonus',
        label: '+2 Intimidação',
        targetSkill: 'Intimidação',
        flatValue: 2,
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_05__tenis_lepidos',
    matchNames: ['tênis lépidos', 'tenis lepidos'],
    name: 'Tênis Lépidos',
    bookId: 'arquivos_secretos_05',
    bookTitle: 'Arquivos Secretos 05',
    pageNumber: 61,
    category: 'III',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Energia',
    skillBonus: 12,
    targetSkill: 'Atletismo',
    description:
      'Vestimenta que fornece +12 em Atletismo e +3m deslocamento. Gaste 2 PE para ignorar terreno difícil, ganhar escalada e imunidade a queda até 9m.',
    mechanics: [
      {
        id: 'mech_tenis_lepidos_skill',
        type: 'skill_bonus',
        label: '+12 Atletismo (+3m Desloc.)',
        targetSkill: 'Atletismo',
        flatValue: 12,
      },
      {
        id: 'mech_tenis_lepidos_pe',
        type: 'pe_activation',
        label: 'Movimento Sobrenatural',
        peCost: 2,
        actionCost: 'Livre',
        notes: 'Ignora terreno difícil, deslocamento de escalada e imune a queda até 9m.',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_06__anel_invertido',
    matchNames: ['anel invertido'],
    name: 'Anel Invertido',
    bookId: 'arquivos_secretos_06',
    bookTitle: 'Arquivos Secretos 06',
    pageNumber: 73,
    category: 'II',
    spaces: 0.5,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Morte',
    description:
      'Ao sofrer dano de um Nidere usando o anel, gaste reação e 2 PE para receber RD 4d10 contra esse dano.',
    mechanics: [
      {
        id: 'mech_anel_invertido',
        type: 'utility_roll',
        label: 'RD vs Nidere (4d10)',
        formula: '4d10',
        peCost: 2,
        actionCost: 'Reação',
        notes: 'Reduz dano causado por Nidere em 4d10.',
      },
    ],
  },
  {
    id: 'item__arquivos_secretos_07__terco_maculado',
    matchNames: ['terço maculado', 'terco maculado'],
    name: 'Terço Maculado',
    bookId: 'arquivos_secretos_07',
    bookTitle: 'Arquivos Secretos 07',
    pageNumber: 79,
    category: 'II',
    spaces: 1,
    itemType: 'vestimenta',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Vestimenta inamovível enquanto vivo: fornece +2d10 em testes a favor da súplica herdada (desobedecer ou tentar tirar causa 2d10 PV de perda).',
    mechanics: [
      {
        id: 'mech_terco_bonus',
        type: 'utility_roll',
        label: 'Bônus da Súplica (+2d10)',
        formula: '2d10',
        notes: 'Soma +2d10 em testes diretamente ligados à súplica herdada.',
      },
      {
        id: 'mech_terco_pena',
        type: 'utility_roll',
        label: 'Punição do Terço (2d10 PV)',
        formula: '2d10',
        notes: 'Perde 2d10 PV ao agir contra a súplica ou tentar remover.',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__conector_de_membros',
    matchNames: ['conector de membros'],
    name: 'Conector de Membros',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 58,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Ação padrão: reconecta braço, perna ou cabeça decepados em até 3 rodadas (sai de morrendo/morto para inconsciente com 1 PV; 25% chance de sequela).',
    mechanics: [
      {
        id: 'mech_conector_membros',
        type: 'utility_roll',
        label: 'Reconectar Membro',
        actionCost: 'Ação Padrão',
        notes: 'Alvo morrendo/morto por decepamento fica inconsciente com 1 PV (25% sequela).',
      },
    ],
  },
  {
    id: 'item__sobrevivendo_ao_horror__mandibula_agonizante',
    matchNames: ['mandíbula agonizante', 'mandibula agonizante'],
    name: 'Mandíbula Agonizante',
    bookId: 'sobrevivendo_ao_horror',
    bookTitle: 'Sobrevivendo ao Horror',
    pageNumber: 58,
    category: 'II',
    spaces: 1,
    itemType: 'geral',
    subCategoryGroup: 'amaldicoado',
    element: 'Sangue',
    description:
      'Ação padrão: gritos acobertam sons em 30m até o fim da cena (sucesso automático p/ distrair). Criaturas de Sangue fazem Vontade DT 35 para não irem até ela.',
    mechanics: [
      {
        id: 'mech_mandibula_agonizante',
        type: 'utility_roll',
        label: 'Arremessar Isca (DT 35 Sangue)',
        actionCost: 'Ação Padrão',
        dtFormula: '35',
        notes: 'Acoberta som em 30m e atrai criaturas de Sangue (Vontade DT 35).',
      },
    ],
  },
];

const EXCLUDED_SUBCATEGORIES = new Set([
  'aliado',
  'doença',
  'doenca',
  'doença / veneno',
  'doenca / veneno',
  'veneno',
  'veículo / regalia',
  'veiculo / regalia',
  'modificação de arma',
  'modificacao de arma',
]);

// Maldições que são encantamentos de arma/proteção/acessório (e não itens autônomos)
const PURE_CURSE_MODIFICATION_NAMES = new Set([
  'antielemento',
  'ritualística',
  'ritualistica',
  'sombria',
  'cinética',
  'cinetica',
  'lépida',
  'lepida',
  'voltaica',
  'letárgica',
  'letargica',
  'repulsiva',
  'regenerativa',
  'sádica',
  'sadica',
  'carisma',
  'conjuração',
  'conjuracao',
  'escudo mental',
  'reflexão',
  'reflexao',
  'sagacidade',
  'destreza',
  'potência',
  'potencia',
  'esforço adicional',
  'esforco adicional',
  'disposição',
  'disposicao',
  'pujança',
  'pujanca',
  'vitalidade',
  'proteção elemental',
  'protecao elemental',
]);

const NON_ITEM_GLOSSARY_NAMES = new Set([
  'corpo a corpo',
  'ataque à distância',
  'ataque a distancia',
  'arremesso',
  'disparo',
  'fogo',
  'leve',
  'duas mãos',
  'duas maos',
  'motoserra',
  'motosserra',
  'laçar',
  'lacar',
  'medo)',
  'lado',
  'local',
  'aprimorado',
  'discreto',
  'função adicional',
  'funcao adicional',
  'instrumental',
  'bateria potente',
]);

const CURSES_WRONGLY_TAGGED_PROTECTION = new Set([
  'senciente',
  'empuxo',
  'energética',
  'energetica',
  'vibrante',
  'consumidora',
  'erosiva',
  'repulsora',
  'lancinante',
  'predadora',
  'sanguinária',
  'sanguinaria',
  'abascanta',
  'profética',
  'profetica',
]);

const TEMPLATE_BY_NAME = new Map<string, OfficialItemTemplate>();
for (const tpl of OFFICIAL_ITEM_TEMPLATES) {
  for (const nm of tpl.matchNames) {
    TEMPLATE_BY_NAME.set(nm.toLowerCase(), tpl);
  }
}

function classifySubCategoryGroup(
  ent: CompendiumEntity,
  tpl?: OfficialItemTemplate
): InventoryItemCategoryGroup {
  if (tpl) return tpl.subCategoryGroup;
  const sub = (ent.subCategory || '').toLowerCase();
  const desc = `${ent.name} ${ent.description || ''}`.toLowerCase();
  if (sub.includes('amaldiçoado') || sub.includes('amaldicoado')) return 'amaldicoado';
  if (sub.includes('paranormal')) return 'paranormal';
  if (sub.includes('proteç') || sub.includes('protec')) return 'protecao';
  if (desc.includes('vestimenta') || desc.includes('utensílio') || desc.includes('utensilio') || desc.includes('kit de perícia')) {
    return 'acessorio';
  }
  if (desc.includes('granada') || desc.includes('explosiv') || desc.includes('dinamite')) return 'explosivo';
  if (desc.includes('curar') || desc.includes('recuperar') || desc.includes('cicatriz') || desc.includes('medicamento')) {
    return 'cura';
  }
  return 'operacional';
}

function detectItemTypeFromText(
  name: string,
  subCategory: string,
  description: string
): 'geral' | 'vestimenta' | 'utensilio' | 'protecao' | 'escudo' {
  const lower = `${name} ${subCategory} ${description}`.toLowerCase();
  if (name.toLowerCase().includes('escudo')) return 'escudo';
  if (subCategory.toLowerCase().includes('proteç') || name.toLowerCase().includes('proteção') || name.toLowerCase().includes('capacete tático')) {
    return 'protecao';
  }
  if (lower.includes('vestimenta')) return 'vestimenta';
  if (lower.includes('utensílio') || lower.includes('utensilio')) return 'utensilio';
  return 'geral';
}

/**
 * Extrai Categoria e Espaços diretamente do texto canônico quando os metadados do OCR vierem vazios.
 */
function extractItemMetadataFromDescription(
  ent: CompendiumEntity
): { category?: '0' | 'I' | 'II' | 'III' | 'IV'; spaces?: number } {
  const text = `${ent.description || ''} ${ent.summary || ''}`;
  let category: '0' | 'I' | 'II' | 'III' | 'IV' | undefined;
  let spaces: number | undefined;

  const catMatch = text.match(/CATEGORIA\s+(IV|III|II|I|0)\b/i);
  if (catMatch) {
    category = normalizeItemCategory(catMatch[1]);
  }

  const espMatch = text.match(/(\d+(?:[.,]\d+)?)\s*ESPA[ÇC]OS?\b/i);
  if (espMatch) {
    spaces = parseSpacesInput(espMatch[1], 1);
  }

  return { category, spaces };
}

/**
 * Sintetiza mecânicas interativas básicas para itens do Compêndio que ainda não têm template manual,
 * lendo custo em PE, ação e fórmulas de dados já existentes na entidade.
 */
function inferMechanicsFromEntity(ent: CompendiumEntity): ItemMechanic[] {
  const desc = ent.description || ent.summary || '';
  const lower = desc.toLowerCase();
  const formulas = (ent.diceFormulas || []).filter((f) => /^\d+d\d+/i.test(f));

  const actionMatch = desc.match(/a[çc][ãa]o\s+(padr[ãa]o|de movimento|completa|livre)|rea[çc][ãa]o/i);
  const actionCost = actionMatch
    ? actionMatch[0].replace(/^./, (c) => c.toUpperCase())
    : undefined;

  const peMatch = desc.match(/gast(?:ar|e|ando)\s+(?:uma?\s+a[çc][ãa]o[^.]*?e\s+)?(\d+)\s*PE\b/i);
  const peCost = peMatch ? parseInt(peMatch[1], 10) : undefined;

  const mechanics: ItemMechanic[] = [];

  if (formulas.length > 0) {
    const primaryFormula = formulas[0];
    if (lower.includes('pontos de vida') && (lower.includes('recupera') || lower.includes('cura'))) {
      mechanics.push({
        id: `auto_${ent.id}_heal_pv`,
        type: 'heal_pv',
        label: `Curar (${primaryFormula} PV)`,
        formula: primaryFormula,
        peCost,
        actionCost,
      });
    } else if (lower.includes('pe') && (lower.includes('recupera') || lower.includes('armazena'))) {
      mechanics.push({
        id: `auto_${ent.id}_heal_pe`,
        type: 'heal_pe',
        label: `Recuperar (${primaryFormula} PE)`,
        formula: primaryFormula,
        peCost,
        actionCost,
      });
    } else if (lower.includes('dano') || lower.includes('sofre') || lower.includes('causa')) {
      mechanics.push({
        id: `auto_${ent.id}_dmg`,
        type: 'damage_roll',
        label: `Rolar (${primaryFormula})`,
        formula: primaryFormula,
        peCost,
        actionCost,
      });
    } else {
      mechanics.push({
        id: `auto_${ent.id}_roll`,
        type: 'utility_roll',
        label: `Rolar Efeito (${primaryFormula})`,
        formula: primaryFormula,
        peCost,
        actionCost,
      });
    }
  } else if (peCost && peCost > 0) {
    mechanics.push({
      id: `auto_${ent.id}_pe`,
      type: 'pe_activation',
      label: `Ativar Item`,
      peCost,
      actionCost,
      notes: ent.summary || undefined,
    });
  } else if (actionCost) {
    mechanics.push({
      id: `auto_${ent.id}_act`,
      type: 'utility_roll',
      label: `Usar (${actionCost})`,
      actionCost,
      notes: ent.summary || undefined,
    });
  }

  return mechanics;
}

/**
 * Retorna a lista curada e enriquecida de itens do Compêndio para importação na ficha do agente.
 * Remove ruídos (doenças, regras de veículo, modificações/maldições de arma, glossário de combate),
 * preserva todos os itens comuns, paranormais e amaldiçoados autônomos e enriquece stats/mecânicas.
 */
export function getCuratedCompendiumItems(
  entities: CompendiumEntity[],
  unlockedBookIds?: string[]
): CuratedCompendiumItem[] {
  const result: CuratedCompendiumItem[] = [];
  const usedTemplateIds = new Set<string>();

  const availableBooks = new Set<string>(['livro_base']);
  if (unlockedBookIds && unlockedBookIds.length > 0) {
    unlockedBookIds.forEach((b) => availableBooks.add(b));
  }
  for (const e of entities) {
    if (e.bookId) availableBooks.add(e.bookId);
  }

  for (const ent of entities) {
    if (ent.category !== 'item') continue;

    const subLower = (ent.subCategory || '').trim().toLowerCase();
    const nameLower = (ent.name || '').trim().toLowerCase();

    if (EXCLUDED_SUBCATEGORIES.has(subLower)) continue;
    if (NON_ITEM_GLOSSARY_NAMES.has(nameLower)) continue;
    if (subLower.includes('maldição') || subLower.includes('maldicao')) {
      if (PURE_CURSE_MODIFICATION_NAMES.has(nameLower)) continue;
    }
    if (subLower === 'proteção' && CURSES_WRONGLY_TAGGED_PROTECTION.has(nameLower)) continue;
    if (subLower === 'modificação' && nameLower !== 'kit de perícia' && !nameLower.includes('proteção') && nameLower !== 'escudo') {
      continue;
    }

    const tpl = TEMPLATE_BY_NAME.get(nameLower);
    if (tpl) {
      usedTemplateIds.add(tpl.id);
    }

    const parsedMeta = extractItemMetadataFromDescription(ent);

    const category = tpl
      ? tpl.category
      : ent.itemCategory
      ? normalizeItemCategory(ent.itemCategory)
      : parsedMeta.category || (subLower.includes('amaldi') ? 'II' : 'I');
    const spaces = tpl
      ? tpl.spaces
      : ent.spaces !== undefined && ent.spaces !== null && String(ent.spaces).trim() !== ''
      ? parseSpacesInput(ent.spaces, 1)
      : parsedMeta.spaces ?? 1;
    const itemType = tpl
      ? tpl.itemType
      : detectItemTypeFromText(ent.name, ent.subCategory || '', ent.description || ent.summary || '');
    const subCategoryGroup = classifySubCategoryGroup(ent, tpl);
    const element = (
      tpl?.element ||
      (ent.element && ent.element !== 'Nenhum' ? ent.element : 'Nenhum')
    ) as ParanormalElement;

    const rawDesc = ent.description || ent.summary || '';
    const description = tpl
      ? rawDesc.length > tpl.description.length + 20 && rawDesc.toLowerCase().includes('pv')
        ? rawDesc
        : tpl.description
      : rawDesc;

    const mechanics =
      tpl && tpl.mechanics.length > 0
        ? tpl.mechanics.map((m) => ({ ...m }))
        : inferMechanicsFromEntity(ent);

    result.push({
      id: ent.id,
      name: tpl ? tpl.name : ent.name,
      bookId: ent.bookId || tpl?.bookId || 'livro_base',
      bookTitle: ent.bookTitle || tpl?.bookTitle || 'Livro Base',
      pageNumber: ent.pageNumber || tpl?.pageNumber,
      category,
      spaces,
      itemType,
      subCategoryGroup,
      element,
      description,
      consumable: tpl?.consumable,
      maxCharges: tpl?.maxCharges,
      loadBonus: tpl?.loadBonus,
      blockRdBonus: tpl?.blockRdBonus,
      skillBonus: tpl?.skillBonus ?? (itemType === 'vestimenta' || itemType === 'utensilio' ? 2 : undefined),
      targetSkill: tpl?.targetSkill,
      mechanics,
      sourceEntity: ent,
    });
  }

  // Adiciona itens canônicos oficiais que não estavam como entidades individuais no seed
  for (const tpl of OFFICIAL_ITEM_TEMPLATES) {
    if (usedTemplateIds.has(tpl.id)) continue;
    if (!availableBooks.has(tpl.bookId)) continue;

    result.push({
      id: tpl.id,
      name: tpl.name,
      bookId: tpl.bookId,
      bookTitle: tpl.bookTitle,
      pageNumber: tpl.pageNumber,
      category: tpl.category,
      spaces: tpl.spaces,
      itemType: tpl.itemType,
      subCategoryGroup: tpl.subCategoryGroup,
      element: tpl.element || 'Nenhum',
      description: tpl.description,
      consumable: tpl.consumable,
      maxCharges: tpl.maxCharges,
      loadBonus: tpl.loadBonus,
      blockRdBonus: tpl.blockRdBonus,
      skillBonus: tpl.skillBonus,
      targetSkill: tpl.targetSkill,
      mechanics: tpl.mechanics.map((m) => ({ ...m })),
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function buildCatalogItemFromCuratedItem(item: CuratedCompendiumItem): CustomCatalogItem {
  const now = new Date().toISOString();
  return {
    id: `citem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: item.name,
    baseItemId: item.id,
    baseItemName: item.name,
    itemType: item.itemType,
    subCategoryGroup: item.subCategoryGroup,
    baseCategory: item.category,
    baseSpaces: item.spaces,
    finalCategory: item.category,
    finalSpaces: item.spaces,
    details: item.description,
    element: item.element,
    modifications: [],
    customModifications: [],
    skillBonus: item.skillBonus,
    targetSkill: item.targetSkill,
    consumable: item.consumable,
    maxCharges: item.maxCharges,
    loadBonus: item.loadBonus,
    blockRdBonus: item.blockRdBonus,
    mechanics: item.mechanics.map((m) => ({ ...m })),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildInventoryItemFromCuratedItem(
  item: CuratedCompendiumItem,
  quantity = 1
): CharacterInventoryItem {
  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: item.name,
    category: item.category,
    spaces: item.spaces,
    details: item.description,
    equipped: true,
    itemType: item.itemType,
    isVestimenta: item.itemType === 'vestimenta',
    isUtensilio: item.itemType === 'utensilio',
    skillBonus: item.skillBonus,
    targetSkill: item.targetSkill,
    quantity: Math.max(1, quantity),
    charges: item.maxCharges,
    maxCharges: item.maxCharges,
    consumable: item.consumable,
    subCategoryGroup: item.subCategoryGroup,
    element: item.element,
    sourceEntityId: item.sourceEntity?.id || item.id,
    loadBonus: item.loadBonus,
    blockRdBonus: item.blockRdBonus,
    mechanics: item.mechanics.map((m) => ({ ...m })),
  };
}

export function buildInventoryItemFromCatalogItem(
  catalogItem: CustomCatalogItem,
  options: { linkMode: 'shared' | 'copied'; quantity?: number }
): CharacterInventoryItem {
  return {
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
    quantity: Math.max(1, options.quantity ?? 1),
    charges: catalogItem.maxCharges,
    maxCharges: catalogItem.maxCharges,
    consumable: catalogItem.consumable,
    subCategoryGroup: catalogItem.subCategoryGroup,
    element: catalogItem.element,
    sourceEntityId: catalogItem.baseItemId,
    customItemId: catalogItem.id,
    linkMode: options.linkMode,
    modifications: [...(catalogItem.modifications || [])],
    customModifications: catalogItem.customModifications
      ? catalogItem.customModifications.map((m) => ({ ...m }))
      : undefined,
    loadBonus: catalogItem.loadBonus,
    blockRdBonus: catalogItem.blockRdBonus,
    mechanics: (catalogItem.mechanics || []).map((m) => ({ ...m })),
  };
}

export function buildCatalogItemFromInventoryItem(
  inv: CharacterInventoryItem,
  idOverride?: string
): CustomCatalogItem {
  const now = new Date().toISOString();
  const itemType = inv.itemType || (inv.isVestimenta ? 'vestimenta' : inv.isUtensilio ? 'utensilio' : 'geral');
  const modIds = inv.modifications || [];
  const customMods = inv.customModifications || [];
  const catSteps =
    modIds.reduce((acc, m) => acc + (OFFICIAL_ACCESSORY_MODS_MAP.get(m)?.categoryIncrease || 0), 0) +
    customMods.reduce((acc, m) => acc + (m.categoryIncrease || 0), 0);
  const spaceDelta =
    modIds.reduce((acc, m) => acc + (OFFICIAL_ACCESSORY_MODS_MAP.get(m)?.spacesChange || 0), 0) +
    customMods.reduce((acc, m) => acc + (m.spacesChange || 0), 0);

  const finalCat = normalizeItemCategory(inv.category);
  const baseCatIdx = Math.max(0, ITEM_CATEGORIES_ORDER.indexOf(finalCat) - catSteps);
  const baseCategory = ITEM_CATEGORIES_ORDER[baseCatIdx] || '0';
  const baseSpaces = roundSpaces(Math.max(0, (inv.spaces ?? 1) - spaceDelta));

  return {
    id: idOverride || inv.customItemId || `citem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: inv.name,
    baseItemId: inv.sourceEntityId,
    baseItemName: inv.name,
    itemType,
    subCategoryGroup: inv.subCategoryGroup || 'operacional',
    baseCategory,
    baseSpaces,
    finalCategory: finalCat,
    finalSpaces: inv.spaces ?? 1,
    details: inv.details || '',
    element: inv.element || 'Nenhum',
    modifications: [...modIds],
    customModifications: customMods.map((m) => ({ ...m })),
    skillBonus: inv.skillBonus,
    targetSkill: inv.targetSkill,
    secondarySkill: inv.secondarySkill,
    secondaryBonus: inv.secondaryBonus,
    instrumentalSkill: inv.instrumentalSkill,
    justification: inv.justification,
    consumable: inv.consumable,
    maxCharges: inv.maxCharges,
    loadBonus: inv.loadBonus,
    blockRdBonus: inv.blockRdBonus,
    mechanics: (inv.mechanics || []).map((m) => ({ ...m })),
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneCatalogItemForAgent(
  item: CustomCatalogItem,
  agentName: string
): CustomCatalogItem {
  const now = new Date().toISOString();
  const cleanAgent = (agentName || 'Agente').trim() || 'Agente';
  return {
    ...item,
    id: `citem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${item.name} (${cleanAgent})`,
    modifications: [...(item.modifications || [])],
    customModifications: (item.customModifications || []).map((m) => ({ ...m })),
    mechanics: (item.mechanics || []).map((m) => ({ ...m })),
    createdAt: now,
    updatedAt: now,
  };
}

export function syncCharacterWithCatalogItem(
  character: CharacterSheet,
  catalogItem: CustomCatalogItem
): { updated: CharacterSheet; changed: boolean } {
  const inv = character.inventory || [];
  let changed = false;

  const nextInventory = inv.map((it) => {
    if (it.customItemId !== catalogItem.id) return it;
    if (it.linkMode === 'copied') return it;
    changed = true;
    return {
      ...it,
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
      consumable: catalogItem.consumable,
      maxCharges: catalogItem.maxCharges,
      charges:
        catalogItem.maxCharges !== undefined
          ? Math.min(it.charges ?? catalogItem.maxCharges, catalogItem.maxCharges)
          : undefined,
      subCategoryGroup: catalogItem.subCategoryGroup,
      element: catalogItem.element,
      modifications: [...(catalogItem.modifications || [])],
      customModifications: catalogItem.customModifications
        ? catalogItem.customModifications.map((m) => ({ ...m }))
        : undefined,
      loadBonus: catalogItem.loadBonus,
      blockRdBonus: catalogItem.blockRdBonus,
      mechanics: (catalogItem.mechanics || []).map((m) => ({ ...m })),
    };
  });

  if (!changed) return { updated: character, changed: false };
  return {
    changed: true,
    updated: {
      ...character,
      inventory: nextInventory,
      updatedAt: new Date().toISOString(),
    },
  };
}

export interface InventoryMechanicsSummary {
  totalSpacesUsed: number;
  totalLoadBonusFromItems: number;
  totalBlockRdBonus: number;
  categoryCounts: Record<'0' | 'I' | 'II' | 'III' | 'IV', number>;
  ownedKits: string[];
}

export function calculateInventoryMechanicsSummary(
  inventory: CharacterInventoryItem[] = []
): InventoryMechanicsSummary {
  let totalSpacesUsed = 0;
  let totalLoadBonusFromItems = 0;
  let totalBlockRdBonus = 0;
  const categoryCounts: Record<'0' | 'I' | 'II' | 'III' | 'IV', number> = {
    '0': 0,
    I: 0,
    II: 0,
    III: 0,
    IV: 0,
  };
  const ownedKitSet = new Set<string>();

  for (const item of inventory) {
    const qty = item.quantity !== undefined ? Math.max(0, item.quantity) : 1;
    totalSpacesUsed += (item.spaces || 0) * qty;

    if (qty > 0) {
      const cat = normalizeItemCategory(item.category);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;
    }

    const isEquipped = item.equipped !== false;
    if (!isEquipped || qty <= 0) continue;

    // Bônus de carga (ex: Mochila Militar +2 espaços)
    if (item.loadBonus && item.loadBonus > 0) {
      totalLoadBonusFromItems += item.loadBonus;
    } else if (item.mechanics) {
      for (const m of item.mechanics) {
        if (m.type === 'load_bonus' && m.flatValue && m.flatValue > 0) {
          totalLoadBonusFromItems += m.flatValue;
        }
      }
    }

    // Bônus de RD ao Bloqueio (ex: Braçadeira Reforçada +2)
    if (item.blockRdBonus && item.blockRdBonus > 0) {
      totalBlockRdBonus += item.blockRdBonus;
    } else if (item.mechanics) {
      for (const m of item.mechanics) {
        if (m.type === 'block_rd_bonus' && m.flatValue && m.flatValue > 0) {
          totalBlockRdBonus += m.flatValue;
        }
      }
    }

    // Kits de Perícia / Modificação Instrumental
    if (item.instrumentalSkill && item.instrumentalSkill.trim()) {
      ownedKitSet.add(item.instrumentalSkill.trim());
    }
    if (item.name.toLowerCase().includes('kit de ') && item.targetSkill) {
      ownedKitSet.add(item.targetSkill.trim());
    }
  }

  return {
    totalSpacesUsed: roundSpaces(totalSpacesUsed),
    totalLoadBonusFromItems,
    totalBlockRdBonus,
    categoryCounts,
    ownedKits: Array.from(ownedKitSet),
  };
}

/**
 * Calcula a DT de itens explosivos/operacionais (10 + limite de PE por rodada + atributo).
 */
export function calculateItemSaveDt(
  character: CharacterSheet,
  dtFormula?: string
): { dt: number; label: string } | null {
  if (!dtFormula) return null;
  const clean = dtFormula.trim().toUpperCase();
  const peRound = character.peRound || Math.max(1, Math.floor((character.nex || 5) / 5));

  if (clean === 'AGI' || clean === 'INT' || clean === 'PRE' || clean === 'VIG' || clean === 'FOR') {
    const attrVal = character.attributes?.[clean] ?? 0;
    return {
      dt: 10 + peRound + attrVal,
      label: `DT ${clean} ${10 + peRound + attrVal}`,
    };
  }

  const fixed = parseInt(clean, 10);
  if (Number.isFinite(fixed) && fixed > 0) {
    return { dt: fixed, label: `DT ${fixed}` };
  }

  return null;
}
