export type SupportCategory = 'bug' | 'rule_error' | 'suggestion' | 'contact';

export type SupportRequestGroup = 'errors' | 'improvements';

export type SupportRoutedChannel = 'errors' | 'improvements' | 'default';

export type SupportSeverity = 'low' | 'medium' | 'high';

export interface SystemDiagnostics {
  appVersion: string;
  platform: string;
  themeId: string;
  playerName: string;
  nickname?: string;
  charactersCount: number;
  campaignsCount: number;
  customWeaponsCount: number;
  cloudSyncEnabled: boolean;
  activeRoute?: string;
  timestamp: string;
}

export interface SupportTicketPayload {
  category: SupportCategory;
  requestGroup?: SupportRequestGroup;
  severity?: SupportSeverity;
  title: string;
  description: string;
  stepsToReproduce?: string;
  senderName?: string;
  contactReturn?: string;
  includeDiagnostics?: boolean;
  diagnostics?: SystemDiagnostics;
}

export type SupportTicketDeliveryStatus = 'sent_remote' | 'saved_local';

export interface SupportTicketRecord extends SupportTicketPayload {
  id: string;
  protocol: string;
  status: SupportTicketDeliveryStatus;
  deliveryChannel?:
    | 'supabase_proxy'
    | 'discord_webhook'
    | 'custom_endpoint'
    | 'github_issue'
    | 'email'
    | 'local';
  routedChannel?: SupportRoutedChannel;
  lastError?: string;
  lastStatusCode?: number;
  createdAt: string;
}

export interface SupportSubmitResult {
  success: boolean;
  deliveredRemotely: boolean;
  protocol: string;
  channelUsed: 'supabase_proxy' | 'discord_webhook' | 'custom_endpoint' | 'local_fallback';
  routedChannel?: SupportRoutedChannel;
  remoteStatusCode?: number;
  remoteError?: string;
  message: string;
  ticket: SupportTicketRecord;
  rateLimited?: boolean;
}

export interface SupportContactConfig {
  githubRepoUrl: string;
  githubIssuesUrl: string;
  githubAuthorHandle: string;
  supportEmail: string;
  discordInviteUrl: string;
  discordHandle: string;
  discordWebhookUrl: string;
  discordBugsWebhookUrl?: string;
  discordSuggestionsWebhookUrl?: string;
  customEndpointUrl: string;
  supabaseProxyUrl?: string;
  supabaseAnonKey?: string;
  rateLimitCooldownMs?: number;
}
