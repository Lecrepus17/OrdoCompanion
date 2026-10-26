import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BookInfo,
  BookPage,
  Campaign,
  CampaignAgentLink,
  CampaignInitiativeEntry,
  CampaignMonster,
  CampaignStoryScene,
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

  // Dice Roller & Toast
  rollHistory: DiceRollResult[];
  latestRoll: DiceRollResult | null;
  dismissLatestRoll: () => void;
  rollSkillTest: (attributeDice: number, bonus: number, label?: string, criticalThreat?: number) => DiceRollResult;
  rollOrdemTest: (attributeDice: number, bonus: number, label?: string, criticalThreat?: number) => DiceRollResult;
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
      const [favs, lists, chars, camps, weapons, profile] = await Promise.all([
        defaultRepository.getFavorites(),
        defaultRepository.getSavedLists(),
        defaultRepository.getCharacters(),
        defaultRepository.getCampaigns(),
        defaultRepository.getCustomWeapons(),
        defaultRepository.getUserProfile(),
      ]);
      setFavoritesArr(favs);
      setSavedLists(lists);
      setCharacters(chars);
      setCampaigns(camps);
      if (camps.length > 0) {
        setActiveCampaignId(camps[0].id);
      }
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

  // Verificação automática de atualizações em segundo plano após inicialização
  useEffect(() => {
    if (!ready) return;
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
  }, [ready]);

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
    const newEntity: Omit<CompendiumEntity, 'id'> = {
      name: monster.name,
      category: 'creature',
      subCategory: 'Ameaça da Campanha',
      bookId: 'custom',
      bookTitle: 'Homebrew do Mestre',
      pageNumber: 1,
      element: monster.element || 'Nenhum',
      summary: `VD ${monster.vd} • Defesa ${monster.defense} • PV ${monster.pvMax}`,
      description: `${monster.attacks ? `Ataques:\n${monster.attacks}\n\n` : ''}${monster.abilities ? `Habilidades:\n${monster.abilities}\n\n` : ''}${monster.notes || ''}`.trim(),
      tags: ['Ameaça', 'Mestre', monster.element || 'Nenhum'],
      vd: monster.vd,
      defense: monster.defense,
      pv: monster.pvMax,
      disturbingPresence: monster.disturbingPresence,
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
    cloudSyncManager.scheduleAutoSync();
  }, []);

  const deleteCustomWeapon = useCallback(async (weaponId: string) => {
    setCustomWeapons((prev) => {
      const next = prev.filter((w) => w.id !== weaponId);
      defaultRepository.saveCustomWeapons(next);
      return next;
    });
    cloudSyncManager.scheduleAutoSync();
  }, []);

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
    (attributeDice: number, bonus: number, label?: string, criticalThreat?: number) => {
      const res = rollOrdemTest(attributeDice, bonus, label, criticalThreat);
      setLatestRoll(res);
      setRollHistory((prev) => [res, ...prev.slice(0, 49)]);
      if (virtualTableManager.getStatus() === 'connected') {
        broadcastRollToTable(res, { actionType: 'skill' }).catch(() => {});
      }
      return res;
    },
    [broadcastRollToTable]
  );

  const rollFormula = useCallback(
    (formula: string, label?: string) => {
      const res = rollDiceFormula(formula, label);
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
    const [favs, lists, chars, camps, weapons, profile] = await Promise.all([
      defaultRepository.getFavorites(),
      defaultRepository.getSavedLists(),
      defaultRepository.getCharacters(),
      defaultRepository.getCampaigns(),
      defaultRepository.getCustomWeapons(),
      defaultRepository.getUserProfile(),
    ]);
    setFavoritesArr(favs);
    setSavedLists(lists);
    setCharacters(chars);
    setCampaigns(camps);
    setCustomWeapons(weapons);
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

  const contextValue = useMemo<AppContextValue>(
    () => ({
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
      rollHistory,
      latestRoll,
      dismissLatestRoll,
      rollSkillTest,
      rollOrdemTest: rollSkillTest,
      rollFormula,
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
