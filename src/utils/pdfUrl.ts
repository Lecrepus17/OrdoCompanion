import { Linking, NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PDF_SERVER_STORAGE_KEY = '@ordem_paranormal:pdf_server_url';
export const GITHUB_RAW_PDF_BASE_URL =
  'https://raw.githubusercontent.com/Lecrepus17/OrdoCompanion/main';

let customPdfServerUrl = '';
let isStorageLoaded = false;
let localPdfUrlResolver: ((fileName: string) => string | null) | null = null;

export function registerLocalPdfUrlResolver(
  resolver: (fileName: string) => string | null
): void {
  localPdfUrlResolver = resolver;
}

/**
 * Normaliza a URL de um servidor, garantindo remoção de barras finais
 * e adicionando o esquema http:// caso o usuário tenha informado apenas IP e porta (ex: 192.168.1.15:8081).
 */
export function normalizeServerUrl(url: string): string {
  let clean = (url || '').trim().replace(/\/+$/, '');
  if (!clean) return '';
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  return clean;
}

/**
 * Retorna a URL customizada de servidor de PDF configurada pelo usuário (se houver).
 */
export function getCustomPdfServerUrl(): string {
  return customPdfServerUrl;
}

/**
 * Define e persiste uma nova URL de servidor de PDFs (ex: http://192.168.1.15:8081 ou https://meu-servidor.com).
 * Passe string vazia para limpar e retornar ao modo integrado padrão.
 */
export async function setCustomPdfServerUrl(url: string): Promise<void> {
  const clean = normalizeServerUrl(url);
  customPdfServerUrl = clean;
  try {
    if (clean) {
      await AsyncStorage.setItem(PDF_SERVER_STORAGE_KEY, clean);
    } else {
      await AsyncStorage.removeItem(PDF_SERVER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[PDF] Falha ao persistir URL do servidor:', e);
  }
}

/**
 * Carrega a URL do servidor persistida no AsyncStorage.
 */
export async function loadStoredPdfServerUrl(): Promise<string> {
  if (isStorageLoaded) return customPdfServerUrl;
  try {
    const stored = await AsyncStorage.getItem(PDF_SERVER_STORAGE_KEY);
    if (stored && typeof stored === 'string') {
      customPdfServerUrl = normalizeServerUrl(stored);
    }
  } catch (e) {
    console.warn('[PDF] Falha ao ler URL persistida do servidor:', e);
  } finally {
    isStorageLoaded = true;
  }
  return customPdfServerUrl;
}

// Inicializa a leitura da URL armazenada em segundo plano
loadStoredPdfServerUrl().catch(() => {});

/**
 * Resolve o host de desenvolvimento Metro/Expo no celular quando aplicável.
 */
function resolveDevServerHostUrl(): string {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL && typeof scriptURL === 'string') {
    const match = scriptURL.match(/^https?:\/\/[^/]+/);
    if (match && !match[0].includes('localhost') && !match[0].includes('127.0.0.1')) {
      return match[0];
    }
  }

  const expoGo = Constants.expoGoConfig;
  if (expoGo?.debuggerHost) {
    const clean = expoGo.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

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

  if (Constants.expoConfig?.hostUri) {
    const clean = Constants.expoConfig.hostUri.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  const manifest = (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest;
  if (manifest?.debuggerHost) {
    const clean = manifest.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  if (Constants.linkingUri) {
    const match = Constants.linkingUri.match(/^exp:\/\/([^/]+)/);
    if (match && !match[1].startsWith('localhost') && !match[1].startsWith('127.0.0.1')) {
      return `http://${match[1]}`;
    }
  }

  return '';
}

/**
 * Verifica se existe um servidor de renderização gráfica de páginas (/api/pdf-page) configurado.
 * Retorna false quando rodando em APK nativo sem IP de servidor local definido,
 * permitindo que a interface utilize o leitor nativo de páginas integrado sem erros de rede.
 */
export function isPdfServerConfigured(): boolean {
  if (customPdfServerUrl && customPdfServerUrl.length > 0) {
    return true;
  }

  const envUrl = process.env.EXPO_PUBLIC_PDF_SERVER_URL || process.env.EXPO_PUBLIC_PDF_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return true;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return true;
    }
  }

  if (resolveDevServerHostUrl()) {
    return true;
  }

  return false;
}

/**
 * Obtém a URL base do servidor Metro / Web / Remoto para renderização de páginas em alta resolução.
 * Em APK standalone sem servidor local configurado, retorna string vazia para evitar conexões inválidas.
 */
export function getServerBaseUrl(): string {
  if (customPdfServerUrl && customPdfServerUrl.length > 0) {
    return customPdfServerUrl;
  }

  const envUrl = process.env.EXPO_PUBLIC_PDF_SERVER_URL || process.env.EXPO_PUBLIC_PDF_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return '';
  }

  const devHost = resolveDevServerHostUrl();
  if (devHost) {
    return devHost;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'http://localhost:8081';
  }

  return '';
}

/**
 * Retorna a URL base garantida para acessar os arquivos .pdf completos.
 * Caso não haja um servidor local configurado (como no APK de produção),
 * utiliza automaticamente o repositório oficial na nuvem (GitHub Raw),
 * garantindo que o download e a abertura de PDFs funcionem em qualquer celular.
 */
export function getEffectivePdfFileBaseUrl(): string {
  const serverBase = getServerBaseUrl();
  if (serverBase) {
    return serverBase;
  }
  return GITHUB_RAW_PDF_BASE_URL;
}

/**
 * Retorna a URL direta na nuvem (GitHub Raw) de um arquivo PDF oficial.
 */
export function getCloudPdfUrl(fileName: string): string {
  const cleanName = (fileName || '').trim();
  if (!cleanName) return '';
  const encodedFile = encodeURIComponent(cleanName);
  return `${GITHUB_RAW_PDF_BASE_URL}/pdfs/${encodedFile}`;
}

/**
 * Retorna a URL do visualizador embutido (Google Docs Viewer) para abrir o PDF
 * diretamente dentro do WebBrowser no Android sem tela cinza.
 */
export function getEmbeddedPdfViewerUrl(fileName: string, pageNumber: number = 1): string {
  const cloudUrl = getCloudPdfUrl(fileName);
  if (!cloudUrl) return '';
  const pageParam = pageNumber > 1 ? `&page=${pageNumber}` : '';
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(cloudUrl)}${pageParam}`;
}

/**
 * Retorna a URL direta do arquivo .pdf sem fragmentos (#page=...),
 * ideal para download e visualização em leitores nativos de celular que
 * não aceitam caracteres de hash no caminho do arquivo.
 */
export function getCleanPdfUrl(fileName: string): string {
  const cleanName = (fileName || '').trim();
  if (!cleanName) return '';
  if (localPdfUrlResolver) {
    const localUrl = localPdfUrlResolver(cleanName);
    if (localUrl) return localUrl;
  }
  const base = getEffectivePdfFileBaseUrl();
  const encodedFile = encodeURIComponent(cleanName);
  return `${base}/pdfs/${encodedFile}`;
}

/**
 * Retorna a URL direta do arquivo .pdf anexado ao projeto.
 * Suporta fragmento #page=N para abrir direto na página desejada em navegadores desktop.
 */
export function getRawPdfUrl(fileName: string, pageNumber?: number): string {
  const cleanName = (fileName || '').trim();
  if (!cleanName) return '';
  const pageFragment = pageNumber && pageNumber > 0 ? `#page=${pageNumber}&view=FitH` : '';
  if (localPdfUrlResolver) {
    const localUrl = localPdfUrlResolver(cleanName);
    if (localUrl) return `${localUrl}${pageFragment}`;
  }
  const base = getEffectivePdfFileBaseUrl();
  const encodedFile = encodeURIComponent(cleanName);
  return `${base}/pdfs/${encodedFile}${pageFragment}`;
}

/**
 * Retorna a URL da imagem renderizada de uma página específica do PDF (via PyMuPDF no servidor).
 * Retorna string vazia se nenhum servidor de renderização estiver configurado.
 */
export function getRenderedPdfPageUrl(
  fileName: string,
  pageNumber: number,
  dpi: number = 150
): string {
  const base = getServerBaseUrl();
  if (!base || !fileName) return '';
  const encodedFile = encodeURIComponent(fileName);
  const clampedDpi = Math.max(72, Math.min(260, Math.round(dpi)));
  return `${base}/api/pdf-page?file=${encodedFile}&page=${Math.max(1, pageNumber)}&dpi=${clampedDpi}`;
}

/**
 * Testa a conectividade com uma URL de servidor de PDFs.
 */
export async function testPdfServerConnection(url: string): Promise<{ ok: boolean; message: string }> {
  const clean = normalizeServerUrl(url);
  if (!clean) {
    return { ok: false, message: 'Informe uma URL válida (ex: http://192.168.1.15:8081 ou https://meu-servidor.com).' };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${clean}/api/pdf-page?file=Livro%20base.pdf&page=1&dpi=72&format=json`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok || res.status === 200 || res.status === 304 || res.status === 204) {
      return { ok: true, message: 'Servidor conectado com sucesso!' };
    }
    return { ok: false, message: `Servidor respondeu com código de status ${res.status}.` };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, message: 'Tempo limite esgotado (timeout). O servidor não respondeu a tempo.' };
    }
    return { ok: false, message: 'Não foi possível conectar. Verifique o endereço IP e se o aparelho está na mesma rede Wi-Fi.' };
  }
}

/**
 * Realiza o download direto / abertura externa do arquivo PDF no sistema operacional.
 */
export async function downloadPdfDocument(fileName: string): Promise<boolean> {
  const cleanUrl = getCleanPdfUrl(fileName);
  if (!cleanUrl) {
    return false;
  }

  if (Platform.OS === 'web' && typeof document !== 'undefined' && document.body) {
    const a = document.createElement('a');
    a.href = cleanUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  try {
    await Linking.openURL(cleanUrl);
    return true;
  } catch {
    const cloudUrl = getCloudPdfUrl(fileName);
    if (cloudUrl && cloudUrl !== cleanUrl) {
      try {
        await Linking.openURL(cloudUrl);
        return true;
      } catch {}
    }
    try {
      await WebBrowser.openBrowserAsync(cloudUrl || cleanUrl);
      return true;
    } catch (e) {
      console.warn('[PDF] Falha ao iniciar download:', e);
      return false;
    }
  }
}

/**
 * Abre o documento PDF no leitor mais adequado para o dispositivo:
 * - Na Web Desktop: Abre uma nova aba limpa diretamente no arquivo.
 * - Na Web Mobile: Efetua download/abertura direta do arquivo.
 * - No APK / Celular Nativo (Android/iOS): Abre o arquivo via Linking (permitindo usar o leitor
 *   de PDF nativo do celular ou baixar o PDF oficial) com fallback para o WebBrowser.
 */
export async function openPdfDocument(
  fileName: string,
  pageNumber: number = 1
): Promise<boolean> {
  const isMobile =
    Platform.OS !== 'web' ||
    (typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  if (Platform.OS === 'web') {
    if (isMobile && typeof document !== 'undefined') {
      return await downloadPdfDocument(fileName);
    }

    const targetUrl = getRawPdfUrl(fileName, pageNumber);
    if (!targetUrl) return false;

    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  }

  // Em Android/iOS (APK ou Expo Go), resolve a URL limpa (servidor local ou GitHub Raw na nuvem)
  const cleanUrl = getCleanPdfUrl(fileName);
  const cloudUrl = getCloudPdfUrl(fileName);
  const primaryUrl = isPdfServerConfigured() ? cleanUrl : cloudUrl || cleanUrl;

  if (!primaryUrl) return false;

  try {
    // Em celulares Android, Linking.openURL permite que o sistema abra o PDF diretamente
    // no leitor nativo (Drive PDF Viewer, Samsung Notes, Adobe) ou baixe o arquivo sem tela cinza
    await Linking.openURL(primaryUrl);
    return true;
  } catch {
    try {
      const embeddedUrl = getEmbeddedPdfViewerUrl(fileName, pageNumber) || primaryUrl;
      await WebBrowser.openBrowserAsync(embeddedUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#09090B',
        controlsColor: '#EF4444',
        showTitle: true,
        enableBarCollapsing: true,
      });
      return true;
    } catch (e) {
      console.warn('[PDF] Falha ao abrir documento externamente:', e);
      return false;
    }
  }
}
