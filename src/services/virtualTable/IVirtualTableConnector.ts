import {
  TableCombatState,
  TableParticipant,
  TableRollEvent,
  TableSceneBroadcast,
  VirtualTableRoomState,
} from '../../types/virtualTable';

export type TableConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TableEventHandlers {
  onStatusChange?: (status: TableConnectionStatus, error?: string) => void;
  onRoomStateChange?: (state: VirtualTableRoomState) => void;
  onRollReceived?: (roll: TableRollEvent) => void;
  onParticipantJoined?: (participant: TableParticipant) => void;
  onParticipantLeft?: (userId: string) => void;
  onSceneBroadcast?: (scene: TableSceneBroadcast) => void;
  onCombatUpdated?: (combat: TableCombatState) => void;
}

export interface IVirtualTableConnector {
  getStatus(): TableConnectionStatus;
  connect(
    roomId: string,
    participant: TableParticipant,
    initialRoomData?: Partial<VirtualTableRoomState>,
    handlers?: TableEventHandlers
  ): Promise<boolean>;
  disconnect(): Promise<void>;
  broadcastRoll(roll: TableRollEvent): Promise<void>;
  updateParticipant(participant: TableParticipant): Promise<void>;
  updateCombat(combat: TableCombatState): Promise<void>;
  broadcastScene(scene: TableSceneBroadcast): Promise<void>;
  syncFullRoomState(state: VirtualTableRoomState): Promise<void>;
}
