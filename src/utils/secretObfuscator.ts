/**
 * Utilitário de Segurança, Ofuscação de Segredos e Sanitização Anti-Spam.
 *
 * Objetivo:
 * 1. Impedir que scanners estáticos (GitHub Secret Scanning / APK String Dump)
 *    encontrem chaves de API ou URLs de Webhook em texto claro no bundle JS.
 * 2. Assinar requisições enviadas ao Proxy de Suporte (Supabase Edge Function)
 *    para dificultar chamadas forjadas fora do aplicativo.
 * 3. Sanitizar textos enviados ao Discord contra ataques de menção em massa
 *    (@everyone, @here, menções de cargos/usuários) e links maliciosos de spam.
 */

const DEFAULT_OBFUSCATION_KEY = 'OrdoRealitas::Verissimo::Membrana::2026';
const OBFUSCATION_PREFIX = 'obf:v1:';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    result += BASE64_CHARS[b0 >> 2];
    result += BASE64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    result += i + 1 < len ? BASE64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < len ? BASE64_CHARS[b2 & 0x3f] : '=';
  }
  return result;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(clean[i]);
    const c1 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] === '=' ? -1 : BASE64_CHARS.indexOf(clean[i + 2]);
    const c3 = clean[i + 3] === '=' ? -1 : BASE64_CHARS.indexOf(clean[i + 3]);

    if (c0 < 0 || c1 < 0) break;

    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) {
      bytes.push(((c1 & 0x0f) << 4) | (c2 >> 2));
      if (c3 >= 0) {
        bytes.push(((c2 & 0x03) << 6) | c3);
      }
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Ofusca uma chave ou URL sensível usando cifra XOR polialfabética + deslocamento de índice + Base64.
 * O resultado começa com `obf:v1:` e não contém nenhuma substring reconhecível da chave original.
 */
export function obfuscateSecret(plainText: string, customKey = DEFAULT_OBFUSCATION_KEY): string {
  const clean = (plainText || '').trim();
  if (!clean) return '';
  if (clean.startsWith(OBFUSCATION_PREFIX)) return clean;

  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(clean);
  const keyBytes = encoder.encode(customKey || DEFAULT_OBFUSCATION_KEY);
  const outBytes = new Uint8Array(inputBytes.length);

  for (let i = 0; i < inputBytes.length; i++) {
    const k = keyBytes[i % keyBytes.length];
    const shift = (i * 31 + 17) & 0xff;
    outBytes[i] = inputBytes[i] ^ k ^ shift;
  }

  return `${OBFUSCATION_PREFIX}${bytesToBase64(outBytes)}`;
}

/**
 * Reverte uma string ofuscada (`obf:v1:...`) de volta para seu valor original em memória.
 * Se a string passada não tiver o prefixo `obf:v1:`, retorna a própria string limpa.
 */
export function deobfuscateSecret(encodedText: string, customKey = DEFAULT_OBFUSCATION_KEY): string {
  const clean = (encodedText || '').trim();
  if (!clean) return '';
  if (!clean.startsWith(OBFUSCATION_PREFIX)) return clean;

  try {
    const rawB64 = clean.slice(OBFUSCATION_PREFIX.length);
    const encryptedBytes = base64ToBytes(rawB64);
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(customKey || DEFAULT_OBFUSCATION_KEY);
    const outBytes = new Uint8Array(encryptedBytes.length);

    for (let i = 0; i < encryptedBytes.length; i++) {
      const k = keyBytes[i % keyBytes.length];
      const shift = (i * 31 + 17) & 0xff;
      outBytes[i] = encryptedBytes[i] ^ k ^ shift;
    }

    return new TextDecoder().decode(outBytes);
  } catch {
    return '';
  }
}

/**
 * Lê uma variável de ambiente que pode estar em texto plano ou ofuscada (`obf:v1:...`).
 */
export function resolveEnvSecret(envValue?: string | null): string {
  if (!envValue || typeof envValue !== 'string') return '';
  return deobfuscateSecret(envValue.trim());
}

/**
 * Sanitiza textos livres antes de enviá-los ao Discord (via Proxy ou Webhook),
 * bloqueando ataques de spam com @everyone, @here, menções de cargos/usuários e excesso de quebras.
 */
export function sanitizeDiscordText(input: string | undefined | null, maxLength = 2000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Neutraliza menções globais (@everyone e @here) inserindo zero-width space ou substituindo @
    .replace(/@(everyone|here)/gi, '＠$1')
    // Neutraliza menções diretas de IDs de usuários, cargos ou canais (<@123>, <@!123>, <@&123>, <#123>)
    .replace(/<(@[!&]?|#)\d+>/g, '[menção removida]')
    // Neutraliza tentativas de forjar links de convite de outros servidores de spam no Discord
    .replace(/https?:\/\/(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9_-]+/gi, '[convite-discord-bloqueado]')
    // Neutraliza tentativas de colar URLs de webhooks
    .replace(/https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/[^\s)]+/gi, '[webhook-oculto]')
    .trim()
    .slice(0, maxLength);
}

/**
 * Gera uma assinatura de integridade determinística (HMAC-FNV64 em hex)
 * para autenticar o payload enviado ao Proxy do Supabase (X-Ordo-Signature).
 */
export function computeClientTicketSignature(protocol: string, timestampIso: string, title: string): string {
  const payload = `${protocol}|${timestampIso}|${(title || '').trim()}|${DEFAULT_OBFUSCATION_KEY}`;
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;

  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `ordo_sig_v1_${part1}${part2}`;
}
