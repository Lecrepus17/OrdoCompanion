import compendiumSeedRaw from '../data/seed/compendium_seed.json';
import {
  CompendiumEntity,
  ModificationTargetType,
  ParanormalElement,
  WeaponModificationDef,
  WeaponType,
} from '../types/compendium';

export const DEFAULT_AMMO_TYPES: Array<{
  name: string;
  baseCategory: string;
  spaces: number;
  description: string;
}> = [
  { name: 'Balas curtas', baseCategory: '0', spaces: 1, description: 'Pistolas, revólveres e submetralhadoras (dura 2 cenas)' },
  { name: 'Balas longas', baseCategory: 'I', spaces: 1, description: 'Fuzis e metralhadoras (dura 1 cena)' },
  { name: 'Cartuchos', baseCategory: 'I', spaces: 1, description: 'Espingardas (dura 2 cenas)' },
  { name: 'Flechas', baseCategory: '0', spaces: 1, description: 'Arcos e balestras (dura 2 cenas)' },
  { name: 'Foguete', baseCategory: 'I', spaces: 1, description: 'Bazucas (dura 1 disparo)' },
  { name: 'Combustível', baseCategory: 'I', spaces: 1, description: 'Lança-chamas (dura 1 cena)' },
  { name: 'Nenhuma', baseCategory: '0', spaces: 0, description: 'Armas corpo a corpo ou sem munição' },
];

export function detectDefaultAmmo(
  weaponName?: string,
  weaponType?: WeaponType
): { ammoType: string; baseCategory: string } {
  if (weaponType === 'Corpo a corpo') {
    return { ammoType: 'Nenhuma', baseCategory: '0' };
  }
  const n = (weaponName || '').toLowerCase();
  if (n.includes('fuzil') || n.includes('metralhadora')) {
    return { ammoType: 'Balas longas', baseCategory: 'I' };
  }
  if (
    n.includes('pistola') ||
    n.includes('revólver') ||
    n.includes('revolver') ||
    n.includes('submetralhadora')
  ) {
    return { ammoType: 'Balas curtas', baseCategory: '0' };
  }
  if (n.includes('espingarda')) {
    return { ammoType: 'Cartuchos', baseCategory: 'I' };
  }
  if (n.includes('arco') || n.includes('besta') || n.includes('balestra') || n.includes('estilingue')) {
    return { ammoType: 'Flechas', baseCategory: '0' };
  }
  if (n.includes('bazuca')) {
    return { ammoType: 'Foguete', baseCategory: 'I' };
  }
  if (n.includes('chamas')) {
    return { ammoType: 'Combustível', baseCategory: 'I' };
  }
  if (weaponType === 'Fogo') {
    return { ammoType: 'Balas curtas', baseCategory: '0' };
  }
  if (weaponType === 'Disparo') {
    return { ammoType: 'Flechas', baseCategory: '0' };
  }
  return { ammoType: 'Nenhuma', baseCategory: '0' };
}

export function isAmmoModification(modOrId: WeaponModificationDef | string): boolean {
  if (!modOrId) return false;
  if (typeof modOrId === 'string') {
    const def = OFFICIAL_WEAPON_MODS_MAP.get(modOrId);
    if (def?.targetType === 'ammo') return true;
    const clean = modOrId.toLowerCase();
    return (
      clean.includes('dum_dum') ||
      clean.includes('dumdum') ||
      clean.includes('explosiva') ||
      clean.includes('municao_perfurante') ||
      clean === 'municao_perfurante'
    );
  }
  if (modOrId.targetType === 'ammo') return true;
  const clean = (modOrId.id || '').toLowerCase() + ' ' + (modOrId.shortId || '').toLowerCase();
  return (
    clean.includes('dum_dum') ||
    clean.includes('dumdum') ||
    clean.includes('explosiva') ||
    clean.includes('municao_perfurante')
  );
}

const SEED_ENTITY_MAP = new Map<string, CompendiumEntity>(
  ((compendiumSeedRaw as any).entities || []).map((e: any) => [e.id, e])
);

function getSeedInfo(
  canonicalId: string,
  fallback: { name: string; description: string; source: any; element?: ParanormalElement }
) {
  const ent = SEED_ENTITY_MAP.get(canonicalId);
  if (!ent) return fallback;
  return {
    name: ent.name || fallback.name,
    description: ent.description || ent.summary || fallback.description,
    source: (ent.bookTitle as any) || fallback.source,
    element: (ent.element && ent.element !== 'Nenhum' ? ent.element : fallback.element) as ParanormalElement | undefined,
  };
}

export const OFFICIAL_WEAPON_MODS: WeaponModificationDef[] = [
  // --- Modificações Oficiais (Livro Base) ---
  {
    id: 'item__livro_base__mira_laser',
    canonicalEntityId: 'item__livro_base__mira_laser',
    shortId: 'mira_laser',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    criticalRangeReduction: 2,
    ...getSeedInfo('item__livro_base__mira_laser', {
      name: 'Mira Laser',
      description: 'Um laser interno cria um reflexo vermelho num retículo luminoso, que é visto pelo atirador e ajuda-o a realizar disparos mais letais. Aumenta a margem de ameaça em +2.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__alongada',
    canonicalEntityId: 'item__livro_base__alongada',
    shortId: 'alongada',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    attackBonus: 2,
    ...getSeedInfo('item__livro_base__alongada', {
      name: 'Alongada',
      description: 'Com um cano mais longo, que aumenta a precisão dos disparos, a arma fornece +2 nos testes de ataque.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__perigosa',
    canonicalEntityId: 'item__livro_base__perigosa',
    shortId: 'perigosa',
    categoryIncrease: 1,
    appliesTo: 'all',
    criticalRangeReduction: 2,
    ...getSeedInfo('item__livro_base__perigosa', {
      name: 'Perigosa',
      description: 'Aumenta a margem de ameaça de acerto crítico em +2 (ou seja, reduz o dado necessário em –2, ex.: 20 vira 18, 19 vira 17).',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__certeira',
    canonicalEntityId: 'item__livro_base__certeira',
    shortId: 'certeira',
    categoryIncrease: 1,
    appliesTo: 'all',
    attackBonus: 2,
    ...getSeedInfo('item__livro_base__certeira', {
      name: 'Certeira',
      description: 'Fabricada para ser mais precisa e balanceada, a arma fornece +2 nos testes de ataque.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__calibre_grosso',
    canonicalEntityId: 'item__livro_base__calibre_grosso',
    shortId: 'calibre_grosso',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    damageStepIncrease: 1,
    ...getSeedInfo('item__livro_base__calibre_grosso', {
      name: 'Calibre Grosso',
      description: 'A arma é modificada para disparar munição de maior calibre, aumentando seu dano em mais um dado do mesmo tipo (um passo de dano).',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__cruel',
    canonicalEntityId: 'item__livro_base__cruel',
    shortId: 'cruel',
    categoryIncrease: 1,
    appliesTo: 'all',
    damageBonus: 2,
    ...getSeedInfo('item__livro_base__cruel', {
      name: 'Cruel',
      description: 'A arma possui lâmina especialmente afiada ou foi fabricada com materiais mais densos. Fornece um bônus de +2 nas rolagens de dano.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__mira_telescopica',
    canonicalEntityId: 'item__livro_base__mira_telescopica',
    shortId: 'mira_telescopica',
    categoryIncrease: 1,
    appliesTo: 'ranged',
    rangeStepIncrease: 1,
    ...getSeedInfo('item__livro_base__mira_telescopica', {
      name: 'Mira Telescópica',
      description: 'Aumenta o alcance da arma em uma categoria (de curto para médio, médio para longo, longo para extremo) e permite que a habilidade Ataque Furtivo seja usada em qualquer alcance.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__silenciador',
    canonicalEntityId: 'item__livro_base__silenciador',
    shortId: 'silenciador',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    ...getSeedInfo('item__livro_base__silenciador', {
      name: 'Silenciador',
      description: 'Um silenciador reduz em –10 a penalidade em Furtividade para se esconder no mesmo turno em que atacou com a arma de fogo.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__compensador',
    canonicalEntityId: 'item__livro_base__compensador',
    shortId: 'compensador',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    ...getSeedInfo('item__livro_base__compensador', {
      name: 'Compensador',
      description: 'Apenas para armas automáticas. Um sistema de amortecimento reduz o coice da arma, anulando a penalidade em testes de ataque por disparar rajadas.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__ferrolho_automatico',
    canonicalEntityId: 'item__livro_base__ferrolho_automatico',
    shortId: 'ferrolho_automatico',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    ...getSeedInfo('item__livro_base__ferrolho_automatico', {
      name: 'Ferrolho Automático',
      description: 'O mecanismo de ação da arma é modificado para disparar várias vezes em sequência. A arma se torna automática.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__visao_de_calor',
    canonicalEntityId: 'item__livro_base__visao_de_calor',
    shortId: 'visao_de_calor',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    ...getSeedInfo('item__livro_base__visao_de_calor', {
      name: 'Visão de Calor',
      description: 'A mira tem um sistema eletrônico com infravermelho. Ao disparar com a arma, você ignora qualquer camuflagem do alvo.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__discreta',
    canonicalEntityId: 'item__livro_base__discreta',
    shortId: 'discreta',
    categoryIncrease: 1,
    appliesTo: 'all',
    spacesChange: -1,
    ...getSeedInfo('item__livro_base__discreta', {
      name: 'Discreta',
      description: 'Reduz o número de espaços ocupados em 1, fornece +5 em testes de Crime para ser ocultada (+10 para armas corpo a corpo e de disparo) e permite teste destreinado.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__tatica',
    canonicalEntityId: 'item__livro_base__tatica',
    shortId: 'tatica',
    categoryIncrease: 1,
    appliesTo: 'all',
    ...getSeedInfo('item__livro_base__tatica', {
      name: 'Tática',
      description: 'A arma possui cabo texturizado, bandoleira e outros acessórios que facilitam seu manuseio. Você pode sacar a arma como uma ação livre.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__dum_dum',
    canonicalEntityId: 'item__livro_base__dum_dum',
    shortId: 'municao_dumdum',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    targetType: 'ammo',
    criticalMultiplierIncrease: 2,
    ...getSeedInfo('item__livro_base__dum_dum', {
      name: 'Dum Dum',
      description: 'Munição expansiva que produz ferimentos terríveis. Só pode ser aplicada em balas curtas e longas e aumenta o multiplicador de crítico em +2 (ex.: x2 vira x4, x3 vira x5). Aumenta a categoria da munição em +1.',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__explosiva',
    canonicalEntityId: 'item__livro_base__explosiva',
    shortId: 'municao_explosiva',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    targetType: 'ammo',
    ...getSeedInfo('item__livro_base__explosiva', {
      name: 'Explosiva',
      description: 'Munições com mercúrio ou glicerina que explodem ao atingir o alvo. Só pode ser aplicada em balas curtas e longas e aumenta o dano causado em +2d6. Aumenta a categoria da munição em +1.',
      source: 'Livro Base',
    }),
  },

  // --- Modificações Sobrevivendo ao Horror ---
  {
    id: 'item__sobrevivendo_ao_horror__carregador_rapido',
    canonicalEntityId: 'item__sobrevivendo_ao_horror__carregador_rapido',
    shortId: 'carregador_rapido',
    categoryIncrease: 1,
    appliesTo: 'firearm',
    ...getSeedInfo('item__sobrevivendo_ao_horror__carregador_rapido', {
      name: 'Carregador Rápido',
      description: 'Em uma arma de fogo, permite recarregá-la como ação livre uma vez por rodada. Para bestas ou balestras, permite até cinco recargas como ação livre exigindo apenas uma mão.',
      source: 'Sobrevivendo ao Horror',
    }),
  },

  // --- Maldições Paranormais Oficiais (Livro Base) ---
  // SANGUE
  {
    id: 'item__livro_base__lancinante',
    canonicalEntityId: 'item__livro_base__lancinante',
    shortId: 'maldicao_lancinante',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Sangue',
    ...getSeedInfo('item__livro_base__lancinante', {
      name: 'Maldição: Lancinante',
      description: 'A arma inflige ferimentos terríveis, causando +1d8 de dano de Sangue. Este dado é multiplicado em acertos críticos.',
      element: 'Sangue',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__predadora',
    canonicalEntityId: 'item__livro_base__predadora',
    shortId: 'maldicao_predadora',
    categoryIncrease: 1,
    appliesTo: 'all',
    rangeStepIncrease: 1,
    element: 'Sangue',
    ...getSeedInfo('item__livro_base__predadora', {
      name: 'Maldição: Predadora',
      description: 'Anula penalidades por camuflagem e cobertura (exceto cobertura total). Aumenta o alcance em uma categoria se à distância, e duplica a margem de ameaça da arma.',
      element: 'Sangue',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__sanguinaria',
    canonicalEntityId: 'item__livro_base__sanguinaria',
    shortId: 'maldicao_sanguinaria',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Sangue',
    ...getSeedInfo('item__livro_base__sanguinaria', {
      name: 'Maldição: Sanguinária',
      description: 'Um ser atingido fica sangrando (+2d6 cumulativo por acerto por rodada). Em acerto crítico, drena sangue: o alvo fica fraco e você ganha 2d10 PV temporários.',
      element: 'Sangue',
      source: 'Livro Base',
    }),
  },

  // ENERGIA
  {
    id: 'item__livro_base__energetica',
    canonicalEntityId: 'item__livro_base__energetica',
    shortId: 'maldicao_energetica',
    categoryIncrease: 1,
    appliesTo: 'all',
    attackBonus: 5,
    element: 'Energia',
    ...getSeedInfo('item__livro_base__energetica', {
      name: 'Maldição: Energética',
      description: 'Gastando 2 PE, até o final da cena a arma fornece +5 em testes de ataque, ignora qualquer RD e converte todo o dano causado para Energia.',
      element: 'Energia',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__vibrante',
    canonicalEntityId: 'item__livro_base__vibrante',
    shortId: 'maldicao_vibrante',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Energia',
    ...getSeedInfo('item__livro_base__vibrante', {
      name: 'Maldição: Vibrante',
      description: 'A arma vibra com um fluxo de Energia. Você recebe a habilidade Ataque Extra (da trilha operações especiais do combatente); se já a possui, o custo diminui em –1 PE.',
      element: 'Energia',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__empuxo',
    canonicalEntityId: 'item__livro_base__empuxo',
    shortId: 'maldicao_empuxo',
    categoryIncrease: 1,
    appliesTo: 'melee',
    element: 'Energia',
    ...getSeedInfo('item__livro_base__empuxo', {
      name: 'Maldição: Empuxo',
      description: 'Gera descarga de Energia: a arma corpo a corpo pode ser arremessada em alcance curto (+1 categoria), causando +1 dado de dano do mesmo tipo, e volta voando para a mão (pegar é reação).',
      element: 'Energia',
      source: 'Livro Base',
    }),
  },

  // MORTE
  {
    id: 'item__livro_base__erosiva',
    canonicalEntityId: 'item__livro_base__erosiva',
    shortId: 'maldicao_erosiva',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Morte',
    ...getSeedInfo('item__livro_base__erosiva', {
      name: 'Maldição: Erosiva',
      description: 'Acelera o envelhecimento dos alvos, causando +1d8 pontos de dano de Morte. Gastando 2 PE ao acertar, a vítima sofre 2d4 de Morte por duas rodadas.',
      element: 'Morte',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__consumidora',
    canonicalEntityId: 'item__livro_base__consumidora',
    shortId: 'maldicao_consumidora',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Morte',
    ...getSeedInfo('item__livro_base__consumidora', {
      name: 'Maldição: Consumidora',
      description: 'A arma drena a entropia de seres, deixando alvos atingidos lentos até o final da cena. Gastando 2 PE ao acertar, o alvo fica imóvel por uma rodada.',
      element: 'Morte',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__repulsora',
    canonicalEntityId: 'item__livro_base__repulsora',
    shortId: 'maldicao_repulsora',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Morte',
    ...getSeedInfo('item__livro_base__repulsora', {
      name: 'Maldição: Repulsora',
      description: 'Gera uma aura de fumaça espiralada que desacelera ataques vindos em sua direção, fornecendo +2 de Defesa empunhada. Gastando 2 PE no bloqueio, recebe +5 adicional em Defesa.',
      element: 'Morte',
      source: 'Livro Base',
    }),
  },

  // CONHECIMENTO
  {
    id: 'item__livro_base__antielemento',
    canonicalEntityId: 'item__livro_base__antielemento',
    shortId: 'maldicao_antielemento',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Conhecimento',
    ...getSeedInfo('item__livro_base__antielemento', {
      name: 'Maldição: Antielemento',
      description: 'A arma é letal contra criaturas de um elemento (Conhecimento, Energia, Morte ou Sangue). Gastando 2 PE ao acertar, causa +4d8 pontos de dano extra.',
      element: 'Conhecimento',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__ritualistica',
    canonicalEntityId: 'item__livro_base__ritualistica',
    shortId: 'maldicao_ritualistica',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Conhecimento',
    ...getSeedInfo('item__livro_base__ritualistica', {
      name: 'Maldição: Ritualística',
      description: 'Permite armazenar na arma um ritual que tenha como alvo um ser ou afete uma área. Ao acertar um ataque com a arma, descarrega o ritual como ação livre.',
      element: 'Conhecimento',
      source: 'Livro Base',
    }),
  },
  {
    id: 'item__livro_base__senciente',
    canonicalEntityId: 'item__livro_base__senciente',
    shortId: 'maldicao_senciente',
    categoryIncrease: 1,
    appliesTo: 'all',
    element: 'Conhecimento',
    ...getSeedInfo('item__livro_base__senciente', {
      name: 'Maldição: Senciente',
      description: 'Gastando 2 PE e uma ação de movimento, a arma flutua e ataca um ser em alcance curto uma vez por rodada com suas próprias estatísticas. Custa 1 PE por turno para manter.',
      element: 'Conhecimento',
      source: 'Livro Base',
    }),
  },

  // --- Modificações e Maldições Adicionais (Compatibilidade) ---
  {
    id: 'maldicao_carniceira',
    shortId: 'maldicao_carniceira',
    name: 'Maldição: Carniceira',
    categoryIncrease: 1,
    description: 'Multiplicador de crítico aumenta em +1 (ex.: x2 vira x3). Em acerto crítico, recupera PV igual ao dano do crítico.',
    appliesTo: 'all',
    criticalMultiplierIncrease: 1,
    element: 'Sangue',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_hemofagica',
    shortId: 'maldicao_hemofagica',
    name: 'Maldição: Hemofágica',
    categoryIncrease: 1,
    description: 'Causa +1d6 pontos de dano de Sangue e cura o agente em metade do dano bônus causado.',
    appliesTo: 'all',
    element: 'Sangue',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_faisca',
    shortId: 'maldicao_faisca',
    name: 'Maldição: Faísca / Eletrocutante',
    categoryIncrease: 1,
    description: 'Descarrega arcos elétricos caóticos, causando +1d6 de dano adicional de Choque/Energia.',
    appliesTo: 'all',
    element: 'Energia',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_decadente',
    shortId: 'maldicao_decadente',
    name: 'Maldição: Decadente',
    categoryIncrease: 1,
    description: 'Você pode canalizar a espiral de decomposição do ritual Decadência diretamente através do ataque da arma.',
    appliesTo: 'all',
    element: 'Morte',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_velocidade',
    shortId: 'maldicao_velocidade',
    name: 'Maldição: Velocidade',
    categoryIncrease: 1,
    description: 'Acelera a sua percepção temporal, concedendo +1 ação de movimento adicional em cada rodada.',
    appliesTo: 'all',
    element: 'Morte',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_sadica',
    shortId: 'maldicao_sadica',
    name: 'Maldição: Sádica',
    categoryIncrease: 1,
    description: 'A cada dano massivo ou ferimento sofrido pelo portador na cena, a arma acumula poder concedendo +1d6 no dano.',
    appliesTo: 'all',
    element: 'Conhecimento',
    source: 'Livro Base',
  },
  {
    id: 'maldicao_ligeira',
    shortId: 'maldicao_ligeira',
    name: 'Maldição: Ligeira',
    categoryIncrease: 1,
    description: 'O conhecimento sussurra as ações futuras dos inimigos, concedendo +5 em testes de Iniciativa.',
    appliesTo: 'all',
    element: 'Conhecimento',
    source: 'Livro Base',
  },
  {
    id: 'carregador_expandido',
    shortId: 'carregador_expandido',
    name: 'Carregador Expandido',
    categoryIncrease: 1,
    description: 'Dobra a quantidade de munição antes de necessitar de recarga.',
    appliesTo: 'firearm',
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'municao_perfurante',
    shortId: 'municao_perfurante',
    name: 'Munição Perfurante',
    categoryIncrease: 1,
    description: 'Projéteis de alta penetração que ignoram até 5 pontos de Resistência a Dano (RD) do alvo. Aumenta a categoria da munição em +1.',
    appliesTo: 'firearm',
    targetType: 'ammo',
    source: 'Sobrevivendo ao Horror',
  },
  {
    id: 'equilibrada',
    shortId: 'equilibrada',
    name: 'Equilibrada',
    categoryIncrease: 1,
    description: 'Concede +2 em testes de manobra de combate com a arma.',
    appliesTo: 'melee',
    source: 'Livro Base',
  },
  {
    id: 'leve',
    shortId: 'leve',
    name: 'Leve',
    categoryIncrease: 1,
    description: 'Reduz o peso da arma, diminuindo em –1 o espaço ocupado (mínimo 1) e penalidades de carga.',
    appliesTo: 'all',
    spacesChange: -1,
    source: 'Livro Base',
  },
];

export const OFFICIAL_WEAPON_MODS_MAP = new Map<string, WeaponModificationDef>();

function registerMod(m: WeaponModificationDef) {
  OFFICIAL_WEAPON_MODS_MAP.set(m.id, m);
  if (m.canonicalEntityId) {
    OFFICIAL_WEAPON_MODS_MAP.set(m.canonicalEntityId, m);
  }
  if (m.shortId) {
    OFFICIAL_WEAPON_MODS_MAP.set(m.shortId, m);
  }
}

for (const m of OFFICIAL_WEAPON_MODS) {
  registerMod(m);
}

// Aliases adicionais para compatibilidade retroativa
const setAlias = (alias: string, targetId: string) => {
  const def = OFFICIAL_WEAPON_MODS_MAP.get(targetId);
  if (def) OFFICIAL_WEAPON_MODS_MAP.set(alias, def);
};

setAlias('mira_termica', 'item__livro_base__visao_de_calor');
setAlias('visao_de_calor', 'item__livro_base__visao_de_calor');
setAlias('municao_dumdum', 'item__livro_base__dum_dum');
setAlias('dum_dum', 'item__livro_base__dum_dum');
setAlias('municao_explosiva', 'item__livro_base__explosiva');
setAlias('explosiva', 'item__livro_base__explosiva');
setAlias('maldicao_lancinante', 'item__livro_base__lancinante');
setAlias('lancinante', 'item__livro_base__lancinante');
setAlias('maldicao_predadora', 'item__livro_base__predadora');
setAlias('predadora', 'item__livro_base__predadora');
setAlias('maldicao_sanguinaria', 'item__livro_base__sanguinaria');
setAlias('sanguinaria', 'item__livro_base__sanguinaria');
setAlias('maldicao_energetica', 'item__livro_base__energetica');
setAlias('energetica', 'item__livro_base__energetica');
setAlias('maldicao_vibrante', 'item__livro_base__vibrante');
setAlias('vibrante', 'item__livro_base__vibrante');
setAlias('maldicao_empuxo', 'item__livro_base__empuxo');
setAlias('empuxo', 'item__livro_base__empuxo');
setAlias('maldicao_erosiva', 'item__livro_base__erosiva');
setAlias('erosiva', 'item__livro_base__erosiva');
setAlias('maldicao_consumidora', 'item__livro_base__consumidora');
setAlias('consumidora', 'item__livro_base__consumidora');
setAlias('maldicao_repulsora', 'item__livro_base__repulsora');
setAlias('repulsora', 'item__livro_base__repulsora');
setAlias('maldicao_antielemento', 'item__livro_base__antielemento');
setAlias('antielemento', 'item__livro_base__antielemento');
setAlias('maldicao_ritualistica', 'item__livro_base__ritualistica');
setAlias('ritualistica', 'item__livro_base__ritualistica');
setAlias('maldicao_senciente', 'item__livro_base__senciente');
setAlias('senciente', 'item__livro_base__senciente');
setAlias('carregador_rapido', 'item__sobrevivendo_ao_horror__carregador_rapido');

/**
 * Mescla as modificações e maldições com as entidades ativas da base do compêndio
 * (incluindo edições e customizações salvas pelo usuário no compêndio).
 */
export function getWeaponModsWithCompendium(
  compendiumEntities?: CompendiumEntity[]
): WeaponModificationDef[] {
  if (!compendiumEntities || compendiumEntities.length === 0) {
    return OFFICIAL_WEAPON_MODS;
  }
  const entityMap = new Map<string, CompendiumEntity>();
  for (const ent of compendiumEntities) {
    entityMap.set(ent.id, ent);
  }

  return OFFICIAL_WEAPON_MODS.map((mod) => {
    const targetId = mod.canonicalEntityId || mod.id;
    const entity = entityMap.get(targetId);
    if (!entity) return mod;

    return {
      ...mod,
      name: entity.name || mod.name,
      description: entity.description || entity.summary || mod.description,
      source: (entity.bookTitle as any) || mod.source,
      element: (entity.element && entity.element !== 'Nenhum' ? entity.element : mod.element) as ParanormalElement | undefined,
      targetType: mod.targetType || (isAmmoModification(mod) ? 'ammo' : 'weapon'),
    };
  });
}

const DAMAGE_STEPS = [
  '1d3',
  '1d4',
  '1d6',
  '1d8',
  '1d10',
  '1d12',
  '2d8',
  '2d10',
  '2d12',
  '4d8',
  '4d10',
  '4d12',
];

const RANGE_STEPS = ['Corpo a corpo', 'Curto', 'Médio', 'Longo', 'Extremo'];

export function parseCritical(critStr: string): { threat: number; mult: number } {
  if (!critStr) return { threat: 20, mult: 2 };
  const clean = critStr.trim().toLowerCase();

  // Pattern: "19/x3", "18/x2", "20/x4", "x3", "19", "18"
  if (clean.includes('/')) {
    const [tPart, mPart] = clean.split('/');
    const t = parseInt(tPart.replace(/\D/g, ''), 10) || 20;
    const m = parseInt(mPart.replace(/\D/g, ''), 10) || 2;
    return { threat: Math.min(20, Math.max(12, t)), mult: Math.max(2, m) };
  }

  if (clean.startsWith('x')) {
    const m = parseInt(clean.replace(/\D/g, ''), 10) || 2;
    return { threat: 20, mult: Math.max(2, m) };
  }

  const num = parseInt(clean.replace(/\D/g, ''), 10);
  if (!isNaN(num) && num > 1) {
    if (num <= 5) {
      return { threat: 20, mult: num };
    }
    return { threat: Math.min(20, Math.max(12, num)), mult: 2 };
  }

  return { threat: 20, mult: 2 };
}

export function formatCritical(threat: number, mult: number): string {
  if (threat >= 20 && mult <= 2) {
    return '20/x2';
  }
  if (threat >= 20) {
    return `x${mult}`;
  }
  return `${threat}/x${mult}`;
}

export function stepUpDamage(damageStr: string, steps: number): string {
  if (!damageStr || steps <= 0) return damageStr;

  // Extract base dice and existing modifier, e.g. "2d10+2" -> dice: "2d10", mod: "+2"
  const match = damageStr.trim().match(/^(\d+d\d+)(.*)$/i);
  if (!match) return damageStr;

  const baseDice = match[1].toLowerCase();
  const rest = match[2];

  const idx = DAMAGE_STEPS.indexOf(baseDice);
  if (idx !== -1) {
    const nextIdx = Math.min(DAMAGE_STEPS.length - 1, idx + steps);
    return `${DAMAGE_STEPS[nextIdx]}${rest}`;
  }

  // Fallback: if not in exact step list, increase dice count or size
  if (baseDice.startsWith('1d')) {
    const size = parseInt(baseDice.replace('1d', ''), 10);
    return `1d${size + 2 * steps}${rest}`;
  } else if (baseDice.startsWith('2d')) {
    const size = parseInt(baseDice.replace('2d', ''), 10);
    return `2d${size + 2 * steps}${rest}`;
  } else {
    // Para armas como Espingarda (4d6) ou Moto-serra (3d6), avança a contagem de dados (+1 dado por passo, conforme Calibre Grosso)
    const diceMatch = baseDice.match(/^(\d+)d(\d+)$/);
    if (diceMatch) {
      const count = parseInt(diceMatch[1], 10);
      const faces = parseInt(diceMatch[2], 10);
      return `${count + steps}d${faces}${rest}`;
    }
  }

  return damageStr;
}

export function stepUpRange(rangeStr: string, steps: number): string {
  if (!rangeStr || steps <= 0) return rangeStr;
  const current = rangeStr.trim();
  const idx = RANGE_STEPS.findIndex((r) => r.toLowerCase() === current.toLowerCase());
  if (idx === -1) {
    return current;
  }
  const nextIdx = Math.min(RANGE_STEPS.length - 1, idx + steps);
  return RANGE_STEPS[nextIdx];
}

export function categoryToNumber(catStr: string): number {
  const c = (catStr || '').trim().toUpperCase();
  if (c === '0' || c === '—' || c === '-') return 0;
  if (c === 'I' || c === '1') return 1;
  if (c === 'II' || c === '2') return 2;
  if (c === 'III' || c === '3') return 3;
  if (c === 'IV' || c === '4') return 4;
  return 1;
}

export function numberToCategory(num: number): string {
  if (num <= 0) return '0';
  if (num === 1) return 'I';
  if (num === 2) return 'II';
  if (num === 3) return 'III';
  if (num === 4) return 'IV';
  return `IV (+${num - 4})`;
}

export function calculateWeaponStats(
  base: {
    damage: string;
    critical: string;
    range: string;
    spaces: number;
    category: string;
    damageType: string;
    element?: ParanormalElement;
    weaponType?: WeaponType;
    ammoType?: string;
    baseAmmoCategory?: string;
  },
  selectedModIds: string[],
  customMods: Array<{
    name: string;
    effect: string;
    categoryIncrease: number;
    targetType?: ModificationTargetType;
  }> = []
) {
  const chosenDefs: WeaponModificationDef[] = [];
  for (let i = 0; i < selectedModIds.length; i++) {
    const def = OFFICIAL_WEAPON_MODS_MAP.get(selectedModIds[i]);
    if (def) chosenDefs.push(def);
  }

  // Separar modificações de arma e modificações de balas/munição
  const weaponDefs = chosenDefs.filter((m) => !isAmmoModification(m));
  const ammoDefs = chosenDefs.filter((m) => isAmmoModification(m));
  const customWeaponMods = customMods.filter((cm) => cm.targetType !== 'ammo');
  const customAmmoMods = customMods.filter((cm) => cm.targetType === 'ammo');

  // --- CÁLCULO DA CATEGORIA DA ARMA ---
  // Modificações e maldições da arma aumentam APENAS a categoria da arma
  let weaponCatNum = categoryToNumber(base.category);
  for (const m of weaponDefs) {
    weaponCatNum += m.categoryIncrease || 1;
  }
  for (const cm of customWeaponMods) {
    weaponCatNum += cm.categoryIncrease || 1;
  }
  const finalCategory = numberToCategory(weaponCatNum);
  const weaponCategory = finalCategory;

  // --- CÁLCULO DA CATEGORIA DAS BALAS / MUNIÇÃO ---
  // Modificações de munição aumentam APENAS a categoria das balas
  const isMelee = base.weaponType === 'Corpo a corpo';
  const effectiveAmmoType =
    base.ammoType || (base.weaponType === 'Disparo' ? 'Flechas' : 'Balas curtas');
  const usesAmmo = !isMelee && effectiveAmmoType !== 'Nenhuma';

  let ammoCategory = '—';
  let ammoName = '';
  let finalAmmoCategoryNum = 0;

  if (usesAmmo) {
    const defaultAmmo = detectDefaultAmmo(undefined, base.weaponType);
    const baseAmmoCatStr =
      base.baseAmmoCategory !== undefined && base.baseAmmoCategory !== ''
        ? base.baseAmmoCategory
        : effectiveAmmoType === 'Balas longas' ||
          effectiveAmmoType === 'Cartuchos' ||
          effectiveAmmoType === 'Foguete' ||
          effectiveAmmoType === 'Combustível'
        ? 'I'
        : defaultAmmo.baseCategory || '0';

    finalAmmoCategoryNum = categoryToNumber(baseAmmoCatStr);
    for (const m of ammoDefs) {
      finalAmmoCategoryNum += m.categoryIncrease || 1;
    }
    for (const cm of customAmmoMods) {
      finalAmmoCategoryNum += cm.categoryIncrease || 1;
    }
    ammoCategory = numberToCategory(finalAmmoCategoryNum);

    const hasCalibreGrosso = weaponDefs.some(
      (m) => m.shortId === 'calibre_grosso' || m.id.includes('calibre_grosso')
    );
    const ammoModNames: string[] = [];
    if (hasCalibreGrosso) {
      ammoModNames.push('Calibre Grosso');
    }
    ammoModNames.push(...ammoDefs.map((m) => m.name));
    ammoModNames.push(...customAmmoMods.map((m) => m.name));

    if (ammoModNames.length > 0) {
      ammoName = `${effectiveAmmoType} (${ammoModNames.join(', ')})`;
    } else {
      ammoName = effectiveAmmoType;
    }
  }

  // --- CRÍTICO ---
  // Margem e multiplicador são afetados por mods de arma (Mira Laser, Perigosa) e balas (Dum Dum: +2 mult)
  const parsedCrit = parseCritical(base.critical);
  let finalThreat = parsedCrit.threat;
  let finalMult = parsedCrit.mult;

  // Maldição Predadora duplica a margem de ameaça antes de efeitos que a aumentem
  const hasPredadora = chosenDefs.some(
    (m) =>
      m.id === 'item__livro_base__predadora' ||
      m.id === 'maldicao_predadora' ||
      m.shortId === 'maldicao_predadora'
  );
  if (hasPredadora) {
    const margin = 21 - finalThreat;
    finalThreat = Math.max(1, 21 - margin * 2);
  }

  for (const m of chosenDefs) {
    if (m.criticalRangeReduction) {
      finalThreat -= m.criticalRangeReduction;
    }
    if (m.criticalMultiplierIncrease) {
      finalMult += m.criticalMultiplierIncrease;
    }
  }
  finalThreat = Math.max(10, finalThreat);
  const finalCritical = formatCritical(finalThreat, finalMult);

  // --- DANO ---
  // Afetado por mods de arma (Calibre Grosso, Cruel) e balas (Explosiva: +2d6)
  let damageStepTotal = 0;
  let damageBonusTotal = 0;
  let extraDamageDiceText = '';

  for (const m of chosenDefs) {
    if (m.damageStepIncrease) damageStepTotal += m.damageStepIncrease;
    if (m.damageBonus) damageBonusTotal += m.damageBonus;
    const key = m.shortId || m.id;
    if (key === 'maldicao_hemofagica') extraDamageDiceText += ' + 1d6 Sangue';
    if (key === 'maldicao_lancinante' || m.id === 'item__livro_base__lancinante') extraDamageDiceText += ' + 1d8 Sangue';
    if (key === 'maldicao_consumidora' || m.id === 'item__livro_base__consumidora') extraDamageDiceText += ' + 1d6 Morte';
    if (key === 'maldicao_erosiva' || m.id === 'item__livro_base__erosiva') extraDamageDiceText += ' + 1d8 Morte';
    if (key === 'maldicao_faisca') extraDamageDiceText += ' + 1d6 Energia';
    if (key === 'municao_explosiva' || m.id === 'item__livro_base__explosiva') extraDamageDiceText += ' + 2d6';
  }

  let finalDamage = stepUpDamage(base.damage, damageStepTotal);
  if (damageBonusTotal > 0) {
    finalDamage = `${finalDamage}+${damageBonusTotal}`;
  }
  if (extraDamageDiceText) {
    finalDamage = `${finalDamage}${extraDamageDiceText}`;
  }

  // Attack test bonus
  let attackBonus = 0;
  for (const m of chosenDefs) {
    if (m.attackBonus) attackBonus += m.attackBonus;
  }

  // Range calculation
  let rangeSteps = 0;
  for (const m of chosenDefs) {
    if (m.rangeStepIncrease) rangeSteps += m.rangeStepIncrease;
  }
  const finalRange = stepUpRange(base.range, rangeSteps);

  // Spaces calculation
  let finalSpaces = base.spaces;
  for (const m of chosenDefs) {
    if (m.spacesChange) finalSpaces += m.spacesChange;
  }
  finalSpaces = Math.max(1, finalSpaces);

  // Element
  let element: ParanormalElement = base.element || 'Nenhum';
  for (const m of chosenDefs) {
    if (m.element && m.element !== 'Nenhum') {
      element = m.element;
    }
  }

  // Special rules summary
  const specialParts: string[] = [];
  if (base.damageType) specialParts.push(`Tipo: ${base.damageType}`);
  if (element !== 'Nenhum') specialParts.push(`Elemento: ${element}`);
  if (usesAmmo && ammoName) {
    specialParts.push(`Munição: ${ammoName} (Cat ${ammoCategory})`);
  }
  for (const m of weaponDefs) {
    specialParts.push(`${m.name}: ${m.description}`);
  }
  for (const m of ammoDefs) {
    specialParts.push(`${m.name} [Munição]: ${m.description}`);
  }
  for (const cm of customMods) {
    const targetTag = cm.targetType === 'ammo' ? ' [Munição]' : '';
    specialParts.push(`${cm.name}${targetTag}: ${cm.effect}`);
  }

  return {
    finalDamage,
    finalCritical,
    finalRange,
    finalCategory, // Categoria da Arma
    weaponCategory, // Categoria da Arma
    ammoCategory, // Categoria da Munição ('0', 'I', 'II', etc. ou '—')
    ammoName,
    weaponMods: weaponDefs,
    ammoMods: ammoDefs,
    finalSpaces,
    attackBonus,
    damageBonus: damageBonusTotal,
    element,
    specialRules: specialParts.join(' • '),
  };
}
