import {
  BookInfo,
  BookPage,
  Campaign,
  CharacterSheet,
  CompendiumEntity,
  CompendiumFilters,
  CustomWeapon,
  SavedList,
  UserProfile,
} from '../types/compendium';

/**
 * Interface desacoplada de repositório de dados.
 * Hoje implementada por OfflineDataRepository (100% offline com Seed JSON + AsyncStorage).
 * Para migrar/sincronizar com nuvem (ex.: Supabase / Firebase) no futuro,
 * basta implementar esta mesma interface sem alterar nenhuma tela do aplicativo.
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

  // Livros e Páginas ("Ver Mais / Ler no Livro Original")
  getBooks(): BookInfo[];
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
