import './setup';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  OfflineDataRepository,
  normalizeText,
} from '../src/repositories/OfflineDataRepository';
import { CompendiumEntity, CompendiumFilters } from '../src/types/compendium';

function createMockEntity(
  partial: Partial<CompendiumEntity> & { id: string; name: string; category: CompendiumEntity['category'] }
): CompendiumEntity {
  return {
    subCategory: '',
    bookId: 'livro_base',
    bookTitle: 'Livro de Regras',
    pageNumber: 1,
    element: 'Nenhum',
    summary: '',
    description: '',
    tags: [],
    ...partial,
  };
}

describe('Feature 10: Compendium Search Ranking & Relevance (compendiumSearchRanking.test.ts)', () => {
  let repo: OfflineDataRepository;

  beforeEach(async () => {
    repo = new OfflineDataRepository();
    await repo.initialize();
  });

  const baseFilters: CompendiumFilters = {
    query: '',
    category: 'all',
    bookId: 'all',
    element: 'all',
    circle: 'all',
    itemCategory: 'all',
  };

  // =========================================================================
  // TIER 1: Primary Behavior & Ranking Hierarchy
  // =========================================================================
  describe('Tier 1: Ranking Hierarchy & Priority Matches', () => {
    it('1.1 deve priorizar correspondência EXATA de título na primeira posição', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        query: 'Cicatrização',
      });

      assert.ok(results.length > 0, 'Deveria retornar resultados para Cicatrização');
      const first = results[0];
      assert.strictEqual(
        normalizeText(first.name),
        normalizeText('Cicatrização'),
        `O primeiro resultado deve ser a entidade exata 'Cicatrização', mas foi '${first.name}'`
      );
    });

    it('1.2 deve priorizar correspondência por PREFIXO de título sobre ocorrências na descrição', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        query: 'Cicatriz',
      });

      assert.ok(results.length > 0, 'Deveria retornar resultados para Cicatriz');
      const first = results[0];
      const normFirst = normalizeText(first.name);
      assert.ok(
        normFirst.startsWith('cicatriz'),
        `Primeiro resultado deve ter título iniciando com 'cicatriz', mas foi '${first.name}'`
      );
    });

    it('1.3 deve priorizar subtítulo/elemento sobre menções genéricas no corpo da descrição', async () => {
      const customRepo = new OfflineDataRepository();
      await customRepo.initialize();

      // Criamos entidades sintéticas para isolar o ranking de subtítulo vs descrição
      const entDesc = await customRepo.createEntity({
        name: 'Guia do Atirador',
        category: 'rule',
        subCategory: 'Regra Geral',
        bookId: 'custom',
        bookTitle: 'Homebrew',
        pageNumber: 1,
        element: 'Nenhum',
        summary: '',
        tags: [],
        description: 'Um guia sobre dano de Sangue e combate à distância.',
      });

      const entSubcat = await customRepo.createEntity({
        name: 'Fúria Primitiva',
        category: 'power',
        subCategory: 'Poder de Sangue',
        bookId: 'custom',
        bookTitle: 'Homebrew',
        pageNumber: 1,
        element: 'Sangue',
        summary: '',
        tags: [],
        description: 'O combatente canaliza sua ira.',
      });

      const results = customRepo.searchEntities({
        ...baseFilters,
        query: 'Sangue',
      });

      const idxSubcat = results.findIndex((e) => e.id === entSubcat.id);
      const idxDesc = results.findIndex((e) => e.id === entDesc.id);

      assert.ok(idxSubcat !== -1, 'entSubcat deve estar nos resultados');
      assert.ok(idxDesc !== -1, 'entDesc deve estar nos resultados');
      assert.ok(
        idxSubcat < idxDesc,
        `Correspondência em subtítulo/elemento (${idxSubcat}) deve ranquear antes de menção apenas na descrição (${idxDesc})`
      );
    });

    it('1.4 deve priorizar tags sobre menções dispersas no corpo da descrição', async () => {
      const customRepo = new OfflineDataRepository();
      await customRepo.initialize();

      const entTag = await customRepo.createEntity({
        name: 'Amuleto Estranho',
        category: 'item',
        subCategory: 'Item Amaldiçoado',
        bookId: 'custom',
        bookTitle: 'Homebrew',
        pageNumber: 1,
        element: 'Nenhum',
        summary: '',
        tags: ['morte', 'reliquia', 'cura'],
        description: 'Um artefato metálico sem explicação.',
      });

      const entDesc = await customRepo.createEntity({
        name: 'Relato de Campo #12',
        category: 'rule',
        subCategory: 'Documento',
        bookId: 'custom',
        bookTitle: 'Homebrew',
        pageNumber: 1,
        element: 'Nenhum',
        summary: '',
        tags: ['investigacao'],
        description: 'Durante a missão, encontramos vestígios de morte por todos os lados.',
      });

      const results = customRepo.searchEntities({
        ...baseFilters,
        query: 'morte',
      });

      const idxTag = results.findIndex((e) => e.id === entTag.id);
      const idxDesc = results.findIndex((e) => e.id === entDesc.id);

      assert.ok(idxTag !== -1, 'entTag deve ser encontrada');
      assert.ok(idxDesc !== -1, 'entDesc deve ser encontrada');
      assert.ok(
        idxTag < idxDesc,
        `Entidade com a tag buscada (${idxTag}) deve ranquear antes de entidade com a palavra apenas na descrição (${idxDesc})`
      );
    });

    it('1.5 não deve retornar entidades que não contenham nenhum dos tokens buscados', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        query: 'TermoInexistenteXYZ123TotalmenteAleatorio',
      });

      assert.strictEqual(results.length, 0, 'Busca por termo inexistente deve retornar array vazio');
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Normalization
  // =========================================================================
  describe('Tier 2: Boundary & Normalization', () => {
    it('2.1 deve retornar a mesma ordenação e primeiro resultado independente de acentos e maiúsculas', () => {
      const resAccented = repo.searchEntities({
        ...baseFilters,
        query: 'Decadência',
      });
      const resPlain = repo.searchEntities({
        ...baseFilters,
        query: 'decadencia',
      });
      const resUpper = repo.searchEntities({
        ...baseFilters,
        query: 'DECADÊNCIA',
      });

      assert.ok(resAccented.length > 0);
      assert.strictEqual(resAccented.length, resPlain.length);
      assert.strictEqual(resAccented.length, resUpper.length);
      assert.strictEqual(resAccented[0].id, resPlain[0].id);
      assert.strictEqual(resAccented[0].id, resUpper[0].id);
    });

    it('2.2 query vazia ou apenas espaços deve manter lista completa sem erro', () => {
      const all = repo.getAllEntities();
      const resEmpty = repo.searchEntities({
        ...baseFilters,
        query: '',
      });
      const resSpaces = repo.searchEntities({
        ...baseFilters,
        query: '     ',
      });

      assert.strictEqual(resEmpty.length, all.length);
      assert.strictEqual(resSpaces.length, all.length);
    });

    it('2.3 busca multi-token deve pontuar mais alto quando todos os tokens estão no título', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        query: 'Amaldiçoar Arma',
      });

      assert.ok(results.length > 0);
      const first = results[0];
      assert.strictEqual(
        normalizeText(first.name),
        normalizeText('Amaldiçoar Arma'),
        `Multi-token 'Amaldiçoar Arma' deve ter a entidade homônima no topo, mas foi '${first.name}'`
      );
    });

    it('2.4 busca com espaços iniciais, finais e intermediários extras deve ser sanitizada', () => {
      const resClean = repo.searchEntities({
        ...baseFilters,
        query: 'Cicatrização',
      });
      const resPadded = repo.searchEntities({
        ...baseFilters,
        query: '   Cicatrização    ',
      });

      assert.strictEqual(resPadded.length, resClean.length);
      assert.strictEqual(resPadded[0].id, resClean[0].id);
    });

    it('2.5 busca por termo de um único caractere deve ser resiliente e não quebrar', () => {
      assert.doesNotThrow(() => {
        const results = repo.searchEntities({
          ...baseFilters,
          query: 'a',
        });
        assert.ok(results.length > 0);
      });
    });
  });

  // =========================================================================
  // TIER 3: Cross-Filter Ranking Combinations
  // =========================================================================
  describe('Tier 3: Filtros Combinados com Ranking de Busca', () => {
    it('3.1 busca combinada com filtro de categoria (ex: category = ritual)', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        category: 'ritual',
        query: 'Ódio',
      });

      assert.ok(results.length > 0);
      assert.ok(results.every((e) => e.category === 'ritual'));
      // O ritual Ódio Incontrolável deve figurar no topo
      const first = results[0];
      assert.ok(
        normalizeText(first.name).includes('odio'),
        `O topo deve conter 'ódio', mas foi '${first.name}'`
      );
    });

    it('3.2 busca combinada com elemento (ex: element = Sangue)', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        element: 'Sangue',
        query: 'Arma',
      });

      assert.ok(results.length > 0);
      assert.ok(
        results.every(
          (e) => (e.element || '').toLowerCase().includes('sangue') || e.element === 'Variável'
        )
      );
      // Itens cujo título começa com Arma e são de Sangue devem ser priorizados
      assert.ok(
        normalizeText(results[0].name).includes('arma'),
        `Primeiro resultado deve ter 'arma' no título: ${results[0].name}`
      );
    });

    it('3.3 busca combinada com círculo de ritual (ex: circle = 2)', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        category: 'ritual',
        circle: 2,
        query: 'Morte',
      });

      assert.ok(results.length > 0);
      assert.ok(results.every((e) => e.category === 'ritual' && e.circle === 2));
    });

    it('3.4 busca com filtro de favoritos ativos preserva ranking dos favoritos', () => {
      const all = repo.getAllEntities();
      const favIds = new Set<string>([all[0].id, all[5].id, all[10].id]);

      const results = repo.searchEntities(
        {
          ...baseFilters,
          onlyFavorites: true,
          query: '',
        },
        favIds
      );

      assert.strictEqual(results.length, favIds.size);
      assert.ok(results.every((e) => favIds.has(e.id)));
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios
  // =========================================================================
  describe('Tier 4: Cenários Reais de Aplicação', () => {
    it('4.1 Cenário: Jogador em combate ferido pesquisa rápido por "cicatriz" para curar', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        query: 'cicatriz',
      });

      assert.ok(results.length > 0);
      // O jogador precisa ver Cicatrização imediatamente na tela sem ter que rolar 10 itens
      assert.strictEqual(results[0].name, 'Cicatrização');
    });

    it('4.2 Cenário: Ocultista procurando por ritual de dano temporal busca "Eco Espiral"', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        category: 'ritual',
        query: 'Eco Espiral',
      });

      assert.ok(results.length > 0);
      assert.strictEqual(results[0].name, 'Eco Espiral');
      assert.strictEqual(results[0].category, 'ritual');
    });

    it('4.3 Cenário: Especialista procurando arma pesada busca "Metralhadora"', () => {
      const results = repo.searchEntities({
        ...baseFilters,
        category: 'weapon',
        query: 'Metralhadora',
      });

      assert.ok(results.length > 0);
      assert.strictEqual(results[0].name, 'Metralhadora');
      assert.strictEqual(results[0].category, 'weapon');
    });
  });

  // =========================================================================
  // TIER 5: Adversarial & Stress Testing
  // =========================================================================
  describe('Tier 5: Adversarial & Resiliência a Caracteres Especiais', () => {
    it('5.1 caracteres de regex ou sintaxe especial não causam syntax error', () => {
      const weirdQueries = [
        '.*',
        '(?<=abc)',
        '[a-z]+',
        '\\d+\\w+',
        '+++',
        '***',
        '???',
        '^$$',
        'dano (morte)',
        '1d8+2',
      ];

      for (const q of weirdQueries) {
        assert.doesNotThrow(() => {
          const res = repo.searchEntities({
            ...baseFilters,
            query: q,
          });
          assert.ok(Array.isArray(res));
        }, `Query adversarial '${q}' não deve lançar exceção`);
      }
    });

    it('5.2 query com injeção de tags HTML / scripts não quebra', () => {
      const scriptQuery = '<script>alert("xss")</script>';
      assert.doesNotThrow(() => {
        const res = repo.searchEntities({
          ...baseFilters,
          query: scriptQuery,
        });
        assert.strictEqual(res.length, 0);
      });
    });

    it('5.3 query com comprimento excessivo (500 caracteres) não causa travamento', () => {
      const longQuery = 'morte '.repeat(100);
      assert.doesNotThrow(() => {
        const res = repo.searchEntities({
          ...baseFilters,
          query: longQuery,
        });
        assert.ok(Array.isArray(res));
      });
    });

    it('5.4 query com emojis e símbolos unicode', () => {
      const emojiQuery = '⚡💀🩸';
      assert.doesNotThrow(() => {
        const res = repo.searchEntities({
          ...baseFilters,
          query: emojiQuery,
        });
        assert.ok(Array.isArray(res));
      });
    });
  });
});
