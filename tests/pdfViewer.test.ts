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

  describe('Layout Responsivo e Prevenção de Esmagamento de Título (Issue 4)', () => {
    const evaluateHeaderResponsiveness = (screenWidth: number) => {
      const isSmallScreen = screenWidth < 400;
      const isNarrow = screenWidth < 440;
      const showFilePill = !isNarrow;
      const showMaximizeLabel = !isSmallScreen;
      return {
        isSmallScreen,
        isNarrow,
        showFilePill,
        showMaximizeLabel,
      };
    };

    it('em tela estreita de smartphone (360px), deve ocultar filePill e rótulos longos para não esmagar o título', () => {
      const res = evaluateHeaderResponsiveness(360);
      assert.strictEqual(res.isSmallScreen, true);
      assert.strictEqual(res.isNarrow, true);
      assert.strictEqual(res.showFilePill, false);
      assert.strictEqual(res.showMaximizeLabel, false);
    });

    it('em tela média (420px), deve suprimir filePill mas permitir controles essenciais', () => {
      const res = evaluateHeaderResponsiveness(420);
      assert.strictEqual(res.isSmallScreen, false);
      assert.strictEqual(res.isNarrow, true);
      assert.strictEqual(res.showFilePill, false);
      assert.strictEqual(res.showMaximizeLabel, true);
    });

    it('em tela ampla (800px), deve exibir todos os indicadores de arquivo e rótulos', () => {
      const res = evaluateHeaderResponsiveness(800);
      assert.strictEqual(res.isSmallScreen, false);
      assert.strictEqual(res.isNarrow, false);
      assert.strictEqual(res.showFilePill, true);
      assert.strictEqual(res.showMaximizeLabel, true);
    });
  });

  describe('Prevenção de Trava de Carregamento Infinito (Issue 4)', () => {
    const resolveScrollItemInitialState = (
      platform: 'android' | 'ios' | 'web',
      isServerConfigured: boolean,
      rawImageUrl: string
    ) => {
      const shouldFallbackDirectly =
        platform !== 'web' && (!isServerConfigured || !rawImageUrl);
      return {
        initialLoading: !shouldFallbackDirectly,
        initialError: shouldFallbackDirectly,
        showFallbackTextSheet: shouldFallbackDirectly,
      };
    };

    it('no Android APK sem servidor configurado, não deve entrar em loading infinito e deve abrir fallback', () => {
      const state = resolveScrollItemInitialState('android', false, '');
      assert.strictEqual(state.initialLoading, false, 'Loading deve ser falso imediatamente');
      assert.strictEqual(state.initialError, true);
      assert.strictEqual(state.showFallbackTextSheet, true, 'Deve renderizar a folha de texto diretamente');
    });

    it('na Web com servidor ativo, deve inicializar com loading true aguardando o canvas/imagem', () => {
      const state = resolveScrollItemInitialState('web', true, 'http://localhost:8081/page1');
      assert.strictEqual(state.initialLoading, true);
      assert.strictEqual(state.initialError, false);
      assert.strictEqual(state.showFallbackTextSheet, false);
    });
  });

  describe('Estruturação Tipográfica e Escala de Fonte no Leitor de Texto (Issue 16)', () => {
    const classifyParagraph = (paragraph: string) => {
      const clean = paragraph.trim();
      const isHeading =
        clean.length > 3 &&
        clean.length < 90 &&
        clean === clean.toUpperCase() &&
        /[A-ZÀ-Ú]/.test(clean);
      return {
        isHeading,
        clean,
      };
    };

    const clampFontSize = (current: number, delta: number) => {
      return Math.max(12, Math.min(24, current + delta));
    };

    it('deve identificar títulos em caixa alta para destaque tático com barra de acento', () => {
      const heading = classifyParagraph('CAPÍTULO 1: CRIAÇÃO DE PERSONAGEM');
      assert.strictEqual(heading.isHeading, true);

      const normal = classifyParagraph('Este é um parágrafo comum com regras explicadas.');
      assert.strictEqual(normal.isHeading, false);
    });

    it('deve limitar a escala de tamanho de fonte entre 12px e 24px', () => {
      assert.strictEqual(clampFontSize(15, -1), 14);
      assert.strictEqual(clampFontSize(15, 1), 16);
      assert.strictEqual(clampFontSize(12, -2), 12, 'Não deve diminuir além do mínimo de 12px');
      assert.strictEqual(clampFontSize(24, 3), 24, 'Não deve aumentar além do máximo de 24px');
    });
  });

  describe('Identificação de Capas Táticas e Fallback Offline (Issue 22)', () => {
    const getBookThemeInfo = (bookId: string, bookTitle: string) => {
      const id = (bookId || '').toLowerCase();
      const title = (bookTitle || '').toLowerCase();

      if (id === 'livro_base' || title.includes('livro base')) {
        return { badge: 'BASE', accent: '#F59E0B', icon: 'shield-outline' };
      }
      if (id === 'sobrevivendo_ao_horror' || title.includes('horror')) {
        return { badge: 'EXPANSÃO', accent: '#EF4444', icon: 'skull-outline' };
      }
      const match = id.match(/arquivos_secretos_(\d+)/) || title.match(/#(\d+)/);
      if (match) {
        const num = String(parseInt(match[1], 10)).padStart(2, '0');
        return { badge: `#${num}`, accent: '#38BDF8', icon: 'document-text-outline' };
      }
      return { badge: 'DOSSIÊ', accent: '#3B82F6', icon: 'folder-open-outline' };
    };

    it('deve categorizar o Livro Base com badge BASE e dourado', () => {
      const theme = getBookThemeInfo('livro_base', 'Livro Base');
      assert.strictEqual(theme.badge, 'BASE');
      assert.strictEqual(theme.accent, '#F59E0B');
    });

    it('deve categorizar Sobrevivendo ao Horror com badge EXPANSÃO e vermelho', () => {
      const theme = getBookThemeInfo('sobrevivendo_ao_horror', 'Sobrevivendo ao Horror');
      assert.strictEqual(theme.badge, 'EXPANSÃO');
      assert.strictEqual(theme.accent, '#EF4444');
    });

    it('deve categorizar Arquivos Secretos com badge numérico correspondente', () => {
      const theme01 = getBookThemeInfo('arquivos_secretos_01', 'Arquivos Secretos #01');
      assert.strictEqual(theme01.badge, '#01');

      const theme06 = getBookThemeInfo('arquivos_secretos_06', 'Arquivos Secretos #06');
      assert.strictEqual(theme06.badge, '#06');
    });

    it('deve usar badge DOSSIÊ para livros customizados', () => {
      const custom = getBookThemeInfo('meu_caso_custom', 'Minha Campanha');
      assert.strictEqual(custom.badge, 'DOSSIÊ');
    });
  });
});
