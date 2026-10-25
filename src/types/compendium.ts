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

export interface WeaponModificationDef {
  id: string;
  name: string;
  categoryIncrease: number;
  description: string;
  appliesTo: 'all' | 'melee' | 'firearm' | 'ranged';
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
  
  // Modificações aplicadas
  modifications: string[]; // IDs de modificações
  customModifications?: Array<{
    id: string;
    name: string;
    effect: string;
    categoryIncrease: number;
  }>;
  
  // Estatísticas finais calculadas
  finalDamage: string;
  finalCritical: string;
  finalRange: string;
  finalCategory: string;
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
};
