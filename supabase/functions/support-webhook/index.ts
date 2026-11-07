/**
 * Supabase Edge Function: support-webhook
 *
 * Proxy seguro para recebimento de chamados do Ordo Companion e encaminhamento
 * ao Discord Webhook oficial sem nunca expor a URL do Webhook no cliente/APK.
 *
 * Como implantar no seu projeto Supabase:
 *   1. Defina o segredo do Webhook no Supabase (NUNCA vai para o código/APK):
 *      npx supabase secrets set DISCORD_SUPPORT_WEBHOOK_URL="https://discord.com/api/webhooks/SEU_ID/SEU_TOKEN"
 *   2. Faça o deploy da função:
 *      npx supabase functions deploy support-webhook --no-verify-jwt
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const SIGNATURE_SECRET = 'OrdoRealitas::Verissimo::Membrana::2026';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX_REQUESTS = 3; // Máximo de 3 chamados a cada 10 minutos por IP

const ipRequestHistory = new Map<string, number[]>();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-ordo-signature, x-ordo-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function computeExpectedSignature(protocol: string, timestampIso: string, title: string): string {
  const payload = `${protocol}|${timestampIso}|${(title || '').trim()}|${SIGNATURE_SECRET}`;
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

function sanitizeText(input: unknown, maxLen = 1500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/@(everyone|here)/gi, '＠$1')
    .replace(/<(@[!&]?|#)\d+>/g, '[menção removida]')
    .replace(/https?:\/\/(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9_-]+/gi, '[convite-bloqueado]')
    .replace(/https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/[^\s)]+/gi, '[webhook-oculto]')
    .trim()
    .slice(0, maxLen);
}

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const recent = (ipRequestHistory.get(clientIp) || []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestHistory.set(clientIp, recent);
    return true;
  }
  recent.push(now);
  ipRequestHistory.set(clientIp, recent);
  return false;
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown_ip';

    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({
          error: 'Limite de envios atingido. Aguarde alguns minutos antes de abrir um novo chamado.',
        }),
        {
          status: 429,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const body = await req.json();
      const protocol = sanitizeText(body?.protocol, 20);
      const title = sanitizeText(body?.title, 200);
      const description = sanitizeText(body?.description, 3500);
      const createdAt = sanitizeText(body?.createdAt, 40);

      if (!protocol || !/^ORD-[A-Z0-9]{4,12}$/.test(protocol) || (!title && !description)) {
        return new Response(JSON.stringify({ error: 'Payload de chamado inválido.' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Valida assinatura do aplicativo para rejeitar bots externos
      const signatureHeader = req.headers.get('x-ordo-signature') || '';
      const expectedSig = computeExpectedSignature(protocol, createdAt, body?.title || '');
      if (!signatureHeader || signatureHeader !== expectedSig) {
        return new Response(JSON.stringify({ error: 'Assinatura de cliente inválida.' }), {
          status: 403,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const discordWebhookUrl = Deno.env.get('DISCORD_SUPPORT_WEBHOOK_URL')?.trim();
      if (!discordWebhookUrl) {
        return new Response(
          JSON.stringify({ error: 'Webhook não configurado nos Secrets do servidor.' }),
          {
            status: 503,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          }
        );
      }

      const categoryMap: Record<string, { label: string; emoji: string; color: number }> = {
        bug: { label: 'Bug / Erro Técnico', emoji: '🐛', color: 0xef4444 },
        rule_error: { label: 'Erro de Regra / Compêndio', emoji: '📖', color: 0xf59e0b },
        suggestion: { label: 'Sugestão / Ideia', emoji: '💡', color: 0x3b82f6 },
        contact: { label: 'Dúvida / Falar com o Suporte', emoji: '💬', color: 0x10b981 },
      };

      const catInfo = categoryMap[body?.category] || categoryMap.bug;
      const fields: Array<{ name: string; value: string; inline?: boolean }> = [
        { name: '🔖 Protocolo', value: `\`#${protocol}\``, inline: true },
        { name: '📂 Categoria', value: `${catInfo.emoji} ${catInfo.label}`, inline: true },
      ];

      if (body?.severity) {
        fields.push({
          name: '⚠️ Severidade',
          value: sanitizeText(body.severity, 60),
          inline: true,
        });
      }
      if (body?.senderName) {
        fields.push({
          name: '👤 Jogador / Agente',
          value: sanitizeText(body.senderName, 120),
          inline: true,
        });
      }
      if (body?.contactReturn) {
        fields.push({
          name: '📬 Contato para Retorno',
          value: sanitizeText(body.contactReturn, 150),
          inline: true,
        });
      }
      if (body?.stepsToReproduce) {
        fields.push({
          name: '🔄 Passos para Reproduzir',
          value: sanitizeText(body.stepsToReproduce, 1000),
          inline: false,
        });
      }
      if (body?.includeDiagnostics && body?.diagnostics) {
        const d = body.diagnostics;
        fields.push({
          name: '🛠️ Diagnóstico Técnico',
          value: `**Versão:** v${sanitizeText(d.appVersion, 20)} | **OS:** ${sanitizeText(d.platform, 20).toUpperCase()} | **Tema:** ${sanitizeText(d.themeId, 30)}`,
          inline: false,
        });
      }

      const discordPayload = {
        username: 'Ordo Companion • Central de Suporte',
        allowed_mentions: { parse: [] }, // Bloqueia 100% menções @everyone, @here, cargos e usuários
        embeds: [
          {
            title: `${catInfo.emoji} [${protocol}] ${title}`,
            description: description || 'Sem descrição adicional.',
            color: catInfo.color,
            fields,
            timestamp: new Date().toISOString(),
            footer: {
              text: `Ordo Companion • Verificado via Proxy Seguro`,
            },
          },
        ],
      };

      const discordRes = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      if (!discordRes.ok && discordRes.status !== 204) {
        return new Response(JSON.stringify({ error: 'Falha ao encaminhar para o Discord.' }), {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, protocol }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Erro interno ao processar chamado.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  });
}
