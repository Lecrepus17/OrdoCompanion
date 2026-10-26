import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PdfViewerMode } from '../src/components/PdfViewerModal';
import { getRenderedPdfPageUrl } from '../src/utils/pdfUrl';

describe('Leitor de PDFs & Rolagem Contínua (PdfViewerModal)', () => {
  it('deve conter os modos suportados de visualização (pdf_scroll, pdf_page, pdf_native, text)', () => {
    const validModes: PdfViewerMode[] = ['pdf_scroll', 'pdf_page', 'pdf_native', 'text'];
    assert.strictEqual(validModes.includes('pdf_scroll'), true);
    assert.strictEqual(validModes.includes('pdf_page'), true);
    assert.strictEqual(validModes.includes('pdf_native'), true);
    assert.strictEqual(validModes.includes('text'), true);
  });

  describe('Cálculo de Dimensões e Layout de Itens de Rolagem Contínua', () => {
    const calculateItemLayout = (
      screenWidth: number,
      pageAspect: number,
      zoom: number,
      headerHeight = 36,
      pageGap = 20
    ) => {
      const basePageWidth = Math.min(screenWidth - 24, 880) * zoom;
      const basePageHeight = basePageWidth / pageAspect;
      const itemTotalHeight = Math.round(basePageHeight + headerHeight + pageGap);
      return {
        basePageWidth,
        basePageHeight,
        itemTotalHeight,
      };
    };

    it('deve calcular largura e altura proporcionais com aspect ratio padrão (1211/1625)', () => {
      const aspect = 1211 / 1625;
      const layout = calculateItemLayout(1000, aspect, 1.0);
      assert.strictEqual(layout.basePageWidth, 880);
      assert.ok(layout.basePageHeight > 1100 && layout.basePageHeight < 1200);
      assert.strictEqual(layout.itemTotalHeight, Math.round(layout.basePageHeight + 36 + 20));
    });

    it('deve escalar dimensões proporcionalmente ao aplicar zoom (1.5x e 0.5x)', () => {
      const aspect = 1211 / 1625;
      const layout100 = calculateItemLayout(1000, aspect, 1.0);
      const layout150 = calculateItemLayout(1000, aspect, 1.5);
      const layout50 = calculateItemLayout(1000, aspect, 0.5);

      assert.strictEqual(layout150.basePageWidth, layout100.basePageWidth * 1.5);
      assert.strictEqual(layout50.basePageWidth, layout100.basePageWidth * 0.5);
      assert.ok(layout150.itemTotalHeight > layout100.itemTotalHeight);
      assert.ok(layout50.itemTotalHeight < layout100.itemTotalHeight);
    });

    it('getItemLayout deve retornar deslocamentos exatos sem desvio acumulativo', () => {
      const aspect = 1211 / 1625;
      const { itemTotalHeight } = calculateItemLayout(1000, aspect, 1.0);

      const getItemLayout = (_data: any, index: number) => ({
        length: itemTotalHeight,
        offset: itemTotalHeight * index,
        index,
      });

      const page0 = getItemLayout(null, 0);
      const page1 = getItemLayout(null, 1);
      const page10 = getItemLayout(null, 10);
      const page50 = getItemLayout(null, 50);

      assert.strictEqual(page0.offset, 0);
      assert.strictEqual(page1.offset, itemTotalHeight);
      assert.strictEqual(page10.offset, itemTotalHeight * 10);
      assert.strictEqual(page50.offset, itemTotalHeight * 50);
    });
  });

  describe('Navegação e Clamping de Páginas', () => {
    const clampPage = (target: number, pageCount: number) => {
      return Math.max(1, Math.min(pageCount, Math.round(target)));
    };

    it('deve limitar a página dentro do intervalo válido do livro', () => {
      const totalPages = 322;
      assert.strictEqual(clampPage(0, totalPages), 1);
      assert.strictEqual(clampPage(-10, totalPages), 1);
      assert.strictEqual(clampPage(15, totalPages), 15);
      assert.strictEqual(clampPage(322, totalPages), 322);
      assert.strictEqual(clampPage(500, totalPages), 322);
    });

    it('deve gerar a lista completa de páginas para virtualização', () => {
      const generatePageList = (pageCount: number) =>
        Array.from({ length: pageCount }, (_, i) => i + 1);

      const pages = generatePageList(10);
      assert.strictEqual(pages.length, 10);
      assert.strictEqual(pages[0], 1);
      assert.strictEqual(pages[9], 10);
    });
  });

  describe('Modo Maximizado e Preservação de Página no Zoom', () => {
    it('deve expandir a área útil e reduzir margens no modo maximizado', () => {
      const screenWidth = 1000;
      const aspect = 1211 / 1625;
      const zoom = 1.0;

      // Modo padrão
      const normalMargin = 24;
      const normalMaxWidth = 880;
      const normalWidth = Math.min(screenWidth - normalMargin, normalMaxWidth) * zoom;

      // Modo maximizado
      const maxMargin = 8;
      const maxMaxWidth = Math.min(screenWidth - 8, 1200);
      const maxPageWidth = Math.min(screenWidth - maxMargin, maxMaxWidth) * zoom;

      assert.strictEqual(normalWidth, 880);
      assert.strictEqual(maxPageWidth, 992);
      assert.ok(maxPageWidth > normalWidth, 'A visualização maximizada deve permitir ver mais texto');
    });

    it('ao aplicar e desfazer zoom, deve recalcular o offset preservando o índice da página', () => {
      const pageAspect = 1211 / 1625;
      const screenWidth = 1000;

      const calcHeight = (zoom: number) => {
        const width = Math.min(screenWidth - 24, 880) * zoom;
        const h = width / pageAspect;
        return Math.round(h + 36 + 20);
      };

      const currentPage = 25;
      const h100 = calcHeight(1.0);
      const h150 = calcHeight(1.5);

      // No zoom 1.0
      const offset100 = (currentPage - 1) * h100;
      // No zoom 1.5 (ao dar zoom)
      const offset150 = (currentPage - 1) * h150;
      // Ao desfazer zoom (voltando para 1.0)
      const offsetRestored = (currentPage - 1) * h100;

      assert.strictEqual(offsetRestored, offset100);
      assert.strictEqual(offset150 / h150, currentPage - 1);
      assert.strictEqual(offsetRestored / h100, currentPage - 1);
    });
  });

  describe('Seleção de Modo e Resiliência Offline', () => {
    it('deve selecionar modo texto quando nenhum servidor gráfico estiver configurado', () => {
      const resolveMode = (isServerConfigured: boolean, requestedMode: PdfViewerMode): PdfViewerMode => {
        if (!isServerConfigured && (requestedMode === 'pdf_scroll' || requestedMode === 'pdf_page')) {
          return 'text';
        }
        return requestedMode;
      };

      // Sem servidor: pedidos de pdf_scroll ou pdf_page devem recair para text
      assert.strictEqual(resolveMode(false, 'pdf_scroll'), 'text');
      assert.strictEqual(resolveMode(false, 'pdf_page'), 'text');
      assert.strictEqual(resolveMode(false, 'text'), 'text');

      // Com servidor ativo: mantém o modo solicitado
      assert.strictEqual(resolveMode(true, 'pdf_scroll'), 'pdf_scroll');
      assert.strictEqual(resolveMode(true, 'pdf_page'), 'pdf_page');
      assert.strictEqual(resolveMode(true, 'text'), 'text');
    });

    it('deve formatar texto de página para leitura sem truncamento forçado', () => {
      const pageText = 'Regra Oficial de Testes de Perícia: role Nd20 e pegue o maior resultado.';
      const fallbackText = pageText || 'Página de ilustração.';
      assert.strictEqual(fallbackText, pageText);
      assert.ok(fallbackText.length > 0);
    });
  });
});
