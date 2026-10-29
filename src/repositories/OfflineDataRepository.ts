import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookInfo,
  BookPage,
  BookUnlockMethod,
  BookWithPages,
  Campaign,
  CatalogBookInfo,
  CharacterSheet,
  CompendiumEntity,
  CompendiumFilters,
  CustomWeapon,
  EntityClassFilter,
  ExcludableType,
  SavedList,
  UnlockedBookRecord,
  UserProfile,
  DEFAULT_USER_PROFILE,
} from '../types/compendium';
import { IDataRepository } from './IDataRepository';
import { localPdfStorage } from '../services/pdf/PdfAccessService';

import compendiumSeedRaw from '../data/seed/compendium_seed.json';
import booksPagesSeedRaw from '../data/seed/books_pages_seed.json';

export const UNLOCKED_BOOKS_STORAGE_KEY = '@ordem_paranormal:unlocked_books_v1';

const STORAGE_KEYS = {
  CUSTOM_ENTITIES: '@ordem_paranormal:custom_entities_v1',
  EDITED_ENTITIES: '@ordem_paranormal:edited_entities_v1',
  UNLOCKED_BOOKS: UNLOCKED_BOOKS_STORAGE_KEY,
  DYNAMIC_BOOKS: '@ordem_paranormal:dynamic_books_v1',
  DYNAMIC_ENTITIES: '@ordem_paranormal:dynamic_entities_v1',
  FAVORITES: '@ordem_paranormal:favorites_v1',
  SAVED_LISTS: '@ordem_paranormal:saved_lists_v1',
  CHARACTERS: '@ordem_paranormal:characters_v1',
  CAMPAIGNS: '@ordem_paranormal:campaigns_v1',
  CUSTOM_WEAPONS: '@ordem_paranormal:custom_weapons_v1',
  USER_PROFILE: '@ordem_paranormal:user_profile_v1',
};

export function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function sortBooksCanonical<T extends BookInfo>(books: T[]): T[] {
  return [...books].sort((a, b) => {
    const keyA = getBookPriority(a);
    const keyB = getBookPriority(b);
    if (keyA.priority !== keyB.priority) {
      return keyA.priority - keyB.priority;
    }
    if (keyA.num !== keyB.num) {
      return keyA.num - keyB.num;
    }
    return (a.title || '').localeCompare(b.title || '', 'pt-BR');
  });
}

function getBookPriority(book: BookInfo): { priority: number; num: number } {
  const all = `${book.id || ''} ${book.title || ''} ${book.fileName || ''}`.toLowerCase();
  if (all.includes('livro_base') || all.includes('livro base')) {
    return { priority: 0, num: 0 };
  }
  if (all.includes('sobrevivendo') || all.includes('horror')) {
    return { priority: 1, num: 0 };
  }
  if (all.includes('arquivo')) {
    const match = all.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 999;
    return { priority: 2, num };
  }
  return { priority: 3, num: 0 };
}

export function getEntityClasses(
  ent: CompendiumEntity
): Array<EntityClassFilter> {
  const cn = (ent.className || '').trim().toLowerCase();
  const sc = (ent.subCategory || '').trim().toLowerCase();
  const name = (ent.name || '').trim().toLowerCase();
  const cat = ent.category;
  const tags = (ent.tags || []).map((t) => t.trim().toLowerCase());

  const matched: Array<'Combatente' | 'Especialista' | 'Ocultista'> = [];

  const check = (term: string) => {
    if (cat === 'class') {
      return name.includes(term);
    }
    return (
      cn.includes(term) ||
      sc.includes(term) ||
      tags.includes(term) ||
      tags.includes(`poder de ${term}`) ||
      tags.includes(`trilha de ${term}`)
    );
  };

  if (check('combatente')) matched.push('Combatente');
  if (check('especialista')) matched.push('Especialista');
  if (check('ocultista')) matched.push('Ocultista');

  if (matched.length === 0) {
    return ['none'];
  }
  return matched;
}

export function isEntityExcluded(
  ent: CompendiumEntity,
  excludedTypes?: ExcludableType[]
): boolean {
  if (!excludedTypes || excludedTypes.length === 0) return false;

  for (const t of excludedTypes) {
    if (
      t === 'rules' &&
      ent.category === 'rule' &&
      ent.subCategory !== 'Dossiê / Caso (Arquivos Secretos)' &&
      !ent.bookId.startsWith('arquivos_secretos')
    ) {
      return true;
    }
    if (
      t === 'missionStories' &&
      ent.category === 'rule' &&
      (ent.subCategory === 'Dossiê / Caso (Arquivos Secretos)' ||
        ent.bookId.startsWith('arquivos_secretos'))
    ) {
      return true;
    }
    if (t === 'creatures' && ent.category === 'creature') {
      return true;
    }
    if (t === 'items' && ent.category === 'item') {
      return true;
    }
    if (t === 'weapons' && ent.category === 'weapon') {
      return true;
    }
    if (t === 'origins' && ent.category === 'origin') {
      return true;
    }
    if (t === 'conditions' && (ent.category === 'condition' || ent.category === 'skill')) {
      return true;
    }
    if (t === 'rituals' && ent.category === 'ritual') {
      return true;
    }
    if (t === 'powers' && ent.category === 'power') {
      return true;
    }
  }

  return false;
}

export class OfflineDataRepository implements IDataRepository {
  private seedEntitiesMap: Map<string, CompendiumEntity> = new Map();
  private customEntitiesMap: Map<string, CompendiumEntity> = new Map();
  private editedEntitiesMap: Map<string, CompendiumEntity> = new Map();
  private dynamicEntitiesMap: Map<string, CompendiumEntity> = new Map();
  private booksList: BookInfo[] = [];
  private dynamicBooksMap: Map<string, BookWithPages> = new Map();
  private unlockedBooksMap: Map<string, UnlockedBookRecord> = new Map();
  private bookFileNameByIdMap: Map<string, string> = new Map();
  private entityCountByBookMap: Map<string, number> = new Map();
  private booksPagesMap: Map<string, BookWithPages> = new Map();
  private bookPagesByNumMap: Map<string, BookPage> = new Map();
  private pageNormTextCache: WeakMap<BookPage, string> = new WeakMap();
  private entitySearchTextCache: Map<string, string> = new Map();
  private entityClassesCache: Map<string, Array<EntityClassFilter>> = new Map();
  private cachedAllEntities: CompendiumEntity[] | null = null;
  private userProfile: UserProfile = DEFAULT_USER_PROFILE;
  private initialized = false;

  async initialize(): Promise<void> {
    await localPdfStorage.initialize();

    if (!this.initialized) {
      const compData = compendiumSeedRaw as unknown as {
        books: BookInfo[];
        entities: CompendiumEntity[];
      };
      const pagesData = booksPagesSeedRaw as unknown as {
        books: Record<string, BookWithPages>;
      };

      this.booksList = sortBooksCanonical(compData.books || []);
      this.bookFileNameByIdMap.clear();
      this.entityCountByBookMap.clear();

      for (const b of this.booksList) {
        this.bookFileNameByIdMap.set(b.id, b.fileName);
        this.entityCountByBookMap.set(b.id, 0);
      }

      for (const ent of compData.entities || []) {
        const sourcePdf = ent.sourcePdf || this.bookFileNameByIdMap.get(ent.bookId) || `${ent.bookId}.pdf`;
        const enriched: CompendiumEntity = {
          ...ent,
          sourcePdf,
        };
        this.seedEntitiesMap.set(ent.id, enriched);
        this.entityCountByBookMap.set(
          ent.bookId,
          (this.entityCountByBookMap.get(ent.bookId) || 0) + 1
        );
      }

      if (pagesData && pagesData.books) {
        for (const [bid, bval] of Object.entries(pagesData.books)) {
          this.booksPagesMap.set(bid, bval);
          if (bval && Array.isArray(bval.pages)) {
            for (const page of bval.pages) {
              this.bookPagesByNumMap.set(`${bid}:${page.pageNumber}`, page);
            }
          }
        }
      }
    }

    this.unlockedBooksMap.clear();
    this.dynamicBooksMap.clear();
    this.dynamicEntitiesMap.clear();
    this.customEntitiesMap.clear();
    this.editedEntitiesMap.clear();
    this.invalidateEntityCache();

    try {
      const [
        customRaw,
        editedRaw,
        profileRaw,
        unlockedRaw,
        dynamicBooksRaw,
        dynamicEntitiesRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_ENTITIES),
        AsyncStorage.getItem(STORAGE_KEYS.EDITED_ENTITIES),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED_BOOKS),
        AsyncStorage.getItem(STORAGE_KEYS.DYNAMIC_BOOKS),
        AsyncStorage.getItem(STORAGE_KEYS.DYNAMIC_ENTITIES),
      ]);

      if (profileRaw) {
        try {
          this.userProfile = { ...DEFAULT_USER_PROFILE, ...JSON.parse(profileRaw) };
        } catch {}
      }

      if (unlockedRaw) {
        try {
          const parsedUnlocked = JSON.parse(unlockedRaw);
          if (Array.isArray(parsedUnlocked)) {
            for (const bid of parsedUnlocked) {
              if (typeof bid === 'string' && bid) {
                this.unlockedBooksMap.set(bid, {
                  bookId: bid,
                  unlockedAt: new Date().toISOString(),
                  method: 'pdf_upload',
                });
              }
            }
          } else if (parsedUnlocked && typeof parsedUnlocked === 'object') {
            for (const [bid, rec] of Object.entries(parsedUnlocked)) {
              if (rec && typeof rec === 'object') {
                this.unlockedBooksMap.set(bid, rec as UnlockedBookRecord);
              }
            }
          }
        } catch {}
      }

      if (dynamicBooksRaw) {
        try {
          const parsedDynBooks: BookWithPages[] = JSON.parse(dynamicBooksRaw);
          for (const db of parsedDynBooks) {
            if (db && db.id) {
              this.dynamicBooksMap.set(db.id, db);
              this.bookFileNameByIdMap.set(db.id, db.fileName);
              this.booksPagesMap.set(db.id, db);
              for (const page of db.pages || []) {
                this.bookPagesByNumMap.set(`${db.id}:${page.pageNumber}`, page);
              }
            }
          }
        } catch {}
      }

      if (dynamicEntitiesRaw) {
        try {
          const parsedDynEnts: CompendiumEntity[] = JSON.parse(dynamicEntitiesRaw);
          for (const de of parsedDynEnts) {
            if (de && de.id) {
              const sourcePdf =
                de.sourcePdf || this.bookFileNameByIdMap.get(de.bookId) || `${de.bookId}.pdf`;
              this.dynamicEntitiesMap.set(de.id, { ...de, sourcePdf });
              this.entityCountByBookMap.set(
                de.bookId,
                (this.entityCountByBookMap.get(de.bookId) || 0) + 1
              );
            }
          }
        } catch {}
      }

      if (customRaw) {
        const parsedCustom: CompendiumEntity[] = JSON.parse(customRaw);
        for (const item of parsedCustom) {
          this.customEntitiesMap.set(item.id, {
            ...item,
            sourcePdf: item.sourcePdf || 'Homebrew',
            isCustom: true,
          });
        }
      }

      if (editedRaw) {
        const parsedEdited: Record<string, CompendiumEntity> = JSON.parse(editedRaw);
        for (const [id, item] of Object.entries(parsedEdited)) {
          this.editedEntitiesMap.set(id, { ...item, isEdited: true });
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar customizações locais:', e);
    }

    this.initialized = true;
  }

  private getNormalizedSearchText(ent: CompendiumEntity): string {
    let cached = this.entitySearchTextCache.get(ent.id);
    if (cached === undefined) {
      cached = normalizeText(
        `${ent.name} ${ent.subCategory} ${ent.element} ${ent.summary} ${ent.description} ${ent.bookTitle} ${(ent.tags || []).join(' ')}`
      );
      this.entitySearchTextCache.set(ent.id, cached);
    }
    return cached;
  }

  private getCachedEntityClasses(ent: CompendiumEntity): Array<EntityClassFilter> {
    let cached = this.entityClassesCache.get(ent.id);
    if (cached === undefined) {
      cached = getEntityClasses(ent);
      this.entityClassesCache.set(ent.id, cached);
    }
    return cached;
  }

  private invalidateEntityCache(id?: string): void {
    this.cachedAllEntities = null;
    if (id) {
      this.entitySearchTextCache.delete(id);
      this.entityClassesCache.delete(id);
    } else {
      this.entitySearchTextCache.clear();
      this.entityClassesCache.clear();
    }
  }

  // ============================================================================
  // CONTROLE DE ACESSO POR LIVRO / ORIGEM DO PDF
  // ============================================================================

  getUnlockedBookIds(): string[] {
    return Array.from(this.unlockedBooksMap.keys());
  }

  getUnlockedBooksRecordMap(): Record<string, UnlockedBookRecord> {
    return Object.fromEntries(this.unlockedBooksMap.entries());
  }

  isBookUnlocked(bookId: string): boolean {
    if (!bookId || bookId === 'custom') return true;
    return this.unlockedBooksMap.has(bookId);
  }

  async unlockBook(
    bookId: string,
    record?: Partial<UnlockedBookRecord>
  ): Promise<UnlockedBookRecord> {
    const existing = this.unlockedBooksMap.get(bookId);
    const fileName =
      record?.fileName ||
      existing?.fileName ||
      this.bookFileNameByIdMap.get(bookId) ||
      `${bookId}.pdf`;

    const fullRecord: UnlockedBookRecord = {
      bookId,
      unlockedAt: record?.unlockedAt || existing?.unlockedAt || new Date().toISOString(),
      method: record?.method || existing?.method || 'pdf_upload',
      fileName,
      sha256: record?.sha256 || existing?.sha256,
      localPdfStored:
        record?.localPdfStored ?? existing?.localPdfStored ?? localPdfStorage.hasPdfOffline(bookId),
      driveFileId: record?.driveFileId || existing?.driveFileId,
    };

    this.unlockedBooksMap.set(bookId, fullRecord);
    this.invalidateEntityCache();
    await this.persistUnlockedBooks();
    return fullRecord;
  }

  async unlockAllBooks(method: BookUnlockMethod = 'email_code'): Promise<UnlockedBookRecord[]> {
    const nowIso = new Date().toISOString();
    const allBookIds = new Set<string>([
      ...this.booksList.map((b) => b.id),
      ...this.dynamicBooksMap.keys(),
    ]);

    const records: UnlockedBookRecord[] = [];
    for (const bid of allBookIds) {
      const existing = this.unlockedBooksMap.get(bid);
      const fileName = this.bookFileNameByIdMap.get(bid) || `${bid}.pdf`;
      const rec: UnlockedBookRecord = {
        bookId: bid,
        unlockedAt: existing?.unlockedAt || nowIso,
        method: existing?.method || method,
        fileName,
        sha256: existing?.sha256,
        localPdfStored: true,
        driveFileId: existing?.driveFileId,
      };
      this.unlockedBooksMap.set(bid, rec);
      records.push(rec);
    }

    this.invalidateEntityCache();
    await this.persistUnlockedBooks();
    return records;
  }

  async lockBook(bookId: string): Promise<void> {
    if (this.unlockedBooksMap.has(bookId)) {
      this.unlockedBooksMap.delete(bookId);
      this.invalidateEntityCache();
      await this.persistUnlockedBooks();
    }
  }

  async lockAllBooks(): Promise<void> {
    this.unlockedBooksMap.clear();
    this.invalidateEntityCache();
    await this.persistUnlockedBooks();
  }

  async registerDynamicPdfBook(
    book: BookWithPages,
    entities: CompendiumEntity[],
    fileName?: string,
    sha256?: string
  ): Promise<UnlockedBookRecord> {
    const cleanBook: BookWithPages = {
      ...book,
      fileName: fileName || book.fileName || `${book.id}.pdf`,
      isUnlocked: true,
      isCustomBook: true,
      unlockMethod: 'custom_py',
    };

    this.dynamicBooksMap.set(cleanBook.id, cleanBook);
    this.bookFileNameByIdMap.set(cleanBook.id, cleanBook.fileName);
    this.booksPagesMap.set(cleanBook.id, cleanBook);

    for (const page of cleanBook.pages || []) {
      this.bookPagesByNumMap.set(`${cleanBook.id}:${page.pageNumber}`, page);
    }

    // Remove entidades antigas do mesmo bookId dinâmico antes de reinserir
    for (const [eid, ent] of this.dynamicEntitiesMap.entries()) {
      if (ent.bookId === cleanBook.id) {
        this.dynamicEntitiesMap.delete(eid);
      }
    }

    let count = 0;
    for (const ent of entities) {
      const enriched: CompendiumEntity = {
        ...ent,
        bookId: cleanBook.id,
        bookTitle: cleanBook.title,
        sourcePdf: cleanBook.fileName,
      };
      this.dynamicEntitiesMap.set(enriched.id, enriched);
      count++;
    }
    this.entityCountByBookMap.set(cleanBook.id, count);

    await Promise.all([this.persistDynamicBooks(), this.persistDynamicEntities()]);

    return await this.unlockBook(cleanBook.id, {
      method: 'custom_py',
      fileName: cleanBook.fileName,
      sha256,
      localPdfStored: true,
    });
  }

  getDynamicBooks(): BookWithPages[] {
    return Array.from(this.dynamicBooksMap.values());
  }

  getDynamicEntities(): CompendiumEntity[] {
    return Array.from(this.dynamicEntitiesMap.values());
  }

  async deleteDynamicPdfBook(bookId: string): Promise<boolean> {
    const isDynamic = this.dynamicBooksMap.has(bookId);
    const hasEntities = Array.from(this.dynamicEntitiesMap.values()).some((e) => e.bookId === bookId);
    const hasPages = this.booksPagesMap.has(bookId);

    if (!isDynamic && !hasEntities && !hasPages) {
      if (this.unlockedBooksMap.has(bookId)) {
        await this.lockBook(bookId);
      }
      return false;
    }

    // 1. Remove páginas daquele livro do mapa por página
    const dynBook = this.dynamicBooksMap.get(bookId);
    if (dynBook && dynBook.pages) {
      for (const p of dynBook.pages) {
        this.bookPagesByNumMap.delete(`${bookId}:${p.pageNumber}`);
      }
    }
    for (const key of Array.from(this.bookPagesByNumMap.keys())) {
      if (key.startsWith(`${bookId}:`)) {
        this.bookPagesByNumMap.delete(key);
      }
    }

    // 2. Remove o livro dos mapas
    this.dynamicBooksMap.delete(bookId);
    this.booksPagesMap.delete(bookId);
    this.bookFileNameByIdMap.delete(bookId);
    this.entityCountByBookMap.delete(bookId);

    // 3. Remove entidades dinâmicas associadas ao livro
    for (const [eid, ent] of Array.from(this.dynamicEntitiesMap.entries())) {
      if (ent.bookId === bookId) {
        this.dynamicEntitiesMap.delete(eid);
        this.editedEntitiesMap.delete(eid);
      }
    }

    // 4. Remove do mapa de livros desbloqueados
    this.unlockedBooksMap.delete(bookId);

    // 5. Invalida cache de entidades
    this.invalidateEntityCache();

    // 6. Persiste alterações no armazenamento local
    await Promise.all([
      this.persistDynamicBooks(),
      this.persistDynamicEntities(),
      this.persistUnlockedBooks(),
      this.persistEditedEntities(),
    ]);

    return true;
  }

  private async persistUnlockedBooks(): Promise<void> {
    const obj = Object.fromEntries(this.unlockedBooksMap.entries());
    await AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED_BOOKS, JSON.stringify(obj));
  }

  private async persistDynamicBooks(): Promise<void> {
    const arr = Array.from(this.dynamicBooksMap.values());
    await AsyncStorage.setItem(STORAGE_KEYS.DYNAMIC_BOOKS, JSON.stringify(arr));
  }

  private async persistDynamicEntities(): Promise<void> {
    const arr = Array.from(this.dynamicEntitiesMap.values());
    await AsyncStorage.setItem(STORAGE_KEYS.DYNAMIC_ENTITIES, JSON.stringify(arr));
  }

  // ============================================================================
  // LISTAGEM E BUSCA DE ENTIDADES (FILTRADAS PELOS LIVROS DESBLOQUEADOS)
  // ============================================================================

  getAllEntities(): CompendiumEntity[] {
    if (this.cachedAllEntities) {
      return this.cachedAllEntities;
    }

    const merged: CompendiumEntity[] = [];

    // 1. Entidades customizadas (Homebrew do usuário) estão sempre liberadas
    for (const custom of this.customEntitiesMap.values()) {
      merged.push(custom);
    }

    // 2. Entidades extraídas de PDFs dinâmicos (via .py) cujos livros estão liberados
    for (const [id, dynEnt] of this.dynamicEntitiesMap.entries()) {
      if (!this.isBookUnlocked(dynEnt.bookId)) continue;
      const edited = this.editedEntitiesMap.get(id);
      merged.push(edited ? { ...dynEnt, ...edited, isEdited: true } : dynEnt);
    }

    // 3. Entidades dos 10 livros oficiais — APENAS daqueles que o usuário tem acesso liberado
    for (const [id, seedEnt] of this.seedEntitiesMap.entries()) {
      if (!this.isBookUnlocked(seedEnt.bookId)) continue;
      const edited = this.editedEntitiesMap.get(id);
      merged.push(edited ? { ...seedEnt, ...edited, isEdited: true } : seedEnt);
    }

    this.cachedAllEntities = merged;
    return merged;
  }

  getEntityById(id: string): CompendiumEntity | undefined {
    if (this.customEntitiesMap.has(id)) {
      return this.customEntitiesMap.get(id);
    }
    if (this.dynamicEntitiesMap.has(id)) {
      const dyn = this.dynamicEntitiesMap.get(id)!;
      if (!this.isBookUnlocked(dyn.bookId)) return undefined;
      const edited = this.editedEntitiesMap.get(id);
      return edited ? { ...dyn, ...edited, isEdited: true } : dyn;
    }
    const seed = this.seedEntitiesMap.get(id);
    if (seed && !this.isBookUnlocked(seed.bookId)) {
      return undefined;
    }
    const edited = this.editedEntitiesMap.get(id);
    if (seed && edited) {
      return { ...seed, ...edited, isEdited: true };
    }
    return seed || edited;
  }

  hasOriginalSeedVersion(id: string): boolean {
    return (
      (this.seedEntitiesMap.has(id) || this.dynamicEntitiesMap.has(id)) &&
      this.editedEntitiesMap.has(id)
    );
  }

  searchEntities(filters: CompendiumFilters, favoriteIds?: Set<string>): CompendiumEntity[] {
    const all = this.getAllEntities();
    const qNorm = normalizeText(filters.query);
    const qTokens = qNorm ? qNorm.split(/\s+/).filter(Boolean) : [];

    const hasCategory = filters.category !== 'all';
    const hasBookId = filters.bookId !== 'all';
    const isCustomBook = filters.bookId === 'custom';
    const hasElement = filters.element !== 'all';
    const lowerElement = hasElement ? filters.element.toLowerCase() : '';
    const hasCircle = filters.circle !== 'all';
    const hasItemCategory = filters.itemCategory !== 'all';
    const hasClasses = Boolean(filters.classes && filters.classes.length > 0);
    const hasExclusions = Boolean(filters.excludedTypes && filters.excludedTypes.length > 0);
    const hasMinVd = typeof filters.minVd === 'number';
    const hasMaxVd = typeof filters.maxVd === 'number';
    const onlyFavorites = Boolean(filters.onlyFavorites && favoriteIds);
    const onlyCustomOrEdited = Boolean(filters.onlyCustomOrEdited);
    const hasTokens = qTokens.length > 0;

    return all.filter((ent) => {
      if (hasCategory && ent.category !== filters.category) {
        return false;
      }

      if (hasBookId) {
        if (isCustomBook) {
          if (!ent.isCustom && !ent.isEdited) return false;
        } else if (ent.bookId !== filters.bookId) {
          return false;
        }
      }

      if (hasElement) {
        if (!ent.element || !ent.element.toLowerCase().includes(lowerElement)) {
          return false;
        }
      }

      if (hasCircle && ent.category === 'ritual') {
        if (ent.circle !== filters.circle) return false;
      }

      if (hasItemCategory && (ent.category === 'weapon' || ent.category === 'item')) {
        if (ent.itemCategory !== filters.itemCategory) return false;
      }

      if (filters.powerType && filters.powerType !== 'all' && ent.category === 'power') {
        const sub = (ent.subCategory || '').toLowerCase();
        const isClass = sub.includes('combatente') || sub.includes('especialista') || sub.includes('ocultista');
        const isParanormal = sub.includes('paranormal') || (!isClass && ent.element && ent.element !== 'Nenhum');
        if (filters.powerType === 'class' && !isClass) return false;
        if (filters.powerType === 'paranormal' && !isParanormal) return false;
        if (filters.powerType === 'general' && (isClass || isParanormal)) return false;
      }

      if (hasClasses) {
        const entClasses = this.getCachedEntityClasses(ent);
        const matches = filters.classes!.some((c) => entClasses.includes(c));
        if (!matches) return false;
      }

      if (hasExclusions) {
        if (filters.category === 'all' || filters.category !== ent.category) {
          if (isEntityExcluded(ent, filters.excludedTypes)) return false;
        }
      }

      if (hasMinVd && ent.category === 'creature') {
        if ((ent.vd ?? 0) < filters.minVd!) return false;
      }

      if (hasMaxVd && ent.category === 'creature') {
        if ((ent.vd ?? 0) > filters.maxVd!) return false;
      }

      if (onlyFavorites) {
        if (!favoriteIds!.has(ent.id)) return false;
      }

      if (onlyCustomOrEdited) {
        if (!ent.isCustom && !ent.isEdited) return false;
      }

      if (hasTokens) {
        const searchable = this.getNormalizedSearchText(ent);
        for (let i = 0; i < qTokens.length; i++) {
          if (!searchable.includes(qTokens[i])) return false;
        }
      }

      return true;
    });
  }

  async createEntity(input: Omit<CompendiumEntity, 'id'>): Promise<CompendiumEntity> {
    const id = `custom__${input.category}__${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEntity: CompendiumEntity = {
      ...input,
      id,
      bookId: input.bookId || 'custom',
      bookTitle: input.bookTitle || 'Conteúdo Pessoal (Homebrew)',
      sourcePdf: input.sourcePdf || 'Homebrew',
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    this.customEntitiesMap.set(id, newEntity);
    this.invalidateEntityCache(id);
    await this.persistCustomEntities();
    return newEntity;
  }

  async updateEntity(id: string, patch: Partial<CompendiumEntity>): Promise<CompendiumEntity> {
    if (this.customEntitiesMap.has(id)) {
      const existing = this.customEntitiesMap.get(id)!;
      const updated: CompendiumEntity = {
        ...existing,
        ...patch,
        id,
        isCustom: true,
        updatedAt: new Date().toISOString(),
      };
      this.customEntitiesMap.set(id, updated);
      this.invalidateEntityCache(id);
      await this.persistCustomEntities();
      return updated;
    }

    const base = this.getEntityById(id) || this.seedEntitiesMap.get(id) || this.dynamicEntitiesMap.get(id);
    if (!base) {
      throw new Error(`Entidade ${id} não encontrada`);
    }

    const updatedOfficial: CompendiumEntity = {
      ...base,
      ...patch,
      id,
      isEdited: true,
      updatedAt: new Date().toISOString(),
    };
    this.editedEntitiesMap.set(id, updatedOfficial);
    this.invalidateEntityCache(id);
    await this.persistEditedEntities();
    return updatedOfficial;
  }

  async deleteCustomEntity(id: string): Promise<void> {
    if (this.customEntitiesMap.has(id)) {
      this.customEntitiesMap.delete(id);
      this.invalidateEntityCache(id);
      await this.persistCustomEntities();
    }
  }

  async resetEntityToDefault(id: string): Promise<CompendiumEntity | undefined> {
    if (this.editedEntitiesMap.has(id)) {
      this.editedEntitiesMap.delete(id);
      this.invalidateEntityCache(id);
      await this.persistEditedEntities();
    }
    return this.seedEntitiesMap.get(id) || this.dynamicEntitiesMap.get(id);
  }

  private async persistCustomEntities(): Promise<void> {
    const arr = Array.from(this.customEntitiesMap.values());
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_ENTITIES, JSON.stringify(arr));
  }

  private async persistEditedEntities(): Promise<void> {
    const obj: Record<string, CompendiumEntity> = {};
    for (const [k, v] of this.editedEntitiesMap.entries()) {
      obj[k] = v;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.EDITED_ENTITIES, JSON.stringify(obj));
  }

  /**
   * Retorna apenas os livros aos quais o usuário já possui acesso desbloqueado
   * (para exibição no leitor de PDFs e nos filtros de livros).
   */
  getBooks(): BookInfo[] {
    const combined: BookInfo[] = [];

    for (const b of this.booksList) {
      if (!this.isBookUnlocked(b.id)) continue;
      const rec = this.unlockedBooksMap.get(b.id);
      combined.push({
        ...b,
        isUnlocked: true,
        unlockedAt: rec?.unlockedAt,
        unlockMethod: rec?.method,
        localPdfAvailable: Boolean(rec?.localPdfStored || localPdfStorage.hasPdfOffline(b.id)),
        driveFileId: rec?.driveFileId,
      });
    }

    for (const db of this.dynamicBooksMap.values()) {
      if (!this.isBookUnlocked(db.id)) continue;
      const rec = this.unlockedBooksMap.get(db.id);
      combined.push({
        id: db.id,
        title: db.title,
        fileName: db.fileName,
        pageCount: db.pageCount,
        toc: db.toc,
        isUnlocked: true,
        isCustomBook: true,
        unlockedAt: rec?.unlockedAt,
        unlockMethod: rec?.method || 'custom_py',
        localPdfAvailable: Boolean(rec?.localPdfStored || localPdfStorage.hasPdfOffline(db.id)),
        driveFileId: rec?.driveFileId,
      });
    }

    return sortBooksCanonical(combined);
  }

  /**
   * Retorna o catálogo completo de todos os livros registrados + livros dinâmicos
   * com status de desbloqueio, quantidade de entidades e disponibilidade offline/Drive.
   */
  getAllCatalogBooks(): CatalogBookInfo[] {
    const catalog: CatalogBookInfo[] = [];

    for (const b of this.booksList) {
      const unlocked = this.isBookUnlocked(b.id);
      const rec = this.unlockedBooksMap.get(b.id);
      const localAvail = Boolean(rec?.localPdfStored || localPdfStorage.hasPdfOffline(b.id));
      catalog.push({
        ...b,
        isUnlocked: unlocked,
        unlockedAt: rec?.unlockedAt,
        unlockMethod: rec?.method,
        entityCount: this.entityCountByBookMap.get(b.id) || 0,
        localPdfAvailable: localAvail,
        driveFileId: rec?.driveFileId,
        driveSynced: Boolean(rec?.driveFileId),
      });
    }

    for (const db of this.dynamicBooksMap.values()) {
      if (this.booksList.some((b) => b.id === db.id)) continue;
      const unlocked = this.isBookUnlocked(db.id);
      const rec = this.unlockedBooksMap.get(db.id);
      const localAvail = Boolean(rec?.localPdfStored || localPdfStorage.hasPdfOffline(db.id));
      catalog.push({
        id: db.id,
        title: db.title,
        fileName: db.fileName,
        pageCount: db.pageCount,
        toc: db.toc,
        isUnlocked: unlocked,
        isCustomBook: true,
        unlockedAt: rec?.unlockedAt,
        unlockMethod: rec?.method || 'custom_py',
        entityCount: this.entityCountByBookMap.get(db.id) || 0,
        localPdfAvailable: localAvail,
        driveFileId: rec?.driveFileId,
        driveSynced: Boolean(rec?.driveFileId),
      });
    }

    return sortBooksCanonical(catalog);
  }

  getBookPage(bookId: string, pageNumber: number): BookPage | undefined {
    if (!this.isBookUnlocked(bookId)) return undefined;
    return this.bookPagesByNumMap.get(`${bookId}:${pageNumber}`);
  }

  searchInBookPages(
    bookId: string | 'all',
    query: string
  ): Array<{
    bookId: string;
    bookTitle: string;
    pageNumber: number;
    section: string;
    snippet: string;
  }> {
    const qNorm = normalizeText(query);
    if (!qNorm || qNorm.length < 2) return [];

    const results: Array<{
      bookId: string;
      bookTitle: string;
      pageNumber: number;
      section: string;
      snippet: string;
    }> = [];

    for (const [bid, book] of this.booksPagesMap.entries()) {
      if (!this.isBookUnlocked(bid)) continue;
      if (bookId !== 'all' && bid !== bookId) continue;

      for (const page of book.pages) {
        let normPage = this.pageNormTextCache.get(page);
        if (normPage === undefined) {
          normPage = (page.text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          this.pageNormTextCache.set(page, normPage);
        }
        const matchIndex = normPage.indexOf(qNorm);
        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 60);
          const end = Math.min(page.text.length, matchIndex + qNorm.length + 120);
          const rawSnippet = page.text.slice(start, end).replace(/\s+/g, ' ').trim();
          results.push({
            bookId: bid,
            bookTitle: book.title,
            pageNumber: page.pageNumber,
            section: page.section,
            snippet: (start > 0 ? '...' : '') + rawSnippet + (end < page.text.length ? '...' : ''),
          });
          if (results.length >= 80) return results;
        }
      }
    }

    return results;
  }

  async getFavorites(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async toggleFavorite(entityId: string): Promise<string[]> {
    const current = await this.getFavorites();
    const set = new Set(current);
    if (set.has(entityId)) {
      set.delete(entityId);
    } else {
      set.add(entityId);
    }
    const updated = Array.from(set);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return updated;
  }

  async getSavedLists(): Promise<SavedList[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_LISTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveLists(lists: SavedList[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SAVED_LISTS, JSON.stringify(lists));
  }

  async getCharacters(): Promise<CharacterSheet[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CHARACTERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveCharacters(characters: CharacterSheet[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  }

  async getCampaigns(): Promise<Campaign[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveCampaigns(campaigns: Campaign[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  }

  async getCustomWeapons(): Promise<CustomWeapon[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_WEAPONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async saveCustomWeapons(weapons: CustomWeapon[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_WEAPONS, JSON.stringify(weapons));
  }

  async getUserProfile(): Promise<UserProfile> {
    return { ...this.userProfile };
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.userProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.userProfile));
  }

  async exportUserDataJson(): Promise<string> {
    const [favorites, savedLists, characters, campaigns, customWeapons, userProfile] = await Promise.all([
      this.getFavorites(),
      this.getSavedLists(),
      this.getCharacters(),
      this.getCampaigns(),
      this.getCustomWeapons(),
      this.getUserProfile(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      userProfile,
      customEntities: Array.from(this.customEntitiesMap.values()),
      editedEntities: Object.fromEntries(this.editedEntitiesMap.entries()),
      unlockedBooks: Object.fromEntries(this.unlockedBooksMap.entries()),
      dynamicBooks: Array.from(this.dynamicBooksMap.values()),
      dynamicEntities: Array.from(this.dynamicEntitiesMap.values()),
      favorites,
      savedLists,
      characters,
      campaigns,
      customWeapons,
    };

    return JSON.stringify(payload, null, 2);
  }

  async importUserDataJson(rawJson: string): Promise<void> {
    const parsed = JSON.parse(rawJson);

    if (parsed.userProfile && typeof parsed.userProfile === 'object') {
      await this.saveUserProfile(parsed.userProfile);
    }

    if (parsed.unlockedBooks && typeof parsed.unlockedBooks === 'object') {
      for (const [bid, rec] of Object.entries(parsed.unlockedBooks)) {
        if (rec && typeof rec === 'object') {
          this.unlockedBooksMap.set(bid, rec as UnlockedBookRecord);
        }
      }
      await this.persistUnlockedBooks();
    }

    if (Array.isArray(parsed.dynamicBooks)) {
      for (const db of parsed.dynamicBooks) {
        if (db && db.id) {
          this.dynamicBooksMap.set(db.id, db);
          this.bookFileNameByIdMap.set(db.id, db.fileName);
          this.booksPagesMap.set(db.id, db);
          for (const page of db.pages || []) {
            this.bookPagesByNumMap.set(`${db.id}:${page.pageNumber}`, page);
          }
        }
      }
      await this.persistDynamicBooks();
    }

    if (Array.isArray(parsed.dynamicEntities)) {
      for (const de of parsed.dynamicEntities) {
        if (de && de.id) {
          this.dynamicEntitiesMap.set(de.id, de);
        }
      }
      await this.persistDynamicEntities();
    }

    if (Array.isArray(parsed.customEntities)) {
      this.customEntitiesMap.clear();
      for (const item of parsed.customEntities) {
        if (item && item.id) {
          this.customEntitiesMap.set(item.id, { ...item, isCustom: true });
        }
      }
      await this.persistCustomEntities();
    }

    if (parsed.editedEntities && typeof parsed.editedEntities === 'object') {
      this.editedEntitiesMap.clear();
      for (const [id, item] of Object.entries(parsed.editedEntities)) {
        this.editedEntitiesMap.set(id, { ...(item as CompendiumEntity), isEdited: true });
      }
      await this.persistEditedEntities();
    }

    if (Array.isArray(parsed.favorites)) {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(parsed.favorites));
    }

    if (Array.isArray(parsed.savedLists)) {
      await this.saveLists(parsed.savedLists);
    }

    if (Array.isArray(parsed.characters)) {
      await this.saveCharacters(parsed.characters);
    }

    if (Array.isArray(parsed.campaigns)) {
      await this.saveCampaigns(parsed.campaigns);
    }

    if (Array.isArray(parsed.customWeapons)) {
      await this.saveCustomWeapons(parsed.customWeapons);
    }

    this.invalidateEntityCache();
  }
}

export const defaultRepository = new OfflineDataRepository();
