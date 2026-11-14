import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CharacterAttack,
  CharacterSheet,
  CompendiumEntity,
  CustomWeapon,
} from '../src/types/compendium';
import {
  detectAgentDamageModifiers,
  formatDamageBreakdown,
  getAtaqueEspecialBonus,
  resolveAgentAttackDamage,
  resolveAgentRitualDamage,
} from '../src/utils/damageModifiers';
import { expandFormulaForCritical, rollWeaponDamage } from '../src/utils/dice';

function makeCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    id: 'char_test',
    name: 'Agente Teste',
    player: 'Jogador',
    originId: 'academico',
    classId: 'combatente',
    trackId: '',
    affinity: 'Nenhum',
    nex: 5,
    rank: 'Recruta',
    attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
    pvCurrent: 20,
    pvMax: 20,
    peCurrent: 20,
    peMax: 20,
    peRound: 1,
    sanCurrent: 12,
    sanMax: 12,
    defenseBonus: 0,
    protection: '',
    resistances: '',
    skills: {},
    attacks: [],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAttack(overrides: Partial<CharacterAttack> = {}): CharacterAttack {
  return {
    id: 'atk_1',
    name: 'Espada Longa',
    test: 'Luta',
    damage: '1d8',
    critical: '19/x2',
    range: 'Corpo a corpo',
    skillName: 'Luta',
    special: '',
    ...overrides,
  };
}

function makeCustomWeapon(overrides: Partial<CustomWeapon> = {}): CustomWeapon {
  return {
    id: 'cw_1',
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

describe('Motor de Modificadores Dinâmicos de Dano e Crítico (Regras Canônicas v1.1)', () => {
  it('1. Combatente FOR 4 com Katana e Golpe Pesado eleva base e não multiplica FOR no crítico', () => {
    const char = makeCharacter({
      attributes: { AGI: 2, FOR: 4, INT: 1, PRE: 1, VIG: 2 },
      abilities: [
        { id: 'ab_gp', name: 'Golpe Pesado', cost: 'Passivo', originPage: 'Poder de Combatente', description: '+1 dado em armas corpo a corpo', type: 'poder' },
      ],
    });
    const atk = makeAttack({ name: 'Katana', damage: '1d10', critical: '19/x2' });

    const res = resolveAgentAttackDamage({ attack: atk, character: char });
    assert.equal(res.normalFormula, '2d10+4');
    assert.equal(res.criticalFormula, '4d10+4');
    assert.equal(res.displayDamage, '2d10+4');
    assert.equal(res.attributeApplied, 'FOR');
    assert.ok(res.breakdown.some((b) => b.source === 'Golpe Pesado' && b.multipliesOnCrit === true));
    assert.ok(res.breakdown.some((b) => b.source === 'Força' && b.multipliesOnCrit === false));
  });

  it('2. Arma ágil e leve (Faca) com AGI > FOR e Ninja Urbano soma AGI (+4) e Ninja Urbano (+2)', () => {
    const char = makeCharacter({
      classId: 'especialista',
      attributes: { AGI: 4, FOR: 1, INT: 2, PRE: 2, VIG: 1 },
      abilities: [
        { id: 'ab_nu', name: 'Ninja Urbano', cost: 'Passivo', originPage: 'Poder de Especialista', description: '+2 em dano com armas táticas/leves/disparo', type: 'poder' },
      ],
    });
    const atk = makeAttack({ name: 'Faca', damage: '1d4', critical: '19/x2', special: 'Ágil, Leve' });

    const res = resolveAgentAttackDamage({ attack: atk, character: char });
    assert.equal(res.attributeApplied, 'AGI');
    assert.equal(res.normalFormula, '1d4+6');
    assert.equal(res.criticalFormula, '2d4+6');
  });

  it('3. Arma corpo a corpo pesada não-ágil (Espada Longa) ignora AGI alta e Ninja Urbano', () => {
    const char = makeCharacter({
      attributes: { AGI: 5, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
      abilities: [
        { id: 'ab_nu', name: 'Ninja Urbano', cost: 'Passivo', originPage: 'Poder', description: '+2', type: 'poder' },
      ],
    });
    const atk = makeAttack({ name: 'Espada Longa', damage: '1d8', critical: '19/x2' });

    const res = resolveAgentAttackDamage({ attack: atk, character: char });
    assert.equal(res.attributeApplied, 'FOR');
    assert.equal(res.normalFormula, '1d8+2');
    assert.equal(res.criticalFormula, '2d8+2');
  });

  it('4. Arco Composto (Disparo) com Tiro Certeiro soma FOR e AGI simultaneamente e multiplica apenas dados no x3', () => {
    const char = makeCharacter({
      attributes: { AGI: 4, FOR: 3, INT: 1, PRE: 1, VIG: 1 },
      abilities: [
        { id: 'ab_tc', name: 'Tiro Certeiro', cost: 'Passivo', originPage: 'Combatente', description: 'Soma AGI no dano de disparo', type: 'poder' },
      ],
    });
    const atk = makeAttack({
      name: 'Arco Composto',
      damage: '1d6',
      critical: '20/x3',
      range: 'Médio',
      skillName: 'Pontaria',
      special: 'Disparo',
    });

    const res = resolveAgentAttackDamage({ attack: atk, character: char });
    assert.equal(res.normalFormula, '1d6+7');
    assert.equal(res.criticalFormula, '3d6+7');
  });

  it('5. Mira de Elite (Atirador de Elite 10%) aplica +INT em Balas Longas e ignora Pistola', () => {
    const char = makeCharacter({
      classId: 'especialista',
      trackId: 'atirador_de_elite',
      nex: 15,
      attributes: { AGI: 3, FOR: 1, INT: 4, PRE: 2, VIG: 1 },
    });

    const fuzil = makeAttack({
      id: 'atk_fuzil',
      name: 'Fuzil de Assalto',
      damage: '2d10',
      critical: '19/x3',
      range: 'Médio',
      skillName: 'Pontaria',
      special: 'Balas longas',
    });
    const pistola = makeAttack({
      id: 'atk_pistola',
      name: 'Pistola',
      damage: '1d12',
      critical: '18/x2',
      range: 'Curto',
      skillName: 'Pontaria',
      special: 'Balas curtas',
    });

    const resFuzil = resolveAgentAttackDamage({ attack: fuzil, character: char });
    const resPistola = resolveAgentAttackDamage({ attack: pistola, character: char });

    assert.equal(resFuzil.attributeApplied, 'INT');
    assert.equal(resFuzil.normalFormula, '2d10+4');
    assert.equal(resFuzil.criticalFormula, '6d10+4');

    assert.equal(resPistola.attributeApplied, undefined);
    assert.equal(resPistola.normalFormula, '1d12');
    assert.equal(resPistola.criticalFormula, '2d12');
  });

  it('6. Origens Militar (Para Bellum), Lutador (Mão Pesada) e Operário (Ferramenta de Trabalho)', () => {
    const militar = makeCharacter({ originId: 'militar', attributes: { AGI: 3, FOR: 1, INT: 1, PRE: 1, VIG: 1 } });
    const resMil = resolveAgentAttackDamage({
      attack: makeAttack({ name: 'Revólver', damage: '2d6', critical: '19/x3', range: 'Curto', skillName: 'Pontaria' }),
      character: militar,
    });
    assert.equal(resMil.normalFormula, '2d6+2');

    const lutador = makeCharacter({ originId: 'lutador', attributes: { AGI: 1, FOR: 3, INT: 1, PRE: 1, VIG: 2 } });
    const resLut = resolveAgentAttackDamage({
      attack: makeAttack({ name: 'Bastão', damage: '1d6', critical: '20/x2' }),
      character: lutador,
    });
    assert.equal(resLut.normalFormula, '1d6+5'); // FOR +3 + Mão Pesada +2

    const operario = makeCharacter({
      originId: 'operario',
      attributes: { AGI: 1, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
      abilities: [
        {
          id: 'ab_op',
          name: 'Ferramenta de Trabalho',
          cost: 'Passivo',
          originPage: 'Operário',
          description: 'Arma escolhida: Marreta',
          type: 'habilidade',
        },
      ],
    });
    const resMarreta = resolveAgentAttackDamage({
      attack: makeAttack({ name: 'Marreta Pesada', damage: '1d10', critical: '20/x2' }),
      character: operario,
    });
    const resEspada = resolveAgentAttackDamage({
      attack: makeAttack({ name: 'Espada', damage: '1d8', critical: '19/x2' }),
      character: operario,
    });
    assert.equal(resMarreta.normalFormula, '1d10+4'); // FOR +3 + Operario +1
    assert.equal(resEspada.normalFormula, '1d8+3');
  });

  it('7. Calibre Grosso + Balística Avançada + Cruel somam dados multiplicáveis (2d6 -> 3d6) e flat não-multiplicável', () => {
    const char = makeCharacter({
      abilities: [
        { id: 'ab_ba', name: 'Balística Avançada', cost: 'Passivo', originPage: 'Especialista', description: '+2 dano em armas de fogo', type: 'poder' },
      ],
    });
    const weapon = makeCustomWeapon({
      id: 'cw_espingarda',
      name: 'Escopeta Tática',
      baseWeaponName: 'Espingarda',
      weaponType: 'Fogo',
      baseDamage: '2d6',
      finalDamage: '2d8+2', // Mesmo se finalDamage vier da Armaria legado, Calibre Grosso usa baseDamage + 1 dado
      finalCritical: '20/x3',
      finalRange: 'Curto',
      modifications: ['Calibre Grosso', 'Cruel'],
    });
    const atk = makeAttack({
      name: 'Escopeta Tática',
      damage: '2d8+2',
      critical: '20/x3',
      range: 'Curto',
      skillName: 'Pontaria',
      customWeaponId: 'cw_espingarda',
    });

    const res = resolveAgentAttackDamage({ attack: atk, character: char, customWeapon: weapon });
    assert.equal(res.normalFormula, '3d6+4'); // 2d6 -> 3d6 (Calibre Grosso), Cruel (+2) + Balística (+2) = +4
    assert.equal(res.criticalFormula, '9d6+4');
  });

  it('8. Lancinante (+1d8 Sangue) multiplica no crítico, enquanto Hemofágica/Consumidora/Erosiva/Faísca/Explosiva NÃO multiplicam', () => {
    const char = makeCharacter({
      attributes: { AGI: 1, FOR: 3, INT: 1, PRE: 1, VIG: 1 },
    });
    const weapon = makeCustomWeapon({
      id: 'cw_acha',
      name: 'Acha Amaldiçoada',
      baseWeaponName: 'Acha',
      weaponType: 'Corpo a corpo',
      baseDamage: '1d12',
      finalDamage: '1d12',
      finalCritical: '20/x3',
      modifications: ['Lancinante', 'Consumidora'],
    });
    const atk = makeAttack({
      name: 'Acha Amaldiçoada',
      damage: '1d12',
      critical: '20/x3',
      customWeaponId: 'cw_acha',
    });

    const res = resolveAgentAttackDamage({ attack: atk, character: char, customWeapon: weapon });
    assert.equal(res.normalFormula, '1d12+1d8+1d6+3');
    assert.equal(res.criticalFormula, '3d12+3d8+1d6+3');
    assert.equal(res.displayDamage, '1d12+3 + 1d8 Sangue + 1d6 Morte');

    // Testa arma de fogo com Erosiva + Faísca + Munição Explosiva
    const gun = makeCustomWeapon({
      id: 'cw_gun',
      name: 'Pistola Caótica',
      baseWeaponName: 'Pistola',
      weaponType: 'Fogo',
      baseDamage: '1d12',
      finalDamage: '1d12',
      finalCritical: '18/x2',
      finalRange: 'Curto',
      modifications: ['Hemofágica', 'Erosiva', 'Faísca', 'Munição Explosiva'],
    });
    const gunRes = resolveAgentAttackDamage({
      attack: makeAttack({ name: 'Pistola Caótica', damage: '1d12', critical: '18/x2', range: 'Curto', skillName: 'Pontaria' }),
      character: char,
      customWeapon: gun,
    });
    assert.equal(gunRes.normalFormula, '1d12+1d6+1d8+1d6+2d6');
    assert.equal(gunRes.criticalFormula, '2d12+1d6+1d8+1d6+2d6');
  });

  it('9. Artista Marcial escala desarmado por NEX (1d6 -> 1d8 -> 1d10), usa max(FOR,AGI) e Punhos Enraivecidos não multiplica', () => {
    const baseAbilities = [
      { id: 'ab_am', name: 'Artista Marcial', cost: 'Passivo', originPage: 'Combatente', description: 'Escala soco', type: 'poder' as const },
    ];
    const desarmado = makeAttack({ name: 'Ataque Desarmado', damage: '1d3', critical: '20/x2' });

    const char15 = makeCharacter({ nex: 15, attributes: { AGI: 3, FOR: 2, INT: 1, PRE: 1, VIG: 1 }, abilities: baseAbilities });
    assert.equal(resolveAgentAttackDamage({ attack: desarmado, character: char15 }).normalFormula, '1d6+3');

    const char40 = makeCharacter({
      nex: 40,
      attributes: { AGI: 4, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
      abilities: baseAbilities,
      inventory: [{ id: 'inv_pe', name: 'Punhos Enraivecidos', category: 'II', spaces: 1, details: '+1d8 Sangue desarmado', equipped: true }],
    });
    const res40 = resolveAgentAttackDamage({ attack: desarmado, character: char40 });
    assert.equal(res40.normalFormula, '1d8+1d8+4');
    assert.equal(res40.criticalFormula, '2d8+1d8+4');

    const char75 = makeCharacter({ nex: 75, attributes: { AGI: 2, FOR: 5, INT: 1, PRE: 1, VIG: 2 }, abilities: baseAbilities });
    assert.equal(resolveAgentAttackDamage({ attack: desarmado, character: char75 }).normalFormula, '1d10+5');
  });

  it('10. Ataque Especial e Potência Máxima (Guerreiro 99%) + detecção de limite de PE/rodada', () => {
    assert.equal(getAtaqueEspecialBonus(0), 0);
    assert.equal(getAtaqueEspecialBonus(2), 5);
    assert.equal(getAtaqueEspecialBonus(3), 10);
    assert.equal(getAtaqueEspecialBonus(4), 15);
    assert.equal(getAtaqueEspecialBonus(5), 20);

    const guerreiro99 = makeCharacter({
      classId: 'combatente',
      trackId: 'guerreiro',
      nex: 99,
      peRound: 20,
      peCurrent: 4, // menor que 5 para testar peCostExceedsCurrent
      attributes: { AGI: 2, FOR: 4, INT: 1, PRE: 1, VIG: 3 },
    });
    const atk = makeAttack({ name: 'Montante', damage: '2d6', critical: '19/x2' });

    // Potência Máxima dobra Ataque Especial de 5 PE (+20 -> +40) no corpo a corpo
    const resDmg = resolveAgentAttackDamage({
      attack: atk,
      character: guerreiro99,
      toggles: { ataqueEspecialPeSpent: 5, ataqueEspecialAllocation: 'damage' },
    });
    assert.equal(resDmg.normalFormula, '2d6+44'); // 4 (FOR) + 40
    assert.equal(resDmg.criticalFormula, '4d6+44');
    assert.equal(resDmg.totalPeCost, 5);
    assert.equal(resDmg.peCostExceedsLimit, false);
    assert.equal(resDmg.peCostExceedsCurrent, true);

    const resSplit = resolveAgentAttackDamage({
      attack: atk,
      character: guerreiro99,
      toggles: { ataqueEspecialPeSpent: 3, ataqueEspecialAllocation: 'split' }, // +20 -> +10 ataque, +10 dano
    });
    assert.equal(resSplit.normalFormula, '2d6+14');
    assert.equal(resSplit.attackBonusFromToggles, 10);
  });

  it('11. Infiltrador: Ataque Furtivo escala por NEX e Assassinar (65%) dobra dados sem multiplicar no crítico', () => {
    const infiltrador65 = makeCharacter({
      classId: 'especialista',
      trackId: 'infiltrador',
      nex: 65,
      peRound: 13,
      peCurrent: 30,
      attributes: { AGI: 4, FOR: 1, INT: 3, PRE: 2, VIG: 1 },
    });
    const adaga = makeAttack({ name: 'Punhal', damage: '1d4', critical: '19/x3', special: 'Ágil' });

    const resFurtivo = resolveAgentAttackDamage({
      attack: adaga,
      character: infiltrador65,
      toggles: { ataqueFurtivoActive: true },
    });
    assert.equal(resFurtivo.totalPeCost, 1);
    assert.equal(resFurtivo.normalFormula, '1d4+3d6+4');
    assert.equal(resFurtivo.criticalFormula, '3d4+3d6+4');

    const resAssassinar = resolveAgentAttackDamage({
      attack: adaga,
      character: infiltrador65,
      toggles: { ataqueFurtivoActive: true, assassinarActive: true },
    });
    assert.equal(resAssassinar.totalPeCost, 4); // 1 PE Furtivo + 3 PE Assassinar
    assert.equal(resAssassinar.normalFormula, '1d4+6d6+4');
    assert.equal(resAssassinar.criticalFormula, '3d4+6d6+4');
  });

  it('12. Aniquilador: Máquina de Matar (99%) adiciona dado multiplicável e Destruidor (+2 PE) aumenta multiplicador crítico', () => {
    const aniquilador99 = makeCharacter({
      classId: 'combatente',
      trackId: 'aniquilador',
      nex: 99,
      peRound: 20,
      peCurrent: 40,
      attributes: { AGI: 5, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
    });
    const fuzil = makeAttack({
      name: 'Fuzil de Precisão',
      damage: '2d10',
      critical: '19/x3',
      range: 'Longo',
      skillName: 'Pontaria',
      special: 'Balas longas',
    });

    const res = resolveAgentAttackDamage({
      attack: fuzil,
      character: aniquilador99,
      toggles: { destruidorActive: true },
    });
    assert.equal(res.totalPeCost, 2);
    assert.equal(res.criticalMultiplier, 4);
    assert.equal(res.formattedCritical, '19/x4');
    assert.equal(res.normalFormula, '3d10'); // 2d10 + 1d10 Máquina de Matar
    assert.equal(res.criticalFormula, '12d10'); // 3d10 * 4
  });

  it('13. Buffs externos em combate: Ódio Incontrolável, Chamas do Caos, Amaldiçoar Arma e Rajada', () => {
    const char = makeCharacter({
      attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 2 },
    });
    const atk = makeAttack({
      name: 'Submetralhadora',
      damage: '2d6',
      critical: '19/x3',
      range: 'Curto',
      skillName: 'Pontaria',
      special: 'Balas curtas, Automática',
    });

    const res = resolveAgentAttackDamage({
      attack: atk,
      character: char,
      toggles: {
        rajadaActive: true, // +1d6 base (multiplica no crit!)
        odioIncontrolavelBuff: { tier: 'verdadeiro' }, // +5 flat
        chamasDoCaosBuff: true, // +1d6 Fogo (não multiplica)
        amaldicoarArmaBuff: { element: 'Energia', tier: 'discente' }, // +2d6 Energia (não multiplica)
      },
    });

    assert.equal(res.normalFormula, '3d6+2d6+1d6+5');
    assert.equal(res.criticalFormula, '9d6+2d6+1d6+5');
    assert.equal(res.displayDamage, '3d6+5 + 2d6 Energia + 1d6 Fogo');
  });

  it('14. Desacoplamento estrito: Armaria compartilhada produz fórmulas distintas sem mutar a CustomWeapon original', () => {
    const sharedWeapon = makeCustomWeapon({
      id: 'cw_shared',
      name: 'Espada Compartilhada',
      baseWeaponName: 'Espada',
      weaponType: 'Corpo a corpo',
      baseDamage: '1d8',
      finalDamage: '1d8',
      finalCritical: '19/x2',
      modifications: [],
    });
    const snapshotBefore = JSON.stringify(sharedWeapon);

    const atk: CharacterAttack = {
      id: 'atk_shared',
      name: 'Espada Compartilhada',
      test: 'Luta',
      damage: '1d8',
      critical: '19/x2',
      range: 'Corpo a corpo',
      skillName: 'Luta',
      special: '',
      customWeaponId: 'cw_shared',
      linkMode: 'shared',
    };

    const brutal = makeCharacter({
      id: 'c1',
      attributes: { AGI: 1, FOR: 5, INT: 1, PRE: 1, VIG: 3 },
      abilities: [{ id: 'gp', name: 'Golpe Pesado', cost: 'Passivo', originPage: 'Combatente', description: '', type: 'poder' }],
    });
    const suporte = makeCharacter({
      id: 'c2',
      attributes: { AGI: 1, FOR: 1, INT: 4, PRE: 3, VIG: 1 },
    });

    const resBrutal = resolveAgentAttackDamage({ attack: atk, character: brutal, customWeapon: sharedWeapon });
    const resSuporte = resolveAgentAttackDamage({ attack: atk, character: suporte, customWeapon: sharedWeapon });

    assert.equal(resBrutal.normalFormula, '2d8+5');
    assert.equal(resSuporte.normalFormula, '1d8+1');
    assert.equal(JSON.stringify(sharedWeapon), snapshotBefore);
  });

  it('15. Rituais dinâmicos: DT + Ritual Potente (+INT) + Ritual Intenso (+PRE) + Catalisadores + Cajado + Tiers', () => {
    const ocultista = makeCharacter({
      classId: 'ocultista',
      trackId: 'exorcista',
      nex: 65,
      peRound: 13,
      peCurrent: 40,
      attributes: { AGI: 1, FOR: 1, INT: 4, PRE: 3, VIG: 2 },
      abilities: [
        { id: 'rp', name: 'Ritual Potente', cost: 'Passivo', originPage: 'Ocultista', description: 'Soma INT no dano de rituais', type: 'poder' },
        { id: 'ri', name: 'Ritual Intenso', cost: 'Passivo', originPage: 'Ocultista', description: 'Soma PRE em rituais', type: 'poder' },
      ],
      inventory: [
        { id: 'inv_cp', name: 'Catalisador Potencializador', category: 'I', spaces: 1, details: '+1 dado em ritual', equipped: true },
        { id: 'inv_pert', name: 'Catalisador Perturbador', category: 'I', spaces: 1, details: '+2 DT', equipped: true },
        { id: 'inv_cajado', name: 'Cajado da Cruz de Sangue', category: 'II', spaces: 2, details: '+1 dado de Sangue', equipped: true },
      ],
    });

    const ritualSangue: Partial<CompendiumEntity> & { name: string } = {
      id: 'rit_descarnar',
      name: 'Descarnar',
      category: 'ritual',
      element: 'Sangue',
      circle: 2,
      description: 'Causa 6d8 pontos de dano de corte no alvo.',
      discente: '+3 PE: muda o dano para 8d8.',
      verdadeiro: '+7 PE: muda o dano para 10d8.',
    };

    const resPadrao = resolveAgentRitualDamage({ ritual: ritualSangue, character: ocultista, tier: 'padrao' });
    // DT = 10 + 13 (peRound) + 3 (PRE) + 2 (Catalisador Perturbador) = 28
    assert.equal(resPadrao.dtResistance, 28);
    // Dados: 6d8 + 1d8 (Catalisador Potencializador) + 1d8 (Cajado Cruz de Sangue) = 8d8; Flat: +4 (INT) + 3 (PRE) = +7
    assert.equal(resPadrao.rollFormula, '8d8+7');
    assert.equal(resPadrao.peCost, 3);

    const resDiscente = resolveAgentRitualDamage({
      ritual: ritualSangue,
      character: ocultista,
      tier: 'discente',
      toggles: { parareligiosidadeActive: true },
    });
    assert.equal(resDiscente.rollFormula, '10d8+7'); // 8d8 + 2 dados extras
    assert.equal(resDiscente.peCost, 6); // 3 base + 3 discente
    assert.equal(resDiscente.totalPeCost, 8); // +2 PE Parareligiosidade
  });

  it('16. Integração rollWeaponDamage com fórmulas resolvidas e casos de contorno (Variável / Arremesso)', () => {
    // rollWeaponDamage usando criticalFormula e normalFormula customizados
    const rollCrit = rollWeaponDamage({
      weaponName: 'Katana',
      damage: '2d10+4',
      critical: '19/x2',
      normalFormula: '2d10+4',
      criticalFormula: '4d10+4',
      isCrit: true,
      mode: 'multiply_dice',
    });
    assert.equal(rollCrit.diceResults.length, 4);
    assert.equal(rollCrit.bonus, 4);

    // Critico com max_damage usa base multiplicada no máximo + extra normal
    const expanded = expandFormulaForCritical('2d10+1d6+4', 2);
    assert.equal(expanded, '4d10+1d6+4');

    // Caso de contorno: Azagaia (Arremesso) usa FOR quando FOR > AGI
    const arremessador = makeCharacter({ attributes: { AGI: 1, FOR: 4, INT: 1, PRE: 1, VIG: 2 } });
    const azagaia = makeAttack({
      name: 'Azagaia',
      damage: '1d6',
      critical: '20/x2',
      range: 'Curto',
      skillName: 'Pontaria',
      special: 'Arremesso',
    });
    const resAzagaia = resolveAgentAttackDamage({ attack: azagaia, character: arremessador });
    assert.equal(resAzagaia.attributeApplied, 'FOR');
    assert.equal(resAzagaia.normalFormula, '1d6+4');

    // Caso de contorno: Dano não numérico "Variável" não quebra
    const varAttack = makeAttack({ name: 'Armadilha Improvisada', damage: 'Variável', critical: '20/x2' });
    const resVar = resolveAgentAttackDamage({ attack: varAttack, character: arremessador });
    assert.ok(resVar.displayDamage.includes('Variável'));
    assert.ok(formatDamageBreakdown(resVar.breakdown).length > 0);

    // Detecta perfil sem erros
    const prof = detectAgentDamageModifiers(arremessador);
    assert.equal(prof.forValue, 4);
  });
});
