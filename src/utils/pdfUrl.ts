import { Linking, NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PDF_SERVER_STORAGE_KEY = '@ordem_paranormal:pdf_server_url';
let customPdfServerUrl = '';
let isStorageLoaded = false;

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
 * Passe string vazia para limpar e retornar ao modo offline integrado padrão.
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
 * Verifica se existe um servidor de PDFs ativo e acessível configurado.
 * Retorna false quando rodando em APK nativo sem IP de servidor definido,
 * permitindo que a interface alterne suavemente para o Modo Texto Oficial Offline.
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

  // Em celular nativo (Android/iOS), verifica se há host de desenvolvimento Metro detectável
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL && typeof scriptURL === 'string') {
    const match = scriptURL.match(/^https?:\/\/[^/]+/);
    if (match && !match[0].includes('localhost') && !match[0].includes('127.0.0.1')) {
      return true;
    }
  }

  const expoGo = Constants.expoGoConfig;
  if (expoGo?.debuggerHost) {
    const clean = expoGo.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return true;
    }
  }

  return false;
}

/**
 * Obtém a URL base do servidor Metro / Web / Remoto para servir os arquivos .pdf reais
 * e o endpoint de renderização de páginas em alta resolução.
 *
 * No celular físico (Android / iOS):
 * - Usa a URL customizada salva nas configurações, se existir;
 * - Ou variável de ambiente EXPO_PUBLIC_PDF_SERVER_URL;
 * - Ou resolve dinamicamente o IP do computador na rede local (em desenvolvimento via Expo Go);
 * - Em release standalone (APK de produção sem servidor configurado), retorna string vazia
 *   ao invés de "localhost:8081", evitando que requisições HTTP tentem se conectar ao próprio celular.
 */
export function getServerBaseUrl(): string {
  // 1. URL personalizada definida pelo usuário (persistida em AsyncStorage)
  if (customPdfServerUrl && customPdfServerUrl.length > 0) {
    return customPdfServerUrl;
  }

  // 2. Variável de ambiente configurada no build
  const envUrl = process.env.EXPO_PUBLIC_PDF_SERVER_URL || process.env.EXPO_PUBLIC_PDF_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Plataforma Web Desktop / Mobile
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return '';
  }

  // 4. React Native NativeModules.SourceCode.scriptURL (desenvolvimento Metro)
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL && typeof scriptURL === 'string') {
    const match = scriptURL.match(/^https?:\/\/[^/]+/);
    if (match && !match[0].includes('localhost') && !match[0].includes('127.0.0.1')) {
      return match[0];
    }
  }

  // 5. Constants.expoGoConfig?.debuggerHost (Expo Go SDK 49-58)
  const expoGo = Constants.expoGoConfig;
  if (expoGo?.debuggerHost) {
    const clean = expoGo.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 6. Constants.manifest2 (Expo Updates / EAS / Modern Expo)
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

  // 7. Constants.expoConfig?.hostUri
  if (Constants.expoConfig?.hostUri) {
    const clean = Constants.expoConfig.hostUri.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 8. Constants.manifest (Expo classic / legacy)
  const manifest = (Constants as unknown as { manifest?: { debuggerHost?: string } })?.manifest;
  if (manifest?.debuggerHost) {
    const clean = manifest.debuggerHost.split('/')[0];
    if (clean && !clean.startsWith('localhost') && !clean.startsWith('127.0.0.1')) {
      return `http://${clean}`;
    }
  }

  // 9. Constants.linkingUri (ex.: exp://192.168.1.15:8081/...)
  if (Constants.linkingUri) {
    const match = Constants.linkingUri.match(/^exp:\/\/([^/]+)/);
    if (match && !match[1].startsWith('localhost') && !match[1].startsWith('127.0.0.1')) {
      return `http://${match[1]}`;
    }
  }

  // 10. Em ambiente nativo móvel sem servidor:
  // Se for build de desenvolvimento com emulador Android, pode usar localhost como último recurso.
  // Em APK de produção (standalone), retorna string vazia para sinalizar modo offline e não poluir com erros.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'http://localhost:8081';
  }

  return '';
}

/**
 * Retorna a URL direta do arquivo .pdf sem fragmentos (#page=...),
 * ideal para download e visualização em leitores nativos de celular que
 * não aceitam caracteres de hash no caminho do arquivo.
 * Retorna string vazia se nenhum servidor estiver configurado.
 */
export function getCleanPdfUrl(fileName: string): string {
  const base = getServerBaseUrl();
  if (!base) return '';
  const encodedFile = encodeURIComponent(fileName);
  return `${base}/pdfs/${encodedFile}`;
}

/**
 * Retorna a URL direta do arquivo .pdf anexado ao projeto.
 * Suporta fragmento #page=N para abrir direto na página desejada em navegadores desktop.
 * Retorna string vazia se nenhum servidor estiver configurado.
 */
export function getRawPdfUrl(fileName: string, pageNumber?: number): string {
  const base = getServerBaseUrl();
  if (!base) return '';
  const encodedFile = encodeURIComponent(fileName);
  const pageFragment = pageNumber && pageNumber > 0 ? `#page=${pageNumber}&view=FitH` : '';
  return `${base}/pdfs/${encodedFile}${pageFragment}`;
}

/**
 * Retorna a URL da imagem renderizada de uma página específica do PDF (via PyMuPDF no servidor).
 * Retorna string vazia se nenhum servidor estiver configurado.
 */
export function getRenderedPdfPageUrl(
  fileName: string,
  pageNumber: number,
  dpi: number = 150
): string {
  const base = getServerBaseUrl();
  if (!base) return '';
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
 * Realiza o download direto do arquivo PDF.
 * Retorna true em caso de sucesso ou false caso não haja servidor configurado ou ocorra erro.
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
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  try {
    await Linking.openURL(cleanUrl);
    return true;
  } catch (e) {
    console.warn('[PDF] Falha ao iniciar download:', e);
    return false;
  }
}

/**
 * Abre o documento PDF no leitor mais adequado para o dispositivo:
 * - No Celular via Web: Efetua download direto do arquivo para evitar a tela cinza.
 * - No Celular Nativo: Utiliza WebBrowser ou Linking para visualização compatível.
 * - Na Web Desktop: Abre uma nova aba limpa diretamente no arquivo.
 * Retorna true em caso de sucesso ou false caso não haja servidor configurado.
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

  const targetUrl = isMobile ? getCleanPdfUrl(fileName) : getRawPdfUrl(fileName, pageNumber);
  if (!targetUrl) return false;

  try {
    await WebBrowser.openBrowserAsync(targetUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: '#09090B',
      controlsColor: '#EF4444',
      showTitle: true,
      enableBarCollapsing: true,
    });
    return true;
  } catch {
    try {
      await Linking.openURL(targetUrl);
      return true;
    } catch (e) {
      console.warn('[PDF] Falha ao abrir documento externamente:', e);
      return false;
    }
  }
}
