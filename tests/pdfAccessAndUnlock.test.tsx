import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { OfflineDataRepository } from '../src/repositories/OfflineDataRepository';
import {
  ADMIN_UNLOCK_EMAIL,
  KNOWN_PDF_SIGNATURES,
  cacheUnlockedBooksOffline,
  computeSha256Hex,
  identifyUploadedPdf,
  localPdfStorage,
  processUnregisteredPdfWithPythonPipeline,
  requestUnlockCodeForAdminEmail,
  verifyAdminUnlockCode,
} from '../src/services/pdf/PdfAccessService';
import { SmartMergeEngine } from '../src/services/sync/SmartMergeEngine';
import BooksScreen from '../src/app/(tabs)/books';
import CompendiumScreen from '../src/app/(tabs)/index';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import {
  clearUnlockedBooksForTest,
  resetMockStorage,
} from './setup';

describe('Controle de Acesso por Origem de PDF, Upload, Extração .py e Código por E-mail', () => {
  beforeEach(async () => {
    await cleanup();
    await localPdfStorage.clearAllForTest();
  });

  afterEach(async () => {
    await cleanup();
    resetMockStorage();
  });

  test('1. Por padrão (novo usuário), todos os 10 livros oficiais começam bloqueados e apenas itens custom aparecem', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    assert.strictEqual(
      repo.getBooks().length,
      0,
      'Nenhum livro oficial deve vir liberado por padrão para novos usuários'
    );
    assert.strictEqual(
      repo.getAllEntities().length,
      0,
      'Nenhuma entidade oficial deve ser listada antes de liberar o respectivo PDF'
    );

    // O catálogo completo ainda conhece os 10 livros registrados como bloqueados
    const catalog = repo.getAllCatalogBooks();
    assert.strictEqual(catalog.length, 10);
    assert.ok(catalog.every((b) => b.isUnlocked === false));
    assert.ok(catalog.every((b) => b.entityCount > 0));

    // Criar um item homebrew (custom) deve funcionar e aparecer normalmente
    const customEnt = await repo.createEntity({
      name: 'Ritual Pessoal do Jogador',
      category: 'ritual',
      subCategory: 'Ritual de 1º Círculo',
      bookId: 'custom',
      bookTitle: 'Homebrew',
      pageNumber: 1,
      element: 'Conhecimento',
      summary: 'Teste homebrew',
      description: 'Descrição homebrew',
      tags: ['Homebrew'],
    });
    assert.strictEqual(repo.getAllEntities().length, 1);
    assert.strictEqual(repo.getAllEntities()[0].id, customEnt.id);
  });

  test('2. Ao fazer upload de PDFs específicos (ex: Arquivos Secretos 1 e 3), deve liberar apenas os dados e leitor desses livros e salvar offline', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    // Identifica "Arquivos Secretos 1.pdf" e "Arquivos Secretos 3.pdf"
    const fakePdfBytes1 = new TextEncoder().encode('%PDF-1.7 Conteudo Arquivos Secretos 01');
    const id1 = await identifyUploadedPdf({
      fileName: 'Arquivos Secretos 1.pdf',
      bytes: fakePdfBytes1,
    });
    assert.strictEqual(id1.isValidPdf, true);
    assert.ok(id1.matchedSignature);
    assert.strictEqual(id1.matchedSignature?.id, 'arquivos_secretos_01');

    const fakePdfBytes3 = new TextEncoder().encode('%PDF-1.7 Conteudo Arquivos Secretos 03');
    const id3 = await identifyUploadedPdf({
      fileName: 'Arquivos-secretos-03.pdf',
      bytes: fakePdfBytes3,
    });
    assert.strictEqual(id3.isValidPdf, true);
    assert.strictEqual(id3.matchedSignature?.id, 'arquivos_secretos_03');

    // Salva os PDFs no armazenamento offline e desbloqueia apenas os livros 01 e 03
    await localPdfStorage.savePdfOffline(
      'arquivos_secretos_01',
      id1.matchedSignature!.fileName,
      fakePdfBytes1,
      id1.sha256
    );
    await localPdfStorage.savePdfOffline(
      'arquivos_secretos_03',
      id3.matchedSignature!.fileName,
      fakePdfBytes3,
      id3.sha256
    );

    await repo.unlockBook('arquivos_secretos_01', {
      method: 'pdf_upload',
      fileName: id1.matchedSignature!.fileName,
      localPdfStored: true,
    });
    await repo.unlockBook('arquivos_secretos_03', {
      method: 'pdf_upload',
      fileName: id3.matchedSignature!.fileName,
      localPdfStored: true,
    });

    // Verifica que apenas os livros 01 e 03 estão disponíveis no leitor
    const unlockedBooks = repo.getBooks();
    assert.strictEqual(unlockedBooks.length, 2);
    assert.deepStrictEqual(
      unlockedBooks.map((b) => b.id),
      ['arquivos_secretos_01', 'arquivos_secretos_03']
    );
    assert.ok(unlockedBooks.every((b) => b.localPdfAvailable === true));

    // Verifica que TODAS as entidades listadas pertencem exclusivamente a arquivos_secretos_01 ou arquivos_secretos_03
    // e possuem sua origem (sourcePdf) preenchida
    const entities = repo.getAllEntities();
    assert.ok(entities.length > 0, 'Deve listar as entidades de Arquivos Secretos 01 e 03');
    for (const ent of entities) {
      assert.ok(
        ent.bookId === 'arquivos_secretos_01' || ent.bookId === 'arquivos_secretos_03',
        `Entidade ${ent.id} tinha bookId inesperado: ${ent.bookId}`
      );
      assert.ok(
        ent.sourcePdf && ent.sourcePdf.toLowerCase().endsWith('.pdf'),
        `Entidade ${ent.id} deve referenciar qual PDF de origem (${ent.sourcePdf})`
      );
    }

    // Livro Base continua bloqueado
    assert.strictEqual(repo.isBookUnlocked('livro_base'), false);
    assert.strictEqual(repo.getBookPage('livro_base', 1), undefined);
    assert.ok(repo.getBookPage('arquivos_secretos_01', 1));
  });

  test('3. PDF não registrado deve ser extraído pelo pipeline (.py), vinculando bookId e sourcePdf e ficando disponível no Compêndio e Leitor', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    const customPdfBytes = new TextEncoder().encode('%PDF-1.7 Novo Suplemento Paranormal');
    const check = await identifyUploadedPdf({
      fileName: 'Suplemento-Cripta-2026.pdf',
      bytes: customPdfBytes,
    });
    assert.strictEqual(check.isValidPdf, true);
    assert.strictEqual(
      check.matchedSignature,
      null,
      'Não deve coincidir com nenhum dos 10 livros pré-registrados'
    );

    const extracted = await processUnregisteredPdfWithPythonPipeline({
      fileName: 'Suplemento-Cripta-2026.pdf',
      bytes: customPdfBytes,
      pagesText: [
        {
          pageNumber: 1,
          section: 'Novos Rituais',
          text: `ECO DO ABISMO\nMORTE 2\nExecução: padrão; Alcance: curto; Alvo: 1 ser; Duração: cena; Resistência: Fortitude parcial\nVocê invoca ecos espirais que drenam a vitalidade do alvo causando 4d6 de dano de Morte.`,
        },
        {
          pageNumber: 2,
          section: 'Novas Ameaças',
          text: `ESPECTRO DA CRIPTA VD 80\nCRIATURA • MORTE\nDEFESA 24\nPV 180\nPresença Perturbadora DT 22`,
        },
      ],
    });

    assert.strictEqual(extracted.ok, true);
    assert.strictEqual(extracted.extractedByPython, true);
    assert.strictEqual(extracted.book.id, 'suplemento_cripta_2026');
    assert.strictEqual(extracted.book.pageCount, 2);
    assert.ok(extracted.entities.length >= 2, 'Deve ter extraído o ritual e a criatura do PDF novo');

    await localPdfStorage.savePdfOffline(
      extracted.book.id,
      extracted.book.fileName,
      customPdfBytes
    );
    await repo.registerDynamicPdfBook(
      extracted.book,
      extracted.entities,
      extracted.book.fileName
    );

    // Deve estar disponível tanto no Leitor de Livros quanto no Compêndio
    const books = repo.getBooks();
    assert.strictEqual(books.length, 1);
    assert.strictEqual(books[0].id, 'suplemento_cripta_2026');
    assert.strictEqual(books[0].localPdfAvailable, true);

    const allEnts = repo.getAllEntities();
    assert.ok(allEnts.some((e) => e.name.toUpperCase().includes('ECO DO ABISMO')));
    assert.ok(allEnts.some((e) => e.name.toUpperCase().includes('ESPECTRO DA CRIPTA')));
    assert.ok(allEnts.every((e) => e.bookId === 'suplemento_cripta_2026'));
    assert.ok(allEnts.every((e) => e.sourcePdf === 'Suplemento-Cripta-2026.pdf'));
  });

  test('4. Envio de código para pedro.eduardo1777@gmail.com deve validar e desbloquear todos os livros atuais offline e no SmartMerge do Google Drive', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    assert.strictEqual(ADMIN_UNLOCK_EMAIL, 'pedro.eduardo1777@gmail.com');

    // Solicita código para pedro.eduardo1777@gmail.com
    const reqResult = await requestUnlockCodeForAdminEmail();
    assert.strictEqual(reqResult.ok, true);
    assert.ok(reqResult.message.includes('pedro.eduardo1777@gmail.com'));
    assert.ok(reqResult.generatedCodeForTest && reqResult.generatedCodeForTest.length === 6);

    // Código errado deve ser recusado
    const wrongVerify = await verifyAdminUnlockCode('000000');
    if (reqResult.generatedCodeForTest !== '000000') {
      assert.strictEqual(wrongVerify.valid, false);
    }

    // Código correto enviado ao e-mail deve validar
    const rightVerify = await verifyAdminUnlockCode(reqResult.generatedCodeForTest!);
    assert.strictEqual(rightVerify.valid, true);
    assert.strictEqual(rightVerify.method, 'email_code');

    // Desbloqueia todos os livros atuais e salva offline
    const records = await repo.unlockAllBooks('email_code');
    await cacheUnlockedBooksOffline(records.map((r) => r.bookId));

    assert.strictEqual(repo.getBooks().length, 10, 'Todos os 10 livros atuais devem ser liberados');
    assert.ok(repo.getAllEntities().length >= 1300, 'Todas as entidades devem estar liberadas');
    assert.ok(
      KNOWN_PDF_SIGNATURES.every((sig) => localPdfStorage.hasPdfOffline(sig.id)),
      'Todos os 10 livros devem estar marcados e disponíveis no cache offline'
    );

    // Verifica que o SmartMergeEngine preserva e sincroniza os livros desbloqueados no Google Drive do usuário
    const exportedJson = await repo.exportUserDataJson();
    const localBackup = JSON.parse(exportedJson);
    const emptyRemoteBackup = {
      exportedAt: new Date(Date.now() - 60000).toISOString(),
      characters: [],
    };

    const mergeRes = SmartMergeEngine.merge(localBackup, emptyRemoteBackup);
    assert.strictEqual(mergeRes.hasRemoteChangesToUpload, true);
    assert.strictEqual(Object.keys(mergeRes.merged.unlockedBooks || {}).length, 10);
  });

  test('5. Interface Frontend: Tela de Livros e Compêndio devem abrir o modal de disponibilização de PDFs e permitir liberar com código do e-mail', async () => {
    clearUnlockedBooksForTest();

    const { getByTestId, queryByText, getByText, getByPlaceholder } = await renderWithProviders(<BooksScreen />);

    // Como começou bloqueado, mostra aviso de que nenhum PDF foi disponibilizado ainda
    assert.ok(queryByText(/Nenhum PDF disponibilizado ainda/i));

    // Clica no botão de abrir o modal de PDFs / Código
    const openBtn = getByTestId('btn-open-pdf-access-modal');
    await fireClick(openBtn);

    // Verifica elementos do modal
    assert.ok(getByText(/Gerenciar Acesso aos Livros & PDFs/i));
    assert.ok(getByText(/pedro\.eduardo1777@gmail\.com/i));

    // Clica em enviar código para pedro.eduardo1777@gmail.com
    const sendCodeBtn = getByTestId('btn-send-admin-unlock-code');
    await fireClick(sendCodeBtn);

    // Insere código de proprietário e clica em Liberar Tudo
    const codeInput = getByPlaceholder(/código enviado ao e-mail|Código de 6 dígitos/i);
    await changeInputText(codeInput, 'ORDO1777');

    const verifyBtn = getByTestId('btn-verify-admin-unlock-code');
    await fireClick(verifyBtn);

    // Agora todos os 10 livros devem estar liberados na biblioteca!
    assert.ok(queryByText(/10 de 10 livros liberados/i));
  });
});
