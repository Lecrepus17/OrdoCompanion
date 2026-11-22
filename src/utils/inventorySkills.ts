/**
 * inventorySkills.ts - Regras canônicas de Bônus de Vestimentas e Utensílios em Perícias
 * 
 * Livro Base p. 63 e p. 312:
 * - Utensílios concedem +2 em uma perícia (exceto Luta e Pontaria) quando empunhados.
 * - Vestimentas concedem +2 (ou +5 se Aprimorada) em uma perícia (exceto Luta e Pontaria).
 * - Limite canônico de no máximo duas vestimentas ativas ao mesmo tempo.
 * - Bônus de itens em uma mesma perícia não são cumulativos (aplica-se apenas o maior bônus).
 */

import { CharacterInventoryItem } from '../types/compendium';

export const CANONICAL_SKILL_NAMES: readonly string[] = [
  'Acrobacia',
  'Adestramento',
  'Artes',
  'Atletismo',
  'Atualidades',
  'Ciências',
  'Crime',
  'Diplomacia',
  'Enganação',
  'Fortitude',
  'Furtividade',
  'Iniciativa',
  'Intimidação',
  'Intuição',
  'Investigação',
  'Luta',
  'Medicina',
  'Ocultismo',
  'Percepção',
  'Pilotagem',
  'Pontaria',
  'Profissão',
  'Reflexos',
  'Religião',
  'Sobrevivência',
  'Tática',
  'Tecnologia',
  'Vontade',
];

function normalizeSkillLookupKey(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const CANONICAL_SKILL_LOOKUP = new Map<string, string>(
  CANONICAL_SKILL_NAMES.map((name) => [normalizeSkillLookupKey(name), name])
);

/**
 * Normaliza o nome de uma perícia (removendo acentos/diferenças de caixa) para o nome canônico oficial.
 */
export function resolveCanonicalSkillName(rawSkill?: string | null): string | null {
  if (!rawSkill) return null;
  const norm = normalizeSkillLookupKey(rawSkill);
  if (!norm) return null;
  const exact = CANONICAL_SKILL_LOOKUP.get(norm);
  if (exact) return exact;
  if (/^profissao\s*\([^)]+\)$/i.test(norm)) {
    return 'Profissão';
  }
  return null;
}

export interface ActiveItemSkillBonus {
  skillName: string;
  bonus: number; // +2 or +5 (or +10/+12 for special cursed items)
  sourceItemName: string;
  itemType: 'vestimenta' | 'utensilio' | 'protecao' | 'geral';
  justification?: string;
}

export interface InventorySkillBonusResult {
  effectiveBonuses: Record<string, ActiveItemSkillBonus>;
  activeClothesCount: number;
  isOverLimit: boolean;
  exceededClothes: string[];
  warnings: string[];
}

/**
 * Perícias expressamente proibidas de receber bônus de vestimenta ou utensílio pelo livro (p. 63).
 */
export const BANNED_ITEM_SKILLS: readonly string[] = ['Luta', 'Pontaria'];

/**
 * Verifica se uma perícia é proibida de receber bônus de itens (Luta e Pontaria).
 */
export function isBannedItemSkill(skillName: string): boolean {
  if (!skillName) return false;
  const clean = normalizeSkillLookupKey(skillName);
  return BANNED_ITEM_SKILLS.some((b) => normalizeSkillLookupKey(b) === clean);
}

/**
 * Identifica se um item é uma vestimenta.
 */
export function isClothingItem(item: CharacterInventoryItem): boolean {
  if (item.isVestimenta === true) return true;
  if (item.itemType === 'vestimenta') return true;
  return false;
}

/**
 * Identifica se um item é um utensílio.
 */
export function isUtensilItem(item: CharacterInventoryItem): boolean {
  if (item.isUtensilio === true) return true;
  if (item.itemType === 'utensilio') return true;
  return false;
}

function isProtectionInventoryItem(item: CharacterInventoryItem): boolean {
  if (item.itemType === 'protecao' || item.itemType === 'escudo') return true;
  if (item.id && item.id.startsWith('inv_prot_')) return true;
  return false;
}

const SITUATIONAL_SENTENCE_RX =
  /\b(?:gastar|gaste|para\s+(?:observar|identificar|se\s+passar|descer|subir|acampar|orientar|hackear|ocultar|esconder|distrair|evitar|resistir|estabilizar|arrombar|aplicar|compreender|localizar|encontrar|criar|reparar|adquirir|ajudar|escalar)|contra\s+|nessas\s+situa[çc][õo]es|enquanto\s+estiver|durante|at[ée]\s+o\s+fim|na\s+mesma\s+rodada|por\s+rodada|se\s+tiver\s+acesso|quando\s+(?:faz|passa|sofre|ataca|usa|entra|est[áa]))\b/i;

const PASSIVE_SKILL_PHRASE_RX =
  /(?:fornece|fornecem|concede|concedem|recebe|recebem)\s+\+?(\d+)\s+em\s+(?:testes\s+de\s+)?([^.;\n]+)/gi;

const TERSE_SKILL_PHRASE_RX = /\+(\d+)\s+(?:em\s+|de\s+)?([A-Za-zÀ-ÿ]+(?:\s+e\s+(?:\+\d+\s+(?:em\s+)?)?[A-Za-zÀ-ÿ]+)*)/gi;

function parseSkillListChunk(chunk: string, initialBonus: number): Array<{ skill: string; bonus: number }> {
  const truncated = chunk
    .split(
      /\s+\b(?:para|contra|exceto|se|quando|e\s+(?:resist[êe]ncia|redu[çc][ãa]o|imunidade|deslocamento|ignora|permite|pode|ocupa|n[ãa]o))\b/i
    )[0]
    .replace(/\([^)]*\)/g, '')
    .trim();

  if (!truncated) return [];

  const parts = truncated.split(/\s*(?:,|\/|\be\b)\s*/i).map((p) => p.trim()).filter(Boolean);
  const results: Array<{ skill: string; bonus: number }> = [];
  let currentBonus = initialBonus;

  for (const part of parts) {
    const bonusPrefix = part.match(/^\+?(\d+)\s+(?:em\s+)?(?:testes\s+de\s+)?(.+)$/i);
    let skillCandidate = part;
    if (bonusPrefix) {
      currentBonus = parseInt(bonusPrefix[1], 10) || currentBonus;
      skillCandidate = bonusPrefix[2].trim();
    }
    const canonical = resolveCanonicalSkillName(skillCandidate);
    if (!canonical) {
      break;
    }
    results.push({ skill: canonical, bonus: currentBonus });
  }

  return results;
}

/**
 * Extrai bônus passivos não-situacionais de perícias a partir de texto descritivo de item.
 * Ex: "Ocupa o espaço de um item vestido e fornece +2 em Religião e Vontade."
 */
export function extractPassiveItemSkillsFromText(
  text: string,
  allowTerse = false
): Array<{ skill: string; bonus: number }> {
  if (!text || !text.trim()) return [];
  const extracted: Array<{ skill: string; bonus: number }> = [];
  const sentences = text.split(/(?<=[.!?\n])\s+/);

  for (const sentence of sentences) {
    if (SITUATIONAL_SENTENCE_RX.test(sentence)) continue;

    let foundInSentence = false;
    PASSIVE_SKILL_PHRASE_RX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PASSIVE_SKILL_PHRASE_RX.exec(sentence)) !== null) {
      const val = parseInt(match[1], 10);
      if (!Number.isFinite(val) || val <= 0) continue;
      const parsed = parseSkillListChunk(match[2], val);
      if (parsed.length > 0) {
        foundInSentence = true;
        extracted.push(...parsed);
      }
    }

    if (allowTerse && !foundInSentence) {
      TERSE_SKILL_PHRASE_RX.lastIndex = 0;
      while ((match = TERSE_SKILL_PHRASE_RX.exec(sentence)) !== null) {
        const val = parseInt(match[1], 10);
        if (!Number.isFinite(val) || val <= 0) continue;
        const parsed = parseSkillListChunk(match[2], val);
        if (parsed.length > 0) {
          extracted.push(...parsed);
        }
      }
    }
  }

  return extracted;
}

function getProtectionCurseSkillBonuses(
  item: CharacterInventoryItem
): Array<{ skill: string; bonus: number }> {
  const result: Array<{ skill: string; bonus: number }> = [];
  const mods = (item.modifications || []).map((m) => normalizeSkillLookupKey(m));
  const parenMatch = item.name.match(/\(([^)]+)\)/);
  const parenTokens = parenMatch
    ? parenMatch[1].split(/[,•/]+/).map((t) => normalizeSkillLookupKey(t))
    : [];
  const allTokens = [...mods, ...parenTokens];

  if (allTokens.some((t) => t === 'curse__prot_sombria' || t === 'sombria' || t === 'maldicao: sombria')) {
    result.push({ skill: 'Furtividade', bonus: 5 });
  }
  if (allTokens.some((t) => t === 'curse__prot_lepida' || t === 'lepida' || t === 'maldicao: lepida')) {
    result.push({ skill: 'Atletismo', bonus: 10 });
  }

  return result;
}

/**
 * Calcula os bônus ativos concedidos por vestimentas, utensílios, proteções amaldiçoadas e itens equipados no inventário.
 * Respeita:
 * 1. Teto de até 2 vestimentas ativas (Livro Base p. 63).
 * 2. Exclusão estrita de Luta e Pontaria para acessórios/itens.
 * 3. Não-cumulatividade de itens na mesma perícia (aplica o maior bônus `Math.max`).
 */
export function calculateActiveItemSkillBonuses(
  inventory: CharacterInventoryItem[] = []
): InventorySkillBonusResult {
  const effectiveBonuses: Record<string, ActiveItemSkillBonus> = {};
  const warnings: string[] = [];
  const exceededClothes: string[] = [];

  if (!inventory || inventory.length === 0) {
    return {
      effectiveBonuses,
      activeClothesCount: 0,
      isOverLimit: false,
      exceededClothes,
      warnings,
    };
  }

  const isActive = (item: CharacterInventoryItem) =>
    item.equipped !== false && (item.quantity ?? 1) > 0;

  // 1. Filtrar vestimentas equipadas e verificar limite canônico (máx 2)
  const equippedClothes = inventory.filter(
    (item) => isActive(item) && isClothingItem(item)
  );

  const activeClothesCount = equippedClothes.length;
  const isOverLimit = activeClothesCount > 2;

  // As primeiras 2 vestimentas equipadas são ativas; as demais são marcadas como excedentes
  const allowedClothes = equippedClothes.slice(0, 2);
  const ignoredClothes = equippedClothes.slice(2);

  for (const item of ignoredClothes) {
    exceededClothes.push(item.name);
    warnings.push(
      `Limite canônico de 2 vestimentas ativas excedido. A vestimenta "${item.name}" foi ignorada e não concede bônus (Livro Base p. 63).`
    );
  }

  // 2. Filtrar utensílios equipados/empunhados
  const equippedUtensils = inventory.filter(
    (item) => isActive(item) && isUtensilItem(item)
  );

  // 2b. Filtrar proteções e itens operacionais/gerais equipados com bônus fixo em perícia
  const equippedOtherSkillItems = inventory.filter((item) => {
    if (!isActive(item) || isClothingItem(item) || isUtensilItem(item)) return false;
    if (isProtectionInventoryItem(item) && getProtectionCurseSkillBonuses(item).length > 0) {
      return true;
    }
    if (
      (item.mechanics || []).some(
        (m) => m.type === 'skill_bonus' && !m.isSituationalSkillBonus && Boolean(m.targetSkill)
      )
    ) {
      return true;
    }
    if ((item.customModifications || []).length > 0) return true;
    if (item.secondarySkill && item.secondarySkill.trim()) return true;
    if (item.targetSkill && item.targetSkill.trim() && (item.skillBonus ?? 0) > 0) return true;
    if (item.details && extractPassiveItemSkillsFromText(item.details).length > 0) return true;
    return false;
  });

  // Lista de itens ativos elegíveis para fornecer bônus
  const activeItems: {
    item: CharacterInventoryItem;
    itemType: 'vestimenta' | 'utensilio' | 'protecao' | 'geral';
  }[] = [
    ...allowedClothes.map((item) => ({ item, itemType: 'vestimenta' as const })),
    ...equippedUtensils.map((item) => ({ item, itemType: 'utensilio' as const })),
    ...equippedOtherSkillItems.map((item) => ({
      item,
      itemType: isProtectionInventoryItem(item) ? ('protecao' as const) : ('geral' as const),
    })),
  ];

  // 3. Processar bônus de perícias de cada item elegível
  for (const { item, itemType } of activeItems) {
    const applySingleSkillBonus = (cleanSkill: string, bonus: number) => {
      // Regra de veto: Luta e Pontaria
      if (isBannedItemSkill(cleanSkill)) {
        warnings.push(
          `O item "${item.name}" tenta aplicar bônus em "${cleanSkill}", mas vestimentas e utensílios não podem conceder bônus em Luta ou Pontaria (Livro Base p. 63).`
        );
        return;
      }

      // Regra de não-cumulatividade (Livro Base p. 63 e p. 312)
      const existing = effectiveBonuses[cleanSkill];
      if (existing) {
        if (existing.sourceItemName === item.name) {
          if (bonus > existing.bonus) {
            effectiveBonuses[cleanSkill] = {
              skillName: cleanSkill,
              bonus,
              sourceItemName: item.name,
              itemType,
              justification: item.justification,
            };
          }
          return;
        }
        if (bonus > existing.bonus) {
          warnings.push(
            `Bônus não cumulativo em ${cleanSkill}: o bônus de +${bonus} de "${item.name}" substitui o bônus de +${existing.bonus} de "${existing.sourceItemName}" (Livro Base p. 63, p. 312).`
          );
          effectiveBonuses[cleanSkill] = {
            skillName: cleanSkill,
            bonus,
            sourceItemName: item.name,
            itemType,
            justification: item.justification,
          };
        } else {
          warnings.push(
            `Bônus não cumulativo em ${cleanSkill}: o bônus de +${bonus} de "${item.name}" não se acumula com o bônus de +${existing.bonus} de "${existing.sourceItemName}" (Livro Base p. 63, p. 312).`
          );
        }
      } else {
        effectiveBonuses[cleanSkill] = {
          skillName: cleanSkill,
          bonus,
          sourceItemName: item.name,
          itemType,
          justification: item.justification,
        };
      }
    };

    const processBonus = (
      skillName: string | undefined,
      bonusValue: number | undefined
    ) => {
      if (!skillName || !skillName.trim()) return;

      const bonus = bonusValue !== undefined && bonusValue > 0 ? bonusValue : 2;
      const directCanonical = resolveCanonicalSkillName(skillName);
      if (directCanonical) {
        applySingleSkillBonus(directCanonical, bonus);
        return;
      }

      const splitParts = skillName
        .split(/\s*(?:,|\/|\be\b)\s*/i)
        .map((p) => p.trim())
        .filter(Boolean);
      const resolvedParts = splitParts
        .map((p) => resolveCanonicalSkillName(p))
        .filter((p): p is string => Boolean(p));

      if (resolvedParts.length > 0 && resolvedParts.length === splitParts.length) {
        for (const resolved of resolvedParts) {
          applySingleSkillBonus(resolved, bonus);
        }
        return;
      }

      applySingleSkillBonus(skillName.trim(), bonus);
    };

    // Bônus primário
    const isAccessory = itemType === 'vestimenta' || itemType === 'utensilio';
    const hasAprimorado = isAccessory && (item.modifications || []).includes('mod_acc_aprimorado');
    const primaryBonus = hasAprimorado ? Math.max(5, item.skillBonus || 0) : item.skillBonus;
    if (item.targetSkill && (isAccessory || (primaryBonus !== undefined && primaryBonus > 0))) {
      processBonus(item.targetSkill, primaryBonus);
    }

    // Bônus secundário (modificação Função Adicional ou 2ª perícia)
    if (item.secondarySkill) {
      processBonus(item.secondarySkill, item.secondaryBonus || 2);
    }

    // Mecânicas fixas de bônus em perícia (não-situacionais)
    const hasFixedSkillMechanic = (item.mechanics || []).some(
      (m) => m.type === 'skill_bonus' && !m.isSituationalSkillBonus && Boolean(m.targetSkill)
    );
    if (item.mechanics) {
      for (const mech of item.mechanics) {
        if (mech.type === 'skill_bonus' && !mech.isSituationalSkillBonus && mech.targetSkill) {
          processBonus(mech.targetSkill, mech.flatValue || 2);
        }
      }
    }

    // Maldições de proteções equipadas (Sombria +5 Furtividade, Lépida +10 Atletismo)
    if (itemType === 'protecao') {
      for (const protBonus of getProtectionCurseSkillBonuses(item)) {
        processBonus(protBonus.skill, protBonus.bonus);
      }
    }

    // Modificações personalizadas que concedam bônus fixo em perícia
    if (item.customModifications && item.customModifications.length > 0) {
      for (const cm of item.customModifications) {
        const cmSkills = extractPassiveItemSkillsFromText(`${cm.name}. ${cm.effect}`, true);
        for (const entry of cmSkills) {
          processBonus(entry.skill, entry.bonus);
        }
      }
    }

    // Fallback descritivo para itens com duas perícias no texto (ex.: Amuleto Sagrado: +2 em Religião e Vontade)
    if (!item.secondarySkill && item.details) {
      const extracted = extractPassiveItemSkillsFromText(item.details);
      if (!item.targetSkill && !hasFixedSkillMechanic) {
        for (const entry of extracted) {
          processBonus(entry.skill, entry.bonus);
        }
      } else if (item.targetSkill) {
        const primaryCanon = resolveCanonicalSkillName(item.targetSkill);
        if (
          primaryCanon &&
          extracted.length >= 2 &&
          extracted.some((x) => x.skill === primaryCanon)
        ) {
          for (const entry of extracted) {
            if (entry.skill !== primaryCanon) {
              processBonus(entry.skill, entry.bonus);
            }
          }
        }
      }
    }
  }

  return {
    effectiveBonuses,
    activeClothesCount,
    isOverLimit,
    exceededClothes,
    warnings,
  };
}
