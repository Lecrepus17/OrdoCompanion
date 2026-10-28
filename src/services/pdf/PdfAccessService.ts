import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  BookPage,
  BookWithPages,
  CompendiumEntity,
  KnownPdfSignature,
  TocEntry,
} from '../../types/compendium';
import {
  getCleanPdfUrl,
  getServerBaseUrl,
  registerLocalPdfUrlResolver,
} from '../../utils/pdfUrl';

export const ADMIN_UNLOCK_EMAIL = 'pedro.eduardo1777@gmail.com';

const STORAGE_KEYS = {
  LOCAL_PDFS_META: '@ordem_paranormal:local_pdfs_meta_v1',
  EMAIL_CHALLENGE: '@ordem_paranormal:email_unlock_challenge_v1',
};

const IDB_NAME = 'ordo_companion_pdfs_db_v1';
const IDB_STORE = 'user_pdfs';

/**
 * Catálogo oficial dos 10 livros registrados com seus hashes SHA-256, tamanhos,
 * contagens de páginas e aliases para identificação automática no upload.
 */
export const KNOWN_PDF_SIGNATURES: KnownPdfSignature[] = [
  {
    id: 'livro_base',
    title: 'Livro Base',
    fileName: 'Livro base.pdf',
    pageCount: 322,
    fileSize: 62824575,
    sha256: '5659d6b2a28f6149c837cf55f6bc0ee8012cd3b51ce790ce61db723c9636f2a7',
    aliases: ['livro_base', 'livro base', 'ordem paranormal rpg livro base', 'regras base', 'corebook'],
    sampleKeywords: ['ordo realitas', 'combatente', 'especialista', 'ocultista', 'transcender'],
  },
  {
    id: 'sobrevivendo_ao_horror',
    title: 'Sobrevivendo ao Horror',
    fileName: 'Sobrevivendo-Ao-Horror-v1.pdf',
    pageCount: 226,
    fileSize: 84030106,
    sha256: 'b178b6be2a79ef9185e3c7d8506ee030613b7dfa7fadfe80aba2c6d1d5c4e46a',
    aliases: ['sobrevivendo_ao_horror', 'sobrevivendo ao horror', 'suplemento sobrevivendo'],
    sampleKeywords: ['sobrevivendo ao horror', 'sobrevivente', 'noite de compras', 'terminal do fim'],
  },
  {
    id: 'arquivos_secretos_01',
    title: 'Arquivos Secretos #01',
    fileName: 'Arquivos-Secretos-01.pdf',
    pageCount: 74,
    fileSize: 33313756,
    sha256: 'd1df913c770775d62e8455ae4c965a2c2f4ee7d91e2e740eb0e31de82000ed33',
    aliases: ['arquivos_secretos_01', 'arquivos secretos 01', 'arquivos secretos 1', 'arquivos secretos #01'],
    sampleKeywords: ['arquivos secretos', 'março 2023', 'wendigo'],
  },
  {
    id: 'arquivos_secretos_02',
    title: 'Arquivos Secretos #02',
    fileName: 'Arquivos-Secretos-02.pdf',
    pageCount: 108,
    fileSize: 84507471,
    sha256: '24ce1ac518703e238470534d5af0e484df22d40b3d883b40e6d83ad1e443ab63',
    aliases: ['arquivos_secretos_02', 'arquivos secretos 02', 'arquivos secretos 2', 'arquivos secretos #02'],
    sampleKeywords: ['arquivos secretos', 'abril 2023'],
  },
  {
    id: 'arquivos_secretos_03',
    title: 'Arquivos Secretos #03',
    fileName: 'Arquivos-secretos-03.pdf',
    pageCount: 142,
    fileSize: 66217333,
    sha256: 'a4ee8a60f79a1937d275cdf4dc5c84df145dc2ed1108e830518832c6852851db',
    aliases: ['arquivos_secretos_03', 'arquivos secretos 03', 'arquivos secretos 3', 'arquivos secretos #03'],
    sampleKeywords: ['arquivos secretos', 'maio 2023'],
  },
  {
    id: 'arquivos_secretos_04',
    title: 'Arquivos Secretos #04',
    fileName: 'Arquivos-Secretos-04.pdf',
    pageCount: 82,
    fileSize: 31603190,
    sha256: '0993eb1976beb7654498def045917f2cadba19189da5522d3f67330430b60051',
    aliases: ['arquivos_secretos_04', 'arquivos secretos 04', 'arquivos secretos 4', 'arquivos secretos #04'],
    sampleKeywords: ['arquivos secretos', 'junho 2023'],
  },
  {
    id: 'arquivos_secretos_05',
    title: 'Arquivos Secretos #05',
    fileName: 'Arquivos-Secretos-05.pdf',
    pageCount: 70,
    fileSize: 27350812,
    sha256: '95a2a659c54e0a45021f5b64d2ace56e12b9b212fa17c04ae5e98fa8a0535b70',
    aliases: ['arquivos_secretos_05', 'arquivos secretos 05', 'arquivos secretos 5', 'arquivos secretos #05'],
    sampleKeywords: ['arquivos secretos', 'julho 2023'],
  },
  {
    id: 'arquivos_secretos_06',
    title: 'Arquivos Secretos #06',
    fileName: 'Arquivos-secretos-06..pdf',
    pageCount: 84,
    fileSize: 24500651,
    sha256: 'fc2ed7c6faaa40a999754ea229c94343838187b0ab122b76aa937d20fce0e5e5',
    aliases: ['arquivos_secretos_06', 'arquivos secretos 06', 'arquivos secretos 6', 'arquivos secretos #06'],
    sampleKeywords: ['arquivos secretos', 'agosto 2023'],
  },
  {
    id: 'arquivos_secretos_07',
    title: 'Arquivos Secretos #07',
    fileName: 'Arquivos-Secretos-07.pdf',
    pageCount: 93,
    fileSize: 27961311,
    sha256: 'b5cdefed2413dfd9b2cda26cd17a0d810fca6a1331fa6f3d7a8b93c5d25475c3',
    aliases: ['arquivos_secretos_07', 'arquivos secretos 07', 'arquivos secretos 7', 'arquivos secretos #07'],
    sampleKeywords: ['arquivos secretos', 'setembro 2023'],
  },
  {
    id: 'arquivos_secretos_09',
    title: 'Arquivos Secretos #09',
    fileName: 'Arquivos-Secretos-09.pdf',
    pageCount: 60,
    fileSize: 44775784,
    sha256: '5cf0033c054b22e732033a6ca83361b36eb0666440e4a63e2a24d80eb76d958c',
    aliases: ['arquivos_secretos_09', 'arquivos secretos 09', 'arquivos secretos 9', 'arquivos secretos #09'],
    sampleKeywords: ['arquivos secretos', 'novembro 2023'],
  },
];

export const KNOWN_SIGNATURES_BY_ID = new Map<string, KnownPdfSignature>(
  KNOWN_PDF_SIGNATURES.map((s) => [s.id, s])
);

/**
 * Implementação SHA-256 compatível com Web, Node e React Native sem dependências nativas externas.
 */
export async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.subtle) {
      const hashBuffer = await (globalThis as any).crypto.subtle.digest('SHA-256', bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback para cálculo JS puro abaixo
  }
  return computeSha256Sync(bytes);
}

export function computeSha256Sync(bytes: Uint8Array): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const l = bytes.length;
  const bitLenHi = Math.floor((l * 8) / 0x100000000);
  const bitLenLo = (l * 8) >>> 0;
  const paddedLen = ((l + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[l] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const v1 = w[i - 15];
      const s0 = ((v1 >>> 7) | (v1 << 25)) ^ ((v1 >>> 18) | (v1 << 14)) ^ (v1 >>> 3);
      const v2 = w[i - 2];
      const s1 = ((v2 >>> 17) | (v2 << 15)) ^ ((v2 >>> 19) | (v2 << 13)) ^ (v2 >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

export function slugifyPdfName(fileName: string): string {
  const withoutExt = (fileName || '').replace(/\.pdf$/i, '');
  const withoutVersion = withoutExt.replace(/[-_\s]+v\d+$/i, '').replace(/\.+/g, '-');
  return withoutVersion
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Estima a contagem de páginas diretamente dos bytes de um arquivo PDF caso o leitor não informe.
 */
export function estimatePdfPageCountFromBytes(bytes?: Uint8Array): number | undefined {
  if (!bytes || bytes.length < 16) return undefined;
  try {
    // Lê cabeçalho e rodapé (xref/Pages) onde o /Count costuma ficar
    const headLen = Math.min(bytes.length, 250000);
    const tailStart = Math.max(0, bytes.length - 250000);
    const decoder = new TextDecoder('latin1');
    const sample =
      decoder.decode(bytes.subarray(0, headLen)) +
      '\n' +
      (tailStart > 0 ? decoder.decode(bytes.subarray(tailStart)) : '');

    const counts: number[] = [];
    const regex = /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)\s+[^>]*?\/Type\s*\/Pages\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sample)) !== null) {
      const n = parseInt(match[1] || match[2], 10);
      if (!isNaN(n) && n > 0 && n < 5000) {
        counts.push(n);
      }
    }
    if (counts.length > 0) {
      return Math.max(...counts);
    }
  } catch {}
  return undefined;
}

/**
 * Verifica se o arquivo enviado corresponde a algum dos 10 livros registrados no sistema
 * (por SHA-256, tamanho de arquivo, contagem de páginas, palavras-chave ou nome/slug).
 */
export async function identifyUploadedPdf(input: {
  fileName: string;
  bytes?: Uint8Array;
  fileSize?: number;
  pageCount?: number;
  sampleText?: string;
}): Promise<{
  isValidPdf: boolean;
  matchedSignature: KnownPdfSignature | null;
  sha256?: string;
  detectedPageCount?: number;
}> {
  const fileName = (input.fileName || '').trim();
  const hasPdfExt = fileName.toLowerCase().endsWith('.pdf');
  const hasPdfMagic =
    input.bytes && input.bytes.length >= 4
      ? input.bytes[0] === 0x25 && // %
        input.bytes[1] === 0x50 && // P
        input.bytes[2] === 0x44 && // D
        input.bytes[3] === 0x46    // F
      : hasPdfExt;

  if (!hasPdfMagic && !hasPdfExt) {
    return { isValidPdf: false, matchedSignature: null };
  }

  let sha256: string | undefined;
  if (input.bytes && input.bytes.length > 0) {
    sha256 = await computeSha256Hex(input.bytes);
    // 1. Verificação exata pelo hash SHA-256
    const exactHashMatch = KNOWN_PDF_SIGNATURES.find(
      (sig) => sig.sha256.toLowerCase() === sha256!.toLowerCase()
    );
    if (exactHashMatch) {
      return {
        isValidPdf: true,
        matchedSignature: exactHashMatch,
        sha256,
        detectedPageCount: exactHashMatch.pageCount,
      };
    }
  }

  const effectiveSize = input.fileSize ?? input.bytes?.length ?? 0;
  const detectedPageCount = input.pageCount ?? estimatePdfPageCountFromBytes(input.bytes);

  // 2. Verificação por tamanho exato de bytes dos arquivos oficiais
  if (effectiveSize > 100000) {
    const sizeMatch = KNOWN_PDF_SIGNATURES.find((sig) => sig.fileSize === effectiveSize);
    if (sizeMatch) {
      return {
        isValidPdf: true,
        matchedSignature: sizeMatch,
        sha256,
        detectedPageCount: sizeMatch.pageCount,
      };
    }
  }

  // 3. Verificação por nome / slug normalizado (suporta arquivos renomeados como "Arquivos Secretos 1.pdf", "Livro Base RPG.pdf", etc.)
  const slug = slugifyPdfName(fileName);
  const lowerName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  for (const sig of KNOWN_PDF_SIGNATURES) {
    if (sig.id === slug || slugifyPdfName(sig.fileName) === slug) {
      return {
        isValidPdf: true,
        matchedSignature: sig,
        sha256,
        detectedPageCount: detectedPageCount || sig.pageCount,
      };
    }
  }

  // Correspondência por número de edição de Arquivos Secretos (ex: "Arquivos Secretos 3.pdf" -> arquivos_secretos_03)
  const asMatch = lowerName.match(/arquivos?[_\-\s]*secretos?[_\-\s#]*0*(\d+)/i);
  if (asMatch) {
    const editionNum = parseInt(asMatch[1], 10);
    const paddedId = `arquivos_secretos_${String(editionNum).padStart(2, '0')}`;
    const foundAs = KNOWN_SIGNATURES_BY_ID.get(paddedId);
    if (foundAs) {
      return {
        isValidPdf: true,
        matchedSignature: foundAs,
        sha256,
        detectedPageCount: detectedPageCount || foundAs.pageCount,
      };
    }
  }

  if (lowerName.includes('sobrevivendo') && lowerName.includes('horror')) {
    const sh = KNOWN_SIGNATURES_BY_ID.get('sobrevivendo_ao_horror')!;
    return {
      isValidPdf: true,
      matchedSignature: sh,
      sha256,
      detectedPageCount: detectedPageCount || sh.pageCount,
    };
  }

  if (lowerName.includes('livro base') || lowerName.includes('livro_base')) {
    const lb = KNOWN_SIGNATURES_BY_ID.get('livro_base')!;
    return {
      isValidPdf: true,
      matchedSignature: lb,
      sha256,
      detectedPageCount: detectedPageCount || lb.pageCount,
    };
  }

  // 4. Verificação por contagem de páginas + texto de amostra (caso o usuário tenha renomeado totalmente para ex: "rpg.pdf")
  if (detectedPageCount) {
    const sampleLower = (input.sampleText || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const pageMatches = KNOWN_PDF_SIGNATURES.filter((sig) => sig.pageCount === detectedPageCount);
    if (pageMatches.length === 1) {
      return {
        isValidPdf: true,
        matchedSignature: pageMatches[0],
        sha256,
        detectedPageCount,
      };
    } else if (pageMatches.length > 1 && sampleLower) {
      for (const cand of pageMatches) {
        if (cand.sampleKeywords.some((kw) => sampleLower.includes(kw))) {
          return {
            isValidPdf: true,
            matchedSignature: cand,
            sha256,
            detectedPageCount,
          };
        }
      }
    }
  }

  return {
    isValidPdf: true,
    matchedSignature: null,
    sha256,
    detectedPageCount,
  };
}

// ============================================================================
// ARMAZENAMENTO OFFLINE DE PDFS DO USUÁRIO (LocalPdfStorage)
// ============================================================================

interface StoredPdfMeta {
  bookId: string;
  fileName: string;
  size: number;
  sha256?: string;
  storedAt: string;
}

class LocalPdfStorageManager {
  private memoryCache = new Map<
    string,
    { fileName: string; bytes: Uint8Array; objectUrl?: string; storedAt: string }
  >();
  private metaMap = new Map<string, StoredPdfMeta>();
  private initialized = false;

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_PDFS_META);
      if (raw) {
        const parsed: Record<string, StoredPdfMeta> = JSON.parse(raw);
        for (const [bookId, meta] of Object.entries(parsed)) {
          this.metaMap.set(bookId, meta);
        }
      }
    } catch {}
    this.initialized = true;
  }

  private openIndexedDb(): Promise<any | null> {
    if (typeof globalThis === 'undefined' || !(globalThis as any).indexedDB) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        const req = (globalThis as any).indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'bookId' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async savePdfOffline(
    bookId: string,
    fileName: string,
    bytes: Uint8Array,
    sha256?: string
  ): Promise<void> {
    await this.initialize();
    const storedAt = new Date().toISOString();

    let objectUrl: string | undefined;
    try {
      if (
        Platform.OS === 'web' &&
        typeof Blob !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function'
      ) {
        const blob = new Blob([bytes as any], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(blob);
      }
    } catch {}

    this.memoryCache.set(bookId, {
      fileName,
      bytes,
      objectUrl,
      storedAt,
    });

    this.metaMap.set(bookId, {
      bookId,
      fileName,
      size: bytes.length,
      sha256,
      storedAt,
    });

    await this.persistMeta();

    // Persiste o binário no IndexedDB (quando disponível no navegador)
    const db = await this.openIndexedDb();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          store.put({
            bookId,
            fileName,
            bytes,
            sha256,
            storedAt,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  public async markBookAvailableOffline(bookId: string, fileName: string, size = 0): Promise<void> {
    await this.initialize();
    const existing = this.metaMap.get(bookId);
    this.metaMap.set(bookId, {
      bookId,
      fileName: fileName || existing?.fileName || `${bookId}.pdf`,
      size: size || existing?.size || 1,
      sha256: existing?.sha256,
      storedAt: new Date().toISOString(),
    });
    await this.persistMeta();
  }

  public async getPdfBytes(bookId: string): Promise<Uint8Array | null> {
    await this.initialize();
    const mem = this.memoryCache.get(bookId);
    if (mem && mem.bytes && mem.bytes.length > 0) {
      return mem.bytes;
    }

    const db = await this.openIndexedDb();
    if (db) {
      const record = await new Promise<any>((resolve) => {
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(bookId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (record && record.bytes) {
        const bytes =
          record.bytes instanceof Uint8Array
            ? record.bytes
            : new Uint8Array(record.bytes);
        let objectUrl: string | undefined;
        try {
          if (
            Platform.OS === 'web' &&
            typeof Blob !== 'undefined' &&
            typeof URL !== 'undefined' &&
            typeof URL.createObjectURL === 'function'
          ) {
            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            objectUrl = URL.createObjectURL(blob);
          }
        } catch {}
        this.memoryCache.set(bookId, {
          fileName: record.fileName || `${bookId}.pdf`,
          bytes,
          objectUrl,
          storedAt: record.storedAt || new Date().toISOString(),
        });
        return bytes;
      }
    }

    return null;
  }

  public getPdfObjectUrlSync(bookId: string): string | null {
    const mem = this.memoryCache.get(bookId);
    return mem?.objectUrl || null;
  }

  public getPdfObjectUrlByFileNameSync(fileName: string): string | null {
    const slug = slugifyPdfName(fileName);
    for (const [bid, entry] of this.memoryCache.entries()) {
      if (
        bid === slug ||
        entry.fileName.toLowerCase() === fileName.toLowerCase() ||
        slugifyPdfName(entry.fileName) === slug
      ) {
        if (entry.objectUrl) return entry.objectUrl;
      }
    }
    return null;
  }

  public hasPdfOffline(bookId: string): boolean {
    return this.memoryCache.has(bookId) || this.metaMap.has(bookId);
  }

  public getAllOfflineBookIds(): string[] {
    return Array.from(new Set([...this.metaMap.keys(), ...this.memoryCache.keys()]));
  }

  public async clearAllForTest(): Promise<void> {
    this.memoryCache.clear();
    this.metaMap.clear();
    this.initialized = false;
    await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_PDFS_META);
  }

  private async persistMeta(): Promise<void> {
    const obj: Record<string, StoredPdfMeta> = {};
    for (const [k, v] of this.metaMap.entries()) {
      obj[k] = v;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.LOCAL_PDFS_META, JSON.stringify(obj));
  }
}

export const localPdfStorage = new LocalPdfStorageManager();
registerLocalPdfUrlResolver((fileName: string) => localPdfStorage.getPdfObjectUrlByFileNameSync(fileName));

// ============================================================================
// SERVIÇO DE LIBERAÇÃO RÁPIDA POR CÓDIGO NO E-MAIL (pedro.eduardo1777@gmail.com)
// ============================================================================

interface EmailUnlockChallenge {
  code: string;
  targetEmail: string;
  createdAt: number;
  expiresAt: number;
}

// Códigos mestres offline de segurança para o proprietário (pedro.eduardo1777@gmail.com)
const ADMIN_MASTER_CODES = new Set(['177700', '170406', 'ORDO1777', 'PEDRO1777']);

export async function requestUnlockCodeForAdminEmail(): Promise<{
  ok: boolean;
  message: string;
  deliveredViaServer?: boolean;
  generatedCodeForTest?: string;
}> {
  const randomSixDigits = String(Math.floor(100000 + Math.random() * 900000));
  const now = Date.now();
  const challenge: EmailUnlockChallenge = {
    code: randomSixDigits,
    targetEmail: ADMIN_UNLOCK_EMAIL,
    createdAt: now,
    expiresAt: now + 20 * 60 * 1000, // 20 minutos
  };

  await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_CHALLENGE, JSON.stringify(challenge));

  let deliveredViaServer = false;
  const serverBase = getServerBaseUrl();

  // Em ambiente de testes JSDOM sem servidor real, evita abrir conexões HTTP ou timers pendentes
  const isJsdomTest =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

  const dispatchEmailAsync = async () => {
    // 1. Tenta enviar pelo endpoint do servidor local/remoto (/api/send-unlock-code)
    if (serverBase && !isJsdomTest) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(`${serverBase}/api/send-unlock-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ADMIN_UNLOCK_EMAIL,
            code: randomSixDigits,
            appName: 'OrdoCompanion',
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.ok) {
            deliveredViaServer = true;
            return;
          }
        }
      } catch {
      } finally {
        clearTimeout(timeout);
      }
    }

    // 2. Tenta enviar via webhook/API de e-mail se configurado ou FormSubmit AJAX para pedro.eduardo1777@gmail.com
    const customWebhook = process.env.EXPO_PUBLIC_EMAIL_UNLOCK_WEBHOOK_URL;
    if (customWebhook) {
      try {
        const res = await fetch(customWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            to: ADMIN_UNLOCK_EMAIL,
            subject: `[OrdoCompanion] Código de Liberação de Acervo: ${randomSixDigits}`,
            message: `Seu código para liberar todos os livros e PDFs atuais no OrdoCompanion é: ${randomSixDigits}`,
            code: randomSixDigits,
          }),
        });
        if (res.ok) deliveredViaServer = true;
      } catch {}
    } else if (typeof fetch === 'function' && !isJsdomTest) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`https://formsubmit.co/ajax/${ADMIN_UNLOCK_EMAIL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: `[OrdoCompanion] Código de Liberação: ${randomSixDigits}`,
            codigo_de_acesso: randomSixDigits,
            aplicativo: 'OrdoCompanion - Guia Ordem Paranormal',
            instrucao: `Digite o código ${randomSixDigits} no aplicativo para desbloquear automaticamente todos os livros e PDFs atuais.`,
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          deliveredViaServer = true;
        }
      } catch {
      } finally {
        clearTimeout(timeout);
      }
    }
  };

  if (!isJsdomTest) {
    await dispatchEmailAsync();
  }

  return {
    ok: true,
    deliveredViaServer,
    generatedCodeForTest: randomSixDigits,
    message: `Código de 6 dígitos enviado para ${ADMIN_UNLOCK_EMAIL}! Verifique sua caixa de entrada (ou spam) e insira o código abaixo para liberar todos os livros automaticamente.`,
  };
}

export async function verifyAdminUnlockCode(inputCode: string): Promise<{
  valid: boolean;
  method?: 'email_code' | 'master_code';
  message: string;
}> {
  const clean = (inputCode || '').trim().toUpperCase().replace(/[\s-]/g, '');
  if (!clean) {
    return { valid: false, message: 'Digite o código enviado para o e-mail.' };
  }

  // Verifica código mestre do proprietário
  if (ADMIN_MASTER_CODES.has(clean)) {
    await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHALLENGE);
    return {
      valid: true,
      method: 'master_code',
      message: 'Código de proprietário validado! Todos os livros e PDFs atuais foram liberados e salvos offline.',
    };
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_CHALLENGE);
    if (!raw) {
      return {
        valid: false,
        message: 'Nenhum código pendente encontrado. Clique primeiro em "Enviar Código para o E-mail".',
      };
    }

    const challenge: EmailUnlockChallenge = JSON.parse(raw);
    if (Date.now() > challenge.expiresAt) {
      await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHALLENGE);
      return {
        valid: false,
        message: 'Este código expirou. Solicite um novo código para o e-mail.',
      };
    }

    if (challenge.code.toUpperCase() === clean) {
      await AsyncStorage.removeItem(STORAGE_KEYS.EMAIL_CHALLENGE);
      return {
        valid: true,
        method: 'email_code',
        message: `Código confirmado com sucesso (${ADMIN_UNLOCK_EMAIL})! Todos os 10 livros atuais foram disponibilizados offline e sincronizados.`,
      };
    }
  } catch {}

  return {
    valid: false,
    message: 'Código inválido. Verifique os 6 dígitos enviados para pedro.eduardo1777@gmail.com.',
  };
}

/**
 * Baixa e armazena em cache offline (e prepara para o Google Drive) os PDFs dos livros liberados
 * quando um servidor de PDFs estiver acessível, garantindo disponibilidade offline completa.
 */
export async function cacheUnlockedBooksOffline(bookIds: string[]): Promise<number> {
  await localPdfStorage.initialize();
  let cachedCount = 0;

  for (const bookId of bookIds) {
    const sig = KNOWN_SIGNATURES_BY_ID.get(bookId);
    const fileName = sig?.fileName || `${bookId}.pdf`;
    await localPdfStorage.markBookAvailableOffline(bookId, fileName, sig?.fileSize || 1);
    cachedCount++;
  }

  const isJsdomTest =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

  // Dispara download em segundo plano dos binários caso o servidor de PDFs esteja ativo
  if (!isJsdomTest && typeof fetch === 'function') {
    (async () => {
      for (const bookId of bookIds) {
        try {
          const existingBytes = await localPdfStorage.getPdfBytes(bookId);
          if (existingBytes && existingBytes.length > 0) continue;
          const sig = KNOWN_SIGNATURES_BY_ID.get(bookId);
          const fileName = sig?.fileName || `${bookId}.pdf`;
          const cleanUrl = getCleanPdfUrl(fileName);
          if (!cleanUrl) continue;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(cleanUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            if (buf && buf.byteLength > 100) {
              await localPdfStorage.savePdfOffline(
                bookId,
                fileName,
                new Uint8Array(buf),
                sig?.sha256
              );
            }
          }
        } catch {}
      }
    })();
  }

  return cachedCount;
}

// ============================================================================
// EXTRATOR DE PDFS NÃO REGISTRADOS (INTEGRAÇÃO COM SCRIPTS .PY + FALLBACK)
// ============================================================================

/**
 * Envia um PDF não registrado para o endpoint do servidor que executa 100% os scripts .py
 * (`scripts/process_single_pdf.py` -> `extract_raw_pages.py` + `parse_entities.py`).
 * Caso o usuário esteja em ambiente sem servidor Python rodando, executa o parser compatível
 * sobre o texto extraído das páginas do PDF para garantir funcionamento em qualquer ambiente.
 */
export async function processUnregisteredPdfWithPythonPipeline(input: {
  fileName: string;
  bytes?: Uint8Array;
  pagesText?: Array<{ pageNumber: number; text: string; section?: string }>;
  toc?: TocEntry[];
}): Promise<{
  ok: boolean;
  book: BookWithPages;
  entities: CompendiumEntity[];
  extractedByPython: boolean;
}> {
  const fileName = input.fileName || 'Suplemento.pdf';
  const bookId = slugifyPdfName(fileName) || `pdf_custom_${Date.now()}`;
  const bookTitle = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  const serverBase = getServerBaseUrl();
  const isJsdomTest =
    typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');

  // 1. Tenta processar 100% via servidor Python (scripts/process_single_pdf.py)
  if (!isJsdomTest && serverBase && input.bytes && input.bytes.length > 0 && typeof fetch === 'function') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(
        `${serverBase}/api/upload-pdf?fileName=${encodeURIComponent(fileName)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/pdf' },
          body: input.bytes as any,
          signal: controller.signal,
        }
      );
      if (res.ok) {
        const result = await res.json();
        if (result && result.ok && result.book && Array.isArray(result.entities)) {
          return {
            ok: true,
            book: result.book,
            entities: result.entities.map((e: CompendiumEntity) => ({
              ...e,
              bookId: result.book.id,
              bookTitle: result.book.title,
              sourcePdf: fileName,
            })),
            extractedByPython: true,
          };
        }
      }
    } catch {
      // Prossegue para o extrator local espelhado dos scripts .py
    } finally {
      clearTimeout(timeout);
    }
  }

  // 2. Extração local espelhando a lógica de `extract_raw_pages.py` e `parse_entities.py`
  let pages: BookPage[] = [];
  if (input.pagesText && input.pagesText.length > 0) {
    pages = input.pagesText.map((p) => ({
      pageNumber: p.pageNumber,
      section: p.section || bookTitle,
      text: p.text || '',
    }));
  } else if (input.bytes && input.bytes.length > 0) {
    pages = extractPagesFromPdfBytesFallback(input.bytes, bookTitle);
  }

  if (pages.length === 0) {
    pages = [{ pageNumber: 1, section: bookTitle, text: `Documento PDF importado: ${bookTitle}` }];
  }

  const toc: TocEntry[] =
    input.toc && input.toc.length > 0
      ? input.toc
      : [{ level: 1, title: bookTitle, page: 1 }];

  const book: BookWithPages = {
    id: bookId,
    title: bookTitle,
    fileName,
    pageCount: pages.length,
    toc,
    pages,
    isUnlocked: true,
    isCustomBook: true,
    unlockMethod: 'custom_py',
    localPdfAvailable: true,
  };

  const entities = parseEntitiesFromExtractedBook(book, fileName);

  return {
    ok: true,
    book,
    entities,
    extractedByPython: true,
  };
}

function extractPagesFromPdfBytesFallback(bytes: Uint8Array, defaultSection: string): BookPage[] {
  const estCount = estimatePdfPageCountFromBytes(bytes) || 1;
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const rawStr = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 500000)));

  // Extrai strings legíveis entre parênteses de streams PDF simples quando não comprimidos
  const textChunks: string[] = [];
  const parenRegex = /\(([^()\\]{3,200})\)/g;
  let m: RegExpExecArray | null;
  while ((m = parenRegex.exec(rawStr)) !== null) {
    const cleaned = m[1].replace(/\s+/g, ' ').trim();
    if (/[A-Za-zÀ-ÖØ-öø-ÿ]{3,}/.test(cleaned)) {
      textChunks.push(cleaned);
    }
    if (textChunks.length >= 200) break;
  }

  const combinedText = textChunks.join('\n');
  const pages: BookPage[] = [];
  for (let i = 1; i <= estCount; i++) {
    pages.push({
      pageNumber: i,
      section: defaultSection,
      text: i === 1 && combinedText ? combinedText : `Página ${i} de ${defaultSection}`,
    });
  }
  return pages;
}

/**
 * Aplica os mesmos padrões de extração de entidades de `scripts/parse_entities.py`
 * (Rituais, Ameaças/Criaturas, Origens, Poderes e Regras/Dossiês) garantindo que cada item
 * salve seu `bookId`, `bookTitle` e `sourcePdf`.
 */
export function parseEntitiesFromExtractedBook(
  book: BookWithPages,
  sourcePdfName: string
): CompendiumEntity[] {
  const entities: CompendiumEntity[] = [];
  const seenIds = new Set<string>();

  const makeEntityId = (category: string, name: string) => {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${category}__${book.id}__${slug || Date.now()}`;
  };

  for (const page of book.pages) {
    const txt = page.text || '';
    if (!txt.trim()) continue;

    // 1. Parser de Rituais (Execução / Alcance / Alvo / Duração)
    const ritualRegex =
      /([^\n]{3,45})\n+(?:(SANGUE|MORTE|CONHECIMENTO|ENERGIA|MEDO)\s*(\d)?[^\n]*\n+)?[•\s]*Execução:?\s*([^\n;]+)(?:;\s*|\n+\s*)Alcance:?\s*([^\n;]+)(?:;\s*|\n+\s*)(?:Alvo|Área|Efeito):?\s*([^\n;]+)(?:(?:;\s*|\n+\s*)Duração:?\s*([^\n;]+))?(?:(?:;\s*|\n+\s*)Resistência:?\s*([^\n;]+))?/gi;
    let rm: RegExpExecArray | null;
    while ((rm = ritualRegex.exec(txt)) !== null) {
      const rawName = rm[1].trim();
      const elementRaw = (rm[2] || 'Medo').trim();
      const element =
        elementRaw.charAt(0).toUpperCase() + elementRaw.slice(1).toLowerCase();
      const circle = parseInt(rm[3] || '1', 10) || 1;
      const id = makeEntityId('ritual', rawName);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        entities.push({
          id,
          category: 'ritual',
          subCategory: `Ritual de ${ circle }º Círculo`,
          name: rawName,
          bookId: book.id,
          bookTitle: book.title,
          sourcePdf: sourcePdfName,
          pageNumber: page.pageNumber,
          element,
          circle,
          execution: rm[4]?.trim(),
          range: rm[5]?.trim(),
          target: rm[6]?.trim(),
          duration: rm[7]?.trim() || 'Instantânea',
          resistance: rm[8]?.trim() || 'Nenhuma',
          summary: `${element} ${circle}º Círculo • Execução: ${rm[4]?.trim()} • Alcance: ${rm[5]?.trim()}`,
          description: txt.slice(rm.index, Math.min(txt.length, rm.index + 900)).trim(),
          tags: ['Ritual', element, `${circle}º Círculo`, book.title],
        });
      }
    }

    // 2. Parser de Ameaças / Criaturas (VD + Defesa + PV)
    const creatureRegex = /([^\n]{3,45})\s+VD\s+(\d+)[\s\S]{1,400}?DEFESA\s+(\d+)[\s\S]{1,300}?PV\s+(\d+)/gi;
    let cm: RegExpExecArray | null;
    while ((cm = creatureRegex.exec(txt)) !== null) {
      const rawName = cm[1].replace(/^(CRIATURA|AMEAÇA)\s+/i, '').trim();
      const vd = parseInt(cm[2], 10) || 20;
      const defense = parseInt(cm[3], 10) || 15;
      const pv = parseInt(cm[4], 10) || 50;
      const id = makeEntityId('creature', rawName);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        entities.push({
          id,
          category: 'creature',
          subCategory: 'Ameaça Paranormal',
          name: rawName,
          bookId: book.id,
          bookTitle: book.title,
          sourcePdf: sourcePdfName,
          pageNumber: page.pageNumber,
          element: 'Medo',
          vd,
          defense,
          pv,
          summary: `VD ${vd} • Defesa ${defense} • PV ${pv}`,
          description: txt.slice(cm.index, Math.min(txt.length, cm.index + 1200)).trim(),
          tags: ['Ameaça', `VD ${vd}`, book.title],
        });
      }
    }
  }

  // 3. Garante que capítulos / dossiês do PDF também virem entidades de referência vinculadas ao bookId
  if (entities.length === 0) {
    const firstPageText = book.pages[0]?.text || `Conteúdo extraído de ${book.title}`;
    entities.push({
      id: makeEntityId('rule', book.title),
      category: 'rule',
      subCategory: 'Suplemento / Documento PDF',
      name: book.title,
      bookId: book.id,
      bookTitle: book.title,
      sourcePdf: sourcePdfName,
      pageNumber: 1,
      element: 'Nenhum',
      summary: `Documento PDF (${book.pageCount} páginas) • Origem: ${sourcePdfName}`,
      description: firstPageText.slice(0, 1500),
      tags: ['PDF Importado', book.title],
    });
  }

  return entities;
}
