import './setup';
import React from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler } from 'react-native';
import {
  SupportService,
  SUPPORT_TICKETS_STORAGE_KEY,
} from '../src/services/support/SupportService';
import {
  UpdateCheckerService,
  GITHUB_RELEASES_PAGE_URL,
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

describe('CHALLENGER M1.2: Empirical Stress & Backward Compatibility (m1EdgeCaseCompatibility.test.tsx)', () => {
  const originalFetch = globalThis.fetch;
  const originalSetItem = AsyncStorage.setItem;

  beforeEach(async () => {
    resetMockStorage();
    await cleanup();
    globalThis.fetch = originalFetch;
    AsyncStorage.setItem = originalSetItem;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    AsyncStorage.setItem = originalSetItem;
    await cleanup();
  });

  // =========================================================================
  // SUITE 1: oauthredirect.tsx Platform Parity, Timers & Hardware BackHandler
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
        setMobilePlatform('web');
      }
    });
  });

  // =========================================================================
  // SUITE 2: SupportService.ts Storage Corruption, Resilience & Volume Cap
  // =========================================================================
  describe('Suite 2: SupportService.ts Storage Corruption & Backward Compatibility', () => {
    it('2.1 Corrupção total de string JSON é tratada e auto-reparada pelo serviço', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      // Simula corrupção de disco / string inválida no AsyncStorage
      await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, '<<<INVALID_MALFORMED_JSON_CORRUPTED#404>>>');

      // Leitura não quebra, retorna lista vazia segura
      const historyCorrupted = await service.getTicketHistory();
      assert.deepEqual(historyCorrupted, [], 'Deve retornar [] seguro sob corrupção de JSON');

      // Salva novo chamado: deve auto-reparar o armazenamento
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

      // Verifica se o JSON no AsyncStorage foi restaurado como válido
      const rawInStorage = await AsyncStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
      assert.doesNotThrow(() => JSON.parse(rawInStorage!), 'O armazenamento deve ser um JSON válido');
    });

    it('2.2 Conteúdos JSON não-array (objeto, número, string, null) retornam [] sem falha', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      const testNonArrays = [
        '{"foo": "bar"}', // Objeto em vez de array
        '"apenas uma string"', // String
        '123456', // Número
        'true', // Booleano
        'null', // Null
      ];

      for (const nonArrayJson of testNonArrays) {
        await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, nonArrayJson);
        const result = await service.getTicketHistory();
        assert.deepEqual(result, [], `Deve retornar [] para payload não-array: ${nonArrayJson}`);
      }
    });

    it('2.3 Falha de I/O de escrita no AsyncStorage não interrompe o fluxo de submitTicketInApp', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      // Simula falha catastrófica de escrita (disco cheio / permissão negada)
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

      assert.equal(result.success, true, 'submitTicketInApp deve ter sucesso mesmo se AsyncStorage.setItem falhar');
      assert.ok(result.protocol.startsWith('ORD-'));
      assert.equal(result.deliveredRemotely, false);
      assert.equal(result.ticket.status, 'saved_local');
    });

    it('2.4 Histórico limita a capacidade a 30 itens e preserva os mais recentes no topo', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });
      await service.clearTicketHistory();

      // Adiciona 40 chamados sucessivos
      for (let i = 1; i <= 40; i++) {
        await service.saveTicketToHistory({
          id: `ticket_${i}`,
          protocol: `ORD-${1000 + i}`,
          title: `Chamado #${i}`,
          description: `Descrição do chamado ${i}`,
          category: 'suggestion',
          status: 'saved_local',
          deliveryChannel: 'local',
          createdAt: new Date().toISOString(),
        });
      }

      const history = await service.getTicketHistory();
      assert.equal(history.length, 30, 'O histórico deve ser rigorosamente limitado a 30 registros');
      assert.equal(history[0].id, 'ticket_40', 'O item mais recente (#40) deve estar no índice 0');
      assert.equal(history[29].id, 'ticket_11', 'O item mais antigo preservado deve ser o #11 (1-10 foram descartados)');
    });

    it('2.5 Compatibilidade reversa com chamados antigos sem propriedades novas', async () => {
      const service = new SupportService({ rateLimitCooldownMs: 0 });

      // Simula formato de v1.0.0 (sem status, deliveryChannel, diagnostics, payload)
      const legacyTickets = [
        {
          id: 'legacy_1',
          protocol: 'ORD-1001',
          title: 'Chamado Antigo da v1.0.0',
          description: 'Não possuía deliveryChannel',
          category: 'bug',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];

      await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(legacyTickets));

      const loaded = await service.getTicketHistory();
      assert.equal(loaded.length, 1);
      assert.equal(loaded[0].id, 'legacy_1');
      assert.equal(loaded[0].title, 'Chamado Antigo da v1.0.0');

      // buildFormattedReport não quebra com tickets legados
      const report = service.buildFormattedReport(loaded[0] as any, loaded[0].protocol);
      assert.ok(report.includes('Chamado Antigo da v1.0.0'));
      assert.ok(report.includes('ORD-1001'));

      // Aliases de compatibilidade
      const aliasResult = await service.getTicketsHistory();
      assert.equal(aliasResult.length, 1);
      assert.equal(service.config.discordHandle, 'lecrepus17');
      assert.equal(service.getConfig().discordHandle, 'lecrepus17');
    });
  });

  // =========================================================================
  // SUITE 3: verifyUrlReachable Hanging Sockets, Timeouts & Status Code Matrix
  // =========================================================================
  describe('Suite 3: verifyUrlReachable Hanging Sockets, Timeouts & Rejection Safety', () => {
    it('3.1 Conexão travada (hanging socket) aborta no timeout configurado sem vazar promessa', async () => {
      const service = new UpdateCheckerService();

      // Sockets que nunca respondem, mas respeitam o AbortSignal da sonda
      globalThis.fetch = ((url: any, options: any) => {
        return new Promise<Response>((_resolve, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      }) as any;

      const startTime = Date.now();
      const isReachable = await service.verifyUrlReachable('https://hanging-socket.ordo.test/app.apk', 80);
      const elapsed = Date.now() - startTime;

      assert.equal(isReachable, false, 'Deve retornar false quando a sonda expira por timeout');
      assert.ok(elapsed < 400, `Deveria resolver próximo ao timeout (80ms), demorou ${elapsed}ms`);
    });

    it('3.2 Erro de rede abrupto (TypeError / ECONNRESET) não causa UnhandledPromiseRejection', async () => {
      const service = new UpdateCheckerService();

      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch: network socket reset');
      };

      await assert.doesNotReject(async () => {
        const reachable = await service.verifyUrlReachable('https://unstable-connection.ordo.test/app.apk', 500);
        assert.equal(reachable, false);
      }, 'Não deve lançar erro não tratado em caso de falha de socket');
    });

    it('3.3 Matriz de códigos HTTP: valida range [200, 400) e 405 como acessíveis; 4xx e 5xx como inacessíveis', async () => {
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
        { status: 405, expected: true }, // Servidores que barram HEAD mas o recurso existe
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

    it('3.4 URLs degeneradas, esquemas não-HTTP e vazias retornam false imediatamente sem chamar fetch', async () => {
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
        'intent://ordo/#Intent;scheme=ordo;end',
        'content://media/external/downloads',
      ];

      for (const badUrl of invalidUrls) {
        fetchCalled = false;
        const reachable = await service.verifyUrlReachable(badUrl);
        assert.equal(reachable, false, `URL inválida deveria retornar false: ${badUrl}`);
        assert.equal(fetchCalled, false, `Fetch NÃO deve ser disparado para URL inválida: ${badUrl}`);
      }
    });

    it('3.5 openResilientApkDownload aciona fallback para releases caso APK e downloadUrl travem/falhem', async () => {
      const service = new UpdateCheckerService();

      // APK trava mas obedece abort; downloadUrl dá 404
      globalThis.fetch = ((input: RequestInfo | URL, options: any) => {
        const url = String(input);
        if (url.includes('app.apk')) {
          return new Promise<Response>((_resolve, reject) => {
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const err = new Error('The operation was aborted');
                err.name = 'AbortError';
                reject(err);
              });
            }
          });
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      }) as any;

      const opened = await service.openResilientApkDownload(
        'https://server.ordo.test/timeout/app.apk',
        'https://server.ordo.test/404/download'
      );

      assert.equal(opened, true, 'openResilientApkDownload deve ter sucesso acionando fallback final para releases');
    });
  });
});
