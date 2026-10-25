import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getServerBaseUrl, getRawPdfUrl, getRenderedPdfPageUrl } from '../src/utils/pdfUrl';

describe('Utilitários de URLs e Páginas PDF (pdfUrl.ts)', () => {
  it('getServerBaseUrl deve retornar uma URL base válida ou string vazia (em ambiente web)', () => {
    const url = getServerBaseUrl();
    assert.ok(typeof url === 'string');
    if (url.length > 0) {
      assert.ok(url.startsWith('http://'));
    }
  });

  describe('getRawPdfUrl', () => {
    it('deve codificar o nome do arquivo corretamente na URL', () => {
      const url = getRawPdfUrl('Livro Base - Ordem Paranormal.pdf');
      assert.ok(url.includes('/pdfs/Livro%20Base%20-%20Ordem%20Paranormal.pdf'));
    });

    it('deve adicionar fragmento de página quando pageNumber for maior que 0', () => {
      const url = getRawPdfUrl('livro_base.pdf', 42);
      assert.ok(url.endsWith('#page=42&view=FitH'));
    });

    it('não deve adicionar fragmento de página quando pageNumber for 0 ou omitido', () => {
      const url1 = getRawPdfUrl('livro_base.pdf');
      assert.ok(!url1.includes('#page'));

      const url2 = getRawPdfUrl('livro_base.pdf', 0);
      assert.ok(!url2.includes('#page'));
    });
  });

  describe('getRenderedPdfPageUrl', () => {
    it('deve construir o endpoint correto de renderização de página', () => {
      const url = getRenderedPdfPageUrl('arquivo_01.pdf', 5, 150);
      assert.ok(url.includes('/api/pdf-page?file=arquivo_01.pdf&page=5&dpi=150'));
    });

    it('deve garantir que o DPI seja limitado entre 72 e 260 (clamping)', () => {
      // Menor que o mínimo de 72 deve virar 72
      const urlLowDpi = getRenderedPdfPageUrl('arquivo.pdf', 1, 10);
      assert.ok(urlLowDpi.includes('&dpi=72'));

      // Maior que o máximo de 260 deve virar 260
      const urlHighDpi = getRenderedPdfPageUrl('arquivo.pdf', 1, 600);
      assert.ok(urlHighDpi.includes('&dpi=260'));

      // Valor intermediário deve ser arredondado e mantido
      const urlMidDpi = getRenderedPdfPageUrl('arquivo.pdf', 1, 150);
      assert.ok(urlMidDpi.includes('&dpi=150'));
    });

    it('deve garantir que o número da página seja no mínimo 1', () => {
      const urlZero = getRenderedPdfPageUrl('livro.pdf', 0);
      assert.ok(urlZero.includes('&page=1'));

      const urlNeg = getRenderedPdfPageUrl('livro.pdf', -5);
      assert.ok(urlNeg.includes('&page=1'));
    });
  });
});
