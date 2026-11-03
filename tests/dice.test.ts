import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rollOrdemTest,
  rollDiceFormula,
  expandFormulaForCritical,
  calculateMaxDamageForFormula,
  rollWeaponDamage,
} from '../src/utils/dice';

describe('Sistema de Rolagem de Dados (dice.ts)', () => {
  describe('rollOrdemTest - Teste de Perícia / Atributo', () => {
    it('deve rolar N dados e escolher o maior quando atributo >= 1', () => {
      const res = rollOrdemTest(3, 5, 'Luta');

      assert.strictEqual(res.label, 'Luta');
      assert.strictEqual(res.mode, 'skill');
      assert.strictEqual(res.diceResults.length, 3);
      assert.strictEqual(res.bonus, 5);
      assert.strictEqual(res.chosenDie, Math.max(...res.diceResults));
      assert.strictEqual(res.total, res.chosenDie! + 5);
      assert.ok(res.formulaText.includes('3d20 (melhor)+5'));
    });

    it('deve rolar (2 + |atributo|) dados e escolher o menor quando atributo <= 0 (penalidade)', () => {
      // Atributo 0 -> 2 + 0 = 2 dados, escolhe o pior
      const resZero = rollOrdemTest(0, 0, 'Pontaria');
      assert.strictEqual(resZero.diceResults.length, 2);
      assert.strictEqual(resZero.chosenDie, Math.min(...resZero.diceResults));
      assert.strictEqual(resZero.total, resZero.chosenDie!);
      assert.ok(resZero.formulaText.includes('2d20 (pior)'));

      // Atributo -1 -> 2 + |-1| = 3 dados, escolhe o pior
      const resNeg = rollOrdemTest(-1, 2, 'Vontade');
      assert.strictEqual(resNeg.diceResults.length, 3);
      assert.strictEqual(resNeg.chosenDie, Math.min(...resNeg.diceResults));
      assert.strictEqual(resNeg.total, resNeg.chosenDie! + 2);
      assert.ok(resNeg.formulaText.includes('3d20 (pior)+2'));

      // Atributo -3 -> 2 + 3 = 5 dados, escolhe o pior
      const resNeg3 = rollOrdemTest(-3, -2, 'Ocultismo');
      assert.strictEqual(resNeg3.diceResults.length, 5);
      assert.strictEqual(resNeg3.chosenDie, Math.min(...resNeg3.diceResults));
      assert.strictEqual(resNeg3.total, resNeg3.chosenDie! - 2);
      assert.ok(resNeg3.formulaText.includes('5d20 (pior)-2'));
    });

    it('deve marcar isCritical quando chosenDie atingir a margem de ameaça', () => {
      // Teste com margem padrão (20)
      for (let i = 0; i < 30; i++) {
        const res = rollOrdemTest(2, 0, 'Teste Normal', 20);
        if (res.chosenDie === 20) {
          assert.strictEqual(res.isCritical, true);
        } else {
          assert.strictEqual(res.isCritical, false);
        }
      }

      // Teste com arma de margem de ameaça 18 (ex: Katana com modificação ou Pistola)
      for (let i = 0; i < 30; i++) {
        const res = rollOrdemTest(3, 0, 'Ataque Margem 18', 18);
        if (res.chosenDie! >= 18) {
          assert.strictEqual(res.isCritical, true);
        } else {
          assert.strictEqual(res.isCritical, false);
        }
      }
    });

    it('deve marcar desastre (isFumble) apenas quando todos os dados rolados forem 1', () => {
      for (let i = 0; i < 50; i++) {
        const res = rollOrdemTest(2, 0);
        const allOnes = res.diceResults.every((d) => d === 1);
        assert.strictEqual(res.isFumble, allOnes);
      }
    });

    it('deve conter timestamp válido no formato pt-BR', () => {
      const res = rollOrdemTest(1, 0);
      assert.match(res.timestamp, /^\d{2}:\d{2}:\d{2}$/);
    });

    it('deve preservar o attackContext quando fornecido', () => {
      const ctx = { weaponName: 'Revólver', damage: '2d6', critical: '19/x3' };
      const res = rollOrdemTest(2, 5, 'Ataque Revólver', 19, ctx);
      assert.deepStrictEqual(res.attackContext, ctx);
    });
  });

  describe('rollDiceFormula - Avaliação de Fórmulas Gerais', () => {
    it('deve reconhecer atalhos de teste de perícia como "5d20+20" ou "3d20-5"', () => {
      const res1 = rollDiceFormula('5d20+20', 'Ataque Criatura');
      assert.strictEqual(res1.mode, 'skill');
      assert.strictEqual(res1.diceResults.length, 5);
      assert.strictEqual(res1.bonus, 20);
      assert.strictEqual(res1.total, res1.chosenDie! + 20);

      const res2 = rollDiceFormula('2d20-2', 'Teste com Penalidade');
      assert.strictEqual(res2.mode, 'skill');
      assert.strictEqual(res2.diceResults.length, 2);
      assert.strictEqual(res2.bonus, -2);
      assert.strictEqual(res2.total, res2.chosenDie! - 2);
    });

    it('deve rolar fórmula simples como "4d6+10"', () => {
      const res = rollDiceFormula('4d6+10', 'Dano Golpe Pesado');
      assert.strictEqual(res.mode, 'formula');
      assert.strictEqual(res.diceResults.length, 4);
      assert.strictEqual(res.bonus, 10);
      const diceSum = res.diceResults.reduce((a, b) => a + b, 0);
      assert.strictEqual(res.total, diceSum + 10);
      for (const d of res.diceResults) {
        assert.ok(d >= 1 && d <= 6);
      }
      assert.ok(res.total >= 14 && res.total <= 34);
    });

    it('deve rolar fórmula combinada com múltiplos tipos de dados como "2d8+1d6+4"', () => {
      const res = rollDiceFormula('2d8+1d6+4', 'Dano Crítico Katana');
      assert.strictEqual(res.mode, 'formula');
      assert.strictEqual(res.diceResults.length, 3);
      assert.strictEqual(res.bonus, 4);
      const sum = res.diceResults.reduce((a, b) => a + b, 0);
      assert.strictEqual(res.total, sum + 4);
    });

    it('deve suportar modificadores negativos e espaços na fórmula', () => {
      const res = rollDiceFormula('  2d10 - 3  ', 'Dano com Redução');
      assert.strictEqual(res.mode, 'formula');
      assert.strictEqual(res.diceResults.length, 2);
      assert.strictEqual(res.bonus, -3);
      for (const d of res.diceResults) {
        assert.ok(d >= 1 && d <= 10);
      }
      const sum = res.diceResults.reduce((a, b) => a + b, 0);
      assert.strictEqual(res.total, sum - 3);
    });

    it('deve lidar com fórmulas sem dados (apenas bônus fixo) com fallback seguro', () => {
      const res = rollDiceFormula('+10', 'Bônus Puro');
      assert.ok(res.total >= 11 && res.total <= 30);
    });
  });

  describe('expandFormulaForCritical - Expansão Canônica de Dados Críticos', () => {
    it('deve multiplicar a quantidade de dados para fórmulas padrão', () => {
      assert.strictEqual(expandFormulaForCritical('1d8+3', 2), '2d8+3');
      assert.strictEqual(expandFormulaForCritical('2d6', 3), '6d6');
      assert.strictEqual(expandFormulaForCritical('2d10+4', 3), '6d10+4');
      assert.strictEqual(expandFormulaForCritical('d12', 2), '2d12');
      assert.strictEqual(expandFormulaForCritical('3d6+2', 2), '6d6+2');
    });

    it('deve multiplicar apenas os dados base da arma em fórmulas compostas', () => {
      assert.strictEqual(expandFormulaForCritical('2d6+2 + 2d6', 2), '4d6+2 + 2d6');
      assert.strictEqual(expandFormulaForCritical('1d8+2 + 1d6 Morte', 2), '2d8+2 + 1d6 Morte');
    });
  });

  describe('calculateMaxDamageForFormula - Cálculo de Dano Máximo', () => {
    it('deve atribuir o valor máximo para todos os dados', () => {
      const res1 = calculateMaxDamageForFormula('1d8+3');
      assert.deepStrictEqual(res1.diceResults, [8]);
      assert.strictEqual(res1.bonus, 3);
      assert.strictEqual(res1.total, 11);

      const res2 = calculateMaxDamageForFormula('2d6+4');
      assert.deepStrictEqual(res2.diceResults, [6, 6]);
      assert.strictEqual(res2.bonus, 4);
      assert.strictEqual(res2.total, 16);

      const res3 = calculateMaxDamageForFormula('6d6');
      assert.strictEqual(res3.diceResults.length, 6);
      assert.ok(res3.diceResults.every((d) => d === 6));
      assert.strictEqual(res3.total, 36);
    });
  });

  describe('rollWeaponDamage - Modos de Crítico e Crítico Máximo', () => {
    const weapon = {
      weaponName: 'Espada Longa',
      damage: '1d8+2',
      critical: '19/x2',
    };

    it('deve rolar dano normal com dados base', () => {
      const res = rollWeaponDamage({
        ...weapon,
        isCrit: false,
      });

      assert.strictEqual(res.diceResults.length, 1);
      assert.strictEqual(res.bonus, 2);
      assert.strictEqual(res.total, res.diceResults[0] + 2);
      assert.strictEqual(res.isCritical, undefined);
      assert.strictEqual(res.isMaxDamage, undefined);
    });

    it('deve rolar crítico no modo multiply_dice (Padrão Oficial: duplica dados rolados)', () => {
      const res = rollWeaponDamage({
        ...weapon,
        isCrit: true,
        mode: 'multiply_dice',
      });

      assert.strictEqual(res.diceResults.length, 2); // 1d8 x 2 = 2d8
      assert.strictEqual(res.bonus, 2);
      assert.strictEqual(res.isCritical, true);
      assert.strictEqual(res.total, res.diceResults[0] + res.diceResults[1] + 2);
    });

    it('deve rolar crítico no modo multiply_damage (Modo Alternativo: menos dados, multiplica total)', () => {
      const res = rollWeaponDamage({
        ...weapon,
        isCrit: true,
        mode: 'multiply_damage',
      });

      assert.strictEqual(res.diceResults.length, 1); // Rola apenas 1d8
      assert.strictEqual(res.bonus, 2);
      assert.strictEqual(res.isCritical, true);
      // Total = (dado + bonus) * mult
      const baseTotal = res.diceResults[0] + 2;
      assert.strictEqual(res.total, baseTotal * 2);
    });

    it('deve calcular Crítico Máximo no modo multiply_dice com todas as faces máximas', () => {
      const res = rollWeaponDamage({
        ...weapon,
        isCrit: true,
        isMaxDamage: true,
        mode: 'multiply_dice',
      });

      assert.strictEqual(res.isCritical, true);
      assert.strictEqual(res.isMaxDamage, true);
      assert.deepStrictEqual(res.diceResults, [8, 8]); // 2d8 no máximo
      assert.strictEqual(res.bonus, 2);
      assert.strictEqual(res.total, 18); // 8 + 8 + 2
    });

    it('deve calcular Crítico Máximo no modo multiply_damage com dano base máximo multiplicado', () => {
      const res = rollWeaponDamage({
        ...weapon,
        isCrit: true,
        isMaxDamage: true,
        mode: 'multiply_damage',
      });

      assert.strictEqual(res.isCritical, true);
      assert.strictEqual(res.isMaxDamage, true);
      assert.deepStrictEqual(res.diceResults, [8]); // 1d8 no máximo
      assert.strictEqual(res.bonus, 2);
      assert.strictEqual(res.total, 20); // (8 + 2) * 2 = 20
    });

    it('deve calcular Crítico Máximo para armas com crítico x3 (ex: Revólver 2d6)', () => {
      const rev = {
        weaponName: 'Revólver',
        damage: '2d6',
        critical: '19/x3',
      };

      // No modo multiply_dice: 6d6 -> 6 * 6 = 36
      const resDice = rollWeaponDamage({
        ...rev,
        isCrit: true,
        isMaxDamage: true,
        mode: 'multiply_dice',
      });
      assert.strictEqual(resDice.diceResults.length, 6);
      assert.strictEqual(resDice.total, 36);

      // No modo multiply_damage: 2d6 máximo (12) * 3 = 36
      const resDmg = rollWeaponDamage({
        ...rev,
        isCrit: true,
        isMaxDamage: true,
        mode: 'multiply_damage',
      });
      assert.strictEqual(resDmg.total, 36);
    });
  });
});
