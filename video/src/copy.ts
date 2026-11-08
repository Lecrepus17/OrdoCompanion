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

  // Créditos da trilha sonora
  musicCredit: '🎵 Música: Sub_Clair',
  musicAuthorBio:
    'Sub_Clair — A Kazakh music producer with over 200 million streams on music platforms. Worked with Sony, Pepsi, Lexus and other big companies.',

  // Frases oficiais definidas no plano
  highlightPhrase:
    'Feito por um fã, para a comunidade de Ordem Paranormal. Gratuito e open source.',
  ctaPhrase: 'Baixe o APK gratuito → GitHub Releases',
  ctaShort: 'Baixe grátis no GitHub Releases',

  // Cenas do Storyboard (~45s = 1350 frames a 30fps, sincronizadas com os drops da música em 4.0s e 23.5s)
  scenes: {
    intro: {
      id: 'intro',
      tag: ' TRANSMISSÃO INTERCEPTADA // ORDO REALITAS ',
      title: 'O Outro Lado está mais perto do que você imagina.',
      subtitle: 'SINAL PARANORMAL DETECTADO • PROTOCOLO VERISSIMO',
      durationInFrames: 128, // Transição cravada no drop de 4.0s (frame 120)
      accentColor: '#DC2626',
    },
    home: {
      id: 'home',
      tag: '01 // COMPÊNDIO PARANORMAL',
      title: 'ORDO COMPANION',
      subtitle: 'O grimório tático de Ordem Paranormal',
      clip: 'clips/home.mp4',
      durationInFrames: 165, // ~5.5s (4-9s)
      accentColor: '#DC2626',
      screenType: 'home' as const,
    },
    compendio: {
      id: 'compendio',
      tag: '02 // ACERVO DE LIVROS (10 PDFs)',
      title: '10 suplementos oficiais. Tudo na palma da mão.',
      subtitle: 'Livro Base v1.3, Sobrevivendo ao Horror e Arquivos Secretos indexados com busca instantânea.',
      clip: 'clips/compendio.mp4',
      durationInFrames: 225, // ~7.5s (9-16s)
      accentColor: '#F59E0B',
      screenType: 'compendio' as const,
    },
    agentes: {
      id: 'agentes',
      tag: '03 // FICHAS DE AGENTES',
      title: 'Fichas com regras calculadas automaticamente',
      subtitle: 'Agente Arthur Cervero • Ocultista NEX 35% • PV, PE, SAN e DT calculados em tempo real.',
      clip: 'clips/agentes.mp4',
      durationInFrames: 232, // Transição cravada no segundo drop em 23.5s (frame 705)
      accentColor: '#E11D48',
      screenType: 'agentes' as const,
    },
    dados: {
      id: 'dados',
      tag: '04 // ROLADOR ORDEM PARANORMAL',
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
      tag: '05 // CENTRAL DO MESTRE & MESA',
      title: 'Ferramentas para o Mestre e mesa multiplayer',
      subtitle: 'Campanhas, rastreador de iniciativa, cenas de investigação e Mesa Virtual da Ordem.',
      clip: 'clips/mestre.mp4',
      durationInFrames: 195, // ~6.5s (28-34s)
      accentColor: '#38BDF8',
      screenType: 'mestre' as const,
    },
    oraculo: {
      id: 'oraculo',
      tag: '06 // G.L.I.T.C.H. PARANORMAL',
      title: 'Uma IA paranormal ao seu lado',
      subtitle: 'Consultor tático de regras com motor 100% offline integrado ao Compêndio.',
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
      durationInFrames: 180, // Total 1455 - 105 (7*15) = 1350 frames (45.0s exatos)
      accentColor: '#DC2626',
    },
  },
} as const;
