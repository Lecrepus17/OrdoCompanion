import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CharacterSheet,
  CharacterAttack,
  CharacterInventoryItem,
} from '../src/types/compendium';
import {
  getCharacterProficiencies,
  checkWeaponProficiency,
  checkProtectionProficiency,
  getProtectionDicePenalty,
} from '../src/utils/proficiencies';
import {
  calculateActiveItemSkillBonuses,
  BANNED_ITEM_SKILLS,
  isBannedItemSkill,
  isClothingItem,
  isUtensilItem,
} from '../src/utils/inventorySkills';

describe('Milestone 3 — R2: Verificação Canônica de Proficiências e Penalidades (-2d20)', () => {
  const baseSheet: CharacterSheet = {
    id: 'char_m3_test',
    name: 'Agente de Teste',
    player: 'Mestre',
    originId: 'orig_policial',
    classId: 'cls_combatente',
    trackId: '',
    rank: 'Operador',
    affinity: 'Nenhum',
    nex: 20,
    attributes: { AGI: 3, FOR: 2, INT: 1, PRE: 2, VIG: 2 },
    pvCurrent: 30,
    pvMax: 30,
    sanCurrent: 20,
    sanMax: 20,
    peCurrent: 20,
    peMax: 20,
    defenseBonus: 10,
    skills: {
      Luta: { degree: 5, bonus: 0 },
      Pontaria: { degree: 5, bonus: 0 },
      Reflexos: { degree: 5, bonus: 0 },
      Fortitude: { degree: 5, bonus: 0 },
      Investigação: { degree: 0, bonus: 0 },
    },
    attacks: [],
    abilities: [],
    inventory: [],
    entityIds: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  };

  describe('1. Derivação Canônica de Proficiências por Classe, Origem e Poderes', () => {
    test('Combatente inicia com armas simples, táticas e proteções leves (sem pesadas)', () => {
      const combatente: CharacterSheet = { ...baseSheet, classId: 'combatente' };
      const profs = getCharacterProficiencies(combatente);

      assert.strictEqual(profs.simpleWeapons, true);
      assert.strictEqual(profs.tacticalWeapons, true);
      assert.strictEqual(profs.heavyWeapons, false);
      assert.strictEqual(profs.lightProtection, true);
      assert.strictEqual(profs.heavyProtection, false);
    });

    test('Especialista inicia com armas simples e proteções leves (sem táticas ou pesadas)', () => {
      const especialista: CharacterSheet = { ...baseSheet, classId: 'especialista' };
      const profs = getCharacterProficiencies(especialista);

      assert.strictEqual(profs.simpleWeapons, true);
      assert.strictEqual(profs.tacticalWeapons, false);
      assert.strictEqual(profs.heavyWeapons, false);
      assert.strictEqual(profs.lightProtection, true);
      assert.strictEqual(profs.heavyProtection, false);
    });

    test('Ocultista inicia apenas com armas simples (sem proteções leves ou pesadas)', () => {
      const ocultista: CharacterSheet = { ...baseSheet, classId: 'ocultista' };
      const profs = getCharacterProficiencies(ocultista);

      assert.strictEqual(profs.simpleWeapons, true);
      assert.strictEqual(profs.tacticalWeapons, false);
      assert.strictEqual(profs.heavyWeapons, false);
      assert.strictEqual(profs.lightProtection, false);
      assert.strictEqual(profs.heavyProtection, false);
    });

    test('Poderes "Armamento Pesado" e "Proteção Pesada" concedem as respectivas proficiências', () => {
      const combatenteComPoderes: CharacterSheet = {
        ...baseSheet,
        classId: 'combatente',
        abilities: [
          {
            id: 'ab_1',
            name: 'Armamento Pesado',
            cost: 'Passiva',
            originPage: 'Livro Base p. 25',
            description: 'Proficiência com armas pesadas',
            type: 'poder',
          },
          {
            id: 'ab_2',
            name: 'Proteção Pesada',
            cost: 'Passiva',
            originPage: 'Livro Base p. 25',
            description: 'Proficiência com proteções pesadas',
            type: 'poder',
          },
        ],
      };
      const profs = getCharacterProficiencies(combatenteComPoderes);

      assert.strictEqual(profs.heavyWeapons, true);
      assert.strictEqual(profs.heavyProtection, true);
    });

    test('Origem Treinado pela Hell Hunters eleva proficiências cumulativamente', () => {
      // Combatente + Hell Hunters: já tem táticas -> ganha pesadas; já tem proteções leves -> ganha proteções pesadas!
      const combatenteHH: CharacterSheet = {
        ...baseSheet,
        classId: 'combatente',
        originId: 'origin__arquivos_secretos_03__treinado_pela_hell_hunters',
      };
      const profsHH = getCharacterProficiencies(combatenteHH);
      assert.strictEqual(profsHH.tacticalWeapons, true);
      assert.strictEqual(profsHH.heavyWeapons, true);
      assert.strictEqual(profsHH.lightProtection, true);
      assert.strictEqual(profsHH.heavyProtection, true);

      // Especialista + Hell Hunters: não tem táticas -> ganha táticas; já tem leves -> ganha proteções pesadas!
      const especialistaHH: CharacterSheet = {
        ...baseSheet,
        classId: 'especialista',
        originId: 'origin__arquivos_secretos_03__treinado_pela_hell_hunters',
      };
      const profsEspHH = getCharacterProficiencies(especialistaHH);
      assert.strictEqual(profsEspHH.tacticalWeapons, true);
      assert.strictEqual(profsEspHH.heavyWeapons, false);
      assert.strictEqual(profsEspHH.lightProtection, true);
      assert.strictEqual(profsEspHH.heavyProtection, true);
    });

    test('Poderes de Especialista concedem proficiências táticas específicas', () => {
      // Balística Avançada concede armas táticas de fogo
      const espFogo: CharacterSheet = {
        ...baseSheet,
        classId: 'especialista',
        entityIds: ['power__livro_base__balistica_avancada'],
      };
      const profsFogo = getCharacterProficiencies(espFogo);
      assert.strictEqual(profsFogo.tacticalFirearms, true);
      assert.strictEqual(profsFogo.tacticalWeapons, false);

      // Ninja Urbano concede armas táticas corpo a corpo
      const espMelee: CharacterSheet = {
        ...baseSheet,
        classId: 'especialista',
        entityIds: ['power__livro_base__ninja_urbano'],
      };
      const profsMelee = getCharacterProficiencies(espMelee);
      assert.strictEqual(profsMelee.tacticalMelee, true);
      assert.strictEqual(profsMelee.tacticalWeapons, false);

      // Trilha Atirador de Elite (Mira de Elite) concede armas de balas longas
      const espAtirador: CharacterSheet = {
        ...baseSheet,
        classId: 'especialista',
        trackId: 'track__livro_base__atirador_de_elite',
      };
      const profsAtirador = getCharacterProficiencies(espAtirador);
      assert.strictEqual(profsAtirador.longBulletsFirearms, true);
    });
  });

  describe('2. Verificação de Proficiência em Armas (checkWeaponProficiency)', () => {
    test('Armas simples são permitidas para qualquer personagem', () => {
      const ocultistaProfs = getCharacterProficiencies({ ...baseSheet, classId: 'ocultista' });
      const checkFaca = checkWeaponProficiency({ name: 'Faca', proficiency: 'Simples' }, ocultistaProfs);
      const checkRevolver = checkWeaponProficiency({ name: 'Revólver', proficiency: 'Simples' }, ocultistaProfs);

      assert.strictEqual(checkFaca.isProficient, true);
      assert.strictEqual(checkRevolver.isProficient, true);
    });

    test('Armas táticas reprovam Especialista sem poderes correspondentes', () => {
      const espProfs = getCharacterProficiencies({ ...baseSheet, classId: 'especialista' });
      const checkKatana = checkWeaponProficiency(
        { name: 'Katana', proficiency: 'Tática', weaponType: 'Corpo a corpo' },
        espProfs
      );
      const checkFuzil = checkWeaponProficiency(
        { name: 'Fuzil de Assalto', proficiency: 'Tática', weaponType: 'Fogo' },
        espProfs
      );

      assert.strictEqual(checkKatana.isProficient, false);
      assert.strictEqual(checkFuzil.isProficient, false);
      assert.ok(checkKatana.reason?.includes('Armas Táticas'));
    });

    test('Especialista com Balística Avançada sabe usar arma tática de fogo, mas não corpo a corpo', () => {
      const espFogo = getCharacterProficiencies({
        ...baseSheet,
        classId: 'especialista',
        entityIds: ['power__livro_base__balistica_avancada'],
      });

      const checkFuzil = checkWeaponProficiency(
        { name: 'Fuzil de Assalto', proficiency: 'Tática', weaponType: 'Fogo' },
        espFogo
      );
      const checkKatana = checkWeaponProficiency(
        { name: 'Katana', proficiency: 'Tática', weaponType: 'Corpo a corpo' },
        espFogo
      );

      assert.strictEqual(checkFuzil.isProficient, true);
      assert.strictEqual(checkKatana.isProficient, false);
    });

    test('Armas pesadas exigem proficiência específica mesmo para Combatente', () => {
      const combatenteProfs = getCharacterProficiencies({ ...baseSheet, classId: 'combatente' });
      const checkMetralhadora = checkWeaponProficiency(
        { name: 'Metralhadora', proficiency: 'Pesada', weaponType: 'Fogo' },
        combatenteProfs
      );
      assert.strictEqual(checkMetralhadora.isProficient, false);
      assert.ok(checkMetralhadora.reason?.includes('Armas Pesadas'));

      const combatenteComPesadas = getCharacterProficiencies({
        ...baseSheet,
        classId: 'combatente',
        abilities: [{ id: '1', name: 'Armamento Pesado', cost: '', originPage: '', description: '', type: 'poder' }],
      });
      const checkAprovado = checkWeaponProficiency(
        { name: 'Metralhadora', proficiency: 'Pesada', weaponType: 'Fogo' },
        combatenteComPesadas
      );
      assert.strictEqual(checkAprovado.isProficient, true);
    });
  });

  describe('3. Verificação de Proficiência em Proteções e Escudos (checkProtectionProficiency & getProtectionDicePenalty)', () => {
    test('Proteção leve é permitida para Combatente e Especialista, mas reprova Ocultista', () => {
      const combatente = getCharacterProficiencies({ ...baseSheet, classId: 'combatente' });
      const especialista = getCharacterProficiencies({ ...baseSheet, classId: 'especialista' });
      const ocultista = getCharacterProficiencies({ ...baseSheet, classId: 'ocultista' });

      assert.strictEqual(checkProtectionProficiency({ name: 'Proteção Leve', type: 'Leve' }, combatente).isProficient, true);
      assert.strictEqual(checkProtectionProficiency({ name: 'Proteção Leve', type: 'Leve' }, especialista).isProficient, true);
      assert.strictEqual(checkProtectionProficiency({ name: 'Proteção Leve', type: 'Leve' }, ocultista).isProficient, false);
    });

    test('Escudo conta canonicamente como Proteção Pesada (Livro Base p. 64)', () => {
      const combatenteSemPoder = getCharacterProficiencies({ ...baseSheet, classId: 'combatente' });
      const checkEscudo = checkProtectionProficiency({ name: 'Escudo Tático', type: 'Escudo' }, combatenteSemPoder);

      assert.strictEqual(checkEscudo.isProficient, false);
      assert.ok(checkEscudo.reason?.includes('Proteção Pesada'));

      const combatenteComPoder = getCharacterProficiencies({
        ...baseSheet,
        classId: 'combatente',
        abilities: [{ id: '1', name: 'Proteção Pesada', cost: '', originPage: '', description: '', type: 'poder' }],
      });
      assert.strictEqual(checkProtectionProficiency({ name: 'Escudo Tático', type: 'Escudo' }, combatenteComPoder).isProficient, true);
    });

    test('getProtectionDicePenalty retorna -2 em testes de FOR e AGI se não proficiente, e 0 para INT, PRE, VIG', () => {
      const combatenteComPesadaSemProficiencia: CharacterSheet = {
        ...baseSheet,
        classId: 'combatente',
        protection: 'Proteção Pesada (+10 Defesa)',
      };

      assert.strictEqual(getProtectionDicePenalty(combatenteComPesadaSemProficiencia, 'FOR'), -2);
      assert.strictEqual(getProtectionDicePenalty(combatenteComPesadaSemProficiencia, 'AGI'), -2);
      assert.strictEqual(getProtectionDicePenalty(combatenteComPesadaSemProficiencia, 'INT'), 0);
      assert.strictEqual(getProtectionDicePenalty(combatenteComPesadaSemProficiencia, 'PRE'), 0);
      assert.strictEqual(getProtectionDicePenalty(combatenteComPesadaSemProficiencia, 'VIG'), 0);
    });

    test('getProtectionDicePenalty retorna 0 quando o agente possui proficiência com a proteção equipada', () => {
      const combatenteComProtecaoLeve: CharacterSheet = {
        ...baseSheet,
        classId: 'combatente',
        protection: 'Proteção Leve (+5 Defesa)',
      };

      assert.strictEqual(getProtectionDicePenalty(combatenteComProtecaoLeve, 'FOR'), 0);
      assert.strictEqual(getProtectionDicePenalty(combatenteComProtecaoLeve, 'AGI'), 0);
    });
  });
});

describe('Milestone 3 — R3: Vestimentas e Utensílios Didáticos em Perícias (calculateActiveItemSkillBonuses)', () => {
  test('Vestimenta e Utensílio aplicam bônus de +2 ou +5 na perícia alvo quando equipados', () => {
    const inventory: CharacterInventoryItem[] = [
      {
        id: 'inv_1',
        name: 'Botas Militares',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'vestimenta',
        targetSkill: 'Atletismo',
        skillBonus: 2,
        justification: 'Botas de cano alto com travas antiderrapantes',
      },
      {
        id: 'inv_2',
        name: 'Gazuas Avançadas',
        category: 'II',
        spaces: 1,
        equipped: true,
        itemType: 'utensilio',
        targetSkill: 'Crime',
        skillBonus: 5,
        justification: 'Conjunto suíço de michas de precisão',
      },
    ];

    const result = calculateActiveItemSkillBonuses(inventory);

    assert.strictEqual(result.activeClothesCount, 1);
    assert.strictEqual(result.isOverLimit, false);
    assert.strictEqual(result.effectiveBonuses['Atletismo']?.bonus, 2);
    assert.strictEqual(result.effectiveBonuses['Atletismo']?.sourceItemName, 'Botas Militares');
    assert.strictEqual(result.effectiveBonuses['Crime']?.bonus, 5);
    assert.strictEqual(result.effectiveBonuses['Crime']?.sourceItemName, 'Gazuas Avançadas');
  });

  test('Itens desequipados / despidos não concedem bônus', () => {
    const inventory: CharacterInventoryItem[] = [
      {
        id: 'inv_1',
        name: 'Jaqueta Tática',
        category: 'I',
        spaces: 1,
        equipped: false, // Despida!
        itemType: 'vestimenta',
        targetSkill: 'Fortitude',
        skillBonus: 2,
      },
    ];

    const result = calculateActiveItemSkillBonuses(inventory);
    assert.strictEqual(result.activeClothesCount, 0);
    assert.strictEqual(result.effectiveBonuses['Fortitude'], undefined);
  });

  test('Veto Canônico estrito: Vestimentas e Utensílios não se aplicam a Luta e Pontaria (Livro Base p. 63)', () => {
    assert.strictEqual(isBannedItemSkill('Luta'), true);
    assert.strictEqual(isBannedItemSkill('Pontaria'), true);
    assert.strictEqual(isBannedItemSkill('luta'), true);
    assert.strictEqual(isBannedItemSkill('pontaria'), true);
    assert.strictEqual(isBannedItemSkill('Atletismo'), false);
    assert.strictEqual(isBannedItemSkill('Investigação'), false);

    const inventory: CharacterInventoryItem[] = [
      {
        id: 'inv_banned_1',
        name: 'Luvas de Boxe',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'vestimenta',
        targetSkill: 'Luta',
        skillBonus: 2,
      },
      {
        id: 'inv_banned_2',
        name: 'Óculos de Tiro',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'utensilio',
        targetSkill: 'Pontaria',
        skillBonus: 2,
      },
    ];

    const result = calculateActiveItemSkillBonuses(inventory);
    assert.strictEqual(result.effectiveBonuses['Luta'], undefined);
    assert.strictEqual(result.effectiveBonuses['Pontaria'], undefined);
    assert.ok(result.warnings.some((w) => w.includes('Luta ou Pontaria')));
  });

  test('Teto Canônico de até 2 vestimentas ativas simultâneas (Livro Base p. 63)', () => {
    const inventory: CharacterInventoryItem[] = [
      {
        id: 'v1',
        name: 'Jaqueta de Couro',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'vestimenta',
        targetSkill: 'Fortitude',
        skillBonus: 2,
      },
      {
        id: 'v2',
        name: 'Botas de Escalada',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'vestimenta',
        targetSkill: 'Atletismo',
        skillBonus: 2,
      },
      {
        id: 'v3',
        name: 'Terno Elegante',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'vestimenta',
        targetSkill: 'Diplomacia',
        skillBonus: 2,
      },
    ];

    const result = calculateActiveItemSkillBonuses(inventory);

    // 3 vestimentas equipadas -> activeClothesCount = 3, isOverLimit = true
    assert.strictEqual(result.activeClothesCount, 3);
    assert.strictEqual(result.isOverLimit, true);
    // As 2 primeiras vestimentas concedem bônus
    assert.strictEqual(result.effectiveBonuses['Fortitude']?.bonus, 2);
    assert.strictEqual(result.effectiveBonuses['Atletismo']?.bonus, 2);
    // A 3ª vestimenta foi ignorada e está na lista de excedentes
    assert.strictEqual(result.effectiveBonuses['Diplomacia'], undefined);
    assert.ok(result.exceededClothes.includes('Terno Elegante'));
    assert.ok(result.warnings.some((w) => w.includes('Limite canônico de 2 vestimentas ativas excedido')));
  });

  test('Regra de Não-Cumulatividade: múltiplos itens na mesma perícia aplicam apenas o maior bônus (Math.max)', () => {
    const inventory: CharacterInventoryItem[] = [
      {
        id: 'v1',
        name: 'Sobretudo Discreto',
        category: 'I',
        spaces: 1,
        equipped: true,
        itemType: 'vestimenta',
        targetSkill: 'Furtividade',
        skillBonus: 2,
      },
      {
        id: 'u1',
        name: 'Camuflagem Óptica Utensílio',
        category: 'II',
        spaces: 1,
        equipped: true,
        itemType: 'utensilio',
        targetSkill: 'Furtividade',
        skillBonus: 5, // Bônus maior (+5)
      },
    ];

    const result = calculateActiveItemSkillBonuses(inventory);

    // Não deve somar (+7)! Deve prevalecer o maior bônus (+5)
    assert.strictEqual(result.effectiveBonuses['Furtividade']?.bonus, 5);
    assert.strictEqual(result.effectiveBonuses['Furtividade']?.sourceItemName, 'Camuflagem Óptica Utensílio');
    assert.ok(result.warnings.some((w) => w.includes('Bônus não cumulativo em Furtividade')));
  });

  test('Helpers isClothingItem e isUtensilItem reconhecem flags e itemType', () => {
    assert.strictEqual(isClothingItem({ id: '1', name: 'A', category: 'I', spaces: 1, itemType: 'vestimenta' }), true);
    assert.strictEqual(isClothingItem({ id: '2', name: 'B', category: 'I', spaces: 1, isVestimenta: true }), true);
    assert.strictEqual(isClothingItem({ id: '3', name: 'C', category: 'I', spaces: 1, itemType: 'geral' }), false);

    assert.strictEqual(isUtensilItem({ id: '4', name: 'D', category: 'I', spaces: 1, itemType: 'utensilio' }), true);
    assert.strictEqual(isUtensilItem({ id: '5', name: 'E', category: 'I', spaces: 1, isUtensilio: true }), true);
    assert.strictEqual(isUtensilItem({ id: '6', name: 'F', category: 'I', spaces: 1, itemType: 'vestimenta' }), false);
  });
});
