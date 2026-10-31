import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateActiveItemSkillBonuses,
  isBannedItemSkill,
  isClothingItem,
  isUtensilItem,
  BANNED_ITEM_SKILLS,
} from '../src/utils/inventorySkills';
import { CharacterInventoryItem } from '../src/types/compendium';

describe('Regras Canônicas de Vestimentas, Utensílios e Perícias (inventorySkills.ts)', () => {
  describe('Veto a Luta e Pontaria (Livro Base p. 63)', () => {
    it('deve conter apenas Luta e Pontaria na lista oficial de perícias proibidas', () => {
      assert.deepStrictEqual([...BANNED_ITEM_SKILLS], ['Luta', 'Pontaria']);
      assert.strictEqual(isBannedItemSkill('Luta'), true);
      assert.strictEqual(isBannedItemSkill('luta'), true);
      assert.strictEqual(isBannedItemSkill('Pontaria'), true);
      assert.strictEqual(isBannedItemSkill('pontaria'), true);
      assert.strictEqual(isBannedItemSkill('Investigação'), false);
      assert.strictEqual(isBannedItemSkill('Furtividade'), false);
    });

    it('não deve conceder bônus para Luta ou Pontaria e deve emitir aviso explicativo', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Luvas de Couro',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Luta',
          skillBonus: 2,
        },
        {
          id: 'u1',
          name: 'Mira Laser Portátil',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'utensilio',
          targetSkill: 'Pontaria',
          skillBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.effectiveBonuses['Luta'], undefined);
      assert.strictEqual(res.effectiveBonuses['Pontaria'], undefined);
      assert.strictEqual(res.warnings.length, 2);
      assert.ok(res.warnings[0].includes('Luta ou Pontaria'));
      assert.ok(res.warnings[1].includes('Luta ou Pontaria'));
    });
  });

  describe('Identificação de Tipos de Item', () => {
    it('deve identificar vestimenta por itemType ou isVestimenta', () => {
      assert.strictEqual(
        isClothingItem({ id: '1', name: 'Casaco', category: 'I', spaces: 1, itemType: 'vestimenta' }),
        true
      );
      assert.strictEqual(
        isClothingItem({ id: '2', name: 'Casaco', category: 'I', spaces: 1, isVestimenta: true }),
        true
      );
      assert.strictEqual(
        isClothingItem({ id: '3', name: 'Corda', category: '0', spaces: 1, itemType: 'geral' }),
        false
      );
    });

    it('deve identificar utensílio por itemType ou isUtensilio', () => {
      assert.strictEqual(
        isUtensilItem({ id: '1', name: 'Lupa', category: 'I', spaces: 1, itemType: 'utensilio' }),
        true
      );
      assert.strictEqual(
        isUtensilItem({ id: '2', name: 'Lupa', category: 'I', spaces: 1, isUtensilio: true }),
        true
      );
      assert.strictEqual(
        isUtensilItem({ id: '3', name: 'Corda', category: '0', spaces: 1, itemType: 'geral' }),
        false
      );
    });
  });

  describe('Cálculo de Bônus Básicos (+2 e +5 Aprimorado)', () => {
    it('deve aplicar bônus padrão (+2) e aprimorado (+5) em perícias permitidas', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Botas Militares',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Atletismo',
          skillBonus: 2,
          justification: 'Botas ergonômicas de alta tração',
        },
        {
          id: 'v2',
          name: 'Sobretudo de Investigador Aprimorado',
          category: 'II',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Investigação',
          skillBonus: 5,
          justification: 'Bolsos estratégicos para coleta forense',
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.activeClothesCount, 2);
      assert.strictEqual(res.isOverLimit, false);
      assert.strictEqual(res.effectiveBonuses['Atletismo']?.bonus, 2);
      assert.strictEqual(res.effectiveBonuses['Atletismo']?.sourceItemName, 'Botas Militares');
      assert.strictEqual(res.effectiveBonuses['Investigação']?.bonus, 5);
      assert.strictEqual(
        res.effectiveBonuses['Investigação']?.sourceItemName,
        'Sobretudo de Investigador Aprimorado'
      );
    });

    it('não deve aplicar bônus se o item não estiver equipado (despido ou guardado)', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Botas Militares',
          category: 'I',
          spaces: 1,
          equipped: false, // Despida!
          itemType: 'vestimenta',
          targetSkill: 'Atletismo',
          skillBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.activeClothesCount, 0);
      assert.strictEqual(res.effectiveBonuses['Atletismo'], undefined);
    });
  });

  describe('Limite Canônico de 2 Vestimentas Ativas (Livro Base p. 63)', () => {
    it('deve permitir até 2 vestimentas equipadas sem alerta de limite', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Camisa Tática',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Iniciativa',
          skillBonus: 2,
        },
        {
          id: 'v2',
          name: 'Terno Elegante',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Diplomacia',
          skillBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.activeClothesCount, 2);
      assert.strictEqual(res.isOverLimit, false);
      assert.strictEqual(res.exceededClothes.length, 0);
      assert.ok(res.effectiveBonuses['Iniciativa']);
      assert.ok(res.effectiveBonuses['Diplomacia']);
    });

    it('deve desconsiderar a 3ª vestimenta equipada, marcando como excedente com aviso', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Camisa Tática',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Iniciativa',
          skillBonus: 2,
        },
        {
          id: 'v2',
          name: 'Terno Elegante',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Diplomacia',
          skillBonus: 2,
        },
        {
          id: 'v3',
          name: 'Casaco Camuflado',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Furtividade',
          skillBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.activeClothesCount, 3);
      assert.strictEqual(res.isOverLimit, true);
      assert.deepStrictEqual(res.exceededClothes, ['Casaco Camuflado']);
      // Apenas as 2 primeiras vestimentas concedem bônus:
      assert.ok(res.effectiveBonuses['Iniciativa']);
      assert.ok(res.effectiveBonuses['Diplomacia']);
      assert.strictEqual(res.effectiveBonuses['Furtividade'], undefined);
      // Alerta explicativo emitido:
      assert.ok(
        res.warnings.some((w) => w.includes('Casaco Camuflado') && w.includes('Limite canônico'))
      );
    });

    it('utensílios empunhados não devem contar contra o teto de 2 vestimentas', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Camisa Tática',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Iniciativa',
          skillBonus: 2,
        },
        {
          id: 'v2',
          name: 'Terno Elegante',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Diplomacia',
          skillBonus: 2,
        },
        {
          id: 'u1',
          name: 'Smartphone Criptografado',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'utensilio',
          targetSkill: 'Tecnologia',
          skillBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.activeClothesCount, 2); // 2 vestimentas
      assert.strictEqual(res.isOverLimit, false);
      assert.ok(res.effectiveBonuses['Iniciativa']);
      assert.ok(res.effectiveBonuses['Diplomacia']);
      assert.ok(res.effectiveBonuses['Tecnologia']);
    });
  });

  describe('Não-Cumulatividade de Itens na Mesma Perícia (Livro Base p. 63 e p. 312)', () => {
    it('deve aplicar apenas o maior bônus quando dois itens fornecerem bônus à mesma perícia', () => {
      // Exemplo canônico: Utensílio e Vestimenta ambos em Diplomacia
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Terno Elegante (+2)',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Diplomacia',
          skillBonus: 2,
        },
        {
          id: 'u1',
          name: 'Broche de Ouro Aprimorado (+5)',
          category: 'II',
          spaces: 1,
          equipped: true,
          itemType: 'utensilio',
          targetSkill: 'Diplomacia',
          skillBonus: 5,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      // Deve ter apenas 1 entrada para Diplomacia, com o maior valor (+5)
      assert.strictEqual(res.effectiveBonuses['Diplomacia']?.bonus, 5);
      assert.strictEqual(
        res.effectiveBonuses['Diplomacia']?.sourceItemName,
        'Broche de Ouro Aprimorado (+5)'
      );
      assert.ok(res.warnings.some((w) => w.includes('não cumulativo')));
    });

    it('deve manter o primeiro bônus se o segundo for de valor igual ou inferior', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Jaqueta de Couro (+2)',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Fortitude',
          skillBonus: 2,
        },
        {
          id: 'u1',
          name: 'Amuleto Protetor (+2)',
          category: 'I',
          spaces: 1,
          equipped: true,
          itemType: 'utensilio',
          targetSkill: 'Fortitude',
          skillBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.effectiveBonuses['Fortitude']?.bonus, 2);
      assert.strictEqual(res.effectiveBonuses['Fortitude']?.sourceItemName, 'Jaqueta de Couro (+2)');
      assert.ok(res.warnings.some((w) => w.includes('não se acumula')));
    });
  });

  describe('Modificação Função Adicional (Perícia Secundária)', () => {
    it('deve aplicar bônus secundário se fornecido no item', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Colete Multifuncional',
          category: 'II',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Investigação',
          skillBonus: 2,
          secondarySkill: 'Percepção',
          secondaryBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.effectiveBonuses['Investigação']?.bonus, 2);
      assert.strictEqual(res.effectiveBonuses['Percepção']?.bonus, 2);
    });

    it('deve vetar Luta/Pontaria mesmo se for na perícia secundária', () => {
      const inv: CharacterInventoryItem[] = [
        {
          id: 'v1',
          name: 'Colete Multifuncional',
          category: 'II',
          spaces: 1,
          equipped: true,
          itemType: 'vestimenta',
          targetSkill: 'Investigação',
          skillBonus: 2,
          secondarySkill: 'Luta', // Vetado!
          secondaryBonus: 2,
        },
      ];

      const res = calculateActiveItemSkillBonuses(inv);
      assert.strictEqual(res.effectiveBonuses['Investigação']?.bonus, 2);
      assert.strictEqual(res.effectiveBonuses['Luta'], undefined);
      assert.ok(res.warnings.some((w) => w.includes('Luta')));
    });
  });
});
