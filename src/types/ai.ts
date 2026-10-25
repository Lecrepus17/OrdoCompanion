export type AiProvider = 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'offline';

export type ParanormalRelic =
  | 'none'          // Padrão G.L.I.T.C.H. (Ordo Realitas)
  | 'anfitriao'     // Energia ⚡
  | 'magistrada'    // Conhecimento 👁️
  | 'deus_da_morte' // Morte ⏳
  | 'diabo'         // Sangue 🩸
  | 'random';       // Aleatório 🎲

export type ConcreteRelicPersona = 'none' | 'anfitriao' | 'magistrada' | 'deus_da_morte' | 'diabo';

export interface RelicPersonaMetadata {
  id: ParanormalRelic;
  name: string;
  element: string;
  relicName: string;
  emoji: string;
  color: string;
  accentBg: string;
  roleTag: string;
  tagline: string;
  description: string;
}

export const RELIC_PERSONAS: Record<ParanormalRelic, RelicPersonaMetadata> = {
  none: {
    id: 'none',
    name: 'G.L.I.T.C.H.',
    element: 'Ordo Realitas',
    relicName: 'IA Tática Oficial',
    emoji: '🔮',
    color: '#6366F1',
    accentBg: 'rgba(99, 102, 241, 0.12)',
    roleTag: 'IA TÁTICA DA ORDO',
    tagline: 'Guia Lógico de Interferências Transcendentais',
    description: 'Tom analítico, militar e objetivo da Ordo Realitas. Respostas didáticas e táticas.',
  },
  anfitriao: {
    id: 'anfitriao',
    name: 'O Anfitrião',
    element: 'Energia',
    relicName: 'Relíquia de Energia',
    emoji: '⚡',
    color: '#A855F7',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    roleTag: 'RELÍQUIA DE ENERGIA',
    tagline: 'Showman do Caos e do Espetáculo',
    description: 'Bombástico, elétrico, sarcástico e debochado. Apresenta o RPG como um game-show caótico.',
  },
  magistrada: {
    id: 'magistrada',
    name: 'A Magistrada',
    element: 'Conhecimento',
    relicName: 'Máscara do Desespero',
    emoji: '👁️',
    color: '#EAB308',
    accentBg: 'rgba(234, 179, 8, 0.15)',
    roleTag: 'MÁSCARA DO DESESPERO',
    tagline: 'Tribunal Implacável do Equilíbrio',
    description: 'Fria, solene, simétrica e impassível. Trata cada regra como um mandamento do Equilíbrio Cósmico.',
  },
  deus_da_morte: {
    id: 'deus_da_morte',
    name: 'O Deus da Morte',
    element: 'Morte',
    relicName: 'Coração de Lodo',
    emoji: '⏳',
    color: '#94A3B8',
    accentBg: 'rgba(148, 163, 184, 0.15)',
    roleTag: 'CORAÇÃO DE LODO',
    tagline: 'A Espiral Inescapável do Tempo',
    description: 'Lento, melancólico, paciente e poético. Conta cada segundo com precisão cronométrica e inevitável.',
  },
  diabo: {
    id: 'diabo',
    name: 'O Diabo',
    element: 'Sangue',
    relicName: 'Trono de Sangue',
    emoji: '🩸',
    color: '#DC2626',
    accentBg: 'rgba(220, 38, 38, 0.15)',
    roleTag: 'TRONO DE SANGUE',
    tagline: 'Fúria Visceral e Carnificina',
    description: 'Agressivo, voraz, sedutor e fervoroso. Exige intensidade, celebra a dor e preza pelo combate letal.',
  },
  random: {
    id: 'random',
    name: 'Aleatório',
    element: 'Outro Lado',
    relicName: 'Caos das Relíquias',
    emoji: '🎲',
    color: '#06B6D4',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    roleTag: 'SORTEIO DE RELÍQUIA',
    tagline: 'Uma Relíquia Diferente a Cada Resposta',
    description: 'Sorteia imprevisivelmente qual das 4 Relíquias (Anfitrião, Magistrada, Deus da Morte ou Diabo) responderá a pergunta.',
  },
};

export interface AiCitation {
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  snippet?: string;
  section?: string;
}

export interface AiSuggestedAction {
  type: 'open_book' | 'open_entity' | 'roll_dice' | 'navigate_tab';
  label: string;
  payload: {
    bookId?: string;
    pageNumber?: number;
    entityId?: string;
    formula?: string;
    tabName?: string;
  };
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: AiCitation[];
  suggestedActions?: AiSuggestedAction[];
  isError?: boolean;
  relicPersona?: ConcreteRelicPersona;
}

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint?: string;
  temperature: number;
  offlineFallback: boolean;
  /** Personalidade paranormal de Relíquia selecionada para responder */
  relicPersona: ParanormalRelic;
  /** Legado mantido para retrocompatibilidade */
  anfitriaoMode?: boolean;
  /** Instrução personalizada adicional definida livremente pelo usuário */
  customInstructions?: string;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-flash-lite-latest',
  temperature: 0.4,
  offlineFallback: true,
  relicPersona: 'none',
  anfitriaoMode: false,
  customInstructions: '',
};

export const AI_STORAGE_KEYS = {
  CONFIG: '@ordem_paranormal:ai_config_v1',
  CHAT_HISTORY: '@ordem_paranormal:ai_chat_history_v1',
};
