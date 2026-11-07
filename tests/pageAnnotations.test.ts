import './setup';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pageAnnotationsService } from '../src/services/annotations/pageAnnotationsService';
import {
  normalizePoint,
  denormalizePoint,
  filterClosePoints,
  generateSvgPath,
  isPointNearStroke,
} from '../src/utils/annotationGeometry';
import { AnnotationStroke } from '../src/types/annotations';

beforeEach(() => {
  pageAnnotationsService.clearMemoryCache();
});

test('Geometria: normalizePoint e denormalizePoint convertem coordenadas fielmente', () => {
  const norm = normalizePoint(200, 400, 1000, 2000);
  assert.equal(norm.x, 0.2);
  assert.equal(norm.y, 0.2);

  const denorm = denormalizePoint(norm, 500, 1000);
  assert.equal(denorm.x, 100);
  assert.equal(denorm.y, 200);
});

test('Geometria: filterClosePoints remove pontos redundantes preservando início e fim', () => {
  const pts = [
    { x: 0.1, y: 0.1 },
    { x: 0.1001, y: 0.1001 }, // muito próximo
    { x: 0.1002, y: 0.1002 }, // muito próximo
    { x: 0.3, y: 0.3 },       // distante
  ];
  const filtered = filterClosePoints(pts, 0.01);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].x, 0.1);
  assert.equal(filtered[1].x, 0.3);
});

test('Geometria: generateSvgPath formata caminho M e L corretamente', () => {
  const path = generateSvgPath(
    [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ],
    100,
    200
  );
  assert.equal(path, 'M 0.0 0.0 L 50.0 100.0 L 100.0 200.0');
});

test('Geometria: isPointNearStroke detecta interseção para ferramenta de borracha', () => {
  const stroke: AnnotationStroke = {
    id: 's1',
    tool: 'pen',
    color: '#EF4444',
    width: 3,
    opacity: 1,
    points: [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.3, y: 0.3 },
    ],
  };

  // Ponto muito próximo ao traço
  assert.equal(isPointNearStroke({ x: 0.19, y: 0.21 }, stroke, 0.03), true);
  // Ponto distante do traço
  assert.equal(isPointNearStroke({ x: 0.8, y: 0.8 }, stroke, 0.03), false);
});

test('Serviço: Salva, recupera, lista páginas anotadas e limpa anotações', async () => {
  const bookId = 'livro_regras_base';
  const page = 42;

  const testStroke: AnnotationStroke = {
    id: 'test_stroke_1',
    tool: 'pen',
    color: '#EF4444',
    width: 4,
    opacity: 1,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ],
  };

  await pageAnnotationsService.savePageAnnotations(bookId, page, [testStroke]);

  const loaded = await pageAnnotationsService.getPageAnnotations(bookId, page);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'test_stroke_1');
  assert.equal(loaded[0].color, '#EF4444');

  const annotatedPages = await pageAnnotationsService.listAnnotatedPages(bookId);
  assert.ok(annotatedPages.includes(42));

  const has = await pageAnnotationsService.hasAnnotations(bookId, page);
  assert.equal(has, true);

  // Limpa anotações
  await pageAnnotationsService.clearPageAnnotations(bookId, page);
  const cleared = await pageAnnotationsService.getPageAnnotations(bookId, page);
  assert.equal(cleared.length, 0);

  const hasAfterClear = await pageAnnotationsService.hasAnnotations(bookId, page);
  assert.equal(hasAfterClear, false);
});
