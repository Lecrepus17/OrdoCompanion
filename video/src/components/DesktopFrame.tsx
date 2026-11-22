import React from 'react';
import {
  getStaticFiles,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ScreenMockType } from './PhoneFrame';
import { VIDEO_THEME } from './theme';

interface DesktopFrameProps {
  clip?: string;
  screenType?: ScreenMockType;
  accentColor?: string;
  tiltDirection?: 'left' | 'right' | 'center';
  scale?: number;
  staticPreview?: boolean;
}

const EXACT_HEADER_TITLES: Record<ScreenMockType, string> = {
  home: 'Guia Ordem Paranormal',
  compendio: 'Acervo de Livros (10 PDFs)',
  agentes: 'Fichas de Agentes',
  dados: 'Rolador Ordem Paranormal',
  mestre: 'Central do Mestre & Campanhas',
  oraculo: 'G.L.I.T.C.H. Paranormal',
};

const REAL_BOTTOM_TABS: Array<{
  key: string;
  label: string;
  matchScreen?: ScreenMockType;
}> = [
  { key: 'index', label: 'Compêndio', matchScreen: 'home' },
  { key: 'characters', label: 'Agentes', matchScreen: 'agentes' },
  { key: 'books', label: 'Livros', matchScreen: 'compendio' },
  { key: 'favorites', label: 'Salvos' },
  { key: 'dice', label: 'Dados', matchScreen: 'dados' },
  { key: 'more', label: 'Mais' },
];

/**
 * Renderização widescreen (2 colunas) fiel ao Ordo Companion rodando no PC como Desktop PWA Standalone.
 */
const AnimatedDesktopScreenFallback: React.FC<{
  screenType: ScreenMockType;
  accentColor: string;
}> = ({ screenType, accentColor }) => {
  const frame = useCurrentFrame();

  const searchTypedLength = Math.floor(
    interpolate(frame, [6, 38], [0, 9], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const ritualQuery = 'Descarnar'.slice(0, searchTypedLength);

  const isOverflowScreen = screenType === 'mestre' || screenType === 'oraculo';

  const pulseAlpha = interpolate(Math.sin(frame * 0.14), [-1, 1], [0.5, 1]);

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
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Barra de Título PWA Standalone (Window Controls Overlay) */}
      <div
        style={{
          height: 30,
          backgroundColor: '#07080D',
          borderBottom: `1px solid ${VIDEO_THEME.border}`,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Img
            src={staticFile('icon.png')}
            style={{ width: 16, height: 16, borderRadius: 4 }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "'Consolas', 'Courier New', monospace",
              letterSpacing: '0.08em',
              color: VIDEO_THEME.textSecondary,
            }}
          >
            ORDO COMPANION // DESKTOP PWA STANDALONE
          </span>
        </div>

        <div
          style={{
            padding: '2px 10px',
            borderRadius: 999,
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            border: '1px solid rgba(16, 185, 129, 0.55)',
            color: '#6EE7B7',
            fontSize: 9,
            fontWeight: 800,
            fontFamily: "'Consolas', 'Courier New', monospace",
            letterSpacing: '0.06em',
          }}
        >
          💻 WINDOWS • MAC • LINUX • 100% OFFLINE
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: VIDEO_THEME.textSecondary,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <span>—</span>
          <span>□</span>
          <span style={{ color: '#FDA4AF' }}>✕</span>
        </div>
      </div>

      {/* Header real do App (_layout.tsx) */}
      <div
        style={{
          backgroundColor: VIDEO_THEME.surface,
          borderBottom: `1px solid ${VIDEO_THEME.border}`,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: VIDEO_THEME.text,
            }}
          >
            {EXACT_HEADER_TITLES[screenType]}
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}`,
              color: VIDEO_THEME.text,
            }}
          >
            MODO DESKTOP WIDESCREEN
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['✨', '?', '🎨', '👤'].map((ico, idx) => (
            <div
              key={idx}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                backgroundColor: VIDEO_THEME.primarySoft,
                border: `1px solid ${VIDEO_THEME.primary}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                color: VIDEO_THEME.primary,
                position: 'relative',
              }}
            >
              {ico}
              {idx === 3 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Área Principal Widescreen em 2 Colunas */}
      <div
        style={{
          flex: 1,
          padding: '12px 16px',
          display: 'flex',
          gap: 12,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Cena 3 (PC): Acervo de Livros / 10 PDFs + Ver no Livro PDF.js */}
        {screenType === 'compendio' && (
          <>
            {/* Coluna Esquerda (48%) */}
            <div
              style={{
                flex: '0 0 48%',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  padding: '8px 11px',
                  borderRadius: 9,
                  backgroundColor: VIDEO_THEME.surfaceElevated,
                  border: `1px solid ${accentColor}`,
                  fontSize: 11.5,
                  color: '#FDE68A',
                  fontFamily: 'monospace',
                }}
              >
                🔍 {ritualQuery || 'Pesquisar nos 10 livros...'}
                <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
              </div>

              {[
                {
                  badge: 'BASE',
                  title: 'Ordem Paranormal RPG — Livro Base v1.3',
                  sub: '332 páginas • 606 regras • 107 rituais',
                  col: '#F59E0B',
                  active: true,
                },
                {
                  badge: 'EXPANSÃO',
                  title: 'Sobrevivendo ao Horror (Suplemento)',
                  sub: '240 páginas • Novas trilhas, origens e rituais',
                  col: '#EF4444',
                  active: false,
                },
                {
                  badge: '#01–#09',
                  title: 'Arquivos Secretos (8 Edições Oficiais)',
                  sub: 'Casos paranormais, ameaças e itens exclusivos',
                  col: '#38BDF8',
                  active: false,
                },
              ].map((bk) => (
                <div
                  key={bk.title}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    backgroundColor: bk.active
                      ? VIDEO_THEME.surfaceHighlight
                      : VIDEO_THEME.surface,
                    border: `1px solid ${bk.active ? bk.col : VIDEO_THEME.border}`,
                    borderLeft: `4px solid ${bk.col}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800 }}>
                      {bk.title}
                    </div>
                    <div
                      style={{
                        fontSize: 9.5,
                        color: VIDEO_THEME.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {bk.sub}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      color: bk.col,
                      padding: '2px 6px',
                      borderRadius: 6,
                      border: `1px solid ${bk.col}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {bk.badge}
                  </span>
                </div>
              ))}

              <div
                style={{
                  marginTop: 'auto',
                  padding: '8px 10px',
                  borderRadius: 9,
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#A7F3D0',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>💾 IndexedDB Local • Leitura Offline no PC</span>
                <span style={{ color: '#10B981' }}>1.261 págs.</span>
              </div>
            </div>

            {/* Coluna Direita (52%): Painel aberto Ver no Livro • PDF.js Desktop */}
            <div
              style={{
                flex: 1,
                padding: 13,
                borderRadius: 12,
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #E11D48',
                boxShadow: '0 8px 28px rgba(225, 29, 72, 0.18)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: '#FDE047',
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(245, 158, 11, 0.16)',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                    }}
                  >
                    Ver no Livro • PDF.js Desktop
                  </span>
                  <span
                    style={{
                      fontSize: 9.5,
                      color: '#FDA4AF',
                      fontWeight: 800,
                    }}
                  >
                    SANGUE • 2º CÍRCULO
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    color: '#FFE4E6',
                    letterSpacing: '0.03em',
                  }}
                >
                  DESCARNAR
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    color: VIDEO_THEME.textSecondary,
                    marginTop: 4,
                  }}
                >
                  Execução: <strong style={{ color: '#F3F4F6' }}>Padrão</strong> • Alcance:{' '}
                  <strong style={{ color: '#F3F4F6' }}>Toque</strong> • Resistência:{' '}
                  <strong style={{ color: '#F3F4F6' }}>Fortitude parcial</strong>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 9,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    border: `1px solid ${VIDEO_THEME.border}`,
                    fontSize: 11,
                    lineHeight: 1.45,
                  }}
                >
                  O alvo sofre <strong style={{ color: '#FDA4AF' }}>6d8 de dano de Sangue</strong>{' '}
                  (metade corte, metade Sangue) e sofre hemorragia severa no início de seus turnos.
                </div>

                <div
                  style={{
                    marginTop: 8,
                    padding: 9,
                    borderRadius: 9,
                    backgroundColor: 'rgba(225, 29, 72, 0.12)',
                    border: '1px solid rgba(225, 29, 72, 0.4)',
                    fontSize: 10.5,
                    lineHeight: 1.4,
                  }}
                >
                  <strong style={{ color: '#FDA4AF' }}>Discente (+3 PE):</strong> muda o dano para{' '}
                  <strong>10d8</strong> e aplica 2d8 de sangramento contínuo.
                  <br />
                  <strong style={{ color: '#FDA4AF' }}>Verdadeiro (+7 PE):</strong> alcance curto e
                  afeta até 3 alvos.
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: `1px solid ${VIDEO_THEME.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 10.5,
                  color: '#FDE047',
                  fontWeight: 700,
                }}
              >
                <span>📖 Livro Base v1.3 • pág. 131</span>
                <span style={{ color: '#6EE7B7' }}>✓ Aberto em tela cheia no PC</span>
              </div>
            </div>
          </>
        )}

        {/* Cena 6 (PC): Central do Mestre & Mesa Virtual VTT */}
        {screenType === 'mestre' && (
          <>
            {/* Coluna Esquerda (52%): Rastreador de Iniciativa & Combate */}
            <div
              style={{
                flex: '0 0 52%',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              <div
                style={{
                  padding: '8px 11px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(56, 189, 248, 0.14)',
                  border: '1px solid #38BDF8',
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: '#BAE6FD',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>⚔️ COMBATE ATIVO • RODADA 3</span>
                <span>VD TOTAL 140</span>
              </div>

              {[
                {
                  name: '1. Arthur Cervero',
                  init: 24,
                  hp: '36/36 PV',
                  tag: 'AGENTE • TURNO ATUAL',
                  col: '#10B981',
                },
                {
                  name: '2. Zumbi de Sangue Bestial',
                  init: 19,
                  hp: '165/200 PV',
                  tag: 'AMEAÇA VD 100 • SANGRANDO',
                  col: '#E11D48',
                },
                {
                  name: '3. Kaiser (Especialista)',
                  init: 16,
                  hp: '42/48 PV',
                  tag: 'AGENTE • ATIRADOR',
                  col: '#38BDF8',
                },
                {
                  name: '4. Existido de Conhecimento',
                  init: 11,
                  hp: '58/90 PV',
                  tag: 'AMEAÇA VD 40 • ABALADO',
                  col: '#F59E0B',
                },
              ].map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 9,
                    backgroundColor: VIDEO_THEME.surface,
                    border: `1px solid ${idx === 0 ? row.col : VIDEO_THEME.border}`,
                    borderLeft: `4px solid ${row.col}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>{row.name}</div>
                    <div style={{ fontSize: 9, color: row.col, fontWeight: 700 }}>
                      {row.tag}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 800 }}>INI {row.init}</div>
                    <div style={{ fontSize: 9.5, color: VIDEO_THEME.textSecondary }}>
                      {row.hp}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coluna Direita (48%): Mesa Virtual da Ordem (VTT Multiplayer) */}
            <div
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid rgba(56, 189, 248, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#BAE6FD',
                      fontFamily: 'monospace',
                    }}
                  >
                    📡 SALA ORD-7429 • 4 JOGADORES SINCRONIZADOS
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      opacity: pulseAlpha,
                      boxShadow: '0 0 8px #10B981',
                    }}
                  />
                </div>

                {/* Barras vitais da equipe em tempo real */}
                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    border: `1px solid ${VIDEO_THEME.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: VIDEO_THEME.textSecondary,
                    }}
                  >
                    MONITOR DA EQUIPE EM TEMPO REAL
                  </div>
                  {[
                    { name: 'Arthur', pv: '36/36', pe: '50/56', san: '55/55', pct: 100 },
                    { name: 'Kaiser', pv: '42/48', pe: '38/42', san: '48/50', pct: 87 },
                  ].map((m) => (
                    <div key={m.name} style={{ fontSize: 10 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 2,
                        }}
                      >
                        <strong>{m.name}</strong>
                        <span style={{ color: '#9CA3AF' }}>
                          PV {m.pv} • PE {m.pe} • SAN {m.san}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          borderRadius: 99,
                          backgroundColor: '#090A0F',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${m.pct}%`,
                            height: '100%',
                            backgroundColor: '#10B981',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feed ao vivo de rolagens da mesa */}
                <div
                  style={{
                    padding: 9,
                    borderRadius: 9,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    border: `1px solid ${VIDEO_THEME.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      color: '#38BDF8',
                    }}
                  >
                    FEED DE ROLAGENS AO VIVO
                  </div>
                  <div
                    style={{
                      padding: '6px 8px',
                      borderRadius: 7,
                      backgroundColor: 'rgba(16, 185, 129, 0.14)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      fontSize: 10.5,
                    }}
                  >
                    🎲 <strong>Arthur rolou Ocultismo:</strong>{' '}
                    <span style={{ color: '#6EE7B7', fontWeight: 800 }}>
                      30 [20 Natural]
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '6px 8px',
                      borderRadius: 7,
                      backgroundColor: VIDEO_THEME.surface,
                      border: `1px solid ${VIDEO_THEME.border}`,
                      fontSize: 10.5,
                    }}
                  >
                    🎲 <strong>Kaiser rolou Investigação:</strong>{' '}
                    <span style={{ color: '#BAE6FD', fontWeight: 800 }}>24</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 9.5,
                  color: VIDEO_THEME.textSecondary,
                  textAlign: 'right',
                }}
              >
                Mesa Virtual da Ordem • Sincronizado entre Celular & PC
              </div>
            </div>
          </>
        )}

        {/* Cena 7 (PC): G.L.I.T.C.H. Paranormal (Sidebar + Chat Tático) */}
        {screenType === 'oraculo' && (
          <>
            {/* Coluna Esquerda / Sidebar Desktop (34%) */}
            <div
              style={{
                flex: '0 0 34%',
                padding: 10,
                borderRadius: 11,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: '#6EE7B7',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  PERSONAS & RELÍQUIAS
                </div>

                {[
                  { name: 'Motor Tático Offline [Ativo]', col: '#10B981', active: true },
                  { name: 'A Magistrada (Conhecimento)', col: '#F59E0B', active: false },
                  { name: 'Deus da Morte (Morte)', col: '#A1A1AA', active: false },
                  { name: 'O Anfitrião (Energia)', col: '#A855F7', active: false },
                  { name: 'O Diabo (Sangue)', col: '#E11D48', active: false },
                ].map((p) => (
                  <div
                    key={p.name}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 7,
                      marginBottom: 4,
                      fontSize: 10,
                      fontWeight: p.active ? 800 : 600,
                      backgroundColor: p.active
                        ? 'rgba(16, 185, 129, 0.18)'
                        : VIDEO_THEME.surfaceElevated,
                      border: `1px solid ${p.active ? p.col : VIDEO_THEME.border}`,
                      color: p.active ? '#ECFDF5' : VIDEO_THEME.textSecondary,
                    }}
                  >
                    {p.active ? '● ' : '○ '}
                    {p.name}
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: VIDEO_THEME.surfaceElevated,
                  border: `1px solid ${VIDEO_THEME.border}`,
                  fontSize: 9.5,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ fontWeight: 800, color: '#FDA4AF' }}>
                  VÍNCULO COM A FICHA
                </div>
                <div>Agente Arthur Cervero • NEX 35%</div>
                <div style={{ color: '#6EE7B7', marginTop: 4, fontWeight: 700 }}>
                  📚 RAG: 10 Livros • 1.367 Entidades
                </div>
              </div>
            </div>

            {/* Coluna Direita / Chat Tático (66%) */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  style={{
                    alignSelf: 'flex-end',
                    padding: '8px 11px',
                    borderRadius: '11px 11px 2px 11px',
                    backgroundColor: 'rgba(220, 38, 38, 0.24)',
                    border: '1px solid #DC2626',
                    fontSize: 11,
                    maxWidth: '82%',
                  }}
                >
                  Como funciona o cálculo de DT de rituais para um Ocultista NEX 35%?
                </div>

                <div
                  style={{
                    alignSelf: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: '11px 11px 11px 2px',
                    backgroundColor: VIDEO_THEME.surface,
                    border: '1px solid #10B981',
                    fontSize: 11,
                    lineHeight: 1.42,
                    maxWidth: '92%',
                  }}
                >
                  <div
                    style={{
                      fontSize: 9.5,
                      color: '#10B981',
                      fontWeight: 800,
                      marginBottom: 3,
                    }}
                  >
                    [G.L.I.T.C.H. // MOTOR TÁTICO OFFLINE • RAG]
                  </div>
                  Pela regra oficial (Livro Base v1.3, pág. 121):{' '}
                  <strong>DT = 10 + Limite de PE/turno + PRE</strong>.
                  <br />• Em NEX 35%, seu limite é <strong>7 PE/turno</strong>. Com PRE 4:{' '}
                  <strong style={{ color: '#6EE7B7' }}>10 + 7 + 4 = DT 21</strong>.
                </div>

                <div
                  style={{
                    alignSelf: 'flex-end',
                    padding: '8px 11px',
                    borderRadius: '11px 11px 2px 11px',
                    backgroundColor: 'rgba(220, 38, 38, 0.24)',
                    border: '1px solid #DC2626',
                    fontSize: 11,
                    maxWidth: '82%',
                  }}
                >
                  E quais as resistências do Zumbi de Sangue Bestial?
                </div>

                <div
                  style={{
                    alignSelf: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: '11px 11px 11px 2px',
                    backgroundColor: VIDEO_THEME.surface,
                    border: '1px solid #10B981',
                    fontSize: 11,
                    lineHeight: 1.4,
                    maxWidth: '92%',
                  }}
                >
                  <strong>Zumbi de Sangue Bestial (VD 100):</strong> Defesa 23, 200 PV, RD 10
                  balístico/impacto/perfuração, vulnerável a{' '}
                  <strong style={{ color: '#D4D4D8' }}>Morte</strong>.
                </div>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 9,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 10.5,
                  color: VIDEO_THEME.textSecondary,
                }}
              >
                <span>Pergunte sobre regras, criaturas, rituais ou sua ficha...</span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    backgroundColor: '#10B981',
                    color: '#052E16',
                    fontWeight: 800,
                    fontSize: 9.5,
                  }}
                >
                  ENVIAR ↵
                </span>
              </div>
            </div>
          </>
        )}

        {/* Fallback caso screenType seja home, agentes ou dados no DesktopFrame */}
        {(screenType === 'home' || screenType === 'agentes' || screenType === 'dados') && (
          <div
            style={{
              flex: 1,
              padding: 18,
              borderRadius: 12,
              backgroundColor: VIDEO_THEME.surface,
              border: `1px solid ${VIDEO_THEME.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {EXACT_HEADER_TITLES[screenType]}
            </div>
            <div style={{ fontSize: 12, color: VIDEO_THEME.textSecondary }}>
              Layout responsivo Desktop PWA sincronizado com o aplicativo Android.
            </div>
          </div>
        )}
      </div>

      {/* CustomBottomTabBar idêntica a src/components/CustomBottomTabBar.tsx */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          backgroundColor: VIDEO_THEME.surface,
          borderTop: `1px solid ${VIDEO_THEME.border}`,
          padding: '6px 24px 8px 24px',
          flexShrink: 0,
        }}
      >
        {REAL_BOTTOM_TABS.map((tab) => {
          const isFocused =
            tab.matchScreen === screenType ||
            (tab.key === 'more' && isOverflowScreen);
          const tabColor = isFocused
            ? VIDEO_THEME.primary
            : VIDEO_THEME.textMuted;

          return (
            <div
              key={tab.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 8,
                backgroundColor: isFocused
                  ? VIDEO_THEME.primarySoft
                  : 'transparent',
                border: isFocused
                  ? `1px solid ${VIDEO_THEME.primary}`
                  : '1px solid transparent',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: tabColor,
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: isFocused ? 800 : 600,
                  color: tabColor,
                }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DesktopFrame: React.FC<DesktopFrameProps> = ({
  clip,
  screenType = 'compendio',
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

  const staticFiles = getStaticFiles();
  const clipExists = Boolean(
    clip &&
      staticFiles.some(
        (f) => f.name.replace(/\\/g, '/') === clip.replace(/\\/g, '/')
      )
  );

  const baseRotateY =
    tiltDirection === 'left' ? -9 : tiltDirection === 'right' ? 9 : 0;
  const floatY = staticPreview ? 0 : Math.sin(frame * 0.06) * 6;
  const rotateY = staticPreview
    ? baseRotateY
    : baseRotateY + Math.cos(frame * 0.04) * 1.8;
  const rotateX = staticPreview ? 3 : 3 + Math.sin(frame * 0.05) * 1.2;

  const entryScale = interpolate(entrance, [0, 1], [0.86, 1]) * scale;
  const entryOpacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        perspective: 1600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entryOpacity,
        transform: `translateY(${floatY}px) scale(${entryScale})`,
      }}
    >
      <div
        style={{
          width: 820,
          height: 510,
          borderRadius: 20,
          padding: 10,
          background:
            'linear-gradient(145deg, #2A3042 0%, #0E1017 55%, #1F2433 100%)',
          boxShadow: `
            0 35px 80px rgba(0, 0, 0, 0.85),
            0 0 60px ${accentColor}44,
            inset 0 0 0 1.5px rgba(255, 255, 255, 0.14)
          `,
          transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transformStyle: 'preserve-3d',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 13,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: VIDEO_THEME.background,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
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
            <AnimatedDesktopScreenFallback
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
                'linear-gradient(115deg, rgba(255,255,255,0.06) 0%, transparent 36%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 9,
            }}
          />
        </div>
      </div>
    </div>
  );
};
