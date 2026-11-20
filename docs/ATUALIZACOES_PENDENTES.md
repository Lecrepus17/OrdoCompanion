# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.6.0-beta.1` (Android `versionCode: 12`)  
> **Versão Sugerida**: `1.7.0-beta.1` (Motivo: [Minor/Beta] Aplicativo para PC via Web App + PWA Instalável Offline, Central de Suporte/Triagem com Filas Separadas e Login Google OAuth Android/Web + Privacidade/Termos — além de garantir que APKs `1.6.0-beta.1` já instalados detectem a atualização no verificador legado)  
> **Última Atualização**: 2026-11-20 15:12

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.7.0-beta.1`). Tudo o que pertenceu à `v1.6.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.7.0-beta.1 (Changelog de Usuário)
* **Aplicativo para PC (Web App + PWA Instalável Offline — `SOL-MEL-001`)**:
  * O Ordo Companion agora pode ser instalado e executado como aplicativo standalone no computador (Windows, macOS e Linux) via Chrome/Edge com suporte offline (Service Worker + manifesto PWA), atualização direta pelo modal de novidades (`Atualizar Aplicativo no PC`), botão de instalação no Perfil e exportação/importação direta de arquivos `.json` de backup no disco.
* **Central de Suporte com Filas Separadas (Erros vs. Melhorias)**:
  * Chamados enviados pelo aplicativo (incluindo APK Android via Proxy Seguro Supabase ou Discord Webhook) agora identificam a fila de triagem (`🐛 ERROS` para bugs/erros de regra vs. `💡 MELHORIAS` para sugestões) e suportam roteamento automático para canais distintos no Discord (`#erros` e `#melhorias`), com fallback seguro para o webhook geral.
* **Login Google Drive OAuth (Android & PC/Web) + Política de Privacidade & Termos (`SOL-ERR-001`)**:
  * Suporte ao scheme reverso oficial do Google no Android APK, páginas estáticas de callback `/oauthredirect` para Web/PC, mensagens claras para erros OAuth (403/400) com painel de diagnóstico copiável na aba Nuvem e publicação oficial de Política de Privacidade e Termos de Serviço.

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

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.7.0-beta.1
```
