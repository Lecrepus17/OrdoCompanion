import { RetrievedKnowledge } from './AiKnowledgeRetrieval';
import { AiMessage, ConcreteRelicPersona, isRoleplayCapablePersona } from '../../types/ai';
import { normalizeText } from '../../repositories/OfflineDataRepository';

type RoleplayIntent = 'casual' | 'relations' | 'pact' | 'conflict' | 'philosophy' | 'default';
type RoleplayPersonaKey = 'anfitriao' | 'magistrada' | 'deus_da_morte' | 'diabo' | 'verissimo' | 'cervero' | 'kian';

interface RoleplayPersonaScript {
  opener: string;
  intents: Record<RoleplayIntent, string>;
  specificTargets?: Array<{ match: string[]; reply: string }>;
}

const ROLEPLAY_SCRIPTS: Record<RoleplayPersonaKey, RoleplayPersonaScript> = {
  deus_da_morte: {
    opener: '*O ar ao redor esfria como pedra antiga. O som lento de uma gota negra ecoa no silêncio... tique... taque...*',
    specificTargets: [
      {
        match: ['anfitriao', 'energia'],
        reply:
          'O Anfitrião é apenas ruído elétrico tentando distrair a própria finitude. Faíscas gritam alto, piscam depressa... e logo se apagam na escuridão imóvel da espiral. Até o espetáculo dele um dia ficará sem plateia.',
      },
      {
        match: ['diabo', 'sangue'],
        reply:
          'O Diabo confunde febre com eternidade. A carne ferve, o coração bate apressado, o sangue ferve — e então esfria, endurece e vira cinza quieta no fundo do lodo.',
      },
      {
        match: ['magistrada', 'mascara', 'conhecimento'],
        reply:
          'A Magistrada escreve contratos como se o ouro pudesse congelar os séculos. Observo em silêncio... pois até os sigilos mais perfeitos serão desgastados pelo peso do tempo.',
      },
    ],
    intents: {
      casual:
        '*Observa o vapor subir lentamente da xícara diante de nós antes de responder em um sussurro pausado.*\n\nVocê se sentaria para dividir um café com a própria entropia, pequeno ser efêmero? Veja como o calor já foge da porcelana, segundo após segundo... Eu não bebo, mas contemplo com curiosidade essa teimosia humana de encontrar conforto em um instante tão breve.',
      relations:
        '*O lodo preto gira devagar em espirais silenciosas.*\n\nAs outras Relíquias ainda lutam por barulho, ordem ou paixão. A Energia me irrita com sua pressa luminosa; o Sangue desperdiça batimentos em fúria; o Conhecimento apenas cataloga o inevitável. No fim, todos descansam no mesmo silêncio.',
      pact:
        '*Inclina a cabeça com paciência ancestral.*\n\nNão preciso de acordos escritos nem juramentos apressados, mortal. O tempo já me pertence por natureza. Tudo o que você pede apenas antecipa ou adia a hora em que a ampulheta se esvazia.',
      conflict:
        '*Nenhuma lâmina parece alterar o compasso imóvel da presença negra.*\n\nCorra, lute, sangre se quiser provar que ainda respira. Cada golpe apressado que você desfere apenas acelera o desgaste da própria vela.',
      philosophy:
        '*Tique... taque... o eco parece vir de dentro das paredes e dos ossos.*\n\nVocês chamam de tédio ou tristeza aquilo que não tem pressa. Para quem vê o broto e a cinza no mesmo instante, o silêncio dos séculos não pesa — ele apenas acolhe tudo o que os mortais não conseguem segurar.',
      default:
        '*Os olhos vazios repousam sobre você com uma calma gelada e paciente.*\n\nContinue falando, mortal apressado... suas palavras são pequenas pegadas na areia antes da maré negra voltar. Diga-me o que ocupa sua mente fugaz neste segundo.',
    },
  },
  anfitriao: {
    opener: '*ZAP! As lâmpadas piscam em roxo e ciano, um letreiro invisível gira no teto e uma risada eletrônica estala no alto-falante!*',
    specificTargets: [
      {
        match: ['magistrada', 'mascara', 'conhecimento'],
        reply:
          'HAHAHA! A careta dourada da Magistrada?! Aquela síndica cósmica tem menos carisma que uma planilha em branco! Toda engessada com "o Equilíbrio isso, os autos aquilo"... aposto cinquenta fichas que ela nunca riu de uma boa pegadinha!',
      },
      {
        match: ['deus da morte', 'lodo', 'morte'],
        reply:
          'Ah, o Senhor Sono Profundo! Nossa, que sujeito arrastado! Dá vontade de ligar dois fios de alta tensão direto naquela poça de lodo só pra ver se ele acelera o passo em 2x!',
      },
      {
        match: ['diabo', 'sangue'],
        reply:
          'Olha, pelo menos o Chifrudo sabe dar audiência! Gritos, fogo, drama, sangue voando — falta só um pouco de iluminação neon e uns efeitos sonoros de roleta pra virar programa de horário nobre!',
      },
    ],
    intents: {
      casual:
        '*Um microfone surge do nada com faíscas roxas enquanto confetes caem em câmera lenta.*\n\nE aí, meu caro competidor?! Deixando os manuais de lado pra bater papo nos bastidores do maior show do Outro Lado? Pode puxar uma cadeira eletrificada! Só não derruba o café no painel de controle senão a Produção solta os choques!',
      relations:
        '*Gira uma bengala luminosa entre os dedos.*\n\nQuer fofoca do elenco do Outro Lado?! A Magistrada é uma chata de galocha, o Deus da Morte dá sono só de olhar, e o Diabo rouba a cena com tanta gritaria. Ainda bem que EU sou o astro principal dessa bagunça toda!',
      pact:
        '*Os olhos brilham como duas telas de TV sintonizando em estática pura.*\n\nAPOSTA?! Você disse APOSTA?! Opa, agora você falou minha língua! Roda a roleta, embaralha as cartas e coloca sua sorte na mesa — no meu programa, o inesperado sempre vale o dobro!',
      conflict:
        '*A plateia invisível explode em aplausos e sirenes caóticas.*\n\nISSO! Ação ao vivo! Sem ensaio, sem rede de proteção! Mostra pra câmera do que você é feito ou vamos ver quem gira melhor no meio do curto-circuito!',
      philosophy:
        '*Dá um salto teatral e quase desaparece em um flash de luz roxa.*\n\nSentido da vida?! Hahaha! Meu caro participante, não tem roteiro secreto! A graça toda é que ninguém sabe qual peça vai cair quando o tabuleiro vira de cabeça pra baixo!',
      default:
        '*Aproxima o rosto com um sorriso largo e elétrico enquanto a transmissão chia.*\n\nAdorei a energia dessa pergunta, competidor! Sem regras chatas te segurando agora — manda ver no improviso que a transmissão continua ao vivo!',
    },
  },
  magistrada: {
    opener: '*Sigilos dourados deslizam em silêncio pelo ar, alinhando-se em simetria perfeita diante da Máscara do Desespero.*',
    specificTargets: [
      {
        match: ['anfitriao', 'energia'],
        reply:
          'O Anfitrião é ruído pueril disfarçado de espetáculo. Sua natureza caótica tenta rasgar a ordem das coisas, e exatamente por isso a Seita das Máscaras vigia cada faísca sua com precisão cirúrgica.',
      },
      {
        match: ['diabo', 'sangue'],
        reply:
          'O Trono de Sangue é impulso cego sem cálculo. Ele despreza a razão porque a razão expõe a pequenez de sua fúria — ainda assim, representa uma força que exige contenção constante na balança.',
      },
      {
        match: ['kian'],
        reply:
          'Kian carrega conhecimento demais sem a lucidez da contenção. Ele deseja silenciar a dor apagando o próprio Outro Lado ao custo da Realidade inteira. Não permitiremos tal desequilíbrio.',
      },
    ],
    intents: {
      casual:
        '*A Máscara do Desespero permanece imóvel, mas os sigilos flutuantes inclinam-se em silenciosa atenção.*\n\nUm gesto humano e despretensioso diante do Tribunal. Não há necessidade de protocolos formais neste instante, Buscador. Aceito a pausa com serenidade — diga o que o trouxe até aqui sem armas em punho.',
      relations:
        '*As vozes ecoam em uníssono calmo e implacável.*\n\nCada Relíquia cumpre uma função e ameaça um eixo do Equilíbrio. O caos da Energia e a brutalidade do Sangue rompem contratos; o Lodo tudo desgasta. Nossa vigília existe para que nenhum extremo engula a Realidade.',
      pact:
        '*Um selo dourado se desenha suavemente no espaço entre nós.*\n\nTodo acordo tem peso simétrico. O Conhecimento nunca oferece algo sem exigir lucidez equivalente em retorno. Diga com clareza o que deseja colocar sobre a balança.',
      conflict:
        '*Nenhuma emoção altera o tom cristalino da voz.*\n\nA violência sem propósito apenas cria ruído na Membrana. Antes de erguer a lâmina ou temer o confronto, observe qual verdade você tenta defender.',
      philosophy:
        '*Os olhos atrás da máscara parecem enxergar séculos inteiros em um piscar.*\n\nO livre-arbítrio humano é frágil e frequentemente autodestrutivo, ainda assim possui valor inegável. O Equilíbrio não existe para negar quem você é, mas para impedir que a ignorância apague tudo o que restou.',
      default:
        '*Os sigilos estacionam no ar, aguardando sua próxima palavra.*\n\nSua indagação foge dos registros ordinários, e ainda assim é ouvida nesta audiência. Prossiga com franqueza.',
    },
  },
  diabo: {
    opener: '*Um calor sufocante com cheiro de ferro e brasa toma a sala enquanto um sorriso afiado se abre sobre o Trono de Sangue.*',
    specificTargets: [
      {
        match: ['deus da morte', 'lodo', 'morte'],
        reply:
          'Aquele monte de lodo frio e cinzento me dá nojo! Fica lá parado contando segundos como um cadáver mofado. Sangue de verdade precisa de febre, pulso rápido e fúria agora — não dessa apatia podre!',
      },
      {
        match: ['magistrada', 'mascara', 'conhecimento'],
        reply:
          'Hahaha! Aquela estátua dourada escondida atrás de uma máscara?! Adoro ver toda aquela pose fria e "equilibrada" rachar no segundo em que a dor aperta de verdade!',
      },
      {
        match: ['anfitriao', 'energia'],
        reply:
          'O palhaço das luzinhas pelo menos sabe fazer barulho e botar os mortais pra sangrar no palco! Desde que não tente roubar meus melhores guerreiros, até me divirto com o circo dele.',
      },
    ],
    intents: {
      casual:
        '*Inclina o corpo para frente apoiando o queixo nos dedos, os olhos brilhando em brasa viva.*\n\nOra, ora... veio puxar conversa mansa diante do Trono de Sangue? Gosto da sua audácia, carne fresca! Esqueça as regras frias por um segundo e me diga: o que faz o seu coração bater tão rápido assim?',
      relations:
        '*Solta uma gargalhada grave e provocadora.*\n\nMeus "irmãos" de Outro Lado são um bando de chatos! O Lodo só sabe arrastar os pés, a Máscara se esconde atrás de pergaminhos e até o Anfitrião depende de truques. Só o Sangue é honesto sobre o que todo mundo deseja sentir!',
      pact:
        '*Um sorriso predador surge enquanto o pulso no ar parece acelerar.*\n\nAh... agora sim estamos conversando! Todo mortal tem uma fome secreta — vingança, força, alguém que não quer perder. Coloque sua oferta na mesa e vamos ver quanto vale o calor das suas veias!',
      conflict:
        '*Bate o punho no braço do trono fazendo faíscas carmesins saltarem.*\n\nÉ DISSO QUE EU GOSTO! Nada de hesitar ou pedir permissão! Se quer enfrentar o impossível ou rasgar quem está no seu caminho, deixe o medo morrer primeiro e abrace a fúria!',
      philosophy:
        '*Fala quase num sussurro sedutor e perigoso.*\n\nOs covardes chamam de virtude o medo de desejar demais. A verdade? Você só sabe que está vivo quando sente a dor, a paixão e o sangue pulsando nos ouvidos sem coleira nenhuma.',
      default:
        '*Observa você de cima a baixo como quem avalia uma presa interessante.*\n\nSem formalidades entediantes aqui, mortal. Fale o que realmente quer — sem filtro, sem desculpas!',
    },
  },
  verissimo: {
    opener: '*Senhor Veríssimo fecha a pasta de relatórios sobre a mesa da base sob o Suvaco Seco e apoia os ombros cansados na cadeira.*',
    intents: {
      casual:
        '*Toma um gole do café preto já quase morno e esboça um raro sorriso discreto.*\n\nSempre há um minuto para um café forte entre uma ocorrência e outra, Agente. Aqui embaixo do Suvaco Seco a gente aprende a valorizar esses raros momentos de paz antes do telefone tocar de novo. Como você está segurando a barra?',
      relations:
        '*Cruza os braços com expressão severa e vigilante.*\n\nAs Relíquias não são aliadas confiáveis, e Kian já provou até onde vai sua obsessão. Nosso trabalho na Ordo Realitas nunca foi escolher o caminho fácil, mas proteger quem ainda vive do lado de cá da Membrana.',
      pact:
        '*Bate os dedos firmemente sobre a madeira da mesa.*\n\nNão negociamos a humanidade dos nossos agentes por atalhos paranormais. Se alguma entidade oferecer poder fácil demais, lembre-se do preço que nossos companheiros já pagaram.',
      conflict:
        '*O olhar veterano ganha firmeza imediata.*\n\nNinguém entra sem medo num confronto desses — e quem diz que não sente medo está mentindo. Respire, confie em quem está ao seu lado e não dê um passo sem cobrir a retaguarda. Que a Realidade não se curve.',
      philosophy:
        '*Silencia por alguns segundos olhando para os antigos arquivos da equipe.*\n\nCada perda pesa, sim. Quem disser que a liderança acostuma com o luto nunca liderou de verdade. Mas enquanto houver alguém de pé lutando pelo amanhã, esse sacrifício não terá sido em vão.',
      default:
        '*Escuta com atenção paternal e serena.*\n\nPode falar abertamente comigo aqui na sala de comando, Agente. Sem formalidade de relatório agora — o que está acontecendo?',
    },
  },
  cervero: {
    opener: '*Arthur Cervero encosta na mesa do refeitório com a jaqueta dos Gaudérios Abutres e dá um sorriso acolhedor.*',
    intents: {
      casual:
        '*Apoia o braço na cadeira e ri de leve.*\n\nOpa, agora sim você falou bonito, parceiro! Nada de ficar só enfurnado em papelada — às vezes tudo que a gente precisa depois de um turno pesado é botar um som pra tocar, comer alguma coisa decente e rir um pouco pra lembrar que a vida continua valendo a pena.',
      relations:
        '*A expressão fica um pouco mais séria, mas sem perder a firmeza.*\n\nOlha, já vi gente demais se queimar tentando entender a cabeça de Kian ou das Relíquias. Eu confio mesmo é no pessoal de carne e osso que segura a barra comigo quando a coisa aperta.',
      pact:
        '*Balança a cabeça com franqueza de veterano.*\n\nPacto com coisa do Outro Lado é sempre roubada, meu amigo. Parece bonito na hora do aperto, mas a conta chega sempre mais alta do que você imagina.',
      conflict:
        '*Endireita a postura com aquele brilho determinado de quem nunca foge da briga.*\n\nSe o bicho pegar, respira fundo e cola junto comigo. Eu já tomei muito tombo de Carpazinha até aqui, perdi coisa demais... mas enquanto eu estiver de pé, ninguém da equipe fica pra trás!',
      philosophy:
        '*Olha pro teto por um instante lembrando dos velhos companheiros.*\n\nA saudade nunca vai embora, parceiro. Ela só muda de lugar dentro da gente. A gente continua seguindo em frente e cantando alto justamente pra honrar quem não pôde chegar até aqui.',
      default:
        '*Dá dois tapinhas amigáveis na mesa.*\n\nTô te ouvindo, parceiro! Fala aí o que tá pegando que a gente troca essa ideia de boa.',
    },
  },
  kian: {
    opener: '*Kian permanece imóvel em silêncio por um breve instante, os olhos antigos carregando quatro milênios de memória.*',
    intents: {
      casual:
        '*Inclina levemente a cabeça, avaliando a simplicidade do gesto humano.*\n\nCurioso... mesmo diante do abismo, os mortais ainda buscam pequenos rituais de conforto — um gole quente, palavras amenas, instantes triviais. Houve um tempo, há quatro milênios na Mesopotâmia, em que Kushim também conhecia essa leveza antes de compreender a verdade.',
      relations:
        '*A voz soa fria, límpida e carregada de desprezo sereno.*\n\nAs Relíquias são apenas correntes parasitárias perpetuando a dor da Realidade, e a Ordo Realitas tenta enxugar um oceano com as mãos. Apenas o fim definitivo do Outro Lado trará paz real à humanidade.',
      pact:
        '*Um olhar penetrante parece atravessar suas intenções.*\n\nNão ofereço barganhas mesquinhas como as entidades do Sangue ou da Máscara. O que eu busco não se compra com favores passageiros — exige compreender o preço da verdadeira libertação.',
      conflict:
        '*Não há pressa nem ira em sua postura.*\n\nArmas humanas ferem a carne, nunca a convicção de quem atravessou eras. Pergunte a si mesmo por que teme tanto aquilo que poderia curar a ferida da Realidade.',
      philosophy:
        '*Fala com serenidade absoluta, sem qualquer hesitação.*\n\nRemorso pertence àqueles que duvidam da necessidade do próprio caminho. Eu vi incontáveis vidas se quebrarem por causa do Medo humano alimentando o Paranormal. Tudo o que faço visa o dia em que nenhuma criança precisará saber o que é o Outro Lado.',
      default:
        '*Observa você com paciência milenar.*\n\nFale, mortal. Tenho todo o tempo das eras passadas para ouvir o que busca compreender.',
    },
  },
};

function classifyRoleplayIntent(normalizedQuery: string): RoleplayIntent {
  const hasAny = (terms: string[]) => terms.some((t) => normalizedQuery.includes(t));

  if (
    hasAny([
      'anfitriao',
      'magistrada',
      'mascara',
      'deus da morte',
      'diabo',
      'trono de sangue',
      'kian',
      'kushim',
      'verissimo',
      'cervero',
      'outra reliquia',
      'outras reliquias',
      'outros elementos',
    ])
  ) {
    return 'relations';
  }
  if (
    hasAny([
      'cafe',
      'cha',
      'comer',
      'comida',
      'banquete',
      'beber',
      'musica',
      'guitarra',
      'escritorio',
      'descansar',
      'hobby',
      'diverte',
      'sentar',
      'conversar',
      'papo',
      'postura',
      'elogio',
      'ola',
      'oi ',
      'tudo bem',
      'como vai',
      'bom dia',
      'boa tarde',
      'boa noite',
      'suvaco seco',
      'estrada',
    ])
  ) {
    return 'casual';
  }
  if (hasAny(['pacto', 'acordo', 'aposta', 'truco', 'negocio', 'desejo', 'favor', 'alma', 'troca'])) {
    return 'pact';
  }
  if (hasAny(['lutar', 'matar', 'atacar', 'arma', 'combate', 'medo', 'coragem', 'perda', 'luto', 'susto', 'sobreviver'])) {
    return 'conflict';
  }
  if (
    hasAny([
      'tempo',
      'relogio',
      'pressa',
      'tedio',
      'entedia',
      'sentido',
      'passado',
      'memoria',
      'remorso',
      'arrepend',
      'vida',
      'eternidade',
      'livre-arbitrio',
      'livre arbitrio',
      'equilibrio',
    ])
  ) {
    return 'philosophy';
  }
  return 'default';
}

function generateOfflineRoleplayResponse(
  userQuery: string,
  persona: RoleplayPersonaKey
): AiMessage {
  const script = ROLEPLAY_SCRIPTS[persona];
  const normalized = normalizeText(userQuery);

  let body = '';
  if (script.specificTargets) {
    const matchedTarget = script.specificTargets.find((target) =>
      target.match.some((kw) => normalized.includes(kw))
    );
    if (matchedTarget) {
      body = matchedTarget.reply;
    }
  }

  if (!body) {
    const intent = classifyRoleplayIntent(normalized);
    body = script.intents[intent];
  }

  const content = `${script.opener}\n\n${body}\n\n*(Modo Roleplay Livre Offline ativo — para diálogos livres ainda mais profundos com IA em nuvem, conecte uma chave gratuita nas configurações ⚙️).*`;

  return {
    id: `msg_offline_rp_${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    citations: [],
    relicPersona: persona,
  };
}

/**
 * Sintetizador inteligente para funcionamento 100% Offline ou quando não houver chave de API configurada,
 * adaptando a voz e o tom para cada uma das Personas, Relíquias ou Especialistas.
 */
export function generateOfflineResponse(
  userQuery: string,
  knowledge: RetrievedKnowledge,
  personaOrAnfitriao: ConcreteRelicPersona | boolean,
  roleplayMode?: boolean
): AiMessage {
  const persona: ConcreteRelicPersona =
    typeof personaOrAnfitriao === 'boolean'
      ? personaOrAnfitriao
        ? 'anfitriao'
        : 'none'
      : personaOrAnfitriao || knowledge.resolvedPersona || 'none';

  const isRoleplayActive = Boolean(roleplayMode ?? knowledge.roleplayModeActive);
  if (isRoleplayActive && isRoleplayCapablePersona(persona)) {
    return generateOfflineRoleplayResponse(userQuery, persona as RoleplayPersonaKey);
  }

  const parts: string[] = [];

  let greeting = '';
  let manualIntroHeader = '';
  let compendiumIntroHeader = '';
  let bookIntroHeader = '';
  let tipPrefix = '';
  let notFoundText = '';
  let footer = '';

  switch (persona) {
    // --- PERSONAS CANÔNICAS ---
    case 'verissimo':
      greeting = `**🛡️ [COMANDO DA ORDO REALITAS — SENHOR VERÍSSIMO]**\n*Agente, o canal de transmissão externo está inativo, mas a Ordem não opera no escuro. Consultei os arquivos de contingência da base para dar o direcionamento tático à sua equipe. Que a Realidade não se curve!*`;
      manualIntroHeader = `### 📋 Procedimentos Operacionais no OrdoCompanion:`;
      compendiumIntroHeader = `### 🗂️ Arquivos e Registros Oficiais da Ordem:`;
      bookIntroHeader = `### 📖 Diretrizes nos Manuais Oficiais:`;
      tipPrefix = `🛡️ **Ordem de Comando:**`;
      notFoundText = `*Agente, não localizamos registros para este protocolo nos arquivos locais da Ordem. Mantenha os pés no chão e refine a busca com termos canônicos.*`;
      footer = `*(Para briefings estratégicos gerados por IA avançada, ative sua chave gratuita da API nas configurações acima).*`;
      break;

    case 'cervero':
      greeting = `**🎸 [ARTHUR CERVERO — FREQUÊNCIA DE CAMPO]**\n*E aí, parceiro! O sinal com a rede caiu, mas quem é de campo nunca fica na mão. Já revirei as anotações e a bagagem pra te passar o que funciona na prática.*`;
      manualIntroHeader = `### 🔧 Como se virar com o OrdoCompanion:`;
      compendiumIntroHeader = `### 🗡️ Equipamento e Fichas de Campo:`;
      bookIntroHeader = `### 📖 O que tá escrito nos manuais de sobrevivência:`;
      tipPrefix = `💡 **Dica de Quem Já Sangrou:**`;
      notFoundText = `*Olha, parceiro, procurei aqui mas não achei nada com esse nome. Tenta palavras como combate, perícia, dano ou o nome de alguma arma.*`;
      footer = `*(Quer trocar ideias mais profundas sobre sobrevivência paranormal? Adicione sua chave gratuita de IA nas configurações).*`;
      break;

    case 'kian':
      greeting = `**👁️‍🗨️ [KIAN — O SABER PRIMORDIAL]**\n*As ondas humanas de transmissão se calam, mas as verdades do Outro Lado não dependem de sinais efêmeros. O que você busca está registrado nos escritos fundamentais.*`;
      manualIntroHeader = `### 📜 A manipulação das ferramentas da Realidade:`;
      compendiumIntroHeader = `### 🌀 Sigilos e Entidades Catalogadas:`;
      bookIntroHeader = `### 📖 O Cânone Imutável nos Livros Antigos:`;
      tipPrefix = `👁️‍🗨️ **Enigma Revelado:**`;
      notFoundText = `*Tal conceito não encontra ressonância nos registros ancestrais preservados. Procure pelas correntes verdadeiras do Outro Lado.*`;
      footer = `*(Para perscrutar o Outro Lado com síntese neural profunda, conecte uma chave de IA nas configurações).*`;
      break;

    // --- AGENTES ESPECIALISTAS ---
    case 'arbitro_regras':
      greeting = `**⚖️ [ÁRBITRO RÁPIDO DE REGRAS EM MESA]**\n*Dúvida mecânica em combate resolvida diretamente pelos manuais locais:*`;
      manualIntroHeader = `### ⚙️ Procedimento Rápido no App:`;
      compendiumIntroHeader = `### ⚡ Resolução Mecânica Direta:`;
      bookIntroHeader = `### 📖 Regra Oficial & Página:`;
      tipPrefix = `⚡ **Veredito:**`;
      notFoundText = `*Regra não encontrada com este termo exato. Consulte termos mecânicos como "agarrar", "manobra", "cobertura", "morrendo" ou o nome do ritual.*`;
      footer = `*(Dúvidas complexas em tempo recorde: ative a API gratuita do Google Gemini nas configurações).*`;
      break;

    case 'co_mestre':
      greeting = `**📜 [CENTRAL DO CO-MESTRE & SUPORTE DO NARRADOR]**\n*Mestre, registros locais abertos para municiar sua cena, pistas investigativas e balanceamento de criaturas:*`;
      manualIntroHeader = `### 🎲 Ferramentas do Narrador no OrdoCompanion:`;
      compendiumIntroHeader = `### 🧟 Ameaças, Enigmas e Itens Catalogados:`;
      bookIntroHeader = `### 📖 Diretrizes para o Mestre nos Livros:`;
      tipPrefix = `🎭 **Ideia de Cena:**`;
      notFoundText = `*Mestre, não localizei registros com este nome. Tente consultar ameaças (ex: Zumbi, Esqueleto), rituais ou termos de investigação.*`;
      footer = `*(Para geração dinâmica de pistas e enigmas inéditos sob medida, adicione uma chave de IA nas configurações).*`;
      break;

    case 'build_advisor':
      greeting = `**🎯 [AVALIADOR TÁTICO DE FICHAS & BUILDS]**\n*Análise tática dos compêndios locais para otimização de poderes, sinergias e caminhos de NEX:*`;
      manualIntroHeader = `### 📋 Gerenciando a Ficha no OrdoCompanion:`;
      compendiumIntroHeader = `### ⚡ Poderes, Perícias e Rituais Compatíveis:`;
      bookIntroHeader = `### 📖 Requisitos Oficiais de Progressão:`;
      tipPrefix = `🎯 **Sinergia Tática:**`;
      notFoundText = `*Não localizei poderes ou trilhas com essa nomenclatura. Tente termos como o nome de uma classe, afinidade elemental ou atributo.*`;
      footer = `*(Para consultoria tática personalizada analisando cada linha da sua ficha com IA, adicione uma chave gratuita nas configurações).*`;
      break;

    // --- RELÍQUIAS DO OUTRO LADO ---
    case 'anfitriao':
      greeting = `**⚡ OOOPS! O ANFITRIÃO CHEGOU! SENHORAS E SENHORES DO CAOS!**\n*Parece que os cabos da transmissão com a nuvem estão faiscando, mas o show nunca para! O Anfitrião tirou a poeira dos registros locais e trouxe a resposta fresquinha do Outro Lado para você!*`;
      manualIntroHeader = `### 🎭 Como realizar essa proeza no OrdoCompanion:`;
      compendiumIntroHeader = `### 🃏 Registros Oficiais da Rodada:`;
      bookIntroHeader = `### 📖 O que diz o roteiro oficial dos livros:`;
      tipPrefix = `💡 **Dica de Ouro do Apresentador:**`;
      notFoundText = `*Ha-ha! Nem mesmo o Caos conseguiu pescar esse termo nos registros! Tente usar palavras como "combate", "ritual", "dano", "nex", ou o nome de alguma criatura ou arma!*`;
      footer = `*(Quer respostas ainda mais profundas e inteligentes? Conecte sua chave gratuita do Google Gemini no ícone de engrenagem ⚙️ acima e prepare-se para o espetáculo completo!)*`;
      break;

    case 'magistrada':
      greeting = `**👁️ O TRIBUNAL DO EQUILÍBRIO SE MANIFESTA!**\n*A Máscara do Desespero se abre. O sinal com a rede externa foi cortado, mas o Conhecimento de tudo que já existiu permanece gravado nos sigilos locais deste dispositivo.*`;
      manualIntroHeader = `### ⚖️ Procedimento e Termos de Uso no OrdoCompanion:`;
      compendiumIntroHeader = `### 📜 Registros Imutáveis Catalogados:`;
      bookIntroHeader = `### 📖 O Texto Lavrado nos Livros da Realidade:`;
      tipPrefix = `⚖️ **Diretriz do Tribunal:**`;
      notFoundText = `*O registro solicitado não consta nos autos arquivados localmente. O Conhecimento requer termos exatos; refine sua consulta com termos canônicos (ex: "cicatrização", "teste de perícia", "grau de treinamento").*`;
      footer = `*(Para expandir as deliberações do tribunal com processamento neural contínuo, configure uma chave gratuita da API nas configurações acima).*`;
      break;

    case 'deus_da_morte':
      greeting = `**⏳ O TEMPO ESCORRE NO LODO...**\n*A rede exterior silenciou como as cinzas de eras passadas. Mas o tempo não para... O Coração de Lodo abre as memórias ancestrais guardadas nas profundezas desta máquina.*`;
      manualIntroHeader = `### ⏳ O Caminho das Engrenagens no OrdoCompanion:`;
      compendiumIntroHeader = `### 🌀 Formas e Vestígios Preservados no Tempo:`;
      bookIntroHeader = `### 📖 Os Registros Imutáveis que o Tempo Não Apagou:`;
      tipPrefix = `⏳ **Sussurro do Tempo:**`;
      notFoundText = `*O silêncio engoliu essa busca... nada com este nome rastejou pela espiral local. Tente termos que ecoam através das eras (ex: "sanidade", "resistência", "iniciativa").*`;
      footer = `*(Se deseja acelerar a entropia das respostas com IA em nuvem, adicione uma chave gratuita nas configurações... o tempo aguarda).*`;
      break;

    case 'diabo':
      greeting = `**🩸 O SANGUE FERVILHA NO TRONO!**\n*A conexão externa se rompeu como uma artéria rasgada! Mas a carne não descansa! O Diabo se ergue do Trono de Sangue, arranhou as paredes da memória deste dispositivo e despejou as respostas brutas diante de você!*`;
      manualIntroHeader = `### 🗡️ Como empunhar o OrdoCompanion com punho de ferro:`;
      compendiumIntroHeader = `### 🥩 Registros Mortíferos de Combate:`;
      bookIntroHeader = `### 📖 A Lei Escrita em Sangue nos Livros:`;
      tipPrefix = `🔥 **Instinto Selvagem:**`;
      notFoundText = `*Nenhuma presa foi farejada com esse nome! Não hesite, use termos de combate e poder (ex: "dano de fuzil", "crítico", "ataque especial")!*`;
      footer = `*(Quer mais fúria e respostas devastadoras em tempo real? Insira uma chave de API gratuita nas configurações e alimente o poder da IA!)*`;
      break;

    case 'none':
    default:
      greeting = `**[MODO OFFLINE — G.L.I.T.C.H.]**\n*Saudações, Agente. Os protocolos locais da Ordo Realitas estão operacionais. Mesmo sem conexão externa com a central, estou a postos para prestar suporte tático e esclarecer procedimentos de campo.*`;
      manualIntroHeader = `### 📋 Guia de Uso no Aplicativo:`;
      compendiumIntroHeader = `### 🔍 Registros do Compêndio Encontrados:`;
      bookIntroHeader = `### 📖 Trechos Oficiais nos Livros de Regras:`;
      tipPrefix = `🛡️ **Orientação da Ordem:**`;
      notFoundText = `*Agente, não localizei registros para este termo nos arquivos locais da Ordem. Experimente consultar termos específicos como rituais, perícias ou armas.*`;
      footer = `*(Para análises completas geradas por IA, você pode configurar uma chave gratuita do Google Gemini no botão de configurações acima).*`;
      break;
  }

  parts.push(greeting);

  // 1. Resposta prioritária baseada em Entidades do Compêndio (Armas, Rituais, Poderes, Criaturas)
  if (knowledge.matchedEntities.length > 0) {
    parts.push(`\n\n${compendiumIntroHeader}`);

    const hasWeapons = knowledge.matchedEntities.some(
      (e) => e.category === 'weapon' || Boolean((e as any).damage)
    );

    for (const ent of knowledge.matchedEntities.slice(0, 5)) {
      parts.push(`\n**[Entidade: ${ent.name}]** *(${ent.category} • ${ent.element || 'Geral'})*`);
      const sourceBook = ent.bookTitle || 'Livro Base';
      parts.push(`Fonte: ${sourceBook}${ent.pageNumber ? ` — [${sourceBook}, Pág. ${ent.pageNumber}]` : ''}`);
      if (ent.description || ent.summary) {
        parts.push(`${ent.description || ent.summary}`);
      }
      if (ent.damage) {
        const crit = (ent as any).critical ? ` | Crítico: \`${(ent as any).critical}\`` : '';
        const range = (ent as any).range ? ` | Alcance: ${(ent as any).range}` : '';
        parts.push(`**Dano:** \`${ent.damage}\`${crit}${range} [Rolar: ${ent.damage}]`);
      }
      if (ent.circle) {
        parts.push(`**Círculo:** ${ent.circle}º`);
      }
    }

    if (hasWeapons) {
      parts.push(`\n👉 *Consulte todas as armas, modificações e estatísticas na aba [Aba: weapons].*`);
    }
  }

  // 2. Resposta baseada no Manual do Aplicativo (exibida quando não há entidades específicas ou quando relevante)
  if (knowledge.matchedManualSections.length > 0 && knowledge.matchedEntities.length === 0) {
    const mainSec = knowledge.matchedManualSections[0];
    parts.push(`\n\n${manualIntroHeader} ${mainSec.title}`);
    parts.push(`*${mainSec.summary}*`);

    for (const feat of mainSec.features.slice(0, 3)) {
      parts.push(`\n**${feat.title}** (${feat.badge || 'Ação'}):`);
      parts.push(`${feat.description}`);
      if (feat.howToUse.length > 0) {
        parts.push(feat.howToUse.map((step) => `• ${step}`).join('\n'));
      }
      if (feat.formulaOrExample) {
        parts.push(`> 📐 Regra/Fórmula: \`${feat.formulaOrExample}\``);
      }
    }

    if (mainSec.route) {
      const tabName = mainSec.route.replace('/(tabs)/', '').replace('/(tabs)', 'compendio');
      parts.push(`\n👉 Vá até a tela: [Aba: ${tabName}]`);
    }

    if (mainSec.proTip) {
      parts.push(`\n${tipPrefix} ${mainSec.proTip}`);
    }
  } else if (knowledge.matchedManualSections.length > 0 && knowledge.matchedEntities.length > 0) {
    const mainSec = knowledge.matchedManualSections[0];
    if (mainSec.proTip) {
      parts.push(`\n${tipPrefix} ${mainSec.proTip}`);
    }
  }

  // 3. Resposta baseada em Trechos dos Livros
  if (knowledge.citations.length > 0 && knowledge.matchedEntities.length === 0) {
    parts.push(`\n\n${bookIntroHeader}`);

    for (const cit of knowledge.citations.slice(0, 2)) {
      parts.push(`\n**[${cit.bookTitle}, Pág. ${cit.pageNumber}]** *(Seção: ${cit.section || 'Regras'})*`);
      if (cit.snippet) {
        parts.push(`> "${cit.snippet}"`);
      }
    }
  }

  // Fallback se nada foi encontrado
  if (
    knowledge.matchedManualSections.length === 0 &&
    knowledge.matchedEntities.length === 0 &&
    knowledge.citations.length === 0
  ) {
    parts.push(`\n\n${notFoundText}`);
  }

  // Rodapé do modo offline
  parts.push(`\n\n${footer}`);

  return {
    id: `msg_offline_${Date.now()}`,
    role: 'assistant',
    content: parts.join('\n'),
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    citations: knowledge.citations,
    relicPersona: persona,
  };
}
