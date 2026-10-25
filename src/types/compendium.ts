export type EntityCategory =
  | 'ritual'
  | 'power'
  | 'origin'
  | 'class'
  | 'track'
  | 'weapon'
  | 'item'
  | 'creature'
  | 'skill'
  | 'condition'
  | 'rule';

export type ParanormalElement =
  | 'Sangue'
  | 'Morte'
  | 'Conhecimento'
  | 'Energia'
  | 'Medo'
  | 'Variável'
  | 'Nenhum';

export interface CompendiumEntity {
  id: string;
  category: EntityCategory;
  subCategory: string;
  name: string;
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  element: string;
  summary: string;
  description: string;
  tags: string[];
  diceFormulas?: string[];

  // Ritual fields
  circle?: number;
  execution?: string;
  range?: string;
  target?: string;
  duration?: string;
  resistance?: string;
  discente?: string;
  verdadeiro?: string;

  // Origin fields
  trainedSkills?: string;
  powerName?: string;
  powerDescription?: string;

  // Class & Track fields
  className?: string;
  initialPV?: string;
  pvPerNex?: string;
  initialPE?: string;
  pePerNex?: string;
  initialSAN?: string;
  sanPerNex?: string;
  proficiencies?: string;

  // Power fields
  prerequisite?: string;
  affinity?: string;

  // Weapon & Item fields
  itemCategory?: string;
  damage?: string;
  critical?: string;
  damageType?: string;
  spaces?: string;
  proficiency?: string;
  handedness?: string;

  // Skill & Condition fields
  baseAttribute?: 'AGI' | 'FOR' | 'INT' | 'PRE' | 'VIG';
  trainedOnly?: boolean;
  armorPenalty?: boolean;
  requiresKit?: boolean;
  conditionType?: string;

  // Creature / Threat fields
  vd?: number;
  defense?: number;
  pv?: number;
  attributes?: Record<string, string>;
  disturbingPresence?: string;

  // User customization flags
  isCustom?: boolean;
  isEdited?: boolean;
  updatedAt?: string;
}

export interface TocEntry {
  level: number;
  title: string;
  page: number;
}

export interface BookInfo {
  id: string;
  title: string;
  fileName: string;
  pageCount: number;
  toc: TocEntry[];
}

export interface BookPage {
  pageNumber: number;
  section: string;
  text: string;
}

export interface BookWithPages extends BookInfo {
  pages: BookPage[];
}

export type EntityClassFilter = 'Combatente' | 'Especialista' | 'Ocultista' | 'none';

export type ExcludableType =
  | 'rules'
  | 'missionStories'
  | 'creatures'
  | 'items'
  | 'weapons'
  | 'origins'
  | 'conditions'
  | 'rituals'
  | 'powers';

export interface CompendiumFilters {
  query: string;
  category: EntityCategory | 'all';
  bookId: string | 'all';
  element: string | 'all';
  circle: number | 'all';
  itemCategory: string | 'all';
  classes?: EntityClassFilter[];
  excludedTypes?: ExcludableType[];
  minVd?: number;
  maxVd?: number;
  onlyFavorites?: boolean;
  onlyCustomOrEdited?: boolean;
}

export interface SavedList {
  id: string;
  name: string;
  description: string;
  entityIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export type TrainingDegree = 0 | 5 | 10 | 15;

export interface CharacterAttributes {
  AGI: number;
  FOR: number;
  INT: number;
  PRE: number;
  VIG: number;
}

export interface CharacterAttack {
  id: string;
  name: string;
  test: string; // e.g., "Pontaria (3d20+10)", "Luta (2d20+5)"
  skillName?: string; // e.g. "Pontaria" or "Luta"
  attackBonus?: number; // e.g. +2 Certeira
  damage: string; // e.g., "2d10+4"
  critical: string; // e.g., "18/x3"
  range: string; // e.g., "Médio", "Curto", "Corpo a corpo"
  special: string; // e.g., "Balístico • Mira Laser • Perigosa"
  customWeaponId?: string;
}

export interface CharacterAbility {
  id: string;
  name: string;
  cost: string; // e.g., "2 PE", "Passiva"
  originPage: string; // e.g., "Origem Policial", "NEX 10%", "Compêndio p. 45"
  description: string;
  type: 'habilidade' | 'ritual' | 'poder';
}

export interface CharacterInventoryItem {
  id: string;
  name: string;
  category: '0' | 'I' | 'II' | 'III' | 'IV';
  spaces: number;
  details?: string;
  equipped?: boolean;
}

export interface CharacterSkillEntry {
  degree: TrainingDegree;
  bonus: number;
  customName?: string;
}

export interface CharacterSheet {
  id: string;
  name: string;
  player: string;
  nex: number; // e.g., 5 to 99
  rank: 'Recruta' | 'Operador' | 'Agente Especial' | 'Oficial de Operações' | 'Agente de Elite';
  originId: string;
  classId: string;
  trackId: string;
  affinity: ParanormalElement;
  attributes: CharacterAttributes;
  
  // Status vitais
  pvCurrent: number;
  pvMax: number;
  peCurrent: number;
  peMax: number;
  sanCurrent: number;
  sanMax: number;
  
  // Defesa, Proteção e Resistências
  defenseBonus: number;
  defenseEquip?: number;
  defenseOther?: number;
  protection?: string;
  resistances?: string;
  
  // Movimentação e Limites da Ficha Oficial
  displacement?: string; // DESL (ex: 9m)
  peRound?: number; // PE / Rodada
  dtRituals?: number; // DT de Rituais
  prestige?: number; // Pontos de Prestígio
  creditLimit?: 'Baixo' | 'Médio' | 'Alto' | 'Ilimitado';
  maxLoadBonus?: number;
  itemLimits?: {
    cat1: number;
    cat2: number;
    cat3: number;
    cat4: number;
  };
  
  // Perícias
  skills: Record<string, CharacterSkillEntry>;
  
  // Tabela ATAQUES
  attacks?: CharacterAttack[];
  
  // HABILIDADES & RITUAIS
  abilities?: CharacterAbility[];
  
  // INVENTÁRIO
  inventory?: CharacterInventoryItem[];
  
  // DESCRIÇÃO & ROLEPLAY
  appearance?: string;
  personality?: string;
  history?: string;
  objective?: string;
  
  entityIds: string[]; // Linked rituals, powers, weapons, items from compendium
  notes: string;
  updatedAt: string;
}

export type WeaponType = 'Corpo a corpo' | 'Disparo' | 'Fogo';
export type WeaponProficiency = 'Simples' | 'Tática' | 'Pesada';
export type WeaponHandedness = 'Uma Mão' | 'Duas Mãos' | 'Leve';

export type ModificationTargetType = 'weapon' | 'ammo';

export interface WeaponModificationDef {
  id: string;
  canonicalEntityId?: string;
  shortId?: string;
  name: string;
  categoryIncrease: number;
  description: string;
  appliesTo: 'all' | 'melee' | 'firearm' | 'ranged';
  targetType?: ModificationTargetType;
  attackBonus?: number;
  damageBonus?: number;
  damageStepIncrease?: number;
  criticalRangeReduction?: number;
  criticalMultiplierIncrease?: number;
  rangeStepIncrease?: number;
  spacesChange?: number;
  element?: ParanormalElement;
  source: 'Livro Base' | 'Sobrevivendo ao Horror' | 'Homebrew';
}

export interface CustomWeapon {
  id: string;
  name: string;
  baseWeaponId?: string;
  baseWeaponName: string;
  weaponType: WeaponType;
  proficiency: WeaponProficiency;
  handedness: WeaponHandedness;
  
  // Base stats
  baseDamage: string;
  baseCritical: string;
  baseRange: string;
  baseDamageType: string;
  baseSpaces: number;
  baseCategory: string; // '0' | 'I' | 'II' | 'III' | 'IV'
  
  // Ammunition / Balas
  ammoType?: string; // 'Balas curtas' | 'Balas longas' | 'Cartuchos' | 'Flechas' | 'Foguete' | 'Combustível' | 'Nenhuma'
  baseAmmoCategory?: string; // '0' | 'I' | 'II' | 'III' | 'IV'
  ammoCategory?: string; // Categoria calculada das balas/munição (ex: '0', 'I', 'II', '—')
  ammoName?: string; // Nome com modificações (ex: "Balas curtas (Dum Dum)")

  // Modificações aplicadas
  modifications: string[]; // IDs de modificações
  customModifications?: Array<{
    id: string;
    name: string;
    effect: string;
    categoryIncrease: number;
    targetType?: ModificationTargetType;
  }>;
  
  // Estatísticas finais calculadas
  finalDamage: string;
  finalCritical: string;
  finalRange: string;
  finalCategory: string; // Categoria final da ARMA (apenas mods de arma)
  weaponCategory?: string; // Alias explícito para categoria da arma
  finalSpaces: number;
  attackBonus: number;
  damageBonus: number;
  element: ParanormalElement;
  specialRules: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DiceRollResult {
  id: string;
  label: string;
  mode: 'skill' | 'formula';
  formulaText: string;
  diceResults: number[];
  chosenDie?: number;
  bonus: number;
  total: number;
  isCritical?: boolean;
  isFumble?: boolean;
  timestamp: string;
}

export interface TabNavigationConfig {
  pinnedTabs: string[]; // Chaves das rotas fixadas diretamente na barra inferior, na ordem exata
  hiddenTabs: string[]; // Chaves das rotas completamente ocultas (não aparecem nem na barra nem no modal)
}

export interface TabMetadata {
  id: string;
  label: string;
  headerTitle: string;
  icon: string;
  description: string;
}

export const KNOWN_TAB_DEFINITIONS: Record<string, TabMetadata> = {
  index: {
    id: 'index',
    label: 'Compêndio',
    headerTitle: 'Guia Ordem Paranormal',
    icon: 'search',
    description: '1.367 entidades canônicas, rituais, itens, armas e ameaças',
  },
  characters: {
    id: 'characters',
    label: 'Agentes',
    headerTitle: 'Fichas de Agentes',
    icon: 'people',
    description: 'Criação assistida e fichas automatizadas de agentes',
  },
  weapons: {
    id: 'weapons',
    label: 'Armaria',
    headerTitle: 'Armaria & Modificações',
    icon: 'construct',
    description: 'Oficina de armas táticas, calibres, acessórios e maldições',
  },
  dice: {
    id: 'dice',
    label: 'Dados',
    headerTitle: 'Rolador Ordem Paranormal',
    icon: 'dice',
    description: 'Rolagens oficiais com atributos, vantagens e fórmulas livres',
  },
  books: {
    id: 'books',
    label: 'Livros',
    headerTitle: 'Acervo de Livros (10 PDFs)',
    icon: 'library',
    description: 'Leitor integrado com 1.261 páginas de 10 livros canônicos',
  },
  favorites: {
    id: 'favorites',
    label: 'Salvos',
    headerTitle: 'Salvos, Listas & Homebrew',
    icon: 'bookmarks',
    description: 'Entidades favoritadas, listas temáticas e homebrews',
  },
  master: {
    id: 'master',
    label: 'Mestre',
    headerTitle: 'Central do Mestre & Campanhas',
    icon: 'skull',
    description: 'Gestão de campanhas, cenas de investigação, combate e fichas',
  },
  table: {
    id: 'table',
    label: 'Mesa',
    headerTitle: 'Mesa Virtual da Ordem',
    icon: 'radio-outline',
    description: 'VTT em tempo real com iniciativa, dados compartilhados e visão geral',
  },
  oracle: {
    id: 'oracle',
    label: 'G.L.I.T.C.H.',
    headerTitle: 'G.L.I.T.C.H. - Guia Lógico de Interferências Transcendentais do Caos Humano',
    icon: 'sparkles',
    description: 'Guia Lógico de Interferências Transcendentais do Caos Humano e Modo Anfitrião',
  },
};

export const DEFAULT_PINNED_TABS: string[] = ['index', 'characters', 'master', 'weapons', 'dice'];
export const DEFAULT_HIDDEN_TABS: string[] = [];

export function getTabMetadata(routeKey: string, customOptions?: { title?: string }): TabMetadata {
  if (KNOWN_TAB_DEFINITIONS[routeKey]) {
    return KNOWN_TAB_DEFINITIONS[routeKey];
  }
  const cleanName = routeKey.replace(/^[(_)]+|[(_)]+$/g, '');
  const capitalized = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : routeKey;
  return {
    id: routeKey,
    label: customOptions?.title || capitalized,
    headerTitle: customOptions?.title || capitalized,
    icon: 'apps-outline',
    description: `Aba ${capitalized}`,
  };
}

export interface UserProfile {
  id: string;
  playerName: string;
  nickname?: string;
  email?: string;
  preferredClass?: string;
  defaultCampaign?: string;
  masterName?: string;
  notes?: string;
  avatarIcon?: string;
  cloudSyncEnabled: boolean;
  cloudSyncUrl?: string;
  lastSyncAt?: string;
  updatedAt: string;
  listingColumns?: 1 | 2;
  navigationConfig?: TabNavigationConfig;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'user_local_1',
  playerName: '',
  nickname: '',
  email: '',
  preferredClass: 'Combatente',
  defaultCampaign: '',
  masterName: '',
  notes: '',
  avatarIcon: 'person',
  cloudSyncEnabled: false,
  updatedAt: new Date().toISOString(),
  listingColumns: 1,
  navigationConfig: {
    pinnedTabs: DEFAULT_PINNED_TABS,
    hiddenTabs: DEFAULT_HIDDEN_TABS,
  },
};

// ==========================================
// ABA DE MESTRE & GERENCIAMENTO DE CAMPANHAS
// ==========================================

export interface CampaignClue {
  id: string;
  text: string;
  isFound: boolean;
}

export interface CampaignStoryScene {
  id: string;
  title: string;
  summary: string;
  details: string;
  clues: CampaignClue[];
  isCompleted?: boolean;
  order?: number;
}

export interface CampaignMonster {
  id: string;
  name: string;
  compendiumEntityId?: string; // ID da criatura original do compêndio, caso importada
  vd: number;
  pvCurrent: number;
  pvMax: number;
  defense: number;
  disturbingPresence?: string;
  element?: string;
  attacks?: string;
  abilities?: string;
  notes?: string;
  isSavedToCompendium?: boolean;
}

export interface CampaignAgentLink {
  id: string;
  sourceType: 'manual_sheet' | 'local_char' | 'shared_code' | 'cloud_sync';
  characterSheet: CharacterSheet;
  originalPlayerName?: string;
  shareCode?: string;
  linkedAt: string;
  lastSyncedAt?: string;
  notes?: string;
}

export interface CampaignInitiativeEntry {
  id: string;
  name: string;
  type: 'agent' | 'monster' | 'custom';
  refId?: string; // id do CampaignAgentLink ou CampaignMonster
  initiative: number;
  manualOverride?: boolean; // indica se foi digitado manualmente na vida real
  notes?: string;
}

export interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  masterNotes?: string;
  threatLevel?: 'Iniciante' | 'Veterano' | 'Especialista' | 'Elite' | 'Extremo';
  recommendedRank?: string;
  stories: CampaignStoryScene[];
  monsters: CampaignMonster[];
  agents: CampaignAgentLink[];
  initiatives: CampaignInitiativeEntry[];
  currentTurnIndex?: number;
  createdAt: string;
  updatedAt: string;
}
