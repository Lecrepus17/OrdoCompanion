import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { ThemeColors, useTheme, useThemedStyles } from '../theme';
import { useApp } from '../context/AppContext';
import { showAlert } from '../utils/alert';
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  supportService,
} from '../services/support/SupportService';
import {
  SupportCategory,
  SupportSeverity,
  SupportTicketPayload,
  SupportTicketRecord,
} from '../services/support/types';

interface SupportCenterViewProps {
  /** Se true, renderiza sem ScrollView externo próprio para caber dentro de modais que já possuem rolagem */
  embedded?: boolean;
  /** Rota de origem opcional */
  activeRoute?: string;
}

const CATEGORIES: Array<{
  id: SupportCategory;
  label: string;
  shortLabel: string;
  icon: string;
  desc: string;
}> = [
  {
    id: 'bug',
    label: 'Bug / Erro Técnico',
    shortLabel: 'Bug / Erro',
    icon: 'bug-outline',
    desc: 'Travamento, falha visual ou cálculo incorreto',
  },
  {
    id: 'rule_error',
    label: 'Erro de Regra / Compêndio',
    shortLabel: 'Erro de Regra',
    icon: 'book-outline',
    desc: 'Texto, ritual, arma ou criatura divergente do livro',
  },
  {
    id: 'suggestion',
    label: 'Sugestão / Melhoria',
    shortLabel: 'Sugestão',
    icon: 'bulb-outline',
    desc: 'Ideia de nova função ou melhoria de interface',
  },
  {
    id: 'contact',
    label: 'Dúvida / Falar com o Dev',
    shortLabel: 'Contato Direto',
    icon: 'chatbubbles-outline',
    desc: 'Entrar em contato direto ou tirar dúvidas',
  },
];

const SEVERITIES: Array<{ id: SupportSeverity; label: string; icon: string; color: string }> = [
  { id: 'low', label: 'Leve', icon: 'information-circle-outline', color: '#3B82F6' },
  { id: 'medium', label: 'Moderado', icon: 'alert-circle-outline', color: '#F59E0B' },
  { id: 'high', label: 'Crítico', icon: 'warning-outline', color: '#EF4444' },
];

export const SupportCenterView: React.FC<SupportCenterViewProps> = ({
  embedded = false,
  activeRoute,
}) => {
  const { colors, themeId } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    userProfile,
    characters,
    campaigns,
    customWeapons,
    syncAuthState,
  } = useApp();

  const [category, setCategory] = useState<SupportCategory>('bug');
  const [severity, setSeverity] = useState<SupportSeverity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [senderName, setSenderName] = useState('');
  const [contactReturn, setContactReturn] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [showDiagnosticsPreview, setShowDiagnosticsPreview] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedTicket, setLastSubmittedTicket] = useState<SupportTicketRecord | null>(null);
  const [ticketHistory, setTicketHistory] = useState<SupportTicketRecord[]>([]);

  // Configuração opcional de Webhook customizado
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [customWebhookInput, setCustomWebhookInput] = useState('');

  const contactConfig = useMemo(() => supportService.getConfig(), []);

  // Preenche nome e contato a partir do perfil do jogador
  useEffect(() => {
    if (userProfile) {
      if (!senderName && (userProfile.playerName || userProfile.nickname)) {
        const display = userProfile.playerName
          ? userProfile.nickname
            ? `${userProfile.playerName} (${userProfile.nickname})`
            : userProfile.playerName
          : userProfile.nickname || '';
        setSenderName(display);
      }
      if (!contactReturn && (syncAuthState?.userEmail || userProfile.email)) {
        setContactReturn(syncAuthState?.userEmail || userProfile.email || '');
      }
    }
  }, [userProfile, syncAuthState]);

  const loadHistoryAndWebhook = useCallback(async () => {
    const [history, savedWebhook] = await Promise.all([
      supportService.getTicketHistory(),
      supportService.getEffectiveWebhookUrl(),
    ]);
    setTicketHistory(history);
    setCustomWebhookInput(savedWebhook);
  }, []);

  useEffect(() => {
    loadHistoryAndWebhook();
  }, [loadHistoryAndWebhook]);

  const diagnostics = useMemo(() => {
    return supportService.collectDiagnostics({
      themeId,
      playerName: senderName || userProfile?.playerName || 'Agente Anônimo',
      nickname: userProfile?.nickname,
      charactersCount: characters?.length ?? 0,
      campaignsCount: campaigns?.length ?? 0,
      customWeaponsCount: customWeapons?.length ?? 0,
      cloudSyncEnabled: Boolean(userProfile?.cloudSyncEnabled || syncAuthState?.isAuthenticated),
      activeRoute,
    });
  }, [
    themeId,
    senderName,
    userProfile,
    characters?.length,
    campaigns?.length,
    customWeapons?.length,
    syncAuthState?.isAuthenticated,
    activeRoute,
  ]);

  const buildCurrentPayload = useCallback((): SupportTicketPayload => {
    return {
      category,
      severity: category === 'bug' || category === 'rule_error' ? severity : undefined,
      title: title.trim() || `${CATEGORY_LABELS[category].label} - Ordo Companion`,
      description: description.trim(),
      stepsToReproduce: stepsToReproduce.trim() || undefined,
      senderName: senderName.trim() || undefined,
      contactReturn: contactReturn.trim() || undefined,
      includeDiagnostics,
      diagnostics: includeDiagnostics ? diagnostics : undefined,
    };
  }, [
    category,
    severity,
    title,
    description,
    stepsToReproduce,
    senderName,
    contactReturn,
    includeDiagnostics,
    diagnostics,
  ]);

  const validateForm = (): boolean => {
    if (!title.trim() && !description.trim()) {
      showAlert(
        'Campos Obrigatórios',
        'Por favor, preencha ao menos um título ou uma descrição detalhando o erro, sugestão ou mensagem.'
      );
      return false;
    }
    return true;
  };

  const copyTextToClipboard = async (text: string, successTitle: string, successMsg: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showAlert(successTitle, successMsg);
        return true;
      }
      showAlert(successTitle, `${successMsg}\n\n${text}`);
      return true;
    } catch {
      showAlert(successTitle, text);
      return false;
    }
  };

  const handleSubmitDirect = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = buildCurrentPayload();
      const result = await supportService.submitTicketInApp(payload);

      setLastSubmittedTicket(result.ticket);
      const updatedHistory = await supportService.getTicketHistory();
      setTicketHistory(updatedHistory);

      // Limpa os campos de texto do relato mantendo identificação
      setTitle('');
      setDescription('');
      setStepsToReproduce('');

      showAlert(
        result.deliveredRemotely ? 'Relato Enviado com Sucesso!' : 'Protocolo Registrado!',
        result.message
      );
    } catch (err: any) {
      showAlert(
        'Erro ao Processar Relato',
        err?.message || 'Não foi possível enviar o relato no momento. Tente usar o botão Copiar Relatório ou GitHub.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenGitHubIssue = async () => {
    if (!validateForm()) return;
    const payload = buildCurrentPayload();
    const protocol = lastSubmittedTicket?.protocol || supportService.generateProtocol();
    const issueUrl = supportService.buildGitHubIssueUrl(payload, protocol);

    // Salva também no histórico local
    await supportService.saveTicketToHistory({
      ...payload,
      id: `ticket_${Date.now()}`,
      protocol,
      status: 'sent_remote',
      deliveryChannel: 'github_issue',
      createdAt: new Date().toISOString(),
    });
    const updatedHistory = await supportService.getTicketHistory();
    setTicketHistory(updatedHistory);

    await supportService.openExternalUrl(issueUrl);
  };

  const handleSendViaEmail = async () => {
    if (!validateForm()) return;
    const payload = buildCurrentPayload();
    const protocol = lastSubmittedTicket?.protocol || supportService.generateProtocol();
    const mailtoUrl = supportService.buildMailtoUrl(payload, protocol);

    await supportService.saveTicketToHistory({
      ...payload,
      id: `ticket_${Date.now()}`,
      protocol,
      status: 'sent_remote',
      deliveryChannel: 'email',
      createdAt: new Date().toISOString(),
    });
    const updatedHistory = await supportService.getTicketHistory();
    setTicketHistory(updatedHistory);

    await supportService.openExternalUrl(mailtoUrl);
  };

  const handleCopyFullReport = async () => {
    if (!validateForm()) return;
    const payload = buildCurrentPayload();
    const protocol = lastSubmittedTicket?.protocol || supportService.generateProtocol();
    const report = supportService.buildFormattedReport(payload, protocol);

    await copyTextToClipboard(
      report,
      'Relatório Copiado!',
      `O relatório completo (Protocolo #${protocol}) com diagnóstico técnico foi copiado para a área de transferência. Agora você pode colar direto no Discord, E-mail ou GitHub!`
    );
  };

  const handleSaveWebhookUrl = async () => {
    await supportService.setCustomWebhookUrl(customWebhookInput);
    showAlert(
      'Canal de Suporte Atualizado',
      customWebhookInput.trim()
        ? 'A URL do Webhook foi salva! Os envios diretos pelo app serão entregues neste canal.'
        : 'Webhook customizado removido. O app usará a configuração padrão.'
    );
  };

  const handleClearHistory = async () => {
    await supportService.clearTicketHistory();
    setTicketHistory([]);
    setLastSubmittedTicket(null);
    showAlert('Histórico Limpo', 'O histórico local de relatos foi removido deste dispositivo.');
  };

  const content = (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      {/* Banner Introdutório da Central de Suporte */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="headset" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.heroBadgeRow}>
            <Text style={styles.heroBadgeText}>COMUNICAÇÃO COM A ORDEM</Text>
          </View>
          <Text style={styles.heroTitle}>Central de Suporte & Relato de Erros</Text>
          <Text style={styles.heroSubtitle}>
            Encontrou algum bug, erro de regra nos livros ou quer falar diretamente comigo? Envie uma
            mensagem direto pelo aplicativo ou acesse meus canais oficiais abaixo.
          </Text>
        </View>
      </View>

      {/* Bloco 1: Canais de Contato Direto */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flash" size={15} color={colors.primary} />
            <Text style={styles.sectionHeaderTitle}>CANAIS DE CONTATO DIRETO</Text>
          </View>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlinePillText}>Atendimento Direto</Text>
          </View>
        </View>
        <Text style={styles.sectionHint}>
          Escolha um dos canais abaixo para falar diretamente com o desenvolvedor ou acompanhar atualizações:
        </Text>

        <View style={styles.channelsGrid}>
          {/* Card Discord */}
          <View style={styles.channelCard}>
            <View style={[styles.channelIconCircle, { backgroundColor: 'rgba(88, 101, 242, 0.16)' }]}>
              <Ionicons name="logo-discord" size={22} color="#5865F2" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelTitle}>Discord Oficial / Dev</Text>
              <Text style={styles.channelHandle}>@{contactConfig.discordHandle}</Text>
              <Text style={styles.channelDesc}>
                Canal mais rápido para conversar, tirar dúvidas e mandar prints de erros.
              </Text>
              <View style={styles.channelActionsRow}>
                <TouchableOpacity
                  testID="contact-discord-open-btn"
                  style={[styles.channelBtnPrimary, { backgroundColor: '#5865F2' }]}
                  onPress={() => supportService.openExternalUrl(contactConfig.discordInviteUrl)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={14} color="#FFF" />
                  <Text style={styles.channelBtnPrimaryText}>Abrir Discord</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="contact-discord-copy-btn"
                  style={styles.channelBtnSecondary}
                  onPress={() =>
                    copyTextToClipboard(
                      contactConfig.discordHandle,
                      'Discord Copiado!',
                      `O usuário "${contactConfig.discordHandle}" foi copiado. Basta adicionar ou enviar mensagem no Discord!`
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={14} color={colors.text} />
                  <Text style={styles.channelBtnSecondaryText}>Copiar Nick</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card E-mail */}
          <View style={styles.channelCard}>
            <View style={[styles.channelIconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="mail" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelTitle}>E-mail de Suporte</Text>
              <Text style={styles.channelHandle} numberOfLines={1}>
                {contactConfig.supportEmail}
              </Text>
              <Text style={styles.channelDesc}>
                Envie e-mail direto com dúvidas, sugestões ou arquivos de backup anexados.
              </Text>
              <View style={styles.channelActionsRow}>
                <TouchableOpacity
                  testID="contact-email-open-btn"
                  style={[styles.channelBtnPrimary, { backgroundColor: colors.primary }]}
                  onPress={() =>
                    supportService.openExternalUrl(
                      `mailto:${contactConfig.supportEmail}?subject=${encodeURIComponent(
                        '[Ordo Companion] Contato / Suporte'
                      )}`
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="send-outline" size={14} color="#FFF" />
                  <Text style={styles.channelBtnPrimaryText}>Enviar E-mail</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="contact-email-copy-btn"
                  style={styles.channelBtnSecondary}
                  onPress={() =>
                    copyTextToClipboard(
                      contactConfig.supportEmail,
                      'E-mail Copiado!',
                      `Endereço ${contactConfig.supportEmail} copiado para a área de transferência.`
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={14} color={colors.text} />
                  <Text style={styles.channelBtnSecondaryText}>Copiar E-mail</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card GitHub */}
          <View style={styles.channelCard}>
            <View style={[styles.channelIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="logo-github" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.channelTitle}>GitHub Oficial do Projeto</Text>
              <Text style={styles.channelHandle}>
                github.com/{contactConfig.githubAuthorHandle}/OrdoCompanion
              </Text>
              <Text style={styles.channelDesc}>
                Acompanhe o código-fonte, novas versões (APKs) e o painel público de Issues.
              </Text>
              <View style={styles.channelActionsRow}>
                <TouchableOpacity
                  testID="contact-github-issues-btn"
                  style={[styles.channelBtnPrimary, { backgroundColor: '#10B981' }]}
                  onPress={() => supportService.openExternalUrl(contactConfig.githubIssuesUrl)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bug-outline" size={14} color="#FFF" />
                  <Text style={styles.channelBtnPrimaryText}>Ver Issues</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="contact-github-repo-btn"
                  style={styles.channelBtnSecondary}
                  onPress={() => supportService.openExternalUrl(contactConfig.githubRepoUrl)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="code-slash-outline" size={14} color={colors.text} />
                  <Text style={styles.channelBtnSecondaryText}>Repositório</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bloco 2: Formulário Integrado de Relato de Erro / Contato */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="paper-plane" size={15} color={colors.primary} />
            <Text style={styles.sectionHeaderTitle}>ENVIAR RELATO OU MENSAGEM PELO APP</Text>
          </View>
        </View>
        <Text style={styles.sectionHint}>
          Preencha os campos abaixo para me enviar um relato direto sem precisar sair do aplicativo:
        </Text>

        {/* Confirmação do último protocolo enviado */}
        {lastSubmittedTicket && (
          <View style={styles.successProtocolBanner} testID="support-protocol-banner">
            <View style={styles.successProtocolHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.successProtocolTitle}>
                Relato Registrado • Protocolo #{lastSubmittedTicket.protocol}
              </Text>
            </View>
            <Text style={styles.successProtocolSub}>
              {lastSubmittedTicket.status === 'sent_remote'
                ? 'Entregue diretamente ao desenvolvedor! Guarde o código do protocolo caso queira acompanhar.'
                : 'Protocolo salvo no seu aparelho! Você pode copiar o relatório ou enviar com 1 clique via GitHub ou E-mail abaixo.'}
            </Text>
          </View>
        )}

        {/* 1. Seletor de Categoria */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>1. Qual é o motivo do contato?</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  testID={`support-category-${cat.id}`}
                  style={[
                    styles.categoryCard,
                    isSelected && {
                      borderColor: colors.primary,
                      backgroundColor: colors.primarySoft,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryCardHeader}>
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryCardTitle,
                        isSelected && { color: colors.primary, fontWeight: '900' },
                      ]}
                    >
                      {cat.shortLabel}
                    </Text>
                  </View>
                  <Text style={styles.categoryCardDesc} numberOfLines={2}>
                    {cat.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Severidade (apenas para Bug ou Erro de Regra) */}
        {(category === 'bug' || category === 'rule_error') && (
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>2. Gravidade do Problema</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((sev) => {
                const isSelected = severity === sev.id;
                return (
                  <TouchableOpacity
                    key={sev.id}
                    testID={`support-severity-${sev.id}`}
                    style={[
                      styles.severityPill,
                      isSelected && {
                        borderColor: sev.color,
                        backgroundColor: `${sev.color}22`,
                      },
                    ]}
                    onPress={() => setSeverity(sev.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={sev.icon as any}
                      size={15}
                      color={isSelected ? sev.color : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.severityPillText,
                        isSelected && { color: sev.color, fontWeight: '800' },
                      ]}
                    >
                      {sev.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 3. Título / Assunto */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>
            Assunto / Resumo <Text style={{ color: colors.primary }}>*</Text>
          </Text>
          <TextInput
            testID="support-title-input"
            style={styles.input}
            placeholder={
              category === 'bug'
                ? 'Ex: Botão de transcender não abre na ficha NEX 50%'
                : category === 'rule_error'
                ? 'Ex: Custo de PE do ritual Decadência Discente'
                : category === 'suggestion'
                ? 'Ex: Adicionar filtro por elemento na Armaria'
                : 'Ex: Dúvida sobre sincronização da Mesa Virtual'
            }
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* 4. Descrição Detalhada */}
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>
            Descrição Detalhada <Text style={{ color: colors.primary }}>*</Text>
          </Text>
          <TextInput
            testID="support-description-input"
            style={[styles.input, styles.textArea]}
            placeholder="Explique com detalhes o que aconteceu, o que você esperava que acontecesse ou sua mensagem para o desenvolvedor..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* 5. Passos para Reproduzir (apenas para Bug) */}
        {category === 'bug' && (
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Como reproduzir o erro? (Opcional)</Text>
            <TextInput
              testID="support-steps-input"
              style={[styles.input, styles.textAreaSmall]}
              placeholder="Ex: 1. Abri a aba Agentes -> 2. Cliquei em Subir NEX -> 3. O modal ficou em branco"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
              value={stepsToReproduce}
              onChangeText={setStepsToReproduce}
            />
          </View>
        )}

        {/* 6. Dados de Retorno (Quem está enviando e como responder) */}
        <View style={styles.rowTwoCols}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Seu Nome / Apelido</Text>
            <TextInput
              testID="support-sender-input"
              style={styles.input}
              placeholder="Ex: Pedro / Agente Kaiser"
              placeholderTextColor={colors.textMuted}
              value={senderName}
              onChangeText={setSenderName}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Seu Contato para Retorno</Text>
            <TextInput
              testID="support-contact-return-input"
              style={styles.input}
              placeholder="Seu Discord, E-mail ou WhatsApp"
              placeholderTextColor={colors.textMuted}
              value={contactReturn}
              onChangeText={setContactReturn}
            />
          </View>
        </View>
        <Text style={styles.fieldHint}>
          Informe seu Discord, e-mail ou telefone caso queira que eu entre em contato diretamente com você para responder!
        </Text>

        {/* 7. Diagnóstico Técnico Automático */}
        <View style={styles.diagnosticsBox}>
          <View style={styles.diagnosticsHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="hardware-chip-outline" size={16} color={colors.primary} />
                <Text style={styles.diagnosticsTitle}>Anexar Diagnóstico Técnico Automaticamente</Text>
              </View>
              <Text style={styles.diagnosticsSub}>
                Inclui versão do app (v{diagnostics.appVersion}), sistema ({diagnostics.platform.toUpperCase()}) e tema ativo para facilitar o conserto.
              </Text>
            </View>
            <Switch
              testID="support-diagnostics-switch"
              value={includeDiagnostics}
              onValueChange={setIncludeDiagnostics}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={includeDiagnostics ? '#FFF' : colors.textSecondary}
            />
          </View>

          {includeDiagnostics && (
            <>
              <TouchableOpacity
                style={styles.diagnosticsToggleBtn}
                onPress={() => setShowDiagnosticsPreview((prev) => !prev)}
              >
                <Text style={[styles.diagnosticsToggleText, { color: colors.primary }]}>
                  {showDiagnosticsPreview ? 'Ocultar dados técnicos anexados' : 'Ver dados técnicos anexados'}
                </Text>
                <Ionicons
                  name={showDiagnosticsPreview ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>

              {showDiagnosticsPreview && (
                <View style={styles.diagnosticsPreviewCard}>
                  <Text style={styles.diagnosticsMonoLine}>
                    • Versão: v{diagnostics.appVersion} | Plataforma: {diagnostics.platform.toUpperCase()}
                  </Text>
                  <Text style={styles.diagnosticsMonoLine}>
                    • Tema Paranormal: {diagnostics.themeId}
                  </Text>
                  <Text style={styles.diagnosticsMonoLine}>
                    • Dados Locais: {diagnostics.charactersCount} ficha(s), {diagnostics.campaignsCount} campanha(s), {diagnostics.customWeaponsCount} arma(s)
                  </Text>
                  <Text style={styles.diagnosticsMonoLine}>
                    • Sincronização em Nuvem: {diagnostics.cloudSyncEnabled ? 'Ativa' : 'Inativa'}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Botão Principal: Enviar Direto pelo App */}
        <TouchableOpacity
          testID="support-submit-direct-btn"
          style={[styles.submitDirectButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmitDirect}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#FFF" />
              <Text style={styles.submitDirectButtonText}>Enviar Relato Direto pelo App</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Opções Alternativas de Envio Rápido */}
        <Text style={styles.altMethodsLabel}>
          Ou encaminhe o relatório preenchido diretamente por um destes canais:
        </Text>
        <View style={styles.altButtonsRow}>
          <TouchableOpacity
            testID="support-open-github-issue-btn"
            style={styles.altActionButton}
            onPress={handleOpenGitHubIssue}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-github" size={16} color="#10B981" />
            <Text style={styles.altActionButtonText}>Abrir Issue no GitHub</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="support-send-email-btn"
            style={styles.altActionButton}
            onPress={handleSendViaEmail}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={16} color={colors.primary} />
            <Text style={styles.altActionButtonText}>Enviar por E-mail</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="support-copy-report-btn"
            style={styles.altActionButton}
            onPress={handleCopyFullReport}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={16} color={colors.text} />
            <Text style={styles.altActionButtonText}>Copiar Relatório</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bloco 3: Histórico Local de Chamados & Protocolos */}
      {ticketHistory.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionHeaderTitle}>
                MEUS RELATOS ENVIADOS ({ticketHistory.length})
              </Text>
            </View>
            <TouchableOpacity onPress={handleClearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearHistoryText}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8, marginTop: 6 }}>
            {ticketHistory.slice(0, 5).map((item) => {
              const catMeta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.bug;
              const dateFormatted = (() => {
                try {
                  const d = new Date(item.createdAt);
                  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`;
                } catch {
                  return item.createdAt;
                }
              })();

              return (
                <View key={item.id} style={styles.historyItemCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.historyTopRow}>
                      <View style={[styles.protocolBadge, { backgroundColor: colors.primarySoft }]}>
                        <Text style={[styles.protocolBadgeText, { color: colors.primary }]}>
                          #{item.protocol}
                        </Text>
                      </View>
                      <Text style={styles.historyCategoryText}>
                        {catMeta.emoji} {catMeta.label}
                      </Text>
                      <Text style={styles.historyDateText}>{dateFormatted}</Text>
                    </View>
                    <Text style={styles.historyTitleText} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.historyDescText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.historyCopyBtn}
                    onPress={() => {
                      const rep = supportService.buildFormattedReport(item, item.protocol);
                      copyTextToClipboard(
                        rep,
                        `Protocolo #${item.protocol}`,
                        'O relatório deste chamado foi copiado para a área de transferência!'
                      );
                    }}
                    accessibilityLabel={`Copiar protocolo ${item.protocol}`}
                  >
                    <Ionicons name="copy-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Bloco 4: Configuração Avançada de Webhook (Para o Desenvolvedor / Mestre da Ordem) */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.advancedToggleHeader}
          onPress={() => setShowWebhookConfig((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.advancedToggleTitle}>
              Configuração de Webhook de Suporte (Opcional)
            </Text>
          </View>
          <Ionicons
            name={showWebhookConfig ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {showWebhookConfig && (
          <View style={styles.advancedBody}>
            <Text style={styles.fieldHint}>
              Se você possui um Webhook do Discord para receber os chamados em tempo real na sua central,
              pode colar a URL abaixo (ou definir via variável EXPO_PUBLIC_SUPPORT_DISCORD_WEBHOOK_URL no .env):
            </Text>
            <TextInput
              testID="support-webhook-input"
              style={[styles.input, { marginTop: 8 }]}
              placeholder="https://discord.com/api/webhooks/..."
              placeholderTextColor={colors.textMuted}
              value={customWebhookInput}
              onChangeText={setCustomWebhookInput}
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                testID="support-save-webhook-btn"
                style={[styles.smallConfigBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveWebhookUrl}
              >
                <Ionicons name="save-outline" size={14} color="#FFF" />
                <Text style={styles.smallConfigBtnText}>Salvar Webhook</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  if (embedded) {
    return content;
  }

  return (
    <ScrollView
      style={styles.scrollWrapper}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    scrollWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 36,
    },
    container: {
      padding: 14,
      gap: 14,
      maxWidth: 880,
      width: '100%',
      alignSelf: 'center',
    },
    containerEmbedded: {
      padding: 0,
      gap: 12,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    heroBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: colors.primary,
    },
    heroTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: colors.text,
    },
    heroSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
      marginTop: 3,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionHeaderTitle: {
      fontSize: 11.5,
      fontWeight: '900',
      letterSpacing: 0.7,
      color: colors.primary,
    },
    sectionHint: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    onlinePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
      borderWidth: 1,
      borderColor: '#10B981',
    },
    onlineDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    onlinePillText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#10B981',
    },
    channelsGrid: {
      gap: 10,
      marginTop: 2,
    },
    channelCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    channelIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    channelTitle: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.text,
    },
    channelHandle: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.primary,
      marginTop: 1,
    },
    channelDesc: {
      fontSize: 11.5,
      color: colors.textSecondary,
      lineHeight: 15,
      marginTop: 3,
    },
    channelActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    channelBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 8,
    },
    channelBtnPrimaryText: {
      color: '#FFFFFF',
      fontSize: 11.5,
      fontWeight: '800',
    },
    channelBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    channelBtnSecondaryText: {
      color: colors.text,
      fontSize: 11.5,
      fontWeight: '700',
    },
    successProtocolBanner: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 1,
      borderColor: '#10B981',
      gap: 4,
    },
    successProtocolHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    successProtocolTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: '#10B981',
    },
    successProtocolSub: {
      fontSize: 11.5,
      color: colors.text,
      lineHeight: 16,
    },
    inputGroup: {
      gap: 5,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    fieldHint: {
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    categoryCard: {
      flexGrow: 1,
      flexBasis: '46%',
      minWidth: 140,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 3,
    },
    categoryCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryCardTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text,
    },
    categoryCardDesc: {
      fontSize: 10.5,
      color: colors.textSecondary,
      lineHeight: 14,
    },
    severityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    severityPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    severityPillText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontSize: 13,
      color: colors.text,
    },
    textArea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    textAreaSmall: {
      minHeight: 58,
      textAlignVertical: 'top',
    },
    rowTwoCols: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    diagnosticsBox: {
      padding: 11,
      borderRadius: 10,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    diagnosticsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    diagnosticsTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
    },
    diagnosticsSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
      lineHeight: 15,
    },
    diagnosticsToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
    },
    diagnosticsToggleText: {
      fontSize: 11,
      fontWeight: '800',
    },
    diagnosticsPreviewCard: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 3,
    },
    diagnosticsMonoLine: {
      fontSize: 11,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    submitDirectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 11,
      marginTop: 4,
    },
    submitDirectButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    altMethodsLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    altButtonsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    altActionButton: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      paddingHorizontal: 11,
      borderRadius: 9,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    altActionButtonText: {
      fontSize: 11.5,
      fontWeight: '800',
      color: colors.text,
    },
    clearHistoryText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: colors.textMuted,
    },
    historyItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    historyTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 3,
    },
    protocolBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
    },
    protocolBadgeText: {
      fontSize: 10,
      fontWeight: '900',
    },
    historyCategoryText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    historyDateText: {
      fontSize: 10.5,
      color: colors.textMuted,
    },
    historyTitleText: {
      fontSize: 12.5,
      fontWeight: '800',
      color: colors.text,
    },
    historyDescText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    historyCopyBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    advancedToggleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    advancedToggleTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    advancedBody: {
      marginTop: 6,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    smallConfigBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    smallConfigBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
  });
