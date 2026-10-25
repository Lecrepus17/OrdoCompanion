import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import {
  CharacterAbility,
  CharacterAttributes,
  CharacterSheet,
  CompendiumEntity,
  ParanormalElement,
  TrainingDegree,
} from '../types/compendium';
import {
  calculateStatIncreases,
  getNexMilestone,
  getPeRoundLimit,
  getRitualDt,
  OFFICIAL_SKILLS_LIST,
} from '../utils/progression';

const RANK_ITEM_LIMITS = {
  Recruta: { cat1: 2, cat2: 0, cat3: 0, cat4: 0, credit: 'Baixo' as const },
  Operador: { cat1: 3, cat2: 1, cat3: 0, cat4: 0, credit: 'Médio' as const },
  'Agente Especial': { cat1: 3, cat2: 2, cat3: 1, cat4: 0, credit: 'Médio' as const },
  'Oficial de Operações': { cat1: 3, cat2: 3, cat3: 2, cat4: 1, credit: 'Alto' as const },
  'Agente de Elite': { cat1: 3, cat2: 3, cat3: 3, cat4: 2, credit: 'Ilimitado' as const },
};

interface LevelUpModalProps {
  visible: boolean;
  character: CharacterSheet | null;
  classEntity?: CompendiumEntity;
  trackEntity?: CompendiumEntity;
  allTracksList: CompendiumEntity[];
  allPowersList: CompendiumEntity[];
  allRitualsList: CompendiumEntity[];
  onClose: () => void;
  onApplyLevelUp: (updated: CharacterSheet) => Promise<void> | void;
}

export default function LevelUpModal({
  visible,
  character,
  classEntity,
  trackEntity,
  allTracksList,
  allPowersList,
  allRitualsList,
  onClose,
  onApplyLevelUp,
}: LevelUpModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  if (!character) return null;

  const currentNex = character.nex;
  const targetNex = Math.min(99, currentNex + 5);

  // Escolha de Atributo (+1)
  const [selectedAttrToBoost, setSelectedAttrToBoost] = useState<keyof CharacterAttributes | null>(
    null
  );

  // Atributos efetivos considerando o aumento de atributo selecionado
  const effectiveAttrs = useMemo(() => {
    const a = { ...character.attributes };
    if (selectedAttrToBoost) {
      a[selectedAttrToBoost] = Math.min(5, a[selectedAttrToBoost] + 1);
    }
    return a;
  }, [character.attributes, selectedAttrToBoost]);

  // Ganhos vitais calculados com base nos atributos do avanço
  const statIncreases = useMemo(() => {
    return calculateStatIncreases(classEntity?.name || 'Especialista', effectiveAttrs);
  }, [classEntity, effectiveAttrs]);

  // Ganhos retroativos de Vigor e Presença (Regra Oficial: +1 PV/PE por patamar de NEX anterior)
  const priorAdvances = Math.max(0, Math.floor(currentNex / 5));
  const retroactivePv = selectedAttrToBoost === 'VIG' ? priorAdvances : 0;
  const retroactivePe = selectedAttrToBoost === 'PRE' ? priorAdvances : 0;

  // Regras e marcos do NEX alvo
  const milestone = useMemo(() => {
    return getNexMilestone(
      classEntity?.name || 'Especialista',
      targetNex,
      trackEntity,
      effectiveAttrs
    );
  }, [classEntity, targetNex, trackEntity, effectiveAttrs]);

  // Estados de escolhas do usuário
  const [applyToCurrent, setApplyToCurrent] = useState(true);

  // Escolha de Trilha (se aplicável)
  const [selectedTrackId, setSelectedTrackId] = useState<string>(character.trackId || '');

  // Escolha de Poder (se aplicável)
  const [selectedPowerId, setSelectedPowerId] = useState<string | null>(null);
  const [powerSearch, setPowerSearch] = useState('');
  const [selectedSkillPromotions, setSelectedSkillPromotions] = useState<string[]>([]);

  // Escolha de Afinidade Elemental
  const [selectedAffinity, setSelectedAffinity] = useState<ParanormalElement>(
    character.affinity || 'Nenhum'
  );

  // Escolha de Novo Ritual (se ocultista)
  const [selectedRitualId, setSelectedRitualId] = useState<string | null>(null);
  const [ritualSearch, setRitualSearch] = useState('');

  // Sugestão de Patente
  const [promoteRank, setPromoteRank] = useState(
    !!milestone.recommendedRank && milestone.recommendedRank !== character.rank
  );

  // Trilhas compatíveis com a classe
  const compatibleTracks = useMemo(() => {
    const clsName = (classEntity?.name || '').toLowerCase();
    return allTracksList.filter((t) => {
      const tClass = (t.className || '').toLowerCase();
      const tSub = (t.subCategory || '').toLowerCase();
      const tName = t.name.toLowerCase();
      if (clsName.includes('combatente')) {
        return tClass.includes('combatente') || tSub.includes('combatente') || tName.includes('combatente');
      }
      if (clsName.includes('especialista')) {
        return tClass.includes('especialista') || tSub.includes('especialista') || tName.includes('especialista');
      }
      if (clsName.includes('ocultista')) {
        return tClass.includes('ocultista') || tSub.includes('ocultista') || tName.includes('ocultista');
      }
      return true;
    });
  }, [allTracksList, classEntity]);

  // Poderes compatíveis
  const compatiblePowers = useMemo(() => {
    const clsName = (classEntity?.name || '').toLowerCase();
    return allPowersList.filter((p) => {
      const sub = (p.subCategory || '').toLowerCase();
      if (clsName.includes('combatente') && sub.includes('combatente')) return true;
      if (clsName.includes('especialista') && sub.includes('especialista')) return true;
      if (clsName.includes('ocultista') && sub.includes('ocultista')) return true;
      if (sub.includes('paranormal') || sub.includes('geral')) return true;
      return false;
    });
  }, [allPowersList, classEntity]);

  // Rituais filtrados pelo círculo máximo
  const availableRituals = useMemo(() => {
    const maxCircle = milestone.maxRitualCircle || 1;
    return allRitualsList.filter((r) => (r.circle || 1) <= maxCircle);
  }, [allRitualsList, milestone.maxRitualCircle]);

  // Alternar perícia para promoção de grau
  const toggleSkillPromotion = (skillName: string) => {
    const maxQuota = milestone.skillTrainingQuota || 2;
    setSelectedSkillPromotions((prev) => {
      if (prev.includes(skillName)) return prev.filter((s) => s !== skillName);
      if (prev.length >= maxQuota) {
        return [...prev.slice(1), skillName];
      }
      return [...prev, skillName];
    });
  };

  // Confirmar e aplicar a evolução
  const handleConfirmLevelUp = async () => {
    const updatedAttrs = { ...character.attributes };
    if (selectedAttrToBoost) {
      updatedAttrs[selectedAttrToBoost] = Math.min(5, updatedAttrs[selectedAttrToBoost] + 1);
    }

    const newPeRound = getPeRoundLimit(targetNex);
    const newDt = getRitualDt(targetNex, updatedAttrs.PRE);

    const pvDelta = statIncreases.pvGain + retroactivePv;
    const peDelta = statIncreases.peGain + retroactivePe;
    const sanDelta = statIncreases.sanGain;

    const nextPvMax = character.pvMax + pvDelta;
    const nextPeMax = character.peMax + peDelta;
    const nextSanMax = character.sanMax + sanDelta;

    const nextPvCurrent = applyToCurrent
      ? Math.min(nextPvMax, character.pvCurrent + pvDelta)
      : character.pvCurrent;
    const nextPeCurrent = applyToCurrent
      ? Math.min(nextPeMax, character.peCurrent + peDelta)
      : character.peCurrent;
    const nextSanCurrent = applyToCurrent
      ? Math.min(nextSanMax, character.sanCurrent + sanDelta)
      : character.sanCurrent;

    // Perícias atualizadas
    const updatedSkills = { ...character.skills };
    const targetDegree = milestone.skillTrainingTargetDegree || 10;
    selectedSkillPromotions.forEach((skName) => {
      const existing = updatedSkills[skName] || { degree: 0, bonus: 0 };
      updatedSkills[skName] = {
        ...existing,
        degree: targetDegree as TrainingDegree,
      };
    });

    // Entidades vinculadas do compêndio
    const nextEntityIds = [...character.entityIds];
    if (selectedPowerId && !nextEntityIds.includes(selectedPowerId)) {
      nextEntityIds.push(selectedPowerId);
    }
    if (selectedRitualId && !nextEntityIds.includes(selectedRitualId)) {
      nextEntityIds.push(selectedRitualId);
    }

    // Habilidades
    const nextAbilities: CharacterAbility[] = [...(character.abilities || [])];

    // Habilidade de trilha automática
    if (milestone.trackAbility) {
      nextAbilities.push({
        id: `ab_track_${targetNex}_${Date.now()}`,
        name: `${milestone.trackAbility.title} (NEX ${targetNex}%)`,
        cost: 'Passiva',
        originPage: trackEntity?.name || 'Trilha',
        description: milestone.trackAbility.description,
        type: 'habilidade',
      });
    }

    // Melhoria de habilidade de classe
    if (milestone.classAbilityUpgrade) {
      nextAbilities.push({
        id: `ab_upgrade_${targetNex}_${Date.now()}`,
        name: `${milestone.classAbilityUpgrade} (NEX ${targetNex}%)`,
        cost: 'Passiva',
        originPage: classEntity?.name || 'Classe',
        description: milestone.description,
        type: 'habilidade',
      });
    }

    // Patente
    let nextRank = character.rank;
    let nextItemLimits = character.itemLimits;
    let nextCreditLimit = character.creditLimit;

    if (promoteRank && milestone.recommendedRank) {
      nextRank = milestone.recommendedRank;
      const limits = RANK_ITEM_LIMITS[milestone.recommendedRank];
      nextCreditLimit = limits.credit;
      nextItemLimits = {
        cat1: limits.cat1,
        cat2: limits.cat2,
        cat3: limits.cat3,
        cat4: limits.cat4,
      };
    }

    const updatedSheet: CharacterSheet = {
      ...character,
      nex: targetNex,
      peRound: newPeRound,
      dtRituals: newDt,
      attributes: updatedAttrs,
      pvMax: nextPvMax,
      pvCurrent: nextPvCurrent,
      peMax: nextPeMax,
      peCurrent: nextPeCurrent,
      sanMax: nextSanMax,
      sanCurrent: nextSanCurrent,
      skills: updatedSkills,
      entityIds: nextEntityIds,
      abilities: nextAbilities,
      trackId: selectedTrackId || character.trackId,
      affinity: selectedAffinity,
      rank: nextRank,
      creditLimit: nextCreditLimit,
      itemLimits: nextItemLimits,
      updatedAt: new Date().toISOString(),
    };

    await onApplyLevelUp(updatedSheet);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 14 : 10) }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Fechar">
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Avanço de NEX Assistido</Text>
            <Text style={styles.headerSubtitle}>
              {character.name} • NEX {currentNex}% ➔ {targetNex}%
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* BANNER DE TRANSIÇÃO DE NÍVEL */}
          <View style={styles.levelBanner}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{currentNex}%</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.levelBadgeText, { color: '#FFF' }]}>{targetNex}%</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.milestoneHeading}>{milestone.title}</Text>
              <Text style={styles.milestoneDesc}>{milestone.description}</Text>
            </View>
          </View>

          {/* 1. STATUS VITAIS CALCULADOS */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="heart-outline" size={20} color="#EF4444" />
              <Text style={styles.sectionTitle}>1. Ganhos de Status Vitais</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Incrementos calculados automaticamente com base na classe ({classEntity?.name || 'Especialista'}) e seus atributos.
            </Text>

            <View style={styles.statGainsGrid}>
              <View style={[styles.statGainCard, { borderColor: '#EF4444' }]}>
                <Text style={[styles.statGainLabel, { color: '#EF4444' }]}>Pontos de Vida</Text>
                <Text style={styles.statGainVal}>+{statIncreases.pvGain + retroactivePv} PV</Text>
                <Text style={styles.statGainFormula}>
                  +{statIncreases.basePv} base + {effectiveAttrs.VIG} Vigor{retroactivePv > 0 ? ` (+${retroactivePv} retroativo)` : ''}
                </Text>
              </View>

              <View style={[styles.statGainCard, { borderColor: '#F59E0B' }]}>
                <Text style={[styles.statGainLabel, { color: '#F59E0B' }]}>Pontos de Esforço</Text>
                <Text style={styles.statGainVal}>+{statIncreases.peGain + retroactivePe} PE</Text>
                <Text style={styles.statGainFormula}>
                  +{statIncreases.basePe} base + {effectiveAttrs.PRE} Presença{retroactivePe > 0 ? ` (+${retroactivePe} retroativo)` : ''}
                </Text>
              </View>

              <View style={[styles.statGainCard, { borderColor: '#38BDF8' }]}>
                <Text style={[styles.statGainLabel, { color: '#38BDF8' }]}>Sanidade</Text>
                <Text style={styles.statGainVal}>+{statIncreases.sanGain} SAN</Text>
                <Text style={styles.statGainFormula}>+{statIncreases.baseSan} base</Text>
              </View>
            </View>

            {/* Limites de combate */}
            <View style={styles.combatLimitsRow}>
              <View style={styles.combatLimitItem}>
                <Text style={styles.combatLimitLabel}>Limite de PE / Rodada:</Text>
                <Text style={styles.combatLimitVal}>
                  {character.peRound || 1} ➔ {getPeRoundLimit(targetNex)}
                </Text>
              </View>
              <View style={styles.combatLimitItem}>
                <Text style={styles.combatLimitLabel}>DT de Rituais:</Text>
                <Text style={styles.combatLimitVal}>
                  {character.dtRituals || 13} ➔ {getRitualDt(targetNex, character.attributes.PRE)}
                </Text>
              </View>
            </View>

            {/* Checkbox: Somar aos atuais */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setApplyToCurrent(!applyToCurrent)}
            >
              <Ionicons
                name={applyToCurrent ? 'checkbox' : 'square-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.checkboxText}>
                Somar os pontos ganhos também aos valores atuais de PV, PE e Sanidade
              </Text>
            </TouchableOpacity>
          </View>

          {/* 2. ESCOLHA DE TRILHA (NEX 10%) */}
          {milestone.needsTrackChoice && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="git-branch-outline" size={20} color={colors.accent} />
                <Text style={styles.sectionTitle}>2. Escolha sua Trilha de Classe</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                No NEX 10%, todo agente escolhe uma trilha que define sua especialização em campo.
              </Text>

              <View style={{ gap: 8, marginTop: 10 }}>
                {compatibleTracks.map((trk) => {
                  const isSel = trk.id === selectedTrackId;
                  return (
                    <TouchableOpacity
                      key={trk.id}
                      style={[styles.choiceCard, isSel && styles.choiceCardActive]}
                      onPress={() => setSelectedTrackId(trk.id)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.choiceCardTitle, isSel && { color: colors.primary }]}>
                          {trk.name}
                        </Text>
                        {isSel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </View>
                      <Text style={styles.choiceCardDesc}>{trk.summary}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 3. PODER DE CLASSE OU PARANORMAL (NEX 15, 30, 45, 60, 75, 90%) */}
          {milestone.needsClassPower && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="flash-outline" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Escolha 1 Poder de Classe ou Paranormal</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Selecione um poder do compêndio para adicionar à sua lista de habilidades.
              </Text>

              <TextInput
                style={styles.searchInput}
                value={powerSearch}
                onChangeText={setPowerSearch}
                placeholder="Pesquisar poderes..."
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ gap: 8, marginTop: 8 }}>
                {compatiblePowers
                  .filter(
                    (p) =>
                      !powerSearch.trim() ||
                      p.name.toLowerCase().includes(powerSearch.toLowerCase()) ||
                      (p.summary || '').toLowerCase().includes(powerSearch.toLowerCase())
                  )
                  .slice(0, 15)
                  .map((pow) => {
                    const isSel = pow.id === selectedPowerId;
                    return (
                      <TouchableOpacity
                        key={pow.id}
                        style={[styles.choiceCard, isSel && styles.choiceCardActive]}
                        onPress={() => setSelectedPowerId(pow.id)}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.choiceCardTitle, isSel && { color: colors.primary }]}>
                            {pow.name}
                          </Text>
                          <Text style={[styles.badgeText, { color: colors.accent }]}>
                            {pow.subCategory}
                          </Text>
                        </View>
                        <Text style={styles.choiceCardDesc}>{pow.summary}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}

          {/* 4. AUMENTO DE ATRIBUTO (+1) (NEX 20, 50, 80%) */}
          {milestone.needsAttributeIncrease && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Aumento de Atributo (+1)</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Escolha um atributo para aumentar em +1 (limite máximo de 5).
              </Text>

              <View style={styles.attrBoostGrid}>
                {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => {
                  const current = character.attributes[attr];
                  const isSel = selectedAttrToBoost === attr;
                  const isMaxed = current >= 5;

                  return (
                    <TouchableOpacity
                      key={attr}
                      style={[
                        styles.attrBoostCard,
                        isSel && styles.attrBoostCardActive,
                        isMaxed && { opacity: 0.5 },
                      ]}
                      onPress={() => !isMaxed && setSelectedAttrToBoost(attr)}
                      disabled={isMaxed}
                    >
                      <Text style={[styles.attrBoostCode, isSel && { color: colors.primary }]}>
                        {attr}
                      </Text>
                      <Text style={styles.attrBoostVal}>
                        {current} {isSel ? `➔ ${current + 1}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 5. GRAU DE TREINAMENTO (VETERANO +10 OU EXPERT +15) */}
          {milestone.needsSkillTrainingIncrease && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="ribbon-outline" size={20} color={colors.accent} />
                <Text style={styles.sectionTitle}>
                  Grau de Treinamento: {milestone.skillTrainingTargetDegree === 15 ? 'Expert (+15)' : 'Veterano (+10)'}
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Promova até {milestone.skillTrainingQuota || 2} perícias treinadas para o próximo grau.
                ({selectedSkillPromotions.length} / {milestone.skillTrainingQuota || 2} selecionadas)
              </Text>

              <View style={styles.skillsGrid}>
                {OFFICIAL_SKILLS_LIST.map((sk) => {
                  const currentDeg = character.skills[sk.name]?.degree || 0;
                  const isSel = selectedSkillPromotions.includes(sk.name);

                  return (
                    <TouchableOpacity
                      key={sk.name}
                      style={[styles.skillItem, isSel && styles.skillItemActive]}
                      onPress={() => toggleSkillPromotion(sk.name)}
                    >
                      <Ionicons
                        name={isSel ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={isSel ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.skillItemName, isSel && { color: colors.primary, fontWeight: '700' }]}>
                        {sk.name} (+{currentDeg} ➔ +{milestone.skillTrainingTargetDegree})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 6. AFINIDADE PARANORMAL (NEX 50%) */}
          {milestone.needsAffinityChoice && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bonfire-outline" size={20} color="#EF4444" />
                <Text style={styles.sectionTitle}>Escolha sua Afinidade Paranormal</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Ao atingir NEX 50%, sua mente e corpo se sintonizam com uma das entidades do Outro Lado.
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(['Sangue', 'Morte', 'Conhecimento', 'Energia'] as ParanormalElement[]).map((el) => {
                  const isSel = selectedAffinity === el;
                  return (
                    <TouchableOpacity
                      key={el}
                      style={[styles.affinityPill, isSel && styles.affinityPillActive]}
                      onPress={() => setSelectedAffinity(el)}
                    >
                      <Text style={[styles.affinityPillText, isSel && styles.affinityPillTextActive]}>
                        {el}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* 7. NOVO RITUAL (OCULTISTA 25%, 55%, 85%) */}
          {milestone.needsRitualChoice && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  Aprender Novo Ritual (Até {milestone.maxRitualCircle}º Círculo)
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Selecione um novo ritual do compêndio para adicionar à sua ficha.
              </Text>

              <TextInput
                style={styles.searchInput}
                value={ritualSearch}
                onChangeText={setRitualSearch}
                placeholder="Pesquisar rituais..."
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ gap: 8, marginTop: 8 }}>
                {availableRituals
                  .filter(
                    (r) =>
                      !ritualSearch.trim() ||
                      r.name.toLowerCase().includes(ritualSearch.toLowerCase()) ||
                      (r.element || '').toLowerCase().includes(ritualSearch.toLowerCase())
                  )
                  .slice(0, 15)
                  .map((rit) => {
                    const isSel = rit.id === selectedRitualId;
                    return (
                      <TouchableOpacity
                        key={rit.id}
                        style={[styles.choiceCard, isSel && styles.choiceCardActive]}
                        onPress={() => setSelectedRitualId(rit.id)}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.choiceCardTitle, isSel && { color: colors.primary }]}>
                            {rit.name}
                          </Text>
                          <Text style={[styles.badgeText, { color: colors.accent }]}>
                            {rit.element} • {rit.circle}º Círculo
                          </Text>
                        </View>
                        <Text style={styles.choiceCardDesc}>{rit.summary}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          )}

          {/* 8. SUGESTÃO DE PATENTE */}
          {milestone.recommendedRank && milestone.recommendedRank !== character.rank && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="medal-outline" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Promoção de Patente Recomendada</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Ao alcançar NEX {targetNex}%, a Ordo Realitas promove o agente para a patente de{' '}
                <Text style={{ fontWeight: '800', color: colors.text }}>
                  {milestone.recommendedRank}
                </Text>
                , aumentando os limites de itens e categorias no inventário.
              </Text>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPromoteRank(!promoteRank)}
              >
                <Ionicons
                  name={promoteRank ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.checkboxText}>
                  Promover patente para {milestone.recommendedRank} e atualizar limites
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLevelUp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-up-circle" size={20} color="#FFF" />
            <Text style={styles.confirmBtnText}>Confirmar Evolução ({targetNex}%)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 48 : 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    closeBtn: {
      padding: 6,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
      gap: 14,
    },
    levelBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    levelBadge: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    levelBadgeText: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.text,
    },
    milestoneHeading: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    milestoneDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 10,
    },
    statGainsGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    statGainCard: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
    },
    statGainLabel: {
      fontSize: 10,
      fontWeight: '700',
    },
    statGainVal: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.text,
      marginTop: 2,
    },
    statGainFormula: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 2,
      textAlign: 'center',
    },
    combatLimitsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
    },
    combatLimitItem: {
      flex: 1,
    },
    combatLimitLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    combatLimitVal: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    checkboxText: {
      fontSize: 12,
      color: colors.text,
      flex: 1,
    },
    choiceCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    choiceCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
    },
    choiceCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    choiceCardDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    badgeText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    searchInput: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    attrBoostGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    attrBoostCard: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    attrBoostCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
    },
    attrBoostCode: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    attrBoostVal: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
      marginTop: 2,
    },
    skillsGrid: {
      gap: 6,
      marginTop: 6,
    },
    skillItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 8,
      borderRadius: 6,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    skillItemActive: {
      borderColor: colors.primary,
    },
    skillItemName: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    affinityPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    affinityPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    affinityPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    affinityPillTextActive: {
      color: '#FFF',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    cancelBtnText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
    },
    confirmBtnText: {
      fontSize: 14,
      color: '#FFF',
      fontWeight: '800',
    },
  });
