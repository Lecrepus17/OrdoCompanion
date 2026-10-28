import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCritical,
  formatCritical,
  stepUpDamage,
  stepUpRange,
  categoryToNumber,
  numberToCategory,
  calculateWeaponStats,
  getWeaponModsWithCompendium,
  OFFICIAL_WEAPON_MODS,
  checkModificationCompatibility,
  sanitizeWeaponModifications,
} from '../src/utils/weapons';

describe('Sistema de Armas e Modificações (weapons.ts)', () => {
  describe('parseCritical e formatCritical', () => {
    it('deve parsear strings de crítico padrão com margem e multiplicador', () => {
      assert.deepStrictEqual(parseCritical('19/x3'), { threat: 19, mult: 3 });
      assert.deepStrictEqual(parseCritical('18/x2'), { threat: 18, mult: 2 });
      assert.deepStrictEqual(parseCritical('20/x4'), { threat: 20, mult: 4 });
    });

    it('deve parsear formato apenas com multiplicador (ex.: x3)', () => {
      assert.deepStrictEqual(parseCritical('x3'), { threat: 20, mult: 3 });
      assert.deepStrictEqual(parseCritical('x4'), { threat: 20, mult: 4 });
    });

    it('deve parsear formato apenas com margem (ex.: 19 ou 18)', () => {
      assert.deepStrictEqual(parseCritical('19'), { threat: 19, mult: 2 });
      assert.deepStrictEqual(parseCritical('18'), { threat: 18, mult: 2 });
    });

    it('deve retornar { threat: 20, mult: 2 } para entradas vazias ou inválidas', () => {
      assert.deepStrictEqual(parseCritical(''), { threat: 20, mult: 2 });
      assert.deepStrictEqual(parseCritical('—'), { threat: 20, mult: 2 });
    });

    it('deve formatar valores de crítico canonicamente', () => {
      assert.strictEqual(formatCritical(20, 2), '20/x2');
      assert.strictEqual(formatCritical(20, 3), 'x3');
      assert.strictEqual(formatCritical(19, 2), '19/x2');
      assert.strictEqual(formatCritical(17, 3), '17/x3');
      assert.strictEqual(formatCritical(18, 4), '18/x4');
    });
  });

  describe('stepUpDamage - Passos de Dano', () => {
    it('deve avançar o dano na escala oficial de Ordem Paranormal', () => {
      assert.strictEqual(stepUpDamage('1d6', 1), '1d8');
      assert.strictEqual(stepUpDamage('1d8', 1), '1d10');
      assert.strictEqual(stepUpDamage('1d10', 1), '1d12');
      assert.strictEqual(stepUpDamage('1d12', 1), '2d8');
      assert.strictEqual(stepUpDamage('2d8', 1), '2d10');
      assert.strictEqual(stepUpDamage('2d10', 1), '2d12');
    });

    it('deve suportar avanço de múltiplos passos', () => {
      assert.strictEqual(stepUpDamage('1d6', 2), '1d10');
      assert.strictEqual(stepUpDamage('1d8', 3), '2d8');
      assert.strictEqual(stepUpDamage('2d8', 2), '2d12');
    });

    it('deve preservar modificadores existentes ao subir o passo', () => {
      assert.strictEqual(stepUpDamage('1d8+3', 1), '1d10+3');
      assert.strictEqual(stepUpDamage('2d10+5', 1), '2d12+5');
    });

    it('não deve ultrapassar o limite máximo da escala (4d12)', () => {
      assert.strictEqual(stepUpDamage('4d12', 1), '4d12');
    });

    it('deve retornar inalterado quando steps for <= 0 ou string vazia', () => {
      assert.strictEqual(stepUpDamage('1d8', 0), '1d8');
      assert.strictEqual(stepUpDamage('', 2), '');
    });
  });

  describe('stepUpRange - Passos de Alcance', () => {
    it('deve avançar alcance na ordem correta', () => {
      assert.strictEqual(stepUpRange('Curto', 1), 'Médio');
      assert.strictEqual(stepUpRange('Médio', 1), 'Longo');
      assert.strictEqual(stepUpRange('Longo', 1), 'Extremo');
    });

    it('deve respeitar o limite máximo em Extremo', () => {
      assert.strictEqual(stepUpRange('Extremo', 2), 'Extremo');
    });

    it('deve ignorar diferenças de maiúsculas/minúsculas', () => {
      assert.strictEqual(stepUpRange('curto', 1), 'Médio');
      assert.strictEqual(stepUpRange('médio', 2), 'Extremo');
    });
  });

  describe('Conversão de Categorias (categoryToNumber / numberToCategory)', () => {
    it('deve converter categorias romanas e textuais para números', () => {
      assert.strictEqual(categoryToNumber('0'), 0);
      assert.strictEqual(categoryToNumber('—'), 0);
      assert.strictEqual(categoryToNumber('-'), 0);
      assert.strictEqual(categoryToNumber('I'), 1);
      assert.strictEqual(categoryToNumber('1'), 1);
      assert.strictEqual(categoryToNumber('II'), 2);
      assert.strictEqual(categoryToNumber('III'), 3);
      assert.strictEqual(categoryToNumber('IV'), 4);
    });

    it('deve converter números para categorias romanas', () => {
      assert.strictEqual(numberToCategory(0), '0');
      assert.strictEqual(numberToCategory(1), 'I');
      assert.strictEqual(numberToCategory(2), 'II');
      assert.strictEqual(numberToCategory(3), 'III');
      assert.strictEqual(numberToCategory(4), 'IV');
      assert.strictEqual(numberToCategory(5), 'IV (+1)');
      assert.strictEqual(numberToCategory(7), 'IV (+3)');
    });
  });

  describe('calculateWeaponStats - Cálculo Completo de Estatísticas', () => {
    const baseRifle = {
      damage: '2d10',
      critical: '19/x3',
      range: 'Médio',
      spaces: 2,
      category: 'II',
      damageType: 'Balístico',
    };

    it('deve manter atributos base quando nenhuma modificação for selecionada', () => {
      const stats = calculateWeaponStats(baseRifle, []);
      assert.strictEqual(stats.finalDamage, '2d10');
      assert.strictEqual(stats.finalCritical, '19/x3');
      assert.strictEqual(stats.finalRange, 'Médio');
      assert.strictEqual(stats.finalCategory, 'II');
      assert.strictEqual(stats.finalSpaces, 2);
      assert.strictEqual(stats.attackBonus, 0);
      assert.strictEqual(stats.element, 'Nenhum');
    });

    it('deve aplicar mira laser: aumenta margem em +2 (reduz dado em 2) e +1 categoria', () => {
      const stats = calculateWeaponStats(baseRifle, ['mira_laser']);
      // 19 vira 17
      assert.strictEqual(stats.finalCritical, '17/x3');
      assert.strictEqual(stats.attackBonus, 0);
      assert.strictEqual(stats.finalCategory, 'III');
    });

    it('deve aplicar calibre grosso e cruel: sobe passo de dano e adiciona dano flat', () => {
      const stats = calculateWeaponStats(baseRifle, ['calibre_grosso', 'cruel']);
      // 2d10 sobe 1 passo -> 2d12, mais cruel (+2)
      assert.strictEqual(stats.finalDamage, '2d12+2');
      assert.strictEqual(stats.finalCategory, 'IV');
    });

    it('deve aplicar maldição carniceira e energética: crítico x4, +5 ataque e elemento Energia', () => {
      const stats = calculateWeaponStats(baseRifle, ['maldicao_carniceira', 'maldicao_energetica']);
      // x3 vira x4
      assert.strictEqual(stats.finalCritical, '19/x4');
      assert.strictEqual(stats.attackBonus, 5);
      assert.strictEqual(stats.element, 'Energia');
      // II + 2 maldições (cada uma +1) = IV
      assert.strictEqual(stats.finalCategory, 'IV');
    });

    it('deve acumular dados extras de maldições elementais como Hemofágica', () => {
      const stats = calculateWeaponStats(baseRifle, ['maldicao_hemofagica']);
      assert.ok(stats.finalDamage.includes('+ 1d6 Sangue'));
      assert.strictEqual(stats.element, 'Sangue');
    });

    it('não deve permitir que espaços ocupados sejam menores que 1', () => {
      const lightKnife = {
        damage: '1d4',
        critical: '19/x2',
        range: 'Curto',
        spaces: 1,
        category: '0',
        damageType: 'Perfuração',
      };
      // Leve e Discreta subtraem 1 espaço cada (total -2)
      const stats = calculateWeaponStats(lightKnife, ['leve', 'discreta']);
      assert.strictEqual(stats.finalSpaces, 1);
    });

    it('deve incorporar modificações caseiras (customMods)', () => {
      const customMods = [
        { name: 'Cano Rajada', effect: 'Permite rajada com -1 dado', categoryIncrease: 1 },
      ];
      const stats = calculateWeaponStats(baseRifle, [], customMods);
      assert.strictEqual(stats.finalCategory, 'III');
      assert.ok(stats.specialRules.includes('Cano Rajada'));
    });

    it('deve aplicar modificação alongada: concede +2 em ataque e +1 categoria', () => {
      const stats = calculateWeaponStats(baseRifle, ['alongada']);
      assert.strictEqual(stats.attackBonus, 2);
      assert.strictEqual(stats.finalCategory, 'III');
    });

    it('deve diferenciar categoria da arma e categoria das balas ao aplicar munição dum-dum', () => {
      // Base rifle é 19/x3, Categoria II, com Balas longas (base Cat I)
      const stats = calculateWeaponStats(
        { ...baseRifle, ammoType: 'Balas longas', baseAmmoCategory: 'I' },
        ['municao_dumdum']
      );
      assert.strictEqual(stats.finalCritical, '19/x5');
      // A arma continua com sua própria categoria (Cat II)
      assert.strictEqual(stats.finalCategory, 'II');
      assert.strictEqual(stats.weaponCategory, 'II');
      // Apenas a munição sobe de categoria (Cat I + 1 = Cat II)
      assert.strictEqual(stats.ammoCategory, 'II');
      assert.ok(stats.ammoName.includes('Dum Dum'));
    });

    it('deve diferenciar modificações na arma e nas balas simultaneamente', () => {
      // Fuzil Cat II com Alongada (+1 na arma) e Explosiva (+1 na munição Balas longas)
      const stats = calculateWeaponStats(
        { ...baseRifle, ammoType: 'Balas longas', baseAmmoCategory: 'I' },
        ['alongada', 'municao_explosiva']
      );
      // Categoria da arma sobe de II para III (devido a Alongada)
      assert.strictEqual(stats.finalCategory, 'III');
      assert.strictEqual(stats.weaponCategory, 'III');
      // Categoria das balas sobe de I para II (devido a Explosiva)
      assert.strictEqual(stats.ammoCategory, 'II');
      // Bônus e dano extra aplicados
      assert.strictEqual(stats.attackBonus, 2);
      assert.ok(stats.finalDamage.includes('+ 2d6'));
    });

    it('deve definir categoria de munição como — para armas corpo a corpo', () => {
      const sword = {
        damage: '1d8',
        critical: '19/x2',
        range: 'Corpo a corpo',
        spaces: 1,
        category: 'I',
        damageType: 'Corte',
        weaponType: 'Corpo a corpo' as const,
      };
      const stats = calculateWeaponStats(sword, ['certeira']);
      assert.strictEqual(stats.finalCategory, 'II');
      assert.strictEqual(stats.ammoCategory, '—');
    });

    it('deve aplicar maldição lancinante oficial (+1d8 Sangue) e predadora (duplica margem)', () => {
      // Base rifle é 19/x3 (margem 2). Predadora duplica para margem 4 -> 17/x3
      const stats = calculateWeaponStats(baseRifle, ['maldicao_lancinante', 'maldicao_predadora']);
      assert.strictEqual(stats.finalCritical, '17/x3');
      assert.ok(stats.finalDamage.includes('+ 1d8 Sangue'));
      assert.strictEqual(stats.element, 'Sangue');
      // Alcance Médio sobe para Longo
      assert.strictEqual(stats.finalRange, 'Longo');
    });

    it('deve aceitar tanto ID principal do compêndio quanto ID curto para cálculo de estatísticas', () => {
      // Usando ID canônico da base: 'item__livro_base__mira_laser'
      const statsCanonical = calculateWeaponStats(baseRifle, ['item__livro_base__mira_laser']);
      // Usando ID curto legado: 'mira_laser'
      const statsShort = calculateWeaponStats(baseRifle, ['mira_laser']);

      assert.strictEqual(statsCanonical.finalCritical, '17/x3');
      assert.strictEqual(statsShort.finalCritical, '17/x3');
      assert.strictEqual(statsCanonical.finalCategory, statsShort.finalCategory);
    });

    it('getWeaponModsWithCompendium deve enriquecer modificações com dados dinâmicos da base sem perder mecânica', () => {
      const mockEntities: any[] = [
        {
          id: 'item__livro_base__mira_laser',
          name: 'Mira Laser Customizada',
          description: 'Descrição editada pelo usuário no compêndio',
          bookTitle: 'Livro Base',
          element: 'Nenhum',
        },
      ];

      const enriched = getWeaponModsWithCompendium(mockEntities);
      const laserMod = enriched.find((m) => m.id === 'item__livro_base__mira_laser');

      assert.ok(laserMod);
      assert.strictEqual(laserMod.name, 'Mira Laser Customizada');
      assert.strictEqual(laserMod.description, 'Descrição editada pelo usuário no compêndio');
      // Garante que a lógica mecânica permanece intacta
      assert.strictEqual(laserMod.criticalRangeReduction, 2);
      assert.strictEqual(laserMod.categoryIncrease, 1);
    });

    it('deve listar todas as modificações oficiais disponíveis no compêndio', () => {
      assert.ok(OFFICIAL_WEAPON_MODS.length >= 20);
      const modIds = OFFICIAL_WEAPON_MODS.map((m) => (m as any).shortId || m.id);
      assert.ok(modIds.includes('mira_laser'));
      assert.ok(modIds.includes('alongada'));
      assert.ok(modIds.includes('perigosa'));
      assert.ok(modIds.includes('ferrolho_automatico'));
      assert.ok(modIds.includes('visao_de_calor'));
      assert.ok(modIds.includes('maldicao_lancinante'));
      assert.ok(modIds.includes('maldicao_predadora'));
      assert.ok(modIds.includes('maldicao_energetica'));
      assert.ok(modIds.includes('maldicao_vibrante'));
    });
  });

  describe('Compatibilidade de Modificações e Tipos de Armas (checkModificationCompatibility)', () => {
    it('Pistola (Arma de Fogo) deve aceitar modificações de fogo e rejeitar corpo a corpo', () => {
      const pistolContext = {
        weaponType: 'Fogo' as const,
        baseWeaponName: 'Pistola',
        range: 'Curto',
        ammoType: 'Balas curtas',
      };

      // Aceita modificações de fogo
      assert.strictEqual(checkModificationCompatibility('alongada', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('mira_laser', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('calibre_grosso', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('silenciador', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('municao_dumdum', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('municao_explosiva', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('tatica', pistolContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('discreta', pistolContext).compatible, true);

      // Rejeita modificações de corpo a corpo / disparo
      const certeiraCheck = checkModificationCompatibility('certeira', pistolContext);
      assert.strictEqual(certeiraCheck.compatible, false);
      assert.ok(certeiraCheck.reason?.includes('Corpo a Corpo'));

      const perigosaCheck = checkModificationCompatibility('perigosa', pistolContext);
      assert.strictEqual(perigosaCheck.compatible, false);

      const cruelCheck = checkModificationCompatibility('cruel', pistolContext);
      assert.strictEqual(cruelCheck.compatible, false);

      const empuxoCheck = checkModificationCompatibility('item__livro_base__empuxo', pistolContext);
      assert.strictEqual(empuxoCheck.compatible, false);

      const equilibradaCheck = checkModificationCompatibility('equilibrada', pistolContext);
      assert.strictEqual(equilibradaCheck.compatible, false);
    });

    it('Faca (Arma Corpo a Corpo) deve aceitar melhorias corpo a corpo e rejeitar fogo e munição', () => {
      const knifeContext = {
        weaponType: 'Corpo a corpo' as const,
        baseWeaponName: 'Faca',
        range: 'Curto',
        ammoType: 'Nenhuma',
      };

      // Aceita modificações corpo a corpo
      assert.strictEqual(checkModificationCompatibility('certeira', knifeContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('perigosa', knifeContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('cruel', knifeContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('equilibrada', knifeContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('item__livro_base__empuxo', knifeContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('tatica', knifeContext).compatible, true);
      assert.strictEqual(checkModificationCompatibility('discreta', knifeContext).compatible, true);

      // Rejeita modificações exclusivas de armas de fogo
      const alongadaCheck = checkModificationCompatibility('alongada', knifeContext);
      assert.strictEqual(alongadaCheck.compatible, false);

      const miraLaserCheck = checkModificationCompatibility('mira_laser', knifeContext);
      assert.strictEqual(miraLaserCheck.compatible, false);

      const silenciadorCheck = checkModificationCompatibility('silenciador', knifeContext);
      assert.strictEqual(silenciadorCheck.compatible, false);

      // Rejeita modificações de munição
      const dumDumCheck = checkModificationCompatibility('municao_dumdum', knifeContext);
      assert.strictEqual(dumDumCheck.compatible, false);
      assert.ok(dumDumCheck.reason?.includes('munição'));
    });

    it('Compensador requer arma automática (inerente ou via Ferrolho Automático)', () => {
      const revolverContext = {
        weaponType: 'Fogo' as const,
        baseWeaponName: 'Revólver',
        range: 'Curto',
        ammoType: 'Balas curtas',
        selectedModIds: [],
      };
      // Revólver comum não é automático -> rejeita Compensador
      assert.strictEqual(checkModificationCompatibility('compensador', revolverContext).compatible, false);

      // Revólver com Ferrolho Automático selecionado -> aceita Compensador
      const revolverWithAutoBolt = {
        ...revolverContext,
        selectedModIds: ['ferrolho_automatico'],
      };
      assert.strictEqual(checkModificationCompatibility('compensador', revolverWithAutoBolt).compatible, true);

      // Fuzil de Assalto é inerentemente automático -> aceita Compensador diretamente
      const assaultRifleContext = {
        weaponType: 'Fogo' as const,
        baseWeaponName: 'Fuzil de assalto',
        range: 'Médio',
        ammoType: 'Balas longas',
        selectedModIds: [],
      };
      assert.strictEqual(checkModificationCompatibility('compensador', assaultRifleContext).compatible, true);

      // Fuzil de Assalto já é automático -> rejeita Ferrolho Automático
      const ferrolhoCheck = checkModificationCompatibility('ferrolho_automatico', assaultRifleContext);
      assert.strictEqual(ferrolhoCheck.compatible, false);
      assert.ok(ferrolhoCheck.reason?.includes('já é inerentemente automática'));
    });

    it('Munições Dum Dum e Explosiva aceitam apenas Balas Curtas e Longas', () => {
      const shotgunContext = {
        weaponType: 'Fogo' as const,
        baseWeaponName: 'Espingarda',
        range: 'Curto',
        ammoType: 'Cartuchos',
      };
      // Espingarda usa Cartuchos -> rejeita Dum Dum e Explosiva
      const dumDumCheck = checkModificationCompatibility('municao_dumdum', shotgunContext);
      assert.strictEqual(dumDumCheck.compatible, false);
      assert.ok(dumDumCheck.reason?.includes('Cartuchos'));

      // Espingarda aceita Munição Perfurante (aceita cartuchos)
      assert.strictEqual(checkModificationCompatibility('municao_perfurante', shotgunContext).compatible, true);

      // Arco usa Flechas -> rejeita Dum Dum
      const bowContext = {
        weaponType: 'Disparo' as const,
        baseWeaponName: 'Arco',
        range: 'Médio',
        ammoType: 'Flechas',
      };
      assert.strictEqual(checkModificationCompatibility('municao_dumdum', bowContext).compatible, false);
    });

    it('Besta/Balestra aceita Carregador Rápido', () => {
      const crossbowContext = {
        weaponType: 'Disparo' as const,
        baseWeaponName: 'Balestra',
        range: 'Médio',
        ammoType: 'Flechas',
      };
      assert.strictEqual(checkModificationCompatibility('carregador_rapido', crossbowContext).compatible, true);

      const swordContext = {
        weaponType: 'Corpo a corpo' as const,
        baseWeaponName: 'Espada',
        range: 'Corpo a corpo',
        ammoType: 'Nenhuma',
      };
      assert.strictEqual(checkModificationCompatibility('carregador_rapido', swordContext).compatible, false);
    });

    it('sanitizeWeaponModifications deve remover modificações incompatíveis ao mudar de arma', () => {
      // Modificações de um Fuzil: Alongada, Mira Laser, Dum Dum, Tática
      const previousMods = ['alongada', 'mira_laser', 'municao_dumdum', 'tatica'];

      // Mudou para Faca (Corpo a corpo)
      const knifeContext = {
        weaponType: 'Corpo a corpo' as const,
        baseWeaponName: 'Faca',
        range: 'Curto',
        ammoType: 'Nenhuma',
      };

      const { sanitizedModIds, removedMods } = sanitizeWeaponModifications(previousMods, knifeContext);

      // Tática é universal e permanece; Alongada, Mira Laser e Dum Dum são removidas
      assert.deepStrictEqual(sanitizedModIds, ['tatica']);
      assert.strictEqual(removedMods.length, 3);
      const removedNames = removedMods.map((m) => m.shortId || m.id);
      assert.ok(removedNames.includes('alongada'));
      assert.ok(removedNames.includes('mira_laser'));
      assert.ok(removedNames.includes('municao_dumdum'));
    });
  });
});
