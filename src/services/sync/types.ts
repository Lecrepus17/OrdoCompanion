import {
  BookWithPages,
  Campaign,
  CharacterSheet,
  CompendiumEntity,
  CustomCatalogItem,
  CustomWeapon,
  SavedList,
  UnlockedBookRecord,
  UserProfile,
} from '../../types/compendium';

export interface DriveStoredPdfRef {
  bookId: string;
  driveFileId: string;
  fileName: string;
  size?: number;
  sha256?: string;
  updatedAt: string;
}

export interface UserDataBackupPayload {
  exportedAt: string;
  version?: string;
  userProfile?: UserProfile;
  customEntities?: CompendiumEntity[];
  editedEntities?: Record<string, CompendiumEntity>;
  favorites?: string[];
  savedLists?: SavedList[];
  characters?: CharacterSheet[];
  campaigns?: Campaign[];
  customWeapons?: CustomWeapon[];
  customItems?: CustomCatalogItem[];
  unlockedBooks?: Record<string, UnlockedBookRecord>;
  dynamicBooks?: BookWithPages[];
  dynamicEntities?: CompendiumEntity[];
  drivePdfFiles?: Record<string, DriveStoredPdfRef>;
  deletedCharacterIds?: string[];
  deletedCampaignIds?: string[];
  deletedCustomWeaponIds?: string[];
  deletedCustomItemIds?: string[];
}

export type SyncStatus = 'idle' | 'checking' | 'syncing' | 'synced' | 'error';

export interface SyncAuthState {
  isAuthenticated: boolean;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

export interface MergeStats {
  charactersCount: number;
  campaignsCount?: number;
  weaponsCount: number;
  itemsCount?: number;
  customEntitiesCount: number;
  favoritesCount: number;
  listsCount: number;
  unlockedBooksCount?: number;
  dynamicBooksCount?: number;
  pdfsSyncedCount?: number;
  conflictsResolved: number;
}

export interface MergeResult {
  merged: UserDataBackupPayload;
  hasLocalChangesToApply: boolean;
  hasRemoteChangesToUpload: boolean;
  stats: MergeStats;
}

export interface SyncProgressCallback {
  (status: SyncStatus, message?: string): void;
}
