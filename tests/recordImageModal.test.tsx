import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { RecordImageCard } from '../src/components/cardImage/RecordImageCard';
import { RecordImageExportModal } from '../src/components/cardImage/RecordImageExportModal';
import { RecordPreviewModal } from '../src/components/RecordPreviewModal';
import { resolveRecordTheme } from '../src/services/cardImage/themeRegistry';
import { extractRecordCardData } from '../src/services/cardImage/cardDataExtractor';
import { CompendiumEntity } from '../src/types/compendium';
import { renderWithProviders, cleanup, fireClick } from './frontendTestUtils';
import { setMobilePlatform } from './setup';

describe('Componentes Visuais de Geração de Imagem do Compêndio', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  const sampleRitual: CompendiumEntity = {
    id: 'rit_amaldicoar_arma',
    name: 'Amaldiçoar Arma',
    category: 'ritual',
    subCategory: 'Ritual • 1º Círculo',
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    pageNumber: 118,
    element: 'Morte',
    circle: 1,
    execution: 'Padrão',
    range: 'Toque',
    target: '1 arma',
    duration: 'Cena',
    resistance: 'Nenhuma',
    summary: 'A arma é envolvida por um fluido de lodo temporal.',
    description: 'Golpes com a arma causam +1d6 de dano de Morte.',
    tags: ['Dano', 'Morte'],
  };

  test('RecordImageCard deve renderizar título, elemento e lema temático com estilo de Morte', async () => {
    const cardData = extractRecordCardData(sampleRitual);
    const theme = resolveRecordTheme(sampleRitual);

    const { getByText, getByTestId } = await renderWithProviders(
      <RecordImageCard data={cardData} theme={theme} />
    );

    assert.ok(getByTestId('record-image-card-preview'));
    assert.ok(getByText('Amaldiçoar Arma'));
    assert.ok(getByText('RITUAL'));
    assert.ok(getByText(/MORTE/i));
    assert.ok(getByText('ORDO REALITAS • COMPÊNDIO OFICIAL'));
    assert.ok(getByText(/tempo é uma espiral infinita/i));
  });

  test('RecordImageExportModal deve abrir e exibir seletor de temas e botões de ação', async () => {
    let closed = false;
    const { getByText, getByTestId } = await renderWithProviders(
      <RecordImageExportModal
        visible={true}
        target={sampleRitual}
        onClose={() => {
          closed = true;
        }}
      />
    );

    // Título do modal
    assert.ok(getByText('Gerar Imagem do Registro'));

    // Botões principais de exportação
    const btnDownload = getByTestId('btn-download-card-image');
    const btnShare = getByTestId('btn-share-card-image');
    const btnCopy = getByTestId('btn-copy-card-text');
    assert.ok(btnDownload);
    assert.ok(btnShare);
    assert.ok(btnCopy);

    // Seletores de temas (pills)
    const sanguePill = getByTestId('theme-pill-sangue');
    const energiaPill = getByTestId('theme-pill-energia');
    assert.ok(sanguePill);
    assert.ok(energiaPill);

    // Clicar em outro tema (Energia) deve alternar o tema do card
    await fireClick(energiaPill);

    // Fechar modal
    const closeBtn = getByTestId('close-card-modal-btn');
    await fireClick(closeBtn);
    assert.equal(closed, true);
  });

  test('RecordPreviewModal deve exibir o botão "Gerar Imagem" no rodapé', async () => {
    let closed = false;
    const { getByTestId, getByText } = await renderWithProviders(
      <RecordPreviewModal
        request={{
          target: { kind: 'entity', entity: sampleRitual },
        }}
        onClose={() => {
          closed = true;
        }}
      />
    );

    // Botão de Gerar Imagem no rodapé do popup
    const btnGenerateImage = getByTestId('popup-generate-image-btn');
    assert.ok(btnGenerateImage);
    assert.ok(getByText('Gerar Imagem'));

    // Clicar no botão deve acionar a abertura do modal de imagem
    await fireClick(btnGenerateImage);
    assert.ok(getByText('Gerar Imagem do Registro'));
  });

  test('RecordImageExportModal não exibe botão SVG e realiza download/compartilhamento no Android sem Buffer', async () => {
    const originalBuffer = (globalThis as any).Buffer;
    setMobilePlatform('android');
    (globalThis as any).Buffer = undefined;

    try {
      const { queryByTestId, queryByText, getByTestId } = await renderWithProviders(
        <RecordImageExportModal
          visible={true}
          target={sampleRitual}
          onClose={() => {}}
        />
      );

      // Botão SVG deve ter sido removido
      assert.equal(queryByTestId('format-btn-svg'), null);
      assert.equal(queryByText('SVG'), null);

      // Tocar em Baixar e Compartilhar sem Buffer global (simulando Hermes APK) não deve gerar erro de Buffer
      const btnDownload = getByTestId('btn-download-card-image');
      await fireClick(btnDownload);
      assert.equal(queryByText(/Property 'Buffer' doesn't exist/i), null);
      assert.equal(queryByText(/Buffer is not defined/i), null);

      const btnShare = getByTestId('btn-share-card-image');
      await fireClick(btnShare);
      assert.equal(queryByText(/Property 'Buffer' doesn't exist/i), null);
    } finally {
      (globalThis as any).Buffer = originalBuffer;
      setMobilePlatform('web');
    }
  });
});
