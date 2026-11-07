import './setup';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateCardSvg } from '../src/services/cardImage/svgCardRenderer';
import { extractRecordCardData } from '../src/services/cardImage/cardDataExtractor';
import {
  generateLocalCardFile,
  formatRecordTextForSharing,
  normalizeRecordCardData,
} from '../src/services/cardImage/cardExportService';
import { resolveRecordTheme } from '../src/services/cardImage/themeRegistry';
import { CompendiumEntity } from '../src/types/compendium';
import { RecordCardData } from '../src/services/cardImage/types';

describe('Features 18, 19, 20: Card Generation Layout, Deduplication & Real Image Export (cardLayoutAlignment.test.ts)', () => {
  // =========================================================================
  // TIER 1: Features 18 & 19 (Vertical Alignment & Deduplication)
  // =========================================================================
  describe('Tier 1: Alinhamento de Subtítulo e Desduplicação de Texto', () => {
    it('1.1 Feature 18: generateCardSvg com subCategory presente não deve colidir com divisor de estatísticas', () => {
      const cardData: RecordCardData = {
        id: 'pod_armamento_pesado',
        name: 'Armamento Pesado',
        category: 'power',
        categoryLabel: 'Poder de Classe',
        subCategory: 'PODER DE COMBATENTE',
        element: 'Nenhum',
        bookTitle: 'Livro de Regras',
        stats: [{ label: 'PRÉ-REQUISITO', value: 'For 2' }],
        summary: 'Proficiência com armas pesadas.',
        description: 'Você recebe proficiência com armas pesadas de fogo e corpo a corpo.',
        tags: ['combatente', 'armas'],
      };

      const theme = resolveRecordTheme(cardData);
      const svg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });

      assert.ok(svg.includes('PODER DE COMBATENTE'));
      assert.ok(svg.includes('PRÉ-REQUISITO'));

      // Extrai coordenadas verticais y da subcategoria e da linha divisória
      const subcatMatch = svg.match(/<text\b[^>]*?\by="(\d+(?:\.\d+)?)"[^>]*>\s*PODER DE COMBATENTE/);
      const dividerMatch = svg.match(/<line[^>]*y1="(\d+(?:\.\d+)?)"[^>]*y2="(\d+(?:\.\d+)?)"/);

      assert.ok(subcatMatch, 'Subcategoria deve estar presente no SVG com coordenada y');
      assert.ok(dividerMatch, 'Linha divisória deve estar presente no SVG com coordenada y1/y2');

      const subcatY = parseFloat(subcatMatch![1]);
      const dividerY = parseFloat(dividerMatch![1]);

      // Subcategoria deve ter coordenada real de layout vertical (não valor truncado ou opacity="0.9")
      assert.ok(
        subcatY > 100,
        `Coordenada Y da subcategoria deve ser calculada na área do cabeçalho (obtido: ${subcatY})`
      );

      // A linha divisória DEVE estar abaixo do texto da subcategoria (com folga mínima de 12px)
      assert.ok(
        dividerY >= subcatY + 12,
        `Linha divisória (y=${dividerY}) colide com subtítulo (y=${subcatY}). Deveria estar pelo menos 12px abaixo.`
      );

      // A caixa de estatísticas DEVE iniciar abaixo da linha divisória
      const statsMatch = svg.match(/<g id="stats-grid">[\s\S]*?<rect\b[^>]*?\by="(\d+(?:\.\d+)?)"/);
      if (statsMatch) {
        const statsBoxY = parseFloat(statsMatch[1]);
        assert.ok(
          statsBoxY >= dividerY + 15,
          `Caixa de estatísticas (y=${statsBoxY}) deve estar abaixo da linha divisória (y=${dividerY})`
        );
      }
    });

    it('1.2 Feature 19: extractRecordCardData deve desduplicar quando summary for idêntico à description', () => {
      const entity: CompendiumEntity = {
        id: 'pod_armamento_pesado',
        name: 'Armamento Pesado',
        category: 'power',
        subCategory: 'Combatente',
        bookId: 'livro_base',
        bookTitle: 'Livro de Regras',
        pageNumber: 35,
        element: 'Nenhum',
        summary: 'Você recebe proficiência com armas pesadas.',
        description: 'Você recebe proficiência com armas pesadas.',
        tags: ['combatente'],
      };

      const extracted = extractRecordCardData(entity);

      // Quando o resumo é idêntico à descrição, não deve manter ambos para evitar texto repetido duas vezes
      const isDuplicated =
        extracted.summary &&
        extracted.description &&
        (extracted.summary.trim() === extracted.description.trim() ||
          extracted.description.trim().startsWith(extracted.summary.trim()));

      assert.strictEqual(
        !isDuplicated,
        true,
        'Não deve haver texto duplicado entre summary e description'
      );
    });

    it('1.3 extractRecordCardData deve manter summary se ele for realmente distinto e complementar à description', () => {
      const entity: CompendiumEntity = {
        id: 'rit_cicatrizacao',
        name: 'Cicatrização',
        category: 'ritual',
        subCategory: 'Ritual de Sangue',
        bookId: 'livro_base',
        bookTitle: 'Livro de Regras',
        pageNumber: 115,
        element: 'Sangue',
        summary: 'Cura ferimentos de um alvo tocado acelerando seu metabolismo.',
        description: 'Você toca um ser vivo e estimula sua regeneração celular ao custo de envelhecimento biológico.',
        tags: ['cura', 'sangue'],
      };

      const extracted = extractRecordCardData(entity);
      assert.ok(extracted.summary);
      assert.ok(extracted.description);
      assert.notStrictEqual(extracted.summary, extracted.description);
    });
  });

  // =========================================================================
  // TIER 2: Feature 20 (Exportação Real de Imagem PNG/SVG)
  // =========================================================================
  describe('Tier 2: Exportação Real de Imagem (PNG/SVG) sem Conversão Forçada para PDF', () => {
    it('2.1 exportação no formato SVG deve gerar mimeType image/svg+xml e extensão .svg', async () => {
      const cardData: RecordCardData = {
        id: 'rit_descarnar',
        name: 'Descarnar',
        category: 'ritual',
        categoryLabel: 'Ritual',
        subCategory: 'RITUAL DE MORTE',
        element: 'Morte',
        bookTitle: 'Livro de Regras',
        stats: [{ label: 'ALCANCE', value: 'Toque' }],
        summary: 'Causa dano contínuo de Morte e lacerações.',
        description: 'Lança tentáculos de lodo negro sobre a carne do alvo.',
        tags: ['morte'],
      };

      const theme = resolveRecordTheme(cardData);
      const rawSvg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });
      const exported = await generateLocalCardFile(cardData, theme, rawSvg, 'svg', 1080, 1350);

      assert.strictEqual(exported.mimeType, 'image/svg+xml', 'MIME type de SVG deve ser image/svg+xml');
      assert.ok(exported.fileName.endsWith('.svg'), `Nome do arquivo deve terminar com .svg: ${exported.fileName}`);
    });

    it('2.2 exportação no formato PNG não deve despachar arquivo com extensão .pdf ou mime application/pdf', async () => {
      const cardData: RecordCardData = {
        id: 'rit_odio',
        name: 'Ódio Incontrolável',
        category: 'ritual',
        categoryLabel: 'Ritual',
        subCategory: 'RITUAL DE SANGUE',
        element: 'Sangue',
        bookTitle: 'Livro de Regras',
        stats: [{ label: 'ALCANCE', value: 'Curto' }],
        summary: 'Aumenta dano físico e ataque.',
        description: 'O alvo é consumido por uma fúria bestial.',
        tags: ['sangue'],
      };

      const theme = resolveRecordTheme(cardData);
      const rawSvg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });
      const exported = await generateLocalCardFile(cardData, theme, rawSvg, 'png', 1080, 1350);

      // Deve ser imagem (PNG ou compatível), NUNCA PDF
      assert.notStrictEqual(exported.mimeType, 'application/pdf', 'PNG não deve ser despachado como application/pdf');
      assert.strictEqual(exported.fileName.endsWith('.pdf'), false, 'PNG não deve terminar com .pdf');
    });

    it('2.3 normalizeRecordCardData deve sanitizar dados e preservar integridade de campos ausentes', () => {
      const partialData = {
        name: 'Ódio Incontrolável',
        category: 'ritual' as const,
      };
      const normalized = normalizeRecordCardData(partialData);
      assert.strictEqual(normalized.name, 'Ódio Incontrolável');
      assert.ok(Array.isArray(normalized.stats));
      assert.ok(Array.isArray(normalized.tags));
    });
  });

  // =========================================================================
  // TIER 3: Interface Contracts & Theme Integration
  // =========================================================================
  describe('Tier 3: Contrato com Registros e Temas Elementais', () => {
    it('3.1 resolveRecordTheme deve selecionar tema de Sangue para rituais de Sangue', () => {
      const bloodRecord: RecordCardData = {
        id: 'rec_sangue',
        name: 'Arma Atroz',
        category: 'ritual',
        categoryLabel: 'Ritual',
        subCategory: 'Ritual de Sangue',
        element: 'Sangue',
        stats: [],
        description: 'Melhora dano de arma corpo a corpo.',
        tags: ['sangue'],
      };

      const theme = resolveRecordTheme(bloodRecord);
      assert.ok(theme.id.includes('sangue'));
    });

    it('3.2 formatRecordTextForSharing deve gerar resumo textual estruturado', () => {
      const cardData: RecordCardData = {
        id: 'rec_teste',
        name: 'Proteção Leve',
        category: 'item',
        categoryLabel: 'Equipamento',
        subCategory: 'Proteção',
        element: 'Nenhum',
        bookTitle: 'Livro de Regras',
        stats: [{ label: 'DEFESA', value: '+5' }],
        description: 'Colete balístico reforçado com placas cerâmicas.',
        tags: ['protecao'],
      };

      const text = formatRecordTextForSharing(cardData);
      assert.ok(text.includes('PROTEÇÃO LEVE'));
      assert.ok(text.includes('DEFESA: +5'));
      assert.ok(text.includes('Colete balístico'));
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Exportação de Cards', () => {
    it('4.1 Cenário: Jogador exporta card do poder "Armamento Pesado" com pré-requisito sem sobreposição', () => {
      const cardData: RecordCardData = {
        id: 'pod_armamento_pesado',
        name: 'Armamento Pesado',
        category: 'power',
        categoryLabel: 'Poder de Classe',
        subCategory: 'PODER DE COMBATENTE',
        element: 'Nenhum',
        bookTitle: 'Livro de Regras Base',
        pageNumber: 35,
        stats: [{ label: 'PRÉ-REQUISITO', value: 'For 2' }],
        description: 'Você recebe proficiência com armas pesadas de fogo e corpo a corpo.',
        tags: ['combatente', 'armas'],
      };

      const theme = resolveRecordTheme(cardData);
      const svg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });

      assert.ok(svg.length > 500);
      assert.ok(svg.includes('Armamento Pesado'));
      assert.ok(svg.includes('For 2'));
    });

    it('4.2 Cenário: Ocultista exporta card de ritual com múltiplas seções extras (Discente / Verdadeiro)', () => {
      const cardData: RecordCardData = {
        id: 'rit_chamas',
        name: 'Chamas do Caos',
        category: 'ritual',
        categoryLabel: 'Ritual',
        subCategory: 'RITUAL DE ENERGIA',
        element: 'Energia',
        stats: [{ label: 'EXECUÇÃO', value: 'Padrão' }],
        description: 'Dispara labaredas de plasma colorido.',
        extraSections: [
          { title: 'DISCENTE (+2 PE)', content: 'Aumenta o dano para 6d6 de Energia.' },
          { title: 'VERDADEIRO (+5 PE)', content: 'Cria tempestade de plasma em área.' },
        ],
        tags: ['energia'],
      };

      const theme = resolveRecordTheme(cardData);
      const svg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });

      assert.ok(svg.includes('DISCENTE (+2 PE)'));
      assert.ok(svg.includes('VERDADEIRO (+5 PE)'));
    });
  });

  // =========================================================================
  // TIER 5: Adversarial & Escaping
  // =========================================================================
  describe('Tier 5: Adversarial, Escaping de XML e Resiliência', () => {
    it('5.1 caracteres reservados de XML (&, <, >, ", \') são devidamente escapados no SVG', () => {
      const cardData: RecordCardData = {
        id: 'ent_perigosa',
        name: 'Arma <Perigosa> & "Fatal"',
        category: 'weapon',
        categoryLabel: 'Arma',
        subCategory: "Gume d'Aço",
        element: 'Nenhum',
        stats: [{ label: 'DANO', value: '1d8 & +2 <Morte>' }],
        description: 'Espada forjada com ligas proibidas: "Corta até a alma" & quebra ossos.',
        tags: ['marcial'],
      };

      const theme = resolveRecordTheme(cardData);
      const svg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });

      assert.ok(!svg.includes('Arma <Perigosa>'));
      assert.ok(svg.includes('Arma &lt;Perigosa&gt; &amp; &quot;Fatal&quot;'));
      assert.ok(svg.includes('&amp; +2 &lt;Morte&gt;'));
    });

    it('5.2 descrição extremamente longa (2.000 caracteres) é tratada com truncamento seguro sem quebrar o layout', () => {
      const cardData: RecordCardData = {
        id: 'ent_longa',
        name: 'Registro Enciclopédico',
        category: 'rule',
        categoryLabel: 'Regra',
        subCategory: 'Documento',
        element: 'Conhecimento',
        stats: [],
        description: 'Texto investigativo confidencial da Ordo Realitas. '.repeat(100),
        tags: ['conhecimento'],
      };

      const theme = resolveRecordTheme(cardData);
      assert.doesNotThrow(() => {
        const svg = generateCardSvg(cardData, theme, { width: 1080, height: 1350 });
        assert.ok(svg.length > 0);
      });
    });
  });
});
