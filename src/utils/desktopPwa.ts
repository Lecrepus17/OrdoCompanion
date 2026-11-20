import { Platform } from 'react-native';

export interface DeferredBeforeInstallPromptEvent {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

export interface PwaInstallPromptResult {
  outcome: 'accepted' | 'dismissed' | 'already_installed' | 'manual_instructions';
  message: string;
}

const PWA_MANUAL_INSTALL_INSTRUCTIONS =
  'Para instalar no PC: clique no ícone de instalação (computador com seta) na barra de endereços do navegador. No Google Chrome, você também pode abrir o menu ⋮ ➔ Transmitir, salvar e compartilhar ➔ Instalar página como app... (ou no Edge: ⋯ ➔ Aplicativos ➔ Instalar este site como um aplicativo).';

/**
 * Indica se a execução atual está no ambiente Desktop/Web.
 */
export function isDesktopWebEnvironment(): boolean {
  return Platform.OS === 'web';
}

/**
 * Verifica se o aplicativo já está sendo executado como janela standalone instalada (PWA).
 */
export function isRunningAsStandalonePwa(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  try {
    if (typeof window.matchMedia === 'function') {
      if (window.matchMedia('(display-mode: standalone)')?.matches) {
        return true;
      }
      if (window.matchMedia('(display-mode: window-controls-overlay)')?.matches) {
        return true;
      }
    }
    if ((window.navigator as any)?.standalone === true) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Verifica se o navegador capturou o prompt nativo de instalação PWA (Chrome/Edge).
 */
export function canTriggerNativePwaInstall(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  const win = window as unknown as { __ordoDeferredPwaPrompt?: DeferredBeforeInstallPromptEvent | null };
  return Boolean(win.__ordoDeferredPwaPrompt && typeof win.__ordoDeferredPwaPrompt.prompt === 'function');
}

/**
 * Dispara o instalador nativo do PWA no PC quando disponível, ou retorna instruções claras.
 */
export async function triggerPwaInstallPrompt(): Promise<PwaInstallPromptResult> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return {
      outcome: 'manual_instructions',
      message: PWA_MANUAL_INSTALL_INSTRUCTIONS,
    };
  }

  if (isRunningAsStandalonePwa()) {
    return {
      outcome: 'already_installed',
      message: 'O Ordo Companion já está rodando instalado como aplicativo standalone no seu computador!',
    };
  }

  const win = window as unknown as { __ordoDeferredPwaPrompt?: DeferredBeforeInstallPromptEvent | null };
  const deferred = win.__ordoDeferredPwaPrompt;

  if (deferred && typeof deferred.prompt === 'function') {
    try {
      await deferred.prompt();
      const choice = deferred.userChoice ? await deferred.userChoice : { outcome: 'accepted' as const };
      win.__ordoDeferredPwaPrompt = null;

      if (choice.outcome === 'accepted') {
        return {
          outcome: 'accepted',
          message: 'Ordo Companion instalado no computador com sucesso! Você já pode abri-lo pelo atalho na Área de Trabalho ou Menu Iniciar.',
        };
      }
      return {
        outcome: 'dismissed',
        message: 'Instalação cancelada. Você pode instalar o aplicativo a qualquer momento pelo ícone da barra de endereços ou aqui no Perfil.',
      };
    } catch {
      win.__ordoDeferredPwaPrompt = null;
    }
  }

  return {
    outcome: 'manual_instructions',
    message: PWA_MANUAL_INSTALL_INSTRUCTIONS,
  };
}

/**
 * Faz o download direto de um arquivo texto/JSON para a pasta Downloads no PC (Web).
 * Retorna false com segurança fora do ambiente Web (ex.: Android APK Hermes).
 */
export function downloadTextFileOnWeb(
  filename: string,
  content: string,
  mimeType = 'application/json;charset=utf-8'
): boolean {
  if (
    Platform.OS !== 'web' ||
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  try {
    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      try {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 1000);

    return true;
  } catch {
    return false;
  }
}

/**
 * Abre o seletor de arquivos nativo do computador (Windows/macOS/Linux) para importar um backup .json.
 * Retorna null com segurança fora do ambiente Web (ex.: Android APK Hermes).
 */
export function pickJsonFileOnWeb(): Promise<{ fileName: string; content: string } | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';

      let settled = false;
      const cleanup = () => {
        try {
          if (input.parentNode) {
            input.parentNode.removeChild(input);
          }
        } catch {}
      };

      const finish = (result: { fileName: string; content: string } | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        try {
          if (typeof file.text === 'function') {
            const content = await file.text();
            finish({ fileName: file.name, content });
            return;
          }
          if (typeof FileReader !== 'undefined') {
            const reader = new FileReader();
            reader.onload = () => {
              finish({ fileName: file.name, content: String(reader.result || '') });
            };
            reader.onerror = () => finish(null);
            reader.readAsText(file);
            return;
          }
          finish(null);
        } catch {
          finish(null);
        }
      };

      input.oncancel = () => finish(null);

      document.body.appendChild(input);
      input.click();
    } catch {
      resolve(null);
    }
  });
}
