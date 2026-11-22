/**
 * Supabase Edge Function: support-webhook
 *
 * Proxy seguro para recebimento de chamados do Ordo Companion e encaminhamento
 * ao Discord Webhook oficial sem nunca expor a URL do Webhook no cliente/APK.
 *
 * Como implantar no seu projeto Supabase:
 *   1. Defina os segredos dos Webhooks no Supabase (NUNCA vão para o código/APK):
 *      npx supabase secrets set DISCORD_SUPPORT_WEBHOOK_URL="https://discord.com/api/webhooks/SEU_ID_GERAL/SEU_TOKEN"
 *      npx supabase secrets set DISCORD_BUGS_WEBHOOK_URL="https://discord.com/api/webhooks/SEU_ID_ERROS/SEU_TOKEN"
 *      npx supabase secrets set DISCORD_SUGGESTIONS_WEBHOOK_URL="https://discord.com/api/webhooks/SEU_ID_MELHORIAS/SEU_TOKEN"
 *   2. Faça o deploy da função:
 *      npx supabase functions deploy support-webhook --no-verify-jwt
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

export type SupportRoutedChannel = 'errors' | 'improvements' | 'default';

const SIGNATURE_SECRET = 'OrdoRealitas::Verissimo::Membrana::2026';
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
export const RATE_LIMIT_MAX_REQUESTS = 5; // Máximo de 5 chamados a cada 10 minutos por IP

const ipRequestHistory = new Map<string, number[]>();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-ordo-signature, x-ordo-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function computeExpectedSignature(protocol: string, timestampIso: string, title: string): string {
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

export function sanitizeText(input: unknown, maxLen = 1500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/@(everyone|here)/gi, '＠$1')
    .replace(/<(@[!&]?|#)\d+>/g, '[menção removida]')
    .replace(/https?:\/\/(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/[A-Za-z0-9_-]+/gi, '[convite-bloqueado]')
    .replace(/https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/[^\s)]+/gi, '[webhook-oculto]')
    .trim()
    .slice(0, maxLen);
}

export function resetIpRateLimitHistory(): void {
  ipRequestHistory.clear();
}

function isRateLimited(clientIp: string, now = Date.now()): boolean {
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

export function resolveSupportWebhookTarget(
  category: unknown,
  env: {
    bugsWebhookUrl?: string;
    suggestionsWebhookUrl?: string;
    defaultWebhookUrl?: string;
  }
): { url: string; routedChannel: SupportRoutedChannel } {
  const isErrorCategory = category === 'bug' || category === 'rule_error';
  const isSuggestionCategory = category === 'suggestion';
  const bugsWebhookUrl = (env.bugsWebhookUrl || '').trim();
  const suggestionsWebhookUrl = (env.suggestionsWebhookUrl || '').trim();
  const defaultWebhookUrl = (env.defaultWebhookUrl || '').trim();

  if (isErrorCategory && bugsWebhookUrl) {
    return { url: bugsWebhookUrl, routedChannel: 'errors' };
  }
  if (isSuggestionCategory && suggestionsWebhookUrl) {
    return { url: suggestionsWebhookUrl, routedChannel: 'improvements' };
  }
  return { url: defaultWebhookUrl, routedChannel: 'default' };
}

export function buildDiscordSupportPayload(
  body: Record<string, any>,
  protocol: string,
  nowIso = new Date().toISOString()
): Record<string, any> {
  const isErrorCategory = body?.category === 'bug' || body?.category === 'rule_error';
  const isSuggestionCategory = body?.category === 'suggestion';
  const title = sanitizeText(body?.title, 200) || 'Relato via Ordo Companion';
  const description = sanitizeText(body?.description, 3500) || 'Sem descrição adicional.';

  const categoryMap: Record<string, { label: string; emoji: string; color: number }> = {
    bug: { label: 'Bug / Erro Técnico', emoji: '🐛', color: 0xef4444 },
    rule_error: { label: 'Erro de Regra / Compêndio', emoji: '📖', color: 0xf59e0b },
    suggestion: { label: 'Sugestão / Ideia', emoji: '💡', color: 0x3b82f6 },
    contact: { label: 'Dúvida / Falar com o Suporte', emoji: '💬', color: 0x10b981 },
  };

  const catInfo = categoryMap[String(body?.category || '')] || categoryMap.bug;
  const triageQueueLabel = isErrorCategory
    ? '🐛 ERROS'
    : isSuggestionCategory
    ? '💡 MELHORIAS'
    : '💬 DÚVIDA / CONTATO';

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: '🔖 Protocolo', value: `\`#${protocol}\``, inline: true },
    { name: '📂 Categoria', value: `${catInfo.emoji} ${catInfo.label}`, inline: true },
    { name: '🗂️ Fila de Triagem', value: triageQueueLabel, inline: true },
  ];

  const severityText = sanitizeText(body?.severity, 60);
  if (severityText && isErrorCategory) {
    fields.push({
      name: '⚠️ Severidade',
      value: severityText,
      inline: true,
    });
  }

  const senderText = sanitizeText(body?.senderName, 120);
  if (senderText) {
    fields.push({
      name: '👤 Jogador / Agente',
      value: senderText,
      inline: true,
    });
  }

  const contactText = sanitizeText(body?.contactReturn, 150);
  if (contactText) {
    fields.push({
      name: '📬 Contato para Retorno',
      value: contactText,
      inline: true,
    });
  }

  const stepsText = sanitizeText(body?.stepsToReproduce, 1000);
  if (stepsText) {
    fields.push({
      name: '🔄 Passos para Reproduzir',
      value: stepsText,
      inline: false,
    });
  }

  if (body?.includeDiagnostics && body?.diagnostics && typeof body.diagnostics === 'object') {
    const d = body.diagnostics;
    const appVersion = sanitizeText(d.appVersion, 20) || '1.0.0';
    const platform = (sanitizeText(d.platform, 20) || 'UNKNOWN').toUpperCase();
    const themeId = sanitizeText(d.themeId, 30) || 'ordem_padrao';
    fields.push({
      name: '🛠️ Diagnóstico Técnico',
      value: `**Versão:** v${appVersion} | **OS:** ${platform} | **Tema:** ${themeId}`,
      inline: false,
    });
  }

  return {
    username: 'Ordo Companion • Central de Suporte',
    allowed_mentions: { parse: [] }, // Bloqueia 100% menções @everyone, @here, cargos e usuários
    embeds: [
      {
        title: `${catInfo.emoji} [${protocol}] ${title}`,
        description,
        color: catInfo.color,
        fields,
        timestamp: nowIso,
        footer: {
          text: 'Ordo Companion • Verificado via Proxy Seguro',
        },
      },
    ],
  };
}

export async function handleSupportWebhookRequest(
  req: Request,
  deps?: {
    getEnv?: (key: string) => string | undefined;
    fetchImpl?: typeof fetch;
    now?: () => number;
  }
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

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

    // Valida assinatura do aplicativo antes de contabilizar rate limit por IP
    const signatureHeader = req.headers.get('x-ordo-signature') || '';
    const expectedSig = computeExpectedSignature(
      protocol,
      createdAt,
      typeof body?.title === 'string' ? body.title : ''
    );
    if (!signatureHeader || signatureHeader !== expectedSig) {
      return new Response(JSON.stringify({ error: 'Assinatura de cliente inválida.' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown_ip';

    if (isRateLimited(clientIp, deps?.now ? deps.now() : Date.now())) {
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

    const getEnv =
      deps?.getEnv ||
      ((key: string) =>
        typeof Deno !== 'undefined' && Deno.env && typeof Deno.env.get === 'function'
          ? Deno.env.get(key)
          : undefined);

    const { url: discordWebhookUrl, routedChannel } = resolveSupportWebhookTarget(body?.category, {
      bugsWebhookUrl: getEnv('DISCORD_BUGS_WEBHOOK_URL'),
      suggestionsWebhookUrl: getEnv('DISCORD_SUGGESTIONS_WEBHOOK_URL'),
      defaultWebhookUrl: getEnv('DISCORD_SUPPORT_WEBHOOK_URL'),
    });

    if (!discordWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Webhook não configurado nos Secrets do servidor.' }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const discordPayload = buildDiscordSupportPayload(body, protocol);
    const fetchFn = deps?.fetchImpl || fetch;

    const discordRes = await fetchFn(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!discordRes.ok && discordRes.status !== 204) {
      return new Response(
        JSON.stringify({
          error: 'Falha ao encaminhar para o Discord.',
          discordStatus: discordRes.status,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true, protocol, routedChannel }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Erro interno ao processar chamado.' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve((req: Request) => handleSupportWebhookRequest(req));
}
