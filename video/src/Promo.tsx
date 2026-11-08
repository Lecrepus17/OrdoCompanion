import React from 'react';
import {
  AbsoluteFill,
  Audio,
  getStaticFiles,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { COPY, SceneCopy } from './copy';
import { AnimatedBackground } from './components/AnimatedBackground';
import { CtaBadge } from './components/CtaBadge';
import { EndCard } from './components/EndCard';
import { GlitchText } from './components/GlitchText';
import { PhoneFrame } from './components/PhoneFrame';
import { VIDEO_THEME } from './components/theme';

/**
 * Cena 1 (0-4s): Tela preta, estática/glitch, o logo surge + frase de abertura
 */
const IntroGlitchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;

  const logoScale = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  const glitchBurst =
    (frame > 4 && frame < 14) || (frame > 55 && frame < 62);
  const glitchShift = glitchBurst ? Math.sin(frame * 12) * 8 : 0;

  return (
    <AbsoluteFill>
      <AnimatedBackground accentColor={VIDEO_THEME.primary} intensity={1.3} />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isPortrait ? '60px 56px' : '60px 140px',
          textAlign: 'center',
          gap: 28,
        }}
      >
        <div
          style={{
            padding: '6px 18px',
            borderRadius: 999,
            backgroundColor: 'rgba(220, 38, 38, 0.18)',
            border: '1px solid rgba(220, 38, 38, 0.6)',
            color: '#FDA4AF',
            fontFamily: "'Consolas', 'Courier New', monospace",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.18em',
          }}
        >
          {COPY.scenes.intro.tag}
        </div>

        <div
          style={{
            transform: `scale(${interpolate(logoScale, [0, 1], [0.5, 1])}) translateX(${glitchShift}px)`,
            opacity: logoScale,
            padding: 16,
            borderRadius: 36,
            background: 'rgba(18, 21, 30, 0.85)',
            border: '2px solid #DC2626',
            boxShadow: '0 0 70px rgba(220, 38, 38, 0.55)',
          }}
        >
          <Img
            src={staticFile('icon.png')}
            style={{
              width: isPortrait ? 160 : 148,
              height: isPortrait ? 160 : 148,
              borderRadius: 26,
              display: 'block',
            }}
          />
        </div>

        <GlitchText
          text={COPY.scenes.intro.title}
          fontSize={isPortrait ? 52 : 60}
          align="center"
          delay={14}
          maxWidth={isPortrait ? 900 : 1200}
        />

        <div
          style={{
            color: VIDEO_THEME.textSecondary,
            fontFamily: "'Consolas', 'Courier New', monospace",
            fontSize: 18,
            letterSpacing: '0.14em',
            opacity: interpolate(frame, [20, 40], [0, 0.9], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {COPY.scenes.intro.subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Cenas 2 a 7: Moldura de celular 3D + Textos animados + CTA opcional
 */
const PhoneShowcaseScene: React.FC<{
  scene: SceneCopy;
  index: number;
}> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  const isEven = index % 2 === 0;

  const subProgress = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 15, stiffness: 110 },
  });

  return (
    <AbsoluteFill>
      <AnimatedBackground accentColor={scene.accentColor} intensity={1.05} />

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: isPortrait
            ? 'column'
            : isEven
              ? 'row'
              : 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isPortrait ? '70px 56px 60px 56px' : '60px 110px',
          gap: isPortrait ? 28 : 64,
          boxSizing: 'border-box',
        }}
      >
        {/* Text Column */}
        <div
          style={{
            flex: isPortrait ? '0 0 auto' : '1 1 52%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isPortrait ? 'center' : 'flex-start',
            textAlign: isPortrait ? 'center' : 'left',
            gap: isPortrait ? 16 : 22,
            maxWidth: isPortrait ? '100%' : 820,
            zIndex: 5,
          }}
        >
          {/* Scene tactical tag */}
          <div
            style={{
              padding: '7px 18px',
              borderRadius: 999,
              backgroundColor: `${scene.accentColor}26`,
              border: `1px solid ${scene.accentColor}`,
              color: VIDEO_THEME.text,
              fontFamily: "'Consolas', 'Courier New', monospace",
              fontSize: isPortrait ? 17 : 16,
              fontWeight: 800,
              letterSpacing: '0.14em',
            }}
          >
            {scene.tag}
          </div>

          {/* Main animated headline */}
          <GlitchText
            text={scene.title}
            fontSize={isPortrait ? 52 : 62}
            accentColor={scene.accentColor}
            align={isPortrait ? 'center' : 'left'}
            delay={4}
          />

          {/* Subtitle */}
          <div
            style={{
              color: VIDEO_THEME.textSecondary,
              fontSize: isPortrait ? 25 : 27,
              lineHeight: 1.38,
              fontWeight: 500,
              fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
              opacity: subProgress,
              transform: `translateY(${interpolate(subProgress, [0, 1], [18, 0])}px)`,
              maxWidth: isPortrait ? 880 : 740,
            }}
          >
            {scene.subtitle}
          </div>

          {/* Discreet CTA during middle scenes */}
          {scene.showFloatingCta && (
            <div style={{ marginTop: isPortrait ? 6 : 12 }}>
              <CtaBadge compact delay={18} accentColor={scene.accentColor} />
            </div>
          )}
        </div>

        {/* 3D Phone Frame Column */}
        <div
          style={{
            flex: isPortrait ? '1 1 auto' : '0 0 460px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PhoneFrame
            clip={scene.clip}
            screenType={scene.screenType}
            accentColor={scene.accentColor}
            tiltDirection={isPortrait ? 'center' : isEven ? 'left' : 'right'}
            scale={isPortrait ? 1.18 : 1.08}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const PromoVideo: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const hasMusicFile = getStaticFiles().some(
    (f) => f.name.replace(/\\/g, '/') === 'music.mp3'
  );

  const transitionFrames = 15;

  return (
    <AbsoluteFill style={{ backgroundColor: VIDEO_THEME.background }}>
      <TransitionSeries>
        {/* 1. Intro (0-4s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.intro.durationInFrames}>
          <IntroGlitchScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 2. Home (4-9s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.home.durationInFrames}>
          <PhoneShowcaseScene scene={COPY.scenes.home} index={0} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 3. Compêndio (9-16s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.compendio.durationInFrames}>
          <PhoneShowcaseScene scene={COPY.scenes.compendio} index={1} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 4. Agentes (16-23s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.agentes.durationInFrames}>
          <PhoneShowcaseScene scene={COPY.scenes.agentes} index={2} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 5. Rolador de Dados + CTA (23-28s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.dados.durationInFrames}>
          <PhoneShowcaseScene scene={COPY.scenes.dados} index={3} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 6. Central do Mestre / Mesa (28-34s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.mestre.durationInFrames}>
          <PhoneShowcaseScene scene={COPY.scenes.mestre} index={4} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 7. Oráculo G.L.I.T.C.H. Offline (34-39s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.oraculo.durationInFrames}>
          <PhoneShowcaseScene scene={COPY.scenes.oraculo} index={5} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* 8. EndCard (39-45s) */}
        <TransitionSeries.Sequence durationInFrames={COPY.scenes.end.durationInFrames}>
          <EndCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Background Music with 1s fade-in and 2s fade-out when public/music.mp3 is present */}
      {hasMusicFile && (
        <Audio
          src={staticFile('music.mp3')}
          volume={(f) => {
            const fadeIn = interpolate(f, [0, fps], [0, 0.85], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const fadeOut = interpolate(
              f,
              [durationInFrames - fps * 2, durationInFrames],
              [0.85, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }
            );
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/**
 * Thumbnail 1920x1080 dedicada para capa
 */
export const ThumbnailStill: React.FC = () => {
  return (
    <AbsoluteFill>
      <AnimatedBackground accentColor={VIDEO_THEME.primary} intensity={1.3} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 110px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 24,
            maxWidth: 880,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Img
              src={staticFile('icon.png')}
              style={{
                width: 84,
                height: 84,
                borderRadius: 20,
                border: '2px solid #DC2626',
              }}
            />
            <div>
              <div
                style={{
                  color: '#FDA4AF',
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                }}
              >
                ANDROID APK • GRATUITO & OPEN SOURCE
              </div>
              <div
                style={{
                  color: VIDEO_THEME.text,
                  fontSize: 54,
                  fontWeight: 900,
                  fontFamily: "'Segoe UI', sans-serif",
                }}
              >
                ORDO COMPANION
              </div>
            </div>
          </div>

          <div
            style={{
              color: VIDEO_THEME.text,
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.18,
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >
            O Grimório Tático Definitivo para Ordem Paranormal RPG
          </div>

          <div
            style={{
              color: VIDEO_THEME.textSecondary,
              fontSize: 24,
              lineHeight: 1.4,
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >
            10 suplementos • Fichas automáticas • Rolador de dados • Escudo do Mestre • IA Paranormal Offline
          </div>

          <CtaBadge delay={0} staticPreview />
        </div>

        <PhoneFrame
          clip={COPY.scenes.agentes.clip}
          screenType="agentes"
          accentColor="#DC2626"
          tiltDirection="left"
          scale={1.06}
          staticPreview
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
