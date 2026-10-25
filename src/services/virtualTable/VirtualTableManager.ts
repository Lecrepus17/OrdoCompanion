import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createEmptyCombatState,
  generateRoomCode,
  snapshotFromSheet,
  TableCombatState,
  TableInitiativeItem,
  TableParticipant,
  TableRole,
  TableRollEvent,
  TableSceneBroadcast,
  VirtualTableRoomConfig,
  VirtualTableRoomState,
} from '../../types/virtualTable';
import { CharacterSheet } from '../../types/compendium';
import {
  IVirtualTableConnector,
  TableConnectionStatus,
  TableEventHandlers,
} from './IVirtualTableConnector';
import { LocalSimTableConnector } from './LocalSimTableConnector';
import { SupabaseTableConnector } from './SupabaseTableConnector';

const STORAGE_KEYS = {
  CONFIG: '@ordem_paranormal:vtt_config_v1',
  LAST_ROOM: '@ordem_paranormal:vtt_last_room_v1',
  SAVED_ROOMS: '@ordem_paranormal:vtt_saved_rooms_v1',
};

export class VirtualTableManager {
  private static instance: VirtualTableManager;
  private connector: IVirtualTableConnector | null = null;
  private currentRoomState: VirtualTableRoomState | null = null;
  private currentParticipant: TableParticipant | null = null;
  private connectionStatus: TableConnectionStatus = 'disconnected';
  private config: VirtualTableRoomConfig = {};
  private listeners: Set<(state: VirtualTableRoomState | null) => void> = new Set();
  private statusListeners: Set<(status: TableConnectionStatus, error?: string) => void> = new Set();
  private rollListeners: Set<(roll: TableRollEvent) => void> = new Set();

  private constructor() {
    this.loadSavedConfig();
  }

  public static getInstance(): VirtualTableManager {
    if (!VirtualTableManager.instance) {
      VirtualTableManager.instance = new VirtualTableManager();
    }
    return VirtualTableManager.instance;
  }

  public async loadSavedConfig(): Promise<VirtualTableRoomConfig> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
      if (raw) {
        this.config = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[VirtualTableManager] Falha ao carregar config:', err);
    }
    return this.config;
  }

  public async saveConfig(patch: Partial<VirtualTableRoomConfig>): Promise<void> {
    this.config = { ...this.config, ...patch };
    await AsyncStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
  }

  public getConfig(): VirtualTableRoomConfig {
    return this.config;
  }

  public getStatus(): TableConnectionStatus {
    return this.connectionStatus;
  }

  public getRoomState(): VirtualTableRoomState | null {
    return this.currentRoomState;
  }

  public getCurrentParticipant(): TableParticipant | null {
    return this.currentParticipant;
  }

  public subscribeToRoomState(callback: (state: VirtualTableRoomState | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentRoomState);
    return () => this.listeners.delete(callback);
  }

  public subscribeToStatus(callback: (status: TableConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);
    return () => this.statusListeners.delete(callback);
  }

  public subscribeToRolls(callback: (roll: TableRollEvent) => void): () => void {
    this.rollListeners.add(callback);
    return () => this.rollListeners.delete(callback);
  }

  /**
   * Cria uma nova Mesa Virtual como Mestre
   */
  public async createTable(options: {
    title: string;
    masterId: string;
    masterName: string;
    campaignId?: string;
    useLocalSim?: boolean;
  }): Promise<{ success: boolean; roomId: string; error?: string }> {
    const roomId = generateRoomCode();
    const participant: TableParticipant = {
      userId: options.masterId,
      userName: options.masterName,
      role: 'master',
      isOnline: true,
      lastPing: Date.now(),
    };

    const initialData: Partial<VirtualTableRoomState> = {
      roomId,
      title: options.title || `Mesa ${roomId}`,
      masterId: options.masterId,
      masterName: options.masterName,
      campaignId: options.campaignId,
      combat: createEmptyCombatState(),
      recentRolls: [],
    };

    const success = await this.establishConnection(roomId, participant, initialData, options.useLocalSim);
    if (success) {
      await this.saveLastRoom(roomId);
      return { success: true, roomId };
    }
    return { success: false, roomId, error: 'Não foi possível conectar à sala criada.' };
  }

  /**
   * Entra em uma Mesa Virtual existente
   */
  public async joinTable(options: {
    roomId: string;
    userId: string;
    userName: string;
    role?: TableRole;
    characterSheet?: CharacterSheet;
    useLocalSim?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    const cleanRoomId = options.roomId.trim().toUpperCase();
    const participant: TableParticipant = {
      userId: options.userId,
      userName: options.userName,
      role: options.role || 'player',
      isOnline: true,
      lastPing: Date.now(),
      agent: options.characterSheet ? snapshotFromSheet(options.characterSheet) : undefined,
    };

    const success = await this.establishConnection(cleanRoomId, participant, {}, options.useLocalSim);
    if (success) {
      await this.saveLastRoom(cleanRoomId);
      return { success: true };
    }
    return { success: false, error: 'Falha ao conectar à sala. Verifique o código informado.' };
  }

  /**
   * Desconecta da Mesa atual
   */
  public async leaveTable(): Promise<void> {
    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
    }
    this.currentRoomState = null;
    this.currentParticipant = null;
    this.updateStatus('disconnected');
    this.notifyState();
  }

  /**
   * Transmite uma rolagem para a mesa
   */
  public async broadcastRoll(roll: TableRollEvent): Promise<void> {
    if (!this.connector || this.connectionStatus !== 'connected') return;
    await this.connector.broadcastRoll(roll);
  }

  /**
   * Atualiza os dados do agente na mesa (PV, PE, Sanidade, Condições)
   */
  public async updateAgent(sheet: CharacterSheet): Promise<void> {
    if (!this.connector || !this.currentParticipant) return;
    this.currentParticipant.agent = snapshotFromSheet(sheet);
    await this.connector.updateParticipant(this.currentParticipant);
  }

  /**
   * Controle de Combate & Iniciativa
   */
  public async rollMyInitiative(initiativeRoll: number, name?: string): Promise<void> {
    if (!this.connector || !this.currentRoomState || !this.currentParticipant) return;

    const charName = name || this.currentParticipant.agent?.name || this.currentParticipant.userName;
    const combat = { ...this.currentRoomState.combat };

    // Verifica se já está na lista
    const existingIndex = combat.entries.findIndex((e) => e.refId === this.currentParticipant?.userId || e.name === charName);
    const newEntry: TableInitiativeItem = {
      id: `init_${this.currentParticipant.userId}_${Date.now()}`,
      refId: this.currentParticipant.userId,
      type: this.currentParticipant.role === 'master' ? 'monster' : 'agent',
      name: charName,
      initiative: initiativeRoll,
      pvCurrent: this.currentParticipant.agent?.pvCurrent,
      pvMax: this.currentParticipant.agent?.pvMax,
    };

    if (existingIndex >= 0) {
      combat.entries[existingIndex] = newEntry;
    } else {
      combat.entries.push(newEntry);
    }

    // Ordena do maior para o menor
    combat.entries.sort((a, b) => b.initiative - a.initiative);
    combat.isActive = true;

    await this.connector.updateCombat(combat);
  }

  public async advanceTurn(): Promise<void> {
    if (!this.connector || !this.currentRoomState) return;
    const combat = { ...this.currentRoomState.combat };
    if (combat.entries.length === 0) return;

    const nextIndex = (combat.currentTurnIndex + 1) % combat.entries.length;
    // Se deu a volta completa, incrementa rodada
    const nextRound = nextIndex === 0 ? combat.round + 1 : combat.round;

    combat.currentTurnIndex = nextIndex;
    combat.round = nextRound;

    await this.connector.updateCombat(combat);
  }

  public async clearCombat(): Promise<void> {
    if (!this.connector || !this.currentRoomState) return;
    const combat = createEmptyCombatState();
    await this.connector.updateCombat(combat);
  }

  public async addMonsterToInitiative(monster: { id: string; name: string; initiative: number; pvCurrent?: number; pvMax?: number; isHidden?: boolean }): Promise<void> {
    if (!this.connector || !this.currentRoomState) return;
    const combat = { ...this.currentRoomState.combat };

    const newEntry: TableInitiativeItem = {
      id: `init_mon_${monster.id}_${Date.now()}`,
      refId: monster.id,
      type: 'monster',
      name: monster.name,
      initiative: monster.initiative,
      pvCurrent: monster.pvCurrent,
      pvMax: monster.pvMax,
      isHidden: monster.isHidden,
    };

    combat.entries.push(newEntry);
    combat.entries.sort((a, b) => b.initiative - a.initiative);
    combat.isActive = true;

    await this.connector.updateCombat(combat);
  }

  public async broadcastScene(scene: TableSceneBroadcast): Promise<void> {
    if (!this.connector || !this.currentRoomState) return;
    await this.connector.broadcastScene(scene);
  }

  // --- Privados & Handlers ---

  private async establishConnection(
    roomId: string,
    participant: TableParticipant,
    initialData: Partial<VirtualTableRoomState>,
    forceLocalSim?: boolean
  ): Promise<boolean> {
    this.updateStatus('connecting');

    // Desconecta conector anterior se houver
    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
    }

    const hasSupabase = !!(this.config.supabaseUrl && this.config.supabaseAnonKey);

    // Seleciona o conector apropriado
    if (!forceLocalSim && hasSupabase) {
      this.connector = new SupabaseTableConnector({
        url: this.config.supabaseUrl,
        anonKey: this.config.supabaseAnonKey,
      });
    } else {
      // Fallback seguro: Simulador Local
      this.connector = new LocalSimTableConnector();
    }

    const handlers: TableEventHandlers = {
      onStatusChange: (status, err) => {
        this.updateStatus(status, err);
      },
      onRoomStateChange: (state) => {
        this.currentRoomState = state;
        this.notifyState();
      },
      onRollReceived: (roll) => {
        this.rollListeners.forEach((l) => l(roll));
      },
      onParticipantJoined: (p) => {
        // Notificação opcional
      },
      onParticipantLeft: (uid) => {
        // Notificação opcional
      },
      onCombatUpdated: (combat) => {
        if (this.currentRoomState) {
          this.currentRoomState.combat = combat;
          this.notifyState();
        }
      },
      onSceneBroadcast: (scene) => {
        if (this.currentRoomState) {
          this.currentRoomState.activeScene = scene;
          this.notifyState();
        }
      },
    };

    this.currentParticipant = participant;
    const connected = await this.connector.connect(roomId, participant, initialData, handlers);
    if (!connected) {
      // Se falhou conectar via Supabase e não tínhamos tentado LocalSim, tenta LocalSim como fallback
      if (this.connector instanceof SupabaseTableConnector) {
        console.warn('[VirtualTableManager] Supabase falhou, iniciando fallback para LocalSim...');
        this.connector = new LocalSimTableConnector();
        const simConnected = await this.connector.connect(roomId, participant, initialData, handlers);
        if (simConnected) {
          this.updateStatus('connected');
          return true;
        }
      }
      this.updateStatus('error', 'Não foi possível estabelecer conexão.');
      return false;
    }

    this.updateStatus('connected');
    return true;
  }

  private updateStatus(status: TableConnectionStatus, error?: string): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((l) => l(status, error));
  }

  private notifyState(): void {
    this.listeners.forEach((l) => l(this.currentRoomState));
  }

  private async saveLastRoom(roomId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ROOM, roomId);
    } catch {}
  }

  public async getLastRoom(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_ROOM);
    } catch {
      return null;
    }
  }
}

export const virtualTableManager = VirtualTableManager.getInstance();
