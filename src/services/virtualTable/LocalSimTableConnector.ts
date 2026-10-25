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

/**
 * Conector de Simulação Local.
 * Permite testar múltiplos jogadores, o Mestre e rolagens simultâneas
 * no mesmo dispositivo, no navegador (via BroadcastChannel entre abas)
 * ou em modo Sandbox sem depender de credenciais externas.
 */
export class LocalSimTableConnector implements IVirtualTableConnector {
  private status: TableConnectionStatus = 'disconnected';
  private roomId: string | null = null;
  private currentParticipant: TableParticipant | null = null;
  private handlers: TableEventHandlers = {};
  private roomState: VirtualTableRoomState | null = null;
  private broadcastChannel: any = null;

  public getStatus(): TableConnectionStatus {
    return this.status;
  }

  public async connect(
    roomId: string,
    participant: TableParticipant,
    initialRoomData?: Partial<VirtualTableRoomState>,
    handlers?: TableEventHandlers
  ): Promise<boolean> {
    this.status = 'connecting';
    this.roomId = roomId;
    this.currentParticipant = participant;
    this.handlers = handlers || {};
    this.handlers.onStatusChange?.('connecting');

    // Inicializa estado padrão se ainda não existir
    this.roomState = {
      roomId,
      title: initialRoomData?.title || `Mesa ${roomId}`,
      masterId: initialRoomData?.masterId || (participant.role === 'master' ? participant.userId : 'master_sim'),
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

    // Suporte a BroadcastChannel para abas no navegador Web
    if (typeof window !== 'undefined' && typeof (window as any).BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new (window as any).BroadcastChannel(`ordo_vtt_${roomId}`);
        this.broadcastChannel.onmessage = (event: any) => {
          this.handleChannelMessage(event.data);
        };
        // Avisa outras abas que entramos
        this.broadcastChannel.postMessage({
          type: 'JOIN',
          participant,
        });
      } catch (err) {
        console.warn('[LocalSimTable] Erro ao criar BroadcastChannel:', err);
      }
    }

    this.status = 'connected';
    this.handlers.onStatusChange?.('connected');
    this.handlers.onRoomStateChange?.(this.roomState);

    return true;
  }

  public async disconnect(): Promise<void> {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'LEAVE',
          userId: this.currentParticipant?.userId,
        });
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
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

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'ROLL',
        roll,
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

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'UPDATE_PARTICIPANT',
        participant,
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

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'UPDATE_COMBAT',
        combat,
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

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'BROADCAST_SCENE',
        scene,
      });
    }
  }

  public async syncFullRoomState(state: VirtualTableRoomState): Promise<void> {
    this.roomState = state;
    this.handlers.onRoomStateChange?.(state);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'SYNC_FULL',
        state,
      });
    }
  }

  private handleChannelMessage(data: any): void {
    if (!data || !this.roomState) return;

    switch (data.type) {
      case 'JOIN': {
        const p: TableParticipant = data.participant;
        if (p && p.userId !== this.currentParticipant?.userId) {
          this.roomState.participants[p.userId] = p;
          this.handlers.onParticipantJoined?.(p);
          this.handlers.onRoomStateChange?.({ ...this.roomState });
          // Manda de volta nosso estado atual para que a outra aba se sincronize
          if (this.broadcastChannel && this.currentParticipant?.role === 'master') {
            this.broadcastChannel.postMessage({
              type: 'SYNC_FULL',
              state: this.roomState,
            });
          }
        }
        break;
      }
      case 'LEAVE': {
        const uid: string = data.userId;
        if (uid && this.roomState.participants[uid]) {
          delete this.roomState.participants[uid];
          this.handlers.onParticipantLeft?.(uid);
          this.handlers.onRoomStateChange?.({ ...this.roomState });
        }
        break;
      }
      case 'ROLL': {
        const roll: TableRollEvent = data.roll;
        if (roll) {
          this.roomState.recentRolls = [roll, ...this.roomState.recentRolls.slice(0, 49)];
          this.handlers.onRollReceived?.(roll);
          this.handlers.onRoomStateChange?.({ ...this.roomState });
        }
        break;
      }
      case 'UPDATE_PARTICIPANT': {
        const p: TableParticipant = data.participant;
        if (p) {
          this.roomState.participants[p.userId] = p;
          this.handlers.onRoomStateChange?.({ ...this.roomState });
        }
        break;
      }
      case 'UPDATE_COMBAT': {
        const c: TableCombatState = data.combat;
        if (c) {
          this.roomState.combat = c;
          this.handlers.onCombatUpdated?.(c);
          this.handlers.onRoomStateChange?.({ ...this.roomState });
        }
        break;
      }
      case 'BROADCAST_SCENE': {
        const s: TableSceneBroadcast = data.scene;
        if (s) {
          this.roomState.activeScene = s;
          this.handlers.onSceneBroadcast?.(s);
          this.handlers.onRoomStateChange?.({ ...this.roomState });
        }
        break;
      }
      case 'SYNC_FULL': {
        const s: VirtualTableRoomState = data.state;
        if (s) {
          this.roomState = s;
          this.handlers.onRoomStateChange?.(s);
        }
        break;
      }
    }
  }
}
