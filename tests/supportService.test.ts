import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import {
  SUPPORT_CUSTOM_WEBHOOK_KEY,
  SupportService,
} from '../src/services/support/SupportService';
import { SupportCategory, SupportTicketPayload } from '../src/services/support/types';
import {
  computeClientTicketSignature,
  deobfuscateSecret,
  obfuscateSecret,
  resolveEnvSecret,
  sanitizeDiscordText,
} from '../src/utils/secretObfuscator';
import {
  RATE_LIMIT_MAX_REQUESTS,
  buildDiscordSupportPayload,
  handleSupportWebhookRequest,
  resetIpRateLimitHistory,
  resolveSupportWebhookTarget,
} from '../supabase/functions/support-webhook/index';

test('Central de Suporte & Relato de Erros (SupportService.ts)', async (t) => {
  await t.test('generateProtocol e collectDiagnostics geram dados consistentes', () => {
    const service = new SupportService();
    const protocol = service.generateProtocol();
    assert.ok(protocol.startsWith('ORD-'), `Protocolo deve começar com ORD-: ${protocol}`);
    assert.ok(protocol.length >= 8);

    const diag = service.collectDiagnostics({
      themeId: 'sangue',
      playerName: 'Arthur Cervero',
      charactersCount: 4,
      campaignsCount: 2,
      customWeaponsCount: 5,
      cloudSyncEnabled: true,
      activeRoute: '/(tabs)/support',
    });

    assert.equal(diag.themeId, 'sangue');
    assert.equal(diag.playerName, 'Arthur Cervero');
    assert.equal(diag.charactersCount, 4);
    assert.equal(diag.campaignsCount, 2);
    assert.equal(diag.customWeaponsCount, 5);
    assert.equal(diag.cloudSyncEnabled, true);
    assert.equal(diag.activeRoute, '/(tabs)/support');
    assert.ok(diag.timestamp.length > 0);
  });

  await t.test('buildFormattedReport gera relatório completo em Markdown com diagnóstico', () => {
    const service = new SupportService();
    const diag = service.collectDiagnostics({
      themeId: 'morte',
      playerName: 'Dante',
      charactersCount: 2,
      campaignsCount: 1,
      customWeaponsCount: 1,
      cloudSyncEnabled: false,
    });

    const payload: SupportTicketPayload = {
      category: 'bug',
      severity: 'high',
      title: 'Erro ao calcular DT de ritual no NEX 65%',
      description: 'O valor da DT não somou o bônus de Presença.',
      stepsToReproduce: '1. Abrir ficha\n2. Mudar Presença para 4',
      senderName: 'Dante',
      contactReturn: 'dante#1234',
      includeDiagnostics: true,
      diagnostics: diag,
    };

    const report = service.buildFormattedReport(payload, 'ORD-9999AB');
    assert.ok(report.includes('#ORD-9999AB'));
    assert.ok(report.includes('Erro ao calcular DT de ritual no NEX 65%'));
    assert.ok(report.includes('O valor da DT não somou o bônus de Presença.'));
    assert.ok(report.includes('1. Abrir ficha'));
    assert.ok(report.includes('dante#1234'));
    assert.ok(report.includes('Diagnóstico Técnico do Sistema'));
    assert.ok(report.includes('morte'));
  });

  await t.test('buildGitHubIssueUrl e buildMailtoUrl geram links pré-preenchidos válidos', () => {
    const service = new SupportService({
      githubIssuesUrl: 'https://github.com/Lecrepus17/OrdoCompanion/issues',
      supportEmail: 'dev@ordocompanion.com',
    });

    const payload: SupportTicketPayload = {
      category: 'suggestion',
      title: 'Modo escuro extra para tela de dados',
      description: 'Seria ótimo ter alto contraste nos dados.',
      includeDiagnostics: false,
    };

    const ghUrl = service.buildGitHubIssueUrl(payload, 'ORD-1234XY');
    assert.ok(ghUrl.startsWith('https://github.com/Lecrepus17/OrdoCompanion/issues/new?'));
    assert.ok(ghUrl.includes('labels=enhancement'));
    assert.ok(ghUrl.includes('ORD-1234XY'));

    const mailUrl = service.buildMailtoUrl(payload, 'ORD-1234XY');
    assert.ok(mailUrl.startsWith('mailto:dev@ordocompanion.com?subject='));
    assert.ok(mailUrl.includes('ORD-1234XY'));
  });

  await t.test('submitTicketInApp envia via Discord Webhook quando configurado e salva no histórico local', async () => {
    const service = new SupportService({
      discordWebhookUrl: 'https://discord.com/api/webhooks/test/mock',
      supabaseProxyUrl: '',
    });
    await service.clearTicketHistory();

    let webhookCalled = false;
    let sentBody: any = null;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: any, options: any) => {
      if (String(url).includes('discord.com/api/webhooks')) {
        webhookCalled = true;
        sentBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 204,
        } as any;
      }
      return { ok: false, status: 500 } as any;
    }) as any;

    try {
      const payload: SupportTicketPayload = {
        category: 'bug',
        severity: 'medium',
        title: 'Teste de envio direto via Webhook',
        description: 'Corpo do relato enviado direto pelo app.',
        senderName: 'Agente Veríssimo',
        contactReturn: 'verissimo@ordo.org',
        includeDiagnostics: true,
        diagnostics: service.collectDiagnostics({ playerName: 'Agente Veríssimo' }),
      };

      const res = await service.submitTicketInApp(payload);
      assert.equal(res.success, true);
      assert.equal(res.deliveredRemotely, true);
      assert.equal(res.channelUsed, 'discord_webhook');
      assert.equal(webhookCalled, true);
      assert.ok(sentBody?.embeds?.[0]?.title?.includes(res.protocol));
      assert.deepEqual(sentBody?.allowed_mentions, { parse: [] });

      const history = await service.getTicketHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].protocol, res.protocol);
      assert.equal(history[0].status, 'sent_remote');
    } finally {
      globalThis.fetch = originalFetch;
      await service.clearTicketHistory();
    }
  });

  await t.test('submitTicketInApp prioriza Proxy Seguro do Supabase com assinatura X-Ordo-Signature e bloqueia @everyone/@here', async () => {
    const service = new SupportService({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'sb_publishable_test_anon_key',
      discordWebhookUrl: '',
    });
    await service.clearTicketHistory();

    let proxyCalled = false;
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: any, options: any) => {
      if (String(url).includes('/functions/v1/support-webhook')) {
        proxyCalled = true;
        capturedHeaders = options.headers || {};
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
        } as any;
      }
      return { ok: false, status: 500 } as any;
    }) as any;

    try {
      const payload: SupportTicketPayload = {
        category: 'bug',
        severity: 'high',
        title: 'Tentativa de spam @everyone <@&987654321>',
        description: 'Mensagem com @here e link https://discord.gg/spammer123',
        includeDiagnostics: false,
      };

      const res = await service.submitTicketInApp(payload);
      assert.equal(res.success, true);
      assert.equal(res.deliveredRemotely, true);
      assert.equal(res.channelUsed, 'supabase_proxy');
      assert.equal(proxyCalled, true);

      // Verifica assinatura de autenticidade no header
      assert.ok(capturedHeaders['X-Ordo-Signature']?.startsWith('ordo_sig_v1_'));
      assert.equal(
        capturedHeaders['X-Ordo-Signature'],
        computeClientTicketSignature(res.protocol, capturedHeaders['X-Ordo-Timestamp'], capturedBody.title)
      );

      // Verifica sanitização anti-spam no payload
      assert.ok(!capturedBody.title.includes('@everyone'));
      assert.ok(!capturedBody.title.includes('<@&987654321>'));
      assert.ok(!capturedBody.description.includes('@here'));
      assert.ok(!capturedBody.description.includes('discord.gg/spammer123'));
    } finally {
      globalThis.fetch = originalFetch;
      await service.clearTicketHistory();
    }
  });

  await t.test('Ofuscação de segredos (obf:v1:), armazenamento criptografado no AsyncStorage e Cooldown Anti-Spam', async () => {
    const rawWebhook = 'https://discord.com/api/webhooks/123456789/SegredoMuitoImportanteABC';
    const obfuscated = obfuscateSecret(rawWebhook);

    assert.ok(obfuscated.startsWith('obf:v1:'));
    assert.ok(!obfuscated.includes('discord.com'));
    assert.ok(!obfuscated.includes('SegredoMuitoImportanteABC'));
    assert.equal(deobfuscateSecret(obfuscated), rawWebhook);
    assert.equal(resolveEnvSecret(obfuscated), rawWebhook);

    // Sanitização direta
    const dirty = 'Olá @everyone @here <@!12345> <@&9999> entre em https://discord.gg/golpe';
    const clean = sanitizeDiscordText(dirty);
    assert.ok(!clean.includes('@everyone'));
    assert.ok(!clean.includes('@here'));
    assert.ok(!clean.includes('<@!12345>'));
    assert.ok(!clean.includes('discord.gg/golpe'));

    // Verifica que setCustomWebhookUrl grava ofuscado no AsyncStorage
    const service = new SupportService({
      discordWebhookUrl: '',
      supabaseProxyUrl: '',
      rateLimitCooldownMs: 30_000,
    });
    await service.setCustomWebhookUrl(rawWebhook);
    const rawStored = await AsyncStorage.getItem(SUPPORT_CUSTOM_WEBHOOK_KEY);
    assert.ok(rawStored?.startsWith('obf:v1:'));
    assert.ok(!rawStored?.includes('discord.com'));
    assert.equal(await service.getEffectiveWebhookUrl(), rawWebhook);
    await service.setCustomWebhookUrl('');

    // Verifica Cooldown Anti-Spam entre envios seguidos
    const first = await service.submitTicketInApp({
      category: 'contact',
      title: 'Primeiro envio',
      description: 'Deve passar normalmente',
    });
    assert.equal(first.success, true);

    const secondImmediate = await service.submitTicketInApp({
      category: 'contact',
      title: 'Segundo envio em 1ms (Spam)',
      description: 'Deve ser bloqueado pelo cooldown',
    });
    assert.equal(secondImmediate.success, false);
    assert.equal(secondImmediate.rateLimited, true);

    service.resetRateLimit();
    await service.clearTicketHistory();
  });

  await t.test('submitTicketInApp salva localmente de forma resiliente quando sem webhook ou offline', async () => {
    const service = new SupportService({
      discordWebhookUrl: '',
      customEndpointUrl: '',
      supabaseProxyUrl: '',
    });
    await service.setCustomWebhookUrl('');
    await service.clearTicketHistory();

    const payload: SupportTicketPayload = {
      category: 'contact',
      title: 'Contato offline',
      description: 'Testando salvamento de protocolo local.',
      includeDiagnostics: false,
    };

    const res = await service.submitTicketInApp(payload);
    assert.equal(res.success, true);
    assert.equal(res.deliveredRemotely, false);
    assert.equal(res.channelUsed, 'local_fallback');
    assert.ok(res.protocol.startsWith('ORD-'));

    const history = await service.getTicketHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0].protocol, res.protocol);
    assert.equal(history[0].status, 'saved_local');

    await service.clearTicketHistory();
  });

  await t.test('Compatibilidade Hermes Android APK: obfuscateSecret, deobfuscateSecret e resolveEnvSecret funcionam sem TextEncoder/TextDecoder', () => {
    const g = globalThis as { TextEncoder?: unknown; TextDecoder?: unknown };
    const origEncoder = g.TextEncoder;
    const origDecoder = g.TextDecoder;
    g.TextEncoder = undefined;
    g.TextDecoder = undefined;

    try {
      const secrets = [
        'https://discord.com/api/webhooks/999/OrdoSegredo_AçãoParanormal#2026!',
        'AIzaSyDummyKey-ComAcento-Ção-🛡️',
      ];

      for (const secret of secrets) {
        const obfuscated = obfuscateSecret(secret);
        assert.ok(obfuscated.startsWith('obf:v1:'));
        assert.equal(deobfuscateSecret(obfuscated), secret);
        assert.equal(resolveEnvSecret(obfuscated), secret);
      }
    } finally {
      g.TextEncoder = origEncoder;
      g.TextDecoder = origDecoder;
    }
  });
});

test('Cobertura completa de envios, erros HTTP, reenvio local e integração Edge Function support-webhook', async (t) => {
  await t.test('submitTicketInApp envia todas as 4 categorias ao proxy com requestGroup, headers e roteamento corretos', async () => {
    const service = new SupportService({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'sb_publishable_test_anon_key',
      discordWebhookUrl: '',
      rateLimitCooldownMs: 0,
    });
    await service.clearTicketHistory();

    const capturedPayloads: any[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (_url: any, options: any) => {
      const parsed = JSON.parse(options.body);
      capturedPayloads.push({ headers: options.headers, body: parsed });
      const routedChannel =
        parsed.category === 'bug' || parsed.category === 'rule_error'
          ? 'errors'
          : parsed.category === 'suggestion'
          ? 'improvements'
          : 'default';
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, protocol: parsed.protocol, routedChannel }),
      } as any;
    }) as any;

    try {
      const cases: Array<{
        category: SupportCategory;
        expectedGroup: 'errors' | 'improvements';
        expectedRouted: 'errors' | 'improvements' | 'default';
      }> = [
        { category: 'bug', expectedGroup: 'errors', expectedRouted: 'errors' },
        { category: 'rule_error', expectedGroup: 'errors', expectedRouted: 'errors' },
        { category: 'suggestion', expectedGroup: 'improvements', expectedRouted: 'improvements' },
        { category: 'contact', expectedGroup: 'improvements', expectedRouted: 'default' },
      ];

      for (const c of cases) {
        const res = await service.submitTicketInApp({
          category: c.category,
          severity: c.category === 'bug' || c.category === 'rule_error' ? 'high' : undefined,
          title: `Teste categoria ${c.category}`,
          description: `Descrição detalhada de ${c.category}`,
          includeDiagnostics: true,
          diagnostics: service.collectDiagnostics({ themeId: 'energia' }),
        });

        assert.equal(res.success, true);
        assert.equal(res.deliveredRemotely, true);
        assert.equal(res.channelUsed, 'supabase_proxy');
        assert.equal(res.routedChannel, c.expectedRouted);
        assert.equal(res.ticket.status, 'sent_remote');
        assert.equal(res.ticket.routedChannel, c.expectedRouted);
      }

      assert.equal(capturedPayloads.length, 4);
      cases.forEach((c, idx) => {
        const cap = capturedPayloads[idx];
        assert.equal(cap.body.category, c.category);
        assert.equal(cap.body.requestGroup, c.expectedGroup);
        assert.ok(cap.headers['X-Ordo-Signature']?.startsWith('ordo_sig_v1_'));
        assert.equal(cap.headers['apikey'], 'sb_publishable_test_anon_key');
      });
    } finally {
      globalThis.fetch = originalFetch;
      await service.clearTicketHistory();
    }
  });

  await t.test('submitTicketInApp registra remoteStatusCode e remoteError claros para HTTP 429, 403, 502, 503 e erro de rede', async () => {
    const service = new SupportService({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'anon',
      discordWebhookUrl: '',
      rateLimitCooldownMs: 0,
    });
    await service.clearTicketHistory();

    const originalFetch = globalThis.fetch;

    try {
      const httpScenarios = [
        { status: 429, body: { error: 'Limite de envios atingido.' } },
        { status: 403, body: { error: 'Assinatura de cliente inválida.' } },
        { status: 502, body: { error: 'Falha ao encaminhar para o Discord.' } },
        { status: 503, body: { error: 'Webhook não configurado nos Secrets do servidor.' } },
      ];

      for (const sc of httpScenarios) {
        globalThis.fetch = (async () => ({
          ok: false,
          status: sc.status,
          json: async () => sc.body,
        })) as any;

        const res = await service.submitTicketInApp({
          category: 'suggestion',
          title: `Falha HTTP ${sc.status}`,
          description: 'Teste de retorno de erro explícito.',
        });

        assert.equal(res.deliveredRemotely, false);
        assert.equal(res.channelUsed, 'local_fallback');
        assert.equal(res.remoteStatusCode, sc.status);
        assert.equal(res.remoteError, sc.body.error);
        assert.equal(res.ticket.status, 'saved_local');
        assert.equal(res.ticket.lastStatusCode, sc.status);
        assert.equal(res.ticket.lastError, sc.body.error);
      }

      // Falha de rede / AbortError
      globalThis.fetch = (async () => {
        const err: any = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }) as any;

      const timeoutRes = await service.submitTicketInApp({
        category: 'bug',
        title: 'Timeout de rede',
        description: 'Simulação de timeout no proxy.',
      });
      assert.equal(timeoutRes.deliveredRemotely, false);
      assert.ok(timeoutRes.remoteError?.includes('Tempo esgotado'));
    } finally {
      globalThis.fetch = originalFetch;
      await service.clearTicketHistory();
    }
  });

  await t.test('resubmitLocalTicket reenvia chamado saved_local preservando id e protocol sem duplicar histórico', async () => {
    const service = new SupportService({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'anon',
      discordWebhookUrl: '',
      rateLimitCooldownMs: 0,
    });
    await service.clearTicketHistory();

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => ({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Servidor temporariamente indisponível.' }),
      })) as any;

      const first = await service.submitTicketInApp({
        category: 'suggestion',
        title: 'Melhoria que falhou primeiro',
        description: 'Deve ficar salva e depois ser reenviada.',
        senderName: 'Agente Dante',
      });
      assert.equal(first.deliveredRemotely, false);
      assert.equal(first.ticket.status, 'saved_local');

      let history = await service.getTicketHistory();
      assert.equal(history.length, 1);

      // Rede volta a funcionar
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, protocol: first.protocol, routedChannel: 'improvements' }),
      })) as any;

      const retried = await service.resubmitLocalTicket(first.ticket.id);
      assert.equal(retried.deliveredRemotely, true);
      assert.equal(retried.protocol, first.protocol);
      assert.equal(retried.ticket.id, first.ticket.id);
      assert.equal(retried.ticket.status, 'sent_remote');
      assert.equal(retried.ticket.lastError, undefined);
      assert.equal(retried.routedChannel, 'improvements');

      history = await service.getTicketHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].status, 'sent_remote');

      await assert.rejects(() => service.resubmitLocalTicket('ORD-NAO-EXISTE'), /não encontrado/i);
    } finally {
      globalThis.fetch = originalFetch;
      await service.clearTicketHistory();
    }
  });

  await t.test('buildGitHubIssueUrl e buildMailtoUrl cobrem todas as 4 categorias e truncam body longo no GitHub', () => {
    const service = new SupportService({
      githubIssuesUrl: 'https://github.com/Lecrepus17/OrdoCompanion/issues',
      supportEmail: 'dev@ordocompanion.com',
    });

    const expectedLabels: Record<SupportCategory, string> = {
      bug: 'bug',
      rule_error: 'compendium',
      suggestion: 'enhancement',
      contact: 'question',
    };

    (Object.keys(expectedLabels) as SupportCategory[]).forEach((cat) => {
      const ghUrl = service.buildGitHubIssueUrl(
        {
          category: cat,
          title: `Título ${cat}`,
          description: `Descrição ${cat}`,
        },
        'ORD-ABCD12'
      );
      assert.ok(ghUrl.includes(`labels=${expectedLabels[cat]}`));
      assert.ok(ghUrl.includes('ORD-ABCD12'));

      const mailUrl = service.buildMailtoUrl(
        {
          category: cat,
          title: `Título ${cat}`,
          description: `Descrição ${cat}`,
        },
        'ORD-ABCD12'
      );
      assert.ok(mailUrl.startsWith('mailto:dev@ordocompanion.com?subject='));
      assert.ok(mailUrl.includes('ORD-ABCD12'));
    });

    const longUrl = service.buildGitHubIssueUrl(
      {
        category: 'bug',
        title: 'Relato gigante',
        description: 'X'.repeat(5000),
      },
      'ORD-LONG1'
    );
    const parsedParams = new URL(longUrl).searchParams;
    const decodedBody = parsedParams.get('body') || '';
    assert.ok(decodedBody.length <= 3500);
    assert.ok(decodedBody.endsWith('...[truncado]'));
  });

  await t.test('openExternalUrl funciona no Android (Linking) e Web (window.open) tratando falhas sem lançar', async () => {
    const service = new SupportService();
    const origOs = Platform.OS;
    const origCanOpen = Linking.canOpenURL;
    const origOpenUrl = Linking.openURL;
    const origWindowOpen = typeof window !== 'undefined' ? window.open : undefined;

    try {
      // Android sucesso
      (Platform as any).OS = 'android';
      const openedUrls: string[] = [];
      (Linking as any).canOpenURL = async () => true;
      (Linking as any).openURL = async (url: string) => {
        openedUrls.push(url);
      };

      const okAndroid = await service.openExternalUrl('https://discord.gg/vPCZzr2wFR');
      assert.equal(okAndroid, true);
      assert.deepEqual(openedUrls, ['https://discord.gg/vPCZzr2wFR']);

      // Android falha (ex: nenhum app de e-mail instalado)
      (Linking as any).canOpenURL = async () => false;
      (Linking as any).openURL = async () => {
        throw new Error('No Activity found to handle Intent');
      };
      const failAndroid = await service.openExternalUrl('mailto:pedro@ordo.org');
      assert.equal(failAndroid, false);

      // Web window.open
      (Platform as any).OS = 'web';
      const webOpened: any[] = [];
      (window as any).open = (url: string, target: string, features: string) => {
        webOpened.push({ url, target, features });
      };
      const okWeb = await service.openExternalUrl('https://discord.gg/vPCZzr2wFR');
      assert.equal(okWeb, true);
      assert.equal(webOpened[0].url, 'https://discord.gg/vPCZzr2wFR');
      assert.equal(webOpened[0].target, '_blank');
    } finally {
      (Platform as any).OS = origOs;
      (Linking as any).canOpenURL = origCanOpen;
      (Linking as any).openURL = origOpenUrl;
      if (typeof window !== 'undefined') {
        (window as any).open = origWindowOpen;
      }
    }
  });

  await t.test('Integração Cliente -> Edge Function support-webhook roteia #erros vs #melhorias, faz fallback, protege rate limit e evita fields vazios', async () => {
    resetIpRateLimitHistory();

    const bugsWebhook = 'https://discord.com/api/webhooks/100/bugs-secret';
    const suggestionsWebhook = 'https://discord.com/api/webhooks/200/suggestions-secret';
    const defaultWebhook = 'https://discord.com/api/webhooks/300/default-secret';

    let envMap: Record<string, string | undefined> = {
      DISCORD_BUGS_WEBHOOK_URL: bugsWebhook,
      DISCORD_SUGGESTIONS_WEBHOOK_URL: suggestionsWebhook,
      DISCORD_SUPPORT_WEBHOOK_URL: defaultWebhook,
    };

    const discordPosts: Array<{ url: string; payload: any }> = [];
    const originalFetch = globalThis.fetch;

    const service = new SupportService({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'anon',
      discordWebhookUrl: '',
      rateLimitCooldownMs: 0,
    });
    await service.clearTicketHistory();

    const makeEdgeFetch = (clientIp: string) => async (url: any, opts: any) => {
      const req = new Request(String(url), {
        method: opts?.method || 'POST',
        headers: {
          ...(opts?.headers || {}),
          'x-forwarded-for': clientIp,
        },
        body: opts?.body,
      });

      return handleSupportWebhookRequest(req, {
        getEnv: (k) => envMap[k],
        fetchImpl: (async (targetUrl: any, discordOpts: any) => {
          discordPosts.push({
            url: String(targetUrl),
            payload: JSON.parse(discordOpts.body),
          });
          return new Response(null, { status: 204 });
        }) as any,
      });
    };

    try {
      globalThis.fetch = makeEdgeFetch('198.51.100.1') as any;

      // 1. Bug -> #erros
      const bugRes = await service.submitTicketInApp({
        category: 'bug',
        severity: 'high',
        title: 'Crash na ficha',
        description: 'Fecha ao rolar iniciativa.',
      });
      assert.equal(bugRes.deliveredRemotely, true);
      assert.equal(bugRes.routedChannel, 'errors');
      assert.equal(discordPosts[0].url, bugsWebhook);
      assert.ok(
        discordPosts[0].payload.embeds[0].fields.some(
          (f: any) => f.name.includes('Fila de Triagem') && f.value === '🐛 ERROS'
        )
      );

      // 2. Erro de regra -> #erros
      const ruleRes = await service.submitTicketInApp({
        category: 'rule_error',
        severity: 'medium',
        title: 'Custo de ritual incorreto',
        description: 'Deveria custar 3 PE.',
      });
      assert.equal(ruleRes.routedChannel, 'errors');
      assert.equal(discordPosts[1].url, bugsWebhook);

      // 3. Melhoria -> #melhorias (inclusive com espaços vazios nos campos opcionais)
      const sugRes = await service.submitTicketInApp({
        category: 'suggestion',
        title: 'Filtro por elemento no grimório',
        description: 'Permitir filtrar Sangue/Morte/Energia/Conhecimento.',
        senderName: '   ',
        contactReturn: '  ',
        stepsToReproduce: '   ',
      });
      assert.equal(sugRes.deliveredRemotely, true);
      assert.equal(sugRes.routedChannel, 'improvements');
      assert.equal(discordPosts[2].url, suggestionsWebhook);
      const sugFields = discordPosts[2].payload.embeds[0].fields;
      assert.ok(
        sugFields.some((f: any) => f.name.includes('Fila de Triagem') && f.value === '💡 MELHORIAS')
      );
      assert.ok(
        sugFields.every((f: any) => typeof f.value === 'string' && f.value.trim().length > 0),
        'Nenhum field do Discord pode ter value vazio'
      );

      // 4. Contato -> default webhook
      const contactRes = await service.submitTicketInApp({
        category: 'contact',
        title: 'Dúvida sobre backup',
        description: 'Como transferir para outro celular?',
      });
      assert.equal(contactRes.routedChannel, 'default');
      assert.equal(discordPosts[3].url, defaultWebhook);

      // 5. Fallback quando webhooks dedicados não estão configurados
      envMap = {
        DISCORD_SUPPORT_WEBHOOK_URL: defaultWebhook,
      };
      const fallbackSugRes = await service.submitTicketInApp({
        category: 'suggestion',
        title: 'Melhoria com fallback',
        description: 'Sem webhook dedicado vai para o geral.',
      });
      assert.equal(fallbackSugRes.routedChannel, 'default');
      assert.equal(discordPosts[4].url, defaultWebhook);

      // 6. Requisições inválidas (400 e 403) NÃO consomem cota de rate limit do IP
      envMap = {
        DISCORD_BUGS_WEBHOOK_URL: bugsWebhook,
        DISCORD_SUGGESTIONS_WEBHOOK_URL: suggestionsWebhook,
        DISCORD_SUPPORT_WEBHOOK_URL: defaultWebhook,
      };
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS + 2; i++) {
        const badPayloadRes = await handleSupportWebhookRequest(
          new Request('https://mock/support-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.77' },
            body: JSON.stringify({}),
          }),
          { getEnv: (k) => envMap[k] }
        );
        assert.equal(badPayloadRes.status, 400);

        const badSigRes = await handleSupportWebhookRequest(
          new Request('https://mock/support-webhook', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-forwarded-for': '203.0.113.77',
              'x-ordo-signature': 'assinatura_forjada',
            },
            body: JSON.stringify({
              protocol: 'ORD-1234AB',
              title: 'Teste',
              description: 'Desc',
              createdAt: '2026-11-22T12:00:00.000Z',
            }),
          }),
          { getEnv: (k) => envMap[k] }
        );
        assert.equal(badSigRes.status, 403);
      }

      globalThis.fetch = makeEdgeFetch('203.0.113.77') as any;
      const validAfterInvalid = await service.submitTicketInApp({
        category: 'suggestion',
        title: 'Válido após rejeições',
        description: 'Não foi bloqueado por chamadas inválidas anteriores.',
      });
      assert.equal(validAfterInvalid.deliveredRemotely, true);

      // 7. Rate limit 429 após RATE_LIMIT_MAX_REQUESTS envios válidos no mesmo IP
      globalThis.fetch = makeEdgeFetch('203.0.113.88') as any;
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const okRes = await service.submitTicketInApp({
          category: 'suggestion',
          title: `Envio ${i + 1}`,
          description: 'Dentro da cota.',
        });
        assert.equal(okRes.deliveredRemotely, true);
      }
      const rateLimitedRes = await service.submitTicketInApp({
        category: 'suggestion',
        title: 'Envio excedente',
        description: 'Deve retornar 429.',
      });
      assert.equal(rateLimitedRes.deliveredRemotely, false);
      assert.equal(rateLimitedRes.remoteStatusCode, 429);

      // Valida helper unitário buildDiscordSupportPayload e resolveSupportWebhookTarget
      assert.deepEqual(
        resolveSupportWebhookTarget('suggestion', {
          bugsWebhookUrl: bugsWebhook,
          suggestionsWebhookUrl: suggestionsWebhook,
          defaultWebhookUrl: defaultWebhook,
        }),
        { url: suggestionsWebhook, routedChannel: 'improvements' }
      );
      const built = buildDiscordSupportPayload(
        { category: 'suggestion', title: 'Teste @everyone', description: 'Oi @here' },
        'ORD-9999ZZ'
      );
      assert.ok(!built.embeds[0].title.includes('@everyone'));
      assert.ok(!built.embeds[0].description.includes('@here'));
    } finally {
      globalThis.fetch = originalFetch;
      resetIpRateLimitHistory();
      await service.clearTicketHistory();
    }
  });
});
