import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import {
  Campaign,
  CampaignAgentLink,
  CampaignClue,
  CampaignInitiativeEntry,
  CampaignMonster,
  CampaignStoryScene,
  CharacterSheet,
  CompendiumEntity,
  ParanormalElement,
} from '../../types/compendium';
import { confirmAction, showAlert } from '../../utils/alert';
import { parseAgentShareCode } from '../../utils/agentSharing';
import { DEFAULT_LONG_PRESS_DELAY } from '../../types/recordPreview';

type MasterSubTab = 'stories' | 'monsters' | 'agents' | 'combat';

const THREAT_LEVELS = ['Iniciante', 'Veterano', 'Especialista', 'Elite', 'Extremo'] as const;

export default function MasterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);

  const {
    campaigns,
    activeCampaignId,
    setActiveCampaignId,
    activeCampaign,
    upsertCampaign,
    deleteCampaign,
    addMonsterToCampaign,
    updateMonsterInCampaign,
    deleteMonsterFromCampaign,
    saveMonsterToCompendium,
    addAgentToCampaign,
    updateAgentInCampaign,
    deleteAgentFromCampaign,
    addStorySceneToCampaign,
    updateStorySceneInCampaign,
    deleteStorySceneFromCampaign,
    setInitiativesInCampaign,
    characters,
    entities,
    rollOrdemTest,
    rollFormula,
    openManual,
    openRecordPreview,
    openEntityPreview,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<MasterSubTab>('stories');

  // Modais de Campanha
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campTitle, setCampTitle] = useState('');
  const [campSubtitle, setCampSubtitle] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campThreat, setCampThreat] = useState<(typeof THREAT_LEVELS)[number]>('Iniciante');
  const [campRank, setCampRank] = useState('Recruta');
  const [campNotes, setCampNotes] = useState('');

  // Modais de Cena / História
  const [sceneModalVisible, setSceneModalVisible] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [sceneTitle, setSceneTitle] = useState('');
  const [sceneSummary, setSceneSummary] = useState('');
  const [sceneDetails, setSceneDetails] = useState('');
  const [sceneClues, setSceneClues] = useState<CampaignClue[]>([]);
  const [newClueText, setNewClueText] = useState('');

  // Modais de Monstro
  const [monsterModalVisible, setMonsterModalVisible] = useState(false);
  const [editingMonsterId, setEditingMonsterId] = useState<string | null>(null);
  const [monName, setMonName] = useState('');
  const [monVD, setMonVD] = useState('20');
  const [monPV, setMonPV] = useState('40');
  const [monDef, setMonDef] = useState('15');
  const [monElement, setMonElement] = useState<string>('Sangue');
  const [monPresence, setMonPresence] = useState('DT 13 • 1d6 mental');
  const [monAttacks, setMonAttacks] = useState('');
  const [monAbilities, setMonAbilities] = useState('');
  const [monNotes, setMonNotes] = useState('');

  // Modal de Importar Monstro do Compêndio
  const [importCompendiumMonsterModal, setImportCompendiumMonsterModal] = useState(false);
  const [compendiumSearchQuery, setCompendiumSearchQuery] = useState('');

  // Modais de Agente
  const [agentModalVisible, setAgentModalVisible] = useState(false);
  const [agentAddMode, setAgentAddMode] = useState<'manual' | 'local' | 'code'>('manual');
  // Manual agent
  const [manualAgentName, setManualAgentName] = useState('');
  const [manualAgentPlayer, setManualAgentPlayer] = useState('');
  const [manualAgentNex, setManualAgentNex] = useState('5');
  const [manualAgentRank, setManualAgentRank] = useState('Recruta');
  const [manualAgentPV, setManualAgentPV] = useState('20');
  const [manualAgentPE, setManualAgentPE] = useState('10');
  const [manualAgentSAN, setManualAgentSAN] = useState('20');
  const [manualAgentDef, setManualAgentDef] = useState('12');
  // Local agent picker
  const [selectedLocalCharId, setSelectedLocalCharId] = useState<string | null>(null);
  // Shared code agent
  const [sharedCodeInput, setSharedCodeInput] = useState('');

  // Modal de Rolagem Rápida de Perícia para Agente
  const [skillRollAgent, setSkillRollAgent] = useState<CampaignAgentLink | null>(null);

  // Lista de criaturas do compêndio para importação
  const compendiumCreatures = useMemo(() => {
    return entities.filter((e) => e.category === 'creature');
  }, [entities]);

  const filteredCompendiumCreatures = useMemo(() => {
    if (!compendiumSearchQuery.trim()) return compendiumCreatures.slice(0, 50);
    const q = compendiumSearchQuery.toLowerCase().trim();
    return compendiumCreatures
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.element && c.element.toLowerCase().includes(q)) ||
          (c.summary && c.summary.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [compendiumCreatures, compendiumSearchQuery]);

  // Handlers de Campanha
  const handleOpenCreateCampaign = () => {
    setEditingCampaignId(null);
    setCampTitle('');
    setCampSubtitle('');
    setCampDesc('');
    setCampThreat('Iniciante');
    setCampRank('Recruta');
    setCampNotes('');
    setCampaignModalVisible(true);
  };

  const handleOpenEditCampaign = () => {
    if (!activeCampaign) return;
    setEditingCampaignId(activeCampaign.id);
    setCampTitle(activeCampaign.title);
    setCampSubtitle(activeCampaign.subtitle || '');
    setCampDesc(activeCampaign.description || '');
    setCampThreat(activeCampaign.threatLevel || 'Iniciante');
    setCampRank(activeCampaign.recommendedRank || 'Recruta');
    setCampNotes(activeCampaign.masterNotes || '');
    setCampaignModalVisible(true);
  };

  const handleSaveCampaign = async () => {
    if (!campTitle.trim()) {
      showAlert('Atenção', 'Informe o título da campanha ou missão.');
      return;
    }

    const now = new Date().toISOString();
    if (editingCampaignId && activeCampaign) {
      const updated: Campaign = {
        ...activeCampaign,
        title: campTitle.trim(),
        subtitle: campSubtitle.trim(),
        description: campDesc.trim(),
        threatLevel: campThreat,
        recommendedRank: campRank.trim(),
        masterNotes: campNotes,
        updatedAt: now,
      };
      await upsertCampaign(updated);
    } else {
      const newCamp: Campaign = {
        id: `camp_${Date.now()}`,
        title: campTitle.trim(),
        subtitle: campSubtitle.trim(),
        description: campDesc.trim(),
        threatLevel: campThreat,
        recommendedRank: campRank.trim(),
        masterNotes: campNotes,
        stories: [
          {
            id: `scene_${Date.now()}`,
            title: 'Briefing da Ordem',
            summary: 'Os agentes recebem as informações preliminares sobre a anomalia.',
            details: 'Localização confidencial e diretrizes de contenção.',
            clues: [{ id: `clue_1`, text: 'Relatório confidencial do caso', isFound: true }],
            isCompleted: false,
            order: 1,
          },
        ],
        monsters: [],
        agents: [],
        initiatives: [],
        createdAt: now,
        updatedAt: now,
      };
      await upsertCampaign(newCamp);
    }

    setCampaignModalVisible(false);
  };

  const handleDeleteCampaign = () => {
    if (!activeCampaign) return;
    confirmAction({
      title: 'Excluir Campanha?',
      message: `Tem certeza que deseja apagar a campanha "${activeCampaign.title}" com todos os seus monstros, cenas e anotações?`,
      confirmText: 'Excluir',
      destructive: true,
      onConfirm: async () => {
        await deleteCampaign(activeCampaign.id);
      },
    });
  };

  // Handlers de Cenas
  const handleOpenCreateScene = () => {
    setEditingSceneId(null);
    setSceneTitle('');
    setSceneSummary('');
    setSceneDetails('');
    setSceneClues([]);
    setNewClueText('');
    setSceneModalVisible(true);
  };

  const handleOpenEditScene = (scene: CampaignStoryScene) => {
    setEditingSceneId(scene.id);
    setSceneTitle(scene.title);
    setSceneSummary(scene.summary);
    setSceneDetails(scene.details);
    setSceneClues([...scene.clues]);
    setNewClueText('');
    setSceneModalVisible(true);
  };

  const handleAddClueToEditingScene = () => {
    if (!newClueText.trim()) return;
    setSceneClues((prev) => [
      ...prev,
      { id: `clue_${Date.now()}`, text: newClueText.trim(), isFound: false },
    ]);
    setNewClueText('');
  };

  const handleToggleClueFound = (clueId: string) => {
    setSceneClues((prev) =>
      prev.map((c) => (c.id === clueId ? { ...c, isFound: !c.isFound } : c))
    );
  };

  const handleRemoveClue = (clueId: string) => {
    setSceneClues((prev) => prev.filter((c) => c.id !== clueId));
  };

  const handleSaveScene = async () => {
    if (!activeCampaign) return;
    if (!sceneTitle.trim()) {
      showAlert('Atenção', 'Informe o título da cena ou capítulo.');
      return;
    }

    if (editingSceneId) {
      await updateStorySceneInCampaign(activeCampaign.id, editingSceneId, {
        title: sceneTitle.trim(),
        summary: sceneSummary.trim(),
        details: sceneDetails.trim(),
        clues: sceneClues,
      });
    } else {
      const newScene: CampaignStoryScene = {
        id: `scene_${Date.now()}`,
        title: sceneTitle.trim(),
        summary: sceneSummary.trim(),
        details: sceneDetails.trim(),
        clues: sceneClues,
        isCompleted: false,
        order: (activeCampaign.stories?.length || 0) + 1,
      };
      await addStorySceneToCampaign(activeCampaign.id, newScene);
    }

    setSceneModalVisible(false);
  };

  // Handlers de Monstros
  const handleOpenCreateMonster = () => {
    setEditingMonsterId(null);
    setMonName('');
    setMonVD('20');
    setMonPV('40');
    setMonDef('15');
    setMonElement('Sangue');
    setMonPresence('DT 13 • 1d6 mental');
    setMonAttacks('Garras (2d20+5, dano 1d8+3)');
    setMonAbilities('Resistência a Balístico 5');
    setMonNotes('');
    setMonsterModalVisible(true);
  };

  const handleOpenEditMonster = (mon: CampaignMonster) => {
    setEditingMonsterId(mon.id);
    setMonName(mon.name);
    setMonVD(String(mon.vd));
    setMonPV(String(mon.pvMax));
    setMonDef(String(mon.defense));
    setMonElement(mon.element || 'Sangue');
    setMonPresence(mon.disturbingPresence || '');
    setMonAttacks(mon.attacks || '');
    setMonAbilities(mon.abilities || '');
    setMonNotes(mon.notes || '');
    setMonsterModalVisible(true);
  };

  const handleSaveMonster = async () => {
    if (!activeCampaign) return;
    if (!monName.trim()) {
      showAlert('Atenção', 'Informe o nome do monstro.');
      return;
    }

    const pvParsed = parseInt(monPV, 10) || 40;
    const vdParsed = parseInt(monVD, 10) || 20;
    const defParsed = parseInt(monDef, 10) || 15;

    if (editingMonsterId) {
      await updateMonsterInCampaign(activeCampaign.id, editingMonsterId, {
        name: monName.trim(),
        vd: vdParsed,
        pvMax: pvParsed,
        defense: defParsed,
        element: monElement,
        disturbingPresence: monPresence.trim(),
        attacks: monAttacks.trim(),
        abilities: monAbilities.trim(),
        notes: monNotes.trim(),
      });
    } else {
      const newMonster: CampaignMonster = {
        id: `mon_${Date.now()}`,
        name: monName.trim(),
        vd: vdParsed,
        pvCurrent: pvParsed,
        pvMax: pvParsed,
        defense: defParsed,
        element: monElement,
        disturbingPresence: monPresence.trim(),
        attacks: monAttacks.trim(),
        abilities: monAbilities.trim(),
        notes: monNotes.trim(),
      };
      await addMonsterToCampaign(activeCampaign.id, newMonster);
    }

    setMonsterModalVisible(false);
  };

  const handleImportCompendiumCreature = async (ent: CompendiumEntity) => {
    if (!activeCampaign) return;

    const vd = ent.vd || 20;
    const pv = ent.pv || 40;
    const def = ent.defense || 15;

    const newMon: CampaignMonster = {
      id: `mon_${Date.now()}`,
      name: ent.name,
      compendiumEntityId: ent.id,
      vd,
      pvCurrent: pv,
      pvMax: pv,
      defense: def,
      disturbingPresence: ent.disturbingPresence || '',
      element: ent.element || 'Nenhum',
      attacks: ent.summary || '',
      abilities: ent.description || '',
      notes: `Importado do livro ${ent.bookTitle || 'Compêndio'}.`,
    };

    await addMonsterToCampaign(activeCampaign.id, newMon);
    setImportCompendiumMonsterModal(false);
    showAlert('Ameaça Importada', `"${ent.name}" foi adicionada às ameaças da campanha!`);
  };

  const handleAdjustMonsterPV = async (mon: CampaignMonster, delta: number) => {
    if (!activeCampaign) return;
    const nextPV = Math.max(0, Math.min(mon.pvMax * 2, mon.pvCurrent + delta));
    await updateMonsterInCampaign(activeCampaign.id, mon.id, { pvCurrent: nextPV });
  };

  const handleSaveMonsterToGeneralCompendium = async (mon: CampaignMonster) => {
    try {
      await saveMonsterToCompendium(mon);
      showAlert('Salvo no Compêndio Geral', `"${mon.name}" agora está disponível no Compêndio como Criatura Homebrew!`);
    } catch (e: any) {
      showAlert('Erro', e?.message || 'Falha ao salvar no compêndio.');
    }
  };

  // Handlers de Agentes
  const handleOpenAddAgent = () => {
    setAgentAddMode('manual');
    setManualAgentName('');
    setManualAgentPlayer('');
    setManualAgentNex('5');
    setManualAgentRank('Recruta');
    setManualAgentPV('20');
    setManualAgentPE('10');
    setManualAgentSAN('20');
    setManualAgentDef('12');
    setSelectedLocalCharId(characters[0]?.id || null);
    setSharedCodeInput('');
    setAgentModalVisible(true);
  };

  const handleSaveAgent = async () => {
    if (!activeCampaign) return;

    if (agentAddMode === 'manual') {
      if (!manualAgentName.trim()) {
        showAlert('Atenção', 'Informe o nome do agente ou NPC.');
        return;
      }
      const pv = parseInt(manualAgentPV, 10) || 20;
      const pe = parseInt(manualAgentPE, 10) || 10;
      const san = parseInt(manualAgentSAN, 10) || 20;
      const nex = parseInt(manualAgentNex, 10) || 5;

      const manualSheet: CharacterSheet = {
        id: `agent_manual_${Date.now()}`,
        name: manualAgentName.trim(),
        player: manualAgentPlayer.trim() || 'NPC / Mestre',
        nex,
        rank: (manualAgentRank as any) || 'Recruta',
        originId: '',
        classId: '',
        trackId: '',
        affinity: 'Nenhum',
        attributes: { AGI: 2, FOR: 2, INT: 2, PRE: 2, VIG: 2 },
        pvCurrent: pv,
        pvMax: pv,
        peCurrent: pe,
        peMax: pe,
        sanCurrent: san,
        sanMax: san,
        defenseBonus: parseInt(manualAgentDef, 10) - 12 || 0,
        skills: {},
        entityIds: [],
        notes: '',
        updatedAt: new Date().toISOString(),
      };

      const link: CampaignAgentLink = {
        id: `link_${Date.now()}`,
        sourceType: 'manual_sheet',
        characterSheet: manualSheet,
        originalPlayerName: manualAgentPlayer.trim() || 'Mestre',
        linkedAt: new Date().toISOString(),
      };

      await addAgentToCampaign(activeCampaign.id, link);
      setAgentModalVisible(false);
      showAlert('Agente Adicionado', `"${manualAgentName}" foi adicionado à mesa com sucesso!`);
    } else if (agentAddMode === 'local') {
      const localChar = characters.find((c) => c.id === selectedLocalCharId);
      if (!localChar) {
        showAlert('Atenção', 'Selecione uma ficha para adicionar.');
        return;
      }

      const link: CampaignAgentLink = {
        id: `link_${Date.now()}`,
        sourceType: 'local_char',
        characterSheet: { ...localChar },
        originalPlayerName: localChar.player || 'Jogador Local',
        linkedAt: new Date().toISOString(),
      };

      await addAgentToCampaign(activeCampaign.id, link);
      setAgentModalVisible(false);
      showAlert('Ficha Conectada', `Ficha de "${localChar.name}" foi vinculada à campanha!`);
    } else if (agentAddMode === 'code') {
      if (!sharedCodeInput.trim()) {
        showAlert('Atenção', 'Cole o código de compartilhamento da ficha.');
        return;
      }

      const parsedSheet = parseAgentShareCode(sharedCodeInput.trim());
      if (!parsedSheet) {
        showAlert(
          'Código Inválido',
          'Não foi possível decodificar a ficha. Verifique se copiou o código completo (gerado pelo botão "Compartilhar Ficha" do jogador).'
        );
        return;
      }

      const link: CampaignAgentLink = {
        id: `link_${Date.now()}`,
        sourceType: 'shared_code',
        characterSheet: parsedSheet,
        originalPlayerName: parsedSheet.player || 'Convidado',
        shareCode: sharedCodeInput.trim(),
        linkedAt: new Date().toISOString(),
      };

      await addAgentToCampaign(activeCampaign.id, link);
      setAgentModalVisible(false);
      showAlert(
        'Agente Vinculado!',
        `Agente "${parsedSheet.name}" (Jogador: ${parsedSheet.player || 'Convidado'}) foi vinculado com sucesso à mesa!`
      );
    }
  };

  const handleAdjustAgentVital = async (
    link: CampaignAgentLink,
    field: 'pvCurrent' | 'peCurrent' | 'sanCurrent',
    delta: number
  ) => {
    if (!activeCampaign) return;
    const current = link.characterSheet[field] || 0;
    const maxField = field === 'pvCurrent' ? 'pvMax' : field === 'peCurrent' ? 'peMax' : 'sanMax';
    const max = link.characterSheet[maxField] || 999;
    const nextVal = Math.max(0, Math.min(max, current + delta));

    const updatedSheet: CharacterSheet = {
      ...link.characterSheet,
      [field]: nextVal,
      updatedAt: new Date().toISOString(),
    };

    await updateAgentInCampaign(activeCampaign.id, link.id, {
      characterSheet: updatedSheet,
    });
  };

  // Handlers de Combate & Iniciativa
  const handleAddAllToInitiative = async () => {
    if (!activeCampaign) return;

    const list: CampaignInitiativeEntry[] = [];

    // Adiciona agentes
    for (const ag of activeCampaign.agents) {
      const agi = ag.characterSheet.attributes.AGI || 1;
      const roll = rollOrdemTest(agi, 0, `Iniciativa: ${ag.characterSheet.name}`);
      list.push({
        id: `init_ag_${ag.id}`,
        name: ag.characterSheet.name,
        type: 'agent',
        refId: ag.id,
        initiative: roll.total,
      });
    }

    // Adiciona monstros
    for (const mon of activeCampaign.monsters) {
      const roll = rollFormula('1d20+5', `Iniciativa: ${mon.name}`);
      list.push({
        id: `init_mon_${mon.id}`,
        name: mon.name,
        type: 'monster',
        refId: mon.id,
        initiative: roll.total,
      });
    }

    list.sort((a, b) => b.initiative - a.initiative);
    await setInitiativesInCampaign(activeCampaign.id, list, 0);
  };

  const handleSetManualInitiative = async (entry: CampaignInitiativeEntry, valStr: string) => {
    if (!activeCampaign) return;
    const num = parseInt(valStr, 10);
    if (isNaN(num)) return;

    const updated = activeCampaign.initiatives.map((item) =>
      item.id === entry.id ? { ...item, initiative: num, manualOverride: true } : item
    );
    updated.sort((a, b) => b.initiative - a.initiative);
    await setInitiativesInCampaign(activeCampaign.id, updated);
  };

  const handleNextTurn = async () => {
    if (!activeCampaign || activeCampaign.initiatives.length === 0) return;
    const nextIndex = ((activeCampaign.currentTurnIndex || 0) + 1) % activeCampaign.initiatives.length;
    await setInitiativesInCampaign(activeCampaign.id, activeCampaign.initiatives, nextIndex);
  };

  const handleClearInitiative = async () => {
    if (!activeCampaign) return;
    await setInitiativesInCampaign(activeCampaign.id, [], 0);
  };

  return (
    <View style={styles.container}>
      {/* Top Header / Seletor de Campanhas */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Painel do Mestre</Text>
            <Text style={styles.headerSub}>Gerenciamento de Campanhas, Ameaças & Mesas</Text>
          </View>

          <View style={styles.headerButtonsRow}>
            <TouchableOpacity
              style={[styles.actionPillBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/(tabs)/table')}
              accessibilityLabel="Abrir Mesa Virtual"
            >
              <Ionicons name="radio" size={16} color="#FFF" />
              <Text style={styles.actionPillBtnTextWhite}>Mesa VTT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={() => openManual('characters')}
              accessibilityLabel="Manual do Mestre"
            >
              <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionPillBtn, { backgroundColor: colors.primary }]}
              onPress={handleOpenCreateCampaign}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.actionPillBtnTextWhite}>Nova Campanha</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scroll Horizontal de Campanhas */}
        {campaigns.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.campaignsPillsScroll}
          >
            {campaigns.map((camp) => {
              const isSelected = camp.id === (activeCampaign?.id || '');
              return (
                <TouchableOpacity
                  key={camp.id}
                  style={[styles.campaignPill, isSelected && styles.campaignPillActive]}
                  onPress={() => setActiveCampaignId(camp.id)}
                >
                  <Ionicons
                    name={isSelected ? 'shield' : 'shield-outline'}
                    size={16}
                    color={isSelected ? '#FFF' : colors.primary}
                  />
                  <Text style={[styles.campaignPillText, isSelected && styles.campaignPillTextActive]}>
                    {camp.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Conteúdo Principal */}
      {!activeCampaign ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="skull-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nenhuma Campanha Ativa</Text>
          <Text style={styles.emptySub}>
            Crie sua primeira campanha para gerenciar monstros, pistas da história, cenas e conectar os agentes dos jogadores.
          </Text>
          <TouchableOpacity style={styles.bigCreateBtn} onPress={handleOpenCreateCampaign}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.bigCreateBtnText}>Criar Campanha da Ordem</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Card Resumo da Campanha Ativa */}
          <View style={styles.activeCampaignBanner}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.campBannerTitle}>{activeCampaign.title}</Text>
                {activeCampaign.threatLevel && (
                  <View style={styles.threatBadge}>
                    <Text style={styles.threatBadgeText}>{activeCampaign.threatLevel}</Text>
                  </View>
                )}
              </View>
              {activeCampaign.subtitle ? (
                <Text style={styles.campBannerSub}>{activeCampaign.subtitle}</Text>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={styles.iconCircleBtn} onPress={handleOpenEditCampaign}>
                <Ionicons name="settings-outline" size={17} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconCircleBtn} onPress={handleDeleteCampaign}>
                <Ionicons name="trash-outline" size={17} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sub Navigation Bar */}
          <View style={styles.subTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subTabsRow}
            >
              {[
                { id: 'stories' as const, label: 'História & Cenas', icon: 'book-outline', badge: activeCampaign.stories?.length || 0 },
                { id: 'monsters' as const, label: 'Ameaças & Monstros', icon: 'skull-outline', badge: activeCampaign.monsters?.length || 0 },
                { id: 'agents' as const, label: 'Agentes da Mesa', icon: 'people-outline', badge: activeCampaign.agents?.length || 0 },
                { id: 'combat' as const, label: 'Combate & Turnos', icon: 'flash-outline', badge: activeCampaign.initiatives?.length || 0 },
              ].map((tab) => {
                const active = activeSubTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.subTabBtn, active && styles.subTabBtnActive]}
                    onPress={() => setActiveSubTab(tab.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  >
                    <Ionicons name={tab.icon as any} size={16} color={active ? colors.primary : colors.textMuted} />
                    <Text style={[styles.subTabBtnText, active && styles.subTabBtnTextActive]} numberOfLines={1}>
                      {tab.label}
                    </Text>
                    {tab.badge > 0 && (
                      <View style={[styles.subTabBadge, active && styles.subTabBadgeActive]}>
                        <Text style={[styles.subTabBadgeText, active && styles.subTabBadgeTextActive]}>
                          {tab.badge}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Sub-Aba 1: História & Cenas */}
          {activeSubTab === 'stories' && (
            <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 80 }]}>
              {/* Sinopse / Anotações do Mestre */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Anotações Secretas do Mestre</Text>
                  <Ionicons name="eye-off-outline" size={18} color={colors.primary} />
                </View>
                <TextInput
                  style={styles.masterNotesInput}
                  multiline
                  placeholder="Escreva aqui segredos da missão, revelações, enigmas e pistas que os jogadores ainda não descobriram..."
                  placeholderTextColor={colors.textMuted}
                  value={activeCampaign.masterNotes || ''}
                  onChangeText={async (txt) => {
                    await upsertCampaign({
                      ...activeCampaign,
                      masterNotes: txt,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                />
              </View>

              {/* Lista de Cenas & Pistas */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Cenas Investigativas & Pistas</Text>
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenCreateScene}>
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.smallAddBtnText}>Nova Cena</Text>
                </TouchableOpacity>
              </View>

              {activeCampaign.stories.length === 0 ? (
                <View style={styles.subEmptyCard}>
                  <Text style={styles.subEmptyText}>Nenhuma cena cadastrada.</Text>
                  <TouchableOpacity style={styles.linkActionText} onPress={handleOpenCreateScene}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Adicionar Cena 1</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                activeCampaign.stories.map((scene, idx) => {
                  const openScenePreview = () =>
                    openRecordPreview({
                      target: { kind: 'campaign_scene', scene },
                      primaryAction: {
                        label: 'Editar Cena',
                        icon: 'create-outline',
                        onPress: () => handleOpenEditScene(scene),
                      },
                    });

                  return (
                    <TouchableOpacity
                      key={scene.id}
                      style={styles.sceneCard}
                      activeOpacity={0.92}
                      onLongPress={openScenePreview}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      testID={`master-scene-${scene.id}`}
                    >
                      <View style={styles.sceneCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sceneNumber}>Cena {idx + 1}</Text>
                          <Text style={styles.sceneTitle}>{scene.title}</Text>
                          {scene.summary ? <Text style={styles.sceneSummary}>{scene.summary}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openScenePreview();
                            }}
                            testID={`master-scene-info-${scene.id}`}
                          >
                            <Ionicons name="information-circle-outline" size={14} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconCircleBtnSmall} onPress={() => handleOpenEditScene(scene)}>
                            <Ionicons name="pencil" size={14} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={() => deleteStorySceneFromCampaign(activeCampaign.id, scene.id)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {scene.details ? (
                        <Text style={styles.sceneDetails}>{scene.details}</Text>
                      ) : null}

                      {/* Pistas */}
                      <View style={styles.cluesWrap}>
                        <Text style={styles.cluesHeading}>Pistas & Documentos ({scene.clues.length}):</Text>
                        {scene.clues.map((clue) => (
                          <TouchableOpacity
                            key={clue.id}
                            style={styles.clueRow}
                            onPress={async () => {
                              const updatedClues = scene.clues.map((c) =>
                                c.id === clue.id ? { ...c, isFound: !c.isFound } : c
                              );
                              await updateStorySceneInCampaign(activeCampaign.id, scene.id, { clues: updatedClues });
                            }}
                          >
                            <Ionicons
                              name={clue.isFound ? 'checkbox' : 'square-outline'}
                              size={18}
                              color={clue.isFound ? '#10B981' : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.clueText,
                                clue.isFound && { textDecorationLine: 'line-through', color: colors.textMuted },
                              ]}
                            >
                              {clue.text}
                            </Text>
                            {clue.isFound ? (
                              <View style={styles.foundBadge}>
                                <Text style={styles.foundBadgeText}>Encontrada</Text>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Sub-Aba 2: Ameaças & Monstros */}
          {activeSubTab === 'monsters' && (
            <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 80 }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Ameaças da Sessão</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.smallAddBtn, { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => setImportCompendiumMonsterModal(true)}
                  >
                    <Ionicons name="search" size={15} color={colors.text} />
                    <Text style={[styles.smallAddBtnText, { color: colors.text }]}>Compêndio</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenCreateMonster}>
                    <Ionicons name="add" size={15} color="#FFF" />
                    <Text style={styles.smallAddBtnText}>Criar Ameaça</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {activeCampaign.monsters.length === 0 ? (
                <View style={styles.subEmptyCard}>
                  <Ionicons name="skull-outline" size={42} color={colors.textMuted} />
                  <Text style={styles.subEmptyText}>Nenhuma criatura ou ameaça na sessão.</Text>
                  <Text style={styles.subEmptySubText}>
                    Importe criaturas oficiais do Compêndio ou cadastre uma ameaça customizada.
                  </Text>
                </View>
              ) : (
                activeCampaign.monsters.map((mon) => {
                  const pvPercent = Math.max(0, Math.min(100, (mon.pvCurrent / (mon.pvMax || 1)) * 100));
                  const openMonsterPreview = () =>
                    openRecordPreview({
                      target: { kind: 'campaign_monster', monster: mon },
                      primaryAction: {
                        label: 'Editar Ameaça',
                        icon: 'create-outline',
                        onPress: () => handleOpenEditMonster(mon),
                      },
                    });

                  return (
                    <TouchableOpacity
                      key={mon.id}
                      style={styles.monsterCard}
                      activeOpacity={0.92}
                      onLongPress={openMonsterPreview}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      testID={`master-monster-${mon.id}`}
                    >
                      <View style={styles.monsterCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.monsterName}>{mon.name}</Text>
                            <View style={[styles.elementPill, { borderColor: colors.primary }]}>
                              <Text style={[styles.elementPillText, { color: colors.primary }]}>
                                {mon.element || 'Nenhum'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.monsterMeta}>
                            VD {mon.vd} • Defesa {mon.defense} • Presença: {mon.disturbingPresence || 'Nenhuma'}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openMonsterPreview();
                            }}
                            accessibilityLabel="Inspecionar Ameaça"
                            testID={`master-monster-info-${mon.id}`}
                          >
                            <Ionicons name="information-circle-outline" size={14} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={() => handleSaveMonsterToGeneralCompendium(mon)}
                            accessibilityLabel="Salvar no Compêndio Geral"
                          >
                            <Ionicons name="bookmark-outline" size={14} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconCircleBtnSmall} onPress={() => handleOpenEditMonster(mon)}>
                            <Ionicons name="pencil" size={14} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={() => deleteMonsterFromCampaign(activeCampaign.id, mon.id)}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Barra de PV */}
                      <View style={styles.pvBarWrap}>
                        <View style={styles.pvBarRow}>
                          <Text style={styles.pvBarLabel}>Pontos de Vida:</Text>
                          <Text style={styles.pvBarValue}>
                            {mon.pvCurrent} / {mon.pvMax} ({Math.round(pvPercent)}%)
                          </Text>
                        </View>
                        <View style={styles.pvProgressBarBg}>
                          <View
                            style={[
                              styles.pvProgressBarFill,
                              {
                                width: `${pvPercent}%`,
                                backgroundColor: pvPercent < 25 ? '#EF4444' : pvPercent < 50 ? '#F59E0B' : '#10B981',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Botões Rápidos de Dano / Cura */}
                      <View style={styles.pvAdjustRow}>
                        {[-10, -5, -1, +1, +5, +10].map((delta) => (
                          <TouchableOpacity
                            key={delta}
                            style={[
                              styles.pvAdjustBtn,
                              delta < 0 ? styles.pvAdjustBtnMinus : styles.pvAdjustBtnPlus,
                            ]}
                            onPress={() => handleAdjustMonsterPV(mon, delta)}
                          >
                            <Text
                              style={[
                                styles.pvAdjustBtnText,
                                delta < 0 ? { color: '#EF4444' } : { color: '#10B981' },
                              ]}
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Ataques e Habilidades */}
                      {mon.attacks ? (
                        <View style={styles.detailBox}>
                          <Text style={styles.detailBoxTitle}>Ataques & Ações:</Text>
                          <Text style={styles.detailBoxContent}>{mon.attacks}</Text>
                        </View>
                      ) : null}

                      {mon.abilities ? (
                        <View style={styles.detailBox}>
                          <Text style={styles.detailBoxTitle}>Habilidades Especiais:</Text>
                          <Text style={styles.detailBoxContent}>{mon.abilities}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Sub-Aba 3: Agentes da Mesa */}
          {activeSubTab === 'agents' && (
            <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 80 }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Investigadores na Mesa</Text>
                <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenAddAgent}>
                  <Ionicons name="person-add" size={15} color="#FFF" />
                  <Text style={styles.smallAddBtnText}>Adicionar Agente</Text>
                </TouchableOpacity>
              </View>

              {activeCampaign.agents.length === 0 ? (
                <View style={styles.subEmptyCard}>
                  <Ionicons name="people-outline" size={42} color={colors.textMuted} />
                  <Text style={styles.subEmptyText}>Nenhum agente cadastrado nesta mesa.</Text>
                  <Text style={styles.subEmptySubText}>
                    Adicione agentes manualmente, selecione de suas fichas locais ou vincule pelo código de compartilhamento de outro jogador!
                  </Text>
                </View>
              ) : (
                activeCampaign.agents.map((link) => {
                  const sheet = link.characterSheet;
                  const def = 10 + (sheet.attributes?.AGI || 0) + (sheet.defenseBonus || 0);
                  const openAgentPreview = () =>
                    openRecordPreview({
                      target: { kind: 'character', character: sheet },
                    });

                  return (
                    <TouchableOpacity
                      key={link.id}
                      style={styles.agentCard}
                      activeOpacity={0.92}
                      onLongPress={openAgentPreview}
                      delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                      testID={`master-agent-${link.id}`}
                    >
                      <View style={styles.agentCardTop}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.agentName}>{sheet.name}</Text>
                            <View
                              style={[
                                styles.sourceBadge,
                                link.sourceType === 'shared_code'
                                  ? { backgroundColor: '#3B82F622', borderColor: '#3B82F6' }
                                  : { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.sourceBadgeText,
                                  link.sourceType === 'shared_code' && { color: '#3B82F6' },
                                ]}
                              >
                                {link.sourceType === 'shared_code'
                                  ? `Conectado (${link.originalPlayerName || 'Jogador'})`
                                  : link.sourceType === 'local_char'
                                  ? 'Ficha Local'
                                  : 'Manual / NPC'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.agentMeta}>
                            NEX {sheet.nex}% • {sheet.rank} • DEF {def}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              openAgentPreview();
                            }}
                            accessibilityLabel="Inspecionar Ficha do Agente"
                            testID={`master-agent-info-${link.id}`}
                          >
                            <Ionicons name="information-circle-outline" size={15} color={colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={() => setSkillRollAgent(link)}
                            accessibilityLabel="Rolar Teste do Agente"
                          >
                            <Ionicons name="dice-outline" size={15} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconCircleBtnSmall}
                            onPress={() => deleteAgentFromCampaign(activeCampaign.id, link.id)}
                          >
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Status Vitais */}
                      <View style={styles.agentVitalsGrid}>
                        {/* PV */}
                        <View style={[styles.vitalBox, { borderColor: '#EF4444' }]}>
                          <Text style={[styles.vitalLabel, { color: '#EF4444' }]}>PV</Text>
                          <Text style={styles.vitalValue}>{sheet.pvCurrent}/{sheet.pvMax}</Text>
                          <View style={styles.vitalBtnsRow}>
                            <TouchableOpacity
                              style={styles.vitalBtn}
                              onPress={() => handleAdjustAgentVital(link, 'pvCurrent', -1)}
                            >
                              <Text style={styles.vitalBtnText}>-1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.vitalBtn}
                              onPress={() => handleAdjustAgentVital(link, 'pvCurrent', +1)}
                            >
                              <Text style={styles.vitalBtnText}>+1</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* PE */}
                        <View style={[styles.vitalBox, { borderColor: '#F59E0B' }]}>
                          <Text style={[styles.vitalLabel, { color: '#F59E0B' }]}>PE</Text>
                          <Text style={styles.vitalValue}>{sheet.peCurrent}/{sheet.peMax}</Text>
                          <View style={styles.vitalBtnsRow}>
                            <TouchableOpacity
                              style={styles.vitalBtn}
                              onPress={() => handleAdjustAgentVital(link, 'peCurrent', -1)}
                            >
                              <Text style={styles.vitalBtnText}>-1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.vitalBtn}
                              onPress={() => handleAdjustAgentVital(link, 'peCurrent', +1)}
                            >
                              <Text style={styles.vitalBtnText}>+1</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* SAN */}
                        <View style={[styles.vitalBox, { borderColor: '#38BDF8' }]}>
                          <Text style={[styles.vitalLabel, { color: '#38BDF8' }]}>SAN</Text>
                          <Text style={styles.vitalValue}>{sheet.sanCurrent}/{sheet.sanMax}</Text>
                          <View style={styles.vitalBtnsRow}>
                            <TouchableOpacity
                              style={styles.vitalBtn}
                              onPress={() => handleAdjustAgentVital(link, 'sanCurrent', -1)}
                            >
                              <Text style={styles.vitalBtnText}>-1</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.vitalBtn}
                              onPress={() => handleAdjustAgentVital(link, 'sanCurrent', +1)}
                            >
                              <Text style={styles.vitalBtnText}>+1</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Atributos Rápidos */}
                      <View style={styles.attrsRow}>
                        {['AGI', 'FOR', 'INT', 'PRE', 'VIG'].map((attrKey) => (
                          <View key={attrKey} style={styles.attrPill}>
                            <Text style={styles.attrPillLabel}>{attrKey}</Text>
                            <Text style={styles.attrPillVal}>
                              {(sheet.attributes as any)?.[attrKey] || 1}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Sub-Aba 4: Combate & Iniciativa */}
          {activeSubTab === 'combat' && (
            <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 80 }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Rastreador de Turnos & Iniciativa</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={styles.smallAddBtn} onPress={handleAddAllToInitiative}>
                    <Ionicons name="dice" size={15} color="#FFF" />
                    <Text style={styles.smallAddBtnText}>Rolar Geral</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallAddBtn, { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border }]}
                    onPress={handleClearInitiative}
                  >
                    <Text style={[styles.smallAddBtnText, { color: colors.textSecondary }]}>Limpar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Controles de Turno */}
              {activeCampaign.initiatives.length > 0 && (
                <View style={styles.turnControlBar}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.turnLabel}>
                      Turno Atual: #{((activeCampaign.currentTurnIndex || 0) + 1)} de {activeCampaign.initiatives.length}
                    </Text>
                    <Text style={styles.turnActiveName}>
                      {activeCampaign.initiatives[activeCampaign.currentTurnIndex || 0]?.name || ''}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.nextTurnBtn} onPress={handleNextTurn}>
                    <Text style={styles.nextTurnBtnText}>Próximo Turno</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Lista Ordenada de Iniciativas */}
              {activeCampaign.initiatives.length === 0 ? (
                <View style={styles.subEmptyCard}>
                  <Ionicons name="list-outline" size={42} color={colors.textMuted} />
                  <Text style={styles.subEmptyText}>Nenhum participante na ordem de iniciativa.</Text>
                  <Text style={styles.subEmptySubText}>
                    Clique em "Rolar Geral" para puxar todos os agentes e monstros, ou insira manualmente os valores tirados na mesa física!
                  </Text>
                </View>
              ) : (
                activeCampaign.initiatives.map((entry, idx) => {
                  const isCurrent = idx === (activeCampaign.currentTurnIndex || 0);
                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.initRow,
                        isCurrent && styles.initRowCurrent,
                        entry.type === 'monster' && styles.initRowMonster,
                      ]}
                    >
                      <View style={styles.initOrderBadge}>
                        <Text style={styles.initOrderBadgeText}>{idx + 1}º</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.initName, isCurrent && { color: colors.primary, fontWeight: '900' }]}>
                          {entry.name}
                        </Text>
                        <Text style={styles.initType}>
                          {entry.type === 'monster' ? 'Ameaça / Monstro' : 'Agente / Investigador'}
                          {entry.manualOverride ? ' • Manual (Mesa física)' : ''}
                        </Text>
                      </View>

                      {/* Campo para digitar ou alterar iniciativa manualmente */}
                      <View style={styles.initInputWrap}>
                        <Text style={styles.initInputLabel}>Inic:</Text>
                        <TextInput
                          style={styles.initInputField}
                          keyboardType="numeric"
                          defaultValue={String(entry.initiative)}
                          onEndEditing={(e) => handleSetManualInitiative(entry, e.nativeEvent.text)}
                        />
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* MODAL: Nova / Editar Campanha */}
      <Modal visible={campaignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCampaignId ? 'Editar Campanha' : 'Nova Campanha'}
              </Text>
              <TouchableOpacity onPress={() => setCampaignModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Título da Campanha *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Operação Crisálida, O Segredo da Floresta..."
                placeholderTextColor={colors.textMuted}
                value={campTitle}
                onChangeText={setCampTitle}
              />

              <Text style={styles.fieldLabel}>Subtítulo / Local da Missão</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Santo Berço • Serra Fluminense"
                placeholderTextColor={colors.textMuted}
                value={campSubtitle}
                onChangeText={setCampSubtitle}
              />

              <Text style={styles.fieldLabel}>Nível de Ameaça Recomendado</Text>
              <View style={styles.threatLevelsRow}>
                {THREAT_LEVELS.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[styles.threatPill, campThreat === lvl && styles.threatPillActive]}
                    onPress={() => setCampThreat(lvl)}
                  >
                    <Text style={[styles.threatPillText, campThreat === lvl && styles.threatPillTextActive]}>
                      {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Patente Recomendada</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Recruta, Operador, Agente Especial..."
                placeholderTextColor={colors.textMuted}
                value={campRank}
                onChangeText={setCampRank}
              />

              <Text style={styles.fieldLabel}>Sinopse / Descrição da Missão</Text>
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Breve resumo da investigação..."
                placeholderTextColor={colors.textMuted}
                value={campDesc}
                onChangeText={setCampDesc}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCampaignModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCampaign}>
                <Text style={styles.confirmBtnText}>Salvar Campanha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Nova / Editar Cena de História */}
      <Modal visible={sceneModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSceneId ? 'Editar Cena' : 'Nova Cena Investigativa'}
              </Text>
              <TouchableOpacity onPress={() => setSceneModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Título da Cena *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Chegada à Mansão Abandonada"
                placeholderTextColor={colors.textMuted}
                value={sceneTitle}
                onChangeText={setSceneTitle}
              />

              <Text style={styles.fieldLabel}>Resumo da Cena</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Os agentes vasculham o sótão em busca do diário."
                placeholderTextColor={colors.textMuted}
                value={sceneSummary}
                onChangeText={setSceneSummary}
              />

              <Text style={styles.fieldLabel}>Detalhes & Descrição para o Mestre Narrar</Text>
              <TextInput
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                multiline
                placeholder="O cheiro de mofo é forte, as tábuas rangem sob os passos..."
                placeholderTextColor={colors.textMuted}
                value={sceneDetails}
                onChangeText={setSceneDetails}
              />

              {/* Pistas */}
              <Text style={styles.fieldLabel}>Pistas desta Cena</Text>
              <View style={styles.addClueRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Nova pista ou documento..."
                  placeholderTextColor={colors.textMuted}
                  value={newClueText}
                  onChangeText={setNewClueText}
                />
                <TouchableOpacity style={styles.addClueBtn} onPress={handleAddClueToEditingScene}>
                  <Ionicons name="add" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>

              {sceneClues.map((clue) => (
                <View key={clue.id} style={styles.modalClueItem}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}
                    onPress={() => handleToggleClueFound(clue.id)}
                  >
                    <Ionicons
                      name={clue.isFound ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={clue.isFound ? '#10B981' : colors.textMuted}
                    />
                    <Text style={[styles.clueText, clue.isFound && { textDecorationLine: 'line-through' }]}>
                      {clue.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveClue(clue.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSceneModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveScene}>
                <Text style={styles.confirmBtnText}>Salvar Cena</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Nova / Editar Ameaça */}
      <Modal visible={monsterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMonsterId ? 'Editar Ameaça' : 'Cadastrar Ameaça'}
              </Text>
              <TouchableOpacity onPress={() => setMonsterModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Nome do Monstro / Ameaça *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Aberração de Sangue, Zumbi Ocultista..."
                placeholderTextColor={colors.textMuted}
                value={monName}
                onChangeText={setMonName}
              />

              <View style={styles.multiFieldsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>VD *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={monVD}
                    onChangeText={setMonVD}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>PV Máximo *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={monPV}
                    onChangeText={setMonPV}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Defesa *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={monDef}
                    onChangeText={setMonDef}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Elemento Paranormal</Text>
              <View style={styles.threatLevelsRow}>
                {['Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo', 'Nenhum'].map((elem) => (
                  <TouchableOpacity
                    key={elem}
                    style={[styles.threatPill, monElement === elem && styles.threatPillActive]}
                    onPress={() => setMonElement(elem)}
                  >
                    <Text style={[styles.threatPillText, monElement === elem && styles.threatPillTextActive]}>
                      {elem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Presença Perturbadora</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: DT 13 • 1d6 mental"
                placeholderTextColor={colors.textMuted}
                value={monPresence}
                onChangeText={setMonPresence}
              />

              <Text style={styles.fieldLabel}>Ataques & Ações de Combate</Text>
              <TextInput
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ex: Mordida 2d20+10 (2d8+5 corte) • Presas Venenosas"
                placeholderTextColor={colors.textMuted}
                value={monAttacks}
                onChangeText={setMonAttacks}
              />

              <Text style={styles.fieldLabel}>Habilidades & Resistências</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ex: Resistência a Balístico 5, Vulnerabilidade a Fogo..."
                placeholderTextColor={colors.textMuted}
                value={monAbilities}
                onChangeText={setMonAbilities}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMonsterModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveMonster}>
                <Text style={styles.confirmBtnText}>Salvar Monstro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Importar Criatura Oficial do Compêndio */}
      <Modal visible={importCompendiumMonsterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Importar Criatura do Compêndio</Text>
              <TouchableOpacity onPress={() => setImportCompendiumMonsterModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              <TextInput
                style={styles.input}
                placeholder="Buscar por nome, elemento ou VD..."
                placeholderTextColor={colors.textMuted}
                value={compendiumSearchQuery}
                onChangeText={setCompendiumSearchQuery}
              />
            </View>

            <FlatList
              data={filteredCompendiumCreatures}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => {
                const openCreaturePreview = () =>
                  openEntityPreview(item, {
                    primaryAction: {
                      label: 'Importar para Campanha',
                      onPress: () => handleImportCompendiumCreature(item),
                    },
                  });

                return (
                  <TouchableOpacity
                    style={styles.compendiumCreatureRow}
                    onPress={() => handleImportCompendiumCreature(item)}
                    onLongPress={openCreaturePreview}
                    delayLongPress={DEFAULT_LONG_PRESS_DELAY}
                    testID={`master-comp-creature-${item.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compendiumCreatureName}>{item.name}</Text>
                      <Text style={styles.compendiumCreatureMeta}>
                        VD {item.vd || '?'} • {item.element || 'Neutro'} • PV {item.pv || '?'} • Def {item.defense || '?'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openCreaturePreview();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        testID={`master-comp-creature-info-${item.id}`}
                      >
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Ionicons name="add-circle" size={24} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL: Adicionar Agente (Manual / Local / Código) */}
      <Modal visible={agentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Agente à Mesa</Text>
              <TouchableOpacity onPress={() => setAgentModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Abas do Tipo de Adição */}
            <View style={styles.agentTypeTabsRow}>
              {[
                { id: 'manual' as const, label: 'Manual / NPC' },
                { id: 'local' as const, label: 'Meus Agentes' },
                { id: 'code' as const, label: 'Vincular Código' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.agentTypeTab, agentAddMode === tab.id && styles.agentTypeTabActive]}
                  onPress={() => setAgentAddMode(tab.id)}
                >
                  <Text
                    style={[
                      styles.agentTypeTabText,
                      agentAddMode === tab.id && styles.agentTypeTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {agentAddMode === 'manual' && (
                <>
                  <Text style={styles.fieldLabel}>Nome do Agente ou NPC *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Sargento Rodrigues, Dr. Fernando..."
                    placeholderTextColor={colors.textMuted}
                    value={manualAgentName}
                    onChangeText={setManualAgentName}
                  />

                  <Text style={styles.fieldLabel}>Jogador (ou 'NPC do Mestre')</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Carlos ou NPC"
                    placeholderTextColor={colors.textMuted}
                    value={manualAgentPlayer}
                    onChangeText={setManualAgentPlayer}
                  />

                  <View style={styles.multiFieldsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>NEX (%)</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualAgentNex}
                        onChangeText={setManualAgentNex}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Patente</Text>
                      <TextInput
                        style={styles.input}
                        value={manualAgentRank}
                        onChangeText={setManualAgentRank}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Defesa</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualAgentDef}
                        onChangeText={setManualAgentDef}
                      />
                    </View>
                  </View>

                  <View style={styles.multiFieldsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>PV Máx</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualAgentPV}
                        onChangeText={setManualAgentPV}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>PE Máx</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualAgentPE}
                        onChangeText={setManualAgentPE}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>SAN Máx</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualAgentSAN}
                        onChangeText={setManualAgentSAN}
                      />
                    </View>
                  </View>
                </>
              )}

              {agentAddMode === 'local' && (
                <>
                  <Text style={styles.fieldLabel}>Escolha uma das suas fichas salvas:</Text>
                  {characters.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, marginVertical: 10 }}>
                      Você não possui fichas salvas na aba de Agentes. Crie uma ficha lá ou utilize o cadastro manual acima.
                    </Text>
                  ) : (
                    characters.map((char) => {
                      const isSel = selectedLocalCharId === char.id;
                      return (
                        <TouchableOpacity
                          key={char.id}
                          style={[styles.charSelectPill, isSel && styles.charSelectPillActive]}
                          onPress={() => setSelectedLocalCharId(char.id)}
                        >
                          <Ionicons
                            name={isSel ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSel ? colors.primary : colors.textMuted}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.charSelectName}>{char.name}</Text>
                            <Text style={styles.charSelectMeta}>
                              NEX {char.nex}% • {char.rank}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              )}

              {agentAddMode === 'code' && (
                <>
                  <Text style={styles.fieldLabel}>
                    Cole o Código de Compartilhamento gerado pelo jogador:
                  </Text>
                  <Text style={styles.hintText}>
                    O jogador toca no botão "Compartilhar Ficha" no celular dele e envia o código para você por WhatsApp ou Discord.
                  </Text>
                  <TextInput
                    style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
                    multiline
                    placeholder="ORDO-AG-v1:eyJpZCI6..."
                    placeholderTextColor={colors.textMuted}
                    value={sharedCodeInput}
                    onChangeText={setSharedCodeInput}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAgentModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveAgent}>
                <Text style={styles.confirmBtnText}>Adicionar Agente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Rolador Rápido de Testes para Agente */}
      <Modal visible={Boolean(skillRollAgent)} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Testes: {skillRollAgent?.characterSheet.name}
              </Text>
              <TouchableOpacity onPress={() => setSkillRollAgent(null)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Rolar Teste de Atributo:</Text>
              <View style={styles.attrsRollGrid}>
                {['AGI', 'FOR', 'INT', 'PRE', 'VIG'].map((attr) => {
                  const val = (skillRollAgent?.characterSheet.attributes as any)?.[attr] || 1;
                  return (
                    <TouchableOpacity
                      key={attr}
                      style={styles.attrRollBtn}
                      onPress={() => {
                        rollOrdemTest(val, 0, `${skillRollAgent?.characterSheet.name}: Teste de ${attr}`);
                        setSkillRollAgent(null);
                      }}
                    >
                      <Text style={styles.attrRollBtnLabel}>{attr}</Text>
                      <Text style={styles.attrRollBtnVal}>{val}d20</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Perícias com Treinamento:</Text>
              {Object.entries(skillRollAgent?.characterSheet.skills || {})
                .filter(([_, sk]) => sk.degree > 0 || sk.bonus > 0)
                .map(([name, sk]) => (
                  <TouchableOpacity
                    key={name}
                    style={styles.skillQuickRow}
                    onPress={() => {
                      rollOrdemTest(2, sk.bonus, `${skillRollAgent?.characterSheet.name}: ${name}`);
                      setSkillRollAgent(null);
                    }}
                  >
                    <Text style={styles.skillQuickName}>{name}</Text>
                    <Text style={styles.skillQuickBonus}>+{sk.bonus}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 8,
      gap: 10,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
    },
    headerSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    headerButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionPillBtnTextWhite: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    campaignsPillsScroll: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    campaignPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    campaignPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    campaignPillText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    campaignPillTextActive: {
      color: '#FFF',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
    },
    emptySub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    bigCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 8,
    },
    bigCreateBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 14,
    },
    activeCampaignBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    campBannerTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
    },
    campBannerSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    threatBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    threatBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
    },
    iconCircleBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleBtnSmall: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subTabsContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    subTabsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      gap: 6,
    },
    subTabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderBottomWidth: 2,
      borderColor: 'transparent',
    },
    subTabBtnActive: {
      borderColor: colors.primary,
    },
    subTabBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    subTabBtnTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    subTabBadge: {
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    subTabBadgeActive: {
      backgroundColor: colors.primarySoft,
    },
    subTabBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    subTabBadgeTextActive: {
      color: colors.primary,
    },
    tabContent: {
      padding: 14,
      gap: 14,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 10,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: colors.text,
    },
    smallAddBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    smallAddBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    masterNotesInput: {
      color: colors.text,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 10,
      minHeight: 80,
      textAlignVertical: 'top',
      fontSize: 13,
      lineHeight: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subEmptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
      gap: 6,
    },
    subEmptyText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    subEmptySubText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
    linkActionText: {
      marginTop: 6,
    },
    sceneCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    sceneCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    sceneNumber: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
      textTransform: 'uppercase',
    },
    sceneTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginTop: 1,
    },
    sceneSummary: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sceneDetails: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      borderRadius: 8,
    },
    cluesWrap: {
      marginTop: 6,
      gap: 6,
    },
    cluesHeading: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    clueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceElevated,
      padding: 8,
      borderRadius: 8,
    },
    clueText: {
      flex: 1,
      fontSize: 12,
      color: colors.text,
    },
    foundBadge: {
      backgroundColor: '#10B98122',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    foundBadgeText: {
      fontSize: 10,
      color: '#10B981',
      fontWeight: '800',
    },
    monsterCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    monsterCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    monsterName: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
    },
    elementPill: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    elementPillText: {
      fontSize: 10,
      fontWeight: '800',
    },
    monsterMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pvBarWrap: {
      gap: 4,
    },
    pvBarRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pvBarLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    pvBarValue: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    pvProgressBarBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    pvProgressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    pvAdjustRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 6,
    },
    pvAdjustBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
    },
    pvAdjustBtnMinus: {
      borderColor: '#EF444444',
    },
    pvAdjustBtnPlus: {
      borderColor: '#10B98144',
    },
    pvAdjustBtnText: {
      fontSize: 12,
      fontWeight: '900',
    },
    detailBox: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 8,
      gap: 4,
    },
    detailBoxTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    detailBoxContent: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    agentCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    agentCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    agentName: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
    },
    sourceBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    sourceBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    agentMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    agentVitalsGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    vitalBox: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      alignItems: 'center',
      gap: 4,
    },
    vitalLabel: {
      fontSize: 11,
      fontWeight: '900',
    },
    vitalValue: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.text,
    },
    vitalBtnsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    vitalBtn: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    vitalBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.text,
    },
    attrsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 6,
    },
    attrPill: {
      alignItems: 'center',
    },
    attrPillLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    attrPillVal: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.text,
    },
    turnControlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    turnLabel: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    turnActiveName: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
    },
    nextTurnBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    nextTurnBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 13,
    },
    initRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      gap: 10,
    },
    initRowCurrent: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceElevated,
    },
    initRowMonster: {
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
    },
    initOrderBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initOrderBadgeText: {
      fontSize: 12,
      fontWeight: '900',
      color: colors.text,
    },
    initName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    initType: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    initInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    initInputLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    initInputField: {
      width: 44,
      height: 32,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      textAlign: 'center',
      fontWeight: '900',
      fontSize: 13,
      color: colors.text,
      padding: 0,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: colors.text,
    },
    modalBody: {
      padding: 16,
      gap: 10,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      padding: 14,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontWeight: '700',
      fontSize: 13,
    },
    confirmBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
    },
    confirmBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 13,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: colors.text,
      fontSize: 13,
    },
    multiFieldsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    threatLevelsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    threatPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    threatPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    threatPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    threatPillTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    addClueRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    addClueBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalClueItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      padding: 10,
      borderRadius: 8,
      gap: 6,
    },
    compendiumCreatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      gap: 10,
    },
    compendiumCreatureName: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    compendiumCreatureMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    agentTypeTabsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    agentTypeTab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderColor: 'transparent',
    },
    agentTypeTabActive: {
      borderColor: colors.primary,
    },
    agentTypeTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    agentTypeTabTextActive: {
      color: colors.primary,
      fontWeight: '800',
    },
    charSelectPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 8,
    },
    charSelectPillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    charSelectName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    charSelectMeta: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    hintText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 4,
    },
    attrsRollGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    attrRollBtn: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center',
      gap: 2,
    },
    attrRollBtnLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '800',
    },
    attrRollBtnVal: {
      fontSize: 14,
      fontWeight: '900',
      color: colors.primary,
    },
    skillQuickRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      padding: 10,
      marginBottom: 6,
    },
    skillQuickName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    skillQuickBonus: {
      fontSize: 13,
      fontWeight: '900',
      color: colors.primary,
    },
  });

