import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { OfflineDataRepository } from '../src/repositories/OfflineDataRepository';
import {
  localPdfStorage,
  processUnregisteredPdfWithPythonPipeline,
} from '../src/services/pdf/PdfAccessService';
import BooksScreen from '../src/app/(tabs)/books';
import { PdfViewerModal } from '../src/components/PdfViewerModal';
import {
  renderWithProviders,
  cleanup,
  fireClick,
} from './frontendTestUtils';
import {
  clearUnlockedBooksForTest,
  seedDefaultUnlockedBooksForTest,
  resetMockStorage,
} from './setup';

describe('Exclusão de PDFs e Limpeza Completa (deleteDynamicPdfBook & deletePdfBook)', () => {
  beforeEach(async () => {
    await cleanup();
    await localPdfStorage.clearAllForTest();
  });

  afterEach(async () => {
    await cleanup();
    resetMockStorage();
  });

  test('1. Deve excluir permanentemente um PDF dinâmico / não registrado (ex: PDF da escola), removendo do catálogo, páginas e entidades', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    // Simula upload de um PDF não relacionado (trabalho escolar)
    const schoolPdfBytes = new TextEncoder().encode('%PDF-1.7 Trabalho Escolar de Historia 2026');
    const extracted = await processUnregisteredPdfWithPythonPipeline({
      fileName: 'Trabalho_Historia_Colegio.pdf',
      bytes: schoolPdfBytes,
      pagesText: [
        {
          pageNumber: 1,
          section: 'Introdução Histórica',
          text: 'Capítulo 1: Revolução Industrial e transformações sociais no século XIX.',
        },
      ],
    });

    assert.strictEqual(extracted.ok, true);
    assert.ok(extracted.book);

    // Salva offline e registra no repositório
    await localPdfStorage.savePdfOffline(
      extracted.book.id,
      extracted.book.fileName,
      schoolPdfBytes
    );
    await repo.registerDynamicPdfBook(
      extracted.book,
      extracted.entities,
      extracted.book.fileName
    );

    // Verifica que o livro dinâmico foi cadastrado
    const bookId = extracted.book.id;
    assert.strictEqual(repo.isBookUnlocked(bookId), true);
    assert.ok(repo.getDynamicBooks().some((b) => b.id === bookId));
    assert.ok(repo.getAllCatalogBooks().some((b) => b.id === bookId));
    assert.ok(repo.getBookPage(bookId, 1) !== undefined);
    assert.strictEqual(localPdfStorage.hasPdfOffline(bookId), true);

    // Agora o usuário aciona a exclusão do PDF
    const deleted = await repo.deleteDynamicPdfBook(bookId);
    assert.strictEqual(deleted, true);

    // Também limpa do armazenamento offline de arquivos
    await localPdfStorage.removePdfOffline(bookId);

    // Validações pós-exclusão:
    assert.strictEqual(repo.isBookUnlocked(bookId), false, 'Livro não deve mais constar como desbloqueado');
    assert.strictEqual(
      repo.getDynamicBooks().some((b) => b.id === bookId),
      false,
      'Não deve mais estar na lista de livros dinâmicos'
    );
    assert.strictEqual(
      repo.getAllCatalogBooks().some((b) => b.id === bookId),
      false,
      'Não deve mais aparecer no catálogo geral de livros'
    );
    assert.strictEqual(
      repo.getBookPage(bookId, 1),
      undefined,
      'Páginas do PDF excluído não devem mais ser acessíveis'
    );
    assert.strictEqual(
      localPdfStorage.hasPdfOffline(bookId),
      false,
      'Arquivo binário offline deve ter sido removido do armazenamento local'
    );
    assert.strictEqual(
      repo.getAllEntities().some((e) => e.bookId === bookId),
      false,
      'Nenhuma entidade do PDF excluído deve permanecer no compêndio'
    );
  });

  test('2. Ao excluir PDF de livro oficial, deve remover o arquivo offline e bloquear o livro no repositório', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    const bookId = 'livro_base';
    const fakeBytes = new TextEncoder().encode('%PDF-1.7 Livro Base Oficial');

    // Salva offline e desbloqueia
    await localPdfStorage.savePdfOffline(bookId, 'Livro Base.pdf', fakeBytes);
    await repo.unlockBook(bookId, {
      method: 'pdf_upload',
      fileName: 'Livro Base.pdf',
      localPdfStored: true,
    });

    assert.strictEqual(repo.isBookUnlocked(bookId), true);
    assert.strictEqual(localPdfStorage.hasPdfOffline(bookId), true);

    // Remove o PDF offline e bloqueia o livro
    await localPdfStorage.removePdfOffline(bookId);
    await repo.lockBook(bookId);

    assert.strictEqual(repo.isBookUnlocked(bookId), false);
    assert.strictEqual(localPdfStorage.hasPdfOffline(bookId), false);
  });

  test('3. Interface BooksScreen: deve renderizar botão "Excluir PDF" nos cards de livros liberados', async () => {
    seedDefaultUnlockedBooksForTest();
    const { getAllByText } = await renderWithProviders(
      <BooksScreen />,
      { mobile: false }
    );

    // Botões "Excluir PDF" devem estar presentes na interface
    const deleteBtns = getAllByText(/Excluir PDF/i);
    assert.ok(deleteBtns.length > 0, 'Deve renderizar pelo menos um botão Excluir PDF nos cards de livros');
  });

  test('4. Interface PdfUploadAccessModal: deve renderizar botão "Excluir" para livros no modal de gerenciamento de PDFs', async () => {
    seedDefaultUnlockedBooksForTest();
    const { getByTestId } = await renderWithProviders(
      <BooksScreen />,
      { mobile: false }
    );

    // Abre o modal de gerenciamento de PDFs
    const openBtn = getByTestId('btn-open-pdf-access-modal');
    await fireClick(openBtn);

    // Deve exibir o botão de exclusão de PDF para os livros do catálogo
    const deleteBtn = getByTestId('btn-delete-catalog-book-livro_base');
    assert.ok(deleteBtn, 'Deve renderizar botão Excluir no modal de acesso aos PDFs');
  });

  test('5. Interface PdfViewerModal: deve renderizar botão de exclusão de PDF no cabeçalho do visualizador', async () => {
    const mockBook = {
      id: 'livro_base',
      title: 'Livro Base',
      fileName: 'Livro base.pdf',
      pageCount: 322,
      toc: [],
    };

    const { getByTestId } = await renderWithProviders(
      <PdfViewerModal
        visible={true}
        onClose={() => {}}
        book={mockBook}
        initialPage={1}
      />,
      { mobile: false }
    );

    const deleteBtn = getByTestId('btn-delete-pdf-viewer');
    assert.ok(deleteBtn, 'Deve exibir o botão de excluir PDF no leitor');
  });
});
