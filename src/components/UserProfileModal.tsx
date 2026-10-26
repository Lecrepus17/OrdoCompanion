import React, { useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
import { showAlert } from '../utils/alert';
import { GoogleDriveService } from '../services/sync/GoogleDriveService';
import {
  getCustomPdfServerUrl,
  isPdfServerConfigured,
  setCustomPdfServerUrl,
  testPdfServerConnection,
} from '../utils/pdfUrl';
import {
  DEFAULT_HIDDEN_TABS,
  DEFAULT_PINNED_TABS,
  getTabMetadata,
} from '../types/compendium';
import {
  hideTab,
  pinTab,
  reorderPinnedTabs,
  resetNavigationConfig,
  resolveNavigationTabs,
  unhideTab,
  unpinTab,
} from '../utils/tabNavigation';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'identidade' | 'nuvem' | 'navegacao';
}

const PREFERRED_CLASSES = [
  { id: 'Combatente', name: 'Combatente', icon: 'flame', desc: 'Combate e Vigor' },
  { id: 'Especialista', name: 'Especialista', icon: 'bulb', desc: 'Perícias e Intelecto' },
  { id: 'Ocultista', name: 'Ocultista', icon: 'skull', desc: 'Rituais e Presença' },
  { id: 'Sobrevivente', name: 'Sobrevivente', icon: 'shield', desc: 'Resiliência e Adaptação' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ visible, onClose, initialTab }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const {
    userProfile,
    updateUserProfile,
    exportBackupJson,
    importBackupJson,
    syncStatus,
    syncStatusMessage,
    syncAuthState,
    connectGoogleDrive,
    disconnectGoogleDrive,
    syncWithDriveNow,
    autoSyncEnabled,
    setAutoSyncEnabled,
    lastSyncStats,
    openManual,
    checkForUpdates,
    updateInfo,
    setUpdateModalVisible,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'identidade' | 'nuvem' | 'navegacao'>(initialTab || 'identidade');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nickname, setNickname] = useState('');
  const [preferredClass, setPreferredClass] = useState('Combatente');
  const [defaultCampaign, setDefaultCampaign] = useState('');
  const [masterName, setMasterName] = useState('');
  const [notes, setNotes] = useState('');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudSyncUrl, setCloudSyncUrl] = useState('');
  const [listingColumnsChoice, setListingColumnsChoice] = useState<1 | 2>(1);
  const [transcendEvery5Nex, setTranscendEvery5Nex] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados locais para customização dinâmica da barra inferior
  const [pinnedTabs, setPinnedTabs] = useState<string[]>(DEFAULT_PINNED_TABS);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>(DEFAULT_HIDDEN_TABS);

  // Estados locais da sincronização com Google Drive
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showGuideSteps, setShowGuideSteps] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState('');
  const [pdfServerInput, setPdfServerInput] = useState('');
  const [pdfTesting, setPdfTesting] = useState(false);
  const [pdfTestResult, setPdfTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Sincroniza estado com o userProfile salvo sempre que o modal abre
  useEffect(() => {
    if (visible && userProfile) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setPlayerName(userProfile.playerName || '');
      setNickname(userProfile.nickname || '');
      setPreferredClass(userProfile.preferredClass || 'Combatente');
      setDefaultCampaign(userProfile.defaultCampaign || '');
      setMasterName(userProfile.masterName || '');
      setNotes(userProfile.notes || '');
      setCloudSyncEnabled(!!userProfile.cloudSyncEnabled);
      setCloudSyncUrl(userProfile.cloudSyncUrl || '');
      setListingColumnsChoice(userProfile.listingColumns === 2 ? 2 : 1);
      setTranscendEvery5Nex(!!userProfile.transcendEvery5Nex);
      setCustomClientIdInput(GoogleDriveService.getInstance().getClientId());
      setPdfServerInput(getCustomPdfServerUrl());
      setPdfTestResult(null);

      const navConfig = userProfile.navigationConfig;
      setPinnedTabs(
        navConfig?.pinnedTabs && Array.isArray(navConfig.pinnedTabs)
          ? navConfig.pinnedTabs
          : DEFAULT_PINNED_TABS
      );
      setHiddenTabs(
        navConfig?.hiddenTabs && Array.isArray(navConfig.hiddenTabs)
          ? navConfig.hiddenTabs
          : DEFAULT_HIDDEN_TABS
      );

      setSaveSuccess(false);
    }
  }, [visible, userProfile, initialTab]);

  // Rotas conhecidas e resolução dinâmica das abas
  const allKnownRoutes = useMemo(() => {
    const base = ['index', 'characters', 'weapons', 'books', 'dice', 'favorites', 'master'];
    const custom = [...pinnedTabs, ...hiddenTabs];
    return Array.from(new Set([...base, ...custom]));
  }, [pinnedTabs, hiddenTabs]);

  const resolvedTabs = useMemo(() => {
    return resolveNavigationTabs(allKnownRoutes, { pinnedTabs, hiddenTabs });
  }, [allKnownRoutes, pinnedTabs, hiddenTabs]);

  const handleMovePinned = (fromIndex: number, toIndex: number) => {
    const next = reorderPinnedTabs(resolvedTabs.pinnedTabs, fromIndex, toIndex);
    setPinnedTabs(next);
  };

  const handleUnpin = (tabId: string) => {
    const next = unpinTab({ pinnedTabs: resolvedTabs.pinnedTabs, hiddenTabs: resolvedTabs.hiddenTabs }, tabId);
    setPinnedTabs(next.pinnedTabs);
    setHiddenTabs(next.hiddenTabs);
  };

  const handlePin = (tabId: string) => {
    const next = pinTab({ pinnedTabs: resolvedTabs.pinnedTabs, hiddenTabs: resolvedTabs.hiddenTabs }, tabId);
    setPinnedTabs(next.pinnedTabs);
    setHiddenTabs(next.hiddenTabs);
  };

  const handleHide = (tabId: string) => {
    const next = hideTab({ pinnedTabs: resolvedTabs.pinnedTabs, hiddenTabs: resolvedTabs.hiddenTabs }, tabId);
    setPinnedTabs(next.pinnedTabs);
    setHiddenTabs(next.hiddenTabs);
  };

  const handleUnhide = (tabId: string, addToPinned = false) => {
    const next = unhideTab({ pinnedTabs: resolvedTabs.pinnedTabs, hiddenTabs: resolvedTabs.hiddenTabs }, tabId, addToPinned);
    setPinnedTabs(next.pinnedTabs);
    setHiddenTabs(next.hiddenTabs);
  };

  const handleResetNavigation = () => {
    const def = resetNavigationConfig();
    setPinnedTabs(def.pinnedTabs);
    setHiddenTabs(def.hiddenTabs);
    showAlert('Padrão Restaurado', 'A barra inferior foi redefinida para o layout padrão.');
  };

  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    try {
      const res = await connectGoogleDrive();
      if (res.isAuthenticated) {
        setCloudSyncEnabled(true);
        showAlert('Google Drive Conectado!', `Conta conectada com sucesso: ${res.userName || res.userEmail || 'Jogador'}.`);
      } else if (res.error) {
        showAlert('Aviso de Conexão', res.error);
      }
    } catch (err: any) {
      showAlert('Erro de Conexão', err?.message || 'Falha ao autenticar com o Google Drive.');
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    await disconnectGoogleDrive();
    setCloudSyncEnabled(false);
    showAlert('Desconectado', 'Sua conta do Google Drive foi desconectada deste dispositivo.');
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await syncWithDriveNow({ quiet: false });
      if (res.success) {
        showAlert('Sincronização Concluída', res.message);
      } else {
        showAlert('Aviso de Sincronização', res.message || 'Não foi possível sincronizar com o Drive.');
      }
    } catch (err: any) {
      showAlert('Erro', err?.message || 'Falha durante o processo de sincronização.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveCustomClientId = async () => {
    const res = await GoogleDriveService.getInstance().setCustomClientId(customClientIdInput);
    if (!res.valid) {
      showAlert('Client ID Inválido', res.message || 'Verifique o formato.');
      return;
    }
    showAlert('Configuração Salva', 'Client ID do Google Cloud atualizado com sucesso.');
  };

  const handleResetCustomClientId = async () => {
    await GoogleDriveService.getInstance().setCustomClientId('');
    setCustomClientIdInput(GoogleDriveService.getInstance().getClientId());
    showAlert('Padrão Restaurado', 'O Client ID padrão do sistema foi restaurado com sucesso.');
  };

  const handleTestPdfServer = async () => {
    setPdfTesting(true);
    setPdfTestResult(null);
    const res = await testPdfServerConnection(pdfServerInput);
    setPdfTesting(false);
    setPdfTestResult(res);
  };

  const handleSavePdfServer = async () => {
    await setCustomPdfServerUrl(pdfServerInput);
    showAlert('Servidor Salvo', pdfServerInput.trim() ? 'URL do servidor de PDFs salva com sucesso!' : 'Modo Offline Ativado.');
  };

  const handleResetPdfServer = async () => {
    await setCustomPdfServerUrl('');
    setPdfServerInput('');
    setPdfTestResult(null);
    showAlert('Modo Offline Restaurado', 'O aplicativo voltará a utilizar o modo texto offline integrado.');
  };

  const handleCopyRedirectUri = async () => {
    try {
      const uri = GoogleDriveService.getInstance().getRedirectUri();
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(uri);
        showAlert('Copiado!', `Redirect URI copiado para a área de transferência:\n\n${uri}`);
      } else {
        showAlert('Redirect URI', uri);
      }
    } catch {
      showAlert('Erro', 'Não foi possível copiar o Redirect URI.');
    }
  };

  const handleCheckUpdatesManually = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkForUpdates(true);
      if (!res || !res.hasUpdate) {
        showAlert(
          'Ordo Companion Atualizado',
          `Você já está utilizando a versão mais recente do aplicativo (v${Constants.expoConfig?.version || '1.0.0'})!`
        );
      }
    } catch {
      showAlert(
        'Verificação de Atualização',
        'Não foi possível verificar atualizações no momento. Verifique sua conexão com a internet.'
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleImportBackup = async () => {
    let jsonToImport = '';
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        jsonToImport = await navigator.clipboard.readText();
      } catch {}
    }
    if (Platform.OS === 'web' && (!jsonToImport || !jsonToImport.includes('characters'))) {
      const prompted = typeof window !== 'undefined' ? window.prompt('Cole o JSON do backup completo aqui:') : null;
      if (prompted) jsonToImport = prompted;
    }
    if (!jsonToImport || !jsonToImport.trim()) {
      showAlert(
        'Importar Backup',
        'Copie o JSON do backup gerado para a sua área de transferência antes de tocar em Restaurar Backup.'
      );
      return;
    }
    try {
      await importBackupJson(jsonToImport);
      showAlert('Sucesso', 'Backup restaurado com sucesso! Suas fichas, armas e dados foram atualizados.');
    } catch {
      showAlert('Erro no JSON', 'O texto colado não corresponde a um backup JSON válido.');
    }
  };

  const handleSave = async () => {
    await updateUserProfile({
      playerName: playerName.trim(),
      nickname: nickname.trim(),
      email: syncAuthState.userEmail || userProfile?.email || '',
      preferredClass,
      defaultCampaign: defaultCampaign.trim(),
      masterName: masterName.trim(),
      notes: notes.trim(),
      cloudSyncEnabled,
      cloudSyncUrl: cloudSyncUrl.trim(),
      listingColumns: listingColumnsChoice,
      transcendEvery5Nex,
      navigationConfig: {
        pinnedTabs: resolvedTabs.pinnedTabs,
        hiddenTabs: resolvedTabs.hiddenTabs,
      },
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportBackupJson();
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        showAlert('Backup Copiado', 'O backup completo de dados e perfil foi copiado para a sua área de transferência!');
      } else {
        showAlert('Backup Gerado', `Tamanho: ${json.length} caracteres.`);
      }
    } catch {
      showAlert('Erro', 'Não foi possível exportar os dados.');
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Nunca';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 14),
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Fechar Perfil"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.container}>
            {/* Cabeçalho */}
            <View style={styles.header}>
              <View style={styles.headerTitleWrap}>
                <View style={styles.iconBadge}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>Perfil & Identidade do Jogador</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>Informações gerais e integração em nuvem</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    openManual('cloud_sync');
                  }}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Manual da Nuvem e Perfil"
                >
                  <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Fechar"
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Navegação de Abas internas */}
            <View style={styles.tabsNav}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'identidade' && styles.tabButtonActive]}
                onPress={() => setActiveTab('identidade')}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={15}
                  color={activeTab === 'identidade' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'identidade' && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Identidade
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'navegacao' && styles.tabButtonActive]}
                onPress={() => setActiveTab('navegacao')}
              >
                <Ionicons
                  name="reorder-three-outline"
                  size={17}
                  color={activeTab === 'navegacao' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'navegacao' && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  Barra de Abas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'nuvem' && styles.tabButtonActive]}
                onPress={() => setActiveTab('nuvem')}
              >
                <Ionicons
                  name="cloud-outline"
                  size={15}
                  color={activeTab === 'nuvem' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.tabButtonText, activeTab === 'nuvem' && styles.tabButtonTextActive]}
                  numberOfLines={1}
                >
                  Nuvem
                </Text>
                {cloudSyncEnabled && <View style={styles.cloudActiveDot} />}
              </TouchableOpacity>
            </View>

            {/* Conteúdo rolável */}
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
                {activeTab === 'identidade' ? (
                  <>
                    {/* Alerta de Autofill */}
                    <View style={styles.infoBanner}>
                      <Ionicons name="sparkles" size={16} color={colors.primary} />
                      <Text style={styles.infoBannerText}>
                        O <Text style={{ fontWeight: '800' }}>Nome de Jogador</Text> preencherá
                        automaticamente o campo Jogador em todas as novas fichas de agente que você criar!
                      </Text>
                    </View>

                    {/* Bloco 1: Identificação */}
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeaderTitle}>DADOS PRINCIPAIS</Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>
                          Nome de Usuário / Jogador <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Seu Nome Real ou Nick Principal"
                          placeholderTextColor={colors.textMuted}
                          value={playerName}
                          onChangeText={setPlayerName}
                        />
                        <Text style={styles.fieldHint}>
                          Preenche o campo "Jogador" da ficha oficial automaticamente.
                        </Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Codinome / Apelido do Agente</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Balu, Corvo, Kaiser, Agente K"
                          placeholderTextColor={colors.textMuted}
                          value={nickname}
                          onChangeText={setNickname}
                        />
                        <Text style={styles.fieldHint}>
                          Designação ou alcunha de campo na Ordem Paranormal.
                        </Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Vinculação da Conta</Text>
                        {syncAuthState.isAuthenticated ? (
                          <TouchableOpacity
                            style={styles.linkedAccountCard}
                            onPress={() => setActiveTab('nuvem')}
                            activeOpacity={0.7}
                            accessibilityLabel="Conta Google vinculada. Toque para gerenciar na aba Nuvem."
                          >
                            <View style={styles.linkedAccountLeft}>
                              {syncAuthState.userPhoto ? (
                                <Image
                                  source={{ uri: syncAuthState.userPhoto }}
                                  style={styles.linkedAvatar}
                                />
                              ) : (
                                <View style={styles.linkedAvatarPlaceholder}>
                                  <Ionicons name="logo-google" size={16} color={colors.primary} />
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.linkedAccountName} numberOfLines={1}>
                                    {syncAuthState.userName || 'Conta Google'}
                                  </Text>
                                  <View style={styles.connectedBadge}>
                                    <Text style={styles.connectedBadgeText}>Vinculada</Text>
                                  </View>
                                </View>
                                <Text style={styles.linkedAccountEmail} numberOfLines={1}>
                                  {syncAuthState.userEmail || 'Conectada ao Google Drive'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.linkedManageBtn}>
                              <Text style={styles.linkedManageBtnText}>Gerenciar</Text>
                              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.unlinkedAccountCard}
                            onPress={() => setActiveTab('nuvem')}
                            activeOpacity={0.7}
                            accessibilityLabel="Nenhuma conta vinculada. Toque para conectar na aba Nuvem."
                          >
                            <View style={styles.unlinkedAccountLeft}>
                              <View style={styles.unlinkedIconBox}>
                                <Ionicons name="cloud-offline-outline" size={18} color={colors.textMuted} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.unlinkedTitle}>Nenhuma conta vinculada</Text>
                                <Text style={styles.unlinkedSub}>
                                  Toque para vincular ao Google Drive e ativar backup em nuvem
                                </Text>
                              </View>
                            </View>
                            <View style={styles.connectLinkBtn}>
                              <Text style={styles.connectLinkBtnText}>Vincular</Text>
                              <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                            </View>
                          </TouchableOpacity>
                        )}
                        <Text style={styles.fieldHint}>
                          {syncAuthState.isAuthenticated
                            ? 'Conta conectada via Google Drive para sincronização e backup das fichas.'
                            : 'A vinculação com o Google Drive é gerenciada na aba "Nuvem & Sincronização".'}
                        </Text>
                      </View>
                    </View>

                    {/* Bloco 2: Preferências de Jogo */}
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeaderTitle}>PREFERÊNCIAS DE JOGO</Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Classe Favorita</Text>
                        <View style={styles.classGrid}>
                          {PREFERRED_CLASSES.map((cls) => {
                            const isSelected = preferredClass === cls.id;
                            return (
                              <TouchableOpacity
                                key={cls.id}
                                style={[
                                  styles.classCard,
                                  isSelected && styles.classCardSelected,
                                ]}
                                onPress={() => setPreferredClass(cls.id)}
                              >
                                <Ionicons
                                  name={cls.icon as any}
                                  size={16}
                                  color={isSelected ? colors.primary : colors.textSecondary}
                                />
                                <Text
                                  style={[
                                    styles.classCardTitle,
                                    isSelected && styles.classCardTitleSelected,
                                  ]}
                                >
                                  {cls.name}
                                </Text>
                                <Text style={styles.classCardDesc}>{cls.desc}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <Text style={styles.fieldHint}>
                          Sugere a classe por padrão ao criar um novo agente.
                        </Text>
                      </View>

                      <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Mesa / Campanha Atual</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Ex: Segredo na Ilha"
                            placeholderTextColor={colors.textMuted}
                            value={defaultCampaign}
                            onChangeText={setDefaultCampaign}
                          />
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.fieldLabel}>Mestre / Narrador</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Ex: Cellbit, Arthur..."
                            placeholderTextColor={colors.textMuted}
                            value={masterName}
                            onChangeText={setMasterName}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Anotações & Diário do Jogador</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Lembretes pessoais, ideias para futuros personagens, regras da mesa..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                          numberOfLines={3}
                          value={notes}
                          onChangeText={setNotes}
                        />
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, paddingRight: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="bonfire-outline" size={16} color={colors.primary} />
                              <Text style={styles.fieldLabel}>Transcender a cada 5% de NEX</Text>
                            </View>
                            <Text style={styles.fieldHint}>
                              Regra geral da mesa: habilita a escolha de um Poder Paranormal (Transcender) em cada avanço de NEX (+5%) para todos os agentes.
                            </Text>
                          </View>
                          <Switch
                            value={transcendEvery5Nex}
                            onValueChange={setTranscendEvery5Nex}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={transcendEvery5Nex ? '#FFF' : colors.textSecondary}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Bloco 3: Preferências de Exibição / Layout das Listagens */}
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeaderTitle}>PREFERÊNCIAS DE EXIBIÇÃO</Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Colunas nas Listagens do Compêndio</Text>
                        <Text style={styles.fieldHint}>
                          Escolha entre visualização tradicional em 1 coluna ou grade em 2 colunas para visualizar mais registros por tela.
                        </Text>

                        <View style={styles.columnsSelectRow}>
                          <TouchableOpacity
                            style={[
                              styles.columnOptionCard,
                              listingColumnsChoice === 1 && styles.columnOptionCardActive,
                            ]}
                            onPress={() => setListingColumnsChoice(1)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="list"
                              size={22}
                              color={listingColumnsChoice === 1 ? colors.primary : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.columnOptionTitle,
                                listingColumnsChoice === 1 && { color: colors.primary, fontWeight: '800' },
                              ]}
                            >
                              1 Coluna
                            </Text>
                            <Text style={styles.columnOptionSub}>Tradicional, foco em leitura</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.columnOptionCard,
                              listingColumnsChoice === 2 && styles.columnOptionCardActive,
                            ]}
                            onPress={() => setListingColumnsChoice(2)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="grid"
                              size={22}
                              color={listingColumnsChoice === 2 ? colors.primary : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.columnOptionTitle,
                                listingColumnsChoice === 2 && { color: colors.primary, fontWeight: '800' },
                              ]}
                            >
                              2 Colunas
                            </Text>
                            <Text style={styles.columnOptionSub}>Grade, mais registros visíveis</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Bloco 6: Sistema & Atualizações */}
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeaderTitle}>SISTEMA & ATUALIZAÇÕES</Text>

                      <View style={styles.updateCardContent}>
                        <View style={styles.updateInfoRow}>
                          <View style={styles.updateIconCircle}>
                            <Ionicons name="hardware-chip-outline" size={20} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.updateAppName}>Ordo Companion</Text>
                            <Text style={styles.updateVersionText}>
                              Versão instalada: <Text style={{ fontWeight: '800', color: colors.text }}>v{Constants.expoConfig?.version || '1.0.0'}</Text>
                            </Text>
                          </View>
                          {updateInfo?.hasUpdate && (
                            <View style={styles.updateAvailablePill}>
                              <Text style={styles.updateAvailablePillText}>Nova v{updateInfo.latestVersion}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.fieldHint}>
                          Mantenha seu grimório digital sincronizado e atualizado com as últimas regras, suplementos e melhorias da Ordem.
                        </Text>

                        <TouchableOpacity
                          style={[styles.checkUpdateButton, { borderColor: colors.primary }]}
                          onPress={handleCheckUpdatesManually}
                          disabled={isCheckingUpdate}
                          activeOpacity={0.8}
                        >
                          {isCheckingUpdate ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                          ) : (
                            <>
                              <Ionicons
                                name={updateInfo?.hasUpdate ? 'cloud-download-outline' : 'refresh-outline'}
                                size={18}
                                color={colors.primary}
                              />
                              <Text style={[styles.checkUpdateButtonText, { color: colors.primary }]}>
                                {updateInfo?.hasUpdate ? 'Ver Nova Atualização' : 'Verificar Atualizações'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : activeTab === 'navegacao' ? (
                  <>
                    {/* Aba de Navegação & Abas da Barra Inferior */}
                    <View style={styles.infoBanner}>
                      <Ionicons name="reorder-three-outline" size={18} color={colors.primary} />
                      <Text style={styles.infoBannerText}>
                        Personalize os botões da barra inferior, defina a ordem de exibição ou oculte telas que não usa (como a aba de Mestre).
                      </Text>
                    </View>

                    {/* Bloco 1: Prévia Visual Dinâmica da Barra */}
                    <View style={styles.sectionCard}>
                      <View style={styles.navSectionHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>PRÉVIA DA BARRA INFERIOR</Text>
                        <View style={styles.tabCountPill}>
                          <Text style={styles.tabCountPillText}>{resolvedTabs.pinnedTabs.length} Fixadas</Text>
                        </View>
                      </View>
                      <Text style={styles.fieldHint}>
                        Assim ficará o rodapé do seu aplicativo com as preferências atuais:
                      </Text>

                      <View style={styles.previewBarContainer}>
                        {resolvedTabs.pinnedTabs.map((tabKey) => {
                          const meta = getTabMetadata(tabKey);
                          return (
                            <View key={tabKey} style={styles.previewTabItem}>
                              <Ionicons name={meta.icon as any} size={16} color={colors.primary} />
                              <Text style={styles.previewTabLabel} numberOfLines={1}>
                                {meta.label}
                              </Text>
                            </View>
                          );
                        })}

                        {resolvedTabs.overflowTabs.length > 0 ? (
                          <View style={[styles.previewTabItem, styles.previewTabMore]}>
                            <Ionicons name="apps" size={16} color={colors.textSecondary} />
                            <Text style={[styles.previewTabLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                              + Mais ({resolvedTabs.overflowTabs.length})
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {resolvedTabs.overflowTabs.length === 0 && (
                        <View style={styles.previewAllPinnedNotice}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.previewAllPinnedNoticeText}>
                            Todas as abas ativas estão na barra. O botão Mais foi removido automaticamente!
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bloco 2: Abas Fixadas na Barra Inferior */}
                    <View style={styles.sectionCard}>
                      <View style={styles.navSectionHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>
                          ABAS FIXADAS NA BARRA ({resolvedTabs.pinnedTabs.length})
                        </Text>
                      </View>
                      <Text style={styles.fieldHint}>
                        Estas telas possuem botões de acesso direto na barra inferior. Use as setas para ajustar a posição de cada ícone.
                      </Text>

                      <View style={{ gap: 8, marginTop: 8 }}>
                        {resolvedTabs.pinnedTabs.map((tabKey, idx) => {
                          const meta = getTabMetadata(tabKey);
                          const isFirst = idx === 0;
                          const isLast = idx === resolvedTabs.pinnedTabs.length - 1;
                          const isOnlyOne = resolvedTabs.pinnedTabs.length <= 1;

                          return (
                            <View key={tabKey} style={styles.tabConfigCard}>
                              <View style={styles.tabConfigLeft}>
                                <View style={styles.tabConfigIconBox}>
                                  <Ionicons name={meta.icon as any} size={18} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.tabConfigName}>{meta.label}</Text>
                                    <View style={styles.posBadge}>
                                      <Text style={styles.posBadgeText}>#{idx + 1}</Text>
                                    </View>
                                  </View>
                                  <Text style={styles.tabConfigDesc} numberOfLines={1}>
                                    {meta.description}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.tabConfigActions}>
                                <TouchableOpacity
                                  style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
                                  onPress={() => !isFirst && handleMovePinned(idx, idx - 1)}
                                  disabled={isFirst}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  accessibilityLabel="Mover para a esquerda/cima"
                                >
                                  <Ionicons
                                    name="arrow-up"
                                    size={16}
                                    color={isFirst ? colors.textMuted : colors.text}
                                  />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
                                  onPress={() => !isLast && handleMovePinned(idx, idx + 1)}
                                  disabled={isLast}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                  accessibilityLabel="Mover para a direita/baixo"
                                >
                                  <Ionicons
                                    name="arrow-down"
                                    size={16}
                                    color={isLast ? colors.textMuted : colors.text}
                                  />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[styles.actionPillBtn, isOnlyOne && styles.actionPillBtnDisabled]}
                                  onPress={() => !isOnlyOne && handleUnpin(tabKey)}
                                  disabled={isOnlyOne}
                                  accessibilityLabel="Mover para o modal Mais"
                                >
                                  <Ionicons
                                    name="arrow-down-circle-outline"
                                    size={13}
                                    color={isOnlyOne ? colors.textMuted : colors.textSecondary}
                                  />
                                  <Text
                                    style={[
                                      styles.actionPillText,
                                      { color: isOnlyOne ? colors.textMuted : colors.textSecondary },
                                    ]}
                                  >
                                    P/ Modal
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* Bloco 3: Abas no Menu Mais (Modal) */}
                    <View style={styles.sectionCard}>
                      <View style={styles.navSectionHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>
                          ABAS NO MENU MAIS ({resolvedTabs.overflowTabs.length})
                        </Text>
                      </View>
                      <Text style={styles.fieldHint}>
                        Acessadas tocando no botão "+ Mais" da barra. Quanto mais abas você fixar, menos itens restarão aqui até remover o botão do modal.
                      </Text>

                      <View style={{ gap: 8, marginTop: 8 }}>
                        {resolvedTabs.overflowTabs.length === 0 ? (
                          <View style={styles.emptyTabsBox}>
                            <Ionicons name="sparkles" size={24} color={colors.primary} />
                            <Text style={styles.emptyTabsTitle}>Todas as abas ativas estão fixadas na barra!</Text>
                            <Text style={styles.emptyTabsSub}>
                              Nenhuma aba restante no modal. O botão Mais foi removido automaticamente da barra.
                            </Text>
                          </View>
                        ) : (
                          resolvedTabs.overflowTabs.map((tabKey) => {
                            const meta = getTabMetadata(tabKey);

                            return (
                              <View key={tabKey} style={styles.tabConfigCard}>
                                <View style={styles.tabConfigLeft}>
                                  <View style={[styles.tabConfigIconBox, { backgroundColor: colors.surfaceHighlight }]}>
                                    <Ionicons name={meta.icon as any} size={18} color={colors.textSecondary} />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.tabConfigName}>{meta.label}</Text>
                                    <Text style={styles.tabConfigDesc} numberOfLines={1}>
                                      {meta.description}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.tabConfigActions}>
                                  <TouchableOpacity
                                    style={[styles.actionPillBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                                    onPress={() => handlePin(tabKey)}
                                    accessibilityLabel="Fixar na barra inferior"
                                  >
                                    <Ionicons name="add" size={14} color={colors.primary} />
                                    <Text style={[styles.actionPillText, { color: colors.primary, fontWeight: '800' }]}>
                                      Fixar na Barra
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.actionPillBtn}
                                    onPress={() => handleHide(tabKey)}
                                    accessibilityLabel="Ocultar aba completamente"
                                  >
                                    <Ionicons name="eye-off-outline" size={13} color={colors.textMuted} />
                                    <Text style={[styles.actionPillText, { color: colors.textMuted }]}>
                                      Ocultar
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>

                    {/* Bloco 4: Abas Ocultas */}
                    <View style={styles.sectionCard}>
                      <View style={styles.navSectionHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>
                          ABAS OCULTAS ({resolvedTabs.hiddenTabs.length})
                        </Text>
                      </View>
                      <Text style={styles.fieldHint}>
                        Desativadas do app. Não aparecem na barra inferior nem no menu Mais. Ideal para telas especializadas (ex: Mestre).
                      </Text>

                      <View style={{ gap: 8, marginTop: 8 }}>
                        {resolvedTabs.hiddenTabs.length === 0 ? (
                          <View style={styles.emptyTabsBox}>
                            <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
                            <Text style={[styles.emptyTabsSub, { textAlign: 'center' }]}>
                              Nenhuma aba oculta. Todas as telas disponíveis estão ativas.
                            </Text>
                          </View>
                        ) : (
                          resolvedTabs.hiddenTabs.map((tabKey) => {
                            const meta = getTabMetadata(tabKey);

                            return (
                              <View key={tabKey} style={[styles.tabConfigCard, { opacity: 0.9 }]}>
                                <View style={styles.tabConfigLeft}>
                                  <View style={[styles.tabConfigIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Ionicons name="eye-off" size={18} color="#EF4444" />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.tabConfigName}>{meta.label}</Text>
                                    <Text style={styles.tabConfigDesc} numberOfLines={1}>
                                      Oculta da navegação
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.tabConfigActions}>
                                  <TouchableOpacity
                                    style={[styles.actionPillBtn, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
                                    onPress={() => handleUnhide(tabKey, false)}
                                    accessibilityLabel="Reativar aba no menu Mais"
                                  >
                                    <Ionicons name="refresh" size={13} color={colors.primary} />
                                    <Text style={[styles.actionPillText, { color: colors.primary, fontWeight: '800' }]}>
                                      Reativar
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>

                    {/* Bloco 5: Botão de Restaurar Padrões */}
                    <View style={{ marginBottom: 12 }}>
                      <TouchableOpacity
                        style={styles.resetNavBtn}
                        onPress={handleResetNavigation}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.resetNavBtnText}>Restaurar Layout Padrão da Barra</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Aba Nuvem / Google Drive */}
                    {/* Bloco 1: Status e Conexão da Conta Google Drive */}
                    <View style={styles.sectionCard}>
                      <View style={styles.cloudStatusRow}>
                        <View
                          style={[
                            styles.cloudStatusIconBox,
                            {
                              backgroundColor: syncAuthState.isAuthenticated
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.12)',
                            },
                          ]}
                        >
                          <Ionicons
                            name={syncAuthState.isAuthenticated ? 'cloud-done' : 'logo-google'}
                            size={26}
                            color={syncAuthState.isAuthenticated ? '#10B981' : colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.cloudStatusTitleRow}>
                            <Text style={styles.cloudStatusTitle}>Google Drive Cloud Sync</Text>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor: syncAuthState.isAuthenticated
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : colors.surfaceHighlight,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: syncAuthState.isAuthenticated ? '#10B981' : colors.textSecondary },
                                ]}
                              >
                                {syncAuthState.isAuthenticated ? 'Conectado' : 'Desconectado'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.cloudStatusSub}>
                            Salva suas fichas, armas e dados na pasta segura (appDataFolder) do seu Drive pessoal.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      {/* Usuário Conectado vs Botão Conectar */}
                      {syncAuthState.isAuthenticated ? (
                        <View style={styles.googleAccountBox}>
                          <View style={styles.googleUserInfoRow}>
                            {syncAuthState.userPhoto ? (
                              <Image
                                source={{ uri: syncAuthState.userPhoto }}
                                style={styles.googleAvatar}
                              />
                            ) : (
                              <View style={styles.googleAvatarPlaceholder}>
                                <Ionicons name="person" size={18} color={colors.primary} />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.googleUserName}>
                                {syncAuthState.userName || 'Jogador Conectado'}
                              </Text>
                              <Text style={styles.googleUserEmail}>
                                {syncAuthState.userEmail || 'Conta Google Ativa'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.disconnectBtn}
                              onPress={handleDisconnectDrive}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                              <Text style={styles.disconnectBtnText}>Desconectar</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Botão Sincronizar Agora */}
                          <TouchableOpacity
                            style={[styles.syncNowBtn, isManualSyncing && styles.syncNowBtnActive]}
                            onPress={handleManualSync}
                            disabled={isManualSyncing}
                            activeOpacity={0.8}
                          >
                            {isManualSyncing ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <Ionicons name="sync" size={18} color="#FFF" />
                            )}
                            <Text style={styles.syncNowBtnText}>
                              {isManualSyncing
                                ? 'Sincronizando com o Drive...'
                                : 'Sincronizar com Google Drive Agora'}
                            </Text>
                          </TouchableOpacity>

                          {syncStatusMessage && (
                            <Text style={styles.syncStatusNoticeText}>{syncStatusMessage}</Text>
                          )}
                        </View>
                      ) : (
                        <View style={styles.googleConnectBox}>
                          <Text style={styles.googleConnectExplain}>
                            Conecte sua conta do Google para sincronizar suas fichas automaticamente entre seu celular Android e navegador Web sem risco de perder dados.
                          </Text>

                          <TouchableOpacity
                            style={styles.googleLoginBtn}
                            onPress={handleConnectDrive}
                            disabled={isConnectingDrive}
                            activeOpacity={0.8}
                          >
                            {isConnectingDrive ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <Ionicons name="logo-google" size={18} color="#FFF" />
                            )}
                            <Text style={styles.googleLoginBtnText}>
                              {isConnectingDrive ? 'Conectando ao Google...' : 'Conectar com Conta Google'}
                            </Text>
                          </TouchableOpacity>

                          {syncAuthState.error && (
                            <View style={styles.errorMessageBox}>
                              <Ionicons name="alert-circle" size={16} color={colors.danger} />
                              <Text style={styles.errorMessageText}>{syncAuthState.error}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <View style={styles.divider} />

                      {/* Toggle de Sincronização Automática */}
                      <View style={styles.toggleRow}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.toggleLabel}>Sincronização Automática ao Salvar</Text>
                          <Text style={styles.toggleSub}>
                            Envia alterações de personagens, armas e favoritos para o Google Drive em segundo plano.
                          </Text>
                        </View>
                        <Switch
                          value={autoSyncEnabled}
                          onValueChange={setAutoSyncEnabled}
                          disabled={!syncAuthState.isAuthenticated}
                          trackColor={{ false: colors.border, true: colors.primary }}
                          thumbColor="#FFF"
                        />
                      </View>
                    </View>

                    {/* Bloco 2: Informações de Armazenamento e Estatísticas */}
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionHeaderTitle}>DADOS NO GOOGLE DRIVE</Text>

                      <View style={styles.appDataInfoBox}>
                        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.appDataInfoTitle}>Pasta Oculta Protegida (appDataFolder)</Text>
                          <Text style={styles.appDataInfoSub}>
                            Os dados ficam armazenados na área restrita do aplicativo no seu Google Drive. Isso impede que arquivos sejam apagados acidentalmente na lixeira do Drive comum.
                          </Text>
                        </View>
                      </View>

                      {lastSyncStats && (
                        <View style={styles.statsGrid}>
                          <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{lastSyncStats.charactersCount}</Text>
                            <Text style={styles.statLabel}>Fichas</Text>
                          </View>
                          <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{lastSyncStats.weaponsCount}</Text>
                            <Text style={styles.statLabel}>Armas</Text>
                          </View>
                          <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{lastSyncStats.customEntitiesCount}</Text>
                            <Text style={styles.statLabel}>Homebrews</Text>
                          </View>
                          <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{lastSyncStats.favoritesCount}</Text>
                            <Text style={styles.statLabel}>Favoritos</Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>ID Permanente do Jogador:</Text>
                        <Text style={styles.metaValue}>{userProfile?.id || 'user_local_1'}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Última Sincronização:</Text>
                        <Text style={styles.metaValue}>{formatDate(userProfile?.lastSyncAt)}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Algoritmo de Conflitos:</Text>
                        <Text style={[styles.metaValue, { color: colors.primary }]}>
                          Smart Merge Inteligente (Sem Perdas)
                        </Text>
                      </View>
                    </View>

                    {/* Bloco 3: Configuração Avançada & Backup JSON Local */}
                    <View style={styles.sectionCard}>
                      <TouchableOpacity
                        style={styles.advancedToggleRow}
                        onPress={() => setShowAdvancedConfig(!showAdvancedConfig)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sectionHeaderTitle}>CONFIGURAÇÃO AVANÇADA DE CLIENT ID</Text>
                        <Ionicons
                          name={showAdvancedConfig ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>

                      {showAdvancedConfig && (
                        <View style={{ gap: 12, marginTop: 4 }}>
                          {/* Redirect URI Informativo */}
                          <View style={styles.redirectUriBox}>
                            <Text style={styles.redirectUriLabel}>
                              Redirect URI Autorizado (Copie e cole no Google Cloud):
                            </Text>
                            <View style={styles.redirectUriRow}>
                              <Text style={styles.redirectUriText} numberOfLines={1} selectable>
                                {GoogleDriveService.getInstance().getRedirectUri()}
                              </Text>
                              <TouchableOpacity
                                style={styles.copyUriBtn}
                                onPress={handleCopyRedirectUri}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="copy-outline" size={13} color={colors.primary} />
                                <Text style={styles.copyUriBtnText}>Copiar</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Campo de Client ID */}
                          <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.fieldLabel}>Custom Google OAuth Client ID</Text>
                              {GoogleDriveService.getInstance().hasCustomClientId() && (
                                <TouchableOpacity
                                  onPress={handleResetCustomClientId}
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="arrow-undo-outline" size={12} color={colors.primary} />
                                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                                    Restaurar Padrão
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="seu-client-id.apps.googleusercontent.com"
                                placeholderTextColor={colors.textMuted}
                                autoCapitalize="none"
                                value={customClientIdInput}
                                onChangeText={setCustomClientIdInput}
                              />
                              <TouchableOpacity
                                style={styles.saveClientBtn}
                                onPress={handleSaveCustomClientId}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.saveClientBtnText}>Salvar</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.fieldHint}>
                              Formato: xxxxx.apps.googleusercontent.com. Não insira links de pastas ou URLs do Google Drive aqui.
                            </Text>
                          </View>

                          {/* Toggle do Guia Passo a Passo */}
                          <TouchableOpacity
                            style={styles.guideToggleBtn}
                            onPress={() => setShowGuideSteps(!showGuideSteps)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="help-circle-outline" size={15} color={colors.primary} />
                            <Text style={styles.guideToggleText}>
                              {showGuideSteps ? 'Ocultar instruções de configuração' : 'Como obter seu Client ID no Google Cloud'}
                            </Text>
                            <Ionicons
                              name={showGuideSteps ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>

                          {showGuideSteps && (
                            <View style={styles.guideBox}>
                              <Text style={styles.guideTitle}>Passo a Passo & Regras de Segurança OAuth 2.0:</Text>
                              <Text style={styles.guideStep}>
                                1. Acesse https://console.cloud.google.com e crie ou selecione seu projeto gratuito.
                              </Text>
                              <Text style={styles.guideStep}>
                                2. Vá em "APIs e Serviços" &gt; "Biblioteca" e ative a "Google Drive API".
                              </Text>
                              <Text style={styles.guideStep}>
                                3. IMPORTANTE (Tela de Consentimento): Em "Tela de permissão OAuth", caso o status esteja "Em teste", adicione obrigatoriamente seu e-mail do Google na lista de "Usuários de teste". Caso contrário, o Google bloqueará o login com erro de conformidade OAuth 2.0.
                              </Text>
                              <Text style={styles.guideStep}>
                                4. Tipo de Cliente no Google Cloud:
                                {'\n'}• Para Navegador Web: Crie Credenciais &gt; ID do cliente OAuth &gt; "Aplicativo da Web". Em "URIs de redirecionamento autorizados", adicione o Redirect URI exibido acima.
                                {'\n'}• Para Celular APK (Android): Crie Credenciais &gt; ID do cliente OAuth &gt; "Android". Informe o Pacote "com.ordemparanormal.ordo" e a impressão digital SHA-1 do certificado da sua chave de compilação (EAS ou debug).
                              </Text>
                              <Text style={styles.guideStep}>
                                5. Copie o Client ID gerado (.apps.googleusercontent.com), cole no campo acima e toque em "Salvar".
                              </Text>
                            </View>
                          )}

                          <View style={styles.divider} />
                        </View>
                      )}

                      {/* Botões Rápidos de Backup Local (Alternativa Rápida) */}
                      <View style={{ gap: 8 }}>
                        <Text style={styles.fieldLabel}>Backup e Transferência sem Nuvem</Text>
                        <View style={styles.backupButtonsRow}>
                          <TouchableOpacity
                            style={[styles.exportQuickBtn, { flex: 1 }]}
                            onPress={handleExportBackup}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="copy-outline" size={16} color={colors.primary} />
                            <Text style={styles.exportQuickBtnText}>Copiar JSON</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.importQuickBtn, { flex: 1 }]}
                            onPress={handleImportBackup}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="download-outline" size={16} color="#10B981" />
                            <Text style={styles.importQuickBtnText}>Restaurar JSON</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.fieldHint}>
                          Transfira suas fichas, armas e dados entre dispositivos copiando e colando o JSON de backup sem precisar de conta de desenvolvedor do Google.
                        </Text>
                      </View>
                    </View>

                    {/* Bloco 4: Servidor de Renderização de PDFs (Alta Resolução) */}
                    <View style={styles.sectionCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={styles.sectionHeaderTitle}>LEITOR DE PDFS (ALTA RESOLUÇÃO)</Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            backgroundColor: isPdfServerConfigured()
                              ? 'rgba(16, 185, 129, 0.12)'
                              : colors.surfaceElevated,
                            borderWidth: 1,
                            borderColor: isPdfServerConfigured()
                              ? 'rgba(16, 185, 129, 0.35)'
                              : colors.border,
                          }}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isPdfServerConfigured() ? '#10B981' : colors.textMuted,
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: isPdfServerConfigured() ? '#10B981' : colors.textMuted,
                            }}
                          >
                            {isPdfServerConfigured() ? 'Servidor Ativo' : 'Modo Offline (Texto)'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.fieldHint}>
                        O aplicativo opera 100% offline em Modo Texto oficial por padrão. Caso queira visualizar as páginas ilustradas dos livros em alta definição, informe o endereço do servidor (ex: http://192.168.1.15:8081).
                      </Text>

                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>URL do Servidor de PDFs</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="http://192.168.1.15:8081"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            value={pdfServerInput}
                            onChangeText={setPdfServerInput}
                          />
                          <TouchableOpacity
                            style={[
                              styles.saveClientBtn,
                              {
                                backgroundColor: colors.surfaceElevated,
                                borderWidth: 1,
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={handleTestPdfServer}
                            disabled={pdfTesting}
                            activeOpacity={0.8}
                          >
                            {pdfTesting ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Text style={[styles.saveClientBtnText, { color: colors.text }]}>Testar</Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.saveClientBtn}
                            onPress={handleSavePdfServer}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.saveClientBtnText}>Salvar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {pdfTestResult && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            padding: 10,
                            borderRadius: 8,
                            backgroundColor: pdfTestResult.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 1,
                            borderColor: pdfTestResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          <Ionicons
                            name={pdfTestResult.ok ? 'checkmark-circle' : 'alert-circle'}
                            size={16}
                            color={pdfTestResult.ok ? '#10B981' : colors.danger}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: pdfTestResult.ok ? '#10B981' : colors.danger,
                              flex: 1,
                              fontWeight: '600',
                            }}
                          >
                            {pdfTestResult.message}
                          </Text>
                        </View>
                      )}

                      {Boolean(pdfServerInput.trim()) && (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 2 }}
                          onPress={handleResetPdfServer}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="arrow-undo-outline" size={13} color={colors.textMuted} />
                          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                            Restaurar Modo Offline Integrado
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

            {/* Rodapé de Ações */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Fechar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, saveSuccess && styles.saveBtnSuccess]}
                onPress={handleSave}
              >
                <Ionicons
                  name={saveSuccess ? 'checkmark-circle' : 'save'}
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.saveBtnText}>
                  {saveSuccess ? 'Salvo com Sucesso!' : 'Salvar Informações'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    keyboardAvoid: {
      width: '100%',
      maxWidth: 540,
      height: '88%',
      maxHeight: 740,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    headerTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 8,
    },
    tabsNav: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    tabButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    tabButtonTextActive: {
      color: colors.text,
      fontWeight: '800',
    },
    cloudActiveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#10B981',
      marginLeft: 2,
    },
    bodyScroll: {
      flex: 1,
    },
    bodyContent: {
      padding: 16,
      gap: 14,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    infoBannerText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 17,
      flex: 1,
    },
    sectionCard: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 12,
    },
    sectionHeaderTitle: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    inputGroup: {
      gap: 5,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    requiredStar: {
      color: colors.danger,
      fontWeight: '900',
    },
    fieldHint: {
      fontSize: 10,
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 13,
    },
    textArea: {
      minHeight: 65,
      textAlignVertical: 'top',
    },
    classGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    classCard: {
      flex: 1,
      minWidth: 110,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      alignItems: 'flex-start',
      gap: 3,
    },
    classCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
      borderWidth: 1.5,
    },
    classCardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    classCardTitleSelected: {
      color: colors.primary,
    },
    classCardDesc: {
      fontSize: 9,
      color: colors.textSecondary,
      lineHeight: 12,
    },
    columnsSelectRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    columnOptionCard: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 6,
    },
    columnOptionCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    columnOptionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    columnOptionSub: {
      fontSize: 10.5,
      color: colors.textMuted,
      textAlign: 'center',
    },
    cloudStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cloudStatusIconBox: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cloudStatusTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cloudStatusTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    cloudStatusSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    toggleSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metaLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    metaValue: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    googleAccountBox: {
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    googleUserInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    googleAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    googleAvatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleUserName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    googleUserEmail: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    linkedAccountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    linkedAccountLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    linkedAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: '#10B981',
    },
    linkedAvatarPlaceholder: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkedAccountName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      flexShrink: 1,
    },
    linkedAccountEmail: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    connectedBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    connectedBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
    },
    linkedManageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: colors.primarySoft,
    },
    linkedManageBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    unlinkedAccountCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    unlinkedAccountLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    unlinkedIconBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unlinkedTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    unlinkedSub: {
      fontSize: 10.5,
      color: colors.textMuted,
      marginTop: 1,
    },
    connectLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: colors.primarySoft,
    },
    connectLinkBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.primary,
    },
    disconnectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    disconnectBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.danger,
    },
    syncNowBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#10B981',
      paddingVertical: 10,
      borderRadius: 8,
    },
    syncNowBtnActive: {
      opacity: 0.8,
    },
    syncNowBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    syncStatusNoticeText: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
    },
    googleConnectBox: {
      gap: 10,
      paddingVertical: 4,
    },
    googleConnectExplain: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    googleLoginBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 11,
      borderRadius: 8,
    },
    googleLoginBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    errorMessageBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      padding: 8,
      borderRadius: 6,
    },
    errorMessageText: {
      color: colors.danger,
      fontSize: 11,
      flex: 1,
    },
    appDataInfoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
      padding: 10,
      borderRadius: 8,
    },
    appDataInfoTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
      marginBottom: 2,
    },
    appDataInfoSub: {
      fontSize: 10.5,
      color: colors.textSecondary,
      lineHeight: 14,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 1,
    },
    advancedToggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    saveClientBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      justifyContent: 'center',
      borderRadius: 8,
    },
    saveClientBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    exportQuickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    exportQuickBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
    },
    importQuickBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    importQuickBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#10B981',
    },
    backupButtonsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    redirectUriBox: {
      backgroundColor: colors.surfaceHighlight,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    redirectUriLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    redirectUriRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    redirectUriText: {
      flex: 1,
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      color: colors.text,
    },
    copyUriBtn: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    copyUriBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    guideToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    guideToggleText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    guideBox: {
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    guideTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primary,
      marginBottom: 2,
    },
    guideStep: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    navSectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    tabCountPill: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    tabCountPillText: {
      fontSize: 10,
      fontWeight: '900',
      color: colors.primary,
    },
    previewBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 8,
      marginTop: 8,
      gap: 4,
    },
    previewTabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    previewTabMore: {
      opacity: 0.8,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },
    previewTabLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 2,
      textAlign: 'center',
    },
    previewAllPinnedNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    previewAllPinnedNoticeText: {
      color: '#10B981',
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
    tabConfigCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      gap: 10,
    },
    tabConfigLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    tabConfigIconBox: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabConfigName: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    tabConfigDesc: {
      fontSize: 10.5,
      color: colors.textMuted,
      marginTop: 1,
    },
    posBadge: {
      backgroundColor: colors.surfaceHighlight,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    posBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: colors.textSecondary,
    },
    tabConfigActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    arrowBtn: {
      width: 30,
      height: 30,
      borderRadius: 6,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowBtnDisabled: {
      opacity: 0.35,
    },
    actionPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceHighlight,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 6,
    },
    actionPillBtnDisabled: {
      opacity: 0.35,
    },
    actionPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    emptyTabsBox: {
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceHighlight,
      borderRadius: 8,
      gap: 4,
    },
    emptyTabsTitle: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },
    emptyTabsSub: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 15,
    },
    resetNavBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    resetNavBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    cancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
    },
    cancelBtnText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 8,
    },
    saveBtnSuccess: {
      backgroundColor: '#10B981',
    },
    saveBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '800',
    },
    updateCardContent: {
      marginTop: 6,
      gap: 10,
    },
    updateInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    updateIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    updateAppName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    updateVersionText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    updateAvailablePill: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    updateAvailablePillText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primary,
    },
    checkUpdateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: colors.surfaceElevated,
      gap: 8,
      minHeight: 42,
    },
    checkUpdateButtonText: {
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
