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
  SavedList,
  UnlockedBookRecord,
  UserProfile,
} from '../types/compendium';

/**
 * Interface desacoplada de repositório de dados.
 * Hoje implementada por OfflineDataRepository (100% offline com Seed JSON + AsyncStorage).
 * Para migrar/sincronizar com nuvem (ex.: Supabase / Firebase / Google Drive),
 * utiliza esta mesma interface sem alterar nenhuma tela do aplicativo.
 */
export interface IDataRepository {
  initialize(): Promise<void>;
  getAllEntities(): CompendiumEntity[];
  searchEntities(filters: CompendiumFilters, favoriteIds?: Set<string>): CompendiumEntity[];
  getEntityById(id: string): CompendiumEntity | undefined;
  hasOriginalSeedVersion(id: string): boolean;

  // CRUD de Entidades (Homebrew & Edição de itens oficiais)
  createEntity(input: Omit<CompendiumEntity, 'id'>): Promise<CompendiumEntity>;
  updateEntity(id: string, patch: Partial<CompendiumEntity>): Promise<CompendiumEntity>;
  deleteCustomEntity(id: string): Promise<void>;
  resetEntityToDefault(id: string): Promise<CompendiumEntity | undefined>;

  // Livros, Acesso por Origem de PDF e Páginas ("Ver Mais / Ler no Livro Original")
  getBooks(): BookInfo[];
  getAllCatalogBooks(): CatalogBookInfo[];
  getUnlockedBookIds(): string[];
  getUnlockedBooksRecordMap(): Record<string, UnlockedBookRecord>;
  isBookUnlocked(bookId: string): boolean;
  unlockBook(bookId: string, record?: Partial<UnlockedBookRecord>): Promise<UnlockedBookRecord>;
  unlockAllBooks(method?: BookUnlockMethod): Promise<UnlockedBookRecord[]>;
  lockBook(bookId: string): Promise<void>;
  lockAllBooks(): Promise<void>;
  registerDynamicPdfBook(
    book: BookWithPages,
    entities: CompendiumEntity[],
    fileName?: string,
    sha256?: string
  ): Promise<UnlockedBookRecord>;
  getDynamicBooks(): BookWithPages[];
  getDynamicEntities(): CompendiumEntity[];
  deleteDynamicPdfBook(bookId: string): Promise<boolean>;

  getBookPage(bookId: string, pageNumber: number): BookPage | undefined;
  searchInBookPages(bookId: string | 'all', query: string): Array<{
    bookId: string;
    bookTitle: string;
    pageNumber: number;
    section: string;
    snippet: string;
  }>;

  // Favoritos, Listas Salvas, Fichas, Campanhas e Armas Personalizadas
  getFavorites(): Promise<string[]>;
  toggleFavorite(entityId: string): Promise<string[]>;
  getSavedLists(): Promise<SavedList[]>;
  saveLists(lists: SavedList[]): Promise<void>;
  getCharacters(): Promise<CharacterSheet[]>;
  saveCharacters(characters: CharacterSheet[]): Promise<void>;
  getCampaigns(): Promise<Campaign[]>;
  saveCampaigns(campaigns: Campaign[]): Promise<void>;
  getCustomWeapons(): Promise<CustomWeapon[]>;
  saveCustomWeapons(weapons: CustomWeapon[]): Promise<void>;

  // Perfil do Usuário & Prontidão para Nuvem
  getUserProfile(): Promise<UserProfile>;
  saveUserProfile(profile: UserProfile): Promise<void>;

  // Backup / Exportação / Importação JSON
  exportUserDataJson(): Promise<string>;
  importUserDataJson(rawJson: string): Promise<void>;
}
