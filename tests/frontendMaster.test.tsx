import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import MasterScreen from '../src/app/(tabs)/master';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
  mockRouter,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { Campaign } from '../src/types/compendium';

describe('Frontend - Tela da Aba do Mestre (master.tsx)', () => {
  const sampleCampaign: Campaign = {
    id: 'camp_test_floresta',
    title: 'O Segredo na Floresta',
    subtitle: 'Investigação em Santo Berço',
    description: 'Campanha de investigação paranormal com ameaças de Sangue e Morte.',
    threatLevel: 'Veterano',
    recommendedRank: 'Operador',
    masterNotes: 'Atenção aos sinais da névoa.',
    stories: [
      {
        id: 'scene_1',
        title: 'Chegada ao Vilarejo',
        summary: 'Os agentes chegam sob a chuva incessante.',
        details: 'Todos os moradores parecem estranhamente calados.',
        clues: [{ id: 'clue_1', text: 'Símbolo gravado na árvore', isFound: true }],
        isCompleted: false,
        order: 1,
      },
    ],
    monsters: [
      {
        id: 'mon_1',
        name: 'Zumbi de Sangue',
        vd: 20,
        pvCurrent: 45,
        pvMax: 45,
        defense: 15,
        element: 'Sangue',
        attacks: 'Garras 1d20+5 (1d8+3 corte)',
        abilities: 'Faro de Sangue',
        notes: '',
      },
    ],
    agents: [],
    initiatives: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.saveCampaigns([sampleCampaign]);
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a campanha ativa e o cabeçalho com título e sub-abas na Web', async () => {
    const { getByText, queryByText } = await renderWithProviders(<MasterScreen />, {
      mobile: false,
    });

    // Título da campanha
    assert.ok(getByText('O Segredo na Floresta'));
    // Sub-abas do Mestre
    assert.ok(queryByText(/História & Cenas/i));
    assert.ok(queryByText(/Ameaças & Monstros/i));
    assert.ok(queryByText(/Agentes da Mesa/i));
    assert.ok(queryByText(/Combate & Turnos/i));
  });

  test('deve renderizar perfeitamente no ambiente Celular (Android e iOS) com layout responsivo', async () => {
    const { getByText, queryByText } = await renderWithProviders(<MasterScreen />, {
      mobile: 'android',
    });

    assert.ok(getByText('O Segredo na Floresta'));
    // Cena criada
    assert.ok(queryByText(/Chegada ao Vilarejo/i));
  });

  test('deve alternar para a aba de Monstros e listar as criaturas da campanha', async () => {
    const { getByText, queryByText } = await renderWithProviders(<MasterScreen />, {
      mobile: 'ios',
    });

    // Clica na sub-aba de Monstros
    const monstersTab = getByText('Ameaças & Monstros');
    const btn = monstersTab.closest('div[role="button"]') || monstersTab.parentElement || monstersTab;
    await fireClick(btn);

    // Deve exibir o Zumbi de Sangue cadastrado
    assert.ok(queryByText(/Zumbi de Sangue/i));
  });

  test('deve alternar para a aba de Combate e permitir iniciar rastreador de iniciativa', async () => {
    const { getByText, queryByText } = await renderWithProviders(<MasterScreen />);

    // Clica na sub-aba de Combate
    const combatTab = getByText('Combate & Turnos');
    const btn = combatTab.closest('div[role="button"]') || combatTab.parentElement || combatTab;
    await fireClick(btn);

    // Deve exibir o painel de iniciativa
    assert.ok(queryByText(/Combate|Iniciativa/i));
  });

  test('deve navegar para a Mesa VTT ao clicar no botão "Mesa VTT"', async () => {
    const { getByText } = await renderWithProviders(<MasterScreen />);

    const vttBtn = getByText('Mesa VTT');
    await fireClick(vttBtn);

    assert.ok(
      mockRouter.history.some((h) => h.action === 'push' && h.href === '/(tabs)/table'),
      'Deveria navegar para a Mesa Virtual'
    );
  });
});
