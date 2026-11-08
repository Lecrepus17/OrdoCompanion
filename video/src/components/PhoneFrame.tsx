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
 * Títulos exatos de headerTitle definidos em src/app/(tabs)/_layout.tsx
 */
const EXACT_HEADER_TITLES: Record<ScreenMockType, string> = {
  home: 'Guia Ordem Paranormal',
  compendio: 'Acervo de Livros (10 PDFs)',
  agentes: 'Fichas de Agentes',
  dados: 'Rolador Ordem Paranormal',
  mestre: 'Central do Mestre & Campanhas',
  oraculo: 'G.L.I.T.C.H. Paranormal',
};

/**
 * Abas reais da CustomBottomTabBar (DEFAULT_PINNED_TABS + Mais)
 * ['index', 'characters', 'books', 'favorites', 'dice'] + 'more'
 */
const REAL_BOTTOM_TABS: Array<{
  key: string;
  label: string;
  matchScreen?: ScreenMockType;
  iconSvg: (color: string) => React.ReactNode;
}> = [
  {
    key: 'index',
    label: 'Compêndio',
    matchScreen: 'home',
    iconSvg: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="20" y1="20" x2="16.2" y2="16.2" />
      </svg>
    ),
  },
  {
    key: 'characters',
    label: 'Agentes',
    matchScreen: 'agentes',
    iconSvg: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'books',
    label: 'Livros',
    matchScreen: 'compendio',
    iconSvg: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: 'favorites',
    label: 'Salvos',
    iconSvg: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: 'dice',
    label: 'Dados',
    matchScreen: 'dados',
    iconSvg: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
        <circle cx="8.5" cy="8.5" r="1.2" fill={color} />
        <circle cx="15.5" cy="8.5" r="1.2" fill={color} />
        <circle cx="12" cy="12" r="1.2" fill={color} />
        <circle cx="8.5" cy="15.5" r="1.2" fill={color} />
        <circle cx="15.5" cy="15.5" r="1.2" fill={color} />
      </svg>
    ),
  },
  {
    key: 'more',
    label: 'Mais',
    iconSvg: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
];

/**
 * Renderização fiel das telas reais do Ordo Companion com os nomes, cabeçalho e barra inferior exatos do app.
 */
const AnimatedAppScreenFallback: React.FC<{
  screenType: ScreenMockType;
  accentColor: string;
}> = ({ screenType, accentColor }) => {
  const frame = useCurrentFrame();

  const cardSlide = interpolate(Math.min(frame, 35), [0, 35], [18, 0]);
  const searchTypedLength = Math.floor(
    interpolate(frame, [6, 38], [0, 9], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const ritualQuery = 'Descarnar'.slice(0, searchTypedLength);

  const diceRollNumber = frame < 35 ? 12 + ((frame * 7) % 9) : 20;
  const diceTotal = frame < 35 ? diceRollNumber + 10 : 30;

  // Verifica se a tela atual faz parte do menu "Mais" (overflowTabs: master, oracle, weapons, table, support)
  const isOverflowScreen = screenType === 'mestre' || screenType === 'oraculo';

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
      {/* Android Status Bar + App Header idêntico ao src/app/(tabs)/_layout.tsx */}
      <div
        style={{
          backgroundColor: VIDEO_THEME.surface,
          borderBottom: `1px solid ${VIDEO_THEME.border}`,
          padding: '30px 12px 10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 800,
            color: VIDEO_THEME.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '58%',
          }}
        >
          {EXACT_HEADER_TITLES[screenType]}
        </div>

        {/* Os 4 botões reais do headerRight de _layout.tsx */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {['✨', '?', '🎨', '👤'].map((ico, idx) => (
            <div
              key={idx}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
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

      {/* Conteúdo central fiel a cada aba */}
      <div
        style={{
          flex: 1,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          overflow: 'hidden',
        }}
      >
        {/* Cena 2: Aba Compêndio (index.tsx - Guia Ordem Paranormal) */}
        {screenType === 'home' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
              transform: `translateY(${cardSlide}px)`,
            }}
          >
            {/* Barra de busca real do index.tsx */}
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11.5,
                color: VIDEO_THEME.textSecondary,
              }}
            >
              <span>🔍 Buscar ritual, poder, arma, criatura...</span>
              <span
                style={{
                  fontSize: 9.5,
                  color: VIDEO_THEME.primary,
                  fontWeight: 800,
                }}
              >
                1.645 itens
              </span>
            </div>

            {/* Pílulas de Categorias (CATEGORIES_ORDER de index.tsx) */}
            <div style={{ display: 'flex', gap: 5, overflow: 'hidden' }}>
              {[
                { label: 'Todos', active: true },
                { label: 'Rituais', active: false },
                { label: 'Poderes', active: false },
                { label: 'Origens', active: false },
                { label: 'Armas', active: false },
              ].map((cat) => (
                <span
                  key={cat.label}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: cat.active
                      ? VIDEO_THEME.primary
                      : VIDEO_THEME.surface,
                    border: `1px solid ${cat.active ? VIDEO_THEME.primary : VIDEO_THEME.border}`,
                    color: cat.active ? '#FFF' : VIDEO_THEME.textSecondary,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.label}
                </span>
              ))}
            </div>

            {/* Pílulas de Elementos (ELEMENTS_ORDER de index.tsx) */}
            <div style={{ display: 'flex', gap: 5, overflow: 'hidden' }}>
              {[
                { label: 'Sangue', col: '#E11D48' },
                { label: 'Morte', col: '#A1A1AA' },
                { label: 'Conhecimento', col: '#F59E0B' },
                { label: 'Energia', col: '#A855F7' },
                { label: 'Medo', col: '#38BDF8' },
              ].map((el) => (
                <span
                  key={el.label}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 8,
                    fontSize: 9.5,
                    fontWeight: 700,
                    backgroundColor: `${el.col}22`,
                    border: `1px solid ${el.col}`,
                    color: VIDEO_THEME.text,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {el.label}
                </span>
              ))}
            </div>

            {/* Cards reais do Compêndio (EntityCard) */}
            {[
              {
                title: 'Descarnar',
                cat: 'RITUAL • 2º CÍRCULO',
                el: 'Sangue',
                col: '#E11D48',
                book: 'Livro Base v1.3 • p. 131',
                desc: 'Alvo sofre 6d8 de dano de Sangue (metade corte, metade Sangue) e hemorragia severa.',
              },
              {
                title: 'Aniquilador',
                cat: 'TRILHA • COMBATENTE',
                el: 'Nenhum',
                col: '#DC2626',
                book: 'Livro Base v1.3 • p. 27',
                desc: 'A Favorita: reduz a categoria da sua arma escolhida em I, II e III conforme o NEX.',
              },
              {
                title: 'Zumbi de Sangue Bestial',
                cat: 'CRIATURA • VD 100',
                el: 'Sangue',
                col: '#E11D48',
                book: 'Livro Base v1.3 • p. 194',
                desc: '200 PV • Defesa 23 • Presença Perturbadora (DT 20, 4d6 mental) • Furtividade brutal.',
              },
              {
                title: 'Jaqueta de Veríssimo',
                cat: 'ITEM AMALDIÇOADO • CAT IV',
                el: 'Medo',
                col: '#38BDF8',
                book: 'Livro Base v1.3 • p. 154',
                desc: 'Fornece resistência a dano paranormal 15 e absorve ataques direcionados a aliados.',
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '9px 11px',
                  borderRadius: 11,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                  borderLeft: `4px solid ${item.col}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: item.col,
                      padding: '2px 6px',
                      borderRadius: 6,
                      backgroundColor: `${item.col}22`,
                    }}
                  >
                    {item.cat}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: VIDEO_THEME.textSecondary,
                    marginTop: 3,
                    lineHeight: 1.3,
                  }}
                >
                  {item.desc}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: '#FDE047',
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  📖 {item.book}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cena 3: Aba Livros (books.tsx - Acervo de Livros (10 PDFs)) */}
        {screenType === 'compendio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                backgroundColor: VIDEO_THEME.surfaceElevated,
                border: `1px solid ${accentColor}`,
                fontSize: 12,
                color: '#FDE68A',
                fontFamily: 'monospace',
              }}
            >
              🔍 {ritualQuery || 'Pesquisar nos 10 livros...'}
              <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>
            </div>

            {/* Cards de Livros reais de books.tsx */}
            {[
              {
                badge: 'BASE',
                title: 'Ordem Paranormal RPG — Livro Base v1.3',
                sub: '332 páginas • 606 regras • 107 rituais',
                col: '#F59E0B',
              },
              {
                badge: 'EXPANSÃO',
                title: 'Sobrevivendo ao Horror (Suplemento)',
                sub: '240 páginas • Novas trilhas, origens e rituais',
                col: '#EF4444',
              },
              {
                badge: '#01–#09',
                title: 'Arquivos Secretos (8 Edições Oficiais)',
                sub: 'Casos paranormais, ameaças e itens exclusivos',
                col: '#38BDF8',
              },
            ].map((bk) => (
              <div
                key={bk.title}
                style={{
                  padding: '9px 11px',
                  borderRadius: 11,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                  borderLeft: `4px solid ${bk.col}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800 }}>
                    {bk.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: VIDEO_THEME.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {bk.sub}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: bk.col,
                    padding: '3px 7px',
                    borderRadius: 6,
                    border: `1px solid ${bk.col}`,
                  }}
                >
                  {bk.badge}
                </span>
              </div>
            ))}

            {/* Detalhe aberto de ritual com referência de página */}
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #E11D48',
                boxShadow: '0 8px 25px rgba(225,29,72,0.18)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span
                  style={{ fontSize: 14, fontWeight: 800, color: '#FFE4E6' }}
                >
                  DESCARNAR
                </span>
                <span
                  style={{ fontSize: 10, color: '#FDA4AF', fontWeight: 700 }}
                >
                  SANGUE 2º CÍRCULO
                </span>
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: VIDEO_THEME.textSecondary,
                  marginTop: 4,
                }}
              >
                Execução: Padrão • Alcance: Toque • Resistência: Fortitude parcial
              </div>
              <div
                style={{
                  marginTop: 6,
                  padding: 7,
                  borderRadius: 8,
                  backgroundColor: VIDEO_THEME.surfaceElevated,
                  fontSize: 10.5,
                  lineHeight: 1.35,
                }}
              >
                Causa <strong style={{ color: '#FDA4AF' }}>6d8 de dano de Sangue</strong> e hemorragia severa. Discente (+3 PE): muda para 10d8.
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: '#FDE047',
                  fontWeight: 700,
                }}
              >
                <span>📖 Livro Base v1.3 • pág. 131</span>
                <span style={{ color: '#FDA4AF' }}>Ver no Livro →</span>
              </div>
            </div>
          </div>
        )}

        {/* Cena 4: Aba Agentes (characters.tsx - Fichas de Agentes) */}
        {screenType === 'agentes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div
              style={{
                padding: 11,
                borderRadius: 13,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    Arthur Cervero
                  </div>
                  <div
                    style={{ fontSize: 10.5, color: '#FDA4AF', fontWeight: 700 }}
                  >
                    Ocultista • Conduíte • Patente: Operador
                  </div>
                </div>
                <div
                  style={{
                    padding: '5px 9px',
                    borderRadius: 9,
                    backgroundColor: 'rgba(220,38,38,0.2)',
                    border: '1px solid #DC2626',
                    fontWeight: 800,
                    fontSize: 12,
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
                  marginTop: 10,
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
                      padding: '5px 4px',
                      borderRadius: 8,
                      backgroundColor: VIDEO_THEME.surfaceElevated,
                      border: `1px solid ${VIDEO_THEME.border}`,
                    }}
                  >
                    <div
                      style={{ fontSize: 9, color: VIDEO_THEME.textSecondary }}
                    >
                      {a.k}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{a.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barras de PV, PE, SAN */}
            {[
              {
                label: 'PONTOS DE VIDA (PV)',
                cur: 36,
                max: 36,
                color: '#EF4444',
              },
              {
                label: 'PONTOS DE ESFORÇO (PE • 7/turno)',
                cur: 56,
                max: 56,
                color: '#F59E0B',
              },
              {
                label: 'SANIDADE (SAN • DT Ritual 21)',
                cur: 55,
                max: 55,
                color: '#38BDF8',
              },
            ].map((bar) => (
              <div
                key={bar.label}
                style={{
                  padding: '8px 11px',
                  borderRadius: 10,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${VIDEO_THEME.border}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    fontWeight: 700,
                  }}
                >
                  <span>{bar.label}</span>
                  <span style={{ color: bar.color }}>
                    {bar.cur}/{bar.max}
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 99,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    marginTop: 5,
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
                padding: 10,
                borderRadius: 11,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#FDA4AF',
                  marginBottom: 6,
                }}
              >
                PERÍCIAS TREINADAS & RITUAIS
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 5,
                  fontSize: 10.5,
                }}
              >
                <div
                  style={{
                    padding: '5px 8px',
                    borderRadius: 7,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                  }}
                >
                  Ocultismo{' '}
                  <strong style={{ color: '#10B981', float: 'right' }}>
                    +10
                  </strong>
                </div>
                <div
                  style={{
                    padding: '5px 8px',
                    borderRadius: 7,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                  }}
                >
                  Vontade{' '}
                  <strong style={{ color: '#10B981', float: 'right' }}>
                    +10
                  </strong>
                </div>
                <div
                  style={{
                    padding: '5px 8px',
                    borderRadius: 7,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                  }}
                >
                  Investigação{' '}
                  <strong style={{ color: '#38BDF8', float: 'right' }}>
                    +5
                  </strong>
                </div>
                <div
                  style={{
                    padding: '5px 8px',
                    borderRadius: 7,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                  }}
                >
                  Iniciativa{' '}
                  <strong style={{ color: '#38BDF8', float: 'right' }}>
                    +5
                  </strong>
                </div>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: VIDEO_THEME.textSecondary,
                }}
              >
                🔮 Rituais: Cicatrização • Decadenza • Eletrocussão • Descarnar
              </div>
            </div>
          </div>
        )}

        {/* Cena 5: Aba Dados (dice.tsx - Rolador Ordem Paranormal) */}
        {screenType === 'dados' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 15,
                backgroundColor: VIDEO_THEME.surface,
                border: `2px solid ${accentColor}`,
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(168,85,247,0.25)',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{ fontSize: 10.5, color: '#E9D5FF', fontWeight: 700 }}
              >
                TESTE DE OCULTISMO (4d20 + 10)
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: '#FAF5FF',
                  margin: '6px 0',
                }}
              >
                {diceTotal}
              </div>
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: 7 }}
              >
                {[14, 7, diceRollNumber, 18].map((d, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '5px 9px',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 12,
                      backgroundColor:
                        i === 2 ? accentColor : VIDEO_THEME.surfaceElevated,
                      color: '#FFF',
                    }}
                  >
                    d20: {d}
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: '#10B981',
                  fontWeight: 800,
                  marginTop: 8,
                }}
              >
                ★ SUCESSO EXTREMO (20 NATURAL)
              </div>
            </div>

            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 7,
              }}
            >
              {['1d20', '2d20', '3d20', '4d20', '2d8+4', '6d6'].map((btn) => (
                <div
                  key={btn}
                  style={{
                    padding: '9px 6px',
                    borderRadius: 10,
                    backgroundColor: VIDEO_THEME.surfaceElevated,
                    border: `1px solid ${VIDEO_THEME.border}`,
                    textAlign: 'center',
                    fontSize: 11.5,
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
                padding: 11,
                borderRadius: 11,
                backgroundColor: VIDEO_THEME.surface,
                border: `1px solid ${VIDEO_THEME.border}`,
                fontSize: 10.5,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{ fontWeight: 800, color: '#C4B5FD', marginBottom: 5 }}
              >
                HISTÓRICO DE ROLAGENS
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '3px 0',
                }}
              >
                <span>Dano Descarnar (6d8)</span>
                <strong style={{ color: '#FDA4AF' }}>34 Sangue</strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '3px 0',
                }}
              >
                <span>Teste de Vontade (4d20+10)</span>
                <strong style={{ color: '#10B981' }}>28 (Sucesso)</strong>
              </div>
            </div>
          </div>
        )}

        {/* Cena 6: Aba Mestre (master.tsx - Central do Mestre & Campanhas) */}
        {screenType === 'mestre' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div
              style={{
                padding: '9px 11px',
                borderRadius: 11,
                backgroundColor: 'rgba(56, 189, 248, 0.14)',
                border: '1px solid #38BDF8',
                fontSize: 11,
                fontWeight: 700,
                color: '#BAE6FD',
              }}
            >
              ⚔️ COMBATE ATIVO • RODADA 3 • VD TOTAL 140
            </div>

            {[
              {
                name: '1. Arthur Cervero',
                init: 24,
                hp: '36/36 PV',
                tag: 'AGENTE',
                col: '#10B981',
              },
              {
                name: '2. Zumbi de Sangue Bestial',
                init: 19,
                hp: '165/200 PV',
                tag: 'AMEAÇA VD 100',
                col: '#E11D48',
              },
              {
                name: '3. Kaiser (Especialista)',
                init: 16,
                hp: '42/48 PV',
                tag: 'AGENTE',
                col: '#38BDF8',
              },
              {
                name: '4. Existido de Conhecimento',
                init: 11,
                hp: '58/90 PV',
                tag: 'AMEAÇA VD 40',
                col: '#F59E0B',
              },
            ].map((row, idx) => (
              <div
                key={idx}
                style={{
                  padding: '9px 11px',
                  borderRadius: 10,
                  backgroundColor: VIDEO_THEME.surface,
                  border: `1px solid ${idx === 0 ? row.col : VIDEO_THEME.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {row.name}
                  </div>
                  <div
                    style={{ fontSize: 9.5, color: row.col, fontWeight: 700 }}
                  >
                    {row.tag}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800 }}>
                    INI {row.init}
                  </div>
                  <div
                    style={{ fontSize: 9.5, color: VIDEO_THEME.textSecondary }}
                  >
                    {row.hp}
                  </div>
                </div>
              </div>
            ))}

            <div
              style={{
                padding: '9px 11px',
                borderRadius: 10,
                backgroundColor: VIDEO_THEME.surfaceElevated,
                border: `1px solid ${VIDEO_THEME.border}`,
                fontSize: 10.5,
                color: VIDEO_THEME.textSecondary,
              }}
            >
              📡 <strong style={{ color: '#F3F4F6' }}>Mesa Virtual da Ordem:</strong> 4 jogadores sincronizados em tempo real
            </div>
          </div>
        )}

        {/* Cena 7: Aba G.L.I.T.C.H. (oracle.tsx - G.L.I.T.C.H. Paranormal) */}
        {screenType === 'oraculo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div
              style={{
                alignSelf: 'flex-end',
                padding: '9px 11px',
                borderRadius: '12px 12px 2px 12px',
                backgroundColor: 'rgba(220, 38, 38, 0.24)',
                border: '1px solid #DC2626',
                fontSize: 11.5,
                maxWidth: '86%',
              }}
            >
              Como funciona o cálculo de DT de rituais para um Ocultista NEX 35%?
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                padding: 11,
                borderRadius: '12px 12px 12px 2px',
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #10B981',
                fontSize: 11,
                lineHeight: 1.38,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  color: '#10B981',
                  fontWeight: 800,
                  marginBottom: 4,
                }}
              >
                [G.L.I.T.C.H. // MOTOR TÁTICO OFFLINE]
              </div>
              Pela regra oficial (Livro Base v1.3, pág. 121):
              <br />
              <strong>DT = 10 + Limite de PE/turno + PRE</strong>.
              <br />• Em NEX 35%, seu limite é <strong>7 PE/turno</strong>.
              <br />• Com PRE 4: <strong>10 + 7 + 4 = DT 21</strong>.
            </div>

            <div
              style={{
                alignSelf: 'flex-end',
                padding: '9px 11px',
                borderRadius: '12px 12px 2px 12px',
                backgroundColor: 'rgba(220, 38, 38, 0.24)',
                border: '1px solid #DC2626',
                fontSize: 11.5,
                maxWidth: '86%',
              }}
            >
              E qual a resistência do Zumbi de Sangue Bestial?
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                padding: 11,
                borderRadius: '12px 12px 12px 2px',
                backgroundColor: VIDEO_THEME.surface,
                border: '1px solid #10B981',
                fontSize: 11,
                lineHeight: 1.38,
              }}
            >
              <strong>Zumbi de Sangue Bestial (VD 100):</strong> Defesa 23, RD 10 balístico/impacto/perfuração, vulnerável a <strong>Morte</strong>.
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
          padding: '7px 4px 12px 4px',
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 20,
                }}
              >
                {tab.iconSvg(tabColor)}

                {/* Badge de contagem nas abas extras ("Mais") igual ao CustomBottomTabBar.tsx */}
                {tab.key === 'more' && !isFocused && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -9,
                      minWidth: 13,
                      height: 13,
                      borderRadius: 7,
                      backgroundColor: VIDEO_THEME.primarySoft,
                      border: `1px solid ${VIDEO_THEME.primary}`,
                      color: VIDEO_THEME.primary,
                      fontSize: 8,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    5
                  </span>
                )}

                {/* Barra vermelha indicadora de foco (focusedIndicator) */}
                {isFocused && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -3,
                      width: 14,
                      height: 2.5,
                      borderRadius: 1.5,
                      backgroundColor: VIDEO_THEME.primary,
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  marginTop: 4,
                  fontSize: 9.5,
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
    clip &&
      staticFiles.some(
        (f) => f.name.replace(/\\/g, '/') === clip.replace(/\\/g, '/')
      )
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
          background:
            'linear-gradient(145deg, #2A3042 0%, #0E1017 55%, #1F2433 100%)',
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
