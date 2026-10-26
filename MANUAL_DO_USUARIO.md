# Manual do Usuário — OrdoCompanion
### Guia Completo de Telas, Funcionalidades e Regras de Ordem Paranormal RPG

Bem-vindo ao **OrdoCompanion**, o aplicativo definitivo para jogadores e mestres de **Ordem Paranormal RPG**. Este manual cobre detalhadamente a proposta, o funcionamento de cada tela, a mecânica de cada funcionalidade e as regras oficiais implementadas no sistema.

---

## 📑 Índice do Manual

1. [Visão Geral & Interface do Aplicativo](#1-visão-geral--interface-do-aplicativo)
2. [Compêndio Geral & Busca Instantânea](#2-compêndio-geral--busca-instantânea)
3. [Fichas de Agentes & Criação Assistida](#3-fichas-de-agentes--criação-assistida)
4. [Central do Mestre & Gestor de Campanhas](#4-central-do-mestre--gestor-de-campanhas)
5. [Mesa Virtual (VTT) & Sessão Multiplayer](#5-mesa-virtual-vtt--sessão-multiplayer)
6. [Armaria & Oficina de Modificações](#6-armaria--oficina-de-modificações)
7. [Acervo de Livros & Visualizador de PDFs](#7-acervo-de-livros--visualizador-de-pdfs)
8. [Rolador de Dados Oficial Ordem Paranormal](#8-rolador-de-dados-oficial-ordem-paranormal)
9. [Salvos, Listas de Sessão, Homebrew & Backup JSON](#9-salvos-listas-de-sessão-homebrew--backup-json)
10. [Detalhes de Registros & Editor Homebrew](#10-detalhes-de-registros--editor-homebrew)
11. [Perfil do Jogador & Sincronização com Google Drive](#11-perfil-do-jogador--sincronização-com-google-drive)
12. [Personalização & 7 Temas Paranormais](#12-personalização--7-temas-paranormais)
13. [Impressão e Exportação de Fichas em PDF](#13-impressão-e-exportação-de-fichas-em-pdf)
14. [Tabela de Regras Oficiais & Referência Rápida](#14-tabela-de-regras-oficiais--referência-rápida)
15. [G.L.I.T.C.H. & Inteligência Artificial Paranormal (Guia Completo)](#15-glitch--inteligência-artificial-paranormal-guia-completo)

---

## 1. Visão Geral & Interface do Aplicativo

O OrdoCompanion foi projetado para uso tático durante sessões presenciais ou remotas, dispensando o manuseio lento de livros físicos ou arquivos PDFs pesados.

### As 9 Telas Principais do Aplicativo
- 🔍 **Compêndio Geral (`/(tabs)`):** Acesso a 1.367 entidades oficiais com busca fonética sem acentos e filtros por classe, livro e elemento.
- 👥 **Fichas de Agentes (`/(tabs)/characters`):** Criação assistida passo a passo e gestão completa de fichas com cálculo automático de pontos vitais e rolagem em 1 toque.
- ⚔️ **Armaria & Modificações (`/(tabs)/weapons`):** Forja e customização de armas com passos automáticos de dano na escala canônica, modificações de arma/munição e maldições.
- 📚 **Acervo de Livros (`/(tabs)/books`):** Leitor de alta nitidez dos 10 suplementos oficiais com busca textual profunda nas 1.261 páginas.
- 🎲 **Rolador de Dados (`/(tabs)/dice`):** Rolador com a regra oficial canônica de dados de atributos (maior d20 para atributos $\ge 1$, pior de $2 + |attr|$ para atributos $\le 0$) e parser de fórmulas livres.
- 🔖 **Salvos & Homebrew (`/(tabs)/favorites`):** Favoritos com estrela, listas personalizadas de campanha, central de homebrews e backup JSON portátil.
- 🛡️ **Central do Mestre (`/(tabs)/master`):** Gerenciador de campanhas, cenas investigativas, pistas com revelação, controle rápido de PV de monstros e combate com iniciativa.
- 🎮 **Mesa Virtual VTT (`/(tabs)/table`):** Sessão multiplayer conectada em tempo real com código de sala (ORD-XXXX), monitor da equipe, iniciativa e feed de rolagens ao vivo.
- 🔮 **G.L.I.T.C.H. - IA Paranormal (`/(tabs)/oracle`):** Assistente inteligente com pesquisa em todas as 1.261 páginas de livros e 1.367 entidades, suporte a múltiplos provedores (Gemini, Groq, Ollama local e Offline), personas das 4 Relíquias e vínculo com a ficha do agente.

### Barra de Navegação Inferior & Personalização de Abas
- **Abas Fixadas:** A barra inferior exibe as principais telas configuradas.
- **Botão "Mais" (Ícone de Três Pontos):** Abre uma janela modal permitindo acessar rapidamente qualquer uma das telas secundárias ou personalizar quais abas devem permanecer fixadas na barra inferior do seu aparelho.

### Barra Superior (Ações Globais)
- 🔮 **Botão G.L.I.T.C.H. (Ícone de Brilho / Faísca Roxa):** Abre a tela da Inteligência Artificial instantaneamente de qualquer lugar do app para tirar dúvidas de regras durante o calor da sessão.
- ❓ **Botão de Ajuda / Manual (Ícone de Interrogação):** Abre o manual interativo na tela, selecionando automaticamente o capítulo correspondente à tela onde você está.
- 🎨 **Botão de Temas (Paleta de Cores):** Alterna instantaneamente entre os 7 temas visuais inspirados nos Elementos do Outro Lado.
- 👤 **Botão de Perfil (Agente):** Configura seu codinome, campanha e estado de sincronização em nuvem (com ponto luminoso verde/azul/vermelho).
- 📢 **Toast Global de Dados (`DiceToast`):** Sempre que qualquer dado for rolado (no compêndio, na ficha, na armaria ou no feed da mesa), o resultado surge no topo da tela com indicação visual de Sucesso Crítico (20) ou Desastre (1).

---

## 2. Compêndio Geral & Busca Instantânea

Localizado na primeira aba (`index.tsx`), reúne todos os registros oficiais dos 10 livros canônicos.

### Principais Funcionalidades:
1. **Busca Fonética Sem Acentos:**
   - Permite digitar termos sem pontuação (ex: `cicatrizacao`, `odio incontrolavel`, `degolificada`) e encontrar o registro imediatamente.
2. **Filtro por Categorias (Carrossel Horizontal):**
   - Rituais, Poderes, Origens, Classes, Trilhas, Armas, Itens, Criaturas, Perícias, Condições e Regras.
3. **Filtro por Elemento Paranormal:**
   - Sangue, Morte, Conhecimento, Energia, Medo ou Nenhum.
4. **Filtro por Classe Aplicável:**
   - Isole opções exclusivas para Combatente, Especialista, Ocultista ou Sem classe.
5. **Seletor de Livros:**
   - Marque ou desmarque livros específicos entre os 10 oficiais para adequar a busca às permissões da mesa do seu mestre.
6. **Ocultação Tática de Categorias:**
   - Oculte capítulos de regras gerais ou monstros quando quiser focar estritamente em habilidades de personagem.
7. **Botão "Ver no Livro":**
   - Toque no ícone de livro em qualquer card para abrir o PDF original diretamente na página do registro.
8. **Rolagem Rápida Embutida:**
   - Fórmulas de dano presentes em rituais e armas possuem botões diretos de rolagem sem necessidade de abrir o rolador de dados.
9. **Alternância de Layout:**
   - Escolha entre 1 coluna (leitura detalhada) ou 2 colunas em grade (compacta para tablets e telas grandes).

---

## 3. Fichas de Agentes & Criação Assistida

Localizada na aba **Agentes** (`characters.tsx`), fornece gerenciamento completo da vida de um agente da Ordo Realitas.

### Funcionalidades da Ficha:
1. **Criação Assistida em 5 Etapas Oficiais:**
   - **Etapa 1 (Identidade):** Nome do investigador, codinome, jogador e patente.
   - **Etapa 2 (Origem):** Escolha entre as 59 origens oficiais com concessão automática de perícias treinadas e poderes exclusivos.
   - **Etapa 3 (Classe):** Seleção de Combatente, Especialista, Ocultista ou Sobrevivente, calculando PV, PE e Sanidade com proficiências de armas e proteções.
   - **Etapa 4 (Atributos):** Distribuição equilibrada de 4 pontos de atributos (3 pontos para Sobrevivente) entre AGI, FOR, INT, PRE e VIG (mínimo 0, máximo 3 na criação).
   - **Etapa 5 (Perícias & Rituais):** Seleção guiada respeitando a cota exata de perícias da classe com substituição automática de perícias duplicadas entre classe e origem. Para Ocultistas, escolha de 3 rituais de 1º círculo.
2. **Progressão de NEX (+5% NEX Assistido):**
   - Ao avançar de nível, o sistema calcula os ganhos de PV/PE/SAN, limite de PE por rodada, DT de rituais e guia a seleção de Trilha (10%), Poderes (15%, 30%...), Aumento de Atributos (+1) e Graus de Treinamento.
3. **Cálculo Automático de Pontos Vitais e Ajuste Livre de Máximos:**
   - **Pontos de Vida (PV Máximo):** Calculado por Classe, NEX e Vigor (VIG).
   - **Pontos de Esforço (PE Máximo):** Calculado por Classe, NEX e Presença (PRE).
   - **Sanidade (SAN Máxima):** Calculada por Classe e NEX.
   - **Botão "Editar Máx":** Permite alterar livremente os pontos máximos para acomodar poderes paranormais, itens amaldiçoados ou homebrews.
4. **Defesas e Mobilidade:**
   - **Defesa:** $10 + \text{Agilidade} + \text{Equipamentos}$.
   - **Esquiva:** $\text{Defesa} + \text{Reflexos}$.
   - **Bloqueio:** $\text{Resistência a Dano (RD)} = \text{Luta}$.
   - **Deslocamento:** 9 metros padrão com modificadores de armadura/itens.
5. **Tabela das 28 Perícias Oficiais com Rolagem em 1 Toque:**
   - Quatro graus de treino: Destreinado (+0), Treinado (+5), Veterano (+10) e Expert (+15).
   - Bônus adicionais e penalidades de carga ajustáveis.
   - **Rolagem em 1 Toque:** Toque no ícone de dado de qualquer perícia para rolar automaticamente $N\text{d}20$ pelo atributo base + bônus de treino.
6. **Armamento & Ataques Vinculados:**
   - Importe armas customizadas diretamente da Armaria.
   - Toque em "Rolar Ataque" para acerto e "Rolar Dano" para calcular o impacto.
7. **Inventário & Patente da Ordem:**
   - Capacidade de carga calculada por Força ($5 \times \text{FOR}$, mínimo 5).
   - Alerta visual caso o personagem ultrapasse os limites de itens por categoria da sua Patente (Recruta, Operador, Agente Especial, Oficial de Operações, Agente de Elite).
8. **Compartilhamento Portátil via Código de Ficha (`ORDO-SHEET`):**
   - Compartilhe seu agente com o mestre ou transfira para outro celular gerando um código seguro compactado (sem depender de internet ou nuvem).
9. **Impressão em Folha A4:**
   - Botão para exportar a ficha preenchida em PDF nos layouts oficiais Jambô.

---

## 4. Central do Mestre & Gestor de Campanhas

Localizada na aba **Mestre** (`master.tsx`), centraliza o controle narrativo, tático e investigativo da mesa de RPG.

### Funcionalidades do Mestre:
1. **Gestão de Múltiplas Campanhas:**
   - Crie e alterne entre missões com título, subtítulo, nível de ameaça recomendado (Iniciante a Extremo), patente sugerida e anotações secretas do mestre.
2. **História, Cenas & Pistas Investigativas:**
   - Organize a investigação em cenas e capítulos com controle de revelação de pistas para os agentes.
3. **Monstros & Combate Rápido:**
   - Importe criaturas oficiais do Compêndio com 1 clique ou crie ameaças customizadas.
   - Durante o combate, altere os PVs dos monstros em tempo real com botões rápidos (+5, -5, +10, -10).
4. **Agentes da Mesa (Manual ou Vinculado via Código):**
   - Acompanhe todos os investigadores da equipe em um só lugar. Peça aos jogadores o código de compartilhamento e vincule a ficha para monitorar PV e Sanidade ao vivo.
5. **Rastreador de Iniciativa e Turnos:**
   - Rola iniciativa geral de todos os agentes e monstros ou aceita inserção manual de resultados obtidos em dados físicos na mesa.
6. **Integração com a Mesa Virtual (VTT):**
   - Botão direto para iniciar a sessão na Mesa Virtual conectada à campanha ativa.

---

## 5. Mesa Virtual (VTT) & Sessão Multiplayer

Localizada na aba **Mesa** (`table.tsx`), conecta jogadores e mestres durante a sessão de RPG em tempo real.

### Funcionalidades da Mesa Virtual:
1. **Criação de Sala com Código ORD-XXXX:**
   - O Mestre cria a sala com código alfanumérico de 4 dígitos (ex: `ORD-7821`) vinculado à campanha ativa.
   - Jogadores entram digitando o código e selecionando sua ficha de agente.
2. **Dois Modos de Conexão:**
   - **Simulação Local:** Permite testar combates e rolagens no mesmo aparelho ou rede local.
   - **Nuvem Supabase Realtime:** Conexão entre múltiplos celulares e computadores pela internet com sincronização em tempo real.
3. **Painel da Equipe (Party):**
   - Exibe cartões em tempo real com PV, PE, Sanidade, Defesa e condições de cada investigador.
   - Status visual de "Morrendo" quando os PVs de um jogador chegam a zero.
4. **Combate & Iniciativa Sincronizada:**
   - Jogadores rolam sua iniciativa com 1 toque e o mestre adiciona monstros.
   - A ordem de turnos e o avanço de rodadas são transmitidos para as telas de todos os jogadores simultaneamente.
5. **Feed Global de Rolagens de Dados:**
   - Qualquer rolagem de dado feita na ficha, arma ou compêndio surge no feed para todos os participantes com autor, fórmula e destaque de 20 (Crítico) ou 1 (Desastre).
6. **Transmissão de Cenas e Pistas:**
   - O Mestre transmite a cena atual e pistas descobertas para consulta imediata na tela dos jogadores.

---

## 6. Armaria & Oficina de Modificações

Localizada na aba **Armaria** (`weapons.tsx`), automatiza a confecção e cálculos de armas.

### Funcionalidades da Armaria:
1. **Escolha de Arma Base:**
   - Selecione armas canônicas (Fuzil de Assalto, Katana, Machado, Revólver, Arco Composto) ou crie modelos do zero.
2. **Escala Oficial de Passos de Dano:**
   - Ao aplicar modificações como *Calibre Grosso*, o sistema sobe o dano automaticamente na escala canônica:
     $$\text{1d4} \to \text{1d6} \to \text{1d8} \to \text{1d10} \to \text{1d12} \to \text{2d8} \to \text{2d10} \to \text{2d12} \to \text{3d8} \to \text{4d6} \to \text{3d10} \to \text{4d8} \to \text{3d12} \to \text{4d10} \to \text{4d12}$$
3. **Modificações Oficiais & Diferenciação Canônica (Arma vs Balas):**
   - **Regra Oficial:** Modificações de arma aumentam a **Categoria da Arma**, enquanto modificações de munição (Dum Dum, Explosiva, Perfurante) aumentam a **Categoria das Balas/Munição** de forma independente!
   - *Mira Laser:* Reduz margem de ameaça em 2 (ex: 19 vira 17), +1 categoria da arma.
   - *Cruel:* +2 no dano, +1 categoria da arma.
   - *Perigosa:* Reduz margem de ameaça em 2, +1 categoria da arma.
   - *Alongada:* +2 em testes de ataque, +1 categoria da arma.
   - *Silenciador:* Reduz penalidade de furtividade ao disparar, +1 categoria da arma.
   - *Dum Dum (Munição):* Aumenta multiplicador crítico em +2 (ex: x2 vira x4, x3 vira x5) e eleva a **Categoria das Balas** em +1 (a arma não sobe de categoria por causa da munição).
   - *Explosiva (Munição):* Causa +2d6 pontos de dano e eleva a **Categoria das Balas** em +1.
   - *Munição Perfurante:* Ignora até 5 pontos de RD do alvo e eleva a **Categoria das Balas** em +1.
4. **Maldições Elementais:**
   - *Carniceira (Morte):* Eleva o multiplicador crítico em +1 e cura em acertos críticos (+1 categoria da arma).
   - *Hemofágica (Sangue):* Concede dano extra de Sangue e cura o agente (+1 categoria da arma).
   - *Energética (Energia):* Transforma o dano em Energia, ignora RD e confere +5 de acerto (+1 categoria da arma).
5. **Equipar em Ficha:**
   - Toque em "Equipar em Ficha" para vincular a arma aos Ataques e ao Inventário do seu agente.
   - Opcionalmente adiciona também o pacote de munição correspondente ao inventário com sua própria categoria (ex: Balas Curtas Dum Dum como Categoria I).

---

## 7. Acervo de Livros & Visualizador de PDFs

Localizada na aba **Livros** (`books.tsx`), reúne as 1.261 páginas de conteúdo integral dos 10 livros:
1. `Livro base.pdf` (322 p.)
2. `Sobrevivendo-Ao-Horror-v1.pdf` (226 p.)
3. `Arquivos-Secretos-01.pdf` a `09.pdf` (713 p. somadas)

### Funcionalidades do Leitor:
1. **Busca Textual Profunda:**
   - Pesquise qualquer termo nas 1.261 páginas em milissegundos e visualize trechos de contexto antes de abrir.
2. **Visualizador de Alta Performance:**
   - Navegação por páginas anterior / próxima e salto direto por número de página.
   - Alternância entre renderização gráfica do PDF e texto extraído.
   - Controle de resolução de DPI (72, 150 e 260 DPI) para balancear velocidade de rede e nitidez cristalina.
3. **Leitor Externo:**
   - Opção para abrir o PDF completo no leitor nativo do dispositivo via URL com âncora `#page=N`.

---

## 8. Rolador de Dados Oficial Ordem Paranormal

Localizado na aba **Dados** (`dice.tsx`), foi construído para seguir rigorosamente as regras do sistema de Tormenta20 / Ordem Paranormal.

### Regras Canônicas Implementadas:
1. **Atributo Positivo ($\ge 1$):**
   - Rola $N$ dados d20 e seleciona o **maior** valor obtido, somando o treinamento e outros bônus.
2. **Penalidade de Atributo ($\le 0$):**
   - Rola $2 + |\text{atributo}|$ dados d20 e seleciona o **menor** resultado obtido (o pior dado).
3. **Sucesso Crítico & Desastre:**
   - Detecção automática de 20 natural (Crítico em verde) e 1 natural (Desastre em vermelho).
4. **Parser de Fórmulas Livres:**
   - Suporta expressões como `4d6+10`, `2d8+1d6+4`, `3d10-2` ou atalhos de criaturas como `5d20+20`.
5. **Histórico com Re-Rolagem:**
   - Histórico completo com data, horário, dados individuais rolados e botão para repetir o mesmo teste com 1 toque.

---

## 9. Salvos, Listas de Sessão, Homebrew & Backup JSON

Localizado na aba **Salvos** (`favorites.tsx`), é a central de organização de campanha e segurança de dados.

### Sub-Abas:
1. **Favoritos:** Lista rápida de todos os registros marcados com estrela.
2. **Listas Salvas:** Crie pastas customizadas para organizar monstros da sessão, rituais do vilão ou itens encontrados.
3. **Editados / Homebrew:** Visualização de todo o conteúdo customizado criado pelo usuário. Itens oficiais que foram modificados contam com a opção "Restaurar Padrão" para desfazer edições com segurança.
4. **Backup JSON:**
   - Exporte uma cópia completa de suas fichas, armas e preferências em formato JSON legível.
   - Cole o backup em outro aparelho para transferir seus agentes sem precisar de internet ou contas.
5. **Temas & Visual:** Acesso à seleção visual de temas.

---

## 10. Detalhes de Registros & Editor Homebrew

Ao tocar em qualquer card do Compêndio, abre-se a tela de **Detalhes** (`entity/[id].tsx`), e ao tocar em "+", abre-se o **Editor Homebrew** (`entity/editor.tsx`).

### Recursos:
1. **Ficha Técnica Detalhada:**
   - Para rituais: Círculo, Custo de PE, Execução, Alcance, Alvo, Duração, Resistência e versões Discente/Verdadeiro.
   - Para criaturas: VD, PV, Defesa, Atributos, Presença Perturbadora e Enigma de Medo.
2. **Rolagem no Próprio Texto:**
   - Se o texto contiver `4d8+4`, há um botão ao lado para rolar imediatamente.
3. **Editor Homebrew:**
   - Permite forjar novos rituais, criaturas, origens, trilhas, poderes ou armas caseiras preenchendo formulários validados.

---

## 11. Perfil do Jogador & Sincronização com Google Drive

Acessado pelo ícone de Agente no topo direito de qualquer tela (`UserProfileModal.tsx`).

### Recursos de Sincronização:
1. **Identidade do Jogador:**
   - Nome, codinome, classe favorita, campanha e mestre.
2. **Google Drive via OAuth2:**
   - Conecta diretamente à sua conta pessoal do Google, sem servidores intermediários terceiros.
3. **Algoritmo Smart Merge:**
   - Resolve conflitos automaticamente comparando a data de alteração (`updatedAt`) de cada ficha individualmente.
   - Une favoritos e listas em conjuntos sem perder dados criados em outro aparelho.
4. **Sincronização em Segundo Plano:**
   - Salva silenciosamente e exibe o estado luminoso no botão:
     - 🟢 **Verde:** Totalmente sincronizado e atualizado.
     - 🔵 **Azul:** Sincronizando alterações.
     - 🔴 **Vermelho:** Necessita reconexão.

---

## 12. Personalização & 7 Temas Paranormais

Acessado pelo ícone de Paleta de Cores (`ThemeSelectorModal.tsx`).

| Tema | Inspiração | Estética Principal |
| :--- | :--- | :--- |
| **Agente da Ordem** | Ordo Realitas (Padrão) | Preto absoluto, cinza escuro, detalhes vermelhos e dourados |
| **Sangue** | Elemento Sangue | Vermelho escarlate profundo, rubi e sentimento visceral |
| **Morte** | Elemento Morte | Cinza lúgubre, cinzas de espiral e lodo temporal |
| **Conhecimento** | Elemento Conhecimento | Dourado arcano, sigilos dourados e preto obsidiana |
| **Energia** | Elemento Energia | Roxo elétrico, néon vívido e faíscas caóticas |
| **Medo** | Elemento Medo | Cinzento espectral, névoa gélida e terror inexplicável |
| **Arquivo Iluminado** | Modo Claro (Light) | Fundo branco papel, alto contraste e tipografia datilografada |

---

## 13. Impressão e Exportação de Fichas em PDF

Acessado através do botão "Imprimir Ficha" dentro de qualquer agente (`PrintSheetModal.tsx`).

### Destaques da Impressão:
1. **Modelos Jambô:** Suporte ao layout clássico do *Livro Base* e ao layout tático de *Sobrevivendo ao Horror*.
2. **Notação Canônica em Romanos:** Perícias treinadas são convertidas automaticamente para `I` (Treinado), `II` (Veterano) e `III` (Expert).
3. **Compatibilidade Multiplataforma:** Dispara impressão direta via Wi-Fi no Android/iOS ou gera arquivo PDF A4 pronto para download no navegador.

---

## 14. Tabela de Regras Oficiais & Referência Rápida

### Limites de Itens por Patente
| Patente | Categoria I | Categoria II | Categoria III | Categoria IV | Limite de Crédito |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Recruta** | 2 | 0 | 0 | 0 | Baixo |
| **Operador** | 3 | 1 | 0 | 0 | Médio |
| **Agente Especial** | 3 | 2 | 1 | 0 | Médio |
| **Oficial de Operações** | 3 | 3 | 2 | 1 | Alto |
| **Agente de Elite** | 3 | 3 | 3 | 2 | Ilimitado |

### Pontos de Vida, Esforço e Sanidade por Classe
| Classe | PV Inicial | PV por NEX | PE Inicial | PE por NEX | Sanidade Inicial | Sanidade por NEX |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Combatente** | $20 + \text{VIG}$ | $4 + \text{VIG}$ | $2 + \text{PRE}$ | $2 + \text{PRE}$ | 12 | 3 |
| **Especialista** | $16 + \text{VIG}$ | $3 + \text{VIG}$ | $3 + \text{PRE}$ | $3 + \text{PRE}$ | 16 | 4 |
| **Ocultista** | $12 + \text{VIG}$ | $2 + \text{VIG}$ | $4 + \text{PRE}$ | $4 + \text{PRE}$ | 20 | 5 |
| **Sobrevivente** | $8 + \text{VIG}$ | $+2$ | $2 + \text{PRE}$ | $+1$ | 8 | $+2$ |

---

## 15. G.L.I.T.C.H. & Inteligência Artificial Paranormal (Guia Completo)

O **G.L.I.T.C.H.** (*Guia Lógico de Interferências Transcendentais do Caos Humano*) é a central de inteligência artificial tática integrada ao OrdoCompanion. Desenvolvido com arquitetura **RAG** (*Retrieval-Augmented Generation*), ele pesquisa instantaneamente nas 1.261 páginas dos 10 livros canônicos de Ordem Paranormal, 1.367 entidades oficiais do compêndio e na documentação do aplicativo para tirar dúvidas de regras, calcular mecânicas e auxiliar o mestre e os jogadores.

O sistema adota uma filosofia **100% Custo Zero Vitalício** e suporte agnóstico a múltiplos provedores de inteligência artificial, permitindo que você escolha como e onde rodar sua IA: via nuvem ultrarrápida, via modelos open-source locais sem internet ou através do sintetizador embutido no celular.

---

### 15.1. Provedores de IA Suportados: Como Usar Cada Tipo

O OrdoCompanion não fica restrito a um único serviço. Você pode alternar livremente entre os 5 provedores suportados no modal de configurações (ícone de engrenagem no cabeçalho do chat):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PROVEDORES SUPORTADOS NO G.L.I.T.C.H.                 │
├─────────────────────┬───────────────────┬───────────────┬───────────────────┤
│ Provedor            │ Tipo              │ Requer Chave? │ Conexão Exigida   │
├─────────────────────┼───────────────────┼───────────────┼───────────────────┤
│ Google Gemini       │ Nuvem (Oficial)   │ Sim (Grátis)  │ Internet          │
│ Groq Cloud          │ Nuvem (Llama 3)   │ Sim (Grátis)  │ Internet          │
│ Ollama Local        │ Local (Seu PC)    │ Não           │ Offline (Rede)    │
│ OpenRouter          │ Nuvem (Multi-IA)  │ Sim (Grátis)  │ Internet          │
│ Modo Offline Nativo │ Celular (Nativo)  │ Não           │ 100% Offline      │
└─────────────────────┴───────────────────┴───────────────┴───────────────────┘
```

---

#### A. Google Gemini (Padrão Recomendado)
O Google Gemini é o motor padrão do aplicativo. Oferece alta precisão de raciocínio lógico, interpretação impecável das regras de RPG e respostas rápidas.

- **Chave Padrão do Sistema (Pronta de Fábrica):** O OrdoCompanion já vem com uma chave de API padrão configurada. Quando você abre o aplicativo pela primeira vez, ele já está pronto para conversar sem exigir configuração prévia!
- **Chave Pessoal Gratuita (Cotas Dedicadas):** Se desejar cotas individuais ilimitadas para você, é possível criar sua própria chave gratuita:
  1. No modal de configurações, toque em **"Obter Chave Grátis no Google AI Studio (30 seg)"** ou acesse: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
  2. Faça login com sua conta do Google e clique em **"Create API Key"**. Não é solicitado nenhum cartão de crédito.
  3. Copie a chave gerada (iniciada com `AIzaSy...`) e cole no campo "Chave de API" do aplicativo.
  4. Toque em **"Salvar Configurações"**.
- **Restaurar Padrão:** Caso utilize uma chave pessoal e queira voltar a usar a chave padrão embutida do sistema, basta tocar no botão **"Restaurar Padrão"** que surge no banner superior do modal.
- **Modelos Disponíveis:**
  - `gemini-flash-lite-latest` *(Recomendado)*: Respostas ultra-rápidas com cota muito generosa.
  - `gemini-flash-latest`: Modelo balanceado com raciocínio profundo.
  - `gemini-3.8-flash`: Modelo de última geração com alta capacidade analítica.
  - *Modelo Customizado:* Digite qualquer outro modelo oficial compatível no campo de texto.

---

#### B. Groq Cloud (Llama 3.3 70B com Velocidade Relâmpago)
A Groq é uma das plataformas em nuvem mais rápidas do mundo. Ela utiliza chips especializados LPUs (*Language Processing Units*), gerando respostas de parágrafos inteiros em frações de segundo, executando o modelo de código aberto de alta capacidade **Meta Llama 3.3 70B**.

- **Por que usar Groq?**
  - Respostas quase instantâneas (tempo de espera praticamente nulo).
  - Executa o Llama 3.3 70B, que possui excelente fluência em Português do Brasil.
  - Plano gratuito generoso sem pedir cartão de crédito.
- **Como Configurar o Groq Passo a Passo:**
  1. Acesse o console oficial da Groq: [console.groq.com/keys](https://console.groq.com/keys).
  2. Clique em **"Sign Up"** e faça login com sua conta Google ou GitHub.
  3. No menu lateral, acesse **API Keys** e clique no botão **"Create API Key"**.
  4. Dê um nome à chave (ex.: `OrdoCompanion`) e copie o código gerado (iniciado com `gsk_...`).
  5. Abra o OrdoCompanion, acesse a tela do G.L.I.T.C.H. e toque no ícone de engrenagem.
  6. Em "Provedor de IA", toque no botão **"Groq Cloud (Llama 3)"**.
  7. Cole sua chave `gsk_...` no campo de Chave de API.
  8. Selecione o modelo `llama-3.3-70b-versatile` (ou `llama-3.1-8b-instant` se preferir velocidade extrema).
  9. Toque em **"Testar Conexão com a API"** para ver a confirmação em verde e salve!

---

#### C. Ollama Local (100% Offline e Privado no seu Computador)
Se você vai jogar em uma chácara, sítio, convenção ou porão sem qualquer conexão com a internet, ou se você exige **privacidade absoluta** sem enviar nenhum dado para servidores externos, o **Ollama** é a solução definitiva.

O Ollama executa modelos de inteligência artificial diretamente no processador e placa de vídeo (GPU) do seu próprio computador (Windows, macOS ou Linux).

- **Como Configurar o Ollama Passo a Passo:**
  1. **Instale o Ollama:** Acesse [ollama.com](https://ollama.com) e baixe o instalador para o seu sistema operacional.
  2. **Baixe o Modelo no Terminal:** Abra o PowerShell, Prompt de Comando ou Terminal e digite:
     ```bash
     ollama run llama3.3
     ```
     *(Para computadores com menos memória de vídeo, você pode usar `ollama run mistral` ou `ollama run llama3.1:8b`).*
  3. **Servidor Local:** O Ollama inicia automaticamente em segundo plano na porta padrão `11434`, expondo um endpoint totalmente compatível com o padrão OpenAI em:
     ```
     http://localhost:11434/v1/chat/completions
     ```
  4. **Uso no Computador (Web/Desktop):** No OrdoCompanion, selecione o endpoint correspondente e digite o modelo (ex: `llama3.3`).
  5. **Uso no Celular (Mesma Rede Wi-Fi):**
     - Descubra o IP local do seu computador na rede Wi-Fi (no Windows, execute `ipconfig` no terminal; procure por *Endereço IPv4*, ex.: `192.168.1.105`).
     - Configure o Ollama para aceitar conexões locais definindo a variável de ambiente `OLLAMA_HOST=0.0.0.0:11434`.
     - No aplicativo do celular conectado no mesmo Wi-Fi, aponte o endpoint para:
       ```
       http://192.168.1.105:11434/v1/chat/completions
       ```
- **Vantagens do Ollama:** Zero custo, sem limite de mensagens por minuto, sem necessidade de internet e privacidade total dos seus dados.

---

#### D. OpenRouter (Centenas de Modelos Abertos e Proprietários)
O **OpenRouter** é um roteador universal que oferece acesso a centenas de inteligências artificiais através de uma única API padrão OpenAI.

- **Como Configurar:**
  1. Crie uma chave em [openrouter.ai/keys](https://openrouter.ai/keys).
  2. Cole a chave iniciada com `sk-or-v1-...` nas configurações.
  3. Selecione ou digite o identificador do modelo desejado, como por exemplo:
     - `meta-llama/llama-3.3-70b-instruct:free` (100% gratuito).
     - Modelos avançados da Anthropic, Mistral, Qwen ou OpenAI.

---

#### E. Modo Offline Local Nativo (Motor Interno do Celular)
Quando você estiver no meio de uma sessão presencial sem sinal de internet no celular e sem um computador executando o Ollama por perto, o OrdoCompanion não te deixa na mão!

- **Como Ativar:** Basta abrir o modal de configurações e selecionar **"Modo Offline Local (Sem chave)"**.
- **Como Funciona:** O próprio aplicativo executa um motor sintetizador inteligente escrito em TypeScript que consulta localmente os 1.367 registros do compêndio, tabelas de armas, regras de dano, perícias e as 1.261 páginas de livros salvas na memória do aparelho.
- **Vozes das Relíquias Mantidas:** O sintetizador offline suporta todas as 4 vozes de Relíquias (Anfitrião, Magistrada, Deus da Morte, Diabo) e cita os livros canônicos de forma 100% autônoma.

---

### 15.2. Voz & Personas das 4 Relíquias do Outro Lado + Ordo Realitas + Aleatório

Logo abaixo do cabeçalho da tela do chat, há um **carrossel horizontal de seleção rápida** onde você escolhe quem responde às suas perguntas.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PERSONAS DO OUTRO LADO                                  │
├────────────────┬──────────────┬─────────┬───────────────────────────────────────────────┤
│ Persona        │ Elemento     │ Emoji   │ Estilo & Tom de Voz                           │
├────────────────┼──────────────┼─────────┼───────────────────────────────────────────────┤
│ G.L.I.T.C.H.   │ Realidade    │ 🔮      │ Formal, acolhedor e leal colega da Ordem      │
│ O Anfitrião    │ Energia ⚡   │ ⚡      │ Showman caótico, bombástico, irônico e show   │
│ A Magistrada   │ Conhec. 👁️   │ 👁️      │ Solene, fria, simétrica e tribunal cósmico    │
│ Deus da Morte  │ Morte ⏳     │ ⏳      │ Melancólico, poético, lento e espiral temporal│
│ O Diabo        │ Sangue 🩸    │ 🩸      │ Visceral, agressivo, voraz, focado em combate │
│ Aleatório      │ Outro Lado   │ 🎲      │ Sorteia uma das 4 Relíquias a cada resposta   │
└────────────────┴──────────────┴─────────┴───────────────────────────────────────────────┘
```

#### A Regra de Ouro Canônica Inquebrável
> [!IMPORTANT]
> **Nenhuma Relíquia mente, erra ou distorce as regras do RPG.**
> A persona altera a dramatização, os cumprimentos, as piadas e o tom de voz teatral, mas **todos os cálculos de dano, passos de armas, custos de PE, limites de patente, atributos e citações de páginas de livros permanecem 100% matematicamente exatos e canônicos**.

---

### 15.3. Contexto da Ficha de Agente Ativa em Jogo

No topo da tela do chat, há uma barra de fichas com botões do seu agente (ex.: `Arthur`, `Dante`, `Elena`) ou `Geral`:

1. **Como Funciona:** Quando você toca no nome de um dos seus agentes cadastrados, o G.L.I.T.C.H. recebe instantaneamente o prontuário completo do personagem:
   - NEX, Classe, Trilha, Origem e Patente da Ordem.
   - Atributos (AGI, FOR, INT, PRE, VIG).
   - Pontos Vitais Atuais e Máximos (PV, PE e Sanidade).
   - Defesa atual, Esquiva e Bloqueio.
   - Lista completa de Perícias Treinadas com seus graus de treino (+5, +10, +15).
   - Rituais aprendidos e Armas equipadas.
2. **Exemplos Práticos de Perguntas Contextualizadas:**
   - *"Posso conjurar Velocidade Mortal no meu turno com meus pontos de esforço atuais?"* → A IA confere seu limite de PE/rodada por NEX e seu PE atual e responde com precisão.
   - *"Quantos dados eu rolo no meu tiro com o Fuzil de Assalto e qual meu bônus de acerto?"* → A IA analisa sua Agilidade e sua perícia Pontaria e monta a rolagem exata.
   - *"Qual é a minha DT de rituais?"* → A IA calcula $10 + \text{PE por rodada} + \text{Presença}$ com base nos atributos do seu personagem.

---

### 15.4. Ações Interativas e Clicáveis nas Respostas (RAG)

Quando o G.L.I.T.C.H. gera uma resposta, ele cria automaticamente botões interativos no próprio balão da conversa:

- 📖 **Abrir [Livro] (Pág. X):** Abre o leitor interno de PDFs exatamente na página citada, permitindo conferir o texto original e as ilustrações sem sair do aplicativo.
- 🔍 **Ver "[Entidade]":** Redireciona imediatamente para o Compêndio Geral com o filtro aplicado naquela criatura, ritual, poder ou equipamento.
- 🎲 **Rolar [Fórmula]:** Rola os dados diretamente no HUD global (ex.: `🎲 Rolar 3d8+4`), exibindo o resultado em tempo real no topo da tela.
- 👉 **Ir para [Aba]:** Botão de atalho para navegar até a tela relevante (Armaria, Compêndio, Fichas de Agentes, Mesa Virtual, etc.).

---

### 15.5. Ferramentas da Tela do Oráculo

- **Botão "Testar Conexão com a API":** Localizado dentro do modal de configurações, envia uma requisição leve de verificação para testar a validade da chave de API e a conectividade com os servidores do provedor, exibindo confirmação em verde ou mensagem de diagnóstico clara em vermelho.
- **Fallback Offline Inteligente:** Um interruptor (*switch*) nas configurações que, quando ativado, faz o app recorrer automaticamente à base local caso ocorram erros temporários na nuvem (como sobrecarga `503 Service Unavailable`, limite de requisições `429 Rate Limit` ou queda de sinal de internet).
- **Instruções Personalizadas Adicionais (System Prompt):** Campo de texto no modal para você definir diretrizes específicas para o seu jogo (ex.: *"Responda de forma sucinta com tópicos breves"*, *"Nossa mesa utiliza a regra caseira de dano massivo"*).
- **Limpeza de Histórico:** Toque no ícone de lixeira no cabeçalho superior para limpar o histórico de mensagens e reiniciar a conversa.
- **Sugestões Rápidas (Quick Prompts):** Quando o chat estiver vazio, toque nos balões sugeridos para tirar dúvidas comuns em 1 toque (regras de crítico, passos de dano na armaria, regras de sanidade, etc.).
- **Atalho de Teclado no PC/Web:** Pressione a tecla **Enter** para enviar a mensagem instantaneamente e **Shift + Enter** para quebrar linhas.
- **Higienização de Fórmulas e LaTeX:** O G.L.I.T.C.H. converte automaticamente expressões matemáticas em texto claro e legível, sem quebras de formatação no celular.

---

> OrdoCompanion — Desenvolvido para a Ordo Realitas. Que a Realidade prevaleça!
