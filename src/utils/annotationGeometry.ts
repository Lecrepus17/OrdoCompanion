import { AnnotationPoint, AnnotationStroke } from '../types/annotations';

/**
 * Normaliza um ponto de coordenadas absolutas em pixels para coordenadas relativas [0, 1].
 */
export function normalizePoint(
  x: number,
  y: number,
  pageWidth: number,
  pageHeight: number
): AnnotationPoint {
  const safeW = Math.max(1, pageWidth);
  const safeH = Math.max(1, pageHeight);
  return {
    x: Math.max(0, Math.min(1, Number((x / safeW).toFixed(4)))),
    y: Math.max(0, Math.min(1, Number((y / safeH).toFixed(4)))),
  };
}

/**
 * Converte ponto relativo [0, 1] de volta para pixels na resolução de tela atual.
 */
export function denormalizePoint(
  point: AnnotationPoint,
  pageWidth: number,
  pageHeight: number
): { x: number; y: number } {
  return {
    x: point.x * pageWidth,
    y: point.y * pageHeight,
  };
}

/**
 * Filtra pontos excessivamente próximos para manter curvas suaves e renderização leve.
 */
export function filterClosePoints(
  points: AnnotationPoint[],
  minDistanceNormalized = 0.0025
): AnnotationPoint[] {
  if (points.length <= 2) return points;

  const result: AnnotationPoint[] = [points[0]];
  let last = points[0];

  for (let i = 1; i < points.length; i++) {
    const cur = points[i];
    const dx = cur.x - last.x;
    const dy = cur.y - last.y;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDistanceNormalized * minDistanceNormalized || i === points.length - 1) {
      result.push(cur);
      last = cur;
    }
  }

  return result;
}

/**
 * Gera string de caminho SVG (M x y L x y ...) a partir dos pontos normalizados e dimensões.
 */
export function generateSvgPath(
  points: AnnotationPoint[],
  width: number,
  height: number
): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const x = points[0].x * width;
    const y = points[0].y * height;
    return `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + 0.1).toFixed(1)} ${(y + 0.1).toFixed(1)}`;
  }

  const p0 = points[0];
  let d = `M ${(p0.x * width).toFixed(1)} ${(p0.y * height).toFixed(1)}`;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    d += ` L ${(pt.x * width).toFixed(1)} ${(pt.y * height).toFixed(1)}`;
  }

  return d;
}

/**
 * Verifica se um ponto tocado está próximo a um traço (para a ferramenta de borracha).
 */
export function isPointNearStroke(
  touchPoint: AnnotationPoint,
  stroke: AnnotationStroke,
  toleranceNormalized = 0.02
): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;

  const tolSq = toleranceNormalized * toleranceNormalized;

  for (let i = 0; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    const dx = pt.x - touchPoint.x;
    const dy = pt.y - touchPoint.y;
    if (dx * dx + dy * dy <= tolSq) {
      return true;
    }

    if (i < stroke.points.length - 1) {
      const nextPt = stroke.points[i + 1];
      const distSq = distToSegmentSquared(touchPoint, pt, nextPt);
      if (distSq <= tolSq) {
        return true;
      }
    }
  }

  return false;
}

function distToSegmentSquared(
  p: AnnotationPoint,
  v: AnnotationPoint,
  w: AnnotationPoint
): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
  if (l2 === 0) {
    const dx = p.x - v.x;
    const dy = p.y - v.y;
    return dx * dx + dy * dy;
  }
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  const dx = p.x - projX;
  const dy = p.y - projY;
  return dx * dx + dy * dy;
}
