import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  BookInfo,
  BookPage,
  CharacterSheet,
  CompendiumEntity,
  CompendiumFilters,
  CustomWeapon,
  DEFAULT_USER_PROFILE,
  DiceRollResult,
  SavedList,
  UserProfile,
} from '../types/compendium';
import { defaultRepository } from '../repositories/OfflineDataRepository';
import { rollDiceFormula, rollOrdemTest } from '../utils/dice';
import {
  cloudSyncManager,
  SyncExecutionResult,
} from '../services/sync/CloudSyncManager';
import {
  MergeStats,
  SyncAuthState,
  SyncStatus,
} from '../services/sync/types';

interface AppContextValue {
  ready: boolean;
  entities: CompendiumEntity[];
  filteredEntities: CompendiumEntity[];
  books: BookInfo[];
  filters: CompendiumFilters;
  setFilters: React.Dispatch<React.SetStateAction<CompendiumFilters>>;
  resetFilters: () => void;

  // Entity lookup & CRUD
  getEntityById: (id: string) => CompendiumEntity | undefined;
  hasOriginalVersion: (id: string) => boolean;
  createEntity: (input: Omit<CompendiumEntity, 'id'>) => Promise<CompendiumEntity>;
  updateEntity: (id: string, patch: Partial<CompendiumEntity>) => Promise<CompendiumEntity>;
  deleteCustomEntity: (id: string) => Promise<void>;
  resetEntityToDefault: (id: string) => Promise<CompendiumEntity | undefined>;

  // Books & pages
  getBookPage: (bookId: string, pageNumber: number) => BookPage | undefined;
  searchInBookPages: (
    bookId: string | 'all',
    query: string
  ) => Array<{
    bookId: string;
    bookTitle: string;
    pageNumber: number;
    section: string;
    snippet: string;
  }>;

  // Favorites & Saved Lists
  favoriteIds: Set<string>;
  toggleFavorite: (entityId: string) => Promise<void>;
  savedLists: SavedList[];
  createSavedList: (name: string, description: string) => Promise<SavedList>;
  deleteSavedList: (listId: string) => Promise<void>;
  toggleEntityInList: (listId: string, entityId: string) => Promise<void>;

  // Character Sheets
  characters: CharacterSheet[];
  upsertCharacter: (sheet: CharacterSheet) => Promise<void>;
  deleteCharacter: (sheetId: string) => Promise<void>;

  // Custom Weapons & Armaria
  customWeapons: CustomWeapon[];
  upsertCustomWeapon: (weapon: CustomWeapon) => Promise<void>;
  deleteCustomWeapon: (weaponId: string) => Promise<void>;

  // Dice Roller & Toast
  rollHistory: DiceRollResult[];
  latestRoll: DiceRollResult | null;
  dismissLatestRoll: () => void;
  rollSkillTest: (attributeDice: number, bonus: number, label?: string) => DiceRollResult;
  rollFormula: (formula: string, label?: string) => DiceRollResult;
  clearRollHistory: () => void;

  // Backup Export / Import
  exportBackupJson: () => Promise<string>;
  importBackupJson: (jsonStr: string) => Promise<void>;

  // User Profile & Informações Gerais (Prontidão para Nuvem)
  userProfile: UserProfile;
  updateUserProfile: (patch: Partial<UserProfile>) => Promise<UserProfile>;

  // Sincronização em Nuvem / Google Drive
  syncStatus: SyncStatus;
  syncStatusMessage?: string;
  syncAuthState: SyncAuthState;
  connectGoogleDrive: () => Promise<SyncAuthState>;
  disconnectGoogleDrive: () => Promise<void>;
  syncWithDriveNow: (options?: { quiet?: boolean }) => Promise<SyncExecutionResult>;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => Promise<void>;
  lastSyncStats: MergeStats | null;

  // Layout das Listagens (1 coluna vs 2 colunas)
  listingColumns: 1 | 2;
  setListingColumns: (cols: 1 | 2) => Promise<void>;
  toggleListingColumns: () => Promise<void>;
}

const DEFAULT_FILTERS: CompendiumFilters = {
  query: '',
  category: 'all',
  bookId: 'all',
  element: 'all',
  circle: 'all',
  itemCategory: 'all',
  classes: [],
  excludedTypes: [],
  onlyFavorites: false,
  onlyCustomOrEdited: false,
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [versionTick, setVersionTick] = useState(0);
  const [filters, setFilters] = useState<CompendiumFilters>(DEFAULT_FILTERS);
  const [favoritesArr, setFavoritesArr] = useState<string[]>([]);
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [characters, setCharacters] = useState<CharacterSheet[]>([]);
  const [customWeapons, setCustomWeapons] = useState<CustomWeapon[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [listingColumns, setListingColumnsState] = useState<1 | 2>(1);
  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [latestRoll, setLatestRoll] = useState<DiceRollResult | null>(null);

  // Estados de Sincronização em Nuvem / Google Drive
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | undefined>(undefined);
  const [syncAuthState, setSyncAuthState] = useState<SyncAuthState>({ isAuthenticated: false });
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(true);
  const [lastSyncStats, setLastSyncStats] = useState<MergeStats | null>(null);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;

    (async () => {
      await defaultRepository.initialize();
      const [favs, lists, chars, weapons, profile] = await Promise.all([
        defaultRepository.getFavorites(),
        defaultRepository.getSavedLists(),
        defaultRepository.getCharacters(),
        defaultRepository.getCustomWeapons(),
        defaultRepository.getUserProfile(),
      ]);
      setFavoritesArr(favs);
      setSavedLists(lists);
      setCharacters(chars);
      setCustomWeapons(weapons);
      setUserProfile(profile);
      if (profile.listingColumns === 1 || profile.listingColumns === 2) {
        setListingColumnsState(profile.listingColumns);
      }

      // Inicializa CloudSyncManager
      await cloudSyncManager.initialize();
      setSyncAuthState(cloudSyncManager.getAuthState());
      setAutoSyncEnabledState(cloudSyncManager.isAutoSyncActive());
      setLastSyncStats(cloudSyncManager.getLastStats());

      unsubscribeStatus = cloudSyncManager.addStatusListener((status, msg) => {
        setSyncStatus(status);
        setSyncStatusMessage(msg);
        setSyncAuthState(cloudSyncManager.getAuthState());
        setLastSyncStats(cloudSyncManager.getLastStats());
      });

      setReady(true);
    })();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
    };
  }, []);

  const favoriteIds = useMemo(() => new Set(favoritesArr), [favoritesArr]);

  const entities = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.getAllEntities();
  }, [ready, versionTick]);

  const books = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.getBooks();
  }, [ready]);

  const filteredEntities = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.searchEntities(filters, favoriteIds);
  }, [ready, filters, favoriteIds, versionTick]);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const getEntityById = (id: string) => defaultRepository.getEntityById(id);
  const hasOriginalVersion = (id: string) => defaultRepository.hasOriginalSeedVersion(id);

  const createEntity = async (input: Omit<CompendiumEntity, 'id'>) => {
    const created = await defaultRepository.createEntity(input);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return created;
  };

  const updateEntity = async (id: string, patch: Partial<CompendiumEntity>) => {
    const updated = await defaultRepository.updateEntity(id, patch);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return updated;
  };

  const deleteCustomEntity = async (id: string) => {
    await defaultRepository.deleteCustomEntity(id);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
  };

  const resetEntityToDefault = async (id: string) => {
    const restored = await defaultRepository.resetEntityToDefault(id);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return restored;
  };

  const toggleFavorite = async (entityId: string) => {
    const next = await defaultRepository.toggleFavorite(entityId);
    setFavoritesArr(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const createSavedList = async (name: string, description: string): Promise<SavedList> => {
    const newList: SavedList = {
      id: `list_${Date.now()}`,
      name: name.trim() || 'Nova Lista',
      description: description.trim(),
      entityIds: [],
      createdAt: new Date().toISOString(),
    };
    const next = [newList, ...savedLists];
    setSavedLists(next);
    await defaultRepository.saveLists(next);
    cloudSyncManager.scheduleAutoSync();
    return newList;
  };

  const deleteSavedList = async (listId: string) => {
    const next = savedLists.filter((l) => l.id !== listId);
    setSavedLists(next);
    await defaultRepository.saveLists(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const toggleEntityInList = async (listId: string, entityId: string) => {
    const next = savedLists.map((list) => {
      if (list.id !== listId) return list;
      const exists = list.entityIds.includes(entityId);
      return {
        ...list,
        entityIds: exists
          ? list.entityIds.filter((id) => id !== entityId)
          : [...list.entityIds, entityId],
      };
    });
    setSavedLists(next);
    await defaultRepository.saveLists(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const upsertCharacter = async (sheet: CharacterSheet) => {
    const exists = characters.some((c) => c.id === sheet.id);
    const next = exists
      ? characters.map((c) => (c.id === sheet.id ? sheet : c))
      : [sheet, ...characters];
    setCharacters(next);
    await defaultRepository.saveCharacters(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const deleteCharacter = async (sheetId: string) => {
    const next = characters.filter((c) => c.id !== sheetId);
    setCharacters(next);
    await defaultRepository.saveCharacters(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const upsertCustomWeapon = async (weapon: CustomWeapon) => {
    const exists = customWeapons.some((w) => w.id === weapon.id);
    const next = exists
      ? customWeapons.map((w) => (w.id === weapon.id ? weapon : w))
      : [weapon, ...customWeapons];
    setCustomWeapons(next);
    await defaultRepository.saveCustomWeapons(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const deleteCustomWeapon = async (weaponId: string) => {
    const next = customWeapons.filter((w) => w.id !== weaponId);
    setCustomWeapons(next);
    await defaultRepository.saveCustomWeapons(next);
    cloudSyncManager.scheduleAutoSync();
  };

  const rollSkillTest = (attributeDice: number, bonus: number, label?: string) => {
    const res = rollOrdemTest(attributeDice, bonus, label);
    setLatestRoll(res);
    setRollHistory((prev) => [res, ...prev.slice(0, 49)]);
    return res;
  };

  const rollFormula = (formula: string, label?: string) => {
    const res = rollDiceFormula(formula, label);
    setLatestRoll(res);
    setRollHistory((prev) => [res, ...prev.slice(0, 49)]);
    return res;
  };

  const dismissLatestRoll = () => setLatestRoll(null);
  const clearRollHistory = () => {
    setRollHistory([]);
    setLatestRoll(null);
  };

  const updateUserProfile = async (patch: Partial<UserProfile>): Promise<UserProfile> => {
    const next: UserProfile = {
      ...userProfile,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (patch.listingColumns === 1 || patch.listingColumns === 2) {
      setListingColumnsState(patch.listingColumns);
    }
    setUserProfile(next);
    await defaultRepository.saveUserProfile(next);
    cloudSyncManager.scheduleAutoSync();
    return next;
  };

  const setListingColumns = async (cols: 1 | 2) => {
    setListingColumnsState(cols);
    await updateUserProfile({ listingColumns: cols });
  };

  const toggleListingColumns = async () => {
    const nextCols: 1 | 2 = listingColumns === 1 ? 2 : 1;
    await setListingColumns(nextCols);
  };

  const reloadFromRepository = async () => {
    const [favs, lists, chars, weapons, profile] = await Promise.all([
      defaultRepository.getFavorites(),
      defaultRepository.getSavedLists(),
      defaultRepository.getCharacters(),
      defaultRepository.getCustomWeapons(),
      defaultRepository.getUserProfile(),
    ]);
    setFavoritesArr(favs);
    setSavedLists(lists);
    setCharacters(chars);
    setCustomWeapons(weapons);
    setUserProfile(profile);
    if (profile.listingColumns === 1 || profile.listingColumns === 2) {
      setListingColumnsState(profile.listingColumns);
    }
    setVersionTick((v) => v + 1);
  };

  const connectGoogleDrive = async (): Promise<SyncAuthState> => {
    const auth = await cloudSyncManager.connectGoogleDrive();
    setSyncAuthState(auth);
    if (auth.isAuthenticated) {
      await reloadFromRepository();
    }
    return auth;
  };

  const disconnectGoogleDrive = async (): Promise<void> => {
    await cloudSyncManager.disconnectGoogleDrive();
    setSyncAuthState({ isAuthenticated: false });
  };

  const syncWithDriveNow = async (options?: { quiet?: boolean }): Promise<SyncExecutionResult> => {
    const result = await cloudSyncManager.syncNow(options);
    if (result.success) {
      await reloadFromRepository();
    }
    return result;
  };

  const setAutoSyncEnabled = async (enabled: boolean): Promise<void> => {
    await cloudSyncManager.setAutoSyncEnabled(enabled);
    setAutoSyncEnabledState(enabled);
  };

  const exportBackupJson = () => defaultRepository.exportUserDataJson();
  const importBackupJson = async (jsonStr: string) => {
    await defaultRepository.importUserDataJson(jsonStr);
    await reloadFromRepository();
    cloudSyncManager.scheduleAutoSync();
  };

  return (
    <AppContext.Provider
      value={{
        ready,
        entities,
        filteredEntities,
        books,
        filters,
        setFilters,
        resetFilters,
        getEntityById,
        hasOriginalVersion,
        createEntity,
        updateEntity,
        deleteCustomEntity,
        resetEntityToDefault,
        getBookPage: (b, p) => defaultRepository.getBookPage(b, p),
        searchInBookPages: (b, q) => defaultRepository.searchInBookPages(b, q),
        favoriteIds,
        toggleFavorite,
        savedLists,
        createSavedList,
        deleteSavedList,
        toggleEntityInList,
        characters,
        upsertCharacter,
        deleteCharacter,
        customWeapons,
        upsertCustomWeapon,
        deleteCustomWeapon,
        rollHistory,
        latestRoll,
        dismissLatestRoll,
        rollSkillTest,
        rollFormula,
        clearRollHistory,
        userProfile,
        updateUserProfile,
        listingColumns,
        setListingColumns,
        toggleListingColumns,
        exportBackupJson,
        importBackupJson,
        // Sincronização em Nuvem / Google Drive
        syncStatus,
        syncStatusMessage,
        syncAuthState,
        connectGoogleDrive,
        disconnectGoogleDrive,
        syncWithDriveNow,
        autoSyncEnabled,
        setAutoSyncEnabled,
        lastSyncStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return ctx;
}
