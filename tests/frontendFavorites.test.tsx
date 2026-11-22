import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import FavoritesAndListsScreen from '../src/app/(tabs)/favorites';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';

describe('Frontend - Tela de Favoritos, Listas e Backup (favorites.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar apenas as 3 sub-abas essenciais (Favoritos, Listas, Editados) sem duplicar Temas, Backup ou Manual', async () => {
    const { queryByText } = await renderWithProviders(
      <FavoritesAndListsScreen />,
      { mobile: false }
    );

    // Abas internas consolidadas
    assert.ok(queryByText(/Favoritos/i));
    assert.ok(queryByText(/Listas/i));
    assert.ok(queryByText(/Editados/i));

    // Sub-abas/botões globais removidos para evitar duplicidade com Header/Perfil
    assert.equal(queryByText(/Temas & Visual/i), null);
    assert.equal(queryByText(/Backup JSON/i), null);
    assert.equal(queryByText('Manual'), null);
  });

  test('deve renderizar em ambiente Celular (Android e iOS) com abas roláveis e safe area', async () => {
    const { queryByText } = await renderWithProviders(
      <FavoritesAndListsScreen />,
      { mobile: 'android' }
    );

    assert.ok(queryByText(/Favoritos/i));
    assert.ok(queryByText(/Listas/i));
    assert.ok(queryByText(/Editados/i));
    // Estado inicial de favoritos vazios
    assert.ok(queryByText(/Nenhum favorito salvo/i));
  });

  test('deve alternar para a aba de Listas e permitir preencher campos de criação de lista', async () => {
    const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
      <FavoritesAndListsScreen />,
      { mobile: 'ios' }
    );

    // Clica na sub-aba de Listas
    const listsTab = getByText(/Pastas|Listas/i);
    await fireClick(listsTab);

    // Deve exibir o formulário de criar lista
    const nameInput = getByPlaceholder(/Nome da lista/i);
    assert.ok(nameInput);
    await changeInputText(nameInput, 'Investigação do Necrotério');

    const descInput = getByPlaceholder(/Descrição opcional/i);
    if (descInput) {
      await changeInputText(descInput, 'Rituais e itens úteis para o caso');
    }

    const createBtn = getByText(/Criar Lista|Salvar Lista/i);
    assert.ok(createBtn);
    await fireClick(createBtn);

    // A lista criada deve aparecer na tela
    assert.ok(queryByText('Investigação do Necrotério'));
  });

  test('deve alternar para a aba de Editados e manter toggle de 1/2 colunas funcionando', async () => {
    const { getByText, queryByText } = await renderWithProviders(<FavoritesAndListsScreen />);

    const homebrewTab = getByText(/Editados/i);
    await fireClick(homebrewTab);
    assert.ok(queryByText(/Nenhum registro customizado/i));

    const toggleCols = getByText('1 coluna');
    await fireClick(toggleCols);
    assert.ok(queryByText('2 colunas'));
  });
});
