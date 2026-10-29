import { CompendiumEntity, EntityCategory } from '../../types/compendium';
import { RecordPreviewTarget } from '../../types/recordPreview';

export type CardThemeId =
  // Elementos Paranormais
  | 'sangue'
  | 'morte'
  | 'conhecimento'
  | 'energia'
  | 'medo'
  | 'variavel'
  // Categorias Táticas e Neutras (quando sem elemento)
  | 'tatico_arma'
  | 'tatico_item'
  | 'ameaca_criatura'
  | 'dossie_agente'
  | 'manual_regra'
  | 'padrao_ordo'
  // Suporte a IDs customizados
  | (string & {});

export type BackgroundPatternType =
  | 'blood_veins'
  | 'death_spirals'
  | 'knowledge_runes'
  | 'energy_chaos'
  | 'fear_mist'
  | 'tactical_grid'
  | 'parchment_dossier'
  | 'clean_ordo';

export interface CardThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  surfaceBg: string;
  borderColor: string;
  textColor: string;
  textSecondary: string;
  textMuted: string;
  badgeBg: string;
  badgeText: string;
  glowColor: string;
}

export interface CardThemeDefinition {
  id: CardThemeId;
  name: string;
  subtitle: string;
  kind: 'element' | 'category' | 'generic' | 'custom';
  colors: CardThemeColors;
  elementGlyph: string;
  patternType: BackgroundPatternType;
  motto: string;
  cornerStyle?: 'gothic' | 'tech' | 'runic' | 'clean';
  /**
   * URI ou asset base64 para imagem de fundo opcional.
   * Permite ao desenvolvedor facilmente plugar imagens personalizadas de cada elemento/tipo depois!
   */
  customBgImageUri?: string;
  overlayOpacity?: number;
}

export interface RecordCardStat {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface RecordCardExtraSection {
  title: string;
  content: string;
  accentColor?: string;
}

export interface RecordCardData {
  id: string;
  name: string;
  category: EntityCategory | string;
  categoryLabel: string;
  subCategory?: string;
  element?: string;
  bookTitle?: string;
  pageNumber?: number;
  stats: RecordCardStat[];
  summary?: string;
  description: string;
  extraSections?: RecordCardExtraSection[];
  tags?: string[];
  motto?: string;
}

export interface ExportCardOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'svg';
  quality?: number;
}
