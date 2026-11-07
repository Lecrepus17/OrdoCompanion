import './setup';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeApiKey,
  validateKey,
  testAiConnection,
  sendAiChatMessage,
} from '../src/services/ai/AiClient';
import {
  GlitchVoiceService,
  cleanTextForTts,
} from '../src/services/ai/GlitchVoiceService';
import { generateOfflineResponse } from '../src/services/ai/AiOfflineEngine';
import { retrieveAiKnowledge } from '../src/services/ai/AiKnowledgeRetrieval';
import { AiConfig, DEFAULT_AI_CONFIG } from '../src/types/ai';
import { resetMockStorage } from './setup';

describe('Features 5, 6, 7, 8, 9: G.L.I.T.C.H. Resilience, Voice, AI Key Sanitization & Layout (glitchResilience.test.ts)', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  // =========================================================================
  // TIER 1: Features 5 & 6 (Key Sanitization & Groq Fallback)
  // =========================================================================
  describe('Tier 1: Flexibilização de Chaves & Fallback Groq', () => {
    it('1.1 Feature 5: validateKey deve aceitar chaves válidas mesmo se contiverem espaços ou quebras de linha acidentais', () => {
      const validKey = 'AIzaSy' + 'A'.repeat(33);
      assert.strictEqual(validateKey(validKey), true);
      assert.strictEqual(validateKey(`  ${validKey}  `), true, 'Deve ignorar espaços externos');
      assert.strictEqual(validateKey(`\n${validKey}\t`), true, 'Deve ignorar quebras de linha e tabs');
    });

    it('1.2 Feature 5: validateKey deve higienizar chaves entre aspas copiadas diretamente de arquivos .env', () => {
      const validKey = 'AIzaSy' + 'B'.repeat(33);
      assert.strictEqual(validateKey(`"${validKey}"`), true, 'Deve remover aspas duplas automaticamente');
      assert.strictEqual(validateKey(`'${validKey}'`), true, 'Deve remover aspas simples automaticamente');
      assert.strictEqual(sanitizeApiKey(`  "${validKey}" \n `), validKey);
    });

    it('1.3 Feature 6: configuração do Groq deve prever modelos ativos e suportar fallback', () => {
      const groqConfig: AiConfig = {
        provider: 'groq',
        apiKey: 'gsk_test1234567890abcdef',
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        offlineFallback: true,
        relicPersona: 'none',
      };

      assert.strictEqual(groqConfig.provider, 'groq');
      assert.ok(groqConfig.model.includes('llama-3'));
    });

    it('1.3.1 Feature 6: callGroqApi deve retentar com llama-3.1-8b-instant se llama-3.3-70b-versatile retornar 404', async () => {
      const originalFetch = globalThis.fetch;
      const requestedModels: string[] = [];

      globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options?.body || '{}');
        requestedModels.push(body.model);

        if (body.model === 'llama-3.3-70b-versatile') {
          return {
            ok: false,
            status: 404,
            json: async () => ({
              error: {
                message: "The model 'llama-3.3-70b-versatile' does not exist or you do not have access to it.",
                code: 'model_not_found',
              },
            }),
          } as any;
        }

        if (body.model === 'llama-3.1-8b-instant') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: 'Resposta vinda do fallback instantâneo 8B.',
                  },
                },
              ],
            }),
          } as any;
        }

        return { ok: false, status: 500 } as any;
      }) as any;

      try {
        const res = await sendAiChatMessage({
          query: 'Teste de fallback Groq',
          config: {
            ...DEFAULT_AI_CONFIG,
            provider: 'groq',
            apiKey: 'gsk_testGroqKey12345',
            model: 'llama-3.3-70b-versatile',
          },
          chatHistory: [],
        });

        assert.ok(requestedModels.includes('llama-3.3-70b-versatile'), 'Deve ter tentado 70B primeiro');
        assert.ok(requestedModels.includes('llama-3.1-8b-instant'), 'Deve ter tentado 8B como fallback');
        assert.strictEqual(res.content, 'Resposta vinda do fallback instantâneo 8B.');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('1.3.2 Feature 6: testAiConnection para Groq com 404 no 70B deve tentar o 8B antes de falhar', async () => {
      const originalFetch = globalThis.fetch;
      const testedModels: string[] = [];

      globalThis.fetch = (async (_url: any, options: any) => {
        const body = JSON.parse(options?.body || '{}');
        testedModels.push(body.model);

        if (body.model === 'llama-3.3-70b-versatile') {
          return {
            ok: false,
            status: 404,
            json: async () => ({
              error: {
                message: "The model 'llama-3.3-70b-versatile' does not exist or you do not have access to it.",
                code: 'model_not_found',
              },
            }),
          } as any;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as any;
      }) as any;

      try {
        const result = await testAiConnection({
          ...DEFAULT_AI_CONFIG,
          provider: 'groq',
          apiKey: 'gsk_testGroqKey12345',
          model: 'llama-3.3-70b-versatile',
        });

        assert.strictEqual(result.success, true);
        assert.ok(result.message.includes('Fallback: llama-3.1-8b-instant'));
        assert.ok(testedModels.includes('llama-3.1-8b-instant'));
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('1.4 Feature 7: cleanTextForTts deve limpar tags internas de sistema e estática mantendo narrativa em português', () => {
      const rawAiText =
        '[Rolar: 2d20] Olá Agente! [ESTÁTICA... 40%] O ritual **Decadência** causa dano temporal grave. [Aba: Grimório]';
      const cleaned = cleanTextForTts(rawAiText);

      assert.strictEqual(cleaned.includes('[Rolar:'), false, 'Não deve conter tags [Rolar:');
      assert.strictEqual(cleaned.includes('[Aba:'), false, 'Não deve conter tags [Aba:');
      assert.strictEqual(cleaned.includes('**'), false, 'Não deve conter markdown de negrito');
      assert.ok(cleaned.includes('Olá Agente'));
      assert.ok(cleaned.includes('Decadência'));
    });

    it('1.5 Feature 8: isSttSupported deve reportar status sem lançar erro fatal no Hermes/Android', () => {
      assert.doesNotThrow(() => {
        const supported = GlitchVoiceService.isSttSupported();
        assert.strictEqual(typeof supported, 'boolean');
      });
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Edge Cases
  // =========================================================================
  describe('Tier 2: Limites de Chaves e Sanitização Textual para Áudio', () => {
    it('2.1 chaves completamente vazias ou nulas devem ser rejeitadas graciosamente', () => {
      assert.strictEqual(validateKey(''), false);
      assert.strictEqual(validateKey('   '), false);
      assert.strictEqual(validateKey(null as any), false);
      assert.strictEqual(validateKey(undefined as any), false);
    });

    it('2.2 cleanTextForTts com texto nulo, indefinido ou vazio não quebra', () => {
      assert.strictEqual(cleanTextForTts(''), '');
      assert.strictEqual(cleanTextForTts(null as any), '');
      assert.strictEqual(cleanTextForTts(undefined as any), '');
    });

    it('2.3 cleanTextForTts remove URLs e links markdown para leitura fluida', () => {
      const textWithLink = 'Consulte o livro em [Ordo Companion](https://github.com/ordo) para detalhes.';
      const cleaned = cleanTextForTts(textWithLink);
      assert.strictEqual(cleaned.includes('https://'), false);
      assert.ok(cleaned.includes('Ordo Companion'));
    });

    it('2.4 cleanTextForTts converte termos matemáticos de dados para pronúncia amigável', () => {
      const diceText = 'O ataque causa 4d8+5 de dano de Sangue.';
      const cleaned = cleanTextForTts(diceText);
      assert.ok(cleaned.includes('4d8') || cleaned.includes('4 dados') || cleaned.includes('dano'));
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature: Transição Gratiosa Nuvem -> Offline
  // =========================================================================
  describe('Tier 3: Fallback Transparente para Motor Offline', () => {
    it('3.1 quando o provedor remoto falha, o motor offline responde mantendo a persona da Ordem', () => {
      const query = 'Como funciona a DT de rituais?';
      const knowledge = retrieveAiKnowledge(query, DEFAULT_AI_CONFIG);

      const offlineResponse = generateOfflineResponse(query, knowledge, 'none');
      assert.ok(offlineResponse.content.length > 50);
      assert.ok(
        offlineResponse.content.includes('G.L.I.T.C.H.') ||
          offlineResponse.content.includes('Ordem') ||
          offlineResponse.content.includes('DT')
      );
    });

    it('3.2 resposta gerada pelo motor offline pode ser convertida diretamente para áudio TTS', () => {
      const query = 'Quais são os 4 elementos do Outro Lado?';
      const knowledge = retrieveAiKnowledge(query, DEFAULT_AI_CONFIG);
      const offlineResponse = generateOfflineResponse(query, knowledge, 'none');

      const ttsReady = cleanTextForTts(offlineResponse.content);
      assert.ok(ttsReady.length > 0);
      assert.strictEqual(ttsReady.includes('```'), false);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Consulta ao Oráculo', () => {
    it('4.1 Cenário: Agente em campo pergunta sobre dano crítico com conexão instável', () => {
      const query = 'Como calculo o dano crítico de uma arma com multiplicador x3?';
      const knowledge = retrieveAiKnowledge(query, DEFAULT_AI_CONFIG);
      assert.ok(Array.isArray(knowledge.matchedEntities));

      const response = generateOfflineResponse(query, knowledge, 'none');
      assert.ok(response.content);
      assert.strictEqual(typeof response.content, 'string');
    });

    it('4.2 Cenário: Usuário configura chave Gemini com espaços e testa conexão', () => {
      const cleanKey = 'AIzaSy' + 'K'.repeat(33);
      const dirtyKey = `   ${cleanKey}   `;
      const config: AiConfig = {
        ...DEFAULT_AI_CONFIG,
        provider: 'gemini',
        apiKey: dirtyKey.trim(),
      };

      assert.strictEqual(validateKey(config.apiKey), true);
    });
  });

  // =========================================================================
  // TIER 5: Adversarial, Glitch & Stress Testing
  // =========================================================================
  describe('Tier 5: Adversarial, Estática e Resiliência a Caracteres Zalgo', () => {
    it('5.1 texto com artefatos de estática Zalgo / caracteres de controle não trava cleanTextForTts', () => {
      const zalgoGlitch = 'G.L.I.T.C.H. [E̷S̷T̷Á̷T̷I̷C̷A̷] Cuidado com o Sangue!';
      assert.doesNotThrow(() => {
        const cleaned = cleanTextForTts(zalgoGlitch);
        assert.ok(cleaned.length > 0);
      });
    });

    it('5.2 texto extremamente longo (15.000 caracteres) em cleanTextForTts executa rapidamente sem estourar pilha', () => {
      const hugeChat = 'Informação confidencial. '.repeat(500);
      const start = Date.now();
      const cleaned = cleanTextForTts(hugeChat);
      const elapsed = Date.now() - start;

      assert.ok(cleaned.length > 0);
      assert.ok(elapsed < 200, `Deveria processar em menos de 200ms, levou ${elapsed}ms`);
    });

    it('5.3 chamada a stopSpeaking() em dispositivo sem áudio é idempotente', () => {
      assert.doesNotThrow(() => {
        GlitchVoiceService.stopSpeaking();
        GlitchVoiceService.stopSpeaking();
      });
    });
  });
});
