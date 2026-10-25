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
} from '../src/utils/tabNavigation';
import {
  DEFAULT_HIDDEN_TABS,
  DEFAULT_PINNED_TABS,
  getTabMetadata,
  KNOWN_TAB_DEFINITIONS,
  TabNavigationConfig,
} from '../src/types/compendium';

describe('Sistema Dinâmico de Navegação e Abas (tabNavigation.ts)', () => {
  const standardRoutes = ['index', 'characters', 'weapons', 'books', 'dice', 'favorites'];

  test('resolveNavigationTabs com configuração padrão inicial', () => {
    const res = resolveNavigationTabs(standardRoutes);
    // As abas fixadas respeitam DEFAULT_PINNED_TABS presentes em standardRoutes
    assert.ok(res.pinnedTabs.includes('index'));
    assert.ok(res.pinnedTabs.includes('characters'));
    // Livros e Salvos vão para o modal (overflow)
    assert.ok(res.overflowTabs.includes('books'));
    assert.ok(res.overflowTabs.includes('favorites'));
  });

  test('resolveNavigationTabs com rota oculta configurada (ex: master ou campanhas)', () => {
    const customConfig: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters', 'weapons', 'dice'],
      hiddenTabs: ['master'],
    };
    const routesWithMaster = [...standardRoutes, 'master'];
    const res = resolveNavigationTabs(routesWithMaster, customConfig);

    assert.ok(res.hiddenTabs.includes('master'));
    assert.strictEqual(res.overflowTabs.includes('master'), false);
    assert.strictEqual(res.pinnedTabs.includes('master'), false);
  });

  test('resolveNavigationTabs descobre automaticamente rotas não mapeadas e as coloca no modal', () => {
    const routesWithFuture = [...standardRoutes, 'futura_tela_secreta'];
    const res = resolveNavigationTabs(routesWithFuture);

    // Nova rota desconhecida deve ir automaticamente para overflow (modal)
    assert.ok(res.overflowTabs.includes('futura_tela_secreta'));
  });

  test('remover botão Mais quando todas as abas ativas estiverem fixadas na barra', () => {
    // Se o usuário fixar todas as abas
    const customConfig: TabNavigationConfig = {
      pinnedTabs: ['index', 'characters', 'weapons', 'books', 'dice', 'favorites'],
      hiddenTabs: [],
    };
    const res = resolveNavigationTabs(standardRoutes, customConfig);

    assert.strictEqual(res.pinnedTabs.length, 6);
    assert.strictEqual(res.overflowTabs.length, 0); // Modal vazio! Botão 'Mais' deve desaparecer
  });

  test('reordenar abas fixadas com segurança (reorderPinnedTabs)', () => {
    const tabs = ['index', 'characters', 'weapons', 'dice'];

    // Mover 'dice' do índice 3 para o índice 0 (primeira posição)
    const reordered = reorderPinnedTabs(tabs, 3, 0);
    assert.deepEqual(reordered, ['dice', 'index', 'characters', 'weapons']);

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

  test('resetNavigationConfig restaura os padrões recomendados', () => {
    const reset = resetNavigationConfig();
    assert.deepEqual(reset.pinnedTabs, DEFAULT_PINNED_TABS);
    assert.deepEqual(reset.hiddenTabs, DEFAULT_HIDDEN_TABS);
  });
});
