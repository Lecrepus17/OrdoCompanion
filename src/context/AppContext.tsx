import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BookInfo,
  CatalogBookInfo,
  BookPage,
  Campaign,
  CampaignAgentLink,
  CampaignInitiativeEntry,
  CampaignMonster,
  CampaignStoryScene,
  CharacterAttack,
  CharacterInventoryItem,
  CharacterSheet,
  CompendiumEntity,
  CompendiumFilters,
  CustomCatalogItem,
  CustomWeapon,
  DEFAULT_USER_PROFILE,
  DiceRollResult,
  SavedList,
  UserProfile,
  WeaponAttackContext,
} from '../types/compendium';
import { defaultRepository } from '../repositories/OfflineDataRepository';
import {
  normalizeCriticalDamageMode,
  rollDiceFormula,
  rollOrdemTest,
  rollWeaponDamage,
  WeaponDamageRollOptions,
} from '../utils/dice';
import {
  buildAttackFromCustomWeapon,
  buildInventoryItemsFromCustomWeapon,
  cloneCustomWeaponForAgent,
  migrateCharacterLegacyAttacksToArmory,
  syncCharacterWithCustomWeapon,
} from '../utils/weapons';
import {
  buildInventoryItemFromCatalogItem,
  cloneCatalogItemForAgent,
  syncCharacterWithCatalogItem,
} from '../utils/inventoryItems';
import {
  cloudSyncManager,
  SyncExecutionResult,
} from '../services/sync/CloudSyncManager';
import {
  MergeStats,
  SyncAuthState,
  SyncStatus,
} from '../services/sync/types';
import {
  TableCombatState,
  TableParticipant,
  TableRollActionType,
  TableRollEvent,
  TableSceneBroadcast,
  VirtualTableRoomConfig,
  VirtualTableRoomState,
} from '../types/virtualTable';
import { virtualTableManager } from '../services/virtualTable/VirtualTableManager';
import { TableConnectionStatus } from '../services/virtualTable/IVirtualTableConnector';
import { UpdateCheckResult } from '../services/updates/types';
import { updateCheckerService } from '../services/updates/UpdateCheckerService';
import { RecordPreviewRequest } from '../types/recordPreview';
import { OFFICIAL_SKILLS_LIST, SkillDefinition } from '../utils/progression';
import {
  identifyUploadedPdf,
  localPdfStorage,
  requestUnlockCodeForAdminEmail,
  verifyAdminUnlockCode,
  verifyMasterUnlockPassword,
  cacheUnlockedBooksOffline,
  processUnregisteredPdfWithPythonPipeline,
} from '../services/pdf/PdfAccessService';
import { clearPdfJsCache } from '../components/PdfViewerModal';
import { removePdfFilesFromCacheAndStorage } from '../services/pdf/PdfCacheService';

interface AppContextValue {
  ready: boolean;
  entities: CompendiumEntity[];
  filteredEntities: CompendiumEntity[];
  books: BookInfo[];
  catalogBooks: CatalogBookInfo[];
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

  // Campaigns & Aba de Mestre
  campaigns: Campaign[];
  activeCampaignId: string | null;
  setActiveCampaignId: (id: string | null) => void;
  activeCampaign: Campaign | null;
  upsertCampaign: (campaign: Campaign) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  addMonsterToCampaign: (campaignId: string, monster: CampaignMonster) => Promise<void>;
  updateMonsterInCampaign: (campaignId: string, monsterId: string, patch: Partial<CampaignMonster>) => Promise<void>;
  deleteMonsterFromCampaign: (campaignId: string, monsterId: string) => Promise<void>;
  saveMonsterToCompendium: (monster: CampaignMonster) => Promise<CompendiumEntity>;
  addAgentToCampaign: (campaignId: string, link: CampaignAgentLink) => Promise<void>;
  updateAgentInCampaign: (campaignId: string, linkId: string, patch: Partial<CampaignAgentLink>) => Promise<void>;
  deleteAgentFromCampaign: (campaignId: string, linkId: string) => Promise<void>;
  addStorySceneToCampaign: (campaignId: string, scene: CampaignStoryScene) => Promise<void>;
  updateStorySceneInCampaign: (campaignId: string, sceneId: string, patch: Partial<CampaignStoryScene>) => Promise<void>;
  deleteStorySceneFromCampaign: (campaignId: string, sceneId: string) => Promise<void>;
  setInitiativesInCampaign: (campaignId: string, initiatives: CampaignInitiativeEntry[], currentTurnIndex?: number) => Promise<void>;

  // Custom Weapons & Armaria
  customWeapons: CustomWeapon[];
  upsertCustomWeapon: (weapon: CustomWeapon) => Promise<void>;
  deleteCustomWeapon: (weaponId: string) => Promise<void>;
  equipWeaponToCharacter: (
    weapon: CustomWeapon,
    charId: string,
    options: { mode: 'shared' | 'duplicate'; includeAmmo?: boolean }
  ) => Promise<{ weapon: CustomWeapon; attack: CharacterAttack } | null>;
  removeAttackFromCharacter: (
    charId: string,
    attackId: string,
    options?: { alsoDeleteFromArmory?: boolean }
  ) => Promise<void>;

  // Custom Items & Depósito de Itens
  customItems: CustomCatalogItem[];
  upsertCustomItem: (item: CustomCatalogItem) => Promise<void>;
  deleteCustomItem: (itemId: string) => Promise<void>;
  equipCatalogItemToCharacter: (
    item: CustomCatalogItem,
    charId: string,
    options: { mode: 'shared' | 'duplicate'; quantity?: number }
  ) => Promise<{ catalogItem: CustomCatalogItem; inventoryItem: CharacterInventoryItem } | null>;

  // Dice Roller & Toast
  rollHistory: DiceRollResult[];
  latestRoll: DiceRollResult | null;
  dismissLatestRoll: () => void;
  rollSkillTest: (attributeDice: number, bonus: number, label?: string, criticalThreat?: number, attackContext?: WeaponAttackContext) => DiceRollResult;
  rollOrdemTest: (attributeDice: number, bonus: number, label?: string, criticalThreat?: number, attackContext?: WeaponAttackContext) => DiceRollResult;
  rollFormula: (formula: string, label?: string, attackContext?: WeaponAttackContext) => DiceRollResult;
  rollWeaponDamage: (options: WeaponDamageRollOptions) => DiceRollResult;
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

  // Manual do Aplicativo & Guia de Telas
  manualModalVisible: boolean;
  manualInitialSection?: string | null;
  openManual: (sectionId?: string) => void;
  closeManual: () => void;

  // Mesa Virtual em Tempo Real (VTT)
  virtualTable: VirtualTableRoomState | null;
  tableStatus: TableConnectionStatus;
  tableStatusError?: string;
  tableParticipant: TableParticipant | null;
  tableRecentRolls: TableRollEvent[];
  createVirtualTable: (options: {
    title: string;
    campaignId?: string;
    useLocalSim?: boolean;
  }) => Promise<{ success: boolean; roomId: string; error?: string }>;
  joinVirtualTable: (options: {
    roomId: string;
    characterId?: string;
    useLocalSim?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  leaveVirtualTable: () => Promise<void>;
  broadcastRollToTable: (
    roll: DiceRollResult,
    options?: { actionType?: TableRollActionType; isSecret?: boolean; details?: string }
  ) => Promise<void>;
  rollTableInitiative: (initiativeVal: number, customName?: string) => Promise<void>;
  advanceTableTurn: () => Promise<void>;
  clearTableCombat: () => Promise<void>;
  broadcastTableScene: (scene: TableSceneBroadcast) => Promise<void>;
  updateAgentInTable: (sheet: CharacterSheet) => Promise<void>;
  addMonsterToTableInitiative: (monster: {
    id: string;
    name: string;
    initiative: number;
    pvCurrent?: number;
    pvMax?: number;
    isHidden?: boolean;
  }) => Promise<void>;
  saveTableConfig: (config: Partial<VirtualTableRoomConfig>) => Promise<void>;
  tableConfig: VirtualTableRoomConfig;

  // Verificação de Atualizações do App
  updateInfo: UpdateCheckResult | null;
  updateModalVisible: boolean;
  setUpdateModalVisible: (visible: boolean) => void;
  checkForUpdates: (forceCheck?: boolean) => Promise<UpdateCheckResult | null>;
  dismissUpdate: () => Promise<void>;

  // Modal Global de Inspeção Rápida (Long Press / Botão Info)
  recordPreview: RecordPreviewRequest | null;
  openRecordPreview: (request: RecordPreviewRequest) => void;
  closeRecordPreview: () => void;
  openEntityPreview: (
    entityOrId: CompendiumEntity | string,
    options?: Omit<RecordPreviewRequest, 'target'>
  ) => void;
  openSkillPreview: (
    skillNameOrDef: string | SkillDefinition,
    options?: Omit<RecordPreviewRequest, 'target'>
  ) => void;

  // Modal de Acesso e Liberacao de Livros/PDFs
  pdfAccessModalVisible: boolean;
  openPdfAccessModal: () => void;
  closePdfAccessModal: () => void;
  uploadAndUnlockPdf: (input: {
    fileName: string;
    bytes?: Uint8Array;
    fileSize?: number;
    fileUri?: string;
  }) => Promise<{ ok: boolean; message: string; bookId?: string }>;
  requestAdminEmailUnlockCode: () => Promise<{
    ok: boolean;
    message: string;
    generatedCodeForTest?: string;
  }>;
  verifyAdminEmailUnlockCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  unlockWithMasterPassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  lockBook: (bookId: string) => Promise<void>;
  deletePdfBook: (bookId: string) => Promise<{ ok: boolean; message: string }>;
}

const DEFAULT_FILTERS: CompendiumFilters = {
  query: '',
  category: 'all',
  bookId: 'all',
  element: 'all',
  circle: 'all',
  itemCategory: 'all',
  powerType: 'all',
  classes: [],
  excludedTypes: ['rules', 'missionStories'],
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [customWeapons, setCustomWeapons] = useState<CustomWeapon[]>([]);
  const [customItems, setCustomItems] = useState<CustomCatalogItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [listingColumns, setListingColumnsState] = useState<1 | 2>(1);
  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [latestRoll, setLatestRoll] = useState<DiceRollResult | null>(null);

  // Estado do Manual do Aplicativo
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualInitialSection, setManualInitialSection] = useState<string | null>(null);

  const openManual = useCallback((sectionId?: string) => {
    setManualInitialSection(sectionId || null);
    setManualModalVisible(true);
  }, []);

  const closeManual = useCallback(() => {
    setManualModalVisible(false);
    setManualInitialSection(null);
  }, []);

  // Estados de Sincronização em Nuvem / Google Drive
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | undefined>(undefined);
  const [syncAuthState, setSyncAuthState] = useState<SyncAuthState>({ isAuthenticated: false });
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState<boolean>(true);
  const [lastSyncStats, setLastSyncStats] = useState<MergeStats | null>(null);

  // Estados da Mesa Virtual em Tempo Real
  const [virtualTable, setVirtualTable] = useState<VirtualTableRoomState | null>(null);
  const [tableStatus, setTableStatus] = useState<TableConnectionStatus>('disconnected');
  const [tableStatusError, setTableStatusError] = useState<string | undefined>(undefined);
  const [tableParticipant, setTableParticipant] = useState<TableParticipant | null>(null);
  const [tableRecentRolls, setTableRecentRolls] = useState<TableRollEvent[]>([]);
  const [tableConfig, setTableConfig] = useState<VirtualTableRoomConfig>({});

  // Estados de Atualização do App
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  const checkForUpdates = useCallback(async (forceCheck = false) => {
    if (!updateCheckerService.shouldAutoPromptForUpdates()) {
      setUpdateModalVisible(false);
      return null;
    }
    try {
      const result = await updateCheckerService.checkForAppUpdate(forceCheck);
      if (result) {
        setUpdateInfo(result);
        if (result.hasUpdate && (!result.isDismissed || result.isMandatory || forceCheck)) {
          setUpdateModalVisible(true);
        }
      }
      return result;
    } catch (e) {
      console.warn('[AppContext] Erro ao verificar atualizações:', e);
      return null;
    }
  }, []);

  const dismissUpdate = useCallback(async () => {
    if (updateInfo?.latestVersion) {
      await updateCheckerService.dismissUpdate(updateInfo.latestVersion);
    }
    setUpdateModalVisible(false);
  }, [updateInfo]);

  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;
    let unsubscribeDataReload: (() => void) | undefined;

    (async () => {
      await defaultRepository.initialize();
      const [favs, lists, chars, camps, weapons, items, profile, deletedWeaponIds] = await Promise.all([
        defaultRepository.getFavorites(),
        defaultRepository.getSavedLists(),
        defaultRepository.getCharacters(),
        defaultRepository.getCampaigns(),
        defaultRepository.getCustomWeapons(),
        defaultRepository.getCustomItems(),
        defaultRepository.getUserProfile(),
        defaultRepository.getDeletedCustomWeaponIds(),
      ]);
      const allEntities = defaultRepository.getAllEntities();
      const migrated = migrateCharacterLegacyAttacksToArmory(
        chars,
        weapons,
        allEntities,
        deletedWeaponIds
      );
      if (migrated.changed) {
        await Promise.all([
          defaultRepository.saveCharacters(migrated.characters),
          defaultRepository.saveCustomWeapons(migrated.customWeapons),
        ]);
      }
      const normalizedProfile: UserProfile = {
        ...profile,
        criticalDamageMode: normalizeCriticalDamageMode(profile.criticalDamageMode),
      };
      setFavoritesArr(favs);
      setSavedLists(lists);
      setCharacters(migrated.characters);
      setCampaigns(camps);
      if (camps.length > 0) {
        setActiveCampaignId(camps[0].id);
      }
      setCustomWeapons(migrated.customWeapons);
      setCustomItems(items);
      setUserProfile(normalizedProfile);
      if (normalizedProfile.listingColumns === 1 || normalizedProfile.listingColumns === 2) {
        setListingColumnsState(normalizedProfile.listingColumns);
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

      // Recarrega o estado reativo caso a sincronização na nuvem importe novos dados remotos
      unsubscribeDataReload = cloudSyncManager.addDataReloadListener(async () => {
        await reloadFromRepository();
      });

      // Inicializa escutas da Mesa Virtual
      virtualTableManager.loadSavedConfig().then(setTableConfig);

      const unsubTableRoom = virtualTableManager.subscribeToRoomState((state) => {
        setVirtualTable(state);
        if (state) {
          setTableRecentRolls(state.recentRolls || []);
        }
      });
      const unsubTableStatus = virtualTableManager.subscribeToStatus((status, err) => {
        setTableStatus(status);
        setTableStatusError(err);
        setTableParticipant(virtualTableManager.getCurrentParticipant());
      });
      const unsubTableRolls = virtualTableManager.subscribeToRolls((roll) => {
        setTableRecentRolls((prev) => [roll, ...prev.slice(0, 49)]);
      });

      setReady(true);
    })();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
      if (unsubscribeDataReload) unsubscribeDataReload();
    };
  }, []);

  // Verificação automática de atualizações em segundo plano após inicialização (apenas nativo Android/iOS)
  useEffect(() => {
    if (!ready || !updateCheckerService.shouldAutoPromptForUpdates()) return;
    const timer = setTimeout(() => {
      checkForUpdates(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [ready, checkForUpdates]);

  const favoriteIds = useMemo(() => new Set(favoritesArr), [favoritesArr]);

  const entities = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.getAllEntities();
  }, [ready, versionTick]);

  const books = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.getBooks();
  }, [ready, versionTick]);

  const catalogBooks = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.getAllCatalogBooks();
  }, [ready, versionTick]);

  const filteredEntities = useMemo(() => {
    if (!ready) return [];
    return defaultRepository.searchEntities(filters, favoriteIds);
  }, [ready, filters, favoriteIds, versionTick]);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const getEntityById = useCallback((id: string) => defaultRepository.getEntityById(id), []);
  const hasOriginalVersion = useCallback((id: string) => defaultRepository.hasOriginalSeedVersion(id), []);

  const createEntity = useCallback(async (input: Omit<CompendiumEntity, 'id'>) => {
    const created = await defaultRepository.createEntity(input);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return created;
  }, []);

  const updateEntity = useCallback(async (id: string, patch: Partial<CompendiumEntity>) => {
    const updated = await defaultRepository.updateEntity(id, patch);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return updated;
  }, []);

  const deleteCustomEntity = useCallback(async (id: string) => {
    await defaultRepository.deleteCustomEntity(id);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const resetEntityToDefault = useCallback(async (id: string) => {
    const restored = await defaultRepository.resetEntityToDefault(id);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return restored;
  }, []);

  const toggleFavorite = useCallback(async (entityId: string) => {
    const next = await defaultRepository.toggleFavorite(entityId);
    setFavoritesArr(next);
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const createSavedList = useCallback(async (name: string, description: string): Promise<SavedList> => {
    const newList: SavedList = {
      id: `list_${Date.now()}`,
      name: name.trim() || 'Nova Lista',
      description: description.trim(),
      entityIds: [],
      createdAt: new Date().toISOString(),
    };
    setSavedLists((prev) => {
      const next = [newList, ...prev];
      defaultRepository.saveLists(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
    return newList;
  }, []);

  const deleteSavedList = useCallback(async (listId: string) => {
    setSavedLists((prev) => {
      const next = prev.filter((l) => l.id !== listId);
      defaultRepository.saveLists(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const toggleEntityInList = useCallback(async (listId: string, entityId: string) => {
    setSavedLists((prev) => {
      const next = prev.map((list) => {
        if (list.id !== listId) return list;
        const exists = list.entityIds.includes(entityId);
        return {
          ...list,
          entityIds: exists
            ? list.entityIds.filter((id) => id !== entityId)
            : [...list.entityIds, entityId],
        };
      });
      defaultRepository.saveLists(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const upsertCharacter = useCallback(async (sheet: CharacterSheet) => {
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === sheet.id);
      const next = exists
        ? prev.map((c) => (c.id === sheet.id ? sheet : c))
        : [sheet, ...prev];
      defaultRepository.saveCharacters(next);
      return next;
    });
    // Se o agente ativo na mesa virtual for este, sincroniza imediatamente com a mesa
    const currentP = virtualTableManager.getCurrentParticipant();
    if (currentP?.agent?.id === sheet.id) {
      virtualTableManager.updateAgent(sheet).catch(() => {});
    }
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteCharacter = useCallback(async (sheetId: string) => {
    setCharacters((prev) => {
      const next = prev.filter((c) => c.id !== sheetId);
      defaultRepository.saveCharacters(next);
      return next;
    });
    await defaultRepository.markCharacterDeleted(sheetId);
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const activeCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === activeCampaignId) || campaigns[0] || null;
  }, [campaigns, activeCampaignId]);

  const upsertCampaign = useCallback(async (campaign: Campaign) => {
    setCampaigns((prev) => {
      const exists = prev.some((c) => c.id === campaign.id);
      const next = exists
        ? prev.map((c) => (c.id === campaign.id ? campaign : c))
        : [campaign, ...prev];
      defaultRepository.saveCampaigns(next);
      return next;
    });
    setActiveCampaignId(campaign.id);
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    setCampaigns((prev) => {
      const next = prev.filter((c) => c.id !== campaignId);
      defaultRepository.saveCampaigns(next);
      if (activeCampaignId === campaignId) {
        setActiveCampaignId(next[0]?.id || null);
      }
      return next;
    });
    await defaultRepository.markCampaignDeleted(campaignId);
    cloudSyncManager.scheduleAutoSync();
  }, [activeCampaignId]);

  const addMonsterToCampaign = useCallback(async (campaignId: string, monster: CampaignMonster) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        const exists = c.monsters.some((m) => m.id === monster.id);
        const updatedMonsters = exists
          ? c.monsters.map((m) => (m.id === monster.id ? monster : m))
          : [...c.monsters, monster];
        return {
          ...c,
          monsters: updatedMonsters,
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const updateMonsterInCampaign = useCallback(async (campaignId: string, monsterId: string, patch: Partial<CampaignMonster>) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          monsters: c.monsters.map((m) => (m.id === monsterId ? { ...m, ...patch } : m)),
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteMonsterFromCampaign = useCallback(async (campaignId: string, monsterId: string) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          monsters: c.monsters.filter((m) => m.id !== monsterId),
          initiatives: c.initiatives.filter((init) => init.refId !== monsterId),
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const saveMonsterToCompendium = useCallback(async (monster: CampaignMonster): Promise<CompendiumEntity> => {
    const abilityFormulas = (monster.structuredAbilities || []).flatMap((ab) => {
      const m = (ab.description || '').match(/\d+d\d+(?:\s*[+\-]\s*\d+)?/gi);
      return m ? m.map((s) => s.replace(/\s+/g, '')) : [];
    });
    const diceFormulas = Array.from(
      new Set([
        ...(monster.structuredAttacks || []).flatMap((a) =>
          [a.testFormula, a.damageFormula].filter(Boolean)
        ),
        ...abilityFormulas,
      ])
    );
    const newEntity: Omit<CompendiumEntity, 'id'> = {
      name: monster.name,
      category: 'creature',
      subCategory: `${monster.creatureType || 'Ameaça da Campanha'}${monster.size ? ` • ${monster.size}` : ''}`,
      bookId: 'custom',
      bookTitle: 'Homebrew do Mestre',
      pageNumber: 1,
      element: monster.element || 'Nenhum',
      secondaryElements: monster.secondaryElements,
      size: monster.size,
      creatureType: monster.creatureType,
      summary: `VD ${monster.vd}${monster.size ? ` • ${monster.size}` : ''} • Defesa ${monster.defense} • PV ${monster.pvMax}`,
      description: `${monster.attacks ? `Ataques:\n${monster.attacks}\n\n` : ''}${monster.abilities ? `Habilidades:\n${monster.abilities}\n\n` : ''}${monster.notes || ''}`.trim(),
      tags: ['Ameaça', 'Mestre', monster.element || 'Nenhum', ...(monster.secondaryElements || [])],
      vd: monster.vd,
      defense: monster.defense,
      pv: monster.pvMax,
      disturbingPresence: monster.disturbingPresence,
      attributes: monster.attributes,
      senses: monster.senses,
      saves: monster.saves,
      resistancesText: monster.resistancesText,
      immunitiesText: monster.immunitiesText,
      vulnerabilitiesText: monster.vulnerabilitiesText,
      displacement: monster.displacement,
      skillsText: monster.skillsText,
      structuredAttacks: monster.structuredAttacks,
      structuredAbilities: monster.structuredAbilities,
      fearEnigma: monster.fearEnigma,
      diceFormulas: diceFormulas.length > 0 ? diceFormulas : undefined,
      isCustom: true,
      updatedAt: new Date().toISOString(),
    };
    const created = await defaultRepository.createEntity(newEntity);
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return created;
  }, []);

  const addAgentToCampaign = useCallback(async (campaignId: string, link: CampaignAgentLink) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        const exists = c.agents.some((a) => a.id === link.id);
        const updatedAgents = exists
          ? c.agents.map((a) => (a.id === link.id ? link : a))
          : [...c.agents, link];
        return {
          ...c,
          agents: updatedAgents,
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const updateAgentInCampaign = useCallback(async (campaignId: string, linkId: string, patch: Partial<CampaignAgentLink>) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          agents: c.agents.map((a) => (a.id === linkId ? { ...a, ...patch } : a)),
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteAgentFromCampaign = useCallback(async (campaignId: string, linkId: string) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          agents: c.agents.filter((a) => a.id !== linkId),
          initiatives: c.initiatives.filter((init) => init.refId !== linkId),
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const addStorySceneToCampaign = useCallback(async (campaignId: string, scene: CampaignStoryScene) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        const exists = c.stories.some((s) => s.id === scene.id);
        const updatedStories = exists
          ? c.stories.map((s) => (s.id === scene.id ? scene : s))
          : [...c.stories, scene];
        return {
          ...c,
          stories: updatedStories,
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const updateStorySceneInCampaign = useCallback(async (campaignId: string, sceneId: string, patch: Partial<CampaignStoryScene>) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          stories: c.stories.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteStorySceneFromCampaign = useCallback(async (campaignId: string, sceneId: string) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          stories: c.stories.filter((s) => s.id !== sceneId),
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const setInitiativesInCampaign = useCallback(async (campaignId: string, initiatives: CampaignInitiativeEntry[], currentTurnIndex?: number) => {
    setCampaigns((prev) => {
      const next = prev.map((c) => {
        if (c.id !== campaignId) return c;
        return {
          ...c,
          initiatives,
          currentTurnIndex: currentTurnIndex !== undefined ? currentTurnIndex : c.currentTurnIndex,
          updatedAt: new Date().toISOString(),
        };
      });
      defaultRepository.saveCampaigns(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const upsertCustomWeapon = useCallback(async (weapon: CustomWeapon) => {
    setCustomWeapons((prev) => {
      const exists = prev.some((w) => w.id === weapon.id);
      const next = exists
        ? prev.map((w) => (w.id === weapon.id ? weapon : w))
        : [weapon, ...prev];
      defaultRepository.saveCustomWeapons(next);
      return next;
    });
    // Propaga automaticamente edições da arma da Armaria para todos os agentes vinculados
    setCharacters((prevChars) => {
      let anyChanged = false;
      const nextChars = prevChars.map((c) => {
        const synced = syncCharacterWithCustomWeapon(c, weapon);
        if (synced.changed) {
          anyChanged = true;
          return synced.updated;
        }
        return c;
      });
      if (anyChanged) {
        defaultRepository.saveCharacters(nextChars);
      }
      return anyChanged ? nextChars : prevChars;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteCustomWeapon = useCallback(async (weaponId: string) => {
    setCustomWeapons((prev) => {
      const next = prev.filter((w) => w.id !== weaponId);
      defaultRepository.saveCustomWeapons(next);
      return next;
    });
    // Remove referências da arma excluída nos agentes vinculados (ataques e itens de inventário)
    setCharacters((prevChars) => {
      let anyChanged = false;
      const now = new Date().toISOString();
      const nextChars = prevChars.map((c) => {
        const hasAttack = (c.attacks || []).some((a) => a.customWeaponId === weaponId);
        const hasInv = (c.inventory || []).some(
          (it) => it.customWeaponId === weaponId || it.isAmmoForWeaponId === weaponId
        );
        if (!hasAttack && !hasInv) return c;
        anyChanged = true;
        return {
          ...c,
          attacks: (c.attacks || []).filter((a) => a.customWeaponId !== weaponId),
          inventory: (c.inventory || []).filter(
            (it) => it.customWeaponId !== weaponId && it.isAmmoForWeaponId !== weaponId
          ),
          updatedAt: now,
        };
      });
      if (anyChanged) {
        defaultRepository.saveCharacters(nextChars);
      }
      return anyChanged ? nextChars : prevChars;
    });
    await defaultRepository.markCustomWeaponDeleted(weaponId);
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const equipWeaponToCharacter = useCallback(
    async (
      weapon: CustomWeapon,
      charId: string,
      options: { mode: 'shared' | 'duplicate'; includeAmmo?: boolean }
    ): Promise<{ weapon: CustomWeapon; attack: CharacterAttack } | null> => {
      const targetChar = characters.find((c) => c.id === charId);
      if (!targetChar) return null;

      const effectiveWeapon =
        options.mode === 'duplicate'
          ? cloneCustomWeaponForAgent(weapon, targetChar.name)
          : weapon;

      setCustomWeapons((prev) => {
        const exists = prev.some((w) => w.id === effectiveWeapon.id);
        const next = exists
          ? prev.map((w) => (w.id === effectiveWeapon.id ? effectiveWeapon : w))
          : [effectiveWeapon, ...prev];
        defaultRepository.saveCustomWeapons(next);
        return next;
      });

      const newAttack = buildAttackFromCustomWeapon(effectiveWeapon, {
        linkMode: options.mode === 'duplicate' ? 'copied' : 'shared',
        sourceWeaponId: options.mode === 'duplicate' ? weapon.id : undefined,
      });

      const { weaponItem, ammoItem } = buildInventoryItemsFromCustomWeapon(effectiveWeapon, {
        attackId: newAttack.id,
        includeAmmo: options.includeAmmo !== false,
      });

      const newItems = ammoItem ? [weaponItem, ammoItem] : [weaponItem];
      const now = new Date().toISOString();

      setCharacters((prevChars) => {
        const nextChars = prevChars.map((c) => {
          if (c.id !== charId) return c;
          return {
            ...c,
            attacks: [...(c.attacks || []), newAttack],
            inventory: [...(c.inventory || []), ...newItems],
            updatedAt: now,
          };
        });
        defaultRepository.saveCharacters(nextChars);
        return nextChars;
      });

      cloudSyncManager.scheduleAutoSync();
      return { weapon: effectiveWeapon, attack: newAttack };
    },
    [characters]
  );

  const removeAttackFromCharacter = useCallback(
    async (
      charId: string,
      attackId: string,
      options?: { alsoDeleteFromArmory?: boolean }
    ) => {
      let weaponIdToDelete: string | undefined;
      const now = new Date().toISOString();

      setCharacters((prevChars) => {
        const nextChars = prevChars.map((c) => {
          if (c.id !== charId) return c;
          const targetAtk = (c.attacks || []).find((a) => a.id === attackId);
          if (!targetAtk) return c;
          weaponIdToDelete = targetAtk.customWeaponId;
          const remainingAttacks = (c.attacks || []).filter((a) => a.id !== attackId);
          const stillHasSameWeapon =
            Boolean(targetAtk.customWeaponId) &&
            remainingAttacks.some((a) => a.customWeaponId === targetAtk.customWeaponId);

          const remainingInventory = (c.inventory || []).filter((it) => {
            if (it.linkedAttackId === attackId) return false;
            if (
              !it.linkedAttackId &&
              !stillHasSameWeapon &&
              targetAtk.customWeaponId &&
              (it.customWeaponId === targetAtk.customWeaponId ||
                it.isAmmoForWeaponId === targetAtk.customWeaponId)
            ) {
              return false;
            }
            return true;
          });

          return {
            ...c,
            attacks: remainingAttacks,
            inventory: remainingInventory,
            updatedAt: now,
          };
        });
        defaultRepository.saveCharacters(nextChars);
        return nextChars;
      });

      if (options?.alsoDeleteFromArmory && weaponIdToDelete) {
        await deleteCustomWeapon(weaponIdToDelete);
      } else {
        cloudSyncManager.scheduleAutoSync();
      }
    },
    [deleteCustomWeapon]
  );

  // Itens & Acessórios do Depósito Compartilhado
  const upsertCustomItem = useCallback(async (item: CustomCatalogItem) => {
    setCustomItems((prev) => {
      const exists = prev.some((it) => it.id === item.id);
      const next = exists
        ? prev.map((it) => (it.id === item.id ? item : it))
        : [item, ...prev];
      defaultRepository.saveCustomItems(next);
      return next;
    });
    setCharacters((prevChars) => {
      let anyChanged = false;
      const nextChars = prevChars.map((c) => {
        const synced = syncCharacterWithCatalogItem(c, item);
        if (synced.changed) {
          anyChanged = true;
          return synced.updated;
        }
        return c;
      });
      if (anyChanged) {
        defaultRepository.saveCharacters(nextChars);
      }
      return anyChanged ? nextChars : prevChars;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteCustomItem = useCallback(async (itemId: string) => {
    setCustomItems((prev) => {
      const next = prev.filter((it) => it.id !== itemId);
      defaultRepository.saveCustomItems(next);
      return next;
    });
    setCharacters((prevChars) => {
      let anyChanged = false;
      const now = new Date().toISOString();
      const nextChars = prevChars.map((c) => {
        const hasItem = (c.inventory || []).some((it) => it.customItemId === itemId);
        if (!hasItem) return c;
        anyChanged = true;
        return {
          ...c,
          inventory: (c.inventory || []).filter((it) => it.customItemId !== itemId),
          updatedAt: now,
        };
      });
      if (anyChanged) {
        defaultRepository.saveCharacters(nextChars);
      }
      return anyChanged ? nextChars : prevChars;
    });
    await defaultRepository.markCustomItemDeleted(itemId);
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const equipCatalogItemToCharacter = useCallback(
    async (
      item: CustomCatalogItem,
      charId: string,
      options: { mode: 'shared' | 'duplicate'; quantity?: number }
    ): Promise<{ catalogItem: CustomCatalogItem; inventoryItem: CharacterInventoryItem } | null> => {
      const targetChar = characters.find((c) => c.id === charId);
      if (!targetChar) return null;

      const effectiveItem =
        options.mode === 'duplicate'
          ? cloneCatalogItemForAgent(item, targetChar.name)
          : item;

      setCustomItems((prev) => {
        const exists = prev.some((it) => it.id === effectiveItem.id);
        const next = exists
          ? prev.map((it) => (it.id === effectiveItem.id ? effectiveItem : it))
          : [effectiveItem, ...prev];
        defaultRepository.saveCustomItems(next);
        return next;
      });

      const inventoryItem = buildInventoryItemFromCatalogItem(effectiveItem, {
        linkMode: options.mode === 'duplicate' ? 'copied' : 'shared',
        quantity: options.quantity ?? 1,
      });
      const now = new Date().toISOString();

      setCharacters((prevChars) => {
        const nextChars = prevChars.map((c) => {
          if (c.id !== charId) return c;
          return {
            ...c,
            inventory: [...(c.inventory || []), inventoryItem],
            updatedAt: now,
          };
        });
        defaultRepository.saveCharacters(nextChars);
        return nextChars;
      });

      cloudSyncManager.scheduleAutoSync();
      return { catalogItem: effectiveItem, inventoryItem };
    },
    [characters]
  );

  // Rolagens e Transmissão para a Mesa Virtual
  const broadcastRollToTable = useCallback(
    async (
      roll: DiceRollResult,
      options?: { actionType?: TableRollActionType; isSecret?: boolean; details?: string }
    ) => {
      if (virtualTableManager.getStatus() !== 'connected') return;

      const p = virtualTableManager.getCurrentParticipant();
      const event: TableRollEvent = {
        id: roll.id || `roll_${Date.now()}`,
        senderId: p?.userId || userProfile.id || 'unknown',
        senderName: p?.userName || userProfile.playerName || 'Agente',
        characterName: p?.agent?.name,
        actionType: options?.actionType || (roll.mode === 'skill' ? 'skill' : 'formula'),
        label: roll.label,
        formula: roll.formulaText,
        diceResults: roll.diceResults,
        chosenDie: roll.chosenDie,
        bonus: roll.bonus,
        total: roll.total,
        isCritical: roll.isCritical,
        isFumble: roll.isFumble,
        isSecret: options?.isSecret,
        details: options?.details,
        timestamp: roll.timestamp,
      };

      await virtualTableManager.broadcastRoll(event);
    },
    [userProfile]
  );

  const rollSkillTest = useCallback(
    (
      attributeDice: number,
      bonus: number,
      label?: string,
      criticalThreat?: number,
      attackContext?: WeaponAttackContext
    ) => {
      const res = rollOrdemTest(attributeDice, bonus, label, criticalThreat, attackContext);
      setLatestRoll(res);
      setRollHistory((prev) => [res, ...prev.slice(0, 49)]);
      if (virtualTableManager.getStatus() === 'connected') {
        broadcastRollToTable(res, { actionType: 'skill' }).catch(() => {});
      }
      return res;
    },
    [broadcastRollToTable]
  );

  const rollWeaponDamageAction = useCallback(
    (options: WeaponDamageRollOptions) => {
      const effectiveMode = normalizeCriticalDamageMode(options.mode || userProfile.criticalDamageMode);
      const res = rollWeaponDamage({ ...options, mode: effectiveMode });
      setLatestRoll(res);
      setRollHistory((prev) => [res, ...prev.slice(0, 49)]);
      if (virtualTableManager.getStatus() === 'connected') {
        broadcastRollToTable(res, { actionType: 'damage' }).catch(() => {});
      }
      return res;
    },
    [userProfile.criticalDamageMode, broadcastRollToTable]
  );

  const rollFormula = useCallback(
    (formula: string, label?: string, attackContext?: WeaponAttackContext) => {
      const res = rollDiceFormula(formula, label, attackContext);
      setLatestRoll(res);
      setRollHistory((prev) => [res, ...prev.slice(0, 49)]);
      if (virtualTableManager.getStatus() === 'connected') {
        const isDamage = (label || '').toLowerCase().includes('dano');
        broadcastRollToTable(res, { actionType: isDamage ? 'damage' : 'formula' }).catch(() => {});
      }
      return res;
    },
    [broadcastRollToTable]
  );

  // Ações da Mesa Virtual
  const createVirtualTable = useCallback(
    async (options: { title: string; campaignId?: string; useLocalSim?: boolean }) => {
      const masterName = userProfile.playerName || userProfile.masterName || 'Mestre';
      const masterId = userProfile.id || 'master_local';
      return await virtualTableManager.createTable({
        title: options.title,
        masterId,
        masterName,
        campaignId: options.campaignId,
        useLocalSim: options.useLocalSim,
      });
    },
    [userProfile]
  );

  const joinVirtualTable = useCallback(
    async (options: { roomId: string; characterId?: string; useLocalSim?: boolean }) => {
      const userName = userProfile.playerName || 'Agente';
      const userId = userProfile.id || `user_${Date.now()}`;
      const charSheet = options.characterId
        ? characters.find((c) => c.id === options.characterId)
        : undefined;

      return await virtualTableManager.joinTable({
        roomId: options.roomId,
        userId,
        userName,
        role: 'player',
        characterSheet: charSheet,
        useLocalSim: options.useLocalSim,
      });
    },
    [characters, userProfile]
  );

  const leaveVirtualTable = useCallback(async () => {
    await virtualTableManager.leaveTable();
  }, []);

  const rollTableInitiative = useCallback(async (initiativeVal: number, customName?: string) => {
    await virtualTableManager.rollMyInitiative(initiativeVal, customName);
  }, []);

  const advanceTableTurn = useCallback(async () => {
    await virtualTableManager.advanceTurn();
  }, []);

  const clearTableCombat = useCallback(async () => {
    await virtualTableManager.clearCombat();
  }, []);

  const broadcastTableScene = useCallback(async (scene: TableSceneBroadcast) => {
    await virtualTableManager.broadcastScene(scene);
  }, []);

  const updateAgentInTable = useCallback(async (sheet: CharacterSheet) => {
    await virtualTableManager.updateAgent(sheet);
  }, []);

  const addMonsterToTableInitiative = useCallback(
    async (monster: {
      id: string;
      name: string;
      initiative: number;
      pvCurrent?: number;
      pvMax?: number;
      isHidden?: boolean;
    }) => {
      await virtualTableManager.addMonsterToInitiative(monster);
    },
    []
  );

  const saveTableConfig = useCallback(async (configPatch: Partial<VirtualTableRoomConfig>) => {
    await virtualTableManager.saveConfig(configPatch);
    setTableConfig(virtualTableManager.getConfig());
  }, []);

  const dismissLatestRoll = useCallback(() => setLatestRoll(null), []);
  const clearRollHistory = useCallback(() => {
    setRollHistory([]);
    setLatestRoll(null);
  }, []);

  const updateUserProfile = useCallback(async (patch: Partial<UserProfile>): Promise<UserProfile> => {
    let updated: UserProfile = DEFAULT_USER_PROFILE;
    setUserProfile((prev) => {
      const next: UserProfile = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      updated = next;
      defaultRepository.saveUserProfile(next);
      return next;
    });
    if (patch.listingColumns === 1 || patch.listingColumns === 2) {
      setListingColumnsState(patch.listingColumns);
    }
    cloudSyncManager.scheduleAutoSync();
    return updated;
  }, []);

  const setListingColumns = useCallback(async (cols: 1 | 2) => {
    setListingColumnsState(cols);
    await updateUserProfile({ listingColumns: cols });
  }, [updateUserProfile]);

  const toggleListingColumns = useCallback(async () => {
    setListingColumnsState((prev) => {
      const nextCols: 1 | 2 = prev === 1 ? 2 : 1;
      updateUserProfile({ listingColumns: nextCols });
      return nextCols;
    });
  }, [updateUserProfile]);

  const reloadFromRepository = useCallback(async () => {
    const [favs, lists, chars, camps, weapons, items, deletedWeaponIds, rawProfile] = await Promise.all([
      defaultRepository.getFavorites(),
      defaultRepository.getSavedLists(),
      defaultRepository.getCharacters(),
      defaultRepository.getCampaigns(),
      defaultRepository.getCustomWeapons(),
      defaultRepository.getCustomItems(),
      defaultRepository.getDeletedCustomWeaponIds(),
      defaultRepository.getUserProfile(),
    ]);
    const normalizedMode = normalizeCriticalDamageMode(rawProfile.criticalDamageMode);
    const profile: UserProfile =
      rawProfile.criticalDamageMode !== normalizedMode
        ? { ...rawProfile, criticalDamageMode: normalizedMode }
        : rawProfile;
    if (profile !== rawProfile) {
      await defaultRepository.saveUserProfile(profile);
    }

    const allEntities = defaultRepository.getAllEntities();
    const migration = migrateCharacterLegacyAttacksToArmory(
      chars,
      weapons,
      allEntities,
      deletedWeaponIds
    );
    if (migration.changed) {
      await Promise.all([
        defaultRepository.saveCustomWeapons(migration.customWeapons),
        defaultRepository.saveCharacters(migration.characters),
      ]);
    }

    setFavoritesArr(favs);
    setSavedLists(lists);
    setCharacters(migration.characters);
    setCampaigns(camps);
    setCustomWeapons(migration.customWeapons);
    setCustomItems(items);
    setUserProfile(profile);
    if (profile.listingColumns === 1 || profile.listingColumns === 2) {
      setListingColumnsState(profile.listingColumns);
    }
    setVersionTick((v) => v + 1);
  }, []);

  const connectGoogleDrive = useCallback(async (): Promise<SyncAuthState> => {
    const auth = await cloudSyncManager.connectGoogleDrive();
    setSyncAuthState(auth);
    if (auth.isAuthenticated) {
      await reloadFromRepository();
    }
    return auth;
  }, [reloadFromRepository]);

  const disconnectGoogleDrive = useCallback(async (): Promise<void> => {
    await cloudSyncManager.disconnectGoogleDrive();
    setSyncAuthState({ isAuthenticated: false });
  }, []);

  const syncWithDriveNow = useCallback(async (options?: { quiet?: boolean }): Promise<SyncExecutionResult> => {
    const result = await cloudSyncManager.syncNow(options);
    if (result.success) {
      await reloadFromRepository();
    }
    return result;
  }, [reloadFromRepository]);

  const setAutoSyncEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    await cloudSyncManager.setAutoSyncEnabled(enabled);
    setAutoSyncEnabledState(enabled);
  }, []);

  const exportBackupJson = useCallback(() => defaultRepository.exportUserDataJson(), []);
  const importBackupJson = useCallback(async (jsonStr: string) => {
    await defaultRepository.importUserDataJson(jsonStr);
    await reloadFromRepository();
    cloudSyncManager.scheduleAutoSync();
  }, [reloadFromRepository]);

  const getBookPageCallback = useCallback((b: string, p: number) => defaultRepository.getBookPage(b, p), []);
  const searchInBookPagesCallback = useCallback((b: string | 'all', q: string) => defaultRepository.searchInBookPages(b, q), []);

  // Estado do Modal Global de Inspeção Rápida (Long Press / Botão Info)
  const [recordPreview, setRecordPreview] = useState<RecordPreviewRequest | null>(null);

  const openRecordPreview = useCallback((request: RecordPreviewRequest) => {
    setRecordPreview(request);
  }, []);

  const closeRecordPreview = useCallback(() => {
    setRecordPreview(null);
  }, []);

  const openEntityPreview = useCallback(
    (
      entityOrId: CompendiumEntity | string,
      options?: Omit<RecordPreviewRequest, 'target'>
    ) => {
      const entity =
        typeof entityOrId === 'string' ? getEntityById(entityOrId) : entityOrId;
      if (!entity) return;
      setRecordPreview({
        target: { kind: 'entity', entity },
        ...options,
      });
    },
    [getEntityById]
  );

  const openSkillPreview = useCallback(
    (
      skillNameOrDef: string | SkillDefinition,
      options?: Omit<RecordPreviewRequest, 'target'>
    ) => {
      const skillDef: SkillDefinition =
        typeof skillNameOrDef === 'string'
          ? OFFICIAL_SKILLS_LIST.find(
              (s) => s.name.toLowerCase() === skillNameOrDef.trim().toLowerCase()
            ) || { name: skillNameOrDef, attr: 'INT' }
          : skillNameOrDef;
      const lower = skillDef.name.toLowerCase();
      const entity = entities.find(
        (e) => e.category === 'skill' && e.name.toLowerCase() === lower
      );
      if (entity) {
        setRecordPreview({
          target: { kind: 'entity', entity },
          ...options,
        });
      } else {
        setRecordPreview({
          target: { kind: 'skill_def', skill: skillDef },
          ...options,
        });
      }
    },
    [entities]
  );

  // Estado e Ações do Modal de Acesso e Liberação de Livros/PDFs
  const [pdfAccessModalVisible, setPdfAccessModalVisible] = useState(false);

  const openPdfAccessModal = useCallback(() => {
    setPdfAccessModalVisible(true);
  }, []);

  const closePdfAccessModal = useCallback(() => {
    setPdfAccessModalVisible(false);
  }, []);

  const uploadAndUnlockPdf = useCallback(
    async (input: { fileName: string; bytes?: Uint8Array; fileSize?: number; fileUri?: string }) => {
      try {
        const check = await identifyUploadedPdf(input);
        if (check.matchedSignature) {
          const sig = check.matchedSignature;
          if (input.fileUri) {
            await localPdfStorage.savePdfOfflineFromUri(
              sig.id,
              sig.fileName,
              input.fileUri,
              input.fileSize || sig.fileSize,
              check.sha256
            );
          } else if (input.bytes) {
            await localPdfStorage.savePdfOffline(
              sig.id,
              sig.fileName,
              input.bytes,
              check.sha256
            );
          }
          await defaultRepository.unlockBook(sig.id, {
            method: 'pdf_upload',
            fileName: sig.fileName,
            localPdfStored: Boolean(input.fileUri || input.bytes || localPdfStorage.hasPdfOffline(sig.id)),
          });
          setVersionTick((v) => v + 1);
          cloudSyncManager.scheduleAutoSync();
          return {
            ok: true,
            message: `Livro "${sig.title}" liberado com sucesso!`,
            bookId: sig.id,
          };
        }

        if (input.bytes) {
          const extracted = await processUnregisteredPdfWithPythonPipeline({
            fileName: input.fileName,
            bytes: input.bytes,
          });
          if (extracted.ok && extracted.book) {
            await localPdfStorage.savePdfOffline(
              extracted.book.id,
              extracted.book.fileName,
              input.bytes,
              check.sha256
            );
            await defaultRepository.registerDynamicPdfBook(
              extracted.book,
              extracted.entities,
              extracted.book.fileName,
              check.sha256
            );
            setVersionTick((v) => v + 1);
            cloudSyncManager.scheduleAutoSync();
            return {
              ok: true,
              message: `Suplemento "${extracted.book.title}" extraído e integrado com sucesso!`,
              bookId: extracted.book.id,
            };
          }
        }

        return {
          ok: false,
          message: `Arquivo "${input.fileName}" não reconhecido como PDF válido de Ordem Paranormal.`,
        };
      } catch (err: any) {
        return {
          ok: false,
          message: err?.message || 'Falha ao processar arquivo PDF.',
        };
      }
    },
    []
  );

  const unlockWithMasterPassword = useCallback(async (password: string) => {
    const res = await verifyMasterUnlockPassword(password);
    if (!res.valid) {
      return {
        ok: false,
        message: res.message || 'Senha do Mestre incorreta.',
      };
    }
    const records = await defaultRepository.unlockAllBooks('master_code');
    await cacheUnlockedBooksOffline(records.map((r) => r.bookId));
    setVersionTick((v) => v + 1);
    cloudSyncManager.scheduleAutoSync();
    return {
      ok: true,
      message: 'Todos os 10 livros canônicos e o compêndio foram liberados com sucesso!',
    };
  }, []);

  const requestAdminEmailUnlockCode = useCallback(async () => {
    return await requestUnlockCodeForAdminEmail();
  }, []);

  const verifyAdminEmailUnlockCode = useCallback(async (code: string) => {
    return await unlockWithMasterPassword(code);
  }, [unlockWithMasterPassword]);

  const lockBook = useCallback(
    async (bookId: string) => {
      const catalogBook = catalogBooks.find((b) => b.id === bookId);
      const fileName = catalogBook?.fileName;
      await defaultRepository.lockBook(bookId);
      await localPdfStorage.removePdfOffline(bookId, fileName);
      clearPdfJsCache(bookId, fileName);
      await removePdfFilesFromCacheAndStorage(bookId, fileName);
      setVersionTick((v) => v + 1);
      cloudSyncManager.scheduleAutoSync();
    },
    [catalogBooks]
  );

  const deletePdfBook = useCallback(
    async (bookId: string): Promise<{ ok: boolean; message: string }> => {
      try {
        const dynamicBooks = defaultRepository.getDynamicBooks();
        const dynamicBook = dynamicBooks.find((b) => b.id === bookId);
        const catalogBook = catalogBooks.find((b) => b.id === bookId);
        const isDynamic =
          Boolean(dynamicBook) ||
          dynamicBooks.some((b) => b.id === bookId) ||
          catalogBooks.some((b) => b.id === bookId && b.isCustomBook);
        const fileName = dynamicBook?.fileName || catalogBook?.fileName;

        // 1. Remove do armazenamento offline e limpa a pasta cache
        await localPdfStorage.removePdfOffline(bookId, fileName);

        // 2. Limpa cache do visualizador PDF.js em memória
        clearPdfJsCache(bookId, fileName);

        // 3. Limpa arquivos do PDF do sistema de arquivos e cache do aparelho
        await removePdfFilesFromCacheAndStorage(bookId, fileName);

        if (isDynamic) {
          await defaultRepository.deleteDynamicPdfBook(bookId);
          await defaultRepository.markDynamicBookDeleted(bookId);
          setVersionTick((v) => v + 1);
          cloudSyncManager.scheduleAutoSync();
          return {
            ok: true,
            message: 'PDF personalizado e seus dados foram excluídos com sucesso.',
          };
        } else {
          await defaultRepository.lockBook(bookId);
          setVersionTick((v) => v + 1);
          cloudSyncManager.scheduleAutoSync();
          return {
            ok: true,
            message:
              bookId === 'livro_base'
                ? 'Arquivo PDF do Livro Base removido e leitor bloqueado. O núcleo essencial (Classes, Perícias e Condições) continua ativo.'
                : 'Arquivo PDF offline removido e livro bloqueado com sucesso.',
          };
        }
      } catch (err: any) {
        return {
          ok: false,
          message: err?.message || 'Falha ao excluir PDF.',
        };
      }
    },
    [catalogBooks]
  );

  const contextValue = useMemo<AppContextValue>(
    () => ({
      ready,
      entities,
      filteredEntities,
      books,
      catalogBooks,
      pdfAccessModalVisible,
      openPdfAccessModal,
      closePdfAccessModal,
      uploadAndUnlockPdf,
      requestAdminEmailUnlockCode,
      verifyAdminEmailUnlockCode,
      unlockWithMasterPassword,
      lockBook,
      deletePdfBook,
      filters,
      setFilters,
      resetFilters,
      getEntityById,
      hasOriginalVersion,
      createEntity,
      updateEntity,
      deleteCustomEntity,
      resetEntityToDefault,
      getBookPage: getBookPageCallback,
      searchInBookPages: searchInBookPagesCallback,
      favoriteIds,
      toggleFavorite,
      savedLists,
      createSavedList,
      deleteSavedList,
      toggleEntityInList,
      characters,
      upsertCharacter,
      deleteCharacter,
      campaigns,
      activeCampaignId,
      setActiveCampaignId,
      activeCampaign,
      upsertCampaign,
      deleteCampaign,
      addMonsterToCampaign,
      updateMonsterInCampaign,
      deleteMonsterFromCampaign,
      saveMonsterToCompendium,
      addAgentToCampaign,
      updateAgentInCampaign,
      deleteAgentFromCampaign,
      addStorySceneToCampaign,
      updateStorySceneInCampaign,
      deleteStorySceneFromCampaign,
      setInitiativesInCampaign,
      customWeapons,
      upsertCustomWeapon,
      deleteCustomWeapon,
      equipWeaponToCharacter,
      removeAttackFromCharacter,
      customItems,
      upsertCustomItem,
      deleteCustomItem,
      equipCatalogItemToCharacter,
      rollHistory,
      latestRoll,
      dismissLatestRoll,
      rollSkillTest,
      rollOrdemTest: rollSkillTest,
      rollFormula,
      rollWeaponDamage: rollWeaponDamageAction,
      clearRollHistory,
      userProfile,
      updateUserProfile,
      listingColumns,
      setListingColumns,
      toggleListingColumns,
      exportBackupJson,
      importBackupJson,
      manualModalVisible,
      manualInitialSection,
      openManual,
      closeManual,
      syncStatus,
      syncStatusMessage,
      syncAuthState,
      connectGoogleDrive,
      disconnectGoogleDrive,
      syncWithDriveNow,
      autoSyncEnabled,
      setAutoSyncEnabled,
      lastSyncStats,
      virtualTable,
      tableStatus,
      tableStatusError,
      tableParticipant,
      tableRecentRolls,
      createVirtualTable,
      joinVirtualTable,
      leaveVirtualTable,
      broadcastRollToTable,
      rollTableInitiative,
      advanceTableTurn,
      clearTableCombat,
      broadcastTableScene,
      updateAgentInTable,
      addMonsterToTableInitiative,
      saveTableConfig,
      tableConfig,
      updateInfo,
      updateModalVisible,
      setUpdateModalVisible,
      checkForUpdates,
      dismissUpdate,
      recordPreview,
      openRecordPreview,
      closeRecordPreview,
      openEntityPreview,
      openSkillPreview,
    }),
    [
      ready,
      entities,
      filteredEntities,
      books,
      filters,
      resetFilters,
      getEntityById,
      hasOriginalVersion,
      createEntity,
      updateEntity,
      deleteCustomEntity,
      resetEntityToDefault,
      getBookPageCallback,
      searchInBookPagesCallback,
      favoriteIds,
      toggleFavorite,
      savedLists,
      createSavedList,
      deleteSavedList,
      toggleEntityInList,
      characters,
      upsertCharacter,
      deleteCharacter,
      campaigns,
      activeCampaignId,
      setActiveCampaignId,
      activeCampaign,
      upsertCampaign,
      deleteCampaign,
      addMonsterToCampaign,
      updateMonsterInCampaign,
      deleteMonsterFromCampaign,
      saveMonsterToCompendium,
      addAgentToCampaign,
      updateAgentInCampaign,
      deleteAgentFromCampaign,
      addStorySceneToCampaign,
      updateStorySceneInCampaign,
      deleteStorySceneFromCampaign,
      setInitiativesInCampaign,
      customWeapons,
      upsertCustomWeapon,
      deleteCustomWeapon,
      equipWeaponToCharacter,
      removeAttackFromCharacter,
      customItems,
      upsertCustomItem,
      deleteCustomItem,
      equipCatalogItemToCharacter,
      rollHistory,
      latestRoll,
      dismissLatestRoll,
      rollSkillTest,
      rollFormula,
      rollWeaponDamageAction,
      clearRollHistory,
      userProfile,
      updateUserProfile,
      listingColumns,
      setListingColumns,
      toggleListingColumns,
      exportBackupJson,
      importBackupJson,
      manualModalVisible,
      manualInitialSection,
      openManual,
      closeManual,
      syncStatus,
      syncStatusMessage,
      syncAuthState,
      connectGoogleDrive,
      disconnectGoogleDrive,
      syncWithDriveNow,
      autoSyncEnabled,
      setAutoSyncEnabled,
      lastSyncStats,
      virtualTable,
      tableStatus,
      tableStatusError,
      tableParticipant,
      tableRecentRolls,
      createVirtualTable,
      joinVirtualTable,
      leaveVirtualTable,
      broadcastRollToTable,
      rollTableInitiative,
      advanceTableTurn,
      clearTableCombat,
      broadcastTableScene,
      updateAgentInTable,
      addMonsterToTableInitiative,
      saveTableConfig,
      tableConfig,
      updateInfo,
      updateModalVisible,
      setUpdateModalVisible,
      checkForUpdates,
      dismissUpdate,
      recordPreview,
      openRecordPreview,
      closeRecordPreview,
      openEntityPreview,
      openSkillPreview,
      catalogBooks,
      pdfAccessModalVisible,
      openPdfAccessModal,
      closePdfAccessModal,
      uploadAndUnlockPdf,
      requestAdminEmailUnlockCode,
      verifyAdminEmailUnlockCode,
      unlockWithMasterPassword,
      lockBook,
      deletePdfBook,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
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
