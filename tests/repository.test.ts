import './setup';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  OfflineDataRepository,
  normalizeText,
  sortBooksCanonical,
  getEntityClasses,
  isEntityExcluded,
} from '../src/repositories/OfflineDataRepository';
import { resetMockStorage } from './setup';
import { BookInfo, CompendiumEntity } from '../src/types/compendium';

function makeEntity(
  partial: Partial<CompendiumEntity> & { id: string; name: string; category: CompendiumEntity['category'] }
): CompendiumEntity {
  return {
    subCategory: '',
    pageNumber: 1,
    element: 'Nenhum',
    summary: '',
    description: '',
    tags: [],
    bookId: 'livro_base',
    bookTitle: 'Livro Base',
    ...partial,
  };
}

describe('Repositório de Dados e Compêndio (OfflineDataRepository)', () => {
  describe('Funções Auxiliares', () => {
    it('normalizeText deve remover acentuação, espaços extras e converter para minúsculas', () => {
      assert.strictEqual(normalizeText('Ação'), 'acao');
      assert.strictEqual(normalizeText('Maldição Paranormal'), 'maldicao paranormal');
      assert.strictEqual(normalizeText('  Ódio, Éter e Vigor  '), 'odio, eter e vigor');
      assert.strictEqual(normalizeText(''), '');
    });

    it('sortBooksCanonical deve ordenar livros respeitando a prioridade canônica', () => {
      const unsorted: BookInfo[] = [
        { id: 'arquivos_secretos_02', title: 'Arquivos Secretos 02', fileName: 'as02.pdf', pageCount: 10, toc: [] },
        { id: 'sobrevivendo_ao_horror', title: 'Sobrevivendo ao Horror', fileName: 'sh.pdf', pageCount: 100, toc: [] },
        { id: 'arquivos_secretos_01', title: 'Arquivos Secretos 01', fileName: 'as01.pdf', pageCount: 10, toc: [] },
        { id: 'livro_base', title: 'Livro de Regras Base', fileName: 'base.pdf', pageCount: 300, toc: [] },
        { id: 'outro_livro', title: 'Suplemento Extra', fileName: 'extra.pdf', pageCount: 50, toc: [] },
      ];

      const sorted = sortBooksCanonical(unsorted);
      assert.strictEqual(sorted[0].id, 'livro_base');
      assert.strictEqual(sorted[1].id, 'sobrevivendo_ao_horror');
      assert.strictEqual(sorted[2].id, 'arquivos_secretos_01');
      assert.strictEqual(sorted[3].id, 'arquivos_secretos_02');
      assert.strictEqual(sorted[4].id, 'outro_livro');
    });

    it('getEntityClasses deve identificar corretamente as classes de uma entidade', () => {
      const combatenteEnt = makeEntity({
        id: 'pod_ataque_especial',
        name: 'Ataque Especial',
        category: 'power',
        className: 'Combatente',
      });
      assert.deepStrictEqual(getEntityClasses(combatenteEnt), ['Combatente']);

      const multiTagEnt = makeEntity({
        id: 'pod_versatilidade',
        name: 'Conhecimento Geral',
        category: 'power',
        tags: ['Poder de Especialista', 'Poder de Ocultista'],
      });
      const classes = getEntityClasses(multiTagEnt);
      assert.ok(classes.includes('Especialista'));
      assert.ok(classes.includes('Ocultista'));

      const neutralEnt = makeEntity({
        id: 'item_lanterna',
        name: 'Lanterna Tática',
        category: 'item',
      });
      assert.deepStrictEqual(getEntityClasses(neutralEnt), ['none']);
    });

    it('isEntityExcluded deve filtrar categorias excluídas pelo usuário', () => {
      const creature = makeEntity({
        id: 'c1',
        name: 'Zumbi',
        category: 'creature',
      });
      assert.strictEqual(isEntityExcluded(creature, ['creatures']), true);
      assert.strictEqual(isEntityExcluded(creature, ['items']), false);

      const ritual = makeEntity({
        id: 'r1',
        name: 'Decadência',
        category: 'ritual',
      });
      assert.strictEqual(isEntityExcluded(ritual, ['rituals']), true);
      assert.strictEqual(isEntityExcluded(ritual, ['weapons']), false);
    });
  });

  describe('Operações do Repositório (OfflineDataRepository)', () => {
    let repo: OfflineDataRepository;

    beforeEach(async () => {
      resetMockStorage();
      repo = new OfflineDataRepository();
      await repo.initialize();
    });

    it('initialize deve carregar as entidades do seed e os livros canônicos', () => {
      const all = repo.getAllEntities();
      assert.ok(all.length >= 1300, `Deveria ter carregado mais de 1300 entidades, carregou ${all.length}`);

      const books = repo.getBooks();
      assert.ok(books.length >= 8);
      assert.strictEqual(books[0].id, 'livro_base');
    });

    it('getEntityById deve buscar entidades do seed', () => {
      const all = repo.getAllEntities();
      const first = all[0];
      const found = repo.getEntityById(first.id);
      assert.ok(found);
      assert.strictEqual(found?.id, first.id);
      assert.strictEqual(found?.name, first.name);
    });

    it('searchEntities deve buscar por termo de busca ignorando maiúsculas e acentuação', () => {
      const results = repo.searchEntities({
        query: 'decadencia',
        category: 'all',
        bookId: 'all',
        element: 'all',
        circle: 'all',
        itemCategory: 'all',
      });

      assert.ok(results.length > 0);
      assert.ok(results.some((r) => normalizeText(r.name).includes('decadencia')));
    });

    it('searchEntities deve filtrar por categoria (ex.: creature) e VD', () => {
      const creatures = repo.searchEntities({
        query: '',
        category: 'creature',
        bookId: 'all',
        element: 'all',
        circle: 'all',
        itemCategory: 'all',
        minVd: 20,
        maxVd: 60,
      });

      assert.ok(creatures.length > 0);
      for (const c of creatures) {
        assert.strictEqual(c.category, 'creature');
        if (typeof c.vd === 'number') {
          assert.ok(c.vd >= 20 && c.vd <= 60);
        }
      }
    });

    it('deve criar, atualizar e excluir uma entidade customizada (Homebrew)', async () => {
      const created = await repo.createEntity({
        name: 'Ritual das Sombras Eternas',
        category: 'ritual',
        subCategory: 'Ritual de Dano',
        pageNumber: 1,
        element: 'Morte',
        circle: 2,
        summary: 'Ritual de sombras',
        description: 'Um ritual proibido que consome a luz ao redor.',
        tags: ['Ritual', 'Morte'],
        bookId: 'custom',
        bookTitle: 'Conteúdo Pessoal (Homebrew)',
      });

      assert.ok(created.id.startsWith('custom__ritual__'));
      assert.strictEqual(created.isCustom, true);

      // Busca deve localizá-la
      const found = repo.getEntityById(created.id);
      assert.ok(found);
      assert.strictEqual(found?.name, 'Ritual das Sombras Eternas');

      // Atualização
      const updated = await repo.updateEntity(created.id, {
        description: 'Descrição aprimorada do ritual.',
      });
      assert.strictEqual(updated.description, 'Descrição aprimorada do ritual.');

      // Exclusão
      await repo.deleteCustomEntity(created.id);
      assert.strictEqual(repo.getEntityById(created.id), undefined);
    });

    it('deve editar uma entidade oficial e permitir redefinir para o padrão (reset)', async () => {
      const all = repo.getAllEntities();
      const official = all.find((e) => !e.isCustom)!;
      const originalDesc = official.description;

      const edited = await repo.updateEntity(official.id, {
        description: 'Texto modificado pelo mestre da mesa',
      });

      assert.strictEqual(edited.isEdited, true);
      assert.strictEqual(edited.description, 'Texto modificado pelo mestre da mesa');
      assert.strictEqual(repo.hasOriginalSeedVersion(official.id), true);

      // Redefinir para o padrão original
      const restored = await repo.resetEntityToDefault(official.id);
      assert.ok(restored);
      assert.strictEqual(restored?.description, originalDesc);
    });

    it('deve alternar favoritos (toggleFavorite) e persistir', async () => {
      const initialFavs = await repo.getFavorites();
      assert.strictEqual(initialFavs.length, 0);

      const added = await repo.toggleFavorite('ent_123');
      assert.deepStrictEqual(added, ['ent_123']);

      const favsNow = await repo.getFavorites();
      assert.deepStrictEqual(favsNow, ['ent_123']);

      const removed = await repo.toggleFavorite('ent_123');
      assert.deepStrictEqual(removed, []);
    });

    it('deve exportar e importar dados do usuário em JSON sem corromper', async () => {
      await repo.toggleFavorite('fav_item_1');
      await repo.saveUserProfile({
        id: 'usr_export_test',
        playerName: 'Investigador Arthur',
        cloudSyncEnabled: true,
        updatedAt: new Date().toISOString(),
      });

      const exportedJson = await repo.exportUserDataJson();
      assert.ok(exportedJson.length > 50);

      const parsed = JSON.parse(exportedJson);
      assert.deepStrictEqual(parsed.favorites, ['fav_item_1']);
      assert.strictEqual(parsed.userProfile.playerName, 'Investigador Arthur');

      // Limpar e re-importar
      resetMockStorage();
      const freshRepo = new OfflineDataRepository();
      await freshRepo.initialize();
      await freshRepo.importUserDataJson(exportedJson);

      const freshFavs = await freshRepo.getFavorites();
      assert.deepStrictEqual(freshFavs, ['fav_item_1']);

      const freshProfile = await freshRepo.getUserProfile();
      assert.strictEqual(freshProfile.playerName, 'Investigador Arthur');
    });

    it('searchInBookPages deve retornar ocorrências com trechos de contexto', () => {
      const results = repo.searchInBookPages('livro_base', 'sanidade');
      assert.ok(Array.isArray(results));
      if (results.length > 0) {
        assert.ok(results[0].snippet.length > 0);
        assert.strictEqual(results[0].bookId, 'livro_base');
      }
    });
  });
});
