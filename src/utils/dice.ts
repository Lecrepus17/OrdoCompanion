import AsyncStorage from '@react-native-async-storage/async-storage';
import { CriticalDamageMode, DiceRollResult, WeaponAttackContext } from '../types/compendium';
import { parseCritical } from './weapons';

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
  criticalThreat: number = 20,
  attackContext?: WeaponAttackContext
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
    attackContext,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

/**
 * Avalia fórmulas de dados de Ordem Paranormal:
 * Exemplos: "4d6+10", "2d8+1d6+4", "5d20+20", "1d10-2"
 */
export function rollDiceFormula(
  formulaInput: string,
  label: string = 'Rolagem de Dados',
  attackContext?: WeaponAttackContext
): DiceRollResult {
  const cleaned = formulaInput.replace(/\s+/g, '').toLowerCase();

  // Caso seja notação de teste de criatura/perícia como "5d20+20" ou "3d20+10"
  const skillMatch = cleaned.match(/^(\d+)d20([+\-]\d+)?$/);
  if (skillMatch) {
    const numD20 = parseInt(skillMatch[1], 10);
    const mod = skillMatch[2] ? parseInt(skillMatch[2], 10) : 0;
    return rollOrdemTest(numD20, mod, label, 20, attackContext);
  }

  const tokenRegex = /([+\-]?)(\d*)d(\d+)|([+\-]?\d+)/g;
  let match: RegExpExecArray | null;
  const allDice: number[] = [];
  let flatBonus = 0;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    if (match[3]) {
      const sign = match[1] === '-' ? -1 : 1;
      const count = match[2] ? Math.min(100, Math.max(1, parseInt(match[2], 10))) : 1;
      const faces = Math.max(2, parseInt(match[3], 10));
      for (let i = 0; i < count; i++) {
        allDice.push(sign * randomInt(1, faces));
      }
    } else if (match[4]) {
      flatBonus += parseInt(match[4], 10);
    }
  }

  if (allDice.length === 0) {
    return rollOrdemTest(1, flatBonus, label, 20, attackContext);
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
    attackContext,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

/**
 * Expande a fórmula de dano multiplicando a quantidade de dados base pelo multiplicador de crítico.
 * Regra oficial de Ordem Paranormal v1.1 (p. 56 e p. 84).
 * Ex: "1d8+2" com x2 -> "2d8+2"
 * Ex: "2d6+4" com x3 -> "6d6+4"
 * Ex: "d12" com x2 -> "2d12"
 */
export function expandFormulaForCritical(formula: string, multiplier: number): string {
  const mult = Math.max(1, multiplier || 2);
  const trimmed = formula.trim();

  // Multiplica apenas o primeiro bloco de dados base da arma (dados extras de maldições/habilidades não multiplicam)
  const firstDiceRegex = /^(\d*)d(\d+)(.*)$/i;
  const match = trimmed.match(firstDiceRegex);
  if (match) {
    const rawCount = match[1] ? parseInt(match[1], 10) : 1;
    const count = Math.max(1, rawCount) * mult;
    const die = match[2];
    const rest = match[3] || '';
    return `${count}d${die}${rest}`;
  }

  return formula;
}

/**
 * Calcula o dano máximo de uma fórmula de dados sem rolar aleatório.
 * Cada dado assume sua face máxima (ex: d8 vira 8, d6 vira 6).
 */
export function calculateMaxDamageForFormula(formula: string): { diceResults: number[]; bonus: number; total: number } {
  const cleaned = formula.replace(/\s+/g, '').toLowerCase();
  const tokenRegex = /([+\-]?)(\d*)d(\d+)|([+\-]?\d+)/g;
  let match: RegExpExecArray | null;
  const allDice: number[] = [];
  let flatBonus = 0;

  while ((match = tokenRegex.exec(cleaned)) !== null) {
    if (match[3]) {
      const sign = match[1] === '-' ? -1 : 1;
      const count = match[2] ? Math.min(100, Math.max(1, parseInt(match[2], 10))) : 1;
      const faces = Math.max(2, parseInt(match[3], 10));
      for (let i = 0; i < count; i++) {
        allDice.push(sign * faces);
      }
    } else if (match[4]) {
      flatBonus += parseInt(match[4], 10);
    }
  }

  const diceSum = allDice.reduce((acc, v) => acc + v, 0);
  return {
    diceResults: allDice,
    bonus: flatBonus,
    total: diceSum + flatBonus,
  };
}

export interface WeaponDamageRollOptions {
  weaponName: string;
  damage: string; // Ex: "2d6", "1d8+2", "3d6+2 + 2d6"
  critical: string; // Ex: "19/x3", "20/x2", "x3"
  isCrit?: boolean;
  isMaxDamage?: boolean;
  mode?: CriticalDamageMode; // 'multiply_dice' (padrão oficial v1.1) | 'multiply_damage'
  customLabel?: string;
  attackContext?: WeaponAttackContext;
}

/**
 * Rolagem de dano de arma com suporte aos dois modos de crítico e ao crítico máximo:
 * - Modo 'multiply_damage' (Padrão): Rola menos dados da base e multiplica o total pelo multiplicador do crítico.
 * - Modo 'multiply_dice' (Regra Canônica v1.1): Multiplica a quantidade de dados rolados da arma base.
 * - 'isMaxDamage': Dano Máximo (quando cai 20 no teste de ataque ou botão de Crítico Máximo), sem aleatoriedade.
 */
export function rollWeaponDamage(options: WeaponDamageRollOptions): DiceRollResult {
  const {
    weaponName,
    damage,
    critical,
    isCrit = false,
    isMaxDamage = false,
    mode = 'multiply_dice',
    customLabel,
    attackContext,
  } = options;

  const parsedCrit = parseCritical(critical);
  const mult = parsedCrit.mult || 2;
  const cleanDamage = (damage || '1d6').trim();

  // Contexto de ataque salvo no resultado da rolagem para re-rolagens rápidas
  const effectiveAttackContext: WeaponAttackContext = attackContext || {
    weaponName,
    damage: cleanDamage,
    critical,
  };

  // Se a arma possui apenas dano estático (sem dados "d"), resolve aritmeticamente
  const hasDice = /d\d+/i.test(cleanDamage);
  if (!hasDice) {
    const flatVal = parseInt(cleanDamage, 10) || 0;
    const isCriticalHit = isCrit || isMaxDamage || mode === 'max_damage';
    const total = isCriticalHit && (mode === 'multiply_damage' || mode === 'max_damage' || isMaxDamage)
      ? flatVal * mult
      : flatVal;

    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: customLabel || (isCriticalHit ? `Dano CRÍTICO de ${weaponName} (x${mult})` : `Dano de ${weaponName}`),
      mode: 'formula',
      formulaText: isCriticalHit ? `${cleanDamage} (x${mult}) = ${total}` : `${cleanDamage}`,
      diceResults: [],
      bonus: total,
      total,
      isCritical: isCriticalHit,
      isMaxDamage: isMaxDamage || mode === 'max_damage',
      attackContext: effectiveAttackContext,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
  }

  // 1. CRÍTICO MÁXIMO (quando cai 20 no teste de ataque, acionado diretamente ou modo max_damage)
  const shouldDoMaxDamage = isMaxDamage || (isCrit && mode === 'max_damage');
  if (shouldDoMaxDamage) {
    if (mode === 'multiply_damage') {
      // mode === 'multiply_damage' (menos dados, multiplica o total máximo)
      const baseCalc = calculateMaxDamageForFormula(cleanDamage);
      const critTotal = baseCalc.total * mult;
      return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label: customLabel || `CRÍTICO MÁXIMO de ${weaponName} (x${mult})`,
        mode: 'formula',
        formulaText: `${cleanDamage} (Máximo x${mult}) = ${baseCalc.total} x ${mult}`,
        diceResults: baseCalc.diceResults,
        bonus: baseCalc.bonus,
        total: critTotal,
        isCritical: true,
        isMaxDamage: true,
        attackContext: effectiveAttackContext,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } else {
      // mode === 'multiply_dice' ou 'max_damage' (multiplica dados e maximiza)
      const expanded = expandFormulaForCritical(cleanDamage, mult);
      const maxCalc = calculateMaxDamageForFormula(expanded);
      return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label: customLabel || `CRÍTICO MÁXIMO de ${weaponName} (x${mult})`,
        mode: 'formula',
        formulaText: `${expanded} (Máximo)`,
        diceResults: maxCalc.diceResults,
        bonus: maxCalc.bonus,
        total: maxCalc.total,
        isCritical: true,
        isMaxDamage: true,
        attackContext: effectiveAttackContext,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    }
  }

  // 2. CRÍTICO NORMAL
  if (isCrit) {
    if (mode === 'multiply_dice') {
      const expanded = expandFormulaForCritical(cleanDamage, mult);
      const rollRes = rollDiceFormula(
        expanded,
        customLabel || `Dano CRÍTICO de ${weaponName} (x${mult})`,
        effectiveAttackContext
      );
      return {
        ...rollRes,
        isCritical: true,
        attackContext: effectiveAttackContext,
      };
    } else {
      // mode === 'multiply_damage' (Padrão: rola dados normais e multiplica o total obtido)
      const baseRoll = rollDiceFormula(
        cleanDamage,
        customLabel || `Dano CRÍTICO de ${weaponName} (x${mult})`,
        effectiveAttackContext
      );
      const critTotal = baseRoll.total * mult;
      return {
        ...baseRoll,
        label: customLabel || `Dano CRÍTICO de ${weaponName} (x${mult})`,
        formulaText: `${cleanDamage} (x${mult} Dano) = ${baseRoll.total} x ${mult}`,
        total: critTotal,
        isCritical: true,
        attackContext: effectiveAttackContext,
      };
    }
  }

  // 3. DANO NORMAL
  const normalRoll = rollDiceFormula(
    cleanDamage,
    customLabel || `Dano de ${weaponName}`,
    effectiveAttackContext
  );
  return {
    ...normalRoll,
    attackContext: effectiveAttackContext,
  };
}

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
 */
export function isValidDiceFormula(formula: string): boolean {
  if (!formula || typeof formula !== 'string') return false;
  const clean = formula.trim().toLowerCase();
  if (clean.length === 0 || clean.length > 50) return false;

  if (/[^0-9d+\-\s]/.test(clean)) return false;
  if (!/\b(\d*d\d+)\b/.test(clean)) return false;

  const tokens = clean.split(/(?=[+\-])/).map((t) => t.trim().replace(/^[+\-]/, '').trim());
  for (const t of tokens) {
    if (!t) return false;
    const isDice = /^(\d+)?d(\d+)$/.test(t);
    const isFixed = /^[+\-]?\d+$/.test(t);
    if (!isDice && !isFixed) return false;

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
