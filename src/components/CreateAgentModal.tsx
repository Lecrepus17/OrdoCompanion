import React, { useEffect, useMemo, useState } from 'react';
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
  CharacterSkillEntry,
  CompendiumEntity,
  UserProfile,
} from '../types/compendium';
import {
  getClassSkillRules,
  getOriginSkillsInfo,
  getPeRoundLimit,
  getRitualDt,
  OFFICIAL_SKILLS_LIST,
} from '../utils/progression';
import { useApp } from '../context/AppContext';
import { DEFAULT_LONG_PRESS_DELAY } from '../types/recordPreview';

interface CreateAgentModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: (sheet: CharacterSheet) => Promise<void> | void;
  userProfile?: UserProfile;
  originsList: CompendiumEntity[];
  classesList: CompendiumEntity[];
  ritualsList: CompendiumEntity[];
}

export default function CreateAgentModal({
  visible,
  onClose,
  onFinish,
  userProfile,
  originsList,
  classesList,
  ritualsList,
}: CreateAgentModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const { openEntityPreview, openSkillPreview } = useApp();

  // Etapa atual: 1..6
  const [step, setStep] = useState<number>(1);

  // Etapa 1: Identidade
  const [name, setName] = useState('Novo Agente');
  const [player, setPlayer] = useState(userProfile?.playerName || '');

  // Etapa 2: Origem
  const [originSearch, setOriginSearch] = useState('');
  const [selectedOriginId, setSelectedOriginId] = useState<string>(originsList[0]?.id || '');

  // Etapa 3: Classe
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    if (userProfile?.preferredClass) {
      const match = classesList.find((c) =>
        c.name.toLowerCase().includes(userProfile.preferredClass!.toLowerCase())
      );
      if (match) return match.id;
    }
    return classesList[0]?.id || '';
  });

  // Etapa 4: Atributos
  const [freeMode, setFreeMode] = useState(false);
  const [attrs, setAttrs] = useState<CharacterAttributes>({
    AGI: 1,
    FOR: 1,
    INT: 1,
    PRE: 1,
    VIG: 1,
  });

  // Etapa 5: Perícias selecionadas
  const [choiceGroupSelections, setChoiceGroupSelections] = useState<Record<number, string>>({});
  const [freeSkillSelections, setFreeSkillSelections] = useState<string[]>([]);

  // Etapa 6: Especialidades / Rituais iniciais
  const [peritoSkills, setPeritoSkills] = useState<string[]>([]);
  const [selectedRitualIds, setSelectedRitualIds] = useState<string[]>([]);
  const [ritualSearch, setRitualSearch] = useState('');

  // Resetar formulário ao abrir o modal
  useEffect(() => {
    if (visible) {
      setStep(1);
      setName('Novo Agente');
      setPlayer(userProfile?.playerName || '');
      setOriginSearch('');
      setSelectedOriginId(originsList[0]?.id || '');
      if (userProfile?.preferredClass) {
        const match = classesList.find((c) =>
          c.name.toLowerCase().includes(userProfile.preferredClass!.toLowerCase())
        );
        setSelectedClassId(match ? match.id : classesList[0]?.id || '');
      } else {
        setSelectedClassId(classesList[0]?.id || '');
      }
      setFreeMode(false);
      setAttrs({
        AGI: 1,
        FOR: 1,
        INT: 1,
        PRE: 1,
        VIG: 1,
      });
      setChoiceGroupSelections({});
      setFreeSkillSelections([]);
      setPeritoSkills([]);
      setSelectedRitualIds([]);
      setRitualSearch('');
    }
  }, [visible]);

  // Entidades selecionadas
  const selectedOrigin = useMemo(
    () => originsList.find((o) => o.id === selectedOriginId) || originsList[0],
    [originsList, selectedOriginId]
  );
  const selectedClass = useMemo(
    () => classesList.find((c) => c.id === selectedClassId) || classesList[0],
    [classesList, selectedClassId]
  );

  // Verifica se a classe selecionada é o Sobrevivente de Sobrevivendo ao Horror
  const isSobrevivente = useMemo(
    () => (selectedClass?.name || '').toLowerCase().includes('sobrevivente'),
    [selectedClass]
  );

  // Lista de origens ordenadas alfabeticamente para navegação ágil
  const sortedOrigins = useMemo(() => {
    return [...originsList].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [originsList]);

  // Origens filtradas por busca abrangente (nome, resumo, perícias, poder, descrição, livro)
  const filteredOrigins = useMemo(() => {
    const q = originSearch.trim().toLowerCase();
    if (!q) return sortedOrigins;
    return sortedOrigins.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.summary || '').toLowerCase().includes(q) ||
        (o.trainedSkills || '').toLowerCase().includes(q) ||
        (o.powerName || '').toLowerCase().includes(q) ||
        (o.powerDescription || '').toLowerCase().includes(q) ||
        (o.bookTitle || '').toLowerCase().includes(q)
    );
  }, [sortedOrigins, originSearch]);

  // Regras de perícia da classe
  const skillRules = useMemo(
    () => getClassSkillRules(selectedClass?.name || 'Especialista', attrs.INT),
    [selectedClass, attrs.INT]
  );

  // Perícias concedidas pela origem (busca segura apenas no campo trainedSkills)
  const { originGrantedSkills, extraOriginChoices } = useMemo(() => {
    return getOriginSkillsInfo(selectedOrigin?.trainedSkills);
  }, [selectedOrigin]);

  // Perícias obrigatórias da classe (excluindo as que já foram concedidas pela origem)
  const effectiveMandatorySkills = useMemo(() => {
    return skillRules.mandatorySkills.filter(
      (sk) => !originGrantedSkills.includes(sk)
    );
  }, [skillRules.mandatorySkills, originGrantedSkills]);

  // Cota total de escolhas livres de perícias
  const totalFreeChoicesCount = useMemo(() => {
    let count = skillRules.freeChoicesCount + extraOriginChoices;

    // Se uma perícia obrigatória da classe já foi concedida pela origem, converte em escolha livre
    const duplicateMandatoryCount = skillRules.mandatorySkills.filter((sk) =>
      originGrantedSkills.includes(sk)
    ).length;
    count += duplicateMandatoryCount;

    // Se um grupo de escolha tem todas as opções já concedidas pela origem, ou o usuário escolheu '+1 Perícia Livre'
    skillRules.choiceGroups.forEach((grp, idx) => {
      if (grp.options.every((opt) => originGrantedSkills.includes(opt))) {
        count += 1;
      } else if (choiceGroupSelections[idx] === '__free_choice__') {
        count += 1;
      }
    });

    return count;
  }, [skillRules, extraOriginChoices, originGrantedSkills, choiceGroupSelections]);

  // Verifica se todos os grupos obrigatórios da classe foram selecionados
  const areAllChoiceGroupsSelected = useMemo(() => {
    for (let i = 0; i < skillRules.choiceGroups.length; i++) {
      const grp = skillRules.choiceGroups[i];
      const allInOrigin = grp.options.every((opt) => originGrantedSkills.includes(opt));
      if (!allInOrigin && !choiceGroupSelections[i]) {
        return false;
      }
    }
    return true;
  }, [skillRules.choiceGroups, originGrantedSkills, choiceGroupSelections]);

  // Validação estrita da Etapa 5: quantidade deve ser EXATAMENTE a mesma exigida (nem mais, nem menos)
  const isStep5Valid = useMemo(() => {
    return (
      freeSkillSelections.length === totalFreeChoicesCount &&
      areAllChoiceGroupsSelected
    );
  }, [freeSkillSelections.length, totalFreeChoicesCount, areAllChoiceGroupsSelected]);

  // Lista com todas as perícias treinadas do personagem
  const allTrainedSkillsList = useMemo(() => {
    const list: string[] = [];
    const add = (sk: string) => {
      if (sk && sk !== '__free_choice__' && !list.includes(sk)) {
        list.push(sk);
      }
    };
    originGrantedSkills.forEach(add);
    effectiveMandatorySkills.forEach(add);
    Object.values(choiceGroupSelections).forEach(add);
    freeSkillSelections.forEach(add);
    return list;
  }, [originGrantedSkills, effectiveMandatorySkills, choiceGroupSelections, freeSkillSelections]);

  // Perícias candidatas para a habilidade Perito (Especialista)
  const peritoCandidates = useMemo(() => {
    const trained = allTrainedSkillsList.filter((sk) => sk !== 'Luta' && sk !== 'Pontaria');
    if (trained.length > 0) return trained;
    return OFFICIAL_SKILLS_LIST.filter(
      (sk) => sk.name !== 'Luta' && sk.name !== 'Pontaria'
    ).map((sk) => sk.name);
  }, [allTrainedSkillsList]);

  // Reseta escolhas quando classe ou origem mudam
  useEffect(() => {
    setChoiceGroupSelections({});
    setFreeSkillSelections([]);
    setPeritoSkills([]);
    setSelectedRitualIds([]);
  }, [selectedClassId]);

  useEffect(() => {
    setChoiceGroupSelections({});
    setFreeSkillSelections([]);
  }, [selectedOriginId]);

  // Se o intelecto diminuir e a cota livre reduzir, trunca a seleção para a cota máxima
  useEffect(() => {
    setFreeSkillSelections((prev) => {
      if (prev.length > totalFreeChoicesCount) {
        return prev.slice(0, totalFreeChoicesCount);
      }
      return prev;
    });
  }, [totalFreeChoicesCount]);

  useEffect(() => {
    setPeritoSkills((prev) => prev.filter((sk) => peritoCandidates.includes(sk)));
  }, [peritoCandidates]);

  // Rituais de 1º Círculo disponíveis
  const circle1Rituals = useMemo(() => {
    return ritualsList.filter((r) => r.circle === 1);
  }, [ritualsList]);

  // Pontos de atributo gastos (iniciando de 1 em cada)
  // Regra Oficial de Ordem Paranormal:
  // - Combatente, Especialista e Ocultista (NEX 5%): Começam com 1 em todos os 5 atributos e 4 pontos para distribuir (máx 3).
  // - Sobrevivente (NEX 0% / Estágio 1): Começa com 1 em todos os atributos e recebe 3 pontos para distribuir (máx 3).
  // - O jogador pode reduzir UM atributo para 0 para receber 1 ponto extra para gastar (no máx 1 atributo zerado).
  const basePoints = isSobrevivente ? 3 : 4;
  const pointsSpent = useMemo(() => {
    return (
      attrs.AGI - 1 + (attrs.FOR - 1) + (attrs.INT - 1) + (attrs.PRE - 1) + (attrs.VIG - 1)
    );
  }, [attrs]);
  const pointsRemaining = basePoints - pointsSpent;
  const hasZeroAttr = useMemo(() => Object.values(attrs).some((v) => v === 0), [attrs]);
  const totalPoints = basePoints + (hasZeroAttr ? 1 : 0);

  // Validações por etapa
  const isStep4Valid = freeMode || pointsRemaining === 0;
  const isStep6Valid = useMemo(() => {
    const cname = (selectedClass?.name || '').toLowerCase();
    if (cname.includes('ocultista')) {
      return selectedRitualIds.length === 3;
    }
    if (cname.includes('especialista')) {
      return peritoSkills.length === 2;
    }
    return true;
  }, [selectedClass, selectedRitualIds.length, peritoSkills.length]);

  const canAdvance = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return !!selectedOriginId;
      case 3:
        return !!selectedClassId;
      case 4:
        return isStep4Valid;
      case 5:
        return isStep5Valid;
      case 6:
        return isStep6Valid;
      default:
        return true;
    }
  };

  // Cálculos de Status Vitais Iniciais (5% NEX)
  const stats = useMemo(() => {
    const clsName = (selectedClass?.name || '').toLowerCase();
    let pv = 16 + attrs.VIG;
    let pe = 3 + attrs.PRE;
    let san = 16;

    if (clsName.includes('combatente')) {
      pv = 20 + attrs.VIG;
      pe = 2 + attrs.PRE;
      san = 12;
    } else if (clsName.includes('ocultista')) {
      pv = 12 + attrs.VIG;
      pe = 4 + attrs.PRE;
      san = 20;
    } else if (clsName.includes('sobrevivente')) {
      pv = 8 + attrs.VIG;
      pe = 2 + attrs.PRE;
      san = 8;
    }

    return {
      pv: Math.max(1, pv),
      pe: Math.max(1, pe),
      san: Math.max(1, san),
      peRound: getPeRoundLimit(5),
      dtRitual: getRitualDt(5, attrs.PRE),
      defense: 10 + attrs.AGI,
    };
  }, [selectedClass, attrs]);

  // Atualizar atributo
  const handleAttrChange = (key: keyof CharacterAttributes, delta: number) => {
    const current = attrs[key];
    const next = current + delta;
    if (next < 0) return;
    if (!freeMode) {
      if (delta > 0 && pointsRemaining <= 0) return;
      if (next > 3) return; // Limite oficial em NEX 5%
      // Regra oficial: máximo de 1 atributo zerado
      if (next === 0) {
        const otherZeros = Object.entries(attrs).filter(
          ([k, v]) => k !== key && v === 0
        ).length;
        if (otherZeros > 0) return;
      }
    }
    setAttrs((prev) => ({ ...prev, [key]: next }));
  };

  // Selecionar grupo de perícia da classe
  const handleSelectChoiceGroup = (groupIdx: number, skillName: string) => {
    setChoiceGroupSelections((prev) => ({
      ...prev,
      [groupIdx]: skillName,
    }));
    if (skillName !== '__free_choice__') {
      setFreeSkillSelections((prev) => prev.filter((sk) => sk !== skillName));
    }
  };

  // Alternar perícia livre (bloqueia quando atinge o limite máximo)
  const toggleFreeSkill = (skillName: string) => {
    setFreeSkillSelections((prev) => {
      if (prev.includes(skillName)) {
        return prev.filter((s) => s !== skillName);
      }
      if (prev.length >= totalFreeChoicesCount) {
        // Cota máxima já atingida: não permite adicionar mais perícias!
        return prev;
      }
      return [...prev, skillName];
    });
  };

  // Alternar ritual inicial (para ocultista)
  const toggleRitual = (ritualId: string) => {
    setSelectedRitualIds((prev) => {
      if (prev.includes(ritualId)) {
        return prev.filter((id) => id !== ritualId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), ritualId];
      }
      return [...prev, ritualId];
    });
  };

  // Alternar perícia de perito (para especialista)
  const togglePeritoSkill = (sk: string) => {
    setPeritoSkills((prev) => {
      if (prev.includes(sk)) return prev.filter((s) => s !== sk);
      if (prev.length >= 2) return [prev[1], sk];
      return [...prev, sk];
    });
  };

  // Finalizar e gerar a ficha completa
  const handleComplete = async () => {
    const skillsRecord: Record<string, CharacterSkillEntry> = {};

    // 1. Marca as perícias da origem
    originGrantedSkills.forEach((sk) => {
      skillsRecord[sk] = { degree: 5, bonus: 0 };
    });

    // 2. Marca as perícias obrigatórias da classe
    effectiveMandatorySkills.forEach((sk) => {
      skillsRecord[sk] = { degree: 5, bonus: 0 };
    });

    // 3. Marca as perícias dos grupos de escolha da classe
    Object.values(choiceGroupSelections).forEach((sk) => {
      if (sk && sk !== '__free_choice__') {
        skillsRecord[sk] = { degree: 5, bonus: 0 };
      }
    });

    // 4. Marca as perícias livres selecionadas pelo usuário
    freeSkillSelections.forEach((sk) => {
      skillsRecord[sk] = { degree: 5, bonus: 0 };
    });

    // Habilidades automáticas de criação
    const abilities: CharacterAbility[] = [];
    const entityIds: string[] = [];

    // Poder da Origem (respeitando livro e descrição oficiais do compêndio)
    if (selectedOrigin) {
      const descLower = (selectedOrigin.powerDescription || '').toLowerCase();
      const originCost = descLower.includes('gastar 2 pe')
        ? '2 PE'
        : descLower.includes('gastar 1 pe')
        ? '1 PE'
        : 'Passiva';
      const originRef = `${selectedOrigin.bookTitle || 'Livro Base'}${
        selectedOrigin.pageNumber ? ` p. ${selectedOrigin.pageNumber}` : ''
      }`;

      abilities.push({
        id: `ab_origem_${Date.now()}`,
        name: selectedOrigin.powerName || `Poder de ${selectedOrigin.name}`,
        cost: originCost,
        originPage: originRef,
        description:
          selectedOrigin.powerDescription ||
          selectedOrigin.summary ||
          'Habilidade especial concedida pela Origem do agente.',
        type: 'poder',
      });
    }

    const clsName = (selectedClass?.name || '').toLowerCase();
    const classBookPage = `${selectedClass?.bookTitle || 'Livro Base'}${
      selectedClass?.pageNumber ? ` p. ${selectedClass.pageNumber}` : ''
    }`;

    if (clsName.includes('combatente')) {
      abilities.push({
        id: `ab_cls_${Date.now()}`,
        name: 'Ataque Especial (NEX 5%)',
        cost: '2 PE',
        originPage: classBookPage || 'Livro Base p. 26',
        description:
          'Quando faz um ataque, você pode gastar 2 PE para receber +5 no teste de ataque ou na rolagem de dano.',
        type: 'habilidade',
      });
    } else if (clsName.includes('especialista')) {
      abilities.push({
        id: `ab_cls_1_${Date.now()}`,
        name: 'Eclético (NEX 5%)',
        cost: '2 PE',
        originPage: classBookPage || 'Livro Base p. 30',
        description:
          'Quando faz um teste de uma perícia, você pode gastar 2 PE para receber os benefícios de ser treinado nesta perícia.',
        type: 'habilidade',
      });
      abilities.push({
        id: `ab_cls_2_${Date.now()}`,
        name: `Perito: ${peritoSkills.join(', ') || 'Duas perícias'} (NEX 5%)`,
        cost: '2 PE',
        originPage: classBookPage || 'Livro Base p. 30',
        description: `Escolha duas perícias treinadas (${peritoSkills.join(', ') || 'à escolha'}). Ao fazer um teste de uma delas, você pode gastar 2 PE para somar +1d6 no resultado.`,
        type: 'habilidade',
      });
    } else if (clsName.includes('ocultista')) {
      abilities.push({
        id: `ab_cls_${Date.now()}`,
        name: 'Escolhido pelo Outro Lado (NEX 5%)',
        cost: 'Passiva',
        originPage: classBookPage || 'Livro Base p. 34',
        description:
          'Você começa com 3 rituais de 1º círculo e aprende um novo ritual a cada avanço de NEX.',
        type: 'habilidade',
      });
      // Adiciona os rituais selecionados
      selectedRitualIds.forEach((rid) => {
        if (!entityIds.includes(rid)) entityIds.push(rid);
      });
    } else if (clsName.includes('sobrevivente')) {
      abilities.push({
        id: `ab_cls_${Date.now()}`,
        name: 'Empenho (1º Estágio)',
        cost: '1 PE',
        originPage: classBookPage || 'Sobrevivendo ao Horror p. 31',
        description:
          'Quando faz um teste de perícia, você pode gastar 1 PE para receber +2 nesse teste.',
        type: 'habilidade',
      });
    }

    const newSheet: CharacterSheet = {
      id: `char_${Date.now()}`,
      name: name.trim() || 'Novo Agente',
      player: player.trim(),
      nex: isSobrevivente ? 0 : 5,
      displacement: '9m',
      peRound: isSobrevivente ? 1 : stats.peRound,
      dtRituals: stats.dtRitual,
      rank: 'Recruta',
      prestige: 0,
      creditLimit: 'Baixo',
      maxLoadBonus: 0,
      itemLimits: isSobrevivente
        ? { cat1: 1, cat2: 0, cat3: 0, cat4: 0 }
        : { cat1: 2, cat2: 0, cat3: 0, cat4: 0 },
      originId: selectedOrigin?.id || '',
      classId: selectedClass?.id || '',
      trackId: '',
      affinity: 'Nenhum',
      attributes: attrs,
      pvCurrent: stats.pv,
      pvMax: stats.pv,
      peCurrent: stats.pe,
      peMax: stats.pe,
      sanCurrent: stats.san,
      sanMax: stats.san,
      defenseBonus: 0,
      defenseEquip: 0,
      defenseOther: 0,
      protection: '',
      resistances: '',
      skills: skillsRecord,
      attacks: [],
      abilities,
      inventory: [],
      appearance: '',
      personality: '',
      history: '',
      objective: '',
      entityIds,
      notes: '',
      transcendEvery5Nex: false,
      updatedAt: new Date().toISOString(),
    };

    onClose();
    await onFinish(newSheet);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 14 : 10) }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Fechar">
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Criação Assistida de Agente</Text>
            <Text style={styles.headerSubtitle}>
              Etapa {step} de 6 • {getStepTitle(step)}
            </Text>
          </View>
        </View>

        {/* Step Progress Bar */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <View
              key={st}
              style={[
                styles.progressSegment,
                st <= step && { backgroundColor: colors.primary },
                st === step && { height: 4 },
              ]}
            />
          ))}
        </View>

        {/* Step Content */}
        <ScrollView contentContainerStyle={styles.bodyScroll}>
          {/* ======================================================== */}
          {/* ETAPA 1: IDENTIDADE                                      */}
          {/* ======================================================== */}
          {step === 1 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeadingRow}>
                <Ionicons name="person-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Identidade do Agente</Text>
                  <Text style={styles.stepDesc}>
                    Defina o nome do seu agente da Ordo Realitas e o nome do jogador.
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Nome do Agente *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Arthur Cervero, Dante, Joui Jouki"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Text style={styles.fieldLabel}>Nome do Jogador</Text>
                {!!userProfile?.playerName && player !== userProfile.playerName && (
                  <TouchableOpacity onPress={() => setPlayer(userProfile.playerName)}>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                      Usar Perfil ({userProfile.playerName})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                value={player}
                onChangeText={setPlayer}
                placeholder="Ex: Seu Nome"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          {/* ======================================================== */}
          {/* ETAPA 2: ORIGEM                                          */}
          {/* ======================================================== */}
          {step === 2 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeadingRow}>
                <Ionicons name="compass-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Escolha a Origem</Text>
                  <Text style={styles.stepDesc}>
                    A origem representa a vida do personagem antes de entrar na Ordem. Concede 2 perícias treinadas e 1 poder único.
                  </Text>
                </View>
              </View>

              <View style={styles.hintBanner}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.hintBannerText}>
                  Toque e segure em qualquer origem para abrir a descrição detalhada da sua habilidade.
                </Text>
              </View>

              <TextInput
                style={styles.searchInput}
                value={originSearch}
                onChangeText={setOriginSearch}
                placeholder="Pesquisar entre as 59 origens..."
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ gap: 8, marginTop: 10 }}>
                {filteredOrigins.map((orig) => {
                  const isSelected = orig.id === selectedOriginId;
                  const bookRef = `${orig.bookTitle || 'Livro Base'}${
                    orig.pageNumber ? ` p. ${orig.pageNumber}` : ''
                  }`;
                  const openOriginDetails = () =>
                    openEntityPreview(orig, {
                      popupTestID: 'origin-ability-popup',
                      primaryAction: {
                        label: isSelected ? 'Origem Selecionada' : 'Escolher esta Origem',
                        isSelected,
                        onPress: () => setSelectedOriginId(orig.id),
                        testID: 'popup-select-btn',
                      },
                    });

                  return (
                    <TouchableOpacity
                      key={orig.id}
                      style={[styles.itemCard, isSelected && styles.itemCardActive]}
                      onPress={() => setSelectedOriginId(orig.id)}
                      onLongPress={openOriginDetails}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      activeOpacity={0.7}
                      testID={`origin-card-${orig.id}`}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={[styles.itemCardTitle, isSelected && { color: colors.primary }]}>
                            {orig.name}
                          </Text>
                          <View style={styles.bookBadge}>
                            <Text style={styles.bookBadgeText}>{bookRef}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.originInfoBtn}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openOriginDetails();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={`Ver habilidade de ${orig.name}`}
                            testID={`origin-info-${orig.id}`}
                          >
                            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                        </View>
                      </View>

                      {!!orig.summary && <Text style={styles.itemCardSummary}>{orig.summary}</Text>}

                      {!!orig.trainedSkills && (
                        <View style={styles.badgeRow}>
                          <Ionicons name="dice-outline" size={14} color={colors.accent} />
                          <Text style={[styles.badgeText, { color: colors.accent, fontWeight: '700' }]}>
                            Perícias:{' '}
                            <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                              {orig.trainedSkills}
                            </Text>
                          </Text>
                        </View>
                      )}

                      {(!!orig.powerName || !!orig.powerDescription) && (
                        <View style={styles.originPowerBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="flash-outline" size={14} color="#F59E0B" />
                            <Text style={styles.originPowerTitle}>
                              Poder: {orig.powerName || 'Habilidade de Origem'}
                            </Text>
                          </View>
                          {!!orig.powerDescription && (
                            <Text style={styles.originPowerDesc}>{orig.powerDescription}</Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* ETAPA 3: CLASSE                                          */}
          {/* ======================================================== */}
          {step === 3 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeadingRow}>
                <Ionicons name="shield-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Escolha a Classe</Text>
                  <Text style={styles.stepDesc}>
                    Define a função do agente em missão, seus pontos vitais e como enfrenta o paranormal.
                  </Text>
                </View>
              </View>

              <View style={styles.hintBanner}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.hintBannerText}>
                  Toque e segure em qualquer classe para abrir todas as suas características e progressão.
                </Text>
              </View>

              <View style={{ gap: 10, marginTop: 10 }}>
                {classesList.map((cls) => {
                  const isSelected = cls.id === selectedClassId;
                  const cname = cls.name.toLowerCase();
                  const bookRef = `${cls.bookTitle || 'Livro Base'}${
                    cls.pageNumber ? ` p. ${cls.pageNumber}` : ''
                  }`;
                  const openClassDetails = () =>
                    openEntityPreview(cls, {
                      primaryAction: {
                        label: isSelected ? 'Classe Selecionada' : 'Escolher esta Classe',
                        isSelected,
                        onPress: () => setSelectedClassId(cls.id),
                      },
                    });

                  return (
                    <TouchableOpacity
                      key={cls.id}
                      style={[styles.classCard, isSelected && styles.classCardActive]}
                      onPress={() => setSelectedClassId(cls.id)}
                      onLongPress={openClassDetails}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      activeOpacity={0.75}
                      testID={`class-card-${cls.name.toLowerCase()}`}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={[styles.classCardTitle, isSelected && { color: colors.primary }]}>
                            {cls.name}
                          </Text>
                          <View style={styles.bookBadge}>
                            <Text style={styles.bookBadgeText}>{bookRef}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.originInfoBtn}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openClassDetails();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel={`Ver detalhes de ${cls.name}`}
                            testID={`class-info-${cls.id}`}
                          >
                            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                        </View>
                      </View>
                      <Text style={styles.classCardSummary}>{cls.summary}</Text>

                      <View style={styles.statsRow}>
                        <View style={[styles.statBadge, { borderColor: '#EF4444' }]}>
                          <Text style={[styles.statBadgeLabel, { color: '#EF4444' }]}>PV Inicial</Text>
                          <Text style={styles.statBadgeVal}>
                            {cname.includes('combatente')
                              ? '20 + Vig'
                              : cname.includes('ocultista')
                              ? '12 + Vig'
                              : cname.includes('sobrevivente')
                              ? '8 + Vig'
                              : '16 + Vig'}
                          </Text>
                        </View>
                        <View style={[styles.statBadge, { borderColor: '#F59E0B' }]}>
                          <Text style={[styles.statBadgeLabel, { color: '#F59E0B' }]}>PE Inicial</Text>
                          <Text style={styles.statBadgeVal}>
                            {cname.includes('combatente')
                              ? '2 + Pre'
                              : cname.includes('ocultista')
                              ? '4 + Pre'
                              : cname.includes('sobrevivente')
                              ? '2 + Pre'
                              : '3 + Pre'}
                          </Text>
                        </View>
                        <View style={[styles.statBadge, { borderColor: '#38BDF8' }]}>
                          <Text style={[styles.statBadgeLabel, { color: '#38BDF8' }]}>SAN Inicial</Text>
                          <Text style={styles.statBadgeVal}>
                            {cname.includes('combatente')
                              ? '12'
                              : cname.includes('ocultista')
                              ? '20'
                              : cname.includes('sobrevivente')
                              ? '8'
                              : '16'}
                          </Text>
                        </View>
                      </View>

                      {!!cls.trainedSkills && (
                        <Text style={styles.classSkillsText}>
                          <Text style={{ fontWeight: '700', color: colors.text }}>Perícias: </Text>
                          {cls.trainedSkills}
                        </Text>
                      )}

                      {!!cls.proficiencies && (
                        <Text style={styles.proficienciesText}>
                          <Text style={{ fontWeight: '700', color: colors.text }}>Proficiências: </Text>
                          {cls.proficiencies}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* ETAPA 4: ATRIBUTOS                                       */}
          {/* ======================================================== */}
          {step === 4 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeadingRow}>
                <Ionicons name="analytics-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Distribuição de Atributos</Text>
                  <Text style={styles.stepDesc}>
                    {isSobrevivente
                      ? 'Regra Oficial (Sobrevivente): Você inicia com 1 em todos os atributos e recebe 3 pontos para distribuir (máx 3). Você pode reduzir um único atributo para 0 para receber +1 ponto extra para gastar.'
                      : 'Regra Oficial: Você inicia com 1 em todos os atributos e tem 4 pontos para distribuir (máx 3 no NEX 5%). Você pode reduzir um único atributo para 0 para receber +1 ponto extra para gastar em outro atributo.'}
                  </Text>
                </View>
              </View>

              {/* Status dos Pontos */}
              <View style={[styles.pointsBanner, { backgroundColor: pointsRemaining === 0 ? colors.surfaceHighlight : '#EF444420' }]}>
                <Text style={styles.pointsBannerText}>
                  Pontos Restantes:{' '}
                  <Text style={{ fontWeight: '900', color: pointsRemaining === 0 ? colors.success : colors.danger }}>
                    {pointsRemaining}
                  </Text>{' '}
                  / {totalPoints}
                </Text>
                <TouchableOpacity onPress={() => setFreeMode(!freeMode)}>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                    {freeMode ? 'Modo Oficial' : 'Modo Livre'}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasZeroAttr && (
                <View style={[styles.zeroAttrBanner, { backgroundColor: colors.surfaceHighlight, borderColor: '#F59E0B' }]}>
                  <Ionicons name="information-circle" size={16} color="#F59E0B" />
                  <Text style={[styles.zeroAttrBannerText, { color: colors.textSecondary }]}>
                    Um atributo foi reduzido a 0 (+1 ponto extra concedido). Em testes deste atributo, você rola 2d20 e escolhe o menor resultado.
                  </Text>
                </View>
              )}

              <View style={styles.attrsList}>
                {(['AGI', 'FOR', 'INT', 'PRE', 'VIG'] as const).map((attr) => {
                  const val = attrs[attr];
                  const labels: Record<string, string> = {
                    AGI: 'Agilidade (Iniciativa, Pontaria, Furtividade)',
                    FOR: 'Força (Luta, Atletismo, Carga de Inventário)',
                    INT: 'Intelecto (Perícias treinadas extras, Investigação)',
                    PRE: 'Presença (Pontos de Esforço, Vontade, DT de Rituais)',
                    VIG: 'Vigor (Pontos de Vida, Fortitude)',
                  };

                  const otherZerosCount = Object.entries(attrs).filter(
                    ([k, v]) => k !== attr && v === 0
                  ).length;
                  const canDecrease = freeMode
                    ? val > 0
                    : val > 1 || (val === 1 && otherZerosCount === 0);
                  const canIncrease = freeMode ? true : val < 3 && pointsRemaining > 0;

                  return (
                    <View key={attr} style={styles.attrRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attrRowCode}>{attr}</Text>
                        <Text style={styles.attrRowDesc}>{labels[attr]}</Text>
                      </View>
                      <View style={styles.attrStepper}>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleAttrChange(attr, -1)}
                          disabled={!canDecrease}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={!canDecrease ? colors.textMuted : colors.text}
                          />
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.attrValueText,
                            val === 0 && { color: '#F59E0B', fontWeight: '900' },
                          ]}
                        >
                          {val}
                        </Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleAttrChange(attr, 1)}
                          disabled={!canIncrease}
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={!canIncrease ? colors.textMuted : colors.text}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Prévia de Status Vitais */}
              <View style={styles.vitalsPreview}>
                <Text style={styles.vitalsTitle}>Status Vitais Calculados:</Text>
                <View style={styles.vitalsRow}>
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>PV: {stats.pv}</Text>
                  <Text style={{ color: '#F59E0B', fontWeight: '700' }}>PE: {stats.pe}</Text>
                  <Text style={{ color: '#38BDF8', fontWeight: '700' }}>SAN: {stats.san}</Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Defesa: {stats.defense}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* ETAPA 5: PERÍCIAS TREINADAS                              */}
          {/* ======================================================== */}
          {step === 5 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeadingRow}>
                <Ionicons name="dice-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Perícias Treinadas (+5)</Text>
                  <Text style={styles.stepDesc}>
                    Origem e Classe concedem perícias automáticas e cotas de escolha com base no seu Intelecto ({attrs.INT}).
                  </Text>
                </View>
              </View>

              {/* Perícias Concedidas pela Origem */}
              <View style={styles.originSkillsSummary}>
                <Text style={styles.sectionSubtitle}>
                  Perícias da Origem ({selectedOrigin?.name || 'Origem'}):
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {originGrantedSkills.map((sk) => (
                    <View key={sk} style={[styles.staticBadge, { borderColor: colors.accent }]}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
                      <Text style={[styles.staticBadgeText, { color: colors.accent }]}>{sk}</Text>
                    </View>
                  ))}
                  {extraOriginChoices > 0 && (
                    <View style={[styles.staticBadge, { borderColor: colors.accent }]}>
                      <Ionicons name="sparkles" size={13} color={colors.accent} />
                      <Text style={[styles.staticBadgeText, { color: colors.accent }]}>
                        +{extraOriginChoices} livre(s) da Origem
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Perícias Fixas da Classe (se houver, ex: Ocultista -> Ocultismo e Vontade) */}
              {effectiveMandatorySkills.length > 0 && (
                <View style={[styles.originSkillsSummary, { marginTop: 8 }]}>
                  <Text style={styles.sectionSubtitle}>
                    Perícias Fixas da Classe ({selectedClass?.name}):
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {effectiveMandatorySkills.map((sk) => (
                      <View key={sk} style={[styles.staticBadge, { borderColor: colors.primary }]}>
                        <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                        <Text style={[styles.staticBadgeText, { color: colors.primary }]}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Grupos de escolha de classe (ex: Combatente -> Luta/Pontaria, Fortitude/Reflexos) */}
              {skillRules.choiceGroups.map((grp, idx) => {
                const allInOrigin = grp.options.every((opt) => originGrantedSkills.includes(opt));
                if (allInOrigin) {
                  return (
                    <View key={idx} style={[styles.groupContainer, { marginTop: 10 }]}>
                      <Text style={styles.groupTitle}>Grupo {idx + 1}: {grp.options.join(' ou ')}</Text>
                      <Text style={[styles.quotaSubText, { color: colors.success }]}>
                        ✓ Ambas as opções já foram treinadas pela sua Origem (+1 escolha livre concedida).
                      </Text>
                    </View>
                  );
                }

                const hasOriginOption = grp.options.some((opt) => originGrantedSkills.includes(opt));
                const selectedOption = choiceGroupSelections[idx];
                const isMet = !!selectedOption;

                return (
                  <View key={idx} style={[styles.groupContainer, { marginTop: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.groupTitle}>
                        Escolha Obrigatória {idx + 1}: {grp.options.join(' ou ')} *
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isMet ? colors.success : colors.danger }}>
                        {isMet ? '✓ Selecionado' : 'Pendente'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {grp.options.map((skName) => {
                        const isOrigin = originGrantedSkills.includes(skName);
                        const isSel = selectedOption === skName;

                        if (isOrigin) {
                          return (
                            <View key={skName} style={[styles.skillPill, { opacity: 0.6, borderColor: colors.border }]}>
                              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                              <Text style={[styles.skillPillText, { color: colors.textSecondary }]}>
                                {skName} (Origem)
                              </Text>
                            </View>
                          );
                        }

                        return (
                          <TouchableOpacity
                            key={skName}
                            style={[styles.skillPill, isSel && styles.skillPillActive]}
                            onPress={() => handleSelectChoiceGroup(idx, skName)}
                            onLongPress={() =>
                              openSkillPreview(skName, {
                                primaryAction: {
                                  label: isSel ? 'Perícia Selecionada' : `Escolher ${skName}`,
                                  isSelected: isSel,
                                  onPress: () => handleSelectChoiceGroup(idx, skName),
                                },
                              })
                            }
                            delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                            testID={`skill-pill-${skName}`}
                          >
                            <Ionicons
                              name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                              size={16}
                              color={isSel ? '#FFF' : colors.textSecondary}
                            />
                            <Text style={[styles.skillPillText, isSel && styles.skillPillTextActive]}>
                              {skName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}

                      {hasOriginOption && (
                        <TouchableOpacity
                          style={[
                            styles.skillPill,
                            selectedOption === '__free_choice__' && styles.skillPillActive,
                          ]}
                          onPress={() => handleSelectChoiceGroup(idx, '__free_choice__')}
                        >
                          <Ionicons
                            name={selectedOption === '__free_choice__' ? 'checkmark-circle' : 'ellipse-outline'}
                            size={16}
                            color={selectedOption === '__free_choice__' ? '#FFF' : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.skillPillText,
                              selectedOption === '__free_choice__' && styles.skillPillTextActive,
                            ]}
                          >
                            +1 Perícia Livre (Troca)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Informações da Cota Livre com Contador Estrito */}
              <View
                style={[
                  styles.quotaBox,
                  {
                    marginTop: 12,
                    borderColor:
                      freeSkillSelections.length === totalFreeChoicesCount ? colors.success : colors.border,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.quotaBoxText}>
                    Cota livre da classe ({selectedClass?.name}):{' '}
                    <Text style={{ fontWeight: '900', color: colors.primary }}>
                      {totalFreeChoicesCount} {totalFreeChoicesCount === 1 ? 'perícia' : 'perícias'}
                    </Text>
                  </Text>
                  <View
                    style={[
                      styles.quotaStatusBadge,
                      {
                        backgroundColor:
                          freeSkillSelections.length === totalFreeChoicesCount
                            ? colors.success + '20'
                            : colors.danger + '20',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color:
                          freeSkillSelections.length === totalFreeChoicesCount
                            ? colors.success
                            : colors.danger,
                      }}
                    >
                      {freeSkillSelections.length} / {totalFreeChoicesCount}
                    </Text>
                  </View>
                </View>

                {freeSkillSelections.length < totalFreeChoicesCount ? (
                  <Text style={[styles.quotaSubText, { color: '#F59E0B' }]}>
                    Selecione mais {totalFreeChoicesCount - freeSkillSelections.length}{' '}
                    {totalFreeChoicesCount - freeSkillSelections.length === 1 ? 'perícia' : 'perícias'} na lista abaixo.
                  </Text>
                ) : (
                  <Text style={[styles.quotaSubText, { color: colors.success }]}>
                    ✓ Cota completa! Exatamente {totalFreeChoicesCount} perícias livres selecionadas.
                  </Text>
                )}
              </View>

              {/* Lista Completa das 28 Perícias */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Todas as 28 Perícias:</Text>
              <View style={styles.skillsGrid}>
                {OFFICIAL_SKILLS_LIST.map((sk) => {
                  const isOrigin = originGrantedSkills.includes(sk.name);
                  const isMandatory = effectiveMandatorySkills.includes(sk.name);
                  const isGroup = Object.values(choiceGroupSelections).includes(sk.name);
                  const isFree = freeSkillSelections.includes(sk.name);
                  const isSelected = isOrigin || isMandatory || isGroup || isFree;
                  const isLocked = isOrigin || isMandatory || isGroup;
                  const isQuotaFull = freeSkillSelections.length >= totalFreeChoicesCount;
                  const isDisabled = isLocked || (!isFree && isQuotaFull);

                  const handleInspectSkill = () =>
                    openSkillPreview(sk, {
                      primaryAction:
                        !isLocked && (!isQuotaFull || isFree)
                          ? {
                              label: isFree ? 'Remover Perícia Livre' : 'Treinar Perícia Livre',
                              isSelected: isFree,
                              onPress: () => toggleFreeSkill(sk.name),
                            }
                          : undefined,
                    });

                  return (
                    <TouchableOpacity
                      key={sk.name}
                      style={[
                        styles.skillItem,
                        isSelected && styles.skillItemActive,
                        isOrigin && { borderColor: colors.accent },
                        isDisabled && !isSelected && { opacity: 0.45 },
                      ]}
                      onPress={() => {
                        if (isLocked || (isDisabled && !isFree)) return;
                        toggleFreeSkill(sk.name);
                      }}
                      onLongPress={handleInspectSkill}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      testID={`skill-card-${sk.name}`}
                    >
                      <View testID={`skill-pill-${sk.name}`} style={{ display: 'none' }} />
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={
                          isOrigin
                            ? colors.accent
                            : isMandatory || isGroup
                            ? colors.primary
                            : isFree
                            ? colors.primary
                            : colors.textSecondary
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.skillItemName,
                            isSelected && { color: colors.text, fontWeight: '700' },
                          ]}
                        >
                          {sk.name}
                        </Text>
                        <Text style={styles.skillItemAttr}>
                          {sk.attr}
                          {sk.trainedOnly ? ' • Somente Treinada' : ''}
                          {sk.armorPenalty ? ' • Carga' : ''}
                          {isOrigin
                            ? ' • Origem'
                            : isMandatory
                            ? ' • Classe (Fixa)'
                            : isGroup
                            ? ' • Escolha de Classe'
                            : isFree
                            ? ' • Escolha Livre'
                            : ''}
                        </Text>
                      </View>
                      {isOrigin && (
                        <View style={[styles.tagBadge, { backgroundColor: colors.accent + '20' }]}>
                          <Text style={[styles.tagBadgeText, { color: colors.accent }]}>Origem</Text>
                        </View>
                      )}
                      {isMandatory && (
                        <View style={[styles.tagBadge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.tagBadgeText, { color: colors.primary }]}>Classe</Text>
                        </View>
                      )}
                      {isGroup && (
                        <View style={[styles.tagBadge, { backgroundColor: '#F59E0B20' }]}>
                          <Text style={[styles.tagBadgeText, { color: '#F59E0B' }]}>Grupo</Text>
                        </View>
                      )}
                      {isFree && (
                        <View style={[styles.tagBadge, { backgroundColor: colors.success + '20' }]}>
                          <Text style={[styles.tagBadgeText, { color: colors.success }]}>Livre</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.originInfoBtn}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleInspectSkill();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        testID={`skill-info-${sk.name}`}
                      >
                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ======================================================== */}
          {/* ETAPA 6: HABILIDADES & RITUAIS INICIAIS                   */}
          {/* ======================================================== */}
          {step === 6 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeadingRow}>
                <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>
                    {isSobrevivente ? 'Habilidades de Estágio 1' : 'Habilidades & Rituais de 5% NEX'}
                  </Text>
                  <Text style={styles.stepDesc}>
                    {isSobrevivente
                      ? 'Personalize as escolhas de 1º Estágio do seu sobrevivente antes de finalizar a criação.'
                      : 'Personalize as escolhas de 5% NEX da sua classe antes de finalizar a criação do agente.'}
                  </Text>
                </View>
              </View>

              {/* SE OCULTISTA: SELEÇÃO DE 3 RITUAIS DE 1º CÍRCULO */}
              {selectedClass?.name.toLowerCase().includes('ocultista') && (
                <View style={{ marginTop: 10 }}>
                  <View style={styles.quotaBox}>
                    <Text style={styles.quotaBoxText}>
                      Escolhido pelo Outro Lado:{' '}
                      <Text style={{ fontWeight: '900', color: colors.primary }}>
                        Selecione 3 rituais de 1º Círculo
                      </Text>{' '}
                      ({selectedRitualIds.length} / 3)
                    </Text>
                  </View>

                  <TextInput
                    style={styles.searchInput}
                    value={ritualSearch}
                    onChangeText={setRitualSearch}
                    placeholder="Pesquisar rituais de 1º círculo..."
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={{ gap: 8, marginTop: 10 }}>
                    {circle1Rituals
                      .filter((r) =>
                        !ritualSearch.trim() ||
                        r.name.toLowerCase().includes(ritualSearch.toLowerCase()) ||
                        (r.element || '').toLowerCase().includes(ritualSearch.toLowerCase())
                      )
                      .map((rit) => {
                        const isSel = selectedRitualIds.includes(rit.id);
                        const openRitualDetails = () =>
                          openEntityPreview(rit, {
                            primaryAction: {
                              label: isSel ? 'Ritual Selecionado' : 'Escolher este Ritual',
                              isSelected: isSel,
                              onPress: () => toggleRitual(rit.id),
                            },
                          });
                        return (
                          <TouchableOpacity
                            key={rit.id}
                            style={[styles.itemCard, isSel && styles.itemCardActive]}
                            onPress={() => toggleRitual(rit.id)}
                            onLongPress={openRitualDetails}
                            delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                            testID={`ritual-card-${rit.id}`}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.itemCardTitle, isSel && { color: colors.primary }]}>
                                {rit.name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.badgeText, { color: colors.accent }]}>
                                  {rit.element} • 1º Círculo
                                </Text>
                                <TouchableOpacity
                                  style={styles.originInfoBtn}
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    openRitualDetails();
                                  }}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  testID={`ritual-info-${rit.id}`}
                                >
                                  <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <Text style={styles.itemCardSummary}>{rit.summary}</Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              )}

              {/* SE ESPECIALISTA: ESCOLHA DE 2 PERÍCIAS PERITAS */}
              {selectedClass?.name.toLowerCase().includes('especialista') && (
                <View style={{ marginTop: 10 }}>
                  <View style={styles.quotaBox}>
                    <Text style={styles.quotaBoxText}>
                      Habilidade Perito:{' '}
                      <Text style={{ fontWeight: '900', color: colors.primary }}>
                        Escolha 2 perícias treinadas
                      </Text>{' '}
                      ({peritoSkills.length} / 2)
                    </Text>
                    <Text style={styles.quotaSubText}>
                      Você poderá gastar 2 PE para somar +1d6 no teste dessas duas perícias.
                    </Text>
                  </View>

                  <View style={styles.skillsGrid}>
                    {peritoCandidates.map((skName) => {
                      const isSel = peritoSkills.includes(skName);
                      const openPeritoSkill = () =>
                        openSkillPreview(skName, {
                          primaryAction: {
                            label: isSel ? 'Selecionada em Perito' : `Escolher ${skName} para Perito`,
                            isSelected: isSel,
                            onPress: () => togglePeritoSkill(skName),
                          },
                        });
                      return (
                        <TouchableOpacity
                          key={skName}
                          style={[styles.skillItem, isSel && styles.skillItemActive]}
                          onPress={() => togglePeritoSkill(skName)}
                          onLongPress={openPeritoSkill}
                          delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                        >
                          <Ionicons
                            name={isSel ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSel ? colors.primary : colors.textSecondary}
                          />
                          <Text style={[styles.skillItemName, isSel && { color: colors.primary, fontWeight: '700', flex: 1 }, !isSel && { flex: 1 }]}>
                            {skName}
                          </Text>
                          <TouchableOpacity
                            style={styles.originInfoBtn}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openPeritoSkill();
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* SE COMBATENTE: ATAQUE ESPECIAL */}
              {selectedClass?.name.toLowerCase().includes('combatente') && (
                <View style={styles.classFeatureCard}>
                  <Text style={styles.classFeatureTitle}>Ataque Especial (NEX 5%)</Text>
                  <Text style={styles.classFeatureDesc}>
                    Ao atacar, você pode gastar 2 PE para receber +5 no teste de ataque ou na rolagem de dano. Essa habilidade já será vinculada à sua ficha.
                  </Text>
                </View>
              )}

              {/* SE SOBREVIVENTE: EMPENHO */}
              {selectedClass?.name.toLowerCase().includes('sobrevivente') && (
                <View style={styles.classFeatureCard}>
                  <Text style={styles.classFeatureTitle}>Empenho (1º Estágio)</Text>
                  <Text style={styles.classFeatureDesc}>
                    Ao fazer um teste de perícia, você pode gastar 1 PE para receber +2 nesse teste. Essa habilidade já será vinculada à sua ficha.
                  </Text>
                </View>
              )}

              {/* RESUMO FINAL */}
              <View style={[styles.vitalsPreview, { marginTop: 18 }]}>
                <Text style={styles.vitalsTitle}>Resumo do Agente Criado:</Text>
                <Text style={styles.stepDesc}>
                  {name} ({player || 'Sem jogador'}) • {selectedClass?.name} • {selectedOrigin?.name} •{' '}
                  {isSobrevivente ? 'NEX 0% (Estágio 1)' : 'NEX 5%'}
                </Text>
                <View style={[styles.vitalsRow, { marginTop: 8 }]}>
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>PV: {stats.pv}</Text>
                  <Text style={{ color: '#F59E0B', fontWeight: '700' }}>PE: {stats.pe}</Text>
                  <Text style={{ color: '#38BDF8', fontWeight: '700' }}>SAN: {stats.san}</Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                    Defesa: {stats.defense}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                    PE/Rod: {isSobrevivente ? 1 : stats.peRound}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                    DT: {stats.dtRitual}
                  </Text>
                </View>

                {/* Resumo do Poder da Origem */}
                {!!selectedOrigin?.powerName && (
                  <View
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#F59E0B' }}>
                      Poder de Origem: {selectedOrigin.powerName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {selectedOrigin.powerDescription || selectedOrigin.summary}
                    </Text>
                  </View>
                )}

                {/* Resumo de Rituais Selecionados */}
                {selectedClass?.name.toLowerCase().includes('ocultista') &&
                  selectedRitualIds.length > 0 && (
                    <View
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                        Rituais de 1º Círculo Escolhidos ({selectedRitualIds.length}/3):
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                        {ritualsList
                          .filter((r) => selectedRitualIds.includes(r.id))
                          .map((r) => r.name)
                          .join(', ')}
                      </Text>
                    </View>
                  )}

                {/* Resumo de Perícias Peritas */}
                {selectedClass?.name.toLowerCase().includes('especialista') &&
                  peritoSkills.length > 0 && (
                    <View
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                        Perícias de Perito (+1d6): {peritoSkills.join(', ')}
                      </Text>
                    </View>
                  )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Mensagem de Validação / Guia */}
        {!canAdvance(step) && (
          <View style={styles.validationNotice}>
            <Ionicons name="information-circle" size={16} color="#F59E0B" />
            <Text style={styles.validationNoticeText}>
              {step === 1 && 'Informe o nome do agente para continuar.'}
              {step === 4 &&
                `Distribua todos os pontos de atributo (${pointsRemaining > 0 ? `restam ${pointsRemaining}` : 'pontos excedidos'}).`}
              {step === 5 &&
                (!areAllChoiceGroupsSelected
                  ? 'Faça todas as escolhas obrigatórias da classe acima.'
                  : `Selecione exatamente ${totalFreeChoicesCount} perícias livres (${freeSkillSelections.length}/${totalFreeChoicesCount} selecionadas).`)}
              {step === 6 &&
                (selectedClass?.name.toLowerCase().includes('ocultista')
                  ? `Selecione exatamente 3 rituais de 1º círculo (${selectedRitualIds.length}/3).`
                  : `Selecione exatamente 2 perícias treinadas para Perito (${peritoSkills.length}/2).`)}
            </Text>
          </View>
        )}

        {/* Bottom Actions */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {step > 1 ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={styles.backBtnText}>Voltar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          {step < 6 ? (
            <TouchableOpacity
              style={[styles.nextBtn, !canAdvance(step) && styles.nextBtnDisabled]}
              onPress={() => {
                if (!canAdvance(step)) return;
                setStep(step + 1);
              }}
              disabled={!canAdvance(step)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.nextBtnText, !canAdvance(step) && styles.nextBtnTextDisabled]}>
                Próximo
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={!canAdvance(step) ? colors.textMuted : '#FFF'}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.finishBtn, !canAdvance(6) && styles.finishBtnDisabled]}
              onPress={() => {
                if (!canAdvance(6)) return;
                handleComplete();
              }}
              disabled={!canAdvance(6)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="checkmark-done"
                size={20}
                color={!canAdvance(6) ? colors.textMuted : '#FFF'}
              />
              <Text style={[styles.finishBtnText, !canAdvance(6) && styles.finishBtnTextDisabled]}>
                Criar Agente Agora
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getStepTitle(st: number): string {
  switch (st) {
    case 1:
      return 'Identidade';
    case 2:
      return 'Origem';
    case 3:
      return 'Classe';
    case 4:
      return 'Atributos';
    case 5:
      return 'Perícias';
    case 6:
      return 'Habilidades Iniciais';
    default:
      return '';
  }
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
    progressRow: {
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    progressSegment: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    bodyScroll: {
      padding: 16,
      paddingBottom: 40,
    },
    stepCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepHeadingRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    stepDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 17,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    itemCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
    },
    itemCardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    itemCardSummary: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 16,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    badgeText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    bookBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bookBadgeText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    originPowerBox: {
      marginTop: 8,
      padding: 10,
      borderRadius: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: '#F59E0B40',
    },
    originPowerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#F59E0B',
    },
    originPowerDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 16,
    },
    classCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    classCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceHighlight,
    },
    classCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    classCardSummary: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    statBadge: {
      flex: 1,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    statBadgeLabel: {
      fontSize: 10,
      fontWeight: '700',
    },
    statBadgeVal: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    classSkillsText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 8,
      lineHeight: 16,
    },
    proficienciesText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 6,
    },
    pointsBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    pointsBannerText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    zeroAttrBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    zeroAttrBannerText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
    },
    attrsList: {
      gap: 10,
    },
    attrRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    attrRowCode: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    attrRowDesc: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    attrStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stepBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    attrValueText: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
      minWidth: 20,
      textAlign: 'center',
    },
    vitalsPreview: {
      marginTop: 14,
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    vitalsTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    vitalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
    },
    quotaBox: {
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    quotaBoxText: {
      fontSize: 12,
      color: colors.text,
    },
    quotaSubText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    groupContainer: {
      marginBottom: 10,
    },
    groupTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    skillPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    skillPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    skillPillText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '600',
    },
    skillPillTextActive: {
      color: '#FFF',
      fontWeight: '800',
    },
    skillsGrid: {
      gap: 6,
    },
    skillItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
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
    skillItemAttr: {
      fontSize: 10,
      color: colors.textMuted,
    },
    classFeatureCard: {
      backgroundColor: colors.surfaceElevated,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    classFeatureTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    classFeatureDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 17,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    backBtnText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    nextBtnDisabled: {
      opacity: 0.5,
      backgroundColor: colors.surfaceHighlight,
    },
    nextBtnText: {
      fontSize: 14,
      color: '#FFF',
      fontWeight: '700',
    },
    nextBtnTextDisabled: {
      color: colors.textMuted,
    },
    finishBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.success,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    finishBtnDisabled: {
      opacity: 0.5,
      backgroundColor: colors.surfaceHighlight,
    },
    finishBtnText: {
      fontSize: 14,
      color: '#FFF',
      fontWeight: '800',
    },
    finishBtnTextDisabled: {
      color: colors.textMuted,
    },
    originSkillsSummary: {
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    staticBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
      backgroundColor: colors.surface,
    },
    staticBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    quotaStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    tagBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tagBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    validationNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surfaceElevated,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    validationNoticeText: {
      flex: 1,
      fontSize: 12,
      color: '#F59E0B',
      fontWeight: '600',
    },
    originInfoBtn: {
      padding: 4,
      borderRadius: 6,
      backgroundColor: colors.surfaceHighlight,
    },
    hintBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 4,
      marginBottom: 10,
    },
    hintBannerText: {
      fontSize: 11,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 16,
    },
    popupOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    popupCard: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '85%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    popupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    popupIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: '#F59E0B20',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#F59E0B50',
    },
    popupOriginName: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    popupOriginBook: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    popupCloseBtn: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceHighlight,
    },
    popupBody: {
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    popupAbilitySection: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: '#F59E0B50',
      marginBottom: 12,
    },
    popupAbilityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    popupAbilityTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#F59E0B',
      flex: 1,
    },
    popupCostBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: '#F59E0B25',
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    popupCostBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#F59E0B',
    },
    popupAbilityDescription: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 20,
    },
    popupSkillsSection: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      gap: 6,
    },
    popupSectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accent,
    },
    popupSkillsText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    popupLoreSection: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    popupLoreLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    popupLoreText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    popupFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    popupDismissButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    popupDismissButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    popupSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    popupSelectButtonActive: {
      backgroundColor: '#10B981',
    },
    popupSelectButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
