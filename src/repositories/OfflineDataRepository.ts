import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookInfo,
  BookPage,
  BookWithPages,
  CharacterSheet,
  CompendiumEntity,
  CompendiumFilters,
  CustomWeapon,
  EntityClassFilter,
  ExcludableType,
  SavedList,
  UserProfile,
  DEFAULT_USER_PROFILE,
} from '../types/compendium';
import { IDataRepository } from './IDataRepository';

import compendiumSeedRaw from '../data/seed/compendium_seed.json';
import booksPagesSeedRaw from '../data/seed/books_pages_seed.json';

const STORAGE_KEYS = {
  CUSTOM_ENTITIES: '@ordem_paranormal:custom_entities_v1',
  EDITED_ENTITIES: '@ordem_paranormal:edited_entities_v1',
  FAVORITES: '@ordem_paranormal:favorites_v1',
  SAVED_LISTS: '@ordem_paranormal:saved_lists_v1',
  CHARACTERS: '@ordem_paranormal:characters_v1',
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

export function sortBooksCanonical(books: BookInfo[]): BookInfo[] {
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
  private booksList: BookInfo[] = [];
  private booksPagesMap: Map<string, BookWithPages> = new Map();
  private userProfile: UserProfile = DEFAULT_USER_PROFILE;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const compData = compendiumSeedRaw as unknown as {
      books: BookInfo[];
      entities: CompendiumEntity[];
    };
    const pagesData = booksPagesSeedRaw as unknown as {
      books: Record<string, BookWithPages>;
    };

    this.booksList = sortBooksCanonical(compData.books || []);
    for (const ent of compData.entities || []) {
      this.seedEntitiesMap.set(ent.id, ent);
    }

    if (pagesData && pagesData.books) {
      for (const [bid, bval] of Object.entries(pagesData.books)) {
        this.booksPagesMap.set(bid, bval);
      }
    }

    try {
      const [customRaw, editedRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_ENTITIES),
        AsyncStorage.getItem(STORAGE_KEYS.EDITED_ENTITIES),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
      ]);

      if (profileRaw) {
        try {
          this.userProfile = { ...DEFAULT_USER_PROFILE, ...JSON.parse(profileRaw) };
        } catch {}
      }

      if (customRaw) {
        const parsedCustom: CompendiumEntity[] = JSON.parse(customRaw);
        for (const item of parsedCustom) {
          this.customEntitiesMap.set(item.id, { ...item, isCustom: true });
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

  getAllEntities(): CompendiumEntity[] {
    const merged: CompendiumEntity[] = [];

    // 1. Custom entities first so user creations are easy to spot
    for (const custom of this.customEntitiesMap.values()) {
      merged.push(custom);
    }

    // 2. Seed entities (with local edits applied if any)
    for (const [id, seedEnt] of this.seedEntitiesMap.entries()) {
      const edited = this.editedEntitiesMap.get(id);
      merged.push(edited ? { ...seedEnt, ...edited, isEdited: true } : seedEnt);
    }

    return merged;
  }

  getEntityById(id: string): CompendiumEntity | undefined {
    if (this.customEntitiesMap.has(id)) {
      return this.customEntitiesMap.get(id);
    }
    const seed = this.seedEntitiesMap.get(id);
    const edited = this.editedEntitiesMap.get(id);
    if (seed && edited) {
      return { ...seed, ...edited, isEdited: true };
    }
    return seed || edited;
  }

  hasOriginalSeedVersion(id: string): boolean {
    return this.seedEntitiesMap.has(id) && this.editedEntitiesMap.has(id);
  }

  searchEntities(filters: CompendiumFilters, favoriteIds?: Set<string>): CompendiumEntity[] {
    const all = this.getAllEntities();
    const qNorm = normalizeText(filters.query);
    const qTokens = qNorm ? qNorm.split(/\s+/).filter(Boolean) : [];

    return all.filter((ent) => {
      if (filters.category !== 'all' && ent.category !== filters.category) {
        return false;
      }

      if (filters.bookId !== 'all') {
        if (filters.bookId === 'custom') {
          if (!ent.isCustom && !ent.isEdited) return false;
        } else if (ent.bookId !== filters.bookId) {
          return false;
        }
      }

      if (filters.element !== 'all') {
        if (!ent.element || !ent.element.toLowerCase().includes(filters.element.toLowerCase())) {
          return false;
        }
      }

      if (filters.circle !== 'all' && ent.category === 'ritual') {
        if (ent.circle !== filters.circle) return false;
      }

      if (filters.itemCategory !== 'all' && (ent.category === 'weapon' || ent.category === 'item')) {
        if (ent.itemCategory !== filters.itemCategory) return false;
      }

      if (filters.classes && filters.classes.length > 0) {
        const entClasses = getEntityClasses(ent);
        const matches = filters.classes.some((c) => entClasses.includes(c));
        if (!matches) return false;
      }

      if (filters.excludedTypes && filters.excludedTypes.length > 0) {
        if (isEntityExcluded(ent, filters.excludedTypes)) return false;
      }

      if (typeof filters.minVd === 'number' && ent.category === 'creature') {
        if ((ent.vd ?? 0) < filters.minVd) return false;
      }

      if (typeof filters.maxVd === 'number' && ent.category === 'creature') {
        if ((ent.vd ?? 0) > filters.maxVd) return false;
      }

      if (filters.onlyFavorites && favoriteIds) {
        if (!favoriteIds.has(ent.id)) return false;
      }

      if (filters.onlyCustomOrEdited) {
        if (!ent.isCustom && !ent.isEdited) return false;
      }

      if (qTokens.length > 0) {
        const searchable = normalizeText(
          `${ent.name} ${ent.subCategory} ${ent.element} ${ent.summary} ${ent.description} ${ent.bookTitle} ${(ent.tags || []).join(' ')}`
        );
        for (const tk of qTokens) {
          if (!searchable.includes(tk)) return false;
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
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };

    this.customEntitiesMap.set(id, newEntity);
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
      await this.persistCustomEntities();
      return updated;
    }

    const base = this.getEntityById(id);
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
    await this.persistEditedEntities();
    return updatedOfficial;
  }

  async deleteCustomEntity(id: string): Promise<void> {
    if (this.customEntitiesMap.has(id)) {
      this.customEntitiesMap.delete(id);
      await this.persistCustomEntities();
    }
  }

  async resetEntityToDefault(id: string): Promise<CompendiumEntity | undefined> {
    if (this.editedEntitiesMap.has(id)) {
      this.editedEntitiesMap.delete(id);
      await this.persistEditedEntities();
    }
    return this.seedEntitiesMap.get(id);
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

  getBooks(): BookInfo[] {
    return sortBooksCanonical(this.booksList);
  }

  getBookPage(bookId: string, pageNumber: number): BookPage | undefined {
    const book = this.booksPagesMap.get(bookId);
    if (!book) return undefined;
    return book.pages.find((p) => p.pageNumber === pageNumber);
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
      if (bookId !== 'all' && bid !== bookId) continue;

      for (const page of book.pages) {
        const normPage = normalizeText(page.text);
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
    const [favorites, savedLists, characters, customWeapons, userProfile] = await Promise.all([
      this.getFavorites(),
      this.getSavedLists(),
      this.getCharacters(),
      this.getCustomWeapons(),
      this.getUserProfile(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      userProfile,
      customEntities: Array.from(this.customEntitiesMap.values()),
      editedEntities: Object.fromEntries(this.editedEntitiesMap.entries()),
      favorites,
      savedLists,
      characters,
      customWeapons,
    };

    return JSON.stringify(payload, null, 2);
  }

  async importUserDataJson(rawJson: string): Promise<void> {
    const parsed = JSON.parse(rawJson);

    if (parsed.userProfile && typeof parsed.userProfile === 'object') {
      await this.saveUserProfile(parsed.userProfile);
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

    if (Array.isArray(parsed.customWeapons)) {
      await this.saveCustomWeapons(parsed.customWeapons);
    }
  }
}

export const defaultRepository: IDataRepository = new OfflineDataRepository();
