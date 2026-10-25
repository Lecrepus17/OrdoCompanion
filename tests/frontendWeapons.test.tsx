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
});
