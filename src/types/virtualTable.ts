import { CharacterSheet, ParanormalElement } from './compendium';

export type TableRole = 'master' | 'player' | 'spectator';

export interface TableAgentSnapshot {
  id: string;
  name: string;
  player: string;
  classTitle: string;
  nex: number;
  rank: string;
  avatarIcon?: string;
  pvCurrent: number;
  pvMax: number;
  peCurrent: number;
  peMax: number;
  sanCurrent: number;
  sanMax: number;
  defense: number;
  conditions: string[]; // ex: "Sangrando", "Inconsciente", "Abalado", "Perturbado"
  displacement?: string;
  updatedAt: string;
}

export interface TableParticipant {
  userId: string;
  userName: string;
  role: TableRole;
  isOnline: boolean;
  lastPing: number;
  agent?: TableAgentSnapshot;
}

export type TableRollActionType =
  | 'skill'
  | 'attack'
  | 'damage'
  | 'initiative'
  | 'sanity'
  | 'ritual'
  | 'formula';

export interface TableRollEvent {
  id: string;
  senderId: string;
  senderName: string;
  characterName?: string;
  actionType: TableRollActionType;
  label: string;
  formula: string;
  diceResults: number[];
  chosenDie?: number;
  bonus: number;
  total: number;
  isCritical?: boolean;
  isFumble?: boolean;
  isSecret?: boolean;
  details?: string;
  timestamp: string;
}

export interface TableInitiativeItem {
  id: string;
  refId?: string; // id do agente, monstro ou NPC
  type: 'agent' | 'monster' | 'custom';
  name: string;
  initiative: number;
  pvCurrent?: number;
  pvMax?: number;
  isDefeated?: boolean;
  isHidden?: boolean; // Monstros ocultos até que o mestre revele
  notes?: string;
}

export interface TableCombatState {
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  entries: TableInitiativeItem[];
}

export interface TableSceneBroadcast {
  id: string;
  title: string;
  summary: string;
  details?: string;
  imageUrl?: string;
  clues: Array<{ id: string; text: string; isFound: boolean }>;
  broadcastedAt: string;
}

export interface VirtualTableRoomConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  enableSecretRolls?: boolean;
  showMonsterHealthBar?: boolean; // Se mostra barra de PV para jogadores
}

export interface VirtualTableRoomState {
  roomId: string; // ex: "ORD-8924"
  title: string;
  masterId: string;
  masterName: string;
  campaignId?: string;
  participants: Record<string, TableParticipant>;
  combat: TableCombatState;
  activeScene?: TableSceneBroadcast;
  recentRolls: TableRollEvent[];
  updatedAt: string;
  config?: VirtualTableRoomConfig;
}

export function createEmptyCombatState(): TableCombatState {
  return {
    isActive: false,
    round: 1,
    currentTurnIndex: 0,
    entries: [],
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ORD-${code}`;
}

export function snapshotFromSheet(sheet: CharacterSheet): TableAgentSnapshot {
  // Coleta possíveis condições a partir de anotações ou estado
  const conditions: string[] = [];
  if (sheet.pvCurrent <= 0) {
    conditions.push('Morrendo');
  } else if (sheet.pvCurrent < sheet.pvMax / 2) {
    conditions.push('Machucado');
  }
  if (sheet.sanCurrent <= 0) {
    conditions.push('Enlouquecendo');
  }

  return {
    id: sheet.id,
    name: sheet.name,
    player: sheet.player,
    classTitle: sheet.classId || 'Agente',
    nex: sheet.nex || 5,
    rank: sheet.rank || 'Recruta',
    pvCurrent: sheet.pvCurrent,
    pvMax: sheet.pvMax,
    peCurrent: sheet.peCurrent,
    peMax: sheet.peMax,
    sanCurrent: sheet.sanCurrent,
    sanMax: sheet.sanMax,
    defense: 10 + (sheet.attributes?.AGI || 0) + (sheet.defenseBonus || 0),
    conditions,
    displacement: sheet.displacement || '9m',
    updatedAt: new Date().toISOString(),
  };
}
