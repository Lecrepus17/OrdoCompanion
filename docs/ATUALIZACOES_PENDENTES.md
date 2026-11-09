# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.5.0-beta.1` (Android `versionCode: 8`)  
> **Versão Sugerida**: `1.5.0-beta.2` (Motivo: [Patch] Correção de tela preta/piscadas ao rolar o leitor de PDF nativo no celular e exibição da página real do PDF nos registros do Compêndio)  
> **Última Atualização**: 2026-11-09 19:38

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.5.0-beta.2`). Tudo o que pertenceu à `v1.5.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.5.0-beta.2 (Changelog de Usuário)
* **Estabilidade do Leitor de PDF Nativo no Celular**:
  * Corrigido o problema em que as páginas do PDF piscavam e a tela ficava toda preta por alguns segundos durante a rolagem contínua no Android/iOS.
* **Página Real do PDF nos Registros do Compêndio**:
  * Ao acessar um registro no Compêndio, a seção *"Página Original do PDF"* e o leitor integrado agora exibem diretamente a página real do documento PDF referente ao registro, sem substituir a visualização pelo texto extraído.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- **`src/app/entity/[id].tsx`**: Integração do `NativePdfReader` na prévia *"Página Original do PDF"* dos registros do Compêndio no celular, exibindo diretamente a página real do PDF (`entity.pageNumber`) em vez do texto extraído.

### 🐛 Correções de Bugs (Fixes)
- **`src/components/pdf/NativePdfReader.native.tsx`**: Isolada a propriedade `page` enviada ao `<PdfComponent>` usando `initialPageRef.current` e `React.memo` com estilo memoizado. Antes, cada evento `onPageChanged` durante a rolagem atualizava a prop `page` no componente nativo, acionando `RCTPdfManager.onAfterUpdateTransaction` ➔ `pdfView.drawPdf()` no Android, o que reciclava o cache de bitmaps do Pdfium e deixava a tela preta por segundos a cada troca de página.
- **`src/components/PdfViewerModal.tsx`**: Removidas re-renderizações em cascata durante a rolagem nativa (buscas de anotações e estados de canvas/imagem desnecessários no modo nativo) e garantida a restauração/preservação do modo `pdf_scroll`/`pdf_page` assim que `resolveNativePdfUri` localiza o PDF no aparelho.
- **`src/services/pdf/PdfAccessService.ts` & `src/services/pdf/PdfCacheService.ts`**: Preservado `fileUri` em `markBookAvailableOffline`, normalizados sufixos compostos de versão (`-v1-3`) em `slugifyPdfName` e adicionada varredura no diretório `pdfs/` por prefixo de `bookId` em `getLocalPdfFileUri`.

### 🧪 Testes Automatizados
- **`tests/nativePdfReader.test.tsx` & `tests/frontendEntityScreens.test.tsx`**: Adicionados testes garantindo estabilidade da prop `page` no `NativePdfReader`, preservação de `fileUri` com resolução de nomes versionados (`livro-base-v1-3.pdf`) e renderização da página real do PDF (`entity-pdf-page-preview`) na tela de detalhes do registro do Compêndio.

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.5.0-beta.2
```
