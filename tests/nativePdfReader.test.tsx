import './setup';
import React, { act } from 'react';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { Platform, BackHandler } from 'react-native';
import {
  setMobilePlatform,
  resetMockStorage,
  addMockFileSystemFile,
  clearMockFileSystem,
  mockAlertCalls,
  clearMockAlerts,
  mockShareCalls,
  clearMockShareCalls,
  mockContentUriCalls,
  setMockContentUriThrows,
  clearMockContentUriCalls,
} from './setup';
import {
  renderWithProviders,
  cleanup,
  fireClick,
  changeInputText,
} from './frontendTestUtils';
import { PdfViewerModal } from '../src/components/PdfViewerModal';
import * as NodePdfReaderModule from '../src/components/pdf/NativePdfReader';
import * as WebPdfReaderModule from '../src/components/pdf/NativePdfReader.web';
import * as NativePdfReaderModule from '../src/components/pdf/NativePdfReader.native';
import {
  resolveNativePdfUri,
  normalizeFileUri,
  isLocalPdfUri,
} from '../src/utils/nativePdfSource';
import { localPdfStorage } from '../src/services/pdf/PdfAccessService';
import { BookInfo } from '../src/types/compendium';

const SAMPLE_BOOK: BookInfo = {
  id: 'livro_teste_nativo',
  title: 'Livro de Regras Teste',
  fileName: 'livro_teste_nativo.pdf',
  pageCount: 30,
  pdfUrl: 'file:///mock-documents/pdfs/livro_teste_nativo.pdf',
  toc: [
    { title: 'Capítulo 1: Agentes', page: 5, level: 1 },
    { title: 'Capítulo 3: Rituais', page: 42, level: 1 },
  ],
};

function getPageInput(): HTMLInputElement {
  const input = document.body.querySelector('input') as HTMLInputElement | null;
  if (!input) {
    throw new Error('Page input element not found in document.body');
  }
  return input;
}

async function submitPageInput(input: HTMLInputElement, value: string): Promise<void> {
  await changeInputText(input, value);
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
    );
    const FocusEventCtor = (globalThis as any).FocusEvent || (globalThis as any).window?.FocusEvent;
    if (FocusEventCtor) {
      input.dispatchEvent(new FocusEventCtor('focusout', { bubbles: true }));
    }
    input.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 25));
  });
}

describe('NativePdfReader & Offline Mobile PDF Viewer Suite', () => {
  beforeEach(async () => {
    resetMockStorage();
    clearMockFileSystem();
    clearMockAlerts();
    clearMockShareCalls();
    clearMockContentUriCalls();
    await cleanup();
    NodePdfReaderModule.resetNativePdfReaderAvailableForTest();
    NativePdfReaderModule.resetNativePdfReaderAvailableForTest();
  });

  afterEach(async () => {
    await cleanup();
    NodePdfReaderModule.resetNativePdfReaderAvailableForTest();
    NativePdfReaderModule.resetNativePdfReaderAvailableForTest();
    setMockContentUriThrows(false);
    clearMockFileSystem();
    clearMockAlerts();
  });

  describe('1. Local PDF URI Resolution (resolveNativePdfUri & helpers)', () => {
    it('resolves file:// URI when localPdfStorage or disk has the PDF and returns null when missing', async () => {
      assert.equal(await resolveNativePdfUri(null), null);
      assert.equal(await resolveNativePdfUri(undefined), null);

      const missingBook: BookInfo = {
        id: 'livro_ausente',
        title: 'Ausente',
        fileName: 'ausente.pdf',
        pageCount: 20,
        toc: [],
      };
      assert.equal(await resolveNativePdfUri(missingBook), null);

      const targetUri = 'file:///mock-documents/pdfs/livro_base.pdf';
      addMockFileSystemFile(targetUri);
      await localPdfStorage.savePdfOfflineFromUri(
        'livro_base',
        'Livro base.pdf',
        targetUri,
        1000
      );

      const storedBook: BookInfo = {
        id: 'livro_base',
        title: 'Livro Base',
        fileName: 'Livro base.pdf',
        pageCount: 332,
        toc: [],
      };
      const resolved = await resolveNativePdfUri(storedBook);
      assert.equal(resolved, targetUri);
    });

    it('normalizes local paths and rejects remote or base64 data URIs', () => {
      assert.equal(normalizeFileUri('/storage/emulated/0/Download/book.pdf'), 'file:///storage/emulated/0/Download/book.pdf');
      assert.equal(normalizeFileUri('file:///data/user/0/book.pdf'), 'file:///data/user/0/book.pdf');
      assert.equal(normalizeFileUri('https://example.com/book.pdf'), '');
      assert.equal(normalizeFileUri('data:application/pdf;base64,JVBERi0='), '');

      assert.equal(isLocalPdfUri('file:///storage/book.pdf'), true);
      assert.equal(isLocalPdfUri('https://example.com/book.pdf'), false);
      assert.equal(isLocalPdfUri('file:///storage/image.png'), false);
    });
  });

  describe('2. Mobile PDF Viewer Rendering & Mode Preservation', () => {
    it('renders NativePdfReader on mobile when local PDF exists and does not force text mode', async () => {
      NodePdfReaderModule.setNativePdfReaderAvailableForTest(true);
      addMockFileSystemFile(SAMPLE_BOOK.pdfUrl!);

      const { queryByTestId, queryByText } = await renderWithProviders(
        <PdfViewerModal
          visible={true}
          onClose={() => {}}
          book={SAMPLE_BOOK}
          initialPage={1}
          initialMode="pdf_scroll"
        />,
        { mobile: 'android' }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      assert.ok(queryByTestId('native-pdf-reader'), 'NativePdfReader must be rendered on mobile with local PDF');
      assert.ok(queryByText(/Página 1 de 100/i), 'Header must show page 1 of native total pages (100)');
    });

    it('falls back to text mode on mobile when local PDF does not exist and no server is configured', async () => {
      NodePdfReaderModule.setNativePdfReaderAvailableForTest(true);

      const bookWithoutFile: BookInfo = {
        id: 'livro_sem_pdf',
        title: 'Livro Sem PDF',
        fileName: 'inexistente.pdf',
        pageCount: 15,
        toc: [],
      };

      const { queryByTestId, queryByText } = await renderWithProviders(
        <PdfViewerModal
          visible={true}
          onClose={() => {}}
          book={bookWithoutFile}
          initialPage={1}
          initialMode="pdf_scroll"
        />,
        { mobile: 'android' }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      assert.equal(queryByTestId('native-pdf-reader'), null, 'NativePdfReader must not render when file is missing');
      assert.ok(queryByText(/Texto Oficial/i), 'Modal must fall back to text mode');
    });
  });

  describe('3. Error Handling & Android Scoped Storage External Fallback', () => {
    it('transitions to text mode on native reader error and converts file:// to content:// on Android share', async () => {
      NodePdfReaderModule.setNativePdfReaderAvailableForTest(true);

      const corruptedBook: BookInfo = {
        id: 'livro_corrompido',
        title: 'Livro Corrompido',
        fileName: 'corrupted_fail.pdf',
        pageCount: 20,
        pdfUrl: 'file:///mock-documents/pdfs/corrupted_fail.pdf',
        toc: [],
      };
      addMockFileSystemFile(corruptedBook.pdfUrl!);

      const { queryByTestId } = await renderWithProviders(
        <PdfViewerModal
          visible={true}
          onClose={() => {}}
          book={corruptedBook}
          initialPage={1}
          initialMode="pdf_scroll"
        />,
        { mobile: 'android' }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 120));
      });

      assert.equal(queryByTestId('native-pdf-reader'), null, 'NativePdfReader must unmount after error');
      assert.ok(
        mockAlertCalls.some((a) => a.title.includes('Falha na Leitura do PDF')),
        'Error dialog must be presented'
      );
      assert.ok(mockContentUriCalls.length > 0, 'getContentUriAsync must be called on Android');
      assert.ok(mockShareCalls.length > 0, 'Sharing.shareAsync must be called');
      assert.ok(mockShareCalls[0].url.startsWith('content://com.ordocompanion.fileprovider'));
    });
  });

  describe('4. Page Navigation, TOC, Deep Links ("Ver no Livro") & Annotations Lock', () => {
    it('updates header "Página X de N" via page input, TOC chips, and deep link initialPage', async () => {
      NodePdfReaderModule.setNativePdfReaderAvailableForTest(true);
      addMockFileSystemFile(SAMPLE_BOOK.pdfUrl!);

      const { queryByText, getByTestId } = await renderWithProviders(
        <PdfViewerModal
          visible={true}
          onClose={() => {}}
          book={SAMPLE_BOOK}
          initialPage={5}
          initialMode="pdf_scroll"
        />,
        { mobile: 'android' }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      assert.ok(queryByText(/Página 5 de 100/i), 'Header must reflect initialPage=5');

      const tocChip = queryByText(/Capítulo 3: Rituais \(42\)/i);
      assert.ok(tocChip);
      await fireClick(tocChip);
      assert.ok(queryByText(/Página 42 de 100/i), 'Header must update to page 42 on TOC click');

      const pageInput = getPageInput();
      await submitPageInput(pageInput, '12');
      assert.ok(queryByText(/Página 12 de 100/i), 'Header must update to page 12 on input submit');

      const annotationBtn = getByTestId('btn-toggle-annotations');
      const isDisabled =
        annotationBtn.getAttribute('aria-disabled') === 'true' ||
        annotationBtn.hasAttribute('disabled');
      assert.ok(isDisabled, 'Annotation button must be disabled in native mode');
    });

    it('switches smoothly between pdf_scroll, pdf_page, and text modes', async () => {
      NodePdfReaderModule.setNativePdfReaderAvailableForTest(true);
      addMockFileSystemFile(SAMPLE_BOOK.pdfUrl!);

      const { queryByTestId, getByText } = await renderWithProviders(
        <PdfViewerModal
          visible={true}
          onClose={() => {}}
          book={SAMPLE_BOOK}
          initialPage={1}
          initialMode="pdf_scroll"
        />,
        { mobile: 'android' }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      assert.ok(queryByTestId('native-pdf-reader'));

      await fireClick(getByText(/Página Única/i));
      assert.ok(queryByTestId('native-pdf-reader'), 'NativePdfReader stays mounted in pdf_page mode');

      await fireClick(getByText(/Texto Oficial/i));
      assert.equal(queryByTestId('native-pdf-reader'), null, 'NativePdfReader unmounts in text mode');

      await fireClick(getByText(/Leitura Direta PDF/i));
      assert.ok(queryByTestId('native-pdf-reader'), 'NativePdfReader remounts when returning to PDF mode');
    });
  });

  describe('5. Web Platform Isolation & Direct Disk Streaming Verification', () => {
    it('does not render NativePdfReader on Web platform and preserves zero native imports in web stub', async () => {
      setMobilePlatform('web');
      NodePdfReaderModule.setNativePdfReaderAvailableForTest(true);
      addMockFileSystemFile(SAMPLE_BOOK.pdfUrl!);

      const { queryByTestId } = await renderWithProviders(
        <PdfViewerModal
          visible={true}
          onClose={() => {}}
          book={SAMPLE_BOOK}
          initialPage={1}
          initialMode="pdf_scroll"
        />,
        { mobile: false }
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 60));
      });

      assert.equal(queryByTestId('native-pdf-reader'), null, 'Web platform must never mount NativePdfReader');
      assert.equal(WebPdfReaderModule.isNativePdfReaderAvailable, false);

      const webStubContent = fs.readFileSync(
        path.resolve(__dirname, '../src/components/pdf/NativePdfReader.web.tsx'),
        'utf-8'
      );
      assert.equal(/(import|require)\s*\(?['"]react-native-pdf['"]\)?/.test(webStubContent), false);

      const nativeContent = fs.readFileSync(
        path.resolve(__dirname, '../src/components/pdf/NativePdfReader.native.tsx'),
        'utf-8'
      );
      assert.ok(/cache:\s*false/.test(nativeContent), 'Native reader must stream directly from disk (cache: false)');
      assert.ok(
        /page=\{initialPageRef\.current\}/.test(nativeContent),
        'Native reader must pass initialPageRef.current to PdfComponent to prevent Android drawPdf() black screen on scroll'
      );
      assert.equal(
        /page=\{page\}/.test(nativeContent),
        false,
        'Native reader must not pass dynamic page prop directly to PdfComponent'
      );
    });

    it('preserves fileUri in markBookAvailableOffline and resolves multi-segment versioned filenames (livro-base-v1-3.pdf)', async () => {
      const targetUri = 'file:///mock-documents/pdfs/livro_base.pdf';
      addMockFileSystemFile(targetUri);
      await localPdfStorage.savePdfOfflineFromUri('livro_base', 'Livro base.pdf', targetUri, 1000);
      await localPdfStorage.markBookAvailableOffline('livro_base', 'Livro base.pdf', 1000);

      const compendiumBook: BookInfo = {
        id: 'livro_base',
        title: 'Livro Base',
        fileName: 'livro-base-v1-3.pdf',
        pageCount: 332,
        toc: [],
      };
      const resolved = await resolveNativePdfUri(compendiumBook);
      assert.equal(resolved, targetUri);
      assert.equal(
        localPdfStorage.getLocalPdfFileUriByFileNameSync('livro-base-v1-3.pdf'),
        targetUri
      );
    });
  });
});
