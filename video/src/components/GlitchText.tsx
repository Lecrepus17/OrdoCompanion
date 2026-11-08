import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { VIDEO_THEME } from './theme';

interface GlitchTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  accentColor?: string;
  align?: 'left' | 'center' | 'right';
  fontWeight?: number;
  delay?: number;
  maxWidth?: number | string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  fontSize = 52,
  color = VIDEO_THEME.text,
  accentColor = VIDEO_THEME.primary,
  align = 'left',
  fontWeight = 800,
  delay = 0,
  maxWidth = '100%',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - delay);
  const entrance = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.8 },
  });

  // Periodic paranormal glitch burst
  const isGlitching =
    (localFrame > 2 && localFrame < 9) ||
    (localFrame % 47 >= 0 && localFrame % 47 <= 3);

  const offsetX = isGlitching ? Math.sin(localFrame * 9.7) * 5 : 0;
  const offsetY = isGlitching ? Math.cos(localFrame * 7.3) * 2 : 0;

  const translateY = interpolate(entrance, [0, 1], [28, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth,
        textAlign: align,
        transform: `translateY(${translateY}px)`,
        opacity,
        fontFamily: "'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif",
        fontSize,
        fontWeight,
        lineHeight: 1.14,
        letterSpacing: '-0.02em',
        color,
      }}
    >
      {/* Red channel shadow during glitch */}
      {isGlitching && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            color: accentColor,
            transform: `translate(${offsetX}px, ${-offsetY}px)`,
            opacity: 0.78,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}

      {/* Violet channel shadow during glitch */}
      {isGlitching && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            color: VIDEO_THEME.accent,
            transform: `translate(${-offsetX}px, ${offsetY}px)`,
            opacity: 0.75,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}

      <span style={{ position: 'relative', zIndex: 2 }}>{text}</span>
    </div>
  );
};
