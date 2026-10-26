import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateStatIncreases,
  getPeRoundLimit,
  getRitualDt,
  getRecommendedRank,
  parseTrackAbilities,
  getTrackDescription,
  getNexMilestone,
  getClassSkillRules,
  getOriginSkillsInfo,
  calculateInitialSkillBudget,
} from '../src/utils/progression';
import { CharacterAttributes } from '../src/types/compendium';

describe('Sistema de Progressão e Regras de NEX (progression.ts)', () => {
  const baseAttrs: CharacterAttributes = {
    AGI: 2,
    FOR: 1,
    INT: 2,
    PRE: 3,
    VIG: 2,
  };

  describe('calculateStatIncreases - Ganhos por avanço de 5% NEX', () => {
    it('deve calcular ganhos de Combatente corretamente (4+VIG PV, 2+PRE PE, 3 SAN)', () => {
      const inc = calculateStatIncreases('Combatente', baseAttrs);
      assert.strictEqual(inc.pvGain, 4 + 2); // 6
      assert.strictEqual(inc.peGain, 2 + 3); // 5
      assert.strictEqual(inc.sanGain, 3);
      assert.strictEqual(inc.basePv, 4);
    });

    it('deve calcular ganhos de Especialista corretamente (3+VIG PV, 3+PRE PE, 4 SAN)', () => {
      const inc = calculateStatIncreases('Especialista', baseAttrs);
      assert.strictEqual(inc.pvGain, 3 + 2); // 5
      assert.strictEqual(inc.peGain, 3 + 3); // 6
      assert.strictEqual(inc.sanGain, 4);
      assert.strictEqual(inc.basePv, 3);
    });

    it('deve calcular ganhos de Ocultista corretamente (2+VIG PV, 4+PRE PE, 5 SAN)', () => {
      const inc = calculateStatIncreases('Ocultista', baseAttrs);
      assert.strictEqual(inc.pvGain, 2 + 2); // 4
      assert.strictEqual(inc.peGain, 4 + 3); // 7
      assert.strictEqual(inc.sanGain, 5);
      assert.strictEqual(inc.basePv, 2);
    });

    it('deve calcular ganhos de Sobrevivente corretamente (2 PV, 1 PE, 2 SAN)', () => {
      const inc = calculateStatIncreases('Sobrevivente', baseAttrs);
      assert.strictEqual(inc.pvGain, 2);
      assert.strictEqual(inc.peGain, 1);
      assert.strictEqual(inc.sanGain, 2);
    });

    it('deve garantir ganho mínimo de 1 mesmo com atributos negativos', () => {
      const negativeAttrs: CharacterAttributes = {
        AGI: 1,
        FOR: 1,
        INT: 1,
        PRE: -3,
        VIG: -5,
      };
      const inc = calculateStatIncreases('Combatente', negativeAttrs);
      assert.strictEqual(inc.pvGain, 1);
      assert.strictEqual(inc.peGain, 1);
    });
  });

  describe('getPeRoundLimit & getRitualDt', () => {
    it('deve calcular o limite de PE por rodada como NEX / 5 (mínimo 1)', () => {
      assert.strictEqual(getPeRoundLimit(5), 1);
      assert.strictEqual(getPeRoundLimit(10), 2);
      assert.strictEqual(getPeRoundLimit(25), 5);
      assert.strictEqual(getPeRoundLimit(50), 10);
      assert.strictEqual(getPeRoundLimit(99), 19);
    });

    it('deve calcular DT de rituais como 10 + PE/rodada + PRE', () => {
      // PRE = 3
      assert.strictEqual(getRitualDt(5, 3), 10 + 1 + 3); // 14
      assert.strictEqual(getRitualDt(25, 3), 10 + 5 + 3); // 18
      assert.strictEqual(getRitualDt(50, 4), 10 + 10 + 4); // 24
    });
  });

  describe('getRecommendedRank - Patentes por patamar de NEX', () => {
    it('deve retornar a patente correta conforme o NEX oficial', () => {
      assert.strictEqual(getRecommendedRank(5), 'Recruta');
      assert.strictEqual(getRecommendedRank(15), 'Recruta');
      assert.strictEqual(getRecommendedRank(20), 'Operador');
      assert.strictEqual(getRecommendedRank(45), 'Operador');
      assert.strictEqual(getRecommendedRank(50), 'Agente Especial');
      assert.strictEqual(getRecommendedRank(65), 'Agente Especial');
      assert.strictEqual(getRecommendedRank(70), 'Oficial de Operações');
      assert.strictEqual(getRecommendedRank(90), 'Oficial de Operações');
      assert.strictEqual(getRecommendedRank(95), 'Agente de Elite');
      assert.strictEqual(getRecommendedRank(99), 'Agente de Elite');
    });
  });

  describe('parseTrackAbilities - Extração de habilidades de trilhas', () => {
    it('deve extrair habilidades por marcos de NEX da descrição', () => {
      const sampleTrackDesc = `Você é treinado para abater alvos com eficiência.

NEX 10% - A Favorita. Escolha uma arma para ser sua favorita. A categoria é reduzida em I.

NEX 40% - Técnica Secreta. A categoria passa a ser reduzida em II. Gaste 2 PE para efeitos especiais.

NEX 65% - Técnica Sublime. Redução em III e efeitos avançados.

NEX 99% - Máquina de Matar. Redução em IV, +2 margem de ameaça e passo de dano.`;

      const parsed = parseTrackAbilities(sampleTrackDesc);
      assert.ok(parsed[10]);
      assert.strictEqual(parsed[10].title, 'A Favorita');
      assert.ok(parsed[10].description.includes('Escolha uma arma'));

      assert.ok(parsed[40]);
      assert.strictEqual(parsed[40].title, 'Técnica Secreta');

      assert.ok(parsed[65]);
      assert.strictEqual(parsed[65].title, 'Técnica Sublime');

      assert.ok(parsed[99]);
      assert.strictEqual(parsed[99].title, 'Máquina de Matar');
    });

    it('deve retornar objeto vazio para string vazia ou inválida', () => {
      assert.deepStrictEqual(parseTrackAbilities(''), {});
    });
  });

  describe('getTrackDescription - Extração completa e não truncada da narrativa de trilhas', () => {
    it('deve extrair a descrição completa de trilhas oficiais sem cortes mid-sentence', () => {
      const mockTrack: any = {
        id: 'track_aniquilador',
        category: 'track',
        subCategory: 'Trilha de Combatente',
        name: 'Aniquilador (Combatente)',
        bookId: 'livro_base',
        bookTitle: 'Livro Base',
        pageNumber: 28,
        element: 'Nenhum',
        summary: 'Você é treinado para abater alvos com eficiência e',
        description: 'Você é treinado para abater alvos com eficiência e \nvelocidade. Suas armas são suas melhores amigas.\n\nNEX 10% - A Favorita. Reduz categoria.',
        tags: ['Trilha'],
      };

      const desc = getTrackDescription(mockTrack);
      assert.ok(desc.includes('velocidade. Suas armas são suas melhores amigas.'));
      assert.ok(!desc.endsWith(' e'));
    });

    it('deve retornar string vazia para track nula ou indefinida', () => {
      assert.strictEqual(getTrackDescription(null), '');
      assert.strictEqual(getTrackDescription(undefined), '');
    });
  });

  describe('getNexMilestone - Requisitos e regras de cada nível', () => {
    it('deve identificar escolha de trilha em NEX 10%', () => {
      const m = getNexMilestone('Combatente', 10);
      assert.strictEqual(m.needsTrackChoice, true);
    });

    it('deve identificar poder de classe em NEX 15, 30, 45, 60, 75, 90%', () => {
      for (const nex of [15, 30, 45, 60, 75, 90]) {
        const m = getNexMilestone('Especialista', nex);
        assert.strictEqual(m.needsClassPower, true);
      }
    });

    it('com regra opcional transcendEvery5Nex: deve habilitar escolha de poder em TODOS os patamares de NEX, permitindo poder de classe + paranormal separado nos marcos oficiais e apenas paranormal nos demais', () => {
      const allNexSteps = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
      const officialClassPowerNex = [15, 30, 45, 50, 60, 75, 90];

      for (const nex of allNexSteps) {
        const m = getNexMilestone('Combatente', nex, undefined, baseAttrs, { transcendEvery5Nex: true });
        assert.strictEqual(m.canTranscend, true);
        assert.strictEqual(m.isTranscendRuleActive, true);

        if (!officialClassPowerNex.includes(nex)) {
          // Em patamares que não concedem poder de classe originalmente: SÓ poder paranormal
          assert.strictEqual(m.onlyParanormal, true, `NEX ${nex}% deve ter onlyParanormal = true`);
          assert.strictEqual(m.needsClassPower, false, `NEX ${nex}% não deve conceder poder de classe`);
          assert.strictEqual(m.canTranscendSeparately, false);
        } else {
          // Em patamares oficiais: ganha poder de classe E pode transcender separadamente
          assert.strictEqual(m.needsClassPower, true, `NEX ${nex}% deve conceder poder de classe`);
          assert.strictEqual(m.canTranscendSeparately, true, `NEX ${nex}% deve permitir transcender separadamente`);
          assert.strictEqual(m.onlyParanormal, false, `NEX ${nex}% não deve ser restrito a onlyParanormal`);
        }
      }
    });

    it('deve identificar aumento de atributo oficial em NEX 20, 50, 80 e 95%', () => {
      const m20 = getNexMilestone('Ocultista', 20, undefined, baseAttrs);
      assert.strictEqual(m20.needsAttributeIncrease, true);
      assert.strictEqual(m20.needsSkillTrainingIncrease, undefined);

      const m50 = getNexMilestone('Ocultista', 50, undefined, baseAttrs);
      assert.strictEqual(m50.needsAttributeIncrease, true);
      assert.strictEqual(m50.needsAffinityChoice, true);
      assert.strictEqual(m50.needsClassPower, true);

      const m80 = getNexMilestone('Combatente', 80, undefined, baseAttrs);
      assert.strictEqual(m80.needsAttributeIncrease, true);

      const m95 = getNexMilestone('Especialista', 95, undefined, baseAttrs);
      assert.strictEqual(m95.needsAttributeIncrease, true);
    });

    it('deve identificar graus de treinamento oficiais exclusivamente em NEX 35% e 70%', () => {
      // NEX 35% -> Veterano (+10)
      const m35Combatente = getNexMilestone('Combatente', 35, undefined, baseAttrs);
      assert.strictEqual(m35Combatente.needsSkillTrainingIncrease, true);
      assert.strictEqual(m35Combatente.skillTrainingTargetDegree, 10);
      assert.strictEqual(m35Combatente.skillTrainingQuota, 1 + baseAttrs.INT); // 1 + 2 = 3

      const m35Especialista = getNexMilestone('Especialista', 35, undefined, baseAttrs);
      assert.strictEqual(m35Especialista.skillTrainingQuota, 5 + baseAttrs.INT); // 5 + 2 = 7

      const m35Ocultista = getNexMilestone('Ocultista', 35, undefined, baseAttrs);
      assert.strictEqual(m35Ocultista.skillTrainingQuota, 3 + baseAttrs.INT); // 3 + 2 = 5

      // NEX 70% -> Expert (+15)
      const m70 = getNexMilestone('Especialista', 70, undefined, baseAttrs);
      assert.strictEqual(m70.needsSkillTrainingIncrease, true);
      assert.strictEqual(m70.skillTrainingTargetDegree, 15);
      assert.strictEqual(m70.skillTrainingQuota, 5 + baseAttrs.INT);
    });

    it('deve identificar aprimoramentos de classe (Engenhosidade em 40% e 75% para Especialista)', () => {
      const m40Esp = getNexMilestone('Especialista', 40);
      assert.strictEqual(m40Esp.classAbilityUpgrade, 'Engenhosidade (Veterano)');

      const m75Esp = getNexMilestone('Especialista', 75);
      assert.strictEqual(m75Esp.classAbilityUpgrade, 'Engenhosidade (Expert)');
    });

    it('deve identificar rituais de 2º, 3º e 4º círculo para Ocultista em 25%, 55%, 85%', () => {
      const m25 = getNexMilestone('Ocultista', 25);
      assert.strictEqual(m25.needsRitualChoice, true);
      assert.strictEqual(m25.maxRitualCircle, 2);

      const m55 = getNexMilestone('Ocultista', 55);
      assert.strictEqual(m55.needsRitualChoice, true);
      assert.strictEqual(m55.maxRitualCircle, 3);

      const m85 = getNexMilestone('Ocultista', 85);
      assert.strictEqual(m85.needsRitualChoice, true);
      assert.strictEqual(m85.maxRitualCircle, 4);
    });
  });

  describe('getClassSkillRules - Cota de perícias na criação (5% NEX)', () => {
    it('deve retornar regras para Especialista (7 + INT livres)', () => {
      const rules = getClassSkillRules('Especialista', 2);
      assert.strictEqual(rules.freeChoicesCount, 9);
      assert.strictEqual(rules.mandatorySkills.length, 0);
    });

    it('deve retornar regras para Combatente (1 + INT livres, 2 grupos de escolha)', () => {
      const rules = getClassSkillRules('Combatente', 2);
      assert.strictEqual(rules.freeChoicesCount, 3);
      assert.strictEqual(rules.choiceGroups.length, 2);
      assert.deepStrictEqual(rules.choiceGroups[0].options, ['Luta', 'Pontaria']);
      assert.deepStrictEqual(rules.choiceGroups[1].options, ['Fortitude', 'Reflexos']);
    });

    it('deve retornar regras para Ocultista (3 + INT livres, Ocultismo e Vontade obrigatórias)', () => {
      const rules = getClassSkillRules('Ocultista', 3);
      assert.strictEqual(rules.freeChoicesCount, 6);
      assert.ok(rules.mandatorySkills.includes('Ocultismo'));
      assert.ok(rules.mandatorySkills.includes('Vontade'));
    });

    it('deve suportar atributo INT zerado (0) sem quebrar a contagem de perícias', () => {
      const specialistRules = getClassSkillRules('Especialista', 0);
      assert.strictEqual(specialistRules.freeChoicesCount, 7);

      const combatantRules = getClassSkillRules('Combatente', 0);
      assert.strictEqual(combatantRules.freeChoicesCount, 1);

      const occultistRules = getClassSkillRules('Ocultista', 0);
      assert.strictEqual(occultistRules.freeChoicesCount, 3);
    });
  });

  describe('Regras Oficiais de Distribuição de Atributos e Zerar Status', () => {
    it('deve calcular corretamente 4 pontos disponíveis partindo de 1 em todos os atributos', () => {
      const initialAttrs: CharacterAttributes = { AGI: 1, FOR: 1, INT: 1, PRE: 1, VIG: 1 };
      const pointsSpent =
        initialAttrs.AGI - 1 +
        (initialAttrs.FOR - 1) +
        (initialAttrs.INT - 1) +
        (initialAttrs.PRE - 1) +
        (initialAttrs.VIG - 1);
      const pointsRemaining = 4 - pointsSpent;
      assert.strictEqual(pointsRemaining, 4);
    });

    it('ao zerar um atributo (0), deve conceder +1 ponto adicional (total 5 pontos)', () => {
      const attrsWithZero: CharacterAttributes = { AGI: 1, FOR: 0, INT: 1, PRE: 1, VIG: 1 };
      const pointsSpent =
        attrsWithZero.AGI - 1 +
        (attrsWithZero.FOR - 1) +
        (attrsWithZero.INT - 1) +
        (attrsWithZero.PRE - 1) +
        (attrsWithZero.VIG - 1);
      const pointsRemaining = 4 - pointsSpent;
      const hasZeroAttr = Object.values(attrsWithZero).some((v) => v === 0);
      const totalPoints = 4 + (hasZeroAttr ? 1 : 0);

      assert.strictEqual(pointsSpent, -1);
      assert.strictEqual(pointsRemaining, 5);
      assert.strictEqual(totalPoints, 5);
    });

    it('deve permitir gastar todos os 5 pontos em outros atributos quando um está zerado', () => {
      // FOR = 0 (-1 pt)
      // AGI = 3 (+2 pt)
      // INT = 3 (+2 pt)
      // VIG = 2 (+1 pt)
      // PRE = 1 (0 pt)
      const allocatedAttrs: CharacterAttributes = { AGI: 3, FOR: 0, INT: 3, PRE: 1, VIG: 2 };
      const pointsSpent =
        allocatedAttrs.AGI - 1 +
        (allocatedAttrs.FOR - 1) +
        (allocatedAttrs.INT - 1) +
        (allocatedAttrs.PRE - 1) +
        (allocatedAttrs.VIG - 1);
      const pointsRemaining = 4 - pointsSpent;
      const hasZeroAttr = Object.values(allocatedAttrs).some((v) => v === 0);
      const totalPoints = 4 + (hasZeroAttr ? 1 : 0);

      assert.strictEqual(pointsSpent, 4);
      assert.strictEqual(pointsRemaining, 0);
      assert.strictEqual(totalPoints, 5);
    });
  });

  describe('getOriginSkillsInfo - Perícias de Origens Oficiais', () => {
    it('deve extrair 2 perícias fixas para origens padrão (ex: Atleta -> Acrobacia e Atletismo)', () => {
      const info = getOriginSkillsInfo('Acrobacia e Atletismo');
      assert.strictEqual(info.originGrantedSkills.length, 2);
      assert.ok(info.originGrantedSkills.includes('Acrobacia'));
      assert.ok(info.originGrantedSkills.includes('Atletismo'));
      assert.strictEqual(info.extraOriginChoices, 0);
    });

    it('deve lidar com perícias com especializações em parênteses (ex: Profissão)', () => {
      const info = getOriginSkillsInfo('Fortitude e Profissão (cozinheiro)');
      assert.strictEqual(info.originGrantedSkills.length, 2);
      assert.ok(info.originGrantedSkills.includes('Fortitude'));
      assert.ok(info.originGrantedSkills.includes('Profissão'));
      assert.strictEqual(info.extraOriginChoices, 0);
    });

    it('deve conceder 2 escolhas livres para Amnésico ("Duas à escolha do mestre")', () => {
      const info = getOriginSkillsInfo('Duas à escolha do mestre');
      assert.strictEqual(info.originGrantedSkills.length, 0);
      assert.strictEqual(info.extraOriginChoices, 2);
    });

    it('deve conceder 1 fixa e 1 escolha livre para Profetizado', () => {
      const info = getOriginSkillsInfo('Vontade e mais uma à sua escolha, relacionada a sua premonição');
      assert.deepStrictEqual(info.originGrantedSkills, ['Vontade']);
      assert.strictEqual(info.extraOriginChoices, 1);
    });

    it('deve conceder exatamente 2 perícias no total para todas as 59 origens do compêndio', async () => {
      const fs = await import('fs');
      const seed = JSON.parse(fs.readFileSync('./src/data/seed/compendium_seed.json', 'utf8'));
      const origins = seed.entities.filter((e: any) => e.category === 'origin');
      assert.strictEqual(origins.length, 59);

      for (const orig of origins) {
        const info = getOriginSkillsInfo(orig.trainedSkills);
        const total = info.originGrantedSkills.length + info.extraOriginChoices;
        assert.strictEqual(
          total,
          2,
          `Origem ${orig.name} deve conceder exatamente 2 perícias (concedeu ${total})`
        );
      }
    });
  });

  describe('calculateInitialSkillBudget - Orçamento e Cotas Estritas na Criação Assistida', () => {
    it('Especialista (INT 1) + Atleta: deve exigir exatamente 8 escolhas livres e totalizar 10 perícias', () => {
      const budget = calculateInitialSkillBudget('Especialista', 1, 'Acrobacia e Atletismo');
      assert.strictEqual(budget.originGrantedSkills.length, 2);
      assert.strictEqual(budget.effectiveMandatorySkills.length, 0);
      assert.strictEqual(budget.choiceGroups.length, 0);
      assert.strictEqual(budget.totalFreeChoices, 8); // 7 base + 1 INT
      assert.strictEqual(budget.totalTrainedExpected, 10); // 2 origem + 8 livres
    });

    it('Combatente (INT 1) + Atleta: 2 escolhas livres, 2 grupos de classe e 2 da origem (total 6)', () => {
      const budget = calculateInitialSkillBudget('Combatente', 1, 'Acrobacia e Atletismo');
      assert.strictEqual(budget.originGrantedSkills.length, 2);
      assert.strictEqual(budget.choiceGroups.length, 2);
      assert.strictEqual(budget.choiceGroups[0].isSatisfiedByOrigin, false);
      assert.strictEqual(budget.choiceGroups[1].isSatisfiedByOrigin, false);
      assert.strictEqual(budget.totalFreeChoices, 2); // 1 base + 1 INT
      assert.strictEqual(budget.totalTrainedExpected, 6); // 2 origem + 2 grupos + 2 livres
    });

    it('Ocultista (INT 2) + Cultista Arrependido: converte Ocultismo duplicado em +1 escolha livre', () => {
      // Cultista Arrependido concede Ocultismo e Religião
      // Classe Ocultista tem Ocultismo e Vontade obrigatórias
      const budget = calculateInitialSkillBudget('Ocultista', 2, 'Ocultismo e Religião');
      assert.deepStrictEqual(budget.originGrantedSkills, ['Ocultismo', 'Religião']);
      assert.deepStrictEqual(budget.effectiveMandatorySkills, ['Vontade']); // Ocultismo já concedido pela origem
      // Cota livre: 3 base + 2 INT + 1 duplicada da origem = 6
      assert.strictEqual(budget.totalFreeChoices, 6);
      // Total na ficha: 2 origem + 1 classe obrigatória + 6 livres = 9
      assert.strictEqual(budget.totalTrainedExpected, 9);
    });

    it('Amnésico (0 perícias fixas): concede 2 escolhas livres da origem extras no orçamento', () => {
      const budget = calculateInitialSkillBudget('Especialista', 2, 'Duas à escolha do mestre');
      assert.strictEqual(budget.originGrantedSkills.length, 0);
      assert.strictEqual(budget.extraOriginChoices, 2);
      // 7 base + 2 INT + 2 da origem = 11 escolhas livres
      assert.strictEqual(budget.totalFreeChoices, 11);
      assert.strictEqual(budget.totalTrainedExpected, 11);
    });

    it('Combatente com troca de grupo duplicado por perícia livre: mantém total exato de perícias', () => {
      // Origem Lutador (Luta e Reflexos)
      // Combatente tem grupos [Luta, Pontaria] e [Fortitude, Reflexos]
      // Se jogador escolhe trocar o grupo 0 (já que tem Luta) por +1 escolha livre:
      const budget = calculateInitialSkillBudget('Combatente', 1, 'Luta e Reflexos', { 0: true });
      assert.strictEqual(budget.totalFreeChoices, 3); // 1 base + 1 INT + 1 da troca
      assert.strictEqual(budget.totalTrainedExpected, 6);
    });
  });
});
