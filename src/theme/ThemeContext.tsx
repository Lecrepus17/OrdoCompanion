import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';
import {
  DEFAULT_THEME_ID,
  getAvailableThemes,
  getTheme,
  ThemeColors,
  ThemeDefinition,
  ThemeId,
} from './themes';
import { COLORS } from './colors';

const THEME_STORAGE_KEY = '@guia_ordem_theme_id';

export interface ThemeContextValue {
  theme: ThemeDefinition;
  themeId: ThemeId;
  colors: ThemeColors;
  isDark: boolean;
  setThemeId: (id: ThemeId) => Promise<void>;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  // Carrega tema salvo do AsyncStorage na inicialização
  useEffect(() => {
    (async () => {
      try {
        const savedId = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedId) {
          const themeDef = getTheme(savedId);
          setThemeIdState(themeDef.id);
          // Sincroniza o objeto mutável COLORS legado
          Object.assign(COLORS, themeDef.colors);
          if (COLORS.elements) {
            Object.assign(COLORS.elements, themeDef.colors.elements);
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar tema do storage:', err);
      }
    })();
  }, []);

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const colors = theme.colors;
  const isDark = theme.isDark;

  const setThemeId = useCallback(async (id: ThemeId) => {
    const nextTheme = getTheme(id);
    setThemeIdState(nextTheme.id);
    // Sincroniza o objeto COLORS imediatamente
    Object.assign(COLORS, nextTheme.colors);
    if (COLORS.elements) {
      Object.assign(COLORS.elements, nextTheme.colors.elements);
    }
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme.id);
    } catch (err) {
      console.warn('Erro ao salvar tema:', err);
    }
  }, []);

  const availableThemes = useMemo(() => getAvailableThemes(), []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeId,
      colors,
      isDark,
      setThemeId,
      availableThemes,
    }),
    [theme, themeId, colors, isDark, setThemeId, availableThemes]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return ctx;
}

// Cache global por tema e fábrica de estilo para evitar recriar StyleSheet em centenas de componentes
const stylesCache = new Map<string, WeakMap<Function, any>>();

/**
 * Hook para criar e memoizar estilos reativos ao tema ativo.
 * Compartilha instâncias idênticas entre múltiplos componentes da tela.
 */
export function useThemedStyles<T extends Record<string, any>>(
  styleFactory: (colors: ThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark, themeId } = useTheme();

  return useMemo(() => {
    let themeCache = stylesCache.get(themeId);
    if (!themeCache) {
      themeCache = new WeakMap();
      stylesCache.set(themeId, themeCache);
    }

    let cachedStyles = themeCache.get(styleFactory);
    if (!cachedStyles) {
      cachedStyles = styleFactory(colors, isDark);
      themeCache.set(styleFactory, cachedStyles);
    }
    return cachedStyles as T;
  }, [colors, isDark, themeId, styleFactory]);
}
