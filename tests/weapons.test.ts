import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCritical,
  formatCritical,
  stepUpDamage,
  stepUpRange,
  categoryToNumber,
  numberToCategory,
  calculateWeaponStats,
  OFFICIAL_WEAPON_MODS,
} from '../src/utils/weapons';

describe('Sistema de Armas e Modificações (weapons.ts)', () => {
  describe('parseCritical e formatCritical', () => {
    it('deve parsear strings de crítico padrão com margem e multiplicador', () => {
      assert.deepStrictEqual(parseCritical('19/x3'), { threat: 19, mult: 3 });
      assert.deepStrictEqual(parseCritical('18/x2'), { threat: 18, mult: 2 });
      assert.deepStrictEqual(parseCritical('20/x4'), { threat: 20, mult: 4 });
    });

    it('deve parsear formato apenas com multiplicador (ex.: x3)', () => {
      assert.deepStrictEqual(parseCritical('x3'), { threat: 20, mult: 3 });
      assert.deepStrictEqual(parseCritical('x4'), { threat: 20, mult: 4 });
    });

    it('deve parsear formato apenas com margem (ex.: 19 ou 18)', () => {
      assert.deepStrictEqual(parseCritical('19'), { threat: 19, mult: 2 });
      assert.deepStrictEqual(parseCritical('18'), { threat: 18, mult: 2 });
    });

    it('deve retornar { threat: 20, mult: 2 } para entradas vazias ou inválidas', () => {
      assert.deepStrictEqual(parseCritical(''), { threat: 20, mult: 2 });
      assert.deepStrictEqual(parseCritical('—'), { threat: 20, mult: 2 });
    });

    it('deve formatar valores de crítico canonicamente', () => {
      assert.strictEqual(formatCritical(20, 2), '20/x2');
      assert.strictEqual(formatCritical(20, 3), 'x3');
      assert.strictEqual(formatCritical(19, 2), '19/x2');
      assert.strictEqual(formatCritical(17, 3), '17/x3');
      assert.strictEqual(formatCritical(18, 4), '18/x4');
    });
  });

  describe('stepUpDamage - Passos de Dano', () => {
    it('deve avançar o dano na escala oficial de Ordem Paranormal', () => {
      assert.strictEqual(stepUpDamage('1d6', 1), '1d8');
      assert.strictEqual(stepUpDamage('1d8', 1), '1d10');
      assert.strictEqual(stepUpDamage('1d10', 1), '1d12');
      assert.strictEqual(stepUpDamage('1d12', 1), '2d8');
      assert.strictEqual(stepUpDamage('2d8', 1), '2d10');
      assert.strictEqual(stepUpDamage('2d10', 1), '2d12');
    });

    it('deve suportar avanço de múltiplos passos', () => {
      assert.strictEqual(stepUpDamage('1d6', 2), '1d10');
      assert.strictEqual(stepUpDamage('1d8', 3), '2d8');
      assert.strictEqual(stepUpDamage('2d8', 2), '2d12');
    });

    it('deve preservar modificadores existentes ao subir o passo', () => {
      assert.strictEqual(stepUpDamage('1d8+3', 1), '1d10+3');
      assert.strictEqual(stepUpDamage('2d10+5', 1), '2d12+5');
    });

    it('não deve ultrapassar o limite máximo da escala (4d12)', () => {
      assert.strictEqual(stepUpDamage('4d12', 1), '4d12');
    });

    it('deve retornar inalterado quando steps for <= 0 ou string vazia', () => {
      assert.strictEqual(stepUpDamage('1d8', 0), '1d8');
      assert.strictEqual(stepUpDamage('', 2), '');
    });
  });

  describe('stepUpRange - Passos de Alcance', () => {
    it('deve avançar alcance na ordem correta', () => {
      assert.strictEqual(stepUpRange('Curto', 1), 'Médio');
      assert.strictEqual(stepUpRange('Médio', 1), 'Longo');
      assert.strictEqual(stepUpRange('Longo', 1), 'Extremo');
    });

    it('deve respeitar o limite máximo em Extremo', () => {
      assert.strictEqual(stepUpRange('Extremo', 2), 'Extremo');
    });

    it('deve ignorar diferenças de maiúsculas/minúsculas', () => {
      assert.strictEqual(stepUpRange('curto', 1), 'Médio');
      assert.strictEqual(stepUpRange('médio', 2), 'Extremo');
    });
  });

  describe('Conversão de Categorias (categoryToNumber / numberToCategory)', () => {
    it('deve converter categorias romanas e textuais para números', () => {
      assert.strictEqual(categoryToNumber('0'), 0);
      assert.strictEqual(categoryToNumber('—'), 0);
      assert.strictEqual(categoryToNumber('-'), 0);
      assert.strictEqual(categoryToNumber('I'), 1);
      assert.strictEqual(categoryToNumber('1'), 1);
      assert.strictEqual(categoryToNumber('II'), 2);
      assert.strictEqual(categoryToNumber('III'), 3);
      assert.strictEqual(categoryToNumber('IV'), 4);
    });

    it('deve converter números para categorias romanas', () => {
      assert.strictEqual(numberToCategory(0), '0');
      assert.strictEqual(numberToCategory(1), 'I');
      assert.strictEqual(numberToCategory(2), 'II');
      assert.strictEqual(numberToCategory(3), 'III');
      assert.strictEqual(numberToCategory(4), 'IV');
      assert.strictEqual(numberToCategory(5), 'IV (+1)');
      assert.strictEqual(numberToCategory(7), 'IV (+3)');
    });
  });

  describe('calculateWeaponStats - Cálculo Completo de Estatísticas', () => {
    const baseRifle = {
      damage: '2d10',
      critical: '19/x3',
      range: 'Médio',
      spaces: 2,
      category: 'II',
      damageType: 'Balístico',
    };

    it('deve manter atributos base quando nenhuma modificação for selecionada', () => {
      const stats = calculateWeaponStats(baseRifle, []);
      assert.strictEqual(stats.finalDamage, '2d10');
      assert.strictEqual(stats.finalCritical, '19/x3');
      assert.strictEqual(stats.finalRange, 'Médio');
      assert.strictEqual(stats.finalCategory, 'II');
      assert.strictEqual(stats.finalSpaces, 2);
      assert.strictEqual(stats.attackBonus, 0);
      assert.strictEqual(stats.element, 'Nenhum');
    });

    it('deve aplicar mira laser: reduz margem em 1 (+1 ameaça), +2 em ataque, +1 categoria', () => {
      const stats = calculateWeaponStats(baseRifle, ['mira_laser']);
      // 19 vira 18
      assert.strictEqual(stats.finalCritical, '18/x3');
      assert.strictEqual(stats.attackBonus, 2);
      assert.strictEqual(stats.finalCategory, 'III');
    });

    it('deve aplicar calibre grosso e cruel: sobe passo de dano e adiciona dano flat', () => {
      const stats = calculateWeaponStats(baseRifle, ['calibre_grosso', 'cruel']);
      // 2d10 sobe 1 passo -> 2d12, mais cruel (+2)
      assert.strictEqual(stats.finalDamage, '2d12+2');
      assert.strictEqual(stats.finalCategory, 'IV');
    });

    it('deve aplicar maldição carniceira e energética: crítico x4, +5 ataque e elemento Energia', () => {
      const stats = calculateWeaponStats(baseRifle, ['maldicao_carniceira', 'maldicao_energetica']);
      // x3 vira x4
      assert.strictEqual(stats.finalCritical, '19/x4');
      assert.strictEqual(stats.attackBonus, 5);
      assert.strictEqual(stats.element, 'Energia');
      // II + 2 maldições (cada uma +1) = IV
      assert.strictEqual(stats.finalCategory, 'IV');
    });

    it('deve acumular dados extras de maldições elementais como Hemofágica', () => {
      const stats = calculateWeaponStats(baseRifle, ['maldicao_hemofagica']);
      assert.ok(stats.finalDamage.includes('+ 1d6 Sangue'));
      assert.strictEqual(stats.element, 'Sangue');
    });

    it('não deve permitir que espaços ocupados sejam menores que 1', () => {
      const lightKnife = {
        damage: '1d4',
        critical: '19/x2',
        range: 'Curto',
        spaces: 1,
        category: '0',
        damageType: 'Perfuração',
      };
      // Leve e Discreta subtraem 1 espaço cada (total -2)
      const stats = calculateWeaponStats(lightKnife, ['leve', 'discreta']);
      assert.strictEqual(stats.finalSpaces, 1);
    });

    it('deve incorporar modificações caseiras (customMods)', () => {
      const customMods = [
        { name: 'Cano Rajada', effect: 'Permite rajada com -1 dado', categoryIncrease: 1 },
      ];
      const stats = calculateWeaponStats(baseRifle, [], customMods);
      assert.strictEqual(stats.finalCategory, 'III');
      assert.ok(stats.specialRules.includes('Cano Rajada'));
    });

    it('deve listar todas as modificações oficiais disponíveis no compêndio', () => {
      assert.ok(OFFICIAL_WEAPON_MODS.length >= 20);
      const modIds = OFFICIAL_WEAPON_MODS.map((m) => m.id);
      assert.ok(modIds.includes('mira_laser'));
      assert.ok(modIds.includes('perigosa'));
      assert.ok(modIds.includes('calibre_grosso'));
      assert.ok(modIds.includes('maldicao_carniceira'));
      assert.ok(modIds.includes('maldicao_energetica'));
    });
  });
});
