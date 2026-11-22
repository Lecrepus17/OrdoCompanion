import './setup';
import React, { act } from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Linking, Share } from 'react-native';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import SupportScreen from '../src/app/(tabs)/support';
import { UserProfileModal } from '../src/components/UserProfileModal';
import { supportService } from '../src/services/support/SupportService';

describe('Frontend - Central de Suporte & Relato de Erros (support.tsx & SupportCenterView.tsx)', () => {
  const originalConfig = supportService.getConfig();
  const originalFetch = globalThis.fetch;
  const originalOpenUrl = Linking.openURL;
  const originalCanOpenUrl = Linking.canOpenURL;
  const originalShare = Share.share;
  const originalClipboard =
    typeof navigator !== 'undefined' ? (navigator as any).clipboard : undefined;
  const originalWindowOpen = typeof window !== 'undefined' ? window.open : undefined;

  beforeEach(async () => {
    supportService.updateConfig({ ...originalConfig, rateLimitCooldownMs: 0 });
    supportService.resetRateLimit();
    await supportService.clearTicketHistory();
    await cleanup();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    (Linking as any).openURL = originalOpenUrl;
    (Linking as any).canOpenURL = originalCanOpenUrl;
    (Share as any).share = originalShare;
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    }
    if (typeof window !== 'undefined') {
      window.open = originalWindowOpen as any;
    }
    supportService.updateConfig(originalConfig);
    supportService.resetRateLimit();
    await supportService.clearTicketHistory();
    await cleanup();
  });

  it('deve renderizar a tela de Suporte com canais de contato direto e formulário integrado', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderWithProviders(<SupportScreen />);

    // Cabeçalho e canais diretos
    assert.ok(getByText(/Central de Suporte & Relato de Erros/i));
    assert.ok(getByText(/CANAIS DE CONTATO DIRETO/i));
    assert.ok(getByText(/Discord Oficial \/ Dev/i));
    assert.ok(getByText(/E-mail de Suporte/i));
    assert.ok(getByText(/GitHub Oficial do Projeto/i));

    // O painel manual de desenvolvedor não deve mais ser exibido
    assert.equal(queryByTestId('dev-settings-card'), null);

    // Banner de transparência citando #erros e #melhorias
    const banner = getByTestId('support-transparency-banner');
    assert.ok(banner.textContent?.includes('#erros'));
    assert.ok(banner.textContent?.includes('#melhorias'));

    // Botões de contato direto
    assert.ok(getByTestId('contact-discord-open-btn'));
    assert.ok(getByTestId('contact-discord-copy-btn'));
    assert.ok(getByTestId('contact-email-open-btn'));
    assert.ok(getByTestId('contact-email-copy-btn'));
    assert.ok(getByTestId('contact-github-issues-btn'));
    assert.ok(getByTestId('contact-github-repo-btn'));

    // Categorias do formulário
    assert.ok(getByTestId('support-category-bug'));
    assert.ok(getByTestId('support-category-rule_error'));
    assert.ok(getByTestId('support-category-suggestion'));
    assert.ok(getByTestId('support-category-contact'));
  });

  it('deve permitir preencher um relato de erro e enviar diretamente pelo app gerando protocolo #ORD', async () => {
    const { getByTestId, getByText } = await renderWithProviders(<SupportScreen />);

    // Selecionar categoria de erro de regra
    const ruleCatBtn = getByTestId('support-category-rule_error');
    await fireClick(ruleCatBtn);

    // Preencher título, descrição e contato de retorno
    const titleInput = getByTestId('support-title-input');
    const descInput = getByTestId('support-description-input');
    const contactInput = getByTestId('support-contact-return-input');

    await changeInputText(titleInput as HTMLInputElement, 'Custo de PE do ritual Cinerária');
    await changeInputText(descInput as HTMLTextAreaElement, 'Na versão Verdadeira o texto indica +4 PE.');
    await changeInputText(contactInput as HTMLInputElement, 'meu_discord#0001');

    // Enviar pelo botão principal
    const submitBtn = getByTestId('support-submit-direct-btn');
    await fireClick(submitBtn);

    // Deve exibir banner de confirmação com o protocolo gerado, listar no histórico e oferecer exportação JSON
    assert.ok(getByTestId('support-protocol-banner'));
    assert.ok(getByText(/Relato Registrado • Protocolo #ORD-/i));
    assert.ok(getByText(/MEUS RELATOS ENVIADOS/i));
    assert.ok(getByTestId('support-export-history-json-btn'));
  });

  it('deve testar todas as 4 categorias (bug, rule_error, suggestion, contact) e switch de diagnóstico no Android APK', async () => {
    const sentPayloads: any[] = [];
    supportService.updateConfig({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'anon_test',
      discordWebhookUrl: '',
      rateLimitCooldownMs: 0,
    });

    globalThis.fetch = (async (_url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      sentPayloads.push(body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          protocol: body.protocol,
          routedChannel:
            body.category === 'suggestion'
              ? 'improvements'
              : body.category === 'contact'
              ? 'default'
              : 'errors',
        }),
      } as any;
    }) as any;

    const { getByTestId, queryByTestId } = await renderWithProviders(<SupportScreen />, {
      mobile: 'android',
    });

    // 1. Bug com severidade crítica e passos para reproduzir
    await fireClick(getByTestId('support-category-bug'));
    assert.ok(getByTestId('support-submit-direct-btn').textContent?.includes('Enviar Erro para o Discord'));
    await fireClick(getByTestId('support-severity-high'));
    await changeInputText(getByTestId('support-title-input') as HTMLInputElement, 'Bug na ficha');
    await changeInputText(getByTestId('support-description-input') as HTMLTextAreaElement, 'Descrição bug');
    await changeInputText(getByTestId('support-steps-input') as HTMLTextAreaElement, '1. Abrir ficha');
    await fireClick(getByTestId('support-submit-direct-btn'));

    // 2. Erro de regra
    await fireClick(getByTestId('support-category-rule_error'));
    assert.ok(getByTestId('support-submit-direct-btn').textContent?.includes('Enviar Erro para o Discord'));
    assert.equal(queryByTestId('support-steps-input'), null);
    await changeInputText(getByTestId('support-title-input') as HTMLInputElement, 'Regra de ritual');
    await changeInputText(getByTestId('support-description-input') as HTMLTextAreaElement, 'DT errada');
    await fireClick(getByTestId('support-submit-direct-btn'));

    // 3. Sugestão / Melhoria (foco do erro reportado no celular)
    await fireClick(getByTestId('support-category-suggestion'));
    assert.ok(
      getByTestId('support-submit-direct-btn').textContent?.includes('Enviar Melhoria para o Discord')
    );
    assert.equal(queryByTestId('support-severity-high'), null);
    await changeInputText(getByTestId('support-title-input') as HTMLInputElement, 'Múltiplas proteções');
    await changeInputText(
      getByTestId('support-description-input') as HTMLTextAreaElement,
      'Permitir criar mais de uma proteção no assistente'
    );
    await fireClick(getByTestId('support-submit-direct-btn'));

    // 4. Contato direto com diagnóstico desabilitado via Switch
    await fireClick(getByTestId('support-category-contact'));
    assert.ok(
      getByTestId('support-submit-direct-btn').textContent?.includes('Enviar Mensagem para o Discord')
    );
    const diagSwitch = getByTestId('support-diagnostics-switch');
    const diagCheckbox = (
      diagSwitch.tagName === 'INPUT'
        ? diagSwitch
        : diagSwitch.querySelector('input[type="checkbox"]')
    ) as HTMLInputElement | null;
    assert.ok(diagCheckbox, 'Switch de diagnóstico deve conter input checkbox');
    await act(async () => {
      diagCheckbox!.click();
    });
    await changeInputText(getByTestId('support-title-input') as HTMLInputElement, 'Dúvida geral');
    await changeInputText(getByTestId('support-description-input') as HTMLTextAreaElement, 'Como usar a mesa?');
    await fireClick(getByTestId('support-submit-direct-btn'));

    assert.equal(sentPayloads.length, 4);
    assert.equal(sentPayloads[0].category, 'bug');
    assert.equal(sentPayloads[0].severity, 'high');
    assert.equal(sentPayloads[0].stepsToReproduce, '1. Abrir ficha');
    assert.equal(sentPayloads[0].requestGroup, 'errors');

    assert.equal(sentPayloads[1].category, 'rule_error');
    assert.equal(sentPayloads[1].requestGroup, 'errors');

    assert.equal(sentPayloads[2].category, 'suggestion');
    assert.equal(sentPayloads[2].requestGroup, 'improvements');
    assert.equal(sentPayloads[2].includeDiagnostics, true);

    assert.equal(sentPayloads[3].category, 'contact');
    assert.equal(sentPayloads[3].includeDiagnostics, false);
  });

  it('deve validar os 6 botões de contato direto e os 3 botões alternativos no Android sem acionar Share.share ao abrir Discord', async () => {
    const openedUrls: string[] = [];
    const sharedMessages: string[] = [];

    (Linking as any).canOpenURL = async () => true;
    (Linking as any).openURL = async (url: string) => {
      openedUrls.push(url);
    };
    (Share as any).share = async ({ message }: { message: string }) => {
      sharedMessages.push(message);
      return { action: 'sharedAction' };
    };

    const { getByTestId } = await renderWithProviders(<SupportScreen />, {
      mobile: 'android',
    });

    // Abrir Discord no Android deve chamar Linking.openURL diretamente sem Share.share
    await fireClick(getByTestId('contact-discord-open-btn'));
    assert.equal(openedUrls.length, 1);
    assert.ok(openedUrls[0].includes('discord.gg/vPCZzr2wFR'));
    assert.equal(sharedMessages.length, 0);

    // Copiar Nick deve acionar Share.share com @lecrepus17
    await fireClick(getByTestId('contact-discord-copy-btn'));
    assert.equal(sharedMessages.length, 1);
    assert.ok(sharedMessages[0].includes('@lecrepus17'));

    // Botões de E-mail e GitHub diretos
    await fireClick(getByTestId('contact-email-open-btn'));
    await fireClick(getByTestId('contact-email-copy-btn'));
    await fireClick(getByTestId('contact-github-issues-btn'));
    await fireClick(getByTestId('contact-github-repo-btn'));

    assert.ok(openedUrls.some((u) => u.startsWith('mailto:')));
    assert.ok(openedUrls.some((u) => u.endsWith('/issues')));
    assert.ok(openedUrls.some((u) => u.endsWith('/OrdoCompanion')));
    assert.ok(sharedMessages.some((m) => m.includes('@gmail.com')));

    // Preenche formulário e valida os 3 canais alternativos de envio
    await fireClick(getByTestId('support-category-suggestion'));
    await changeInputText(getByTestId('support-title-input') as HTMLInputElement, 'Ideia via alternativo');
    await changeInputText(getByTestId('support-description-input') as HTMLTextAreaElement, 'Testando canais');

    await fireClick(getByTestId('support-open-github-issue-btn'));
    await fireClick(getByTestId('support-send-email-btn'));
    await fireClick(getByTestId('support-copy-report-btn'));

    assert.ok(openedUrls.some((u) => u.includes('/issues/new?')));
    assert.ok(openedUrls.some((u) => u.startsWith('mailto:') && u.includes('ORD-')));
    assert.ok(sharedMessages.some((m) => m.includes('Ideia via alternativo') && m.includes('#ORD-')));
  });

  it('deve preservar rascunho quando envio falhar (429/offline) e permitir reenviar em 1 clique pelo histórico', async () => {
    supportService.updateConfig({
      supabaseProxyUrl: 'https://avkzalgedowqyjejmtql.supabase.co/functions/v1/support-webhook',
      supabaseAnonKey: 'anon_test',
      discordWebhookUrl: '',
      rateLimitCooldownMs: 0,
    });

    let shouldSucceed = false;
    globalThis.fetch = (async (_url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      if (!shouldSucceed) {
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: 'Limite de envios atingido no servidor.' }),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, protocol: body.protocol, routedChannel: 'improvements' }),
      } as any;
    }) as any;

    const { container, getByTestId, getByText } = await renderWithProviders(<SupportScreen />, {
      mobile: 'android',
    });

    await fireClick(getByTestId('support-category-suggestion'));
    const titleInput = getByTestId('support-title-input') as HTMLInputElement;
    const descInput = getByTestId('support-description-input') as HTMLTextAreaElement;

    await changeInputText(titleInput, 'Melhoria preservada');
    await changeInputText(descInput, 'Não pode sumir quando der erro de rede ou 429');
    await fireClick(getByTestId('support-submit-direct-btn'));

    // Rascunho preservado na tela
    assert.equal((getByTestId('support-title-input') as HTMLInputElement).value, 'Melhoria preservada');
    assert.equal(
      (getByTestId('support-description-input') as HTMLTextAreaElement).value,
      'Não pode sumir quando der erro de rede ou 429'
    );
    assert.ok(getByText(/Salvo no Dispositivo/i));
    assert.ok(getByText(/Limite de envios atingido/i));

    // Localiza botão Reenviar do protocolo salvo e reenvia com sucesso
    const retryBtn = container.querySelector('[data-testid^="support-retry-ticket-ORD-"]') as HTMLElement;
    assert.ok(retryBtn, 'Botão Reenviar deve aparecer para chamado salvo localmente');

    shouldSucceed = true;
    await fireClick(retryBtn);

    assert.ok(getByText(/Entregue ao Desenvolvedor/i));
    assert.equal(container.querySelector('[data-testid^="support-retry-ticket-ORD-"]'), null);
  });

  it('deve testar fluxo Web de Abrir Discord com clipboard e window.open sem Share.share', async () => {
    const copied: string[] = [];
    const openedUrls: string[] = [];
    const shared: string[] = [];

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
      configurable: true,
      writable: true,
    });
    window.open = ((url: string) => {
      openedUrls.push(url);
      return null;
    }) as any;
    (Share as any).share = async ({ message }: { message: string }) => {
      shared.push(message);
      return { action: 'sharedAction' };
    };

    const { getByTestId } = await renderWithProviders(<SupportScreen />);
    await fireClick(getByTestId('contact-discord-open-btn'));

    assert.deepEqual(copied, ['@lecrepus17']);
    assert.ok(openedUrls[0]?.includes('discord.gg/vPCZzr2wFR'));
    assert.equal(shared.length, 0);
  });

  it('deve exibir a aba "Suporte" dentro do UserProfileModal sem atalho/Fechar duplicado e fechar pelo X do cabeçalho no Android', async () => {
    let closedCount = 0;
    const { getByTestId, queryByTestId, getByText } = await renderWithProviders(
      <UserProfileModal visible={true} onClose={() => { closedCount += 1; }} initialTab="identidade" />,
      { mobile: 'android' }
    );

    assert.ok(getByTestId('profile-save-btn'));
    assert.ok(getByTestId('profile-header-close-btn'));
    assert.equal(queryByTestId('profile-close-btn'), null);
    assert.equal(queryByTestId('profile-open-support-shortcut'), null);

    // Deve ter o botão da aba Suporte na navegação do modal
    const supportTabBtn = getByTestId('profile-tab-suporte');
    assert.ok(supportTabBtn);

    await fireClick(supportTabBtn);

    // Deve renderizar a Central de Suporte e ocultar o rodapé (incluindo "Salvar Informações" e "Fechar" duplicado)
    assert.ok(getByText(/Central de Suporte & Relato de Erros/i));
    assert.ok(getByTestId('support-submit-direct-btn'));
    assert.equal(queryByTestId('profile-close-btn'), null);
    assert.equal(queryByTestId('profile-save-btn'), null);

    // Botão X do cabeçalho fecha o modal normalmente
    await fireClick(getByTestId('profile-header-close-btn'));
    assert.equal(closedCount, 1);
  });
});
