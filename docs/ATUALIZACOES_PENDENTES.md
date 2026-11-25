# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.7.0-beta.2` (Android `versionCode: 14`)  
> **Versão Sugerida**: `1.7.0-beta.3` (Motivo: Nova regra opcional de Pontos de Determinação (PD) de *Sobrevivendo ao Horror*, supressão do modal de atualização na Web, script `deploy:web` e documentação de acesso/download no `README.md`)  
> **Última Atualização**: 2026-11-23 19:26

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.7.0-beta.3`). Tudo o que pertenceu à `v1.7.0-beta.2` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.7.0-beta.3 (Changelog de Usuário)
- 🛡️ **Pontos de Determinação (PD) — *Sobrevivendo ao Horror***: Agora é possível ativar por ficha a regra opcional oficial *"Jogando sem Sanidade"* (p. 105–106), unificando PE e Sanidade em uma única barra de **PD** (mantendo PV separado) na criação do agente, subida de NEX, combates/rituais/habilidades, tela do Mestre, Mesa Virtual, impressão da ficha *Sobrevivendo ao Horror* e contexto da IA G.L.I.T.C.H.
- 🌐 **Versão Web sem Modal de Atualização Manual (`SOL-ERR-001`)**:
  - Suprime o popup de nova versão e a verificação estilo APK na versão Web (`https://ordo-companion.expo.app/`), mantendo as atualizações transparentes pelo servidor/Service Worker e preservando o aviso de nova versão exclusivamente no Android.
- 🚀 **Automação de Deploy Web & Guia Oficial de Acesso/Download (`SOL-MEL-001` / `SOL-MEL-002`)**:
  - Novo comando `npm run deploy:web` (`eas deploy --prod`) integrado ao build estático seguro e atualização do `README.md` com links diretos para acesso Web, instalação de aplicativo no PC (PWA) e download direto do `OrdoCompanion.apk`.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- **Modo Pontos de Determinação (PD) opt-in por ficha (`SOL-MEL-001`)**:
  - Tipagem retrocompatível (`useDeterminationPoints?`, `pdCurrent?`, `pdMax?`, `pdTemp?`) em `src/types/compendium.ts` e `src/types/virtualTable.ts`.
  - Fórmulas canônicas de *Sobrevivendo ao Horror* p. 105–106 em `src/utils/progression.ts` (Combatente `6+PRE` / `+3+PRE`, Especialista `8+PRE` / `+4+PRE`, Ocultista `10+PRE` / `+5+PRE`, Sobrevivente `4+PRE` / `+2` fixo, bônus de PE aplicados em PD e isenção numérica de *Vítima*/*Cultista Arrependido*) + helpers de recurso.
  - Seletor na criação (`CreateAgentModal.tsx`), ganhos de PD na subida de NEX (`LevelUpModal.tsx`), validação de custo de ataque/ritual em PD (`damageModifiers.ts`, `AttackPreparationModal.tsx`) e alternância segura com barra de PD + PD Temporários + aviso canônico de Determinação Baixa/Zerada em `src/app/(tabs)/characters.tsx`.
  - Paridade visual na tela do Mestre (`master.tsx`), Mesa Virtual (`table.tsx`, `tableSessionExportService.ts`), impressão PDF template SH (`sheetPrinter.ts`, `PrintSheetModal.tsx`), pré-visualização (`RecordPreviewModal.tsx`), compartilhamento (`agentSharing.ts`) e contexto da IA (`AiKnowledgeRetrieval.ts`).
- **[Build & Deploy Web]**: Adicionada flag `--deploy` em `scripts/build_web_pc.js` e script `npm run deploy:web` em `package.json` para exportar, higienizar `dist/pdfs/`, validar artefatos PWA/OAuth e publicar em produção no EAS Hosting (`https://ordo-companion.expo.app/`).
- **[Documentação]**: Atualizado `README.md` com badges interativas, tabela oficial de acesso e passo a passo completo para Web, PC (PWA Offline) e Android (`.apk` direto no GitHub Releases).

### 🐛 Correções de Bugs (Fixes)
- **Impressão PDF *Sobrevivendo ao Horror***: Corrigido o campo de **PD** em `src/utils/sheetPrinter.ts` (que anteriormente replicava `effectivePeMax`), passando a preencher `effectivePdMax` apenas quando o agente usa Modo PD e deixando PE/SAN em branco (e vice-versa no modo padrão).
- **[Atualizações / Web]**: Adicionado `shouldAutoPromptForUpdates()` em `UpdateCheckerService.ts`, guardas de plataforma em `AppContext.tsx`, `UpdateNotificationModal.tsx` e `UserProfileModal.tsx`, e renovação automática silenciosa de cache (`ordo-companion-pwa-v2`) em `public/sw.js`, `public/index.html` e `src/app/+html.tsx`, impedindo que a versão Web peça atualização manual ao usuário.

### 🧪 Testes Automatizados
- Criada a suíte `tests/determinationPoints.test.ts` validando fórmulas das 4 classes, poderes/origens, helpers, `snapshotFromSheet`, compartilhamento `ORDO-AG-v1:` e impressão HTML SH (`typecheck`, `test:rules` 153/153, `test:sync` 38/38, `test:front` 265/265 e `determinationPoints` + `sheetPrinter` 19/19 aprovados).
- `npm run typecheck` aprovado com 0 erros e 43 testes aprovados em `tests/desktopPwaSupport.test.ts`, `tests/frontendUpdateNotification.test.tsx`, `tests/supportAndUpdates.test.ts` e `tests/updateChecker.test.ts`.

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.7.0-beta.3
```
