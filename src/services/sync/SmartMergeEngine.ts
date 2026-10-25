import {
  CharacterSheet,
  CompendiumEntity,
  CustomWeapon,
  SavedList,
  UserProfile,
} from '../../types/compendium';
import { MergeResult, UserDataBackupPayload } from './types';

/**
 * Converte timestamp ISO para millisegundos com fallback seguro
 */
function parseDate(isoString?: string): number {
  if (!isoString) return 0;
  const t = new Date(isoString).getTime();
  return isNaN(t) ? 0 : t;
}

export class SmartMergeEngine {
  /**
   * Executa a mesclagem inteligente entre os dados locais e remotos
   * preservando as versões mais recentes sem apagar dados de nenhum dispositivo.
   */
  public static merge(
    local: UserDataBackupPayload,
    remote: UserDataBackupPayload
  ): MergeResult {
    let hasLocalChangesToApply = false;
    let hasRemoteChangesToUpload = false;
    let conflictsResolved = 0;

    // 1. Personagens / Fichas
    const localChars = local.characters || [];
    const remoteChars = remote.characters || [];
    const charMap = new Map<string, CharacterSheet>();

    const allCharIds = new Set([
      ...localChars.map((c) => c.id),
      ...remoteChars.map((c) => c.id),
    ]);

    for (const id of allCharIds) {
      const loc = localChars.find((c) => c.id === id);
      const rem = remoteChars.find((c) => c.id === id);

      if (loc && rem) {
        const locTime = parseDate(loc.updatedAt);
        const remTime = parseDate(rem.updatedAt);

        if (remTime > locTime) {
          charMap.set(id, rem);
          hasLocalChangesToApply = true;
          conflictsResolved++;
        } else if (locTime > remTime) {
          charMap.set(id, loc);
          hasRemoteChangesToUpload = true;
          conflictsResolved++;
        } else {
          charMap.set(id, loc);
        }
      } else if (loc && !rem) {
        charMap.set(id, loc);
        hasRemoteChangesToUpload = true;
      } else if (!loc && rem) {
        charMap.set(id, rem);
        hasLocalChangesToApply = true;
      }
    }
    const mergedCharacters = Array.from(charMap.values());

    // 2. Armas Customizadas
    const localWeapons = local.customWeapons || [];
    const remoteWeapons = remote.customWeapons || [];
    const weaponMap = new Map<string, CustomWeapon>();

    const allWeaponIds = new Set([
      ...localWeapons.map((w) => w.id),
      ...remoteWeapons.map((w) => w.id),
    ]);

    for (const id of allWeaponIds) {
      const loc = localWeapons.find((w) => w.id === id);
      const rem = remoteWeapons.find((w) => w.id === id);

      if (loc && rem) {
        const locTime = parseDate(loc.updatedAt || loc.createdAt);
        const remTime = parseDate(rem.updatedAt || rem.createdAt);

        if (remTime > locTime) {
          weaponMap.set(id, rem);
          hasLocalChangesToApply = true;
          conflictsResolved++;
        } else if (locTime > remTime) {
          weaponMap.set(id, loc);
          hasRemoteChangesToUpload = true;
          conflictsResolved++;
        } else {
          weaponMap.set(id, loc);
        }
      } else if (loc && !rem) {
        weaponMap.set(id, loc);
        hasRemoteChangesToUpload = true;
      } else if (!loc && rem) {
        weaponMap.set(id, rem);
        hasLocalChangesToApply = true;
      }
    }
    const mergedWeapons = Array.from(weaponMap.values());

    // 3. Entidades Customizadas (Homebrews)
    const localCustom = local.customEntities || [];
    const remoteCustom = remote.customEntities || [];
    const customMap = new Map<string, CompendiumEntity>();

    const allCustomIds = new Set([
      ...localCustom.map((e) => e.id),
      ...remoteCustom.map((e) => e.id),
    ]);

    for (const id of allCustomIds) {
      const loc = localCustom.find((e) => e.id === id);
      const rem = remoteCustom.find((e) => e.id === id);

      if (loc && rem) {
        const locTime = parseDate(loc.updatedAt);
        const remTime = parseDate(rem.updatedAt);

        if (remTime > locTime) {
          customMap.set(id, rem);
          hasLocalChangesToApply = true;
          conflictsResolved++;
        } else if (locTime > remTime) {
          customMap.set(id, loc);
          hasRemoteChangesToUpload = true;
          conflictsResolved++;
        } else {
          customMap.set(id, loc);
        }
      } else if (loc && !rem) {
        customMap.set(id, loc);
        hasRemoteChangesToUpload = true;
      } else if (!loc && rem) {
        customMap.set(id, rem);
        hasLocalChangesToApply = true;
      }
    }
    const mergedCustomEntities = Array.from(customMap.values());

    // 4. Entidades Oficiais Editadas
    const localEdited = local.editedEntities || {};
    const remoteEdited = remote.editedEntities || {};
    const mergedEdited: Record<string, CompendiumEntity> = {};

    const allEditedIds = new Set([
      ...Object.keys(localEdited),
      ...Object.keys(remoteEdited),
    ]);

    for (const id of allEditedIds) {
      const loc = localEdited[id];
      const rem = remoteEdited[id];

      if (loc && rem) {
        const locTime = parseDate(loc.updatedAt);
        const remTime = parseDate(rem.updatedAt);

        if (remTime > locTime) {
          mergedEdited[id] = rem;
          hasLocalChangesToApply = true;
        } else {
          mergedEdited[id] = loc;
          if (locTime > remTime) hasRemoteChangesToUpload = true;
        }
      } else if (loc && !rem) {
        mergedEdited[id] = loc;
        hasRemoteChangesToUpload = true;
      } else if (!loc && rem) {
        mergedEdited[id] = rem;
        hasLocalChangesToApply = true;
      }
    }

    // 5. Favoritos (União de Conjuntos - Nunca perde um favorito)
    const localFavs = new Set(local.favorites || []);
    const remoteFavs = new Set(remote.favorites || []);
    const mergedFavsSet = new Set([...localFavs, ...remoteFavs]);
    const mergedFavorites = Array.from(mergedFavsSet);

    if (mergedFavorites.length !== localFavs.size) {
      hasLocalChangesToApply = true;
    }
    if (mergedFavorites.length !== remoteFavs.size) {
      hasRemoteChangesToUpload = true;
    }

    // 6. Listas Salvas
    const localLists = local.savedLists || [];
    const remoteLists = remote.savedLists || [];
    const listMap = new Map<string, SavedList>();

    const allListIds = new Set([
      ...localLists.map((l) => l.id),
      ...remoteLists.map((l) => l.id),
    ]);

    for (const id of allListIds) {
      const loc = localLists.find((l) => l.id === id);
      const rem = remoteLists.find((l) => l.id === id);

      if (loc && rem) {
        // Une os IDs de entidades salvos na lista
        const combinedEntityIds = Array.from(
          new Set([...loc.entityIds, ...rem.entityIds])
        );
        const locTime = parseDate(loc.updatedAt || loc.createdAt);
        const remTime = parseDate(rem.updatedAt || rem.createdAt);
        const base = remTime > locTime ? rem : loc;

        listMap.set(id, {
          ...base,
          entityIds: combinedEntityIds,
        });

        if (combinedEntityIds.length !== loc.entityIds.length) {
          hasLocalChangesToApply = true;
        }
        if (combinedEntityIds.length !== rem.entityIds.length) {
          hasRemoteChangesToUpload = true;
        }
      } else if (loc && !rem) {
        listMap.set(id, loc);
        hasRemoteChangesToUpload = true;
      } else if (!loc && rem) {
        listMap.set(id, rem);
        hasLocalChangesToApply = true;
      }
    }
    const mergedSavedLists = Array.from(listMap.values());

    // 7. Perfil do Jogador
    const nowIso = new Date().toISOString();
    let mergedProfile: UserProfile;

    if (local.userProfile && remote.userProfile) {
      const locTime = parseDate(local.userProfile.updatedAt);
      const remTime = parseDate(remote.userProfile.updatedAt);
      const base = remTime > locTime ? remote.userProfile : local.userProfile;

      mergedProfile = {
        ...base,
        cloudSyncEnabled: true,
        lastSyncAt: nowIso,
      };

      if (remTime > locTime) hasLocalChangesToApply = true;
      if (locTime > remTime) hasRemoteChangesToUpload = true;
    } else if (local.userProfile) {
      mergedProfile = {
        ...local.userProfile,
        cloudSyncEnabled: true,
        lastSyncAt: nowIso,
      };
      hasRemoteChangesToUpload = true;
    } else if (remote.userProfile) {
      mergedProfile = {
        ...remote.userProfile,
        cloudSyncEnabled: true,
        lastSyncAt: nowIso,
      };
      hasLocalChangesToApply = true;
    } else {
      mergedProfile = {
        id: 'user_merged',
        playerName: '',
        cloudSyncEnabled: true,
        lastSyncAt: nowIso,
        updatedAt: nowIso,
      };
    }

    const mergedPayload: UserDataBackupPayload = {
      exportedAt: nowIso,
      version: '1.0.0',
      userProfile: mergedProfile,
      customEntities: mergedCustomEntities,
      editedEntities: mergedEdited,
      favorites: mergedFavorites,
      savedLists: mergedSavedLists,
      characters: mergedCharacters,
      customWeapons: mergedWeapons,
    };

    return {
      merged: mergedPayload,
      hasLocalChangesToApply,
      hasRemoteChangesToUpload,
      stats: {
        charactersCount: mergedCharacters.length,
        weaponsCount: mergedWeapons.length,
        customEntitiesCount: mergedCustomEntities.length,
        favoritesCount: mergedFavorites.length,
        listsCount: mergedSavedLists.length,
        conflictsResolved,
      },
    };
  }
}
