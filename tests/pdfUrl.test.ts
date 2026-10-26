import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getServerBaseUrl,
  getCleanPdfUrl,
  getRawPdfUrl,
  getRenderedPdfPageUrl,
  openPdfDocument,
  downloadPdfDocument,
  isPdfServerConfigured,
  getCustomPdfServerUrl,
  setCustomPdfServerUrl,
  testPdfServerConnection,
  normalizeServerUrl,
} from '../src/utils/pdfUrl';

describe('Utilitários de URLs e Páginas PDF (pdfUrl.ts)', () => {
  it('getServerBaseUrl deve retornar uma URL base válida ou string vazia (em ambiente web)', () => {
    const url = getServerBaseUrl();
    assert.ok(typeof url === 'string');
    if (url.length > 0) {
      assert.ok(url.startsWith('http://') || url.startsWith('https://'));
    }
  });

  describe('isPdfServerConfigured', () => {
    it('deve retornar booleano informando se o servidor está configurado', () => {
      const configured = isPdfServerConfigured();
      assert.strictEqual(typeof configured, 'boolean');
    });
  });

  describe('normalizeServerUrl', () => {
    it('deve adicionar prefixo http:// caso o usuário informe apenas IP e porta', () => {
      assert.strictEqual(normalizeServerUrl('192.168.1.15:8081'), 'http://192.168.1.15:8081');
      assert.strictEqual(normalizeServerUrl('10.0.0.5:3000/'), 'http://10.0.0.5:3000');
    });

    it('deve preservar protocolos http:// e https:// já informados e remover barras finais', () => {
      assert.strictEqual(normalizeServerUrl('https://meu-servidor.com/'), 'https://meu-servidor.com');
      assert.strictEqual(normalizeServerUrl('http://localhost:8081///'), 'http://localhost:8081');
    });

    it('deve retornar string vazia para entradas vazias ou com apenas espaços', () => {
      assert.strictEqual(normalizeServerUrl(''), '');
      assert.strictEqual(normalizeServerUrl('   '), '');
    });
  });

  describe('Custom PDF Server URL', () => {
    it('deve permitir definir, obter e limpar URL customizada de servidor de PDF', async () => {
      assert.strictEqual(typeof getCustomPdfServerUrl(), 'string');
      await setCustomPdfServerUrl('http://192.168.1.100:8081/');
      assert.strictEqual(getCustomPdfServerUrl(), 'http://192.168.1.100:8081');
      assert.strictEqual(isPdfServerConfigured(), true);

      // Limpar
      await setCustomPdfServerUrl('');
      assert.strictEqual(getCustomPdfServerUrl(), '');
    });
  });

  describe('testPdfServerConnection', () => {
    it('deve retornar erro para URL vazia', async () => {
      const res = await testPdfServerConnection('');
      assert.strictEqual(res.ok, false);
      assert.ok(res.message.length > 0);
    });
  });

  describe('getCleanPdfUrl', () => {
    it('deve retornar a URL sem fragmento #page= para compatibilidade com celulares', () => {
      const url = getCleanPdfUrl('Livro base.pdf');
      assert.ok(url.includes('/pdfs/Livro%20base.pdf'));
      assert.ok(!url.includes('#page'));
    });
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

  describe('openPdfDocument', () => {
    it('deve ser uma função exportada assíncrona', () => {
      assert.strictEqual(typeof openPdfDocument, 'function');
    });

    it('não deve lançar exceção ao ser chamada', async () => {
      await assert.doesNotReject(async () => {
        await openPdfDocument('Livro base.pdf', 1);
      });
    });
  });

  describe('downloadPdfDocument', () => {
    it('deve ser uma função exportada assíncrona', () => {
      assert.strictEqual(typeof downloadPdfDocument, 'function');
    });

    it('não deve lançar exceção ao solicitar download direto', async () => {
      await assert.doesNotReject(async () => {
        await downloadPdfDocument('Livro base.pdf');
      });
    });
  });
});
