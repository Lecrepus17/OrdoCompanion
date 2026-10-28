import React, { useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  CATEGORY_LABELS,
  getElementStyle,
  ThemeColors,
  useTheme,
  useThemedStyles,
} from '../theme';
import { useApp } from '../context/AppContext';
import { CompendiumEntity } from '../types/compendium';
import { RecordPreviewRequest } from '../types/recordPreview';
import {
  isAmmoModification,
  OFFICIAL_WEAPON_MODS,
  OFFICIAL_WEAPON_MODS_MAP,
} from '../utils/weapons';
import { OFFICIAL_SKILLS_LIST } from '../utils/progression';

export interface RecordPreviewModalProps {
  request: RecordPreviewRequest | null;
  onClose: () => void;
}

function inferPeCostBadge(text?: string): string {
  const lower = (text || '').toLowerCase();
  const match = lower.match(/gastar?\s+(\d+)\s*pe/);
  if (match) return `${match[1]} PE`;
  if (lower.includes('2 pe')) return '2 PE';
  if (lower.includes('1 pe')) return '1 PE';
  return 'Passivo';
}

export const RecordPreviewModal: React.FC<RecordPreviewModalProps> = ({
  request,
  onClose,
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    entities,
    getEntityById,
    favoriteIds,
    toggleFavorite,
    rollFormula,
  } = useApp();

  // Resolve underlying CompendiumEntity when possible
  const resolvedEntity = useMemo<CompendiumEntity | undefined>(() => {
    if (!request) return undefined;
    const { target } = request;
    if (target.kind === 'entity') return target.entity;
    if (target.kind === 'skill_def') {
      if (target.entity) return target.entity;
      const lower = target.skill.name.toLowerCase();
      return entities.find(
        (e) => e.category === 'skill' && e.name.toLowerCase() === lower
      );
    }
    if (target.kind === 'weapon_mod') {
      if (target.entity) return target.entity;
      const eid = target.mod.canonicalEntityId || target.mod.id;
      return getEntityById(eid);
    }
    if (target.kind === 'character_ability') {
      if (target.entity) return target.entity;
      const byId = getEntityById(target.ability.id);
      if (byId) return byId;
      const lower = target.ability.name.trim().toLowerCase();
      return entities.find((e) => e.name.toLowerCase() === lower);
    }
    if (target.kind === 'character_attack') {
      if (target.entity) return target.entity;
      const lower = target.attack.name.trim().toLowerCase();
      return entities.find(
        (e) => e.category === 'weapon' && e.name.toLowerCase() === lower
      );
    }
    if (target.kind === 'character_inventory') {
      if (target.entity) return target.entity;
      const lower = target.item.name.trim().toLowerCase();
      return entities.find(
        (e) =>
          (e.category === 'item' || e.category === 'weapon') &&
          e.name.toLowerCase() === lower
      );
    }
    if (target.kind === 'campaign_monster') {
      if (target.entity) return target.entity;
      if (target.monster.compendiumEntityId) {
        return getEntityById(target.monster.compendiumEntityId);
      }
      const lower = target.monster.name.trim().toLowerCase();
      return entities.find(
        (e) => e.category === 'creature' && e.name.toLowerCase() === lower
      );
    }
    return undefined;
  }, [request, entities, getEntityById]);

  if (!request) return null;

  const { target, primaryAction, showOpenFullEntityButton, popupTestID } = request;

  // Determine popup testID (preserving backwards compatibility with 'origin-ability-popup')
  const effectiveTestID =
    popupTestID ||
    (target.kind === 'entity' && target.entity.category === 'origin'
      ? 'origin-ability-popup'
      : 'record-preview-popup');

  // Determine Header Info
  const headerInfo = (() => {
    if (target.kind === 'entity' || (target.kind === 'skill_def' && resolvedEntity)) {
      const ent = target.kind === 'entity' ? target.entity : resolvedEntity!;
      const catInfo = CATEGORY_LABELS[ent.category] || CATEGORY_LABELS.all;
      return {
        title: ent.name,
        subtitle: `${ent.bookTitle || 'Livro Base'}${
          ent.pageNumber ? ` • pág. ${ent.pageNumber}` : ''
        }`,
        badge: ent.subCategory || catInfo.singular,
        badgeColor: catInfo.color,
        element: ent.element,
        icon:
          ent.category === 'origin'
            ? 'flash'
            : ent.category === 'ritual'
            ? 'flame'
            : ent.category === 'weapon'
            ? 'hammer'
            : ent.category === 'creature'
            ? 'skull'
            : ent.category === 'skill'
            ? 'dice'
            : ent.category === 'class' || ent.category === 'track'
            ? 'shield-half'
            : 'sparkles',
      };
    }

    if (target.kind === 'skill_def') {
      return {
        title: target.skill.name,
        subtitle: `Perícia Oficial • Atributo Base: ${target.skill.attr}`,
        badge: 'Perícia',
        badgeColor: colors.primary,
        element: 'Nenhum',
        icon: 'dice',
      };
    }

    if (target.kind === 'custom_weapon') {
      const w = target.weapon;
      return {
        title: w.name,
        subtitle: `Base: ${w.baseWeaponName} • ${w.weaponType} (${w.proficiency})`,
        badge: `Arma Cat ${w.finalCategory}`,
        badgeColor: colors.primary,
        element: w.element,
        icon: 'construct',
      };
    }

    if (target.kind === 'weapon_mod') {
      const m = target.mod;
      const isAmmo = isAmmoModification(m);
      const isCurse = Boolean(m.element && m.element !== 'Nenhum');
      return {
        title: m.name,
        subtitle: `${m.source} • ${
          isAmmo ? 'Modificação de Munição' : isCurse ? 'Maldição de Arma' : 'Modificação de Arma'
        }`,
        badge: `+${m.categoryIncrease} Cat (${isAmmo ? 'Balas' : 'Arma'})`,
        badgeColor: isAmmo ? '#F59E0B' : isCurse ? '#A855F7' : colors.primary,
        element: m.element || 'Nenhum',
        icon: isAmmo ? 'disc' : isCurse ? 'sparkles' : 'hammer',
      };
    }

    if (target.kind === 'character') {
      const c = target.character;
      return {
        title: c.name,
        subtitle: `${c.player ? `Jogador: ${c.player} • ` : ''}NEX ${c.nex}% • ${c.rank}`,
        badge: 'Ficha de Agente',
        badgeColor: colors.primary,
        element: c.affinity,
        icon: 'person',
      };
    }

    if (target.kind === 'character_ability') {
      const ab = target.ability;
      return {
        title: ab.name,
        subtitle: ab.originPage || (resolvedEntity ? `${resolvedEntity.subCategory} • ${resolvedEntity.bookTitle}` : 'Habilidade da Ficha'),
        badge: ab.cost || resolvedEntity?.subCategory || 'Habilidade',
        badgeColor: '#F59E0B',
        element: resolvedEntity?.element || 'Nenhum',
        icon: 'sparkles',
      };
    }

    if (target.kind === 'character_attack') {
      const atk = target.attack;
      return {
        title: atk.name,
        subtitle: `Teste: ${atk.test} • Alcance: ${atk.range || 'Curto'}`,
        badge: `Dano ${atk.damage}`,
        badgeColor: colors.danger,
        element: target.customWeapon?.element || resolvedEntity?.element || 'Nenhum',
        icon: 'flash',
      };
    }

    if (target.kind === 'character_inventory') {
      const it = target.item;
      return {
        title: it.name,
        subtitle: `Categoria ${it.category} • ${it.spaces} espaço(s)`,
        badge: it.equipped ? 'Equipado' : `Cat. ${it.category}`,
        badgeColor: colors.primary,
        element: resolvedEntity?.element || 'Nenhum',
        icon: 'cube',
      };
    }

    if (target.kind === 'campaign_monster') {
      const m = target.monster;
      return {
        title: m.name,
        subtitle: `Ameaça da Campanha • VD ${m.vd}`,
        badge: `VD ${m.vd}`,
        badgeColor: colors.danger,
        element: m.element || resolvedEntity?.element || 'Nenhum',
        icon: 'skull',
      };
    }

    if (target.kind === 'campaign_scene') {
      const sc = target.scene;
      return {
        title: sc.title,
        subtitle: sc.isCompleted ? 'Cena Concluída' : 'Cena em Andamento',
        badge: `${sc.clues?.length || 0} Pista(s)`,
        badgeColor: sc.isCompleted ? '#10B981' : colors.primary,
        element: 'Nenhum',
        icon: 'book',
      };
    }

    return {
      title: target.title,
      subtitle: target.subtitle || 'Detalhes do Registro',
      badge: target.badgeText || target.categoryLabel || 'Info',
      badgeColor: colors.primary,
      element: target.element || 'Nenhum',
      icon: 'information-circle',
    };
  })();

  const elStyle = getElementStyle(headerInfo.element || 'Nenhum', colors);
  const isFav = resolvedEntity ? favoriteIds.has(resolvedEntity.id) : false;

  const renderEntityBody = (ent: CompendiumEntity) => {
    return (
      <>
        {/* ORIGEM */}
        {ent.category === 'origin' && (
          <>
            <View style={styles.highlightSection}>
              <View style={styles.highlightHeader}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={styles.highlightTitle}>
                  {ent.powerName || 'Habilidade de Origem'}
                </Text>
                <View style={styles.costBadge}>
                  <Text style={styles.costBadgeText}>
                    {inferPeCostBadge(ent.powerDescription)}
                  </Text>
                </View>
              </View>
              <Text style={styles.highlightBodyText}>
                {ent.powerDescription ||
                  ent.description ||
                  'Habilidade especial concedida pela Origem do agente.'}
              </Text>
            </View>

            {!!ent.trainedSkills && (
              <View style={styles.infoBox}>
                <View style={styles.infoBoxHeader}>
                  <Ionicons name="dice-outline" size={16} color={colors.accent} />
                  <Text style={styles.infoBoxLabel}>Perícias Treinadas:</Text>
                </View>
                <Text style={styles.infoBoxValue}>{ent.trainedSkills}</Text>
              </View>
            )}

            {!!ent.description && (
              <View style={styles.descBox}>
                <Text style={styles.sectionSubLabel}>Sobre a Origem:</Text>
                <Text style={styles.descText}>{ent.description}</Text>
              </View>
            )}
          </>
        )}

        {/* CLASSE */}
        {ent.category === 'class' && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Características da Classe</Text>
              <View style={styles.gridStats}>
                <PreviewStat label="PV Iniciais" value={ent.initialPV || '—'} highlight />
                <PreviewStat label="PV por NEX" value={ent.pvPerNex || '—'} />
                <PreviewStat label="PE Iniciais" value={ent.initialPE || '—'} highlight />
                <PreviewStat label="PE por NEX" value={ent.pePerNex || '—'} />
                <PreviewStat label="SAN Inicial" value={ent.initialSAN || '—'} highlight />
                <PreviewStat label="SAN por NEX" value={ent.sanPerNex || '—'} />
              </View>
              {!!ent.trainedSkills && (
                <PreviewStat label="Perícias Treinadas" value={ent.trainedSkills} />
              )}
              {!!ent.proficiencies && (
                <PreviewStat label="Proficiências" value={ent.proficiencies} />
              )}
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Habilidades e Progressão</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>
            </View>
          </>
        )}

        {/* TRILHA */}
        {ent.category === 'track' && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Informações da Trilha</Text>
              <View style={styles.gridStats}>
                <PreviewStat
                  label="Classe Vinculada"
                  value={ent.className || ent.subCategory || 'Geral'}
                  highlight
                />
                {ent.element && ent.element !== 'Nenhum' && (
                  <PreviewStat label="Elemento" value={ent.element} />
                )}
              </View>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Progressão da Trilha (NEX 10%, 40%, 65%, 99%)</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>
            </View>
          </>
        )}

        {/* PODER */}
        {ent.category === 'power' && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Parâmetros do Poder</Text>
              <View style={styles.gridStats}>
                <PreviewStat label="Tipo de Poder" value={ent.subCategory || 'Geral'} highlight />
                <PreviewStat label="Elemento" value={ent.element || 'Nenhum'} />
                {Boolean(ent.prerequisite) && (
                  <PreviewStat label="Pré-requisito" value={ent.prerequisite!} highlight />
                )}
              </View>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Efeito e Regras</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>

              {Boolean(ent.affinity) && (
                <View style={[styles.upgradeBox, { borderColor: elStyle.border }]}>
                  <Text style={[styles.upgradeLabel, { color: elStyle.text }]}>
                    AFINIDADE ({ent.element || 'PARANORMAL'})
                  </Text>
                  <Text style={styles.upgradeText}>{ent.affinity}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* RITUAL */}
        {ent.category === 'ritual' && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Parâmetros do Ritual</Text>
              <View style={styles.gridStats}>
                <PreviewStat
                  label="Círculo"
                  value={`${ent.circle ?? 1}º Círculo`}
                  highlight
                />
                <PreviewStat label="Execução" value={ent.execution || 'Padrão'} />
                <PreviewStat label="Alcance" value={ent.range || 'Curto'} />
                <PreviewStat label="Alvo / Área" value={ent.target || 'Veja texto'} />
                <PreviewStat label="Duração" value={ent.duration || 'Instantânea'} />
                <PreviewStat label="Resistência" value={ent.resistance || 'Nenhuma'} />
              </View>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Descrição e Efeito</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>

              {Boolean(ent.discente) && (
                <View style={styles.upgradeBox}>
                  <Text style={styles.upgradeLabel}>DISCENTE</Text>
                  <Text style={styles.upgradeText}>{ent.discente}</Text>
                </View>
              )}

              {Boolean(ent.verdadeiro) && (
                <View style={[styles.upgradeBox, { borderColor: colors.accent }]}>
                  <Text style={[styles.upgradeLabel, { color: colors.accent }]}>
                    VERDADEIRO
                  </Text>
                  <Text style={styles.upgradeText}>{ent.verdadeiro}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ARMA / EQUIPAMENTO */}
        {(ent.category === 'weapon' || ent.category === 'item') && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Especificações do Equipamento</Text>
              <View style={styles.gridStats}>
                {ent.itemCategory !== undefined && ent.itemCategory !== '' && (
                  <PreviewStat label="Categoria" value={`Cat. ${ent.itemCategory}`} highlight />
                )}
                {Boolean(ent.proficiency) && (
                  <PreviewStat label="Proficiência" value={ent.proficiency!} />
                )}
                {Boolean(ent.handedness) && (
                  <PreviewStat label="Empunhadura" value={ent.handedness!} />
                )}
                {Boolean(ent.damage) && (
                  <PreviewStat label="Dano" value={ent.damage!} highlight />
                )}
                {Boolean(ent.critical) && (
                  <PreviewStat label="Crítico" value={ent.critical!} />
                )}
                {Boolean(ent.range) && (
                  <PreviewStat label="Alcance" value={ent.range!} />
                )}
                {Boolean(ent.damageType) && (
                  <PreviewStat label="Tipo de Dano" value={ent.damageType!} />
                )}
                {Boolean(ent.spaces) && (
                  <PreviewStat label="Espaços" value={String(ent.spaces)} />
                )}
              </View>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Descrição e Regras</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>
            </View>
          </>
        )}

        {/* CRIATURA / AMEAÇA */}
        {ent.category === 'creature' && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Estatísticas da Ameaça</Text>
              <View style={styles.gridStats}>
                <PreviewStat label="VD (Desafio)" value={String(ent.vd ?? '—')} highlight />
                <PreviewStat label="Pontos de Vida" value={String(ent.pv ?? '—')} highlight />
                <PreviewStat label="Defesa" value={String(ent.defense ?? '—')} />
                <PreviewStat
                  label="Presença Perturbadora"
                  value={ent.disturbingPresence || 'Nenhuma'}
                />
              </View>
              {ent.attributes && Object.keys(ent.attributes).length > 0 && (
                <View style={styles.attrsRow}>
                  {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => (
                    <View key={attr} style={styles.attrBox}>
                      <Text style={styles.attrLabel}>{attr}</Text>
                      <Text style={styles.attrVal}>{ent.attributes?.[attr] ?? '0'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Ficha Completa, Ações e Enigma</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>
            </View>
          </>
        )}

        {/* PERÍCIA */}
        {ent.category === 'skill' && (
          <>
            <View style={styles.statsCard}>
              <Text style={styles.sectionTitle}>Parâmetros da Perícia</Text>
              <View style={styles.gridStats}>
                <PreviewStat
                  label="Atributo-Base"
                  value={ent.baseAttribute || 'INT'}
                  highlight
                />
                <PreviewStat
                  label="Somente Treinada"
                  value={ent.trainedOnly ? 'Sim (Exige Treino)' : 'Não (Uso Comum)'}
                />
                <PreviewStat
                  label="Penalidade de Carga"
                  value={ent.armorPenalty ? 'Sim (Sofre Penalidade)' : 'Não'}
                />
                {ent.requiresKit && (
                  <PreviewStat label="Exige Kit" value="Sim (Requer Kit)" />
                )}
              </View>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Ações e Usos da Perícia</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>
            </View>
          </>
        )}

        {/* CONDIÇÃO / REGRA */}
        {(ent.category === 'condition' || ent.category === 'rule') && (
          <>
            <View style={styles.statsCard}>
              <View style={styles.gridStats}>
                <PreviewStat label="Classificação" value={ent.subCategory || 'Regra'} highlight />
                {ent.element && ent.element !== 'Nenhum' && (
                  <PreviewStat label="Elemento" value={ent.element} />
                )}
              </View>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.sectionTitle}>Descrição e Regras</Text>
              <Text style={styles.descText}>{ent.description || ent.summary}</Text>
            </View>
          </>
        )}

        {/* FÓRMULAS DE ROLAGEM RÁPIDA */}
        {ent.diceFormulas && ent.diceFormulas.length > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Rolagens Rápidas</Text>
            <View style={styles.diceRow}>
              {ent.diceFormulas.map((formula) => (
                <TouchableOpacity
                  key={formula}
                  style={styles.diceBtn}
                  onPress={() => rollFormula(formula, `${ent.name} (${formula})`)}
                >
                  <Ionicons name="dice" size={16} color="#FFF" />
                  <Text style={styles.diceBtnText}>Rolar {formula}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.popupOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.popupCard} testID={effectiveTestID}>
          {/* Wrapper adicional para busca universal em testes */}
          <View testID="record-preview-popup" style={{ flexShrink: 1 }}>
            {/* HEADER */}
            <View style={styles.popupHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.popupIconBadge, { borderColor: headerInfo.badgeColor }]}>
                  <Ionicons
                    name={headerInfo.icon as any}
                    size={20}
                    color={headerInfo.badgeColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.typeBadge,
                        { borderColor: headerInfo.badgeColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          { color: headerInfo.badgeColor },
                        ]}
                      >
                        {headerInfo.badge}
                      </Text>
                    </View>
                    {headerInfo.element && headerInfo.element !== 'Nenhum' && (
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: elStyle.bg,
                            borderColor: elStyle.border,
                          },
                        ]}
                      >
                        <Text style={[styles.typeBadgeText, { color: elStyle.text }]}>
                          {headerInfo.element}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.popupTitle}>{headerInfo.title}</Text>
                  <Text style={styles.popupSubtitle}>{headerInfo.subtitle}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {resolvedEntity && (
                  <TouchableOpacity
                    onPress={() => toggleFavorite(resolvedEntity.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.popupCloseBtn}
                    testID="popup-fav-btn"
                  >
                    <Ionicons
                      name={isFav ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color={isFav ? colors.warning : colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.popupCloseBtn}
                  testID="popup-close-btn"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* BODY */}
            <ScrollView
              style={styles.popupBody}
              contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
              showsVerticalScrollIndicator={true}
            >
              {/* 1. ENTIDADE DO COMPÊNDIO OU PERÍCIA RESOLVIDA */}
              {target.kind === 'entity' && renderEntityBody(target.entity)}

              {target.kind === 'skill_def' && (
                resolvedEntity ? (
                  renderEntityBody(resolvedEntity)
                ) : (
                  <View style={styles.statsCard}>
                    <Text style={styles.sectionTitle}>Parâmetros da Perícia</Text>
                    <View style={styles.gridStats}>
                      <PreviewStat label="Atributo-Base" value={target.skill.attr} highlight />
                      <PreviewStat
                        label="Somente Treinada"
                        value={target.skill.trainedOnly ? 'Sim' : 'Não'}
                      />
                      <PreviewStat
                        label="Penalidade de Carga"
                        value={target.skill.armorPenalty ? 'Sim' : 'Não'}
                      />
                    </View>
                  </View>
                )
              )}

              {/* 2. ARMA CUSTOMIZADA DA ARMARIA */}
              {target.kind === 'custom_weapon' && (() => {
                const w = target.weapon;
                return (
                  <>
                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Estatísticas Finais Calculadas</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat label="Dano Final" value={w.finalDamage} highlight />
                        <PreviewStat label="Crítico" value={w.finalCritical} highlight />
                        <PreviewStat label="Alcance" value={w.finalRange} />
                        <PreviewStat label="Espaços" value={String(w.finalSpaces)} />
                        <PreviewStat label="Cat. da Arma" value={`Cat. ${w.finalCategory}`} />
                        {w.weaponType !== 'Corpo a corpo' && w.ammoCategory && w.ammoCategory !== '—' && (
                          <PreviewStat
                            label="Munição / Balas"
                            value={`${w.ammoName || w.ammoType || 'Balas'} (Cat. ${w.ammoCategory})`}
                          />
                        )}
                        {w.attackBonus !== 0 && (
                          <PreviewStat
                            label="Bônus de Ataque"
                            value={`${w.attackBonus > 0 ? '+' : ''}${w.attackBonus} no teste`}
                            highlight
                          />
                        )}
                      </View>
                      <View style={styles.diceRow}>
                        <TouchableOpacity
                          style={styles.diceBtn}
                          onPress={() => rollFormula(w.finalDamage, `Dano: ${w.name}`)}
                        >
                          <Ionicons name="dice" size={16} color="#FFF" />
                          <Text style={styles.diceBtnText}>Rolar Dano ({w.finalDamage})</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Arma Base Original ({w.baseWeaponName})</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat label="Dano Base" value={w.baseDamage} />
                        <PreviewStat label="Crítico Base" value={w.baseCritical} />
                        <PreviewStat label="Categoria Base" value={`Cat. ${w.baseCategory}`} />
                        <PreviewStat label="Empunhadura" value={w.handedness} />
                      </View>
                    </View>

                    <View style={styles.descBox}>
                      <Text style={styles.sectionTitle}>
                        Modificações e Maldições Aplicadas (
                        {w.modifications.length + (w.customModifications?.length || 0)})
                      </Text>
                      {w.modifications.length === 0 &&
                      (!w.customModifications || w.customModifications.length === 0) ? (
                        <Text style={styles.descText}>
                          Nenhuma modificação ou maldição aplicada a esta arma.
                        </Text>
                      ) : (
                        <View style={{ gap: 8 }}>
                          {w.modifications.map((mid) => {
                            const def =
                              OFFICIAL_WEAPON_MODS_MAP.get(mid) ||
                              OFFICIAL_WEAPON_MODS.find((m) => m.id === mid);
                            const isAmmo = isAmmoModification(def || mid);
                            const isCurse = Boolean(def?.element && def.element !== 'Nenhum');
                            return (
                              <View key={mid} style={styles.modDetailRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Ionicons
                                    name={isAmmo ? 'disc' : isCurse ? 'sparkles' : 'construct'}
                                    size={14}
                                    color={isAmmo ? '#F59E0B' : isCurse ? '#A855F7' : colors.primary}
                                  />
                                  <Text style={styles.modDetailTitle}>
                                    {def ? def.name : mid}
                                  </Text>
                                  <Text style={styles.modDetailTag}>
                                    {isAmmo ? '[Munição]' : isCurse ? `[Maldição • ${def?.element}]` : '[Arma]'}
                                  </Text>
                                </View>
                                {def?.description && (
                                  <Text style={styles.modDetailDesc}>{def.description}</Text>
                                )}
                              </View>
                            );
                          })}
                          {w.customModifications?.map((cm) => (
                            <View key={cm.id} style={styles.modDetailRow}>
                              <Text style={styles.modDetailTitle}>
                                {cm.name} (+{cm.categoryIncrease} Cat)
                              </Text>
                              <Text style={styles.modDetailDesc}>{cm.effect}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {!!w.notes && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.sectionSubLabel}>Notas Táticas:</Text>
                          <Text style={styles.descText}>{w.notes}</Text>
                        </View>
                      )}
                    </View>
                  </>
                );
              })()}

              {/* 3. MODIFICAÇÃO / MALDIÇÃO DE ARMA */}
              {target.kind === 'weapon_mod' && (() => {
                const m = target.mod;
                const isAmmo = isAmmoModification(m);
                const appliesLabel =
                  m.specialRequirementText ||
                  (m.allowedWeaponTypes && m.allowedWeaponTypes.length > 0
                    ? m.allowedWeaponTypes.join(' / ')
                    : m.appliesTo === 'firearm'
                    ? 'Armas de Fogo'
                    : m.appliesTo === 'melee'
                    ? 'Armas Corpo a Corpo'
                    : m.appliesTo === 'ranged'
                    ? 'Armas de Disparo / Fogo'
                    : 'Qualquer Arma Compatível');
                return (
                  <>
                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Especificações da Modificação</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat
                          label="Alvo da Categoria"
                          value={isAmmo ? 'Munição / Balas' : 'Arma'}
                          highlight
                        />
                        <PreviewStat
                          label="Custo de Categoria"
                          value={`+${m.categoryIncrease} Categoria`}
                          highlight
                        />
                        <PreviewStat label="Restrição" value={appliesLabel} />
                        <PreviewStat label="Fonte" value={m.source} />
                      </View>
                    </View>
                    <View style={styles.descBox}>
                      <Text style={styles.sectionTitle}>Efeito Mecânico Completo</Text>
                      <Text style={styles.descText}>
                        {resolvedEntity?.description || m.description}
                      </Text>
                    </View>
                  </>
                );
              })()}

              {/* 4. FICHA DE AGENTE (RESUMO COMPLETO) */}
              {target.kind === 'character' && (() => {
                const c = target.character;
                const orig = getEntityById(c.originId);
                const cls = getEntityById(c.classId);
                const trk = c.trackId ? getEntityById(c.trackId) : undefined;
                const trainedSkills = OFFICIAL_SKILLS_LIST.filter(
                  (sk) => (c.skills?.[sk.name]?.degree || 0) > 0
                );
                const totalDef =
                  10 +
                  (c.attributes?.AGI || 0) +
                  (c.defenseEquip || 0) +
                  (c.defenseBonus || 0) +
                  (c.defenseOther || 0);

                return (
                  <>
                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Status Vitais & Atributos</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat label="PV" value={`${c.pvCurrent} / ${c.pvMax}`} highlight />
                        <PreviewStat label="PE" value={`${c.peCurrent} / ${c.peMax}`} highlight />
                        <PreviewStat label="SAN" value={`${c.sanCurrent} / ${c.sanMax}`} highlight />
                        <PreviewStat label="Defesa" value={String(totalDef)} />
                        <PreviewStat label="Origem" value={orig?.name || c.originId || '—'} />
                        <PreviewStat
                          label="Classe / Trilha"
                          value={`${cls?.name || c.classId || '—'}${trk ? ` (${trk.name})` : ''}`}
                        />
                      </View>
                      <View style={styles.attrsRow}>
                        {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => (
                          <View key={attr} style={styles.attrBox}>
                            <Text style={styles.attrLabel}>{attr}</Text>
                            <Text style={styles.attrVal}>{c.attributes?.[attr] ?? 1}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {trainedSkills.length > 0 && (
                      <View style={styles.infoBox}>
                        <Text style={styles.sectionTitle}>
                          Perícias Treinadas ({trainedSkills.length})
                        </Text>
                        <Text style={styles.descText}>
                          {trainedSkills
                            .map((sk) => `${sk.name} (+${c.skills[sk.name]?.degree || 5})`)
                            .join(' • ')}
                        </Text>
                      </View>
                    )}

                    {c.attacks && c.attacks.length > 0 && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>
                          Ataques Equipados ({c.attacks.length})
                        </Text>
                        {c.attacks.map((atk) => (
                          <Text key={atk.id} style={styles.descText}>
                            • <Text style={{ fontWeight: '800' }}>{atk.name}</Text>: {atk.damage} (Crít. {atk.critical}) — {atk.test}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}

              {/* 5. HABILIDADE / RITUAL / PODER DA FICHA */}
              {target.kind === 'character_ability' && (
                resolvedEntity ? (
                  renderEntityBody(resolvedEntity)
                ) : (
                  <View style={styles.descBox}>
                    <View style={styles.highlightHeader}>
                      <Ionicons name="sparkles" size={16} color="#F59E0B" />
                      <Text style={styles.highlightTitle}>{target.ability.name}</Text>
                      {!!target.ability.cost && (
                        <View style={styles.costBadge}>
                          <Text style={styles.costBadgeText}>{target.ability.cost}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.descText}>
                      {target.ability.description || 'Sem descrição detalhada.'}
                    </Text>
                  </View>
                )
              )}

              {/* 6. ATAQUE DA FICHA */}
              {target.kind === 'character_attack' && (() => {
                const atk = target.attack;
                return (
                  <>
                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Parâmetros do Ataque</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat label="Teste" value={atk.test || 'Luta / Pontaria'} highlight />
                        <PreviewStat label="Dano" value={atk.damage || '1d6'} highlight />
                        <PreviewStat label="Crítico" value={atk.critical || '20/x2'} />
                        <PreviewStat label="Alcance" value={atk.range || 'Curto'} />
                      </View>
                      <View style={styles.diceRow}>
                        <TouchableOpacity
                          style={styles.diceBtn}
                          onPress={() => rollFormula(atk.damage, `Dano: ${atk.name}`)}
                        >
                          <Ionicons name="dice" size={16} color="#FFF" />
                          <Text style={styles.diceBtnText}>Rolar Dano ({atk.damage})</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {!!atk.special && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>Modificações e Regras Especiais</Text>
                        <Text style={styles.descText}>{atk.special}</Text>
                      </View>
                    )}
                    {resolvedEntity && renderEntityBody(resolvedEntity)}
                  </>
                );
              })()}

              {/* 7. ITEM DE INVENTÁRIO DA FICHA */}
              {target.kind === 'character_inventory' && (() => {
                const it = target.item;
                return (
                  <>
                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Dados do Item no Inventário</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat label="Categoria" value={`Cat. ${it.category}`} highlight />
                        <PreviewStat label="Espaços" value={String(it.spaces)} />
                        <PreviewStat label="Status" value={it.equipped ? 'Equipado' : 'Guardado'} />
                      </View>
                    </View>
                    {!!it.details && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>Detalhes e Anotações</Text>
                        <Text style={styles.descText}>{it.details}</Text>
                      </View>
                    )}
                    {resolvedEntity && renderEntityBody(resolvedEntity)}
                  </>
                );
              })()}

              {/* 8. AMEAÇA / CRIATURA DA CAMPANHA (MESTRE) */}
              {target.kind === 'campaign_monster' && (() => {
                const m = target.monster;
                return (
                  <>
                    <View style={styles.statsCard}>
                      <Text style={styles.sectionTitle}>Status da Ameaça em Cena</Text>
                      <View style={styles.gridStats}>
                        <PreviewStat label="VD" value={String(m.vd)} highlight />
                        <PreviewStat label="PV Atual / Máx" value={`${m.pvCurrent} / ${m.pvMax}`} highlight />
                        <PreviewStat label="Defesa" value={String(m.defense)} />
                        <PreviewStat
                          label="Presença Perturbadora"
                          value={m.disturbingPresence || 'Nenhuma'}
                        />
                      </View>
                    </View>
                    {!!m.attacks && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>Ações e Ataques</Text>
                        <Text style={styles.descText}>{m.attacks}</Text>
                      </View>
                    )}
                    {!!m.abilities && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>Habilidades e Enigma</Text>
                        <Text style={styles.descText}>{m.abilities}</Text>
                      </View>
                    )}
                    {!!m.notes && (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxLabel}>Notas do Mestre:</Text>
                        <Text style={styles.descText}>{m.notes}</Text>
                      </View>
                    )}
                    {resolvedEntity && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>Ficha Canônica no Compêndio</Text>
                        <Text style={styles.descText}>{resolvedEntity.description}</Text>
                      </View>
                    )}
                  </>
                );
              })()}

              {/* 9. CENA DE INVESTIGAÇÃO (MESTRE) */}
              {target.kind === 'campaign_scene' && (() => {
                const sc = target.scene;
                return (
                  <>
                    {!!sc.summary && (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoBoxLabel}>Resumo da Cena:</Text>
                        <Text style={styles.descText}>{sc.summary}</Text>
                      </View>
                    )}
                    {!!sc.details && (
                      <View style={styles.descBox}>
                        <Text style={styles.sectionTitle}>Descrição Narrativa & Segredos</Text>
                        <Text style={styles.descText}>{sc.details}</Text>
                      </View>
                    )}
                    {sc.clues && sc.clues.length > 0 && (
                      <View style={styles.statsCard}>
                        <Text style={styles.sectionTitle}>
                          Pistas da Cena ({sc.clues.filter((c) => c.isFound).length}/{sc.clues.length} reveladas)
                        </Text>
                        {sc.clues.map((clue) => (
                          <View key={clue.id} style={styles.modDetailRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons
                                name={clue.isFound ? 'checkbox' : 'square-outline'}
                                size={16}
                                color={clue.isFound ? '#10B981' : colors.textSecondary}
                              />
                              <Text style={styles.descText}>{clue.text}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}

              {/* 10. GENÉRICO */}
              {target.kind === 'generic' && (
                <>
                  {target.stats && target.stats.length > 0 && (
                    <View style={styles.statsCard}>
                      <View style={styles.gridStats}>
                        {target.stats.map((st, idx) => (
                          <PreviewStat
                            key={idx}
                            label={st.label}
                            value={st.value}
                            highlight={st.highlight}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                  <View style={styles.descBox}>
                    <Text style={styles.descText}>{target.description}</Text>
                  </View>
                  {target.extraSections?.map((sec, i) => (
                    <View key={i} style={styles.descBox}>
                      <Text style={styles.sectionTitle}>{sec.title}</Text>
                      <Text style={styles.descText}>{sec.content}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            {/* FOOTER */}
            <View style={styles.popupFooter}>
              <TouchableOpacity
                style={styles.popupDismissButton}
                onPress={onClose}
                testID="popup-dismiss-btn"
              >
                <Text style={styles.popupDismissButtonText}>Fechar</Text>
              </TouchableOpacity>

              {showOpenFullEntityButton && resolvedEntity && !primaryAction && (
                <TouchableOpacity
                  style={styles.popupSelectButton}
                  onPress={() => {
                    const eid = resolvedEntity.id;
                    onClose();
                    router.push(`/entity/${eid}`);
                  }}
                  testID="popup-open-full-btn"
                >
                  <Ionicons name="open-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.popupSelectButtonText}>Abrir Registro</Text>
                </TouchableOpacity>
              )}

              {primaryAction && (
                <TouchableOpacity
                  style={[
                    styles.popupSelectButton,
                    primaryAction.isSelected && styles.popupSelectButtonActive,
                  ]}
                  onPress={() => {
                    primaryAction.onPress();
                    onClose();
                  }}
                  testID={primaryAction.testID || 'popup-select-btn'}
                >
                  <Ionicons
                    name={
                      (primaryAction.icon as any) ||
                      (primaryAction.isSelected ? 'checkmark-circle' : 'checkmark')
                    }
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.popupSelectButtonText}>
                    {primaryAction.label}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PreviewStat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          highlight && { color: colors.primary, fontWeight: '900' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    popupOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    popupCard: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    popupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    popupIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 4,
    },
    typeBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    popupTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    popupSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    popupCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    popupBody: {
      padding: 16,
      maxHeight: 480,
    },
    highlightSection: {
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.35)',
      borderRadius: 12,
      padding: 14,
      gap: 8,
    },
    highlightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    highlightTitle: {
      color: '#F59E0B',
      fontSize: 15,
      fontWeight: '800',
      flex: 1,
    },
    costBadge: {
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    costBadgeText: {
      color: '#FBBF24',
      fontSize: 11,
      fontWeight: '800',
    },
    highlightBodyText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    infoBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 4,
    },
    infoBoxHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    infoBoxLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    infoBoxValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    statsCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionSubLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 4,
    },
    gridStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minWidth: '45%',
      flexGrow: 1,
    },
    statLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
    },
    attrsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 4,
    },
    attrBox: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      alignItems: 'center',
    },
    attrLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '800',
    },
    attrVal: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '900',
    },
    descBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 13,
      gap: 8,
    },
    descText: {
      color: colors.text,
      fontSize: 13.5,
      lineHeight: 20,
    },
    upgradeBox: {
      marginTop: 6,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      gap: 4,
    },
    upgradeLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    upgradeText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 19,
    },
    modDetailRow: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 4,
    },
    modDetailTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    modDetailTag: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    modDetailDesc: {
      color: colors.textSecondary,
      fontSize: 12.5,
      lineHeight: 18,
    },
    diceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    diceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    diceBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    popupFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    popupDismissButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    popupDismissButtonText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    popupSelectButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
    popupSelectButtonActive: {
      backgroundColor: '#10B981',
    },
    popupSelectButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
