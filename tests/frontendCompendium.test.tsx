import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import CompendiumScreen from '../src/app/(tabs)/index';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
  mockRouter,
} from './frontendTestUtils';

describe('Frontend - Tela do Compêndio (index.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a barra de pesquisa, chips de filtro e contagem de itens na Web', async () => {
    const { getByPlaceholder, getByText, queryByText } = await renderWithProviders(
      <CompendiumScreen />,
      { mobile: false }
    );

    // Barra de busca
    const searchInput = getByPlaceholder(/Buscar ritual, criatura, origem/i);
    assert.ok(searchInput);

    // Status de exibição
    assert.ok(queryByText(/Exibindo/i));

    // Categorias visíveis
    assert.ok(queryByText(/Todos/i));
    assert.ok(queryByText(/Rituais/i));
    assert.ok(queryByText(/Armas/i));
  });

  test('deve renderizar em ambiente Mobile (Android e iOS) adaptando layout de coluna única e safe area', async () => {
    const { getByPlaceholder, queryByText, getByText } = await renderWithProviders(
      <CompendiumScreen />,
      { mobile: 'android' }
    );

    assert.ok(getByPlaceholder(/Buscar ritual, criatura, origem/i));
    assert.ok(queryByText(/Exibindo/i));
    // Botão de alternar filtros na tela compacta do celular
    const toggleBtn = queryByText(/Ocultar filtros|Mostrar filtros/i);
    assert.ok(toggleBtn);
  });

  test('deve filtrar entidades pelo campo de busca textual', async () => {
    const { getByPlaceholder, queryByText } = await renderWithProviders(
      <CompendiumScreen />,
      { mobile: 'ios' }
    );

    const searchInput = getByPlaceholder(/Buscar ritual, criatura, origem/i);
    await changeInputText(searchInput, 'Cicatrização');

    // Deve encontrar a entidade filtrada pelo nome
    assert.ok(queryByText(/Cicatrização/i), 'Deveria exibir o ritual Cicatrização');
  });

  test('deve alternar a visibilidade da seção de filtros ao clicar em Ocultar filtros', async () => {
    const { getByText, queryByText } = await renderWithProviders(<CompendiumScreen />);

    const hideBtn = getByText('Ocultar filtros');
    await fireClick(hideBtn);

    // Agora o botão deve se transformar em "Mostrar filtros"
    assert.ok(queryByText('Mostrar filtros'), 'Botão deve indicar Mostrar filtros após recolher');
  });

  test('deve navegar para a tela de criação ao clicar no botão de Adicionar Registro', async () => {
    const { container } = await renderWithProviders(<CompendiumScreen />);

    // Localiza o botão com ícone de adicionar
    const addIcon = container.querySelector('[data-testid="add"]');
    assert.ok(addIcon, 'Botão de adicionar registro deve estar no DOM');
    const addBtn = addIcon.closest('div[role="button"]') || addIcon.parentElement;
    if (addBtn) {
      await fireClick(addBtn);
      assert.ok(
        mockRouter.history.some((h) => h.action === 'push' && h.href.pathname === '/entity/editor'),
        'Deveria navegar para /entity/editor'
      );
    }
  });
});
