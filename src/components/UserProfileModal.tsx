import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
import { showAlert } from '../utils/alert';
import { GoogleDriveService } from '../services/sync/GoogleDriveService';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const PREFERRED_CLASSES = [
  { id: 'Combatente', name: 'Combatente', icon: 'flame', desc: 'Combate e Vigor' },
  { id: 'Especialista', name: 'Especialista', icon: 'bulb', desc: 'Perícias e Intelecto' },
  { id: 'Ocultista', name: 'Ocultista', icon: 'skull', desc: 'Rituais e Presença' },
  { id: 'Sobrevivente', name: 'Sobrevivente', icon: 'shield', desc: 'Resiliência e Adaptação' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const {
    userProfile,
    updateUserProfile,
    exportBackupJson,
    syncStatus,
    syncStatusMessage,
    syncAuthState,
    connectGoogleDrive,
    disconnectGoogleDrive,
    syncWithDriveNow,
    autoSyncEnabled,
    setAutoSyncEnabled,
    lastSyncStats,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'identidade' | 'nuvem'>('identidade');
  const [playerName, setPlayerName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [preferredClass, setPreferredClass] = useState('Combatente');
  const [defaultCampaign, setDefaultCampaign] = useState('');
  const [masterName, setMasterName] = useState('');
  const [notes, setNotes] = useState('');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudSyncUrl, setCloudSyncUrl] = useState('');
  const [listingColumnsChoice, setListingColumnsChoice] = useState<1 | 2>(1);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados locais da sincronização com Google Drive
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState('');

  // Sincroniza estado com o userProfile salvo sempre que o modal abre
  useEffect(() => {
    if (visible && userProfile) {
      setPlayerName(userProfile.playerName || '');
      setNickname(userProfile.nickname || '');
      setEmail(userProfile.email || '');
      setPreferredClass(userProfile.preferredClass || 'Combatente');
      setDefaultCampaign(userProfile.defaultCampaign || '');
      setMasterName(userProfile.masterName || '');
      setNotes(userProfile.notes || '');
      setCloudSyncEnabled(!!userProfile.cloudSyncEnabled);
      setCloudSyncUrl(userProfile.cloudSyncUrl || '');
      setListingColumnsChoice(userProfile.listingColumns === 2 ? 2 : 1);
      setCustomClientIdInput(GoogleDriveService.getInstance().getClientId());
      setSaveSuccess(false);
    }
  }, [visible, userProfile]);

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
    await GoogleDriveService.getInstance().setCustomClientId(customClientIdInput);
    showAlert('Configuração Salva', 'Client ID do Google Cloud atualizado com sucesso.');
  };

  const handleSave = async () => {
    await updateUserProfile({
      playerName: playerName.trim(),
      nickname: nickname.trim(),
      email: email.trim(),
      preferredClass,
      defaultCampaign: defaultCampaign.trim(),
      masterName: masterName.trim(),
      notes: notes.trim(),
      cloudSyncEnabled,
      cloudSyncUrl: cloudSyncUrl.trim(),
      listingColumns: listingColumnsChoice,
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Cabeçalho */}
              <View style={styles.header}>
                <View style={styles.headerTitleWrap}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.title}>Perfil & Identidade do Jogador</Text>
                    <Text style={styles.subtitle}>Informações gerais e integração em nuvem</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Navegação de Abas internas */}
              <View style={styles.tabsNav}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'identidade' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('identidade')}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={16}
                    color={activeTab === 'identidade' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      activeTab === 'identidade' && styles.tabButtonTextActive,
                    ]}
                  >
                    Identidade & Fichas
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'nuvem' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('nuvem')}
                >
                  <Ionicons
                    name="cloud-outline"
                    size={16}
                    color={activeTab === 'nuvem' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[styles.tabButtonText, activeTab === 'nuvem' && styles.tabButtonTextActive]}
                  >
                    Nuvem & Sincronização
                  </Text>
                  {cloudSyncEnabled && <View style={styles.cloudActiveDot} />}
                </TouchableOpacity>
              </View>

              {/* Conteúdo rolável */}
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
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
                        <Text style={styles.fieldLabel}>E-mail de Vinculação</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="seu.email@exemplo.com"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={email}
                          onChangeText={setEmail}
                        />
                        <Text style={styles.fieldHint}>
                          Identificador que será utilizado para login e sincronização de dados na nuvem.
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
                        <View style={{ gap: 10, marginTop: 4 }}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.fieldLabel}>Custom Google OAuth Client ID</Text>
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
                              Deixe o padrão para usar o app ou configure seu Client ID do Google Cloud Console para build próprio.
                            </Text>
                          </View>

                          <View style={styles.divider} />
                        </View>
                      )}

                      <TouchableOpacity style={styles.exportQuickBtn} onPress={handleExportBackup}>
                        <Ionicons name="copy-outline" size={16} color={colors.primary} />
                        <Text style={styles.exportQuickBtnText}>
                          Copiar Backup JSON Completo para Área de Transferência
                        </Text>
                      </TouchableOpacity>
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
      padding: 16,
    },
    container: {
      width: '100%',
      maxWidth: 540,
      maxHeight: '90%',
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
  });
}
