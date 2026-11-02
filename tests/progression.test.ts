import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateStatIncreases,
  getStepCount,
  getTenPercentStepCount,
  calculateMaxStats,
  detectVitalsModifiers,
  calculateCharacterVitals,
  getPeRoundLimit,
  getRitualDt,
  getRecommendedRank,
  parseTrackAbilities,
  getTrackDescription,
  getNexMilestone,
  getClassSkillRules,
  getOriginSkillsInfo,
  calculateInitialSkillBudget,
  checkPrerequisite,
  confirmUnmetPrerequisites,
  applyCanonicalSkillGrant,
  extractCanonicalSkillGrants,
  checkRitualPrerequisites,
} from '../src/utils/progression';
import { CharacterAttributes, CharacterSheet, CharacterSkillEntry } from '../src/types/compendium';

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
      assert.strictEqual(getPeRoundLimit(99), 20);
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
  describe('checkPrerequisite - Validação Inteligente de Pré-requisitos de Poderes', () => {
    const mockEntities = [
      { id: 'p_morte_1', category: 'power', name: 'Potencial Aprimorado', element: 'Morte' },
      { id: 'p_morte_2', category: 'power', name: 'Escapar da Morte', element: 'Morte' },
      { id: 'p_sangue_1', category: 'power', name: 'Arma de Sangue', element: 'Sangue' },
      { id: 'p_ataque_esp', category: 'power', name: 'Ataque Especial', element: 'Nenhum' },
      { id: 'rit_1', category: 'ritual', name: 'Decadência', element: 'Morte', circle: 1 },
      { id: 'rit_2', category: 'ritual', name: 'Velocidade Mortal', element: 'Morte', circle: 2 },
    ];
    const getEntityById = (id: string) => mockEntities.find((e) => e.id === id) as any;

    const baseChar: any = {
      nex: 15,
      attributes: { FOR: 2, AGI: 1, INT: 2, PRE: 3, VIG: 1 },
      skills: {
        Luta: { degree: 5, bonus: 5 },
        Percepção: { degree: 10, bonus: 10 },
        Tática: { degree: 10, bonus: 10 },
      },
      entityIds: ['p_morte_1'],
      abilities: [],
    };

    it('deve aprovar poderes com pré-requisito Nenhum, vazio ou traço', () => {
      assert.strictEqual(checkPrerequisite('Nenhum', baseChar, getEntityById).met, true);
      assert.strictEqual(checkPrerequisite('', baseChar, getEntityById).met, true);
      assert.strictEqual(checkPrerequisite('—', baseChar, getEntityById).met, true);
      assert.strictEqual(checkPrerequisite(undefined, baseChar, getEntityById).met, true);
    });

    it('deve validar atributos simples e combinados com ou', () => {
      // FOR 2 (tem 2) -> PASS
      assert.strictEqual(checkPrerequisite('For 2', baseChar, getEntityById).met, true);
      // FOR 3 (tem 2) -> FAIL
      assert.strictEqual(checkPrerequisite('For 3', baseChar, getEntityById).met, false);
      // AGI 2 (tem 1) -> FAIL
      assert.strictEqual(checkPrerequisite('Agi 2', baseChar, getEntityById).met, false);
      // FOR 2 ou AGI 2 -> PASS
      assert.strictEqual(checkPrerequisite('For 2 ou Agi 2', baseChar, getEntityById).met, true);
      // PRE 3 -> PASS
      assert.strictEqual(checkPrerequisite('Pre 3', baseChar, getEntityById).met, true);
      // PRE 4 -> FAIL
      assert.strictEqual(checkPrerequisite('Pre 4', baseChar, getEntityById).met, false);
    });

    it('deve considerar contexto de targetAttributes e targetNex em evolução', () => {
      // Atual tem AGI 1, mas escolheu +1 AGI na subida (targetAttributes AGI 2)
      const context = {
        targetNex: 20,
        targetAttributes: { ...baseChar.attributes, AGI: 2 },
      };
      assert.strictEqual(checkPrerequisite('Agi 2', baseChar, getEntityById, context).met, true);
      assert.strictEqual(checkPrerequisite('NEX 20%', baseChar, getEntityById, context).met, true);
      assert.strictEqual(checkPrerequisite('NEX 30%', baseChar, getEntityById, context).met, false);
    });

    it('deve validar contagem de poderes prévios de elementos paranormais', () => {
      // baseChar possui 1 poder de Morte ('p_morte_1')
      assert.strictEqual(checkPrerequisite('Morte 1', baseChar, getEntityById).met, true);
      assert.strictEqual(checkPrerequisite('Morte 2', baseChar, getEntityById).met, false);
      assert.strictEqual(checkPrerequisite('Sangue 1', baseChar, getEntityById).met, false);

      // Adicionando segundo poder de Morte
      const charWith2Morte = {
        ...baseChar,
        entityIds: ['p_morte_1', 'p_morte_2'],
      };
      assert.strictEqual(checkPrerequisite('Morte 2', charWith2Morte, getEntityById).met, true);
    });

    it('deve validar perícias treinadas e veteranas (individuais, com ou, com e)', () => {
      // Luta está em degree 5 (Treinado)
      assert.strictEqual(checkPrerequisite('treinado em Luta', baseChar, getEntityById).met, true);
      assert.strictEqual(checkPrerequisite('veterano em Luta', baseChar, getEntityById).met, false);

      // Pontaria não treinada (degree 0)
      assert.strictEqual(checkPrerequisite('treinado em Pontaria', baseChar, getEntityById).met, false);

      // Luta ou Pontaria -> PASS
      assert.strictEqual(checkPrerequisite('treinado em Luta ou Pontaria', baseChar, getEntityById).met, true);

      // Percepção e Tática estão ambos em degree 10 (Veterano)
      assert.strictEqual(checkPrerequisite('treinado em Percepção e Tática', baseChar, getEntityById).met, true);
      assert.strictEqual(checkPrerequisite('veterano em Percepção', baseChar, getEntityById).met, true);
    });

    it('deve validar poderes compostos separados por vírgula', () => {
      // 'For +2, treinado em Luta' -> FOR 2 (PASS) & Luta 5 (PASS) -> PASS
      assert.strictEqual(checkPrerequisite('For +2, treinado em Luta', baseChar, getEntityById).met, true);
      // 'Agi 3, treinado em Luta ou Pontaria' -> AGI 1 (FAIL) -> FAIL
      const res = checkPrerequisite('Agi 3, treinado em Luta ou Pontaria', baseChar, getEntityById);
      assert.strictEqual(res.met, false);
      assert.ok(res.details.includes('AGI'));
    });
  });

  describe('Escalonamento e Recálculo Automático de Vitais por NEX (calculateMaxStats)', () => {
    const testAttrs: CharacterAttributes = {
      AGI: 2,
      FOR: 2,
      INT: 2,
      PRE: 2,
      VIG: 3,
    };

    describe('Passos de NEX (getStepCount e getTenPercentStepCount)', () => {
      it('deve calcular passos de 5% de NEX corretamente', () => {
        assert.strictEqual(getStepCount(0), 0);
        assert.strictEqual(getStepCount(5), 1);
        assert.strictEqual(getStepCount(10), 2);
        assert.strictEqual(getStepCount(20), 4);
        assert.strictEqual(getStepCount(50), 10);
        assert.strictEqual(getStepCount(95), 19);
        assert.strictEqual(getStepCount(99), 20); // 20º patamar
      });

      it('deve calcular passos de 10% de NEX corretamente (Vontade Inabalável)', () => {
        assert.strictEqual(getTenPercentStepCount(0), 0);
        assert.strictEqual(getTenPercentStepCount(5), 0);
        assert.strictEqual(getTenPercentStepCount(10), 1);
        assert.strictEqual(getTenPercentStepCount(15), 1);
        assert.strictEqual(getTenPercentStepCount(20), 2);
        assert.strictEqual(getTenPercentStepCount(50), 5);
        assert.strictEqual(getTenPercentStepCount(95), 9);
        assert.strictEqual(getTenPercentStepCount(99), 10);
      });
    });

    describe('Poder Vitalidade Reforçada: +1 PV para cada 5% de NEX e +2 em Fortitude', () => {
      it('no NEX 5% deve conceder +1 PV e +2 em Fortitude', () => {
        const stats = calculateMaxStats('Combatente', 5, testAttrs, {
          hasVitalidadeReforcada: true,
        });
        // Base Combatente 5% (VIG 3): 20 + 3 = 23 PV
        assert.strictEqual(stats.pvMax, 23 + 1);
        assert.strictEqual(stats.skillBonuses['Fortitude'], 2);
      });

      it('no NEX 50% deve conceder +10 PV (10 passos) e +2 em Fortitude', () => {
        const statsSemPoder = calculateMaxStats('Combatente', 50, testAttrs);
        const statsComPoder = calculateMaxStats('Combatente', 50, testAttrs, {
          hasVitalidadeReforcada: true,
        });
        assert.strictEqual(statsComPoder.pvMax, statsSemPoder.pvMax + 10);
        assert.strictEqual(statsComPoder.skillBonuses['Fortitude'], 2);
      });

      it('no NEX 99% deve conceder +20 PV (20 passos)', () => {
        const statsSemPoder = calculateMaxStats('Combatente', 99, testAttrs);
        const statsComPoder = calculateMaxStats('Combatente', 99, testAttrs, {
          hasVitalidadeReforcada: true,
        });
        assert.strictEqual(statsComPoder.pvMax, statsSemPoder.pvMax + 20);
      });
    });

    describe('Poder Sangue de Ferro: +2 PV por 5% de NEX (com afinidade quando aplicável)', () => {
      it('base sem afinidade: deve conceder +2 PV por passo de NEX', () => {
        // NEX 5% (1 passo): +2 PV
        const stats5 = calculateMaxStats('Combatente', 5, testAttrs, {
          hasSangueDeFerro: true,
        });
        // Base Combatente 5% = 23 PV + 2 = 25 PV
        assert.strictEqual(stats5.pvMax, 25);

        // NEX 50% (10 passos): +20 PV
        const base50 = calculateMaxStats('Combatente', 50, testAttrs);
        const sf50 = calculateMaxStats('Combatente', 50, testAttrs, {
          hasSangueDeFerro: true,
        });
        assert.strictEqual(sf50.pvMax, base50.pvMax + 20);
        assert.strictEqual(sf50.skillBonuses['Fortitude'], undefined);
      });

      it('com bônus de afinidade: concede +3 PV por 5% de NEX e +5 em Fortitude', () => {
        const base50 = calculateMaxStats('Combatente', 50, testAttrs);
        const sfAfinidade50 = calculateMaxStats('Combatente', 50, testAttrs, {
          hasSangueDeFerro: true,
          hasSangueDeFerroAffinity: true,
        });
        // 10 passos * 3 = +30 PV
        assert.strictEqual(sfAfinidade50.pvMax, base50.pvMax + 30);
        assert.strictEqual(sfAfinidade50.skillBonuses['Fortitude'], 5);

        // NEX 99% (20 passos * 3 = +60 PV)
        const base99 = calculateMaxStats('Combatente', 99, testAttrs);
        const sfAfinidade99 = calculateMaxStats('Combatente', 99, testAttrs, {
          hasSangueDeFerro: true,
          hasSangueDeFerroAffinity: true,
        });
        assert.strictEqual(sfAfinidade99.pvMax, base99.pvMax + 60);
        assert.strictEqual(sfAfinidade99.skillBonuses['Fortitude'], 5);
      });
    });

    describe('Poder Potencial Aprimorado: +1 PE por nível/passo de NEX', () => {
      it('base sem afinidade: deve conceder +1 PE por passo de NEX', () => {
        const base30 = calculateMaxStats('Especialista', 30, testAttrs);
        const pa30 = calculateMaxStats('Especialista', 30, testAttrs, {
          hasPotencialAprimorado: true,
        });
        // 6 passos * 1 = +6 PE
        assert.strictEqual(pa30.peMax, base30.peMax + 6);

        const base50 = calculateMaxStats('Especialista', 50, testAttrs);
        const pa50 = calculateMaxStats('Especialista', 50, testAttrs, {
          hasPotencialAprimorado: true,
        });
        // 10 passos * 1 = +10 PE
        assert.strictEqual(pa50.peMax, base50.peMax + 10);
      });

      it('com afinidade: deve conceder +2 PE por passo de NEX', () => {
        const base50 = calculateMaxStats('Especialista', 50, testAttrs);
        const paAf50 = calculateMaxStats('Especialista', 50, testAttrs, {
          hasPotencialAprimorado: true,
          hasPotencialAprimoradoAffinity: true,
        });
        // 10 passos * 2 = +20 PE
        assert.strictEqual(paAf50.peMax, base50.peMax + 20);

        const base99 = calculateMaxStats('Especialista', 99, testAttrs);
        const paAf99 = calculateMaxStats('Especialista', 99, testAttrs, {
          hasPotencialAprimorado: true,
          hasPotencialAprimoradoAffinity: true,
        });
        // 20 passos * 2 = +40 PE
        assert.strictEqual(paAf99.peMax, base99.peMax + 40);
      });
    });

    describe('Poder Vontade Inabalável: +1 PE para cada 10% de NEX e +2 em Vontade', () => {
      it('no NEX 5% não dá PE adicional mas concede +2 em Vontade', () => {
        const base5 = calculateMaxStats('Ocultista', 5, testAttrs);
        const vi5 = calculateMaxStats('Ocultista', 5, testAttrs, {
          hasVontadeInabalavel: true,
        });
        assert.strictEqual(vi5.peMax, base5.peMax);
        assert.strictEqual(vi5.skillBonuses['Vontade'], 2);
      });

      it('no NEX 10% dá +1 PE e +2 em Vontade', () => {
        const base10 = calculateMaxStats('Ocultista', 10, testAttrs);
        const vi10 = calculateMaxStats('Ocultista', 10, testAttrs, {
          hasVontadeInabalavel: true,
        });
        assert.strictEqual(vi10.peMax, base10.peMax + 1);
        assert.strictEqual(vi10.skillBonuses['Vontade'], 2);
      });

      it('no NEX 50% dá +5 PE e no NEX 99% dá +10 PE', () => {
        const base50 = calculateMaxStats('Ocultista', 50, testAttrs);
        const vi50 = calculateMaxStats('Ocultista', 50, testAttrs, {
          hasVontadeInabalavel: true,
        });
        assert.strictEqual(vi50.peMax, base50.peMax + 5);

        const base99 = calculateMaxStats('Ocultista', 99, testAttrs);
        const vi99 = calculateMaxStats('Ocultista', 99, testAttrs, {
          hasVontadeInabalavel: true,
        });
        assert.strictEqual(vi99.peMax, base99.peMax + 10);
      });
    });

    describe('Habilidades de Origens com Vitais Fixos ou Progressivos', () => {
      it('Desgarrado (Calejado): +1 PV para cada 5% de NEX', () => {
        // NEX 5%: +1 PV
        const dg5 = calculateMaxStats('Combatente', 5, testAttrs, { origin: 'Desgarrado' });
        const base5 = calculateMaxStats('Combatente', 5, testAttrs);
        assert.strictEqual(dg5.pvMax, base5.pvMax + 1);

        // NEX 50%: +10 PV
        const dg50 = calculateMaxStats('Combatente', 50, testAttrs, { origin: 'Desgarrado' });
        const base50 = calculateMaxStats('Combatente', 50, testAttrs);
        assert.strictEqual(dg50.pvMax, base50.pvMax + 10);
      });

      it('Universitário (Dedicação): +1 PE/5% NEX e +1 limite de PE por turno', () => {
        // NEX 5%: +1 PE, peRound aumenta para 2 (base é 1), DT aumenta em +1
        const uni5 = calculateMaxStats('Especialista', 5, testAttrs, { origin: 'Universitário' });
        const base5 = calculateMaxStats('Especialista', 5, testAttrs);
        assert.strictEqual(uni5.peMax, base5.peMax + 1);
        assert.strictEqual(uni5.peRound, 2); // 1 + 1
        assert.strictEqual(uni5.dtRituals, 10 + 2 + testAttrs.PRE);

        // NEX 50%: +10 PE, peRound 11 (10 + 1)
        const uni50 = calculateMaxStats('Especialista', 50, testAttrs, { origin: 'Universitário' });
        const base50 = calculateMaxStats('Especialista', 50, testAttrs);
        assert.strictEqual(uni50.peMax, base50.peMax + 10);
        assert.strictEqual(uni50.peRound, 11);
      });

      it('Vítima (Cicatrizes Psicológicas): +1 SAN para cada 5% de NEX', () => {
        // NEX 5%: +1 SAN
        const vit5 = calculateMaxStats('Ocultista', 5, testAttrs, { origin: 'Vítima' });
        const base5 = calculateMaxStats('Ocultista', 5, testAttrs);
        assert.strictEqual(vit5.sanMax, base5.sanMax + 1);

        // NEX 50%: +10 SAN
        const vit50 = calculateMaxStats('Ocultista', 50, testAttrs, { origin: 'Vítima' });
        const base50 = calculateMaxStats('Ocultista', 50, testAttrs);
        assert.strictEqual(vit50.sanMax, base50.sanMax + 10);
      });

      it('Cultista Arrependido (Traços do Outro Lado): -5 SAN fixa', () => {
        const cult5 = calculateMaxStats('Ocultista', 5, testAttrs, { origin: 'Cultista Arrependido' });
        const base5 = calculateMaxStats('Ocultista', 5, testAttrs);
        // Base Ocultista SAN = 20, com -5 fica 15
        assert.strictEqual(cult5.sanMax, base5.sanMax - 5);
        assert.strictEqual(cult5.sanMax, 15);

        // No NEX 50%: penalidade permanece exatamente -5 fixa
        const cult50 = calculateMaxStats('Ocultista', 50, testAttrs, { origin: 'Cultista Arrependido' });
        const base50 = calculateMaxStats('Ocultista', 50, testAttrs);
        assert.strictEqual(cult50.sanMax, base50.sanMax - 5);
      });
    });

    describe('Acúmulo e Combinação de Múltiplos Poderes e Origens', () => {
      it('Combatente Desgarrado com Vitalidade Reforçada e Sangue de Ferro (Afinidade) no NEX 50%', () => {
        const combo = calculateMaxStats('Combatente', 50, testAttrs, {
          origin: 'Desgarrado',
          hasVitalidadeReforcada: true,
          hasSangueDeFerro: true,
          hasSangueDeFerroAffinity: true,
        });

        // Base Combatente VIG 3 no NEX 50% (10 passos, 9 extras):
        // 5% base: 20 + 3 = 23
        // 9 avanços: 9 * (4 + 3) = 63 -> Base total = 86 PV
        // + Desgarrado: 10 * 1 = 10 PV
        // + Vitalidade Reforçada: 10 * 1 = 10 PV
        // + Sangue de Ferro (Afinidade): 10 * 3 = 30 PV
        // Total esperado: 86 + 10 + 10 + 30 = 136 PV
        assert.strictEqual(combo.pvMax, 136);

        // Fortitude: +2 (Vitalidade Reforçada) + 5 (Sangue de Ferro Afinidade) = +7
        assert.strictEqual(combo.skillBonuses['Fortitude'], 7);
      });

      it('Ocultista Universitário com Potencial Aprimorado e Vontade Inabalável no NEX 50%', () => {
        const combo = calculateMaxStats('Ocultista', 50, testAttrs, {
          origin: 'Universitário',
          hasPotencialAprimorado: true,
          hasPotencialAprimoradoAffinity: true,
          hasVontadeInabalavel: true,
        });

        // Base Ocultista PRE 2 no NEX 50%:
        // 5% base: 4 + 2 = 6
        // 9 avanços: 9 * (4 + 2) = 54 -> Base total = 60 PE
        // + Universitário: 10 * 1 = 10 PE
        // + Potencial Aprimorado (Afinidade): 10 * 2 = 20 PE
        // + Vontade Inabalável: 5 * 1 = 5 PE
        // Total esperado: 60 + 10 + 20 + 5 = 95 PE
        assert.strictEqual(combo.peMax, 95);

        // Vontade: +2 (Vontade Inabalável)
        assert.strictEqual(combo.skillBonuses['Vontade'], 2);

        // Limite PE: 10 + 1 (Universitário) = 11
        assert.strictEqual(combo.peRound, 11);
      });
    });

    describe('detectVitalsModifiers e calculateCharacterVitals com CharacterSheet', () => {
      it('deve extrair e calcular vitais de um CharacterSheet completo', () => {
        const sheet: CharacterSheet = {
          id: 'test_hero',
          name: 'Arthur Cervero',
          player: 'Rafael',
          nex: 50,
          rank: 'Agente Especial',
          originId: 'origin_desgarrado',
          classId: 'class_combatente',
          trackId: 'track_aniquilador',
          affinity: 'Sangue',
          attributes: { AGI: 2, FOR: 3, INT: 1, PRE: 2, VIG: 3 },
          pvCurrent: 100,
          pvMax: 100,
          peCurrent: 30,
          peMax: 30,
          sanCurrent: 40,
          sanMax: 40,
          defenseBonus: 12,
          notes: '',
          updatedAt: '2026-11-02T12:00:00.000Z',
          skills: {
            Fortitude: { degree: 10, bonus: 0 },
            Vontade: { degree: 5, bonus: 0 },
          },
          entityIds: ['power_sangue_de_ferro', 'power_vitalidade_reforcada'],
          abilities: [
            {
              id: 'ab_calejado',
              name: 'Calejado',
              cost: 'Passiva',
              originPage: 'Origem Desgarrado',
              description: 'Você recebe +1 PV para cada 5% de NEX.',
              type: 'habilidade',
            },
          ],
        };

        const mockEntities: Record<string, any> = {
          origin_desgarrado: { id: 'origin_desgarrado', name: 'Desgarrado' },
          class_combatente: { id: 'class_combatente', name: 'Combatente' },
          power_sangue_de_ferro: { id: 'power_sangue_de_ferro', name: 'Sangue de Ferro', element: 'Sangue' },
          power_vitalidade_reforcada: { id: 'power_vitalidade_reforcada', name: 'Vitalidade Reforçada' },
        };

        const getEntityById = (id: string) => mockEntities[id];

        const detected = detectVitalsModifiers(sheet, getEntityById);
        assert.strictEqual(detected.hasDesgarrado, true);
        assert.strictEqual(detected.hasVitalidadeReforcada, true);
        assert.strictEqual(detected.hasSangueDeFerro, true);
        assert.strictEqual(detected.hasSangueDeFerroAffinity, true); // Sangue affinity + NEX 50%

        const vitals = calculateCharacterVitals(sheet, getEntityById);
        assert.strictEqual(vitals.pvMax, 136);
        assert.strictEqual(vitals.skillBonuses['Fortitude'], 7);
      });
    });
  });

  describe('Cálculo Unificado de Vitais e Escalonamento Canônico (calculateMaxStats)', () => {
    const canonicalAttrs: CharacterAttributes = { AGI: 2, FOR: 1, INT: 2, PRE: 3, VIG: 2 };

    describe('1. Vitais Iniciais por Classe em NEX 5%', () => {
      it('Combatente (NEX 5%): 22 PV, 5 PE, 12 SAN', () => {
        const stats = calculateMaxStats('Combatente', 5, canonicalAttrs);
        assert.strictEqual(stats.pvMax, 22);
        assert.strictEqual(stats.peMax, 5);
        assert.strictEqual(stats.sanMax, 12);
        assert.strictEqual(stats.peRound, 1);
        assert.strictEqual(stats.dtRituals, 14);
        assert.strictEqual(stats.defense, 12);
      });

      it('Especialista (NEX 5%): 18 PV, 6 PE, 16 SAN', () => {
        const stats = calculateMaxStats('Especialista', 5, canonicalAttrs);
        assert.strictEqual(stats.pvMax, 18);
        assert.strictEqual(stats.peMax, 6);
        assert.strictEqual(stats.sanMax, 16);
      });

      it('Ocultista (NEX 5%): 14 PV, 7 PE, 20 SAN', () => {
        const stats = calculateMaxStats('Ocultista', 5, canonicalAttrs);
        assert.strictEqual(stats.pvMax, 14);
        assert.strictEqual(stats.peMax, 7);
        assert.strictEqual(stats.sanMax, 20);
      });

      it('Sobrevivente (NEX 0%): 10 PV, 5 PE, 8 SAN', () => {
        const stats = calculateMaxStats('Sobrevivente', 0, canonicalAttrs);
        assert.strictEqual(stats.pvMax, 10);
        assert.strictEqual(stats.peMax, 5);
        assert.strictEqual(stats.sanMax, 8);
      });
    });

    describe('2. Escalonamento com NEX (sem poderes passivos)', () => {
      it('Combatente escalona corretamente em NEX 10%, 20%, 50%, 65% e 99%', () => {
        // 10% (1 avanço: +6 PV, +5 PE, +3 SAN)
        const s10 = calculateMaxStats('Combatente', 10, canonicalAttrs);
        assert.strictEqual(s10.pvMax, 28);
        assert.strictEqual(s10.peMax, 10);
        assert.strictEqual(s10.sanMax, 15);
        assert.strictEqual(s10.peRound, 2);

        // 20% (3 avanços)
        const s20 = calculateMaxStats('Combatente', 20, canonicalAttrs);
        assert.strictEqual(s20.pvMax, 40);
        assert.strictEqual(s20.peMax, 20);
        assert.strictEqual(s20.sanMax, 21);

        // 50% (9 avanços)
        const s50 = calculateMaxStats('Combatente', 50, canonicalAttrs);
        assert.strictEqual(s50.pvMax, 76);
        assert.strictEqual(s50.peMax, 50);
        assert.strictEqual(s50.sanMax, 39);
        assert.strictEqual(s50.peRound, 10);

        // 65% (12 avanços)
        const s65 = calculateMaxStats('Combatente', 65, canonicalAttrs);
        assert.strictEqual(s65.pvMax, 94);
        assert.strictEqual(s65.peMax, 65);
        assert.strictEqual(s65.sanMax, 48);

        // 99% (19 avanços - 20º patamar, limite de PE canônico = 20)
        const s99 = calculateMaxStats('Combatente', 99, canonicalAttrs);
        assert.strictEqual(s99.pvMax, 136);
        assert.strictEqual(s99.peMax, 100);
        assert.strictEqual(s99.sanMax, 69);
        assert.strictEqual(s99.peRound, 20);
      });
    });

    describe('3. Poderes Passivos Individuais (Combatente NEX 50%)', () => {
      it('Vitalidade Reforçada: +1 PV/5% NEX (total +10) e +2 Fortitude', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasVitalidadeReforcada: true });
        assert.strictEqual(stats.pvMax, 86);
        assert.strictEqual(stats.skillBonuses['Fortitude'], 2);
      });

      it('Sangue de Ferro: +2 PV/5% NEX (total +20)', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasSangueDeFerro: true });
        assert.strictEqual(stats.pvMax, 96);
      });

      it('Sangue de Ferro com Afinidade: +3 PV/5% NEX (total +30) e +5 Fortitude', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, {
          hasSangueDeFerro: true,
          hasSangueDeFerroAffinity: true,
        });
        assert.strictEqual(stats.pvMax, 106);
        assert.strictEqual(stats.skillBonuses['Fortitude'], 5);
      });

      it('Potencial Aprimorado: +1 PE/5% NEX (total +10) e +2 PE com afinidade (total +20)', () => {
        const normal = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasPotencialAprimorado: true });
        assert.strictEqual(normal.peMax, 60);

        const affinity = calculateMaxStats('Combatente', 50, canonicalAttrs, {
          hasPotencialAprimorado: true,
          hasPotencialAprimoradoAffinity: true,
        });
        assert.strictEqual(affinity.peMax, 70);
      });

      it('Vontade Inabalável: +1 PE/10% NEX (total +5 em 50%) e +2 Vontade', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasVontadeInabalavel: true });
        assert.strictEqual(stats.peMax, 55);
        assert.strictEqual(stats.skillBonuses['Vontade'], 2);
      });

      it('Combatente Esforçado: +1 PE/5% NEX (total +10 em 50%)', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasCombatenteEsforcado: true });
        assert.strictEqual(stats.peMax, 60);
      });
    });

    describe('4. Bônus de Origens Progressivos e Fixos', () => {
      it('Desgarrado: +1 PV/5% NEX', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasDesgarrado: true });
        assert.strictEqual(stats.pvMax, 86);
      });

      it('Universitário: +1 PE/5% NEX e +1 limite de PE por turno', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasUniversitario: true });
        assert.strictEqual(stats.peMax, 60);
        assert.strictEqual(stats.peRound, 11);
      });

      it('Vítima: +1 SAN/5% NEX', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasVitima: true });
        assert.strictEqual(stats.sanMax, 49);
      });

      it('Cultista Arrependido: penalidade fixa de -5 SAN', () => {
        const s5 = calculateMaxStats('Combatente', 5, canonicalAttrs, { hasCultistaArrependido: true });
        assert.strictEqual(s5.sanMax, 7);
        const s50 = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasCultistaArrependido: true });
        assert.strictEqual(s50.sanMax, 34);
      });

      it('Mergulhador: bônus fixo de +5 PV', () => {
        const s5 = calculateMaxStats('Combatente', 5, canonicalAttrs, { hasMergulhador: true });
        assert.strictEqual(s5.pvMax, 27);
        const s50 = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasMergulhador: true });
        assert.strictEqual(s50.pvMax, 81);
      });

      it('Personalidade Esotérica: bônus fixo de +3 PE', () => {
        const s5 = calculateMaxStats('Combatente', 5, canonicalAttrs, { hasPersonalidadeEsoterica: true });
        assert.strictEqual(s5.peMax, 8);
        const s50 = calculateMaxStats('Combatente', 50, canonicalAttrs, { hasPersonalidadeEsoterica: true });
        assert.strictEqual(s50.peMax, 53);
      });
    });

    describe('5. Acúmulo de Múltiplos Bônus (Stacking)', () => {
      it('Combatente Tanque: Desgarrado + Vitalidade Reforçada + Sangue de Ferro (Afinidade) + Mergulhador', () => {
        const stats = calculateMaxStats('Combatente', 50, canonicalAttrs, {
          hasDesgarrado: true,
          hasVitalidadeReforcada: true,
          hasSangueDeFerro: true,
          hasSangueDeFerroAffinity: true,
          hasMergulhador: true,
        });
        // 76 base/nex + 10 (Desg) + 10 (VR) + 30 (SdF) + 5 (Merg) = 131 PV
        assert.strictEqual(stats.pvMax, 131);
        // Fortitude: +2 (VR) + +5 (SdF Afim) = +7
        assert.strictEqual(stats.skillBonuses['Fortitude'], 7);
      });

      it('Especialista Acadêmico: Universitário + Potencial Aprimorado (Afinidade) + Vontade Inabalável + Personalidade Esotérica', () => {
        const scholarAttrs: CharacterAttributes = { AGI: 2, FOR: 1, INT: 3, PRE: 4, VIG: 1 };
        const stats = calculateMaxStats('Especialista', 50, scholarAttrs, {
          hasUniversitario: true,
          hasPotencialAprimorado: true,
          hasPotencialAprimoradoAffinity: true,
          hasVontadeInabalavel: true,
          hasPersonalidadeEsoterica: true,
        });
        // Base PE: 3 + 4 = 7; avanço: 3 + 4 = 7; 9 avanços = 63; Base + NEX = 70 PE
        // Bônus: 10 (Uni) + 20 (PA Afim) + 5 (VI) + 3 (PEsot) = 38
        // Total esperado = 70 + 38 = 108 PE
        assert.strictEqual(stats.peMax, 108);
        assert.strictEqual(stats.peRound, 11);
        assert.strictEqual(stats.dtRituals, 25); // 10 + 11 + 4
        assert.strictEqual(stats.skillBonuses['Vontade'], 2);
      });

      it('Ocultista Cultista com Transcendências: Cultista Arrependido + transcendedCount 4 + Vítima', () => {
        const stats = calculateMaxStats('Ocultista', 50, canonicalAttrs, {
          hasCultistaArrependido: true,
          transcendedCount: 4,
          hasVitima: true,
        });
        // Base Ocultista: 20 SAN. 9 avanços × 5 = 45. Com 4 transcendências: 45 - 20 = 25 SAN de NEX.
        // Vítima: 10 × 1 = +10 SAN. Cultista: -5 SAN.
        // Total: 20 + 25 + 10 - 5 = 50 SAN
        assert.strictEqual(stats.sanMax, 50);
      });
    });

    describe('6. Casos Limítrofes (Edge Cases)', () => {
      it('garante ganho mínimo de 1 por avanço mesmo com Vigor e Presença negativos', () => {
        const negativeAttrs: CharacterAttributes = { AGI: 1, FOR: 1, INT: 1, PRE: -3, VIG: -2 };
        const stats = calculateMaxStats('Combatente', 50, negativeAttrs);
        // Base PV: 20 + (-2) = 18. Ganhos por nível: max(1, 4 - 2) = 2. 9 níveis = 18. Total = 36.
        assert.strictEqual(stats.pvMax, 36);
        assert.ok(stats.peMax >= 1);
      });

      it('NEX 99% conta exatamente como 20 passos de 5% e 10 passos de 10%', () => {
        assert.strictEqual(getStepCount(99), 20);
        assert.strictEqual(getTenPercentStepCount(99), 10);
      });

      it('desconta Sanidade de avanços em que o personagem transcendeu', () => {
        const statsNormal = calculateMaxStats('Ocultista', 50, canonicalAttrs);
        const statsTranscended = calculateMaxStats('Ocultista', 50, canonicalAttrs, { transcendedCount: 4 });
        assert.strictEqual(statsNormal.sanMax - statsTranscended.sanMax, 20);
      });

      it('detecta Combatente Esforçado, Mergulhador e Personalidade Esotérica via ficha', () => {
        const sheet: CharacterSheet = {
          id: 'test_esforcado',
          name: 'Lucas Nadador',
          player: 'Player 1',
          nex: 30,
          rank: 'Operador',
          originId: 'origin_mergulhador',
          classId: 'class_combatente',
          trackId: '',
          affinity: 'Energia',
          attributes: { AGI: 2, FOR: 3, INT: 2, PRE: 1, VIG: 2 },
          pvCurrent: 50,
          pvMax: 50,
          peCurrent: 20,
          peMax: 20,
          sanCurrent: 20,
          sanMax: 20,
          defenseBonus: 10,
          notes: '',
          updatedAt: '2026-11-02T12:00:00.000Z',
          skills: {},
          entityIds: ['power_combatente_esforcado', 'power_personalidade_esoterica'],
          abilities: [],
        };

        const mockEnts: Record<string, any> = {
          origin_mergulhador: { id: 'origin_mergulhador', name: 'Mergulhador' },
          class_combatente: { id: 'class_combatente', name: 'Combatente' },
          power_combatente_esforcado: { id: 'power_combatente_esforcado', name: 'Combatente Esforçado' },
          power_personalidade_esoterica: { id: 'power_personalidade_esoterica', name: 'Personalidade Esotérica' },
        };

        const getEntityById = (id: string) => mockEnts[id];
        const detected = detectVitalsModifiers(sheet, getEntityById);
        assert.strictEqual(detected.hasMergulhador, true);
        assert.strictEqual(detected.hasCombatenteEsforcado, true);
        assert.strictEqual(detected.hasPersonalidadeEsoterica, true);

        const vitals = calculateCharacterVitals(sheet, getEntityById);
        // NEX 30%: 6 passos de 5%.
        // Base Combatente VIG 2: 22 PV. 5 avanços x 6 = 30 PV. Base+NEX = 52 PV.
        // + Mergulhador: +5 PV fixo -> 57 PV
        assert.strictEqual(vitals.pvMax, 57);
        // Base PE PRE 1: 3 PE. 5 avanços x 3 = 15 PE. Base+NEX = 18 PE.
        // + Combatente Esforçado: 6 x 1 = 6 PE.
        // + Personalidade Esotérica: +3 PE fixo.
        // Total PE = 18 + 6 + 3 = 27 PE
        assert.strictEqual(vitals.peMax, 27);
      });

      it('detecta hasMergulhador quando ability.name na ficha é "Fôlego de Nadador"', () => {
        const sheet: Partial<CharacterSheet> = {
          id: 'test_folego',
          name: 'Agente Nadador',
          classId: 'Combatente',
          originId: 'origem_custom',
          nex: 10,
          attributes: { AGI: 2, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
          abilities: [
            {
              id: 'ab_folego',
              type: 'habilidade',
              name: 'Fôlego de Nadador',
              description: 'Você recebe +5 PV e pode prender a respiração por mais tempo.',
              cost: '0',
              originPage: '',
            },
          ] as any,
        };

        const detected = detectVitalsModifiers(sheet as CharacterSheet);
        assert.strictEqual(detected.hasMergulhador, true);

        const vitals = calculateCharacterVitals(sheet as CharacterSheet);
        // Combatente NEX 10%, VIG 2: Base 22 PV + 1 avanço (6 PV) = 28 PV + Mergulhador 5 PV = 33 PV
        assert.strictEqual(vitals.pvMax, 33);
      });

      it('detecta poderes a partir de raw character.entityIds com underscores mesmo sem getEntityById', () => {
        const sheet: Partial<CharacterSheet> = {
          id: 'test_raw_ids',
          name: 'Agente Sobrevivente',
          classId: 'Combatente',
          originId: 'origin__livro_base__desgarrado',
          nex: 20,
          attributes: { AGI: 1, FOR: 3, INT: 1, PRE: 2, VIG: 3 },
          entityIds: [
            'power__livro_base__vitalidade_reforcada',
            'power__livro_base__sangue_de_ferro',
            'power__livro_base__potencial_aprimorado',
            'power__livro_base__vontade_inabalavel',
            'power__arquivos_secretos_04__combatente_esforcado',
            'power__sobrevivendo_ao_horror__personalidade_esoterica',
            'power__livro_base__casca_grossa',
          ],
        };

        // Sem getEntityById fornecido
        const detected = detectVitalsModifiers(sheet as CharacterSheet);
        assert.strictEqual(detected.hasDesgarrado, true);
        assert.strictEqual(detected.hasVitalidadeReforcada, true);
        assert.strictEqual(detected.hasSangueDeFerro, true);
        assert.strictEqual(detected.hasPotencialAprimorado, true);
        assert.strictEqual(detected.hasVontadeInabalavel, true);
        assert.strictEqual(detected.hasCombatenteEsforcado, true);
        assert.strictEqual(detected.hasPersonalidadeEsoterica, true);
        assert.strictEqual(detected.hasCascaGrossa, true);

        const vitals = calculateCharacterVitals(sheet as CharacterSheet);
        assert.strictEqual(vitals.defense, 11); // 10 + AGI(1)
        assert.ok(vitals.breakdown.pvBonuses.some((b) => b.name.includes('Vitalidade Reforçada')));
        assert.ok(vitals.breakdown.pvBonuses.some((b) => b.name.includes('Sangue de Ferro')));
        assert.ok(vitals.breakdown.peBonuses.some((b) => b.name.includes('Potencial Aprimorado')));
        assert.ok(vitals.breakdown.peBonuses.some((b) => b.name.includes('Vontade Inabalável')));
        assert.ok(vitals.breakdown.peBonuses.some((b) => b.name.includes('Combatente Esforçado')));
        assert.ok(vitals.breakdown.peBonuses.some((b) => b.name.includes('Personalidade Esotérica')));
      });
    });

    describe('7. Alerta Permissivo de Pré-requisitos (confirmUnmetPrerequisites)', () => {
      it('deve disparar onConfirm quando confirmado no ambiente web', () => {
        let confirmed = false;
        let cancelled = false;
        let capturedMessage = '';

        (globalThis.window as unknown as { confirm: (msg: string) => boolean }).confirm = (msg: string) => {
          capturedMessage = msg;
          return true;
        };

        confirmUnmetPrerequisites(
          'Golpe Pesado',
          ['Requer Força 2', 'Requer Luta treinada'],
          () => {
            confirmed = true;
          },
          () => {
            cancelled = true;
          }
        );

        assert.strictEqual(confirmed, true);
        assert.strictEqual(cancelled, false);
        assert.ok(capturedMessage.includes('Golpe Pesado'));
        assert.ok(capturedMessage.includes('Requer Força 2'));
        assert.ok(capturedMessage.includes('Deseja adicionar mesmo assim?'));
      });

      it('deve disparar onCancel quando cancelado no ambiente web', () => {
        let confirmed = false;
        let cancelled = false;

        (globalThis.window as unknown as { confirm: (msg: string) => boolean }).confirm = () => false;

        confirmUnmetPrerequisites(
          'Afortunado',
          'Requer NEX 30%',
          () => {
            confirmed = true;
          },
          () => {
            cancelled = true;
          }
        );

        assert.strictEqual(confirmed, false);
        assert.strictEqual(cancelled, true);
      });
    });

    describe('8. Concessão Canônica de Perícias (applyCanonicalSkillGrant)', () => {
      it('deve conceder grau Treinado (degree: 5, bonus: 0) para perícia não existente no registro', () => {
        const skills: Record<string, CharacterSkillEntry> = {};
        const result = applyCanonicalSkillGrant(skills, 'Acrobacia');

        assert.strictEqual(result.Acrobacia.degree, 5);
        assert.strictEqual(result.Acrobacia.bonus, 0);
        assert.strictEqual(skills.Acrobacia, undefined, 'objeto original de perícias não deve ser mutado');
      });

      it('deve conceder grau Treinado (degree: 5) para perícia com degree: 0 mantendo qualquer bônus existente e customName', () => {
        const skills: Record<string, CharacterSkillEntry> = {
          Diplomacia: { degree: 0, bonus: 1, customName: 'Diplomacia Corporativa' },
        };
        const result = applyCanonicalSkillGrant(skills, 'Diplomacia');

        assert.strictEqual(result.Diplomacia.degree, 5);
        assert.strictEqual(result.Diplomacia.bonus, 1);
        assert.strictEqual(result.Diplomacia.customName, 'Diplomacia Corporativa');
      });

      it('deve preservar grau de treinamento e adicionar bônus fixo de +2 em perícia já Treinada (degree: 5), totalizando modificador 7', () => {
        const skills: Record<string, CharacterSkillEntry> = {
          Luta: { degree: 5, bonus: 0 },
        };
        const result = applyCanonicalSkillGrant(skills, 'Luta');

        assert.strictEqual(result.Luta.degree, 5, 'não deve duplicar nem saltar de grau');
        assert.strictEqual(result.Luta.bonus, 2, 'deve somar +2 no bônus');
        assert.strictEqual(result.Luta.degree + result.Luta.bonus, 7);
      });

      it('deve preservar grau Veterano (degree: 10) e somar bônus fixo de +2', () => {
        const skills: Record<string, CharacterSkillEntry> = {
          Tática: { degree: 10, bonus: 0 },
        };
        const result = applyCanonicalSkillGrant(skills, 'Tática');

        assert.strictEqual(result.Tática.degree, 10, 'deve manter grau 10');
        assert.strictEqual(result.Tática.bonus, 2);
        assert.strictEqual(result.Tática.degree + result.Tática.bonus, 12);
      });

      it('deve preservar grau Expert (degree: 15) e somar bônus fixo de +2', () => {
        const skills: Record<string, CharacterSkillEntry> = {
          Ocultismo: { degree: 15, bonus: 0 },
        };
        const result = applyCanonicalSkillGrant(skills, 'Ocultismo');

        assert.strictEqual(result.Ocultismo.degree, 15, 'deve manter grau 15');
        assert.strictEqual(result.Ocultismo.bonus, 2);
        assert.strictEqual(result.Ocultismo.degree + result.Ocultismo.bonus, 17);
      });

      it('deve acumular o bônus fixo de +2 sobre bônus pré-existente (ex: +2 se torna +4)', () => {
        const skills: Record<string, CharacterSkillEntry> = {
          Percepção: { degree: 5, bonus: 2 },
        };
        const result = applyCanonicalSkillGrant(skills, 'Percepção');

        assert.strictEqual(result.Percepção.degree, 5);
        assert.strictEqual(result.Percepção.bonus, 4);
        assert.strictEqual(result.Percepção.degree + result.Percepção.bonus, 9);
      });

      it('deve retornar clone raso imutável e preservar outras perícias intactas', () => {
        const skills: Record<string, CharacterSkillEntry> = {
          Atletismo: { degree: 5, bonus: 0 },
          Pontaria: { degree: 10, bonus: 3 },
        };
        const result = applyCanonicalSkillGrant(skills, 'Atletismo');

        assert.notStrictEqual(result, skills);
        assert.strictEqual(skills.Atletismo.bonus, 0, 'original não deve mudar');
        assert.strictEqual(result.Atletismo.bonus, 2);
        assert.strictEqual(result.Pontaria.degree, 10);
        assert.strictEqual(result.Pontaria.bonus, 3);
      });

      it('deve encadear sucessivas concessões na mesma perícia corretamente', () => {
        let skills: Record<string, CharacterSkillEntry> = {};
        // 1ª concessão: torna-se Treinado (5, +0)
        skills = applyCanonicalSkillGrant(skills, 'Investigação');
        assert.strictEqual(skills.Investigação.degree, 5);
        assert.strictEqual(skills.Investigação.bonus, 0);

        // 2ª concessão: já treinado -> mantém 5 e adiciona +2
        skills = applyCanonicalSkillGrant(skills, 'Investigação');
        assert.strictEqual(skills.Investigação.degree, 5);
        assert.strictEqual(skills.Investigação.bonus, 2);

        // 3ª concessão: já treinado -> mantém 5 e acumula +2 (total +4)
        skills = applyCanonicalSkillGrant(skills, 'Investigação');
        assert.strictEqual(skills.Investigação.degree, 5);
        assert.strictEqual(skills.Investigação.bonus, 4);
      });
    });

    describe('9. Validação de Pré-requisitos de Rituais (checkRitualPrerequisites)', () => {
      const testChar: any = {
        nex: 20,
        attributes: { FOR: 1, AGI: 2, INT: 3, PRE: 3, VIG: 2 },
        skills: {
          Ocultismo: { degree: 5, bonus: 0 },
          Vontade: { degree: 5, bonus: 0 },
          Luta: { degree: 0, bonus: 0 },
        },
        entityIds: [],
        abilities: [],
      };

      it('deve aprovar ritual dentro do limite de círculo e sem pré-requisito adicional', () => {
        const rit = { name: 'Cicatrização', circle: 1 };
        const result = checkRitualPrerequisites(rit, testChar, 1);

        assert.strictEqual(result.met, true);
        assert.strictEqual(result.unmetDetails.length, 0);
        assert.strictEqual(result.details, 'Requisitos atendidos');
      });

      it('deve considerar círculo 1 por padrão quando circle não for especificado', () => {
        const rit = { name: 'Ritual Misterioso' };
        const result = checkRitualPrerequisites(rit, testChar, 1);

        assert.strictEqual(result.met, true);
        assert.strictEqual(result.unmetDetails.length, 0);
      });

      it('deve reprovar ritual que excede o círculo máximo permitido com mensagem explicativa clara', () => {
        const rit = { name: 'Purgatório', circle: 2 };
        const result = checkRitualPrerequisites(rit, testChar, 1);

        assert.strictEqual(result.met, false);
        assert.strictEqual(result.unmetDetails.length, 1);
        assert.strictEqual(
          result.unmetDetails[0],
          'Requer acesso a rituais de 2º círculo (atual: 1º círculo)'
        );
        assert.ok(result.details.includes('Requer acesso a rituais de 2º círculo (atual: 1º círculo)'));
      });

      it('deve aprovar ritual cujo círculo atende a limites de círculos superiores', () => {
        const rit = { name: 'Deflagração de Energia', circle: 3 };
        const result = checkRitualPrerequisites(rit, testChar, 3);

        assert.strictEqual(result.met, true);
        assert.strictEqual(result.unmetDetails.length, 0);
      });

      it('deve avaliar pré-requisito descritivo do ritual e aprovar quando atendido', () => {
        const rit = { name: 'Adivinhação', circle: 1, prerequisite: 'Pre 2' };
        const result = checkRitualPrerequisites(rit, testChar, 1);

        assert.strictEqual(result.met, true);
        assert.strictEqual(result.unmetDetails.length, 0);
      });

      it('deve reprovar ritual com pré-requisito descritivo não atendido', () => {
        const rit = { name: 'Lâmina do Medo', circle: 1, prerequisite: 'For 3' };
        const result = checkRitualPrerequisites(rit, testChar, 1);

        assert.strictEqual(result.met, false);
        assert.strictEqual(result.unmetDetails.length, 1);
        assert.ok(result.unmetDetails[0].includes('Requer FOR 3'));
      });

      it('deve combinar falha de círculo excedido e pré-requisito não atendido em mensagens completas', () => {
        const rit = { name: 'Ritual Proibido', circle: 3, prerequisite: 'For 3, treinado em Luta' };
        const result = checkRitualPrerequisites(rit, testChar, 1);

        assert.strictEqual(result.met, false);
        assert.strictEqual(result.unmetDetails.length, 3);
        assert.strictEqual(
          result.unmetDetails[0],
          'Requer acesso a rituais de 3º círculo (atual: 1º círculo)'
        );
        assert.ok(result.unmetDetails[1].includes('Requer FOR 3'));
        assert.ok(result.unmetDetails[2].includes('treinado em Luta'));
        assert.ok(result.details.includes('3º círculo'));
      });

      it('deve considerar contexto de evolução (targetAttributes ou targetNex) ao avaliar pré-requisitos', () => {
        const rit = { name: 'Ritual Transcendental', circle: 2, prerequisite: 'For 2' };
        const context = {
          targetAttributes: { FOR: 2, AGI: 2, INT: 3, PRE: 3, VIG: 2 },
        };
        const result = checkRitualPrerequisites(rit, testChar, 2, undefined, context);

        assert.strictEqual(result.met, true);
        assert.strictEqual(result.unmetDetails.length, 0);
      });

      it('deve lidar com character nulo ou indefinido graciosamente sem lançar erro', () => {
        const rit = { name: 'Ritual Básico', circle: 1 };
        const result = checkRitualPrerequisites(rit, null, 1);

        assert.strictEqual(result.met, true);
        assert.strictEqual(result.unmetDetails.length, 0);
      });
    });
  });

});

describe('10. Extração de Concessões Canônicas de Perícias (extractCanonicalSkillGrants)', () => {
  it('detecta "treinamento ou +2" em poder geral', () => {
    const r = extractCanonicalSkillGrants(
      'Você recebe treinamento em Sobrevivência ou, se já for treinado nesta perícia, recebe +2 nela. Além disso...'
    );
    assert.deepStrictEqual(r, ['Sobrevivência']);
  });

  it('ignora bônus temporários que exigem gasto de PE', () => {
    const r = extractCanonicalSkillGrants('Você pode gastar 2 PE para receber +5 em Vontade.');
    assert.deepStrictEqual(r, []);
  });

  it('perícia nova vira Treinada (sem +2); já treinada recebe +2 fixo', () => {
    const base = { Diplomacia: { degree: 5 as const, bonus: 0 } };
    const grants = extractCanonicalSkillGrants('Você recebe +2 em Diplomacia. Além disso...', 'Conexões', base);
    assert.deepStrictEqual(grants, ['Diplomacia']);
    const trained = applyCanonicalSkillGrant(base, 'Diplomacia');
    assert.strictEqual(trained.Diplomacia.degree, 5);
    assert.strictEqual(trained.Diplomacia.bonus, 2);
    const fresh = applyCanonicalSkillGrant({}, 'Diplomacia');
    assert.strictEqual(fresh.Diplomacia.degree, 5);
    assert.strictEqual(fresh.Diplomacia.bonus, 0);
  });

  it('escolha entre duas perícias prefere a ainda não treinada', () => {
    const skills = { Pilotagem: { degree: 5 as const, bonus: 0 } };
    const r = extractCanonicalSkillGrants(
      'Você recebe treinamento em Pilotagem ou Tecnologia (escolha uma). Se já for treinado, recebe +2.',
      'Companheiro Drone',
      skills
    );
    assert.deepStrictEqual(r, ['Tecnologia']);
  });
});
