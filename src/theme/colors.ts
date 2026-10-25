import { darkTheme, ElementColors, ThemeColors } from './themes';

/**
 * Objeto COLORS mutável compatível com chamadas existentes.
 * Atualizado automaticamente pelo ThemeProvider quando o tema muda.
 */
export const COLORS: ThemeColors = JSON.parse(JSON.stringify(darkTheme.colors));

/**
 * Retorna as cores e ícone do elemento paranormal correspondente.
 * Pode receber `themeColors` opcionais para garantir contraste perfeito no tema atual.
 */
export function getElementStyle(element?: string, themeColors?: ThemeColors): ElementColors {
  const elements = themeColors?.elements || COLORS.elements;
  if (!element) return elements.Nenhum;
  if (element.includes('Sangue') && element.includes('Conhecimento')) return elements.Variável;
  if (element.startsWith('Variável')) return elements.Variável;
  if (element.includes('Sangue')) return elements.Sangue;
  if (element.includes('Morte')) return elements.Morte;
  if (element.includes('Conhecimento')) return elements.Conhecimento;
  if (element.includes('Energia')) return elements.Energia;
  if (element.includes('Medo')) return elements.Medo;
  return elements.Nenhum;
}

export const CATEGORY_LABELS: Record<
  string,
  { label: string; singular: string; icon: string; color: string }
> = {
  all: { label: 'Todos', singular: 'Item', icon: 'apps', color: '#9CA3AF' },
  ritual: { label: 'Rituais', singular: 'Ritual', icon: 'flame', color: '#A855F7' },
  power: { label: 'Poderes', singular: 'Poder', icon: 'flash', color: '#F59E0B' },
  origin: { label: 'Origens', singular: 'Origem', icon: 'person', color: '#0284C7' },
  class: { label: 'Classes', singular: 'Classe', icon: 'shield', color: '#10B981' },
  track: { label: 'Trilhas', singular: 'Trilha', icon: 'git-branch', color: '#06B6D4' },
  weapon: { label: 'Armas', singular: 'Arma', icon: 'locate', color: '#EF4444' },
  item: { label: 'Itens & Maldições', singular: 'Item', icon: 'briefcase', color: '#EC4899' },
  creature: { label: 'Ameaças & NPCs', singular: 'Ameaça', icon: 'skull', color: '#E11D48' },
  skill: { label: 'Perícias', singular: 'Perícia', icon: 'extension-puzzle', color: '#8B5CF6' },
  condition: { label: 'Condições', singular: 'Condição', icon: 'warning', color: '#F97316' },
  rule: { label: 'Regras & Dossiês', singular: 'Regra / Dossiê', icon: 'book', color: '#64748B' },
};

export * from './themes';
