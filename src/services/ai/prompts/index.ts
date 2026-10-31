import { ConcreteRelicPersona } from '../../../types/ai';
import {
  ANFITRIAO_PROMPT,
  MAGISTRADA_PROMPT,
  DEUS_DA_MORTE_PROMPT,
  DIABO_PROMPT,
} from './relicPrompts';
import {
  VERISSIMO_PROMPT,
  CERVERO_PROMPT,
  KIAN_PROMPT,
} from './canonPrompts';
import {
  GLITCH_PROMPT,
  CO_MESTRE_PROMPT,
  BUILD_ADVISOR_PROMPT,
  ARBITRO_REGRAS_PROMPT,
} from './specialistPrompts';

export * from './relicPrompts';
export * from './canonPrompts';
export * from './specialistPrompts';

/**
 * Retorna as instruções de sistema canônicas e temáticas de cada Persona / Agente Especialista.
 */
export function buildPersonaSystemPrompt(persona: ConcreteRelicPersona): string {
  switch (persona) {
    // Especialistas & Suporte
    case 'arbitro_regras':
      return ARBITRO_REGRAS_PROMPT;
    case 'co_mestre':
      return CO_MESTRE_PROMPT;
    case 'build_advisor':
      return BUILD_ADVISOR_PROMPT;

    // Personas Canônicas
    case 'verissimo':
      return VERISSIMO_PROMPT;
    case 'cervero':
      return CERVERO_PROMPT;
    case 'kian':
      return KIAN_PROMPT;

    // Relíquias do Outro Lado
    case 'anfitriao':
      return ANFITRIAO_PROMPT;
    case 'magistrada':
      return MAGISTRADA_PROMPT;
    case 'deus_da_morte':
      return DEUS_DA_MORTE_PROMPT;
    case 'diabo':
      return DIABO_PROMPT;

    // Padrão G.L.I.T.C.H.
    case 'none':
    default:
      return GLITCH_PROMPT;
  }
}

/**
 * Legado mantido para compatibilidade retroativa
 */
export const buildRelicSystemPrompt = buildPersonaSystemPrompt;
