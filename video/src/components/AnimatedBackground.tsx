import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { VIDEO_THEME } from './theme';

interface AnimatedBackgroundProps {
  accentColor?: string;
  intensity?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  accentColor = VIDEO_THEME.primary,
  intensity = 1,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const pulse = interpolate(Math.sin(frame * 0.05), [-1, 1], [0.22, 0.42]) * intensity;
  const secondaryPulse = interpolate(Math.cos(frame * 0.035), [-1, 1], [0.14, 0.28]) * intensity;
  const gridOffset = (frame * 0.8) % 60;

  // Deterministic floating paranormal embers/particles
  const particles = Array.from({ length: 18 }, (_, i) => {
    const seed = (i + 1) * 97;
    const xBase = (seed * 37) % 100;
    const speed = 0.22 + ((seed % 7) * 0.05);
    const yPos = (110 - ((frame * speed + (seed % 100)) % 120));
    const xDrift = Math.sin(frame * 0.03 + i) * 2.5;
    const size = 3 + (seed % 5);
    const alpha = interpolate(Math.sin(frame * 0.08 + i), [-1, 1], [0.15, 0.65]);
    const isPurple = i % 3 === 0;
    return {
      x: `${xBase + xDrift}%`,
      y: `${yPos}%`,
      size,
      alpha,
      color: isPurple ? VIDEO_THEME.accent : accentColor,
    };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: VIDEO_THEME.background,
        overflow: 'hidden',
      }}
    >
      {/* Radial paranormal aura 1 */}
      <div
        style={{
          position: 'absolute',
          width: width * 1.1,
          height: width * 1.1,
          left: -width * 0.25,
          top: -height * 0.3,
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 65%)`,
          opacity: pulse,
        }}
      />

      {/* Radial paranormal aura 2 (Energia / Outro Lado) */}
      <div
        style={{
          position: 'absolute',
          width: width * 1.05,
          height: width * 1.05,
          right: -width * 0.25,
          bottom: -height * 0.3,
          background: `radial-gradient(circle, ${VIDEO_THEME.accent} 0%, transparent 65%)`,
          opacity: secondaryPulse,
        }}
      />

      {/* Tactical perspective grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          backgroundPosition: `0px ${gridOffset}px`,
          opacity: 0.65,
        }}
      />

      {/* Floating paranormal particles */}
      {particles.map((p, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: p.color,
            opacity: p.alpha,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
        />
      ))}

      {/* Subtle CRT scanlines + vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 4px)',
          pointerEvents: 'none',
          opacity: 0.45,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 48%, rgba(4, 5, 10, 0.82) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};
