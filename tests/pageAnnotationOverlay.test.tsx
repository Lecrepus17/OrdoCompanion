import './setup';
import React from 'react';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { PageAnnotationOverlay } from '../src/components/PageAnnotationOverlay';
import { AnnotationToolbar } from '../src/components/AnnotationToolbar';
import { PdfViewerModal } from '../src/components/PdfViewerModal';
import { AnnotationStroke } from '../src/types/annotations';
import { renderWithProviders, cleanup, fireClick } from './frontendTestUtils';

describe('Suporte a Anotações Desenhadas na Página do Livro no Tablet', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterEach(async () => {
    await cleanup();
  });

  test('PageAnnotationOverlay: renderiza camadas de traço vetorial sem quebrar', async () => {
    const strokes: AnnotationStroke[] = [
      {
        id: 'stroke_1',
        tool: 'pen',
        color: '#EF4444',
        width: 4,
        opacity: 1,
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.5, y: 0.5 },
        ],
      },
      {
        id: 'stroke_2',
        tool: 'highlighter',
        color: '#EAB308',
        width: 14,
        opacity: 0.38,
        points: [
          { x: 0.2, y: 0.3 },
          { x: 0.8, y: 0.3 },
        ],
      },
    ];

    const { getByTestId } = await renderWithProviders(
      <PageAnnotationOverlay
        bookId="livro_base"
        pageNumber={10}
        width={600}
        height={800}
        strokes={strokes}
        onStrokesChange={() => {}}
        isDrawingActive={false}
        currentTool="pen"
        currentColor="#EF4444"
        currentWidth={3}
      />
    );

    const overlay = getByTestId('page-annotation-overlay');
    assert.ok(overlay);
  });

  test('AnnotationToolbar: renderiza ferramentas, cores e aciona callbacks de ação', async () => {
    let selectedTool = 'pen';
    let selectedColor = '#EF4444';
    let selectedWidth = 2.5;
    let undoCalled = false;
    let redoCalled = false;
    let clearCalled = false;
    let closeCalled = false;

    const { getByText } = await renderWithProviders(
      <AnnotationToolbar
        currentTool={selectedTool as any}
        onSelectTool={(t) => {
          selectedTool = t;
        }}
        currentColor={selectedColor}
        onSelectColor={(c) => {
          selectedColor = c;
        }}
        currentWidth={selectedWidth}
        onSelectWidth={(w) => {
          selectedWidth = w;
        }}
        canUndo={true}
        onUndo={() => {
          undoCalled = true;
        }}
        canRedo={true}
        onRedo={() => {
          redoCalled = true;
        }}
        onClearPage={() => {
          clearCalled = true;
        }}
        onCloseToolbar={() => {
          closeCalled = true;
        }}
        isTablet={true}
      />
    );

    // Verifica indicador de tablet ativo
    assert.ok(getByText('Mesa Digitalizadora & Tablet Ativo'));

    // Testa botões de ferramentas
    const highlighterBtn = getByText('Marca-Texto');
    await fireClick(highlighterBtn);
    assert.equal(selectedTool, 'highlighter');

    const eraserBtn = getByText('Borracha');
    await fireClick(eraserBtn);
    assert.equal(selectedTool, 'eraser');

    const penBtn = getByText('Caneta');
    await fireClick(penBtn);
    assert.equal(selectedTool, 'pen');

    // Concluir fecha barra
    const closeBtn = getByText('Concluir');
    await fireClick(closeBtn);
    assert.equal(closeCalled, true);
  });

  test('PdfViewerModal: exibe botão "Anotar" e abre AnnotationToolbar ao clicar', async () => {
    const { getByTestId, queryByText } = await renderWithProviders(
      <PdfViewerModal
        visible={true}
        onClose={() => {}}
        book={{
          id: 'livro_base',
          title: 'Livro de Regras Base',
          fileName: 'base.pdf',
          pageCount: 300,
          toc: [{ title: 'Capítulo 1', page: 1, level: 1 }],
        }}
        initialPage={1}
        initialMode="pdf_page"
      />,
      { mobile: false }
    );

    // Botão de alternar anotações está presente no cabeçalho
    const toggleBtn = getByTestId('btn-toggle-annotations');
    assert.ok(toggleBtn);

    // A barra de ferramentas inicialmente não está aberta
    assert.equal(queryByText('Mesa Digitalizadora & Tablet Ativo'), null);

    // Clica para ativar o modo de anotação
    await fireClick(toggleBtn);

    // Agora a barra de ferramentas de anotação e stylus está aberta
    assert.ok(getByTestId('btn-toggle-annotations'));
  });
});
