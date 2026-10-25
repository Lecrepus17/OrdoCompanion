import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Obtém a URL base do servidor Metro / Web para servir os arquivos .pdf reais
 * e o endpoint de renderização de páginas em alta resolução.
 */
export function getServerBaseUrl(): string {
  if (Platform.OS === 'web') {
    return '';
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      ?.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const cleanHost = hostUri.split('/')[0];
    return `http://${cleanHost}`;
  }

  return 'http://localhost:8081';
}

/**
 * Retorna a URL direta do arquivo .pdf anexado ao projeto.
 * Suporta fragmento #page=N para abrir direto na página desejada em navegadores.
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
