import React from 'react';
import {
  getStaticFiles,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { VIDEO_THEME } from './theme';

export type ScreenMockType =
  | 'home'
  | 'compendio'
  | 'agentes'
  | 'dados'
  | 'mestre'
  | 'oraculo';

interface PhoneFrameProps {
  clip?: string;
  screenType?: ScreenMockType;
  accentColor?: string;
  tiltDirection?: 'left' | 'right' | 'center';
  scale?: number;
  staticPreview?: boolean;
}

/**
 * Fallback/Simulated animated screen when a raw .mp4 clip is not in public/clips/
 * or as a high-DPI crisp preview. If the .mp4 clip exists in public/clips/,
 * OffthreadVideo renders the real captured Android footage automatically.
 */
const AnimatedAppScreenFallback: React.FC<{
  screenType: ScreenMockType;
  accentColor: string;
}> = ({ screenType, accentColor }) => {
  const frame = useCurrentFrame();

  const cardSlide = interpolate(Math.min(frame, 35), [0, 35], [24, 0]);
  const searchTypedLength = Math.floor(interpolate(frame, [10, 45], [0, 14], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const ritualQuery = 'Descarnar (2º)'.slice(0, searchTypedLength);

  const diceRollNumber = frame < 35 ? 12 + ((frame * 7) % 9) : 20;
  const diceTotal = frame < 35 ? diceRollNumber + 10 : 30;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: VIDEO_THEME.background,
        color: VIDEO_THEME.text,
        fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '38px 18px 16px 18px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top App Header */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: `1px solid ${VIDEO_THEME.border}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: accentColor,
                fontWeight: 800,
                letterSpacing: '0.14em',
              }}
            >
              ORDO REALITAS // v1.4
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
              {screenType === 'home' && 'Central de Operações'}
              {screenType === 'compendio' && 'Compêndio Paranormal'}
              {screenType === 'agentes' && 'Dossiê do Agente'}
              {screenType === 'dados' && 'Rolador Tático'}
              {screenType === 'mestre' && 'Escudo do Mestre'}
              {screenType === 'oraculo' && 'Terminal G.L.I.T.C.H.'}
            </div>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 99,
              backgroundColor: 'rgba(16, 185, 129, 0.16)',
              border: '1px solid #10B981',
              color: '#A7F3D0',
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            OFFLINE READY
          </div>
        </div>

        {/* Dynamic body by screenType */}
        {screenType === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, transform: `translateY(${cardSlide}px)` }}>
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(220,38,38,0.28), rgba(18,21,30,0.95))',
                border: '1px solid #DC2626',
              }}
            >
              <div style={{ fontSize: 11, color: '#FDA4AF', fontWeight: 700 }}>
                STATUS DA BASE // ATIVO
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                Bem-vindo, Agente da Ordem
              </div>
              <div style={{ fontSize: 12, color: VIDEO_THEME.textSecondary, marginTop: 4 }}>
                1.367 registros • 10 livros • Regras v1.1
              </div>
            </div>

            {[
              { title: 'Acervo de Rituais & Ameaças', sub: '10 suplementos indexados', col: '#F59E0B' },
              { title: 'Fichas de Investigadores', sub: 'Cálculo automático PV/PE/SAN', col: '#E11D48' },
              { title: 'Oráculo G.L.I.T.C.H.', sub: 'IA Paranormal Offline & Online', col: '#10B981' },
              { title: 'Central do Mestre & Mesa', sub: 'Iniciativa, encontros e campanhas', col: '#38BDF8' },
              { title: 'Arsenal & Itens Amaldiçoados', sub: 'Modificações, categorias e prestígio', col: '#A855F7' },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                  borderLeft: `4px solid ${item.col}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: VIDEO_THEME.textSecondary, marginTop: 2 }}>
                  {item.sub}
                </div>
              </div>
            ))}

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                backgroundColor: VIDEO_THEME.surfaceElevated,
                border: `1px solid ${VIDEO_THEME.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11,
              }}
            >
              <span style={{ color: VIDEO_THEME.textSecondary }}>Sincronização Local & Nuvem</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>● ATIVO</span>
            </div>
          </div>
        )}

        {screenType === 'compendio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                backgroundColor: VIDEO_THEME.surfaceElevated,
                border: `1px solid ${accentColor}`,
                fontSize: 13,
                color: '#FDE68A',
                fontFamily: 'monospace',
              }}
            >
              🔍 {ritualQuery || 'Buscar ritual...'}
              <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el, idx) => (
                <span
                  key={el}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: idx === 0 ? 'rgba(225,29,72,0.25)' : VIDEO_THEME.surface,
                    border: `1px solid ${idx === 0 ? '#E11D48' : VIDEO_THEME.border}`,
                    color: idx === 0 ? '#FDA4AF' : VIDEO_THEME.textSecondary,
                  }}
                >
                  {el}
                </span>
              ))}
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #E11D48',
                boxShadow: '0 8px 25px rgba(225,29,72,0.18)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#FFE4E6' }}>
                  DESCARNAR
                </span>
                <span style={{ fontSize: 11, color: '#FDA4AF', fontWeight: 700 }}>
                  SANGUE 2º CÍRCULO
                </span>
              </div>
              <div style={{ fontSize: 11, color: VIDEO_THEME.textSecondary, marginTop: 6 }}>
                Execução: Padrão • Alcance: Toque • Resistência: Fortitude parcial
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: VIDEO_THEME.surfaceElevated,
                  fontSize: 11,
                  lineHeight: 1.38,
                }}
              >
                Causa <strong style={{ color: '#FDA4AF' }}>6d8 de dano de Sangue</strong> e hemorragia severa no alvo. Discente (+3 PE): muda para 10d8.
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#FDE047', fontWeight: 700 }}>
                📖 Livro Básico v1.1 • pág. 131
              </div>
            </div>

            {[
              { name: 'PARADOXO', el: 'MORTE 2º CÍRCULO', dmg: '6d6 Morte em área', col: '#A1A1AA' },
              { name: 'INEXISTIR', el: 'CONHECIMENTO 4º CÍRCULO', dmg: '10d12 + 50 Conhecimento', col: '#F59E0B' },
              { name: 'TELA DE RUÍDO', el: 'ENERGIA 2º CÍRCULO', dmg: '30 PV temporários / Reação', col: '#A855F7' },
            ].map((r) => (
              <div
                key={r.name}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: VIDEO_THEME.textSecondary }}>{r.dmg}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.col }}>{r.el}</span>
              </div>
            ))}
          </div>
        )}

        {screenType === 'agentes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Arthur Cervero</div>
                  <div style={{ fontSize: 11, color: '#FDA4AF', fontWeight: 700 }}>
                    Ocultista • Conduíte • Patente: Operador
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(220,38,38,0.2)',
                    border: '1px solid #DC2626',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  NEX 35%
                </div>
              </div>

              {/* Atributos */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 6,
                  marginTop: 12,
                  textAlign: 'center',
                }}
              >
                {[
                  { k: 'AGI', v: 2 },
                  { k: 'FOR', v: 1 },
                  { k: 'INT', v: 4 },
                  { k: 'PRE', v: 4 },
                  { k: 'VIG', v: 2 },
                ].map((a) => (
                  <div
                    key={a.k}
                    style={{
                      padding: '6px 4px',
                      borderRadius: 8,
                      backgroundColor: VIDEO_THEME.surfaceElevated,
                      border: `1px solid ${VIDEO_THEME.border}`,
                    }}
                  >
                    <div style={{ fontSize: 9, color: VIDEO_THEME.textSecondary }}>{a.k}</div>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{a.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barras de PV, PE, SAN */}
            {[
              { label: 'PONTOS DE VIDA (PV)', cur: 36, max: 36, color: '#EF4444' },
              { label: 'PONTOS DE ESFORÇO (PE • 7/turno)', cur: 56, max: 56, color: '#F59E0B' },
              { label: 'SANIDADE (SAN • DT Ritual 21)', cur: 55, max: 55, color: '#38BDF8' },
            ].map((bar) => (
              <div
                key={bar.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                  <span>{bar.label}</span>
                  <span style={{ color: bar.color }}>
                    {bar.cur}/{bar.max}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 99,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    marginTop: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${interpolate(Math.min(frame, 25), [0, 25], [82, 100])}%`,
                      height: '100%',
                      backgroundColor: bar.color,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Perícias & Rituais da Ficha */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: '#FDA4AF', marginBottom: 8 }}>
                PERÍCIAS EM DESTAQUE & RITUAIS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <div style={{ padding: '6px 8px', borderRadius: 8, backgroundColor: VIDEO_THEME.surfaceElevated }}>
                  Ocultismo <strong style={{ color: '#10B981', float: 'right' }}>+10</strong>
                </div>
                <div style={{ padding: '6px 8px', borderRadius: 8, backgroundColor: VIDEO_THEME.surfaceElevated }}>
                  Vontade <strong style={{ color: '#10B981', float: 'right' }}>+10</strong>
                </div>
                <div style={{ padding: '6px 8px', borderRadius: 8, backgroundColor: VIDEO_THEME.surfaceElevated }}>
                  Investigação <strong style={{ color: '#38BDF8', float: 'right' }}>+5</strong>
                </div>
                <div style={{ padding: '6px 8px', borderRadius: 8, backgroundColor: VIDEO_THEME.surfaceElevated }}>
                  Iniciativa <strong style={{ color: '#38BDF8', float: 'right' }}>+5</strong>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: VIDEO_THEME.textSecondary }}>
                🔮 Rituais: Cicatrização • Decadenza • Eletrocussão • Descarnar
              </div>
            </div>
          </div>
        )}

        {screenType === 'dados' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <div
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 16,
                backgroundColor: VIDEO_THEME.surface,
                border: `2px solid ${accentColor}`,
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(168,85,247,0.25)',
              }}
            >
              <div style={{ fontSize: 11, color: '#E9D5FF', fontWeight: 700 }}>
                TESTE DE OCULTISMO (4d20 + 10)
              </div>
              <div style={{ fontSize: 44, fontWeight: 900, color: '#FAF5FF', margin: '8px 0' }}>
                {diceTotal}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {[14, 7, diceRollNumber, 18].map((d, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 13,
                      backgroundColor: i === 2 ? accentColor : VIDEO_THEME.surfaceElevated,
                      color: '#FFF',
                    }}
                  >
                    d20: {d}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#10B981', fontWeight: 800, marginTop: 10 }}>
                ★ SUCESSO EXTREMO (20 NATURAL)
              </div>
            </div>

            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}
            >
              {['1d20', '2d20', '3d20', '4d20', '2d8+4', '6d6'].map((btn) => (
                <div
                  key={btn}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 10,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    border: `1px solid ${VIDEO_THEME.border}`,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  🎲 {btn}
                </div>
              ))}
            </div>

            <div
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
                fontSize: 11,
              }}
            >
              <div style={{ fontWeight: 800, color: '#C4B5FD', marginBottom: 6 }}>
                HISTÓRICO DA SESSÃO
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Dano Descarnar (6d8)</span>
                <strong style={{ color: '#FDA4AF' }}>34 Sangue</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Teste de Vontade (4d20+10)</span>
                <strong style={{ color: '#10B981' }}>28 (Sucesso)</strong>
              </div>
            </div>
          </div>
        )}

        {screenType === 'mestre' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                backgroundColor: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid #38BDF8',
                fontSize: 12,
                fontWeight: 700,
                color: '#BAE6FD',
              }}
            >
              ⚔️ COMBATE ATIVO • RODADA 3 • VD TOTAL 140
            </div>

            {[
              { name: '1. Arthur Cervero', init: 24, hp: '36/36 PV', tag: 'AGENTE', col: '#10B981' },
              { name: '2. Zumbi de Sangue Bestial', init: 19, hp: '165/200 PV', tag: 'AMEAÇA VD 100', col: '#E11D48' },
              { name: '3. Kaiser (Especialista)', init: 16, hp: '42/48 PV', tag: 'AGENTE', col: '#38BDF8' },
              { name: '4. Existido de Conhecimento', init: 11, hp: '58/90 PV', tag: 'AMEAÇA VD 40', col: '#F59E0B' },
            ].map((row, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${idx === 0 ? row.col : VIDEO_THEME.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{row.name}</div>
                  <div style={{ fontSize: 10, color: row.col, fontWeight: 700 }}>{row.tag}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>INI {row.init}</div>
                  <div style={{ fontSize: 10, color: VIDEO_THEME.textSecondary }}>{row.hp}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screenType === 'oraculo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                alignSelf: 'flex-end',
                padding: '10px 12px',
                borderRadius: '12px 12px 2px 12px',
                backgroundColor: 'rgba(220, 38, 38, 0.24)',
                border: '1px solid #DC2626',
                fontSize: 12,
                maxWidth: '86%',
              }}
            >
              Como funciona o cálculo de DT de rituais para um Ocultista NEX 35%?
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                padding: 12,
                borderRadius: '12px 12px 12px 2px',
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #10B981',
                fontSize: 11.5,
                lineHeight: 1.42,
              }}
            >
              <div style={{ fontSize: 10, color: '#10B981', fontWeight: 800, marginBottom: 4 }}>
                [G.L.I.T.C.H. // MOTOR TÁTICO OFFLINE]
              </div>
              Pela regra oficial (Livro Básico v1.1, pág. 121):
              <br />
              <strong>DT = 10 + Limite de PE/turno + PRE</strong>.
              <br />
              • Em NEX 35%, seu limite é <strong>7 PE/turno</strong>.
              <br />
              • Com PRE 4: <strong>10 + 7 + 4 = DT 21</strong>.
            </div>

            <div
              style={{
                alignSelf: 'flex-end',
                padding: '10px 12px',
                borderRadius: '12px 12px 2px 12px',
                backgroundColor: 'rgba(220, 38, 38, 0.24)',
                border: '1px solid #DC2626',
                fontSize: 12,
                maxWidth: '86%',
              }}
            >
              E qual a resistência do Zumbi de Sangue Bestial?
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                padding: 12,
                borderRadius: '12px 12px 12px 2px',
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #10B981',
                fontSize: 11.5,
                lineHeight: 1.4,
              }}
            >
              <strong>Zumbi de Sangue Bestial (VD 100):</strong> Defesa 23, RD 10 balístico/impacto/perfuração, vulnerável a <strong>Morte</strong>.
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          paddingTop: 10,
          borderTop: `1px solid ${VIDEO_THEME.border}`,
          fontSize: 10,
          color: VIDEO_THEME.textSecondary,
          fontWeight: 700,
        }}
      >
        <span style={{ color: screenType === 'home' ? accentColor : undefined }}>Início</span>
        <span style={{ color: screenType === 'compendio' ? accentColor : undefined }}>Acervo</span>
        <span style={{ color: screenType === 'agentes' ? accentColor : undefined }}>Agentes</span>
        <span style={{ color: screenType === 'dados' ? accentColor : undefined }}>Dados</span>
        <span style={{ color: screenType === 'mestre' ? accentColor : undefined }}>Mestre</span>
        <span style={{ color: screenType === 'oraculo' ? accentColor : undefined }}>Oráculo</span>
      </div>
    </div>
  );
};

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  clip,
  screenType = 'home',
  accentColor = VIDEO_THEME.primary,
  tiltDirection = 'left',
  scale = 1,
  staticPreview = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = staticPreview
    ? 1
    : spring({
        frame: frame + 3,
        fps,
        config: { damping: 14, stiffness: 100, mass: 0.9 },
      });

  // Check if the captured .mp4 clip exists in video/public/clips/
  const staticFiles = getStaticFiles();
  const clipExists = Boolean(
    clip && staticFiles.some((f) => f.name.replace(/\\/g, '/') === clip.replace(/\\/g, '/'))
  );

  const baseRotateY =
    tiltDirection === 'left' ? -13 : tiltDirection === 'right' ? 13 : 0;
  const floatY = Math.sin(frame * 0.06) * 7;
  const rotateY = baseRotateY + Math.cos(frame * 0.04) * 2.2;
  const rotateX = 4 + Math.sin(frame * 0.05) * 1.5;

  const entryScale = interpolate(entrance, [0, 1], [0.84, 1]) * scale;
  const entryOpacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        perspective: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entryOpacity,
        transform: `translateY(${floatY}px) scale(${entryScale})`,
      }}
    >
      <div
        style={{
          width: 390,
          height: 800,
          borderRadius: 48,
          padding: 13,
          background: 'linear-gradient(145deg, #2A3042 0%, #0E1017 55%, #1F2433 100%)',
          boxShadow: `
            0 35px 80px rgba(0, 0, 0, 0.82),
            0 0 55px ${accentColor}44,
            inset 0 0 0 2px rgba(255, 255, 255, 0.12)
          `,
          transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        {/* Inner screen bezel */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 37,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: VIDEO_THEME.background,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Punch-hole camera */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: '#050508',
              border: '1px solid rgba(255,255,255,0.14)',
              zIndex: 10,
            }}
          />

          {/* Real recorded clip if present, otherwise crisp animated screen */}
          {clipExists && clip ? (
            <OffthreadVideo
              src={staticFile(clip)}
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <AnimatedAppScreenFallback
              screenType={screenType}
              accentColor={accentColor}
            />
          )}

          {/* Subtle glass reflection overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(115deg, rgba(255,255,255,0.09) 0%, transparent 38%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 9,
            }}
          />
        </div>
      </div>
    </div>
  );
};
