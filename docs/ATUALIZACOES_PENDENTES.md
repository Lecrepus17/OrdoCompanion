# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.4.0-beta.1` (Android `versionCode: 7`)  
> **Versão Sugerida**: `1.5.0-beta.1` (Motivo: [Minor] Leitor de PDF nativo 100% offline embutido no APK com `react-native-pdf`)  
> **Última Atualização**: 2026-11-08 19:48

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.5.0-beta.1`). Tudo o que pertenceu à `v1.4.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.5.0-beta.1 (Changelog de Usuário)
- **Leitor de PDF Nativo Offline no APK**: Livros PDF baixados ou importados agora são renderizados nativamente dentro do aplicativo Android/iOS sem precisar de conexão nem do servidor Metro, mantendo rolagem contínua, modo página única, zoom por pinça, busca por página, sumário e links "Ver no Livro".
- **Documentação e Manutenção**: Remoção do documento transitório de plano de compatibilidade Android APK, com todas as diretrizes e salvaguardas já incorporadas e ativas no código.
- **Mídia e Divulgação (Tooling)**: Implementação do estúdio de vídeo promocional em `video/` com Remotion (formatos `16:9`, `9:16`, Discord `< 10 MB`, `thumbnail.png` e legendas prontas).

---

## 📦 Detalhamento Técnico das Modificações

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

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.5.0-beta.1
```
