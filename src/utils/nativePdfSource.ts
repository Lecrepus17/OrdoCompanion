import * as FileSystem from 'expo-file-system/legacy';
import { BookInfo } from '../types/compendium';
import { localPdfStorage } from '../services/pdf/PdfAccessService';
import { getLocalPdfFileUri } from '../services/pdf/PdfCacheService';

/**
 * Normaliza caminhos de arquivo locais para garantir o esquema "file://".
 * Ignora URLs remotas (http/https), blobs ou esquemas data.
 */
export function normalizeFileUri(rawPath: string | null | undefined): string {
  if (!rawPath || typeof rawPath !== 'string') {
    return '';
  }
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return '';
  }

  // URLs remotas ou em memória não são caminhos de arquivo locais
  if (/^(https?:|blob:|data:|ftp:)/i.test(trimmed)) {
    return '';
  }

  // Já possui o prefixo file://
  if (trimmed.startsWith('file://')) {
    return trimmed;
  }

  // Caso contenha esquema file: com apenas uma ou duas barras incorretas
  if (trimmed.startsWith('file:/')) {
    const cleanPath = trimmed.replace(/^file:\/+/, '/');
    return `file://${cleanPath}`;
  }

  // Caminho absoluto Unix/Android/iOS começando com /
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }

  // Caminho absoluto Windows (ex: C:\ ou C:/)
  if (/^[a-zA-Z]:[/\\]/.test(trimmed)) {
    const forwardSlashed = trimmed.replace(/\\/g, '/');
    return `file:///${forwardSlashed.replace(/^\/+/, '')}`;
  }

  // Fallback para qualquer outro caminho relativo/local
  return `file://${trimmed.replace(/^\/+/, '/')}`;
}

/**
 * Alias de compatibilidade para normalização de caminhos locais.
 */
export const normalizeLocalFileUri = normalizeFileUri;

/**
 * Verifica se uma URI informada aponta para um recurso de PDF local offline no disco
 * (esquemas "file://", "content://" ou caminhos absolutos do sistema de arquivos).
 * Rejeita explicitamente URLs remotas (HTTP/HTTPS), blobs e dados em memória base64.
 */
export function isLocalPdfUri(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  const clean = uri.trim();
  if (!clean) {
    return false;
  }

  // Rejeita esquemas remotos ou em memória
  if (/^(https?:|blob:|data:|ftp:|mailto:|javascript:)/i.test(clean)) {
    return false;
  }

  // Rejeita extensões que comprovadamente não sejam documentos PDF
  const pathWithoutQuery = clean.split('?')[0].split('#')[0];
  if (/\.(jpe?g|png|gif|webp|svg|mp3|mp4|mov|zip|tar|gz|txt|json|html?)$/i.test(pathWithoutQuery)) {
    return false;
  }

  // Aceita URIs locais nativas (file://, content:// do Android ou caminhos absolutos)
  return (
    clean.startsWith('file://') ||
    clean.startsWith('content://') ||
    clean.startsWith('/') ||
    /^[a-zA-Z]:[/\\]/.test(clean)
  );
}

/**
 * Valida a existência física do arquivo em disco via FileSystem.getInfoAsync.
 * Trata erros de IO graciosamente retornando false.
 */
async function fileExistsOnDisk(uri: string): Promise<boolean> {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  try {
    if (typeof (FileSystem as any)?.getInfoAsync !== 'function') {
      return false;
    }
    const info = await (FileSystem as any).getInfoAsync(uri);
    return Boolean(info && info.exists && !info.isDirectory);
  } catch {
    return false;
  }
}

/**
 * Resolve determinística e assincronamente a URI de um PDF localmente no dispositivo.
 *
 * Ordem de resolução:
 * 1. Inicializa localPdfStorage (carrega metadados salvos se necessário)
 * 2. Consulta síncrona por book.id no localPdfStorage (getLocalPdfFileUriSync)
 * 3. Consulta síncrona por book.fileName no localPdfStorage (getLocalPdfFileUriByFileNameSync)
 * 4. Fallback assíncrono varrendo o diretório persistente de PDFs (getLocalPdfFileUri)
 * 5. Verificação adicional se book.pdfUrl já é uma URI local válida
 * 6. Normalização garantindo prefixo file://
 * 7. Validação física de existência em disco via FileSystem.getInfoAsync
 *
 * Retorna a URI normalizada com file:// se o arquivo existir, ou null se ausente/inválido.
 */
export async function resolveNativePdfUri(
  book: BookInfo | null | undefined
): Promise<string | null> {
  if (!book) {
    return null;
  }

  const bookId = typeof book.id === 'string' ? book.id.trim() : '';
  const fileName = typeof book.fileName === 'string' ? book.fileName.trim() : '';

  if (!bookId && !fileName) {
    return null;
  }

  try {
    await localPdfStorage.initialize();
  } catch {
    // Fail gracefully se a inicialização falhar
  }

  // 1. Consulta síncrona por book.id no localPdfStorage
  if (bookId) {
    try {
      const uriById = localPdfStorage.getLocalPdfFileUriSync(bookId);
      if (uriById) {
        const normalized = normalizeFileUri(uriById);
        if (normalized && (await fileExistsOnDisk(normalized))) {
          return normalized;
        }
      }
    } catch {
      // Ignora erro de consulta e avança para próxima etapa
    }
  }

  // 2. Consulta síncrona por book.fileName no localPdfStorage
  if (fileName) {
    try {
      const uriByFileName = localPdfStorage.getLocalPdfFileUriByFileNameSync(fileName);
      if (uriByFileName) {
        const normalized = normalizeFileUri(uriByFileName);
        if (normalized && (await fileExistsOnDisk(normalized))) {
          return normalized;
        }
      }
    } catch {
      // Ignora erro de consulta e avança para próxima etapa
    }
  }

  // 3. Fallback assíncrono para getLocalPdfFileUri no disco persistente (documentDirectory/pdfs/)
  try {
    const fallbackUri = await getLocalPdfFileUri(bookId, fileName);
    if (fallbackUri) {
      const normalized = normalizeFileUri(fallbackUri);
      if (normalized && (await fileExistsOnDisk(normalized))) {
        return normalized;
      }
    }
  } catch {
    // Ignora erro do fallback
  }

  // 4. Verificação adicional se book.pdfUrl for uma URI local direta
  if (book.pdfUrl && isLocalPdfUri(book.pdfUrl)) {
    try {
      const normalized = normalizeFileUri(book.pdfUrl);
      if (normalized && (await fileExistsOnDisk(normalized))) {
        return normalized;
      }
    } catch {
      // Ignora erro
    }
  }

  return null;
}
