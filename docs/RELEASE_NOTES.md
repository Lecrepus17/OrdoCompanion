# 🩸 Ordo Companion v1.3.0-beta.1

## 🚀 Principais Novidades da v1.3.0-beta.1

* **Livro de Regras Base Atualizado para a Versão Oficial 1.3 (332 páginas)**:
  * **Índice e Regras Expandidos**: Compêndio ampliado para **1.645 entidades únicas** no total, incluindo **606 regras e mecânicas oficiais** indexadas diretamente do Sumário expandido da v1.3.
  * **28 Itens Amaldiçoados Especiais Catalogados**: Extração dedicada e indexação individual de todos os itens icônicos do Livro Base (p. 158-161): *Punhos Enraivecidos*, *Jaqueta de Veríssimo*, *Crânio Espiral*, *Relógio de Arnaldo*, *Arcabuz dos Moretti*, *Coração Pulsante*, *Coroa de Espinhos*, *Frasco de Vitalidade*, *Pérola de Sangue*, *Seringa de Transfiguração*, *Amarras Mortais*, *Casaco de Lodo*, *Coletora*, *Frasco de Lodo*, *Vislumbre do Fim*, *Anéis do Elo Mental*, *Lanterna Reveladora*, *Máscara das Pessoas nas Sombras*, *Munição Jurada*, *Pergaminho da Pertinácia*, *Bateria Reversa*, *Peitoral da Segunda Chance*, *Talismã da Sorte*, *Teclado de Conexão Neural*, *Tela do Pesadelo*, *Veículo Energizado*, *Dedo Decepado* e *Selos Paranormais*.
  * **Novas Condições Canônicas**: Adição oficial das condições `Enlouquecendo` e `Perturbado`, além da atualização do texto de `Sangrando` (estabilização com Medicina DT 20), `Morrendo`, `Asfixiado` e `Vulnerável`. Total de 39 condições no compêndio.
  * **Novo Item Paranormal**: Inclusão do `Medidor de Estabilidade da Membrana` (p. 67/77), equipamento oficial da Ordo Realitas.
  * **Novo Ritual Resgatado & Rituais Revisados**: Adição canônica do ritual `Flagelo de Sangue` (2º Círculo de Sangue, folha 143), elevando o total para 107 rituais. Atualização dos textos de `Transfusão Vital` (alvo/perda de vida), `Miasma Entrópico` (versão verdadeira inclui discente) e `Transfigurar Água`.
  * **Poderes e Habilidades Canônicos Revisados**:
    * `Artista Marcial`: Seus ataques desarmados "se tornam" armas ágeis e causam 1d6 de dano letal.
    * `Golpe Pesado`: Especificado para armas corpo a corpo ("Enquanto estiver empunhando uma arma corpo a corpo...").
    * `Disparo Impactante` (Atirador de Elite): Redefinido para gastar 2 PE para realizar manobras de derrubar, desarmar, empurrar ou quebrar com armas de fogo sem exigir modificações prévias.
    * `Lâmina Maldita` (Lâmina Paranormal): Permite gastar +1 PE para conjurar *Amaldiçoar Arma* como ação de movimento caso já conheça o ritual.
    * Nova regra de `Perda de Vida`: Redução direta de PV ignorando resistência a dano (RD).
  * **Balanceamento de Ameaças Oficiais**:
    * `Titã de Sangue`: Tamanho corrigido para *Enorme* (pág. 211).
    * `Aracnasita`: Ajustada imunidade a dano exceto dano de fogo (pág. 216).
    * `O Anfitrião`: Enigma de Medo atualizado para anular imunidades a dano com captura exata de VD (400).
    * `Nidere` e `Sempiternal`: Bônus de perícias e Percepção às Cegas sincronizados.
  * **"Ver no Livro" 100% Sincronizado**: Integração de leitura rápida de páginas atualizada para os 10 suplementos oficiais (1.271 páginas totais indexadas). Cópia do PDF oficial v1.3 (332 páginas) sincronizada em `pdfs/`, `public/pdfs/` e `dist/pdfs/`.

* **Anotações Desenhadas na Página do Livro (Tablet & Stylus)**:
  * **Ferramentas de Desenho em PDF**: Suporte a Caneta, Marca-Texto translúcido e Borracha inteligente diretamente sobre as páginas dos livros nos modos página única e rolagem contínua (`PdfViewerModal.tsx`).
  * **Paleta Tática dos 5 Elementos**: Cores temáticas de Sangue, Morte, Conhecimento, Energia e Medo, controle de espessura, Desfazer/Refazer (*Undo/Redo*) e persistência offline por página (`@ordo:annotations`).

* **Sistema Flexível de Dano Crítico de Armas (Dados vs Dano)**:
  * **Modo Canônico Padrão (Multiplicar Dados)**: Conforme o livro oficial de *Ordem Paranormal* (multiplica os dados rolados pelo crítico, ex: `1d8+3` vira `2d8+3`).
  * **Modo Alternativo (Multiplicar Dano)**: Rola o dano base da arma e multiplica o resultado obtido pelo multiplicador (ex: rola `1d8+3` = 7, multiplica por 2 ➔ 14).
  * **Configuração Global e por Agente**: Seletor global no perfil do usuário (`UserProfileModal.tsx`) e seletor rápido na aba de Ataques da ficha do agente (`characters.tsx`).

* **Botão de Crítico Máximo & Atalhos no DiceToast**:
  * **Botão "Crítico Máx"**: Calcula o valor máximo determinístico das faces dos dados nos cards da ficha, Armaria e prévias.
  * **Atalhos no Toast de Ataque**: Rolou teste de ataque? Os botões `[Dano]`, `[Crítico]` e `[Crítico Máx]` surgem diretamente no toast, com destaque dourado especial para 20 natural.

* **Resolução Completa dos 22 Problemas Mobile, UI, APK, PDF, Sync & IA**:
  * **IA G.L.I.T.C.H. & Voz Nativa (Problemas 5, 7, 21)**: Validação resiliente da chave padrão do Gemini com fallback automático para o motor offline, síntese de voz (TTS) nativa no Android/iOS via `expo-speech` com limpeza de tags e priorização de entidades do compêndio sobre o manual de ajuda.
  * **Leitor de Livros & PDF (Problemas 3, 4, 8, 16, 22)**: Download direto de PDFs específicos (sem abrir a pasta raiz do Drive), eliminação do carregamento infinito e do botão flutuante sobreposto, pré-visualização segura de capas/páginas no app e reformulação tipográfica do leitor em modo texto.
  * **Ficha de Agente & Impressão (Problemas 10, 11, 12, 18, 20)**: Rolagem horizontal na barra de ações superior da ficha, edição de armas diretamente na aba de Ataques do agente, correção de truncamento nas pílulas de busca de habilidades, ajuste do botão de Assistente de Proteção e pré-visualização de impressão de agente no celular.
  * **Exportação de Cards & Gerador de Imagem (Problemas 6, 9, 14, 15)**: Correção de sobreposição entre seletor PNG e botões de ação, compartilhamento nativo de arquivo de imagem via `expo-sharing`, destravamento das opções inferiores no modo paisagem e exportação em formato PNG (1080×1350) em vez de folha A4 gigante.
  * **Central de Suporte, Configurações Dev & Modo Paisagem Global (Problemas 1, 2, 17, 19)**: Link direto funcional para o Discord com cópia de usuário, modal de configurações e webhook para o desenvolvedor/dono, correção do cabeçalho de suporte e compactação responsiva de barras em modo paisagem em todo o app.
  * **Sincronização Google Drive sem Ressurreição de PDFs (Problema 13)**: Implementação de tombstones (`deletedDynamicBookIds`) no `SmartMergeEngine` e `OfflineDataRepository` para garantir que PDFs excluídos não retornem ao sincronizar com a nuvem.

---

## 📲 Instalação e Atualização (Android APK)
1. Baixe o arquivo **`OrdoCompanion.apk`** anexado abaixo na seção **Assets**.
2. Abra o arquivo no seu smartphone ou tablet Android para instalar ou atualizar mantendo todas as suas fichas, anotações e campanhas salvas.
