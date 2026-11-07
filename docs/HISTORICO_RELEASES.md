# 📜 Histórico de Releases Publicadas — Ordo Companion

Arquivo histórico contendo o registro imutável de cada versão lançada.

---

## 🚀 Release v1.3.0-beta.1 (2026-11-07)

### Resumo de Usuário (GitHub Release Notes)
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

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- `src/components/PageAnnotationOverlay.tsx` & `src/components/AnnotationToolbar.tsx`: Sistema de anotações desenhadas e manuscritas sobre páginas de livros no leitor de PDF (`PdfViewerModal.tsx`), com suporte avançado a tablets, stylus e toque, ferramentas de Caneta, Marca-Texto (translucidez multiplicativa), Borracha inteligente, paleta tática com os 5 Elementos Paranormais, espessuras selecionáveis, Desfazer/Refazer (Undo/Redo), limpeza rápida e overlay visível em modos de página única e rolagem contínua.
- `src/services/annotations/pageAnnotationsService.ts` & `src/utils/annotationGeometry.ts`: Persistência local no AsyncStorage por livro e página (`@ordo:annotations`), indexação de páginas anotadas com badges visuais, cache em memória síncrono para virada fluida de páginas e normalização de pontos [0, 1] garantindo fidelidade geométrica exata independente do zoom ou tamanho de tela.
- `data/compendium_seed.json` & `src/data/seed/compendium_seed.json`: Base de dados reconstruída com 1.645 entidades únicas do Livro Base v1.3 e 9 suplementos canônicos (incluindo 28 Itens Amaldiçoados Especiais).
- `data/books_pages_seed.json` & `src/data/seed/books_pages_seed.json`: 1.271 páginas mapeadas cobrindo os 10 livros oficiais da Jambô Editora.
- `scripts/extract_raw_pages.py`: Parser adaptado para sufixos de versão (`-v1-3`), preservação de livros cacheados quando apenas um PDF for fornecido e normalização contínua de metadados.
- `scripts/parse_entities.py`: Parser inteligente com detecção de versão (`is_v13`), suporte a 307 seções do sumário digital, 39 condições, 58 armas, 107 rituais e parser dedicado para os 28 Itens Amaldiçoados Especiais.

### ⚔️ Combate e Rolagem de Dados
- `src/types/compendium.ts`: Tipos `CriticalDamageMode`, `WeaponAttackContext` e suporte a modos de crítico em ficha e usuário.
- `src/utils/dice.ts`: Algoritmos `expandFormulaForCritical`, `calculateMaxDamageForFormula` e `rollWeaponDamage`.
- `src/context/AppContext.tsx`: Propagação de contexto de ataque e suporte à sincronização de dano na Mesa Virtual.
- `src/components/DiceToast.tsx`: Atalhos de dano rápido com realce de 20 natural.
- `src/app/(tabs)/characters.tsx` & `src/app/(tabs)/weapons.tsx`: Seletores de modo de crítico, botões de dano máximo e eliminação de truncamento de bônus.

### 🤖 Compatibilidade Android APK & Runtime Hermes
- `.agents/skills/android-apk-audit/SKILL.md`: Criação de skill especializada com auditoria de runtime, checklists de APIs nativas, BackHandler e manipulação de arquivos no Android.
- `.agents/skills/screenshot-bug-triage/SKILL.md`: Criação de skill e fluxo contínuo de triagem e resolução de prints de problemas em `docs/imagens dos problemas/`.
- `GEMINI.md`: Registro do agente `android-apk-guardian` e regras de roteamento automatizado para o ecossistema Android APK.
- `app.json`: Configurações nativas essenciais para APK (`largeHeap: true`, `usesCleartextTraffic: true`, permissão `INTERNET` e `softwareKeyboardLayoutMode: "adjustPan"`).
- `src/services/ai/AiClient.ts`: Resolução dinâmica de host no Android (`10.0.2.2` / dev server IP) para conexão transparente com servidor de IA Ollama local.
- `src/utils/agentSharing.ts`: Reescrita de codificação/decodificação Base64 sem dependências de Node `Buffer` ou browser `btoa`/`atob`, com suporte estrito a UTF-8 e emojis no motor Hermes.
- `src/utils/clipboard.ts`: Utilitário centralizado universal de área de transferência (`copyToClipboard`, `readFromClipboard`) com fallback nativo para `Share.share` e isolamento total de APIs Web.
- `src/components/UserProfileModal.tsx`: Diálogo com `TextInput` nativo para restauração manual de backups JSON, eliminando `window.prompt`, e interceptação de `hardwareBackPress`.
- `src/components/CreateAgentModal.tsx` & `src/components/LevelUpModal.tsx`: Gestão de `BackHandler` com recuo de etapa (`step - 1`), prevenção de descarte acidental via `confirmAction` e consumo do evento.
- `src/app/(tabs)/master.tsx`: Navegação hierárquica por hardware com deseleção de campanha ativa ao tocar Voltar e fechamento em cascata de modais.
- Modais com `BackHandler`: `RecordPreviewModal`, `PrintSheetModal`, `ProtectionModal`, `MoreTabsModal`, `ThemeSelectorModal`, `AppManualModal`, `AiConfigModal`, `UpdateNotificationModal`, `PrerequisiteAlertModal`.
- `src/utils/sheetPrinter.ts` & `src/services/virtualTable/tableSessionExportService.ts`: Blindagem dupla contra vazamento de `window.open` e `document.createElement`, com impressão e compartilhamento via `expo-print`, `expo-sharing` e `Share.share`.
- `docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md`: Registro de 100% de paridade, conclusão dos passos de BackHandler, Clipboard e PDF/Impressão e compilação de 1.392 módulos Hermes.

### 🧪 Testes Automatizados (690 testes passando em 151 suítes - 100% de sucesso)
- `tests/e2e_issues_suite.test.ts`: 39 testes E2E cobrindo todas as 22 correções de prints mobile, UI, APK, PDF, Sync Drive e Voz/IA.
- `tests/pageAnnotations.test.ts` & `tests/pageAnnotationOverlay.test.tsx`: Testes unitários e de componente para anotações desenhadas em páginas de livros (Tablet/Stylus).
- `tests/clipboard.test.ts`: 6 testes unitários cobrindo cópia e leitura Web, simulação de Hermes Android, Share.share nativo e tolerância a falhas.
- `tests/backHandlerNavigation.test.tsx`: 4 testes cobrindo consumo de evento de hardware, recuo de etapas em modais multi-passo e hierarquia de campanhas no Android.
- `tests/databaseIntegrity.test.ts` & `scripts/test_database_integrity.py`: Validação de 1.645 entidades únicas (incluindo os 28 Itens Amaldiçoados Especiais) e integridade referencial dos 10 suplementos.
- `tests/levelUpModal.test.tsx`: Asserção de habilidades de trilha de NEX 65% atualizada conforme progressão canônica.
- `tests/compendiumPdfIntegration.test.tsx`: Índice da seção "Mecânica Básica" atualizado para a folha 19 da v1.3.
- `tests/dice.test.ts`: 20 testes de cálculo de dano crítico determinístico e alternativo.
- `tests/agentSharing.adversarial.test.ts`: Validação de paridade bit-a-bit de codificação Base64 com payloads massivos (até 1 MB) e emojis para Hermes.
- `tests/aiOllama.adversarial.test.ts`: 10 testes de resolução de IP e loopback no Android para IA Ollama local.
- `tests/appJson.adversarial.test.ts`: Testes de estrutura e integridade sintática das configurações do Android APK.
- `tests/progression.test.ts`: 115 testes unitários cobrindo todas as fórmulas de progressão, vitais por NEX, bônus passivos de poderes e origens, alerta permissivo de pré-requisitos e concessão canônica de perícias (`132/132` em `npm run test:rules`).
- `tests/tableExport.test.tsx`: 6 testes automatizados cobrindo cálculo de métricas de sessão, danos sofridos, iniciativas e pistas em `buildTableSessionExportData`, compilação do HTML do PDF tático militar, geração/compartilhamento de JSON e PDF via Expo Sharing e renderização de botões do mestre no `TableScreen` e `TableExportModal`.
- `tests/rulesProtections.test.ts`: 17 testes cobrindo catálogo oficial de proteções, modificações (Reforçada, Blindada, Discreta), cálculo de Defesa e acúmulo com escudos.
- `tests/rulesProficiencies.test.ts`: 22 testes cobrindo proficiências de classe, upgrades cumulativos (Hell Hunters), poderes e penalidade de -2d20 por falta de proficiência.
- `tests/rulesInventorySkills.test.ts`: 15 testes cobrindo teto de 2 vestimentas equipadas, não-cumulatividade (maior bônus) e veto canônico a Luta/Pontaria.
- `tests/defenseProtections.test.ts`: 19 testes de integração do modal de proteção, cálculo e preenchimento de Defesa, RD e sincronização com inventário.
- `tests/proficienciesAndClothing.test.ts`: 20 testes de regras de proficiências, penalidades de -2d20 de ataque e proteção e vestimentas didáticas.
- `tests/frontendCharacters.test.tsx`: 11 testes de frontend validando renderização de banners de proficiência, cards de ataque, contador de vestimentas e reflexão de bônus em perícias.
- `tests/tabNavigation.test.ts`: 11 testes cobrindo navegação canônica, menu Mais e migração de perfis legados.
- `tests/pdfOutOfMemoryPrevention.test.tsx`: 3 testes cobrindo prevenção de OOM e streaming de disco.
- `tests/compendiumPdfIntegration.test.tsx`: 5 testes cobrindo badges de páginas referentes e visualizador in-app.
- Suíte completa verificada com `npm run test:all`: **690 testes aprovados em 151 suítes, 0 falhas, 0 pendências**, e **1.645 entidades** validadas em `test_database_integrity.py`.

---

## 🔮 Backlog de Pendências para v1.2.0-beta.2
- [x] **Mecanismo Unificado de Bônus Passivos e Escalonamento com NEX (`progression.ts`, `LevelUpModal.tsx`, `CreateAgentModal.tsx`, `characters.tsx`)**:
  - Automação de poderes e origens com escalonamento por NEX (*Vitalidade Reforçada*, *Sangue de Ferro*, *Potencial Aprimorado*, *Vontade Inabalável*, *Combatente Esforçado*, *Desgarrado*, *Universitário*, *Vítima*).
  - Bônus fixos de vitais (*Cultista Arrependido*, *Mergulhador*, *Personalidade Esotérica*).
  - Alerta permissivo de pré-requisitos não atendidos com opção de confirmação ("Adicionar mesmo assim").
- [x] Implementação de assistente de voz tático para o G.L.I.T.C.H.
- [x] Suporte a anotações desenhadas na página do livro no tablet (Concluído em PdfViewerModal, PageAnnotationOverlay, AnnotationToolbar e pageAnnotationsService com persistência offline e suporte completo a stylus e gestos).
- [x] Exportação completa de histórico da mesa virtual em formato JSON/PDF (Concluído em table.tsx via expo-sharing e expo-print).

---

