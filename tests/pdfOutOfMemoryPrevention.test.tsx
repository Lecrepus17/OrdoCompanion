import './setup';
import test, { describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import appConfig from '../app.json';
import { OfflineDataRepository } from '../src/repositories/OfflineDataRepository';
import {
  localPdfStorage,
  identifyUploadedPdf,
  KNOWN_SIGNATURES_BY_ID,
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
});
