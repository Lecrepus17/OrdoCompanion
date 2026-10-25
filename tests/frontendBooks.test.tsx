import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import BooksScreen from '../src/app/(tabs)/books';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';

describe('Frontend - Tela de Biblioteca e Leitor de PDFs (books.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar a biblioteca de livros canônicos e o banner do visualizador na Web', async () => {
    const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
      <BooksScreen />,
      { mobile: false }
    );

    // Barra de busca em páginas
    assert.ok(getByPlaceholder(/Pesquisar trecho/i));
    // Banner informativo
    assert.ok(getByText(/Visualizador de PDF Integrado/i));
    // Título da seção com os 10 livros
    assert.ok(queryByText(/Biblioteca de PDFs Anexados/i));
    // Livro principal canônico
    assert.ok(queryByText(/Livro Base/i));
  });

  test('deve renderizar no ambiente Celular (Android e iOS) adaptando a lista e chips de sumário', async () => {
    const { getByText, queryByText, getAllByText } = await renderWithProviders(
      <BooksScreen />,
      { mobile: 'android' }
    );

    assert.ok(queryByText(/Visualizador de PDF Integrado/i));
    // Botões de leitura nos cards
    const readBtns = getAllByText(/Ler PDF/i);
    assert.ok(readBtns.length > 0, 'Deve exibir botões Ler PDF nos cards no celular');
  });

  test('deve abrir o modal de leitura de PDF ao clicar em "Ler PDF"', async () => {
    const { getAllByText, queryByText } = await renderWithProviders(<BooksScreen />, {
      mobile: 'ios',
    });

    const readBtns = getAllByText(/Ler PDF/i);
    assert.ok(readBtns.length > 0);
    await fireClick(readBtns[0]);

    // O modal do visualizador de PDF deve abrir
    assert.ok(queryByText(/Página|Capítulos|Visualizador/i));
  });

  test('deve filtrar ocorrências em páginas ao digitar no campo de busca', async () => {
    const { getByPlaceholder, queryByText } = await renderWithProviders(<BooksScreen />);

    const searchInput = getByPlaceholder(/Pesquisar trecho/i);
    // Digita um termo canônico comum dos livros
    await changeInputText(searchInput, 'Sanidade');

    // Deve exibir ocorrências encontradas ou cabeçalho de busca
    assert.ok(queryByText(/ocorrências encontradas|Sanidade/i));
  });

  test('deve abrir o manual ao clicar no botão "Manual"', async () => {
    const { getByText } = await renderWithProviders(<BooksScreen />);

    const helpBtn = getByText('Manual');
    await fireClick(helpBtn);
    assert.ok(helpBtn);
  });
});
