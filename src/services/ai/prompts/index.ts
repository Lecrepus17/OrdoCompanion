import { ConcreteRelicPersona } from '../../../types/ai';
import {
  ANFITRIAO_PROMPT,
  ANFITRIAO_ROLEPLAY_PROMPT,
  MAGISTRADA_PROMPT,
  MAGISTRADA_ROLEPLAY_PROMPT,
  DEUS_DA_MORTE_PROMPT,
  DEUS_DA_MORTE_ROLEPLAY_PROMPT,
  DIABO_PROMPT,
  DIABO_ROLEPLAY_PROMPT,
} from './relicPrompts';
import {
  VERISSIMO_PROMPT,
  VERISSIMO_ROLEPLAY_PROMPT,
  CERVERO_PROMPT,
  CERVERO_ROLEPLAY_PROMPT,
  KIAN_PROMPT,
  KIAN_ROLEPLAY_PROMPT,
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

export interface BuildPersonaPromptOptions {
  /** Quando true, ativa o Modo Roleplay Livre para Personas Canônicas e Relíquias. */
  roleplayMode?: boolean;
}

/**
 * Retorna as instruções de sistema canônicas e temáticas de cada Persona / Agente Especialista.
 */
export function buildPersonaSystemPrompt(
  persona: ConcreteRelicPersona,
  options?: BuildPersonaPromptOptions
): string {
  const isRoleplay = Boolean(options?.roleplayMode);

  switch (persona) {
    // Especialistas & Suporte (sempre fiéis às regras)
    case 'arbitro_regras':
      return ARBITRO_REGRAS_PROMPT;
    case 'co_mestre':
      return CO_MESTRE_PROMPT;
    case 'build_advisor':
      return BUILD_ADVISOR_PROMPT;

    // Personas Canônicas
    case 'verissimo':
      return isRoleplay ? VERISSIMO_ROLEPLAY_PROMPT : VERISSIMO_PROMPT;
    case 'cervero':
      return isRoleplay ? CERVERO_ROLEPLAY_PROMPT : CERVERO_PROMPT;
    case 'kian':
      return isRoleplay ? KIAN_ROLEPLAY_PROMPT : KIAN_PROMPT;

    // Relíquias do Outro Lado
    case 'anfitriao':
      return isRoleplay ? ANFITRIAO_ROLEPLAY_PROMPT : ANFITRIAO_PROMPT;
    case 'magistrada':
      return isRoleplay ? MAGISTRADA_ROLEPLAY_PROMPT : MAGISTRADA_PROMPT;
    case 'deus_da_morte':
      return isRoleplay ? DEUS_DA_MORTE_ROLEPLAY_PROMPT : DEUS_DA_MORTE_PROMPT;
    case 'diabo':
      return isRoleplay ? DIABO_ROLEPLAY_PROMPT : DIABO_PROMPT;

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
