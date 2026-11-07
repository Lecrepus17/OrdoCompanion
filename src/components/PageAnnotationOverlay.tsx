import React, { useRef, useState, useMemo } from 'react';
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import {
  AnnotationPoint,
  AnnotationStroke,
  AnnotationToolType,
} from '../types/annotations';
import {
  denormalizePoint,
  filterClosePoints,
  generateSvgPath,
  isPointNearStroke,
  normalizePoint,
} from '../utils/annotationGeometry';

interface PageAnnotationOverlayProps {
  bookId: string;
  pageNumber: number;
  width: number;
  height: number;
  strokes: AnnotationStroke[];
  onStrokesChange: (strokes: AnnotationStroke[]) => void;
  isDrawingActive: boolean;
  currentTool: AnnotationToolType;
  currentColor: string;
  currentWidth: number;
  currentOpacity?: number;
  readOnly?: boolean;
}

export const PageAnnotationOverlay: React.FC<PageAnnotationOverlayProps> = ({
  width,
  height,
  strokes,
  onStrokesChange,
  isDrawingActive,
  currentTool,
  currentColor,
  currentWidth,
  currentOpacity = 1,
  readOnly = false,
}) => {
  const [activePoints, setActivePoints] = useState<AnnotationPoint[]>([]);
  const activePointsRef = useRef<AnnotationPoint[]>([]);

  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const toolRef = useRef(currentTool);
  toolRef.current = currentTool;

  const colorRef = useRef(currentColor);
  colorRef.current = currentColor;

  const widthRef = useRef(currentWidth);
  widthRef.current = currentWidth;

  const opacityRef = useRef(currentOpacity);
  opacityRef.current = currentOpacity;

  const canDraw = isDrawingActive && !readOnly;

  // PanResponder para capturar toques e caneta stylus com coordenadas normalizadas
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canDraw,
        onStartShouldSetPanResponderCapture: () => canDraw,
        onMoveShouldSetPanResponder: () => canDraw,
        onMoveShouldSetPanResponderCapture: () => canDraw,

        onPanResponderGrant: (
          evt: GestureResponderEvent,
          _gestureState: PanResponderGestureState
        ) => {
          if (!canDraw) return;
          const { locationX, locationY } = evt.nativeEvent;
          const pt = normalizePoint(locationX, locationY, width, height);

          if (toolRef.current === 'eraser') {
            const remaining = strokesRef.current.filter(
              (s) => !isPointNearStroke(pt, s, 0.025)
            );
            if (remaining.length !== strokesRef.current.length) {
              onStrokesChange(remaining);
            }
          } else {
            activePointsRef.current = [pt];
            setActivePoints([pt]);
          }
        },

        onPanResponderMove: (
          evt: GestureResponderEvent,
          _gestureState: PanResponderGestureState
        ) => {
          if (!canDraw) return;
          const { locationX, locationY } = evt.nativeEvent;
          const pt = normalizePoint(locationX, locationY, width, height);

          if (toolRef.current === 'eraser') {
            const remaining = strokesRef.current.filter(
              (s) => !isPointNearStroke(pt, s, 0.025)
            );
            if (remaining.length !== strokesRef.current.length) {
              onStrokesChange(remaining);
            }
          } else {
            const pts = activePointsRef.current;
            const last = pts[pts.length - 1];
            if (!last) {
              activePointsRef.current = [pt];
              setActivePoints([pt]);
              return;
            }

            const dx = pt.x - last.x;
            const dy = pt.y - last.y;
            if (dx * dx + dy * dy >= 0.000004) {
              // Limite mínimo de deslocamento (~0.002) para suavidade
              const next = [...pts, pt];
              activePointsRef.current = next;
              setActivePoints(next);
            }
          }
        },

        onPanResponderRelease: () => {
          if (!canDraw) return;

          if (toolRef.current !== 'eraser' && activePointsRef.current.length > 0) {
            const simplified = filterClosePoints(activePointsRef.current, 0.002);
            if (simplified.length > 0) {
              const newStroke: AnnotationStroke = {
                id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                tool: toolRef.current,
                color: colorRef.current,
                width: widthRef.current,
                opacity:
                  toolRef.current === 'highlighter'
                    ? 0.38
                    : opacityRef.current,
                points: simplified,
              };

              const nextStrokes = [...strokesRef.current, newStroke];
              onStrokesChange(nextStrokes);
            }
          }

          activePointsRef.current = [];
          setActivePoints([]);
        },

        onPanResponderTerminate: () => {
          activePointsRef.current = [];
          setActivePoints([]);
        },
      }),
    [canDraw, width, height, onStrokesChange]
  );

  // Traço temporário em tempo real enquanto o usuário desenha
  const activeStroke: AnnotationStroke | null = useMemo(() => {
    if (activePoints.length === 0 || toolRef.current === 'eraser') return null;
    return {
      id: 'active_draft',
      tool: currentTool,
      color: currentColor,
      width: currentWidth,
      opacity: currentTool === 'highlighter' ? 0.38 : currentOpacity,
      points: activePoints,
    };
  }, [activePoints, currentTool, currentColor, currentWidth, currentOpacity]);

  const allStrokes = useMemo(() => {
    return activeStroke ? [...strokes, activeStroke] : strokes;
  }, [strokes, activeStroke]);

  if (width <= 0 || height <= 0) return null;

  return (
    <View
      style={[
        styles.overlay,
        { width, height },
        canDraw && styles.drawingActiveBorder,
      ]}
      pointerEvents={canDraw ? 'auto' : 'none'}
      {...panResponder.panHandlers}
      testID="page-annotation-overlay"
    >
      {/* RENDERIZAÇÃO NA WEB: SVG VETORIAL NATIVO VIA REACT.CREATEELEMENT (ISOLAMENTO HERMES ANDROID) */}
      {Platform.OS === 'web' &&
        React.createElement(
          'svg',
          {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width,
              height,
              pointerEvents: 'none',
            },
            viewBox: `0 0 ${width} ${height}`,
          },
          allStrokes.map((s) => {
            const pathD = generateSvgPath(s.points, width, height);
            if (!pathD) return null;
            return React.createElement('path', {
              key: s.id,
              d: pathD,
              stroke: s.color,
              strokeWidth: s.width,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              fill: 'none',
              opacity: s.opacity,
              style:
                s.tool === 'highlighter'
                  ? { mixBlendMode: 'multiply' as any }
                  : undefined,
            });
          })
        )}

      {/* RENDERIZAÇÃO NO NATIVO (ANDROID / IOS): SEGMENTOS E PONTOS VETORIAIS LEVES */}
      {Platform.OS !== 'web' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {allStrokes.map((s) => {
            const pts = s.points;
            if (!pts || pts.length === 0) return null;

            if (pts.length === 1) {
              const denorm = denormalizePoint(pts[0], width, height);
              const r = s.width / 2;
              return (
                <View
                  key={`dot_${s.id}`}
                  style={[
                    styles.nativeDot,
                    {
                      left: denorm.x - r,
                      top: denorm.y - r,
                      width: s.width,
                      height: s.width,
                      borderRadius: r,
                      backgroundColor: s.color,
                      opacity: s.opacity,
                    },
                  ]}
                />
              );
            }

            return pts.map((p1, idx) => {
              if (idx === pts.length - 1) return null;
              const p2 = pts[idx + 1];
              const pt1 = denormalizePoint(p1, width, height);
              const pt2 = denormalizePoint(p2, width, height);

              const dx = pt2.x - pt1.x;
              const dy = pt2.y - pt1.y;
              const len = Math.hypot(dx, dy);
              if (len < 0.4) return null;

              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const strokeW = s.width;

              return (
                <View
                  key={`seg_${s.id}_${idx}`}
                  style={[
                    styles.nativeSegment,
                    {
                      left: (pt1.x + pt2.x - len) / 2,
                      top: (pt1.y + pt2.y - strokeW) / 2,
                      width: len,
                      height: strokeW,
                      borderRadius: strokeW / 2,
                      backgroundColor: s.color,
                      opacity: s.opacity,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            });
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  drawingActiveBorder: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderStyle: 'dashed',
  },
  nativeDot: {
    position: 'absolute',
  },
  nativeSegment: {
    position: 'absolute',
  },
});
