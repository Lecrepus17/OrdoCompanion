// Testes de validação para o algoritmo de Smart Merge
const assert = require('assert');

function parseDate(isoString) {
  if (!isoString) return 0;
  const t = new Date(isoString).getTime();
  return isNaN(t) ? 0 : t;
}

// Simulador das regras do SmartMergeEngine
function mergeUserData(local, remote) {
  let hasLocalChangesToApply = false;
  let hasRemoteChangesToUpload = false;
  let conflictsResolved = 0;

  // 1. Personagens
  const localChars = local.characters || [];
  const remoteChars = remote.characters || [];
  const charMap = new Map();

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

  // 2. Favoritos
  const localFavs = new Set(local.favorites || []);
  const remoteFavs = new Set(remote.favorites || []);
  const mergedFavorites = Array.from(new Set([...localFavs, ...remoteFavs]));

  if (mergedFavorites.length !== localFavs.size) {
    hasLocalChangesToApply = true;
  }
  if (mergedFavorites.length !== remoteFavs.size) {
    hasRemoteChangesToUpload = true;
  }

  return {
    merged: {
      characters: Array.from(charMap.values()),
      favorites: mergedFavorites,
    },
    hasLocalChangesToApply,
    hasRemoteChangesToUpload,
    conflictsResolved,
  };
}

console.log('🧪 Iniciando testes de unidade do Smart Merge...');

// Teste 1: Adição independente em cada dispositivo sem conflito
{
  const local = {
    characters: [{ id: 'char_1', name: 'Arthur Cervero', updatedAt: '2026-10-25T01:00:00Z' }],
    favorites: ['item_1'],
  };
  const remote = {
    characters: [{ id: 'char_2', name: 'Cesar Cohen', updatedAt: '2026-10-25T01:10:00Z' }],
    favorites: ['item_2'],
  };

  const res = mergeUserData(local, remote);
  assert.strictEqual(res.merged.characters.length, 2, 'Deveria conter os 2 personagens');
  assert.strictEqual(res.merged.favorites.length, 2, 'Deveria conter os 2 favoritos');
  assert.strictEqual(res.hasLocalChangesToApply, true, 'Local precisa receber char_2');
  assert.strictEqual(res.hasRemoteChangesToUpload, true, 'Remoto precisa receber char_1');
  console.log('✅ Teste 1: Dispositivos com dados diferentes mesclados com sucesso sem perda');
}

// Teste 2: Conflito de versão no mesmo personagem (vence o mais recente)
{
  const local = {
    characters: [
      { id: 'char_1', name: 'Arthur (PV 15)', updatedAt: '2026-10-25T01:00:00Z' },
    ],
    favorites: [],
  };
  const remote = {
    characters: [
      { id: 'char_1', name: 'Arthur (PV 20)', updatedAt: '2026-10-25T02:00:00Z' },
    ],
    favorites: [],
  };

  const res = mergeUserData(local, remote);
  assert.strictEqual(res.merged.characters.length, 1);
  assert.strictEqual(res.merged.characters[0].name, 'Arthur (PV 20)');
  assert.strictEqual(res.hasLocalChangesToApply, true);
  assert.strictEqual(res.conflictsResolved, 1);
  console.log('✅ Teste 2: Conflito resolvido corretamente favorecendo timestamp mais recente');
}

// Teste 3: União de favoritos não duplica itens
{
  const local = { characters: [], favorites: ['ritual_1', 'ritual_2'] };
  const remote = { characters: [], favorites: ['ritual_2', 'ritual_3'] };

  const res = mergeUserData(local, remote);
  assert.strictEqual(res.merged.favorites.length, 3);
  assert.deepStrictEqual(res.merged.favorites.sort(), ['ritual_1', 'ritual_2', 'ritual_3']);
  console.log('✅ Teste 3: Conjunto de favoritos unificado sem duplicação');
}

console.log('🎉 Todos os testes de mesclagem passaram com 100% de sucesso!');
