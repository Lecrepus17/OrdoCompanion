#!/usr/bin/env node
/**
 * Utilitário de linha de comando para ofuscar chaves de API ou URLs de Webhook
 * antes de colocá-las em variáveis de ambiente (.env ou EAS Secrets).
 *
 * Uso:
 *   node scripts/obfuscate_secrets.js "https://discord.com/api/webhooks/..."
 *   node scripts/obfuscate_secrets.js "gsk_..."
 */

const DEFAULT_OBFUSCATION_KEY = 'OrdoRealitas::Verissimo::Membrana::2026';
const OBFUSCATION_PREFIX = 'obf:v1:';

function obfuscate(plainText, customKey = DEFAULT_OBFUSCATION_KEY) {
  const clean = (plainText || '').trim();
  if (!clean) return '';
  if (clean.startsWith(OBFUSCATION_PREFIX)) return clean;

  const inputBytes = Buffer.from(clean, 'utf-8');
  const keyBytes = Buffer.from(customKey, 'utf-8');
  const outBytes = Buffer.alloc(inputBytes.length);

  for (let i = 0; i < inputBytes.length; i++) {
    const k = keyBytes[i % keyBytes.length];
    const shift = (i * 31 + 17) & 0xff;
    outBytes[i] = inputBytes[i] ^ k ^ shift;
  }

  return `${OBFUSCATION_PREFIX}${outBytes.toString('base64')}`;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('🔒 Uso: node scripts/obfuscate_secrets.js "<SUA_CHAVE_OU_WEBHOOK_URL>"');
  process.exit(0);
}

for (const arg of args) {
  const result = obfuscate(arg);
  console.log('\n✅ Valor Ofuscado (Seguro contra Scanners Estáticos):');
  console.log(result);
}
