export interface SceneCopy {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  clip?: string;
  durationInFrames: number; // 30fps
  accentColor: string;
  showFloatingCta?: boolean;
  screenType?: 'home' | 'compendio' | 'agentes' | 'dados' | 'mestre' | 'oraculo';
}

export const COPY = {
  appName: 'ORDO COMPANION',
  appTagline: 'O grimório tático de Ordem Paranormal',
  repoReleasesUrl: 'github.com/Lecrepus17/OrdoCompanion/releases/latest',
  repoFullUrl: 'https://github.com/Lecrepus17/OrdoCompanion/releases/latest',

  // Frases oficiais definidas no plano
  highlightPhrase:
    'Feito por um fã, para a comunidade de Ordem Paranormal. Gratuito e open source.',
  ctaPhrase: 'Baixe o APK gratuito → GitHub Releases',
  ctaShort: 'Baixe grátis no GitHub Releases',

  // Cenas do Storyboard (~45s = 1350 frames a 30fps, compensando transições de fade)
  scenes: {
    intro: {
      id: 'intro',
      tag: ' TRANSMISSÃO INTERCEPTADA // ORDO REALITAS ',
      title: 'O Outro Lado está mais perto do que você imagina.',
      subtitle: 'SINAL PARANORMAL DETECTADO • PROTOCOLO VERISSIMO',
      durationInFrames: 130, // ~4.3s (0-4s)
      accentColor: '#DC2626',
    },
    home: {
      id: 'home',
      tag: '01 // CENTRAL DO AGENTE',
      title: 'ORDO COMPANION',
      subtitle: 'O grimório tático de Ordem Paranormal',
      clip: 'clips/home.mp4',
      durationInFrames: 165, // ~5.5s (4-9s)
      accentColor: '#DC2626',
      screenType: 'home' as const,
    },
    compendio: {
      id: 'compendio',
      tag: '02 // ACERVO PARANORMAL',
      title: '10 suplementos oficiais. Tudo na palma da mão.',
      subtitle: '1.367 registros indexados: rituais, ameaças, armas, poderes e itens amaldiçoados.',
      clip: 'clips/compendio.mp4',
      durationInFrames: 225, // ~7.5s (9-16s)
      accentColor: '#F59E0B',
      screenType: 'compendio' as const,
    },
    agentes: {
      id: 'agentes',
      tag: '03 // DOSSIÊ DE RECRUTAMENTO',
      title: 'Fichas com regras calculadas automaticamente',
      subtitle: 'Agente Arthur Cervero • Ocultista NEX 35% • PV, PE, SAN e DT calculados em tempo real.',
      clip: 'clips/agentes.mp4',
      durationInFrames: 225, // ~7.5s (16-23s)
      accentColor: '#E11D48',
      screenType: 'agentes' as const,
    },
    dados: {
      id: 'dados',
      tag: '04 // ROLADOR TÁTICO',
      title: 'Rolagens oficiais, na hora',
      subtitle: 'Testes de perícia com bônus de atributo, dano crítico e histórico instantâneo.',
      clip: 'clips/dados.mp4',
      durationInFrames: 165, // ~5.5s (23-28s)
      accentColor: '#A855F7',
      showFloatingCta: true,
      screenType: 'dados' as const,
    },
    mestre: {
      id: 'mestre',
      tag: '05 // COMANDO DE OPERAÇÕES',
      title: 'Ferramentas para o Mestre e mesa multiplayer',
      subtitle: 'Rastreador de iniciativa, escudo de regras, gerador de missões e sincronização.',
      clip: 'clips/mestre.mp4',
      durationInFrames: 195, // ~6.5s (28-34s)
      accentColor: '#38BDF8',
      screenType: 'mestre' as const,
    },
    oraculo: {
      id: 'oraculo',
      tag: '06 // TERMINAL G.L.I.T.C.H.',
      title: 'Uma IA paranormal ao seu lado',
      subtitle: 'Consultor tático de regras com motor 100% offline integrado ao compêndio.',
      clip: 'clips/oraculo.mp4',
      durationInFrames: 165, // ~5.5s (34-39s)
      accentColor: '#10B981',
      showFloatingCta: true,
      screenType: 'oraculo' as const,
    },
    end: {
      id: 'end',
      tag: ' PROJETO ABERTO PARA A COMUNIDADE ',
      title: 'Feito por um fã, para a comunidade de Ordem Paranormal. Gratuito e open source.',
      subtitle: 'Baixe o APK gratuito → GitHub Releases',
      durationInFrames: 185, // ~6.1s (39-45s)
      accentColor: '#DC2626',
    },
  },
} as const;
