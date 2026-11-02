import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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
});
