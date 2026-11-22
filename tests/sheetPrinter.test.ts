import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_SKILLS_PRINT,
  formatPageRef,
  getSkillTrainingRoman,
  getSkillTotalBonus,
  generateSheetHtml,
  resolveSheetPrintSkillsAndStats,
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

    it('deve incluir bônus +2 de vestimenta com duas perícias (Função Adicional / Amuleto Sagrado) em Outros e BÔNUS nas fichas LB e SH', () => {
      const charVestimentaDupla: CharacterSheet = {
        ...dummyChar,
        skills: {
          ...dummyChar.skills,
          Religião: { degree: 5, bonus: 0 }, // Treinada (+5) +2 vestimenta = Outros +2 / Total 7
          Vontade: { degree: 0, bonus: 0 }, // Destreinada +2 vestimenta = Outros +2 / Total 2
        },
        inventory: [
          {
            id: 'amuleto_1',
            name: 'Amuleto Sagrado',
            category: '0',
            spaces: 1,
            itemType: 'vestimenta',
            targetSkill: 'Religião',
            skillBonus: 2,
            secondarySkill: 'Vontade',
            secondaryBonus: 2,
            // equipped propositalmente omitido (undefined -> ativo por padrão)
          },
        ],
      };

      const resolved = resolveSheetPrintSkillsAndStats(charVestimentaDupla);
      assert.strictEqual(resolved.skills['Religião'].otherBonus, 2);
      assert.strictEqual(resolved.skills['Religião'].outrosText, '+2');
      assert.strictEqual(resolved.skills['Religião'].totalBonus, 7);
      assert.strictEqual(resolved.skills['Religião'].bonusText, '7');

      assert.strictEqual(resolved.skills['Vontade'].otherBonus, 2);
      assert.strictEqual(resolved.skills['Vontade'].outrosText, '+2');
      assert.strictEqual(resolved.skills['Vontade'].totalBonus, 2);
      assert.strictEqual(resolved.skills['Vontade'].bonusText, '2');

      const htmlLB = generateSheetHtml({ character: charVestimentaDupla, sheetType: 'livro_base' });
      const htmlSH = generateSheetHtml({
        character: charVestimentaDupla,
        sheetType: 'sobrevivendo_horror',
      });

      assert.ok(htmlLB.includes('+2'));
      assert.ok(htmlLB.includes('top: 68.13')); // Linha de Religião em LB
      assert.ok(htmlLB.includes('top: 76.57')); // Linha de Vontade em LB
      assert.ok(htmlSH.includes('top: 68.63')); // Linha de Religião em SH
      assert.ok(htmlSH.includes('top: 77.07')); // Linha de Vontade em SH
    });

    it('deve somar bônus salvo na perícia (+2) com bônus de vestimenta (+2) totalizando +4 em Outros e 9 em BÔNUS sem perda', () => {
      const charCumulativo: CharacterSheet = {
        ...dummyChar,
        skills: {
          ...dummyChar.skills,
          Diplomacia: { degree: 5, bonus: 2 },
        },
        inventory: [
          {
            id: 'vest_dip',
            name: 'Terno Sob Medida',
            category: 'I',
            spaces: 1,
            equipped: true,
            itemType: 'vestimenta',
            targetSkill: 'Diplomacia',
            skillBonus: 2,
            secondarySkill: 'Enganação',
            secondaryBonus: 2,
          },
        ],
      };

      const resolved = resolveSheetPrintSkillsAndStats(charCumulativo);
      assert.strictEqual(resolved.skills['Diplomacia'].otherBonus, 4);
      assert.strictEqual(resolved.skills['Diplomacia'].outrosText, '+4');
      assert.strictEqual(resolved.skills['Diplomacia'].totalBonus, 9);
      assert.strictEqual(resolved.skills['Diplomacia'].bonusText, '9');
      assert.strictEqual(resolved.skills['Enganação'].otherBonus, 2);

      const htmlLB = generateSheetHtml({ character: charCumulativo, sheetType: 'livro_base' });
      assert.ok(htmlLB.includes('+4'));
    });

    it('deve aplicar bônus passivos de poderes, origens, maldições de acessórios/proteção e Máscara ativa sem dupla contagem', () => {
      const charFullBonuses: CharacterSheet = {
        ...dummyChar,
        pvMax: 30,
        peMax: 12,
        sanMax: 16,
        dtRituals: 15,
        defenseEquip: 2,
        defenseOther: 0,
        originId: 'origin__livro_base__policial', // +2 Defesa
        entityIds: [
          'power__sobrevivendo_ao_horror__vontade_inabalavel', // +2 Vontade
          'power__livro_base__reflexos_defensivos', // +2 Defesa e +2 Fortitude/Reflexos/Vontade
          'power__arquivos_secretos_06__especialista_em_protecao_leve', // +2 Defesa e +2 Reflexos usando proteção leve
        ],
        skills: {
          Vontade: { degree: 5, bonus: 0 },
          Reflexos: { degree: 5, bonus: 0 },
          Fortitude: { degree: 0, bonus: 0 },
        },
        inventory: [
          {
            id: 'prot_leve',
            name: 'Proteção Leve',
            category: 'II',
            spaces: 2,
            equipped: true,
            itemType: 'protecao',
            modifications: ['curse__prot_sombria'], // +5 Furtividade
          },
          {
            id: 'anel_poder',
            name: 'Anel Amaldiçoado',
            category: 'III',
            spaces: 1,
            equipped: true,
            itemType: 'utensilio',
            targetSkill: 'Ocultismo',
            skillBonus: 2,
            modifications: [
              'curse_acc_defesa', // +5 Defesa
              'curse_acc_vitalidade', // +15 PV
              'curse_acc_esforco_adicional', // +5 PE
              'curse_acc_potencia', // +1 DT
            ],
            customModifications: [
              {
                id: 'cm_san',
                name: 'Lúcido',
                effect: '+5 de SAN máxima',
                categoryIncrease: 1,
              },
            ],
          },
        ],
        maskConfig: {
          enabled: true,
          maskName: 'Máscara das Pessoas nas Sombras',
          isActive: true,
          activeRounds: 1,
          grantBonusTests: true,
          grantBonusDt: true,
          grantBonusDiceDamage: true,
          freeAdvancedRituals: false,
        },
      };

      const resolved = resolveSheetPrintSkillsAndStats(charFullBonuses);
      // Defesa Outros: Policial (+2) + Reflexos Defensivos (+2) + Esp. Prot. Leve (+2) + Maldição Defesa (+5) = 11
      assert.strictEqual(resolved.effectiveDefenseOther, 11);
      // Defesa Total: 10 + AGI (3) + Equip (2) + Outros (11) = 26
      assert.strictEqual(resolved.totalDef, 26);

      // Vitais: PV 30 + Vitalidade 15 = 45; PE 12 (base) + Vontade Inabalável 2 + Esforço Adicional 5 = 19; SAN 16 + custom SAN 5 = 21
      assert.strictEqual(resolved.effectivePvMax, 45);
      assert.strictEqual(resolved.effectivePeMax, 19);
      assert.strictEqual(resolved.effectiveSanMax, 21);

      // DT Ritual: 15 base + Potência (1) + Máscara (5) = 21
      assert.strictEqual(resolved.effectiveDtRitual, 21);

      // Perícias (com +5 de Forma Suprema da Máscara em todos os testes):
      // Vontade: Treino +5, Vontade Inabalável +2, Reflexos Defensivos +2, Máscara +5 -> Outros +9, Total 14
      assert.strictEqual(resolved.skills['Vontade'].otherBonus, 9);
      assert.strictEqual(resolved.skills['Vontade'].totalBonus, 14);

      // Reflexos: Treino +5, Reflexos Defensivos +2, Esp. Prot. Leve +2, Máscara +5 -> Outros +9, Total 14
      assert.strictEqual(resolved.skills['Reflexos'].otherBonus, 9);
      assert.strictEqual(resolved.skills['Reflexos'].totalBonus, 14);

      // Fortitude: Treino 0, Reflexos Defensivos +2, Máscara +5 -> Outros +7, Total 7
      assert.strictEqual(resolved.skills['Fortitude'].otherBonus, 7);
      assert.strictEqual(resolved.skills['Fortitude'].totalBonus, 7);

      // Furtividade: Sombria (+5) + Máscara (+5) = Outros +10
      assert.strictEqual(resolved.skills['Furtividade'].otherBonus, 10);

      // Verifica não-dupla-contagem se `skills.Vontade.bonus` já contiver o bônus passivo salvo (+4)
      const resolvedAlreadySynced = resolveSheetPrintSkillsAndStats({
        ...charFullBonuses,
        skills: {
          ...charFullBonuses.skills,
          Vontade: { degree: 5, bonus: 4 },
        },
      });
      assert.strictEqual(resolvedAlreadySynced.skills['Vontade'].otherBonus, 9);

      const htmlLB = generateSheetHtml({ character: charFullBonuses, sheetType: 'livro_base' });
      assert.ok(htmlLB.includes('>45<'));
      assert.ok(htmlLB.includes('>19<'));
      assert.ok(htmlLB.includes('>21<'));
      assert.ok(htmlLB.includes('>26<') || htmlLB.includes('26'));
    });

    it('Especialista em Proteção Leve não deve somar Defesa nem Reflexos se não estiver usando proteção leve', () => {
      const charSemProtecaoLeve: CharacterSheet = {
        ...dummyChar,
        entityIds: ['power__arquivos_secretos_06__especialista_em_protecao_leve'],
        inventory: [],
        protection: '',
      };

      const resolved = resolveSheetPrintSkillsAndStats(charSemProtecaoLeve);
      assert.strictEqual(resolved.effectiveDefenseOther, 0);
      assert.strictEqual(resolved.skills['Reflexos'].otherBonus, 0);
    });

    it('deve aplicar Muito Sorrateiro, Casca Grossa, Inventário Organizado, Muambeiro, Atlântico/Tênis Lépidos, Magnata, resistências, maldições de atributos e vitais não recalculados', () => {
      // Combatente NEX 20% com atributos {AGI:3, FOR:2, INT:2, PRE:1, VIG:2}
      // Base de classe sem bônus extras: PV = 20+2+3*(4+2) = 40 | PE = 2+1+3*(2+1) = 12 | SAN = 12+3*3 = 21
      const charCompleto: CharacterSheet = {
        ...dummyChar,
        attributes: { AGI: 3, FOR: 2, INT: 2, PRE: 1, VIG: 2 },
        nex: 20,
        peRound: 4,
        pvMax: 40,
        peMax: 12,
        sanMax: 21,
        rank: 'Recruta',
        creditLimit: 'Baixo',
        displacement: '9m (6□)',
        protection: '',
        resistances: '',
        defenseEquip: 0,
        defenseOther: 0,
        originId: 'origin__livro_base__magnata', // +1 tier crédito -> Médio
        trackId: 'track__sobrevivendo_ao_horror__especialista_muambeiro', // +5 carga (NEX 10% Mascate)
        entityIds: [
          'power__arquivos_secretos_06__muito_sorrateiro', // +3 Furtividade
          'power__sobrevivendo_ao_horror__vontade_inabalavel', // +2 Vontade, +2 PE (20% NEX)
          'power__sobrevivendo_ao_horror__inventario_organizado', // +INT na carga e 0,5 -> 0,25 espaço
          'power__sobrevivendo_ao_horror__atletico', // +3m deslocamento
        ],
        abilities: [
          {
            id: 'ab_resist',
            name: 'Resistir a Sangue',
            cost: 'Passiva',
            originPage: 'LB p. 115',
            description: 'Você recebe resistência a Sangue 10.',
            type: 'poder',
          },
          {
            id: 'ab_vitima',
            name: 'Cicatrizes Psicológicas',
            cost: 'Passiva',
            originPage: 'Origem',
            description: 'Você recebe +1 de Sanidade para cada 5% de NEX.',
            type: 'poder',
          },
        ],
        skills: {
          Furtividade: { degree: 5, bonus: 0 },
          Vontade: { degree: 5, bonus: 0 },
        },
        inventory: [
          {
            id: 'prot_1',
            name: 'Proteção Leve',
            category: 'I',
            spaces: 2,
            equipped: true,
            itemType: 'protecao',
          },
          {
            id: 'tenis_1',
            name: 'Tênis Lépidos',
            sourceEntityId: 'item__arquivos_secretos_05__tenis_lepidos',
            category: 'III',
            spaces: 0.5, // Deve virar 0,25 por Inventário Organizado
            equipped: true,
            itemType: 'vestimenta',
            targetSkill: 'Atletismo',
            skillBonus: 12,
          },
          {
            id: 'jaqueta_verissimo',
            name: 'Jaqueta de Veríssimo',
            sourceEntityId: 'item__livro_base__jaqueta_de_verissimo',
            category: 'IV',
            spaces: 0.5, // Deve virar 0,25 por Inventário Organizado
            equipped: true,
            itemType: 'vestimenta',
            modifications: [
              'curse_acc_destreza', // +1 AGI
              'curse_acc_pujanca', // +1 FOR
              'curse_acc_sagacidade', // +1 INT
              'curse_acc_carisma', // +1 PRE
              'curse_acc_disposicao', // +1 VIG (+4 PV extra em NEX 20% = 4 passos de VIG)
              'curse_acc_escudo_mental', // Mental 10
            ],
          },
        ],
      };

      const resolved = resolveSheetPrintSkillsAndStats(charCompleto);

      // Atributos efetivos com maldições de acessório
      assert.deepStrictEqual(resolved.effectiveAttributes, {
        AGI: 4,
        FOR: 3,
        INT: 3,
        PRE: 2,
        VIG: 3,
      });

      // Vitais não recalculados previamente recebem passivos + delta de VIG (+4 PV) + +2 PE (Vontade Inabalável -> 14) + +4 SAN (Cicatrizes/Vítima em NEX 20% -> 25)
      assert.strictEqual(resolved.effectivePvMax, 44);
      assert.strictEqual(resolved.effectivePeMax, 14);
      assert.strictEqual(resolved.effectiveSanMax, 25);

      // DT Ritual reflete +1 PRE (Carisma): 10 + 4 PE/rodada + 2 PRE = 16
      assert.strictEqual(resolved.effectiveDtRitual, 16);

      // Proteção Leve equipada preenche defenseEquip (+5), proteção e Defesa Total (10 + AGI 4 + Equip 5 = 19)
      assert.strictEqual(resolved.effectiveDefenseEquip, 5);
      assert.strictEqual(resolved.totalDef, 19);
      assert.ok(resolved.effectiveProtectionText.includes('Proteção Leve'));

      // Resistências deduplicadas e mescladas (Proteção Leve + Jaqueta de Veríssimo + Escudo Mental + Resistir a Sangue)
      assert.ok(resolved.effectiveResistancesText.includes('Paranormal 15'));
      assert.ok(resolved.effectiveResistancesText.includes('Mental 10'));
      assert.ok(resolved.effectiveResistancesText.includes('Sangue 10'));

      // Carga: FOR 3 (15) + Inventário Organizado INT 3 (+3) + Muambeiro/Mascate (+5) = 23
      // Carga atual: 2 (Proteção Leve) + 0.25 (Tênis 0.5) + 0.25 (Jaqueta 0.5) = 2,5
      assert.strictEqual(resolved.maxLoad, 23);
      assert.strictEqual(resolved.curLoad, '2,5');

      // Deslocamento: 9m + 3m (Atlético) + 3m (Tênis Lépidos) = 15m (10□)
      assert.strictEqual(resolved.effectiveDisplacement, '15m (10□)');

      // Limite de crédito: Recruta Baixo + Magnata -> Médio
      assert.strictEqual(resolved.effectiveCreditLimit, 'Médio');

      // Perícias: Muito Sorrateiro (+3 Furtividade), Tênis Lépidos (+12 Atletismo), Vontade Inabalável (+2 Vontade)
      assert.strictEqual(resolved.skills['Furtividade'].otherBonus, 3);
      assert.strictEqual(resolved.skills['Furtividade'].totalBonus, 8);
      assert.strictEqual(resolved.skills['Atletismo'].otherBonus, 12);
      assert.strictEqual(resolved.skills['Vontade'].otherBonus, 2);

      // Verifica Casca Grossa via Tropa de Choque em NEX >= 10%
      const tropaDeChoque = resolveSheetPrintSkillsAndStats({
        ...dummyChar,
        nex: 20,
        pvMax: 40, // Base combatente VIG 2
        attributes: { AGI: 1, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
        trackId: 'track__livro_base__combatente_tropa_de_choque',
      });
      assert.strictEqual(tropaDeChoque.passiveBonuses.hasCascaGrossa, true);
      assert.strictEqual(tropaDeChoque.effectivePvMax, 44); // +1 PV / 5% NEX (4 passos)

      const htmlLB = generateSheetHtml({ character: charCompleto, sheetType: 'livro_base' });
      assert.ok(htmlLB.includes('15m (10□)'));
      assert.ok(htmlLB.includes('Médio'));
      assert.ok(htmlLB.includes('Paranormal 15'));
      assert.ok(htmlLB.includes('2,5'));
    });
  });
});
