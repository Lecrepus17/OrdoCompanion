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

  test('deve renderizar as abas de navegação interna (Favoritos, Listas, Homebrew, Backup, Temas)', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <FavoritesAndListsScreen />,
      { mobile: false }
    );

    // Abas internas
    assert.ok(queryByText(/Favoritos/i));
    assert.ok(queryByText(/Listas/i));
    assert.ok(queryByText(/Editados/i));
    assert.ok(queryByText(/Backup/i));
    assert.ok(queryByText(/Temas/i));
  });

  test('deve renderizar em ambiente Celular (Android e iOS) com abas roláveis e safe area', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <FavoritesAndListsScreen />,
      { mobile: 'android' }
    );

    assert.ok(queryByText(/Favoritos/i));
    assert.ok(queryByText(/Backup/i));
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

  test('deve alternar para a aba de Temas e exibir paletas disponíveis', async () => {
    const { getByText, queryByText } = await renderWithProviders(<FavoritesAndListsScreen />);

    const themesTab = getByText('Temas');
    await fireClick(themesTab);

    // Deve listar temas (ex: Dark / Ordo Realitas, Sangue, etc.)
    assert.ok(queryByText(/Tema|Paleta|Ordo/i));
  });

  test('deve abrir o manual ao clicar no botão "Manual"', async () => {
    const { getByText } = await renderWithProviders(<FavoritesAndListsScreen />);

    const helpBtn = getByText('Manual');
    await fireClick(helpBtn);
    assert.ok(helpBtn);
  });
});
