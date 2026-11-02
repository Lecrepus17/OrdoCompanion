import { Platform } from 'react-native';

export interface GlitchTtsOptions {
  lang?: string;
  militaryTone?: boolean;
  pitch?: number;
  rate?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface GlitchSttCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

export interface GlitchSttOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

/**
 * Limpa e prepara o texto para sintetização vocal (TTS), removendo
 * tags internas, markdown, blocos de código e LaTeX.
 */
export function cleanTextForTts(
  rawText: string,
  options?: { militaryTone?: boolean; persona?: string }
): string {
  if (!rawText) return '';

  let cleaned = rawText;

  // 1. Remove tags internas do sistema: [Livro: ...], [Aba: ...], etc.
  cleaned = cleaned.replace(/\[(?:Livro|Aba|Regra|Ritual|VD|Origem|Poder|Monstro|Ação)[^\]]*\]/gi, '');
  cleaned = cleaned.replace(/\[\/?(?:STATUS|ALERT|SYSTEM|CONTEXT|CODE|FORMULA)[^\]]*\]/gi, '');

  // 2. Remove blocos de código markdown (```...```) e código inline (`...`)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' [código omitido] ');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Remove fórmulas matemáticas em LaTeX ($$...$$ e $...$)
  cleaned = cleaned.replace(/\$\$([\s\S]*?)\$\$/g, ' fórmula ');
  cleaned = cleaned.replace(/\$([^\$\n]+)\$/g, '$1');
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, '$1');
  cleaned = cleaned.replace(/\\times/g, 'vezes');
  cleaned = cleaned.replace(/\\[a-zA-Z]+/g, ' ');

  // 4. Remove cabeçalhos markdown (#, ##, ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 5. Remove citações em bloco (> ...)
  cleaned = cleaned.replace(/^>\s+/gm, '');

  // 6. Remove marcadores de listas (•, -, *, 1.)
  cleaned = cleaned.replace(/^[\s]*[•\-\*]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');

  // 7. Remove formatação de negrito e itálico (**texto**, *texto*, __texto__)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');

  // 8. Remove separadores horizontais (--- ou ***)
  cleaned = cleaned.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 9. Remove links markdown [texto](url)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 10. Remove emojis comuns para fala mais limpa e fluida
  cleaned = cleaned.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1FA00}-\u{1FA6F}]/gu,
    ''
  );

  // 11. Normaliza espaçamentos e quebras de linha múltiplas
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 12. Se o filtro de tom e estática militar estiver ativado, formata cadência tática
  if (options?.militaryTone && cleaned.length > 0) {
    // Normaliza pontuação excessiva
    cleaned = cleaned.replace(/\.{2,}/g, '.');
    cleaned = cleaned.replace(/!{2,}/g, '!');
    cleaned = cleaned.replace(/\?{2,}/g, '?');

    // Se a mensagem não terminar com indicação tática, adiciona fechamento militar
    const lower = cleaned.toLowerCase();
    if (!lower.endsWith('câmbio.') && !lower.endsWith('câmbio') && !lower.endsWith('desligo.') && !lower.endsWith('desligo')) {
      if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
        cleaned += '.';
      }
      cleaned += ' Câmbio.';
    }
  }

  return cleaned;
}

class GlitchVoiceServiceImpl {
  private activeUtterance: any = null;
  private activeRecognition: any = null;
  private isListeningState: boolean = false;
  private isSpeakingState: boolean = false;
  private audioContext: any = null;

  private getGlobalScope(): any {
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return {};
  }

  /**
   * Verifica se Text-to-Speech (TTS) é suportado no ambiente atual.
   */
  isTtsSupported(): boolean {
    const scope = this.getGlobalScope();
    return 'speechSynthesis' in scope && typeof scope.SpeechSynthesisUtterance !== 'undefined';
  }

  /**
   * Verifica se Speech-to-Text (STT) é suportado no ambiente atual.
   */
  isSttSupported(): boolean {
    const scope = this.getGlobalScope();
    return Boolean(scope.SpeechRecognition || scope.webkitSpeechRecognition);
  }

  /**
   * Indica se a síntese de voz está ativa no momento.
   */
  isSpeaking(): boolean {
    if (this.isSpeakingState) return true;
    const scope = this.getGlobalScope();
    if (scope.speechSynthesis) {
      return Boolean(scope.speechSynthesis.speaking);
    }
    return false;
  }

  /**
   * Indica se o microfone está escutando no momento.
   */
  isListening(): boolean {
    return this.isListeningState;
  }

  /**
   * Reproduz um efeito sonoro de estática/clique de rádio militar (squelch)
   * sintetizado puramente em Web Audio API (sem arquivos externos ou rede).
   */
  playRadioStatic(effect: 'start' | 'end' = 'start'): void {
    const scope = this.getGlobalScope();
    try {
      const AudioCtx = scope.AudioContext || scope.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const duration = effect === 'start' ? 0.06 : 0.08;
      const bufferSize = Math.floor(this.audioContext.sampleRate * duration);
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      // Gera ruído branco modulado para simular transmissor militar
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }

      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = buffer;

      // Filtro passa-banda para dar textura de rádio militar (comunicação tática)
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = effect === 'start' ? 2200 : 1600;
      filter.Q.value = 2.5;

      // Envelope de ganho rápido
      const gainNode = this.audioContext.createGain();
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch {
      // Ignora silenciosamente se o navegador bloquear autoplay de áudio
    }
  }

  /**
   * Lê o texto fornecido em voz alta utilizando SpeechSynthesis (TTS).
   */
  async speak(text: string, options?: GlitchTtsOptions): Promise<void> {
    if (!this.isTtsSupported()) {
      options?.onError?.(new Error('Sintetizador de voz não suportado neste dispositivo.'));
      return;
    }

    // Cancela qualquer fala anterior
    this.stopSpeaking();

    const preparedText = cleanTextForTts(text, {
      militaryTone: options?.militaryTone,
    });

    if (!preparedText.trim()) {
      options?.onEnd?.();
      return;
    }

    try {
      const scope = this.getGlobalScope();
      const UtteranceClass = scope.SpeechSynthesisUtterance;
      const utterance = new UtteranceClass(preparedText);

      utterance.lang = options?.lang || 'pt-BR';

      // Ajuste de tom militar: voz ligeiramente mais encorpada e cadência mais rápida
      if (options?.militaryTone) {
        utterance.pitch = options.pitch ?? 0.88; // Tom mais grave e tático
        utterance.rate = options.rate ?? 1.08;  // Fala mais concisa e firme
        this.playRadioStatic('start');
      } else {
        utterance.pitch = options?.pitch ?? 1.0;
        utterance.rate = options?.rate ?? 1.0;
      }

      utterance.volume = options?.volume ?? 1.0;

      utterance.onstart = () => {
        this.isSpeakingState = true;
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeakingState = false;
        this.activeUtterance = null;
        if (options?.militaryTone) {
          this.playRadioStatic('end');
        }
        options?.onEnd?.();
      };

      utterance.onerror = (event: any) => {
        this.isSpeakingState = false;
        this.activeUtterance = null;
        // Não reporta erro se foi apenas cancelado manualmente
        if (event?.error !== 'canceled' && event?.error !== 'interrupted') {
          options?.onError?.(event);
        } else {
          options?.onEnd?.();
        }
      };

      this.activeUtterance = utterance;
      this.isSpeakingState = true;
      scope.speechSynthesis.speak(utterance);
    } catch (err) {
      this.isSpeakingState = false;
      this.activeUtterance = null;
      options?.onError?.(err);
    }
  }

  /**
   * Interrompe imediatamente qualquer reprodução de áudio/voz.
   */
  stopSpeaking(): void {
    this.isSpeakingState = false;
    this.activeUtterance = null;
    const scope = this.getGlobalScope();
    if (scope.speechSynthesis) {
      try {
        scope.speechSynthesis.cancel();
      } catch {}
    }
  }

  /**
   * Inicia o reconhecimento de voz (Speech-to-Text).
   */
  startListening(callbacks: GlitchSttCallbacks, options?: GlitchSttOptions): boolean {
    if (!this.isSttSupported()) {
      callbacks.onError?.('Reconhecimento de fala não suportado neste navegador ou dispositivo.');
      return false;
    }

    this.stopListening();

    try {
      const scope = this.getGlobalScope();
      const RecognitionClass = scope.SpeechRecognition || scope.webkitSpeechRecognition;
      const recognition = new RecognitionClass();

      recognition.lang = options?.lang || 'pt-BR';
      recognition.continuous = options?.continuous ?? false;
      recognition.interimResults = options?.interimResults ?? true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isListeningState = true;
        callbacks.onStart?.();
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        const isFinal = Boolean(finalTranscript);
        if (currentText) {
          callbacks.onResult?.(currentText.trim(), isFinal);
        }
      };

      recognition.onerror = (event: any) => {
        this.isListeningState = false;
        const errType = event?.error || 'falha desconhecida';
        let userFriendly = `Erro no microfone (${errType})`;

        if (errType === 'not-allowed' || errType === 'permission-denied') {
          userFriendly = 'Permissão de microfone negada pelo navegador.';
        } else if (errType === 'no-speech') {
          userFriendly = 'Nenhum som detectado. Tente novamente.';
        } else if (errType === 'network') {
          userFriendly = 'Falha de rede no reconhecimento de voz.';
        }

        callbacks.onError?.(userFriendly);
      };

      recognition.onend = () => {
        this.isListeningState = false;
        this.activeRecognition = null;
        callbacks.onEnd?.();
      };

      this.activeRecognition = recognition;
      this.isListeningState = true;
      recognition.start();
      return true;
    } catch (err: any) {
      this.isListeningState = false;
      this.activeRecognition = null;
      callbacks.onError?.(err?.message || 'Falha ao iniciar o microfone.');
      return false;
    }
  }

  /**
   * Finaliza a escuta do microfone normalmente.
   */
  stopListening(): void {
    this.isListeningState = false;
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch {}
      this.activeRecognition = null;
    }
  }

  /**
   * Cancela abruptamente a escuta do microfone.
   */
  abortListening(): void {
    this.isListeningState = false;
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch {}
      this.activeRecognition = null;
    }
  }
}

export const GlitchVoiceService = new GlitchVoiceServiceImpl();
