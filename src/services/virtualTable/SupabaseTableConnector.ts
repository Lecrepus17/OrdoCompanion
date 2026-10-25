import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  createEmptyCombatState,
  TableCombatState,
  TableParticipant,
  TableRollEvent,
  TableSceneBroadcast,
  VirtualTableRoomState,
} from '../../types/virtualTable';
import {
  IVirtualTableConnector,
  TableConnectionStatus,
  TableEventHandlers,
} from './IVirtualTableConnector';

// Chaves padrão para testes (ou preenchidas pelo usuário nas configurações da mesa)
export const DEFAULT_SUPABASE_CONFIG = {
  // Configuração opcional de sandbox/fallback
  url: '',
  anonKey: '',
};

export class SupabaseTableConnector implements IVirtualTableConnector {
  private status: TableConnectionStatus = 'disconnected';
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private currentParticipant: TableParticipant | null = null;
  private handlers: TableEventHandlers = {};
  private roomState: VirtualTableRoomState | null = null;

  constructor(private customConfig?: { url?: string; anonKey?: string }) {}

  public getStatus(): TableConnectionStatus {
    return this.status;
  }

  public async connect(
    roomId: string,
    participant: TableParticipant,
    initialRoomData?: Partial<VirtualTableRoomState>,
    handlers?: TableEventHandlers
  ): Promise<boolean> {
    const supabaseUrl = this.customConfig?.url || DEFAULT_SUPABASE_CONFIG.url;
    const supabaseKey = this.customConfig?.anonKey || DEFAULT_SUPABASE_CONFIG.anonKey;

    this.status = 'connecting';
    this.roomId = roomId;
    this.currentParticipant = participant;
    this.handlers = handlers || {};
    this.handlers.onStatusChange?.('connecting');

    // Inicializa estado padrão da sala
    this.roomState = {
      roomId,
      title: initialRoomData?.title || `Mesa ${roomId}`,
      masterId: initialRoomData?.masterId || (participant.role === 'master' ? participant.userId : ''),
      masterName: initialRoomData?.masterName || (participant.role === 'master' ? participant.userName : 'Mestre'),
      campaignId: initialRoomData?.campaignId,
      participants: {
        [participant.userId]: participant,
      },
      combat: initialRoomData?.combat || createEmptyCombatState(),
      activeScene: initialRoomData?.activeScene,
      recentRolls: initialRoomData?.recentRolls || [],
      updatedAt: new Date().toISOString(),
    };

    // Caso não tenha URL/Chave configurada, reporta aviso e conecta via estado local resiliente
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[SupabaseTableConnector] Credenciais do Supabase não fornecidas.');
      this.status = 'error';
      this.handlers.onStatusChange?.('error', 'Credenciais do Supabase não configuradas.');
      return false;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });

      const channelName = `ordo_table_${roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;

      this.channel = this.supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: participant.userId },
        },
      });

      // 1. Escuta presença de jogadores online
      this.channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.channel || !this.roomState) return;
          const presenceState = this.channel.presenceState<{ participant: TableParticipant }>();
          const updatedParticipants: Record<string, TableParticipant> = {
            ...this.roomState.participants,
          };

          Object.keys(presenceState).forEach((key) => {
            const list = presenceState[key];
            if (list && list.length > 0) {
              const p = list[0].participant;
              if (p) {
                updatedParticipants[p.userId] = { ...p, isOnline: true };
              }
            }
          });

          this.roomState.participants = updatedParticipants;
          this.handlers.onRoomStateChange?.({ ...this.roomState });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (!this.roomState) return;
          const joined = newPresences?.[0]?.participant as TableParticipant;
          if (joined) {
            this.roomState.participants[joined.userId] = { ...joined, isOnline: true };
            this.handlers.onParticipantJoined?.(joined);
            this.handlers.onRoomStateChange?.({ ...this.roomState });

            // Se eu sou o Mestre, envio o estado completo para o jogador recém-chegado se sincronizar
            if (this.currentParticipant?.role === 'master') {
              this.syncFullRoomState(this.roomState);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          if (!this.roomState) return;
          const left = leftPresences?.[0]?.participant as TableParticipant;
          const uid = left?.userId || key;
          if (this.roomState.participants[uid]) {
            this.roomState.participants[uid].isOnline = false;
            this.handlers.onParticipantLeft?.(uid);
            this.handlers.onRoomStateChange?.({ ...this.roomState });
          }
        });

      // 2. Escuta eventos de Broadcast em tempo real
      this.channel
        .on('broadcast', { event: 'ROLL' }, ({ payload }) => {
          const roll = payload as TableRollEvent;
          if (roll && this.roomState) {
            this.roomState.recentRolls = [roll, ...this.roomState.recentRolls.slice(0, 49)];
            this.handlers.onRollReceived?.(roll);
            this.handlers.onRoomStateChange?.({ ...this.roomState });
          }
        })
        .on('broadcast', { event: 'UPDATE_PARTICIPANT' }, ({ payload }) => {
          const p = payload as TableParticipant;
          if (p && this.roomState) {
            this.roomState.participants[p.userId] = p;
            this.handlers.onRoomStateChange?.({ ...this.roomState });
          }
        })
        .on('broadcast', { event: 'UPDATE_COMBAT' }, ({ payload }) => {
          const combat = payload as TableCombatState;
          if (combat && this.roomState) {
            this.roomState.combat = combat;
            this.handlers.onCombatUpdated?.(combat);
            this.handlers.onRoomStateChange?.({ ...this.roomState });
          }
        })
        .on('broadcast', { event: 'BROADCAST_SCENE' }, ({ payload }) => {
          const scene = payload as TableSceneBroadcast;
          if (scene && this.roomState) {
            this.roomState.activeScene = scene;
            this.handlers.onSceneBroadcast?.(scene);
            this.handlers.onRoomStateChange?.({ ...this.roomState });
          }
        })
        .on('broadcast', { event: 'SYNC_FULL' }, ({ payload }) => {
          const fullState = payload as VirtualTableRoomState;
          if (fullState && this.currentParticipant?.role !== 'master') {
            this.roomState = fullState;
            this.handlers.onRoomStateChange?.(fullState);
          }
        });

      // 3. Inscreve no canal
      return new Promise<boolean>((resolve) => {
        if (!this.channel) {
          resolve(false);
          return;
        }

        this.channel.subscribe(async (status, err) => {
          if (status === 'SUBSCRIBED') {
            this.status = 'connected';
            this.handlers.onStatusChange?.('connected');

            // Rastreia nossa presença
            await this.channel?.track({
              participant: this.currentParticipant,
              onlineAt: new Date().toISOString(),
            });

            if (this.roomState) {
              this.handlers.onRoomStateChange?.(this.roomState);
            }
            resolve(true);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.status = 'error';
            this.handlers.onStatusChange?.('error', err?.message || 'Falha ao conectar canal Supabase');
            resolve(false);
          } else if (status === 'CLOSED') {
            this.status = 'disconnected';
            this.handlers.onStatusChange?.('disconnected');
          }
        });
      });
    } catch (err: any) {
      this.status = 'error';
      this.handlers.onStatusChange?.('error', err?.message || 'Erro ao inicializar Supabase');
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.untrack();
        await this.channel.unsubscribe();
      } catch {}
      this.channel = null;
    }
    if (this.supabase) {
      this.supabase = null;
    }
    this.status = 'disconnected';
    this.handlers.onStatusChange?.('disconnected');
    this.roomState = null;
    this.roomId = null;
  }

  public async broadcastRoll(roll: TableRollEvent): Promise<void> {
    if (!this.roomState) return;

    this.roomState = {
      ...this.roomState,
      recentRolls: [roll, ...this.roomState.recentRolls.slice(0, 49)],
      updatedAt: new Date().toISOString(),
    };

    this.handlers.onRollReceived?.(roll);
    this.handlers.onRoomStateChange?.(this.roomState);

    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'ROLL',
        payload: roll,
      });
    }
  }

  public async updateParticipant(participant: TableParticipant): Promise<void> {
    if (!this.roomState) return;

    this.roomState = {
      ...this.roomState,
      participants: {
        ...this.roomState.participants,
        [participant.userId]: participant,
      },
      updatedAt: new Date().toISOString(),
    };

    this.handlers.onRoomStateChange?.(this.roomState);

    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'UPDATE_PARTICIPANT',
        payload: participant,
      });
      // Atualiza presença também
      await this.channel.track({
        participant,
        onlineAt: new Date().toISOString(),
      });
    }
  }

  public async updateCombat(combat: TableCombatState): Promise<void> {
    if (!this.roomState) return;

    this.roomState = {
      ...this.roomState,
      combat,
      updatedAt: new Date().toISOString(),
    };

    this.handlers.onCombatUpdated?.(combat);
    this.handlers.onRoomStateChange?.(this.roomState);

    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'UPDATE_COMBAT',
        payload: combat,
      });
    }
  }

  public async broadcastScene(scene: TableSceneBroadcast): Promise<void> {
    if (!this.roomState) return;

    this.roomState = {
      ...this.roomState,
      activeScene: scene,
      updatedAt: new Date().toISOString(),
    };

    this.handlers.onSceneBroadcast?.(scene);
    this.handlers.onRoomStateChange?.(this.roomState);

    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'BROADCAST_SCENE',
        payload: scene,
      });
    }
  }

  public async syncFullRoomState(state: VirtualTableRoomState): Promise<void> {
    this.roomState = state;
    this.handlers.onRoomStateChange?.(state);

    if (this.channel) {
      await this.channel.send({
        type: 'broadcast',
        event: 'SYNC_FULL',
        payload: state,
      });
    }
  }
}
