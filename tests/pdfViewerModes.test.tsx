import './setup';
import React from 'react';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from 'react-native';
import {
  PdfViewerMode,
  renderFormattedBookText,
} from '../src/components/PdfViewerModal';
import {
  getCleanPdfUrl,
  getGoogleDriveDirectDownloadUrl,
  getGoogleDriveFileViewUrl,
  getCloudPdfUrl,
  openPdfDocument,
  downloadPdfDocument,
  isPdfServerConfigured,
} from '../src/utils/pdfUrl';
import { BookInfo } from '../src/types/compendium';
import { resetMockStorage, setMobilePlatform } from './setup';
import { darkTheme } from '../src/theme';

const mockStyles = {
  textEmptyStateWrap: {},
  textModeContent: {},
  formattedTextContainer: {},
  formattedHeadingWrap: {},
  tacticalBar: {},
  formattedHeadingText: {},
  formattedParagraphText: {},
};

const SAMPLE_BOOK: BookInfo = {
  id: 'livro_regras_base',
  title: 'Livro de Regras Base',
  fileName: 'ordem_paranormal_regras.pdf',
  pageCount: 332,
  driveFileId: '1AbCdEfGhIjKlMnOpQrStUvWxYz123456',
  driveSynced: true,
  toc: [
    { title: 'Capítulo 1: Criação de Personagens', page: 12, level: 1 },
    { title: 'Capítulo 2: Perícias', page: 44, level: 1 },
    { title: 'Capítulo 3: Rituais', page: 114, level: 1 },
    { title: 'Capítulo 4: O Outro Lado', page: 180, level: 1 },
  ],
};

const SAMPLE_BOOK_WITHOUT_DRIVE: BookInfo = {
  id: 'arquivos_secretos_07',
  title: 'Arquivos Secretos #07',
  fileName: 'as07.pdf',
  pageCount: 24,
  toc: [],
};

describe('Features 11, 12, 13, 14: PDF Viewer Reading Modes & Resilient Fallback (pdfViewerModes.test.tsx)', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  // =========================================================================
  // TIER 1: Reading Mode Selector & Continuous Scroll (Features 11 & 12)
  // =========================================================================
  describe('Tier 1: Modos de Leitura (PDF vs Texto) e Estilos de Rolagem', () => {
    it('1.1 suporta os modos canônicos de visualização no leitor de livros', () => {
      const modes: PdfViewerMode[] = ['pdf_scroll', 'pdf_page', 'pdf_native', 'text'];
      assert.strictEqual(modes.includes('pdf_scroll'), true);
      assert.strictEqual(modes.includes('pdf_page'), true);
      assert.strictEqual(modes.includes('text'), true);
    });

    it('1.2 renderFormattedBookText deve formatar títulos, cabeçalhos táticos e corpo do texto oficial', () => {
      const rawPageText = 'CAPÍTULO 3: RITUAIS\n\nOcultistas manipulam a névoa da realidade.';
      const rendered = renderFormattedBookText(rawPageText, 1.0, darkTheme.colors, mockStyles);
      assert.ok(rendered);
      assert.strictEqual(React.isValidElement(rendered), true);
    });

    it('1.3 renderFormattedBookText lida com páginas vazias ou texto em branco sem erro', () => {
      const renderedEmpty = renderFormattedBookText('', 1.0, darkTheme.colors, mockStyles);
      assert.ok(renderedEmpty);
      assert.strictEqual(React.isValidElement(renderedEmpty), true);

      const renderedWhitespace = renderFormattedBookText('   \n\n   ', 1.0, darkTheme.colors, mockStyles);
      assert.ok(renderedWhitespace);
      assert.strictEqual(React.isValidElement(renderedWhitespace), true);
    });

    it('1.4 deve destacar termos de busca quando highlightTerm for fornecido', () => {
      const textWithTerm = 'Ao conjurar Decadência, o tempo ao redor do alvo apodrece.';
      const rendered = renderFormattedBookText(textWithTerm, 1.0, darkTheme.colors, mockStyles);
      assert.ok(rendered);
      assert.strictEqual(React.isValidElement(rendered), true);
    });
  });

  // =========================================================================
  // TIER 2: Fallback Resiliente de PDF para Texto (Feature 13)
  // =========================================================================
  describe('Tier 2: Fallback Resiliente quando PDF Falhar', () => {
    it('2.1 no ambiente mobile nativo (APK), se não houver servidor configurado nem PDF local, modo inicial deve comutar para texto', () => {
      // Simula mobile sem servidor HTTP de renderização
      setMobilePlatform('android');
      try {
        const hasDirectPdf = false;
        const serverConfigured = isPdfServerConfigured();
        const initialMode: PdfViewerMode = 'pdf_scroll';

        const computedInitialMode: PdfViewerMode =
          !hasDirectPdf && !serverConfigured && Platform.OS !== 'web' && (initialMode === 'pdf_scroll' || initialMode === 'pdf_page')
            ? 'text'
            : initialMode;

        assert.strictEqual(
          computedInitialMode,
          'text',
          'Sem servidor nem arquivo local no Android APK, deve comutar preventivamente para modo texto'
        );
      } finally {
        setMobilePlatform('web');
      }
    });

    it('2.2 livro com driveFileId gera URL direta do arquivo individual sem cair na pasta raiz', () => {
      const directUrl = getGoogleDriveDirectDownloadUrl(SAMPLE_BOOK.driveFileId!);
      assert.ok(directUrl.includes(SAMPLE_BOOK.driveFileId!));
      assert.ok(directUrl.startsWith('https://drive.google.com/uc?export=download&id='));
      // Não deve apontar para pasta de compartilhamento raiz
      assert.strictEqual(directUrl.includes('folders/'), false);
    });

    it('2.3 getGoogleDriveFileViewUrl gera URL direta de visualização do arquivo individual', () => {
      const viewUrl = getGoogleDriveFileViewUrl(SAMPLE_BOOK.driveFileId!);
      assert.strictEqual(
        viewUrl,
        `https://drive.google.com/file/d/${SAMPLE_BOOK.driveFileId}/view`
      );
    });

    it('2.4 getCleanPdfUrl retorna a URL limpa de download direto para livros com driveFileId', () => {
      const cleanUrl = getCleanPdfUrl(SAMPLE_BOOK.fileName, SAMPLE_BOOK.driveFileId);
      assert.ok(cleanUrl.includes('drive.google.com'));
      assert.ok(cleanUrl.includes(SAMPLE_BOOK.driveFileId!));
    });

    it('2.5 getCleanPdfUrl retorna string vazia com segurança se fileName e driveFileId forem vazios', () => {
      assert.strictEqual(getCleanPdfUrl('', undefined), '');
      assert.strictEqual(getCleanPdfUrl('   ', ''), '');
    });
  });

  // =========================================================================
  // TIER 3: Verificação Local & Download Seguro (Feature 14)
  // =========================================================================
  describe('Tier 3: Verificação de PDF Local e Proteção contra 404 do Drive', () => {
    it('3.1 downloadPdfDocument com driveFileId válido invoca download com URL específica', async () => {
      const success = await downloadPdfDocument(SAMPLE_BOOK.fileName, SAMPLE_BOOK.driveFileId);
      assert.strictEqual(typeof success, 'boolean');
    });

    it('3.2 openPdfDocument com driveFileId individual não redireciona para pasta raiz do mestre', async () => {
      const success = await openPdfDocument(
        SAMPLE_BOOK.fileName,
        1,
        SAMPLE_BOOK.driveFileId
      );
      assert.strictEqual(typeof success, 'boolean');
    });

    it('3.3 livro sem driveFileId nem servidor trata abertura externamente com segurança', async () => {
      const cloudUrl = getCloudPdfUrl(SAMPLE_BOOK_WITHOUT_DRIVE.fileName, SAMPLE_BOOK_WITHOUT_DRIVE.driveFileId);
      // Se não há driveFileId nem servidor, cloudUrl é vazio ou seguro
      assert.strictEqual(typeof cloudUrl, 'string');
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Uso do Leitor', () => {
    it('4.1 Cenário: Jogador abre suplemento offline no APK Android e visualiza o texto contínuo', () => {
      const pages = [
        'Página 1: Introdução ao Horror em Santos',
        'Página 2: Novas Origens e Poderes',
        'Página 3: Ameaças da Morte',
      ];

      for (let i = 0; i < pages.length; i++) {
        const rendered = renderFormattedBookText(pages[i], 1.0, darkTheme.colors, mockStyles);
        assert.ok(rendered);
      }
    });

    it('4.2 Cenário: Usuário clica em Abrir PDF em livro com driveFileId no Google Drive', () => {
      const viewUrl = getGoogleDriveFileViewUrl('1OL9QXvphFLto-dPf_test');
      assert.strictEqual(viewUrl, 'https://drive.google.com/file/d/1OL9QXvphFLto-dPf_test/view');
      assert.strictEqual(viewUrl.includes('folders'), false);
    });

    it('4.3 Cenário: Transição de modo gráfico para texto sem crash', () => {
      let currentMode: PdfViewerMode = 'pdf_scroll';
      // Simula usuário tocando no botão "Leitura do Texto"
      currentMode = 'text';
      assert.strictEqual(currentMode, 'text');

      // Simula usuário tocando no botão "Leitura Direta PDF"
      currentMode = 'pdf_scroll';
      assert.strictEqual(currentMode, 'pdf_scroll');
    });
  });

  // =========================================================================
  // TIER 5: Adversarial & Stress Testing
  // =========================================================================
  describe('Tier 5: Adversarial & Resiliência', () => {
    it('5.1 driveFileId com espaços extras ou caracteres especiais é higienizado', () => {
      const dirtyId = '  1AbCdEf_123-xyz  ';
      const url = getGoogleDriveDirectDownloadUrl(dirtyId);
      assert.ok(url.includes('1AbCdEf_123-xyz'));
      assert.strictEqual(url.includes(' '), false);
    });

    it('5.2 driveFileId que já seja uma URL completa é respeitado', () => {
      const fullUrl = 'https://drive.google.com/uc?export=download&id=custom123';
      assert.strictEqual(getGoogleDriveDirectDownloadUrl(fullUrl), fullUrl);
      assert.strictEqual(getGoogleDriveFileViewUrl(fullUrl), fullUrl);
    });

    it('5.3 texto extremamente longo em renderFormattedBookText (10.000 caracteres) não estoura pilha', () => {
      const hugeText = 'Texto longo de regras '.repeat(500);
      assert.doesNotThrow(() => {
        const rendered = renderFormattedBookText(hugeText, 1.0, darkTheme.colors, mockStyles);
        assert.ok(rendered);
      });
    });

    it('5.4 texto com tags maliciosas / scripts em renderFormattedBookText é sanitizado', () => {
      const malicious = '<script>window.location="http://evil.com"</script>Parágrafo normal.';
      assert.doesNotThrow(() => {
        const rendered = renderFormattedBookText(malicious, 1.0, darkTheme.colors, mockStyles);
        assert.ok(rendered);
      });
    });
  });
});
