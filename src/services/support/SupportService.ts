import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import {
  SupportCategory,
  SupportContactConfig,
  SupportSeverity,
  SupportSubmitResult,
  SupportTicketPayload,
  SupportTicketRecord,
  SystemDiagnostics,
} from './types';

export const SUPPORT_TICKETS_STORAGE_KEY = '@ordo_support_tickets_history';
export const SUPPORT_CUSTOM_WEBHOOK_KEY = '@ordo_support_custom_webhook_url';

export const DEFAULT_SUPPORT_CONFIG: SupportContactConfig = {
  githubRepoUrl: 'https://github.com/Lecrepus17/OrdoCompanion',
  githubIssuesUrl: 'https://github.com/Lecrepus17/OrdoCompanion/issues',
  githubAuthorHandle: 'Lecrepus17',
  supportEmail:
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'pedro.eduardo1777@gmail.com',
  discordInviteUrl:
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_INVITE ||
    'https://discord.com/users/lecrepus17',
  discordHandle:
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_HANDLE || 'lecrepus17',
  discordWebhookUrl:
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_WEBHOOK_URL || '',
  customEndpointUrl:
    process.env.EXPO_PUBLIC_SUPPORT_ENDPOINT_URL || '',
};

export const CATEGORY_LABELS: Record<SupportCategory, { label: string; emoji: string; ghLabel: string; color: number }> = {
  bug: {
    label: 'Bug / Erro Técnico',
    emoji: '🐛',
    ghLabel: 'bug',
    color: 0xef4444, // Vermelho
  },
  rule_error: {
    label: 'Erro de Regra / Compêndio',
    emoji: '📖',
    ghLabel: 'compendium',
    color: 0xf59e0b, // Âmbar
  },
  suggestion: {
    label: 'Sugestão / Ideia',
    emoji: '💡',
    ghLabel: 'enhancement',
    color: 0x3b82f6, // Azul
  },
  contact: {
    label: 'Dúvida / Falar com o Suporte',
    emoji: '💬',
    ghLabel: 'question',
    color: 0x10b981, // Verde
  },
};

export const SEVERITY_LABELS: Record<SupportSeverity, string> = {
  low: 'Baixo (Detalhe visual / texto)',
  medium: 'Médio (Afeta uma função)',
  high: 'Crítico (Trava ou impede o uso)',
};

export class SupportService {
  private config: SupportContactConfig;

  constructor(customConfig?: Partial<SupportContactConfig>) {
    this.config = {
      ...DEFAULT_SUPPORT_CONFIG,
      ...customConfig,
    };
  }

  public getConfig(): SupportContactConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<SupportContactConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
    };
  }

  /**
   * Permite salvar ou ler um Webhook de suporte personalizado no armazenamento local.
   */
  public async getEffectiveWebhookUrl(): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(SUPPORT_CUSTOM_WEBHOOK_KEY);
      if (saved && saved.trim().length > 0) {
        return saved.trim();
      }
    } catch {}
    return (this.config.discordWebhookUrl || '').trim();
  }

  public async setCustomWebhookUrl(url: string): Promise<void> {
    const clean = (url || '').trim();
    try {
      if (!clean) {
        await AsyncStorage.removeItem(SUPPORT_CUSTOM_WEBHOOK_KEY);
      } else {
        await AsyncStorage.setItem(SUPPORT_CUSTOM_WEBHOOK_KEY, clean);
      }
    } catch {}
  }

  /**
   * Gera um código de protocolo amigável no padrão da Ordem (ex: ORD-4829).
   */
  public generateProtocol(): string {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const timeSuffix = Date.now().toString(36).slice(-2).toUpperCase();
    return `ORD-${randomNum}${timeSuffix}`;
  }

  /**
   * Coleta diagnóstico técnico seguro do aplicativo para anexar aos chamados.
   */
  public collectDiagnostics(context?: {
    themeId?: string;
    playerName?: string;
    nickname?: string;
    charactersCount?: number;
    campaignsCount?: number;
    customWeaponsCount?: number;
    cloudSyncEnabled?: boolean;
    activeRoute?: string;
  }): SystemDiagnostics {
    const appVersion = Constants.expoConfig?.version || '1.0.1';
    return {
      appVersion,
      platform: Platform.OS || 'unknown',
      themeId: context?.themeId || 'ordem_padrao',
      playerName: context?.playerName || 'Agente Anônimo',
      nickname: context?.nickname || undefined,
      charactersCount: context?.charactersCount ?? 0,
      campaignsCount: context?.campaignsCount ?? 0,
      customWeaponsCount: context?.customWeaponsCount ?? 0,
      cloudSyncEnabled: Boolean(context?.cloudSyncEnabled),
      activeRoute: context?.activeRoute || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Monta um relatório formatado em Markdown com todos os dados do chamado e diagnóstico.
   */
  public buildFormattedReport(
    payload: SupportTicketPayload,
    protocol?: string
  ): string {
    const catInfo = CATEGORY_LABELS[payload.category] || CATEGORY_LABELS.bug;
    const lines: string[] = [];

    lines.push(`# ${catInfo.emoji} [${catInfo.label}] ${payload.title.trim()}`);
    if (protocol) {
      lines.push(`**Protocolo:** \`#${protocol}\``);
    }
    lines.push(`**Categoria:** ${catInfo.label}`);
    if (payload.severity && (payload.category === 'bug' || payload.category === 'rule_error')) {
      lines.push(`**Severidade:** ${SEVERITY_LABELS[payload.severity] || payload.severity}`);
    }
    if (payload.senderName?.trim()) {
      lines.push(`**Enviado por:** ${payload.senderName.trim()}`);
    }
    if (payload.contactReturn?.trim()) {
      lines.push(`**Contato para Retorno:** ${payload.contactReturn.trim()}`);
    }

    lines.push('');
    lines.push('## 📝 Descrição');
    lines.push(payload.description.trim());

    if (payload.stepsToReproduce?.trim()) {
      lines.push('');
      lines.push('## 🔄 Passos para Reproduzir');
      lines.push(payload.stepsToReproduce.trim());
    }

    if (payload.includeDiagnostics && payload.diagnostics) {
      const d = payload.diagnostics;
      lines.push('');
      lines.push('## 🛠️ Diagnóstico Técnico do Sistema');
      lines.push(`- **Versão do App:** v${d.appVersion}`);
      lines.push(`- **Plataforma:** ${d.platform.toUpperCase()}`);
      lines.push(`- **Tema Ativo:** ${d.themeId}`);
      lines.push(
        `- **Registros Locais:** ${d.charactersCount} agente(s), ${d.campaignsCount} campanha(s), ${d.customWeaponsCount} arma(s)`
      );
      lines.push(`- **Sincronização Nuvem:** ${d.cloudSyncEnabled ? 'Ativa' : 'Inativa'}`);
      if (d.activeRoute) {
        lines.push(`- **Tela de Origem:** ${d.activeRoute}`);
      }
      lines.push(`- **Data/Hora (ISO):** ${d.timestamp}`);
    }

    return lines.join('\n');
  }

  /**
   * Envia o chamado diretamente de dentro do aplicativo (via Discord Webhook ou Endpoint HTTP)
   * e salva no histórico local de protocolos do usuário.
   */
  public async submitTicketInApp(payload: SupportTicketPayload): Promise<SupportSubmitResult> {
    const protocol = this.generateProtocol();
    const nowIso = new Date().toISOString();

    let deliveredRemotely = false;
    let channelUsed: 'discord_webhook' | 'custom_endpoint' | 'local_fallback' = 'local_fallback';

    const webhookUrl = await this.getEffectiveWebhookUrl();
    const customEndpoint = (this.config.customEndpointUrl || '').trim();

    // 1. Tenta enviar via Discord Webhook se configurado
    if (webhookUrl) {
      try {
        const catInfo = CATEGORY_LABELS[payload.category] || CATEGORY_LABELS.bug;
        const fields: Array<{ name: string; value: string; inline?: boolean }> = [
          {
            name: '🔖 Protocolo',
            value: `\`#${protocol}\``,
            inline: true,
          },
          {
            name: '📂 Categoria',
            value: `${catInfo.emoji} ${catInfo.label}`,
            inline: true,
          },
        ];

        if (payload.severity && (payload.category === 'bug' || payload.category === 'rule_error')) {
          fields.push({
            name: '⚠️ Severidade',
            value: SEVERITY_LABELS[payload.severity] || payload.severity,
            inline: true,
          });
        }

        if (payload.senderName?.trim()) {
          fields.push({
            name: '👤 Jogador / Agente',
            value: payload.senderName.trim(),
            inline: true,
          });
        }

        if (payload.contactReturn?.trim()) {
          fields.push({
            name: '📬 Contato para Retorno',
            value: payload.contactReturn.trim(),
            inline: true,
          });
        }

        if (payload.stepsToReproduce?.trim()) {
          fields.push({
            name: '🔄 Passos para Reproduzir',
            value: payload.stepsToReproduce.trim().slice(0, 1000),
            inline: false,
          });
        }

        if (payload.includeDiagnostics && payload.diagnostics) {
          const d = payload.diagnostics;
          fields.push({
            name: '🛠️ Diagnóstico Técnico',
            value: `**Versão:** v${d.appVersion} | **OS:** ${d.platform.toUpperCase()} | **Tema:** ${d.themeId}\n**Dados:** ${d.charactersCount} fichas, ${d.campaignsCount} campanhas | **Nuvem:** ${d.cloudSyncEnabled ? 'Sim' : 'Não'}`,
            inline: false,
          });
        }

        const discordBody = {
          username: 'Ordo Companion • Central de Suporte',
          embeds: [
            {
              title: `${catInfo.emoji} [${protocol}] ${payload.title.trim().slice(0, 200)}`,
              description: payload.description.trim().slice(0, 3800),
              color: catInfo.color,
              fields,
              timestamp: nowIso,
              footer: {
                text: `Ordo Companion v${payload.diagnostics?.appVersion || '1.0.1'}`,
              },
            },
          ],
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordBody),
        });

        if (response.ok || response.status === 204) {
          deliveredRemotely = true;
          channelUsed = 'discord_webhook';
        }
      } catch {
        // Falha silenciosa de rede, tenta próximo canal ou fallback local
      }
    }

    // 2. Se não enviou por Discord e houver Endpoint HTTP customizado (ex: Formspree / Supabase / API)
    if (!deliveredRemotely && customEndpoint) {
      try {
        const response = await fetch(customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            protocol,
            ...payload,
            formattedReport: this.buildFormattedReport(payload, protocol),
            createdAt: nowIso,
          }),
        });

        if (response.ok) {
          deliveredRemotely = true;
          channelUsed = 'custom_endpoint';
        }
      } catch {
        // Continua para registro local resiliente
      }
    }

    const ticketRecord: SupportTicketRecord = {
      ...payload,
      id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      protocol,
      status: deliveredRemotely ? 'sent_remote' : 'saved_local',
      deliveryChannel: deliveredRemotely && channelUsed !== 'local_fallback' ? channelUsed : 'local',
      createdAt: nowIso,
    };

    await this.saveTicketToHistory(ticketRecord);

    const message = deliveredRemotely
      ? `Seu relato foi enviado diretamente para o desenvolvedor com sucesso! Protocolo: #${protocol}.`
      : `Relato registrado com o protocolo #${protocol}! Você também pode tocar em "Abrir no GitHub" ou "Enviar por E-mail" abaixo para encaminhar imediatamente.`;

    return {
      success: true,
      deliveredRemotely,
      protocol,
      channelUsed,
      message,
      ticket: ticketRecord,
    };
  }

  /**
   * Gera a URL para abrir uma Issue no GitHub oficial já toda pré-preenchida.
   */
  public buildGitHubIssueUrl(payload: SupportTicketPayload, protocol?: string): string {
    const catInfo = CATEGORY_LABELS[payload.category] || CATEGORY_LABELS.bug;
    const prefix = `[${catInfo.label}]`;
    const fullTitle = `${prefix} ${payload.title.trim() || 'Relato via Ordo Companion'}`;
    const body = this.buildFormattedReport(payload, protocol);

    const params = new URLSearchParams({
      title: fullTitle,
      body,
      labels: catInfo.ghLabel,
    });

    return `${this.config.githubIssuesUrl}/new?${params.toString()}`;
  }

  /**
   * Gera a URL mailto: pré-preenchida com assunto e corpo técnico.
   */
  public buildMailtoUrl(payload: SupportTicketPayload, protocol?: string): string {
    const catInfo = CATEGORY_LABELS[payload.category] || CATEGORY_LABELS.bug;
    const subject = `[Ordo Companion${protocol ? ` #${protocol}` : ''}] ${catInfo.label}: ${
      payload.title.trim() || 'Contato de Usuário'
    }`;
    const body = this.buildFormattedReport(payload, protocol);

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    return `mailto:${this.config.supportEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  }

  /**
   * Abre uma URL externa (GitHub, Discord, E-mail) de forma segura.
   */
  public async openExternalUrl(url: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Salva um chamado no histórico local do dispositivo (máximo de 30 registros recentes).
   */
  public async saveTicketToHistory(ticket: SupportTicketRecord): Promise<void> {
    try {
      const existing = await this.getTicketHistory();
      const updated = [ticket, ...existing.filter((t) => t.id !== ticket.id)].slice(0, 30);
      await AsyncStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[SupportService] Erro ao salvar histórico de suporte:', err);
    }
  }

  /**
   * Retorna o histórico local de chamados enviados pelo usuário.
   */
  public async getTicketHistory(): Promise<SupportTicketRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Limpa o histórico local de chamados.
   */
  public async clearTicketHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SUPPORT_TICKETS_STORAGE_KEY);
    } catch {}
  }
}

export const supportService = new SupportService();
