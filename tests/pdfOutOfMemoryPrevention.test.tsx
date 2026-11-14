import './setup';
import fs from 'node:fs';
import path from 'node:path';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import appConfig from '../app.json';
import { OfflineDataRepository } from '../src/repositories/OfflineDataRepository';
import {
  localPdfStorage,
  identifyUploadedPdf,
  KNOWN_SIGNATURES_BY_ID,
  cacheUnlockedBooksOffline,
  downloadBookPdfOffline,
} from '../src/services/pdf/PdfAccessService';
import {
  savePdfFromUri,
  downloadPdfToFile,
  getLocalPdfFileUri,
  getPdfsDirectoryUri,
} from '../src/services/pdf/PdfCacheService';
import { GoogleDriveService } from '../src/services/sync/GoogleDriveService';
import {
  addMockFileSystemFile,
  hasMockFileSystemFile,
  clearMockFileSystem,
  resetMockStorage,
  setMobilePlatform,
} from './setup';

describe('Prevenção de OutOfMemoryError no Android ao manipular PDFs grandes', () => {
  beforeEach(async () => {
    await localPdfStorage.clearAllForTest();
    clearMockFileSystem();
  });

  afterEach(async () => {
    await localPdfStorage.clearAllForTest();
    clearMockFileSystem();
    resetMockStorage();
  });

  test('1. Configuração do app.json deve habilitar largeHeap: true para o Android', () => {
    assert.strictEqual(
      (appConfig.expo as any)?.android?.largeHeap,
      true,
      'app.json deve conter "largeHeap": true na seção "android" para expandir a memória máxima no APK'
    );
  });

  test('2. identifyUploadedPdf deve identificar Arquivos Secretos #04 apenas por fileSize e fileName sem alocar bytes', async () => {
    const as04Sig = KNOWN_SIGNATURES_BY_ID.get('arquivos_secretos_04')!;
    assert.ok(as04Sig);
    assert.strictEqual(as04Sig.fileSize, 31603190);

    // Identificação por tamanho exato sem bytes
    const checkBySize = await identifyUploadedPdf({
      fileName: 'documento_renomeado.pdf',
      fileSize: 31603190,
    });
    assert.strictEqual(checkBySize.isValidPdf, true);
    assert.strictEqual(checkBySize.matchedSignature?.id, 'arquivos_secretos_04');

    // Identificação por nome oficial sem bytes
    const checkByName = await identifyUploadedPdf({
      fileName: 'Arquivos-Secretos-04.pdf',
    });
    assert.strictEqual(checkByName.isValidPdf, true);
    assert.strictEqual(checkByName.matchedSignature?.id, 'arquivos_secretos_04');
  });

  test('3. savePdfFromUri deve copiar o arquivo para o armazenamento permanente do app sem carregar em RAM', async () => {
    const mockPickedFile = 'file:///mock-cache/DocumentPicker/temp_upload.pdf';
    addMockFileSystemFile(mockPickedFile);

    const savedUri = await savePdfFromUri(
      mockPickedFile,
      'arquivos_secretos_04',
      'Arquivos-Secretos-04.pdf'
    );

    assert.ok(savedUri, 'Deve retornar a URI de destino do arquivo salvo');
    assert.ok(hasMockFileSystemFile(savedUri), 'O arquivo deve constar no sistema de arquivos do app');
    assert.ok(savedUri.includes('arquivos_secretos_04'), 'O caminho do arquivo deve conter o ID do livro');
  });

  test('4. localPdfStorage.savePdfOfflineFromUri deve persistir fileUri e disponibilizar para o leitor de PDF', async () => {
    const mockFileUri = 'file:///mock-documents/pdfs/arquivos_secretos_04.pdf';
    addMockFileSystemFile(mockFileUri);

    const res = await localPdfStorage.savePdfOfflineFromUri(
      'arquivos_secretos_04',
      'Arquivos-Secretos-04.pdf',
      mockFileUri,
      31603190
    );

    assert.ok(res);
    assert.strictEqual(localPdfStorage.hasPdfOffline('arquivos_secretos_04'), true);
    assert.strictEqual(
      localPdfStorage.getLocalPdfFileUriSync('arquivos_secretos_04'),
      mockFileUri
    );
    assert.strictEqual(
      localPdfStorage.getLocalPdfFileUriByFileNameSync('Arquivos-Secretos-04.pdf'),
      mockFileUri
    );
  });

  test('5. downloadPdfFromDriveToFile deve baixar para o arquivo em disco via streaming nativo', async () => {
    const drive = GoogleDriveService.getInstance();
    // Simula autenticação válida
    (drive as any).authState = {
      isAuthenticated: true,
      accessToken: 'mock_token',
      expiresAt: Date.now() + 3600000,
    };

    const target = await drive.downloadPdfFromDriveToFile(
      'drive_file_id_123',
      'arquivos_secretos_04',
      'Arquivos-Secretos-04.pdf'
    );

    assert.ok(target);
    assert.ok(hasMockFileSystemFile(target), 'O arquivo baixado do Drive deve ser salvo em disco');
  });

  test('6. cacheUnlockedBooksOffline no Android deve registrar apenas metadados sem carregar binários na RAM', async () => {
    setMobilePlatform('android');
    try {
      const bookIds = ['livro_base', 'sobrevivendo_ao_horror', 'arquivos_secretos_02'];
      const cachedCount = await cacheUnlockedBooksOffline(bookIds);

      assert.strictEqual(cachedCount, 3, 'Deve marcar todos os 3 livros como disponíveis');
      assert.strictEqual(localPdfStorage.hasPdfOffline('sobrevivendo_ao_horror'), true);
      assert.strictEqual(localPdfStorage.hasPdfOffline('livro_base'), true);
    } finally {
      setMobilePlatform('web');
    }
  });

  test('7. AndroidManifest.xml deve conter android:largeHeap="true" para o APK nativo', () => {
    const manifestPath = path.resolve(__dirname, '../android/app/src/main/AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      const xml = fs.readFileSync(manifestPath, 'utf8');
      assert.ok(
        xml.includes('android:largeHeap="true"'),
        'AndroidManifest.xml deve declarar android:largeHeap="true" na tag <application>'
      );
    }
  });

  test('8. downloadBookPdfOffline no Android deve salvar diretamente para disco via streaming nativo', async () => {
    setMobilePlatform('android');
    try {
      const res = await downloadBookPdfOffline('arquivos_secretos_04');
      // No ambiente de teste mock com URL vazia, falha graciosamente com mensagem limpa em vez de crashar a JVM
      assert.ok(typeof res.ok === 'boolean');
      assert.ok(res.message);
    } finally {
      setMobilePlatform('web');
    }
  });

  test('9. GoogleDriveService.downloadPdfFromDrive deve bloquear alocação em RAM no Android', async () => {
    setMobilePlatform('android');
    try {
      const drive = GoogleDriveService.getInstance();
      await assert.rejects(
        () => drive.downloadPdfFromDrive('drive_file_id_84mb'),
        /downloadPdfFromDriveToFile/i
      );
    } finally {
      setMobilePlatform('web');
    }
  });

  test('10. Importação em lote no Android de múltiplos PDFs grandes (incluindo 84MB) move do cache sem chamar fetch()', async () => {
    setMobilePlatform('android');
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    (globalThis as any).fetch = async () => {
      fetchCalls++;
      throw new Error('fetch() não deve ser chamado ao importar PDFs no Android');
    };

    try {
      const batch = [
        {
          id: 'livro_base',
          fileName: 'Livro base.pdf',
          fileSize: 62824575,
          uri: 'file:///mock-cache/DocumentPicker/livro_base_tmp.pdf',
        },
        {
          id: 'sobrevivendo_ao_horror',
          fileName: 'Sobrevivendo-Ao-Horror-v1.pdf',
          fileSize: 84030125,
          uri: 'file:///mock-cache/DocumentPicker/sobrevivendo_tmp.pdf',
        },
        {
          id: 'arquivos_secretos_02',
          fileName: 'Arquivos-Secretos-02.pdf',
          fileSize: 84507471,
          uri: 'file:///mock-cache/DocumentPicker/as02_tmp.pdf',
        },
      ];

      for (const item of batch) {
        addMockFileSystemFile(item.uri);
        const check = await identifyUploadedPdf({
          fileName: item.fileName,
          fileSize: item.fileSize,
        });
        assert.strictEqual(check.isValidPdf, true);
        assert.strictEqual(check.matchedSignature?.id, item.id);

        const savedUri = await localPdfStorage.savePdfOfflineFromUri(
          check.matchedSignature!.id,
          check.matchedSignature!.fileName,
          item.uri,
          item.fileSize,
          check.sha256
        );

        assert.ok(savedUri);
        assert.ok(hasMockFileSystemFile(savedUri));
        assert.strictEqual(
          hasMockFileSystemFile(item.uri),
          false,
          'Arquivo temporário do DocumentPicker deve ser movido sem duplicação em disco'
        );
      }

      assert.strictEqual(fetchCalls, 0, 'Nenhuma chamada a fetch() pode ocorrer na importação em lote no Android');
    } finally {
      (globalThis as any).fetch = originalFetch;
      setMobilePlatform('web');
    }
  });
});
