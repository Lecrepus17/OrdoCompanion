import React, { useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { ThemeColors, useTheme, useThemedStyles } from '../../theme';
import { TableParticipant, TableRollEvent, TableInitiativeItem } from '../../types/virtualTable';
import { showAlert } from '../../utils/alert';

type TableTab = 'party' | 'combat' | 'rolls' | 'scenes';

export default function TableScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const styles = useThemedStyles(createStyles);

  const {
    virtualTable,
    tableStatus,
    tableStatusError,
    tableParticipant,
    tableRecentRolls,
    createVirtualTable,
    joinVirtualTable,
    leaveVirtualTable,
    rollTableInitiative,
    advanceTableTurn,
    clearTableCombat,
    broadcastTableScene,
    addMonsterToTableInitiative,
    saveTableConfig,
    tableConfig,
    characters,
    campaigns,
    activeCampaign,
    rollSkillTest,
    rollFormula,
    userProfile,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TableTab>('party');

  // Formulário de Entrada como Jogador
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [selectedCharId, setSelectedCharId] = useState<string | null>(
    characters.length > 0 ? characters[0].id : null
  );

  // Formulário de Criação como Mestre
  const [createTitleInput, setCreateTitleInput] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    activeCampaign ? activeCampaign.id : null
  );

  // Modal de Configurações de Conexão (Supabase)
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(tableConfig.supabaseUrl || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(tableConfig.supabaseAnonKey || '');

  // Rolador Rápido no Feed
  const [customFormulaInput, setCustomFormulaInput] = useState('1d20');

  // Modal de Adicionar Monstro ao Combate (Mestre)
  const [addMonsterModalVisible, setAddMonsterModalVisible] = useState(false);
  const [customMonsterName, setCustomMonsterName] = useState('');
  const [customMonsterInit, setCustomMonsterInit] = useState('12');
  const [customMonsterPV, setCustomMonsterPV] = useState('40');

  const isConnected = tableStatus === 'connected' && virtualTable !== null;
  const isMaster = tableParticipant?.role === 'master';

  // Participantes formatados
  const participantsList = useMemo(() => {
    if (!virtualTable?.participants) return [];
    return Object.values(virtualTable.participants);
  }, [virtualTable?.participants]);

  // Handlers de Conexão
  const handleJoinTable = async () => {
    if (!joinRoomInput.trim()) {
      showAlert('Atenção', 'Informe o código da mesa (ex: ORD-8924).');
      return;
    }

    const res = await joinVirtualTable({
      roomId: joinRoomInput.trim().toUpperCase(),
      characterId: selectedCharId || undefined,
    });

    if (!res.success) {
      showAlert('Erro ao Conectar', res.error || 'Não foi possível entrar na mesa informada.');
    }
  };

  const handleCreateTable = async () => {
    const title = createTitleInput.trim() || (activeCampaign ? activeCampaign.title : 'Missão Ordo');
    const res = await createVirtualTable({
      title,
      campaignId: selectedCampaignId || undefined,
    });

    if (!res.success) {
      showAlert('Erro ao Criar Mesa', res.error || 'Não foi possível iniciar a mesa virtual.');
    }
  };

  const handleStartDemoTable = async () => {
    // Inicia mesa de demonstração com simulação local
    const res = await createVirtualTable({
      title: 'Operação Demonstração (VTT)',
      useLocalSim: true,
    });

    if (res.success) {
      // Adiciona ameaça de teste ao combate
      await addMonsterToTableInitiative({
        id: 'mon_demo_1',
        name: 'Zumbi de Sangue',
        initiative: 14,
        pvCurrent: 35,
        pvMax: 35,
      });
      // Adiciona cena de teste
      await broadcastTableScene({
        id: 'scene_demo_1',
        title: 'Cena 1: A Mansão Abandonada',
        summary: 'Os agentes chegam aos portões da propriedade sob forte neblina e chuva torrencial.',
        details: 'Marcas de sangue seco cobrem os degraus de entrada. Um cheiro ferroso impregna o ar.',
        clues: [
          { id: 'clue_1', text: 'Símbolo de Sangue esculpido na maçaneta de carvalho.', isFound: true },
          { id: 'clue_2', text: 'Diário rasgado com registros de experimentos paranormais.', isFound: false },
        ],
        broadcastedAt: new Date().toISOString(),
      });
    }
  };

  const handleRollPlayerInitiative = async () => {
    if (!tableParticipant?.agent) {
      // Se não tem agente associado, rola 1d20 puro
      const roll = rollSkillTest(1, 0, 'Iniciativa');
      await rollTableInitiative(roll.total, tableParticipant?.userName || 'Agente');
      return;
    }

    // Busca o personagem original ou snapshot
    const char = characters.find((c) => c.id === tableParticipant.agent?.id);
    const agi = char?.attributes.AGI || 1;
    const initEntry = char?.skills?.['Iniciativa'] || { degree: 0, bonus: 0 };
    const bonus = (initEntry.degree || 0) + (initEntry.bonus || 0);

    const roll = rollSkillTest(agi, bonus, `Iniciativa: ${char?.name || 'Agente'}`);
    await rollTableInitiative(roll.total, char?.name || tableParticipant.agent.name);
  };

  const handleAddCustomMonsterToCombat = async () => {
    if (!customMonsterName.trim()) {
      showAlert('Atenção', 'Informe o nome da criatura ou monstro.');
      return;
    }
    const initNum = parseInt(customMonsterInit, 10) || 10;
    const pvNum = parseInt(customMonsterPV, 10) || 30;

    await addMonsterToTableInitiative({
      id: `mon_${Date.now()}`,
      name: customMonsterName.trim(),
      initiative: initNum,
      pvCurrent: pvNum,
      pvMax: pvNum,
    });

    setCustomMonsterName('');
    setAddMonsterModalVisible(false);
  };

  const handleSaveConfig = async () => {
    await saveTableConfig({
      supabaseUrl: supabaseUrlInput.trim(),
      supabaseAnonKey: supabaseKeyInput.trim(),
    });
    setConfigModalVisible(false);
    showAlert('Sucesso', 'Configurações de conexão salvas.');
  };

  return (
    <View style={styles.container}>
      {/* Top Header da Mesa */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={isConnected ? 'radio' : 'radio-outline'}
                size={20}
                color={isConnected ? '#10B981' : colors.textMuted}
              />
              <Text style={styles.headerTitle}>
                {isConnected ? virtualTable?.title || 'Mesa Ativa' : 'Mesa Virtual da Ordem'}
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isConnected
                ? `Código: ${virtualTable?.roomId} • ${participantsList.length} conectado(s)`
                : 'Sincronização em tempo real de rolagens, iniciativa e fichas'}
            </Text>
          </View>

          {/* Botões do Topo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setConfigModalVisible(true)}
              accessibilityLabel="Configurações da Conexão"
            >
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {isConnected && (
              <TouchableOpacity
                style={[styles.leaveBtn]}
                onPress={() => {
                  Alert.alert('Desconectar da Mesa', 'Deseja sair da mesa virtual atual?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair', style: 'destructive', onPress: () => leaveVirtualTable() },
                  ]);
                }}
              >
                <Ionicons name="exit-outline" size={16} color="#EF4444" />
                <Text style={styles.leaveBtnText}>Sair</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status de Conexão / Erro */}
        {tableStatus === 'connecting' && (
          <View style={styles.connectingBanner}>
            <Ionicons name="sync-outline" size={14} color="#3B82F6" />
            <Text style={styles.connectingText}>Conectando à mesa virtual...</Text>
          </View>
        )}
        {tableStatus === 'error' && tableStatusError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{tableStatusError}</Text>
          </View>
        )}
      </View>

      {/* CONTEÚDO PRINCIPAL: DESCONECTADO vs CONECTADO */}
      {!isConnected ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomInset }]}>
          {/* Card: Entrar como Jogador */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="log-in-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Entrar em uma Mesa (Jogador)</Text>
            </View>
            <Text style={styles.cardDesc}>
              Insira o código de 6 caracteres fornecido pelo seu Mestre para sincronizar sua ficha e rolagens com a equipe.
            </Text>

            <Text style={styles.inputLabel}>Código da Sala:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: ORD-8924"
              placeholderTextColor={colors.textMuted}
              value={joinRoomInput}
              onChangeText={(t) => setJoinRoomInput(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={12}
            />

            <Text style={styles.inputLabel}>Selecione seu Agente:</Text>
            {characters.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
                Nenhuma ficha criada. Crie um agente na aba "Agentes" para usá-lo na mesa.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {characters.map((char) => {
                    const isSelected = selectedCharId === char.id;
                    return (
                      <TouchableOpacity
                        key={char.id}
                        style={[styles.charSelectPill, isSelected && styles.charSelectPillActive]}
                        onPress={() => setSelectedCharId(char.id)}
                      >
                        <Ionicons
                          name="person"
                          size={14}
                          color={isSelected ? '#FFF' : colors.primary}
                        />
                        <View>
                          <Text
                            style={[
                              styles.charSelectName,
                              isSelected && { color: '#FFF', fontWeight: '800' },
                            ]}
                          >
                            {char.name}
                          </Text>
                          <Text
                            style={[
                              styles.charSelectSub,
                              isSelected && { color: 'rgba(255,255,255,0.8)' },
                            ]}
                          >
                            NEX {char.nex}% • {char.classId || 'Agente'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinTable}>
              <Ionicons name="enter-outline" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Conectar à Mesa</Text>
            </TouchableOpacity>
          </View>

          {/* Card: Criar Mesa como Mestre */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="skull-outline" size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>Abrir Nova Mesa (Mestre)</Text>
            </View>
            <Text style={styles.cardDesc}>
              Crie uma sessão para comandar sua campanha, transmitindo iniciativa, monstros e cenas para todos os seus jogadores.
            </Text>

            <Text style={styles.inputLabel}>Título da Missão ou Sessão:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Operação Espreitador das Sombras"
              placeholderTextColor={colors.textMuted}
              value={createTitleInput}
              onChangeText={setCreateTitleInput}
            />

            {campaigns.length > 0 && (
              <>
                <Text style={styles.inputLabel}>Vincular Campanha (Opcional):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {campaigns.map((camp) => {
                      const isSel = selectedCampaignId === camp.id;
                      return (
                        <TouchableOpacity
                          key={camp.id}
                          style={[styles.charSelectPill, isSel && styles.charSelectPillActive]}
                          onPress={() => setSelectedCampaignId(isSel ? null : camp.id)}
                        >
                          <Ionicons
                            name="book"
                            size={14}
                            color={isSel ? '#FFF' : '#F59E0B'}
                          />
                          <Text style={[styles.charSelectName, isSel && { color: '#FFF' }]}>
                            {camp.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#F59E0B' }]}
              onPress={handleCreateTable}
            >
              <Ionicons name="radio" size={18} color="#FFF" />
              <Text style={styles.primaryBtnText}>Iniciar Mesa da Ordem</Text>
            </TouchableOpacity>
          </View>

          {/* Card: Demonstração e Testes Rápidos */}
          <View style={[styles.card, { borderColor: colors.primary, borderStyle: 'dashed' }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>Testar Modo Demonstração</Text>
            </View>
            <Text style={styles.cardDesc}>
              Quer experimentar o feed de dados, a iniciativa e o controle de cenas sem precisar de outro aparelho agora? Inicie uma sessão de teste com dados de exemplo.
            </Text>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.primary }]}
              onPress={handleStartDemoTable}
            >
              <Ionicons name="play-outline" size={18} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                Iniciar Mesa de Demonstração
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* VISÃO DA MESA CONECTADA */
        <View style={{ flex: 1 }}>
          {/* Sub-Abas da Mesa */}
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabBar}
            >
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'party' && styles.tabItemActive]}
                onPress={() => setActiveTab('party')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name="people"
                  size={16}
                  color={activeTab === 'party' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.tabItemText, activeTab === 'party' && styles.tabItemTextActive]}
                  numberOfLines={1}
                >
                  Equipe ({participantsList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'combat' && styles.tabItemActive]}
                onPress={() => setActiveTab('combat')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name="shield"
                  size={16}
                  color={activeTab === 'combat' ? '#EF4444' : colors.textMuted}
                />
                <Text
                  style={[styles.tabItemText, activeTab === 'combat' && styles.tabItemTextActive]}
                  numberOfLines={1}
                >
                  Combate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'rolls' && styles.tabItemActive]}
                onPress={() => setActiveTab('rolls')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name="dice"
                  size={16}
                  color={activeTab === 'rolls' ? '#F59E0B' : colors.textMuted}
                />
                <Text
                  style={[styles.tabItemText, activeTab === 'rolls' && styles.tabItemTextActive]}
                  numberOfLines={1}
                >
                  Rolagens ({tableRecentRolls.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'scenes' && styles.tabItemActive]}
                onPress={() => setActiveTab('scenes')}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons
                  name="document-text"
                  size={16}
                  color={activeTab === 'scenes' ? '#8B5CF6' : colors.textMuted}
                />
                <Text
                  style={[styles.tabItemText, activeTab === 'scenes' && styles.tabItemTextActive]}
                  numberOfLines={1}
                >
                  Cena & Pistas
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* SUB-ABA 1: EQUIPE (PARTY OVERVIEW) */}
          {activeTab === 'party' && (
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomInset }]}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Visão Geral dos Agentes</Text>
                <Text style={styles.sectionBadge}>
                  {participantsList.filter((p) => p.isOnline).length} online
                </Text>
              </View>

              {participantsList.length === 0 ? (
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>
                  Nenhum agente conectado no momento.
                </Text>
              ) : (
                participantsList.map((participant) => {
                  const ag = participant.agent;
                  return (
                    <View key={participant.userId} style={styles.agentCard}>
                      <View style={styles.agentCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.avatarCircle}>
                            <Ionicons
                              name={participant.role === 'master' ? 'skull' : 'person'}
                              size={20}
                              color={participant.role === 'master' ? '#F59E0B' : colors.primary}
                            />
                            <View
                              style={[
                                styles.onlineDot,
                                { backgroundColor: participant.isOnline ? '#10B981' : '#6B7280' },
                              ]}
                            />
                          </View>
                          <View>
                            <Text style={styles.agentName}>
                              {ag ? ag.name : participant.userName}
                            </Text>
                            <Text style={styles.agentPlayerSub}>
                              Jogador: {participant.userName} •{' '}
                              {ag ? `${ag.classTitle} (NEX ${ag.nex}%)` : participant.role}
                            </Text>
                          </View>
                        </View>

                        {ag && (
                          <View style={styles.defenseBadge}>
                            <Text style={styles.defenseLabel}>DEF</Text>
                            <Text style={styles.defenseValue}>{ag.defense}</Text>
                          </View>
                        )}
                      </View>

                      {ag ? (
                        <>
                          {/* Barras de Recursos Vitais */}
                          <View style={styles.barsContainer}>
                            {/* PV */}
                            <View style={styles.barRow}>
                              <Text style={[styles.barLabel, { color: '#EF4444' }]}>PV</Text>
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    {
                                      backgroundColor: '#EF4444',
                                      width: `${Math.min(100, Math.max(0, (ag.pvCurrent / ag.pvMax) * 100))}%`,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.barNum}>
                                {ag.pvCurrent}/{ag.pvMax}
                              </Text>
                            </View>

                            {/* PE */}
                            <View style={styles.barRow}>
                              <Text style={[styles.barLabel, { color: '#F59E0B' }]}>PE</Text>
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    {
                                      backgroundColor: '#F59E0B',
                                      width: `${Math.min(100, Math.max(0, (ag.peCurrent / ag.peMax) * 100))}%`,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.barNum}>
                                {ag.peCurrent}/{ag.peMax}
                              </Text>
                            </View>

                            {/* SAN */}
                            <View style={styles.barRow}>
                              <Text style={[styles.barLabel, { color: '#38BDF8' }]}>SAN</Text>
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    {
                                      backgroundColor: '#38BDF8',
                                      width: `${Math.min(100, Math.max(0, (ag.sanCurrent / ag.sanMax) * 100))}%`,
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={styles.barNum}>
                                {ag.sanCurrent}/{ag.sanMax}
                              </Text>
                            </View>
                          </View>

                          {/* Condições Ativas */}
                          {ag.conditions && ag.conditions.length > 0 && (
                            <View style={styles.conditionsRow}>
                              {ag.conditions.map((cond, i) => (
                                <View key={i} style={styles.conditionTag}>
                                  <Text style={styles.conditionText}>{cond}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={{ marginTop: 8 }}>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                            {participant.role === 'master'
                              ? '👑 Mestre da Sessão (Controle Geral)'
                              : 'Conectado sem ficha vinculada'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* SUB-ABA 2: COMBATE & INICIATIVA */}
          {activeTab === 'combat' && (
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomInset }]}>
              {/* Barra de Ação de Combate */}
              <View style={styles.combatActionCard}>
                <View style={styles.combatHeaderRow}>
                  <View>
                    <Text style={styles.combatTitle}>
                      {virtualTable?.combat.isActive
                        ? `Rodada ${virtualTable.combat.round || 1}`
                        : 'Combate Inativo'}
                    </Text>
                    <Text style={styles.combatSubtitle}>
                      {virtualTable?.combat.entries.length || 0} combatente(s) na trilha
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.rollInitBtn}
                    onPress={handleRollPlayerInitiative}
                  >
                    <Ionicons name="dice" size={16} color="#FFF" />
                    <Text style={styles.rollInitBtnText}>Rolar Minha Iniciativa</Text>
                  </TouchableOpacity>
                </View>

                {/* Controles do Mestre */}
                {isMaster && (
                  <View style={styles.masterCombatControls}>
                    <TouchableOpacity
                      style={styles.turnBtn}
                      onPress={advanceTableTurn}
                    >
                      <Ionicons name="play-forward" size={16} color="#FFF" />
                      <Text style={styles.turnBtnText}>Próximo Turno</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.turnBtn, { backgroundColor: '#374151' }]}
                      onPress={() => setAddMonsterModalVisible(true)}
                    >
                      <Ionicons name="add" size={16} color="#FFF" />
                      <Text style={styles.turnBtnText}>+ Ameaça</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.turnBtn, { backgroundColor: '#EF4444' }]}
                      onPress={clearTableCombat}
                    >
                      <Ionicons name="trash-outline" size={16} color="#FFF" />
                      <Text style={styles.turnBtnText}>Limpar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Trilha de Iniciativa */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Ordem de Iniciativa</Text>
              </View>

              {(!virtualTable?.combat.entries || virtualTable.combat.entries.length === 0) ? (
                <View style={styles.emptyInitContainer}>
                  <Ionicons name="hourglass-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyInitText}>
                    Ninguém rolou iniciativa ainda. Clique em "Rolar Minha Iniciativa" para entrar na rodada!
                  </Text>
                </View>
              ) : (
                virtualTable.combat.entries.map((entry, index) => {
                  const isCurrentTurn = index === (virtualTable.combat.currentTurnIndex || 0);
                  const isMonster = entry.type === 'monster';

                  return (
                    <View
                      key={entry.id || index}
                      style={[
                        styles.initCard,
                        isCurrentTurn && styles.initCardActive,
                        isMonster && styles.initCardMonster,
                      ]}
                    >
                      <View style={styles.initOrderBadge}>
                        <Text style={styles.initOrderNum}>#{index + 1}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name={isMonster ? 'skull' : 'person'}
                            size={16}
                            color={isMonster ? '#EF4444' : colors.primary}
                          />
                          <Text style={styles.initName}>{entry.name}</Text>
                          {isCurrentTurn && (
                            <View style={styles.activeTurnTag}>
                              <Text style={styles.activeTurnText}>TURNO ATUAL</Text>
                            </View>
                          )}
                        </View>

                        {entry.pvMax !== undefined && (
                          <Text style={styles.initPVSub}>
                            PV: {entry.pvCurrent ?? entry.pvMax}/{entry.pvMax}
                          </Text>
                        )}
                      </View>

                      <View style={styles.initScoreBadge}>
                        <Text style={styles.initScoreLabel}>INIT</Text>
                        <Text style={styles.initScoreVal}>{entry.initiative}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* SUB-ABA 3: ROLAGENS (FEED ESTILO ROLL20) */}
          {activeTab === 'rolls' && (
            <View style={{ flex: 1 }}>
              <FlatList
                data={tableRecentRolls}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.content, { paddingBottom: 110 + bottomInset }]}
                inverted={false}
                renderItem={({ item }) => {
                  const isCrit = item.isCritical;
                  const isFumble = item.isFumble;

                  return (
                    <View
                      style={[
                        styles.rollCard,
                        isCrit && styles.rollCardCrit,
                        isFumble && styles.rollCardFumble,
                      ]}
                    >
                      <View style={styles.rollCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name="dice-outline"
                            size={15}
                            color={isCrit ? '#F59E0B' : isFumble ? '#EF4444' : colors.primary}
                          />
                          <Text style={styles.rollSender}>
                            {item.characterName || item.senderName}
                          </Text>
                        </View>
                        <Text style={styles.rollTime}>{item.timestamp}</Text>
                      </View>

                      <Text style={styles.rollLabel}>{item.label}</Text>

                      <View style={styles.rollBodyRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rollFormula}>Fórmula: {item.formula}</Text>
                          <Text style={styles.rollDiceList}>
                            Dados: [{item.diceResults.join(', ')}]
                            {item.chosenDie !== undefined ? ` • Escolhido: ${item.chosenDie}` : ''}
                            {item.bonus !== 0 ? ` • Bônus: ${item.bonus > 0 ? `+${item.bonus}` : item.bonus}` : ''}
                          </Text>
                        </View>

                        <View style={styles.rollTotalBox}>
                          <Text style={[styles.rollTotalNum, isCrit && { color: '#F59E0B' }, isFumble && { color: '#EF4444' }]}>
                            {item.total}
                          </Text>
                          {isCrit && <Text style={styles.critBadge}>CRÍTICO!</Text>}
                          {isFumble && <Text style={styles.fumbleBadge}>DESASTRE!</Text>}
                        </View>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyInitContainer}>
                    <Ionicons name="dice-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.emptyInitText}>
                      Nenhuma rolagem registrada ainda nesta sessão.
                    </Text>
                  </View>
                }
              />

              {/* Barra Inferior de Rolagem Rápida */}
              <View style={[styles.quickRollBar, { bottom: bottomInset }]}>
                <View style={styles.quickDiceRow}>
                  {['1d20', '1d4', '1d6', '1d8', '1d10', '1d12', '1d100'].map((die) => (
                    <TouchableOpacity
                      key={die}
                      style={styles.quickDieBtn}
                      onPress={() => rollFormula(die, `Rolagem rápida de ${die}`)}
                    >
                      <Text style={styles.quickDieText}>{die}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.customFormulaRow}>
                  <TextInput
                    style={styles.customFormulaInput}
                    placeholder="Fórmula livre (ex: 2d10+4)"
                    placeholderTextColor={colors.textMuted}
                    value={customFormulaInput}
                    onChangeText={setCustomFormulaInput}
                  />
                  <TouchableOpacity
                    style={styles.sendRollBtn}
                    onPress={() => {
                      if (customFormulaInput.trim()) {
                        rollFormula(customFormulaInput.trim(), `Fórmula: ${customFormulaInput}`);
                      }
                    }}
                  >
                    <Ionicons name="send" size={14} color="#FFF" />
                    <Text style={styles.sendRollText}>Rolar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* SUB-ABA 4: CENAS & PISTAS */}
          {activeTab === 'scenes' && (
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomInset }]}>
              {virtualTable?.activeScene ? (
                <View style={styles.sceneCard}>
                  <View style={styles.sceneHeader}>
                    <Ionicons name="eye" size={20} color="#8B5CF6" />
                    <Text style={styles.sceneTitle}>{virtualTable.activeScene.title}</Text>
                  </View>
                  <Text style={styles.sceneSummary}>{virtualTable.activeScene.summary}</Text>
                  {virtualTable.activeScene.details && (
                    <Text style={styles.sceneDetails}>{virtualTable.activeScene.details}</Text>
                  )}

                  {virtualTable.activeScene.clues && virtualTable.activeScene.clues.length > 0 && (
                    <View style={styles.cluesContainer}>
                      <Text style={styles.cluesTitle}>Pistas da Cena:</Text>
                      {virtualTable.activeScene.clues.map((clue) => (
                        <View key={clue.id} style={styles.clueRow}>
                          <Ionicons
                            name={clue.isFound ? 'checkmark-circle' : 'help-circle-outline'}
                            size={16}
                            color={clue.isFound ? '#10B981' : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.clueText,
                              !clue.isFound && { color: colors.textMuted, fontStyle: 'italic' },
                            ]}
                          >
                            {clue.isFound ? clue.text : 'Pista oculta...'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyInitContainer}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyInitText}>
                    O Mestre ainda não transmitiu nenhuma cena ou pista nesta sessão.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Modal de Configuração de Conexão Supabase */}
      <Modal visible={configModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurações de Conexão</Text>
              <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              A Mesa Virtual pode operar em modo local/demonstração ou conectar-se ao Supabase Realtime para sincronização inter-dispositivos (Android, iOS e Web).
            </Text>

            <Text style={styles.inputLabel}>Supabase Project URL:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="https://xyz.supabase.co"
              placeholderTextColor={colors.textMuted}
              value={supabaseUrlInput}
              onChangeText={setSupabaseUrlInput}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Supabase Anon Key:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="eyJhbGciOiJIUzI1NiIsIn..."
              placeholderTextColor={colors.textMuted}
              value={supabaseKeyInput}
              onChangeText={setSupabaseKeyInput}
              autoCapitalize="none"
              secureTextEntry
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1 }]}
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={styles.outlineBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }]}
                onPress={handleSaveConfig}
              >
                <Text style={styles.primaryBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Adicionar Monstro ao Combate */}
      <Modal visible={addMonsterModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Ameaça ao Combate</Text>
              <TouchableOpacity onPress={() => setAddMonsterModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nome do Monstro / NPC:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Degolificada, Sukurita, Zumbi"
              placeholderTextColor={colors.textMuted}
              value={customMonsterName}
              onChangeText={setCustomMonsterName}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Iniciativa:</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={customMonsterInit}
                  onChangeText={setCustomMonsterInit}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pontos de Vida (PV):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={customMonsterPV}
                  onChangeText={setCustomMonsterPV}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { flex: 1 }]}
                onPress={() => setAddMonsterModalVisible(false)}
              >
                <Text style={styles.outlineBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: '#EF4444' }]}
                onPress={handleAddCustomMonsterToCombat}
              >
                <Text style={styles.primaryBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
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
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    leaveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    leaveBtnText: {
      color: '#EF4444',
      fontSize: 12,
      fontWeight: '700',
    },
    connectingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    connectingText: {
      color: '#3B82F6',
      fontSize: 11,
      fontWeight: '600',
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    errorText: {
      color: '#EF4444',
      fontSize: 11,
      fontWeight: '600',
    },
    content: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    cardDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 18,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 14,
      marginBottom: 12,
    },
    charSelectPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    charSelectPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    charSelectName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    charSelectSub: {
      fontSize: 11,
      color: colors.textMuted,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 13,
    },
    outlineBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    outlineBtnText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    tabBarContainer: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      gap: 6,
    },
    tabItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabItemActive: {
      borderBottomColor: colors.primary,
    },
    tabItemText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    tabItemTextActive: {
      color: colors.text,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    sectionBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    agentCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    agentCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    onlineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      bottom: 0,
      right: 0,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    agentName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    agentPlayerSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    defenseBadge: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignItems: 'center',
    },
    defenseLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.textMuted,
    },
    defenseValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
    },
    barsContainer: {
      marginTop: 10,
      gap: 6,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    barLabel: {
      fontSize: 11,
      fontWeight: '800',
      width: 30,
    },
    barTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceElevated,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
    },
    barNum: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      width: 50,
      textAlign: 'right',
    },
    conditionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    conditionTag: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderWidth: 1,
      borderColor: '#EF4444',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    conditionText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#EF4444',
    },
    combatActionCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    combatHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    combatTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    combatSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    rollInitBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rollInitBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    masterCombatControls: {
      flexDirection: 'row',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
    },
    turnBtn: {
      flex: 1,
      backgroundColor: '#10B981',
      paddingVertical: 8,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    turnBtnText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 12,
    },
    emptyInitContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 10,
    },
    emptyInitText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      maxWidth: 260,
      lineHeight: 18,
    },
    initCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 10,
    },
    initCardActive: {
      borderColor: '#10B981',
      borderWidth: 2,
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    initCardMonster: {
      borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    initOrderBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initOrderNum: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    initName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    activeTurnTag: {
      backgroundColor: '#10B981',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    activeTurnText: {
      color: '#FFF',
      fontSize: 9,
      fontWeight: '800',
    },
    initPVSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    initScoreBadge: {
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    initScoreLabel: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.textMuted,
    },
    initScoreVal: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    rollCard: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 4,
    },
    rollCardCrit: {
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.06)',
    },
    rollCardFumble: {
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.06)',
    },
    rollCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rollSender: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    rollTime: {
      fontSize: 10,
      color: colors.textMuted,
    },
    rollLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    rollBodyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    rollFormula: {
      fontSize: 11,
      color: colors.textMuted,
    },
    rollDiceList: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    rollTotalBox: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 48,
    },
    rollTotalNum: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.text,
    },
    critBadge: {
      fontSize: 9,
      fontWeight: '900',
      color: '#F59E0B',
    },
    fumbleBadge: {
      fontSize: 9,
      fontWeight: '900',
      color: '#EF4444',
    },
    quickRollBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 8,
      gap: 6,
    },
    quickDiceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
    },
    quickDieBtn: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingVertical: 5,
      alignItems: 'center',
    },
    quickDieText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    customFormulaRow: {
      flexDirection: 'row',
      gap: 6,
    },
    customFormulaInput: {
      flex: 1,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 12,
      color: colors.text,
    },
    sendRollBtn: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sendRollText: {
      color: '#FFF',
      fontWeight: '800',
      fontSize: 12,
    },
    sceneCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    sceneHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sceneTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    sceneSummary: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sceneDetails: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 20,
    },
    cluesContainer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      gap: 8,
    },
    cluesTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    clueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    clueText: {
      fontSize: 12,
      color: colors.text,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalContent: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    modalDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 14,
      lineHeight: 18,
    },
    modalBtnRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
  });
