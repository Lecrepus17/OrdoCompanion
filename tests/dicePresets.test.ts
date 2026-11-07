import './setup';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rollDiceFormula } from '../src/utils/dice';
import { resetMockStorage } from './setup';

export const CUSTOM_DICE_STORAGE_KEY = '@ordo_custom_dice_formulas';

export const DEFAULT_QUICK_FORMULAS = [
  '1d4',
  '1d6',
  '1d8',
  '1d10',
  '1d12',
  '2d6',
  '4d6',
  '6d6',
  '2d8+4',
  '3d10+5',
];

/**
 * Validador canônico de fórmulas de dados para criação de botões rápidos customizados.
 * Suporta formatos:
 * - "1d6", "2d8", "d12"
 * - "2d6+4", "3d10-2"
 * - "2d8+1d6+4", "4d6+2d4-1"
 */
export function isValidDiceFormula(formula: string): boolean {
  if (!formula || typeof formula !== 'string') return false;
  const clean = formula.trim().toLowerCase();
  if (clean.length === 0 || clean.length > 50) return false;

  // Rejeita caracteres inválidos antecipadamente
  if (/[^0-9d+\-\s]/.test(clean)) return false;

  // Pelo menos um dado (ex: "1d6", "d20") deve existir na fórmula
  if (!/\b(\d*d\d+)\b/.test(clean)) return false;

  // Valida blocos individuais separados por + ou -
  const tokens = clean.split(/(?=[+\-])/).map((t) => t.trim().replace(/^[+\-]/, '').trim());
  for (const t of tokens) {
    if (!t) return false;
    const isDice = /^(\d+)?d(\d+)$/.test(t);
    const isFixed = /^[+\-]?\d+$/.test(t);
    if (!isDice && !isFixed) return false;

    // Se for dado, confere se o número de faces é >= 2
    if (isDice) {
      const match = t.match(/^(\d+)?d(\d+)$/);
      if (match) {
        const count = match[1] ? parseInt(match[1], 10) : 1;
        const faces = parseInt(match[2], 10);
        if (count < 1 || count > 100 || faces < 2 || faces > 1000) return false;
      }
    }
  }

  return true;
}

/**
 * Carrega a lista efetiva de fórmulas rápidas (padrão + customizadas salvas).
 */
export async function loadQuickFormulas(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_DICE_STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUICK_FORMULAS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_QUICK_FORMULAS];
    }
    // Remove duplicatas e sanitiza
    return Array.from(new Set([...DEFAULT_QUICK_FORMULAS, ...parsed]));
  } catch {
    return [...DEFAULT_QUICK_FORMULAS];
  }
}

/**
 * Adiciona uma nova fórmula customizada e persiste no AsyncStorage.
 */
export async function addCustomFormula(formula: string): Promise<{ success: boolean; formulas: string[]; error?: string }> {
  const clean = (formula || '').trim();
  if (!isValidDiceFormula(clean)) {
    return {
      success: false,
      formulas: await loadQuickFormulas(),
      error: 'Fórmula de dados inválida. Use notações como "2d8+4", "3d6+1d4" ou "5d10".',
    };
  }

  const current = await loadQuickFormulas();
  if (current.includes(clean)) {
    return {
      success: true,
      formulas: current,
    };
  }

  const updated = [...current, clean];
  const customOnly = updated.filter((f) => !DEFAULT_QUICK_FORMULAS.includes(f));
  await AsyncStorage.setItem(CUSTOM_DICE_STORAGE_KEY, JSON.stringify(customOnly));

  return {
    success: true,
    formulas: updated,
  };
}

/**
 * Remove uma fórmula customizada e atualiza o AsyncStorage.
 */
export async function removeCustomFormula(formula: string): Promise<string[]> {
  const current = await loadQuickFormulas();
  const updated = current.filter((f) => f !== formula);
  const customOnly = updated.filter((f) => !DEFAULT_QUICK_FORMULAS.includes(f));
  await AsyncStorage.setItem(CUSTOM_DICE_STORAGE_KEY, JSON.stringify(customOnly));
  return updated;
}

describe('Feature 17: Custom Dice Formulas & Presets (dicePresets.test.ts)', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  // =========================================================================
  // TIER 1: Primary Behavior (Add, Remove, Load Presets)
  // =========================================================================
  describe('Tier 1: Gerenciamento de Fórmulas Customizadas', () => {
    it('1.1 deve carregar a lista de fórmulas padrão quando o AsyncStorage estiver vazio', async () => {
      const formulas = await loadQuickFormulas();
      assert.strictEqual(formulas.length, DEFAULT_QUICK_FORMULAS.length);
      assert.deepStrictEqual(formulas, DEFAULT_QUICK_FORMULAS);
    });

    it('1.2 deve adicionar uma fórmula válida e persistir no AsyncStorage', async () => {
      const res = await addCustomFormula('5d6+10');
      assert.strictEqual(res.success, true);
      assert.ok(res.formulas.includes('5d6+10'));

      // Verifica se gravou no AsyncStorage
      const rawStored = await AsyncStorage.getItem(CUSTOM_DICE_STORAGE_KEY);
      assert.ok(rawStored);
      const parsed = JSON.parse(rawStored!);
      assert.deepStrictEqual(parsed, ['5d6+10']);
    });

    it('1.3 deve recuperar fórmulas customizadas após recarregar', async () => {
      await addCustomFormula('2d12+3');
      await addCustomFormula('4d8');

      const reloaded = await loadQuickFormulas();
      assert.ok(reloaded.includes('2d12+3'));
      assert.ok(reloaded.includes('4d8'));
      assert.strictEqual(reloaded.length, DEFAULT_QUICK_FORMULAS.length + 2);
    });

    it('1.4 deve remover uma fórmula customizada e persistir a remoção', async () => {
      await addCustomFormula('3d8+6');
      let current = await loadQuickFormulas();
      assert.ok(current.includes('3d8+6'));

      const afterRemove = await removeCustomFormula('3d8+6');
      assert.strictEqual(afterRemove.includes('3d8+6'), false);

      const reloaded = await loadQuickFormulas();
      assert.strictEqual(reloaded.includes('3d8+6'), false);
    });

    it('1.5 deve rolar com sucesso uma fórmula customizada recuperada', async () => {
      const formula = '3d8+6';
      await addCustomFormula(formula);

      const roll = rollDiceFormula(formula, 'Teste Custom Preset');
      assert.strictEqual(roll.diceResults.length, 3);
      assert.strictEqual(roll.bonus, 6);
      assert.ok(roll.total >= 9 && roll.total <= 30);
    });
  });

  // =========================================================================
  // TIER 2: Validation & Boundaries
  // =========================================================================
  describe('Tier 2: Validação e Limites de Fórmulas', () => {
    it('2.1 deve aceitar fórmulas compostas válidas com múltiplos dados', () => {
      assert.strictEqual(isValidDiceFormula('2d8+1d6+4'), true);
      assert.strictEqual(isValidDiceFormula('3d10+2d4-2'), true);
      assert.strictEqual(isValidDiceFormula('1d12'), true);
      assert.strictEqual(isValidDiceFormula('d20'), true);
      assert.strictEqual(isValidDiceFormula('10d6+15'), true);
    });

    it('2.2 deve rejeitar fórmulas inválidas sem lançar exceção', () => {
      assert.strictEqual(isValidDiceFormula(''), false);
      assert.strictEqual(isValidDiceFormula('   '), false);
      assert.strictEqual(isValidDiceFormula('abc'), false);
      assert.strictEqual(isValidDiceFormula('++4d'), false);
      assert.strictEqual(isValidDiceFormula('2d'), false);
      assert.strictEqual(isValidDiceFormula('d'), false);
      assert.strictEqual(isValidDiceFormula('0d6'), false);
      assert.strictEqual(isValidDiceFormula('2d0'), false);
      assert.strictEqual(isValidDiceFormula('2d1'), false);
      assert.strictEqual(isValidDiceFormula('10 + 20'), false); // Apenas números, sem dados
    });

    it('2.3 addCustomFormula deve falhar com mensagem explicativa para fórmula inválida', async () => {
      const res = await addCustomFormula('formula_errada');
      assert.strictEqual(res.success, false);
      assert.ok(res.error);
      assert.ok(res.error.includes('inválida'));
    });

    it('2.4 não deve duplicar fórmulas se já existirem nos atalhos', async () => {
      await addCustomFormula('2d8+4'); // Já existe nos padrões
      const formulas = await loadQuickFormulas();
      const count = formulas.filter((f) => f === '2d8+4').length;
      assert.strictEqual(count, 1, 'Não deve haver duplicatas de 2d8+4');
    });

    it('2.5 lida com JSON corrompido no AsyncStorage com fallback seguro', async () => {
      await AsyncStorage.setItem(CUSTOM_DICE_STORAGE_KEY, '{corrompido: true, invalid');
      const formulas = await loadQuickFormulas();
      assert.deepStrictEqual(formulas, DEFAULT_QUICK_FORMULAS);
    });
  });

  // =========================================================================
  // TIER 3: Interface Contracts & Interaction
  // =========================================================================
  describe('Tier 3: Contrato de Integração com o Rolador Livre', () => {
    it('3.1 todas as fórmulas padrão devem ser fórmulas válidas e executáveis', () => {
      for (const formula of DEFAULT_QUICK_FORMULAS) {
        assert.strictEqual(isValidDiceFormula(formula), true, `Fórmula padrão '${formula}' deve ser válida`);
        const result = rollDiceFormula(formula, `Teste ${formula}`);
        assert.ok(result.total > 0);
        assert.ok(result.diceResults.length >= 1);
      }
    });

    it('3.2 adicionar múltiplos presets em sequência preserva a ordem', async () => {
      const presetsToAdd = ['2d10+5', '3d6+2', '1d100', '4d12'];
      for (const p of presetsToAdd) {
        await addCustomFormula(p);
      }

      const loaded = await loadQuickFormulas();
      for (const p of presetsToAdd) {
        assert.ok(loaded.includes(p));
      }
      const customSlice = loaded.slice(DEFAULT_QUICK_FORMULAS.length);
      assert.deepStrictEqual(customSlice, presetsToAdd);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Jogador no Rolador Livre', () => {
    it('4.1 Cenário: Jogador cria atalho para dano de Ataque Furtivo ("3d6+4")', async () => {
      const sneakAttack = '3d6+4';
      const addRes = await addCustomFormula(sneakAttack);
      assert.strictEqual(addRes.success, true);

      // Na hora do combate, clica no botão rápido
      const roll = rollDiceFormula(sneakAttack, 'Dano Ataque Furtivo');
      assert.strictEqual(roll.diceResults.length, 3);
      assert.strictEqual(roll.bonus, 4);
      assert.ok(roll.total >= 7 && roll.total <= 22);
    });

    it('4.2 Cenário: Ocultista cria atalho de dano de ritual discente ("4d8+2d6")', async () => {
      const ritualDamage = '4d8+2d6';
      const addRes = await addCustomFormula(ritualDamage);
      assert.strictEqual(addRes.success, true);

      const roll = rollDiceFormula(ritualDamage, 'Ritual Discente');
      assert.strictEqual(roll.diceResults.length, 6); // 4 + 2
      assert.ok(roll.total >= 6 && roll.total <= 44);
    });

    it('4.3 Cenário: Limpeza de atalhos antigos de campanhas anteriores', async () => {
      await addCustomFormula('2d20+10');
      await addCustomFormula('5d8+2');

      let current = await loadQuickFormulas();
      assert.ok(current.includes('2d20+10'));
      assert.ok(current.includes('5d8+2'));

      await removeCustomFormula('2d20+10');
      current = await loadQuickFormulas();
      assert.strictEqual(current.includes('2d20+10'), false);
      assert.ok(current.includes('5d8+2'));
    });
  });

  // =========================================================================
  // TIER 5: Adversarial & Stress
  // =========================================================================
  describe('Tier 5: Adversarial & Sanitização', () => {
    it('5.1 sanitiza espaços extras ao redor de operadores na fórmula', () => {
      assert.strictEqual(isValidDiceFormula('  2d8  +  4  '), true);
      assert.strictEqual(isValidDiceFormula(' 3d6 - 2 '), true);
    });

    it('5.2 rejeita tentativa de injeção de script ou caracteres de controle', () => {
      assert.strictEqual(isValidDiceFormula('<script>alert("hack")</script>'), false);
      assert.strictEqual(isValidDiceFormula('2d6; DROP TABLE users;'), false);
      assert.strictEqual(isValidDiceFormula('2d6\u0000+4'), false);
    });

    it('5.3 rejeita fórmulas com quantidades absurdas de dados (prevenção de OOM/DoS)', () => {
      assert.strictEqual(isValidDiceFormula('999999999d6'), false);
      assert.strictEqual(isValidDiceFormula('5d999999999'), false);
      assert.strictEqual(isValidDiceFormula('101d6'), false); // Limite máximo de 100 dados por bloco
    });

    it('5.4 fórmula com tamanho de string excessivo (> 50 chars) é rejeitada', () => {
      const longFormula = '1d6+' + '1d6+'.repeat(20) + '5';
      assert.strictEqual(isValidDiceFormula(longFormula), false);
    });
  });
});
