# Manual do Usuário — OrdoCompanion
### Guia Completo de Telas, Funcionalidades e Regras de Ordem Paranormal RPG

Bem-vindo ao **OrdoCompanion**, o aplicativo definitivo para jogadores e mestres de **Ordem Paranormal RPG**. Este manual cobre detalhadamente a proposta, o funcionamento de cada tela, a mecânica de cada funcionalidade e as regras oficiais implementadas no sistema.

---

## 📑 Índice do Manual

1. [Visão Geral & Interface do Aplicativo](#1-visão-geral--interface-do-aplicativo)
2. [Compêndio Geral & Busca Instantânea](#2-compêndio-geral--busca-instantânea)
3. [Fichas de Agentes (Gerenciamento Completo)](#3-fichas-de-agentes-gerenciamento-completo)
4. [Armaria & Oficina de Modificações](#4-armaria--oficina-de-modificações)
5. [Acervo de Livros & Visualizador de PDFs](#5-acervo-de-livros--visualizador-de-pdfs)
6. [Rolador de Dados Oficial Ordem Paranormal](#6-rolador-de-dados-oficial-ordem-paranormal)
7. [Salvos, Listas de Sessão, Homebrew & Backup JSON](#7-salvos-listas-de-sessão-homebrew--backup-json)
8. [Detalhes de Registros & Editor Homebrew](#8-detalhes-de-registros--editor-homebrew)
9. [Perfil do Jogador & Sincronização com Google Drive](#9-perfil-do-jogador--sincronização-com-google-drive)
10. [Personalização & 7 Temas Paranormais](#10-personalização--7-temas-paranormais)
11. [Impressão e Exportação de Fichas em PDF](#11-impressão-e-exportação-de-fichas-em-pdf)
12. [Tabela de Regras Oficiais & Referência Rápida](#12-tabela-de-regras-oficiais--referência-rápida)
13. [G.L.I.T.C.H. & Inteligência Artificial Paranormal](#13-glitch--inteligência-artificial-paranormal)

---

## 1. Visão Geral & Interface do Aplicativo

O OrdoCompanion foi projetado para uso tático durante sessões presenciais ou remotas, dispensando o manuseio lento de livros físicos ou arquivos PDFs pesados.

### Barra de Navegação Inferior (6 Abas)
- 🔍 **Compêndio:** Acesso a 1.367 entidades oficiais com busca sem acentos e filtros por classe, livro e elemento.
- 👥 **Agentes:** Criação e acompanhamento de fichas completas com cálculo automático de estatísticas e rolagem em 1 toque.
- ⚔️ **Armaria:** Forja e customização de armas com passos automáticos de dano, modificações e maldições.
- 📚 **Livros:** Leitor de alta nitidez dos 10 suplementos oficiais com busca textual profunda nas 1.261 páginas.
- 🎲 **Dados:** Rolador com a regra oficial canônica de dados de atributos e parser de fórmulas livres.
- 🔖 **Salvos:** Favoritos, listas de campanha, central de homebrews e backup JSON portátil.

### Barra Superior (Ações Globais)
- ❓ **Botão de Ajuda / Manual (Ícone de Interrogação):** Abre o manual interativo na tela, selecionando automaticamente o capítulo correspondente à tela onde você está.
- 🎨 **Botão de Temas (Paleta de Cores):** Alterna instantaneamente entre os 7 temas visuais inspirados nos Elementos do Outro Lado.
- 👤 **Botão de Perfil (Agente):** Configura seu codinome, campanha e estado de sincronização em nuvem (com ponto luminoso verde/azul/vermelho).
- 📢 **Toast Global de Dados (`DiceToast`):** Sempre que qualquer dado for rolado (no compêndio, na ficha ou na armaria), o resultado surge no topo da tela com indicação visual de Sucesso Crítico (20) ou Desastre (1).

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

## 3. Fichas de Agentes (Gerenciamento Completo)

Localizada na aba **Agentes** (`characters.tsx`), fornece gerenciamento completo da vida de um agente da Ordo Realitas.

### Funcionalidades da Ficha:
1. **Cálculo Automático de Pontos Vitais:**
   - **Pontos de Vida (PV Máximo):** Calculado com base na Classe, NEX e Vigor (VIG).
   - **Pontos de Esforço (PE Máximo):** Calculado com base na Classe, NEX e Presença (PRE).
   - **Sanidade (SAN Máxima):** Calculada com base na Classe e NEX.
2. **Defesas e Mobilidade:**
   - **Defesa:** $10 + \text{Agilidade} + \text{Equipamentos}$.
   - **Esquiva:** $\text{Defesa} + \text{Reflexos}$.
   - **Bloqueio:** $\text{Resistência a Dano (RD)} = \text{Luta}$.
   - **Deslocamento:** 9 metros padrão com modificadores de armadura/itens.
3. **Tabela das 28 Perícias Oficiais:**
   - Quatro graus de treino: Destreinado (+0), Treinado (+5), Veterano (+10) e Expert (+15).
   - Bônus adicionais e penalidades de carga ajustáveis.
   - **Rolagem em 1 Toque:** Toque no ícone de dado de qualquer perícia para rolar automaticamente $N\text{d}20$ pelo atributo base + bônus de treino.
4. **Armamento & Ataques:**
   - Importe armas customizadas diretamente da Armaria.
   - Toque em "Rolar Ataque" para acerto e "Rolar Dano" para calcular o impacto.
5. **Inventário & Patente da Ordem:**
   - Capacidade de carga calculada por Força ($5 \times \text{FOR}$, mínimo 5).
   - Alerta visual caso o personagem ultrapasse os limites de itens por categoria da sua Patente (Recruta, Operador, Agente Especial, Oficial de Operações, Agente de Elite).
6. **Impressão em Folha A4:**
   - Botão para exportar a ficha preenchida em PDF nos layouts oficiais Jambô.

---

## 4. Armaria & Oficina de Modificações

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

## 5. Acervo de Livros & Visualizador de PDFs

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

## 6. Rolador de Dados Oficial Ordem Paranormal

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

## 7. Salvos, Listas de Sessão, Homebrew & Backup JSON

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

## 8. Detalhes de Registros & Editor Homebrew

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

## 9. Perfil do Jogador & Sincronização com Google Drive

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

## 10. Personalização & 7 Temas Paranormais

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

## 11. Impressão e Exportação de Fichas em PDF

Acessado através do botão "Imprimir Ficha" dentro de qualquer agente (`PrintSheetModal.tsx`).

### Destaques da Impressão:
1. **Modelos Jambô:** Suporte ao layout clássico do *Livro Base* e ao layout tático de *Sobrevivendo ao Horror*.
2. **Notação Canônica em Romanos:** Perícias treinadas são convertidas automaticamente para `I` (Treinado), `II` (Veterano) e `III` (Expert).
3. **Compatibilidade Multiplataforma:** Dispara impressão direta via Wi-Fi no Android/iOS ou gera arquivo PDF A4 pronto para download no navegador.

---

## 12. Tabela de Regras Oficiais & Referência Rápida

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

## 13. G.L.I.T.C.H. & Inteligência Artificial Paranormal

O **G.L.I.T.C.H.** (*Guia Lógico de Interferências Transcendentais do Caos Humano*) é o assistente inteligente do OrdoCompanion para esclarecer dúvidas sobre as regras de Ordem Paranormal e sobre o funcionamento do aplicativo.

### Destaques Principais:
1. **Custo Zero Vitalício:** O app não exige plano pago nem servidores caros. Utiliza o tier gratuito oficial da Google Gemini API (`models/gemini-2.5-flash` ou similar no Google AI Studio) ou Groq Cloud, além de funcionar 100% offline via sintetizador local.
2. **Seletor de Personas das Relíquias do Outro Lado:**
   - **G.L.I.T.C.H. (Nenhum):** Tom tático, neutro e analítico da Ordo Realitas.
   - **⚡ O Anfitrião (Energia):** Bombástico, caótico, debochado e showman de TV paranomal.
   - **👁️ A Magistrada (Conhecimento):** Solene, fria, magistral e justa, equilibrando os autos da Máscara do Desespero.
   - **⏳ O Deus da Morte (Morte):** Cadenciado, inescapável e sombrio, lembrando a decadência do tempo e a Espiral de Lodo.
   - **🩸 O Diabo (Sangue):** Feroz, visceral, intimidador e abrasivo, falando do Trono de Sangue.
   - **🎲 Aleatório:** A cada pergunta enviada, uma das 4 Relíquias é sorteada aleatoriamente para responder com sua própria voz e estilo!
3. **Regra de Ouro Canônica Inquebrável:** Qualquer que seja a Relíquia ativa, **nenhuma delas jamais mente, inventa ou erra regras mecânicas, cálculos ou funções do app**. O tom é puramente imersivo, enquanto os números, testes e citações são 100% canônicos e exatos.
4. **Citações e Saltos Diretos aos Livros:** Quando o G.L.I.T.C.H. cita uma página (ex.: `[Livro Base, Pág. 84]`), um botão interativo surge no balão permitindo abrir o visualizador de PDF na página exata com 1 toque.
5. **Ações Rápidas de Rolagem e Navegação:** Atalhos como `[Rolar: 3d20+5]` abrem imediatamente o rolador global com a fórmula pronta, e `[Aba: weapons]` redireciona para a tela do app.
6. **Contexto de Ficha:** Selecione seu agente no topo do chat para que a IA adapte respostas ao seu NEX, classe, poderes e atributos.
7. **Modo Offline:** Mesmo sem internet ou sem chave de API configurada, o sintetizador local consulta a base de dados interna de 1.261 páginas e 1.367 entidades com vozes personalizadas para cada Relíquia.

---

> OrdoCompanion — Desenvolvido para a Ordo Realitas. Que a Realidade prevaleça!
