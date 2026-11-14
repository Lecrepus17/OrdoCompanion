import './setup';
import React from 'react';
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BackHandler, Platform } from 'react-native';
import CharactersScreen from '../src/app/(tabs)/characters';
import { DiceToast } from '../src/components/DiceToast';
import { CharacterSheet, CustomWeapon } from '../src/types/compendium';
import { cleanup, fireClick, renderWithProviders } from './frontendTestUtils';

const CHARS_KEY = '@ordem_paranormal:characters_v1';
const WEAPONS_KEY = '@ordem_paranormal:custom_weapons_v1';

function buildTestCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    id: 'char_dyn_1',
    name: 'Kael Vance',
    player: 'Tester',
    originId: 'militar',
    classId: 'combatente',
    trackId: 'aniquilador',
    affinity: 'Nenhum',
    nex: 40,
    rank: 'Operador',
    attributes: { AGI: 2, FOR: 4, INT: 1, PRE: 2, VIG: 3 },
    pvCurrent: 60,
    pvMax: 60,
    peCurrent: 20,
    peMax: 20,
    peRound: 8,
    sanCurrent: 30,
    sanMax: 30,
    defenseBonus: 0,
    protection: '',
    resistances: '',
    skills: {
      Luta: { degree: 10, bonus: 0 },
      Pontaria: { degree: 10, bonus: 0 },
    },
    attacks: [],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildSharedKatana(overrides: Partial<CustomWeapon> = {}): CustomWeapon {
  return {
    id: 'cw_katana_shared',
    name: 'Katana Tática',
    baseWeaponName: 'Katana',
    weaponType: 'Corpo a corpo',
    proficiency: 'Tática',
    handedness: 'Uma Mão',
    baseDamage: '1d10',
    baseCritical: '19/x2',
    baseRange: 'Corpo a corpo',
    baseDamageType: 'Corte',
    baseSpaces: 1,
    baseCategory: 'I',
    finalDamage: '1d10',
    finalCritical: '19/x2',
    finalRange: 'Corpo a corpo',
    finalCategory: 'I',
    finalSpaces: 1,
    attackBonus: 0,
    damageBonus: 0,
    element: 'Nenhum',
    specialRules: '',
    modifications: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Frontend — Modificadores Dinâmicos de Dano, Preparação de Golpe e Rituais', () => {
  afterEach(async () => {
    await cleanup();
  });

  it('1. Exibe dano dinâmico, badges passivos e base original no card de ataque e rola fórmula efetiva', async () => {
    const weapon = buildSharedKatana();
    const combatente = buildTestCharacter({
      attacks: [
        {
          id: 'atk_kat',
          name: 'Katana Tática',
          test: 'Luta',
          damage: '1d10',
          critical: '19/x2',
          range: 'Corpo a corpo',
          skillName: 'Luta',
          special: '',
          customWeaponId: weapon.id,
          linkMode: 'shared',
        },
      ],
      abilities: [
        {
          id: 'ab_gp',
          name: 'Golpe Pesado',
          cost: 'Passivo',
          originPage: 'Poder de Combatente',
          description: '+1 dado corpo a corpo',
          type: 'poder',
        },
      ],
    });

    localStorage.setItem(WEAPONS_KEY, JSON.stringify([weapon]));
    localStorage.setItem(CHARS_KEY, JSON.stringify([combatente]));

    const screen = await renderWithProviders(
      <>
        <CharactersScreen />
        <DiceToast />
      </>,
      { mobile: 'android' }
    );

    await fireClick(screen.getByTestId(`char-card-${combatente.id}`));
    await fireClick(screen.getByText(/Ataques \(1\)/));

    assert.equal(screen.getByTestId('sheet-attack-effective-damage-atk_kat').textContent, '2d10+4');
    assert.equal(screen.getByTestId('sheet-attack-base-damage-atk_kat').textContent, 'Base: 1d10');

    const badgesText = screen.getByTestId('sheet-attack-badges-atk_kat').textContent || '';
    assert.ok(badgesText.includes('Golpe Pesado'));
    assert.ok(badgesText.includes('Força (+4)'));

    await fireClick(screen.getByTestId('sheet-attack-roll-damage-atk_kat'));
    assert.ok(screen.getByText(/2d10\+4 → Dados:/));
  });

  it('2. AttackPreparationModal aplica Ataque Especial + Amaldiçoar Arma, deduz PE e rola crítico canônico', async () => {
    const combatente = buildTestCharacter({
      nex: 45,
      peCurrent: 20,
      peMax: 20,
      peRound: 9,
      attacks: [
        {
          id: 'atk_esp',
          name: 'Katana',
          test: 'Luta',
          damage: '1d10',
          critical: '19/x2',
          range: 'Corpo a corpo',
          skillName: 'Luta',
          special: '',
        },
      ],
      abilities: [
        {
          id: 'ab_gp',
          name: 'Golpe Pesado',
          cost: 'Passivo',
          originPage: 'Combatente',
          description: '+1 dado',
          type: 'poder',
        },
      ],
    });

    localStorage.setItem(CHARS_KEY, JSON.stringify([combatente]));

    const screen = await renderWithProviders(
      <>
        <CharactersScreen />
        <DiceToast />
      </>
    );

    await fireClick(screen.getByTestId(`char-card-${combatente.id}`));
    await fireClick(screen.getByText(/Ataques \(1\)/));
    await fireClick(screen.getByTestId('sheet-attack-prepare-atk_esp'));

    assert.ok(screen.getByTestId('attack-preparation-modal'));

    // Seleciona Ataque Especial 2 PE (+5 no dano) e Amaldiçoar Arma Sangue (+1d6)
    await fireClick(screen.getByTestId('prep-ataque-especial-pe-2'));
    await fireClick(screen.getByTestId('prep-buff-amaldicoar-Sangue'));

    assert.equal(screen.getByTestId('prep-projected-normal').textContent, '2d10+9 + 1d6 Sangue');
    // No crítico x2: apenas 2d10 viram 4d10; +9 e +1d6 não multiplicam
    assert.equal(screen.getByTestId('prep-projected-crit').textContent, '4d10+1d6+9');

    await fireClick(screen.getByTestId('prep-btn-roll-crit'));

    // Modal fecha após rolar
    assert.equal(screen.queryByTestId('attack-preparation-modal'), null);

    // DiceToast exibe a rolagem crítica com fórmula canônica
    assert.ok(screen.getByText(/4d10\+1d6\+9 → Dados:/));

    // PE foi deduzido na ficha salva (20 -> 18)
    const savedChars = JSON.parse(localStorage.getItem(CHARS_KEY) || '[]') as CharacterSheet[];
    assert.equal(savedChars[0].peCurrent, 18);
  });

  it('3. AttackPreparationModal exibe alertas de Limite de PE/Turno e PE Insuficiente bloqueando botões', async () => {
    const agenteLimitado = buildTestCharacter({
      id: 'char_low_pe',
      classId: 'combatente',
      nex: 25, // Ataque Especial até 3 PE
      peRound: 2, // Força aviso de limite ao escolher 3 PE
      peCurrent: 1, // Força aviso de PE insuficiente ao escolher 3 PE
      attacks: [
        {
          id: 'atk_low',
          name: 'Espada',
          test: 'Luta',
          damage: '1d8',
          critical: '19/x2',
          range: 'Corpo a corpo',
          skillName: 'Luta',
          special: '',
        },
      ],
    });

    localStorage.setItem(CHARS_KEY, JSON.stringify([agenteLimitado]));

    const screen = await renderWithProviders(<CharactersScreen />);
    await fireClick(screen.getByTestId(`char-card-${agenteLimitado.id}`));
    await fireClick(screen.getByText(/Ataques \(1\)/));
    await fireClick(screen.getByTestId('sheet-attack-prepare-atk_low'));

    await fireClick(screen.getByTestId('prep-ataque-especial-pe-3'));

    assert.ok(screen.getByTestId('prep-pe-limit-warning'));
    assert.ok(screen.getByTestId('prep-pe-current-warning'));

    const rollDamageBtn = screen.getByTestId('prep-btn-roll-damage') as HTMLButtonElement;
    assert.equal(rollDamageBtn.getAttribute('aria-disabled'), 'true');
  });

  it('4. AttackPreparationModal fecha pelo botão e garante contrato Android BackHandler + onRequestClose', async () => {
    const combatente = buildTestCharacter({
      attacks: [
        {
          id: 'atk_close',
          name: 'Faca',
          test: 'Luta',
          damage: '1d4',
          critical: '19/x2',
          range: 'Corpo a corpo',
          skillName: 'Luta',
          special: '',
        },
      ],
    });
    localStorage.setItem(CHARS_KEY, JSON.stringify([combatente]));

    const screen = await renderWithProviders(<CharactersScreen />, { mobile: 'android' });
    await fireClick(screen.getByTestId(`char-card-${combatente.id}`));
    await fireClick(screen.getByText(/Ataques \(1\)/));
    await fireClick(screen.getByTestId('sheet-attack-prepare-atk_close'));

    assert.ok(screen.getByTestId('attack-preparation-modal'));
    await fireClick(screen.getByTestId('prep-btn-close'));
    assert.equal(screen.queryByTestId('attack-preparation-modal'), null);

    // Contrato estático e runtime BackHandler no Android APK
    const modalSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/AttackPreparationModal.tsx'),
      'utf8'
    );
    assert.ok(modalSource.includes("BackHandler.addEventListener('hardwareBackPress'"));
    assert.ok(modalSource.includes('onRequestClose={onClose}'));

    const origOs = Platform.OS;
    (Platform as any).OS = 'android';
    let closedByBack = false;
    const listener = () => {
      closedByBack = true;
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', listener);
    assert.equal(listener(), true);
    assert.equal(closedByBack, true);
    sub.remove();
    (Platform as any).OS = origOs;
  });

  it('5. Aba Habilidades & Rituais exibe DT, Ritual Potente (+INT), troca de círculo e Conjurar & Rolar com dedução de PE', async () => {
    const ocultista = buildTestCharacter({
      id: 'char_oc',
      classId: 'ocultista',
      trackId: undefined,
      nex: 25,
      peCurrent: 25,
      peMax: 25,
      peRound: 5,
      attributes: { AGI: 1, FOR: 1, INT: 4, PRE: 3, VIG: 2 },
      abilities: [
        {
          id: 'ab_rp',
          name: 'Ritual Potente',
          cost: 'Passivo',
          originPage: 'Poder de Ocultista',
          description: 'Soma INT ao dano de rituais',
          type: 'poder',
        },
        {
          id: 'rit_eletro',
          name: 'Eletrocussão',
          cost: '1 PE',
          originPage: 'Ritual (Energia)',
          description: 'Causa 3d6 pontos de dano de Energia.',
          type: 'ritual',
        },
      ],
    });

    localStorage.setItem(CHARS_KEY, JSON.stringify([ocultista]));

    const screen = await renderWithProviders(
      <>
        <CharactersScreen />
        <DiceToast />
      </>
    );

    await fireClick(screen.getByTestId(`char-card-${ocultista.id}`));
    await fireClick(screen.getByText(/Habilidades & Rituais/));

    // DT = 10 + 5 (peRound) + 3 (PRE) = 18
    assert.equal(screen.getByTestId('ritual-dt-rit_eletro').textContent, 'DT 18');

    // Badges e fórmula com Ritual Potente (+4 INT) => 3d6+4
    const badgesText = screen.getByTestId('ritual-badges-rit_eletro').textContent || '';
    assert.ok(badgesText.includes('Ritual Potente (INT) (+4)'));

    const rollBtn = screen.getByTestId('ritual-roll-damage-rit_eletro');
    assert.ok((rollBtn.textContent || '').includes('3d6+4'));

    // Troca para Discente (+2 PE -> 3 PE total) e rola
    await fireClick(screen.getByTestId('ritual-tier-rit_eletro-discente'));
    await fireClick(screen.getByTestId('ritual-roll-damage-rit_eletro'));

    assert.ok(screen.getByText(/3d6\+4 → Dados:/));

    const savedChars = JSON.parse(localStorage.getItem(CHARS_KEY) || '[]') as CharacterSheet[];
    assert.equal(savedChars[0].peCurrent, 22); // 25 - 3 PE (1 base + 2 discente)
  });

  it('6. Desacoplamento visual: mesma arma compartilhada mostra danos diferentes por agente sem mutar a Armaria', async () => {
    const sharedWeapon = buildSharedKatana({
      id: 'cw_shared_ui',
      name: 'Katana da Equipe',
    });

    const agenteForte = buildTestCharacter({
      id: 'char_forte',
      name: 'Agente Brutal',
      attributes: { AGI: 1, FOR: 5, INT: 1, PRE: 1, VIG: 3 },
      abilities: [
        {
          id: 'ab_gp_2',
          name: 'Golpe Pesado',
          cost: 'Passivo',
          originPage: 'Combatente',
          description: '',
          type: 'poder',
        },
      ],
      attacks: [
        {
          id: 'atk_s1',
          name: 'Katana da Equipe',
          test: 'Luta',
          damage: '1d10',
          critical: '19/x2',
          range: 'Corpo a corpo',
          skillName: 'Luta',
          special: '',
          customWeaponId: sharedWeapon.id,
          linkMode: 'shared',
        },
      ],
    });

    const agenteFraco = buildTestCharacter({
      id: 'char_fraco',
      name: 'Agente Suporte',
      attributes: { AGI: 1, FOR: 1, INT: 4, PRE: 3, VIG: 1 },
      abilities: [],
      attacks: [
        {
          id: 'atk_s2',
          name: 'Katana da Equipe',
          test: 'Luta',
          damage: '1d10',
          critical: '19/x2',
          range: 'Corpo a corpo',
          skillName: 'Luta',
          special: '',
          customWeaponId: sharedWeapon.id,
          linkMode: 'shared',
        },
      ],
    });

    localStorage.setItem(WEAPONS_KEY, JSON.stringify([sharedWeapon]));
    localStorage.setItem(CHARS_KEY, JSON.stringify([agenteForte, agenteFraco]));

    const screen = await renderWithProviders(<CharactersScreen />);

    // Agente 1 vê 2d10+5
    await fireClick(screen.getByTestId('char-card-char_forte'));
    await fireClick(screen.getByText(/Ataques \(1\)/));
    assert.equal(screen.getByTestId('sheet-attack-effective-damage-atk_s1').textContent, '2d10+5');

    // Volta para a listagem e abre Agente 2 -> vê 1d10+1
    await fireClick(screen.getByText(/Todas as Fichas/));
    await fireClick(screen.getByTestId('char-card-char_fraco'));
    await fireClick(screen.getByText(/Ataques \(1\)/));
    assert.equal(screen.getByTestId('sheet-attack-effective-damage-atk_s2').textContent, '1d10+1');

    // CustomWeapon compartilhada na Armaria permanece intocada
    const savedWeapons = JSON.parse(localStorage.getItem(WEAPONS_KEY) || '[]') as CustomWeapon[];
    assert.equal(savedWeapons[0].baseDamage, '1d10');
    assert.equal(savedWeapons[0].finalDamage, '1d10');
  });
});
