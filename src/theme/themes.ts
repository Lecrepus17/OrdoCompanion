export type ThemeId =
  | 'dark'
  | 'energia'
  | 'light'
  | 'sangue'
  | 'morte'
  | 'conhecimento'
  | 'medo'
  | (string & {});

export interface ElementColors {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceHighlight: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;

  elements: {
    Sangue: ElementColors;
    Morte: ElementColors;
    Conhecimento: ElementColors;
    Energia: ElementColors;
    Medo: ElementColors;
    Variável: ElementColors;
    Nenhum: ElementColors;
  };
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  isDark: boolean;
  statusBarStyle: 'light' | 'dark';
  badgeColor: string;
  previewColors: string[];
  colors: ThemeColors;
}

// 1. TEMA PRETO (ORIGINAL / ESCURIDÃO PARANORMAL)
export const darkTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Preto (Original)',
  subtitle: 'Escuridão Paranormal',
  description: 'Tema clássico escuro do Ordem Paranormal com detalhes carmesins e alto contraste tático.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#DC2626',
  previewColors: ['#090A0F', '#12151E', '#DC2626', '#F3F4F6'],
  colors: {
    background: '#090A0F',
    surface: '#12151E',
    surfaceElevated: '#1A1E2B',
    surfaceHighlight: '#23293A',
    border: '#262C3F',
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    primary: '#DC2626',
    primarySoft: 'rgba(220, 38, 38, 0.16)',
    accent: '#A855F7',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    elements: {
      Sangue: {
        bg: 'rgba(225, 29, 72, 0.18)',
        border: '#E11D48',
        text: '#FDA4AF',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(113, 113, 122, 0.24)',
        border: '#A1A1AA',
        text: '#E4E4E7',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(245, 158, 11, 0.18)',
        border: '#F59E0B',
        text: '#FDE68A',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(168, 85, 247, 0.20)',
        border: '#A855F7',
        text: '#E9D5FF',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(56, 189, 248, 0.18)',
        border: '#38BDF8',
        text: '#BAE6FD',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.16)',
        border: '#10B981',
        text: '#A7F3D0',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(75, 85, 99, 0.20)',
        border: '#4B5563',
        text: '#D1D5DB',
        icon: 'document-text',
      },
    },
  },
};

// 2. TEMA SANGUE (SENTIMENTO, DOR & CARNIFICINA)
export const sangueTheme: ThemeDefinition = {
  id: 'sangue',
  name: 'Sangue (Sentimento)',
  subtitle: 'Dor, Paixão & Carnificina',
  description: 'Atmosfera carmesim profunda e visceral inspirada nas entidades e no fluxo incessante de Sangue.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#E11D48',
  previewColors: ['#120407', '#1E070C', '#E11D48', '#FFF1F2'],
  colors: {
    background: '#120407',
    surface: '#1E070C',
    surfaceElevated: '#2C0B12',
    surfaceHighlight: '#3E101A',
    border: '#571625',
    text: '#FFF1F2',
    textSecondary: '#FDA4AF',
    textMuted: '#A16F77',
    primary: '#E11D48',
    primarySoft: 'rgba(225, 29, 72, 0.22)',
    accent: '#FB7185',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    elements: {
      Sangue: {
        bg: 'rgba(225, 29, 72, 0.28)',
        border: '#F43F5E',
        text: '#FFE4E6',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(113, 113, 122, 0.22)',
        border: '#A1A1AA',
        text: '#E4E4E7',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(245, 158, 11, 0.20)',
        border: '#F59E0B',
        text: '#FDE68A',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(168, 85, 247, 0.20)',
        border: '#A855F7',
        text: '#E9D5FF',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(56, 189, 248, 0.20)',
        border: '#38BDF8',
        text: '#BAE6FD',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.18)',
        border: '#10B981',
        text: '#A7F3D0',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(120, 50, 60, 0.20)',
        border: '#73202E',
        text: '#FECDD3',
        icon: 'document-text',
      },
    },
  },
};

// 3. TEMA MORTE (LODO, TEMPO & ESPIRAL)
export const morteTheme: ThemeDefinition = {
  id: 'morte',
  name: 'Morte (Lodo & Tempo)',
  subtitle: 'Espiral, Cinzas & Entropia',
  description: 'Estética monocromática espectral inspirada no lodo negro, na passagem do tempo e na decomposição.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#A1A1AA',
  previewColors: ['#09090B', '#121216', '#A1A1AA', '#F4F4F5'],
  colors: {
    background: '#09090B',
    surface: '#121216',
    surfaceElevated: '#1A1A20',
    surfaceHighlight: '#262630',
    border: '#383846',
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    primary: '#D4D4D8',
    primarySoft: 'rgba(212, 212, 216, 0.18)',
    accent: '#E4E4E7',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    elements: {
      Sangue: {
        bg: 'rgba(225, 29, 72, 0.20)',
        border: '#E11D48',
        text: '#FDA4AF',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(161, 161, 170, 0.26)',
        border: '#E4E4E7',
        text: '#FFFFFF',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(245, 158, 11, 0.20)',
        border: '#F59E0B',
        text: '#FDE68A',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(168, 85, 247, 0.20)',
        border: '#A855F7',
        text: '#E9D5FF',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(56, 189, 248, 0.20)',
        border: '#38BDF8',
        text: '#BAE6FD',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.18)',
        border: '#10B981',
        text: '#A7F3D0',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(63, 63, 70, 0.25)',
        border: '#52525B',
        text: '#D4D4D8',
        icon: 'document-text',
      },
    },
  },
};

// 4. TEMA CONHECIMENTO (SIGILOS, RAZÃO & MENTE)
export const conhecimentoTheme: ThemeDefinition = {
  id: 'conhecimento',
  name: 'Conhecimento (Sigilos)',
  subtitle: 'Razão, Dourado & Símbolos',
  description: 'Visual místico com tons dourados, pergaminho antigo e sigilos esotéricos sobre superfície de ônix.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#F59E0B',
  previewColors: ['#0D0B05', '#17130A', '#F59E0B', '#FEFCE8'],
  colors: {
    background: '#0D0B05',
    surface: '#17130A',
    surfaceElevated: '#231D10',
    surfaceHighlight: '#332A17',
    border: '#4A3D22',
    text: '#FEFCE8',
    textSecondary: '#FDE047',
    textMuted: '#A3966B',
    primary: '#F59E0B',
    primarySoft: 'rgba(245, 158, 11, 0.22)',
    accent: '#FBBF24',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    elements: {
      Sangue: {
        bg: 'rgba(225, 29, 72, 0.20)',
        border: '#E11D48',
        text: '#FDA4AF',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(113, 113, 122, 0.22)',
        border: '#A1A1AA',
        text: '#E4E4E7',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(245, 158, 11, 0.28)',
        border: '#FBBF24',
        text: '#FEF9C3',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(168, 85, 247, 0.20)',
        border: '#A855F7',
        text: '#E9D5FF',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(56, 189, 248, 0.20)',
        border: '#38BDF8',
        text: '#BAE6FD',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.18)',
        border: '#10B981',
        text: '#A7F3D0',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(115, 85, 25, 0.22)',
        border: '#694F16',
        text: '#FEF08A',
        icon: 'document-text',
      },
    },
  },
};

// 5. TEMA Energia (Caos & Vibração)
export const energiaTheme: ThemeDefinition = {
  id: 'energia',
  name: 'Energia (Caos & Vibração)',
  subtitle: 'Caos & Vibração Paranormal',
  description: 'Atmosfera com tons violetas profundos, brilho neon de ametista e acentos do elemento Energia.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#A855F7',
  previewColors: ['#0C0819', '#16102D', '#A855F7', '#F5F3FF'],
  colors: {
    background: '#0C0819',
    surface: '#16102D',
    surfaceElevated: '#211842',
    surfaceHighlight: '#2F235E',
    border: '#3D2F75',
    text: '#F5F3FF',
    textSecondary: '#C4B5FD',
    textMuted: '#8B7CB2',
    primary: '#A855F7',
    primarySoft: 'rgba(168, 85, 247, 0.22)',
    accent: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#F43F5E',
    elements: {
      Sangue: {
        bg: 'rgba(244, 63, 94, 0.22)',
        border: '#F43F5E',
        text: '#FECDD3',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(148, 163, 184, 0.22)',
        border: '#94A3B8',
        text: '#F1F5F9',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(245, 158, 11, 0.22)',
        border: '#FBBF24',
        text: '#FEF3C7',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(192, 132, 252, 0.28)',
        border: '#C084FC',
        text: '#FAF5FF',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(56, 189, 248, 0.22)',
        border: '#38BDF8',
        text: '#BAE6FD',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.20)',
        border: '#34D399',
        text: '#D1FAE5',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(139, 92, 246, 0.20)',
        border: '#8B5CF6',
        text: '#DDD6FE',
        icon: 'document-text',
      },
    },
  },
};

// 6. TEMA MEDO (ABISMO, NÉVOA & O DESCONHECIDO)
export const medoTheme: ThemeDefinition = {
  id: 'medo',
  name: 'Medo (O Desconhecido)',
  subtitle: 'Abismo, Névoa & Infinito',
  description: 'Imersão abissal com tons de azul marinho profundo, ciano etéreo e o enigma do Medo insondável.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#0284C7',
  previewColors: ['#040914', '#091326', '#0284C7', '#F0F9FF'],
  colors: {
    background: '#040914',
    surface: '#091326',
    surfaceElevated: '#0F1E3A',
    surfaceHighlight: '#172C54',
    border: '#23427D',
    text: '#F0F9FF',
    textSecondary: '#7DD3FC',
    textMuted: '#7091B5',
    primary: '#0284C7',
    primarySoft: 'rgba(2, 132, 199, 0.22)',
    accent: '#38BDF8',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    elements: {
      Sangue: {
        bg: 'rgba(225, 29, 72, 0.20)',
        border: '#E11D48',
        text: '#FDA4AF',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(113, 113, 122, 0.22)',
        border: '#A1A1AA',
        text: '#E4E4E7',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(245, 158, 11, 0.20)',
        border: '#F59E0B',
        text: '#FDE68A',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(168, 85, 247, 0.20)',
        border: '#A855F7',
        text: '#E9D5FF',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(56, 189, 248, 0.28)',
        border: '#38BDF8',
        text: '#E0F2FE',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.18)',
        border: '#10B981',
        text: '#A7F3D0',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(14, 50, 95, 0.22)',
        border: '#1B4E8C',
        text: '#BAE6FD',
        icon: 'document-text',
      },
    },
  },
};

// 7. TEMA BRANCO (DOSSIÊ CLÍNICO / ARQUIVO DA ORDEM)
export const lightTheme: ThemeDefinition = {
  id: 'light',
  name: 'Branco (Dossiê)',
  subtitle: 'Relatório & Arquivo Clínico',
  description: 'Design claro de alta legibilidade, inspirado nos relatórios impressos, fichas e dossiês dos investigadores.',
  isDark: false,
  statusBarStyle: 'dark',
  badgeColor: '#DC2626',
  previewColors: ['#F1F5F9', '#FFFFFF', '#DC2626', '#0F172A'],
  colors: {
    background: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceElevated: '#F8FAFC',
    surfaceHighlight: '#E2E8F0',
    border: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    primary: '#DC2626',
    primarySoft: 'rgba(220, 38, 38, 0.10)',
    accent: '#7C3AED',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    elements: {
      Sangue: {
        bg: 'rgba(225, 29, 72, 0.12)',
        border: '#E11D48',
        text: '#9F1239',
        icon: 'water',
      },
      Morte: {
        bg: 'rgba(100, 116, 139, 0.14)',
        border: '#64748B',
        text: '#1E293B',
        icon: 'skull',
      },
      Conhecimento: {
        bg: 'rgba(217, 119, 6, 0.14)',
        border: '#D97706',
        text: '#92400E',
        icon: 'eye',
      },
      Energia: {
        bg: 'rgba(147, 51, 234, 0.14)',
        border: '#9333EA',
        text: '#6B21A8',
        icon: 'flash',
      },
      Medo: {
        bg: 'rgba(2, 132, 199, 0.14)',
        border: '#0284C7',
        text: '#0369A1',
        icon: 'flame',
      },
      Variável: {
        bg: 'rgba(16, 185, 129, 0.14)',
        border: '#059669',
        text: '#065F46',
        icon: 'sparkles',
      },
      Nenhum: {
        bg: 'rgba(148, 163, 184, 0.16)',
        border: '#94A3B8',
        text: '#334155',
        icon: 'document-text',
      },
    },
  },
};

/**
 * Registro de temas disponíveis no aplicativo.
 */
export const THEMES: Record<string, ThemeDefinition> = {
  dark: darkTheme,
  sangue: sangueTheme,
  morte: morteTheme,
  conhecimento: conhecimentoTheme,
  energia: energiaTheme,
  medo: medoTheme,
  light: lightTheme,
};

export const DEFAULT_THEME_ID: ThemeId = 'dark';

export function getTheme(id?: string): ThemeDefinition {
  if (id && THEMES[id]) {
    return THEMES[id];
  }
  return THEMES[DEFAULT_THEME_ID] || darkTheme;
}

export function registerTheme(theme: ThemeDefinition): void {
  THEMES[theme.id] = theme;
}

export function getAvailableThemes(): ThemeDefinition[] {
  return Object.values(THEMES);
}
