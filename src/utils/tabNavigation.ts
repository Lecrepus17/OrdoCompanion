import {
  DEFAULT_HIDDEN_TABS,
  DEFAULT_PINNED_TABS,
  TabNavigationConfig,
} from '../types/compendium';

export interface ResolvedNavigationTabs {
  pinnedTabs: string[];
  overflowTabs: string[];
  hiddenTabs: string[];
}

/**
 * Resolve dinamicamente as abas disponíveis na barra inferior, no modal e ocultas.
 * Descobre automaticamente novas rotas presentes no navegador que ainda não
 * tenham sido configuradas pelo usuário.
 */
export function resolveNavigationTabs(
  availableRouteNames: string[],
  config?: TabNavigationConfig
): ResolvedNavigationTabs {
  if (!availableRouteNames || availableRouteNames.length === 0) {
    return { pinnedTabs: [], overflowTabs: [], hiddenTabs: [] };
  }

  const rawPinned = config?.pinnedTabs && Array.isArray(config.pinnedTabs)
    ? config.pinnedTabs
    : DEFAULT_PINNED_TABS;

  const rawHidden = config?.hiddenTabs && Array.isArray(config.hiddenTabs)
    ? config.hiddenTabs
    : DEFAULT_HIDDEN_TABS;

  // Filtra as abas fixadas mantendo a ordem do usuário, mas garantindo que a rota realmente existe
  const pinnedSet = new Set<string>();
  const pinnedTabs: string[] = [];
  for (const name of rawPinned) {
    if (availableRouteNames.includes(name) && !pinnedSet.has(name)) {
      pinnedSet.add(name);
      pinnedTabs.push(name);
    }
  }

  // Filtra as abas ocultas (não podem estar entre as fixadas)
  const hiddenTabs: string[] = [];
  const hiddenSet = new Set<string>();
  for (const name of rawHidden) {
    if (availableRouteNames.includes(name) && !pinnedSet.has(name) && !hiddenSet.has(name)) {
      hiddenSet.add(name);
      hiddenTabs.push(name);
    }
  }

  // Abas excedentes (overflow): todas as rotas disponíveis que não estão fixadas e não estão ocultas
  const overflowTabs: string[] = [];
  for (const name of availableRouteNames) {
    if (!pinnedSet.has(name) && !hiddenSet.has(name)) {
      overflowTabs.push(name);
    }
  }

  // Salvaguarda: a barra nunca pode ficar 100% vazia
  if (pinnedTabs.length === 0) {
    const fallbackTab = overflowTabs.shift() || hiddenTabs.shift() || availableRouteNames[0];
    if (fallbackTab) {
      pinnedTabs.push(fallbackTab);
      pinnedSet.add(fallbackTab);
      hiddenSet.delete(fallbackTab);
    }
  }

  return {
    pinnedTabs,
    overflowTabs,
    hiddenTabs,
  };
}

/**
 * Reordena uma aba na lista de abas fixadas (ex.: subir ou descer).
 */
export function reorderPinnedTabs(
  pinnedTabs: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  if (
    fromIndex < 0 ||
    fromIndex >= pinnedTabs.length ||
    toIndex < 0 ||
    toIndex >= pinnedTabs.length ||
    fromIndex === toIndex
  ) {
    return [...pinnedTabs];
  }

  const result = [...pinnedTabs];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

/**
 * Adiciona uma aba à barra inferior (fixada).
 */
export function pinTab(
  config: TabNavigationConfig,
  tabId: string
): TabNavigationConfig {
  const currentPinned = config.pinnedTabs || [];
  const currentHidden = config.hiddenTabs || [];

  const nextPinned = currentPinned.includes(tabId)
    ? currentPinned
    : [...currentPinned, tabId];

  const nextHidden = currentHidden.filter((id) => id !== tabId);

  return {
    pinnedTabs: nextPinned,
    hiddenTabs: nextHidden,
  };
}

/**
 * Remove uma aba da barra inferior, enviando-a para o modal (se não for oculta).
 * Impede remover caso seja a única aba fixada restante.
 */
export function unpinTab(
  config: TabNavigationConfig,
  tabId: string
): TabNavigationConfig {
  const currentPinned = config.pinnedTabs || [];
  if (currentPinned.length <= 1) {
    return config; // Salvaguarda: mantém pelo menos 1 aba na barra
  }

  const nextPinned = currentPinned.filter((id) => id !== tabId);
  return {
    pinnedTabs: nextPinned,
    hiddenTabs: config.hiddenTabs || [],
  };
}

/**
 * Oculta uma aba completamente (não aparece nem na barra nem no modal).
 */
export function hideTab(
  config: TabNavigationConfig,
  tabId: string
): TabNavigationConfig {
  const currentPinned = config.pinnedTabs || [];
  const currentHidden = config.hiddenTabs || [];

  // Se estiver fixada e for a única, não oculta para não esvaziar a barra
  if (currentPinned.includes(tabId) && currentPinned.length <= 1) {
    return config;
  }

  const nextPinned = currentPinned.filter((id) => id !== tabId);
  const nextHidden = currentHidden.includes(tabId)
    ? currentHidden
    : [...currentHidden, tabId];

  return {
    pinnedTabs: nextPinned,
    hiddenTabs: nextHidden,
  };
}

/**
 * Reativa uma aba previamente oculta, disponibilizando-a no modal (ou opcionalmente fixada).
 */
export function unhideTab(
  config: TabNavigationConfig,
  tabId: string,
  addToPinned = false
): TabNavigationConfig {
  const currentPinned = config.pinnedTabs || [];
  const currentHidden = config.hiddenTabs || [];

  const nextHidden = currentHidden.filter((id) => id !== tabId);
  const nextPinned = addToPinned && !currentPinned.includes(tabId)
    ? [...currentPinned, tabId]
    : currentPinned;

  return {
    pinnedTabs: nextPinned,
    hiddenTabs: nextHidden,
  };
}

/**
 * Retorna a configuração padrão recomendada de abas.
 */
export function resetNavigationConfig(): TabNavigationConfig {
  return {
    pinnedTabs: [...DEFAULT_PINNED_TABS],
    hiddenTabs: [...DEFAULT_HIDDEN_TABS],
  };
}
