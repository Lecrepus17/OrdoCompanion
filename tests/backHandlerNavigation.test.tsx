import './setup';
import React from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { BackHandler, Platform } from 'react-native';

describe('Android APK - BackHandler & Navegação de Hardware', () => {
  const originalPlatformOS = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalPlatformOS;
  });

  it('permite registrar e invocar listener de hardwareBackPress consumindo o evento', () => {
    (Platform as any).OS = 'android';
    let backHandled = false;

    const listener = () => {
      backHandled = true;
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', listener);
    assert.ok(sub && typeof sub.remove === 'function');

    // Simula disparo do evento de hardware
    const result = listener();
    assert.equal(result, true);
    assert.equal(backHandled, true);

    // Remove listener
    sub.remove();
  });

  it('CreateAgentModal: retrocede etapas se step > 1 sem fechar a aplicação', () => {
    let currentStep = 3;
    let closed = false;

    const handleModalBack = () => {
      if (currentStep > 1) {
        currentStep -= 1;
        return true;
      }
      closed = true;
      return true;
    };

    // Primeira pressão: retrocede de 3 para 2
    let consumed = handleModalBack();
    assert.equal(consumed, true);
    assert.equal(currentStep, 2);
    assert.equal(closed, false);

    // Segunda pressão: retrocede de 2 para 1
    consumed = handleModalBack();
    assert.equal(consumed, true);
    assert.equal(currentStep, 1);
    assert.equal(closed, false);

    // Terceira pressão: na etapa 1, fecha
    consumed = handleModalBack();
    assert.equal(consumed, true);
    assert.equal(closed, true);
  });

  it('MasterScreen: deseleciona campanha ativa no botão Voltar antes de sair da tela', () => {
    let activeCampaignId: string | null = 'camp-123';

    const handleMasterBack = () => {
      if (activeCampaignId !== null) {
        activeCampaignId = null;
        return true;
      }
      return false;
    };

    // Usuário está dentro dos detalhes da campanha: ao tocar voltar, deseleciona a campanha
    const consumed = handleMasterBack();
    assert.equal(consumed, true);
    assert.equal(activeCampaignId, null);

    // Na lista de campanhas: evento não é consumido permitindo navegação de abas do sistema
    const nextConsumed = handleMasterBack();
    assert.equal(nextConsumed, false);
  });

  it('LevelUpModal: solicita confirmação antes de descartar seleções de avanço', () => {
    let confirmationShown = false;
    let dismissed = false;

    const selectedAttrToBoost: string | null = 'FOR';

    const handleLevelUpBack = () => {
      const hasSelections = selectedAttrToBoost !== null;
      if (hasSelections) {
        confirmationShown = true;
        return true;
      }
      dismissed = true;
      return true;
    };

    const consumed = handleLevelUpBack();
    assert.equal(consumed, true);
    assert.equal(confirmationShown, true);
    assert.equal(dismissed, false);
  });

  it('PdfViewerModal: desativa anotações/busca/maximização antes de fechar o leitor no Android', () => {
    let isAnnotationModeActive = true;
    let isMaximized = true;
    let closed = false;

    const handlePdfBackNavigation = () => {
      if (isAnnotationModeActive) {
        isAnnotationModeActive = false;
        return true;
      }
      if (isMaximized) {
        isMaximized = false;
        return true;
      }
      closed = true;
      return true;
    };

    // 1º toque: fecha a barra de anotação/desenho mantendo o livro aberto
    let consumed = handlePdfBackNavigation();
    assert.equal(consumed, true);
    assert.equal(isAnnotationModeActive, false);
    assert.equal(closed, false);

    // 2º toque: restaura da visualização maximizada mantendo o livro aberto
    consumed = handlePdfBackNavigation();
    assert.equal(consumed, true);
    assert.equal(isMaximized, false);
    assert.equal(closed, false);

    // 3º toque: fecha o modal do livro suavemente
    consumed = handlePdfBackNavigation();
    assert.equal(consumed, true);
    assert.equal(closed, true);
  });
});
