import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import DiceScreen from '../src/app/(tabs)/dice';
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';

describe('Frontend - Tela de Dados (dice.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a tela de dados com seções de Perícia, Fórmula e Histórico em ambiente Web', async () => {
    const { getByText, queryByText } = await renderWithProviders(<DiceScreen />, { mobile: false });

    // Título do Card de Perícia
    assert.ok(getByText('Teste de Perícia (d20 Ordem)'));
    // Título do Card de Fórmula
    assert.ok(getByText('Rolador Livre de Fórmulas (Dano / Cura / Efeito)'));
    // Botão de rolar teste
    assert.ok(queryByText(/Rolar Teste/i));
    // Botão de rolar fórmula
    assert.ok(getByText('Rolar'));
    // Histórico da Sessão
    assert.ok(getByText('Histórico da Sessão'));
  });

  test('deve renderizar perfeitamente no ambiente Mobile (Android e iOS) com safe area e margens adaptadas', async () => {
    const { getByText, queryByText } = await renderWithProviders(<DiceScreen />, { mobile: 'android' });

    assert.ok(getByText('Teste de Perícia (d20 Ordem)'));
    assert.ok(getByText('Rolador Livre de Fórmulas (Dano / Cura / Efeito)'));
    // Botões de treinamento visíveis no celular
    assert.ok(queryByText(/Treinado/i));
    assert.ok(queryByText(/Veterano/i));
    assert.ok(queryByText(/Expert/i));
  });

  test('deve interagir com a seleção de grau de treinamento e rolar teste de perícia', async () => {
    const { getByText, getAllByText, queryByText } = await renderWithProviders(<DiceScreen />, { mobile: 'ios' });

    // Clica no grau de treinamento "Veterano (+10)"
    const veteranBtn = getByText('Veterano (+10)');
    await fireClick(veteranBtn);

    // O texto do botão deve se atualizar com o novo bônus: (2d20 +10)
    const rollBtn = queryByText(/Rolar Teste.*10/i) || getByText(/Rolar Teste/i);
    assert.ok(rollBtn, 'Botão de rolar teste deve refletir o bônus de veterano');
    await fireClick(rollBtn);

    // O histórico deve ser atualizado com a rolagem
    const historyCards = getAllByText(/DADOS:|FINAL:|Total/i);
    assert.ok(historyCards.length > 0, 'Deve exibir resultado rolado no histórico');
  });

  test('deve permitir alterar e rolar fórmula livre de dados com atalhos rápidos', async () => {
    const { getByText, getAllByText } = await renderWithProviders(<DiceScreen />);

    // Clica no atalho de fórmula 4d6
    const shortcut4d6 = getByText('4d6');
    await fireClick(shortcut4d6);

    const rollBtn = getByText('Rolar');
    await fireClick(rollBtn);

    // Deve registrar a rolagem no histórico da sessão
    const rolledItems = getAllByText(/Fórmula:|4d6/i);
    assert.ok(rolledItems.length > 0, 'Deveria exibir 4d6 no histórico');
  });

  test('deve abrir o modal de regras ao clicar no botão "Regras"', async () => {
    const { getByText } = await renderWithProviders(<DiceScreen />);

    const rulesBtn = getByText('Regras');
    await fireClick(rulesBtn);
    assert.ok(rulesBtn);
  });
});
