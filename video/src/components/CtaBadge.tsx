import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COPY } from '../copy';
import { VIDEO_THEME } from './theme';

interface CtaBadgeProps {
  compact?: boolean;
  delay?: number;
  accentColor?: string;
  staticPreview?: boolean;
}

export const CtaBadge: React.FC<CtaBadgeProps> = ({
  compact = false,
  delay = 10,
  accentColor = VIDEO_THEME.primary,
  staticPreview = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = staticPreview
    ? 1
    : spring({
        frame: Math.max(0, frame - delay),
        fps,
        config: { damping: 14, stiffness: 120 },
      });

  const scale = interpolate(progress, [0, 1], [0.88, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const glow = interpolate(Math.sin(frame * 0.12), [-1, 1], [0.35, 0.75]);

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: compact ? 'row' : 'column',
        alignItems: 'center',
        gap: compact ? 14 : 8,
        padding: compact ? '12px 22px' : '18px 32px',
        borderRadius: 16,
        backgroundColor: 'rgba(18, 21, 30, 0.92)',
        border: `2px solid ${accentColor}`,
        boxShadow: `0 10px 35px rgba(220, 38, 38, ${glow * 0.45})`,
        transform: `scale(${scale})`,
        opacity,
        fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 11,
            height: 11,
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 12px #10B981',
          }}
        />
        <span
          style={{
            color: VIDEO_THEME.text,
            fontSize: compact ? 21 : 28,
            fontWeight: 800,
            letterSpacing: '0.01em',
          }}
        >
          {compact ? COPY.ctaShort : COPY.ctaPhrase}
        </span>
      </div>

      <span
        style={{
          color: compact ? '#FDA4AF' : '#FDE047',
          fontSize: compact ? 17 : 21,
          fontWeight: 600,
          fontFamily: "'Consolas', 'Courier New', monospace",
          letterSpacing: '0.02em',
        }}
      >
        {COPY.repoReleasesUrl}
      </span>
    </div>
  );
};
