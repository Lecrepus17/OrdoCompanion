import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COPY } from '../copy';
import { AnimatedBackground } from './AnimatedBackground';
import { CtaBadge } from './CtaBadge';
import { GlitchText } from './GlitchText';
import { VIDEO_THEME } from './theme';

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  const logoPop = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  const badgeIn = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <AbsoluteFill>
      <AnimatedBackground accentColor={VIDEO_THEME.primary} intensity={1.25} />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isPortrait ? '60px 56px' : '60px 120px',
          textAlign: 'center',
          gap: isPortrait ? 34 : 28,
        }}
      >
        {/* App Icon with crimson glow */}
        <div
          style={{
            transform: `scale(${interpolate(logoPop, [0, 1], [0.6, 1])})`,
            opacity: logoPop,
            padding: 14,
            borderRadius: 34,
            background: 'linear-gradient(135deg, rgba(220,38,38,0.35), rgba(168,85,247,0.28))',
            border: '2px solid rgba(220, 38, 38, 0.65)',
            boxShadow: '0 20px 60px rgba(220, 38, 38, 0.42)',
          }}
        >
          <Img
            src={staticFile('icon.png')}
            style={{
              width: isPortrait ? 148 : 132,
              height: isPortrait ? 148 : 132,
              borderRadius: 24,
              display: 'block',
            }}
          />
        </div>

        {/* Tag */}
        <div
          style={{
            padding: '8px 20px',
            borderRadius: 999,
            backgroundColor: 'rgba(220, 38, 38, 0.16)',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            color: '#FDA4AF',
            fontFamily: "'Consolas', 'Courier New', monospace",
            fontSize: isPortrait ? 18 : 17,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {COPY.scenes.end.tag}
        </div>

        {/* Frase de destaque principal */}
        <GlitchText
          text={COPY.highlightPhrase}
          fontSize={isPortrait ? 50 : 54}
          align="center"
          delay={6}
          maxWidth={isPortrait ? 920 : 1280}
        />

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 14,
            opacity: badgeIn,
            transform: `translateY(${interpolate(badgeIn, [0, 1], [16, 0])}px)`,
          }}
        >
          {[
            '100% GRATUITO',
            'CÓDIGO ABERTO (MIT)',
            'FUNCIONA OFFLINE',
            'ANDROID APK DISPONÍVEL',
          ].map((pill) => (
            <span
              key={pill}
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                backgroundColor: VIDEO_THEME.surfaceElevated,
                border: `1px solid ${VIDEO_THEME.border}`,
                color: VIDEO_THEME.textSecondary,
                fontSize: isPortrait ? 18 : 17,
                fontWeight: 700,
                fontFamily: "'Segoe UI', sans-serif",
                letterSpacing: '0.06em',
              }}
            >
              {pill}
            </span>
          ))}
        </div>

        {/* CTA Box */}
        <div style={{ marginTop: 8 }}>
          <CtaBadge delay={16} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
