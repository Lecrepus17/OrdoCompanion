import { CharacterSheet } from '../types/compendium';

export const SHARE_CODE_PREFIX = 'ORDO-AG-v1:';

/**
 * Converte string UTF-8 para Base64 compatível com Web e Mobile
 */
export function utf8ToBase64(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
  } catch {}

  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Converte Base64 para string UTF-8 compatível com Web e Mobile
 */
export function base64ToUtf8(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    }
  } catch {}

  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

/**
 * Compacta a ficha do agente gerando um código de compartilhamento universal
 */
export function encodeAgentShareCode(sheet: CharacterSheet): string {
  const jsonStr = JSON.stringify(sheet);
  const base64Str = utf8ToBase64(jsonStr);
  return `${SHARE_CODE_PREFIX}${base64Str}`;
}

/**
 * Valida se um objeto possui a estrutura mínima essencial de uma ficha de agente
 */
export function isValidCharacterSheet(obj: any): obj is CharacterSheet {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.name !== 'string' || obj.name.trim().length === 0) return false;
  if (!obj.attributes || typeof obj.attributes !== 'object') return false;

  const attrs = obj.attributes;
  const hasAttributes =
    typeof attrs.AGI === 'number' &&
    typeof attrs.FOR === 'number' &&
    typeof attrs.INT === 'number' &&
    typeof attrs.PRE === 'number' &&
    typeof attrs.VIG === 'number';

  if (!hasAttributes) return false;
  return typeof obj.pvMax === 'number' && typeof obj.peMax === 'number' && typeof obj.sanMax === 'number';
}

/**
 * Decodifica um código de compartilhamento ou JSON cru de volta para CharacterSheet
 */
export function parseAgentShareCode(rawInput: string): CharacterSheet | null {
  if (!rawInput || typeof rawInput !== 'string') return null;

  let cleaned = rawInput.trim();

  // Caso o usuário tenha colado o JSON direto em vez do código base64
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (isValidCharacterSheet(parsed)) {
        return parsed;
      }
    } catch {}
  }

  // Remove prefixos conhecidos
  if (cleaned.startsWith(SHARE_CODE_PREFIX)) {
    cleaned = cleaned.slice(SHARE_CODE_PREFIX.length).trim();
  } else if (cleaned.startsWith('ORDO-AG:')) {
    cleaned = cleaned.slice('ORDO-AG:'.length).trim();
  }

  try {
    const jsonStr = base64ToUtf8(cleaned);
    const parsed = JSON.parse(jsonStr);

    if (isValidCharacterSheet(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Gera um resumo em texto rápido do agente ideal para copiar em redes/mensagens
 */
export function formatAgentSummary(sheet: CharacterSheet): string {
  const playerName = sheet.player ? ` (Jogador: ${sheet.player})` : '';
  return `🕵️ ${sheet.name}${playerName} | NEX ${sheet.nex}% • ${sheet.rank} | PV ${sheet.pvCurrent}/${sheet.pvMax} • SAN ${sheet.sanCurrent}/${sheet.sanMax} • PE ${sheet.peCurrent}/${sheet.peMax}`;
}
