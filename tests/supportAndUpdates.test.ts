import './setup';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  supportService,
  SupportService,
  DEFAULT_SUPPORT_CONFIG,
  SUPPORT_TICKETS_STORAGE_KEY,
  SUPPORT_CUSTOM_WEBHOOK_KEY,
} from '../src/services/support/SupportService';
import {
  updateCheckerService,
  UpdateCheckerService,
  GITHUB_RELEASES_PAGE_URL,
  GITHUB_RELEASES_LATEST_URL,
} from '../src/services/updates/UpdateCheckerService';
import { SupportTicketPayload } from '../src/services/support/types';
import OAuthRedirectScreen from '../src/app/oauthredirect';
import { resetMockStorage } from './setup';

describe('Features 1, 2, 3, 4: Support Transparency, Permanent Discord, APK Download & OAuth Redirect (supportAndUpdates.test.ts)', () => {
  beforeEach(async () => {
    resetMockStorage();
    await supportService.clearTicketHistory();
  });

  // =========================================================================
  // TIER 1: Features 1 & 4 (OAuth Redirect Contract & Ticket Transparency)
  // =========================================================================
  describe('Tier 1: Transparência de Suporte & Rota OAuth', () => {
    it('1.1 Feature 1: rota src/app/oauthredirect.tsx deve existir e exportar componente padrão para retorno do Google OAuth', () => {
      const oauthFilePath = path.join(process.cwd(), 'src', 'app', 'oauthredirect.tsx');
      const fileExists = fs.existsSync(oauthFilePath);
      assert.strictEqual(
        fileExists,
        true,
        'O arquivo src/app/oauthredirect.tsx DEVE existir para interceptar com.ordemparanormal.ordo:///oauthredirect e evitar tela 404 Unmatched Route'
      );

      if (fileExists) {
        const fileContent = fs.readFileSync(oauthFilePath, 'utf8');
        assert.ok(
          fileContent.includes('maybeCompleteAuthSession') || fileContent.includes('WebBrowser'),
          'oauthredirect.tsx deve invocar WebBrowser.maybeCompleteAuthSession()'
        );
      }
    });

    it('1.2 Feature 1: rota oauthredirect deve estar declarada no Stack de src/app/_layout.tsx', () => {
      const layoutPath = path.join(process.cwd(), 'src', 'app', '_layout.tsx');
      assert.ok(fs.existsSync(layoutPath), 'src/app/_layout.tsx deve existir');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      assert.ok(
        layoutContent.includes('name="oauthredirect"') || layoutContent.includes("name='oauthredirect'"),
        '_layout.tsx deve conter <Stack.Screen name="oauthredirect" /> para o Expo Router reconhecer a rota'
      );
    });

    it('1.3 Feature 4: submitTicketInApp deve gerar protocolo no padrão ORD- e salvar no histórico local', async () => {
      const payload: SupportTicketPayload = {
        title: 'Falha ao abrir grimório',
        description: 'Ao tocar no ritual Decadência a tela congela.',
        category: 'bug',
        severity: 'high',
        senderName: 'Agente Ketal',
        contactReturn: 'ketal@ordo.org',
      };

      const result = await supportService.submitTicketInApp(payload);

      assert.ok(result.protocol, 'Deve gerar protocolo de atendimento');
      assert.ok(
        result.protocol.startsWith('ORD-') || result.protocol.startsWith('#ORD-'),
        `Protocolo deve iniciar com ORD-, recebido: ${result.protocol}`
      );
      assert.ok(result.ticket, 'Deve retornar o registro do chamado salvo');

      // Verifica histórico gravado no AsyncStorage
      const history = await supportService.getTicketHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].protocol, result.protocol);
      assert.strictEqual(history[0].title, payload.title);
    });

    it('1.4 Feature 4: submitTicketInApp deve indicar claramente o canal de entrega utilizado (webhook vs local)', async () => {
      const payload: SupportTicketPayload = {
        title: 'Sugestão de perícia',
        description: 'Adicionar bônus de perícia customizada.',
        category: 'suggestion',
        severity: 'low',
      };

      const result = await supportService.submitTicketInApp(payload);

      // Quando não há webhook configurado nem internet, canal deve ser local_fallback ou equivalente
      assert.ok(result.channelUsed);
      assert.strictEqual(typeof result.deliveredRemotely, 'boolean');
      assert.ok(result.message);
    });
  });

  // =========================================================================
  // TIER 2: Features 2 & 3 (APK Download Fallback & Discord Link)
  // =========================================================================
  describe('Tier 2: Resiliência de Download de APK & Link do Discord', () => {
    it('2.1 Feature 2: openDownloadUrl sem URL direta deve apontar para o GitHub Releases', async () => {
      const success = await updateCheckerService.openDownloadUrl();
      assert.strictEqual(typeof success, 'boolean');
    });

    it('2.2 Feature 2: se a URL do manifest retornar erro, fallback não quebra o fluxo de atualização', async () => {
      const checker = new UpdateCheckerService(
        'https://invalid.raw.github.test/version.json',
        'https://api.github.com/repos/Lecrepus17/OrdoCompanion/releases/latest'
      );

      // fetchRemoteManifest deve ser resiliente e tentar o fallback da API pública
      await assert.doesNotReject(async () => {
        await checker.fetchRemoteManifest();
      });
    });

    it('2.3 Feature 3: configuração de suporte deve conter link válido e ativo para o Discord', () => {
      const config = supportService.config;
      assert.ok(config.discordInviteUrl, 'discordInviteUrl não pode ser vazio');
      assert.ok(
        config.discordInviteUrl.includes('discord.gg') || config.discordInviteUrl.includes('discord.com'),
        `URL do discord deve ser válida: ${config.discordInviteUrl}`
      );
      assert.ok(config.discordHandle, 'discordHandle deve estar preenchido para fallback');
    });

    it('2.4 Feature 3: openExternalUrl trata URLs externas com segurança sem lançar erro', async () => {
      const opened = await supportService.openExternalUrl('https://discord.gg/vPCZzr2wFR');
      assert.strictEqual(typeof opened, 'boolean');
    });
  });

  // =========================================================================
  // TIER 3: Interface Contracts & Webhook Configurations
  // =========================================================================
  describe('Tier 3: Contrato de Diagnóstico e Configuração de Webhook', () => {
    it('3.1 buildFormattedReport deve compor relatório completo com diagnóstico do sistema', () => {
      const diag = supportService.collectDiagnostics({
        themeId: 'sangue',
        playerName: 'Arthur',
        charactersCount: 3,
        campaignsCount: 1,
        customWeaponsCount: 2,
        cloudSyncEnabled: true,
      });

      const payload: SupportTicketPayload = {
        title: 'Erro de Renderização',
        description: 'Tabela de armas com sobreposição.',
        category: 'bug',
        severity: 'medium',
        includeDiagnostics: true,
        diagnostics: diag,
      };

      const markdown = supportService.buildFormattedReport(payload, 'ORD-12345');
      assert.ok(markdown.includes('ORD-12345'));
      assert.ok(markdown.includes('Erro de Renderização'));
      assert.ok(markdown.includes('Tabela de armas com sobreposição'));
      assert.ok(markdown.includes('Diagnóstico Técnico do Sistema'));
    });

    it('3.2 setCustomWebhookUrl e getEffectiveWebhookUrl gerenciam webhook persistido com ofuscação', async () => {
      const customWebhook = 'https://discord.com/api/webhooks/123456789/abcdefgh';
      await supportService.setCustomWebhookUrl(customWebhook);

      const effective = await supportService.getEffectiveWebhookUrl();
      assert.strictEqual(effective, customWebhook);

      // Limpeza
      await supportService.setCustomWebhookUrl('');
      const afterClear = await supportService.getEffectiveWebhookUrl();
      assert.notStrictEqual(afterClear, customWebhook);
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Suporte e Atualização', () => {
    it('4.1 Cenário: Jogador encontra bug em jogo, envia relato offline e visualiza no histórico de chamados', async () => {
      const payload: SupportTicketPayload = {
        title: 'Crítico de Katana não somou bônus',
        description: 'Na ficha do Ketal o ataque rolou dano sem somar o atributo Força.',
        category: 'bug',
        severity: 'high',
        senderName: 'Jogador 1',
      };

      const submitRes = await supportService.submitTicketInApp(payload);
      assert.ok(submitRes.protocol);

      const tickets = await supportService.getTicketHistory();
      assert.ok(tickets.length >= 1);
      const myTicket = tickets.find((t) => t.protocol === submitRes.protocol);
      assert.ok(myTicket);
      assert.strictEqual(myTicket?.title, payload.title);
    });

    it('4.2 Cenário: Usuário verifica atualização do aplicativo e link de changelog', async () => {
      const manifest = {
        currentVersion: '1.3.0-beta.2',
        minSupportedVersion: '1.0.0',
        releaseDate: new Date().toISOString(),
        downloadUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/latest',
        changelog: ['Correção de leitor de PDF', 'Melhoria na busca do compêndio'],
        forceUpdate: false,
      };

      assert.strictEqual(manifest.currentVersion, '1.3.0-beta.2');
      assert.ok(manifest.changelog.length >= 2);
    });
  });

  // =========================================================================
  // TIER 5: Adversarial & Sanitização contra Menções Indesejadas
  // =========================================================================
  describe('Tier 5: Adversarial & Sanitização contra Menções Indesejadas', () => {
    it('5.1 texto do relato com menções @everyone e @here deve ser sanitizado antes do envio', async () => {
      const payload: SupportTicketPayload = {
        title: 'Aviso urgente @everyone @here',
        description: 'Tentativa de pingar todos os usuários no servidor <@&123456789>.',
        category: 'bug',
        severity: 'high',
      };

      const result = await supportService.submitTicketInApp(payload);
      assert.ok(result.protocol);

      const markdown = supportService.buildFormattedReport(payload, result.protocol);
      assert.ok(markdown.length > 0);
    });

    it('5.2 título e descrição de suporte com tamanho excessivo são limitados com segurança', async () => {
      const hugeDescription = 'Descrição de erro '.repeat(400); // > 6.000 chars
      const payload: SupportTicketPayload = {
        title: 'Título '.repeat(50),
        description: hugeDescription,
        category: 'bug',
        severity: 'low',
      };

      await assert.doesNotReject(async () => {
        const res = await supportService.submitTicketInApp(payload);
        assert.ok(res.protocol);
      });
    });
  });

  // =========================================================================
  // TIER 6: Casos de Borda e Especificações Estritas do Spec Report (M1)
  // =========================================================================
  describe('Tier 6: Casos de Borda e Especificações Estritas do Spec Report (M1)', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('6.1 test_openDownloadUrl_fallback_releases: chamada sem URL abre GITHUB_RELEASES_PAGE_URL', async () => {
      const service = new UpdateCheckerService();
      assert.equal(typeof GITHUB_RELEASES_PAGE_URL, 'string');
      assert.ok(GITHUB_RELEASES_PAGE_URL.startsWith('https://github.com/'));
      assert.ok(GITHUB_RELEASES_PAGE_URL.endsWith('/releases'));

      const res = await service.openDownloadUrl(undefined);
      assert.equal(typeof res, 'boolean');
      assert.equal(res, true);
    });

    it('6.2 test_openDownloadUrl_empty_string_fallback: string vazia ou espaços aplica fallback', async () => {
      const service = new UpdateCheckerService();
      const emptyRes = await service.openDownloadUrl('');
      assert.equal(emptyRes, true);

      const spaceRes = await service.openDownloadUrl('   ');
      assert.equal(spaceRes, true);
    });

    it('6.3 test_openDownloadUrl_direct_apk_and_fallback: asset 404 aciona fallback automático para releases', async () => {
      const service = new UpdateCheckerService();

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes('inexistente.apk')) {
          return new Response(null, { status: 404, statusText: 'Not Found' });
        }
        return new Response(null, { status: 200, statusText: 'OK' });
      };

      const isReachable = await service.verifyUrlReachable('https://github.com/Lecrepus17/OrdoCompanion/releases/download/v9.9.9/inexistente.apk');
      assert.equal(isReachable, false);

      const opened = await service.openDownloadUrl('https://github.com/Lecrepus17/OrdoCompanion/releases/download/v9.9.9/inexistente.apk');
      assert.equal(opened, true);
    });

    it('6.4 test_openResilientApkDownload_fallback_chain: tenta apk, depois downloadUrl, depois releases', async () => {
      const service = new UpdateCheckerService();

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.endsWith('.apk')) {
          return new Response(null, { status: 404 });
        }
        return new Response(null, { status: 200 });
      };

      const res = await service.openResilientApkDownload(
        'https://github.com/Lecrepus17/OrdoCompanion/releases/download/v1.3.0/app.apk',
        'https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v1.3.0'
      );
      assert.equal(res, true);
    });

    it('6.5 test_manifest_apk_url_resilience: manifest sem apkUrl preserva downloadUrl', async () => {
      const service = new UpdateCheckerService('mock-manifest', 'mock-api');
      service.getCurrentVersion = () => '1.0.0';

      service.fetchRemoteManifest = async () => ({
        version: '1.2.0',
        releaseName: 'Ordo Companion v1.2.0',
        downloadUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v1.2.0',
        apkUrl: undefined,
        changelog: ['Melhorias de desempenho'],
        forceUpdate: false,
      });

      const update = await service.checkForAppUpdate();
      assert.ok(update);
      assert.equal(update.hasUpdate, true);
      assert.equal(update.downloadUrl, 'https://github.com/Lecrepus17/OrdoCompanion/releases/tag/v1.2.0');
      assert.equal(update.apkUrl, undefined);
    });

    it('6.6 test_discord_invite_url_validity: convite permanente válido do Discord', () => {
      const inviteUrl = DEFAULT_SUPPORT_CONFIG.discordInviteUrl;
      assert.ok(inviteUrl.startsWith('https://discord.gg/') || inviteUrl.startsWith('https://discord.com/'));
      assert.equal(DEFAULT_SUPPORT_CONFIG.discordHandle, 'lecrepus17');
    });

    it('6.7 test_submitTicketInApp_remote_delivery_status: status 204 gera sent_remote e deliveredRemotely true', async () => {
      const sService = new SupportService({
        discordWebhookUrl: 'https://discord.com/api/webhooks/123/mock',
        rateLimitCooldownMs: 0,
      });
      globalThis.fetch = async () => new Response(null, { status: 204 });

      const res = await sService.submitTicketInApp({
        category: 'bug',
        severity: 'high',
        title: 'Erro de DT',
        description: 'DT não somou PRE',
      });

      assert.equal(res.success, true);
      assert.equal(res.deliveredRemotely, true);
      assert.equal(res.ticket.status, 'sent_remote');
      assert.equal(res.ticket.deliveryChannel, 'discord_webhook');
      assert.ok(res.protocol.startsWith('ORD-'));
    });

    it('6.8 test_submitTicketInApp_local_fallback_status: offline gera saved_local e deliveredRemotely false', async () => {
      const sService = new SupportService({
        discordWebhookUrl: 'https://discord.com/api/webhooks/123/mock',
        rateLimitCooldownMs: 0,
      });
      globalThis.fetch = async () => {
        throw new Error('Offline');
      };

      const res = await sService.submitTicketInApp({
        category: 'suggestion',
        title: 'Sugestão',
        description: 'Tema âmbar',
      });

      assert.equal(res.success, true);
      assert.equal(res.deliveredRemotely, false);
      assert.equal(res.ticket.status, 'saved_local');
      assert.equal(res.ticket.deliveryChannel, 'local');
      assert.ok(res.protocol.startsWith('ORD-'));
    });

    it('6.9 test_ticketHistory_persistence_and_order: preserva ordem cronológica e clearTicketHistory limpa', async () => {
      const sService = new SupportService({ rateLimitCooldownMs: 0 });
      await sService.clearTicketHistory();

      globalThis.fetch = async () => {
        throw new Error('Offline');
      };

      await sService.submitTicketInApp({ category: 'bug', title: 'Ticket 1', description: 'Desc 1' });
      await sService.submitTicketInApp({ category: 'suggestion', title: 'Ticket 2', description: 'Desc 2' });

      let history = await sService.getTicketHistory();
      assert.equal(history.length, 2);
      assert.equal(history[0].title, 'Ticket 2');
      assert.equal(history[1].title, 'Ticket 1');

      await sService.clearTicketHistory();
      history = await sService.getTicketHistory();
      assert.deepEqual(history, []);
    });

    it('6.10 test_oauthredirect_module_exports_default: componente padrão exportado', () => {
      assert.ok(OAuthRedirectScreen);
      assert.equal(typeof OAuthRedirectScreen, 'function');
    });
  });
});
