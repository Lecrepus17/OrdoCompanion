import { CharacterSheet } from '../types/compendium';

export const SHARE_CODE_PREFIX = 'ORDO-AG-v1:';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_REV: number[] = new Array(256).fill(-1);
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_REV[BASE64_CHARS.charCodeAt(i)] = i;
}

/**
 * Converte string JavaScript (UTF-16) em sequência de bytes UTF-8 (compatível com Hermes/Android)
 */
function stringToUtf8ByteArray(str: string): number[] {
  const bytes: number[] = [];
  const len = str.length;
  for (let i = 0; i < len; i++) {
    let cp = str.charCodeAt(i);

    // Tratamento de pares substitutos (surrogate pairs para emojis e caracteres astronômicos)
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < len) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = ((cp - 0xd800) << 10) + (next - 0xdc00) + 0x10000;
        i++;
      }
    }

    if (cp < 0x80) {
      bytes.push(cp);
    } else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    }
  }
  return bytes;
}

/**
 * Converte sequência de bytes UTF-8 em string JavaScript (compatível com Hermes/Android)
 */
function utf8ByteArrayToString(bytes: number[]): string {
  let result = '';
  const len = bytes.length;
  let i = 0;

  while (i < len) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      result += String.fromCharCode(b1);
    } else if ((b1 & 0xe0) === 0xc0) {
      if (i >= len) throw new Error('Sequência UTF-8 truncada');
      const b2 = bytes[i++];
      if ((b2 & 0xc0) !== 0x80) throw new Error('Byte de continuação UTF-8 inválido');
      const cp = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
      result += String.fromCharCode(cp);
    } else if ((b1 & 0xf0) === 0xe0) {
      if (i + 1 >= len) throw new Error('Sequência UTF-8 truncada');
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      if ((b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80) {
        throw new Error('Byte de continuação UTF-8 inválido');
      }
      const cp = ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      result += String.fromCharCode(cp);
    } else if ((b1 & 0xf8) === 0xf0) {
      if (i + 2 >= len) throw new Error('Sequência UTF-8 truncada');
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      if ((b2 & 0xc0) !== 0x80 || (b3 & 0xc0) !== 0x80 || (b4 & 0xc0) !== 0x80) {
        throw new Error('Byte de continuação UTF-8 inválido');
      }
      const cp =
        ((b1 & 0x07) << 18) |
        ((b2 & 0x3f) << 12) |
        ((b3 & 0x3f) << 6) |
        (b4 & 0x3f);
      if (cp <= 0xffff) {
        result += String.fromCharCode(cp);
      } else if (cp <= 0x10ffff) {
        const u = cp - 0x10000;
        result += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff));
      } else {
        throw new Error('Code point Unicode fora dos limites em UTF-8');
      }
    } else {
      throw new Error('Byte inicial UTF-8 inválido');
    }
  }

  return result;
}

/**
 * Converte array de bytes para string Base64 padrão RFC 4648
 */
function bytesToBase64(bytes: number[]): string {
  let result = '';
  const len = bytes.length;
  let i = 0;

  for (; i + 2 < len; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result +=
      BASE64_CHARS[b0 >> 2] +
      BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)] +
      BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] +
      BASE64_CHARS[b2 & 0x3f];
  }

  const rem = len - i;
  if (rem === 1) {
    const b0 = bytes[i];
    result +=
      BASE64_CHARS[b0 >> 2] +
      BASE64_CHARS[(b0 & 0x03) << 4] +
      '==';
  } else if (rem === 2) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    result +=
      BASE64_CHARS[b0 >> 2] +
      BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)] +
      BASE64_CHARS[(b1 & 0x0f) << 2] +
      '=';
  }

  return result;
}

/**
 * Converte string Base64 para array de bytes com tolerância a espaços e padding ausente
 */
function base64ToBytes(b64: string): number[] {
  let clean = b64.replace(/[\r\n\t ]/g, '');
  const mod = clean.length % 4;
  if (mod === 1) throw new Error('Comprimento de Base64 inválido');
  if (mod === 2) clean += '==';
  else if (mod === 3) clean += '=';

  const len = clean.length;
  const bytes: number[] = [];
  for (let i = 0; i < len; i += 4) {
    const c0 = clean.charCodeAt(i);
    const c1 = clean.charCodeAt(i + 1);
    const c2 = clean.charCodeAt(i + 2);
    const c3 = clean.charCodeAt(i + 3);

    const v0 = c0 < 256 ? BASE64_REV[c0] : -1;
    const v1 = c1 < 256 ? BASE64_REV[c1] : -1;
    if (v0 < 0 || v1 < 0) throw new Error('Caractere Base64 inválido');

    bytes.push((v0 << 2) | (v1 >> 4));

    if (c2 === 61) {
      if (c3 !== 61) throw new Error('Padding Base64 malformado');
      break;
    }
    const v2 = c2 < 256 ? BASE64_REV[c2] : -1;
    if (v2 < 0) throw new Error('Caractere Base64 inválido');
    bytes.push(((v1 & 0x0f) << 4) | (v2 >> 2));

    if (c3 === 61) break;
    const v3 = c3 < 256 ? BASE64_REV[c3] : -1;
    if (v3 < 0) throw new Error('Caractere Base64 inválido');
    bytes.push(((v2 & 0x03) << 6) | v3);
  }

  return bytes;
}

/**
 * Converte string UTF-8 para Base64 100% puro em TypeScript/JavaScript,
 * sem dependência de Buffer (Node.js) ou btoa (browser DOM), garantindo
 * compatibilidade total com o runtime Hermes no Android APK.
 */
export function utf8ToBase64(str: string): string {
  return bytesToBase64(stringToUtf8ByteArray(str));
}

/**
 * Converte Base64 para string UTF-8 100% puro em TypeScript/JavaScript,
 * sem dependência de Buffer (Node.js) ou atob (browser DOM), garantindo
 * compatibilidade total com o runtime Hermes no Android APK.
 */
export function base64ToUtf8(str: string): string {
  return utf8ByteArrayToString(base64ToBytes(str));
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
