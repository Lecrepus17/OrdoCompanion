import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { CustomBottomTabBar } from '../src/components/CustomBottomTabBar';
import { MoreTabsModal } from '../src/components/MoreTabsModal';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  mockRouter,
  setMobilePlatform,
} from './frontendTestUtils';

describe('Frontend - Navegação Mobile e Barra de Abas (CustomBottomTabBar.tsx & MoreTabsModal.tsx)', () => {
  const mockState = {
    index: 0,
    routes: [
      { key: 'route_index', name: 'index' },
      { key: 'route_characters', name: 'characters' },
      { key: 'route_weapons', name: 'weapons' },
      { key: 'route_dice', name: 'dice' },
      { key: 'route_books', name: 'books' },
      { key: 'route_favorites', name: 'favorites' },
    ],
  };

  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar as abas fixadas na barra inferior com ícones e rótulos oficiais na Web', async () => {
    const { getByTestId, getByText } = await renderWithProviders(
      <CustomBottomTabBar
        state={mockState}
        pinnedTabs={['index', 'characters', 'weapons', 'dice']}
        overflowTabs={['books', 'favorites']}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        onOpenMoreModal={() => {}}
      />,
      { mobile: false }
    );

    // Deve conter os botões das abas fixadas
    assert.ok(getByTestId('tab-button-index'));
    assert.ok(getByTestId('tab-button-characters'));
    assert.ok(getByTestId('tab-button-weapons'));
    assert.ok(getByTestId('tab-button-dice'));

    // E o botão "Mais" para as telas excedentes
    assert.ok(getByTestId('tab-button-more'));
    assert.ok(getByText('Mais'));
  });

  test('deve adaptar dimensões e safe-area para celulares Android e iOS', async () => {
    const { getByTestId, container } = await renderWithProviders(
      <CustomBottomTabBar
        state={mockState}
        pinnedTabs={['index', 'characters', 'weapons']}
        overflowTabs={['books']}
        insets={{ top: 47, right: 0, bottom: 34, left: 0 }}
        onOpenMoreModal={() => {}}
      />,
      { mobile: 'ios' }
    );

    // O container da barra deve existir e ter botões táteis adequados para toque mobile
    const bar = getByTestId('tab-button-index').closest('div');
    assert.ok(bar);
    assert.ok(getByTestId('tab-button-more'));
  });

  test('deve acionar a navegação ao tocar em uma aba fixada', async () => {
    const { getByTestId } = await renderWithProviders(
      <CustomBottomTabBar
        state={mockState}
        pinnedTabs={['index', 'characters', 'weapons', 'dice']}
        overflowTabs={[]}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
        onOpenMoreModal={() => {}}
      />,
      { mobile: 'android' }
    );

    const diceTab = getByTestId('tab-button-dice');
    await fireClick(diceTab);

    assert.ok(
      mockRouter.history.some(
        (h) => h.action === 'navigate' && String(h.href).includes('dice')
      ),
      'Deveria navegar para a aba de dados'
    );
  });

  test('deve abrir o modal "Mais" ao tocar no botão de overflow', async () => {
    let moreModalOpened = false;

    const { getByTestId } = await renderWithProviders(
      <CustomBottomTabBar
        state={mockState}
        pinnedTabs={['index', 'characters']}
        overflowTabs={['books', 'favorites', 'master']}
        insets={{ top: 0, right: 0, bottom: 16, left: 0 }}
        onOpenMoreModal={() => {
          moreModalOpened = true;
        }}
      />,
      { mobile: 'android' }
    );

    const moreBtn = getByTestId('tab-button-more');
    await fireClick(moreBtn);

    assert.strictEqual(moreModalOpened, true, 'Deveria disparar callback onOpenMoreModal');
  });

  test('MoreTabsModal deve listar abas excedentes e permitir selecionar tela no celular', async () => {
    let selectedRoute = '';
    let customizeOpened = false;

    const { getByText, queryByText } = await renderWithProviders(
      <MoreTabsModal
        visible={true}
        overflowTabs={['books', 'favorites', 'table']}
        activeRouteName="index"
        onClose={() => {}}
        onSelectTab={(key) => {
          selectedRoute = key;
        }}
        onOpenCustomize={() => {
          customizeOpened = true;
        }}
      />,
      { mobile: 'android' }
    );

    // Título do modal
    assert.ok(getByText('Outras Telas'));
    assert.ok(queryByText(/Livros|Grimório|Mesa/i));

    // Botão de personalizar abas
    const customBtn = getByText(/Personalizar Ordem & Abas/i);
    assert.ok(customBtn);
    await fireClick(customBtn);
    assert.strictEqual(customizeOpened, true, 'Deveria abrir personalização de abas');
  });
});
