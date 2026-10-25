import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import compendiumSeed from '../src/data/seed/compendium_seed.json';
import booksPagesSeed from '../src/data/seed/books_pages_seed.json';
import { CompendiumEntity, BookInfo } from '../src/types/compendium';

const REQUIRED_CATEGORIES = new Set([
  'ritual',
  'origin',
  'class',
  'track',
  'power',
  'weapon',
  'item',
  'skill',
  'condition',
  'creature',
  'rule',
]);

const EXPECTED_EXACT_COUNTS: Record<string, number> = {
  class: 4,
  skill: 28,
  origin: 59,
  track: 35,
  ritual: 106,
  condition: 37,
};

const EXPECTED_MIN_COUNTS: Record<string, number> = {
  weapon: 55,
  item: 250,
  power: 200,
  creature: 180,
  rule: 350,
};

describe('Integridade da Base de Dados do Compêndio (databaseIntegrity.test.ts)', () => {
  const books = compendiumSeed.books as BookInfo[];
  const entities = compendiumSeed.entities as CompendiumEntity[];
  const pagesBooks = booksPagesSeed.books as Record<string, { title: string; pages: unknown[] }>;

  it('deve conter exatamente os 10 livros canônicos do Ordem Paranormal', () => {
    assert.strictEqual(books.length, 10, 'Deve conter exatamente 10 livros');
    const bookIds = new Set(books.map((b) => b.id));
    assert.strictEqual(bookIds.size, 10, 'Os IDs dos livros devem ser únicos');

    // Livro base e Sobrevivendo ao Horror devem estar presentes
    assert.ok(bookIds.has('livro_base'), 'Livro base deve existir');
    assert.ok(bookIds.has('sobrevivendo_ao_horror'), 'Sobrevivendo ao Horror deve existir');

    // Os IDs devem bater com o banco de páginas
    const pagesBookIds = new Set(Object.keys(pagesBooks));
    assert.deepStrictEqual(bookIds, pagesBookIds, 'Os livros do compêndio e das páginas devem coincidir');
  });

  it('deve conter pelo menos 1300 entidades catalogadas', () => {
    assert.ok(entities.length >= 1300, `Esperado >= 1300 entidades, encontrado ${entities.length}`);
  });

  it('todas as entidades devem possuir IDs únicos, nomes válidos e categorias oficiais', () => {
    const seenIds = new Set<string>();
    const categoryCounts: Record<string, number> = {};

    for (const ent of entities) {
      assert.ok(ent.id, `Entidade sem id: ${JSON.stringify(ent)}`);
      assert.ok(!seenIds.has(ent.id), `ID duplicado encontrado: ${ent.id}`);
      seenIds.add(ent.id);

      assert.ok(
        REQUIRED_CATEGORIES.has(ent.category),
        `Entidade ${ent.id} tem categoria inválida: ${ent.category}`
      );
      categoryCounts[ent.category] = (categoryCounts[ent.category] || 0) + 1;

      assert.ok(ent.name && ent.name.trim().length > 0, `Entidade ${ent.id} com nome vazio`);
      assert.ok(!ent.name.includes('\n'), `Nome da entidade ${ent.id} possui quebra de linha`);
      assert.ok(!ent.name.endsWith('•'), `Nome da entidade ${ent.id} termina com bullet`);

      // Validação de criatura
      if (ent.category === 'creature') {
        assert.ok(typeof ent.vd === 'number', `Criatura ${ent.id} deve ter VD numérico`);
      }

      // Validação de ritual
      if (ent.category === 'ritual') {
        assert.ok(
          ent.circle && [1, 2, 3, 4].includes(ent.circle),
          `Ritual ${ent.id} deve ter círculo entre 1 e 4`
        );
      }

      // Validação de livro de origem (foreign key)
      assert.ok(
        pagesBooks[ent.bookId],
        `Entidade ${ent.id} referencia livro desconhecido "${ent.bookId}"`
      );
    }

    // Validação de contagens exatas
    for (const [cat, expected] of Object.entries(EXPECTED_EXACT_COUNTS)) {
      const actual = categoryCounts[cat] || 0;
      assert.strictEqual(
        actual,
        expected,
        `Contagem de categoria "${cat}" divergente: esperado ${expected}, encontrado ${actual}`
      );
    }

    // Validação de contagens mínimas
    for (const [cat, minExpected] of Object.entries(EXPECTED_MIN_COUNTS)) {
      const actual = categoryCounts[cat] || 0;
      assert.ok(
        actual >= minExpected,
        `Contagem de categoria "${cat}" muito baixa: esperado >= ${minExpected}, encontrado ${actual}`
      );
    }
  });

  it('o banco de páginas deve conter páginas indexadas com números válidos e texto', () => {
    for (const [bookId, bookData] of Object.entries(pagesBooks)) {
      assert.ok(bookData.title, `Livro ${bookId} deve ter título`);
      assert.ok(Array.isArray(bookData.pages), `Livro ${bookId} deve ter array de páginas`);
      assert.ok(bookData.pages.length > 0, `Livro ${bookId} deve ter páginas indexadas`);

      // Verifica primeira página
      const firstPage = bookData.pages[0] as { pageNumber: number; text: string };
      assert.ok(typeof firstPage.pageNumber === 'number');
      assert.ok(typeof firstPage.text === 'string');
    }
  });
});
