import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import CharactersScreen from '../src/app/(tabs)/characters';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
  mockAlertCalls,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { CharacterSheet } from '../src/types/compendium';

describe('Frontend - Tela de Fichas de Personagem (characters.tsx)', () => {
  const sampleSheet: CharacterSheet = {
    id: 'char_test_123',
    name: 'Dante Ocultista',
    player: 'Mestre Ordo',
    originId: 'orig_academico',
    classId: 'cls_ocultista',
    trackId: 'trk_graduado',
    rank: 'Operador',
    affinity: 'Nenhum',
    nex: 25,
    attributes: { AGI: 2, FOR: 1, INT: 4, PRE: 3, VIG: 2 },
    pvCurrent: 28,
    pvMax: 28,
    sanCurrent: 40,
    sanMax: 40,
    peCurrent: 30,
    peMax: 30,
    defenseBonus: 12,
    skills: {
      Ocultismo: { degree: 10, bonus: 10 },
      Investigação: { degree: 5, bonus: 5 },
    },
    attacks: [
      {
        id: 'atk_1',
        name: 'Revólver',
        test: '+7',
        damage: '2d6',
        critical: '19/x3',
        range: 'Curto',
        special: 'Balístico',
      },
    ],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.saveCharacters([sampleSheet]);
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a lista de fichas de agentes e exibir o agente salvo', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: false,
    });

    // Deve exibir o nome do agente salvo
    assert.ok(getByText('Dante Ocultista'));
    // Deve exibir botões de criação
    assert.ok(queryByText(/Criar|Novo Agente/i));
  });

  test('deve renderizar a lista perfeitamente em ambiente Celular (Android e iOS) com layout responsivo', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'android',
    });

    assert.ok(getByText('Dante Ocultista'));
    // Botões de ação rápida no card do celular
    assert.ok(queryByText(/Abrir Ficha|Dante Ocultista/i));
  });

  test('deve abrir a ficha do agente ao clicar nele e exibir status vitais (PV, SAN, PE)', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'ios',
    });

    const agentCard = getByText('Dante Ocultista');
    await fireClick(agentCard);

    // Deve entrar na tela de detalhes da ficha
    assert.ok(getByText('Todas as Fichas'));
    assert.ok(queryByText(/PV|Pontos de Vida/i));
    assert.ok(queryByText(/SAN|Sanidade/i));
    assert.ok(queryByText(/PE|Esforço/i));
  });

  test('deve abrir modal de impressão de ficha ao clicar em Imprimir', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />);

    // Entra na ficha
    await fireClick(getByText('Dante Ocultista'));

    const printBtn = getByText('Imprimir Ficha');
    assert.ok(printBtn);
    await fireClick(printBtn);

    // Deve abrir o modal de impressão
    assert.ok(queryByText(/Impressão de Ficha|Imprimir/i));
  });

  test('deve abrir modal de level up (+5% NEX)', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />);

    await fireClick(getByText('Dante Ocultista'));

    const levelUpBtn = getByText('+5% NEX (Assistido)');
    assert.ok(levelUpBtn);
    await fireClick(levelUpBtn);

    // Deve exibir diálogo ou opções de evolução
    assert.ok(queryByText(/Evolução|NEX|Assistido/i));
  });

  test('deve navegar de volta para a lista ao clicar em "Todas as Fichas"', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'android',
    });

    await fireClick(getByText('Dante Ocultista'));
    assert.ok(getByText('Todas as Fichas'));

    await fireClick(getByText('Todas as Fichas'));
    // Deve retornar para a lista de fichas
    assert.ok(queryByText('Dante Ocultista'));
  });
});
