import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnnotationStroke, PageAnnotationData } from '../../types/annotations';

const ANNOTATION_KEY_PREFIX = '@ordo:annotations';
const ANNOTATION_INDEX_PREFIX = '@ordo:annotations_index';

// Cache em memória para acesso síncrono e ultra-rápido durante a virada de páginas
const memoryCache = new Map<string, AnnotationStroke[]>();
const indexMemoryCache = new Map<string, Set<number>>();

function getPageKey(bookId: string, pageNumber: number): string {
  return `${ANNOTATION_KEY_PREFIX}:${bookId}:${pageNumber}`;
}

function getIndexKey(bookId: string): string {
  return `${ANNOTATION_INDEX_PREFIX}:${bookId}`;
}

export class PageAnnotationsService {
  private static instance: PageAnnotationsService;

  private constructor() {}

  public static getInstance(): PageAnnotationsService {
    if (!PageAnnotationsService.instance) {
      PageAnnotationsService.instance = new PageAnnotationsService();
    }
    return PageAnnotationsService.instance;
  }

  /**
   * Retorna os traços salvos para uma página específica do livro.
   */
  public async getPageAnnotations(bookId: string, pageNumber: number): Promise<AnnotationStroke[]> {
    if (!bookId || pageNumber < 1) return [];

    const cacheKey = `${bookId}:${pageNumber}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey) || [];
    }

    try {
      const storageKey = getPageKey(bookId, pageNumber);
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) {
        memoryCache.set(cacheKey, []);
        return [];
      }

      const data: PageAnnotationData = JSON.parse(raw);
      const strokes = Array.isArray(data.strokes) ? data.strokes : [];
      memoryCache.set(cacheKey, strokes);
      return strokes;
    } catch (e) {
      console.warn(`[PageAnnotationsService] Erro ao carregar anotações de ${bookId}:${pageNumber}`, e);
      return [];
    }
  }

  /**
   * Salva os traços desenhados na página e atualiza o índice de páginas anotadas.
   */
  public async savePageAnnotations(
    bookId: string,
    pageNumber: number,
    strokes: AnnotationStroke[]
  ): Promise<void> {
    if (!bookId || pageNumber < 1) return;

    const cacheKey = `${bookId}:${pageNumber}`;
    memoryCache.set(cacheKey, strokes);

    const storageKey = getPageKey(bookId, pageNumber);

    try {
      if (!strokes || strokes.length === 0) {
        await AsyncStorage.removeItem(storageKey);
        await this.removeFromIndex(bookId, pageNumber);
        return;
      }

      const payload: PageAnnotationData = {
        bookId,
        pageNumber,
        strokes,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
      await this.addToIndex(bookId, pageNumber);
    } catch (e) {
      console.warn(`[PageAnnotationsService] Erro ao salvar anotações de ${bookId}:${pageNumber}`, e);
    }
  }

  /**
   * Remove todas as anotações da página especificada.
   */
  public async clearPageAnnotations(bookId: string, pageNumber: number): Promise<void> {
    await this.savePageAnnotations(bookId, pageNumber, []);
  }

  /**
   * Retorna se uma página possui ao menos um traço desenhado.
   */
  public async hasAnnotations(bookId: string, pageNumber: number): Promise<boolean> {
    const list = await this.listAnnotatedPages(bookId);
    return list.includes(pageNumber);
  }

  /**
   * Retorna a lista ordenada de páginas que possuem anotações neste livro.
   */
  public async listAnnotatedPages(bookId: string): Promise<number[]> {
    if (!bookId) return [];

    if (indexMemoryCache.has(bookId)) {
      return Array.from(indexMemoryCache.get(bookId)!).sort((a, b) => a - b);
    }

    try {
      const indexKey = getIndexKey(bookId);
      const raw = await AsyncStorage.getItem(indexKey);
      if (!raw) {
        indexMemoryCache.set(bookId, new Set<number>());
        return [];
      }
      const parsed: number[] = JSON.parse(raw);
      const set = new Set(Array.isArray(parsed) ? parsed : []);
      indexMemoryCache.set(bookId, set);
      return Array.from(set).sort((a, b) => a - b);
    } catch {
      return [];
    }
  }

  /**
   * Remove todo o índice e anotações do livro especificado.
   */
  public async clearAllBookAnnotations(bookId: string): Promise<void> {
    if (!bookId) return;

    const pages = await this.listAnnotatedPages(bookId);
    for (const p of pages) {
      try {
        await AsyncStorage.removeItem(getPageKey(bookId, p));
        memoryCache.delete(`${bookId}:${p}`);
      } catch {}
    }

    try {
      await AsyncStorage.removeItem(getIndexKey(bookId));
      indexMemoryCache.delete(bookId);
    } catch {}
  }

  private async addToIndex(bookId: string, pageNumber: number): Promise<void> {
    let set = indexMemoryCache.get(bookId);
    if (!set) {
      await this.listAnnotatedPages(bookId);
      set = indexMemoryCache.get(bookId) || new Set<number>();
    }

    if (!set.has(pageNumber)) {
      set.add(pageNumber);
      indexMemoryCache.set(bookId, set);
      try {
        await AsyncStorage.setItem(getIndexKey(bookId), JSON.stringify(Array.from(set)));
      } catch {}
    }
  }

  private async removeFromIndex(bookId: string, pageNumber: number): Promise<void> {
    let set = indexMemoryCache.get(bookId);
    if (!set) {
      await this.listAnnotatedPages(bookId);
      set = indexMemoryCache.get(bookId) || new Set<number>();
    }

    if (set.has(pageNumber)) {
      set.delete(pageNumber);
      indexMemoryCache.set(bookId, set);
      try {
        await AsyncStorage.setItem(getIndexKey(bookId), JSON.stringify(Array.from(set)));
      } catch {}
    }
  }

  /**
   * Limpa cache de memória (útil para testes unitários).
   */
  public clearMemoryCache(): void {
    memoryCache.clear();
    indexMemoryCache.clear();
  }
}

export const pageAnnotationsService = PageAnnotationsService.getInstance();
