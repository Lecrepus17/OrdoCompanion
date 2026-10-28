export interface ManualFeatureItem {
  id: string;
  title: string;
  badge?: string;
  description: string;
  howToUse: string[];
  formulaOrExample?: string;
}

export interface ManualSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route?: string;
  badge: string;
  summary: string;
  purpose: string;
  features: ManualFeatureItem[];
  proTip: string;
  keywords: string[];
}

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    title: 'Visão Geral & Primeiros Passos',
    subtitle: 'Conheça a estrutura e a proposta do OrdoCompanion',
    icon: 'compass-outline',
    route: '/(tabs)',
    badge: 'Início',
    summary:
      'O OrdoCompanion é a central digital definitiva para jogadores e mestres de Ordem Paranormal RPG. Ele une uma base canônica de 1.367 entidades extraídas de 10 livros, leitor com 1.261 páginas de PDFs, fichas automáticas de agentes, oficina de armas, rolador oficial de dados e sincronização segura com Google Drive.',
    purpose:
      'Proporcionar consultas instantâneas durante as sessões presenciais ou online, dispensando o manuseio demorado de múltiplos PDFs pesados, garantindo cálculos exatos de combate e ficha sem erros de regras.',
    features: [
      {
        id: 'ov-navigation',
        title: 'Navegação Completa pelas 9 Telas do Aplicativo',
        badge: 'Interface & Abas',
        description:
          'O OrdoCompanion conta com 9 telas completas: Compêndio Geral, Fichas de Agentes, Armaria & Modificações, Acervo de Livros, Rolador de Dados, Salvos & Homebrew, Central do Mestre, Mesa Virtual (VTT) e G.L.I.T.C.H. (IA). A barra inferior exibe abas fixadas com suporte a personalização.',
        howToUse: [
          'Toque em qualquer ícone da barra de navegação inferior para alternar de tela instantaneamente.',
          'Toque no botão "Mais" (ícone com três pontos) na barra de abas para acessar telas adicionais ou personalizar quais abas ficam fixadas.',
          'No topo de qualquer tela, use o botão de Acesso Rápido ao G.L.I.T.C.H. (ícone de brilho/faísca roxa) para consultar a IA a qualquer momento.',
          'Use o botão de Ajuda (ícone de interrogação) no cabeçalho superior para reabrir este manual já posicionado na seção da tela atual.',
          'Use o botão de Paleta de Cores para escolher entre os 7 temas paranormais imersivos.',
          'Use o botão de Perfil de Jogador para configurar seus dados, gerenciar abas e sincronizar com o Google Drive.',
        ],
      },
      {
        id: 'ov-offline',
        title: 'Funcionamento 100% Offline',
        badge: 'Offline Nativo',
        description:
          'Todos os 1.367 registros, cálculos, fichas de agentes e armas ficam armazenados localmente no seu dispositivo através do AsyncStorage.',
        howToUse: [
          'Você pode abrir e usar o app em qualquer lugar, mesmo sem sinal de internet ou Wi-Fi.',
          'Apenas a renderização de páginas de PDFs remotos e a sincronização com o Google Drive necessitam de conexão quando requisitadas.',
        ],
      },
      {
        id: 'ov-toast',
        title: 'Toast Global de Rolagem de Dados',
        badge: 'HUD Global',
        description:
          'Sempre que você rolar um dado em qualquer parte do app (ficha de personagem, arma ou compêndio), um card flutuante surge no topo exibindo o resultado em tempo real.',
        howToUse: [
          'O card exibe o nome do teste, o total obtido, os dados individuais e indicações de Crítico (20) ou Desastre (1).',
          'Toque no botão "Dispensar" ou toque no resultado para fechá-lo.',
        ],
      },
    ],
    proTip:
      'Configure seu perfil clicando no ícone de Agente no topo direito para vincular seu nome de jogador e ativar a sincronização em nuvem antes de criar suas primeiras fichas!',
    keywords: [
      'inicio',
      'comecar',
      'visao geral',
      'introducao',
      'offline',
      'navegacao',
      'abas',
      'guia',
      'toast',
      'ordem paranormal',
    ],
  },
  {
    id: 'compendium',
    title: 'Compêndio Geral & Busca Instantânea',
    subtitle: 'Consulte 1.367 entidades oficiais e homebrew em milissegundos',
    icon: 'search-outline',
    route: '/(tabs)',
    badge: 'Compêndio',
    summary:
      'O Compêndio é a biblioteca mestra do aplicativo. Reúne rituais, poderes, origens, classes, trilhas, armas, itens, criaturas, perícias, condições e regras de todos os 10 suplementos oficiais com busca fonética sem acentos.',
    purpose:
      'Encontrar qualquer regra, custo de PE de ritual, habilidade de criatura ou item em segundos durante o calor do combate.',
    features: [
      {
        id: 'cp-search',
        title: 'Busca Textual Sem Acentos e Inteligente',
        badge: 'Busca Rápida',
        description:
          'A pesquisa ignora acentos, cedilhas e diferenças entre maiúsculas e minúsculas. Procura no título, descrição mecânica e livro.',
        howToUse: [
          'Digite termos como "cicatrizacao", "odio incontrolavel", "degolificada" ou "mira laser".',
          'Os resultados são atualizados instantaneamente conforme você digita.',
          'Toque no "X" ao lado da barra para limpar a pesquisa rapidamente.',
        ],
        formulaOrExample: 'Exemplo: buscar "deflagracao" encontra "Deflagração de Energia".',
      },
      {
        id: 'cp-categories',
        title: 'Filtro por Categorias',
        badge: 'Categorização',
        description:
          'Carrossel superior com ícones e cores dedicadas para cada uma das 11 categorias oficiais.',
        howToUse: [
          'Toque em "Rituais", "Poderes", "Criaturas", "Armas", "Itens", "Origens", "Trilhas", etc.',
          'Selecione "Todos" para pesquisar na base inteira sem restrições.',
        ],
      },
      {
        id: 'cp-elements',
        title: 'Filtro por Elemento Paranormal',
        badge: 'Elementos',
        description:
          'Filtre entidades associadas aos quatro elementos do Outro Lado e ao Medo.',
        howToUse: [
          'Selecione Sangue (vermelho), Morte (preto/cinza), Conhecimento (dourado), Energia (roxo) ou Medo (branco espectral).',
          'Ideal para jogadores de Ocultista que procuram rituais ou poderes com afinidade específica.',
        ],
      },
      {
        id: 'cp-classes',
        title: 'Filtro por Classe Aplicável',
        badge: 'Classes',
        description:
          'Permite isolar poderes, trilhas e equipamentos específicos de cada classe.',
        howToUse: [
          'Toque em "Combatente", "Especialista", "Ocultista" ou "Sem classe" para restringir os registros ao escopo do seu agente.',
        ],
      },
      {
        id: 'cp-books',
        title: 'Filtro por Livros & Suplementos',
        badge: 'Multilivros',
        description:
          'Escolha quais dos 10 livros canônicos devem compor a busca atual.',
        howToUse: [
          'Abra o seletor de livros para marcar ou desmarcar: Livro Base, Sobrevivendo ao Horror e Arquivos Secretos 01 a 09.',
          'Útil quando o mestre da mesa permite apenas livros específicos na campanha.',
        ],
      },
      {
        id: 'cp-exclusions',
        title: 'Filtros de Exclusão Rápida',
        badge: 'Filtro Tático',
        description:
          'Oculte regras gerais de capítulos, histórias de missões ou ameaças quando quiser apenas itens e poderes de jogador.',
        howToUse: [
          'Ative os botões de exclusão "Ocultar Regras & Capítulos" ou "Ocultar Histórias" para focar nas regras operacionais.',
        ],
      },
      {
        id: 'cp-ver-livro',
        title: 'Botão "Ver no Livro" na Íntegra',
        badge: 'Páginas Originais',
        description:
          'Cada card possui um botão com ícone de documento que abre imediatamente a página correspondente no PDF original do livro.',
        howToUse: [
          'Toque no botão "Ver no Livro" em qualquer card para inspecionar a ilustração, diagramação original e texto ao redor.',
        ],
      },
      {
        id: 'cp-columns',
        title: 'Alternância de Colunas (1 ou 2 Colunas)',
        badge: 'Layout',
        description:
          'Alterne entre visualização detalhada em lista única ou grade compacta em 2 colunas para telas grandes ou tablets.',
        howToUse: [
          'Toque no botão com ícone de colunas ao lado dos filtros para alternar instantaneamente.',
        ],
      },
    ],
    proTip:
      'Dentro do card de qualquer ritual ou monstro, se houver uma fórmula de dados (como 4d8+4), há um botão para rolar o dano imediatamente sem precisar abrir a aba de dados!',
    keywords: [
      'compendio',
      'busca',
      'pesquisa',
      'filtro',
      'categorias',
      'rituais',
      'poderes',
      'criaturas',
      'itens',
      'armas',
      'ver no livro',
      'elementos',
    ],
  },
  {
    id: 'characters',
    title: 'Fichas de Agentes',
    subtitle: 'Gerencie agentes com cálculos automáticos e rolagem com 1 toque',
    icon: 'people-outline',
    route: '/(tabs)/characters',
    badge: 'Agentes',
    summary:
      'Crie e gerencie fichas completas de personagens com cálculo automático de PV, PE, Sanidade, Defesa, Bloqueio, Esquiva, limites de itens por patente e rolagem direta de todas as 28 perícias oficiais.',
    purpose:
      'Manter a ficha do agente sempre atualizada e ágil, calculando estatísticas e rolando testes oficiais com um simples toque.',
    features: [
      {
        id: 'ch-crud',
        title: 'Criação e Gestão de Múltiplas Fichas',
        badge: 'Gerenciamento',
        description:
          'Crie quantos agentes desejar, duplique personagens para criar backups de evolução ou remova agentes antigos.',
        howToUse: [
          'Toque no botão "+ Novo Agente" no topo da tela.',
          'Para editar uma ficha existente, toque no card do agente.',
          'Use os botões de "Duplicar" para clonar a ficha ou "Excluir" com confirmação de segurança.',
        ],
      },
      {
        id: 'ch-header',
        title: 'Criação Manual vs Assistida e Progressão de NEX',
        badge: 'Criação & NEX',
        description:
          'Crie agentes de duas formas: "Criar Manual" (liberdade total de edição, incluindo PV, PE e SAN máximos) ou "Criar Assistido" (guia passo a passo pelas regras oficiais). Para avançar de nível, use o botão "+5% NEX (Assistido)".',
        howToUse: [
          'No modo Manual, você pode editar diretamente atributos, perícias e digitar qualquer valor máximo para PV, PE e Sanidade.',
          'No modo Assistido, o app orienta a escolha de Origem, Classe, distribuição de 4 pontos de atributos, perícias da classe e rituais de 5% NEX.',
          'Ao tocar em "+5% NEX (Assistido)", o app calcula os ganhos de PV/PE/SAN, limite de PE por rodada, DT de rituais e guia a seleção de Trilha (10%), Poderes (15%, 30%...), Atributos (+1) e Graus de Treinamento.',
        ],
      },
      {
        id: 'ch-stats',
        title: 'Estatísticas Vitais e Ajuste Livre de Máximos',
        badge: 'Combate & Status',
        description:
          'Controle de PV Atual/Máximo, PE Atual/Máximo, Sanidade Atual/Máxima, Defesa e Deslocamento.',
        howToUse: [
          'Ajuste os pontos atuais durante o combate com os botões rápidos (+1, +5, -1, -5).',
          'Toque em "Editar Máx" no Status Vital para alterar livremente a quantidade máxima de PV, PE ou Sanidade (ideal para bônus de itens, maldições, poderes ou homebrews).',
          'A Defesa é calculada como 10 + Agilidade + Bônus de Equipamento e Outros.',
        ],
      },
      {
        id: 'ch-skills',
        title: 'Tabela das 28 Perícias Oficiais com Rolagem com 1 Toque',
        badge: 'Perícias',
        description:
          'Lista completa com graus de treinamento: Destreinado (+0), Treinado (+5), Veterano (+10) e Expert (+15), além de bônus customizados e penalidade de carga.',
        howToUse: [
          'Alterne o grau de treino tocando nos botões (0, +5, +10, +15).',
          'Toque no ícone de dado ao lado de qualquer perícia para rolar instantaneamente o teste oficial (rola N d20 pelo atributo correspondente e soma o bônus).',
          'Perícias com penalidade de armadura ajustam-se automaticamente se equipado.',
        ],
      },
      {
        id: 'ch-attacks',
        title: 'Ataques & Armas Vinculadas',
        badge: 'Armamento',
        description:
          'Vincule armas criadas na Armaria ou cadastre armas manuais com fórmula de dano, crítico e alcance.',
        howToUse: [
          'Toque em "Vincular da Armaria" para puxar suas armas customizadas já calculadas.',
          'Toque em "Rolar Ataque" para testar o acerto ou "Rolar Dano" para aplicar o dano da arma com 1 clique.',
        ],
      },
      {
        id: 'ch-rituals',
        title: 'Rituais & Habilidades Paranormais',
        badge: 'Rituais',
        description:
          'Cadastre seus rituais aprendidos indicando Círculo (1º ao 4º), Custo de PE, Execução, Alcance, Duração e Resistência.',
        howToUse: [
          'Toque em "Adicionar Ritual" para preencher os dados ou importar do Compêndio.',
          'Ao rolar o efeito, a fórmula é avaliada na hora.',
        ],
      },
      {
        id: 'ch-inventory',
        title: 'Inventário e Limite de Carga por Patente',
        badge: 'Carga & Patente',
        description:
          'Monitora espaços ocupados versus capacidade de carga máxima, além de alertar sobre limites de itens por categoria conforme a Patente.',
        howToUse: [
          'Cadastre itens com categoria (0 a IV) e espaços.',
          'O card avisa em vermelho caso você ultrapasse os espaços suportados ou a cota de itens de categoria alta permitida pela Ordem.',
        ],
      },
      {
        id: 'ch-print',
        title: 'Impressão Oficial em PDF A4',
        badge: 'Exportação',
        description:
          'Exporte a ficha completa em PDF de alta qualidade formatada nos layouts Livro Base ou Sobrevivendo ao Horror.',
        howToUse: [
          'Toque no botão "Imprimir / Exportar Ficha" no topo do editor de personagem.',
          'Escolha o modelo desejado e imprima diretamente ou salve o PDF.',
        ],
      },
      {
        id: 'ch-share',
        title: 'Compartilhamento Portátil via Código de Ficha',
        badge: 'Portabilidade',
        description:
          'Compartilhe seu agente com o mestre ou com outros jogadores gerando um código seguro compactado (ORDO-SHEET), sem necessitar de cadastro ou internet.',
        howToUse: [
          'No card do agente ou dentro da ficha, toque em "Compartilhar Ficha" para copiar o código portátil.',
          'No celular do mestre ou de outro jogador, toque em "Importar Ficha" e cole o código para carregar o personagem com 100% de integridade mecânica.',
        ],
      },
    ],
    proTip:
      'Durante as sessões, mantenha a tela da sua ficha aberta e role seus ataques e perícias diretamente tocando no ícone do dado. O resultado aparecerá no Toast do topo e ficará registrado no Histórico!',
    keywords: [
      'fichas',
      'agentes',
      'personagens',
      'atributos',
      'pericias',
      'pv',
      'pe',
      'sanidade',
      'patente',
      'nex',
      'imprimir',
      'ataques',
      'inventario',
    ],
  },
  {
    id: 'master',
    title: 'Central do Mestre & Campanhas',
    subtitle: 'Gerencie campanhas, monstros, cenas de investigação e fichas de jogadores',
    icon: 'shield-half-outline',
    route: '/(tabs)/master',
    badge: 'Mestre',
    summary:
      'Painel definitivo para Mestres de Ordem Paranormal RPG. Permite criar e alternar entre múltiplas campanhas, organizar briefing e pistas investigativas, gerenciar monstros e criaturas (com controle de PV em combate), e conectar fichas dos jogadores tanto de forma manual quanto via código de compartilhamento.',
    purpose:
      'Centralizar todo o controle narrativo e mecânico da mesa em uma única tela fluida, dispensando anotações soltas de papel e agilizando combates e investigações.',
    features: [
      {
        id: 'mst-campaigns',
        title: 'Criação e Gestão de Campanhas',
        badge: 'Campanhas',
        description:
          'Cadastre o título da missão, subtítulo, nível de ameaça recomendado (Iniciante a Extremo), patente sugerida e anotações secretas do mestre.',
        howToUse: [
          'Toque em "Nova Campanha" no topo da tela para criar uma mesa.',
          'Alterne entre campanhas no carrossel superior.',
          'Escreva segredos e revelações no campo de Anotações Secretas do Mestre.',
        ],
      },
      {
        id: 'mst-stories',
        title: 'História, Cenas & Pistas Investigativas',
        badge: 'Investigação',
        description:
          'Divida a missão em cenas e capítulos. Adicione pistas e documentos a cada cena com controle de revelação.',
        howToUse: [
          'Toque em "Nova Cena" para definir o resumo e os detalhes para o mestre narrar.',
          'Adicione pistas à cena e marque a caixa de seleção quando os agentes as encontrarem.',
        ],
      },
      {
        id: 'mst-monsters',
        title: 'Monstros & Combate Rápido',
        badge: 'Ameaças',
        description:
          'Importe criaturas oficiais do Compêndio com 1 clique ou cadastre ameaças customizadas com VD, PV, Defesa e ataques.',
        howToUse: [
          'Toque em "Compêndio" para buscar e importar qualquer monstro oficial dos livros.',
          'Ou toque em "Criar Ameaça" para cadastrar um monstro original.',
          'Durante o combate, utilize os botões rápidos (-10, -5, +5, etc.) para alterar os PVs dos monstros em tempo real.',
          'Toque no ícone de marcador para salvar monstros originais no Compêndio Geral como Homebrew.',
        ],
      },
      {
        id: 'mst-agents',
        title: 'Agentes da Mesa (Manual ou Vinculado)',
        badge: 'Jogadores',
        description:
          'Gerencie a equipe de investigadores com dois métodos: cadastro manual de NPCs/jogadores ou vínculo de fichas de outros usuários via código de compartilhamento.',
        howToUse: [
          'Para fichas de outros jogadores: peça para o jogador tocar em "Compartilhar Ficha" no celular dele, cole o código gerado em "Vincular Código" e a ficha aparecerá com status em tempo real.',
          'Para NPCs ou jogadores offline: use a opção "Manual / NPC" para preencher estatísticas diretamente.',
          'Toque no ícone de dados do agente para rolar testes de perícias ou atributos instantaneamente.',
        ],
      },
      {
        id: 'mst-combat',
        title: 'Rastreador de Turnos & Iniciativa',
        badge: 'Iniciativa',
        description:
          'Organize a ordem de turnos de agentes e monstros, com suporte para rolagem automática ou inserção manual de valores tirados em dados físicos na vida real.',
        howToUse: [
          'Toque em "Rolar Geral" para puxar e rolar a iniciativa de todos os participantes.',
          'Se jogar com dados físicos na mesa, digite os valores tirados no campo "Inic" de cada participante.',
          'Utilize o botão "Próximo Turno" para avançar a rodada ordenadamente.',
        ],
      },
      {
        id: 'mst-vtt',
        title: 'Integração Direta com a Mesa Virtual (VTT)',
        badge: 'VTT Ao Vivo',
        description:
          'Inicie sessões conectadas em tempo real com os jogadores diretamente a partir da campanha ativa.',
        howToUse: [
          'Toque no botão "Mesa VTT" no cabeçalho da Central do Mestre para abrir a sala multiplayer.',
          'O código da sala (ex: ORD-XXXX) e os monstros da campanha serão vinculados para combate sincronizado.',
        ],
      },
    ],
    proTip:
      'Peça a todos os seus jogadores para gerarem o código de compartilhamento de seus agentes no início da campanha; assim você acompanha os PVs e Sanidade de todos os investigadores em uma única tela!',
    keywords: [
      'mestre',
      'campanha',
      'monstro',
      'ameaca',
      'cenas',
      'pistas',
      'iniciativa',
      'turno',
      'vincular agente',
      'combate',
      'vtt',
      'mesa virtual',
    ],
  },
  {
    id: 'table',
    title: 'Mesa Virtual (VTT) & Sessão Multiplayer',
    subtitle: 'Conecte mestres e investigadores em tempo real com código de sala ORD-XXXX',
    icon: 'game-controller-outline',
    route: '/(tabs)/table',
    badge: 'Mesa VTT',
    summary:
      'A Mesa Virtual conecta jogadores e mestres durante a sessão de RPG em tempo real. Permite acompanhar os pontos vitais da equipe (PV, PE, Sanidade, Defesa), sincronizar combate com iniciativa compartilhada, transmitir rolagens de dados no feed global e apresentar cenas e pistas narrativas.',
    purpose:
      'Eliminar a confusão de combates e rolagens em mesas remotas ou presenciais, mantendo todos os participantes sincronizados no mesmo fluxo tático.',
    features: [
      {
        id: 'tb-connect',
        title: 'Criação de Sala & Entrada de Jogadores (ORD-XXXX)',
        badge: 'Conexão',
        description:
          'Mestres criam salas instantâneas com código de 4 dígitos alfanuméricos (ex: ORD-7821) vinculado à campanha. Jogadores entram informando o código e escolhendo sua ficha de agente.',
        howToUse: [
          'Como Mestre: preencha o título da sessão, selecione a campanha e toque em "Criar Mesa como Mestre".',
          'Como Jogador: digite o código da sala recebido do mestre, selecione seu agente cadastrado e toque em "Entrar na Mesa".',
          'Modo de Conexão: suporta Simulação Local (para testes na mesma tela) e Conector em Nuvem Supabase Realtime (para múltiplos celulares via internet).',
        ],
      },
      {
        id: 'tb-party',
        title: 'Painel da Equipe & Monitor de Status Vitais',
        badge: 'Equipe',
        description:
          'Aba "Equipe" exibe cartões com nome, codinome, classe, NEX, PV Atual/Máx, PE Atual/Máx, Sanidade e Defesa de cada participante conectado.',
        howToUse: [
          'Acompanhe as barras coloridas de vida e sanidade dos seus aliados em tempo real.',
          'Quando um agente chega a 0 PV, o status de "Morrendo" é ativado visualmente para socorro imediato dos médicos do grupo.',
        ],
      },
      {
        id: 'tb-combat',
        title: 'Combate & Rastreador de Iniciativa Sincronizado',
        badge: 'Combate VTT',
        description:
          'Ordem de turnos sincronizada para todos os celulares da mesa. Permite que jogadores rolem sua iniciativa e mestres adicionem ameaças e monstros customizados.',
        howToUse: [
          'Jogadores tocam em "Rolar Minha Iniciativa" para calcular automaticamente a rolagem com seu bônus de Agilidade/Iniciativa.',
          'O Mestre pode adicionar monstros tocando em "+ Monstro" com PV e iniciativa específicos.',
          'O Mestre toca em "Próximo Turno" para avançar a vez do combate, atualizando a tela de todos instantaneamente.',
        ],
      },
      {
        id: 'tb-rolls',
        title: 'Feed Global de Rolagens de Dados ao Vivo',
        badge: 'Rolagens Ao Vivo',
        description:
          'Feed com atualização instantânea que exibe cada dado rolado na mesa, indicando quem rolou, qual foi o teste, a fórmula, o resultado final e destaques para Crítico (20) ou Desastre (1).',
        howToUse: [
          'Qualquer rolagem feita na ficha, arma ou compêndio é transmitida para a sala ativa.',
          'Use a barra de rolagem rápida no rodapé do feed para lançar fórmulas instantâneas (ex: 1d20, 3d6+4, 2d8).',
        ],
      },
      {
        id: 'tb-scenes',
        title: 'Transmissão de Cenas & Pistas Narrativas',
        badge: 'Cenas & Pistas',
        description:
          'O Mestre pode transmitir o texto da cena atual, pistas investigativas reveladas e documentos para os celulares dos jogadores.',
        howToUse: [
          'Na aba "Cenas", o Mestre seleciona o capítulo ou cena e toca em "Transmitir para Jogadores".',
          'Os jogadores recebem a descrição e pistas para consulta imediata.',
        ],
      },
    ],
    proTip:
      'Conecte todos os celulares no início da sessão informando o código ORD-XXXX gerado. Assim, o mestre não precisa ficar perguntando a vida dos agentes e todos veem os dados rolados na hora!',
    keywords: [
      'mesa virtual',
      'vtt',
      'multiplayer',
      'tempo real',
      'sala',
      'ord-xxxx',
      'iniciativa',
      'feed de dados',
      'party',
      'equipe',
      'cenas',
      'supabase',
    ],
  },
  {
    id: 'weapons',
    title: 'Armaria & Oficina de Modificações',
    subtitle: 'Construa armas customizadas com cálculo automático de regras',
    icon: 'construct-outline',
    route: '/(tabs)/weapons',
    badge: 'Armaria',
    summary:
      'Oficina completa de customização de armamento para Ordem Paranormal. Calcula passos oficiais de dano, margem de ameaça, alcance, modificações de ferreiro e maldições dos 4 elementos, permitindo equipar diretamente nos agentes.',
    purpose:
      'Automatizar os cálculos complexos de modificações e maldições, garantindo que os passos de dano e categorias estejam em conformidade com as regras.',
    features: [
      {
        id: 'wp-base',
        title: 'Seleção de Arma Base ou Criação do Zero',
        badge: 'Base Canônica',
        description:
          'Escolha qualquer uma das 58 armas oficiais da tabela (Fuzil de Assalto, Katana, Revólver, Machado, Arco Composto, etc.) ou comece uma arma do zero.',
        howToUse: [
          'Toque em "+ Nova Arma" e clique em "Escolher Arma Base do Compêndio".',
          'Todos os dados base (dano, crítico, alcance, tipo, espaços, categoria) são preenchidos automaticamente.',
        ],
      },
      {
        id: 'wp-damage-steps',
        title: 'Escala Oficial de Passos de Dano',
        badge: 'Passos de Dano',
        description:
          'Ao aplicar modificações como Calibre Grosso, o dano é promovido rigorosamente pela escala canônica do sistema.',
        howToUse: [
          'A escala avança: 1d4 → 1d6 → 1d8 → 1d10 → 1d12 → 2d8 → 2d10 → 2d12 → 3d8 → 4d6 → 3d10 → 4d8 → 3d12 → 4d10 → 4d12.',
          'Fórmulas com múltiplos dados avançam com preservação de bônus fixos.',
        ],
        formulaOrExample: 'Exemplo: Pistola 1d12 com Calibre Grosso vira 2d8.',
      },
      {
        id: 'wp-mods',
        title: 'Modificações Oficiais da Tabela',
        badge: 'Modificações',
        description:
          'Ative e combine modificações oficiais com recálculo automático de estatísticas e elevação de Categoria.',
        howToUse: [
          'Mira Laser: +1 na margem de ameaça (ex: 19 vira 18), +2 em testes de ataque, +1 categoria.',
          'Cruel: +2 em rolagens de dano, +1 categoria.',
          'Perigosa: +2 na margem de ameaça (ex: 19 vira 17), +1 categoria.',
          'Alongada: Aumenta o alcance em um passo (Curto → Médio → Longo → Extremo), +1 categoria.',
          'Silenciador: Permite disparos sem denunciar a posição, +1 categoria.',
        ],
      },
      {
        id: 'wp-curses',
        title: 'Maldições Paranormais dos 4 Elementos',
        badge: 'Maldições',
        description:
          'Aplique maldições de Sangue, Morte, Conhecimento e Energia para criar armas amaldiçoadas.',
        howToUse: [
          'Carniceira (Morte): Multiplicador crítico sobe para x4 e concede bônus temporários.',
          'Hemofágica (Sangue): Adiciona dano extra de Sangue e cura o agente.',
          'Energética (Energia): Converte o tipo de dano para Energia e concede +5 no ataque.',
        ],
      },
      {
        id: 'wp-custom-mods',
        title: 'Modificações Caseiras (Homebrew)',
        badge: 'Homebrew',
        description:
          'Crie melhorias exclusivas de campanha adicionando efeitos livres e definindo o aumento de categoria correspondente.',
        howToUse: [
          'Preencha o nome da modificação caseira, descreva o efeito e ajuste o incremento de categoria.',
        ],
      },
      {
        id: 'wp-equip',
        title: 'Equipar Diretamente no Agente',
        badge: 'Vínculo',
        description:
          'Envie a arma customizada diretamente para a ficha de um personagem sem precisar digitar tudo de novo.',
        howToUse: [
          'No card da arma salva, toque no botão "Equipar em Ficha".',
          'Escolha o personagem desejado na lista para inseri-la automaticamente em Ataques e Inventário.',
        ],
      },
      {
        id: 'wp-test',
        title: 'Testar Rolagem de Dano da Arma',
        badge: 'Teste Rápido',
        description:
          'Teste a fórmula resultante da sua arma com um simples toque no botão de rolagem do card.',
        howToUse: [
          'Toque em "Rolar Dano" no card da arma para verificar a fórmula calculada em ação.',
        ],
      },
      {
        id: 'wp-ammo-category',
        title: 'Diferenciação de Categorias: Arma vs Balas',
        badge: 'Regra Oficial',
        description:
          'No sistema de Ordem Paranormal, modificações na arma aumentam a Categoria da Arma, enquanto modificações nas balas (Dum Dum, Explosiva, Perfurante) aumentam a Categoria das Balas separadamente. Cada uma consome limite de patente de forma individualizada.',
        howToUse: [
          'Na Armaria, veja lado a lado a Categoria da Arma (Cat I, II...) e a Categoria das Balas (Cat 0, I, II...).',
          'Ao equipar a arma no agente, o pacote de munição correspondente pode ser adicionado ao inventário com sua própria categoria (ex: Balas Curtas Dum Dum como Categoria I).',
        ],
      },
    ],
    proTip:
      'Lembre-se de verificar a Patente do seu personagem: modificações na arma aumentam a Categoria da Arma (+1 por modificação ou maldição), enquanto modificações nas balas aumentam a Categoria das Balas (+1 por melhoria de munição). Ambas contam individualmente nos limites de itens da patente!',
    keywords: [
      'armas',
      'armaria',
      'oficina',
      'modificacoes',
      'maldicoes',
      'calibre grosso',
      'mira laser',
      'critico',
      'passos de dano',
      'alcance',
      'equipar',
    ],
  },
  {
    id: 'books',
    title: 'Acervo de Livros & Visualizador de PDFs',
    subtitle: 'Consulte as 1.261 páginas integrais dos 10 livros oficiais',
    icon: 'library-outline',
    route: '/(tabs)/books',
    badge: 'Livros & PDFs',
    summary:
      'Acervo completo com os 10 suplementos oficiais de Ordem Paranormal indexados página por página, com busca textual instantânea e leitor de PDF integrado de alta nitidez.',
    purpose:
      'Consultar regras originais, tabelas de capítulos e dossiês na íntegra direto no layout original dos livros sem sair do app.',
    features: [
      {
        id: 'bk-catalog',
        title: 'Catálogo dos 10 Livros Oficiais',
        badge: 'Acervo Canônico',
        description:
          'Acesso indexado ao Livro Base (322 p.), Sobrevivendo ao Horror (226 p.) e Arquivos Secretos 01 ao 09 (713 p.).',
        howToUse: [
          'Role o catálogo de capas na aba Livros para escolher qualquer livro.',
          'Toque em "Abrir Livro" para ler a partir da página 1 ou consultar o sumário.',
        ],
      },
      {
        id: 'bk-deep-search',
        title: 'Busca Textual Profunda nas 1.261 Páginas',
        badge: 'Busca em Segundos',
        description:
          'Pesquise qualquer palavra, monstro, citação ou frase no banco integral de páginas de todos os livros.',
        howToUse: [
          'Digite o termo na barra de busca superior da aba Livros (ex: "enigma de medo", "perseguição", "ritual de medo").',
          'O app lista todas as páginas com o trecho destacado.',
          'Toque no resultado para abrir o visualizador de PDF direto naquela página.',
        ],
      },
      {
        id: 'bk-viewer',
        title: 'Leitor de PDF com Rolagem Contínua e Página Única',
        badge: 'Leitor',
        description:
          'Leia com rolagem contínua vertical infinita com carregamento fluido de todas as páginas ou folheie individualmente página a página.',
        howToUse: [
          'Alterne entre "Rolagem Contínua" (todas as páginas em sequência com scroll suave) e "Página Única".',
          'Use as setas "← Anterior", "Próxima →", "-10" e "+10" ou digite o número da página para saltar diretamente.',
          'No modo rolagem, a barra inferior e o cabeçalho sincronizam dinamicamente com a página visível.',
          'Alterne para "Texto Extraído" para leitura textual rápida sem ilustrações.',
        ],
      },
      {
        id: 'bk-dpi',
        title: 'Ajuste de Nitidez / DPI (72 a 260 DPI)',
        badge: 'Qualidade',
        description:
          'Configure a resolução da renderização das páginas conforme a velocidade da sua conexão e tamanho da tela.',
        howToUse: [
          'No leitor, selecione entre 72 DPI (carregamento ultrarrápido para conexões lentas), 150 DPI (padrão nítido) e 260 DPI (qualidade máxima cristalina).',
        ],
      },
      {
        id: 'bk-external',
        title: 'Abrir no Leitor Externo / Navegador',
        badge: 'PDF Externo',
        description:
          'Permite abrir o arquivo PDF completo no leitor nativo do dispositivo ou navegador com âncora de página (#page=N).',
        howToUse: [
          'Toque no botão "Abrir PDF Completo" para visualizar no seu leitor de PDF favorito ou imprimir o arquivo.',
        ],
      },
    ],
    proTip:
      'Quando houver uma discussão de regras na mesa de jogo, use a Busca Textual da aba Livros para encontrar a página exata da regra em menos de 3 segundos!',
    keywords: [
      'livros',
      'pdfs',
      'leitor',
      'paginas',
      'busca profunda',
      'livro base',
      'sobrevivendo ao horror',
      'arquivos secretas',
      'dpi',
      'sumario',
    ],
  },
  {
    id: 'dice',
    title: 'Rolador de Dados Ordem Paranormal',
    subtitle: 'Rola dados segundo as regras canônicas do sistema',
    icon: 'dice-outline',
    route: '/(tabs)/dice',
    badge: 'Dados',
    summary:
      'Rolador de dados construído especificamente para as mecânicas de Ordem Paranormal: seleção do maior dado para atributos positivos, menor dado para atributos nulos/negativos, detecção de 20 Crítico e 1 Desastre, e parser de fórmulas livres.',
    purpose:
      'Garantir rolagens justas, ágeis e 100% fiéis às regras oficiais de teste de perícias e combate do sistema.',
    features: [
      {
        id: 'dc-attr-positive',
        title: 'Regra Oficial: Atributo Positivo (1 a 6)',
        badge: 'Regra Oficial',
        description:
          'Se você tem Atributo 1 ou mais, rola N dados d20 e escolhe o MAIOR resultado obtido.',
        howToUse: [
          'Selecione o valor do Atributo (ex: 2d20, 3d20, 4d20).',
          'O rolador rola todos os dados, destaca o maior e soma seu grau de treino e bônus.',
        ],
        formulaOrExample: 'Exemplo: Com FOR 3, rola 3d20 (tirou 4, 18, 12). Escolhe o 18.',
      },
      {
        id: 'dc-attr-negative',
        title: 'Regra Oficial: Penalidade de Atributo (0 ou negativo)',
        badge: 'Penalidade Canônica',
        description:
          'Se você tem Atributo 0 ou negativo, a regra oficial exige rolar (2 + |atributo|) dados d20 e escolher o MENOR resultado obtido.',
        howToUse: [
          'Selecione "0" ou "-1" no seletor de dados.',
          'Com 0, rola 2d20 e escolhe o pior dado.',
          'Com -1, rola 3d20 e escolhe o pior dado.',
        ],
        formulaOrExample: 'Exemplo: Com AGI 0, rola 2d20 (tirou 19 e 6). Escolhe o 6 (o pior).',
      },
      {
        id: 'dc-critical-fumble',
        title: 'Detecção de 20 Crítico e 1 Desastre',
        badge: 'Crítico & Desastre',
        description:
          'O sistema identifica automaticamente quando o dado escolhido é um 20 natural (Crítico em verde com efeito de destaque) ou um 1 natural (Desastre em vermelho).',
        howToUse: [
          'O resultado é sinalizado tanto no card da rolagem quanto no Toast superior.',
        ],
      },
      {
        id: 'dc-training',
        title: 'Graus de Treinamento e Bônus Circunstanciais',
        badge: 'Modificadores',
        description:
          'Escolha rapidamente entre Destreinado (+0), Treinado (+5), Veterano (+10) e Expert (+15), e adicione bônus ou penalidades de combate.',
        howToUse: [
          'Use os botões de incremento (+1, +2, +5, -1, -2, -5) para aplicar bônus de condições ou rituais.',
          'Toque em "Zerar" para limpar modificadores adicionais.',
        ],
      },
      {
        id: 'dc-formulas',
        title: 'Parser de Fórmulas Livres de Combate',
        badge: 'Fórmulas Livres',
        description:
          'Permite rolar expressões complexas de dano combinando múltiplos tipos de dados e bônus fixos.',
        howToUse: [
          'Digite expressões como: 4d6+10, 2d8+1d6+4, 3d10-2 ou 6d12+5.',
          'Ou use os atalhos rápidos: 1d4, 1d6, 1d8, 1d10, 1d12, 2d6, 4d6, etc.',
        ],
      },
      {
        id: 'dc-history',
        title: 'Histórico Completo com Re-Rolagem Rápida',
        badge: 'Histórico',
        description:
          'Guarda todas as rolagens da sessão com data, hora, dados rolados e total.',
        howToUse: [
          'Toque no botão de repetir em qualquer rolagem do histórico para repeti-la instantaneamente com os mesmos parâmetros.',
          'Toque em "Limpar Histórico" quando desejar zerar a lista.',
        ],
      },
    ],
    proTip:
      'Você também pode digitar fórmulas no estilo monstro como "5d20+20": o rolador reconhece automaticamente que se trata de um teste de criatura, rola 5d20 escolhendo o maior e soma +20!',
    keywords: [
      'dados',
      'rolador',
      'd20',
      'dano',
      'critico',
      'desastre',
      'penalidade',
      'atributo 0',
      'formulas',
      'historico',
      'treinamento',
    ],
  },
  {
    id: 'favorites',
    title: 'Salvos, Listas, Homebrew & Backup',
    subtitle: 'Organize suas campanhas, crie conteúdo e exporte backups',
    icon: 'bookmarks-outline',
    route: '/(tabs)/favorites',
    badge: 'Salvos & Homebrew',
    summary:
      'Hub central para gerenciar registros favoritos, criar listas personalizadas por missão, confeccionar entidades caseiras (Homebrew), restaurar regras oficiais e exportar/importar backups JSON completos.',
    purpose:
      'Oferecer organização personalizada para mestres e jogadores, além de garantir que seus dados nunca se percam através de backups independentes.',
    features: [
      {
        id: 'fv-favs',
        title: 'Aba de Favoritos Rápidos',
        badge: 'Favoritos',
        description:
          'Acesso imediato a todos os rituais, criaturas, itens ou regras que você marcou com a estrela amarela no Compêndio.',
        howToUse: [
          'Toque na estrela de qualquer entidade no compêndio ou nos detalhes para favoritá-la.',
          'Consulte todos os seus itens favoritos reunidos nesta sub-aba.',
        ],
      },
      {
        id: 'fv-lists',
        title: 'Listas Temáticas de Sessão / Campanha',
        badge: 'Listas Customizadas',
        description:
          'Crie listas organizadas para agrupar monstros da sessão, rituais do vilão ou equipamentos de uma missão.',
        howToUse: [
          'Digite o nome da lista (ex: "Sessão 4 - Mansão Endiabrada") e descrição.',
          'Toque em "Criar Lista".',
          'Em qualquer card ou tela de detalhes, toque em "Adicionar à Lista" para vinculá-lo.',
        ],
      },
      {
        id: 'fv-homebrew',
        title: 'Central de Homebrew & Edições Seguras',
        badge: 'Homebrew',
        description:
          'Gerencie todo o conteúdo caseiro criado por você e visualize regras oficiais que você customizou.',
        howToUse: [
          'Toque em "+ Criar Nova Entidade Homebrew" para abrir o criador.',
          'Entidades oficiais editadas recebem o selo "Editado" e um botão "Restaurar Padrão", permitindo voltar à regra original do livro sem risco de perda.',
        ],
      },
      {
        id: 'fv-backup',
        title: 'Exportação e Importação de Backup JSON',
        badge: 'Backup Seguro',
        description:
          'Exporte todos os seus dados locais (fichas, armas, favoritos, listas e homebrews) em uma string JSON portátil.',
        howToUse: [
          'Toque em "Exportar Backup JSON" para gerar o código e copie-o para guardar no computador ou bloco de notas.',
          'Para restaurar em outro dispositivo, cole o JSON na caixa e toque em "Importar Backup JSON".',
        ],
      },
      {
        id: 'fv-themes',
        title: 'Seletor Rápido de Temas',
        badge: 'Visual',
        description:
          'Troque a paleta do aplicativo diretamente por esta sub-aba além do botão de cabeçalho.',
        howToUse: [
          'Escolha entre os 7 temas paranormais disponíveis.',
        ],
      },
    ],
    proTip:
      'Antes de fazer grandes modificações ou trocar de celular, sempre gere um Backup JSON e salve no seu e-mail ou WhatsApp para ter garantia absoluta de preservação dos seus agentes!',
    keywords: [
      'salvos',
      'favoritos',
      'listas',
      'homebrew',
      'backup',
      'json',
      'exportar',
      'importar',
      'restaurar padrao',
      'campanha',
    ],
  },
  {
    id: 'entity_detail_editor',
    title: 'Detalhes de Entidade & Editor Homebrew',
    subtitle: 'Inspecione regras aprofundadas ou forje seu próprio conteúdo',
    icon: 'document-text-outline',
    route: '/entity/editor',
    badge: 'Detalhes & Editor',
    summary:
      'Tela detalhada para cada um dos 1.367 registros com estatísticas mecânicas completas, e um editor dedicado para confeccionar rituais, monstros, armas, poderes e itens próprios.',
    purpose:
      'Permitir visualização técnica detalhada e dar total liberdade para criar conteúdo complementar para suas campanhas de RPG.',
    features: [
      {
        id: 'ed-details',
        title: 'Visualização Técnica Estruturada',
        badge: 'Ficha Técnica',
        description:
          'Exibe elementos visuais coloridos, círculo de ritual, custo de PE, execução, alcance, duração, resistência, dano, VD, defesa e enigma de medo.',
        howToUse: [
          'Toque em qualquer card no Compêndio para abrir a tela de Detalhes.',
          'Use as abas mecânicas para ler regras discentes, verdadeiras ou ações de combate.',
        ],
      },
      {
        id: 'ed-roll-direct',
        title: 'Rolagem de Fórmulas Embutidas no Texto',
        badge: 'Rolagem de Ações',
        description:
          'Se o registro contiver dano ou testes (ex: 6d6 de Sangue ou 3d20+15), toque no botão ao lado para rolar diretamente.',
        howToUse: [
          'Toque no ícone de dado próximo à fórmula para acionar o rolador com resultado instantâneo no Toast.',
        ],
      },
      {
        id: 'ed-book-origin',
        title: 'Origem do Livro e Página Exata',
        badge: 'Referência',
        description:
          'Indica o livro fonte (ex: Livro Base, Sobrevivendo ao Horror) e o número da página onde a regra original se encontra.',
        howToUse: [
          'Toque em "Ver no Livro" para ler a diagramação e ilustração oficial.',
        ],
      },
      {
        id: 'ed-editor-form',
        title: 'Editor Completo de Entidade Homebrew',
        badge: 'Criador Homebrew',
        description:
          'Formulário robusto com suporte a todas as 11 categorias de entidades.',
        howToUse: [
          'Defina o Nome, Categoria, Elemento Paranormal e Livro de referência.',
          'Preencha campos específicos: círculo, alcance e resistência para rituais; VD, PV e defesa para monstros; dano e crítico para armas.',
          'Escreva a descrição e regras na área de texto.',
          'Toque em "Salvar Entidade" para incorporá-la imediatamente ao seu compêndio.',
        ],
      },
      {
        id: 'ed-edit-official',
        title: 'Customização de Entidades Oficiais',
        badge: 'Modificação Segura',
        description:
          'Você pode alterar o dano ou custo de um ritual oficial para a sua mesa sem estragar os arquivos do app.',
        howToUse: [
          'Abra os Detalhes da entidade oficial e toque em "Editar".',
          'Faça as alterações e salve.',
          'Quando quiser desfazer, basta abrir o registro e tocar em "Restaurar Padrão".',
        ],
      },
    ],
    proTip:
      'Ao criar um monstro Homebrew, preencha o Enigma de Medo na seção de notas: monstros com Enigma de Medo têm mecânica única em Ordem Paranormal!',
    keywords: [
      'detalhes',
      'editor',
      'homebrew',
      'criar entidade',
      'ritual customizado',
      'monstro customizado',
      'restaurar',
      'editar oficial',
    ],
  },
  {
    id: 'cloud_sync',
    title: 'Perfil & Sincronização em Nuvem (Google Drive)',
    subtitle: 'Sincronize seus dados entre múltiplos aparelhos com Smart Merge',
    icon: 'cloud-upload-outline',
    badge: 'Nuvem & Perfil',
    summary:
      'Sistema seguro de sincronização direta com a conta Google Drive do jogador, utilizando o algoritmo Smart Merge para unificar fichas, armas e favoritos entre celular, tablet e computador sem perda de dados.',
    purpose:
      'Permitir que você edite seus personagens no computador e os acesse no celular durante a sessão presencial, com salvamento contínuo e sem servidores intermediários terceiros.',
    features: [
      {
        id: 'cs-profile',
        title: 'Identidade do Jogador e Campanha',
        badge: 'Perfil',
        description:
          'Defina seu Nome de Agente, Codinome, Classe Favorita, Campanha Atual e Nome do Mestre.',
        howToUse: [
          'Toque no ícone de perfil no cabeçalho superior direito.',
          'Preencha seus dados na aba "Identidade" e toque em "Salvar Perfil".',
        ],
      },
      {
        id: 'cs-oauth',
        title: 'Conexão Segura com Google Drive via OAuth2',
        badge: 'Google Drive',
        description:
          'Autenticação oficial do Google sem intermediação de servidores de terceiros: seus dados vão diretamente para o seu Drive pessoal.',
        howToUse: [
          'Na aba "Nuvem & Backup", toque em "Conectar com Google Drive".',
          'Faça login na sua conta Google e conceda permissão para salvar arquivos de aplicativo.',
          'Uma pasta segura dedicada ao OrdoCompanion é criada no seu Google Drive.',
        ],
      },
      {
        id: 'cs-smart-merge',
        title: 'Mecanismo Smart Merge (Resolução Inteligente de Conflitos)',
        badge: 'Sem Perdas',
        description:
          'Se você criar uma ficha no celular e outra no tablet, o Smart Merge unifica ambas sem que uma apague a outra.',
        howToUse: [
          'O algoritmo compara o timestamp individual (updatedAt) de cada personagem.',
          'Favoritos e listas são unidos por conjunto.',
          'Armas customizadas são preservadas.',
        ],
      },
      {
        id: 'cs-auto-sync',
        title: 'Sincronização Automática em Segundo Plano',
        badge: 'Automático',
        description:
          'Mantenha a opção de sincronização automática ativada para salvar suas alterações silenciosamente.',
        howToUse: [
          'Ative a chave "Sincronização Automática".',
          'Você também pode tocar em "Sincronizar com Drive Agora" a qualquer momento para forçar um backup imediato.',
        ],
      },
      {
        id: 'cs-status-indicator',
        title: 'Indicador Visual de Status no Cabeçalho',
        badge: 'Monitoramento',
        description:
          'Um ponto colorido no botão de perfil informa o estado atual da sua conexão com a nuvem.',
        howToUse: [
          'Ponto Verde: Sincronizado e atualizado.',
          'Ponto Azul: Sincronizando alterações no momento.',
          'Ponto Vermelho: Falha de conexão ou token expirado (basta reconectar).',
        ],
      },
    ],
    proTip:
      'Para trocar de celular ou usar no computador via Expo Web, basta conectar a mesma conta do Google Drive e tocar em "Sincronizar com Drive Agora" para baixar todas as suas fichas e armas instantaneamente!',
    keywords: [
      'nuvem',
      'google drive',
      'sincronizacao',
      'smart merge',
      'perfil',
      'backup online',
      'conflitos',
      'seguranca',
      'oauth',
    ],
  },
  {
    id: 'themes',
    title: 'Personalização & 7 Temas Paranormais',
    subtitle: 'Mergulhe na atmosfera dos Elementos do Outro Lado',
    icon: 'color-palette-outline',
    badge: 'Temas',
    summary:
      'Sete temas imersivos desenhados com alto contraste e paletas baseadas nos 4 elementos paranormais, no Medo e nos clássicos arquivos confidenciais.',
    purpose:
      'Permitir que cada jogador customize o app com a estética do seu elemento paranormal favorito e garanta conforto visual em ambientes escuros ou claros.',
    features: [
      {
        id: 'th-dark',
        title: 'Agente da Ordem (Dark)',
        badge: 'Padrão',
        description:
          'Visual escuro profissional com detalhes em vermelho carmesim e dourado, inspirado nos manuais táticos da Ordo Realitas.',
        howToUse: ['Ideal para sessões noturnas e preservação da bateria do celular.'],
      },
      {
        id: 'th-sangue',
        title: 'Sangue (Carmesim & Paixão)',
        badge: 'Sangue',
        description:
          'Tons profundos de vermelho escarlate, rubi e calor visceral. Dedicado ao elemento do sentimento e da dor.',
        howToUse: ['Combina perfeitamente com Combatentes e especialistas em combate corpo a corpo.'],
      },
      {
        id: 'th-morte',
        title: 'Morte (Cinzas & Lodo Temporal)',
        badge: 'Morte',
        description:
          'Paleta de cinzas profundos, lodo negro e espirais temporais. O elemento da entropia e do tempo acelerado.',
        howToUse: ['A escolha clássica para Ocultistas que dominam rituais de Morte e desaceleração.'],
      },
      {
        id: 'th-conhecimento',
        title: 'Conhecimento (Dourado & Sigilos Arcanos)',
        badge: 'Conhecimento',
        description:
          'Dourado nobre sobre preto obsidiana, runas arcanas e razão pura. O elemento do equilíbrio e dos enigmas.',
        howToUse: ['Excelente para Especialistas investigadores e mestres de enigmas.'],
      },
      {
        id: 'th-energia',
        title: 'Energia (Roxo Neon & Eletricidade)',
        badge: 'Energia',
        description:
          'Roxo elétrico vibrante, faíscas neon e caos imprevisível. O elemento da transformação e da probabilidade.',
        howToUse: ['Ideal para agentes que apreciam armas energéticas e rituais caóticos.'],
      },
      {
        id: 'th-medo',
        title: 'Medo (Cinzento Espectral)',
        badge: 'Medo',
        description:
          'Névoa gélida e sombras do desconhecido. O elemento primordial que desafia as leis da realidade.',
        howToUse: ['Para mestres que narram momentos de terror puro e encontros com Relíquias.'],
      },
      {
        id: 'th-light',
        title: 'Arquivo Iluminado (Light)',
        badge: 'Claro',
        description:
          'Fundo claro com textos nítidos de alto contraste, simulando relatórios datilografados em papel da Ordem.',
        howToUse: ['Recomendado para uso sob luz solar forte ou ambientes muito iluminados.'],
      },
    ],
    proTip:
      'Toque no ícone da Paleta de Cores no cabeçalho superior direito a qualquer momento para abrir o Seletor de Temas e alternar a paleta com um único toque!',
    keywords: [
      'temas',
      'cores',
      'sangue',
      'morte',
      'conhecimento',
      'energia',
      'medo',
      'dark mode',
      'light mode',
      'personalizacao',
    ],
  },
  {
    id: 'print_sheet',
    title: 'Impressão e Exportação de Fichas em PDF',
    subtitle: 'Gere fichas prontas para impressão física ou envio digital',
    icon: 'print-outline',
    badge: 'Impressão PDF',
    summary:
      'Motor de geração de folhas de personagens oficiais em formato A4, com conversão para algarismos romanos nas perícias, sanitização contra caracteres especiais e suporte aos dois layouts canônicos.',
    purpose:
      'Imprimir sua ficha pré-preenchida para mesas de RPG presenciais ou gerar PDFs limpos para compartilhar no Discord ou WhatsApp.',
    features: [
      {
        id: 'pr-models',
        title: 'Dois Modelos Oficiais de Ficha',
        badge: 'Layouts Oficiais',
        description:
          'Escolha entre o modelo clássico do Livro Base (2 páginas) ou o modelo moderno do suplemento Sobrevivendo ao Horror.',
        howToUse: [
          'No modal de impressão, selecione "Livro Base" ou "Sobrevivendo ao Horror".',
          'Ambos seguem o padrão gráfico das fichas oficiais da editora Jambô.',
        ],
      },
      {
        id: 'pr-skills-roman',
        title: 'Conversão Automática de Perícias para Romanos',
        badge: 'Canônico',
        description:
          'O motor converte automaticamente os graus de treinamento para a notação oficial: Destreinado (em branco), Treinado (I), Veterano (II) e Expert (III).',
        howToUse: [
          'Calcula o bônus somado da perícia (atributo + treino + outros bônus) e posiciona no campo exato.',
        ],
      },
      {
        id: 'pr-attacks-rituals',
        title: 'Tabelas Completas de Ataques e Rituais',
        badge: 'Detalhamento',
        description:
          'Gera a grade de armas com nome, teste de ataque, dano, margem de ameaça, tipo e alcance, além dos rituais aprendidos com círculo, execução e custo de PE.',
        howToUse: [
          'Tudo que você cadastrou no agente é transcrito de forma legível e sem cortes.',
        ],
      },
      {
        id: 'pr-expo-print',
        title: 'Impressão Direta e Compartilhamento Nativo',
        badge: 'Expo Print',
        description:
          'Permite imprimir diretamente em impressoras de rede (Wi-Fi) ou salvar o PDF no armazenamento do aparelho.',
        howToUse: [
          'Toque em "Imprimir Ficha" para abrir o diálogo do sistema operacional (Android, iOS ou Navegador).',
          'Escolha "Salvar como PDF" ou selecione sua impressora.',
        ],
      },
    ],
    proTip:
      'Antes de imprimir, certifique-se de que os atributos, armas e perícias do seu agente estão preenchidos para que a folha saia 100% pronta para a mesa de jogo!',
    keywords: [
      'impressao',
      'imprimir',
      'pdf',
      'ficha pdf',
      'folha a4',
      'algarismos romanos',
      'livro base',
      'sobrevivendo ao horror',
      'compartilhar',
    ],
  },
  {
    id: 'rules_combat_tips',
    title: 'Dicas Táticas, Regras de Combate & FAQ',
    subtitle: 'Perguntas frequentes, atalhos úteis e regras rápidas',
    icon: 'flash-outline',
    badge: 'Dicas & FAQ',
    summary:
      'Resumo das dúvidas mais comuns de jogadores e mestres sobre regras de Ordem Paranormal, atalhos de combate e boas práticas de uso do OrdoCompanion.',
    purpose:
      'Servir como cola tática rápida para consultas de emergência durante sessões intensas de combate e investigação.',
    features: [
      {
        id: 'rc-crit-rule',
        title: 'Como funciona o Crítico em Ordem Paranormal?',
        badge: 'Regra de Crítico',
        description:
          'Em testes normais de perícia, 20 natural no d20 é sucesso crítico automático. Em ataques, você confere a Margem de Ameaça da arma (ex: 19 ou 18). Se o resultado no dado for igual ou superior à margem e atingir a Defesa do alvo, o dano é multiplicado pelo multiplicador da arma (ex: x2, x3 ou x4).',
        howToUse: [
          'Armas com margem 19/x3 têm crítico ao tirar 19 ou 20 no dado, e multiplicam os dados do dano base por 3 se acertarem!',
        ],
      },
      {
        id: 'rc-pe-round',
        title: 'Limite de PE por Turno',
        badge: 'Limite de PE',
        description:
          'O limite de Pontos de Esforço que um agente pode gastar por rodada é igual ao seu bônus de NEX dividido por 5% (ou seja, 5% NEX = 1 PE/rodada; 20% NEX = 4 PE/rodada; 50% NEX = 10 PE/rodada).',
        howToUse: [
          'Você não pode conjurar rituais aprimorados cujo custo exceda seu limite de PE por rodada.',
        ],
      },
      {
        id: 'rc-death-sanity',
        title: 'Morrendo e Enlouquecendo',
        badge: 'Sobrevivência',
        description:
          'Quando seus PV chegam a 0, você entra na condição Morrendo. Precisa ser estabilizado com teste de Medicina ou ritual. Se sua Sanidade chegar a 0, você entra em Enlouquecendo!',
        howToUse: [
          'Monitore seus pontos na barra colorida da tela de Fichas de Agentes para evitar chegar a zero sem suporte.',
        ],
      },
      {
        id: 'rc-stealth-combat',
        title: 'Disparos e Furtividade (Silenciador)',
        badge: 'Furtividade',
        description:
          'Disparar uma arma de fogo sem silenciador quebra o disfarce e alerta todos em alcance Extremo. Usar uma arma com a modificação Silenciador permite manter a furtividade com teste de Crime ou Furtividade.',
        howToUse: [
          'Construa armas com Silenciador na aba Armaria para agentes especialistas infiltrados.',
        ],
      },
      {
        id: 'rc-faq-offline',
        title: 'FAQ: Meus dados continuam salvos se eu fechar o aplicativo?',
        badge: 'FAQ',
        description:
          'Sim! O OrdoCompanion salva automaticamente todas as modificações no armazenamento interno do seu aparelho (AsyncStorage) assim que você digita ou altera qualquer campo.',
        howToUse: [
          'Você pode fechar o aplicativo a qualquer momento com total segurança de que tudo estará gravado.',
        ],
      },
    ],
    proTip:
      'Durante a rodada de combate, um jogador pode realizar 1 Ação Padrão (atacar, usar ritual), 1 Ação de Movimento (deslocar-se até seu deslocamento) e Ações Livres (conversar, largar itens). Reações (bloqueio, esquiva) ocorrem fora do seu turno!',
    keywords: [
      'regras',
      'combate',
      'critico',
      'pe por turno',
      'limite de pe',
      'morrendo',
      'enlouquecendo',
      'sanidade',
      'silenciador',
      'furtividade',
      'faq',
      'duvidas',
    ],
  },
  {
    id: 'oracle',
    title: 'G.L.I.T.C.H. & Inteligência Artificial Paranormal',
    subtitle: 'Consultas canônicas aos 10 livros, múltiplos provedores de IA, Relíquias do Outro Lado e modo offline',
    icon: 'sparkles-outline',
    route: '/(tabs)/oracle',
    badge: 'G.L.I.T.C.H.',
    summary:
      'O G.L.I.T.C.H. (Guia Lógico de Interferências Transcendentais do Caos Humano) é o assistente inteligente tático do OrdoCompanion. Dotado de arquitetura RAG (Retrieval-Augmented Generation), pesquisa instantaneamente nas 1.261 páginas dos 10 livros canônicos, 1.367 entidades do compêndio e manuais do app. Suporta Google Gemini, Groq Cloud (Llama 3), modelos locais via Ollama (100% offline no PC), OpenRouter e motor offline nativo no celular.',
    purpose:
      'Solucionar dúvidas de regras, custos de PE, rituais, criaturas e operação do app em tempo real durante a sessão, fornecendo botões interativos para saltar diretamente para páginas de livros, rolar dados e ver fichas.',
    features: [
      {
        id: 'glitch-providers',
        title: 'Visão Geral de Provedores de IA & Chaves de Acesso',
        badge: 'Arquitetura',
        description:
          'O OrdoCompanion adota uma arquitetura aberta e flexível de IA. Você pode usar a chave padrão inclusa no app, conectar sua própria chave gratuita do Google Gemini ou Groq Cloud, rodar o Ollama localmente no seu computador sem internet, ou usar o sintetizador offline embutido.',
        howToUse: [
          'No topo do chat do G.L.I.T.C.H., toque no ícone de engrenagem para abrir as Configurações de IA.',
          'Veja o indicador de status: se o escudo verde estiver visível, a Chave Padrão do Sistema está ativa e você já pode conversar imediatamente.',
          'Para usar sua própria chave de API com limites dedicados, cole no campo "Chave de API" e salve.',
          'Se desejar voltar à chave inclusa, toque no botão "Restaurar Padrão" a qualquer momento.',
        ],
      },
      {
        id: 'glitch-gemini',
        title: 'Google Gemini (Google AI Studio & Modelos Flash)',
        badge: 'Google Gemini',
        description:
          'Conexão direta com a API oficial do Google Gemini. Oferece alta velocidade, excelente capacidade de raciocínio de regras e um plano gratuito muito generoso no Google AI Studio (sem necessidade de cadastrar cartão de crédito).',
        howToUse: [
          'Abra o modal de configurações e clique em "Obter Chave Grátis no Google AI Studio (30 seg)".',
          'Faça login com sua conta Google em aistudio.google.com/app/apikey e clique em "Create API Key".',
          'Cole a chave gerada (iniciada com AIzaSy...) no campo de Chave de API do app.',
          'Escolha entre os modelos disponíveis: gemini-flash-lite-latest (recomendado para respostas ultra-rápidas), gemini-flash-latest ou gemini-3.8-flash.',
        ],
      },
      {
        id: 'glitch-groq',
        title: 'Groq Cloud (Llama 3.3 70B & Velocidade Relâmpago)',
        badge: 'Groq (Llama 3)',
        description:
          'Provedor em nuvem de altíssima performance executando modelos open-source Llama 3 em LPUs (Language Processing Units). Gera respostas completas em fração de segundo com compreensão primorosa do português.',
        howToUse: [
          'Acesse o console gratuito da Groq em console.groq.com/keys e crie uma conta gratuita com seu Google ou GitHub (sem pedir cartão).',
          'Clique em "Create API Key" e copie a chave gerada (iniciada com gsk_...).',
          'Nas configurações do G.L.I.T.C.H., selecione o provedor "Groq Cloud (Llama 3)".',
          'Cole sua chave gsk_... e selecione o modelo llama-3.3-70b-versatile (ou llama-3.1-8b-instant para testes ultra-leves).',
          'Toque em "Testar Conexão com a API" para validar e em seguida salve as configurações.',
        ],
      },
      {
        id: 'glitch-ollama',
        title: 'Ollama Local: 100% Offline no seu PC (Sem Internet e Sem Chave)',
        badge: 'Ollama Local',
        description:
          'Para quem deseja privacidade absoluta ou jogar em ambientes totalmente sem conexão à internet. O Ollama executa modelos de inteligência artificial diretamente no processador e placa de vídeo do seu computador (Windows, Mac ou Linux).',
        howToUse: [
          'Passo 1: Baixe e instale o Ollama gratuitamente no seu computador pelo site oficial (ollama.com).',
          'Passo 2: Abra o terminal do computador e baixe o modelo desejado digitando: "ollama run llama3.3" (ou "ollama run mistral").',
          'Passo 3: O Ollama inicia automaticamente o servidor local na porta 11434, disponibilizando o endpoint compatível http://localhost:11434/v1/chat/completions.',
          'Passo 4: No OrdoCompanion, selecione o endpoint correspondente e digite o nome do modelo (ex: llama3.3).',
          'Passo 5 (Celular na rede local): Se estiver usando o app pelo celular, substitua "localhost" pelo IP do seu computador na rede Wi-Fi (ex: http://192.168.1.100:11434/v1/chat/completions).',
          'Vantagens: Nenhuma chave de API necessária, zero custo, zero consumo de dados móveis e privacidade total.',
        ],
      },
      {
        id: 'glitch-openrouter',
        title: 'OpenRouter: Acesso a Centenas de Modelos Abertos e Proprietários',
        badge: 'OpenRouter',
        description:
          'Plataforma agregadora que conecta a centenas de inteligências artificiais através de um único endpoint padrão OpenAI-compatível, incluindo modelos gratuitos de alta capacidade.',
        howToUse: [
          'Crie uma chave de API em openrouter.ai/keys.',
          'Nas configurações de IA, informe a chave sk-or-v1-... e selecione ou digite o modelo desejado (ex: meta-llama/llama-3.3-70b-instruct:free).',
          'Permite testar e comparar modelos diferentes mantendo todo o histórico e RAG do OrdoCompanion.',
        ],
      },
      {
        id: 'glitch-offline',
        title: 'Modo Offline Local Nativo (Motor Interno do Aplicativo)',
        badge: 'Offline Nativo',
        description:
          'Quando você não possui internet, chave de API e nem um computador executando o Ollama, o sintetizador interno do OrdoCompanion responde com precisão às dúvidas sobre regras, entidades e tabelas.',
        howToUse: [
          'Abra as configurações do G.L.I.T.C.H. e selecione o botão "Modo Offline Local (Sem chave)".',
          'O app utiliza sua base local de 1.367 entidades e 1.261 páginas de regras para responder perguntas frequentes.',
          'Funciona mesmo no modo avião, em acampamentos ou locais sem qualquer cobertura de rede.',
        ],
      },
      {
        id: 'glitch-relics',
        title: 'Voz & Personas das 4 Relíquias do Outro Lado + Ordo Realitas + Aleatório',
        badge: 'Relíquias',
        description:
          'Escolha quem responde às suas perguntas no chat através do seletor horizontal superior. Cada persona possui estilo, tom dramático e teatralidade fiéis ao universo de Ordem Paranormal, mantendo 100% de exatidão matemática e de regras.',
        howToUse: [
          'G.L.I.T.C.H. (Ordo Realitas): Operador tático oficial da Ordem. Postura formal, acolhedora e prestativa de um leal colega de equipe, com respostas didáticas e suporte preciso.',
          '⚡ O Anfitrião (Energia): Showman bombástico, elétrico, irônico e caótico. Trata o RPG como um espetáculo imprevisível.',
          '👁️ A Magistrada (Conhecimento): Máscara do Desespero, solene, fria, simétrica e justa. Trata cada regra como um mandamento do Equilíbrio.',
          '⏳ O Deus da Morte (Morte): Coração de Lodo, lento, melancólico, poético e paciente. Conta o tempo com precisão cronométrica.',
          '🩸 O Diabo (Sangue): Trono de Sangue, visceral, agressivo, voraz e feroz. Exige sangue no combate e exalta dano letal.',
          '🎲 Aleatório: Sorteia imprevisivelmente uma das 4 Relíquias a cada nova pergunta enviada!',
          'Regra de Ouro Canônica: Nenhuma persona mente, chuta ou erra regras! A persona altera apenas a dramatização.',
        ],
      },
      {
        id: 'glitch-agent-context',
        title: 'Contexto da Ficha de Agente Ativa em Jogo',
        badge: 'Agente Ativo',
        description:
          'Vincule seu agente cadastrado à conversa para que a IA conheça seus status vitais, classe, perícias treinadas, rituais e armas em tempo real.',
        howToUse: [
          'No topo do chat, logo abaixo da barra de Relíquias, toque no nome do seu agente (ex: "Arthur", "Dante") ou em "Geral".',
          'Com a ficha vinculada, faça perguntas personalizadas como: "Posso conjurar este ritual com meus PE atuais?", "Quantos dados e bônus eu rolo no meu tiro com o Fuzil?" ou "Qual minha Esquiva atual?".',
          'A IA responderá calculando com base no seu NEX, atributos e modificadores reais da ficha.',
        ],
      },
      {
        id: 'glitch-rag-citations',
        title: 'Ações Interativas e Clicáveis nas Respostas (RAG)',
        badge: 'RAG Interativo',
        description:
          'As respostas do G.L.I.T.C.H. identificam elementos do sistema e geram botões clicáveis dinâmicos para agilizar a sessão.',
        howToUse: [
          'Toque no botão "📖 Abrir [Livro] (Pág. X)" para abrir o visualizador de PDF exatamente na página citada.',
          'Toque no botão "🔍 Ver [Entidade]" para navegar até o card correspondente no Compêndio Geral.',
          'Toque no botão "🎲 Rolar [Fórmula]" para disparar a rolagem imediatamente no HUD global de dados.',
          'Toque no botão "👉 Ir para [Aba]" para saltar diretamente para a tela citada (Armaria, Fichas, etc.).',
        ],
      },
      {
        id: 'glitch-tools',
        title: 'Ferramentas Adicionais da Tela do Oráculo',
        badge: 'Ferramentas',
        description:
          'Recursos utilitários para diagnóstico, personalização e navegação fluida durante o uso diário.',
        howToUse: [
          'Botão "Testar Conexão com a API": Clique nas configurações para testar sua chave de API e conexão com retorno imediato de sucesso ou diagnóstico de erro.',
          'Fallback Offline Inteligente: Ative a chave correspondente para que o app mude automaticamente para a base local caso a API retorne erros de cota (429), instabilidade (503) ou falta de sinal.',
          'Instruções Personalizadas: Campo de texto livre para ditar regras extras para a IA (ex: "Priorize respostas curtas em tópicos", "Estamos jogando campanha nível 0 de Sobreviventes").',
          'Limpeza de Histórico: Toque no ícone de lixeira no canto superior direito para limpar mensagens e reiniciar a conversa.',
          'Sugestões Rápidas (Quick Prompts): Toque nos cards de perguntas prontas para tirar dúvidas frequentes de combate, armas de crítico 18/x3 e sanidade.',
          'Teclado no Web/PC: Pressione Enter para enviar a mensagem (e Shift+Enter para pular de linha).',
        ],
      },
    ],
    proTip:
      'Ao planejar combates difíceis, selecione seu agente no topo do chat e pergunte: "Quais são as melhores opções táticas e rituais que posso usar no meu turno com meus PE e atributos?". A IA analisará sua ficha completa!',
    keywords: [
      'glitch',
      'ia',
      'inteligencia artificial',
      'oraculo',
      'oráculo',
      'gemini',
      'groq',
      'ollama',
      'openrouter',
      'offline',
      'anfitriao',
      'anfitrião',
      'magistrada',
      'deus da morte',
      'diabo',
      'reliquias',
      'regras',
      'contexto de ficha',
      'teste de conexao',
      'fallback offline',
      'acoes clicaveis',
    ],
  },
  {
    id: 'support',
    title: 'Central de Suporte, Feedback & Relato de Erros',
    subtitle: 'Relate bugs diretamente pelo app ou fale com o desenvolvedor',
    icon: 'bug-outline',
    route: '/(tabs)/support',
    badge: 'Suporte & Erros',
    summary:
      'A Central de Suporte permite que jogadores e mestres relatem falhas técnicas, apontem divergências em regras do Compêndio, enviem ideias de melhorias ou entrem em contato direto com o desenvolvedor sem precisar sair do aplicativo.',
    purpose:
      'Garantir um canal direto, rápido e organizado com coleta automática de diagnóstico técnico (versão do app, sistema operacional e tema ativo) para resolver qualquer problema rapidamente.',
    features: [
      {
        id: 'sup-direct-form',
        title: 'Envio Direto pelo Aplicativo & Geração de Protocolo (#ORD)',
        badge: 'In-App',
        description:
          'Formulário integrado que envia seu relato diretamente para a central do desenvolvedor (via Webhook/Endpoint) e registra um código de protocolo local.',
        howToUse: [
          'Acesse a tela "Suporte" pelo menu "+ Mais" da barra inferior ou pela aba "Suporte" dentro do Modal de Perfil do Jogador.',
          'Escolha a categoria: Bug / Erro Técnico, Erro de Regra / Compêndio, Sugestão ou Contato Direto.',
          'Preencha o título, a descrição e informe seu Discord, E-mail ou WhatsApp caso queira receber retorno direto.',
          'Toque em "Enviar Relato Direto pelo App" para enviar imediatamente e gerar seu protocolo #ORD-XXXX.',
        ],
      },
      {
        id: 'sup-channels-diagnostics',
        title: 'Canais Diretos (Discord, E-mail, GitHub) & Diagnóstico Automático',
        badge: 'Canais Oficiais',
        description:
          'Acesso em 1 clique ao Discord do desenvolvedor, E-mail de suporte e abertura de Issues pré-preenchidas no repositório oficial do GitHub.',
        howToUse: [
          'Use os botões em "Canais de Contato Direto" para abrir o Discord, enviar e-mail ou copiar o usuário de contato.',
          'Ative a opção "Anexar Diagnóstico Técnico Automaticamente" para incluir versão do aplicativo, plataforma e contagem de registros locais no relatório.',
          'Se preferir, toque em "Abrir Issue no GitHub" para abrir o navegador já com todo o relatório técnico preenchido automaticamente.',
        ],
      },
    ],
    proTip:
      'Ao reportar um erro técnico ou de regra, mantenha a opção de Diagnóstico Técnico ativada e informe seu usuário do Discord no campo de retorno para que o desenvolvedor possa responder rapidamente!',
    keywords: [
      'suporte',
      'erro',
      'bug',
      'contato',
      'ajuda',
      'discord',
      'email',
      'github',
      'issue',
      'protocolo',
      'feedback',
      'sugestao',
      'desenvolvedor',
      'relatar',
    ],
  },
];

/**
 * Função de busca no manual.
 * Retorna seções e seus itens filtrados pelo termo de pesquisa.
 */
export function searchManual(query: string): ManualSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return MANUAL_SECTIONS;

  return MANUAL_SECTIONS.filter((section) => {
    // Procura no título, subtítulo, sumário ou palavras-chave
    if (
      section.title.toLowerCase().includes(q) ||
      section.subtitle.toLowerCase().includes(q) ||
      section.summary.toLowerCase().includes(q) ||
      section.proTip.toLowerCase().includes(q) ||
      section.keywords.some((k) => k.toLowerCase().includes(q))
    ) {
      return true;
    }

    // Procura nos itens de funcionalidade
    return section.features.some(
      (feat) =>
        feat.title.toLowerCase().includes(q) ||
        feat.description.toLowerCase().includes(q) ||
        feat.howToUse.some((step) => step.toLowerCase().includes(q))
    );
  });
}
