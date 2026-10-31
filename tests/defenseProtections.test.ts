import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import ProtectionModal, {
  ProtectionApplyPayload,
  EquippedProtectionItemPayload,
} from '../src/components/ProtectionModal';
import { CharacterSheet, CharacterInventoryItem } from '../src/types/compendium';
import {
  calculateEquippedProtections,
  OFFICIAL_PROTECTIONS,
  formatDamageResistances,
} from '../src/utils/protections';

describe('Assistente de Proteções e Defesa na Ficha (Milestone 2 - R1)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('1. Regras e Cálculos do Assistente de Proteções', () => {
    const leve = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Proteção Leve')!;
    const pesada = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Proteção Pesada')!;
    const escudo = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Escudo')!;
    const escudoLed = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Escudo Balístico LED')!;

    test('deve calcular corretamente bônus e carga para Proteção Leve (+5 Defesa, 2 espaços)', () => {
      const res = calculateEquippedProtections(leve, null, []);
      assert.strictEqual(res.totalDefenseEquip, 5);
      assert.strictEqual(res.totalSpaces, 2);
      assert.strictEqual(res.resistancesText, '');
      assert.strictEqual(res.protectionText, 'Proteção Leve (+5 Defesa)');
      assert.strictEqual(res.armorPenalty, 0);
    });

    test('deve calcular corretamente Proteção Pesada (+10 Defesa, 5 espaços, RD física 2, -5 penalidade)', () => {
      const res = calculateEquippedProtections(pesada, null, []);
      assert.strictEqual(res.totalDefenseEquip, 10);
      assert.strictEqual(res.totalSpaces, 5);
      assert.strictEqual(res.resistancesText, 'Balístico 2, Corte 2, Impacto 2, Perfuração 2');
      assert.strictEqual(res.protectionText, 'Proteção Pesada (+10 Defesa, RD 2)');
      assert.strictEqual(res.armorPenalty, -5);
    });

    test('deve aplicar modificação Reforçada (+2 Defesa, +1 espaço) em Proteção Leve', () => {
      const res = calculateEquippedProtections(leve, null, ['Reforçada']);
      assert.strictEqual(res.totalDefenseEquip, 7);
      assert.strictEqual(res.totalSpaces, 3);
      assert.ok(res.protectionText.includes('Reforçada (+7 Defesa)'));
    });

    test('deve aplicar modificação Blindada (RD 5, +1 espaço) em Proteção Pesada', () => {
      const res = calculateEquippedProtections(pesada, null, ['Blindada']);
      assert.strictEqual(res.totalDefenseEquip, 10);
      assert.strictEqual(res.totalSpaces, 6);
      assert.strictEqual(res.resistancesText, 'Balístico 5, Corte 5, Impacto 5, Perfuração 5');
      assert.ok(res.protectionText.includes('Blindada (+10 Defesa, RD 5)'));
    });

    test('deve combinar Proteção Pesada Reforçada e Blindada com Escudo Balístico LED (+14 Defesa, 9 espaços)', () => {
      const res = calculateEquippedProtections(pesada, escudoLed, ['Reforçada', 'Blindada']);
      assert.strictEqual(res.totalDefenseEquip, 14); // 10 + 2 (Reforcada) + 2 (Escudo)
      assert.strictEqual(res.totalSpaces, 9); // 5 (pesada) + 1 + 1 + 2 (escudo)
      // RD Balístico 10 (do escudo) e Corte 5, Impacto 5, Perfuração 5 (da blindada)
      assert.strictEqual(res.resistancesText, 'Balístico 10, Corte 5, Impacto 5, Perfuração 5');
      assert.ok(res.protectionText.includes('Proteção Pesada Reforçada Blindada (+12 Defesa, RD 5)'));
      assert.ok(res.protectionText.includes('Escudo Balístico LED (+2 Defesa, RD Balístico 10)'));
    });
  });

  describe('2. Sincronização da Ficha: Defesa Total, RD e Carga do Inventário', () => {
    function computeTotalDefense(char: CharacterSheet): number {
      return (
        10 +
        (char.attributes?.AGI || 0) +
        (char.defenseEquip || 0) +
        (char.defenseOther || 0)
      );
    }

    function computeCurrentLoad(char: CharacterSheet): number {
      return (char.inventory || []).reduce((acc, it) => acc + (it.spaces || 0), 0);
    }

    function applyProtectionsToSheet(
      char: CharacterSheet,
      payload: ProtectionApplyPayload
    ): CharacterSheet {
      // 1. Limpar proteções anteriores gerenciadas pelo assistente
      const existing = char.inventory || [];
      const cleanInventory = existing.filter(
        (item) =>
          !(
            item.itemType === 'protecao' ||
            item.itemType === 'escudo' ||
            (item.id && item.id.startsWith('inv_prot_')) ||
            (item.equipped &&
              (item.name.toLowerCase().includes('proteção leve') ||
                item.name.toLowerCase().includes('proteção pesada') ||
                item.name.toLowerCase().includes('escudo') ||
                item.name.toLowerCase().includes('capacete tático')))
          )
      );

      // 2. Adicionar novos itens de proteção
      const newItems: CharacterInventoryItem[] = payload.equippedItems.map((it, idx) => ({
        id: `inv_prot_${Date.now()}_${idx}`,
        name: it.name,
        category: it.category,
        spaces: it.spaces,
        details: it.details,
        equipped: true,
        itemType: it.itemType,
      }));

      const updatedInventory = [...cleanInventory, ...newItems];

      return {
        ...char,
        defenseEquip: payload.defenseEquip,
        defenseBonus: payload.defenseEquip + (char.defenseOther || 0),
        resistances: payload.resistancesText,
        protection: payload.protectionText,
        inventory: updatedInventory,
      };
    }

    test('deve equipar Proteção Leve, atualizar defenseEquip e sincronizar espaços no inventário', () => {
      const baseSheet: CharacterSheet = {
        id: 'char_1',
        name: 'Agente Arthur',
        player: 'Player 1',
        nex: 10,
        rank: 'Recruta',
        originId: 'orig_policial',
        classId: 'cls_combatente',
        trackId: 'trk_guerreiro',
        affinity: 'Nenhum',
        attributes: { AGI: 3, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
        pvCurrent: 24,
        pvMax: 24,
        peCurrent: 6,
        peMax: 6,
        sanCurrent: 15,
        sanMax: 15,
        defenseBonus: 0,
        defenseEquip: 0,
        defenseOther: 0,
        protection: '',
        resistances: '',
        skills: {},
        attacks: [],
        abilities: [],
        inventory: [],
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      };

      assert.strictEqual(computeTotalDefense(baseSheet), 13); // 10 + 3 + 0 + 0
      assert.strictEqual(computeCurrentLoad(baseSheet), 0);

      // Equipar Proteção Leve
      const payloadLeve: ProtectionApplyPayload = {
        defenseEquip: 5,
        resistancesText: '',
        protectionText: 'Proteção Leve (+5 Defesa)',
        equippedItems: [
          {
            name: 'Proteção Leve',
            category: 'I',
            spaces: 2,
            details: 'Proteção Corporal (Leve) • Defesa +5',
            itemType: 'protecao',
            isBodyArmor: true,
          },
        ],
        armorPenalty: 0,
        totalSpaces: 2,
      };

      const updatedSheet = applyProtectionsToSheet(baseSheet, payloadLeve);

      assert.strictEqual(updatedSheet.defenseEquip, 5);
      assert.strictEqual(computeTotalDefense(updatedSheet), 18); // 10 + 3 + 5 + 0
      assert.strictEqual(updatedSheet.protection, 'Proteção Leve (+5 Defesa)');
      assert.strictEqual(updatedSheet.resistances, '');
      assert.strictEqual(computeCurrentLoad(updatedSheet), 2);
      assert.strictEqual(updatedSheet.inventory?.length, 1);
      assert.strictEqual(updatedSheet.inventory?.[0].equipped, true);
    });

    test('ao trocar Proteção Leve por Proteção Pesada e Escudo, deve substituir itens e recalcular carga', () => {
      const initialSheet: CharacterSheet = {
        id: 'char_2',
        name: 'Agente Joui',
        player: 'Player 2',
        nex: 20,
        rank: 'Operador',
        originId: 'orig_atleta',
        classId: 'cls_combatente',
        trackId: 'trk_guerreiro',
        affinity: 'Nenhum',
        attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 1, VIG: 3 },
        pvCurrent: 35,
        pvMax: 35,
        peCurrent: 10,
        peMax: 10,
        sanCurrent: 18,
        sanMax: 18,
        defenseBonus: 5,
        defenseEquip: 5,
        defenseOther: 1,
        protection: 'Proteção Leve (+5 Defesa)',
        resistances: '',
        skills: {},
        attacks: [],
        abilities: [],
        inventory: [
          {
            id: 'inv_prot_old',
            name: 'Proteção Leve',
            category: 'I',
            spaces: 2,
            details: 'Antiga',
            equipped: true,
            itemType: 'protecao',
          },
          {
            id: 'inv_other_item',
            name: 'Lanterna Tática',
            category: '0',
            spaces: 1,
            details: 'Ilumina',
          },
        ],
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      };

      assert.strictEqual(computeTotalDefense(initialSheet), 18); // 10 + 2 + 5 + 1
      assert.strictEqual(computeCurrentLoad(initialSheet), 3); // 2 + 1

      // Trocar por Proteção Pesada (+10 Defesa, 5 esp., RD 2) + Escudo (+2 Defesa, 2 esp.)
      const payloadPesadaEscudo: ProtectionApplyPayload = {
        defenseEquip: 12,
        resistancesText: 'Balístico 2, Corte 2, Impacto 2, Perfuração 2',
        protectionText: 'Proteção Pesada (+10 Defesa, RD 2) • Escudo (+2 Defesa)',
        equippedItems: [
          {
            name: 'Proteção Pesada',
            category: 'II',
            spaces: 5,
            details: 'Proteção Corporal (Pesada) • Defesa +10 • RD: Balístico 2, Corte 2, Impacto 2, Perfuração 2',
            itemType: 'protecao',
            isBodyArmor: true,
          },
          {
            name: 'Escudo',
            category: '0',
            spaces: 2,
            details: 'Escudo • Defesa +2',
            itemType: 'escudo',
            isShield: true,
          },
        ],
        armorPenalty: -5,
        totalSpaces: 7,
      };

      const updated = applyProtectionsToSheet(initialSheet, payloadPesadaEscudo);

      assert.strictEqual(updated.defenseEquip, 12);
      assert.strictEqual(computeTotalDefense(updated), 25); // 10 + 2 (AGI) + 12 (Equip) + 1 (Other)
      assert.strictEqual(updated.resistances, 'Balístico 2, Corte 2, Impacto 2, Perfuração 2');
      assert.strictEqual(
        updated.protection,
        'Proteção Pesada (+10 Defesa, RD 2) • Escudo (+2 Defesa)'
      );

      // Carga: 1 (Lanterna) + 5 (Pesada) + 2 (Escudo) = 8
      assert.strictEqual(computeCurrentLoad(updated), 8);
      // Item não relacionado ao assistente deve ser preservado
      assert.ok(updated.inventory?.some((x) => x.name === 'Lanterna Tática'));
      // A proteção leve antiga deve ter sido removida
      assert.ok(!updated.inventory?.some((x) => x.name === 'Proteção Leve'));
    });

    test('ao desequipar tudo, deve zerar defenseEquip, RD, descrição e remover proteções do inventário', () => {
      const equippedSheet: CharacterSheet = {
        id: 'char_3',
        name: 'Agente Cesar',
        player: 'Player 3',
        nex: 15,
        rank: 'Recruta',
        originId: 'orig_tior',
        classId: 'cls_especialista',
        trackId: 'trk_tecnico',
        affinity: 'Nenhum',
        attributes: { AGI: 4, FOR: 1, INT: 3, PRE: 2, VIG: 1 },
        pvCurrent: 20,
        pvMax: 20,
        peCurrent: 12,
        peMax: 12,
        sanCurrent: 24,
        sanMax: 24,
        defenseBonus: 7,
        defenseEquip: 7,
        defenseOther: 2,
        protection: 'Proteção Leve Reforçada (+7 Defesa)',
        resistances: '',
        skills: {},
        attacks: [],
        abilities: [],
        inventory: [
          {
            id: 'inv_prot_1',
            name: 'Proteção Leve Reforçada',
            category: 'II',
            spaces: 3,
            equipped: true,
            itemType: 'protecao',
          },
        ],
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      };

      assert.strictEqual(computeTotalDefense(equippedSheet), 23); // 10 + 4 + 7 + 2
      assert.strictEqual(computeCurrentLoad(equippedSheet), 3);

      // Desequipar tudo
      const emptyPayload: ProtectionApplyPayload = {
        defenseEquip: 0,
        resistancesText: '',
        protectionText: '',
        equippedItems: [],
        armorPenalty: 0,
        totalSpaces: 0,
      };

      const unequipped = applyProtectionsToSheet(equippedSheet, emptyPayload);

      assert.strictEqual(unequipped.defenseEquip, 0);
      assert.strictEqual(computeTotalDefense(unequipped), 16); // 10 + 4 + 0 + 2 (defenseOther preservado!)
      assert.strictEqual(unequipped.protection, '');
      assert.strictEqual(unequipped.resistances, '');
      assert.strictEqual(computeCurrentLoad(unequipped), 0);
      assert.strictEqual(unequipped.inventory?.length, 0);
    });

    test('steppers manuais de defenseEquip e defenseOther devem funcionar mantendo cálculo fiel', () => {
      let sheet: CharacterSheet = {
        id: 'char_4',
        name: 'Milo',
        player: 'Player 4',
        nex: 5,
        rank: 'Recruta',
        originId: 'orig_investigador',
        classId: 'cls_especialista',
        trackId: 'trk_perito',
        affinity: 'Nenhum',
        attributes: { AGI: 2, FOR: 1, INT: 3, PRE: 2, VIG: 2 },
        pvCurrent: 18,
        pvMax: 18,
        peCurrent: 8,
        peMax: 8,
        sanCurrent: 20,
        sanMax: 20,
        defenseBonus: 5,
        defenseEquip: 5,
        defenseOther: 0,
        protection: 'Proteção Leve (+5 Defesa)',
        resistances: '',
        skills: {},
        attacks: [],
        abilities: [],
        inventory: [],
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      };

      assert.strictEqual(computeTotalDefense(sheet), 17); // 10 + 2 + 5 + 0

      // Ajuste manual: Mestre concede +2 de cobertura temporária (defenseOther)
      sheet = { ...sheet, defenseOther: (sheet.defenseOther || 0) + 2 };
      assert.strictEqual(sheet.defenseOther, 2);
      assert.strictEqual(computeTotalDefense(sheet), 19); // 10 + 2 + 5 + 2

      // Ajuste manual: Bônus de equipamento ajustado em +1 por modificação caseira
      sheet = { ...sheet, defenseEquip: (sheet.defenseEquip || 0) + 1 };
      assert.strictEqual(sheet.defenseEquip, 6);
      assert.strictEqual(computeTotalDefense(sheet), 20); // 10 + 2 + 6 + 2
    });
  });

  describe('3. Componente ProtectionModal (Interface e Interações)', () => {
    test('deve renderizar o modal com opções oficiais e resumo de cálculo em tempo real', async () => {
      let appliedPayload: ProtectionApplyPayload | null = null;
      let closed = false;

      const element = React.createElement(ProtectionModal, {
        visible: true,
        onClose: () => {
          closed = true;
        },
        onApply: (payload) => {
          appliedPayload = payload;
        },
        character: null,
      });

      const { getByText, getByTestId } = await renderWithProviders(element);

      // Título do modal
      assert.ok(getByText('Assistente de Proteções'));
      // Seções
      assert.ok(getByText(/1\. Proteção Corporal/i));
      assert.ok(getByText(/3\. Escudo Tático/i));
      assert.ok(getByText(/Resumo Tático dos Cálculos/i));

      // Selecionar Proteção Leve
      const btnLeve = getByTestId('btn-armor-leve');
      await fireClick(btnLeve);

      // Deve exibir modificação Reforçada
      assert.ok(getByTestId('mod-reforcada'));

      // Aplicar modificação Reforçada
      await fireClick(getByTestId('mod-reforcada'));

      // Selecionar Escudo
      const btnEscudo = getByTestId('btn-shield-escudo');
      await fireClick(btnEscudo);

      // Clicar em Equipar e Salvar
      const btnApply = getByTestId('btn-apply-protections');
      await fireClick(btnApply);

      assert.ok(appliedPayload !== null);
      // Leve (5) + Reforçada (2) + Escudo (2) = 9
      assert.strictEqual((appliedPayload as any).defenseEquip, 9);
      // Espaços: Leve (2) + Reforçada (1) + Escudo (2) = 5
      assert.strictEqual((appliedPayload as any).totalSpaces, 5);
      assert.strictEqual((appliedPayload as any).equippedItems.length, 2);
    });

    test('deve calcular Proteção Pesada Blindada com RD 5 e alertar penalidade de carga', async () => {
      let appliedPayload: ProtectionApplyPayload | null = null;

      const element = React.createElement(ProtectionModal, {
        visible: true,
        onClose: () => {},
        onApply: (payload) => {
          appliedPayload = payload;
        },
        character: null,
      });

      const { getByText, getByTestId } = await renderWithProviders(element);

      // Selecionar Proteção Pesada
      await fireClick(getByTestId('btn-armor-pesada'));

      // Deve exibir modificação Blindada para armadura pesada
      const modBlindada = getByTestId('mod-blindada');
      assert.ok(modBlindada);
      await fireClick(modBlindada);

      // Deve alertar sobre a penalidade de carga (-5)
      assert.ok(getByText(/Penalidade de Carga: -5 em Acrobacia/i));

      // Salvar
      await fireClick(getByTestId('btn-apply-protections'));

      assert.ok(appliedPayload !== null);
      assert.strictEqual((appliedPayload as any).defenseEquip, 10);
      assert.strictEqual(
        (appliedPayload as any).resistancesText,
        'Balístico 5, Corte 5, Impacto 5, Perfuração 5'
      );
      assert.strictEqual((appliedPayload as any).armorPenalty, -5);
      assert.strictEqual((appliedPayload as any).totalSpaces, 6); // 5 + 1
    });

    test('botão Desequipar Tudo deve limpar seleções', async () => {
      let appliedPayload: ProtectionApplyPayload | null = null;

      const element = React.createElement(ProtectionModal, {
        visible: true,
        onClose: () => {},
        onApply: (payload) => {
          appliedPayload = payload;
        },
        character: {
          id: 'test_char',
          name: 'Teste',
          player: 'P',
          nex: 10,
          rank: 'Recruta',
          originId: '',
          classId: '',
          trackId: '',
          affinity: 'Nenhum',
          attributes: { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 },
          pvCurrent: 10,
          pvMax: 10,
          peCurrent: 5,
          peMax: 5,
          sanCurrent: 10,
          sanMax: 10,
          defenseBonus: 5,
          defenseEquip: 5,
          defenseOther: 0,
          protection: 'Proteção Leve (+5 Defesa)',
          resistances: '',
          skills: {},
          attacks: [],
          abilities: [],
          inventory: [],
          entityIds: [],
          notes: '',
          updatedAt: new Date().toISOString(),
        },
      });

      const { getByTestId } = await renderWithProviders(element);

      // Clicar em Desequipar Tudo
      await fireClick(getByTestId('btn-clear-protections'));

      // Salvar
      await fireClick(getByTestId('btn-apply-protections'));

      assert.ok(appliedPayload !== null);
      assert.strictEqual((appliedPayload as any).defenseEquip, 0);
      assert.strictEqual((appliedPayload as any).resistancesText, '');
      assert.strictEqual((appliedPayload as any).protectionText, '');
      assert.strictEqual((appliedPayload as any).totalSpaces, 0);
      assert.strictEqual((appliedPayload as any).equippedItems.length, 0);
    });
  });
});
