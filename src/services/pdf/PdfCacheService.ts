import * as FileSystem from 'expo-file-system';

interface FileSystemCompat {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  Paths?: {
    cache?: { uri?: string };
    document?: { uri?: string };
  };
  getInfoAsync?: (
    uri: string,
    options?: any
  ) => Promise<{ exists: boolean; isDirectory?: boolean; size?: number }>;
  deleteAsync?: (uri: string, options?: any) => Promise<void>;
  readDirectoryAsync?: (uri: string) => Promise<string[]>;
  makeDirectoryAsync?: (uri: string, options?: any) => Promise<void>;
  copyAsync?: (options: { from: string; to: string }) => Promise<void>;
  moveAsync?: (options: { from: string; to: string }) => Promise<void>;
  downloadAsync?: (
    url: string,
    fileUri: string,
    options?: any
  ) => Promise<{ uri: string; status: number; headers: Record<string, string> }>;
  readAsStringAsync?: (uri: string, options?: any) => Promise<string>;
}

const fs = FileSystem as unknown as FileSystemCompat;

/**
 * Retorna a URI do diretório de cache do aparelho (compatível com legacy e Paths moderno).
 */
function getCacheDirectory(): string | null {
  return fs.cacheDirectory || fs.Paths?.cache?.uri || null;
}

/**
 * Retorna a URI do diretório de documentos do aparelho (compatível com legacy e Paths moderno).
 */
function getDocumentDirectory(): string | null {
  return fs.documentDirectory || fs.Paths?.document?.uri || null;
}

/**
 * Normaliza um nome de arquivo ou identificador para formato slug (minúsculo, sem acentos ou caracteres especiais).
 */
function normalizePdfSlug(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Deleta um arquivo específico do cache ou filesystem com segurança e idempotência.
 * Utilizado para limpar arquivos temporários gerados pelo DocumentPicker ou leitores.
 */
export async function deleteCachedFile(fileUri?: string | null): Promise<boolean> {
  if (!fileUri) return false;
  try {
    if (typeof fs.getInfoAsync === 'function') {
      const info = await fs.getInfoAsync(fileUri);
      if (info?.exists && typeof fs.deleteAsync === 'function') {
        await fs.deleteAsync(fileUri, { idempotent: true });
        return true;
      }
    }
  } catch (err) {
    // Falha silenciosa para resiliência offline e multiplataforma
  }
  return false;
}

/**
 * Remove do cache do dispositivo (e do armazenamento local) qualquer arquivo PDF
 * associado ao bookId ou fileName informado, varrendo tanto a raiz do cacheDirectory
 * quanto a subpasta DocumentPicker/.
 */
export async function removePdfFilesFromCacheAndStorage(
  bookId?: string | null,
  fileName?: string | null
): Promise<number> {
  const cacheDir = getCacheDirectory();
  const docDir = getDocumentDirectory();

  // Se não houver diretório de cache ou documentos no ambiente (ex: Web pura), encerra
  if (!cacheDir && !docDir) return 0;

  let deletedCount = 0;
  const targets = new Set<string>();

  if (fileName) {
    const cleanFileName = fileName.trim().toLowerCase();
    targets.add(cleanFileName);
    const withoutExt = cleanFileName.replace(/\.pdf$/i, '').trim();
    if (withoutExt) targets.add(withoutExt);
    const slug = normalizePdfSlug(fileName);
    if (slug) targets.add(slug);
  }

  if (bookId) {
    const cleanId = bookId.trim().toLowerCase();
    targets.add(cleanId);
    const idSlug = normalizePdfSlug(bookId);
    if (idSlug) targets.add(idSlug);
  }

  if (targets.size === 0) return 0;

  // Diretórios onde arquivos PDF temporários, cacheados ou selecionados podem residir
  const directoriesToScan: string[] = [];
  if (cacheDir) {
    directoriesToScan.push(cacheDir);
    directoriesToScan.push(cacheDir.endsWith('/') ? `${cacheDir}DocumentPicker/` : `${cacheDir}/DocumentPicker/`);
  }
  if (docDir) {
    directoriesToScan.push(docDir);
    directoriesToScan.push(docDir.endsWith('/') ? `${docDir}pdfs/` : `${docDir}/pdfs/`);
  }

  for (const dirUri of directoriesToScan) {
    try {
      if (typeof fs.getInfoAsync !== 'function' || typeof fs.readDirectoryAsync !== 'function') continue;

      const dirInfo = await fs.getInfoAsync(dirUri);
      if (!dirInfo?.exists || !dirInfo?.isDirectory) continue;

      const files = await fs.readDirectoryAsync(dirUri);
      for (const file of files) {
        const lowerFile = file.toLowerCase();
        const fileWithoutExt = lowerFile.replace(/\.pdf$/i, '');
        const fileSlug = normalizePdfSlug(file);

        let matches = false;
        for (const target of targets) {
          if (!target) continue;
          if (
            lowerFile === target ||
            lowerFile === `${target}.pdf` ||
            fileWithoutExt === target ||
            fileSlug === target ||
            (target.length >= 4 && (lowerFile.includes(target) || fileSlug.includes(target)))
          ) {
            matches = true;
            break;
          }
        }

        if (matches && typeof fs.deleteAsync === 'function') {
          const fullUri = dirUri.endsWith('/') ? `${dirUri}${file}` : `${dirUri}/${file}`;
          try {
            await fs.deleteAsync(fullUri, { idempotent: true });
            deletedCount++;
          } catch {}
        }
      }
    } catch {}
  }

  return deletedCount;
}

/**
 * Limpa todos os arquivos .pdf órfãos temporários deixados pelo DocumentPicker na pasta de cache.
 * Garante que arquivos selecionados por engano não acumulem espaço desnecessário no celular.
 */
export async function cleanOrphanDocumentPickerPdfs(): Promise<number> {
  const cacheDir = getCacheDirectory();
  if (!cacheDir || typeof fs.getInfoAsync !== 'function' || typeof fs.readDirectoryAsync !== 'function') return 0;

  let deleted = 0;
  const docPickerDir = cacheDir.endsWith('/') ? `${cacheDir}DocumentPicker/` : `${cacheDir}/DocumentPicker/`;
  try {
    const info = await fs.getInfoAsync(docPickerDir);
    if (!info?.exists || !info?.isDirectory) return 0;

    const files = await fs.readDirectoryAsync(docPickerDir);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf') && typeof fs.deleteAsync === 'function') {
        try {
          await fs.deleteAsync(`${docPickerDir}${file}`, { idempotent: true });
          deleted++;
        } catch {}
      }
    }
  } catch {}
  return deleted;
}

/**
 * Retorna a URI da pasta permanente de PDFs do usuário no aparelho.
 */
export function getPdfsDirectoryUri(): string | null {
  const docDir = getDocumentDirectory() || getCacheDirectory();
  if (!docDir) return null;
  return docDir.endsWith('/') ? `${docDir}pdfs/` : `${docDir}/pdfs/`;
}

/**
 * Garante que o diretório persistente de PDFs exista no disco do aparelho.
 */
export async function ensurePdfDirectoryExists(): Promise<string | null> {
  const dir = getPdfsDirectoryUri();
  if (!dir) return null;
  try {
    if (typeof fs.getInfoAsync === 'function') {
      const info = await fs.getInfoAsync(dir);
      if (!info?.exists && typeof fs.makeDirectoryAsync === 'function') {
        await fs.makeDirectoryAsync(dir, { intermediates: true });
      }
      return dir;
    }
  } catch {}
  return dir;
}

/**
 * Copia um arquivo PDF selecionado (ex: pelo DocumentPicker) para o armazenamento persistente do app.
 * NÃO carrega o binário em memória RAM (0 bytes na JVM/Hermes), evitando OutOfMemoryError em PDFs de até centenas de MBs.
 */
export async function savePdfFromUri(
  sourceUri: string,
  bookId: string,
  fileName?: string
): Promise<string | null> {
  if (!sourceUri || !bookId) return null;
  const dir = await ensurePdfDirectoryExists();
  if (!dir) return null;

  const safeBookSlug = normalizePdfSlug(bookId);
  const cleanName = normalizePdfSlug((fileName || '').replace(/\.pdf$/i, ''));
  const targetFileName = cleanName && cleanName !== safeBookSlug ? `${safeBookSlug}__${cleanName}.pdf` : `${safeBookSlug}.pdf`;
  const targetUri = `${dir}${targetFileName}`;

  try {
    if (typeof fs.copyAsync === 'function') {
      await fs.copyAsync({ from: sourceUri, to: targetUri });
      return targetUri;
    }
  } catch (err) {
    console.warn('[PdfCacheService] Erro ao copiar PDF para armazenamento:', err);
  }
  return null;
}

/**
 * Baixa um PDF diretamente para o arquivo em disco via streaming nativo do FileSystem.
 * Evita carregar o arquivo em memória RAM (res.arrayBuffer()), impedindo crashes de OutOfMemory.
 */
export async function downloadPdfToFile(
  url: string,
  bookId: string,
  fileName?: string,
  headers?: Record<string, string>
): Promise<string | null> {
  if (!url || !bookId) return null;
  const dir = await ensurePdfDirectoryExists();
  if (!dir) return null;

  const safeBookSlug = normalizePdfSlug(bookId);
  const cleanName = normalizePdfSlug((fileName || '').replace(/\.pdf$/i, ''));
  const targetFileName = cleanName && cleanName !== safeBookSlug ? `${safeBookSlug}__${cleanName}.pdf` : `${safeBookSlug}.pdf`;
  const targetUri = `${dir}${targetFileName}`;

  try {
    if (typeof fs.downloadAsync === 'function') {
      const res = await fs.downloadAsync(url, targetUri, { headers });
      if (res && res.status >= 200 && res.status < 300) {
        return targetUri;
      }
    }
  } catch (err) {
    console.warn('[PdfCacheService] Erro ao baixar PDF para arquivo:', err);
  }
  return null;
}

/**
 * Localiza a URI persistente de um PDF no disco local do aparelho, se existir.
 */
export async function getLocalPdfFileUri(
  bookId: string,
  fileName?: string
): Promise<string | null> {
  if (!bookId) return null;
  const dir = getPdfsDirectoryUri();
  if (!dir || typeof fs.getInfoAsync !== 'function') return null;

  const safeBookSlug = normalizePdfSlug(bookId);
  const cleanName = normalizePdfSlug((fileName || '').replace(/\.pdf$/i, ''));
  const candidates = [
    cleanName && cleanName !== safeBookSlug ? `${dir}${safeBookSlug}__${cleanName}.pdf` : null,
    `${dir}${safeBookSlug}.pdf`,
  ].filter(Boolean) as string[];

  for (const uri of candidates) {
    try {
      const info = await fs.getInfoAsync(uri);
      if (info?.exists && !info.isDirectory) {
        return uri;
      }
    } catch {}
  }

  return null;
}
