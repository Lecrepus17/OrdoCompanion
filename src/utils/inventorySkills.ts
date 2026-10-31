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

export interface ActiveItemSkillBonus {
  skillName: string;
  bonus: number; // +2 or +5
  sourceItemName: string;
  itemType: 'vestimenta' | 'utensilio';
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
  const clean = skillName.trim().toLowerCase();
  return BANNED_ITEM_SKILLS.some((b) => b.toLowerCase() === clean);
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

/**
 * Calcula os bônus ativos concedidos por vestimentas e utensílios equipados no inventário.
 * Respeita:
 * 1. Teto de até 2 vestimentas ativas (Livro Base p. 63).
 * 2. Exclusão estrita de Luta e Pontaria.
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

  // 1. Filtrar vestimentas equipadas e verificar limite canônico (máx 2)
  const equippedClothes = inventory.filter(
    (item) => item.equipped && isClothingItem(item)
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
    (item) => item.equipped && isUtensilItem(item)
  );

  // Lista de itens ativos elegíveis para fornecer bônus
  const activeItems: { item: CharacterInventoryItem; itemType: 'vestimenta' | 'utensilio' }[] = [
    ...allowedClothes.map((item) => ({ item, itemType: 'vestimenta' as const })),
    ...equippedUtensils.map((item) => ({ item, itemType: 'utensilio' as const })),
  ];

  // 3. Processar bônus de perícias de cada item elegível
  for (const { item, itemType } of activeItems) {
    const processBonus = (
      skillName: string | undefined,
      bonusValue: number | undefined
    ) => {
      if (!skillName || !skillName.trim()) return;

      const cleanSkill = skillName.trim();

      // Regra de veto: Luta e Pontaria
      if (isBannedItemSkill(cleanSkill)) {
        warnings.push(
          `O item "${item.name}" tenta aplicar bônus em "${cleanSkill}", mas vestimentas e utensílios não podem conceder bônus em Luta ou Pontaria (Livro Base p. 63).`
        );
        return;
      }

      // Bônus padrão é +2 se não especificado
      const bonus = bonusValue !== undefined && bonusValue > 0 ? bonusValue : 2;

      // Regra de não-cumulatividade (Livro Base p. 63 e p. 312)
      const existing = effectiveBonuses[cleanSkill];
      if (existing) {
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

    // Bônus primário
    processBonus(item.targetSkill, item.skillBonus);

    // Bônus secundário (modificação Função Adicional)
    if (item.secondarySkill) {
      processBonus(item.secondarySkill, item.secondaryBonus || 2);
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
