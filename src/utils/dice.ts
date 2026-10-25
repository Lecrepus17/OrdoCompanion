import { DiceRollResult } from '../types/compendium';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Rolagem oficial do sistema Ordem Paranormal RPG:
 * - Se attributeDice >= 1: rola N d20 e escolhe o MAIOR resultado.
 * - Se attributeDice <= 0: rola (2 + |attributeDice|) d20 e escolhe o MENOR resultado.
 * - Desastre (Fumble): Ocorre apenas se TODOS os dados rolados resultarem em 1 (Regra Oficial p. 16).
 * - Sucesso Crítico: Ocorre quando o dado escolhido for maior ou igual à Margem de Ameaça (padrão 20).
 */
export function rollOrdemTest(
  attributeDice: number,
  bonus: number = 0,
  label: string = 'Teste de Perícia',
  criticalThreat: number = 20
): DiceRollResult {
  const isPenaltyPool = attributeDice <= 0;
  const poolCount = isPenaltyPool ? 2 + Math.abs(attributeDice) : attributeDice;
  const diceResults: number[] = [];

  for (let i = 0; i < poolCount; i++) {
    diceResults.push(randomInt(1, 20));
  }

  const chosenDie = isPenaltyPool
    ? Math.min(...diceResults)
    : Math.max(...diceResults);

  const total = chosenDie + bonus;
  const signStr = bonus > 0 ? `+${bonus}` : bonus < 0 ? `${bonus}` : '';
  const formulaText = isPenaltyPool
    ? `${poolCount}d20 (pior)${signStr}`
    : `${poolCount}d20 (melhor)${signStr}`;

  // Regra Oficial de Ordem Paranormal RPG:
  // "Desastre: Se todos os dados rolados resultarem em 1, você comete um desastre."
  const isFumble = diceResults.length > 0 && diceResults.every((d) => d === 1);
  const effectiveThreat = Math.min(20, Math.max(12, criticalThreat || 20));
  const isCritical = chosenDie >= effectiveThreat;

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label,
    mode: 'skill',
    formulaText,
    diceResults,
    chosenDie,
    bonus,
    total,
    isCritical,
    isFumble,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

/**
 * Avalia fórmulas de dados de Ordem Paranormal:
 * Exemplos: "4d6+10", "2d8+1d6+4", "5d20+20", "1d10-2"
 */
export function rollDiceFormula(formulaInput: string, label: string = 'Rolagem de Dados'): DiceRollResult {
  const cleaned = formulaInput.replace(/\s+/g, '').toLowerCase();

  // Caso seja notação de teste de criatura/perícia como "5d20+20" ou "3d20+10"
  const skillMatch = cleaned.match(/^(\d+)d20([+\-]\d+)?$/);
  if (skillMatch) {
    const numD20 = parseInt(skillMatch[1], 10);
    const mod = skillMatch[2] ? parseInt(skillMatch[2], 10) : 0;
    return rollOrdemTest(numD20, mod, label);
  }

  const tokenRegex = /([+\-]?)(\d+)d(\d+)|([+\-]?\d+)/g;
  let match: RegExpExecArray | null;
  const allDice: number[] = [];
  let flatBonus = 0;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    if (match[2] && match[3]) {
      const sign = match[1] === '-' ? -1 : 1;
      const count = Math.min(100, Math.max(1, parseInt(match[2], 10)));
      const faces = Math.max(2, parseInt(match[3], 10));
      for (let i = 0; i < count; i++) {
        allDice.push(sign * randomInt(1, faces));
      }
    } else if (match[4]) {
      flatBonus += parseInt(match[4], 10);
    }
  }

  if (allDice.length === 0) {
    return rollOrdemTest(1, flatBonus, label);
  }

  const diceSum = allDice.reduce((acc, v) => acc + v, 0);
  const total = diceSum + flatBonus;

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label,
    mode: 'formula',
    formulaText: formulaInput.trim(),
    diceResults: allDice,
    bonus: flatBonus,
    total,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}
