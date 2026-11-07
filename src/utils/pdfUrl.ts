import { Linking, NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PDF_SERVER_STORAGE_KEY = '@ordem_paranormal:pdf_server_url';
const GDRIVE_FOLDER_STORAGE_KEY = '@ordem_paranormal:gdrive_books_folder_url';

let customPdfServerUrl = '';
let customGdriveBooksFolderUrl = '';
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
 * Retorna a URL da pasta do Google Drive configurada pelo Mestre (se houver).
 */
export function getMasterGoogleDriveFolderUrl(): string {
  if (customGdriveBooksFolderUrl && customGdriveBooksFolderUrl.trim().length > 0) {
    return customGdriveBooksFolderUrl.trim();
  }
  if (customGdriveBooksFolderUrl === '') {
    return '';
  }
  const envUrl = process.env.EXPO_PUBLIC_GDRIVE_BOOKS_FOLDER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  return 'https://drive.google.com/drive/folders/1OL9QXvphFLto-dPf_18METkqWEVLCey_?hl=pt-br';
}

/**
 * Define e persiste a URL da pasta compartilhada do Google Drive do Mestre.
 */
export async function setMasterGoogleDriveFolderUrl(url: string): Promise<void> {
  const clean = (url || '').trim();
  customGdriveBooksFolderUrl = clean;
  try {
    if (clean) {
      await AsyncStorage.setItem(GDRIVE_FOLDER_STORAGE_KEY, clean);
    } else {
      await AsyncStorage.removeItem(GDRIVE_FOLDER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[PDF] Falha ao persistir URL da pasta do Google Drive:', e);
  }
}

/**
 * Carrega a URL da pasta do Google Drive persistida no AsyncStorage.
 */
export async function loadStoredMasterGoogleDriveFolderUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(GDRIVE_FOLDER_STORAGE_KEY);
    if (stored && typeof stored === 'string') {
      customGdriveBooksFolderUrl = stored.trim();
    }
  } catch (e) {
    console.warn('[PDF] Falha ao ler pasta persistida do Google Drive:', e);
  }
  return getMasterGoogleDriveFolderUrl();
}

loadStoredMasterGoogleDriveFolderUrl().catch(() => {});

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
 * Caso não haja um servidor local configurado, utiliza a pasta oficial no Google Drive
 * ou retorna vazio para garantir que nenhum binário seja buscado no GitHub.
 */
export function getEffectivePdfFileBaseUrl(): string {
  const serverBase = getServerBaseUrl();
  if (serverBase) {
    return serverBase;
  }
  return getMasterGoogleDriveFolderUrl() || 'https://drive.google.com/drive/folders/1OL9QXvphFLto-dPf_18METkqWEVLCey_?hl=pt-br';
}

/**
 * Retorna o link de download direto de um arquivo específico no Google Drive a partir do driveFileId.
 * Não abre a pasta raiz do Drive, garantindo download direto do arquivo.
 */
export function getGoogleDriveDirectDownloadUrl(driveFileId: string): string {
  if (!driveFileId) return '';
  const cleanId = driveFileId.trim();
  if (cleanId.startsWith('http://') || cleanId.startsWith('https://')) {
    return cleanId;
  }
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(cleanId)}`;
}

/**
 * Retorna a URL direta de visualização de um arquivo específico no Google Drive a partir do driveFileId.
 */
export function getGoogleDriveFileViewUrl(driveFileId: string): string {
  if (!driveFileId) return '';
  const cleanId = driveFileId.trim();
  if (cleanId.startsWith('http://') || cleanId.startsWith('https://')) {
    return cleanId;
  }
  return `https://drive.google.com/file/d/${encodeURIComponent(cleanId)}/view`;
}

/**
 * Retorna a URL na nuvem (Google Drive do Mestre ou Servidor Remoto) de um arquivo PDF oficial.
 */
export function getCloudPdfUrl(fileName: string, driveFileId?: string): string {
  if (driveFileId) {
    return getGoogleDriveDirectDownloadUrl(driveFileId);
  }
  const cleanName = (fileName || '').trim();
  if (!cleanName) return '';
  const serverBase = getServerBaseUrl();
  if (serverBase) {
    const encodedFile = encodeURIComponent(cleanName);
    return `${serverBase}/pdfs/${encodedFile}`;
  }
  return getMasterGoogleDriveFolderUrl();
}

/**
 * Retorna a URL do visualizador embutido para abrir o PDF externamente sem falhas.
 */
export function getEmbeddedPdfViewerUrl(
  fileName: string,
  pageNumber: number = 1,
  driveFileId?: string
): string {
  if (driveFileId) {
    return getGoogleDriveFileViewUrl(driveFileId);
  }
  const cloudUrl = getCloudPdfUrl(fileName);
  if (!cloudUrl) return '';
  if (cloudUrl.includes('drive.google.com')) {
    return cloudUrl;
  }
  const pageParam = pageNumber > 1 ? `&page=${pageNumber}` : '';
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(cloudUrl)}${pageParam}`;
}

/**
 * Retorna a URL direta do arquivo .pdf sem fragmentos (#page=...),
 * ideal para download e visualização em leitores nativos de celular que
 * não aceitam caracteres de hash no caminho do arquivo.
 */
export function getCleanPdfUrl(fileName: string, driveFileId?: string): string {
  const cleanName = (fileName || '').trim();
  if (!cleanName && !driveFileId) return '';
  if (localPdfUrlResolver && cleanName) {
    const localUrl = localPdfUrlResolver(cleanName);
    if (localUrl) return localUrl;
  }
  if (driveFileId) {
    return getGoogleDriveDirectDownloadUrl(driveFileId);
  }
  const base = getEffectivePdfFileBaseUrl();
  if (!base) return '';
  if (base.includes('drive.google.com')) {
    return '';
  }
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
  if (!base) return '';
  if (base.includes('drive.google.com')) {
    return `${base}${pageFragment}`;
  }
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
 * Suporta driveFileId para download direto sem redirecionar para a pasta raiz do Google Drive.
 */
export async function downloadPdfDocument(
  fileName: string,
  driveFileId?: string
): Promise<boolean> {
  const cleanName = (fileName || '').trim();

  // 1. Se o arquivo estiver disponível localmente no dispositivo (file:// ou Blob)
  if (localPdfUrlResolver && cleanName) {
    const localUrl = localPdfUrlResolver(cleanName);
    if (localUrl) {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined' && document.body) {
          const a = document.createElement('a');
          a.href = localUrl;
          a.download = cleanName;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return true;
        }
      } else {
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(localUrl, {
              mimeType: 'application/pdf',
              dialogTitle: `Baixar ${cleanName}`,
              UTI: 'com.adobe.pdf',
            });
            return true;
          } else {
            await Linking.openURL(localUrl);
            return true;
          }
        } catch (err) {
          console.warn('[PDF] Falha ao compartilhar PDF local:', err);
        }
      }
    }
  }

  // 2. Se temos driveFileId, gera link direto do arquivo específico no Google Drive (sem abrir a pasta raiz)
  const directDownloadUrl = driveFileId
    ? getGoogleDriveDirectDownloadUrl(driveFileId)
    : getCleanPdfUrl(cleanName);

  if (directDownloadUrl) {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined' && document.body) {
        const a = document.createElement('a');
        a.href = directDownloadUrl;
        a.download = cleanName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return true;
      }
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(directDownloadUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
    } else {
      // No Android / iOS: Tenta download via FileSystem para cache/document e aciona Sharing
      try {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (cacheDir && typeof FileSystem.downloadAsync === 'function') {
          const targetUri = `${cacheDir}${encodeURIComponent(cleanName || 'documento')}.pdf`;
          const downloadRes = await FileSystem.downloadAsync(directDownloadUrl, targetUri);
          if (downloadRes?.uri && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(downloadRes.uri, {
              mimeType: 'application/pdf',
              dialogTitle: `Salvar ${cleanName}`,
              UTI: 'com.adobe.pdf',
            });
            return true;
          }
        }
      } catch (e) {
        console.warn('[PDF] Tentando download direto via Linking:', e);
      }

      try {
        await Linking.openURL(directDownloadUrl);
        return true;
      } catch {
        try {
          await WebBrowser.openBrowserAsync(directDownloadUrl);
          return true;
        } catch (e) {
          console.warn('[PDF] Falha ao iniciar download direto:', e);
        }
      }
    }
  }

  // 3. Fallback: Se não há driveFileId nem servidor, tenta abrir a nuvem sem travar
  const cloudUrl = getCloudPdfUrl(cleanName, driveFileId);
  if (cloudUrl && cloudUrl !== directDownloadUrl) {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(cloudUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
      await Linking.openURL(cloudUrl);
      return true;
    } catch {}
  }

  return false;
}

/**
 * Abre o documento PDF no leitor mais adequado para o dispositivo:
 * - Na Web Desktop: Abre uma nova aba limpa diretamente no arquivo ou na visualização direta do Drive.
 * - Na Web Mobile: Efetua download/abertura direta do arquivo.
 * - No APK / Celular Nativo (Android/iOS):
 *   - Arquivos locais file:// são abertos de forma 100% segura via Sharing.shareAsync / sistema sem quebrar Chrome Custom Tabs.
 *   - Arquivos remotos ou no Drive com driveFileId são abertos diretamente no arquivo individual.
 */
export async function openPdfDocument(
  fileName: string,
  pageNumber: number = 1,
  driveFileId?: string
): Promise<boolean> {
  const cleanName = (fileName || '').trim();
  const isMobile =
    Platform.OS !== 'web' ||
    (typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  if (Platform.OS === 'web') {
    if (isMobile && typeof document !== 'undefined') {
      return await downloadPdfDocument(cleanName, driveFileId);
    }

    if (driveFileId) {
      const driveViewUrl = getGoogleDriveFileViewUrl(driveFileId);
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(driveViewUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
    }

    const targetUrl = getRawPdfUrl(cleanName, pageNumber);
    if (targetUrl) {
      if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return true;
      }
    }
    return false;
  }

  // No APK / Celular Nativo (Android / iOS):
  // 1. Trata com segurança URLs file:// ou content:// locais para NUNCA abrir no Chrome Custom Tabs
  //    (Custom Tabs rejeita esquemas file:// locais e provoca crash no Android)
  let localUri: string | null = null;
  if (localPdfUrlResolver && cleanName) {
    localUri = localPdfUrlResolver(cleanName);
  }

  if (localUri && (localUri.startsWith('file://') || localUri.startsWith('content://'))) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Abrir ${cleanName}`,
          UTI: 'com.adobe.pdf',
        });
        return true;
      } else {
        await Linking.openURL(localUri);
        return true;
      }
    } catch (e) {
      console.warn('[PDF] Falha ao abrir arquivo local via Sharing:', e);
      try {
        await Linking.openURL(localUri);
        return true;
      } catch {}
    }
  }

  // 2. Se temos servidor de PDFs ativo (HTTP)
  if (isPdfServerConfigured()) {
    const serverCleanUrl = getCleanPdfUrl(cleanName);
    const embeddedUrl = getEmbeddedPdfViewerUrl(cleanName, pageNumber) || serverCleanUrl;
    if (embeddedUrl) {
      try {
        await WebBrowser.openBrowserAsync(embeddedUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#09090B',
          controlsColor: '#EF4444',
          showTitle: true,
          enableBarCollapsing: true,
        });
        return true;
      } catch {
        try {
          await Linking.openURL(serverCleanUrl);
          return true;
        } catch {}
      }
    }
  }

  // 3. Se temos driveFileId, abre a visualização direta do arquivo individual no Google Drive
  if (driveFileId) {
    const fileViewUrl = getGoogleDriveFileViewUrl(driveFileId);
    try {
      await WebBrowser.openBrowserAsync(fileViewUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#09090B',
        controlsColor: '#EF4444',
        showTitle: true,
        enableBarCollapsing: true,
      });
      return true;
    } catch {
      try {
        await Linking.openURL(fileViewUrl);
        return true;
      } catch {}
    }
  }

  // 4. Fallback remoto geral
  const cloudUrl = getCloudPdfUrl(cleanName, driveFileId);
  if (cloudUrl) {
    try {
      await WebBrowser.openBrowserAsync(cloudUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#09090B',
        controlsColor: '#EF4444',
        showTitle: true,
        enableBarCollapsing: true,
      });
      return true;
    } catch {
      try {
        await Linking.openURL(cloudUrl);
        return true;
      } catch (e) {
        console.warn('[PDF] Falha ao abrir documento:', e);
        return false;
      }
    }
  }

  return false;
}
