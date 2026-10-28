import './setup';
import React from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
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
  beforeEach(async () => {
    await supportService.clearTicketHistory();
    await cleanup();
  });

  afterEach(async () => {
    await supportService.clearTicketHistory();
    await cleanup();
  });

  it('deve renderizar a tela de Suporte com canais de contato direto e formulário integrado', async () => {
    const { getByText, getByTestId } = await renderWithProviders(<SupportScreen />);

    // Cabeçalho e canais diretos
    assert.ok(getByText(/Central de Suporte & Relato de Erros/i));
    assert.ok(getByText(/CANAIS DE CONTATO DIRETO/i));
    assert.ok(getByText(/Discord Oficial \/ Dev/i));
    assert.ok(getByText(/E-mail de Suporte/i));
    assert.ok(getByText(/GitHub Oficial do Projeto/i));

    // Botões de contato direto
    assert.ok(getByTestId('contact-discord-open-btn'));
    assert.ok(getByTestId('contact-email-open-btn'));
    assert.ok(getByTestId('contact-github-issues-btn'));

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

    // Deve exibir banner de confirmação com o protocolo gerado e listar no histórico
    assert.ok(getByTestId('support-protocol-banner'));
    assert.ok(getByText(/Relato Registrado • Protocolo #ORD-/i));
    assert.ok(getByText(/MEUS RELATOS ENVIADOS/i));
  });

  it('deve exibir a aba "Suporte" dentro do UserProfileModal', async () => {
    const { getByTestId, getByText } = await renderWithProviders(
      <UserProfileModal visible={true} onClose={() => {}} initialTab="identidade" />
    );

    // Deve ter o botão da aba Suporte na navegação do modal
    const supportTabBtn = getByTestId('profile-tab-suporte');
    assert.ok(supportTabBtn);

    await fireClick(supportTabBtn);

    // Deve renderizar o conteúdo da Central de Suporte dentro do modal
    assert.ok(getByText(/Central de Suporte & Relato de Erros/i));
    assert.ok(getByTestId('support-submit-direct-btn'));
  });
});
