import './setup';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SupportService,
  SUPPORT_CUSTOM_BUGS_WEBHOOK_KEY,
  SUPPORT_CUSTOM_SUGGESTIONS_WEBHOOK_KEY,
  SUPPORT_CUSTOM_WEBHOOK_KEY,
} from '../src/services/support/SupportService';
import { obfuscateSecret } from '../src/utils/secretObfuscator';
import { resetMockStorage } from './setup';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const discordRequests = require('../scripts/discord_requests.js');

describe('Sistema Centralizado de Solicitações, SSOT de Perguntas & Roteamento Discord (discordRequests.test.ts)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetMockStorage();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetMockStorage();
  });

  it('1. Carrega as 5 perguntas padrão de data/request_triage_questions.json (SSOT) e reflete alterações em um único lugar', () => {
    const defaultCfg = discordRequests.loadTriageQuestionsConfig();
    assert.equal(defaultCfg.questions.length, 5);
    assert.deepEqual(
      defaultCfg.questions.map((q: any) => q.title),
      [
        'O que é?',
        'É algo válido de fazer?',
        'Vai gerar algum problema?',
        'O que teria que ser feito?',
        'É necessário?',
      ]
    );
    assert.ok(defaultCfg.specialists.length >= 4);

    // Simula edição futura no arquivo único SSOT (removendo 1 pergunta e adicionando 1 nova)
    const tmpFile = path.join(os.tmpdir(), `ordo_ssot_test_${Date.now()}.json`);
    try {
      fs.writeFileSync(
        tmpFile,
        JSON.stringify({
          version: '1.1.0',
          questions: [
            { id: 'q1', number: 1, title: 'O que é?', promptHint: 'Resumo', active: true },
            { id: 'q2', number: 2, title: 'Desativada', promptHint: 'Não deve aparecer', active: false },
            { id: 'q3', number: 2, title: 'Impacto no APK?', promptHint: 'Checar Hermes', active: true },
          ],
          specialists: [{ id: 'android-apk-guardian', label: '🤖 APK', focus: 'Hermes' }],
        }),
        'utf-8'
      );

      const customCfg = discordRequests.loadTriageQuestionsConfig(tmpFile);
      assert.equal(customCfg.questions.length, 2);
      assert.equal(customCfg.questions[1].title, 'Impacto no APK?');

      const sampleReq = {
        id: '1001',
        protocol: 'ORD-TEST1',
        requestGroup: 'improvements',
        source: 'Discord (Membro)',
        channelLabel: '#melhorias',
        author: 'Agente',
        title: 'Botão extra na ficha',
        description: 'Adicionar botão',
      };
      const rendered = discordRequests.formatTriageTemplateForRequest(sampleReq, customCfg, 'SOL-MEL-001');
      assert.ok(rendered.includes('1. **O que é?**'));
      assert.ok(rendered.includes('2. **Impacto no APK?**'));
      assert.ok(!rendered.includes('Desativada'));
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('2. Separa estritamente Erros e Melhorias vindos de canais separados, embeds do App e mensagens de membros', () => {
    const appBugEmbedMsg = {
      id: '100000000000000001',
      channel_id: 'chan_general',
      timestamp: '2026-11-20T12:00:00.000Z',
      embeds: [
        {
          title: '🐛 [ORD-9912AB] Erro ao rolar ritual Discente',
          description: 'A DT não somou o limite de PE no nível 50%.',
          fields: [
            { name: '🔖 Protocolo', value: '`#ORD-9912AB`' },
            { name: '📂 Categoria', value: '📖 Erro de Regra / Compêndio' },
            { name: '🗂️ Fila de Triagem', value: '🐛 ERROS' },
            { name: '⚠️ Severidade', value: 'Crítico' },
            { name: '👤 Jogador / Agente', value: 'Kaiser' },
          ],
        },
      ],
    };

    const parsedBug = discordRequests.parseDiscordMessageToRequest(appBugEmbedMsg, 'auto', '#suporte');
    assert.equal(parsedBug.requestGroup, 'errors');
    assert.equal(parsedBug.protocol, 'ORD-9912AB');
    assert.equal(parsedBug.category, 'rule_error');
    assert.equal(parsedBug.author, 'Kaiser');

    const memberSuggestionMsg = {
      id: '100000000000000002',
      channel_id: 'chan_melhorias',
      timestamp: '2026-11-20T12:05:00.000Z',
      author: { global_name: 'Joui' },
      content: 'Seria ótimo ter filtro de rituais por círculo na aba do Grimório.',
    };

    const parsedSuggestion = discordRequests.parseDiscordMessageToRequest(
      memberSuggestionMsg,
      'improvements',
      '#melhorias'
    );
    assert.equal(parsedSuggestion.requestGroup, 'improvements');
    assert.equal(parsedSuggestion.author, 'Joui');
    assert.ok(parsedSuggestion.protocol.startsWith('DSC-'));

    // Ignora mensagem de teste automático do Webhook
    const testPingMsg = {
      id: '100000000000000003',
      embeds: [{ title: '✅ Conexão Estabelecida com Sucesso!' }],
    };
    assert.equal(discordRequests.parseDiscordMessageToRequest(testPingMsg, 'errors', '#erros'), null);
  });

  it('3. Filtra apenas mensagens ainda não triadas em ordem cronológica (BigInt Snowflake)', () => {
    const state = {
      processedIds: {
        '100000000000000010': { status: 'approved' },
      },
    };
    const messages = [
      { id: '100000000000000030', content: 'Mais nova' },
      { id: '100000000000000010', content: 'Já triada' },
      { id: '100000000000000020', content: 'Pendente antiga' },
    ];

    const unread = discordRequests.filterUnreadMessages(messages, state, false);
    assert.deepEqual(
      unread.map((m: any) => m.id),
      ['100000000000000020', '100000000000000030']
    );

    const all = discordRequests.filterUnreadMessages(messages, state, true);
    assert.equal(all.length, 3);
  });

  it('4. SupportService roteia Webhooks separados para Erros vs Melhorias com fallback seguro e compatibilidade APK/Hermes', async () => {
    const generalUrl = 'https://discord.com/api/webhooks/111/general';
    const bugsUrl = 'https://discord.com/api/webhooks/222/bugs';
    const suggestionsUrl = 'https://discord.com/api/webhooks/333/suggestions';

    const service = new SupportService({
      discordWebhookUrl: obfuscateSecret(generalUrl),
      discordBugsWebhookUrl: obfuscateSecret(bugsUrl),
      discordSuggestionsWebhookUrl: obfuscateSecret(suggestionsUrl),
      supabaseProxyUrl: '',
      rateLimitCooldownMs: 0,
    });

    assert.equal(service.getRequestGroup('bug'), 'errors');
    assert.equal(service.getRequestGroup('rule_error'), 'errors');
    assert.equal(service.getRequestGroup('suggestion'), 'improvements');

    assert.equal(await service.getEffectiveWebhookUrlForCategory('bug'), bugsUrl);
    assert.equal(await service.getEffectiveWebhookUrlForCategory('rule_error'), bugsUrl);
    assert.equal(await service.getEffectiveWebhookUrlForCategory('suggestion'), suggestionsUrl);
    assert.equal(await service.getEffectiveWebhookUrlForCategory('contact'), generalUrl);

    // Verifica persistência ofuscada por fila no AsyncStorage
    const overrideBugsUrl = 'https://discord.com/api/webhooks/444/custom-bugs';
    await service.setCustomCategoryWebhookUrl('errors', overrideBugsUrl);
    const storedBugs = await AsyncStorage.getItem(SUPPORT_CUSTOM_BUGS_WEBHOOK_KEY);
    assert.ok(storedBugs?.startsWith('obf:v1:'));
    assert.equal(await service.getEffectiveWebhookUrlForCategory('bug'), overrideBugsUrl);
    await service.setCustomCategoryWebhookUrl('errors', '');

    // Verifica envio HTTP separado em ambiente sem TextEncoder/TextDecoder (Hermes APK)
    const g = globalThis as { TextEncoder?: unknown; TextDecoder?: unknown };
    const origEnc = g.TextEncoder;
    const origDec = g.TextDecoder;
    g.TextEncoder = undefined;
    g.TextDecoder = undefined;

    const calledUrls: string[] = [];
    const sentEmbeds: any[] = [];
    globalThis.fetch = (async (url: any, opts: any) => {
      calledUrls.push(String(url));
      sentEmbeds.push(JSON.parse(opts.body));
      return { ok: true, status: 204 } as any;
    }) as any;

    try {
      const bugRes = await service.submitTicketInApp({
        category: 'bug',
        severity: 'high',
        title: 'Crash no APK',
        description: 'Erro reproduzido no Android.',
      });
      assert.equal(bugRes.deliveredRemotely, true);
      assert.equal(calledUrls[0], bugsUrl);
      assert.ok(
        sentEmbeds[0].embeds[0].fields.some(
          (f: any) => f.name.includes('Fila de Triagem') && f.value === '🐛 ERROS'
        )
      );

      const sugRes = await service.submitTicketInApp({
        category: 'suggestion',
        title: 'Melhoria de filtro',
        description: 'Adicionar ordenação alfabética.',
      });
      assert.equal(sugRes.deliveredRemotely, true);
      assert.equal(calledUrls[1], suggestionsUrl);
      assert.ok(
        sentEmbeds[1].embeds[0].fields.some(
          (f: any) => f.name.includes('Fila de Triagem') && f.value === '💡 MELHORIAS'
        )
      );
    } finally {
      g.TextEncoder = origEnc;
      g.TextDecoder = origDec;
      await service.setCustomWebhookUrl('');
      await service.setCustomCategoryWebhookUrl('errors', '');
      await service.setCustomCategoryWebhookUrl('improvements', '');
      await AsyncStorage.removeItem(SUPPORT_CUSTOM_WEBHOOK_KEY);
      await AsyncStorage.removeItem(SUPPORT_CUSTOM_SUGGESTIONS_WEBHOOK_KEY);
      await service.clearTicketHistory();
    }
  });

  it('5. Fallback automático funciona quando apenas o Webhook Geral está configurado', async () => {
    const generalUrl = 'https://discord.com/api/webhooks/999/only-general';
    const service = new SupportService({
      discordWebhookUrl: generalUrl,
      discordBugsWebhookUrl: '',
      discordSuggestionsWebhookUrl: '',
      supabaseProxyUrl: '',
    });

    assert.equal(await service.getEffectiveWebhookUrlForCategory('bug'), generalUrl);
    assert.equal(await service.getEffectiveWebhookUrlForCategory('suggestion'), generalUrl);
  });
});
