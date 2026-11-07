/**
 * Definições de Tipos para Anotações Desenhadas em Páginas de Livros
 * Ordo Companion - Suporte a Tablet, Stylus e Gestos Manuais
 */

export interface AnnotationPoint {
  /** Posição X normalizada de 0 a 1 (percentual relativo à largura da página) */
  x: number;
  /** Posição Y normalizada de 0 a 1 (percentual relativo à altura da página) */
  y: number;
  /** Timestamp ou pressão opcional para styluses/canetas ativas */
  pressure?: number;
}

export type AnnotationToolType = 'pen' | 'highlighter' | 'eraser';

export interface AnnotationStroke {
  id: string;
  tool: AnnotationToolType;
  color: string;
  width: number;
  opacity: number;
  points: AnnotationPoint[];
}

export interface PageAnnotationData {
  bookId: string;
  pageNumber: number;
  strokes: AnnotationStroke[];
  updatedAt: string;
}

export interface AnnotationToolSettings {
  tool: AnnotationToolType;
  color: string;
  width: number;
  opacity: number;
}
