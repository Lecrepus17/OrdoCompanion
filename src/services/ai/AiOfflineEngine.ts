import { RetrievedKnowledge } from './AiKnowledgeRetrieval';
import { AiMessage, ConcreteRelicPersona } from '../../types/ai';

/**
 * Sintetizador inteligente para funcionamento 100% Offline ou quando não houver chave de API configurada,
 * adaptando a voz e o tom para cada uma das Personas, Relíquias ou Especialistas.
 */
export function generateOfflineResponse(
  userQuery: string,
  knowledge: RetrievedKnowledge,
  personaOrAnfitriao: ConcreteRelicPersona | boolean
): AiMessage {
  const persona: ConcreteRelicPersona =
    typeof personaOrAnfitriao === 'boolean'
      ? personaOrAnfitriao
        ? 'anfitriao'
        : 'none'
      : personaOrAnfitriao || knowledge.resolvedPersona || 'none';

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

  // 1. Resposta baseada no Manual do Aplicativo (como fazer algo no app)
  if (knowledge.matchedManualSections.length > 0) {
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
  }

  // 2. Resposta baseada em Entidades do Compêndio
  if (knowledge.matchedEntities.length > 0) {
    parts.push(`\n\n${compendiumIntroHeader}`);

    for (const ent of knowledge.matchedEntities.slice(0, 3)) {
      parts.push(`\n**[Entidade: ${ent.name}]** *(${ent.category} • ${ent.element || 'Geral'})*`);
      const sourceBook = ent.bookTitle || 'Livro Base';
      parts.push(`Fonte: ${sourceBook}${ent.pageNumber ? ` — [${sourceBook}, Pág. ${ent.pageNumber}]` : ''}`);
      parts.push(`${ent.description || ent.summary || ''}`);
      if (ent.damage) {
        parts.push(`**Dano:** \`${ent.damage}\` [Rolar: ${ent.damage}]`);
      }
      if (ent.circle) {
        parts.push(`**Círculo:** ${ent.circle}º`);
      }
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
