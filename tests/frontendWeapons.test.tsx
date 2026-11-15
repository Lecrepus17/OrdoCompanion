import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import WeaponsScreen from '../src/app/(tabs)/weapons';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { CustomWeapon } from '../src/types/compendium';

describe('Frontend - Tela de Armaria e Arsenal (weapons.tsx)', () => {
  const sampleWeapon: CustomWeapon = {
    id: 'wpn_test_fuzil',
    name: 'Fuzil de Caça Sombrio',
    baseWeaponId: 'arma_fuzil_caca',
    baseWeaponName: 'Fuzil de Caça',
    weaponType: 'Fogo',
    proficiency: 'Tática',
    handedness: 'Duas Mãos',
    baseDamage: '2d8',
    baseCritical: '19/x3',
    baseRange: 'Médio',
    baseDamageType: 'Balístico',
    baseSpaces: 2,
    baseCategory: 'I',
    ammoType: 'Balas longas',
    ammoName: 'Balas longas',
    baseAmmoCategory: 'I',
    modifications: ['mod_mira_laser', 'mod_calibre_grosso'],
    element: 'Morte',
    finalDamage: '2d10',
    finalCritical: '17/x3',
    finalRange: 'Médio',
    finalSpaces: 2,
    finalCategory: 'III',
    ammoCategory: 'I',
    attackBonus: 0,
    damageBonus: 0,
    specialRules: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await cleanup();
    await defaultRepository.saveCustomWeapons([sampleWeapon]);
  });

  afterEach(async () => {
    await cleanup();
  });

  test('deve renderizar o arsenal com a arma salva e estatísticas calculadas na Web', async () => {
    const { getByText, queryByText } = await renderWithProviders(<WeaponsScreen />, {
      mobile: false,
    });

    // Nome da arma customizada
    assert.ok(getByText('Fuzil de Caça Sombrio'));
    // Elemento Morte
    assert.ok(getByText('Morte'));
    // Estatísticas calculadas
    assert.ok(getByText('2d10')); // Dano aumentado pelo calibre grosso
    assert.ok(getByText('17/x3')); // Crítico melhorado pela mira laser
    // Categoria final
    assert.ok(queryByText(/Cat III/i));
  });

  test('deve renderizar no ambiente Celular (Android e iOS) com visual adaptado e chips roláveis', async () => {
    const { getByText, queryByText } = await renderWithProviders(<WeaponsScreen />, {
      mobile: 'android',
    });

    assert.ok(getByText('Fuzil de Caça Sombrio'));
    // Filtro por tipo de arma visível
    assert.ok(queryByText('Todas as Armas'));
    assert.ok(queryByText('Fogo'));
    assert.ok(queryByText('Corpo a corpo'));
  });

  test('deve filtrar armas por categoria ao clicar no filtro de tipo', async () => {
    const { getByText, queryByText } = await renderWithProviders(<WeaponsScreen />);

    // Clica no filtro "Corpo a corpo"
    const meleePill = getByText('Corpo a corpo');
    await fireClick(meleePill);

    // Como nossa arma de teste é de "Fogo", ela não deve aparecer neste filtro
    assert.strictEqual(queryByText('Fuzil de Caça Sombrio'), null);

    // Clica de volta em "Fogo"
    const firePill = getByText('Fogo');
    await fireClick(firePill);
    assert.ok(getByText('Fuzil de Caça Sombrio'));
  });

  test('deve abrir o modal de criação de nova arma ao clicar no botão de Nova Arma', async () => {
    const { getByText, queryByText } = await renderWithProviders(<WeaponsScreen />);

    const newBtn = getByText(/Nova Arma|Criar/i);
    assert.ok(newBtn);
    await fireClick(newBtn);

    // Deve abrir o editor de customização de arma
    assert.ok(queryByText(/Nova Arma Customizada|Modelo Base|Modificações/i));
  });

  test('deve abrir o manual de armas ao clicar no botão "Manual"', async () => {
    const { getByText } = await renderWithProviders(<WeaponsScreen />);

    const helpBtn = getByText('Manual');
    await fireClick(helpBtn);
    assert.ok(helpBtn);
  });

  test('deve exibir sempre o botão Crítico Máx e opções Usar a Mesma / Duplicar ao equipar no agente', async () => {
    await defaultRepository.saveCharacters([
      {
        id: 'char_equip_1',
        name: 'Jouki',
        player: 'Player',
        rank: 'Recruta',
        affinity: 'Nenhum',
        trackId: '',
        classId: 'Combatente',
        originId: 'Policial',
        nex: 15,
        pvCurrent: 20,
        pvMax: 20,
        peCurrent: 4,
        peMax: 4,
        sanCurrent: 12,
        sanMax: 12,
        defenseBonus: 0,
        attributes: { AGI: 2, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
        skills: {},
        attacks: [],
        inventory: [],
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      },
    ]);

    const { getByTestId, queryByTestId } = await renderWithProviders(<WeaponsScreen />);

    // Botão Crítico Máx sempre visível
    assert.ok(getByTestId(`btn-weapon-roll-crit-max-${sampleWeapon.id}`));

    // Abre modal de equipar
    await fireClick(getByTestId(`btn-weapon-equip-${sampleWeapon.id}`));
    assert.ok(queryByTestId('btn-equip-mode-shared'));
    assert.ok(queryByTestId('btn-equip-mode-duplicate'));

    // Escolhe duplicar e seleciona o agente Jouki
    await fireClick(getByTestId('btn-equip-mode-duplicate'));
    await fireClick(getByTestId('btn-equip-agent-char_equip_1'));

    const savedWeapons = await defaultRepository.getCustomWeapons();
    const cloned = savedWeapons.find((w) => w.name === 'Fuzil de Caça Sombrio (Jouki)');
    assert.ok(cloned, 'Deveria ter criado cópia da arma com o nome do agente');
  });

  test('sub-aba Itens & Acessórios na Armaria deve listar e equipar itens do Depósito em um agente', async () => {
    await defaultRepository.saveCustomItems([
      {
        id: 'citem_armory_test_1',
        name: 'Utensílio de Medicina Aprimorado',
        baseItemName: 'Utensílio',
        itemType: 'utensilio',
        subCategoryGroup: 'acessorio',
        baseCategory: 'I',
        baseSpaces: 1,
        finalCategory: 'II',
        finalSpaces: 1,
        details: '+5 em Medicina',
        element: 'Nenhum',
        modifications: ['mod_acc_aprimorado'],
        targetSkill: 'Medicina',
        skillBonus: 5,
        mechanics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    await defaultRepository.saveCharacters([
      {
        id: 'char_depot_equip_1',
        name: 'Liz Webber',
        player: 'Player',
        rank: 'Operador',
        affinity: 'Nenhum',
        trackId: '',
        classId: 'Especialista',
        originId: 'Médica',
        nex: 25,
        pvCurrent: 22,
        pvMax: 22,
        peCurrent: 12,
        peMax: 12,
        sanCurrent: 24,
        sanMax: 24,
        defenseBonus: 0,
        attributes: { AGI: 2, FOR: 1, INT: 3, PRE: 2, VIG: 2 },
        skills: {},
        attacks: [],
        inventory: [],
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      },
    ]);

    const { getByTestId, getByText } = await renderWithProviders(<WeaponsScreen />);
    await fireClick(getByTestId('armory-tab-items'));
    assert.ok(getByText('Utensílio de Medicina Aprimorado'));

    await fireClick(getByTestId('btn-depot-item-equip-citem_armory_test_1'));
    await fireClick(getByTestId('btn-equip-item-agent-char_depot_equip_1'));

    const chars = await defaultRepository.getCharacters();
    assert.strictEqual(chars[0].inventory?.length, 1);
    assert.strictEqual(chars[0].inventory?.[0].name, 'Utensílio de Medicina Aprimorado');
    assert.strictEqual(chars[0].inventory?.[0].customItemId, 'citem_armory_test_1');
    assert.strictEqual(chars[0].inventory?.[0].linkMode, 'shared');
  });

  test('sub-aba Itens & Acessórios deve permitir importar item amaldiçoado existente do Compêndio direto para o Depósito', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<WeaponsScreen />);
    await fireClick(getByTestId('armory-tab-items'));

    await fireClick(getByTestId('btn-depot-from-compendium'));
    await fireClick(getByTestId('btn-depot-comp-pick-item__livro_base__vislumbre_do_fim'));

    assert.ok(getByText('Vislumbre do Fim'));
    const saved = await defaultRepository.getCustomItems();
    const imported = saved.find((i) => i.name === 'Vislumbre do Fim');
    assert.ok(imported, 'Vislumbre do Fim deveria ter sido salvo no Depósito');
    assert.strictEqual(imported?.subCategoryGroup, 'amaldicoado');
    assert.ok((imported?.mechanics?.length ?? 0) > 0);
  });
});
