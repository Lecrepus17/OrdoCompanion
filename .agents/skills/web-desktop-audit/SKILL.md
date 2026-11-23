---
name: web-desktop-audit
description: >-
  Audita e valida a compatibilidade da aplicação com navegadores Desktop e o aplicativo instalável PC (Web App + PWA Offline), garantindo manifesto standalone, Service Worker resiliente, stubs .web.tsx sem dependências nativas quebradas, armazenamento IndexedDB para PDFs, exportação/importação de arquivos .json no computador, OAuth Web, atualizador PC e ergonomia desktop com isolamento bilateral seguro para o APK Android (Hermes).
---

# Auditoria de Compatibilidade Web & Desktop PWA (PC) - Ordo Companion

Utilize este guia e checklist tático para garantir que qualquer alteração no código funcione com estabilidade e paridade tanto no navegador desktop quanto instalado como **Aplicativo para PC (PWA Standalone)** no Windows, macOS e Linux, **sem comprometer** o runtime Android APK (Hermes).

---

## 📂 Arquivos Chave de Compatibilidade Web & Desktop PWA

* `public/manifest.json`: Metadados do PWA Desktop (`display: "standalone"`, `display_override`, `theme_color: "#0A0A0C"`, ícones `/favicon.png` e `/icon.png`).
* `public/sw.js`: Service Worker offline (*Network-First* para navegação, *Stale-While-Revalidate* para assets estáticos e bypass seguro para `/pdfs/`, `version.json`, APIs e Ollama).
* `public/favicon.png` e `public/icon.png`: Ícones estáticos do PWA (`192x192` e `512x512`).
* `src/app/+html.tsx`: Shell HTML do Expo Web com `<title>`, tags PWA, captura de `beforeinstallprompt` (`window.__ordoDeferredPwaPrompt`) / `appinstalled` e registro de `/sw.js`.
* `app.json` (`expo.web`): Configuração Metro single-output e metadados PWA standalone (`name`, `shortName`, `lang`, `scope`, `themeColor`, `backgroundColor`, `display`).
* `src/utils/desktopPwa.ts`: Utilitário Web/Desktop 100% blindado (`isDesktopWebEnvironment`, `isRunningAsStandalonePwa`, `canTriggerNativePwaInstall`, `triggerPwaInstallPrompt`, `downloadTextFileOnWeb`, `pickJsonFileOnWeb`).
* `src/services/updates/types.ts` e `src/services/updates/UpdateCheckerService.ts`: Suporte a `webUrl` e `applyWebOrDesktopUpdate()` (envio de `SKIP_WAITING` ao SW, limpeza de cache PWA e recarregamento).
* `src/components/UpdateNotificationModal.tsx`: Suprimido na Web (`Platform.OS === 'web'`), exibindo popup de atualização manual exclusivamente no aplicativo nativo (Android/iOS).
* `src/components/UserProfileModal.tsx`: Instalação PWA no PC (`profile-install-pc-pwa-btn`) e exportação/importação direta de backup `.json` no computador (`backup-download-json-pc-btn`, `backup-upload-json-pc-btn`).
* `src/components/PdfViewerModal.tsx` e `src/services/pdf/PdfAccessService.ts`: Renderização de PDFs via `PDF.js` (`<canvas>`) e persistência offline de PDFs grandes em IndexedDB (`ordo_companion_pdfs_db_v1`).
* `src/components/pdf/NativePdfReader.web.tsx`: Stub Web seguro para evitar importação de módulo nativo `react-native-pdf` no bundle Metro Web.
* `src/utils/sheetPrinter.ts`, `src/services/cardImage/cardExportService.ts` e `src/services/virtualTable/tableSessionExportService.ts`: Impressão A4 via `iframe`, conversão SVG→PNG via Canvas e downloads via `Blob` + `<a download>`.
* `src/utils/alert.ts` e `src/utils/clipboard.ts`: Diálogos Web e área de transferência (`navigator.clipboard`).
* `package.json` (`build:web`, `build:pc`) e `scripts/create_release.js`: Build estático `npx expo export -p web` e instruções PC nas release notes.

---

## 🖥️ 1. Manifesto PWA, Service Worker Offline & Build Estático

O Ordo Companion no PC roda via bundle estático (`npx expo export -p web`) servido em `http://` ou `https://` e instalado como aplicativo standalone pelo Chrome/Edge.

### Regras Mandatórias:
1. **Contrato do Manifesto (`public/manifest.json`)**:
   - Manter `display: "standalone"`, `start_url: "/"`, `scope: "/"`, `theme_color: "#0A0A0C"`, `background_color: "#0A0A0C"`, `lang: "pt-BR"`.
   - Garantir que todos os ícones declarados no manifesto existam fisicamente em `public/` (`public/favicon.png` e `public/icon.png`) para evitar erro 404 na instalação PWA.
2. **Política de Cache do Service Worker (`public/sw.js`)**:
   - **Navegação (`navigate` / `document`)**: usar *Network-First* com fallback para cache e shell `'/'`.
   - **Assets estáticos (`/_expo/static/`, `/pdfjs/`, `/assets/`, `/favicon.png`, `/icon.png`, `/manifest.json`)**: usar *Stale-While-Revalidate*.
   - **Bypass Obrigatório (Nunca cachear no SW)**:
     - Origens externas (`url.origin !== self.location.origin`), como Supabase, Google Drive/OAuth, Discord Webhooks e Ollama local (`11434`).
     - `/version.json` (verificação de versão sempre fresca na rede).
     - `/pdfs/` (arquivos grandes de 25MB–85MB são gerenciados pelo IndexedDB, nunca pelo Cache Storage do SW).
   - Manter listener de mensagem `{ type: 'SKIP_WAITING' }` para permitir atualização instantânea pelo botão `Atualizar Aplicativo no PC`.
3. **Captura do Instalador Nativo (`src/app/+html.tsx`)**:
   - Preservar o listener de `beforeinstallprompt` gravando `window.__ordoDeferredPwaPrompt` e disparando `ordo:pwa-install-ready`, além de `appinstalled` (`ordo:pwa-installed`) e registro seguro de `/sw.js` em `http:`/`https:`.

---

## 🛡️ 2. Isolamento Bilateral (Paridade Web vs. Blindagem Hermes)

O mesmo codebase TypeScript alimenta o Web/PC e o APK Android (Hermes). Quebrar um lado ao melhorar o outro é inaceitável.

### Regras Mandatórias:
1. **Guarda Dupla Obrigatória em APIs DOM/Browser**:
   - Todo acesso a `window`, `document`, `navigator`, `Blob`, `URL.createObjectURL`, `caches`, `indexedDB` ou `FileReader` deve estar protegido por:
     ```typescript
     if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
       // Código exclusivo Web/Desktop
     }
     ```
2. **Proibição de Imports Nativos Sem Fallback Web**:
   - Módulos nativos como `react-native-pdf` ou `react-native-view-shot` não podem ser importados diretamente no topo de arquivos compartilhados com a Web.
   - Use arquivos específicos de plataforma (`.web.tsx` / `.native.tsx`) ou carregamento condicional seguro dentro de blocos `Platform.OS !== 'web'`.
3. **Resiliência de Web Share & Clipboard**:
   - `Sharing.isAvailableAsync()` ou `navigator.canShare` podem retornar `false` em navegadores desktop (Windows/Linux). Sempre prover fallback para download direto via `Blob` (`downloadTextFileOnWeb`) ou `navigator.clipboard`.

---

## 💾 3. Arquivos Locais no PC, IndexedDB, OAuth Web & Atualização

- [ ] **Exportação e Importação `.json` no PC**:
  - Usar `downloadTextFileOnWeb` (criação de `Blob` + `<a download>` com `URL.revokeObjectURL`) e `pickJsonFileOnWeb` (`<input type="file" accept=".json,application/json">`) de `src/utils/desktopPwa.ts`.
  - Nunca assumir que `FileSystem.documentDirectory` existe na Web.
- [ ] **Leitor de PDFs & Armazenamento IndexedDB**:
  - Os 10 livros (até ~85 MB cada) na Web são armazenados em IndexedDB (`ordo_companion_pdfs_db_v1`) e renderizados via `pdfjs-dist` `<canvas>`.
  - Nunca reter arrays `Uint8Array` acima de 15 MB em memória quando já estiverem persistidos via `Blob` / `objectUrl` no IndexedDB.
- [ ] **Impressão A4 & Exportação de Cards/Mesa**:
  - Em `sheetPrinter.ts`, manter impressão via `iframe` oculto + fallback `window.open` com limpeza posterior do nó DOM.
  - Em `cardExportService.ts` e `tableSessionExportService.ts`, manter conversão SVG→PNG via Canvas e download `Blob` no PC.
- [ ] **Google OAuth & G.L.I.T.C.H. no PC**:
  - Manter `WebBrowser.maybeCompleteAuthSession()` no topo de `src/app/_layout.tsx` e a rota `/oauthredirect` para retorno de popup/redirect na Web.
  - No PC, `AiClient` usa `http://localhost:11434` nativamente para Ollama local sem exigir IP LAN.
- [ ] **Atualização do App no PC**:
  - `UpdateCheckerService.applyWebOrDesktopUpdate()` deve enviar `SKIP_WAITING`, limpar caches `ordo-companion-pwa-*` e recarregar com segurança (`try/catch` em `window.location.reload()`), mantendo fallback para `openDownloadUrl`.

---

## ⌨️ 4. Ergonomia Desktop (Mouse, Teclado & Janela Standalone)

- [ ] **Interações de Mouse e Seleção**:
  - Botões e cards clicáveis devem funcionar perfeitamente com clique simples sem depender exclusivamente de gestos mobile (*long press* sempre deve ter alternativa acessível ou dica clara).
  - Textos de regras, códigos de compartilhamento e respostas do G.L.I.T.C.H. devem permanecer selecionáveis (`selectable`) para cópia com mouse/teclado.
- [ ] **Janela Standalone & Atalhos**:
  - A UI e os modais não devem quebrar ao redimensionar a janela desktop (de largura estreita até telas `1920px+`) ou com barras de rolagem discretas (`+html.tsx`).
  - Inputs em formulários Web não devem perder foco nem disparar submits acidentais durante digitação rápida com teclado físico.

---

## 🧪 5. Validação Automatizada Web & Desktop

Execute a validação focada e o build estático sempre que alterar recursos Web/PWA ou fluxos desktop:

```powershell
# Validação estrita de tipos TypeScript
npm run typecheck

# Testes unitários e frontend de suporte Desktop PWA, atualizador e suporte
npx tsx --test tests/desktopPwaSupport.test.ts tests/frontendUpdateNotification.test.tsx tests/supportAndUpdates.test.ts

# Validação do bundle estático Web/PC (gera saída em dist/)
npm run build:pc

# Suíte completa de qualidade e integridade
npm run test:all
```

---

## 🔧 6. Diagnóstico & Resolução de Falhas Comuns no PC/Web

| Sintoma de Falha no PC/Web | Causa Raiz Provável | Correção Recomendada |
| :--- | :--- | :--- |
| Botão de instalar PWA não aparece no Chrome/Edge | App servido fora de `https:`/`localhost`, `manifest.json` inválido ou ícone `/favicon.png`/`/icon.png` com 404 | Validar `public/manifest.json`, garantir ícones em `public/` e testar via `npm run build:pc` + `npx serve dist`. |
| Versão antiga presa no navegador após deploy | Service Worker antigo ativo em cache sem `SKIP_WAITING` | Verificar `public/sw.js` e fluxo de `applyWebOrDesktopUpdate()` limpando caches `ordo-companion-pwa-*`. |
| Erro de bundler no `npm run build:pc` envolvendo módulo nativo | Import direto de biblioteca Android/iOS sem arquivo `.web.tsx` ou guarda dinâmica | Isolar componente em `.native.tsx` / `.web.tsx` ou mover `require` para bloco `Platform.OS !== 'web'`. |
| Botão de exportar backup/card não baixa arquivo no PC | Uso de `Sharing.shareAsync` sem fallback Web | Usar `downloadTextFileOnWeb` (`Blob` + `<a download>`) protegido por `Platform.OS === 'web'`. |
| Erro no app Android após alteração feita para o PC | Vazamento de `window`, `document`, `navigator`, `Blob` ou `caches` sem guarda | Envolver todo código DOM com `Platform.OS === 'web' && typeof ... !== 'undefined'` e reauditar via `android-apk-audit`. |
