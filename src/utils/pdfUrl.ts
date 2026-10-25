import { Linking, NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

/**
 * Obtém a URL base do servidor Metro / Web para servir os arquivos .pdf reais
 * e o endpoint de renderização de páginas em alta resolução.
 *
 * No celular físico (Android / iOS via Expo Go, Dev Client ou navegador),
 * resolve dinamicamente o IP do computador na rede local ao invés de usar
 * 'localhost' (que no celular aponta para o próprio aparelho e falha).
 */
export function getServerBaseUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return '';
  }

  // 1. React Native NativeModules.SourceCode.scriptURL (presente em todo build de desenvolvimento)
  // Ex: "http://192.168.1.15:8081/index.bundle?platform=android..."
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL && typeof scriptURL === 'string') {
    const match = scriptURL.match(/^https?:\/\/[^/]+/);
    if (match && !match[0].includes('localhost') && !match[0].includes('127.0.0.1')) {
      return match[0];
    }
  }

  // 2. Constants.expoGoConfig?.debuggerHost (Expo Go SDK 49-58)
  const expoGo = Constants.expoGoConfig;
  if (expoGo?.debuggerHost) {
    const clean = expoGo.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 3. Constants.manifest2 (Expo Updates / EAS / Modern Expo)
  const manifest2 = (Constants as unknown as {
    manifest2?: {
      extra?: {
        expoGo?: { debuggerHost?: string; hostUri?: string };
        expoClient?: { hostUri?: string };
      };
    };
  })?.manifest2;

  const manifest2Host =
    manifest2?.extra?.expoGo?.debuggerHost ||
    manifest2?.extra?.expoClient?.hostUri ||
    manifest2?.extra?.expoGo?.hostUri;

  if (manifest2Host) {
    const clean = manifest2Host.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 4. Constants.expoConfig?.hostUri
  if (Constants.expoConfig?.hostUri) {
    const clean = Constants.expoConfig.hostUri.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 5. Constants.manifest (Expo classic / legacy)
  const manifest = (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest;
  if (manifest?.debuggerHost) {
    const clean = manifest.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 6. Constants.linkingUri (ex.: exp://192.168.1.15:8081/...)
  if (Constants.linkingUri) {
    const match = Constants.linkingUri.match(/^exp:\/\/([^/]+)/);
    if (match && !match[1].startsWith('localhost') && !match[1].startsWith('127.0.0.1')) {
      return `http://${match[1]}`;
    }
  }

  // 7. Fallback seguro para emulador Android ou computador local
  return 'http://localhost:8081';
}

/**
 * Retorna a URL direta do arquivo .pdf sem fragmentos (#page=...),
 * ideal para download e visualização em leitores nativos de celular que
 * não aceitam caracteres de hash no caminho do arquivo.
 */
export function getCleanPdfUrl(fileName: string): string {
  const base = getServerBaseUrl();
  const encodedFile = encodeURIComponent(fileName);
  return `${base}/pdfs/${encodedFile}`;
}

/**
 * Retorna a URL direta do arquivo .pdf anexado ao projeto.
 * Suporta fragmento #page=N para abrir direto na página desejada em navegadores desktop.
 */
export function getRawPdfUrl(fileName: string, pageNumber?: number): string {
  const base = getServerBaseUrl();
  const encodedFile = encodeURIComponent(fileName);
  const pageFragment = pageNumber && pageNumber > 0 ? `#page=${pageNumber}&view=FitH` : '';
  return `${base}/pdfs/${encodedFile}${pageFragment}`;
}

/**
 * Retorna a URL da imagem renderizada de uma página específica do PDF (via PyMuPDF no servidor).
 */
export function getRenderedPdfPageUrl(
  fileName: string,
  pageNumber: number,
  dpi: number = 150
): string {
  const base = getServerBaseUrl();
  const encodedFile = encodeURIComponent(fileName);
  const clampedDpi = Math.max(72, Math.min(260, Math.round(dpi)));
  return `${base}/api/pdf-page?file=${encodedFile}&page=${Math.max(1, pageNumber)}&dpi=${clampedDpi}`;
}

/**
 * Realiza o download direto do arquivo PDF.
 * Especialmente útil no celular, onde navegadores móveis (ex: Chrome no Android)
 * exibem tela cinza ao tentar renderizar PDFs inline em abas do navegador.
 */
export async function downloadPdfDocument(fileName: string): Promise<void> {
  const cleanUrl = getCleanPdfUrl(fileName);
  if (Platform.OS === 'web' && typeof document !== 'undefined' && document.body) {
    const a = document.createElement('a');
    a.href = cleanUrl;
    a.download = fileName;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  try {
    await Linking.openURL(cleanUrl);
  } catch (e) {
    console.warn('[PDF] Falha ao iniciar download:', e);
  }
}

/**
 * Abre o documento PDF no leitor mais adequado para o dispositivo:
 * - No Celular via Web: Efetua download direto do arquivo para evitar a clássica
 *   tela cinza do Chrome Android / navegadores móveis.
 * - No Celular Nativo: Utiliza WebBrowser ou Linking para visualização compatível.
 * - Na Web Desktop: Abre uma nova aba limpa diretamente no arquivo.
 */
export async function openPdfDocument(
  fileName: string,
  pageNumber: number = 1
): Promise<void> {
  const isMobile =
    Platform.OS !== 'web' ||
    (typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  if (Platform.OS === 'web') {
    if (isMobile && typeof document !== 'undefined') {
      await downloadPdfDocument(fileName);
      return;
    }

    const targetUrl = getRawPdfUrl(fileName, pageNumber);
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    return;
  }

  const targetUrl = isMobile ? getCleanPdfUrl(fileName) : getRawPdfUrl(fileName, pageNumber);

  try {
    await WebBrowser.openBrowserAsync(targetUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#09090B',
      controlsColor: '#EF4444',
      showTitle: true,
      enableBarCollapsing: true,
    });
  } catch {
    // Fallback para Linking tradicional caso o navegador embutido falhe
    try {
      await Linking.openURL(targetUrl);
    } catch (e) {
      console.warn('[PDF] Falha ao abrir documento externamente:', e);
    }
  }
}
