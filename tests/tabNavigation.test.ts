import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveNavigationTabs,
  reorderPinnedTabs,
  pinTab,
  unpinTab,
  hideTab,
  unhideTab,
  resetNavigationConfig,
  isLegacyDefaultNavigationConfig,
} from '../src/utils/tabNavigation';
import {
  DEFAULT_HIDDEN_TABS,
  DEFAULT_PINNED_TABS,
  LEGACY_DEFAULT_PINNED_TABS,
  getTabMetadata,
  KNOWN_TAB_DEFINITIONS,
  TabNavigationConfig,
} from '../src/types/compendium';

describe('Sistema Dinâmico de Navegação e Abas (tabNavigation.ts)', () => {
  const allAppRoutes = [
    'index',
    'characters',
    'weapons',
    'books',
    'dice',
    'favorites',
    'master',
    'table',
    'oracle',
    'support',
  ];

  test('resolveNavigationTabs com novo padrão oficial do app (5 fixadas, 2 menu mais, 3 ocultas)', () => {
    const res = resolveNavigationTabs(allAppRoutes);

    // 1. ABAS FIXADAS NA BARRA (5)
    assert.deepEqual(res.pinnedTabs, ['index', 'characters', 'books', 'favorites', 'dice']);

    // 2. ABAS NO MENU MAIS (2)
    assert.deepEqual(res.overflowTabs, ['weapons', 'support']);

    // 3. ABAS OCULTAS (3)
    assert.deepEqual(res.hiddenTabs, ['master', 'oracle', 'table']);
  });

  test('migração automática do padrão legado antigo para o novo padrão', () => {
    const legacyConfig: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters', 'master', 'weapons', 'dice'],
      hiddenTabs: [],
    };

    assert.strictEqual(isLegacyDefaultNavigationConfig(legacyConfig), true);

    const res = resolveNavigationTabs(allAppRoutes, legacyConfig);
    // Deve migrar para o novo padrão do app
    assert.deepEqual(res.pinnedTabs, ['index', 'characters', 'books', 'favorites', 'dice']);
    assert.deepEqual(res.overflowTabs, ['weapons', 'support']);
    assert.deepEqual(res.hiddenTabs, ['master', 'oracle', 'table']);
  });

  test('respeito irrestrito a alterações do usuário (a menos que o usuário altere)', () => {
    // Usuário customizou voluntariamente as abas
    const userCustomConfig: TabNavigationConfig = {
      pinnedTabs: ['characters', 'index', 'oracle'],
      hiddenTabs: ['dice'],
    };

    assert.strictEqual(isLegacyDefaultNavigationConfig(userCustomConfig), false);

    const res = resolveNavigationTabs(allAppRoutes, userCustomConfig);
    // Mantém exatamente as abas escolhidas pelo usuário
    assert.deepEqual(res.pinnedTabs, ['characters', 'index', 'oracle']);
    assert.ok(res.hiddenTabs.includes('dice'));
    assert.strictEqual(res.pinnedTabs.includes('dice'), false);
    assert.strictEqual(res.overflowTabs.includes('dice'), false);
  });

  test('resolveNavigationTabs com rota oculta configurada (ex: master ou campanhas)', () => {
    const customConfig: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters', 'weapons', 'dice'],
      hiddenTabs: ['master'],
    };
    const res = resolveNavigationTabs(allAppRoutes, customConfig);

    assert.ok(res.hiddenTabs.includes('master'));
    assert.strictEqual(res.overflowTabs.includes('master'), false);
    assert.strictEqual(res.pinnedTabs.includes('master'), false);
  });

  test('resolveNavigationTabs descobre automaticamente rotas não mapeadas e as coloca no modal', () => {
    const routesWithFuture = [...allAppRoutes, 'futura_tela_secreta'];
    const res = resolveNavigationTabs(routesWithFuture);

    // Nova rota desconhecida deve ir automaticamente para overflow (modal)
    assert.ok(res.overflowTabs.includes('futura_tela_secreta'));
  });

  test('remover botão Mais quando todas as abas ativas estiverem fixadas na barra', () => {
    // Se o usuário fixar todas as rotas ativas
    const customConfig: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters', 'weapons', 'books', 'dice', 'favorites', 'support'],
      hiddenTabs: ['master', 'table', 'oracle'],
    };
    const res = resolveNavigationTabs(allAppRoutes, customConfig);

    assert.strictEqual(res.overflowTabs.length, 0); // Modal vazio! Botão 'Mais' deve desaparecer
  });

  test('reordenar abas fixadas com segurança (reorderPinnedTabs)', () => {
    const tabs = ['index', 'characters', 'books', 'favorites', 'dice'];

    // Mover 'dice' do índice 4 para o índice 0 (primeira posição)
    const reordered = reorderPinnedTabs(tabs, 4, 0);
    assert.deepEqual(reordered, ['dice', 'index', 'characters', 'books', 'favorites']);

    // Mover com índices inválidos deve retornar cópia inalterada
    assert.deepEqual(reorderPinnedTabs(tabs, -1, 2), tabs);
    assert.deepEqual(reorderPinnedTabs(tabs, 0, 10), tabs);
    assert.deepEqual(reorderPinnedTabs(tabs, 1, 1), tabs);
  });

  test('pinTab e unpinTab transferem abas entre barra e modal', () => {
    let config: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters'],
      hiddenTabs: [],
    };

    // Fixar 'weapons'
    config = pinTab(config, 'weapons');
    assert.deepEqual(config.pinnedTabs, ['index', 'characters', 'weapons']);

    // Desafixar 'characters'
    config = unpinTab(config, 'characters');
    assert.deepEqual(config.pinnedTabs, ['index', 'weapons']);

    // Desafixar a última não deve permitir barra vazia
    config = unpinTab(config, 'weapons');
    config = unpinTab(config, 'index'); // Tenta remover a última
    assert.strictEqual(config.pinnedTabs.length, 1);
  });

  test('hideTab e unhideTab alternam visibilidade da aba', () => {
    let config: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters', 'weapons'],
      hiddenTabs: [],
    };

    // Ocultar 'weapons'
    config = hideTab(config, 'weapons');
    assert.ok(config.hiddenTabs.includes('weapons'));
    assert.strictEqual(config.pinnedTabs.includes('weapons'), false);

    // Reativar 'weapons'
    config = unhideTab(config, 'weapons');
    assert.strictEqual(config.hiddenTabs.includes('weapons'), false);

    // Reativar 'weapons' fixando diretamente na barra
    config = hideTab(config, 'weapons');
    config = unhideTab(config, 'weapons', true);
    assert.ok(config.pinnedTabs.includes('weapons'));
  });

  test('getTabMetadata retorna dados para rotas conhecidas e fallback automático para novas rotas', () => {
    const metaIndex = getTabMetadata('index');
    assert.strictEqual(metaIndex.label, 'Compêndio');
    assert.strictEqual(metaIndex.icon, 'search');

    const metaMaster = getTabMetadata('master');
    assert.strictEqual(metaMaster.label, 'Mestre');
    assert.strictEqual(metaMaster.icon, 'skull');

    // Nova rota sem metadados predefinidos
    const metaUnknown = getTabMetadata('grimorio_avancado');
    assert.strictEqual(metaUnknown.label, 'Grimorio_avancado');
    assert.strictEqual(metaUnknown.icon, 'apps-outline');
  });

  test('resetNavigationConfig restaura os novos padrões recomendados do app', () => {
    const reset = resetNavigationConfig();
    assert.deepEqual(reset.pinnedTabs, DEFAULT_PINNED_TABS);
    assert.deepEqual(reset.pinnedTabs, ['index', 'characters', 'books', 'favorites', 'dice']);
    assert.deepEqual(reset.hiddenTabs, DEFAULT_HIDDEN_TABS);
    assert.deepEqual(reset.hiddenTabs, ['master', 'oracle', 'table']);
  });
});
