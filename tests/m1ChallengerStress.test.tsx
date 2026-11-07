import './setup';
import React from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
  supportService,
  SupportService,
  SUPPORT_TICKETS_STORAGE_KEY,
  SUPPORT_CUSTOM_WEBHOOK_KEY,
} from '../src/services/support/SupportService';
import {
  UpdateCheckerService,
  compareSemVer,
  normalizeChangelog,
  GITHUB_RELEASES_PAGE_URL,
  GITHUB_RELEASES_API_URL,
  DISMISSED_UPDATE_VERSION_KEY,
  DISMISSED_UPDATE_TIME_KEY,
} from '../src/services/updates/UpdateCheckerService';
import OAuthRedirectScreen from '../src/app/oauthredirect';
import {
  resetMockStorage,
  mockRouter,
  setMobilePlatform,
} from './setup';
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';
import { SupportTicketPayload } from '../src/services/support/types';
import { sanitizeDiscordText } from '../src/utils/secretObfuscator';

describe('CHALLENGER M1: Empirical Stress Tests & Robustness Matrix (m1ChallengerStress.test.tsx)', () => {
  const originalFetch = globalThis.fetch;
  const originalSetItem = AsyncStorage.setItem;
  const originalPlatformOS = Platform.OS;

  beforeEach(async () => {
    resetMockStorage();
    await cleanup();
    globalThis.fetch = originalFetch;
    AsyncStorage.setItem = originalSetItem;
    (Platform as any).OS = 'web';
    setMobilePlatform('web');
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    AsyncStorage.setItem = originalSetItem;
    (Platform as any).OS = originalPlatformOS;
    setMobilePlatform('web');
    await cleanup();
  });

  // =========================================================================
  // SUITE 1: oauthredirect.tsx Platform Parity, Timers & BackHandler
  // =========================================================================
  describe('Suite 1: oauthredirect.tsx Platform Parity & Edge Scenarios', () => {
    it('1.1 Web: Renderiza interface de autenticação sem falha e redireciona após 900ms', async () => {
      mockRouter.reset();
      (mockRouter as any).canGoBack = () => false;

      const { getByText, unmount } = await renderWithProviders(<OAuthRedirectScreen />);

      assert.ok(getByText(/Autenticação em Andamento/i), 'Título de autenticação deve estar presente na Web');
      assert.ok(getByText(/Retornar ao Terminal/i), 'Botão manual de contingência deve estar visível');

      // Aguarda o temporizador de segurança de 900ms
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const replaceCall = mockRouter.history.find((h) => h.action === 'replace');
      assert.ok(replaceCall, 'Deve chamar router.replace("/") quando canGoBack() for false após o timer');
      assert.equal(replaceCall?.href, '/');

      unmount();
    });

    it('1.2 Web: Executa router.back() quando canGoBack() for true', async () => {
      mockRouter.reset();
      (mockRouter as any).canGoBack = () => true;

      const { unmount } = await renderWithProviders(<OAuthRedirectScreen />);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const backCall = mockRouter.history.find((h) => h.action === 'back');
      assert.ok(backCall, 'Deve chamar router.back() quando canGoBack() for true');

      unmount();
    });

    it('1.3 Desmontagem prematura limpa timer e não causa chamada tardia ao router', async () => {
      mockRouter.reset();
      (mockRouter as any).canGoBack = () => false;

      const { unmount } = await renderWithProviders(<OAuthRedirectScreen />);

      // Desmonta aos 200ms (antes dos 900ms)
      await new Promise((resolve) => setTimeout(resolve, 200));
      unmount();

      // Aguarda tempo suficiente para o timer original ter expirado
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const actions = mockRouter.history.filter((h) => h.action === 'replace' || h.action === 'back');
      assert.equal(actions.length, 0, 'Nenhuma navegação deve ocorrer se a tela foi desmontada antes do timer');
    });

    it('1.4 Acionamento manual do botão "Retornar ao Terminal" navega imediatamente', async () => {
      mockRouter.reset();
      (mockRouter as any).canGoBack = () => false;

      const { getByText, unmount } = await renderWithProviders(<OAuthRedirectScreen />);
      const btn = getByText(/Retornar ao Terminal/i);

      await fireClick(btn);

      const replaceCall = mockRouter.history.find((h) => h.action === 'replace');
      assert.ok(replaceCall, 'Deve navegar imediatamente ao acionar o botão manual');
      assert.equal(replaceCall?.href, '/');

      unmount();
    });

    it('1.5 Android: Registra e remove listener de hardwareBackPress sem erro', async () => {
      (Platform as any).OS = 'android';
      setMobilePlatform('android');
      mockRouter.reset();
      (mockRouter as any).canGoBack = () => true;

      let backPressHandler: (() => boolean) | null = null;
      let removed = false;

      const origAdd = BackHandler.addEventListener;
      BackHandler.addEventListener = ((event: string, handler: any) => {
        if (event === 'hardwareBackPress') {
          backPressHandler = handler;
        }
        return {
          remove: () => {
            removed = true;
          },
        };
      }) as any;

      try {
        const { unmount } = await renderWithProviders(<OAuthRedirectScreen />, { mobile: 'android' });
        assert.ok(backPressHandler !== null, 'Listener hardwareBackPress DEVE ser registrado no Android');

        // Dispara o evento de hardware back press
        const handlerFn: any = backPressHandler;
        const consumed = handlerFn();
        assert.equal(consumed, true, 'Hardware back press deve retornar true para consumir o evento');

        const backCall = mockRouter.history.find((h) => h.action === 'back');
        assert.ok(backCall, 'Hardware back press deve chamar router.back()');

        unmount();
        assert.equal(removed, true, 'Listener deve ser desregistrado ao desmontar componente no Android');
      } finally {
        BackHandler.addEventListener = origAdd;
        (Platform as any).OS = 'web';
        setMobilePlatform('web');
      }
    });
  });

  // =========================================================================
  // SUITE 2: oauthredirect.tsx Adversarial Deep Link URLs, Missing & Error Params
  // =========================================================================
  describe('Suite 2: oauthredirect.tsx Adversarial Deep Links & Error Parameters', () => {
    it('2.1 Deep link sem parâmetros de query não lança erro e completa sessão', async () => {
      const { getByText, unmount } = await renderWithProviders(<OAuthRedirectScreen />);
      assert.ok(getByText(/Autenticação em Andamento/i));
      assert.doesNotThrow(() => {
        WebBrowser.maybeCompleteAuthSession();
      });
      unmount();
    });

    it('2.2 Deep link com parâmetros de erro (access_denied) é processado com segurança', async () => {
      const { unmount } = await renderWithProviders(<OAuthRedirectScreen />);
      assert.doesNotThrow(() => {
        WebBrowser.maybeCompleteAuthSession({
          skipProviderValidation: true,
        } as any);
      });
      unmount();
    });

    it('2.3 Deep link com payloads maliciosos (XSS, SQL injection, non-ASCII) não quebra', async () => {
      const maliciousUrls = [
        'com.ordemparanormal.ordo:/oauthredirect?code=<script>alert("xss")</script>',
        'com.ordemparanormal.ordo:/oauthredirect?state=\'; DROP TABLE users; --',
        'com.ordemparanormal.ordo:/oauthredirect?code=%00%FF%FE%AA%5C%22',
        'com.ordemparanormal.ordo:/oauthredirect?code=' + 'A'.repeat(5000),
      ];

      for (const badUrl of maliciousUrls) {
        assert.doesNotThrow(() => {
          WebBrowser.maybeCompleteAuthSession({ url: badUrl } as any);
        }, `Falha ao processar URL maliciosa: ${badUrl}`);
      }
    });

    it('2.4 Múltiplas invocações concorrentes de maybeCompleteAuthSession são idempotentes', () => {
      assert.doesNotThrow(() => {
        for (let i = 0; i < 10; i++) {
          WebBrowser.maybeCompleteAuthSession();
        }
      });
    });
  });

  // =========================================================================
  // SUITE 3: UpdateCheckerService Malformed Tags, Extreme SemVer & Changelog
  // =========================================================================
  describe('Suite 3: UpdateCheckerService SemVer & Changelog Adversarial Stress', () => {
    it('3.1 compareSemVer: matriz de entradas malformadas, limites e prefixos v', () => {
      // Casos normais
      assert.equal(compareSemVer('1.0.0', '1.0.0'), 0);
      assert.equal(compareSemVer('1.1.0', '1.0.0'), 1);
      assert.equal(compareSemVer('1.0.0', '1.1.0'), -1);
      assert.equal(compareSemVer('v1.2.3', '1.2.3'), 0);
      assert.equal(compareSemVer('1.2.3', 'v1.2.3'), 0);
      assert.equal(compareSemVer('V2.0.0', 'v1.9.9'), 1);

      // Espaços e tags com traço
      assert.equal(compareSemVer('  1.3.0  ', '1.3.0'), 0);
      assert.equal(compareSemVer('1.3.0-beta.1', '1.3.0'), 0);
      assert.equal(compareSemVer('1.3.1-rc.2', '1.3.0'), 1);

      // Entradas vazias ou degeneradas (não quebram)
      assert.equal(compareSemVer('', ''), 0);
      assert.equal(compareSemVer('v', '0.0.0'), 0);
      assert.equal(compareSemVer('abc', '1.0.0'), -1);
      assert.equal(compareSemVer(null as any, undefined as any), 0);
      assert.equal(compareSemVer('999999999.0.0', '1.0.0'), 1);

      // Diferentes comprimentos de octeto
      assert.equal(compareSemVer('1.0', '1.0.0'), 0);
      assert.equal(compareSemVer('1.0.0.1', '1.0.0.2'), -1);
    });

    it('3.2 normalizeChangelog: matriz com markdown complexo, listas e nulos', () => {
      assert.deepEqual(normalizeChangelog(undefined), []);
      assert.deepEqual(normalizeChangelog(''), []);
      assert.deepEqual(normalizeChangelog('   '), []);
      assert.deepEqual(normalizeChangelog([]), []);

      // Markdown com cabeçalhos e marcadores
      const rawMarkdown = `
# Release v1.3.0
## Novidades
- Adicionado suporte a novos rituais
* Correção de cálculo de PV
• Melhoria na busca do compêndio
`;
      const normalized = normalizeChangelog(rawMarkdown);
      assert.equal(normalized.length, 3);
      assert.equal(normalized[0], 'Adicionado suporte a novos rituais');
      assert.equal(normalized[1], 'Correção de cálculo de PV');
      assert.equal(normalized[2], 'Melhoria na busca do compêndio');

      // Array com marcadores
      const rawArray = ['• Item 1', '- Item 2', '* Item 3', 'Item limpo', ''];
      const normalizedArr = normalizeChangelog(rawArray);
      assert.deepEqual(normalizedArr, ['Item 1', 'Item 2', 'Item 3', 'Item limpo']);
    });
  });

  // =========================================================================
  // SUITE 4: UpdateCheckerService Storage, Sockets, Timeouts & Rejection Matrix
  // =========================================================================
  describe('Suite 4: UpdateCheckerService Storage Corruption & Network Rejections', () => {
    it('4.1 isUpdateDismissed lida com corrupção no timestamp sem crash', async () => {
      const service = new UpdateCheckerService();

      // Timestamp com string inválida
      await AsyncStorage.setItem(DISMISSED_UPDATE_VERSION_KEY, '2.0.0');
      await AsyncStorage.setItem(DISMISSED_UPDATE_TIME_KEY, 'INVALID_NOT_A_NUMBER');

      const isDismissed = await service.isUpdateDismissed('2.0.0');
      assert.equal(isDismissed, false, 'Não deve considerar dispensado se timestamp for inválido');

      // Dispensa correta recente
      await service.dismissUpdate('2.0.0');
      const isDismissedNow = await service.isUpdateDismissed('2.0.0');
      assert.equal(isDismissedNow, true, 'Deve ser dispensado logo após salvar');

      // Versão diferente não é dispensada
      const isOtherDismissed = await service.isUpdateDismissed('2.0.1');
      assert.equal(isOtherDismissed, false);

      // Limpeza
      await service.clearDismissedUpdate();
      assert.equal(await service.isUpdateDismissed('2.0.0'), false);
    });

    it('4.2 Conexão travada (hanging socket) aborta no timeout configurado sem vazar promessa', async () => {
      const service = new UpdateCheckerService();

      globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => reject(new Error('Aborted by signal')));
          }
        });
      }) as any;

      const startTime = Date.now();
      const isReachable = await service.verifyUrlReachable('https://hanging-socket.ordo.test/app.apk', 80);
      const elapsed = Date.now() - startTime;

      assert.equal(isReachable, false, 'Deve retornar false quando a sonda expira por timeout');
      assert.ok(elapsed < 600, `Deveria resolver próximo ao timeout (80ms), demorou ${elapsed}ms`);
    });

    it('4.3 Matriz de códigos HTTP: valida range [200, 400) e 405 como acessíveis; 4xx e 5xx como inacessíveis', async () => {
      const service = new UpdateCheckerService();

      const expectations: Array<{ status: number; expected: boolean }> = [
        { status: 200, expected: true },
        { status: 204, expected: true },
        { status: 206, expected: true },
        { status: 301, expected: true },
        { status: 302, expected: true },
        { status: 304, expected: true },
        { status: 400, expected: false },
        { status: 401, expected: false },
        { status: 403, expected: false },
        { status: 404, expected: false },
        { status: 405, expected: true },
        { status: 410, expected: false },
        { status: 500, expected: false },
        { status: 502, expected: false },
        { status: 503, expected: false },
      ];

      for (const { status, expected } of expectations) {
        globalThis.fetch = async () => new Response(null, { status });
        const reachable = await service.verifyUrlReachable(`https://server.ordo.test/status/${status}`);
        assert.equal(
          reachable,
          expected,
          `Status HTTP ${status} deveria retornar ${expected}, mas retornou ${reachable}`
        );
      }
    });

    it('4.4 URLs degeneradas, esquemas não-HTTP e vazias retornam false sem disparar fetch', async () => {
      const service = new UpdateCheckerService();
      let fetchCalled = false;

      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response(null, { status: 200 });
      };

      const invalidUrls = [
        '',
        '   ',
        undefined as any,
        null as any,
        'ftp://ordo.org/app.apk',
        'file:///android_asset/app.apk',
        'javascript:alert(1)',
      ];

      for (const badUrl of invalidUrls) {
        fetchCalled = false;
        const reachable = await service.verifyUrlReachable(badUrl);
        assert.equal(reachable, false, `URL inválida deveria retornar false: ${badUrl}`);
        assert.equal(fetchCalled, false, `Fetch NÃO deve ser disparado para URL inválida: ${badUrl}`);
      }
    });

    it('4.5 openResilientApkDownload aciona fallback para releases caso APK e downloadUrl travem/falhem', async () => {
      const service = new UpdateCheckerService();

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('app.apk')) {
          if (init?.signal?.aborted) throw new Error('Aborted');
          return new Promise<Response>((_resolve, reject) => {
            if (init?.signal) {
              init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
            } else {
              reject(new Error('Network error'));
            }
          });
        }
        return new Response(null, { status: 404 });
      };

      const opened = await service.openResilientApkDownload(
        'https://server.ordo.test/timeout/app.apk',
        'https://server.ordo.test/404/download'
      );

      assert.equal(opened, true, 'openResilientApkDownload deve ter sucesso acionando fallback final para releases');
    });

    it('4.6 fetchRemoteManifest: trata 404s, HTML de erro e JSON incompleto', async () => {
      const service = new UpdateCheckerService(
        'https://server.ordo.test/version.json',
        'https://api.github.com/repos/Lecrepus17/OrdoCompanion/releases/latest'
      );

      // Cenário: ambos retornam 404
      globalThis.fetch = async () => new Response('Not Found', { status: 404 });
      const manifest404 = await service.fetchRemoteManifest();
      assert.equal(manifest404, null, 'Deve retornar null se ambas as fontes falharem');

      // Cenário: manifest retorna 500, mas GitHub API retorna release válida sem asset de APK
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('version.json')) {
          return new Response('Internal Server Error', { status: 500 });
        }
        return new Response(
          JSON.stringify({
            tag_name: 'v2.1.0',
            name: 'Ordo Companion 2.1.0',
            html_url: 'https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v2.1.0',
            published_at: '2026-11-07T00:00:00Z',
            body: '- Notas da versão',
            assets: [],
          }),
          { status: 200 }
        );
      };

      const manifestFallback = await service.fetchRemoteManifest();
      assert.ok(manifestFallback);
      assert.equal(manifestFallback?.version, '2.1.0');
      assert.equal(manifestFallback?.apkUrl, undefined);
      assert.equal(manifestFallback?.downloadUrl, 'https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v2.1.0');
    });
  });

  // =========================================================================
  // SUITE 5: SupportService Storage Corruption, Resilience & Capacity
  // =========================================================================
  describe('Suite 5: SupportService Storage Resilience & Backward Compatibility', () => {
    it('5.1 Corrupção total de string JSON é tratada e auto-reparada pelo serviço', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, '<<<INVALID_MALFORMED_JSON_CORRUPTED#404>>>');

      const historyCorrupted = await service.getTicketHistory();
      assert.deepEqual(historyCorrupted, [], 'Deve retornar [] seguro sob corrupção de JSON');

      await service.saveTicketToHistory({
        id: 'ticket_repaired_1',
        protocol: 'ORD-9999',
        title: 'Relato Pós Corrupção',
        description: 'Auto-reparo',
        category: 'bug',
        severity: 'high',
        status: 'saved_local',
        deliveryChannel: 'local',
        createdAt: new Date().toISOString(),
      });

      const repairedHistory = await service.getTicketHistory();
      assert.equal(repairedHistory.length, 1, 'Deve conter 1 item após o auto-reparo');
      assert.equal(repairedHistory[0].id, 'ticket_repaired_1');

      const rawInStorage = await AsyncStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
      assert.doesNotThrow(() => JSON.parse(rawInStorage!), 'O armazenamento deve ser um JSON válido');
    });

    it('5.2 Conteúdos JSON não-array retornam [] sem falha', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });
      const testNonArrays = ['{"foo": "bar"}', '"uma string"', '123456', 'true', 'null'];

      for (const nonArrayJson of testNonArrays) {
        await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, nonArrayJson);
        const result = await service.getTicketHistory();
        assert.deepEqual(result, [], `Deve retornar [] para payload não-array: ${nonArrayJson}`);
      }
    });

    it('5.3 Falha de I/O de escrita no AsyncStorage não interrompe o fluxo de submitTicketInApp', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      AsyncStorage.setItem = async () => {
        throw new Error('AsyncStorage I/O Error: DISK_FULL_OR_QUOTA_EXCEEDED');
      };

      globalThis.fetch = async () => {
        throw new Error('Sem rede');
      };

      const result = await service.submitTicketInApp({
        category: 'bug',
        severity: 'medium',
        title: 'Teste de I/O Failure',
        description: 'Não deve estourar exceção',
      });

      assert.equal(result.success, true, 'submitTicketInApp deve ter sucesso mesmo se AsyncStorage falhar');
      assert.ok(result.protocol.startsWith('ORD-'));
      assert.equal(result.deliveredRemotely, false);
      assert.equal(result.ticket.status, 'saved_local');
    });

    it('5.4 Histórico limita a capacidade a 30 itens e preserva os mais recentes no topo', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });
      await service.clearTicketHistory();

      for (let i = 1; i <= 40; i++) {
        await service.saveTicketToHistory({
          id: `ticket_${i}`,
          protocol: `ORD-${1000 + i}`,
          title: `Chamado #${i}`,
          description: `Descrição ${i}`,
          category: 'suggestion',
          status: 'saved_local',
          deliveryChannel: 'local',
          createdAt: new Date().toISOString(),
        });
      }

      const history = await service.getTicketHistory();
      assert.equal(history.length, 30, 'O histórico deve ser limitado a 30 registros');
      assert.equal(history[0].id, 'ticket_40', 'O item mais recente (#40) deve estar no topo');
      assert.equal(history[29].id, 'ticket_11', 'O item #11 é o 30º item mantido');
    });
  });

  // =========================================================================
  // SUITE 6: SupportService Adversarial Inputs, Anti-Spam & Concurrency
  // =========================================================================
  describe('Suite 6: SupportService Adversarial Inputs, Anti-Spam & Concurrency', () => {
    it('6.1 Textos com contagem extrema de caracteres são limitados e não estouram pilha', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      const extremePayload: SupportTicketPayload = {
        title: 'T'.repeat(10000), // 10k caracteres
        description: 'D'.repeat(100000), // 100k caracteres
        senderName: 'S'.repeat(5000),
        contactReturn: 'C'.repeat(5000),
        stepsToReproduce: 'P'.repeat(50000),
        category: 'bug',
        severity: 'high',
      };

      const result = await service.submitTicketInApp(extremePayload);
      assert.equal(result.success, true);
      assert.ok(result.protocol);

      const report = service.buildFormattedReport(extremePayload, result.protocol);
      assert.ok(report.length > 0);
      assert.ok(report.includes('Protocolo:'));
    });

    it('6.2 Sanitização anti-spam: neutraliza @everyone, @here e menções de cargo Discord', () => {
      const hostileInput = 'Atenção @everyone e @here! Veja isso: <@&9876543210> e <@!1234567890>';
      const sanitized = sanitizeDiscordText(hostileInput);

      assert.ok(!sanitized.includes('@everyone'), 'Não deve conter @everyone cru');
      assert.ok(!sanitized.includes('@here'), 'Não deve conter @here cru');
      assert.ok(sanitized.includes('＠everyone'), 'Deve substituir @ por ＠ fullwidth para impedir menção no Discord');
      assert.ok(sanitized.includes('＠here'));
      assert.ok(sanitized.includes('[menção removida]'), 'Menções de cargo e ID devem ser substituídas');
    });

    it('6.3 Caracteres especiais Unicode, RTL override, emojis e bytes nulos são tratados com segurança', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      const unicodePayload: SupportTicketPayload = {
        title: 'Relato 🧟‍♂️ RTL \u202Ereversed text\u202C e null \0 byte',
        description: 'Conteúdo em Japonês: 吾輩は猫である e Russo: Привет мир e Emojis: 🎲⚔️🔮🩸',
        category: 'rule_error',
        severity: 'low',
      };

      const result = await service.submitTicketInApp(unicodePayload);
      assert.equal(result.success, true);

      const history = await service.getTicketHistory();
      assert.ok(history[0].title.includes('Relato'));
      assert.ok(history[0].description.includes('吾輩は猫である'));
    });

    it('6.4 Envios concorrentes simultâneos (Promise.all) não causam corrupção no histórico', async () => {
      // Configura com cooldown de 0 para testar concorrência no storage
      const service = new SupportService({ rateLimitCooldownMs: 0 });
      await service.clearTicketHistory();

      const promises = Array.from({ length: 15 }, (_, i) =>
        service.submitTicketInApp({
          title: `Chamado Concorrente ${i}`,
          description: `Teste de concorrência ${i}`,
          category: 'suggestion',
        })
      );

      const results = await Promise.all(promises);
      assert.equal(results.length, 15);
      results.forEach((res) => {
        assert.equal(res.success, true);
        assert.ok(res.protocol.startsWith('ORD-'));
      });

      const history = await service.getTicketHistory();
      assert.ok(history.length >= 1 && history.length <= 15);
    });

    it('6.5 testWebhook valida URLs inválidas e trata falhas de conexão de forma graciosa', async () => {
      const service = new SupportService();

      // Webhook vazio
      const resEmpty = await service.testWebhook('');
      assert.equal(resEmpty.success, false);
      assert.ok(resEmpty.message.includes('Nenhum Webhook'));

      // Webhook com URL não-Discord
      const resInvalid = await service.testWebhook('https://malicious-site.test/webhook');
      assert.equal(resInvalid.success, false);
      assert.ok(resInvalid.message.includes('URL inválida'));

      // Webhook que retorna 404
      globalThis.fetch = async () => new Response(null, { status: 404 });
      const res404 = await service.testWebhook('https://discord.com/api/webhooks/123/abc');
      assert.equal(res404.success, false);
      assert.ok(res404.message.includes('404'));

      // Webhook que estoura falha de rede
      globalThis.fetch = async () => {
        throw new Error('ECONNREFUSED');
      };
      const resNetErr = await service.testWebhook('https://discord.com/api/webhooks/123/abc');
      assert.equal(resNetErr.success, false);
      assert.ok(resNetErr.message.includes('Falha na conexão'));
    });
  });
});
