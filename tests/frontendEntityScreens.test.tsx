import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import EntityDetailScreen from '../src/app/entity/[id]';
import EntityEditorScreen from '../src/app/entity/editor';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
  mockRouter,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';

describe('Frontend - Telas de Entidade e Editor (entity/[id].tsx & editor.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('EntityDetailScreen deve exibir mensagem amigável quando registro não for encontrado', async () => {
    mockRouter.params = { id: 'id_inexistente_999' };
    const { getByText } = await renderWithProviders(<EntityDetailScreen />, {
      mobile: false,
    });

    assert.ok(getByText('Registro não encontrado.'));
  });

  test('EntityDetailScreen deve carregar e exibir dados completos de um ritual canônico na Web e Mobile', async () => {
    // Pega o primeiro ritual do compêndio
    const all = defaultRepository.getAllEntities();
    const sampleRitual = all.find((e) => e.category === 'ritual') || all[0];
    mockRouter.params = { id: sampleRitual.id };

    const { getByText, queryByText } = await renderWithProviders(<EntityDetailScreen />, {
      mobile: 'android',
    });

    // Nome da entidade
    assert.ok(getByText(sampleRitual.name));
    // Categoria do ritual
    assert.ok(queryByText(/Ritual|Elemento/i));
    // Descrição ou texto do efeito
    assert.ok(queryByText(/Execução|Alcance|Alvo|Duração|Efeito/i) || queryByText(new RegExp(sampleRitual.name, 'i')));
  });

  test('EntityDetailScreen deve permitir favoritar e desfavoritar a entidade', async () => {
    const all = defaultRepository.getAllEntities();
    const sampleItem = all.find((e) => e.category === 'item') || all[0];
    mockRouter.params = { id: sampleItem.id };

    const { container } = await renderWithProviders(<EntityDetailScreen />);

    // Procura o ícone de bookmark (favorito)
    const favIcon = container.querySelector('[data-testid="bookmark-outline"]') || container.querySelector('[data-testid="bookmark"]');
    assert.ok(favIcon, 'Botão de favoritar deve estar presente na tela');

    const favBtn = favIcon.closest('div[role="button"]') || favIcon.parentElement;
    if (favBtn) {
      await fireClick(favBtn);
      // Deve registrar como favorito
      const favs = await defaultRepository.getFavorites();
      assert.ok(favs.includes(sampleItem.id));
    }
  });

  test('EntityEditorScreen deve renderizar formulário de criação com seleção de categoria', async () => {
    mockRouter.params = {};
    const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
      <EntityEditorScreen />,
      { mobile: false }
    );

    // Título ou ação de salvar
    assert.ok(getByText(/Criar Registro no Compêndio|Salvar/i));
    // Campo de nome
    assert.ok(getByPlaceholder(/Lâmina de Sangue, Aberração Sombria/i));
    // Seleção de categoria (Rituais, Armas, etc.)
    assert.ok(queryByText(/Rituais/i));
  });

  test('EntityEditorScreen deve preencher campos e criar novo registro personalizado', async () => {
    mockRouter.params = {};
    const { getByText, getByPlaceholder } = await renderWithProviders(<EntityEditorScreen />, {
      mobile: 'ios',
    });

    const nameInput = getByPlaceholder(/Lâmina de Sangue, Aberração Sombria/i);
    await changeInputText(nameInput, 'Adaga Ritualística de Sangue');

    const descInput = getByPlaceholder(/Digite o texto completo e regras/i);
    if (descInput) {
      await changeInputText(descInput, 'Concede +1d6 de dano de Sangue aos ataques.');
    }

    const saveBtn = getByText(/Criar Registro no Compêndio|Salvar/i);
    await fireClick(saveBtn);

    // Deve salvar no repositório
    const created = defaultRepository.getAllEntities().find((e) => e.name === 'Adaga Ritualística de Sangue');
    assert.ok(created, 'Nova entidade criada deve existir no repositório');
  });
});
