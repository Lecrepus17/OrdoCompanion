import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_SKILLS_PRINT,
  formatPageRef,
  getSkillTrainingRoman,
  getSkillTotalBonus,
  generateSheetHtml,
} from '../src/utils/sheetPrinter';
import { CharacterSheet } from '../src/types/compendium';

describe('Impressão e Renderização de Ficha (sheetPrinter.ts)', () => {
  it('OFFICIAL_SKILLS_PRINT deve conter exatamente as 28 perícias canônicas de Ordem', () => {
    assert.strictEqual(OFFICIAL_SKILLS_PRINT.length, 28);
    const names = OFFICIAL_SKILLS_PRINT.map((s) => s.name);
    assert.ok(names.includes('Acrobacia'));
    assert.ok(names.includes('Ocultismo'));
    assert.ok(names.includes('Luta'));
    assert.ok(names.includes('Pontaria'));
    assert.ok(names.includes('Vontade'));
    assert.ok(names.includes('Investigação'));
  });

  describe('formatPageRef', () => {
    it('deve formatar referência com base no livro de fallback e página', () => {
      assert.strictEqual(formatPageRef(null, 'livro_base', 42), 'LB p. 42');
      assert.strictEqual(formatPageRef(null, 'sobrevivendo_ao_horror', 18), 'SH p. 18');
    });

    it('deve extrair números de referências de texto e inferir a sigla do livro', () => {
      assert.strictEqual(formatPageRef('p. 50'), 'LB p. 50');
      assert.strictEqual(formatPageRef('SH p. 30'), 'SH p. 30');
      assert.strictEqual(formatPageRef('Arquivo Secreto 01 # 12'), 'AS p. 12');
    });

    it('deve abreviar menções a Origem, Trilha e Classe', () => {
      assert.strictEqual(formatPageRef('Habilidade de Origem'), 'Origem');
      assert.strictEqual(formatPageRef('Trilha de Combatente'), 'Trilha');
      assert.strictEqual(formatPageRef('Classe Especialista'), 'Classe');
    });
  });

  describe('getSkillTrainingRoman e getSkillTotalBonus', () => {
    it('deve converter graus de treinamento para algarismos romanos I, II e III', () => {
      assert.strictEqual(getSkillTrainingRoman(5), 'I');
      assert.strictEqual(getSkillTrainingRoman(1), 'I');
      assert.strictEqual(getSkillTrainingRoman('TREINADO'), 'I');

      assert.strictEqual(getSkillTrainingRoman(10), 'II');
      assert.strictEqual(getSkillTrainingRoman(2), 'II');
      assert.strictEqual(getSkillTrainingRoman('VETERANO'), 'II');

      assert.strictEqual(getSkillTrainingRoman(15), 'III');
      assert.strictEqual(getSkillTrainingRoman(3), 'III');
      assert.strictEqual(getSkillTrainingRoman('EXPERT'), 'III');

      assert.strictEqual(getSkillTrainingRoman(0), '');
      assert.strictEqual(getSkillTrainingRoman(''), '');
      assert.strictEqual(getSkillTrainingRoman(null), '');
    });

    it('deve calcular o bônus numérico total da perícia', () => {
      assert.strictEqual(getSkillTotalBonus(5, 2), 7);
      assert.strictEqual(getSkillTotalBonus(10, 0), 10);
      assert.strictEqual(getSkillTotalBonus(15, 5), 20);
      assert.strictEqual(getSkillTotalBonus(0, 3), 3);
    });
  });

  describe('generateSheetHtml', () => {
    const dummyChar: CharacterSheet = {
      id: 'char_print_test',
      name: 'Agente Arthur <Script>',
      player: 'Player One',
      classId: 'Combatente',
      originId: 'Militar',
      trackId: '',
      rank: 'Recruta',
      affinity: 'Nenhum',
      nex: 20,
      peRound: 4,
      pvCurrent: 25,
      pvMax: 25,
      peCurrent: 8,
      peMax: 8,
      sanCurrent: 14,
      sanMax: 14,
      defenseBonus: 0,
      entityIds: [],
      notes: '',
      displacement: '9m',
      attributes: { AGI: 3, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
      skills: {
        Luta: { degree: 5, bonus: 2 },
        Pontaria: { degree: 10, bonus: 0 },
      },
      attacks: [
        {
          id: 'atk_1',
          name: 'Katana',
          test: 'Luta',
          damage: '1d10+2',
          critical: '19/x2',
          range: 'Curto',
          special: '',
        },
      ],
      inventory: [
        { id: 'inv_1', name: 'Munição Curta', spaces: 1, category: 'I' },
      ],
      updatedAt: '2026-10-25T01:00:00.000Z',
    };

    it('deve gerar documento HTML completo com escape seguro de caracteres especiais', () => {
      const html = generateSheetHtml({ character: dummyChar, sheetType: 'livro_base' });
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('<html'));
      assert.ok(html.includes('</html>'));

      // Validação de escape HTML contra XSS
      assert.ok(html.includes('Agente Arthur &lt;Script&gt;'));
      assert.ok(!html.includes('Agente Arthur <Script>'));

      // Validação de inclusão de atributos e ataques
      assert.ok(html.includes('Combatente'));
      assert.ok(html.includes('Militar'));
      assert.ok(html.includes('Katana'));
    });

    it('deve suportar geração de ficha tipo sobrevivendo_horror', () => {
      const htmlSH = generateSheetHtml({ character: dummyChar, sheetType: 'sobrevivendo_horror' });
      assert.ok(htmlSH.includes('<!DOCTYPE html>'));
      assert.ok(htmlSH.includes('Agente Arthur &lt;Script&gt;'));
    });

    it('deve compactar habilidades longas para que caibam no trecho do PDF', () => {
      const charWithLongAbility: CharacterSheet = {
        ...dummyChar,
        abilities: [
          {
            id: 'ab_long',
            name: 'Saber é Poder',
            cost: '2 PE',
            originPage: 'LB p. 24',
            description:
              'Quando faz um teste usando Intelecto, você pode gastar 2 PE para receber +5 nesse teste, utilizando todo o seu conhecimento acumulado ao longo dos anos de estudos.',
            type: 'poder',
          },
        ],
      };

      const html = generateSheetHtml({ character: charWithLongAbility, sheetType: 'livro_base' });
      // Deve conter o resumo canônico conciso
      assert.ok(html.includes('Gaste 2 PE para +5 em teste de Intelecto.'));
      // Deve conter o tooltip com a descrição original completa
      assert.ok(html.includes('title='));
      assert.ok(html.includes('estudos'));
    });

    it('deve compactar e abreviar modificações e alcance de armas longas', () => {
      const charWithLongAttack: CharacterSheet = {
        ...dummyChar,
        attacks: [
          {
            id: 'atk_custom',
            name: 'Fuzil de Caça Pesado',
            test: 'Pontaria (3d20+10)',
            damage: '2d10+4',
            critical: '19/x3',
            range: 'Corpo a corpo',
            special:
              'Balístico • Modificações: Mira Laser: Margem de ameaça +1 • Certeira: Ataque +2',
          },
        ],
      };

      const html = generateSheetHtml({ character: charWithLongAttack, sheetType: 'livro_base' });
      // Range deve ser abreviado para CaC
      assert.ok(html.includes('CaC'));
      // Dano Balístico deve ser abreviado para Bal.
      assert.ok(html.includes('Bal.'));
      // Modificações compactadas
      assert.ok(html.includes('+1 Margem'));
      assert.ok(html.includes('+2 Atk'));
    });

    it('deve resolver e incluir rituais vinculados em entityIds na tabela de habilidades', () => {
      const charWithRitual: CharacterSheet = {
        ...dummyChar,
        entityIds: ['ritual__livro_base__decadencia'],
      };

      const html = generateSheetHtml({ character: charWithRitual, sheetType: 'livro_base' });
      assert.ok(html.includes('Decadência'));
      assert.ok(html.includes('Causa 2d8+2 de dano de Morte com espirais negras.'));
    });
  });
});
