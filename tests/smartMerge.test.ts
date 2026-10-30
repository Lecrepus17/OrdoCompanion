import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartMergeEngine } from '../src/services/sync/SmartMergeEngine';
import { UserDataBackupPayload } from '../src/services/sync/types';
import { CharacterSheet, CustomWeapon, SavedList } from '../src/types/compendium';

function makeDummyChar(
  partial: Partial<CharacterSheet> & { id: string; name: string }
): CharacterSheet {
  return {
    player: 'Investigador',
    rank: 'Recruta',
    affinity: 'Nenhum',
    trackId: '',
    classId: 'Combatente',
    originId: 'Policial',
    nex: 10,
    pvCurrent: 20,
    pvMax: 20,
    peCurrent: 4,
    peMax: 4,
    sanCurrent: 12,
    sanMax: 12,
    defenseBonus: 0,
    attributes: { AGI: 2, FOR: 2, INT: 2, PRE: 2, VIG: 2 },
    skills: {},
    attacks: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: '2026-10-25T01:00:00.000Z',
    ...partial,
  };
}

function createDummyPayload(overrides?: Partial<UserDataBackupPayload>): UserDataBackupPayload {
  return {
    exportedAt: '2026-10-25T01:00:00.000Z',
    version: '1.0.0',
    characters: [],
    customWeapons: [],
    customEntities: [],
    editedEntities: {},
    favorites: [],
    savedLists: [],
    userProfile: {
      id: 'usr_test',
      playerName: 'Agente Inicial',
      cloudSyncEnabled: true,
      lastSyncAt: '2026-10-25T01:00:00.000Z',
      updatedAt: '2026-10-25T01:00:00.000Z',
    },
    ...overrides,
  };
}

describe('Mecanismo de Sincronização e Resolução de Conflitos (SmartMergeEngine)', () => {
  it('deve unir personagens sem conflito quando cada dispositivo cria um personagem diferente', () => {
    const char1 = makeDummyChar({
      id: 'char_arthur',
      name: 'Arthur Cervero',
      classId: 'Combatente',
      originId: 'Policial',
      pvCurrent: 20,
      pvMax: 20,
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      updatedAt: '2026-10-25T01:10:00.000Z',
    });

    const char2 = makeDummyChar({
      id: 'char_cesar',
      name: 'Cesar Cohen',
      classId: 'Especialista',
      originId: 'T.I.',
      pvCurrent: 16,
      pvMax: 16,
      attributes: { AGI: 1, FOR: 1, INT: 3, PRE: 2, VIG: 1 },
      updatedAt: '2026-10-25T01:20:00.000Z',
    });

    const local = createDummyPayload({ characters: [char1] });
    const remote = createDummyPayload({ characters: [char2] });

    const result = SmartMergeEngine.merge(local, remote);
    const chars = result.merged.characters || [];

    assert.strictEqual(chars.length, 2);
    const ids = chars.map((c) => c.id);
    assert.ok(ids.includes('char_arthur'));
    assert.ok(ids.includes('char_cesar'));

    // Local precisa receber char_cesar
    assert.strictEqual(result.hasLocalChangesToApply, true);
    // Remoto precisa receber char_arthur
    assert.strictEqual(result.hasRemoteChangesToUpload, true);
  });

  it('deve resolver conflito na mesma ficha escolhendo a versão com updatedAt mais recente', () => {
    const localChar = makeDummyChar({
      id: 'char_dante',
      name: 'Dante (PV 10)',
      classId: 'Ocultista',
      originId: 'Acadêmico',
      pvCurrent: 10,
      pvMax: 18,
      updatedAt: '2026-10-25T01:00:00.000Z', // Mais antigo
    });

    const remoteChar = makeDummyChar({
      ...localChar,
      name: 'Dante (Curado - PV 18)',
      pvCurrent: 18,
      updatedAt: '2026-10-25T01:30:00.000Z', // Mais recente
    });

    const local = createDummyPayload({ characters: [localChar] });
    const remote = createDummyPayload({ characters: [remoteChar] });

    const result = SmartMergeEngine.merge(local, remote);
    const chars = result.merged.characters || [];

    assert.strictEqual(chars.length, 1);
    assert.strictEqual(chars[0].name, 'Dante (Curado - PV 18)');
    assert.strictEqual(chars[0].pvCurrent, 18);
    assert.strictEqual(result.hasLocalChangesToApply, true);
    assert.strictEqual(result.stats.conflictsResolved, 1);
  });

  it('deve mesclar favoritos através de união de conjuntos sem duplicar ou perder nenhum', () => {
    const local = createDummyPayload({
      favorites: ['ritual_decapitacao', 'item_lanterna'],
    });
    const remote = createDummyPayload({
      favorites: ['item_lanterna', 'criatura_zumbi_sangue'],
    });

    const result = SmartMergeEngine.merge(local, remote);
    const favs = result.merged.favorites || [];

    assert.strictEqual(favs.length, 3);
    assert.ok(favs.includes('ritual_decapitacao'));
    assert.ok(favs.includes('item_lanterna'));
    assert.ok(favs.includes('criatura_zumbi_sangue'));
    assert.strictEqual(result.hasLocalChangesToApply, true);
    assert.strictEqual(result.hasRemoteChangesToUpload, true);
  });

  it('deve mesclar armas customizadas com resolução temporal', () => {
    const localWep: CustomWeapon = {
      id: 'wep_revolver_custom',
      name: 'Revólver Tático',
      baseWeaponName: 'Revólver',
      weaponType: 'Fogo',
      proficiency: 'Simples',
      handedness: 'Uma Mão',
      baseDamage: '2d6',
      baseCritical: '19/x3',
      baseRange: 'Curto',
      baseDamageType: 'Balístico',
      baseSpaces: 1,
      baseCategory: 'I',
      modifications: ['mira_laser'],
      finalDamage: '2d6',
      finalCritical: '18/x3',
      finalRange: 'Curto',
      finalCategory: 'II',
      finalSpaces: 1,
      attackBonus: 2,
      damageBonus: 0,
      element: 'Nenhum',
      specialRules: 'Mira Laser',
      createdAt: '2026-10-25T01:30:00.000Z',
      updatedAt: '2026-10-25T01:40:00.000Z',
    };

    const remoteWep: CustomWeapon = {
      ...localWep,
      name: 'Revólver Tático com Silenciador',
      modifications: ['mira_laser', 'silenciador'],
      updatedAt: '2026-10-25T01:45:00.000Z', // Mais novo
    };

    const local = createDummyPayload({ customWeapons: [localWep] });
    const remote = createDummyPayload({ customWeapons: [remoteWep] });

    const result = SmartMergeEngine.merge(local, remote);
    const weapons = result.merged.customWeapons || [];

    assert.strictEqual(weapons.length, 1);
    assert.strictEqual(weapons[0].name, 'Revólver Tático com Silenciador');
    assert.strictEqual(result.hasLocalChangesToApply, true);
  });

  it('deve mesclar listas salvas combinando os IDs de entidades sem duplicar', () => {
    const listLocal: SavedList = {
      id: 'list_investigacao',
      name: 'Rituais de Investigação',
      description: 'Lista de rituais',
      createdAt: '2026-10-25T01:00:00.000Z',
      entityIds: ['ritual_1', 'ritual_2'],
      updatedAt: '2026-10-25T01:00:00.000Z',
    };

    const listRemote: SavedList = {
      id: 'list_investigacao',
      name: 'Rituais de Investigação (Atualizada)',
      description: 'Lista de rituais atualizada',
      createdAt: '2026-10-25T01:00:00.000Z',
      entityIds: ['ritual_2', 'ritual_3'],
      updatedAt: '2026-10-25T01:10:00.000Z',
    };

    const local = createDummyPayload({ savedLists: [listLocal] });
    const remote = createDummyPayload({ savedLists: [listRemote] });

    const result = SmartMergeEngine.merge(local, remote);
    const lists = result.merged.savedLists || [];

    assert.strictEqual(lists.length, 1);
    const mergedList = lists[0];
    assert.strictEqual(mergedList.name, 'Rituais de Investigação (Atualizada)');
    assert.strictEqual(mergedList.entityIds.length, 3);
    assert.ok(mergedList.entityIds.includes('ritual_1'));
    assert.ok(mergedList.entityIds.includes('ritual_2'));
    assert.ok(mergedList.entityIds.includes('ritual_3'));
  });

  it('deve respeitar deletedCharacterIds e não ressuscitar agentes deletados ao sincronizar com Google Drive', () => {
    const charAlive = makeDummyChar({
      id: 'char_arthur',
      name: 'Arthur Cervero',
      updatedAt: '2026-10-25T01:00:00.000Z',
    });

    const charDeletedLocally = makeDummyChar({
      id: 'char_excluido',
      name: 'Agente Que Foi Deletado',
      updatedAt: '2026-10-25T01:00:00.000Z',
    });

    // Local: apagou o agente char_excluido e gravou seu ID em deletedCharacterIds
    const local = createDummyPayload({
      characters: [charAlive],
      deletedCharacterIds: ['char_excluido'],
    });

    // Remoto (Google Drive): ainda contém char_excluido de uma sincronização anterior
    const remote = createDummyPayload({
      characters: [charAlive, charDeletedLocally],
      deletedCharacterIds: [],
    });

    const result = SmartMergeEngine.merge(local, remote);
    const chars = result.merged.characters || [];

    // O agente deletado NÃO pode ser ressuscitado!
    assert.strictEqual(chars.length, 1);
    assert.strictEqual(chars[0].id, 'char_arthur');

    // O Drive remoto precisa ser atualizado para remover o agente deletado
    assert.strictEqual(result.hasRemoteChangesToUpload, true);
    // E a lista consolidada de deletados deve conter o ID
    assert.ok(result.merged.deletedCharacterIds?.includes('char_excluido'));
  });

  it('deve mesclar perfil do usuário preservando o cloudSyncEnabled e dados mais recentes', () => {
    const local = createDummyPayload({
      userProfile: {
        id: 'usr_1',
        playerName: 'Thiago Fritz',
        cloudSyncEnabled: true,
        lastSyncAt: '2026-10-25T01:00:00.000Z',
        updatedAt: '2026-10-25T01:00:00.000Z',
      },
    });

    const remote = createDummyPayload({
      userProfile: {
        id: 'usr_1',
        playerName: 'Thiago Fritz (Líder)',
        cloudSyncEnabled: true,
        lastSyncAt: '2026-10-25T01:25:00.000Z',
        updatedAt: '2026-10-25T01:25:00.000Z',
      },
    });

    const result = SmartMergeEngine.merge(local, remote);
    const profile = result.merged.userProfile;

    assert.ok(profile);
    assert.strictEqual(profile?.playerName, 'Thiago Fritz (Líder)');
    assert.strictEqual(profile?.cloudSyncEnabled, true);
    assert.strictEqual(result.hasLocalChangesToApply, true);
  });
});
