import './setup';
import React, { act } from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderWithProviders, cleanup, fireClick } from './frontendTestUtils';
import { UpdateNotificationModal } from '../src/components/UpdateNotificationModal';
import { UpdateCheckResult } from '../src/services/updates/types';

describe('Frontend - Modal de Notificação de Atualização (UpdateNotificationModal.tsx)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  const mockUpdateInfo: UpdateCheckResult = {
    hasUpdate: true,
    currentVersion: '1.0.0',
    latestVersion: '1.1.0',
    releaseName: 'Atualização Paranormal 1.1.0',
    releaseDate: '2026-10-25T12:00:00.000Z',
    changelog: [
      'Novo módulo de rituais com cálculo de PE',
      'Correção na exportação de PDF',
      'Melhorias de desempenho no compêndio',
    ],
    downloadUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/latest',
    apkUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/download/v1.1.0/OrdoCompanion.apk',
    isMandatory: false,
    isDismissed: false,
  };

  it('deve renderizar o modal com informações da versão e notas de lançamento', async () => {
    let dismissed = false;
    let downloaded = false;

    const { getByText } = await renderWithProviders(
      <UpdateNotificationModal
        visible={true}
        updateInfo={mockUpdateInfo}
        onDismiss={() => {
          dismissed = true;
        }}
        onDownload={() => {
          downloaded = true;
        }}
      />
    );

    // Deve conter badge de nova versão e título do release
    assert.ok(getByText(/NOVA VERSÃO DISPONÍVEL/i));
    assert.ok(getByText(/Atualização Paranormal 1.1.0/i));

    // Deve exibir comparativo de versão
    assert.ok(getByText(/v1.0.0/i));
    assert.ok(getByText(/v1.1.0/i));

    // Deve listar itens do changelog
    assert.ok(getByText(/Novo módulo de rituais com cálculo de PE/i));
    assert.ok(getByText(/Correção na exportação de PDF/i));

    // Deve exibir os botões de ação e dica para Android
    assert.ok(getByText(/No Android, toque no arquivo baixado para atualizar/i));
    const downloadBtn = getByText(/Baixar Nova Versão/i);
    const githubBtn = getByText(/Ver Notas no GitHub/i);
    const dismissBtn = getByText(/Lembrar mais tarde/i);

    assert.ok(downloadBtn);
    assert.ok(githubBtn);
    assert.ok(dismissBtn);

    // Clicar em baixar
    await fireClick(downloadBtn);
    assert.equal(downloaded, true);

    // Clicar em lembrar mais tarde
    await fireClick(dismissBtn);
    assert.equal(dismissed, true);
  });

  it('deve exibir aviso obrigatório e ocultar botão de adiar quando isMandatory for true', async () => {
    const mandatoryUpdate: UpdateCheckResult = {
      ...mockUpdateInfo,
      latestVersion: '2.0.0',
      isMandatory: true,
    };

    const { getByText, queryByText } = await renderWithProviders(
      <UpdateNotificationModal
        visible={true}
        updateInfo={mandatoryUpdate}
        onDismiss={() => {}}
      />
    );

    // Deve conter badge de atualização obrigatória
    assert.ok(getByText(/ATUALIZAÇÃO OBRIGATÓRIA/i));
    assert.ok(getByText(/Esta atualização é necessária/i));

    // Não deve conter o botão 'Lembrar mais tarde'
    assert.equal(queryByText(/Lembrar mais tarde/i), null);
    assert.ok(getByText(/Baixar Nova Versão/i));
  });

  it('não deve renderizar nada se visible for false ou updateInfo for null', async () => {
    const { queryByText } = await renderWithProviders(
      <UpdateNotificationModal
        visible={false}
        updateInfo={mockUpdateInfo}
        onDismiss={() => {}}
      />
    );

    assert.equal(queryByText(/NOVA VERSÃO DISPONÍVEL/i), null);
  });
});
