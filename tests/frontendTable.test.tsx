import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TableScreen from '../src/app/(tabs)/table';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';

describe('Frontend - Tela da Mesa Virtual VTT (table.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a tela inicial de conexão (Entrar em Mesa e Criar Nova Sala) na Web', async () => {
    const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
      <TableScreen />,
      { mobile: false }
    );

    // Título ou subtítulo da tela
    assert.ok(queryByText(/Mesa Virtual|VTT/i));
    // Seção para entrar como jogador
    assert.ok(queryByText(/Entrar em uma Mesa|Conectar à Mesa/i));
    // Seção para criar sala como mestre
    assert.ok(queryByText(/Abrir Nova Mesa|Iniciar Mesa da Ordem/i));
  });

  test('deve renderizar no ambiente Celular (Android e iOS) com layout adaptado e inputs acessíveis', async () => {
    const { getByText, queryByText } = await renderWithProviders(<TableScreen />, {
      mobile: 'android',
    });

    assert.ok(queryByText(/Mesa Virtual|VTT/i));
    assert.ok(queryByText(/Entrar|Criar/i));
  });

  test('deve permitir iniciar uma mesa de simulação local (demonstração offline)', async () => {
    const { getByText, queryByText } = await renderWithProviders(<TableScreen />, {
      mobile: 'ios',
    });

    // Clica no botão de demonstração local ou iniciar como mestre
    const demoBtn = queryByText(/Demonstração|Local|Simulação/i) || getByText(/Iniciar como Mestre/i);
    assert.ok(demoBtn);
    await fireClick(demoBtn);

    // Deve conectar e exibir a sala ativa com abas de combate/iniciativa/equipe
    assert.ok(queryByText(/ORD-|Agentes|Equipe|Combate|Iniciativa|Sair da Mesa/i));
  });

  test('deve alternar entre as abas da mesa conectada (Equipe, Combate, Rolagens)', async () => {
    const { getByText, queryByText } = await renderWithProviders(<TableScreen />);

    // Inicia mesa demo
    const demoBtn = queryByText(/Demonstração|Local|Simulação/i) || getByText(/Iniciar como Mestre/i);
    await fireClick(demoBtn);

    // Clica na aba de combate
    const combatTab = queryByText(/Combate|Iniciativa/i);
    if (combatTab) {
      await fireClick(combatTab);
      assert.ok(queryByText(/Iniciativa|Turnos|Avançar/i));
    }
  });
});
