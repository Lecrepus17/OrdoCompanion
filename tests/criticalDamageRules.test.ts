import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rollWeaponDamage,
  expandFormulaForCritical,
  calculateMaxDamageForFormula,
  rollDiceFormula,
  rollOrdemTest,
  WeaponDamageRollOptions,
} from '../src/utils/dice';
import { parseCritical } from '../src/utils/weapons';
import { CriticalDamageMode } from '../src/types/compendium';

describe('Feature 15: Critical Damage Rules & Calculation Modes (criticalDamageRules.test.ts)', () => {
  // =========================================================================
  // TIER 1: Primary Behavior (The 4 Modes: multiply_dice, multiply_damage, max_damage, ask_user)
  // =========================================================================
  describe('Tier 1: Modos Canônicos de Cálculo de Dano Crítico', () => {
    it('1.1 modo multiply_dice (Regra Oficial v1.1): multiplica apenas a quantidade de dados, preservando bônus fixo', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Acha de Guerra',
        damage: '1d12+5',
        critical: '19/x3',
        isCrit: true,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);

      assert.strictEqual(result.isCritical, true);
      assert.strictEqual(result.bonus, 5, 'Bônus fixo não deve ser multiplicado no modo multiply_dice');
      // 1d12 x3 = 3d12
      assert.strictEqual(result.diceResults.length, 3, 'Deveria rolar 3 dados d12');
      for (const d of result.diceResults) {
        assert.ok(d >= 1 && d <= 12, `Dado rolado deve ser entre 1 e 12, foi ${d}`);
      }
      assert.strictEqual(result.total, result.diceResults.reduce((acc, d) => acc + d, 0) + 5);
    });

    it('1.2 modo multiply_damage (Modo Alternativo/Menos Dados): multiplica o total da rolagem base', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Acha de Guerra',
        damage: '1d12+5',
        critical: '19/x3',
        isCrit: true,
        mode: 'multiply_damage',
      };

      const result = rollWeaponDamage(options);

      assert.strictEqual(result.isCritical, true);
      // Rola apenas a base (1d12)
      assert.strictEqual(result.diceResults.length, 1);
      const dieVal = result.diceResults[0];
      const baseTotal = dieVal + 5;
      const expectedCritTotal = baseTotal * 3;
      assert.strictEqual(result.total, expectedCritTotal);
      assert.ok(result.formulaText.includes('x3 Dano'));
    });

    it('1.3 modo max_damage / isMaxDamage: dano cheio maximizado em multiply_dice', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Espingarda',
        damage: '4d6+2',
        critical: '19/x3',
        isMaxDamage: true,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);

      assert.strictEqual(result.isCritical, true);
      assert.strictEqual(result.isMaxDamage, true);
      // 4d6 x3 = 12d6. Todas as faces máximas = 12 * 6 = 72 + 2 = 74
      assert.strictEqual(result.diceResults.length, 12);
      for (const d of result.diceResults) {
        assert.strictEqual(d, 6, 'Todas as faces devem ser 6');
      }
      assert.strictEqual(result.bonus, 2);
      assert.strictEqual(result.total, 74);
    });

    it('1.4 modo max_damage / isMaxDamage: dano cheio maximizado em multiply_damage', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Espingarda',
        damage: '4d6+2',
        critical: '19/x3',
        isMaxDamage: true,
        mode: 'multiply_damage',
      };

      const result = rollWeaponDamage(options);

      assert.strictEqual(result.isCritical, true);
      assert.strictEqual(result.isMaxDamage, true);
      // Base máxima = 4*6 + 2 = 26. Multiplicado por 3 = 78
      assert.strictEqual(result.total, 78);
    });

    it('1.5 rolagem normal sem crítico (isCrit: false) rola apenas dano base independente do modo', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Revólver',
        damage: '2d6',
        critical: '19/x3',
        isCrit: false,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);

      assert.strictEqual(Boolean(result.isCritical), false);
      assert.strictEqual(result.diceResults.length, 2);
      assert.strictEqual(result.total, result.diceResults[0] + result.diceResults[1]);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Edge Cases
  // =========================================================================
  describe('Tier 2: Limites, Formatos de Margem e Modificadores', () => {
    it('2.1 parsing de margem de ameaça e multiplicadores variados (parseCritical)', () => {
      assert.deepStrictEqual(parseCritical('20/x2'), { threat: 20, mult: 2 });
      assert.deepStrictEqual(parseCritical('19/x3'), { threat: 19, mult: 3 });
      assert.deepStrictEqual(parseCritical('18/x2'), { threat: 18, mult: 2 });
      assert.deepStrictEqual(parseCritical('17/x4'), { threat: 17, mult: 4 });
      assert.deepStrictEqual(parseCritical('x3'), { threat: 20, mult: 3 });
      assert.deepStrictEqual(parseCritical('x2'), { threat: 20, mult: 2 });
      // Valores inválidos ou vazios caem no fallback 20/x2
      assert.deepStrictEqual(parseCritical(''), { threat: 20, mult: 2 });
      assert.deepStrictEqual(parseCritical('invalido'), { threat: 20, mult: 2 });
    });

    it('2.2 arma com dano estático sem dados (ex: "5" ou "+4")', () => {
      const optionsDice: WeaponDamageRollOptions = {
        weaponName: 'Soco Fixo',
        damage: '5',
        critical: '20/x2',
        isCrit: true,
        mode: 'multiply_dice',
      };
      const resultDice = rollWeaponDamage(optionsDice);
      assert.ok(resultDice.total >= 5);

      const optionsMult: WeaponDamageRollOptions = {
        weaponName: 'Soco Fixo',
        damage: '5',
        critical: '20/x2',
        isCrit: true,
        mode: 'multiply_damage',
      };
      const resultMult = rollWeaponDamage(optionsMult);
      assert.strictEqual(resultMult.total, 10, '5 multiplicado por x2 = 10');
    });

    it('2.3 arma com múltiplos grupos de dados (ex: "2d8+1d6+3")', () => {
      const expanded = expandFormulaForCritical('2d8+1d6+3', 2);
      // Canonicamente multiplica os dados da arma
      assert.ok(expanded.includes('4d8'), `Deveria conter 4d8: ${expanded}`);
      assert.ok(expanded.includes('+3'), `Deveria conter +3: ${expanded}`);
    });

    it('2.4 multiplicador alto (x4 ou x5)', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Fuzil de Precisão Calibrado',
        damage: '2d10',
        critical: '19/x5',
        isCrit: true,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);
      // 2d10 x5 = 10d10
      assert.strictEqual(result.diceResults.length, 10);
      for (const d of result.diceResults) {
        assert.ok(d >= 1 && d <= 10, `Dado d10 deve ser 1-10: ${d}`);
      }
    });

    it('2.5 arma com bônus negativo (ex: "1d6-2")', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Faca Cega',
        damage: '1d6-2',
        critical: '20/x2',
        isCrit: true,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);
      // 1d6 x2 = 2d6 - 2
      assert.strictEqual(result.diceResults.length, 2);
      assert.strictEqual(result.bonus, -2);
      assert.strictEqual(result.total, result.diceResults[0] + result.diceResults[1] - 2);
    });
  });

  // =========================================================================
  // TIER 3: Interface Contracts & Teste de Ataque com Margem
  // =========================================================================
  describe('Tier 3: Contrato com Teste de Ataque e Detecção de Ameaça', () => {
    it('3.1 rollOrdemTest deve sinalizar isCritical quando dado atingir a margem de ameaça', () => {
      // Força margem 19 e teste com atributo 3
      let gotCrit = false;
      for (let i = 0; i < 50; i++) {
        const roll = rollOrdemTest(3, 10, 'Ataque Teste', 19);
        if (roll.isCritical) {
          gotCrit = true;
          assert.ok(
            roll.chosenDie !== undefined && roll.chosenDie >= 19,
            `Dado escolhido no crítico deve ser >= 19, foi ${roll.chosenDie}`
          );
        }
      }
      // Em 50 rolagens de 3d20, a probabilidade de obter pelo menos um >= 19 é > 99.9%
      assert.ok(gotCrit, 'Deveria ter atingido crítico em 50 rolagens com margem 19');
    });

    it('3.2 rollWeaponDamage deve preservar attackContext para re-rolagens e auditoria', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Katana Cerimonial',
        damage: '1d10+4',
        critical: '18/x2',
        isCrit: true,
        mode: 'multiply_dice',
        attackContext: {
          weaponName: 'Katana Cerimonial',
          damage: '1d10+4',
          critical: '18/x2',
        },
      };

      const result = rollWeaponDamage(options);
      assert.ok(result.attackContext);
      assert.strictEqual(result.attackContext.weaponName, 'Katana Cerimonial');
      assert.strictEqual(result.attackContext.damage, '1d10+4');
      assert.strictEqual(result.attackContext.critical, '18/x2');
    });

    it('3.3 calculateMaxDamageForFormula deve calcular corretamente para qualquer fórmula', () => {
      const max1 = calculateMaxDamageForFormula('3d6+4');
      assert.strictEqual(max1.total, 3 * 6 + 4); // 22

      const max2 = calculateMaxDamageForFormula('1d12+2d8+5');
      assert.strictEqual(max2.total, 12 + 2 * 8 + 5); // 33
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Combate', () => {
    it('4.1 Cenário: Combatente com Marreta (4d8, 16/x3) atinge crítico no modo canônico v1.1', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Marreta do Ketal',
        damage: '4d8+6',
        critical: '16/x3',
        isCrit: true,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);

      // 4d8 x3 = 12d8 + 6
      assert.strictEqual(result.diceResults.length, 12);
      assert.strictEqual(result.bonus, 6);
      assert.ok(result.total >= 18 && result.total <= 102); // 12*1+6 até 12*8+6
    });

    it('4.2 Cenário: Jogador prefere modo "multiply_damage" para agilizar combate de mesa', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Marreta do Ketal',
        damage: '4d8+6',
        critical: '16/x3',
        isCrit: true,
        mode: 'multiply_damage',
      };

      const result = rollWeaponDamage(options);

      // Rola apenas 4 dados e multiplica o total obtido por 3
      assert.strictEqual(result.diceResults.length, 4);
      const sum = result.diceResults.reduce((a, b) => a + b, 0);
      assert.strictEqual(result.total, (sum + 6) * 3);
    });

    it('4.3 Cenário: Ataque atinge Crítico Máximo com poder Golpe Destruidor', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Montante',
        damage: '2d6+8',
        critical: '19/x2',
        isMaxDamage: true,
        mode: 'multiply_dice',
      };

      const result = rollWeaponDamage(options);

      // 2d6 x2 = 4d6 (todos 6) + 8 = 32
      assert.strictEqual(result.diceResults.length, 4);
      assert.strictEqual(result.total, 32);
      assert.strictEqual(result.isMaxDamage, true);
    });
  });

  // =========================================================================
  // TIER 5: Adversarial & Stress Testing
  // =========================================================================
  describe('Tier 5: Adversarial & Entradas Malformadas', () => {
    it('5.1 dano com espaços irregulares, letras maiúsculas e caracteres extras', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Arma Caótica',
        damage: '  2D8  +  5  ',
        critical: ' 19 / X3 ',
        isCrit: true,
        mode: 'multiply_dice',
      };

      assert.doesNotThrow(() => {
        const result = rollWeaponDamage(options);
        assert.ok(result.total > 0);
        assert.strictEqual(result.diceResults.length, 6); // 2d8 x3 = 6d8
      });
    });

    it('5.2 dano sem dados (apenas número) não produz NaN', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Dano Fixo',
        damage: '10',
        critical: 'x2',
        isCrit: true,
        mode: 'multiply_damage',
      };

      const result = rollWeaponDamage(options);
      assert.strictEqual(Number.isNaN(result.total), false);
      assert.strictEqual(result.total, 20);
    });

    it('5.3 multiplicador 0 ou negativo é normalizado defensivamente', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Arma Bugada',
        damage: '1d6',
        critical: 'x0',
        isCrit: true,
        mode: 'multiply_dice',
      };

      assert.doesNotThrow(() => {
        const result = rollWeaponDamage(options);
        // Não deve resultar em 0 dados
        assert.ok(result.diceResults.length >= 1);
      });
    });

    it('5.4 string de dano completamente vazia usa fallback seguro de 1d6', () => {
      const options: WeaponDamageRollOptions = {
        weaponName: 'Desarmado',
        damage: '',
        critical: '',
        isCrit: false,
      };

      const result = rollWeaponDamage(options);
      assert.strictEqual(result.diceResults.length, 1);
      assert.strictEqual(Number.isNaN(result.total), false);
    });
  });
});
