import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCharacterProficiencies,
  checkWeaponProficiency,
  checkProtectionProficiency,
  getProtectionDicePenalty,
} from '../src/utils/proficiencies';
import { CharacterSheet } from '../src/types/compendium';

function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
  return {
    id: 'char_test',
    name: 'Agente de Teste',
    player: 'Mestre',
    nex: 5,
    rank: 'Recruta',
    originId: 'origin__livro_base__policial',
    classId: 'class__livro_base__combatente',
    trackId: '',
    affinity: 'Nenhum',
    attributes: { AGI: 2, FOR: 2, INT: 1, PRE: 1, VIG: 2 },
    pvCurrent: 20,
    pvMax: 20,
    peCurrent: 4,
    peMax: 4,
    sanCurrent: 12,
    sanMax: 12,
    defenseBonus: 0,
    defenseEquip: 0,
    defenseOther: 0,
    skills: {},
    entityIds: [],
    abilities: [],
    inventory: [],
    notes: '',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Regras Canônicas de Proficiências e Penalidades (proficiencies.ts)', () => {
  describe('Proficiências Iniciais de Classe (Livro Base p. 24, 31, 35)', () => {
    it('Combatente deve começar com armas simples, armas táticas e proteções leves', () => {
      const char = createMockCharacter({ classId: 'class__livro_base__combatente' });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, true);
      assert.strictEqual(prof.lightProtection, true);
      // NÃO começa com pesadas:
      assert.strictEqual(prof.heavyWeapons, false);
      assert.strictEqual(prof.heavyProtection, false);
    });

    it('Especialista deve começar com armas simples e proteções leves', () => {
      const char = createMockCharacter({ classId: 'class__livro_base__especialista' });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, false);
      assert.strictEqual(prof.lightProtection, true);
      assert.strictEqual(prof.heavyWeapons, false);
      assert.strictEqual(prof.heavyProtection, false);
    });

    it('Ocultista deve começar apenas com armas simples (sem proteções)', () => {
      const char = createMockCharacter({ classId: 'class__livro_base__ocultista' });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, false);
      assert.strictEqual(prof.lightProtection, false);
      assert.strictEqual(prof.heavyWeapons, false);
      assert.strictEqual(prof.heavyProtection, false);
    });

    it('Sobrevivente deve começar apenas com armas simples', () => {
      const char = createMockCharacter({
        classId: 'class__sobrevivendo_ao_horror__sobrevivente',
      });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, false);
      assert.strictEqual(prof.lightProtection, false);
      assert.strictEqual(prof.heavyWeapons, false);
      assert.strictEqual(prof.heavyProtection, false);
    });
  });

  describe('Origem Treinado pela Hell Hunters (Upgrade Cumulativo)', () => {
    it('Combatente com Hell Hunters deve avançar para Armas Pesadas e Proteções Pesadas', () => {
      // Combatente já tem táticas e leves; Hell Hunters promove para pesadas!
      const char = createMockCharacter({
        classId: 'class__livro_base__combatente',
        originId: 'origin__arquivos_secretos_03__treinado_pela_hell_hunters',
      });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, true);
      assert.strictEqual(prof.heavyWeapons, true);
      assert.strictEqual(prof.lightProtection, true);
      assert.strictEqual(prof.heavyProtection, true);
    });

    it('Especialista com Hell Hunters deve avançar para Armas Táticas e Proteções Pesadas', () => {
      // Especialista já tem leves (promove para pesadas), mas não tinha táticas (ganha táticas)!
      const char = createMockCharacter({
        classId: 'class__livro_base__especialista',
        originId: 'origin__arquivos_secretos_03__treinado_pela_hell_hunters',
      });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, true);
      assert.strictEqual(prof.heavyWeapons, false);
      assert.strictEqual(prof.lightProtection, true);
      assert.strictEqual(prof.heavyProtection, true);
    });

    it('Ocultista com Hell Hunters deve ganhar Armas Táticas e Proteções Leves', () => {
      // Ocultista não tinha nenhum dos dois; recebe o primeiro degrau de cada!
      const char = createMockCharacter({
        classId: 'class__livro_base__ocultista',
        originId: 'origin__arquivos_secretos_03__treinado_pela_hell_hunters',
      });
      const prof = getCharacterProficiencies(char);

      assert.strictEqual(prof.simpleWeapons, true);
      assert.strictEqual(prof.tacticalWeapons, true);
      assert.strictEqual(prof.heavyWeapons, false);
      assert.strictEqual(prof.lightProtection, true);
      assert.strictEqual(prof.heavyProtection, false);
    });
  });

  describe('Poderes de Classe e Habilidades Adicionais', () => {
    it('Poder Armamento Pesado deve conceder proficiência com Armas Pesadas', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__combatente',
        entityIds: ['power__livro_base__armamento_pesado'],
      });
      const prof = getCharacterProficiencies(char);
      assert.strictEqual(prof.heavyWeapons, true);
    });

    it('Poder Proteção Pesada deve conceder proficiência com Proteções Pesadas', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__combatente',
        entityIds: ['power__livro_base__protecao_pesada'],
      });
      const prof = getCharacterProficiencies(char);
      assert.strictEqual(prof.heavyProtection, true);
    });

    it('Poder Balística Avançada deve conceder proficiência com armas táticas de fogo', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__especialista',
        entityIds: ['power__livro_base__balistica_avancada'],
      });
      const prof = getCharacterProficiencies(char);
      assert.strictEqual(prof.tacticalFirearms, true);
      assert.strictEqual(prof.tacticalWeapons, false); // Não concede armas táticas corpo a corpo
    });

    it('Poder Ninja Urbano deve conceder proficiência com armas táticas corpo a corpo', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__especialista',
        entityIds: ['power__livro_base__ninja_urbano'],
      });
      const prof = getCharacterProficiencies(char);
      assert.strictEqual(prof.tacticalMelee, true);
      assert.strictEqual(prof.tacticalFirearms, false);
    });

    it('Trilha Atirador de Elite (Mira de Elite) deve conceder proficiência com armas de balas longas', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__especialista',
        trackId: 'track__livro_base__atirador_de_elite',
      });
      const prof = getCharacterProficiencies(char);
      assert.strictEqual(prof.longBulletsFirearms, true);
    });

    it('Origem Operário deve registrar ferramenta de trabalho específica', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__especialista',
        originId: 'origin__livro_base__operario',
        abilities: [
          {
            id: 'ab_op',
            name: 'Ferramenta de Trabalho',
            cost: 'Passiva',
            originPage: 'Origem',
            description: 'Arma escolhida: Machado',
            type: 'habilidade',
          },
        ],
      });
      const prof = getCharacterProficiencies(char);
      assert.strictEqual(prof.operarioWeaponName, 'Machado');
    });
  });

  describe('Verificação de Proficiência em Armas (checkWeaponProficiency)', () => {
    it('deve aprovar armas simples para todos os personagens', () => {
      const char = createMockCharacter({ classId: 'class__livro_base__ocultista' });
      const prof = getCharacterProficiencies(char);

      const faca = { name: 'Faca', proficiency: 'Simples', weaponType: 'Corpo a corpo' };
      const revolver = { name: 'Revólver', proficiency: 'Simples', weaponType: 'Fogo' };

      assert.strictEqual(checkWeaponProficiency(faca, prof).isProficient, true);
      assert.strictEqual(checkWeaponProficiency(revolver, prof).isProficient, true);
    });

    it('deve aprovar armas táticas para Combatente e reprovar para Ocultista', () => {
      const combatenteProf = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__combatente' })
      );
      const ocultistaProf = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__ocultista' })
      );

      const fuzil = {
        name: 'Fuzil de Assalto',
        proficiency: 'Tática',
        weaponType: 'Fogo',
        ammoType: 'Balas longas',
      };

      assert.strictEqual(checkWeaponProficiency(fuzil, combatenteProf).isProficient, true);
      const ocultistaCheck = checkWeaponProficiency(fuzil, ocultistaProf);
      assert.strictEqual(ocultistaCheck.isProficient, false);
      assert.ok(ocultistaCheck.reason?.includes('-2d20'));
    });

    it('Especialista com Balística Avançada deve ser proficiente em armas de fogo táticas mas não corpo a corpo', () => {
      const prof = getCharacterProficiencies(
        createMockCharacter({
          classId: 'class__livro_base__especialista',
          entityIds: ['power__livro_base__balistica_avancada'],
        })
      );

      const submetralhadora = {
        name: 'Submetralhadora',
        proficiency: 'Tática',
        weaponType: 'Fogo',
      };
      const espada = {
        name: 'Espada',
        proficiency: 'Tática',
        weaponType: 'Corpo a corpo',
      };

      assert.strictEqual(checkWeaponProficiency(submetralhadora, prof).isProficient, true);
      assert.strictEqual(checkWeaponProficiency(espada, prof).isProficient, false);
    });

    it('Especialista Atirador de Elite deve ser proficiente em fuzis de balas longas', () => {
      const prof = getCharacterProficiencies(
        createMockCharacter({
          classId: 'class__livro_base__especialista',
          trackId: 'track__livro_base__atirador_de_elite',
        })
      );

      const fuzilDeCaca = {
        name: 'Fuzil de Caça',
        proficiency: 'Tática',
        weaponType: 'Fogo',
        ammoType: 'Balas longas',
      };
      const pistola = {
        name: 'Pistola',
        proficiency: 'Tática',
        weaponType: 'Fogo',
        ammoType: 'Balas curtas',
      };

      assert.strictEqual(checkWeaponProficiency(fuzilDeCaca, prof).isProficient, true);
      assert.strictEqual(checkWeaponProficiency(pistola, prof).isProficient, false);
    });

    it('Operário deve ser proficiente na arma ferramenta escolhida mesmo que tática', () => {
      const prof = getCharacterProficiencies(
        createMockCharacter({
          classId: 'class__livro_base__especialista',
          originId: 'origin__livro_base__operario',
          abilities: [
            {
              id: 'ab_op',
              name: 'Ferramenta de Trabalho',
              cost: 'Passiva',
              originPage: 'Origem',
              description: 'Arma escolhida: Machado',
              type: 'habilidade',
            },
          ],
        })
      );

      const machado = {
        name: 'Machado',
        proficiency: 'Tática',
        weaponType: 'Corpo a corpo',
      };
      const katana = {
        name: 'Katana',
        proficiency: 'Tática',
        weaponType: 'Corpo a corpo',
      };

      assert.strictEqual(checkWeaponProficiency(machado, prof).isProficient, true);
      assert.strictEqual(checkWeaponProficiency(katana, prof).isProficient, false);
    });

    it('deve exigir Armamento Pesado para armas pesadas', () => {
      const combatenteNormal = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__combatente' })
      );
      const combatenteComPesadas = getCharacterProficiencies(
        createMockCharacter({
          classId: 'class__livro_base__combatente',
          entityIds: ['power__livro_base__armamento_pesado'],
        })
      );

      const lancaChamas = {
        name: 'Lança-Chamas',
        proficiency: 'Pesada',
        weaponType: 'Fogo',
      };

      assert.strictEqual(checkWeaponProficiency(lancaChamas, combatenteNormal).isProficient, false);
      assert.strictEqual(checkWeaponProficiency(lancaChamas, combatenteComPesadas).isProficient, true);
    });
  });

  describe('Verificação de Proficiência em Proteções e Escudos (checkProtectionProficiency)', () => {
    it('Proteção Leve deve ser permitida para Combatente e Especialista, mas reprovada para Ocultista', () => {
      const cProf = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__combatente' })
      );
      const eProf = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__especialista' })
      );
      const oProf = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__ocultista' })
      );

      const leve = { name: 'Proteção Leve', type: 'Leve' as const };

      assert.strictEqual(checkProtectionProficiency(leve, cProf).isProficient, true);
      assert.strictEqual(checkProtectionProficiency(leve, eProf).isProficient, true);

      const oCheck = checkProtectionProficiency(leve, oProf);
      assert.strictEqual(oCheck.isProficient, false);
      assert.ok(oCheck.reason?.includes('Proteções Leves'));
    });

    it('Proteção Pesada e Escudo devem exigir proficiência com Proteções Pesadas', () => {
      const cProf = getCharacterProficiencies(
        createMockCharacter({ classId: 'class__livro_base__combatente' })
      );
      const cPesadaProf = getCharacterProficiencies(
        createMockCharacter({
          classId: 'class__livro_base__combatente',
          entityIds: ['power__livro_base__protecao_pesada'],
        })
      );

      const pesada = { name: 'Proteção Pesada', type: 'Pesada' as const };
      const escudo = { name: 'Escudo', type: 'Escudo' as const };

      // Combatente base não tem pesadas:
      assert.strictEqual(checkProtectionProficiency(pesada, cProf).isProficient, false);
      assert.strictEqual(checkProtectionProficiency(escudo, cProf).isProficient, false);

      // Com poder Proteção Pesada:
      assert.strictEqual(checkProtectionProficiency(pesada, cPesadaProf).isProficient, true);
      assert.strictEqual(checkProtectionProficiency(escudo, cPesadaProf).isProficient, true);
    });
  });

  describe('Penalidade de Dados por Não-Proficiência (getProtectionDicePenalty)', () => {
    it('deve retornar -2 em testes de Força e Agilidade quando usando Proteção Pesada sem proficiência', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__combatente',
        protection: 'Proteção Pesada (+10 Defesa, RD 2)',
      });

      assert.strictEqual(getProtectionDicePenalty(char, 'FOR'), -2);
      assert.strictEqual(getProtectionDicePenalty(char, 'AGI'), -2);
      // Atributos mentais ou vigor não sofrem penalidade:
      assert.strictEqual(getProtectionDicePenalty(char, 'INT'), 0);
      assert.strictEqual(getProtectionDicePenalty(char, 'PRE'), 0);
      assert.strictEqual(getProtectionDicePenalty(char, 'VIG'), 0);
    });

    it('deve retornar -2 em testes de Força e Agilidade quando usando Escudo sem proficiência', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__especialista',
        protection: 'Proteção Leve (+5 Defesa) • Escudo (+2 Defesa)',
      });

      // Escudo exige proteção pesada; Especialista tem apenas leve
      assert.strictEqual(getProtectionDicePenalty(char, 'FOR'), -2);
      assert.strictEqual(getProtectionDicePenalty(char, 'AGI'), -2);
    });

    it('deve retornar 0 quando o agente possuir a proficiência exigida', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__combatente',
        entityIds: ['power__livro_base__protecao_pesada'],
        protection: 'Proteção Pesada (+10 Defesa, RD 2) • Escudo (+2 Defesa)',
      });

      assert.strictEqual(getProtectionDicePenalty(char, 'FOR'), 0);
      assert.strictEqual(getProtectionDicePenalty(char, 'AGI'), 0);
    });

    it('deve checar itens equipados no inventário', () => {
      const char = createMockCharacter({
        classId: 'class__livro_base__ocultista',
        protection: '',
        inventory: [
          {
            id: 'inv_1',
            name: 'Colete Leve',
            category: 'I',
            spaces: 2,
            itemType: 'protecao',
            equipped: true,
          },
        ],
      });

      // Ocultista vestindo colete leve sem proficiência:
      assert.strictEqual(getProtectionDicePenalty(char, 'AGI'), -2);
      assert.strictEqual(getProtectionDicePenalty(char, 'FOR'), -2);
    });
  });
});
