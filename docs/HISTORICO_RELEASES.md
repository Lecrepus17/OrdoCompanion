# 📜 Histórico de Releases Publicadas — Ordo Companion

Arquivo histórico contendo o registro imutável de cada versão lançada.

---

## 🚀 Release v1.7.0-beta.1 (2026-11-20)

### Resumo de Usuário (GitHub Release Notes)
* **Aplicativo para PC (Web App + PWA Instalável Offline — `SOL-MEL-001`)**:
  * O Ordo Companion agora pode ser instalado e executado como aplicativo standalone no computador (Windows, macOS e Linux) via Chrome/Edge com suporte offline (Service Worker + manifesto PWA), atualização direta pelo modal de novidades (`Atualizar Aplicativo no PC`), botão de instalação no Perfil e exportação/importação direta de arquivos `.json` de backup no disco.
* **Central de Suporte com Filas Separadas (Erros vs. Melhorias)**:
  * Chamados enviados pelo aplicativo (incluindo APK Android via Proxy Seguro Supabase ou Discord Webhook) agora identificam a fila de triagem (`🐛 ERROS` para bugs/erros de regra vs. `💡 MELHORIAS` para sugestões) e suportam roteamento automático para canais distintos no Discord (`#erros` e `#melhorias`), com fallback seguro para o webhook geral.
* **Login Google Drive OAuth (Android & PC/Web) + Política de Privacidade & Termos (`SOL-ERR-001`)**:
  * Suporte ao scheme reverso oficial do Google no Android APK, páginas estáticas de callback `/oauthredirect` para Web/PC, mensagens claras para erros OAuth (403/400) com painel de diagnóstico copiável na aba Nuvem e publicação oficial de Política de Privacidade e Termos de Serviço.

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- **Aplicativo para PC via Web App & PWA Instalável Offline (`SOL-MEL-001`)**:
  - Adicionados `public/manifest.json`, `public/sw.js` (Network-First em navegação e Stale-While-Revalidate em assets estáticos, preservando PDFs no IndexedDB), ícones `public/favicon.png` e `public/icon.png`, e tags PWA + registro de `beforeinstallprompt` / Service Worker em `src/app/+html.tsx` e `app.json` (`expo.web` standalone mantendo `expo.android` intacto).
  - Criado utilitário `src/utils/desktopPwa.ts` 100% isolado de APIs web no Hermes (`Platform.OS === 'web'`) para instalação PWA desktop e download/importação de arquivos `.json` no computador.
  - Adicionado suporte a atualização direta no PC (`UpdateCheckerService.applyWebOrDesktopUpdate`, `webUrl` em `src/services/updates/types.ts` e botão `Atualizar Aplicativo no PC` em `UpdateNotificationModal.tsx`).
  - Integrado botão de instalação PWA no PC (e card informativo no Android) além de `Baixar .JSON no PC` / `Abrir Arquivo .JSON do PC` em `UserProfileModal.tsx`, scripts `build:web` / `build:pc` em `package.json` e seção PC em `scripts/create_release.js`.
- **Especialista Web/Desktop PWA (`web-desktop-guardian`) & UI/UX Multiplataforma (`mobile-ui-expert`)**:
  - Criada a skill `.agents/skills/web-desktop-audit/SKILL.md` e registrado o agente `💻 web-desktop-guardian` em `GEMINI.md` (Padrão 7), `data/request_triage_questions.json`, `request-triage` e `screenshot-bug-triage`.
  - Atualizado o agente `📱 mobile-ui-expert` e `.agents/skills/mobile-ui-audit/SKILL.md` para auditar UI/UX multiplataforma com contraste em Tema Claro e Tema Escuro, mobile compacto (`360px` / paisagem), tablet (`2 colunas`) e Desktop PC (`1024px–1920px+` com `maxWidth` e janela PWA redimensionável).
- **Central de Solicitações & Triagem Crítica (`request-triage`, `docs/SOLICITACOES.md`)**:
  - Criada a Fonte Única da Verdade (SSOT) das perguntas de avaliação crítica em `data/request_triage_questions.json` (permitindo adicionar, editar ou desativar perguntas em um único arquivo).
  - Criado o leitor incremental do Discord `scripts/discord_requests.js` (`npm run requests:fetch`, `requests:ack`, `requests:test`, `requests:questions`) com suporte a canais de texto, canais de fórum e embeds da Central de Suporte, separando estritamente **🐛 Erros** e **💡 Melhorias** e evitando repetições via `docs/.discord_requests_state.json`.
  - Criada a skill `.agents/skills/request-triage/SKILL.md` e integrado o Padrão 6 em `GEMINI.md` exigindo postura crítica ("Anti-Sim-Senhor"), parecer dos agentes especializados (`rpg-rules-expert`, `mobile-ui-expert`, `android-apk-guardian`, `sync-offline-guardian`, `glitch-prompt-engineer`, `data-pipeline-architect`) e aprovação via questionário interativo (`ask_question`) tanto para demandas do Discord quanto diretas no chat.
- **Roteamento Separado no App & Compatibilidade APK (`SupportService.ts`, `SupportCenterView.tsx`, `support-webhook/index.ts`)**:
  - Adicionado suporte a Webhooks específicos por fila (`errors` vs. `improvements`) em `SupportService` (com persistência ofuscada `obf:v1:...` no `AsyncStorage` compatível com Hermes Android APK), no Proxy Seguro do Supabase (`DISCORD_BUGS_WEBHOOK_URL`, `DISCORD_SUGGESTIONS_WEBHOOK_URL`) e no painel de desenvolvedor do `SupportCenterView.tsx`.

### 🐛 Correções de Bugs (Fixes)
- **Instalação PWA Desktop no Build Estático Web/PC (`public/index.html`, `public/icon-512.png`, `public/manifest.json`, `public/sw.js`, `desktopPwa.ts`)**:
  - Criado template `public/index.html` com placeholders Expo (`output: "single"`), já que o `expo export -p web` em modo `single` ignorava `src/app/+html.tsx`, garantindo que `dist/index.html` inclua `<link rel="manifest">`, listener `beforeinstallprompt` e registro de `/sw.js`.
  - Gerado ícone real `public/icon-512.png` (`512x512`) e separadas as entradas `"any"` e `"maskable"` com dimensões exatas em `public/manifest.json`, além de instruções atualizadas para Chrome (`⋮ ➔ Transmitir, salvar e compartilhar ➔ Instalar página como app...`) e Edge.
- **Login Google OAuth no Android APK & Web/PC Estático (`GoogleDriveService.ts`, `UserProfileModal.tsx`, `AndroidManifest.xml`, `app.json`, `public/oauthredirect*`, `public/sw.js`)**:
  - Registrado o scheme reverso oficial do Client ID Android (`com.googleusercontent.apps.556485656355-grsjjk5ol3keimcnn905f5vrd7lk0jos`) no `AndroidManifest.xml` e `app.json` (`intentFilters`), além de suporte a `showInRecents: true` no Custom Tabs (`promptAsync`).
  - Implementado seletor persistido de modo de redirecionamento (`custom_scheme` vs. `reverse_client_id`), tradução clara de erros OAuth do Google (`access_denied` / modo Teste 403, `redirect_uri_mismatch` / `invalid_request` 400, `disallowed_useragent`, `org_internal`) e painel colapsável de solução e diagnóstico copiável na aba Nuvem do `UserProfileModal.tsx` (com instruções e controles adaptados para Android vs. Web/PC).
  - Criadas páginas estáticas de callback OAuth (`public/oauthredirect.html` e `public/oauthredirect/index.html`) compatíveis com `expo-web-browser` (`ExpoWebBrowserRedirectHandle`, `ExpoWebBrowser_OriginUrl_`, `postMessage`) evitando HTTP 404 em servidores estáticos (`localhost:3000`, GitHub Pages) e adicionado bypass de `/oauthredirect` + fallback SPA em `public/sw.js`.
- **Blindagem Pré-Release, SemVer Beta & Build Web/PC Seguro (`UpdateCheckerService.ts`, `scripts/build_web_pc.js`, `public/index.html`, `AndroidManifest.xml`, `scripts/create_release.js`, `.github/workflows/release-apk.yml`, `tests/frontendOracle.test.tsx`)**:
  - Corrigido `compareSemVer` em `UpdateCheckerService.ts` para comparar sufixos `-beta.N` / `-rc.N` quando ambos os lados possuem pré-lançamento, preservando compatibilidade com versões sem sufixo.
  - Criado `scripts/build_web_pc.js` para `npm run build:web` e `npm run build:pc`: remove `dist/pdfs/` (~764 MB de PDFs locais protegidos) antes de hospedar, valida artefatos PWA + `/oauthredirect` e alerta se `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPPORT_PROXY_URL` estiverem ausentes.
  - Atualizado `public/index.html` (`http-equiv`, `viewport-fit=cover`, `overscroll-behavior-y: none`, variáveis safe-area e scrollbars discretas para Desktop) e adicionado `android:usesCleartextTraffic="true"` em `<application>` no `android/app/src/main/AndroidManifest.xml` para builds release.
  - Adicionada trava de working tree limpa em `scripts/create_release.js` (com `--allow-dirty` opcional) e preservadas as notas completas de `docs/RELEASE_NOTES.md` (Android + PC/Web PWA) no workflow `.github/workflows/release-apk.yml`.
  - Eliminada condição de corrida no teste de ditado nativo em `tests/frontendOracle.test.tsx`.

### 🧪 Testes Automatizados
- Adicionada suíte `tests/desktopPwaSupport.test.ts` (9 testes validando manifesto PWA, Service Worker offline, tags HTML/`app.json`, blindagem no runtime Android Hermes, instalação PWA, download de backup `.json`, `applyWebOrDesktopUpdate`, `UpdateNotificationModal`, `UserProfileModal`, registro dos especialistas `web-desktop-guardian`/`mobile-ui-expert` e sanitização/validação do `scripts/build_web_pc.js`).
- Adicionada suíte `tests/discordRequests.test.ts` (5 testes cobrindo SSOT em `data/request_triage_questions.json`, classificação separada Erros vs. Melhorias, cursor incremental com BigInt Snowflake e roteamento de webhooks com compatibilidade Hermes APK).
- Expandida suíte `tests/googleDriveService.test.ts` cobrindo `getReverseClientIdScheme`, alternância e persistência de `setRedirectMode` no Android, `formatGoogleOAuthError`, `getOAuthDiagnostics` e páginas `/oauthredirect`.
- Expandida suíte `tests/updateChecker.test.ts` cobrindo comparação SemVer de versões `-beta.N` e `-rc.N`.
- Validação completa pós-edição via `npm run test:all` (`tsc --noEmit` + `tsx --test` + `npm run test:db`), `npm run build:pc` (bundle `dist/` sem `dist/pdfs/`) e `npx expo export --platform android`.

---

## 🚀 Release v1.6.0-beta.1 (2026-11-20)

### Resumo de Usuário (GitHub Release Notes)
* **Criador Completo de Ameaças Estilo C.R.I.S. (`#ORD-913969`)**:
  * Novo `ThreatCreatorModal` acessível tanto pela **Aba do Mestre** (campanhas) quanto pelo botão **Criar Ameaça (C.R.I.S.)** na tela inicial do **Compêndio**.
  * Presets automáticos de **VD 20 a 400** (PV, Defesa, Resistências Fort/Ref/Von, Atributos, Presença Perturbadora com imunidade canônica até VD 340, Ataque, Dano e RD), ataques e habilidades estruturadas com rolagem rápida em 1 toque (incluindo margem de ameaça crítica na rolagem de ataque), Enigma de Medo e opção de exportação ao Compêndio.
* **Mascarados & Forma Suprema (`#ORD-33762V` — Arquivos Secretos #02 p. 47, 94-97)**:
  * Novo painel interativo **Máscara & Forma Suprema** na ficha do agente com ativação (`-6 SAN`, `+20 PV`, `+10 PE`, `+10 Defesa`), contador e manutenção por rodada (`-2 SAN` com alerta ao zerar SAN/entrar em Morrendo), suporte a `+5` em testes/ataques/iniciativa/reações/atributos e DT de rituais, `+2d` de dano em armas (sem multiplicar no crítico) e rituais, além da opção **Discente/Verdadeiro Livre**.
  * Novo filtro **Mascarados & Aliados** no seletor do Compêndio da ficha.
* **Maldições para Proteções & Acessórios, Armaria Expandida & Compêndio (`#ORD-5322T7`, `#ORD-4017YV`, `#ORD-4662K3`)**:
  * Suporte completo às **10 Maldições Oficiais de Proteções & Escudos** e **13 Maldições Oficiais de Acessórios** em `ProtectionModal`, `ItemEditorModal` e **Armaria**, com progressão canônica (`+II` na 1ª maldição, `+I` nas seguintes) e bloqueio automático de elementos opressores (*Sangue ↔ Conhecimento ↔ Energia ↔ Morte*) inclusive contra o elemento base do item.
  * Sub-aba na **Armaria** expandida para **Proteções & Itens** com atalhos rápidos (`+ Proteção`, `+ Vestimenta`, `+ Utensílio`, `+ Item Geral`), escolha de proteções equipáveis múltiplas (`replaceExisting=false`) no `ProtectionModal`, recálculo automático de Defesa/RD ao equipar/desequipar no inventário e respeito estrito a `appliesTo` em Itens Gerais.
* **Correções de Regras na Evolução Assistida & Auditoria Mobile/APK (`#ORD-5322T7`)**:
  * Isolamento estrito de aumentos de atributo (somente 20/50/80/95%), promoções de perícias no NEX 35%/70% restritas a perícias já treinadas em degraus de `+5`, cota canônica `2 + Int` no Grau de Treinamento de Combatente Veterano, detecção de *Transcender* como Poder Paranormal, isolamento completo do modo *"Não aumentar NEX"* e limite de PE por rodada (`getPeRoundLimit`).
  * Auditoria completa de **UI Mobile/Web (360px & tema claro)** e **Android APK**: `BackHandler` exclusivo no Android e isolamento de `popstate` Web quando modais estão abertos, `onRequestClose`/`statusBarTranslucent`/`KeyboardAvoidingView` em modais, `keyboardShouldPersistTaps="handled"` em listas/modais e contrastes por tokens do tema.
* **Depósito de Itens & Importação do Compêndio na Ficha e na Armaria**:
  * Nova sub-aba dentro da tela **Armaria** funcionando como catálogo compartilhado entre todos os agentes e sincronizado offline, via Google Drive e Supabase, com botão **Compêndio / Importar do Compêndio** para trazer itens e itens amaldiçoados existentes com 1 toque.
  * Três fluxos diretos na aba **Inventário** do agente: **Novo Item**, **Do Depósito** (com escolha entre **Vincular / Usar o Mesmo** ou **Duplicar**) e **Do Compêndio** (158 itens curados entre comuns, paranormais e 60 itens amaldiçoados com atalho `+ Depósito`).
* **Editor Unificado e Modificações Oficiais de Acessórios**:
  * Novo `ItemEditorModal` com seleção opcional de base do Compêndio, tipos/subcategorias de equipamento, espaços decimais (`0,5`) ou nulos (`0`), cargas/usos, melhorias caseiras e modificações oficiais de acessórios (*Aprimorado*, *Discreto*, *Função Adicional* com 2º Aprimorado, *Instrumental*).
* **Mecânicas Interativas de Itens & Status Temporários**:
  * Botão **Usar / Ativar / Rolar** direto nos cards do inventário com suporte a cura de PV/PE/Sanidade, rolagem de dano/explosivos com cálculo automático de **DT** (`10 + PE/rodada + atributo`), gasto de PE e habilidades de perícias.
  * Itens de cura e pontos temporários oferecem escolha rápida **"Aplicar em Mim"** vs **"Aplicar em Aliado (Apenas Rolar)"**, além de badges exclusivos de **PV Temp.** e **PE Temp.** no Status Vital com absorção automática ao sofrer dano/gasto.
  * Consumíveis esgotados permanecem no inventário com badge **`0 usos`** e botão **Usar** bloqueado para preservar registro, oferecendo atalho rápido de **Recarregar / Repor**.
  * Bônus passivos automáticos aplicados quando equipados: carga máxima expandida (*Mochila Militar*), RD adicional de bloqueio (*Braçadeira Reforçada*) e bônus fixos em perícias.

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- **Modelagem, Catálogo Curado e Regras (`src/types/compendium.ts`, `src/utils/inventoryItems.ts`, `src/utils/inventorySkills.ts`, `src/utils/protections.ts`, `src/utils/damageModifiers.ts`, `src/utils/progression.ts`)**: `CharacterMaskConfig`, `ThreatAttackAction`/`ThreatAbilityAction` e campos estruturados de `CampaignMonster`/`CompendiumEntity`; `OFFICIAL_PROTECTION_CURSES` (10), `OFFICIAL_ACCESSORY_CURSES` (13), `areElementsIncompatible`, `calculateCurseCategoryIncrease`, suporte a escudo com `Reforçada` e `shieldCurses`; `+2d` da Forma Suprema sem multiplicar no crítico e bônus/dispensa em rituais; cota `2 + Int` em Combatente Veterano.
- **Criador de Ameaças & Rolagem (`ThreatCreatorModal.tsx`, `src/utils/dice.ts`, `src/context/AppContext.tsx`, `master.tsx`, `index.tsx`, `entity/editor.tsx`, `entity/[id].tsx`, `RecordPreviewModal.tsx`)**: Presets de VD 20–400 com `parseAttr` preservando `0`, geração/edição completa estilo C.R.I.S., inspeção unificada no `RecordPreviewModal` (correção de Defesa duplicada em personagens) e suporte a margem crítica opcional no `rollFormula`.
- **Persistência & Sincronização Híbrida (`IDataRepository.ts`, `OfflineDataRepository.ts`, `SmartMergeEngine.ts`, `AppContext.tsx`)**: Persistência local de `customItems`, `deletedCustomItemIds`, ameaças criadas exportáveis para o compêndio, merge LWW multi-dispositivo (Google Drive / Supabase) e propagação automática de edições para itens vinculados (`shared`).
- **Interface Mobile/Web & Compatibilidade Android APK (`ProtectionModal.tsx`, `ItemEditorModal.tsx`, `LevelUpModal.tsx`, `characters.tsx`, `master.tsx`, `weapons.tsx`, `sheetPrinter.ts`)**: Auditoria completa de 360px, temas claros (`colors.elements.*`), `KeyboardAvoidingView`, `SafeAreaView` insets em modais translúcidos, `BackHandler` isolado no Android, proteção contra stack exploit da Forma Suprema, recálculo automático de proteção/Defesa ao equipar/desequipar itens e correções de evolução assistida (`doNotIncreaseNex`, promoções treinadas `+5`, `Transcender`).

### 🧪 Testes Automatizados
- `npm run test:all` aprovado com **0 falhas**:
  - `npm run typecheck`: `tsc --noEmit` sem erros.
  - `npm run test`: **946** testes passando em **218** suítes (incluindo novas suítes `tests/supportTicketsRegressions.test.tsx` e `tests/threatCreator.test.tsx`, além de cobertura atualizada em `tests/damageModifiers.test.ts`, `tests/progression.test.ts`, `tests/rulesProtections.test.ts` e `tests/inventoryItems.test.ts`).
  - `npm run test:db`: 10 livros e **1.708** entidades verificadas com sucesso.

---

## 🚀 Release v1.5.1-beta.1 (2026-11-14)

### Resumo de Usuário (GitHub Release Notes)
* **Dano Dinâmico por Agente, Preparação de Golpe Tático e Conjuração de Rituais**:
  * Rolagens e cards de ataque agora calculam automaticamente os modificadores do **agente** sem alterar armas compartilhadas da Armaria: atributo correto (`FOR`, `AGI` em armas ágeis/Artista Marcial, `FOR+AGI` em Arco Composto com `Tiro Certeiro`, `INT` em fuzis com `Mira de Elite`), passos extras (`Golpe Pesado`, `Calibre Grosso`, `Máquina de Matar`) e bônus de origens/poderes (`Para Bellum`, `Mão Pesada`, `Ferramenta de Trabalho`, `Balística Avançada`, `Ninja Urbano`).
  * Novo botão **Preparar Golpe Tático** para ativar gastos de PE e buffs em tempo real (`Ataque Especial`, `Potência Máxima`, `Ataque Furtivo`, `Assassinar`, `Destruidor`, `Rajada`, `Amaldiçoar Arma`, `Ódio Incontrolável`, `Chamas do Caos`), com alertas de limite de PE/turno e dedução automática de PE ao rolar, respeitando estritamente o que multiplica no crítico (apenas dados base + `Lancinante`).
  * A aba **Habilidades & Rituais** passa a exibir a **DT** dinâmica, badges de poderes (`Ritual Potente` +INT, `Ritual Intenso` +PRE, catalisadores e `Cajado da Cruz de Sangue`), seletor de círculo (**Padrão**, **Discente**, **Verdadeiro**) e o botão direto **Conjurar & Rolar** com gasto automático de PE.
* **Armas Unificadas entre Agentes e Armaria**:
  * Toda arma de Agente agora é uma arma completa da Armaria (e vice-versa). Tocar em **Editar** ou **Nova Arma** na ficha do Agente abre o mesmo editor completo com arma base, modificações oficiais, maldições e munição.
  * Ao importar ou equipar uma arma da Armaria no Agente, agora é possível escolher entre **Usar a Mesma (Vinculada)** — onde qualquer alteração replica automaticamente para todos os vínculos — ou **Duplicar**, criando uma cópia independente na Armaria com o nome do agente naquele momento (`Nome (Agente)`).
  * Remoções seguras: excluir uma arma no Agente pergunta se deseja remover apenas da ficha ou também da Armaria; excluir na Armaria alerta sobre agentes vinculados antes de confirmar.
* **Botão `Crítico Máx` Sempre Disponível e Cálculo de Crítico Corrigido**:
  * O botão **Crítico Máx** agora aparece sempre junto aos ataques e armas (na Ficha de Agentes, na Armaria, no modal de inspeção e no `DiceToast`), sem depender de configuração oculta.
  * Removida a opção incorreta "Crítico Cheio" das configurações de usuário; o Perfil agora mantém os 3 modos válidos: **Multiplica Dados (Padrão)**, **Multiplica Resultado** e **Perguntar Sempre**.
  * No modo **Multiplica Resultado**, o multiplicador passa a incidir apenas sobre os dados rolados da arma, preservando bônus fixos sem multiplicá-los (ex.: `1d4+2` em `x2` → `(1d4 × 2) + 2`).
* **Importação em Lote de PDFs Mais Segura e Sem Travamentos por Memória**:
  * Aprimorado o envio de múltiplos arquivos PDF de uma só vez no celular, movendo os arquivos temporários diretamente no armazenamento do aparelho sem duplicação em disco e exibindo o progresso por arquivo.
  * Bloqueada qualquer tentativa acidental de download/leitura integral de PDFs em memória RAM no Android (`arrayBuffer`), prevenindo crashes por falta de memória (`OutOfMemoryError`) em livros grandes como *Sobrevivendo ao Horror* (~84 MB).
* **Imagens dos Cards Mais Compactas e Sem Estouro da Moldura**:
  * Corrigidas as caixas de estatísticas que ultrapassavam a borda do card e textos que ocupavam só metade da largura; valores longos agora são abreviados com reticências.
  * A altura da imagem passa a se ajustar ao conteúdo (sem grandes áreas vazias), e a resolução padrão foi otimizada para 800px de largura, gerando arquivos bem menores para Discord/WhatsApp.
* **Exportação e Compartilhamento de Cards em PNG Corrigidos no Android**:
  * Corrigido o erro `Property 'Buffer' doesn't exist` ao baixar ou compartilhar cards no celular, utilizando captura nativa real em PNG (`react-native-view-shot`) com salvamento direto via seletor de pastas do Android ou compartilhamento via `expo-sharing`.
  * Removido o botão de formato `SVG` da barra inferior do gerador de imagens, mantendo os botões diretos **Copiar**, **Compartilhar** e **Baixar**.

* **Reconhecimento de Voz Nativo (Microfone) no G.L.I.T.C.H.**:
  * Ativado o ditado direto pelo botão de microfone no Android e iOS via `expo-speech-recognition`, com solicitação automática de permissão de microfone, transcrição em tempo real e preservação de texto já digitado.
* **Maior Estabilidade Offline no APK Android (Chaves e PDFs)**:
  * Eliminadas falhas silenciosas e potenciais travamentos no Android ao decodificar segredos internos (`.env`), validar senha mestre de livros e extrair metadados/páginas de PDFs offline sem depender de APIs Web/Node ausentes no motor Hermes.
* **Compêndio Completo dos Mascarados, Agentes e Hexatombe (*Arquivos Secretos #02*) e Itens no Inventário**:
  * Corrigida a extração de *Arquivos Secretos #02* (além de aliados e armas de `#06` e `#09` e correção de VD do *Felino-infernal*), restaurando todos os **itens amaldiçoados dos Mascarados** (`Manoplas do Colosso`, `Elmo do Colosso`, `Machado do Mutilador`, `Punhal X`, `Sniper Fantasma`, `A Antena`, `Faca Predadora`), `Catalisador Sofisticado e Horrorizado`, a habilidade de arma `Acoplável`, os 10 recursos de sobrevivência do Hexatombe, os 11 aliados inline, os poderes gerais/de classe e os 5 **Poderes de Intenção**.
  * Armas amaldiçoadas com estatísticas de combate (incluindo `Manoplas do Colosso`, `Punhos Enraivecidos`, `Arcabuz dos Moretti`, `A Primeira Adaga`, `Sniper Fantasma`, etc.) agora aparecem também no filtro **Armas** do Compêndio, na **Armaria** e no seletor de ataques da Ficha, além de a aba **Inventário** da Ficha ganhar o botão **`Do Compêndio`** para adicionar itens diretamente.

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- **`src/utils/damageModifiers.ts`, `src/types/compendium.ts` e `src/utils/dice.ts`**: Criado o motor puro e compatível com Hermes (sem lookbehinds ou globais Web) de resolução dinâmica de dano por agente (`detectAgentDamageModifiers`, `resolveAgentAttackDamage`, `resolveAgentRitualDamage`, `extractRitualDiceFormula`, `getAtaqueEspecialBonus`), mantendo desacoplamento estrito da `CustomWeapon` compartilhada na Armaria (`linkMode: 'shared'`) e estendendo `rollWeaponDamage`/`WeaponAttackContext` para aceitar `normalFormula` e `criticalFormula` resolvidos.
- **`src/components/AttackPreparationModal.tsx`, `src/app/(tabs)/characters.tsx`, `src/components/RecordPreviewModal.tsx`, `src/components/DiceToast.tsx` e `src/types/recordPreview.ts`**: Implementado o modal `AttackPreparationModal` (com `BackHandler`, `onRequestClose`, alocação de `Ataque Especial`, toggles situacionais, buffs elementais, projeção normal/crítica e bloqueio por limite de PE/turno); integrados badges de modificadores, dano efetivo + base, botão **Preparar Golpe Tático**, dedução automática de PE e aba de rituais com DT dinâmica, seletor de círculo e botão **Conjurar & Rolar** via `rollFormula`.
- **`src/utils/weapons.ts`, `src/repositories/OfflineDataRepository.ts`, `src/components/WeaponEditorModal.tsx` e `src/app/(tabs)/characters.tsx`**: Adicionada a modificação oficial `Acoplável` (`Arquivos Secretos #02`, p. 71) em `OFFICIAL_WEAPON_MODS`; atualizado `resolveWeaponTypeFromEntity` para classificar corretamente armas balísticas (`Sniper Fantasma`) e armas corpo a corpo/arremessáveis amaldiçoadas (`Punhal X`, `Faca Predadora`, `A Primeira Adaga`, `Manoplas do Colosso`, etc.); incluídos itens com `damage` no filtro `category === 'weapon'`, em `WeaponEditorModal` e em `compendiumWeapons` da Ficha; adicionado botão **`Do Compêndio`** (`add_item_compendium`) na aba Inventário da Ficha e ampliada a aba de filtro `Poderes de Classe` para exibir também `Poder Geral` e `Poder de Intenção`.
- **`src/components/WeaponEditorModal.tsx`, `src/app/(tabs)/characters.tsx`, `src/app/(tabs)/weapons.tsx` e `src/utils/weapons.ts`**: Extraído o editor completo de armas para componente reutilizável `WeaponEditorModal`, unificando criação/edição entre Agentes e Armaria, com suporte a importação vinculada (`shared`) ou clonagem com sufixo do nome do agente (`duplicate` → `cloneCustomWeaponForAgent`), migração idempotente de ataques legados (`migrateCharacterLegacyAttacksToArmory`) e sincronização automática em cascata (`syncCharacterWithCustomWeapon`).
- **`src/components/CriticalModePromptModal.tsx` e `src/context/AppContext.tsx`**: Adicionados métodos unificados `equipWeaponToCharacter` e `removeAttackFromCharacter`, sincronização de tombstones `deletedCustomWeaponIds` em `SmartMergeEngine`/`OfflineDataRepository`, e modal multiplataforma de escolha para críticos no modo `ask_user` (Armaria, Ficha de Agente, `RecordPreviewModal` e `DiceToast`).
- **`src/services/ai/GlitchVoiceService.ts` e `src/app/(tabs)/oracle.tsx`**: Integrado `expo-speech-recognition` para Speech-to-Text (STT) nativo no Android/iOS via `startListeningAsync`, com gerenciamento de permissões (`requestPermissionsAsync`), limpeza de listeners nativos, mapeamento de erros em português e proteção contra toques duplicados.
- **`app.json`, `package.json` e `android/app/src/main/AndroidManifest.xml`**: Adicionado o plugin `expo-speech-recognition`, a permissão `android.permission.RECORD_AUDIO` e as declarações `<queries>` para `android.speech.RecognitionService` e pacotes de voz do Google.

### 🐛 Correções de Bugs (Fixes)
- **`scripts/parse_entities.py`, `data/compendium_seed.json`, `src/data/seed/compendium_seed.json`, `data/books_pages_seed.json` e `src/data/seed/books_pages_seed.json`**: Corrigido o parser de `PODER PARANORMAL` (impedindo `Pressão Atmosférica` e poderes similares de engolir os blocos seguintes de página), adicionada captura para poderes singulares (`PODER GERAL`, `PODER DE COMBATENTE/ESPECIALISTA/OCULTISTA`) e `Poderes de Intenção`, ajustada a extração de itens/armas/recursos/aliados de `Arquivos Secretos #02`, `#06` e `#09`, inseridos overrides de combate para 9 armas amaldiçoadas especiais (`cursed_weapon_overrides`), além da correção de VD do `Felino-infernal` (VD 120) e extração da `Pistola Taser` (`1.708` entidades únicas no seed).
- **`src/utils/dice.ts`, `src/components/UserProfileModal.tsx`, `src/components/RecordPreviewModal.tsx`, `src/components/DiceToast.tsx`, `src/app/(tabs)/weapons.tsx` e `src/app/(tabs)/characters.tsx`**: Removido `'max_damage'` (`Crítico Cheio`) do tipo `CriticalDamageMode` e das opções do Perfil do Usuário (normalizando perfis legados via `normalizeCriticalDamageMode`), tornando o botão **`Crítico Máx`** sempre visível nas ações de arma/ataque; ajustado o modo `multiply_damage` em `rollWeaponDamage` para multiplicar apenas os dados base da arma sem multiplicar bônus fixos (`(1d4 × 2) + 2`).
- **`src/services/sync/GoogleDriveService.ts`**: Adicionada trava explícita em `downloadPdfFromDrive` bloqueando execução em memória (`res.arrayBuffer()`) fora da plataforma Web, direcionando fluxos móveis exclusivamente para `downloadPdfFromDriveToFile` (streaming direto em disco).
- **`src/services/pdf/PdfCacheService.ts`**: Otimizado `savePdfFromUri` para mover arquivos temporários gerados pelo `DocumentPicker` via `FileSystem.moveAsync` (O(1) sem duplicar 85 MB+ em disco), com fallback para `copyAsync`.
- **`src/components/PdfUploadAccessModal.tsx`**: Corrigida a resolução de nome na importação múltipla (`targetBookFileNameRef` agora só sobrescreve quando `assets.length === 1`), adicionado progresso por arquivo no banner, limpeza de cache órfão (`cleanOrphanDocumentPickerPdfs`) ao concluir o lote e remoção garantida no bloco `finally`.
- **`src/services/pdf/PdfAccessService.ts`**: Simplificada `computeSha256Hex` eliminando ramificação duplicada.
- **`src/services/cardImage/cardExportService.ts` e `src/services/cardImage/types.ts`**: Removido `Buffer.from` (substituído por `utf8ToBase64`), adicionada captura nativa de view em PNG via `react-native-view-shot` (`captureCardViewToPng`) com fallback resiliente para `Print.printToFileAsync`, além de salvamento direto no Android via `StorageAccessFramework` (com fallback para `expo-sharing`).
- **`src/components/cardImage/RecordImageExportModal.tsx`**: Removido o seletor `SVG` do rodapé, acoplado `cardViewRef` (`collapsable={false}`) ao `RecordImageCard` e unificados os botões **Copiar**, **Compartilhar** e **Baixar** (PNG).
- **`src/utils/agentSharing.ts`, `src/utils/secretObfuscator.ts` e `src/services/pdf/PdfAccessService.ts`**: Auditoria geral de compatibilidade do APK no runtime Hermes (Android). Adicionados codecs puros `latin1BytesToString` e `utf8ByteArrayToStringLossy` (compatível com subparte maximal WHATWG sem lançar exceções) e exportados `stringToUtf8ByteArray`/`utf8ByteArrayToString`, substituindo chamadas a `new TextEncoder()` e `new TextDecoder()` que falhavam ou retornavam vazio silenciosamente no Android (`obfuscateSecret`, `deobfuscateSecret`, `estimatePdfPageCountFromBytes`, `computeMasterPasswordHash` e `extractPagesFromPdfBytesFallback`).

### 🧪 Testes Automatizados
- **`tests/pdfOutOfMemoryPrevention.test.tsx`**: Adicionados testes de regressão bloqueando `downloadPdfFromDrive` em RAM no Android e validando importação em lote com múltiplos PDFs grandes (~84 MB) sem chamadas a `fetch()`.
- **`tests/cardImage.test.ts`, `tests/recordImageModal.test.tsx`, `tests/e2e_issues_suite.test.ts` e `tests/setup.ts`**: Adicionados testes simulando Hermes (`Buffer === undefined`) no Android para validar exportação/compartilhamento PNG sem erros e confirmar a remoção do botão SVG (`npm run test:all`: 880/880 testes aprovados, `tsc --noEmit` sem erros e integridade da base Python validada).
- **`tests/glitchVoice.test.ts` e `tests/frontendOracle.test.tsx`**: Adicionados testes cobrindo STT nativo no Android (`ExpoSpeechRecognitionModule`), solicitação/negação de permissão, serviço indisponível e preenchimento automático do campo de entrada na tela do Oráculo.
- **`tests/supportService.test.ts` e `tests/pdfAccessAndUnlock.test.tsx`**: Adicionados testes simulando `TextEncoder = undefined` e `TextDecoder = undefined` no Hermes validando `obfuscateSecret`/`deobfuscateSecret`/`resolveEnvSecret`, decodificação Latin-1/UTF-8 lossy, contagem de páginas PDF e `computeMasterPasswordHash` (`npm run test:all`: 885/885 testes em 211 suítes aprovados, `tsc --noEmit` e `test:db` sem erros).
- **`tests/criticalDamageRules.test.ts`, `tests/dice.test.ts`, `tests/weapons.test.ts`, `tests/smartMerge.test.ts`, `tests/frontendWeapons.test.tsx` e `tests/frontendCharacters.test.tsx`**: Atualizados cenários de `multiply_damage` e remoção de `max_damage`, e adicionados testes de unificação Armaria <-> Agentes, sufixo de clonagem, tombstones de armas, `Crítico Máx` sempre visível e `WeaponEditorModal` na ficha do agente (`npm run test:all`: 895/895 testes em 212 suítes aprovados, `tsc --noEmit` sem erros e `test:db` válido para os 10 livros / 1.645 entidades).
- **`tests/damageModifiers.test.ts`, `tests/frontendDynamicDamageRolls.test.tsx` e `package.json`**: Adicionados 16 testes unitários canônicos de modificadores de dano por agente, crítico (`Lancinante` vs maldições elementais, `Calibre Grosso` `2d6 -> 3d6`, `Golpe Pesado`, `Artista Marcial`, `Ataque Especial`/`Potência Máxima`, `Infiltrador`/`Assassinar`, `Aniquilador`, rituais) integrados ao gate `npm run test:rules` (152/152 aprovados em 38 suítes), e 6 testes de integração UI cobrindo cards dinâmicos, `AttackPreparationModal`, dedução de PE, `BackHandler`/`onRequestClose`, rituais e imutabilidade de armas compartilhadas (`frontendDynamicDamageRolls + frontendCharacters + criticalDamageRules + dice + weapons`: 101/101 aprovados em 22 suítes; `backHandlerNavigation + recordPreviewModal + frontendWeapons`: 17/17; `tsc --noEmit`: 0 erros; `test:db`: 10 livros / 1.708 entidades).
- **`tests/databaseIntegrity.test.ts` e `tests/repository.test.ts`**: Adicionadas asserções validando todas as entidades dos Mascarados, Agentes, Hexatombe, `Acoplável`, `Felino-infernal` (VD 120), `Pistola Taser`, os 5 `Poderes de Intenção`, conversão `buildCustomWeaponFromCompendiumEntity` para `Manoplas do Colosso` e `Sniper Fantasma`, e filtro `category: 'weapon'` em `OfflineDataRepository` (`test:db` 10 livros / 1.708 entidades, `typecheck` 0 erros, `test:rules` 136/136, `databaseIntegrity + repository` 19/19 e `test:front` 234/234 aprovados).

---

## 🚀 Release v1.5.0-beta.2 (2026-11-11)

### Resumo de Usuário (GitHub Release Notes)
* **Estabilidade do Leitor de PDF Nativo no Celular**:
  * Corrigido o problema em que as páginas do PDF piscavam e a tela ficava toda preta por alguns segundos durante a rolagem contínua no Android/iOS.
* **Página Real do PDF nos Registros do Compêndio**:
  * Ao acessar um registro no Compêndio, a seção *"Página Original do PDF"* e o leitor integrado agora exibem diretamente a página real do documento PDF referente ao registro, sem substituir a visualização pelo texto extraído.

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- **`src/app/entity/[id].tsx`**: Integração do `NativePdfReader` na prévia *"Página Original do PDF"* dos registros do Compêndio no celular, exibindo diretamente a página real do PDF (`entity.pageNumber`) em vez do texto extraído.

### 🐛 Correções de Bugs (Fixes)
- **`src/components/pdf/NativePdfReader.native.tsx`**: Isolada a propriedade `page` enviada ao `<PdfComponent>` usando `initialPageRef.current` e `React.memo` com estilo memoizado. Antes, cada evento `onPageChanged` durante a rolagem atualizava a prop `page` no componente nativo, acionando `RCTPdfManager.onAfterUpdateTransaction` ➔ `pdfView.drawPdf()` no Android, o que reciclava o cache de bitmaps do Pdfium e deixava a tela preta por segundos a cada troca de página.
- **`src/components/PdfViewerModal.tsx`**: Removidas re-renderizações em cascata durante a rolagem nativa (buscas de anotações e estados de canvas/imagem desnecessários no modo nativo) e garantida a restauração/preservação do modo `pdf_scroll`/`pdf_page` assim que `resolveNativePdfUri` localiza o PDF no aparelho.
- **`src/services/pdf/PdfAccessService.ts` & `src/services/pdf/PdfCacheService.ts`**: Preservado `fileUri` em `markBookAvailableOffline`, normalizados sufixos compostos de versão (`-v1-3`) em `slugifyPdfName` e adicionada varredura no diretório `pdfs/` por prefixo de `bookId` em `getLocalPdfFileUri`.

### 🧪 Testes Automatizados
- **`tests/nativePdfReader.test.tsx` & `tests/frontendEntityScreens.test.tsx`**: Adicionados testes garantindo estabilidade da prop `page` no `NativePdfReader`, preservação de `fileUri` com resolução de nomes versionados (`livro-base-v1-3.pdf`) e renderização da página real do PDF (`entity-pdf-page-preview`) na tela de detalhes do registro do Compêndio.

---

## 🚀 Release v1.5.0-beta.1 (2026-11-08)

### Resumo de Usuário (GitHub Release Notes)
- **Leitor de PDF Nativo Offline no APK**: Livros PDF baixados ou importados agora são renderizados nativamente dentro do aplicativo Android/iOS sem precisar de conexão nem do servidor Metro, mantendo rolagem contínua, modo página única, zoom por pinça, busca por página, sumário e links "Ver no Livro".
- **Documentação e Manutenção**: Remoção do documento transitório de plano de compatibilidade Android APK, com todas as diretrizes e salvaguardas já incorporadas e ativas no código.
- **Mídia e Divulgação (Tooling)**: Implementação do estúdio de vídeo promocional em `video/` com Remotion (formatos `16:9`, `9:16`, Discord `< 10 MB`, `thumbnail.png` e legendas prontas).

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- **Leitor de PDF Nativo (`react-native-pdf` + `react-native-blob-util`)**:
  - Implementa `src/components/pdf/NativePdfReader.native.tsx` com streaming direto de disco (`cache: false`), zoom por pinça (`minScale: 1.0`, `maxScale: 4.0`) e suporte a rolagem contínua e página única.
  - Isola plataformas Web e Node com stubs dedicados (`NativePdfReader.web.tsx` e `NativePdfReader.tsx`), preservando intacto o motor PDF.js na Web e o runner de testes.
  - Cria `src/utils/nativePdfSource.ts` (`resolveNativePdfUri`, `normalizeFileUri`, `isLocalPdfUri`) para resolução determinística de URIs `file://` locais com verificação física em disco via `FileSystem.getInfoAsync`.
  - Integra o leitor nativo ao `src/components/PdfViewerModal.tsx` com sincronização bidirecional de páginas, sumário (TOC), deep links ("Ver no Livro"), `BackHandler` e fallback seguro para modo texto ou abertura externa via `FileSystem.getContentUriAsync` / `expo-sharing`.

### 🧹 Limpeza & Documentação (Chore / Docs)
- Remove `docs/PLANO_LEITOR_PDF_NATIVO.md` após conclusão integral da implementação.
- Remove `docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md`: Todas as etapas planejadas já foram integralmente implementadas e testadas.
- Implementa projeto isolado `video/` em Remotion (`Promo16x9`, `Promo9x16`, `Thumbnail`, moldura 3D `PhoneFrame`, `AnimatedBackground`, `GlitchText`, `CtaBadge`, `EndCard`, scripts `capture.ps1` e `render.ps1`, e `LEGENDAS_POSTS.md`) conforme `docs/PLANO_VIDEO_PROMOCIONAL.md`.

### 🐛 Correções de Bugs (Fixes)
- Corrige sincronização de modo e página inicial no `PdfViewerModal.tsx` ao alternar entre leitura nativa de PDF e modo Texto Oficial.

### 🧪 Testes Automatizados
- Adiciona `tests/nativePdfReader.test.tsx` e mocks de `react-native-pdf` / `react-native-blob-util` em `tests/setup.ts`, validando resolução de URI local, renderização mobile, fallback para texto, Scoped Storage (`content://`) no Android, navegação TOC/input e isolamento Web.

---

## 🚀 Release v1.4.0-beta.1 (2026-11-07)

### Resumo de Usuário (GitHub Release Notes)
- **Leitor de Livros e PDFs Renovado**: Escolha entre leitura visual direta do PDF e modo texto oficial, com alternador para rolagem contínua (estilo feed) ou página única, além de fallback automático e priorização de PDFs locais.
- **Busca Ponderada no Compêndio**: Algoritmo de relevância aditiva que prioriza correspondências exatas de título, prefixos e subtítulos, eliminando resultados imprecisos.
- **Rolador Livre com Presets Salvos**: Crie botões com suas próprias fórmulas de dados personalizadas (ex.: `2d20+5`, `3d6+1d8+3`) salvas no aparelho.
- **Configurações de Dano Crítico**: Escolha como prefere calcular críticos (multiplicar dados, multiplicar dano final, crítico máximo ou perguntar a cada rolagem) e atalho direto para a Armaria a partir da ficha.
- **Cards de Registro Táticos**: Exportação real e compartilhamento nativo em PNG e vetor SVG no celular, com espaçamento corrigido de subtítulos e sem repetição de texto redundante.
- **Resiliência e Suporte Ordo Realitas**: Nova rota de retorno para login do Google OAuth (`/oauthredirect`), download inteligente de novas versões via GitHub Releases se o link direto falhar, convite permanente do Discord, transparência no status de chamados de suporte e melhorias de voz e estabilidade na IA G.L.I.T.C.H.

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)

#### 📚 Leitor de Livros e Suplementos (Features 11, 12, 13, 14)
- `src/components/PdfViewerModal.tsx`: implementado seletor duplo no cabeçalho permitindo alternar entre "Leitura Direta PDF" e "Texto Oficial".
- `src/components/PdfViewerModal.tsx`: adicionado botão alternador entre "Rolagem Contínua" (usando `FlatList` virtualizada com renderização contínua das páginas extraídas) e "Página Única".
- `src/components/PdfViewerModal.tsx` & `src/app/(tabs)/books.tsx`: adicionado fallback inteligente para modo texto caso o carregamento do PDF direto falhe.
- `src/services/pdf/PdfAccessService.ts`: aprimorada a verificação local de arquivos PDF antes de efetuar consultas ao Google Drive, eliminando erros 404 e requisições desnecessárias.

#### 🔍 Compêndio & Busca Ponderada (Feature 10)
- `src/repositories/OfflineDataRepository.ts` & `src/types/compendium.ts`: implementado algoritmo de pontuação aditiva por relevância em `searchEntities`:
  - Correspondência exata de título: **+1000 pontos**
  - Correspondência de prefixo de título: **+500 pontos**
  - Correspondência em subtítulo / elemento: **+200 pontos**
  - Correspondência em tags: **+100 pontos**
  - Ocorrências no corpo da descrição: **+10 pontos**
  - Garantia de que itens com correspondência no título (ex.: "Metralhadora") sempre apareçam no topo sem serem obscurecidos por menções indiretas.

#### 🎲 Rolador de Dados & Dano Crítico (Features 15, 16, 17)
- `src/utils/dice.ts` & `src/components/UserProfileModal.tsx`: adicionado suporte canônico aos 4 modos de dano crítico: `multiply_dice` (padrão v1.1), `multiply_damage` (multiplica dano total), `max_damage` (faces máximas sem rolagem) e `ask_user` (solicita confirmação).
- `src/app/(tabs)/characters.tsx`: adicionado botão de atalho direto no card de armas/ataques para inspecionar e editar a arma na aba Armaria (`weapons.tsx`).
- `src/app/(tabs)/dice.tsx`: implementado sistema de fórmulas customizadas salvas no `AsyncStorage` (`@ordo_dice_custom_presets`), com validação sintática em tempo real, adição dinâmica e remoção por pressão longa.

#### 📇 Exportação de Cards de Registro (Features 18, 19, 20)
- `src/services/cardImage/cardExportService.ts`: implementado download e compartilhamento nativo de imagens nos formatos PNG e SVG via `expo-sharing` no Android, eliminando despacho forçado como documento PDF.
- `src/services/cardImage/svgCardRenderer.ts`: corrigido o espaçamento vertical de `subCategory`, prevenindo sobreposição com divisores e caixas de pré-requisitos.
- `src/services/cardImage/cardDataExtractor.ts`: implementada desduplicação de texto, suprimindo o campo `summary` caso ele seja idêntico ou redundante ao corpo da `description`.

#### 🛡️ Central de Suporte, Atualizações & OAuth (Features 1, 2, 3, 4)
- `src/app/oauthredirect.tsx` & `src/app/_layout.tsx`: criada rota `/oauthredirect` com `maybeCompleteAuthSession()` do Expo WebBrowser, prevenindo tela de "Unmatched Route" ao retornar do login do Google.
- `src/services/updates/UpdateCheckerService.ts` & `src/components/UpdateNotificationModal.tsx`: implementada cadeia resiliente de download com fallback automático para a página de releases do GitHub caso o asset direto do APK retorne 404.
- `src/services/support/SupportService.ts`: atualizado convite do Discord para URL permanente ativa (`https://discord.gg/vPCZzr2wFR`).
- `src/services/support/SupportService.ts` & `src/components/SupportCenterView.tsx`: implementada geração de protocolos com prefixo `ORD-`, transparência visual do canal de entrega (remoto via proxy/webhook vs local offline) e fechamento do teclado com `Keyboard.dismiss()`.
- `src/utils/secretObfuscator.ts`, `scripts/obfuscate_secrets.js`, `supabase/functions/support-webhook/index.ts`: implementado proxy seguro Supabase com ofuscação `obf:v1:`, validação `X-Ordo-Signature` e blindagem anti-spam (`@everyone`/`@here`).

#### 🔮 IA Paranormal G.L.I.T.C.H. & Interface (Features 5, 6, 7, 8, 9)
- `src/services/ai/AiClient.ts` & `src/components/AiConfigModal.tsx`: sanitização permissiva de chaves do Gemini (remoção de espaços acidentais e aspas).
- `src/services/ai/AiClient.ts`: fallback automático do Groq para `llama-3.1-8b-instant` caso o modelo `llama-3.3-70b-versatile` retorne 404 ou limite de cota 429.
- `src/services/ai/GlitchVoiceService.ts`: síntese vocal (TTS) defensiva em português (`pt-BR`) no Android sem lançar exceções.
- `src/services/ai/GlitchVoiceService.ts` & `src/app/(tabs)/oracle.tsx`: reconhecimento de voz (STT) com feedback gracioso orientando o uso do ditado por voz do teclado virtual no Android Hermes.
- `src/app/(tabs)/oracle.tsx`: inclusão de `ScrollView` responsivo no topo da tela do Oráculo, eliminando sobreposição dos chips de relíquias com o card de boas-vindas.

---

### 🐛 Correções de Bugs & Usabilidade (Fixes)
- `docs/imagensDosProblemas/`: limpos e resolvidos 100% dos 18 problemas documentados nas capturas de tela.
- `src/utils/dice.ts`: corrigido cálculo de dano crítico para armas com dano estático numérico puro sem dados.
- `src/components/SupportCenterView.tsx`: painel do desenvolvedor mantido exclusivamente em `__DEV__`.

---

### 🧪 Testes Automatizados
- **7 Novas Suítes E2E Homologadas (133 testes, 100% de sucesso)**:
  - `tests/compendiumSearchRanking.test.ts`: 21 testes cobrindo relevância, correspondência exata, prefixos, tags e sanitização.
  - `tests/pdfViewerModes.test.tsx`: 19 testes cobrindo alternância de modos, rolagem contínua, fallback e resiliência de PDF.
  - `tests/criticalDamageRules.test.ts`: 20 testes cobrindo os 4 modos de cálculo de crítico e armas estáticas.
  - `tests/dicePresets.test.ts`: 19 testes cobrindo fórmulas customizadas, persistência no AsyncStorage e validação.
  - `tests/cardLayoutAlignment.test.ts`: 12 testes cobrindo layout de subtítulo, desduplicação e exportação real PNG/SVG.
  - `tests/supportAndUpdates.test.ts`: 24 testes cobrindo OAuth redirect, download resiliente de APK, Discord permanente e transparência de suporte.
  - `tests/glitchResilience.test.ts`: 18 testes cobrindo sanitização Gemini, fallback Groq 8B, TTS/STT e layout do Oráculo.
- **Suíte Completa do Projeto (`npm run test:all`)**:
  - `npm run typecheck`: 0 erros de diagnóstico TypeScript.
  - `tsx --test`: **866 testes passando** em 205 suítes (0 falhas).
  - `python scripts/test_database_integrity.py`: 1.645 entidades verificadas em 10 suplementos oficiais.

---

## 🚀 Release v1.3.0-beta.2 (2026-11-07)

### Resumo de Usuário (GitHub Release Notes)
- Relatos enviados pela Central de Suporte agora chegam automaticamente ao canal oficial de suporte no Discord.
- O painel de configuração de webhook do desenvolvedor não aparece mais para os usuários finais.
- Mesa Virtual online funciona direto, sem precisar configurar Supabase (servidor oficial embutido).
- G.L.I.T.C.H. ganha o Groq como segundo provedor gratuito padrão.
- Botão "Discord" do suporte agora leva ao servidor oficial do Ordo Companion.

### Detalhamento Técnico Consolidado
### ✨ Novas Funcionalidades (Features)
- `eas.json`: adicionada `EXPO_PUBLIC_SUPPORT_DISCORD_WEBHOOK_URL` nos perfis development, preview e production, consumida por `SupportService.getEffectiveWebhookUrl()` como webhook padrão embutido no APK.
- `SupportCenterView.tsx`: Bloco 4 (Painel do Desenvolvedor / Mestre) envolvido em `__DEV__`, ficando oculto em builds de release.
- `eas.json`: adicionadas `EXPO_PUBLIC_SUPPORT_DISCORD_INVITE`, `EXPO_PUBLIC_DEFAULT_GROQ_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` nos 3 perfis; chave padrão do Gemini rotacionada.
- `SupabaseTableConnector.ts`: `DEFAULT_SUPABASE_CONFIG` lido das variáveis de ambiente (normaliza sufixo `/rest/v1/`).
- `VirtualTableManager.ts`: usa o Supabase oficial como padrão quando o mestre não informa credenciais próprias (antes caía no simulador local).
- `SupportService.ts`: fallback do convite do Discord atualizado para `https://discord.gg/vPCZzr2wFR`.
- `.env.example`: removida chave real do Gemini e documentadas as novas variáveis com placeholders.

### 🐛 Correções de Bugs (Fixes)
- `.vscode/settings.json`: substituídas as chaves depreciadas `typescript.tsdk` e `typescript.enablePromptUseWorkspaceTsdk` pelas novas `js/ts.tsdk.path` e `js/ts.tsdk.promptToUseWorkspaceVersion`.

### 🧪 Testes Automatizados
- *(Aguardando novos testes do ciclo)*

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
- `.agents/skills/screenshot-bug-triage/SKILL.md`: Criação de skill e fluxo contínuo de triagem e resolução de prints de problemas em `docs/imagensDosProblemas/`.
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

