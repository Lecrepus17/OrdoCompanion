import { CompendiumEntity } from '../../types/compendium';
import { RecordPreviewTarget } from '../../types/recordPreview';
import { CardThemeDefinition, CardThemeId, RecordCardData } from './types';

/**
 * ============================================================================
 * REGISTRO CENTRAL DE TEMAS E FUNDOS ESTILIZADOS
 * ============================================================================
 * Aqui são definidos os estilos visuais de cada elemento e tipo.
 * Para adicionar novos estilos ou imagens de fundo personalizadas depois:
 * 1. Adicione um novo objeto em RECORD_CARD_THEMES.
 * 2. Preencha `customBgImageUri` se desejar usar uma imagem/textura externa.
 * 3. Configure as cores, glifo e lema temático.
 */
export const RECORD_CARD_THEMES: Record<string, CardThemeDefinition> = {
  // 1. SANGUE - Carmesim visceral, sentimentos, dor e intensidade
  sangue: {
    id: 'sangue',
    name: 'Sangue',
    subtitle: 'Sentimento, Dor & Carnificina',
    kind: 'element',
    elementGlyph: '🩸',
    patternType: 'blood_veins',
    motto: 'O Sangue é o sentimento, a intensidade e a dor que move a carne.',
    cornerStyle: 'gothic',
    overlayOpacity: 0.88,
    colors: {
      primary: '#DC2626',
      secondary: '#991B1B',
      accent: '#EF4444',
      bgGradientStart: '#2A060A',
      bgGradientEnd: '#0D0204',
      surfaceBg: 'rgba(56, 9, 14, 0.72)',
      borderColor: '#DC2626',
      textColor: '#FFFFFF',
      textSecondary: '#FECACA',
      textMuted: '#FCA5A5',
      badgeBg: 'rgba(220, 38, 38, 0.28)',
      badgeText: '#FEE2E2',
      glowColor: 'rgba(239, 68, 68, 0.45)',
    },
  },

  // 2. MORTE - Cinzas, espirais de lodo, tempo e entropia
  morte: {
    id: 'morte',
    name: 'Morte',
    subtitle: 'Tempo, Lodo & Entropia',
    kind: 'element',
    elementGlyph: '⏳',
    patternType: 'death_spirals',
    motto: 'O tempo é uma espiral infinita que a todos consome em cinzas.',
    cornerStyle: 'gothic',
    overlayOpacity: 0.90,
    colors: {
      primary: '#71717A',
      secondary: '#3F3F46',
      accent: '#A1A1AA',
      bgGradientStart: '#18181B',
      bgGradientEnd: '#09090B',
      surfaceBg: 'rgba(39, 39, 42, 0.75)',
      borderColor: '#A1A1AA',
      textColor: '#FAFAFA',
      textSecondary: '#E4E4E7',
      textMuted: '#A1A1AA',
      badgeBg: 'rgba(113, 113, 122, 0.32)',
      badgeText: '#F4F4F5',
      glowColor: 'rgba(161, 161, 170, 0.35)',
    },
  },

  // 3. CONHECIMENTO - Sigilos dourados, runas, equilíbrio e verdade
  conhecimento: {
    id: 'conhecimento',
    name: 'Conhecimento',
    subtitle: 'Razão, Sigilos & Verdade Oculta',
    kind: 'element',
    elementGlyph: '👁️',
    patternType: 'knowledge_runes',
    motto: 'Saber é existir. A verdade busca ser descoberta sob as sombras.',
    cornerStyle: 'runic',
    overlayOpacity: 0.88,
    colors: {
      primary: '#F59E0B',
      secondary: '#B45309',
      accent: '#FBBF24',
      bgGradientStart: '#2A1B05',
      bgGradientEnd: '#0D0802',
      surfaceBg: 'rgba(69, 43, 7, 0.72)',
      borderColor: '#F59E0B',
      textColor: '#FFFFFF',
      textSecondary: '#FEF3C7',
      textMuted: '#FDE68A',
      badgeBg: 'rgba(245, 158, 11, 0.28)',
      badgeText: '#FFFBEB',
      glowColor: 'rgba(251, 191, 36, 0.45)',
    },
  },

  // 4. ENERGIA - Eletricidade roxa, distorção cromática, neon e caos
  energia: {
    id: 'energia',
    name: 'Energia',
    subtitle: 'Caos, Probabilidade & Transformação',
    kind: 'element',
    elementGlyph: '⚡',
    patternType: 'energy_chaos',
    motto: 'O caos é a força viva que zomba de qualquer tentativa de ordem.',
    cornerStyle: 'tech',
    overlayOpacity: 0.86,
    colors: {
      primary: '#A855F7',
      secondary: '#7E22CE',
      accent: '#06B6D4',
      bgGradientStart: '#1F0638',
      bgGradientEnd: '#080112',
      surfaceBg: 'rgba(59, 13, 107, 0.72)',
      borderColor: '#C084FC',
      textColor: '#FFFFFF',
      textSecondary: '#F3E8FF',
      textMuted: '#E9D5FF',
      badgeBg: 'rgba(168, 85, 247, 0.32)',
      badgeText: '#FAF5FF',
      glowColor: 'rgba(168, 85, 247, 0.50)',
    },
  },

  // 5. MEDO - Branco espectral, vazio profundo, névoa e pesadelo
  medo: {
    id: 'medo',
    name: 'Medo',
    subtitle: 'O Inexplicável & Vazio Abissal',
    kind: 'element',
    elementGlyph: '💀',
    patternType: 'fear_mist',
    motto: 'O infinito desconhecido que corrói toda ilusão de sanidade.',
    cornerStyle: 'gothic',
    overlayOpacity: 0.92,
    colors: {
      primary: '#38BDF8',
      secondary: '#0284C7',
      accent: '#E0F2FE',
      bgGradientStart: '#0B1B2B',
      bgGradientEnd: '#02060C',
      surfaceBg: 'rgba(15, 36, 61, 0.75)',
      borderColor: '#7DD3FC',
      textColor: '#FFFFFF',
      textSecondary: '#E0F2FE',
      textMuted: '#BAE6FD',
      badgeBg: 'rgba(56, 189, 248, 0.28)',
      badgeText: '#F0F9FF',
      glowColor: 'rgba(56, 189, 248, 0.45)',
    },
  },

  // 6. VARIÁVEL - Confluência multielemental
  variavel: {
    id: 'variavel',
    name: 'Variável',
    subtitle: 'Confluência de Elementos',
    kind: 'element',
    elementGlyph: '✨',
    patternType: 'energy_chaos',
    motto: 'As fronteiras do paranormal colidem e ressoam em uníssono.',
    cornerStyle: 'runic',
    overlayOpacity: 0.88,
    colors: {
      primary: '#10B981',
      secondary: '#047857',
      accent: '#34D399',
      bgGradientStart: '#04251B',
      bgGradientEnd: '#010E0A',
      surfaceBg: 'rgba(6, 78, 59, 0.72)',
      borderColor: '#10B981',
      textColor: '#FFFFFF',
      textSecondary: '#D1FAE5',
      textMuted: '#A7F3D0',
      badgeBg: 'rgba(16, 185, 129, 0.28)',
      badgeText: '#ECFDF5',
      glowColor: 'rgba(16, 185, 129, 0.45)',
    },
  },

  // 7. TÁTICO MILITAR - Armas, Munições & Modificações
  tatico_arma: {
    id: 'tatico_arma',
    name: 'Tático / Armamento',
    subtitle: 'Arsenal de Campo Ordo Realitas',
    kind: 'category',
    elementGlyph: '⚔️',
    patternType: 'tactical_grid',
    motto: 'Precisão balística e disciplina tática contra o impossível.',
    cornerStyle: 'tech',
    overlayOpacity: 0.90,
    colors: {
      primary: '#EF4444',
      secondary: '#B91C1C',
      accent: '#F87171',
      bgGradientStart: '#1E1718',
      bgGradientEnd: '#090708',
      surfaceBg: 'rgba(46, 27, 29, 0.75)',
      borderColor: '#EF4444',
      textColor: '#FFFFFF',
      textSecondary: '#E2E8F0',
      textMuted: '#94A3B8',
      badgeBg: 'rgba(239, 68, 68, 0.25)',
      badgeText: '#FEE2E2',
      glowColor: 'rgba(239, 68, 68, 0.40)',
    },
  },

  // 8. EQUIPAMENTO & ITENS
  tatico_item: {
    id: 'tatico_item',
    name: 'Equipamento & Utilitários',
    subtitle: 'Logística de Investigação',
    kind: 'category',
    elementGlyph: '💼',
    patternType: 'tactical_grid',
    motto: 'O equipamento correto é a linha tênue entre a sobrevivência e o fracasso.',
    cornerStyle: 'tech',
    overlayOpacity: 0.90,
    colors: {
      primary: '#EC4899',
      secondary: '#BE185D',
      accent: '#F472B6',
      bgGradientStart: '#20111A',
      bgGradientEnd: '#0A0408',
      surfaceBg: 'rgba(51, 23, 40, 0.75)',
      borderColor: '#EC4899',
      textColor: '#FFFFFF',
      textSecondary: '#FCE7F3',
      textMuted: '#FBCFE8',
      badgeBg: 'rgba(236, 72, 153, 0.25)',
      badgeText: '#FDF2F8',
      glowColor: 'rgba(236, 72, 153, 0.40)',
    },
  },

  // 9. AMEAÇAS & CRIATURAS
  ameaca_criatura: {
    id: 'ameaca_criatura',
    name: 'Ameaça / Criatura',
    subtitle: 'Classificação de Perigo Paranormal',
    kind: 'category',
    elementGlyph: '☣️',
    patternType: 'death_spirals',
    motto: 'Alerta de Quarentena: Presença paranormal hostil catalogada.',
    cornerStyle: 'gothic',
    overlayOpacity: 0.92,
    colors: {
      primary: '#E11D48',
      secondary: '#881337',
      accent: '#FB7185',
      bgGradientStart: '#250812',
      bgGradientEnd: '#0B0205',
      surfaceBg: 'rgba(58, 12, 27, 0.78)',
      borderColor: '#E11D48',
      textColor: '#FFFFFF',
      textSecondary: '#FFE4E6',
      textMuted: '#FECDD3',
      badgeBg: 'rgba(225, 29, 72, 0.30)',
      badgeText: '#FFF1F2',
      glowColor: 'rgba(225, 29, 72, 0.50)',
    },
  },

  // 10. DOSSIÊ DO AGENTE - Origens, Classes, Trilhas e Poderes
  dossie_agente: {
    id: 'dossie_agente',
    name: 'Dossiê do Agente',
    subtitle: 'Arquivo Confidencial da Ordo',
    kind: 'category',
    elementGlyph: '🛡️',
    patternType: 'parchment_dossier',
    motto: 'Registro restrito aos membros autorizados da Ordo Realitas.',
    cornerStyle: 'runic',
    overlayOpacity: 0.90,
    colors: {
      primary: '#0284C7',
      secondary: '#0369A1',
      accent: '#38BDF8',
      bgGradientStart: '#0B1C2E',
      bgGradientEnd: '#03080F',
      surfaceBg: 'rgba(15, 41, 69, 0.75)',
      borderColor: '#0284C7',
      textColor: '#FFFFFF',
      textSecondary: '#E0F2FE',
      textMuted: '#BAE6FD',
      badgeBg: 'rgba(2, 132, 199, 0.28)',
      badgeText: '#F0F9FF',
      glowColor: 'rgba(2, 132, 199, 0.40)',
    },
  },

  // 11. MANUAL DE REGRAS & PERÍCIAS
  manual_regra: {
    id: 'manual_regra',
    name: 'Manual de Campo',
    subtitle: 'Diretrizes, Condições & Perícias',
    kind: 'category',
    elementGlyph: '📜',
    patternType: 'clean_ordo',
    motto: 'Conhecimento técnico padronizado para operações de campo.',
    cornerStyle: 'clean',
    overlayOpacity: 0.90,
    colors: {
      primary: '#8B5CF6',
      secondary: '#6D28D9',
      accent: '#A78BFA',
      bgGradientStart: '#19112F',
      bgGradientEnd: '#07040D',
      surfaceBg: 'rgba(40, 27, 75, 0.75)',
      borderColor: '#8B5CF6',
      textColor: '#FFFFFF',
      textSecondary: '#EDE9FE',
      textMuted: '#DDD6FE',
      badgeBg: 'rgba(139, 92, 246, 0.28)',
      badgeText: '#F5F3FF',
      glowColor: 'rgba(139, 92, 246, 0.40)',
    },
  },

  // 12. PADRÃO ORDO REALITAS (Fallback Neutro)
  padrao_ordo: {
    id: 'padrao_ordo',
    name: 'Ordo Realitas',
    subtitle: 'Compêndio Oficial Paranormal',
    kind: 'generic',
    elementGlyph: '👁️‍🗨️',
    patternType: 'clean_ordo',
    motto: 'Nós existimos para investigar, conter e ocultar o paranormal.',
    cornerStyle: 'clean',
    overlayOpacity: 0.92,
    colors: {
      primary: '#DC2626',
      secondary: '#4B5563',
      accent: '#9CA3AF',
      bgGradientStart: '#14161F',
      bgGradientEnd: '#08090C',
      surfaceBg: 'rgba(27, 30, 42, 0.75)',
      borderColor: '#374151',
      textColor: '#FFFFFF',
      textSecondary: '#E5E7EB',
      textMuted: '#9CA3AF',
      badgeBg: 'rgba(75, 85, 99, 0.30)',
      badgeText: '#F3F4F6',
      glowColor: 'rgba(220, 38, 38, 0.35)',
    },
  },
};

/**
 * Resolve automaticamente o tema de fundo e estilo baseado nas características do registro.
 * Prioridade:
 * 1. Elemento paranormal (Sangue, Morte, Conhecimento, Energia, Medo, Variável)
 * 2. Categoria do registro (Arma, Item, Criatura, Origem, Classe, Perícia, etc.)
 * 3. Fallback neutro da Ordo Realitas
 */
export function resolveRecordTheme(
  source?: CompendiumEntity | RecordPreviewTarget | RecordCardData | { element?: string; category?: string } | null
): CardThemeDefinition {
  if (!source) return RECORD_CARD_THEMES.padrao_ordo;

  let elementStr = '';
  let categoryStr = '';

  // 1. Extração do elemento e categoria do source
  if ('kind' in source && typeof source.kind === 'string') {
    // RecordPreviewTarget
    const target = source as RecordPreviewTarget;
    if (target.kind === 'entity') {
      elementStr = target.entity.element || '';
      categoryStr = target.entity.category || '';
    } else if (target.kind === 'generic') {
      elementStr = target.element || '';
      categoryStr = target.categoryLabel || '';
    } else if (target.kind === 'custom_weapon') {
      elementStr = target.weapon.element || '';
      categoryStr = 'weapon';
    } else if (target.kind === 'weapon_mod') {
      elementStr = target.mod.element || '';
      categoryStr = 'weapon';
    } else if (target.kind === 'character_attack') {
      elementStr = target.customWeapon?.element || target.entity?.element || '';
      categoryStr = 'weapon';
    } else if (target.kind === 'campaign_monster') {
      elementStr = target.monster.element || '';
      categoryStr = 'creature';
    } else if (target.kind === 'skill_def') {
      categoryStr = 'skill';
    }
  } else if ('element' in source || 'category' in source) {
    // CompendiumEntity, RecordCardData ou objeto parcial
    const ent = source as Partial<CompendiumEntity>;
    elementStr = ent.element || '';
    categoryStr = ent.category || '';
  }

  // 2. Análise do Elemento Paranormal
  const elLower = (elementStr || '').trim().toLowerCase();
  if (elLower.includes('sangue')) return RECORD_CARD_THEMES.sangue;
  if (elLower.includes('morte')) return RECORD_CARD_THEMES.morte;
  if (elLower.includes('conhecimento')) return RECORD_CARD_THEMES.conhecimento;
  if (elLower.includes('energia')) return RECORD_CARD_THEMES.energia;
  if (elLower.includes('medo')) return RECORD_CARD_THEMES.medo;
  if (elLower.includes('variável') || elLower.includes('variavel')) return RECORD_CARD_THEMES.variavel;

  // 3. Análise da Categoria (caso o elemento seja Nenhum ou não informado)
  const catLower = (categoryStr || '').trim().toLowerCase();
  if (catLower === 'weapon' || catLower.includes('arma')) return RECORD_CARD_THEMES.tatico_arma;
  if (catLower === 'item' || catLower.includes('equipamento')) return RECORD_CARD_THEMES.tatico_item;
  if (catLower === 'creature' || catLower.includes('ameaça') || catLower.includes('monstro')) {
    return RECORD_CARD_THEMES.ameaca_criatura;
  }
  if (
    catLower === 'origin' ||
    catLower === 'class' ||
    catLower === 'track' ||
    catLower === 'power' ||
    catLower.includes('origem') ||
    catLower.includes('classe') ||
    catLower.includes('trilha') ||
    catLower.includes('poder')
  ) {
    return RECORD_CARD_THEMES.dossie_agente;
  }
  if (
    catLower === 'skill' ||
    catLower === 'condition' ||
    catLower === 'rule' ||
    catLower.includes('perícia') ||
    catLower.includes('condição') ||
    catLower.includes('regra')
  ) {
    return RECORD_CARD_THEMES.manual_regra;
  }

  // Fallback seguro
  return RECORD_CARD_THEMES.padrao_ordo;
}

/**
 * Retorna lista de todos os temas disponíveis para permitir alternância pelo usuário
 */
export function getAllCardThemes(): CardThemeDefinition[] {
  return Object.values(RECORD_CARD_THEMES);
}

/**
 * Busca um tema específico pelo ID
 */
export function getCardThemeById(id: string): CardThemeDefinition {
  return RECORD_CARD_THEMES[id] || RECORD_CARD_THEMES.padrao_ordo;
}

/**
 * Permite que o desenvolvedor ou plugins registrem temas adicionais em tempo de execução
 */
export function registerCustomCardTheme(theme: CardThemeDefinition): void {
  RECORD_CARD_THEMES[theme.id] = theme;
}
