import test from 'node:test';
import assert from 'node:assert/strict';
import './setup';
import {
  generateRoomCode,
  snapshotFromSheet,
  createEmptyCombatState,
  TableParticipant,
  TableRollEvent,
} from '../src/types/virtualTable';
import { CharacterSheet } from '../src/types/compendium';
import { LocalSimTableConnector } from '../src/services/virtualTable/LocalSimTableConnector';
import { VirtualTableManager } from '../src/services/virtualTable/VirtualTableManager';

test('Mesa Virtual - Utilitários e Modelos (src/types/virtualTable.ts)', async (t) => {
  await t.test('generateRoomCode gera código no padrão ORD-XXXX com 4 caracteres alfanuméricos', () => {
    const code = generateRoomCode();
    assert.match(code, /^ORD-[A-Z0-9]{4}$/);
    const code2 = generateRoomCode();
    assert.match(code2, /^ORD-[A-Z0-9]{4}$/);
  });

  await t.test('snapshotFromSheet extrai dados essenciais e calcula defesa corretamente', () => {
    const dummySheet: CharacterSheet = {
      id: 'char_test_1',
      name: 'Arthur Cervero',
      player: 'Thiago',
      nex: 45,
      rank: 'Agente Especial',
      originId: 'origin_policial',
      classId: 'Combatente',
      trackId: 'track_aniquilador',
      affinity: 'Sangue',
      attributes: { AGI: 3, FOR: 2, INT: 1, PRE: 1, VIG: 3 },
      pvCurrent: 40,
      pvMax: 50,
      peCurrent: 15,
      peMax: 20,
      sanCurrent: 25,
      sanMax: 30,
      defenseBonus: 2,
      skills: {},
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const snapshot = snapshotFromSheet(dummySheet);
    assert.equal(snapshot.id, 'char_test_1');
    assert.equal(snapshot.name, 'Arthur Cervero');
    assert.equal(snapshot.player, 'Thiago');
    assert.equal(snapshot.classTitle, 'Combatente');
    assert.equal(snapshot.nex, 45);
    // Defesa: 10 + AGI (3) + defenseBonus (2) = 15
    assert.equal(snapshot.defense, 15);
    assert.equal(snapshot.pvCurrent, 40);
    assert.equal(snapshot.pvMax, 50);
  });

  await t.test('snapshotFromSheet adiciona condição "Morrendo" quando PV <= 0', () => {
    const dyingSheet: CharacterSheet = {
      id: 'char_dying',
      name: 'Agente Ferido',
      player: 'Pedro',
      nex: 10,
      rank: 'Recruta',
      originId: '',
      classId: 'Especialista',
      trackId: '',
      affinity: 'Nenhum',
      attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
      pvCurrent: 0,
      pvMax: 20,
      peCurrent: 5,
      peMax: 10,
      sanCurrent: 15,
      sanMax: 20,
      defenseBonus: 0,
      skills: {},
      entityIds: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const snapshot = snapshotFromSheet(dyingSheet);
    assert.ok(snapshot.conditions.includes('Morrendo'));
  });
});

test('Mesa Virtual - LocalSimTableConnector (src/services/virtualTable/LocalSimTableConnector.ts)', async (t) => {
  await t.test('Conecta e gerencia estado de sala e participantes', async () => {
    const connector = new LocalSimTableConnector();
    assert.equal(connector.getStatus(), 'disconnected');

    const participant: TableParticipant = {
      userId: 'user_master_1',
      userName: 'Mestre Celso',
      role: 'master',
      isOnline: true,
      lastPing: Date.now(),
    };

    let stateReceived = false;
    const connected = await connector.connect(
      'ORD-TEST',
      participant,
      { title: 'Sessão 1: O Orfanato' },
      {
        onRoomStateChange: (state) => {
          stateReceived = true;
          assert.equal(state.roomId, 'ORD-TEST');
          assert.equal(state.title, 'Sessão 1: O Orfanato');
          assert.equal(state.participants['user_master_1'].userName, 'Mestre Celso');
        },
      }
    );

    assert.equal(connected, true);
    assert.equal(connector.getStatus(), 'connected');
    assert.equal(stateReceived, true);

    await connector.disconnect();
    assert.equal(connector.getStatus(), 'disconnected');
  });

  await t.test('Transmite rolagens de dados com sucesso', async () => {
    const connector = new LocalSimTableConnector();
    const participant: TableParticipant = {
      userId: 'user_p1',
      userName: 'Jogador 1',
      role: 'player',
      isOnline: true,
      lastPing: Date.now(),
    };

    let receivedRoll: TableRollEvent | null = null;
    await connector.connect('ORD-ROLL', participant, {}, {
      onRollReceived: (roll) => {
        receivedRoll = roll;
      },
    });

    const testRoll: TableRollEvent = {
      id: 'roll_123',
      senderId: 'user_p1',
      senderName: 'Jogador 1',
      characterName: 'Arthur',
      actionType: 'skill',
      label: 'Teste de Luta',
      formula: '3d20 (melhor)+5',
      diceResults: [12, 19, 4],
      chosenDie: 19,
      bonus: 5,
      total: 24,
      isCritical: false,
      timestamp: '21:30:00',
    };

    await connector.broadcastRoll(testRoll);
    assert.ok(receivedRoll);
    const roll = receivedRoll as TableRollEvent;
    assert.equal(roll.total, 24);
    assert.equal(roll.label, 'Teste de Luta');

    await connector.disconnect();
  });
});

test('Mesa Virtual - VirtualTableManager (src/services/virtualTable/VirtualTableManager.ts)', async (t) => {
  const manager = VirtualTableManager.getInstance();

  await t.test('Cria mesa como Mestre em modo simulação local', async () => {
    const res = await manager.createTable({
      title: 'Campanha Espreitador',
      masterId: 'master_id_10',
      masterName: 'Mestre Veríssimo',
      useLocalSim: true,
    });

    assert.equal(res.success, true);
    assert.match(res.roomId, /^ORD-[A-Z0-9]{4}$/);

    const roomState = manager.getRoomState();
    assert.ok(roomState);
    assert.equal(roomState?.title, 'Campanha Espreitador');
    assert.equal(roomState?.masterName, 'Mestre Veríssimo');
  });

  await t.test('Adiciona iniciativa e ordena corretamente do maior para o menor', async () => {
    // Arthur tira 18
    await manager.rollMyInitiative(18, 'Arthur Cervero');
    // Monstro tira 22
    await manager.addMonsterToInitiative({
      id: 'zumbi_1',
      name: 'Zumbi de Sangue',
      initiative: 22,
      pvCurrent: 40,
      pvMax: 40,
    });

    const roomState = manager.getRoomState();
    assert.ok(roomState);
    assert.equal(roomState?.combat.entries.length, 2);
    // Primeiro deve ser Zumbi (22), depois Arthur (18)
    assert.equal(roomState?.combat.entries[0].name, 'Zumbi de Sangue');
    assert.equal(roomState?.combat.entries[0].initiative, 22);
    assert.equal(roomState?.combat.entries[1].name, 'Arthur Cervero');
    assert.equal(roomState?.combat.entries[1].initiative, 18);
  });

  await t.test('Avança turnos no combate', async () => {
    assert.equal(manager.getRoomState()?.combat.currentTurnIndex, 0);
    await manager.advanceTurn();
    assert.equal(manager.getRoomState()?.combat.currentTurnIndex, 1);
    // Ao dar a volta completa, incrementa a rodada
    await manager.advanceTurn();
    assert.equal(manager.getRoomState()?.combat.currentTurnIndex, 0);
    assert.equal(manager.getRoomState()?.combat.round, 2);
  });

  await t.test('Limpa combate e encerra mesa com sucesso', async () => {
    await manager.clearCombat();
    assert.equal(manager.getRoomState()?.combat.entries.length, 0);

    await manager.leaveTable();
    assert.equal(manager.getStatus(), 'disconnected');
    assert.equal(manager.getRoomState(), null);
  });
});
