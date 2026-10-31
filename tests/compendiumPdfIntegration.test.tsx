import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { EntityCard } from '../src/components/EntityCard';
import { defaultRepository } from '../src/repositories/OfflineDataRepository';
import { verifyMasterUnlockPassword } from '../src/services/pdf/PdfAccessService';
import {
  getEffectivePdfFileBaseUrl,
  openPdfDocument,
} from '../src/utils/pdfUrl';
import { CompendiumEntity } from '../src/types/compendium';
import { renderWithProviders, cleanup, fireClick } from './frontendTestUtils';

const MOCK_ENTITY: CompendiumEntity = {
  id: 'ritual_decadencia_test',
  name: 'Decadência',
  category: 'ritual',
  element: 'Morte',
  circle: 1,
  execution: 'Padrão',
  range: 'Toque',
  target: '1 ser ou objeto',
  duration: 'Instantânea',
  resistance: 'Fortitude reduz à metade',
  description: 'Espirais de sombras drenam a vitalidade do alvo.',
  summary: 'Drena a vitalidade do alvo causando dano de Morte.',
  subCategory: 'Rituais',
  tags: ['ritual', 'morte'],
  bookId: 'livro_base',
  bookTitle: 'Livro de Regras',
  pageNumber: 118,
};

describe('Integração de Leitura de PDFs e Páginas Referentes no Compêndio', () => {
  beforeEach(async () => {
    await defaultRepository.initialize();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('1. EntityCard: deve acionar onPressPageBadge com bookId, pageNumber e nome ao clicar no badge de fonte', async () => {
    let triggeredBookId = '';
    let triggeredPage = 0;
    let triggeredName = '';

    const { getByText } = await renderWithProviders(
      <EntityCard
        entity={MOCK_ENTITY}
        onPressPageBadge={(b, p, name) => {
          triggeredBookId = b;
          triggeredPage = p;
          triggeredName = name;
        }}
      />
    );

    const badge = getByText(/Livro de Regras • pág\. 118/i);
    assert.ok(badge, 'Badge de fonte deve ser renderizado no card');

    fireClick(badge);

    assert.strictEqual(triggeredBookId, 'livro_base');
    assert.strictEqual(triggeredPage, 118);
    assert.strictEqual(triggeredName, 'Decadência');
  });

  test('2. verifyMasterUnlockPassword: deve validar senha canônica ORDOCOMPANIONEOMELHOR com sucesso', async () => {
    const res = await verifyMasterUnlockPassword('ORDOCOMPANIONEOMELHOR');
    assert.strictEqual(res.valid, true);
    assert.match(res.message, /liberados/i);
  });

  test('3. getEffectivePdfFileBaseUrl: deve garantir URL de base segura (servidor local ou pasta oficial do Google Drive)', () => {
    const effective = getEffectivePdfFileBaseUrl();
    assert.ok(typeof effective === 'string' && effective.length > 0);
    assert.ok(effective.startsWith('http://') || effective.startsWith('https://'));
  });

  test('4. openPdfDocument: deve executar sem erros e permitir visualização in-app no APK', async () => {
    const ok = await openPdfDocument('Livro base.pdf', 118);
    assert.strictEqual(ok, true);
  });

  test('5. getBookPage: deve retornar título de seção e texto oficial do livro base para a página referente', () => {
    const page = defaultRepository.getBookPage('livro_base', 11);
    assert.ok(page, 'Página 11 deve existir nos dados do compêndio');
    assert.match(page?.section || '', /Mecânica Básica/i);
    assert.ok((page?.text?.length || 0) > 50, 'Texto da página 11 deve estar completo');
  });
});
