import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import {
  computeClientTicketSignature,
  deobfuscateSecret,
  obfuscateSecret,
  resolveEnvSecret,
  sanitizeDiscordText,
} from '../../utils/secretObfuscator';
import {
  SupportCategory,
  SupportContactConfig,
  SupportRequestGroup,
  SupportRoutedChannel,
  SupportSeverity,
  SupportSubmitResult,
  SupportTicketPayload,
  SupportTicketRecord,
  SystemDiagnostics,
} from './types';

export const SUPPORT_TICKETS_STORAGE_KEY = '@ordo_support_tickets_history';
export const SUPPORT_CUSTOM_WEBHOOK_KEY = '@ordo_support_custom_webhook_url';
export const SUPPORT_CUSTOM_BUGS_WEBHOOK_KEY = '@ordo_support_custom_bugs_webhook_url';
export const SUPPORT_CUSTOM_SUGGESTIONS_WEBHOOK_KEY = '@ordo_support_custom_suggestions_webhook_url';

const GROUP_WEBHOOK_STORAGE_KEYS: Record<SupportRequestGroup, string> = {
  errors: SUPPORT_CUSTOM_BUGS_WEBHOOK_KEY,
  improvements: SUPPORT_CUSTOM_SUGGESTIONS_WEBHOOK_KEY,
};

export const DEFAULT_SUPPORT_CONFIG: SupportContactConfig = {
  githubRepoUrl: 'https://github.com/Lecrepus17/OrdoCompanion',
  githubIssuesUrl: 'https://github.com/Lecrepus17/OrdoCompanion/issues',
  githubAuthorHandle: 'Lecrepus17',
  supportEmail:
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'pedro.eduardo1777@gmail.com',
  discordInviteUrl:
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_INVITE ||
    'https://discord.gg/vPCZzr2wFR',
  discordHandle:
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_HANDLE || 'lecrepus17',
  discordWebhookUrl: resolveEnvSecret(
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_WEBHOOK_URL
  ),
  discordBugsWebhookUrl: resolveEnvSecret(
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_BUGS_WEBHOOK_URL
  ),
  discordSuggestionsWebhookUrl: resolveEnvSecret(
    process.env.EXPO_PUBLIC_SUPPORT_DISCORD_SUGGESTIONS_WEBHOOK_URL
  ),
  customEndpointUrl: resolveEnvSecret(
    process.env.EXPO_PUBLIC_SUPPORT_ENDPOINT_URL
  ),
  supabaseProxyUrl: resolveEnvSecret(
    process.env.EXPO_PUBLIC_SUPPORT_PROXY_URL
  ),
  supabaseAnonKey: resolveEnvSecret(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ),
  rateLimitCooldownMs: 0,
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
  private _config: SupportContactConfig;
  private lastSubmissionTimestamp = 0;

  constructor(customConfig?: Partial<SupportContactConfig>) {
    this._config = {
      ...DEFAULT_SUPPORT_CONFIG,
      ...customConfig,
    };
  }

  public getConfig(): SupportContactConfig {
    return { ...this._config };
  }

  public get config(): SupportContactConfig {
    return { ...this._config };
  }

  public updateConfig(partial: Partial<SupportContactConfig>): void {
    this._config = {
      ...this._config,
      ...partial,
    };
  }

  /**
   * Mapeia a categoria do chamado para a fila de triagem separada (Erros vs. Melhorias).
   */
  public getRequestGroup(category: SupportCategory): SupportRequestGroup {
    return category === 'bug' || category === 'rule_error' ? 'errors' : 'improvements';
  }

  private async readStoredWebhook(storageKey: string, fallbackEnvValue?: string): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved && saved.trim().length > 0) {
        return deobfuscateSecret(saved.trim());
      }
    } catch {}
    return deobfuscateSecret((fallbackEnvValue || '').trim());
  }

  private async writeStoredWebhook(storageKey: string, url: string): Promise<void> {
    const clean = deobfuscateSecret((url || '').trim());
    try {
      if (!clean) {
        await AsyncStorage.removeItem(storageKey);
      } else {
        await AsyncStorage.setItem(storageKey, obfuscateSecret(clean));
      }
    } catch {}
  }

  /**
   * Permite salvar ou ler um Webhook de suporte personalizado no armazenamento local.
   * O valor é armazenado ofuscado (obf:v1:...) e revertido em memória ao ler.
   */
  public async getEffectiveWebhookUrl(): Promise<string> {
    return this.readStoredWebhook(SUPPORT_CUSTOM_WEBHOOK_KEY, this._config.discordWebhookUrl);
  }

  public async setCustomWebhookUrl(url: string): Promise<void> {
    await this.writeStoredWebhook(SUPPORT_CUSTOM_WEBHOOK_KEY, url);
  }

  /**
   * Lê o Webhook específico de uma fila (Erros ou Melhorias), retornando vazio se não configurado.
   */
  public async getCustomCategoryWebhookUrl(group: SupportRequestGroup): Promise<string> {
    const fallback =
      group === 'errors'
        ? this._config.discordBugsWebhookUrl
        : this._config.discordSuggestionsWebhookUrl;
    return this.readStoredWebhook(GROUP_WEBHOOK_STORAGE_KEYS[group], fallback);
  }

  /**
   * Salva ou remove o Webhook específico da fila (Erros ou Melhorias) ofuscado no AsyncStorage.
   */
  public async setCustomCategoryWebhookUrl(group: SupportRequestGroup, url: string): Promise<void> {
    await this.writeStoredWebhook(GROUP_WEBHOOK_STORAGE_KEYS[group], url);
  }

  /**
   * Resolve a URL efetiva de Webhook para uma categoria, priorizando o canal dedicado
   * (#erros para bug/rule_error, #melhorias para suggestion) com fallback para o Webhook geral.
   */
  public async getEffectiveWebhookUrlForCategory(category?: SupportCategory): Promise<string> {
    if (category === 'bug' || category === 'rule_error') {
      const bugsUrl = await this.getCustomCategoryWebhookUrl('errors');
      if (bugsUrl) return bugsUrl;
    } else if (category === 'suggestion') {
      const suggestionsUrl = await this.getCustomCategoryWebhookUrl('improvements');
      if (suggestionsUrl) return suggestionsUrl;
    }
    return this.getEffectiveWebhookUrl();
  }

  /**
   * Verifica se o envio está em período de cooldown anti-spam.
   */
  public checkRateLimit(cooldownMs?: number): { allowed: boolean; remainingSeconds: number } {
    const effectiveCooldown = cooldownMs ?? this._config.rateLimitCooldownMs ?? 0;
    if (effectiveCooldown <= 0) {
      return { allowed: true, remainingSeconds: 0 };
    }
    const elapsed = Date.now() - this.lastSubmissionTimestamp;
    if (this.lastSubmissionTimestamp > 0 && elapsed < effectiveCooldown) {
      const remainingSeconds = Math.ceil((effectiveCooldown - elapsed) / 1000);
      return { allowed: false, remainingSeconds };
    }
    return { allowed: true, remainingSeconds: 0 };
  }

  public resetRateLimit(): void {
    this.lastSubmissionTimestamp = 0;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = 15000
  ): Promise<Response> {
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        try {
          controller.abort();
        } catch {}
      }, timeoutMs);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    }
    return fetch(url, init);
  }

  private async safeReadJson(response: Response): Promise<Record<string, any> | null> {
    try {
      if (typeof (response as any)?.json !== 'function') return null;
      const parsed = await (response as any).json();
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private inferRoutedChannelFromCategory(category: SupportCategory): SupportRoutedChannel {
    if (category === 'bug' || category === 'rule_error') return 'errors';
    if (category === 'suggestion') return 'improvements';
    return 'default';
  }

  private formatProxyError(status: number, json: Record<string, any> | null): string {
    const serverMsg =
      typeof json?.error === 'string' && json.error.trim().length > 0 ? json.error.trim() : '';
    if (status === 429) {
      return (
        serverMsg ||
        'Limite temporário de envios atingido no servidor. Aguarde alguns minutos e toque em Reenviar.'
      );
    }
    if (status === 403) {
      return serverMsg || 'Falha na verificação de assinatura do chamado (HTTP 403).';
    }
    if (status === 502 || status === 503) {
      return (
        serverMsg ||
        'O servidor de suporte está temporariamente indisponível para encaminhar ao Discord.'
      );
    }
    return serverMsg || `O servidor de suporte recusou o envio (HTTP ${status}).`;
  }

  /**
   * Envia uma mensagem de teste para verificar se o Webhook do Discord está ativo e funcionando.
   */
  public async testWebhook(webhookUrl?: string): Promise<{ success: boolean; message: string }> {
    const rawTarget = webhookUrl ? deobfuscateSecret(webhookUrl.trim()) : await this.getEffectiveWebhookUrl();
    const targetUrl = rawTarget.trim();
    if (!targetUrl) {
      return {
        success: false,
        message: 'Nenhum Webhook configurado. Preencha a URL do Discord Webhook para testar.',
      };
    }

    if (
      !targetUrl.startsWith('https://discord.com/api/webhooks/') &&
      !targetUrl.startsWith('https://discordapp.com/api/webhooks/')
    ) {
      return {
        success: false,
        message: 'URL inválida. O Webhook do Discord deve começar com "https://discord.com/api/webhooks/".',
      };
    }

    try {
      const testBody = {
        username: 'Ordo Companion • Teste de Integração',
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: '✅ Conexão Estabelecida com Sucesso!',
            description:
              'A integração do Webhook com o Ordo Companion está ativa e protegida contra menções indevidas! Chamados e relatos de erros enviados pelos jogadores chegarão diretamente neste canal.',
            color: 0x10b981,
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Ordo Companion • Central de Suporte & Dev',
            },
          },
        ],
      };

      const response = await this.fetchWithTimeout(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBody),
      });

      if (response.ok || response.status === 204) {
        return {
          success: true,
          message: 'Webhook testado com sucesso! Uma mensagem de verificação foi enviada ao seu canal no Discord.',
        };
      }

      return {
        success: false,
        message: `O Discord recusou o envio (Status HTTP ${response.status}). Verifique se a URL do Webhook está correta e ativa.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha na conexão de rede ao testar o Webhook: ${err?.message || 'Erro de rede'}`,
      };
    }
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
   * Envia o chamado diretamente de dentro do aplicativo (via Proxy Seguro Supabase, Discord Webhook ou Endpoint HTTP)
   * com proteção anti-spam, sanitização contra @everyone/@here e assinatura de integridade.
   */
  public async submitTicketInApp(
    payload: SupportTicketPayload,
    options?: { existingTicketId?: string; existingProtocol?: string }
  ): Promise<SupportSubmitResult> {
    const rateCheck = this.checkRateLimit();
    const protocol = options?.existingProtocol || this.generateProtocol();
    const ticketId =
      options?.existingTicketId || `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    if (!rateCheck.allowed) {
      const blockedTicket: SupportTicketRecord = {
        ...payload,
        id: ticketId,
        protocol,
        status: 'saved_local',
        deliveryChannel: 'local',
        createdAt: nowIso,
      };
      return {
        success: false,
        deliveredRemotely: false,
        protocol,
        channelUsed: 'local_fallback',
        rateLimited: true,
        message: `Aguarde ${rateCheck.remainingSeconds}s antes de enviar outro relato para evitar duplicidade.`,
        ticket: blockedTicket,
      };
    }

    this.lastSubmissionTimestamp = Date.now();

    let deliveredRemotely = false;
    let channelUsed: 'supabase_proxy' | 'discord_webhook' | 'custom_endpoint' | 'local_fallback' = 'local_fallback';
    let lastRemoteStatus: number | undefined;
    let lastRemoteError: string | undefined;
    let routedChannel: SupportRoutedChannel | undefined;

    const requestGroup = payload.requestGroup || this.getRequestGroup(payload.category);
    const supabaseProxy = deobfuscateSecret((this._config.supabaseProxyUrl || '').trim());
    const supabaseAnonKey = deobfuscateSecret((this._config.supabaseAnonKey || '').trim());
    const webhookUrl = await this.getEffectiveWebhookUrlForCategory(payload.category);
    const customEndpoint = deobfuscateSecret((this._config.customEndpointUrl || '').trim());

    // Sanitiza todos os campos contra menções (@everyone / @here / cargos) e links de spam
    const safeTitle = sanitizeDiscordText(payload.title, 200) || 'Relato via Ordo Companion';
    const safeDescription = sanitizeDiscordText(payload.description, 3800);
    const safeSender = sanitizeDiscordText(payload.senderName, 120);
    const safeContact = sanitizeDiscordText(payload.contactReturn, 150);
    const safeSteps = sanitizeDiscordText(payload.stepsToReproduce, 1000);

    const signature = computeClientTicketSignature(protocol, nowIso, safeTitle);

    // 1. Prioridade Máxima: Proxy Seguro no Supabase Edge Function (URL do Webhook fica oculta no servidor)
    if (supabaseProxy) {
      try {
        const proxyHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Ordo-Signature': signature,
          'X-Ordo-Timestamp': nowIso,
        };
        if (supabaseAnonKey) {
          proxyHeaders['apikey'] = supabaseAnonKey;
          proxyHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`;
        }

        const response = await this.fetchWithTimeout(supabaseProxy, {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify({
            protocol,
            ...payload,
            requestGroup,
            title: safeTitle,
            description: safeDescription,
            senderName: safeSender || undefined,
            contactReturn: safeContact || undefined,
            stepsToReproduce: safeSteps || undefined,
            createdAt: nowIso,
          }),
        });

        if (response.ok || response.status === 204) {
          deliveredRemotely = true;
          channelUsed = 'supabase_proxy';
          const okJson = await this.safeReadJson(response);
          const rawRouted = okJson?.routedChannel;
          routedChannel =
            rawRouted === 'errors' || rawRouted === 'improvements' || rawRouted === 'default'
              ? rawRouted
              : this.inferRoutedChannelFromCategory(payload.category);
        } else {
          const errJson = await this.safeReadJson(response);
          lastRemoteStatus = response.status;
          lastRemoteError = this.formatProxyError(response.status, errJson);
        }
      } catch (err: any) {
        lastRemoteError =
          err?.name === 'AbortError'
            ? 'Tempo esgotado ao conectar ao servidor de suporte.'
            : err?.message || 'Sem conexão com a internet ou falha de rede.';
      }
    }

    // 2. Envio via Discord Webhook (quando configurado, com bloqueio estrito de allowed_mentions)
    if (!deliveredRemotely && webhookUrl) {
      try {
        let directRouted: SupportRoutedChannel = 'default';
        if (payload.category === 'bug' || payload.category === 'rule_error') {
          const dedicatedErrors = await this.getCustomCategoryWebhookUrl('errors');
          if (dedicatedErrors && dedicatedErrors === webhookUrl) {
            directRouted = 'errors';
          }
        } else if (payload.category === 'suggestion') {
          const dedicatedSuggestions = await this.getCustomCategoryWebhookUrl('improvements');
          if (dedicatedSuggestions && dedicatedSuggestions === webhookUrl) {
            directRouted = 'improvements';
          }
        }

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
          {
            name: '🗂️ Fila de Triagem',
            value:
              payload.category === 'contact'
                ? '💬 DÚVIDA / CONTATO'
                : requestGroup === 'errors'
                ? '🐛 ERROS'
                : '💡 MELHORIAS',
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

        if (safeSender) {
          fields.push({
            name: '👤 Jogador / Agente',
            value: safeSender,
            inline: true,
          });
        }

        if (safeContact) {
          fields.push({
            name: '📬 Contato para Retorno',
            value: safeContact,
            inline: true,
          });
        }

        if (safeSteps) {
          fields.push({
            name: '🔄 Passos para Reproduzir',
            value: safeSteps,
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
          allowed_mentions: { parse: [] }, // Impede qualquer ping @everyone, @here, cargos ou usuários
          embeds: [
            {
              title: `${catInfo.emoji} [${protocol}] ${safeTitle}`,
              description: safeDescription,
              color: catInfo.color,
              fields,
              timestamp: nowIso,
              footer: {
                text: `Ordo Companion v${payload.diagnostics?.appVersion || '1.0.1'}`,
              },
            },
          ],
        };

        const response = await this.fetchWithTimeout(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordBody),
        });

        if (response.ok || response.status === 204) {
          deliveredRemotely = true;
          channelUsed = 'discord_webhook';
          routedChannel = directRouted;
        } else {
          if (lastRemoteStatus === undefined) lastRemoteStatus = response.status;
          if (!lastRemoteError) {
            const errJson = await this.safeReadJson(response);
            lastRemoteError =
              (typeof errJson?.message === 'string' && errJson.message.trim()) ||
              `O Discord recusou o envio via Webhook (HTTP ${response.status}).`;
          }
        }
      } catch (err: any) {
        if (!lastRemoteError) {
          lastRemoteError =
            err?.name === 'AbortError'
              ? 'Tempo esgotado ao conectar ao Discord.'
              : err?.message || 'Sem conexão com a internet ou falha de rede.';
        }
      }
    }

    // 3. Se não enviou por Proxy/Discord e houver Endpoint HTTP customizado (ex: Formspree / Supabase / API)
    if (!deliveredRemotely && customEndpoint) {
      try {
        const response = await this.fetchWithTimeout(customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Ordo-Signature': signature,
            'X-Ordo-Timestamp': nowIso,
          },
          body: JSON.stringify({
            protocol,
            ...payload,
            requestGroup,
            title: safeTitle,
            description: safeDescription,
            senderName: safeSender || undefined,
            contactReturn: safeContact || undefined,
            stepsToReproduce: safeSteps || undefined,
            formattedReport: this.buildFormattedReport(payload, protocol),
            createdAt: nowIso,
          }),
        });

        if (response.ok || response.status === 204) {
          deliveredRemotely = true;
          channelUsed = 'custom_endpoint';
          routedChannel = this.inferRoutedChannelFromCategory(payload.category);
        } else {
          if (lastRemoteStatus === undefined) lastRemoteStatus = response.status;
          if (!lastRemoteError) {
            lastRemoteError = `O endpoint de suporte recusou o envio (HTTP ${response.status}).`;
          }
        }
      } catch (err: any) {
        if (!lastRemoteError) {
          lastRemoteError =
            err?.name === 'AbortError'
              ? 'Tempo esgotado ao conectar ao endpoint de suporte.'
              : err?.message || 'Sem conexão com a internet ou falha de rede.';
        }
      }
    }

    if (!deliveredRemotely && !supabaseProxy && !webhookUrl && !customEndpoint && !lastRemoteError) {
      lastRemoteError = 'Nenhum canal de envio remoto configurado neste dispositivo.';
    }

    const ticketRecord: SupportTicketRecord = {
      ...payload,
      id: ticketId,
      protocol,
      status: deliveredRemotely ? 'sent_remote' : 'saved_local',
      deliveryChannel: deliveredRemotely && channelUsed !== 'local_fallback' ? channelUsed : 'local',
      routedChannel: deliveredRemotely ? routedChannel : undefined,
      lastError: deliveredRemotely ? undefined : lastRemoteError,
      lastStatusCode: deliveredRemotely ? undefined : lastRemoteStatus,
      createdAt: nowIso,
    };
    (ticketRecord as any).payload = { ...payload };

    await this.saveTicketToHistory(ticketRecord);

    const targetChannelLabel =
      payload.category === 'bug' || payload.category === 'rule_error'
        ? '#erros'
        : payload.category === 'suggestion'
        ? '#melhorias'
        : 'canal oficial';

    const message = deliveredRemotely
      ? `Seu relato foi transmitido diretamente para o desenvolvedor com sucesso (${targetChannelLabel})! Protocolo: #${protocol}. O chamado já foi entregue no canal oficial.`
      : `Relato salvo localmente com o protocolo #${protocol}, mas não pôde ser entregue agora${
          lastRemoteError ? ` (${lastRemoteError})` : ''
        }. Use "Reenviar", "Copiar Relatório", "Abrir Issue no GitHub" ou "Enviar por E-mail".`;

    return {
      success: true,
      deliveredRemotely,
      savedLocally: true,
      protocol,
      channelUsed,
      channel: channelUsed,
      routedChannel: deliveredRemotely ? routedChannel : undefined,
      remoteStatusCode: deliveredRemotely ? undefined : lastRemoteStatus,
      remoteError: deliveredRemotely ? undefined : lastRemoteError,
      timestamp: nowIso,
      message,
      ticket: ticketRecord,
    } as any;
  }

  /**
   * Reenvia um chamado que havia ficado salvo apenas localmente (`saved_local`),
   * mantendo o mesmo ID e protocolo no histórico sem duplicar registros.
   */
  public async resubmitLocalTicket(ticketIdOrProtocol: string): Promise<SupportSubmitResult> {
    const history = await this.getTicketHistory();
    const existing = history.find(
      (t) => t.id === ticketIdOrProtocol || t.protocol === ticketIdOrProtocol
    );
    if (!existing) {
      throw new Error('Relato não encontrado no histórico local.');
    }

    const storedPayload = (existing as any).payload as Partial<SupportTicketPayload> | undefined;
    const payload: SupportTicketPayload = {
      category: storedPayload?.category || existing.category,
      requestGroup: storedPayload?.requestGroup || existing.requestGroup,
      severity: storedPayload?.severity ?? existing.severity,
      title: storedPayload?.title || existing.title,
      description: storedPayload?.description ?? existing.description,
      stepsToReproduce: storedPayload?.stepsToReproduce ?? existing.stepsToReproduce,
      senderName: storedPayload?.senderName ?? existing.senderName,
      contactReturn: storedPayload?.contactReturn ?? existing.contactReturn,
      includeDiagnostics: storedPayload?.includeDiagnostics ?? existing.includeDiagnostics,
      diagnostics: storedPayload?.diagnostics ?? existing.diagnostics,
    };

    return this.submitTicketInApp(payload, {
      existingTicketId: existing.id,
      existingProtocol: existing.protocol,
    });
  }

  /**
   * Gera a URL para abrir uma Issue no GitHub oficial já toda pré-preenchida.
   */
  public buildGitHubIssueUrl(payload: SupportTicketPayload, protocol?: string): string {
    const catInfo = CATEGORY_LABELS[payload.category] || CATEGORY_LABELS.bug;
    const prefix = `[${catInfo.label}]`;
    const fullTitle = `${prefix} ${payload.title.trim() || 'Relato via Ordo Companion'}`;
    const rawBody = this.buildFormattedReport(payload, protocol);
    const body =
      rawBody.length > 3500 ? `${rawBody.slice(0, 3480)}\n\n...[truncado]` : rawBody;

    const params = new URLSearchParams({
      title: fullTitle,
      body,
      labels: catInfo.ghLabel,
    });

    return `${this._config.githubIssuesUrl}/new?${params.toString()}`;
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

    return `mailto:${this._config.supportEmail}?subject=${encodedSubject}&body=${encodedBody}`;
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
   * Alias para compatibilidade com suítes de testes
   */
  public async getTicketsHistory(): Promise<SupportTicketRecord[]> {
    return this.getTicketHistory();
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
