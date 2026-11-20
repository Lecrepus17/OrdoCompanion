import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import compendiumSeedRaw from '../src/data/seed/compendium_seed.json';
import {
  areElementsIncompatible,
  calculateCurseCategoryIncrease,
  calculateEquippedProtections,
  OFFICIAL_PROTECTION_CURSES,
  OFFICIAL_PROTECTIONS,
} from '../src/utils/protections';
import {
  calculateCatalogItemStats,
  getCuratedCompendiumItems,
  OFFICIAL_ACCESSORY_CURSES,
  OFFICIAL_PROTECTION_CURSES_FOR_CATALOG,
} from '../src/utils/inventoryItems';
import { getNexMilestone } from '../src/utils/progression';
import ProtectionModal, { ProtectionApplyPayload } from '../src/components/ProtectionModal';
import CharactersScreen from '../src/app/(tabs)/characters';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { CharacterSheet, CompendiumEntity } from '../src/types/compendium';

const seedEntities = ((compendiumSeedRaw as any)?.entities || []) as CompendiumEntity[];
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';

function makeAgent(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  const base: CharacterSheet = {
    id: 'agent_support_test_1',
    name: 'Agente Mascarado',
    player: 'Sperotto',
    originId: 'origin_1',
    classId: 'combatente',
    trackId: 'trilha_1',
    affinity: 'Nenhum',
    nex: 30,
    rank: 'Operador',
    peRound: 6,
    attributes: { AGI: 2, FOR: 3, INT: 2, PRE: 3, VIG: 2 },
    pvCurrent: 30,
    pvMax: 40,
    peCurrent: 15,
    peMax: 20,
    sanCurrent: 30,
    sanMax: 35,
    defenseEquip: 5,
    defenseOther: 0,
    defenseBonus: 5,
    skills: {
      Luta: { degree: 10, bonus: 0 },
      Pontaria: { degree: 5, bonus: 0 },
      Reflexos: { degree: 5, bonus: 0 },
      Fortitude: { degree: 5, bonus: 0 },
    },
    attacks: [],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  };
  return {
    ...base,
    ...overrides,
    trackId: overrides.trackId ?? base.trackId,
    affinity: overrides.affinity ?? base.affinity,
    entityIds: overrides.entityIds ?? base.entityIds,
    notes: overrides.notes ?? base.notes,
  };
}

describe('Regressões de Tickets de Suporte (#ORD-33762V, #ORD-5322T7, #ORD-4017YV)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('Proteções canônicas (5), Elmo do Colosso no compêndio curado, maldições e elementos opressores', () => {
    assert.strictEqual(OFFICIAL_PROTECTIONS.length, 5);
    assert.strictEqual(OFFICIAL_PROTECTIONS.some((p) => p.name === 'Elmo do Colosso'), false);
    const curatedItems = getCuratedCompendiumItems(seedEntities);
    const elmo = curatedItems.find((p) => p.name === 'Elmo do Colosso');
    assert.ok(elmo, 'Elmo do Colosso deve estar acessível via compêndio curado como Vestimenta');
    assert.strictEqual(elmo?.category, 'III');
    assert.strictEqual(OFFICIAL_PROTECTION_CURSES.length, 10);

    // Pares opressores (Livro Base p. 111 / p. 154)
    assert.strictEqual(areElementsIncompatible('Sangue', 'Conhecimento'), true);
    assert.strictEqual(areElementsIncompatible('Conhecimento', 'Energia'), true);
    assert.strictEqual(areElementsIncompatible('Energia', 'Morte'), true);
    assert.strictEqual(areElementsIncompatible('Morte', 'Sangue'), true);
    assert.strictEqual(areElementsIncompatible('Sangue', 'Energia'), false);
    assert.strictEqual(areElementsIncompatible('Morte', 'Conhecimento'), false);

    // +II na 1ª maldição, +I por maldição adicional
    assert.strictEqual(calculateCurseCategoryIncrease(0), 0);
    assert.strictEqual(calculateCurseCategoryIncrease(1), 2);
    assert.strictEqual(calculateCurseCategoryIncrease(2), 3);

    const leve = OFFICIAL_PROTECTIONS.find((p) => p.id === 'item__livro_base__protecao_leve')!;
    const res = calculateEquippedProtections(leve, null, [], ['Cinética', 'Sombria']);
    assert.strictEqual(res.totalDefenseEquip, 7); // +5 Leve +2 Cinética
    assert.ok(res.resistancesText.includes('Geral 2'));
    assert.ok(res.protectionText.includes('Cinética'));
    assert.ok(res.protectionText.includes('Sombria'));
  });

  test('Acessórios e proteções no catálogo calculam maldições (+II primeira, +I seguintes)', () => {
    assert.strictEqual(OFFICIAL_ACCESSORY_CURSES.length, 13);
    assert.strictEqual(OFFICIAL_PROTECTION_CURSES_FOR_CATALOG.length, 10);

    const oneCurse = calculateCatalogItemStats({
      baseCategory: '0',
      baseSpaces: 1,
      itemType: 'vestimenta',
      modifications: ['curse_acc_carisma'],
    });
    assert.strictEqual(oneCurse.finalCategory, 'II');

    const twoCurses = calculateCatalogItemStats({
      baseCategory: 'I',
      baseSpaces: 2,
      itemType: 'protecao',
      modifications: ['curse__prot_cinetica', 'curse__prot_abascanta'],
    });
    // Cat I + 2 (1ª) + 1 (2ª) = Cat IV
    assert.strictEqual(twoCurses.finalCategory, 'IV');
  });

  test('ProtectionModal aplica maldições, protege categoria e permite manter proteções anteriores (replaceExisting=false)', async () => {
    let applied: ProtectionApplyPayload | null = null;

    const { getByTestId } = await renderWithProviders(
      <ProtectionModal
        visible={true}
        onClose={() => {}}
        character={makeAgent()}
        onApply={(payload) => {
          applied = payload;
        }}
      />,
      { mobile: 'android' }
    );

    await fireClick(getByTestId('btn-armor-leve'));
    await fireClick(getByTestId('curse-curse__prot_cinetica'));
    await fireClick(getByTestId('toggle-replace-protection'));
    await fireClick(getByTestId('btn-apply-protections'));

    assert.ok(applied);
    const result = applied as ProtectionApplyPayload;
    assert.strictEqual(result.defenseEquip, 7);
    assert.strictEqual(result.replaceExisting, false);
    assert.strictEqual(result.equippedItems[0].category, 'III'); // Leve (I) + Cinética (+II)
    assert.deepStrictEqual(result.equippedItems[0].curses, ['Cinética']);
  });

  test('Marcos de NEX somente liberam aumento de atributo em 20%, 50%, 80% e 95% (#ORD-5322T7)', () => {
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 20).needsAttributeIncrease), true);
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 25).needsAttributeIncrease), false);
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 30).needsAttributeIncrease), false);
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 50).needsAttributeIncrease), true);
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 55).needsAttributeIncrease), false);
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 80).needsAttributeIncrease), true);
    assert.strictEqual(Boolean(getNexMilestone('Combatente', 95).needsAttributeIncrease), true);
  });

  test('Mascarados Forma Suprema na Ficha: habilita, ativa (-6 SAN, +20 PV, +10 PE, +10 Def), consome rodada e desativa (#ORD-33762V)', async () => {
    const initialChar = makeAgent({
      id: 'char_mask_test',
      pvCurrent: 30,
      pvMax: 40,
      peCurrent: 15,
      peMax: 20,
      sanCurrent: 30,
      sanMax: 35,
      defenseEquip: 5,
      defenseOther: 0,
      defenseBonus: 5,
    });
    await defaultRepository.saveCharacters([initialChar]);

    const { getByTestId, queryByTestId, getByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'android',
    });

    if (!queryByTestId('btn-toggle-mask-enabled')) {
      await fireClick(getByText('Agente Mascarado'));
    }

    // Habilitar suporte à máscara
    await fireClick(getByTestId('btn-toggle-mask-enabled'));
    // Vestir máscara
    await fireClick(getByTestId('btn-mask-activate'));

    let updated = (await defaultRepository.getCharacters()).find((c) => c.id === 'char_mask_test')!;
    assert.strictEqual(updated.maskConfig?.isActive, true);
    assert.strictEqual(updated.sanCurrent, 24);
    assert.strictEqual(updated.pvMax, 60);
    assert.strictEqual(updated.pvCurrent, 50);
    assert.strictEqual(updated.peMax, 30);
    assert.strictEqual(updated.peCurrent, 25);
    assert.strictEqual(updated.defenseOther, 10);

    // +1 rodada (-2 SAN)
    await fireClick(getByTestId('btn-mask-round'));
    updated = (await defaultRepository.getCharacters()).find((c) => c.id === 'char_mask_test')!;
    assert.strictEqual(updated.sanCurrent, 22);

    // Desativar máscara (-20 PV, -10 PE, -10 Def)
    await fireClick(getByTestId('btn-mask-deactivate'));
    updated = (await defaultRepository.getCharacters()).find((c) => c.id === 'char_mask_test')!;
    assert.strictEqual(updated.maskConfig?.isActive, false);
    assert.strictEqual(updated.pvMax, 40);
    assert.strictEqual(updated.pvCurrent, 30);
    assert.strictEqual(updated.peMax, 20);
    assert.strictEqual(updated.peCurrent, 15);
    assert.strictEqual(updated.defenseOther, 0);
  });

  test('Desabilitar suporte à Máscara com Forma Suprema ativa reverte +20 PV, +10 PE e +10 Defesa (#ORD-33762V)', async () => {
    const maskedChar = makeAgent({
      id: 'char_mask_exploit_test',
      pvCurrent: 30,
      pvMax: 40,
      peCurrent: 15,
      peMax: 20,
      sanCurrent: 30,
      sanMax: 35,
      defenseEquip: 5,
      defenseOther: 0,
      defenseBonus: 5,
      maskConfig: {
        enabled: true,
        maskName: 'Máscara da Seita',
        isActive: false,
        activeRounds: 0,
        grantBonusDiceDamage: true,
        grantBonusTests: true,
        grantBonusDt: true,
        freeAdvancedRituals: false,
      },
    });
    await defaultRepository.saveCharacters([maskedChar]);

    const { getByTestId, queryByTestId, getByText } = await renderWithProviders(<CharactersScreen />, {
      mobile: 'android',
    });

    if (!queryByTestId('btn-mask-activate')) {
      await fireClick(getByText('Agente Mascarado'));
    }

    await fireClick(getByTestId('btn-mask-activate'));
    let updated = (await defaultRepository.getCharacters()).find((c) => c.id === 'char_mask_exploit_test')!;
    assert.strictEqual(updated.maskConfig?.isActive, true);
    assert.strictEqual(updated.pvMax, 60);
    assert.strictEqual(updated.defenseOther, 10);

    // Desabilitar o suporte à máscara diretamente enquanto ativa deve reverter todos os bônus
    await fireClick(getByTestId('btn-toggle-mask-enabled'));
    updated = (await defaultRepository.getCharacters()).find((c) => c.id === 'char_mask_exploit_test')!;
    assert.strictEqual(updated.maskConfig?.enabled, false);
    assert.strictEqual(updated.maskConfig?.isActive, false);
    assert.strictEqual(updated.pvMax, 40);
    assert.strictEqual(updated.pvCurrent, 30);
    assert.strictEqual(updated.peMax, 20);
    assert.strictEqual(updated.peCurrent, 15);
    assert.strictEqual(updated.defenseOther, 0);
  });
});
