import { CATEGORY_LABELS } from '../../theme';
import { CompendiumEntity } from '../../types/compendium';
import { RecordPreviewTarget } from '../../types/recordPreview';
import { RecordCardData, RecordCardExtraSection, RecordCardStat } from './types';

/**
 * Normaliza qualquer entidade ou alvo de pré-visualização em um formato estruturado
 * otimizado para geração de imagem estilizada (card/ficha).
 */
export function extractRecordCardData(
  target: CompendiumEntity | RecordPreviewTarget
): RecordCardData {
  if (!target) {
    return {
      id: 'unknown',
      name: 'Registro Desconhecido',
      category: 'rule',
      categoryLabel: 'Registro',
      description: 'Nenhum detalhe disponível.',
      stats: [],
    };
  }

  // Caso 1: Objeto é diretamente CompendiumEntity
  if (!('kind' in target)) {
    return extractFromCompendiumEntity(target);
  }

  // Caso 2: Objeto é RecordPreviewTarget
  switch (target.kind) {
    case 'entity':
      return extractFromCompendiumEntity(target.entity);

    case 'skill_def': {
      const s = target.skill;
      const stats: RecordCardStat[] = [
        { label: 'Atributo', value: String(s.attr), highlight: true },
        { label: 'Apenas Treinada', value: s.trainedOnly ? 'Sim' : 'Não' },
      ];
      if (s.armorPenalty) {
        stats.push({ label: 'Penalidade Carga', value: 'Sim' });
      }
      return {
        id: `skill_${s.name}`,
        name: s.name,
        category: 'skill',
        categoryLabel: 'Perícia',
        subCategory: `${String(s.attr)} • Oficial`,
        stats,
        summary: 'Perícia oficial do sistema de Ordem Paranormal.',
        description: 'Usada para testes de investigação, interação e sobrevivência.',
      };
    }

    case 'custom_weapon': {
      const w = target.weapon;
      const dmg = w.finalDamage || w.baseDamage || '—';
      const crit = w.finalCritical || w.baseCritical || '20/x2';
      const cat = w.finalCategory || w.baseCategory || 'I';
      const sp = w.finalSpaces !== undefined ? w.finalSpaces : w.baseSpaces;

      const stats: RecordCardStat[] = [
        { label: 'Dano', value: dmg, highlight: true },
        { label: 'Crítico', value: crit },
        { label: 'Categoria', value: `Cat. ${cat}` },
        { label: 'Espaços', value: `${sp ?? 1} ESP` },
      ];
      return {
        id: w.id,
        name: w.name,
        category: 'weapon',
        categoryLabel: 'Arma Personalizada',
        subCategory: w.weaponType,
        element: w.element && w.element !== 'Nenhum' ? w.element : undefined,
        stats,
        description: w.specialRules || w.notes || `Arma base: ${w.baseWeaponName}. Tipo: ${w.weaponType}.`,
      };
    }

    case 'weapon_mod': {
      const m = target.mod;
      return {
        id: m.id,
        name: m.name,
        category: 'item',
        categoryLabel: 'Modificação de Arma',
        subCategory: m.element ? `Maldição • ${m.element}` : 'Melhoria de Campo',
        element: m.element && m.element !== 'Nenhum' ? m.element : undefined,
        stats: [
          { label: 'Aumento de Cat.', value: `+${m.categoryIncrease}`, highlight: true },
        ],
        description: m.description,
      };
    }

    case 'character_ability': {
      const ab = target.ability;
      return {
        id: ab.id,
        name: ab.name,
        category: 'power',
        categoryLabel: 'Habilidade de Agente',
        subCategory: ab.originPage || ab.type,
        stats: [
          { label: 'Custo', value: ab.cost || 'Passivo', highlight: true },
          { label: 'Tipo', value: ab.type || 'Habilidade' },
        ],
        description: ab.description,
      };
    }

    case 'character_attack': {
      const at = target.attack;
      return {
        id: at.id,
        name: at.name,
        category: 'weapon',
        categoryLabel: 'Ataque de Combate',
        subCategory: at.range,
        stats: [
          { label: 'Teste', value: at.test || 'Ataque', highlight: true },
          { label: 'Dano', value: at.damage || '—', highlight: true },
          { label: 'Crítico', value: at.critical || '20/x2' },
        ],
        description: at.special || 'Ataque cadastrado na ficha do agente.',
      };
    }

    case 'character_inventory': {
      const it = target.item;
      return {
        id: it.id,
        name: it.name,
        category: 'item',
        categoryLabel: 'Item do Inventário',
        stats: [
          { label: 'Espaços', value: `${it.spaces ?? 0} ESP`, highlight: true },
          { label: 'Categoria', value: it.category ? `Cat. ${it.category}` : 'Cat. 0' },
        ],
        description: it.details || 'Equipamento ou utilitário do agente.',
      };
    }

    case 'campaign_monster': {
      const m = target.monster;
      return {
        id: m.id,
        name: m.name,
        category: 'creature',
        categoryLabel: 'Ameaça da Campanha',
        element: m.element && m.element !== 'Nenhum' ? m.element : undefined,
        stats: [
          { label: 'VD', value: String(m.vd || '—'), highlight: true },
          { label: 'PV', value: `${m.pvCurrent}/${m.pvMax}`, highlight: true },
          { label: 'Defesa', value: String(m.defense || '—') },
        ],
        description: m.notes || m.abilities || 'Criatura ou NPC vinculado à mesa de campanha.',
      };
    }

    case 'campaign_scene': {
      const sc = target.scene;
      return {
        id: sc.id,
        name: sc.title,
        category: 'rule',
        categoryLabel: 'Cena da Campanha',
        stats: [{ label: 'Status', value: sc.isCompleted ? 'Concluída' : 'Em Andamento', highlight: true }],
        summary: sc.summary,
        description: sc.details || sc.summary || 'Cena planejada para a sessão de RPG.',
      };
    }

    case 'generic': {
      return {
        id: 'generic_card',
        name: target.title,
        category: 'rule',
        categoryLabel: target.categoryLabel || 'Registro',
        subCategory: target.subtitle,
        element: target.element,
        stats: target.stats || [],
        description: target.description,
        extraSections: target.extraSections,
      };
    }

    default:
      return {
        id: 'generic',
        name: 'Registro',
        category: 'rule',
        categoryLabel: 'Informação',
        stats: [],
        description: '',
      };
  }
}

/**
 * Converte CompendiumEntity com todos os campos canônicos
 */
function extractFromCompendiumEntity(ent: CompendiumEntity): RecordCardData {
  const catInfo = CATEGORY_LABELS[ent.category] || CATEGORY_LABELS.all;
  const stats: RecordCardStat[] = [];
  const extraSections: RecordCardExtraSection[] = [];

  // 1. Rituais
  if (ent.category === 'ritual') {
    if (ent.circle) stats.push({ label: 'Círculo', value: `${ent.circle}º Círculo`, highlight: true });
    if (ent.execution) stats.push({ label: 'Execução', value: ent.execution });
    if (ent.range) stats.push({ label: 'Alcance', value: ent.range });
    if (ent.target) stats.push({ label: 'Alvo/Área', value: ent.target });
    if (ent.duration) stats.push({ label: 'Duração', value: ent.duration });
    if (ent.resistance) stats.push({ label: 'Resistência', value: ent.resistance });

    if (ent.discente) {
      extraSections.push({
        title: 'Discente (+2 PE)',
        content: ent.discente,
        accentColor: '#38BDF8',
      });
    }
    if (ent.verdadeiro) {
      extraSections.push({
        title: 'Verdadeiro (+5 PE)',
        content: ent.verdadeiro,
        accentColor: '#F59E0B',
      });
    }
  }

  // 2. Ameaças / Criaturas
  else if (ent.category === 'creature') {
    if (ent.vd !== undefined && ent.vd !== null) stats.push({ label: 'VD', value: String(ent.vd), highlight: true });
    if (ent.pv !== undefined && ent.pv !== null) stats.push({ label: 'PV', value: String(ent.pv), highlight: true });
    if (ent.defense !== undefined && ent.defense !== null) stats.push({ label: 'Defesa', value: String(ent.defense) });
    if (ent.disturbingPresence) {
      stats.push({ label: 'Presença Pert.', value: ent.disturbingPresence });
    }

    if (ent.attributes && Object.keys(ent.attributes).length > 0) {
      const attrsStr = Object.entries(ent.attributes)
        .map(([k, v]) => `${k} ${v}`)
        .join('  •  ');
      extraSections.push({
        title: 'Atributos da Criatura',
        content: attrsStr,
        accentColor: '#E11D48',
      });
    }
  }

  // 3. Armas & Equipamentos
  else if (ent.category === 'weapon' || ent.category === 'item') {
    if (ent.damage) stats.push({ label: 'Dano', value: ent.damage, highlight: true });
    if (ent.critical) stats.push({ label: 'Crítico', value: ent.critical });
    if (ent.itemCategory !== undefined && ent.itemCategory !== null && String(ent.itemCategory).trim() !== '') {
      stats.push({ label: 'Categoria', value: `Cat. ${ent.itemCategory}` });
    }
    if (ent.spaces !== undefined && ent.spaces !== null) {
      stats.push({ label: 'Espaços', value: `${ent.spaces} ESP` });
    }
    if (ent.proficiency) stats.push({ label: 'Proficiência', value: ent.proficiency });
    if (ent.handedness) stats.push({ label: 'Empunhadura', value: ent.handedness });
  }

  // 4. Origens
  else if (ent.category === 'origin') {
    if (ent.trainedSkills) {
      stats.push({ label: 'Perícias Treinadas', value: ent.trainedSkills, highlight: true });
    }
    if (ent.powerName) {
      extraSections.push({
        title: `Poder de Origem: ${ent.powerName}`,
        content: ent.powerDescription || '',
        accentColor: '#0284C7',
      });
    }
  }

  // 5. Classes & Trilhas
  else if (ent.category === 'class' || ent.category === 'track') {
    if (ent.initialPV) stats.push({ label: 'PV Inicial', value: ent.initialPV, highlight: true });
    if (ent.initialPE) stats.push({ label: 'PE Inicial', value: ent.initialPE });
    if (ent.initialSAN) stats.push({ label: 'SAN Inicial', value: ent.initialSAN });
    if (ent.proficiencies) {
      extraSections.push({
        title: 'Proficiências',
        content: ent.proficiencies,
        accentColor: '#10B981',
      });
    }
  }

  // 6. Poderes
  else if (ent.category === 'power') {
    if (ent.prerequisite) {
      stats.push({ label: 'Pré-requisito', value: ent.prerequisite, highlight: true });
    } else {
      stats.push({ label: 'Tipo', value: ent.subCategory || 'Poder Paranormal', highlight: true });
    }
    if (ent.element && ent.element !== 'Nenhum') {
      stats.push({ label: 'Elemento', value: ent.element });
    }
    if (ent.affinity) {
      extraSections.push({
        title: 'Afinidade Elemental',
        content: ent.affinity,
        accentColor: '#A855F7',
      });
    }
  }

  // 7. Perícias
  else if (ent.category === 'skill') {
    if (ent.baseAttribute) stats.push({ label: 'Atributo', value: ent.baseAttribute, highlight: true });
    if (ent.trainedOnly !== undefined) stats.push({ label: 'Apenas Treinada', value: ent.trainedOnly ? 'Sim' : 'Não' });
    if (ent.armorPenalty !== undefined) stats.push({ label: 'Penalidade Carga', value: ent.armorPenalty ? 'Sim' : 'Não' });
  }

  // 8. Condições
  else if (ent.category === 'condition') {
    stats.push({ label: 'Tipo', value: 'Condição', highlight: true });
    if (ent.tags && ent.tags.length > 0) {
      stats.push({ label: 'Efeito', value: ent.tags.slice(0, 3).join(', ') });
    }
  }

  // 9. Fallback universal garantindo que nenhum card fique sem parâmetros
  if (stats.length === 0) {
    if (ent.subCategory && ent.subCategory !== ent.name) {
      stats.push({ label: 'Tipo', value: ent.subCategory, highlight: true });
    } else {
      stats.push({ label: 'Categoria', value: catInfo.singular, highlight: true });
    }
    if (ent.element && ent.element !== 'Nenhum') {
      stats.push({ label: 'Elemento', value: ent.element });
    }
    if (ent.bookTitle) {
      stats.push({ label: 'Fonte', value: ent.bookTitle });
    }
  }

  return {
    id: ent.id,
    name: ent.name || 'Registro',
    category: ent.category,
    categoryLabel: catInfo.singular,
    subCategory: ent.subCategory || catInfo.singular,
    element: ent.element && ent.element !== 'Nenhum' ? ent.element : undefined,
    bookTitle: ent.bookTitle,
    pageNumber: ent.pageNumber,
    stats,
    summary: ent.summary,
    description: ent.description || ent.shortDescription || ent.summary || 'Registro oficial do compêndio.',
    extraSections: extraSections.length > 0 ? extraSections : undefined,
    tags: ent.tags,
  };
}
