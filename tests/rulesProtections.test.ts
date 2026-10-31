import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_PROTECTIONS,
  OFFICIAL_PROTECTION_MODIFICATIONS,
  calculateEquippedProtections,
  formatDamageResistances,
  getProtectionById,
  findProtectionByName,
  ProtectionItem,
} from '../src/utils/protections';

describe('Regras Canônicas de Proteções e Escudos (protections.ts)', () => {
  describe('Catálogo Oficial de Proteções (OFFICIAL_PROTECTIONS)', () => {
    it('deve conter as proteções e escudos canônicos do Livro Base e suplementos', () => {
      assert.strictEqual(OFFICIAL_PROTECTIONS.length, 5);

      const leve = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Proteção Leve');
      assert.ok(leve);
      assert.strictEqual(leve.defenseBonus, 5);
      assert.strictEqual(leve.spaces, 2);
      assert.strictEqual(leve.category, 'I');
      assert.strictEqual(leve.type, 'Leve');
      assert.strictEqual(leve.requiredProficiency, 'Proteções Leves');

      const pesada = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Proteção Pesada');
      assert.ok(pesada);
      assert.strictEqual(pesada.defenseBonus, 10);
      assert.strictEqual(pesada.spaces, 5);
      assert.strictEqual(pesada.category, 'II');
      assert.strictEqual(pesada.type, 'Pesada');
      assert.strictEqual(pesada.armorPenalty, -5);
      assert.strictEqual(pesada.damageReduction?.physical, 2);
      assert.strictEqual(pesada.requiredProficiency, 'Proteções Pesadas');

      const escudo = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Escudo');
      assert.ok(escudo);
      assert.strictEqual(escudo.defenseBonus, 2);
      assert.strictEqual(escudo.spaces, 2);
      assert.strictEqual(escudo.category, '0');
      assert.strictEqual(escudo.type, 'Escudo');
      assert.strictEqual(escudo.requiredProficiency, 'Proteções Pesadas');

      const capacete = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Capacete Tático');
      assert.ok(capacete);
      assert.strictEqual(capacete.spaces, 1);
      assert.strictEqual(capacete.category, 'II');
      assert.strictEqual(capacete.type, 'Pesada');

      const escudoLed = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Escudo Balístico LED');
      assert.ok(escudoLed);
      assert.strictEqual(escudoLed.defenseBonus, 2);
      assert.strictEqual(escudoLed.spaces, 2);
      assert.strictEqual(escudoLed.category, 'II');
      assert.strictEqual(escudoLed.damageReduction?.ballistic, 10);
      assert.strictEqual(escudoLed.requiredProficiency, 'Proteções Pesadas');
    });

    it('deve permitir busca por ID e busca por Nome', () => {
      const p1 = getProtectionById('item__livro_base__protecao_leve');
      assert.strictEqual(p1?.name, 'Proteção Leve');

      const p2 = findProtectionByName('proteção pesada');
      assert.strictEqual(p2?.id, 'item__livro_base__protecao_pesada');

      const pNone = findProtectionByName('Armadura Inexistente');
      assert.strictEqual(pNone, undefined);
    });
  });

  describe('formatDamageResistances', () => {
    it('deve retornar string vazia para dicionário vazio ou nulo', () => {
      assert.strictEqual(formatDamageResistances({}), '');
      assert.strictEqual(formatDamageResistances({ Balístico: 0 }), '');
    });

    it('deve formatar resistências físicas na ordem canônica', () => {
      const res = formatDamageResistances({
        Perfuração: 2,
        Balístico: 2,
        Impacto: 2,
        Corte: 2,
      });
      assert.strictEqual(res, 'Balístico 2, Corte 2, Impacto 2, Perfuração 2');
    });

    it('deve formatar resistências elementais e especiais', () => {
      const res = formatDamageResistances({
        Balístico: 10,
        Sangue: 5,
        Morte: 5,
      });
      assert.strictEqual(res, 'Balístico 10, Sangue 5, Morte 5');
    });
  });

  describe('calculateEquippedProtections', () => {
    const leve = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Proteção Leve')!;
    const pesada = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Proteção Pesada')!;
    const escudo = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Escudo')!;
    const escudoLed = OFFICIAL_PROTECTIONS.find((p) => p.name === 'Escudo Balístico LED')!;

    it('deve calcular corretamente para agente sem proteção nem escudo', () => {
      const res = calculateEquippedProtections(null, null);
      assert.strictEqual(res.totalDefenseEquip, 0);
      assert.strictEqual(res.totalSpaces, 0);
      assert.strictEqual(res.armorPenalty, 0);
      assert.strictEqual(res.resistancesText, '');
      assert.strictEqual(res.protectionText, '');
    });

    it('deve calcular Proteção Leve padrão (+5 Defesa, 2 espaços, sem RD e sem penalidade)', () => {
      const res = calculateEquippedProtections(leve, null);
      assert.strictEqual(res.totalDefenseEquip, 5);
      assert.strictEqual(res.totalSpaces, 2);
      assert.strictEqual(res.armorPenalty, 0);
      assert.strictEqual(res.resistancesText, '');
      assert.strictEqual(res.protectionText, 'Proteção Leve (+5 Defesa)');
    });

    it('deve calcular Proteção Leve com modificação Reforçada (+7 Defesa, 3 espaços)', () => {
      const res = calculateEquippedProtections(leve, null, ['Reforçada']);
      assert.strictEqual(res.totalDefenseEquip, 7);
      assert.strictEqual(res.totalSpaces, 3);
      assert.strictEqual(res.armorPenalty, 0);
      assert.ok(res.protectionText.includes('Reforçada (+7 Defesa)'));
    });

    it('deve calcular Proteção Leve com modificação Discreta (+5 Defesa, 1 espaço)', () => {
      const res = calculateEquippedProtections(leve, null, ['Discreta']);
      assert.strictEqual(res.totalDefenseEquip, 5);
      assert.strictEqual(res.totalSpaces, 1); // 2 - 1 = 1 espaço
      assert.ok(res.protectionText.includes('Discreta (+5 Defesa)'));
    });

    it('deve calcular Proteção Pesada padrão (+10 Defesa, 5 espaços, -5 penalidade e RD física 2)', () => {
      const res = calculateEquippedProtections(pesada, null);
      assert.strictEqual(res.totalDefenseEquip, 10);
      assert.strictEqual(res.totalSpaces, 5);
      assert.strictEqual(res.armorPenalty, -5);
      assert.strictEqual(res.resistancesText, 'Balístico 2, Corte 2, Impacto 2, Perfuração 2');
      assert.strictEqual(res.protectionText, 'Proteção Pesada (+10 Defesa, RD 2)');
    });

    it('deve calcular Proteção Pesada com modificação Blindada (RD física 5, 6 espaços)', () => {
      const res = calculateEquippedProtections(pesada, null, ['Blindada']);
      assert.strictEqual(res.totalDefenseEquip, 10);
      assert.strictEqual(res.totalSpaces, 6); // 5 + 1 = 6 espaços
      assert.strictEqual(res.armorPenalty, -5);
      assert.strictEqual(res.resistancesText, 'Balístico 5, Corte 5, Impacto 5, Perfuração 5');
      assert.ok(res.protectionText.includes('Blindada (+10 Defesa, RD 5)'));
    });

    it('deve calcular Proteção Pesada Reforçada e Blindada (+12 Defesa, 7 espaços, RD física 5)', () => {
      const res = calculateEquippedProtections(pesada, null, ['Reforçada', 'Blindada']);
      assert.strictEqual(res.totalDefenseEquip, 12);
      assert.strictEqual(res.totalSpaces, 7); // 5 + 1 + 1 = 7 espaços
      assert.strictEqual(res.armorPenalty, -5);
      assert.strictEqual(res.resistancesText, 'Balístico 5, Corte 5, Impacto 5, Perfuração 5');
    });

    it('deve calcular Escudo empunhado sozinho (+2 Defesa, 2 espaços, sem penalidade)', () => {
      const res = calculateEquippedProtections(null, escudo);
      assert.strictEqual(res.totalDefenseEquip, 2);
      assert.strictEqual(res.totalSpaces, 2);
      assert.strictEqual(res.armorPenalty, 0);
      assert.strictEqual(res.protectionText, 'Escudo (+2 Defesa)');
    });

    it('deve acumular Defesa e Espaços ao combinar Proteção Leve e Escudo (+7 Defesa, 4 espaços)', () => {
      const res = calculateEquippedProtections(leve, escudo);
      assert.strictEqual(res.totalDefenseEquip, 7);
      assert.strictEqual(res.totalSpaces, 4);
      assert.strictEqual(res.armorPenalty, 0);
      assert.strictEqual(res.protectionText, 'Proteção Leve (+5 Defesa) • Escudo (+2 Defesa)');
    });

    it('deve acumular Defesa ao combinar Proteção Pesada e Escudo (+12 Defesa, 7 espaços, RD 2)', () => {
      const res = calculateEquippedProtections(pesada, escudo);
      assert.strictEqual(res.totalDefenseEquip, 12);
      assert.strictEqual(res.totalSpaces, 7);
      assert.strictEqual(res.armorPenalty, -5);
      assert.strictEqual(res.resistancesText, 'Balístico 2, Corte 2, Impacto 2, Perfuração 2');
      assert.strictEqual(
        res.protectionText,
        'Proteção Pesada (+10 Defesa, RD 2) • Escudo (+2 Defesa)'
      );
    });

    it('deve aplicar RD máxima por tipo de dano ao combinar Proteção Pesada e Escudo Balístico LED', () => {
      // Proteção Pesada dá Balístico 2, Corte 2, Impacto 2, Perfuração 2
      // Escudo Balístico LED dá Balístico 10
      // Math.max para Balístico resulta em 10; os demais permanecem 2
      const res = calculateEquippedProtections(pesada, escudoLed);
      assert.strictEqual(res.totalDefenseEquip, 12);
      assert.strictEqual(res.totalSpaces, 7);
      assert.strictEqual(res.armorPenalty, -5);
      assert.strictEqual(res.resistancesText, 'Balístico 10, Corte 2, Impacto 2, Perfuração 2');
      assert.ok(res.protectionText.includes('Escudo Balístico LED (+2 Defesa, RD Balístico 10)'));
    });
  });
});
