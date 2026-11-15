import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import compendiumSeedRaw from '../src/data/seed/compendium_seed.json';
import {
  buildCatalogItemFromCuratedItem,
  buildInventoryItemFromCatalogItem,
  buildInventoryItemFromCuratedItem,
  calculateCatalogItemStats,
  calculateInventoryMechanicsSummary,
  calculateItemSaveDt,
  formatSpacesLabel,
  getCuratedCompendiumItems,
  parseSpacesInput,
  syncCharacterWithCatalogItem,
} from '../src/utils/inventoryItems';
import { calculateActiveItemSkillBonuses } from '../src/utils/inventorySkills';
import { CharacterInventoryItem, CharacterSheet, CompendiumEntity } from '../src/types/compendium';

const seedEntities = ((compendiumSeedRaw as any)?.entities || []) as CompendiumEntity[];

function makeDummyAgent(overrides?: Partial<CharacterSheet>): CharacterSheet {
  return {
    id: 'char_inv_test',
    name: 'Agente Teste',
    player: 'Player',
    rank: 'Operador',
    affinity: 'Nenhum',
    trackId: '',
    classId: 'Especialista',
    originId: 'Policial',
    nex: 30,
    peRound: 6,
    attributes: { AGI: 3, FOR: 2, INT: 3, PRE: 2, VIG: 2 },
    pvCurrent: 30,
    pvMax: 30,
    peCurrent: 24,
    peMax: 24,
    sanCurrent: 25,
    sanMax: 25,
    defenseBonus: 0,
    skills: {},
    attacks: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Catálogo Curado, Modificações e Mecânicas de Itens (inventoryItems.ts)', () => {
  it('parseSpacesInput e formatSpacesLabel devem suportar espaços decimais (0,5) e zero (0)', () => {
    assert.strictEqual(parseSpacesInput('0.5', 1), 0.5);
    assert.strictEqual(parseSpacesInput('0,5', 1), 0.5);
    assert.strictEqual(parseSpacesInput('0', 1), 0);
    assert.strictEqual(parseSpacesInput('', 1), 1);
    assert.strictEqual(formatSpacesLabel(0.5), '0,5');
    assert.strictEqual(formatSpacesLabel(0), '0');
    assert.strictEqual(formatSpacesLabel(2), '2');
  });

  it('getCuratedCompendiumItems deve filtrar não-itens (Aliados/Doenças) e enriquecer itens oficiais com mecânicas', () => {
    const curated = getCuratedCompendiumItems(seedEntities);
    assert.ok(curated.length >= 25, 'Deve conter os itens oficiais enriquecidos');

    const names = curated.map((i) => i.name.toLowerCase());
    assert.ok(!names.some((n) => n === 'aliado' || n === 'doenças' || n === 'venenos'));

    const cicatrizante = curated.find((i) => i.name.toLowerCase().includes('cicatrizante'));
    assert.ok(cicatrizante, 'Deve incluir Cicatrizante');
    assert.strictEqual(cicatrizante?.category, 'I');
    assert.strictEqual(cicatrizante?.spaces, 1);
    assert.strictEqual(cicatrizante?.consumable, true);
    assert.ok(cicatrizante?.mechanics.some((m) => m.type === 'heal_pv' && m.formula === '2d8+2'));

    const mochila = curated.find((i) => i.name.toLowerCase().includes('mochila militar'));
    assert.ok(mochila, 'Deve incluir Mochila Militar');
    assert.strictEqual(mochila?.spaces, 0);
    assert.strictEqual(mochila?.loadBonus, 2);

    const bandagem = curated.find((i) => i.name.toLowerCase().includes('bandagem'));
    assert.ok(bandagem, 'Deve incluir Bandagem');
    assert.strictEqual(bandagem?.spaces, 0.5);

    const granadaFrag = curated.find((i) => i.name.toLowerCase().includes('granada de fragmentação'));
    assert.ok(granadaFrag, 'Deve incluir Granada de Fragmentação');
    assert.ok(granadaFrag?.mechanics.some((m) => m.type === 'damage_roll' && m.formula === '8d6' && m.dtFormula === 'AGI'));
  });

  it('calculateCatalogItemStats deve aplicar Aprimorado, Discreto, Função Adicional e melhorias caseiras', () => {
    const stats = calculateCatalogItemStats({
      baseCategory: 'I',
      baseSpaces: 1,
      itemType: 'utensilio',
      skillBonus: 2,
      modifications: ['mod_acc_aprimorado', 'mod_acc_discreto'],
      customModifications: [
        { id: 'c1', name: 'Blindagem Leve', effect: '+RD', categoryIncrease: 1, spacesChange: 1 },
      ],
    });

    assert.strictEqual(stats.finalCategory, 'IV');
    assert.strictEqual(stats.finalSpaces, 1);
    assert.strictEqual(stats.effectiveSkillBonus, 5);

    const clampZero = calculateCatalogItemStats({
      baseCategory: '0',
      baseSpaces: 0.5,
      itemType: 'geral',
      modifications: ['mod_acc_discreto'],
    });
    assert.strictEqual(clampZero.finalCategory, 'I');
    assert.strictEqual(clampZero.finalSpaces, 0);
  });

  it('calculateInventoryMechanicsSummary deve somar carga fracionada x quantidade, bônus de mochila e RD de bloqueio apenas se equipado', () => {
    const curated = getCuratedCompendiumItems(seedEntities);
    const mochila = buildInventoryItemFromCuratedItem(
      curated.find((i) => i.name.toLowerCase().includes('mochila militar'))!
    );
    const bandagem = buildInventoryItemFromCuratedItem(
      curated.find((i) => i.name.toLowerCase().includes('bandagem'))!,
      3
    );
    const bracadeira = buildInventoryItemFromCuratedItem(
      curated.find((i) => i.name.toLowerCase().includes('braçadeira reforçada'))!
    );
    const depletedPotion: CharacterInventoryItem = {
      id: 'inv_depleted',
      name: 'Cicatrizante Vazio',
      category: 'I',
      spaces: 1,
      equipped: true,
      quantity: 0,
      consumable: true,
    };

    const summary = calculateInventoryMechanicsSummary([mochila, bandagem, bracadeira, depletedPotion]);
    assert.strictEqual(summary.totalSpacesUsed, 2.5); // Mochila 0 + Bandagem (0.5 * 3 = 1.5) + Braçadeira 1 + Vazio 0
    assert.strictEqual(summary.totalLoadBonusFromItems, 2);
    assert.strictEqual(summary.totalBlockRdBonus, 2);
    assert.strictEqual(summary.categoryCounts['I'], 5); // Mochila (1) + 3x Bandagem (3) + Braçadeira (1), item com qtd 0 não conta
    assert.strictEqual(summary.categoryCounts['0'], 0); // nenhum item Cat 0 com qtd > 0

    // Se desequipar a mochila e a braçadeira, os bônus passivos devem parar de contar
    mochila.equipped = false;
    bracadeira.equipped = false;
    const unequippedSummary = calculateInventoryMechanicsSummary([mochila, bandagem, bracadeira]);
    assert.strictEqual(unequippedSummary.totalLoadBonusFromItems, 0);
    assert.strictEqual(unequippedSummary.totalBlockRdBonus, 0);
  });

  it('calculateItemSaveDt deve calcular corretamente DT = 10 + PE por rodada + Atributo', () => {
    const agent = makeDummyAgent({ nex: 30, peRound: 6, attributes: { AGI: 4, FOR: 1, INT: 3, PRE: 2, VIG: 2 } });
    const dtAgi = calculateItemSaveDt(agent, 'AGI');
    assert.deepStrictEqual(dtAgi, { dt: 20, label: 'DT AGI 20' });

    const dtFixed = calculateItemSaveDt(agent, '15');
    assert.deepStrictEqual(dtFixed, { dt: 15, label: 'DT 15' });
  });

  it('syncCharacterWithCatalogItem deve propagar edições apenas para itens vinculados (shared) e preservar cópias (copied)', () => {
    const curated = getCuratedCompendiumItems(seedEntities);
    const cicatrizanteCurated = curated.find((i) => i.name.toLowerCase().includes('cicatrizante'))!;
    const catalog = {
      ...buildCatalogItemFromCuratedItem(cicatrizanteCurated),
      id: 'citem_shared_1',
    };
    const sharedInv = buildInventoryItemFromCatalogItem(catalog, { linkMode: 'shared', quantity: 2 });
    const copiedInv = buildInventoryItemFromCatalogItem(catalog, { linkMode: 'copied', quantity: 1 });

    const char = makeDummyAgent({ inventory: [sharedInv, copiedInv] });
    const editedCatalog = {
      ...catalog,
      name: 'Cicatrizante Modificado',
      finalCategory: 'II' as const,
      finalSpaces: 0.5,
    };

    const synced = syncCharacterWithCatalogItem(char, editedCatalog);
    assert.strictEqual(synced.changed, true);
    assert.strictEqual(synced.updated.inventory?.[0].name, 'Cicatrizante Modificado');
    assert.strictEqual(synced.updated.inventory?.[0].category, 'II');
    assert.strictEqual(synced.updated.inventory?.[0].quantity, 2); // preserva quantidade local da ficha
    assert.strictEqual(synced.updated.inventory?.[1].name, catalog.name); // cópia independente intacta
  });

  it('calculateActiveItemSkillBonuses deve aplicar bônus de mecânicas skill_bonus fixas em itens gerais equipados', () => {
    const curated = getCuratedCompendiumItems(seedEntities);
    const peDeMorto = curated.find((i) => i.name.toLowerCase().includes('pé de morto'));
    if (peDeMorto) {
      const invPe = buildInventoryItemFromCuratedItem(peDeMorto);
      const res = calculateActiveItemSkillBonuses([invPe]);
      assert.strictEqual(res.effectiveBonuses['Furtividade']?.bonus, 5);
    }
  });

  it('getCuratedCompendiumItems deve incluir itens amaldiçoados do Livro Base e suplementos com mecânicas e metadados corretos', () => {
    const curated = getCuratedCompendiumItems(seedEntities);

    // Vislumbre do Fim (óculos de Morte do Livro Base) com mecânica interativa
    const vislumbre = curated.find((i) => i.name === 'Vislumbre do Fim');
    assert.ok(vislumbre, 'Deve incluir Vislumbre do Fim');
    assert.strictEqual(vislumbre?.category, 'II');
    assert.strictEqual(vislumbre?.element, 'Morte');
    assert.strictEqual(vislumbre?.subCategoryGroup, 'amaldicoado');
    assert.ok(vislumbre?.mechanics.some((m) => m.label.includes('Concentrar')));

    // Anel Invertido (item amaldiçoado de suplemento antes bloqueado) com 0,5 espaço e Cat II extraídos
    const anel = curated.find((i) => i.name === 'Anel Invertido');
    assert.ok(anel, 'Deve incluir Anel Invertido');
    assert.strictEqual(anel?.category, 'II');
    assert.strictEqual(anel?.spaces, 0.5);
    assert.ok(anel?.mechanics.some((m) => m.formula === '4d10'));

    // Joias da Mente não deve gerar auto-colisão de aviso em calculateActiveItemSkillBonuses
    const joias = curated.find((i) => i.name === 'Joias da Mente');
    assert.ok(joias, 'Deve incluir Joias da Mente');
    const joiasInv = buildInventoryItemFromCatalogItem(
      {
        ...buildCatalogItemFromCuratedItem(joias!),
        id: 'citem_joias',
      },
      { linkMode: 'shared' }
    );
    const bonusRes = calculateActiveItemSkillBonuses([joiasInv]);
    assert.strictEqual(bonusRes.effectiveBonuses['Diplomacia']?.bonus, 2);
    assert.strictEqual(bonusRes.warnings.length, 0);

    // Maldições puras de armas/proteções continuam filtradas do catálogo de itens
    assert.ok(!curated.some((i) => i.name === 'Antielemento'));
    assert.ok(!curated.some((i) => i.name === 'Lancinante'));
  });
});
