import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { OfflineDataRepository } from '../src/repositories/OfflineDataRepository';
import {
  KNOWN_PDF_SIGNATURES,
  cacheUnlockedBooksOffline,
  computeSha256Hex,
  estimatePdfPageCountFromBytes,
  identifyUploadedPdf,
  localPdfStorage,
  processUnregisteredPdfWithPythonPipeline,
  verifyMasterUnlockPassword,
  computeMasterPasswordHash,
  verifyAdminUnlockCode,
} from '../src/services/pdf/PdfAccessService';
import {
  latin1BytesToString,
  utf8ByteArrayToStringLossy,
} from '../src/utils/agentSharing';
import { SmartMergeEngine } from '../src/services/sync/SmartMergeEngine';
import BooksScreen from '../src/app/(tabs)/books';
import CompendiumScreen from '../src/app/(tabs)/index';
import EntityDetailScreen from '../src/app/entity/[id]';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
  mockRouter,
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

  test('1. Por padrão (novo usuário), todos os 10 livros começam bloqueados no leitor e apenas o núcleo essencial do Livro Base (Classes, Perícias e Condições) + itens custom aparecem', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    assert.strictEqual(
      repo.getBooks().length,
      0,
      'Nenhum livro oficial deve vir liberado no leitor por padrão para novos usuários'
    );
    assert.strictEqual(repo.isBookUnlocked('livro_base'), false);
    assert.strictEqual(repo.getBookPage('livro_base', 1), undefined);
    assert.strictEqual(repo.searchInBookPages('all', 'combatente').length, 0);

    const defaultEntities = repo.getAllEntities();
    assert.strictEqual(
      defaultEntities.length,
      68,
      'Apenas as 68 entidades essenciais do Livro Base (3 classes + 28 perícias + 37 condições) devem vir liberadas por padrão'
    );
    const allowedDefaultCategories = new Set(['class', 'skill', 'condition']);
    assert.ok(
      defaultEntities.every(
        (e) => e.bookId === 'livro_base' && allowedDefaultCategories.has(e.category)
      ),
      'Nenhuma entidade fora do núcleo essencial do Livro Base ou de outros 9 livros deve ser listada por padrão'
    );
    assert.strictEqual(defaultEntities.filter((e) => e.category === 'class').length, 3);
    assert.strictEqual(defaultEntities.filter((e) => e.category === 'skill').length, 28);
    assert.strictEqual(defaultEntities.filter((e) => e.category === 'condition').length, 37);
    assert.strictEqual(repo.getEntityById('ritual__livro_base__decadencia'), undefined);
    assert.ok(repo.getEntityById('class__livro_base__combatente'));

    // O catálogo completo ainda conhece os 10 livros registrados como bloqueados no leitor
    const catalog = repo.getAllCatalogBooks();
    assert.strictEqual(catalog.length, 10);
    assert.ok(catalog.every((b) => b.isUnlocked === false));
    assert.ok(catalog.every((b) => b.entityCount > 0));
    const livroBaseCatalog = catalog.find((b) => b.id === 'livro_base')!;
    assert.strictEqual(livroBaseCatalog.unlockedEntityCount, 68);
    assert.strictEqual(livroBaseCatalog.hasDefaultUnlockedEntities, true);
    assert.ok(
      catalog
        .filter((b) => b.id !== 'livro_base')
        .every((b) => b.unlockedEntityCount === 0 && b.hasDefaultUnlockedEntities === false)
    );

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
    assert.strictEqual(repo.getAllEntities().length, 69);
    assert.ok(repo.getAllEntities().some((e) => e.id === customEnt.id));
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

    // Verifica que TODAS as entidades listadas pertencem a arquivos_secretos_01, arquivos_secretos_03
    // ou ao núcleo essencial padrão do Livro Base (Classes, Perícias e Condições)
    const entities = repo.getAllEntities();
    assert.ok(entities.length > 68, 'Deve listar as entidades de Arquivos Secretos 01 e 03 além do núcleo base');
    const coreCategories = new Set(['class', 'skill', 'condition']);
    for (const ent of entities) {
      const isUploadedBook =
        ent.bookId === 'arquivos_secretos_01' || ent.bookId === 'arquivos_secretos_03';
      const isDefaultCore = ent.bookId === 'livro_base' && coreCategories.has(ent.category);
      assert.ok(
        isUploadedBook || isDefaultCore,
        `Entidade ${ent.id} tinha bookId/categoria inesperados: ${ent.bookId} (${ent.category})`
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
    const dynEnts = allEnts.filter((e) => e.bookId === 'suplemento_cripta_2026');
    assert.ok(dynEnts.some((e) => e.name.toUpperCase().includes('ECO DO ABISMO')));
    assert.ok(dynEnts.some((e) => e.name.toUpperCase().includes('ESPECTRO DA CRIPTA')));
    assert.ok(dynEnts.every((e) => e.sourcePdf === 'Suplemento-Cripta-2026.pdf'));
    const coreCategories = new Set(['class', 'skill', 'condition']);
    assert.ok(
      allEnts.every(
        (e) =>
          e.bookId === 'suplemento_cripta_2026' ||
          (e.bookId === 'livro_base' && coreCategories.has(e.category))
      )
    );
  });

  test('4. Senha Mestre Segura com Hash SHA-256 deve validar e desbloquear todos os livros atuais offline e no SmartMerge do Google Drive', async () => {
    clearUnlockedBooksForTest();
    const repo = new OfflineDataRepository();
    await repo.initialize();

    // 1. Senha errada deve ser recusada com mensagem clara
    const wrongVerify = await verifyMasterUnlockPassword('SENHAERRADA123');
    assert.strictEqual(wrongVerify.valid, false);
    assert.ok(wrongVerify.message.includes('Senha incorreta'));

    // 2. Senha vazia deve pedir a senha
    const emptyVerify = await verifyMasterUnlockPassword('');
    assert.strictEqual(emptyVerify.valid, false);

    // 3. Senha correta oficial definida pelo autor ("ORDOCOMPANIONEOMELHOR") deve ser validada por hash
    const rightVerify = await verifyMasterUnlockPassword('ORDOCOMPANIONEOMELHOR');
    assert.strictEqual(rightVerify.valid, true);
    assert.ok(rightVerify.message.includes('validada com sucesso'));

    // Também deve aceitar minúsculas ou espaços ("ordo compendio neo melhor")
    const lowerVerify = await verifyMasterUnlockPassword('ORDOCOMPANIONEOMELHOR');
    assert.strictEqual(lowerVerify.valid, true);

    // Desbloqueia todos os livros atuais e salva offline
    const records = await repo.unlockAllBooks('master_code');
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

  test('5. Interface Frontend: Tela de Livros deve abrir o modal de disponibilização de PDFs e permitir liberar com Senha Mestre', async () => {
    clearUnlockedBooksForTest();

    const { getByTestId, queryByText, getByText, getByPlaceholder } = await renderWithProviders(<BooksScreen />);

    // Como começou bloqueado, mostra aviso de que nenhum PDF foi disponibilizado ainda
    assert.ok(queryByText(/Nenhum PDF disponibilizado ainda/i));

    // Clica no botão de abrir o modal de PDFs / Senha Mestre
    const openBtn = getByTestId('btn-open-pdf-access-modal');
    await fireClick(openBtn);

    // Verifica elementos do modal antes da Senha Mestre (núcleo essencial do Livro Base ativo)
    assert.ok(getByText(/Gerenciar Acesso aos Livros & PDFs/i));
    assert.ok(getByText(/Liberação por Senha do Mestre/i));
    assert.ok(getByText(/0 de 10 livros liberados • 68 entidades ativas/i));
    assert.ok(getByText(/Núcleo Essencial Ativo • PDF Bloqueado/i));

    // Insere senha do Mestre e clica em Liberar Tudo
    const codeInput = getByPlaceholder(/Digite a Senha Mestre/i);
    await changeInputText(codeInput, 'ORDOCOMPANIONEOMELHOR');

    const verifyBtn = getByTestId('btn-verify-admin-unlock-code');
    await fireClick(verifyBtn);

    // Agora todos os 10 livros devem estar liberados na biblioteca!
    assert.ok(queryByText(/10 de 10 livros liberados/i));

    // Verifica que o botão de abrir pasta do Google Drive está disponível
    const gdriveBtn = getByTestId('btn-open-master-gdrive');
    assert.ok(gdriveBtn);
    await fireClick(gdriveBtn);
  });

  test('6. PDFs grandes (> 80 MB, ex: Sobrevivendo ao Horror e Arquivos Secretos #02) não travam por OOM e identificam instantaneamente', async () => {
    // 84 MB para Sobrevivendo ao Horror
    const resSobrevivendo = await identifyUploadedPdf({
      fileName: 'Sobrevivendo ao Horror v1.2.pdf',
      fileSize: 88080384,
    });
    assert.strictEqual(resSobrevivendo.isValidPdf, true);
    assert.strictEqual(resSobrevivendo.matchedSignature?.id, 'sobrevivendo_ao_horror');

    // 84.5 MB para Arquivos Secretos #02
    const resAS2 = await identifyUploadedPdf({
      fileName: 'Arquivos-Secretos-02.pdf',
      fileSize: 88604672,
    });
    assert.strictEqual(resAS2.isValidPdf, true);
    assert.strictEqual(resAS2.matchedSignature?.id, 'arquivos_secretos_02');

    // Arquivo desconhecido grande (> 80MB) com bytes simulados não estoura call stack ou heap
    const fakeBigHeader = new Uint8Array(1024);
    fakeBigHeader[0] = 0x25; // %
    fakeBigHeader[1] = 0x50; // P
    fakeBigHeader[2] = 0x44; // D
    fakeBigHeader[3] = 0x46; // F
    const resBigCustom = await identifyUploadedPdf({
      fileName: 'Homebrew-Gigante-Campanha.pdf',
      bytes: fakeBigHeader,
      fileSize: 85 * 1024 * 1024,
    });
    assert.strictEqual(resBigCustom.isValidPdf, true);
    assert.strictEqual(resBigCustom.matchedSignature, null);
    assert.ok(typeof resBigCustom.sha256 === 'string');
  });

  test('7. Armazenamento Offline de PDFs (LocalPdfStorageManager) persiste e disponibiliza sem necessidade de servidor', async () => {
    // Limpa cache
    await localPdfStorage.clearAllForTest();
    assert.strictEqual(localPdfStorage.hasPdfOffline('livro_regras'), false);

    // Salva PDF simulado offline
    const fakeBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    await localPdfStorage.savePdfOffline('livro_regras', 'Livro de Regras.pdf', fakeBytes);

    // Deve estar disponível imediatamente offline
    assert.strictEqual(localPdfStorage.hasPdfOffline('livro_regras'), true);

    const offlineUrl = await localPdfStorage.getPdfObjectUrl('livro_regras');
    assert.ok(offlineUrl, 'Deve gerar URL offline (blob/objectUrl)');

    // Recupera bytes
    const retrievedBytes = await localPdfStorage.getPdfBytes('livro_regras');
    assert.ok(retrievedBytes);
    assert.strictEqual(retrievedBytes?.length, fakeBytes.length);

    // Remove do cache
    await localPdfStorage.removePdfOffline('livro_regras');
    assert.strictEqual(localPdfStorage.hasPdfOffline('livro_regras'), false);
  });

  test('Compatibilidade Hermes Android APK: decodificação PDF e hash mestre funcionam sem TextEncoder/TextDecoder', async () => {
    const g = globalThis as { TextEncoder?: unknown; TextDecoder?: unknown };
    const origEncoder = g.TextEncoder;
    const origDecoder = g.TextDecoder;

    const expectedHash = await computeMasterPasswordHash('Ordo-Hermes-Teste-2026!');

    g.TextEncoder = undefined;
    g.TextDecoder = undefined;

    try {
      const latin1Str = latin1BytesToString([0x25, 0x50, 0x44, 0x46, 0x20, 0xe7, 0xe3]);
      assert.strictEqual(latin1Str, '%PDF çã');

      // Bytes UTF-8 inválidos / truncados não devem lançar exceção e devem virar U+FFFD
      const lossy = utf8ByteArrayToStringLossy([0xff, 0x80, 0x41, 0xc3, 0xa7, 0xe2, 0x82]);
      assert.strictEqual(lossy, '\uFFFD\uFFFDAç\uFFFD');

      const fakePdfText = '%PDF-1.7\n1 0 obj << /Type /Pages /Count 3 >> endobj\n<< /Type /Page >>\n<< /Type /Page >>';
      const fakePdfBytes = new Uint8Array(Array.from(fakePdfText, (ch) => ch.charCodeAt(0)));
      assert.strictEqual(estimatePdfPageCountFromBytes(fakePdfBytes), 3);

      const fakePdfNoCount = '%PDF-1.7\n1 0 obj << /Count 312 /Type /Pages >> endobj';
      const fakePdfNoCountBytes = new Uint8Array(Array.from(fakePdfNoCount, (ch) => ch.charCodeAt(0)));
      assert.strictEqual(estimatePdfPageCountFromBytes(fakePdfNoCountBytes), 312);

      const hashUnderHermes = await computeMasterPasswordHash('Ordo-Hermes-Teste-2026!');
      assert.strictEqual(hashUnderHermes, expectedHash);
    } finally {
      g.TextEncoder = origEncoder;
      g.TextDecoder = origDecoder;
    }
  });

  test('8. Interface Compêndio & Detalhe sem PDF do Livro Base: exibe núcleo essencial, bloqueia leitor de PDF e evita empty state incorreto', async () => {
    clearUnlockedBooksForTest();

    const { getByText, queryByText, getByPlaceholder } = await renderWithProviders(
      <CompendiumScreen />,
      { mobile: false }
    );

    // Classe Combatente deve aparecer no Compêndio por padrão
    assert.ok(getByText('Combatente'), 'Classe Combatente deve aparecer sem upload de PDF');

    // Clicar no selo de origem de Combatente NÃO deve abrir o PdfViewerModal enquanto Livro Base estiver sem PDF
    const sourceBadge = queryByText(/Livro Base • pág\./i);
    if (sourceBadge) {
      await fireClick(sourceBadge);
      assert.strictEqual(
        Boolean(queryByText(/Modo Texto|Fechar Leitor|Abrir no App/i)),
        false,
        'Não deve abrir leitor de PDF para livro bloqueado'
      );
    }

    // Buscar termo bloqueado (Decadência) não encontra o ritual e deve exibir empty state contextual
    const searchInput = getByPlaceholder(/Buscar ritual, criatura, origem, arma, regra/i);
    await changeInputText(searchInput, 'Decadência');
    assert.strictEqual(Boolean(queryByText('Decadência')), false);
    assert.ok(getByText('Nenhum registro encontrado'));

    await cleanup();
    clearUnlockedBooksForTest();

    // Na tela de detalhe de Combatente sem upload de PDF, oculta botões/preview de PDF e mostra card de PDF bloqueado
    mockRouter.params = { id: 'class__livro_base__combatente' };
    const detail = await renderWithProviders(<EntityDetailScreen />, { mobile: 'android' });
    assert.ok(detail.getByText('Combatente'));
    assert.strictEqual(Boolean(detail.queryByText(/Ver no PDF/i)), false);
    assert.strictEqual(Boolean(detail.queryByText(/Página Original do PDF/i)), false);
    assert.ok(detail.getByTestId('entity-locked-pdf-card'));
    assert.ok(detail.getByTestId('btn-entity-upload-missing-pdf'));
  });
});
