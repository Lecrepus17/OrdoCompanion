import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setMobilePlatform } from './setup';
import { cleanTextForTts, GlitchVoiceService } from '../src/services/ai/GlitchVoiceService';

describe('G.L.I.T.C.H. - Serviço de Voz e Comunicação Tática (GlitchVoiceService.ts)', () => {
  test('cleanTextForTts deve remover tags internas do sistema', () => {
    const raw = 'O ritual [Ritual: Cicatrização] recupera PV [Aba: spells] com sucesso.';
    const cleaned = cleanTextForTts(raw);
    assert.equal(cleaned, 'O ritual recupera PV com sucesso.');
  });

  test('cleanTextForTts deve limpar markdown (cabeçalhos, negrito, itálico, listas)', () => {
    const raw = `### Análise Tática
**Alerta:** O monstro possui *Resistência a Sangue*.
• Custo: 2 PE
• Ação: Padrão
> Citação do livro de regras`;

    const cleaned = cleanTextForTts(raw);
    assert.ok(!cleaned.includes('###'));
    assert.ok(!cleaned.includes('**'));
    assert.ok(!cleaned.includes('*'));
    assert.ok(!cleaned.includes('•'));
    assert.ok(!cleaned.includes('>'));
    assert.ok(cleaned.includes('Análise Tática Alerta: O monstro possui Resistência a Sangue. Custo: 2 PE Ação: Padrão Citação do livro de regras'));
  });

  test('cleanTextForTts deve limpar fórmulas de LaTeX math blocks', () => {
    const raw = `Cálculo do dano crítico:
$$(\\text{Dano Base: } 2d6) \\times 3$$
Dano total modificado: $6d6+2$.`;

    const cleaned = cleanTextForTts(raw);
    assert.ok(!cleaned.includes('$$'));
    assert.ok(!cleaned.includes('\\text'));
    assert.ok(!cleaned.includes('\\times'));
    assert.ok(cleaned.includes('Dano total modificado: 6d6+2.'));
  });

  test('cleanTextForTts com filtro militar ativado deve normalizar pontuação e encerrar com "Câmbio."', () => {
    const raw = 'Esquadrão em posição... Aguardando confirmação do alvo!';
    const cleaned = cleanTextForTts(raw, { militaryTone: true });
    assert.ok(cleaned.endsWith('Câmbio.'));
    assert.ok(!cleaned.includes('...'));
  });

  test('cleanTextForTts com filtro militar não deve duplicar "Câmbio" se já presente', () => {
    const raw = 'Alvo neutralizado. Câmbio.';
    const cleaned = cleanTextForTts(raw, { militaryTone: true });
    assert.equal(cleaned, 'Alvo neutralizado. Câmbio.');
    assert.equal((cleaned.match(/Câmbio/gi) || []).length, 1);
  });

  test('GlitchVoiceService deve relatar suporte adequadamente em ambientes sem Web Speech API', () => {
    // Em ambiente de teste puro sem mocks, isTtsSupported e isSttSupported retornam boolean
    const hasTts = GlitchVoiceService.isTtsSupported();
    const hasStt = GlitchVoiceService.isSttSupported();
    assert.equal(typeof hasTts, 'boolean');
    assert.equal(typeof hasStt, 'boolean');
  });

  test('GlitchVoiceService speak e stopSpeaking com mocks de SpeechSynthesis', async () => {
    const spokenUtterances: any[] = [];
    let cancelled = false;

    // Mock de SpeechSynthesis no window global
    const mockSpeechSynthesis = {
      speaking: false,
      speak: (utterance: any) => {
        spokenUtterances.push(utterance);
        mockSpeechSynthesis.speaking = true;
        setTimeout(() => {
          mockSpeechSynthesis.speaking = false;
          utterance.onend?.();
        }, 10);
      },
      cancel: () => {
        cancelled = true;
        mockSpeechSynthesis.speaking = false;
      },
    };

    class MockUtterance {
      text: string;
      lang = '';
      pitch = 1.0;
      rate = 1.0;
      volume = 1.0;
      onstart?: () => void;
      onend?: () => void;
      onerror?: (e: any) => void;
      constructor(text: string) {
        this.text = text;
      }
    }

    const origSpeech = (globalThis as any).speechSynthesis;
    const origUtterance = (globalThis as any).SpeechSynthesisUtterance;
    const win = (globalThis as any).window || {};

    try {
      (globalThis as any).speechSynthesis = mockSpeechSynthesis;
      (globalThis as any).SpeechSynthesisUtterance = MockUtterance;
      win.speechSynthesis = mockSpeechSynthesis;
      win.SpeechSynthesisUtterance = MockUtterance;

      assert.equal(GlitchVoiceService.isTtsSupported(), true);

      let ended = false;
      await GlitchVoiceService.speak('Instrução da Ordem para o agente.', {
        militaryTone: true,
        onEnd: () => {
          ended = true;
        },
      });

      // Aguarda término simulado
      await new Promise((r) => setTimeout(r, 30));

      assert.equal(ended, true);
      assert.equal(spokenUtterances.length, 1);
      // Tom militar ajusta pitch para ~0.88 e rate para ~1.08
      assert.equal(spokenUtterances[0].pitch, 0.88);
      assert.equal(spokenUtterances[0].rate, 1.08);
      assert.ok(spokenUtterances[0].text.includes('Câmbio.'));

      // Teste de cancelamento
      GlitchVoiceService.stopSpeaking();
      assert.equal(cancelled, true);
    } finally {
      (globalThis as any).speechSynthesis = origSpeech;
      (globalThis as any).SpeechSynthesisUtterance = origUtterance;
    }
  });

  test('GlitchVoiceService startListening e stopListening com mocks de SpeechRecognition', async () => {
    let recognitionStarted = false;
    let recognitionStopped = false;

    class MockSpeechRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart?: () => void;
      onresult?: (e: any) => void;
      onerror?: (e: any) => void;
      onend?: () => void;

      start() {
        recognitionStarted = true;
        this.onstart?.();
        // Simula transcrição parcial e final
        setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [
              [
                { transcript: 'Como funciona o teste de Sanidade?' },
              ],
            ],
          });
        }, 10);
      }

      stop() {
        recognitionStopped = true;
        this.onend?.();
      }

      abort() {
        this.stop();
      }
    }

    (MockSpeechRecognition.prototype as any).results = [];

    const origRec = (globalThis as any).SpeechRecognition;
    const win = (globalThis as any).window || {};

    try {
      (globalThis as any).SpeechRecognition = MockSpeechRecognition;
      win.SpeechRecognition = MockSpeechRecognition;

      assert.equal(GlitchVoiceService.isSttSupported(), true);

      let receivedTranscript = '';
      let started = false;

      const ok = GlitchVoiceService.startListening({
        onStart: () => {
          started = true;
        },
        onResult: (text) => {
          receivedTranscript = text;
        },
      });

      assert.equal(ok, true);
      assert.equal(started, true);
      assert.equal(recognitionStarted, true);
      assert.equal(GlitchVoiceService.isListening(), true);

      // Aguarda simulação de resultado
      await new Promise((r) => setTimeout(r, 30));

      assert.equal(receivedTranscript, 'Como funciona o teste de Sanidade?');

      GlitchVoiceService.stopListening();
      assert.equal(recognitionStopped, true);
      assert.equal(GlitchVoiceService.isListening(), false);
    } finally {
      (globalThis as any).SpeechRecognition = origRec;
    }
  });

  test('GlitchVoiceService STT nativo no Android via ExpoSpeechRecognitionModule (permissão, transcrição e stop)', async () => {
    const origNative = (globalThis as any).ExpoSpeechRecognitionModule;
    const listeners = new Map<string, Set<(ev: any) => void>>();
    let permissionRequested = false;
    let startedWithOptions: any = null;
    let stopCalled = false;

    const mockNativeStt = {
      isRecognitionAvailable: () => true,
      requestPermissionsAsync: async () => {
        permissionRequested = true;
        return { granted: true, status: 'granted', canAskAgain: true };
      },
      addListener: (eventName: string, handler: (ev: any) => void) => {
        if (!listeners.has(eventName)) listeners.set(eventName, new Set());
        listeners.get(eventName)!.add(handler);
        return {
          remove: () => {
            listeners.get(eventName)?.delete(handler);
          },
        };
      },
      start: (options: any) => {
        startedWithOptions = options;
        listeners.get('start')?.forEach((fn) => fn(null));
        setTimeout(() => {
          listeners.get('result')?.forEach((fn) =>
            fn({ isFinal: false, results: [{ transcript: 'Qual o custo' }] })
          );
        }, 5);
        setTimeout(() => {
          listeners.get('result')?.forEach((fn) =>
            fn({ isFinal: true, results: [{ transcript: 'Qual o custo de PE?' }] })
          );
        }, 15);
      },
      stop: () => {
        stopCalled = true;
        listeners.get('end')?.forEach((fn) => fn(null));
      },
      abort: () => {
        listeners.get('error')?.forEach((fn) => fn({ error: 'aborted', message: 'Aborted' }));
        listeners.get('end')?.forEach((fn) => fn(null));
      },
    };

    try {
      setMobilePlatform('android');
      (globalThis as any).ExpoSpeechRecognitionModule = mockNativeStt;

      assert.equal(GlitchVoiceService.isSttSupported(), true);

      const transcripts: Array<{ text: string; isFinal: boolean }> = [];
      let started = false;
      let ended = false;

      const ok = await GlitchVoiceService.startListeningAsync(
        {
          onStart: () => {
            started = true;
          },
          onResult: (text, isFinal) => {
            transcripts.push({ text, isFinal });
          },
          onEnd: () => {
            ended = true;
          },
        },
        { lang: 'pt-BR', interimResults: true }
      );

      assert.equal(ok, true);
      assert.equal(permissionRequested, true);
      assert.equal(started, true);
      assert.equal(startedWithOptions?.lang, 'pt-BR');
      assert.equal(startedWithOptions?.interimResults, true);
      assert.equal(GlitchVoiceService.isListening(), true);

      await new Promise((r) => setTimeout(r, 35));

      assert.equal(transcripts.length, 2);
      assert.deepEqual(transcripts[0], { text: 'Qual o custo', isFinal: false });
      assert.deepEqual(transcripts[1], { text: 'Qual o custo de PE?', isFinal: true });

      GlitchVoiceService.stopListening();
      assert.equal(stopCalled, true);
      assert.equal(ended, true);
      assert.equal(GlitchVoiceService.isListening(), false);
      // Todos os listeners nativos devem ser removidos após o fim
      for (const set of listeners.values()) {
        assert.equal(set.size, 0);
      }
    } finally {
      GlitchVoiceService.abortListening();
      (globalThis as any).ExpoSpeechRecognitionModule = origNative;
      setMobilePlatform('web');
    }
  });

  test('GlitchVoiceService STT nativo no Android deve bloquear graciosamente se permissão for negada ou serviço indisponível', async () => {
    const origNative = (globalThis as any).ExpoSpeechRecognitionModule;
    let startCalled = false;

    try {
      setMobilePlatform('android');

      // Caso 1: permissão negada pelo usuário
      (globalThis as any).ExpoSpeechRecognitionModule = {
        isRecognitionAvailable: () => true,
        requestPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
        start: () => {
          startCalled = true;
        },
      };

      let deniedErr = '';
      const okDenied = await GlitchVoiceService.startListeningAsync({
        onError: (msg) => {
          deniedErr = msg;
        },
      });

      assert.equal(okDenied, false);
      assert.equal(startCalled, false);
      assert.ok(deniedErr.toLowerCase().includes('permissão'));
      assert.equal(GlitchVoiceService.isListening(), false);

      // Caso 2: serviço de reconhecimento indisponível no aparelho
      (globalThis as any).ExpoSpeechRecognitionModule = {
        isRecognitionAvailable: () => false,
        start: () => {
          startCalled = true;
        },
      };

      assert.equal(GlitchVoiceService.isSttSupported(), false);
      let unavailableErr = '';
      const okUnavailable = await GlitchVoiceService.startListeningAsync({
        onError: (msg) => {
          unavailableErr = msg;
        },
      });

      assert.equal(okUnavailable, false);
      assert.ok(unavailableErr.toLowerCase().includes('indisponível'));
    } finally {
      GlitchVoiceService.abortListening();
      (globalThis as any).ExpoSpeechRecognitionModule = origNative;
      setMobilePlatform('web');
    }
  });
});
