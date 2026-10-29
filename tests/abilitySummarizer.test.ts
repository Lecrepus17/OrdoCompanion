import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAbilityKey,
  summarizeAbility,
  summarizeAttackCritSpec,
  getDescStyle,
  CANONICAL_ABILITY_SUMMARIES,
  buildRuleBasedSummary,
} from '../src/utils/abilitySummarizer';

describe('Resumo e Compactação de Habilidades e Armas (abilitySummarizer.ts)', () => {
  it('deve normalizar chaves de habilidades removendo acentos e sufixos de NEX', () => {
    assert.strictEqual(normalizeAbilityKey('Ataque Especial (NEX 5%)'), 'ataqueespecial');
    assert.strictEqual(normalizeAbilityKey('Segurar o Gatilho'), 'segurarogatilho');
    assert.strictEqual(normalizeAbilityKey('Técnica Secreta (NEX 40%)'), 'tecnicasecreta');
    assert.strictEqual(normalizeAbilityKey('Aniquilador (Combatente)'), 'aniquilador');
  });

  it('deve conter resumos canônicos oficiais e todos com <= 68 caracteres', () => {
    assert.ok(Object.keys(CANONICAL_ABILITY_SUMMARIES).length > 200);
    for (const [key, val] of Object.entries(CANONICAL_ABILITY_SUMMARIES)) {
      assert.ok(
        val.length <= 68,
        `Resumo "${key}" excede limite: ${val.length} caracteres ("${val}")`
      );
      assert.ok(val.trim().length > 0, `Resumo "${key}" está vazio`);
    }
  });

  describe('summarizeAbility', () => {
    it('deve resumir habilidades de classes canônicas', () => {
      assert.strictEqual(
        summarizeAbility('Ataque Especial (NEX 5%)'),
        'Gaste 2 PE para +5 no teste de ataque ou no dano.'
      );
      assert.strictEqual(
        summarizeAbility('Eclético'),
        'Gaste 2 PE para receber bônus de Treinado em perícia.'
      );
      assert.strictEqual(
        summarizeAbility('Escolhido pelo Outro Lado'),
        'Inicia com 3 rituais de 1º círculo; +1 por avanço.'
      );
    });

    it('deve resumir poderes de origens canônicas', () => {
      assert.strictEqual(
        summarizeAbility('Saber é Poder', 'Quando faz um teste usando Intelecto...'),
        'Gaste 2 PE para +5 em teste de Intelecto.'
      );
      assert.strictEqual(
        summarizeAbility('Técnica Medicinal'),
        'Soma Intelecto no total de PV curados.'
      );
      assert.strictEqual(
        summarizeAbility('Patrulha'),
        '+2 na Defesa.'
      );
    });

    it('deve resumir rituais canônicos destacando o efeito mecânico', () => {
      assert.strictEqual(
        summarizeAbility('Alterar Destino'),
        '+15 em teste de resistência ou na Defesa contra um ataque.'
      );
      assert.strictEqual(
        summarizeAbility('Decadência'),
        'Causa 2d8+2 de dano de Morte com espirais negras.'
      );
      assert.strictEqual(
        summarizeAbility('Armadura de Sangue'),
        'Recebe +5 na Defesa (cumulativo com proteções).'
      );
      assert.strictEqual(
        summarizeAbility('Cicatrização'),
        'Cura 3d8+3 PV em um ser tocado.'
      );
    });

    it('deve aplicar resumo heurístico em habilidades customizadas muito longas', () => {
      const longCustom =
        'Quando faz um teste de Pontaria, você pode gastar 2 PE para receber +5 nesse teste para compensar o recuo da arma.';
      const res = summarizeAbility('Tiro Certeiro Custom', longCustom);
      assert.ok(res.length <= 68);
      assert.ok(res.includes('Gaste 2 PE para +5 em teste de Pontaria'));
    });
  });

  describe('summarizeAttackCritSpec', () => {
    it('deve abreviar e formatar ataques corpo a corpo com CaC e tipo de dano', () => {
      const formatted = summarizeAttackCritSpec({
        critical: '19/x2',
        range: 'Corpo a corpo',
        special: 'Corte • Duas mãos',
      });
      assert.strictEqual(formatted, '19/x2 • CaC • Corte • Duas mãos');
    });

    it('deve compactar modificações de armas de fogo e abreviar tipos de dano', () => {
      const formatted = summarizeAttackCritSpec({
        critical: '19/x3',
        range: 'Médio',
        special:
          'Balístico • Modificações: Mira Laser: Margem de ameaça +1 • Certeira: Ataque +2',
      });
      assert.ok(formatted.includes('19/x3'));
      assert.ok(formatted.includes('Médio'));
      assert.ok(formatted.includes('Bal.'));
      assert.ok(formatted.includes('+1 Margem'));
      assert.ok(formatted.includes('+2 Atk'));
      assert.ok(formatted.length <= 65);
    });
  });

  describe('getDescStyle', () => {
    it('deve ajustar o tamanho da fonte dinamicamente baseado no comprimento', () => {
      assert.ok(getDescStyle('Curto').includes('9.5px'));
      assert.ok(
        getDescStyle('Texto com tamanho médio de quarenta e cinco chars').includes(
          '8.5px'
        )
      );
      assert.ok(
        getDescStyle(
          'Texto muito comprido com mais de sessenta caracteres que precisa diminuir a fonte'
        ).includes('8px')
      );
    });
  });
});
