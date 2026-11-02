import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TableScreen from '../src/app/(tabs)/table';
import { TableExportModal } from '../src/components/virtualTable/TableExportModal';
import {
  buildTableSessionExportData,
  generateTacticalPdfHtml,
  exportSessionToJsonFile,
  exportSessionToPdfFile,
  TableSessionLogExport,
} from '../src/services/virtualTable/tableSessionExportService';
import {
  VirtualTableRoomState,
  TableRollEvent,
  createEmptyCombatState,
} from '../src/types/virtualTable';
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';
import { mockShareCalls, clearMockShareCalls } from './setup';
import { virtualTableManager } from '../src/services/virtualTable/VirtualTableManager';

const MOCK_ROOM_STATE: VirtualTableRoomState = {
  roomId: 'ORD-7788',
  title: 'Operação Névoa Carmesim',
  masterId: 'user_master_1',
  masterName: 'Senhor Veríssimo',
  campaignId: 'camp_1',
  updatedAt: new Date().toISOString(),
  combat: {
    isActive: true,
    round: 3,
    currentTurnIndex: 1,
    entries: [
      {
        id: 'init_1',
        name: 'Arthur Cervero',
        type: 'agent',
        initiative: 22,
        pvCurrent: 28,
        pvMax: 35,
      },
      {
        id: 'init_2',
        name: 'Zumbi de Sangue',
        type: 'monster',
        initiative: 14,
        pvCurrent: 18,
        pvMax: 40,
        notes: 'Vulnerável a Fogo',
      },
    ],
  },
  activeScene: {
    id: 'scene_1',
    title: 'Necrotério Subterrâneo',
    summary: 'Gavetas de necrotério abertas com marcas de garras no metal.',
    details: 'Uma substância viscosa de lodo negro escorre do teto.',
    broadcastedAt: new Date().toISOString(),
    clues: [
      { id: 'clue_1', text: 'Símbolo de Morte talhado no bisturi.', isFound: true },
      { id: 'clue_2', text: 'Relatório de autópsia do paciente zero.', isFound: false },
    ],
  },
  participants: {
    user_master_1: {
      userId: 'user_master_1',
      userName: 'Senhor Veríssimo',
      role: 'master',
      isOnline: true,
      lastPing: Date.now(),
    },
    user_player_1: {
      userId: 'user_player_1',
      userName: 'Guaxinim',
      role: 'player',
      isOnline: true,
      lastPing: Date.now(),
      agent: {
        id: 'char_arthur',
        name: 'Arthur Cervero',
        player: 'Guaxinim',
        classTitle: 'Combatente',
        nex: 25,
        rank: 'Operador',
        pvCurrent: 28,
        pvMax: 35,
        peCurrent: 12,
        peMax: 15,
        sanCurrent: 26,
        sanMax: 30,
        defense: 18,
        conditions: ['Machucado'],
        updatedAt: new Date().toISOString(),
      },
    },
  },
  recentRolls: [],
};

const MOCK_ROLLS: TableRollEvent[] = [
  {
    id: 'roll_1',
    senderId: 'user_player_1',
    senderName: 'Guaxinim',
    characterName: 'Arthur Cervero',
    actionType: 'initiative',
    label: 'Iniciativa: Arthur Cervero',
    formula: '2d20+5',
    diceResults: [17, 12],
    chosenDie: 17,
    bonus: 5,
    total: 22,
    timestamp: '14:30:15',
  },
  {
    id: 'roll_2',
    senderId: 'user_player_1',
    senderName: 'Guaxinim',
    characterName: 'Arthur Cervero',
    actionType: 'attack',
    label: 'Ataque com Faca Tática',
    formula: '3d20+10',
    diceResults: [20, 14, 8],
    chosenDie: 20,
    bonus: 10,
    total: 30,
    isCritical: true,
    timestamp: '14:32:00',
  },
  {
    id: 'roll_3',
    senderId: 'user_player_1',
    senderName: 'Guaxinim',
    characterName: 'Arthur Cervero',
    actionType: 'damage',
    label: 'Dano Crítico de Faca',
    formula: '2d4+2',
    diceResults: [4, 3],
    bonus: 2,
    total: 9,
    timestamp: '14:32:10',
  },
  {
    id: 'roll_4',
    senderId: 'user_master_1',
    senderName: 'Senhor Veríssimo',
    actionType: 'skill',
    label: 'Percepção Oculta do Monstro',
    formula: '1d20+0',
    diceResults: [1],
    chosenDie: 1,
    bonus: 0,
    total: 1,
    isFumble: true,
    timestamp: '14:33:00',
  },
];

describe('Exportação Completa de Sessão da Mesa Virtual (tableSessionExportService & table.tsx)', () => {
  beforeEach(() => {
    clearMockShareCalls();
  });

  afterEach(async () => {
    await cleanup();
    await virtualTableManager.leaveTable();
  });

  test('1. buildTableSessionExportData deve calcular métricas, danos sofridos, iniciativas e logs estruturados', () => {
    const exportData = buildTableSessionExportData(MOCK_ROOM_STATE, MOCK_ROLLS, 'Crônicas do Outro Lado');

    // Metadados
    assert.equal(exportData.exportMetadata.roomId, 'ORD-7788');
    assert.equal(exportData.exportMetadata.sessionTitle, 'Operação Névoa Carmesim');
    assert.equal(exportData.exportMetadata.campaignTitle, 'Crônicas do Outro Lado');
    assert.equal(exportData.exportMetadata.master.userName, 'Senhor Veríssimo');

    // Métricas
    assert.equal(exportData.metrics.totalRolls, 4);
    assert.equal(exportData.metrics.criticalHits, 1);
    assert.equal(exportData.metrics.fumbles, 1);
    assert.equal(exportData.metrics.totalDamageDealt, 9);
    // Dano sofrido pelo Arthur Cervero (pvMax 35 - pvCurrent 28 = 7)
    assert.equal(exportData.metrics.totalDamageSufferedByAgents, 7);
    assert.equal(exportData.metrics.totalCombatants, 2);
    assert.equal(exportData.metrics.activeRound, 3);
    assert.equal(exportData.metrics.cluesFound, 1);
    assert.equal(exportData.metrics.totalClues, 2);

    // Trilha de Combate
    assert.equal(exportData.combatTrack.round, 3);
    assert.equal(exportData.combatTrack.currentTurnIndex, 1);
    assert.equal(exportData.combatTrack.currentTurnCombatant, 'Zumbi de Sangue');
    assert.equal(exportData.combatTrack.entries[0].initiative, 22);
    assert.equal(exportData.combatTrack.entries[1].damageSuffered, 22); // 40 - 18

    // Cenas e Pistas
    assert.ok(exportData.sceneEvents.activeScene);
    assert.equal(exportData.sceneEvents.activeScene.title, 'Necrotério Subterrâneo');
    assert.equal(exportData.sceneEvents.activeScene.clues[0].isFound, true);
    assert.equal(exportData.sceneEvents.activeScene.clues[1].isFound, false);

    // Logs de Rolagens
    assert.equal(exportData.rollLogs.length, 4);
    assert.deepEqual(exportData.rollLogs[1].diceResults, [20, 14, 8]);
    assert.equal(exportData.rollLogs[1].chosenDie, 20);
    assert.equal(exportData.rollLogs[1].bonus, 10);
    assert.equal(exportData.rollLogs[1].isCritical, true);
  });

  test('2. generateTacticalPdfHtml deve renderizar HTML tático militar com tabelas e badges da Ordem', () => {
    const exportData = buildTableSessionExportData(MOCK_ROOM_STATE, MOCK_ROLLS, 'Crônicas do Outro Lado');
    const html = generateTacticalPdfHtml(exportData);

    assert.ok(html.includes('ORDO REALITAS • DOSSIÊ DE MISSÃO'));
    assert.ok(html.includes('ORD-7788'));
    assert.ok(html.includes('Operação Névoa Carmesim'));
    assert.ok(html.includes('Senhor Veríssimo'));
    assert.ok(html.includes('Crônicas do Outro Lado'));
    assert.ok(html.includes('Arthur Cervero'));
    assert.ok(html.includes('Combatente (25%)'));
    assert.ok(html.includes('-7 sofridos'));
    assert.ok(html.includes('Zumbi de Sangue'));
    assert.ok(html.includes('Necrotério Subterrâneo'));
    assert.ok(html.includes('Símbolo de Morte'));
    assert.ok(html.includes('CRÍTICO'));
    assert.ok(html.includes('DESASTRE'));
  });

  test('3. exportSessionToJsonFile deve gerar arquivo JSON e acionar Expo Sharing', async () => {
    const exportData = buildTableSessionExportData(MOCK_ROOM_STATE, MOCK_ROLLS);
    const res = await exportSessionToJsonFile(exportData);

    assert.equal(res.success, true);
    assert.ok(res.filename.startsWith('ordo_sessao_ORD-7788_'));
    assert.ok(res.filename.endsWith('.json'));

    // Verifica que o mock de Expo Sharing foi invocado
    assert.ok(mockShareCalls.length >= 1);
    const call = mockShareCalls[mockShareCalls.length - 1];
    assert.ok(call.url.includes('ordo_sessao_ORD-7788_'));
    assert.equal(call.options?.mimeType, 'application/json');
  });

  test('4. exportSessionToPdfFile deve compilar PDF via Expo Print e acionar Expo Sharing', async () => {
    const exportData = buildTableSessionExportData(MOCK_ROOM_STATE, MOCK_ROLLS);
    const res = await exportSessionToPdfFile(exportData);

    assert.equal(res.success, true);
    assert.ok(res.filename.startsWith('ordo_resumo_tatico_ORD-7788_'));
    assert.ok(res.filename.endsWith('.pdf'));

    // Verifica que o mock de Expo Sharing foi invocado para o PDF
    assert.ok(mockShareCalls.length >= 1);
    const call = mockShareCalls[mockShareCalls.length - 1];
    assert.equal(call.options?.mimeType, 'application/pdf');
  });

  test('5. TableExportModal deve renderizar métricas da sessão e executar botões de exportação JSON e PDF', async () => {
    let closed = false;
    const view = await renderWithProviders(
      <TableExportModal
        visible={true}
        onClose={() => {
          closed = true;
        }}
        virtualTable={MOCK_ROOM_STATE}
        tableRecentRolls={MOCK_ROLLS}
        campaignTitle="Crônicas do Outro Lado"
      />
    );

    // Valida elementos no modal
    assert.ok(view.getByText('Exportar Histórico de Sessão'));
    assert.ok(view.getByText('Exportar JSON Estruturado'));
    assert.ok(view.getByText('Gerar Resumo Tático (PDF)'));
    assert.ok(view.getByTestId('export-json-btn'));
    assert.ok(view.getByTestId('export-pdf-btn'));

    // Clica no botão de exportar JSON
    await act(async () => {
      fireClick(view.getByTestId('export-json-btn'));
      await new Promise((r) => setTimeout(r, 60));
    });

    assert.equal(closed, true);
    assert.ok(mockShareCalls.some((c) => c.options?.mimeType === 'application/json'));

    // Renderiza novamente e clica no botão de PDF
    closed = false;
    const viewPdf = await renderWithProviders(
      <TableExportModal
        visible={true}
        onClose={() => {
          closed = true;
        }}
        virtualTable={MOCK_ROOM_STATE}
        tableRecentRolls={MOCK_ROLLS}
        campaignTitle="Crônicas do Outro Lado"
      />
    );

    await act(async () => {
      fireClick(viewPdf.getByTestId('export-pdf-btn'));
      await new Promise((r) => setTimeout(r, 60));
    });

    assert.equal(closed, true);
    assert.ok(mockShareCalls.some((c) => c.options?.mimeType === 'application/pdf'));
  });

  test('6. TableScreen deve exibir o botão de exportação quando o mestre estiver conectado e permitir abrir o modal', async () => {
    // Inicia mesa demo como mestre
    const res = await virtualTableManager.createTable({
      title: 'Mesa de Auditoria Especial',
      masterId: 'test_master_id',
      masterName: 'Mestre Auditor',
      useLocalSim: true,
    });
    assert.equal(res.success, true);

    const view = await renderWithProviders(<TableScreen />);

    // Botão de exportar no cabeçalho deve estar visível para o Mestre
    const exportBtn = view.queryByTestId('table-export-session-btn');
    assert.ok(exportBtn, 'Botão table-export-session-btn deve existir no cabeçalho para o mestre conectado');

    // Ao clicar no botão, o modal deve abrir exibindo as opções de exportação
    await act(async () => {
      fireClick(exportBtn);
      await new Promise((r) => setTimeout(r, 50));
    });

    assert.ok(view.queryByTestId('export-json-btn'), 'Modal deve abrir exibindo o botão de exportar JSON');
    assert.ok(view.queryByTestId('export-pdf-btn'), 'Modal deve abrir exibindo o botão de gerar PDF');
  });
});
