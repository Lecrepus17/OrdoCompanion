# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.6.0-beta.1` (Android `versionCode: 12`)  
> **Versão Sugerida**: `1.6.0-beta.2` (Motivo: [Minor/Beta] Aplicativo para PC via Web App + PWA Instalável Offline, Especialista Web/Desktop & UI/UX Multiplataforma, Centralização de Solicitações Discord/Chat e Roteamento Separado)  
> **Última Atualização**: 2026-11-20 14:53

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.6.0-beta.2`). Tudo o que pertenceu à `v1.6.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.6.0-beta.2 (Changelog de Usuário)
* **Aplicativo para PC (Web App + PWA Instalável Offline — `SOL-MEL-001`)**:
  * O Ordo Companion agora pode ser instalado e executado como aplicativo standalone no computador (Windows, macOS e Linux) via Chrome/Edge com suporte offline (Service Worker + manifesto PWA), atualização direta pelo modal de novidades (`Atualizar Aplicativo no PC`), botão de instalação no Perfil e exportação/importação direta de arquivos `.json` de backup no disco.
* **Central de Suporte com Filas Separadas (Erros vs. Melhorias)**:
  * Chamados enviados pelo aplicativo (incluindo APK Android via Proxy Seguro Supabase ou Discord Webhook) agora identificam a fila de triagem (`🐛 ERROS` para bugs/erros de regra vs. `💡 MELHORIAS` para sugestões) e suportam roteamento automático para canais distintos no Discord (`#erros` e `#melhorias`), com fallback seguro para o webhook geral.

---

## 📦 Detalhamento Técnico das Modificações

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

### 🧪 Testes Automatizados
- Adicionada suíte `tests/desktopPwaSupport.test.ts` (8 testes validando manifesto PWA, Service Worker offline, tags HTML/`app.json`, blindagem no runtime Android Hermes, instalação PWA, download de backup `.json`, `applyWebOrDesktopUpdate`, `UpdateNotificationModal`, `UserProfileModal` e registro dos especialistas `web-desktop-guardian` e `mobile-ui-expert`).
- Adicionada suíte `tests/discordRequests.test.ts` (5 testes cobrindo SSOT em `data/request_triage_questions.json`, classificação separada Erros vs. Melhorias, cursor incremental com BigInt Snowflake e roteamento de webhooks com compatibilidade Hermes APK).
- Validadas as execuções pós-edição: `npm run build:pc` (`dist/` exportado com `manifest.json`, `sw.js` e `beforeinstallprompt` em `dist/index.html`), `tsc --noEmit` (0 erros), `8/8` testes em `tests/desktopPwaSupport.test.ts` (além de `13/13` com `tests/discordRequests.test.ts`, `npm run test:db` com `10` livros / `1708` entidades e `npm run test:all` `962/962`).

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.6.0-beta.2
```
