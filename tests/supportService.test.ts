import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { SupportService } from '../src/services/support/SupportService';
import { SupportTicketPayload } from '../src/services/support/types';

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

      const history = await service.getTicketHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].protocol, res.protocol);
      assert.equal(history[0].status, 'sent_remote');
    } finally {
      globalThis.fetch = originalFetch;
      await service.clearTicketHistory();
    }
  });

  await t.test('submitTicketInApp salva localmente de forma resiliente quando sem webhook ou offline', async () => {
    const service = new SupportService({
      discordWebhookUrl: '',
      customEndpointUrl: '',
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
});
