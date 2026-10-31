/**
 * proficiencies.ts - Regras canônicas de Proficiências e Penalidades no Ordem Paranormal RPG v1.1
 * 
 * Livro Base p. 24, 31, 35, 53, 64 e suplementos oficiais.
 */

import { CharacterSheet, CharacterProficiencies, WeaponProficiency } from '../types/compendium';

export interface WeaponProficiencyCheckInput {
  name: string;
  proficiency?: WeaponProficiency | string;
  weaponType?: 'Corpo a corpo' | 'Disparo' | 'Fogo' | string;
  ammoType?: string;
}

export interface ProtectionProficiencyCheckInput {
  name: string;
  type?: 'Leve' | 'Pesada' | 'Escudo';
}

export interface ProficiencyCheckResult {
  isProficient: boolean;
  reason?: string;
}

/**
 * Deriva todas as proficiências ativas de armas e proteções de um personagem
 * com base na sua classe, origem, trilha e poderes/habilidades adquiridas.
 */
export function getCharacterProficiencies(character: CharacterSheet): CharacterProficiencies {
  const cId = (character.classId || '').toLowerCase();
  const oId = (character.originId || '').toLowerCase();
  const tId = (character.trackId || '').toLowerCase();

  const isCombatente = cId.includes('combatente');
  const isEspecialista = cId.includes('especialista');
  // Ocultista e Sobrevivente possuem apenas armas simples

  // 1. Proficiências Base de Classe (Livro Base p. 24, 31, 35)
  let simpleWeapons = true; // Todas as classes começam com armas simples
  let tacticalWeapons = isCombatente;
  let heavyWeapons = false;
  let tacticalFirearms = false;
  let tacticalMelee = false;
  let longBulletsFirearms = false;
  let lightProtection = isCombatente || isEspecialista;
  let heavyProtection = false;
  let operarioWeaponName: string | undefined = undefined;

  // Lista de identificadores e nomes de habilidades do agente
  const entityIds = (character.entityIds || []).map((id) => id.toLowerCase());
  const abilityNames = (character.abilities || []).map((a) => (a.name || '').toLowerCase());
  const hasEntityOrAbility = (keyword: string) =>
    entityIds.some((id) => id.includes(keyword)) ||
    abilityNames.some((name) => name.includes(keyword));

  // 2. Origem "Treinado pela Hell Hunters" (Arquivos Secretos #03 / #09)
  // Regra de Upgrade Cumulativo:
  // "Se já for proficiente com armas táticas, recebe proficiência com armas pesadas.
  //  Se já for proficiente com proteções leves, recebe proficiência com proteções pesadas."
  const isHellHunters =
    oId.includes('hell_hunters') ||
    oId.includes('hell hunters') ||
    hasEntityOrAbility('hell_hunters') ||
    hasEntityOrAbility('hell hunters') ||
    hasEntityOrAbility('treinamento com arsenal');

  if (isHellHunters) {
    if (tacticalWeapons) {
      heavyWeapons = true;
    } else {
      tacticalWeapons = true;
    }

    if (lightProtection) {
      heavyProtection = true;
    } else {
      lightProtection = true;
    }
  }

  // 3. Origem "Operário" (Livro Base p. 22) - Ferramenta de Trabalho
  const isOperario =
    oId.includes('operario') ||
    oId.includes('operário') ||
    hasEntityOrAbility('operario') ||
    hasEntityOrAbility('ferramenta de trabalho');

  if (isOperario) {
    // Tenta encontrar menção da ferramenta nas notas ou habilidades
    const explicitTool = (character as unknown as { operarioWeaponName?: string }).operarioWeaponName;
    if (explicitTool) {
      operarioWeaponName = explicitTool;
    } else {
      const toolAbility = (character.abilities || []).find((a) =>
        (a.name || '').toLowerCase().includes('ferramenta de trabalho')
      );
      if (toolAbility?.description) {
        const match = toolAbility.description.match(/arma escolhida:\s*([^.]+)/i);
        if (match && match[1]) {
          operarioWeaponName = match[1].trim();
        }
      }
    }
  }

  // 4. Poderes de Combatente / Gerais
  // Armamento Pesado: "Você recebe proficiência com armas pesadas."
  if (hasEntityOrAbility('armamento_pesado') || hasEntityOrAbility('armamento pesado')) {
    heavyWeapons = true;
  }

  // Proteção Pesada: "Você recebe proficiência com Proteções Pesadas."
  if (hasEntityOrAbility('protecao_pesada') || hasEntityOrAbility('proteção pesada')) {
    heavyProtection = true;
  }

  // Balística Avançada (Especialista): "Você recebe proficiência com armas táticas de fogo..."
  if (hasEntityOrAbility('balistica_avancada') || hasEntityOrAbility('balística avançada')) {
    tacticalFirearms = true;
  }

  // Ninja Urbano (Especialista): "Você recebe proficiência com armas táticas de ataque corpo a corpo..."
  if (hasEntityOrAbility('ninja_urbano') || hasEntityOrAbility('ninja urbano')) {
    tacticalMelee = true;
  }

  // Trilha Atirador de Elite - Mira de Elite (NEX 10%):
  // "Você recebe proficiência com armas de fogo que usam balas longas..."
  if (
    tId.includes('atirador_de_elite') ||
    tId.includes('atirador de elite') ||
    hasEntityOrAbility('atirador_de_elite') ||
    hasEntityOrAbility('mira_de_elite') ||
    hasEntityOrAbility('mira de elite')
  ) {
    longBulletsFirearms = true;
  }

  return {
    simpleWeapons,
    tacticalWeapons,
    heavyWeapons,
    tacticalFirearms,
    tacticalMelee,
    longBulletsFirearms,
    operarioWeaponName,
    lightProtection,
    heavyProtection,
  };
}

/**
 * Checa se o agente possui proficiência com uma arma específica.
 * Retorna isProficient = true se souber usar, ou false com justificativa canônica.
 */
export function checkWeaponProficiency(
  weapon: WeaponProficiencyCheckInput,
  proficiencies: CharacterProficiencies
): ProficiencyCheckResult {
  const prof = weapon.proficiency;
  const nameLower = (weapon.name || '').toLowerCase();

  // 1. Armas simples: Todos sabem usar
  if (!prof || prof === 'Simples') {
    return { isProficient: true };
  }

  // 2. Operário: Ferramenta de trabalho
  if (
    proficiencies.operarioWeaponName &&
    nameLower === proficiencies.operarioWeaponName.toLowerCase()
  ) {
    return { isProficient: true };
  }

  // 3. Armas Táticas
  if (prof === 'Tática') {
    if (proficiencies.tacticalWeapons) {
      return { isProficient: true };
    }

    if (weapon.weaponType === 'Fogo' && proficiencies.tacticalFirearms) {
      return { isProficient: true };
    }

    if (weapon.weaponType === 'Corpo a corpo' && proficiencies.tacticalMelee) {
      return { isProficient: true };
    }

    if (proficiencies.longBulletsFirearms) {
      const isLongBullets =
        weapon.ammoType === 'Balas longas' ||
        nameLower.includes('fuzil') ||
        nameLower.includes('metralhadora');
      if (isLongBullets) {
        return { isProficient: true };
      }
    }

    return {
      isProficient: false,
      reason: 'Exige proficiência com Armas Táticas (-2d20 no teste de ataque).',
    };
  }

  // 4. Armas Pesadas
  if (prof === 'Pesada') {
    if (proficiencies.heavyWeapons) {
      return { isProficient: true };
    }

    return {
      isProficient: false,
      reason: 'Exige proficiência com Armas Pesadas (-2d20 no teste de ataque).',
    };
  }

  return { isProficient: true };
}

/**
 * Checa se o agente possui proficiência com uma proteção ou escudo específico.
 * Regra canônica: Escudos contam como Proteção Pesada para fins de proficiência (Livro Base p. 64).
 */
export function checkProtectionProficiency(
  protection: ProtectionProficiencyCheckInput,
  proficiencies: CharacterProficiencies
): ProficiencyCheckResult {
  const nameLower = (protection.name || '').toLowerCase();
  let type = protection.type;

  // Inferência automática pelo nome caso type não venha preenchido
  if (!type) {
    if (nameLower.includes('pesada') || nameLower.includes('capacete')) {
      type = 'Pesada';
    } else if (nameLower.includes('escudo')) {
      type = 'Escudo';
    } else if (nameLower.includes('leve')) {
      type = 'Leve';
    }
  }

  if (type === 'Leve') {
    if (proficiencies.lightProtection) {
      return { isProficient: true };
    }
    return {
      isProficient: false,
      reason: 'Exige proficiência com Proteções Leves (-2d20 em testes de Força e Agilidade).',
    };
  }

  if (type === 'Pesada') {
    if (proficiencies.heavyProtection) {
      return { isProficient: true };
    }
    return {
      isProficient: false,
      reason:
        'Exige proficiência com Proteções Pesadas (Poder Proteção Pesada) (-2d20 em testes de Força e Agilidade).',
    };
  }

  if (type === 'Escudo') {
    // Livro Base p. 64: "Para efeitos de proficiência, conta como proteção pesada."
    if (proficiencies.heavyProtection) {
      return { isProficient: true };
    }
    return {
      isProficient: false,
      reason:
        'Escudos contam como Proteção Pesada para proficiência (-2d20 em testes de Força e Agilidade).',
    };
  }

  return { isProficient: true };
}

/**
 * Retorna a penalidade em dados (-2 ou 0) para rolagens baseadas em um atributo.
 * Livro Base p. 64: "Se você usar uma proteção com a qual não seja proficiente, sofre -2d20 em testes baseados em Força ou Agilidade."
 */
export function getProtectionDicePenalty(
  character: CharacterSheet,
  attributeKey: 'FOR' | 'AGI' | 'INT' | 'PRE' | 'VIG'
): number {
  if (attributeKey !== 'FOR' && attributeKey !== 'AGI') {
    return 0;
  }

  const proficiencies = getCharacterProficiencies(character);

  // 1. Checagem pelo campo descritivo da ficha `character.protection`
  if (character.protection) {
    const pStr = character.protection.toLowerCase();
    const hasHeavyText = pStr.includes('pesada') || pStr.includes('capacete');
    const hasShieldText = pStr.includes('escudo');
    const hasLightText = pStr.includes('leve');

    if ((hasHeavyText || hasShieldText) && !proficiencies.heavyProtection) {
      return -2;
    }
    if (hasLightText && !proficiencies.lightProtection) {
      return -2;
    }
  }

  // 2. Checagem pelos itens equipados no inventário
  if (character.inventory && character.inventory.length > 0) {
    for (const item of character.inventory) {
      if (!item.equipped) continue;

      const nameLower = item.name.toLowerCase();
      const isProtecao = item.itemType === 'protecao' || nameLower.includes('proteção');
      const isEscudo = item.itemType === 'escudo' || nameLower.includes('escudo');
      const isCapacete = nameLower.includes('capacete');

      if (isEscudo) {
        const check = checkProtectionProficiency({ name: item.name, type: 'Escudo' }, proficiencies);
        if (!check.isProficient) return -2;
      } else if (isProtecao || isCapacete) {
        const type = nameLower.includes('pesada') || isCapacete ? 'Pesada' : 'Leve';
        const check = checkProtectionProficiency({ name: item.name, type }, proficiencies);
        if (!check.isProficient) return -2;
      }
    }
  }

  return 0;
}
