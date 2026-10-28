export type SupportCategory = 'bug' | 'rule_error' | 'suggestion' | 'contact';

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
  severity?: SupportSeverity;
  title: string;
  description: string;
  stepsToReproduce?: string;
  senderName?: string;
  contactReturn?: string;
  includeDiagnostics: boolean;
  diagnostics?: SystemDiagnostics;
}

export type SupportTicketDeliveryStatus = 'sent_remote' | 'saved_local';

export interface SupportTicketRecord extends SupportTicketPayload {
  id: string;
  protocol: string;
  status: SupportTicketDeliveryStatus;
  deliveryChannel?: 'discord_webhook' | 'custom_endpoint' | 'github_issue' | 'email' | 'local';
  createdAt: string;
}

export interface SupportSubmitResult {
  success: boolean;
  deliveredRemotely: boolean;
  protocol: string;
  channelUsed: 'discord_webhook' | 'custom_endpoint' | 'local_fallback';
  message: string;
  ticket: SupportTicketRecord;
}

export interface SupportContactConfig {
  githubRepoUrl: string;
  githubIssuesUrl: string;
  githubAuthorHandle: string;
  supportEmail: string;
  discordInviteUrl: string;
  discordHandle: string;
  discordWebhookUrl: string;
  customEndpointUrl: string;
}
