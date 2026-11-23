# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.7.0-beta.2` (Android `versionCode: 14`)  
> **Versão Sugerida**: `1.7.0-beta.3` (Motivo: [Patch] Supressão do modal de atualização na Web, script `deploy:web` e documentação de acesso/download no `README.md`)  
> **Última Atualização**: 2026-11-23 19:26

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.7.0-beta.3`). Tudo o que pertenceu à `v1.7.0-beta.2` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.7.0-beta.3 (Changelog de Usuário)
* 🌐 **Versão Web sem Modal de Atualização Manual (`SOL-ERR-001`)**:
  * Suprime o popup de nova versão e a verificação estilo APK na versão Web (`https://ordo-companion.expo.app/`), mantendo as atualizações transparentes pelo servidor/Service Worker e preservando o aviso de nova versão exclusivamente no Android.
* 🚀 **Automação de Deploy Web & Guia Oficial de Acesso/Download (`SOL-MEL-001` / `SOL-MEL-002`)**:
  * Novo comando `npm run deploy:web` (`eas deploy --prod`) integrado ao build estático seguro e atualização do `README.md` com links diretos para acesso Web, instalação de aplicativo no PC (PWA) e download direto do `OrdoCompanion.apk`.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- [Build & Deploy Web]: Adicionada flag `--deploy` em `scripts/build_web_pc.js` e script `npm run deploy:web` em `package.json` para exportar, higienizar `dist/pdfs/`, validar artefatos PWA/OAuth e publicar em produção no EAS Hosting (`https://ordo-companion.expo.app/`).
- [Documentação]: Atualizado `README.md` com badges interativas, tabela oficial de acesso e passo a passo completo para Web, PC (PWA Offline) e Android (`.apk` direto no GitHub Releases).

### 🐛 Correções de Bugs (Fixes)
- [Atualizações / Web]: Adicionado `shouldAutoPromptForUpdates()` em `UpdateCheckerService.ts`, guardas de plataforma em `AppContext.tsx`, `UpdateNotificationModal.tsx` e `UserProfileModal.tsx`, e renovação automática silenciosa de cache (`ordo-companion-pwa-v2`) em `public/sw.js`, `public/index.html` e `src/app/+html.tsx`, impedindo que a versão Web peça atualização manual ao usuário.

### 🧪 Testes Automatizados
- `npm run typecheck` aprovado com 0 erros e 43 testes aprovados em `tests/desktopPwaSupport.test.ts`, `tests/frontendUpdateNotification.test.tsx`, `tests/supportAndUpdates.test.ts` e `tests/updateChecker.test.ts`.

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.7.0-beta.3
```
