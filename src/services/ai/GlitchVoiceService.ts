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

  // 1. Remove tags internas do sistema: [Livro: ...], [Aba: ...], [Rolar: ...], etc.
  cleaned = cleaned.replace(/\[(?:Livro|Aba|Regra|Ritual|VD|Origem|Poder|Monstro|Ação|Rolar)[^\]]*\]/gi, '');
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

function getExpoSpeech(): any {
  const scope = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (scope.ExpoSpeech) return scope.ExpoSpeech;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech');
    return mod && (mod.speak ? mod : mod.default || mod);
  } catch {
    return null;
  }
}

function getExpoSpeechRecognition(): any {
  const scope = typeof globalThis !== 'undefined' ? (globalThis as any) : {};
  if (scope.ExpoSpeechRecognitionModule) return scope.ExpoSpeechRecognitionModule;
  if (scope.ExpoSpeechRecognition) return scope.ExpoSpeechRecognition;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition');
    return mod?.ExpoSpeechRecognitionModule || mod?.default?.ExpoSpeechRecognitionModule || mod?.default || mod;
  } catch {
    return null;
  }
}

const STT_ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Permissão de microfone negada. Libere o acesso nas configurações.',
  'permission-denied': 'Permissão de microfone negada pelo dispositivo.',
  'no-speech': 'Nenhuma fala detectada. Tente novamente mais perto do microfone.',
  'speech-timeout': 'Tempo esgotado sem detectar voz. Tente novamente.',
  network: 'Falha de rede no reconhecimento de voz.',
  'service-not-allowed': 'Serviço de reconhecimento de voz indisponível neste aparelho.',
  'language-not-supported': 'Idioma selecionado não suportado para reconhecimento de voz.',
  'audio-capture': 'Não foi possível capturar o áudio do microfone.',
  busy: 'Microfone ocupado no momento. Aguarde um instante e tente novamente.',
  'too-many-requests': 'Muitas solicitações de voz seguidas. Aguarde alguns segundos.',
};

function mapSttErrorToPortuguese(errType: string, fallbackMessage?: string): string {
  if (STT_ERROR_MESSAGES[errType]) {
    return STT_ERROR_MESSAGES[errType];
  }
  return fallbackMessage ? `Erro no microfone (${errType}): ${fallbackMessage}` : `Erro no microfone (${errType})`;
}

class GlitchVoiceServiceImpl {
  private activeUtterance: any = null;
  private activeRecognition: any = null;
  private nativeModuleRef: any = null;
  private nativeSubscriptions: Array<{ remove?: () => void }> = [];
  private listeningSessionId: number = 0;
  private manualAbort: boolean = false;
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
   * Retorna true no mobile quando expo-speech estiver disponível e no web com speechSynthesis.
   */
  isTtsSupported(): boolean {
    try {
      if (Platform.OS !== 'web') {
        const expoSpeech = getExpoSpeech();
        if (expoSpeech && typeof expoSpeech.speak === 'function') {
          return true;
        }
        const scope = this.getGlobalScope();
        return Boolean(scope?.speechSynthesis && typeof scope.SpeechSynthesisUtterance !== 'undefined');
      }
      const scope = this.getGlobalScope();
      return Boolean(scope?.speechSynthesis && typeof scope.SpeechSynthesisUtterance !== 'undefined');
    } catch {
      return false;
    }
  }

  /**
   * Verifica se Speech-to-Text (STT) é suportado no ambiente atual de forma síncrona e segura.
   * No mobile (Android/iOS), utiliza expo-speech-recognition; na Web, utiliza Web Speech API.
   */
  isSttSupported(): boolean {
    try {
      if (Platform.OS !== 'web') {
        const nativeMod = getExpoSpeechRecognition();
        if (nativeMod && typeof nativeMod.start === 'function') {
          if (typeof nativeMod.isRecognitionAvailable === 'function') {
            return Boolean(nativeMod.isRecognitionAvailable());
          }
          return true;
        }
        const scope = this.getGlobalScope();
        return Boolean(
          scope?.ExpoSpeechRecognition ||
          (scope?.Voice && typeof scope.Voice.start === 'function')
        );
      }
      const scope = this.getGlobalScope();
      return Boolean(scope?.SpeechRecognition || scope?.webkitSpeechRecognition);
    } catch {
      return false;
    }
  }

  /**
   * Indica se a síntese de voz está ativa no momento.
   */
  isSpeaking(): boolean {
    if (this.isSpeakingState) return true;
    if (Platform.OS !== 'web') {
      return this.isSpeakingState;
    }
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
    if (Platform.OS !== 'web') return;
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

    if (Platform.OS !== 'web') {
      const expoSpeech = getExpoSpeech();
      if (!expoSpeech || typeof expoSpeech.speak !== 'function') {
        options?.onError?.(new Error('Sintetizador de voz nativo (expo-speech) não disponível neste dispositivo.'));
        return;
      }

      try {
        this.isSpeakingState = true;
        options?.onStart?.();

        const pitch = options?.militaryTone ? (options.pitch ?? 0.88) : (options?.pitch ?? 1.0);
        const rate = options?.militaryTone ? (options.rate ?? 1.08) : (options?.rate ?? 1.0);

        expoSpeech.speak(preparedText, {
          language: options?.lang || 'pt-BR',
          pitch,
          rate,
          volume: options?.volume ?? 1.0,
          onStart: () => {
            this.isSpeakingState = true;
          },
          onDone: () => {
            this.isSpeakingState = false;
            options?.onEnd?.();
          },
          onStopped: () => {
            this.isSpeakingState = false;
            options?.onEnd?.();
          },
          onError: (err: any) => {
            this.isSpeakingState = false;
            options?.onError?.(err);
          },
        });
      } catch (err) {
        this.isSpeakingState = false;
        options?.onError?.(err);
      }
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
   * Interrompe imediatamente qualquer reprodução de áudio/voz de forma estritamente idempotente.
   */
  stopSpeaking(): void {
    this.isSpeakingState = false;
    this.activeUtterance = null;
    try {
      if (Platform.OS !== 'web') {
        const expoSpeech = getExpoSpeech();
        if (expoSpeech && typeof expoSpeech.stop === 'function') {
          expoSpeech.stop();
        }
        return;
      }
      const scope = this.getGlobalScope();
      if (scope?.speechSynthesis && typeof scope.speechSynthesis.cancel === 'function') {
        scope.speechSynthesis.cancel();
      }
    } catch {
      // Idempotente: falhas silenciosas nunca vazam
    }
  }

  private cleanupNativeListeners(): void {
    for (const sub of this.nativeSubscriptions) {
      try {
        sub?.remove?.();
      } catch {}
    }
    this.nativeSubscriptions = [];
    this.nativeModuleRef = null;
  }

  /**
   * Inicia o reconhecimento de voz (Speech-to-Text) de forma assíncrona,
   * solicitando permissões de microfone quando executando em Android/iOS nativo.
   */
  async startListeningAsync(callbacks: GlitchSttCallbacks, options?: GlitchSttOptions): Promise<boolean> {
    if (Platform.OS === 'web') {
      return this.startListening(callbacks, options);
    }

    const nativeMod = getExpoSpeechRecognition();
    const recognitionAvailable =
      nativeMod &&
      typeof nativeMod.start === 'function' &&
      (typeof nativeMod.isRecognitionAvailable !== 'function' || Boolean(nativeMod.isRecognitionAvailable()));

    if (!recognitionAvailable) {
      callbacks.onError?.(
        'Reconhecimento de voz direto indisponível neste dispositivo. Dica: use o botão de microfone do teclado virtual para ditar.'
      );
      return false;
    }

    this.abortListening();
    const sessionId = ++this.listeningSessionId;

    try {
      if (typeof nativeMod.requestPermissionsAsync === 'function') {
        const permission = await nativeMod.requestPermissionsAsync();
        if (sessionId !== this.listeningSessionId) {
          return false;
        }
        if (!permission?.granted) {
          callbacks.onError?.('Permissão de microfone negada. Libere o acesso nas configurações do aparelho.');
          return false;
        }
      }

      this.cleanupNativeListeners();
      this.nativeModuleRef = nativeMod;
      this.manualAbort = false;

      if (typeof nativeMod.addListener === 'function') {
        const addSub = (eventName: string, handler: (ev: any) => void) => {
          const sub = nativeMod.addListener(eventName, handler);
          if (sub) this.nativeSubscriptions.push(sub);
        };

        addSub('start', () => {
          if (sessionId !== this.listeningSessionId) return;
          this.isListeningState = true;
          callbacks.onStart?.();
        });

        addSub('result', (event: any) => {
          if (sessionId !== this.listeningSessionId) return;
          const transcript = (event?.results?.[0]?.transcript || '').trim();
          if (transcript) {
            callbacks.onResult?.(transcript, Boolean(event?.isFinal));
          }
        });

        addSub('error', (event: any) => {
          if (sessionId !== this.listeningSessionId) return;
          this.isListeningState = false;
          const errType = event?.error || 'unknown';
          if (errType === 'aborted' && this.manualAbort) {
            this.manualAbort = false;
            this.cleanupNativeListeners();
            return;
          }
          this.manualAbort = false;
          this.cleanupNativeListeners();
          callbacks.onError?.(mapSttErrorToPortuguese(errType, event?.message));
        });

        addSub('end', () => {
          if (sessionId !== this.listeningSessionId) return;
          this.isListeningState = false;
          this.manualAbort = false;
          this.cleanupNativeListeners();
          callbacks.onEnd?.();
        });
      }

      this.isListeningState = true;
      nativeMod.start({
        lang: options?.lang || 'pt-BR',
        interimResults: options?.interimResults ?? true,
        continuous: options?.continuous ?? false,
        maxAlternatives: 1,
        addsPunctuation: true,
      });
      return true;
    } catch (err: any) {
      this.isListeningState = false;
      this.manualAbort = false;
      this.cleanupNativeListeners();
      callbacks.onError?.(err?.message || 'Falha ao iniciar o microfone.');
      return false;
    }
  }

  /**
   * Inicia o reconhecimento de voz (Speech-to-Text).
   * Na Web executa de forma síncrona via Web Speech API; no mobile delega para startListeningAsync.
   */
  startListening(callbacks: GlitchSttCallbacks, options?: GlitchSttOptions): boolean {
    if (Platform.OS !== 'web') {
      if (!this.isSttSupported()) {
        callbacks.onError?.('Reconhecimento de fala não suportado neste navegador ou dispositivo.');
        return false;
      }
      void this.startListeningAsync(callbacks, options);
      return true;
    }

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
        callbacks.onError?.(mapSttErrorToPortuguese(errType));
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
   * Finaliza a escuta do microfone normalmente (permitindo entrega do resultado final).
   */
  stopListening(): void {
    this.isListeningState = false;
    if (!this.nativeModuleRef) {
      // Se ainda estava aguardando permissão, invalida a sessão pendente
      this.listeningSessionId++;
    }
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop();
      } catch {}
      this.activeRecognition = null;
    }
    if (this.nativeModuleRef) {
      try {
        this.nativeModuleRef.stop?.();
      } catch {}
    }
  }

  /**
   * Cancela abruptamente a escuta do microfone e remove listeners nativos.
   */
  abortListening(): void {
    this.listeningSessionId++;
    this.isListeningState = false;
    if (this.activeRecognition) {
      try {
        this.activeRecognition.abort();
      } catch {}
      this.activeRecognition = null;
    }
    if (this.nativeModuleRef) {
      this.manualAbort = true;
      try {
        this.nativeModuleRef.abort?.();
      } catch {}
      this.cleanupNativeListeners();
    }
  }
}

export const GlitchVoiceService = new GlitchVoiceServiceImpl();
