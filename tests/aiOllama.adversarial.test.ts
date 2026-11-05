import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'module';
import { Platform } from 'react-native';
import { AiConfig } from '../src/types/ai';

// Objeto singleton compartilhado para simular expo-constants em tempo de teste
export const sharedConstants: {
  expoConfig: { extra: Record<string, any>; hostUri?: string };
  manifest: Record<string, any>;
  manifest2?: {
    extra?: {
      expoGo?: { debuggerHost?: string; hostUri?: string };
      expoClient?: { hostUri?: string };
    };
  };
  platform: { web: Record<string, any> };
} = {
  expoConfig: { extra: {} },
  manifest: {},
  platform: { web: {} },
};

// Intercepta require('expo-constants') com __esModule: true para que o default import aponte diretamente para sharedConstants
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'expo-constants') {
    return {
      __esModule: true,
      default: sharedConstants,
    };
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments as unknown as [id: string]);
};

test('ADVERSARIAL CHALLENGE — Ollama Endpoint Resolution & Android Loopback Mapping', async (t) => {
  // Importação dinâmica do AiClient para garantir que ele capture o require interceptado de expo-constants
  const {
    resolveOllamaEndpoint,
    getDevServerHostIp,
    testAiConnection,
  } = await import('../src/services/ai/AiClient');

  const originalPlatformOS = Platform.OS;

  function setPlatformOS(os: 'android' | 'ios' | 'web') {
    Object.defineProperty(Platform, 'OS', {
      value: os,
      configurable: true,
      writable: true,
    });
  }

  function restorePlatformOS() {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatformOS,
      configurable: true,
      writable: true,
    });
  }

  await t.test('1. Default / Empty endpoints on Android vs Web', () => {
    try {
      // Teste no Android sem host do dev server configurado
      setPlatformOS('android');
      assert.equal(
        resolveOllamaEndpoint(),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Endpoint indefinido no Android deve apontar para o gateway do emulador 10.0.2.2:11434'
      );
      assert.equal(
        resolveOllamaEndpoint(''),
        'http://10.0.2.2:11434/v1/chat/completions',
        'String vazia no Android deve apontar para 10.0.2.2:11434'
      );
      assert.equal(
        resolveOllamaEndpoint('   '),
        'http://10.0.2.2:11434/v1/chat/completions',
        'String de espaços no Android deve ser tratada como vazia e apontar para 10.0.2.2:11434'
      );

      // Teste na Web / iOS
      setPlatformOS('web');
      assert.equal(
        resolveOllamaEndpoint(),
        'http://localhost:11434/v1/chat/completions',
        'Endpoint indefinido na Web deve apontar para localhost:11434'
      );
      assert.equal(
        resolveOllamaEndpoint(''),
        'http://localhost:11434/v1/chat/completions',
        'String vazia na Web deve apontar para localhost:11434'
      );

      setPlatformOS('ios');
      assert.equal(
        resolveOllamaEndpoint(),
        'http://localhost:11434/v1/chat/completions',
        'Endpoint indefinido no iOS deve apontar para localhost:11434'
      );
    } finally {
      restorePlatformOS();
    }
  });

  await t.test('2. Mapeamento de loopback (localhost e 127.0.0.1) para 10.0.2.2 no Android', () => {
    try {
      setPlatformOS('android');

      // Sem protocolo explícito
      assert.equal(
        resolveOllamaEndpoint('localhost:11434'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'localhost:11434 deve receber http:// e mapear para 10.0.2.2:11434'
      );
      assert.equal(
        resolveOllamaEndpoint('127.0.0.1:11434'),
        'http://10.0.2.2:11434/v1/chat/completions',
        '127.0.0.1:11434 deve receber http:// e mapear para 10.0.2.2:11434'
      );

      // Com protocolo http://
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'http://localhost:11434 deve mapear para http://10.0.2.2:11434/v1/chat/completions'
      );
      assert.equal(
        resolveOllamaEndpoint('http://127.0.0.1:11434'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'http://127.0.0.1:11434 deve mapear para http://10.0.2.2:11434/v1/chat/completions'
      );

      // Porta personalizada
      assert.equal(
        resolveOllamaEndpoint('http://localhost:8080'),
        'http://10.0.2.2:8080/v1/chat/completions',
        'Porta arbitrária em localhost deve ser preservada'
      );
      assert.equal(
        resolveOllamaEndpoint('http://127.0.0.1:9000'),
        'http://10.0.2.2:9000/v1/chat/completions',
        'Porta arbitrária em 127.0.0.1 deve ser preservada'
      );

      // Protocolo seguro https://
      assert.equal(
        resolveOllamaEndpoint('https://localhost:11434'),
        'https://10.0.2.2:11434/v1/chat/completions',
        'https:// deve ser mantido intacto'
      );

      // Caixa alta/baixa (Case-insensitivity)
      assert.equal(
        resolveOllamaEndpoint('HTTP://LOCALHOST:11434'),
        'HTTP://10.0.2.2:11434/v1/chat/completions',
        'HTTP://LOCALHOST deve substituir o host case-insensitively'
      );
    } finally {
      restorePlatformOS();
    }
  });

  await t.test('3. Não-modificação de IPs externos ou LAN no Android', () => {
    try {
      setPlatformOS('android');

      // IP de rede local típica (Wi-Fi)
      assert.equal(
        resolveOllamaEndpoint('http://192.168.1.50:11434'),
        'http://192.168.1.50:11434/v1/chat/completions',
        'IP de LAN 192.168.1.50 NÃO deve ser alterado no Android'
      );
      assert.equal(
        resolveOllamaEndpoint('192.168.0.10:11434'),
        'http://192.168.0.10:11434/v1/chat/completions',
        '192.168.0.10 sem protocolo deve receber http:// e manter IP intacto'
      );
      assert.equal(
        resolveOllamaEndpoint('http://10.0.0.5:11434'),
        'http://10.0.0.5:11434/v1/chat/completions',
        'IP de sub-rede 10.0.0.5 NÃO deve ser confundido com loopback'
      );
      assert.equal(
        resolveOllamaEndpoint('http://10.0.2.2:11434'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'IP explícito de emulador 10.0.2.2 deve ser mantido'
      );
      assert.equal(
        resolveOllamaEndpoint('https://ollama.mycorp.org:11434'),
        'https://ollama.mycorp.org:11434/v1/chat/completions',
        'FQDN externo não deve ser alterado'
      );
    } finally {
      restorePlatformOS();
    }
  });

  await t.test('4. Não-modificação de loopback em plataformas Web e iOS', () => {
    try {
      setPlatformOS('web');
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434'),
        'http://localhost:11434/v1/chat/completions',
        'Na Web, localhost DEVE permanecer localhost'
      );
      assert.equal(
        resolveOllamaEndpoint('http://127.0.0.1:11434'),
        'http://127.0.0.1:11434/v1/chat/completions',
        'Na Web, 127.0.0.1 DEVE permanecer 127.0.0.1'
      );

      setPlatformOS('ios');
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434'),
        'http://localhost:11434/v1/chat/completions',
        'No iOS, localhost DEVE permanecer localhost'
      );
      assert.equal(
        resolveOllamaEndpoint('http://127.0.0.1:11434'),
        'http://127.0.0.1:11434/v1/chat/completions',
        'No iOS, 127.0.0.1 DEVE permanecer 127.0.0.1'
      );
    } finally {
      restorePlatformOS();
    }
  });

  await t.test('5. Resolução e normalização de rotas (/v1, /api/chat, /v1/chat/completions e barras finais)', () => {
    try {
      setPlatformOS('android');

      // Rota OpenAI v1 sem chat/completions
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434/v1'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Rota /v1 deve virar /v1/chat/completions sem duplicar /v1'
      );
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434/v1/'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Rota /v1/ com barra final deve remover barra e virar /v1/chat/completions'
      );

      // Rota OpenAI completa já existente
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434/v1/chat/completions'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Rota /v1/chat/completions já existente NÃO deve ser duplicada'
      );
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434/v1/chat/completions/'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Rota /v1/chat/completions/ com barra final deve ser higienizada'
      );

      // Rota nativa do Ollama (/api/chat)
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434/api/chat'),
        'http://10.0.2.2:11434/api/chat',
        'Rota nativa /api/chat deve ser mantida intacta sem anexar /v1/chat/completions'
      );
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434/api/chat/'),
        'http://10.0.2.2:11434/api/chat',
        'Rota nativa /api/chat/ com barras finais deve ser normalizada para /api/chat'
      );

      // Múltiplas barras finais
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434////'),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Múltiplas barras finais no host devem ser tratadas'
      );
    } finally {
      restorePlatformOS();
    }
  });

  await t.test('6. Detecção dinâmica do IP da máquina de desenvolvimento (getDevServerHostIp)', () => {
    try {
      setPlatformOS('android');

      // Teste A: via manifest2.extra.expoGo.debuggerHost
      sharedConstants.manifest2 = {
        extra: {
          expoGo: {
            debuggerHost: '192.168.1.185:8081',
          },
        },
      };

      let detectedIp = getDevServerHostIp();
      assert.equal(detectedIp, '192.168.1.185', 'Deve extrair o IP limpo do debuggerHost');

      // Com o IP detectado, resolveOllamaEndpoint deve priorizar esse IP em vez do fallback 10.0.2.2
      assert.equal(
        resolveOllamaEndpoint('http://localhost:11434'),
        'http://192.168.1.185:11434/v1/chat/completions',
        'Quando devHost existe, localhost deve ser mapeado para o IP da máquina do dev'
      );

      // Teste B: via manifest2.extra.expoClient.hostUri
      sharedConstants.manifest2 = {
        extra: {
          expoClient: {
            hostUri: '10.0.0.42:19000/app',
          },
        },
      };
      detectedIp = getDevServerHostIp();
      assert.equal(detectedIp, '10.0.0.42', 'Deve extrair IP do expoClient.hostUri');

      // Teste C: via Constants.expoConfig.hostUri
      sharedConstants.manifest2 = undefined;
      sharedConstants.expoConfig.hostUri = '172.16.0.99:8081';
      detectedIp = getDevServerHostIp();
      assert.equal(detectedIp, '172.16.0.99', 'Deve extrair IP do expoConfig.hostUri');

      // Teste D: se o debuggerHost for localhost ou 127.0.0.1, deve ignorar e retornar vazio
      sharedConstants.expoConfig.hostUri = 'localhost:8081';
      assert.equal(getDevServerHostIp(), '', 'Deve ignorar localhost como dev server host IP');
      sharedConstants.expoConfig.hostUri = '127.0.0.1:8081';
      assert.equal(getDevServerHostIp(), '', 'Deve ignorar 127.0.0.1 como dev server host IP');

      // Limpeza do sharedConstants
      sharedConstants.expoConfig.hostUri = undefined;
      sharedConstants.manifest2 = undefined;
    } finally {
      restorePlatformOS();
    }
  });

  await t.test('7. testAiConnection com provedor Ollama (comunicação sem apiKey e ping em /api/tags)', async () => {
    const originalFetch = globalThis.fetch;

    try {
      setPlatformOS('android');

      let fetchedUrls: string[] = [];

      // Mock de fetch simulando resposta bem-sucedida de /api/tags
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlStr = String(input);
        fetchedUrls.push(urlStr);

        if (urlStr.endsWith('/api/tags')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              models: [{ name: 'llama3.3:latest' }, { name: 'mistral:latest' }],
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
        } as Response;
      };

      const config: AiConfig = {
        provider: 'ollama',
        apiKey: '', // Sem chave de API! Ollama é local
        model: 'llama3.3',
        endpoint: 'http://localhost:11434',
        temperature: 0.4,
        relicPersona: 'none',
        offlineFallback: false,
      };

      const result = await testAiConnection(config);

      assert.equal(result.success, true, 'testAiConnection deve retornar sucesso para Ollama mesmo sem apiKey');
      assert.ok(
        result.message.includes("Modelo 'llama3.3' pronto!"),
        `Mensagem deve indicar que o modelo foi encontrado. Mensagem real: ${result.message}`
      );
      assert.ok(
        fetchedUrls.some((u) => u === 'http://10.0.2.2:11434/api/tags'),
        'Fetch deve ter chamado /api/tags no host resolvido 10.0.2.2:11434'
      );
    } finally {
      globalThis.fetch = originalFetch;
      restorePlatformOS();
    }
  });

  await t.test('8. testAiConnection com fallback para completions quando /api/tags falha', async () => {
    const originalFetch = globalThis.fetch;

    try {
      setPlatformOS('android');

      let tagsCalled = false;
      let completionsCalled = false;

      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlStr = String(input);

        if (urlStr.endsWith('/api/tags')) {
          tagsCalled = true;
          // Simula falha ou endpoint não-nativo
          return {
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not Found' }),
          } as Response;
        }

        if (urlStr.endsWith('/v1/chat/completions')) {
          completionsCalled = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
          } as Response;
        }

        return { ok: false, status: 500 } as Response;
      };

      const config: AiConfig = {
        provider: 'ollama',
        apiKey: '',
        model: 'llama3.3',
        endpoint: 'http://localhost:11434',
        temperature: 0.4,
        relicPersona: 'none',
        offlineFallback: false,
      };

      const result = await testAiConnection(config);

      assert.equal(tagsCalled, true, '/api/tags deve ter sido tentado primeiro');
      assert.equal(completionsCalled, true, 'Fallback para completions deve ter sido acionado');
      assert.equal(result.success, true, 'Conexão deve ser aprovada via completions fallback');
    } finally {
      globalThis.fetch = originalFetch;
      restorePlatformOS();
    }
  });

  await t.test('9. testAiConnection falha com dica de cleartext e IP no Android', async () => {
    const originalFetch = globalThis.fetch;

    try {
      setPlatformOS('android');

      // Simula erro de rede/socket (ex: host inacessível)
      globalThis.fetch = async (): Promise<Response> => {
        throw new Error('Network request failed');
      };

      const config: AiConfig = {
        provider: 'ollama',
        apiKey: '',
        model: 'llama3.3',
        endpoint: 'http://localhost:11434',
        temperature: 0.4,
        relicPersona: 'none',
        offlineFallback: false,
      };

      const result = await testAiConnection(config);

      assert.equal(result.success, false, 'Deve retornar insucesso quando conexão física falha');
      assert.ok(
        result.message.includes('No Android, use o IP da máquina na rede Wi-Fi'),
        'Mensagem de erro no Android deve orientar o usuário sobre o IP na rede Wi-Fi'
      );
      assert.ok(
        result.message.includes('usesCleartextTraffic'),
        'Mensagem de erro deve alertar sobre usesCleartextTraffic'
      );
    } finally {
      globalThis.fetch = originalFetch;
      restorePlatformOS();
    }
  });

  await t.test('10. Edge cases adversariais: whitespace, entradas sem porta e FQDN', () => {
    try {
      setPlatformOS('android');

      // Espaços laterais
      assert.equal(
        resolveOllamaEndpoint('   http://localhost:11434   '),
        'http://10.0.2.2:11434/v1/chat/completions',
        'Espaços em branco laterais devem ser eliminados'
      );

      // IP sem porta especificada
      assert.equal(
        resolveOllamaEndpoint('192.168.1.50'),
        'http://192.168.1.50/v1/chat/completions',
        'IP sem porta deve manter o host e anexar /v1/chat/completions'
      );

      // FQDN com porta e subcaminho /v1
      assert.equal(
        resolveOllamaEndpoint('https://ollama.internal.net:8443/v1'),
        'https://ollama.internal.net:8443/v1/chat/completions',
        'FQDN HTTPS com /v1 deve virar /v1/chat/completions'
      );
    } finally {
      restorePlatformOS();
    }
  });
});
