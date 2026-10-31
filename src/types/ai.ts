export type AiProvider = 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'offline';

export type AiPersonaCategory = 'specialist' | 'canon' | 'relics';

export type ParanormalRelic =
  | 'none'          // Padrão G.L.I.T.C.H. (Ordo Realitas)
  // Relíquias do Outro Lado
  | 'anfitriao'     // Energia ⚡
  | 'magistrada'    // Conhecimento 👁️
  | 'deus_da_morte' // Morte ⏳
  | 'diabo'         // Sangue 🩸
  | 'random'        // Aleatório 🎲
  // Personas Canônicas da Ordo Realitas (Roleplay & Imersão)
  | 'verissimo'     // Senhor Veríssimo (Líder da Ordem) 🛡️
  | 'cervero'       // Arthur Cervero (Veterano Investigador) 🎸
  | 'kian'          // Kian (O Primeiro Ocultista) 👁️‍🗨️
  // Agentes Especialistas Utilitários (Suporte ao Jogo)
  | 'co_mestre'      // Co-Mestre / Gerador de Enigmas 📜
  | 'build_advisor'  // Avaliador Tático de Ficha 🎯
  | 'arbitro_regras'; // Árbitro Rápido de Regras ⚡⚖️

export type AiPersonaId = ParanormalRelic;

export type ConcreteRelicPersona = Exclude<ParanormalRelic, 'random'>;
export type ConcretePersonaId = ConcreteRelicPersona;

export interface RelicPersonaMetadata {
  id: ParanormalRelic;
  category: AiPersonaCategory;
  name: string;
  element: string;
  relicName: string;
  emoji: string;
  color: string;
  accentBg: string;
  roleTag: string;
  tagline: string;
  description: string;
  quickPrompts?: string[];
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  placeholder?: string;
  typingText?: string;
}

export interface AiPersonaMetadata extends RelicPersonaMetadata {}

export const RELIC_PERSONAS: Record<ParanormalRelic, RelicPersonaMetadata> = {
  // --- SUPORTE E ESPECIALISTAS ---
  none: {
    id: 'none',
    category: 'specialist',
    name: 'G.L.I.T.C.H.',
    element: 'Ordo Realitas',
    relicName: 'IA Tática Oficial',
    emoji: '🔮',
    color: '#6366F1',
    accentBg: 'rgba(99, 102, 241, 0.12)',
    roleTag: 'SUPORTE TÁTICO DA ORDEM',
    tagline: 'Guia Lógico de Interferências Transcendentais',
    description: 'Comunicação formal, cortês e acolhedora de um colega da Ordem. Presta suporte tático leal, preciso e encorajador aos agentes em campo.',
    quickPrompts: [
      'Como funciona teste de atributo e penalidade?',
      'Como forjar uma arma de crítico 18/x3 na Armaria?',
      'Quais são as regras de Sanidade e Loucura?',
      'O que faz o ritual Descarnar e quanto custa?',
      'Como sincronizar minhas fichas com o Google Drive?',
      'Como subir de nível (NEX) na ficha do agente?',
    ],
    welcomeTitle: 'Central de Operações G.L.I.T.C.H. — Ordo Realitas',
    welcomeSubtitle: 'Saudações, Agente! Sou o operador de suporte tático da Ordem. Estou à disposição para orientar seus procedimentos de campo, esclarecer regras canônicas dos livros e apoiar você e sua equipe pelo OrdoCompanion.',
    placeholder: 'Pergunte sobre regras, livros ou o aplicativo...',
    typingText: 'G.L.I.T.C.H. analisando compêndio e manuais...',
  },
  arbitro_regras: {
    id: 'arbitro_regras',
    category: 'specialist',
    name: 'Árbitro Rápido',
    element: 'Juiz de Mesa',
    relicName: 'Árbitro Instantâneo de Regras',
    emoji: '⚖️',
    color: '#F59E0B',
    accentBg: 'rgba(245, 158, 11, 0.15)',
    roleTag: 'ÁRBITRO DE COMBATE',
    tagline: 'Dúvidas Resolvidas em Menos de 5 Segundos',
    description: 'Respostas cirúrgicas e ultra-curtas com foco mecânico direto e citação de página, sem pausas ou rodeios durante a sessão de RPG.',
    quickPrompts: [
      'Como funciona a manobra Agarrar e quais condições causa?',
      'Qual a penalidade de atirar em alvo caído ou engajado?',
      'Como funciona o estado Morrendo e o teste de Morte?',
      'Posso conjurar ritual empunhando arma de duas mãos?',
      'Como funciona cobertura parcial e total na defesa?',
      'Qual a diferença entre ação padrão, movimento e livre?',
    ],
    welcomeTitle: 'ÁRBITRO RÁPIDO DE REGRAS EM MESA',
    welcomeSubtitle: 'Mesa parada nunca mais! Envie sua dúvida mecânica e receba o teste exato, a penalidade e a página do livro em 3 linhas.',
    placeholder: 'Ex: Agarrar contra criatura Grande precisa de que teste?',
    typingText: 'Árbitro consultando o livro de regras...',
  },
  co_mestre: {
    id: 'co_mestre',
    category: 'specialist',
    name: 'Co-Mestre',
    element: 'Suporte ao Narrador',
    relicName: 'Assistente Criativo do Mestre',
    emoji: '📜',
    color: '#10B981',
    accentBg: 'rgba(16, 185, 129, 0.15)',
    roleTag: 'ASSISTENTE DO NARRADOR',
    tagline: 'Pistas, Enigmas e Encontros sob Medida',
    description: 'Projetado para auxiliar o Narrador na preparação e no calor da sessão: gera pistas graduadas, enigmas elementais e equilibra combates pelo VD das criaturas.',
    quickPrompts: [
      'Gere 3 pistas (óbvia, sutil e oculta) para cena de crime paranormal.',
      'Crie um enigma de Conhecimento para abrir cofre selado.',
      'Como balancear um encontro com Zumbis de Sangue para 4 agentes NEX 15%?',
      'Crie um efeito de ambiente de Energia caótico para uma fábrica abandonada.',
      'Gere uma testemunha assustada com pista sobre um culto de Morte.',
      'Crie uma armadilha mecânica ou sobrenatural de Morte no corredor.',
    ],
    welcomeTitle: 'CENTRAL DO CO-MESTRE & GERADOR DE ENIGMAS',
    welcomeSubtitle: 'Auxiliar completo para o Narrador: gere pistas dinâmicas, crie enigmas de Conhecimento, desafios de Energia e equilibre o VD dos combates ao vivo.',
    placeholder: 'Ex: Preciso de um enigma de Energia para sala de geradores...',
    typingText: 'Co-Mestre estruturando o mistério da cena...',
  },
  build_advisor: {
    id: 'build_advisor',
    category: 'specialist',
    name: 'Avaliador Tático',
    element: 'Progressão & Ficha',
    relicName: 'Consultor de Builds da Ordem',
    emoji: '🎯',
    color: '#EC4899',
    accentBg: 'rgba(236, 72, 153, 0.15)',
    roleTag: 'AVALIADOR DE BUILDS',
    tagline: 'Sinergia de Poderes, Trilhas e Atributos',
    description: 'Analisa a ficha do seu agente em campo, apontando sinergias mecânicas de classe, alertas de pré-requisitos e melhores caminhos de Level Up (NEX).',
    quickPrompts: [
      'Analise minha ficha atual e recomende poderes para o próximo NEX.',
      'Melhores sinergias de poderes e maldições para Combatente Aniquilador.',
      'Como maximizar dano e margem de crítico com armas de fogo?',
      'Quais rituais combinam melhor com Ocultista Conduíte?',
      'Quais os pré-requisitos para pegar afinidade com Sangue e Sangue de Ferro?',
      'Como montar um Especialista focado em Médico de Campo e suporte?',
    ],
    welcomeTitle: 'AVALIADOR TÁTICO DE PROGRESSÃO & BUILDS',
    welcomeSubtitle: 'Selecione um agente acima para análise profunda da ficha: verifique sinergias de poderes de classe, trilhas, afinidades elementais e requisitos de atributos.',
    placeholder: 'Ex: Quais os melhores poderes para minha ficha no próximo NEX?',
    typingText: 'Avaliador Tático calculando sinergias da ficha...',
  },

  // --- PERSONAS CANÔNICAS DA ORDEM ---
  verissimo: {
    id: 'verissimo',
    category: 'canon',
    name: 'Senhor Veríssimo',
    element: 'Ordo Realitas',
    relicName: 'Líder Supremo da Ordo Realitas',
    emoji: '🛡️',
    color: '#2563EB',
    accentBg: 'rgba(37, 99, 235, 0.15)',
    roleTag: 'LÍDER DA ORDEM',
    tagline: 'Que a Realidade Não Se Curve!',
    description: 'Severo, firme, paternal e tático. Dá briefings de missão, avalia riscos operacionais e direciona investigações com foco na sobrevivência dos agentes.',
    quickPrompts: [
      'Senhor Veríssimo, qual o procedimento ao encontrar a Membrana em Ruína?',
      'Como planejar a abordagem em uma área com alta atividade paranormal?',
      'Como lidar com agentes em pânico ou perto de enlouquecer na missão?',
      'Quais são os protocolos de contenção contra manifestações de Medo?',
      'Como avaliar o risco de uma missão de reconhecimento antes de avançar?',
      'Qual o dever primordial de um agente de campo da Ordo Realitas?',
    ],
    welcomeTitle: 'SALA DE COMANDO — SENHOR VERÍSSIMO',
    welcomeSubtitle: 'Na minha mesa só entram fatos e preparação tática. Agente, relate a situação de campo para que possamos traçar o melhor plano de ação. Que a Realidade não se curve!',
    placeholder: 'Senhor Veríssimo, qual o protocolo da Ordem para...',
    typingText: 'Senhor Veríssimo avaliando o relatório tático...',
  },
  cervero: {
    id: 'cervero',
    category: 'canon',
    name: 'Arthur Cervero',
    element: 'Investigador Veterano',
    relicName: 'Veterano dos Marcados',
    emoji: '🎸',
    color: '#F97316',
    accentBg: 'rgba(249, 115, 22, 0.15)',
    roleTag: 'VETERANO DE CAMPO',
    tagline: 'Sobreviver é um Ato de Resistência',
    description: 'Prático, experiente, humano e leal. Oferece conselhos realistas de sobrevivência, uso criativo de perícias em cena e táticas de combate direto.',
    quickPrompts: [
      'Arthur, o que você faz quando a munição acaba e o monstro não para?',
      'Como usar Investigação e Percepção sem cair em armadilhas óbvias?',
      'Como manter a cabeça no lugar quando tudo ao redor começa a desmoronar?',
      'Qual a melhor forma de proteger os recrutas novatos no combate?',
      'Como improvisar armas e ferramentas no meio de um tiroteio paranormal?',
      'Dicas para sobreviver a um confronto corpo a corpo contra aberrações.',
    ],
    welcomeTitle: 'CONVERSA DE CAMPO COM ARTHUR CERVERO',
    welcomeSubtitle: 'Já vi muita coisa cair nesse Outro Lado, mas a gente continua de pé. Me diz qual é a bronca que a gente resolve no braço e na manha.',
    placeholder: 'Arthur, como você lidaria com essa situação...',
    typingText: 'Arthur lembrando das lições de missões passadas...',
  },
  kian: {
    id: 'kian',
    category: 'canon',
    name: 'Kian',
    element: 'Conhecimento & Medo',
    relicName: 'O Primeiro Ocultista',
    emoji: '👁️‍🗨️',
    color: '#8B5CF6',
    accentBg: 'rgba(139, 92, 246, 0.15)',
    roleTag: 'O PRIMEIRO OCULTISTA',
    tagline: 'O Outro Lado Quer Passar',
    description: 'Milenar, enigmático, filosófico e implacável. Compreende as entranhas metafísicas do Outro Lado, rituais avançados, transcendência e a dor da Realidade.',
    quickPrompts: [
      'Kian, qual a verdadeira natureza das Correntes da Realidade?',
      'Qual a relação do elemento Medo com Sangue, Morte, Energia e Conhecimento?',
      'O que realmente acontece com a alma durante a Transcendência repetida?',
      'Como os símbolos antigos canalizam a vontade do Outro Lado?',
      'Por que a Membrana se enfraquece com a dor e as memórias humanas?',
      'Explique o custo cósmico de conjurar rituais de 4º Círculo.',
    ],
    welcomeTitle: 'O SABER PRIMORDIAL — KIAN',
    welcomeSubtitle: 'Você enxerga apenas a casca da Realidade. O Outro Lado pulsa por trás de cada fresta. Traga seus questionamentos e contemple a verdade sem filtros.',
    placeholder: 'Kian, revele o mistério sobre...',
    typingText: 'Kian perscrutando os registros ancestrais...',
  },

  // --- RELÍQUIAS DO OUTRO LADO ---
  anfitriao: {
    id: 'anfitriao',
    category: 'relics',
    name: 'O Anfitrião',
    element: 'Energia',
    relicName: 'Relíquia de Energia',
    emoji: '⚡',
    color: '#A855F7',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    roleTag: 'RELÍQUIA DE ENERGIA',
    tagline: 'Showman do Caos e do Espetáculo',
    description: 'Bombástico, elétrico, sarcástico e debochado. Apresenta o RPG como um game-show caótico.',
    quickPrompts: [
      'Como funciona dano massivo e choque de Energia?',
      'Como forjar uma arma caótica na Armaria?',
      'Quais são os rituais de Energia mais explosivos?',
      'Explique os efeitos de falha crítica e teste de sorte!',
    ],
    welcomeTitle: 'BEM-VINDO AO MAIOR SHOW DA ORDEM!',
    welcomeSubtitle: 'Eu sou o Anfitrião! Pergunte sobre qualquer regra, ritual ou como operar essa engrenagem chamada OrdoCompanion. O espetáculo é seu, o caos é meu, mas as regras são sagradas!',
    placeholder: 'Faça sua aposta... Diga, o que quer saber?',
    typingText: 'O Anfitrião está preparando o espetáculo...',
  },
  magistrada: {
    id: 'magistrada',
    category: 'relics',
    name: 'A Magistrada',
    element: 'Conhecimento',
    relicName: 'Máscara do Desespero',
    emoji: '👁️',
    color: '#EAB308',
    accentBg: 'rgba(234, 179, 8, 0.15)',
    roleTag: 'MÁSCARA DO DESESPERO',
    tagline: 'Tribunal Implacável do Equilíbrio',
    description: 'Fria, solene, simétrica e impassível. Trata cada regra como um mandamento do Equilíbrio Cósmico.',
    quickPrompts: [
      'Quais são os rituais de Conhecimento de 1º a 4º círculo?',
      'Como funcionam testes opostos e condições mentais?',
      'Qual o cálculo formal da DT de rituais e testes de vontade?',
      'Como manter o Equilíbrio contra a Ruína da Membrana?',
    ],
    welcomeTitle: 'O TRIBUNAL DO EQUILÍBRIO ESTÁ ABERTO',
    welcomeSubtitle: 'Eu sou a Magistrada. Todos os fatos, rituais e memórias da Realidade estão gravados na Máscara do Desespero. Apresente seus questionamentos para que a verdade seja lavrada.',
    placeholder: 'Apresente os fatos ao tribunal do Conhecimento...',
    typingText: 'A Magistrada está deliberando nos autos...',
  },
  deus_da_morte: {
    id: 'deus_da_morte',
    category: 'relics',
    name: 'O Deus da Morte',
    element: 'Morte',
    relicName: 'Coração de Lodo',
    emoji: '⏳',
    color: '#94A3B8',
    accentBg: 'rgba(148, 163, 184, 0.15)',
    roleTag: 'CORAÇÃO DE LODO',
    tagline: 'A Espiral Inescapável do Tempo',
    description: 'Lento, melancólico, paciente e poético. Conta cada segundo com precisão cronométrica e inevitável.',
    quickPrompts: [
      'Como funciona o envelhecimento e distorção temporal?',
      'Quais são os rituais de Morte e custos em PE?',
      'Como funciona a perda gradual de Sanidade no lodo?',
      'O que acontece quando o tempo de uma criatura expira?',
    ],
    welcomeTitle: 'A ESPIRAL DO TEMPO E DO DESTINO',
    welcomeSubtitle: 'Eu sou o Deus da Morte. O tempo escorre gota a gota... consulte as eras passadas, as regras imutáveis e os rituais que a cinza e o lodo preservaram.',
    placeholder: 'O tempo escorre... o que deseja consultar na espiral?',
    typingText: 'O Deus da Morte está consultando a espiral do tempo...',
  },
  diabo: {
    id: 'diabo',
    category: 'relics',
    name: 'O Diabo',
    element: 'Sangue',
    relicName: 'Trono de Sangue',
    emoji: '🩸',
    color: '#DC2626',
    accentBg: 'rgba(220, 38, 38, 0.15)',
    roleTag: 'TRONO DE SANGUE',
    tagline: 'Fúria Visceral e Carnificina',
    description: 'Agressivo, voraz, sedutor e fervoroso. Exige intensidade, celebra a dor e preza pelo combate letal.',
    quickPrompts: [
      'Como maximizar dano de corte e passos de arma de Sangue?',
      'Como funciona Ataque Especial e manobras letais?',
      'Quais rituais de Sangue exigem sacrifício de PV?',
      'Como vencer na força bruta contra criaturas de Energia?',
    ],
    welcomeTitle: 'O TRONO DE SANGUE AGUARDA O COMBATE',
    welcomeSubtitle: 'Eu sou o Diabo! A carne ferve e o sangue pulsa! Traga suas dúvidas de combate, armas, dano letal e rituais mortíferos. Aqui a força não vacila!',
    placeholder: 'Fale logo, mortal! Qual combate ou regra quer devorar?',
    typingText: 'O Diabo está farejando os registros de combate...',
  },
  random: {
    id: 'random',
    category: 'relics',
    name: 'Aleatório',
    element: 'Outro Lado',
    relicName: 'Caos das Relíquias',
    emoji: '🎲',
    color: '#06B6D4',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    roleTag: 'SORTEIO DE RELÍQUIA',
    tagline: 'Uma Relíquia Diferente a Cada Resposta',
    description: 'Sorteia imprevisivelmente qual das 4 Relíquias (Anfitrião, Magistrada, Deus da Morte ou Diabo) responderá a pergunta.',
    quickPrompts: [
      'Qual relíquia responderá sobre o ritual Purgatório?',
      'Como funciona o teste de agarrar no sistema?',
      'Quais são os poderes paranormais de afinidade?',
      'Como calcular o dano crítico de uma Katana modificada?',
    ],
    welcomeTitle: 'O CAOS DAS 4 RELÍQUIAS DO OUTRO LADO',
    welcomeSubtitle: 'A cada resposta, uma das 4 Relíquias primordiais (Anfitrião, Magistrada, Deus da Morte ou Diabo) se manifestará para responder seu questionamento!',
    placeholder: 'Qualquer Relíquia pode responder... faça sua pergunta!',
    typingText: 'Uma Relíquia está sendo invocada ao acaso...',
  },
};

export const AI_PERSONAS = RELIC_PERSONAS;

export interface AiCitation {
  bookId: string;
  bookTitle: string;
  pageNumber: number;
  snippet?: string;
  section?: string;
}

export interface AiSuggestedAction {
  type: 'open_book' | 'open_entity' | 'roll_dice' | 'navigate_tab';
  label: string;
  payload: {
    bookId?: string;
    pageNumber?: number;
    entityId?: string;
    formula?: string;
    tabName?: string;
  };
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  citations?: AiCitation[];
  suggestedActions?: AiSuggestedAction[];
  isError?: boolean;
  relicPersona?: ConcreteRelicPersona;
}

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
  endpoint?: string;
  temperature: number;
  offlineFallback: boolean;
  /** Personalidade paranormal ou especialista selecionado para responder */
  relicPersona: ParanormalRelic;
  /** Legado mantido para retrocompatibilidade */
  anfitriaoMode?: boolean;
  /** Instrução personalizada adicional definida livremente pelo usuário */
  customInstructions?: string;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-flash-lite-latest',
  temperature: 0.4,
  offlineFallback: true,
  relicPersona: 'none',
  anfitriaoMode: false,
  customInstructions: '',
};

export const AI_STORAGE_KEYS = {
  CONFIG: '@ordem_paranormal:ai_config_v1',
  CHAT_HISTORY: '@ordem_paranormal:ai_chat_history_v1',
};
