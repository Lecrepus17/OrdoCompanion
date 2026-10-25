import {
  CharacterSheet,
  CompendiumEntity,
  CustomWeapon,
  SavedList,
  UserProfile,
} from '../../types/compendium';

export interface UserDataBackupPayload {
  exportedAt: string;
  version?: string;
  userProfile?: UserProfile;
  customEntities?: CompendiumEntity[];
  editedEntities?: Record<string, CompendiumEntity>;
  favorites?: string[];
  savedLists?: SavedList[];
  characters?: CharacterSheet[];
  customWeapons?: CustomWeapon[];
}

export type SyncStatus = 'idle' | 'checking' | 'syncing' | 'synced' | 'error';

export interface SyncAuthState {
  isAuthenticated: boolean;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  accessToken?: string;
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
  weaponsCount: number;
  customEntitiesCount: number;
  favoritesCount: number;
  listsCount: number;
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
