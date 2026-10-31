# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.1.0-beta.1`  
> **Versão Sugerida**: `1.1.0-beta.2` (Motivo: [Patch] Prevenção de OutOfMemoryError em PDFs grandes no Android, limpeza de cache e aprimoramento do fluxo OAuth Google Drive no Web)  
> **Próxima Versão em Desenvolvimento**: `1.2.0-beta.1` (Motivo: [Minor] Expansão do sistema G.L.I.T.C.H. com novas personas e agentes especialistas)  
> **Última Atualização**: 2026-10-30 21:55

---

## 🚀 Resumo do Release v1.1.0-beta.2 (Changelog de Usuário)
* **Prevenção Definitiva de OutOfMemoryError no Android**: Eliminação total de alocação de arquivos PDF completos na memória RAM (JVM/Hermes) durante o upload, importação ou download. Arquivos volumosos de até 85MB (como Livro Base, Sobrevivendo ao Horror e Arquivos Secretos) agora operam via streaming nativo direto em disco com consumo zero de RAM.
* **Ativação de Large Heap no Android**: Configurado `largeHeap: true` no `app.json`, expandindo a cota de memória máxima do processo nativo do Android de 256MB para até 512MB-1GB.
* **Limpeza Automática de Cache de PDFs**: Ao excluir qualquer PDF ou selecionar um arquivo inválido por engano, o app agora remove imediatamente o arquivo da pasta de cache e do diretório do DocumentPicker, liberando espaço de armazenamento no celular.
* **Liberação de Memória no Leitor de PDFs**: Instâncias de renderização do PDF.js são descarregadas da memória ao excluir livros.
* **Autenticação Google Drive Aprimorada no Navegador**: Suporte automático a Implicit Flow (Token Flow) para evitar erros de autenticação no Web quando o client secret não estiver configurado no `.env`.
* **Novo Visualizador & Gerenciador de PDFs**: Suporte a desbloqueio, leitura aprimorada e exclusão segura de livros locais.
* **Exportação de Cards em Imagem**: Gere e compartilhe imagens de alta qualidade das entidades do compêndio e rituais com tema paranormal.
* **Resumo Inteligente de Habilidades**: Descrições compactas e diretas para consulta ágil durante o combate.
* **Evolução de Agente Aprimorada**: Melhorias no fluxo de Level Up, cálculo de limites de PE e exportação de fichas.
* **Sincronização em Nuvem sem Fantasmas**: Exclusão suave rastreada que impede fichas ou campanhas deletadas de reaparecerem após o backup.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades & Correções (Features & Fixes)
- **Prevenção de OutOfMemoryError ao Importar/Baixar PDFs no Celular (`app.json`, `PdfUploadAccessModal.tsx`, `PdfCacheService.ts`, `PdfAccessService.ts`, `GoogleDriveService.ts`)**:
  - Habilitado `"largeHeap": true` na seção `"android"` do `app.json` para ativar `android:largeHeap="true"` no `AndroidManifest.xml` em compilações nativas (APK e EAS Build).
  - Removido `fetch(asset.uri)` e `response.arrayBuffer()` do fluxo de seleção do `DocumentPicker` no `PdfUploadAccessModal.tsx`.
  - Passagem de `fileUri` e `fileSize` nativos diretamente para `uploadAndUnlockPdf`, identificando instantaneamente os livros oficiais do compêndio sem consumo de RAM e gravando em disco via `FileSystem.copyAsync`.
  - Implementado `savePdfFromUri`, `downloadPdfToFile` e `getLocalPdfFileUri` em `PdfCacheService.ts` com isolamento de caminhos e nomes seguros em `${documentDirectory}pdfs/`.
  - Implementado `savePdfOfflineFromUri`, `getLocalPdfFileUriSync` e resolução unificada no `registerLocalPdfUrlResolver` em `PdfAccessService.ts`.
  - Implementado `downloadPdfFromDriveToFile` em `GoogleDriveService.ts` para streaming direto de PDFs salvos no Google Drive do usuário para o disco.
- **Limpeza Automática da Pasta Cache de PDFs (`src/services/pdf/PdfCacheService.ts`, `AppContext.tsx`, `PdfUploadAccessModal.tsx`, `PdfViewerModal.tsx`)**:
  - Implementado `PdfCacheService.ts` com funções `deleteCachedFile`, `removePdfFilesFromCacheAndStorage` e `cleanOrphanDocumentPickerPdfs`.
  - Remoção automática de arquivos residuais no `${FileSystem.cacheDirectory}` e na subpasta `DocumentPicker/` correspondentes a `fileName`, `bookId` ou slugs normalizados ao acionar `deletePdfBook` ou `lockBook`.
  - Exclusão imediata do arquivo temporário gerado no cache pelo `DocumentPicker` quando o arquivo é recusado / inválido, ou logo após a leitura e persistência dos bytes offline.
  - Implementada função `clearPdfJsCache` em `PdfViewerModal.tsx` para destruir instâncias de documentos em memória e prevenir vazamentos de RAM.
- **Fluxo OAuth Google Drive Resiliente no Web (`GoogleDriveService.ts`)**:
  - Detecção automática de ambiente Web sem client secret, alternando transparentemente para `ResponseType.Token` (Implicit Flow) sem falhas de troca de authorization code.
  - Suporte a `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET_WEB`.
- **Sincronização em Nuvem & Exclusão Segura (`SmartMergeEngine.ts`, `OfflineDataRepository.ts`)**:
  - Rastreamento de `deletedCharacterIds` e `deletedCampaignIds` para evitar ressuscitar fichas e campanhas excluídas ao mesclar com Google Drive.
  - Métodos `markCharacterDeleted` e `markCampaignDeleted` integrados no repositório offline e `AppContext`.
- **Autenticação de Senha Mestre de PDFs (`PdfAccessService.ts`)**:
  - Atualizado para aceitar tanto `ORDOCOMPANIONEOMELHOR` quanto `ORDOCOMPENDIONEOMELHOR` via hashes SHA-256 autorizados com salt.

### 🧪 Testes Automatizados (390 testes passando - 100% de sucesso)
- `tests/pdfOutOfMemoryPrevention.test.tsx`: 5 novos testes cobrindo validação de `largeHeap: true` no `app.json`, identificação sem bytes de `arquivos_secretos_04` (31.6MB), cópia persistente com `savePdfFromUri`, resolução de URI com `savePdfOfflineFromUri` e download streaming com `downloadPdfFromDriveToFile`.
- `tests/deletePdfBook.test.tsx`: 8 testes cobrindo exclusão no catálogo, páginas, entidades, remoção física na pasta cache (`DocumentPicker/`), remoção de arquivo temporário (`deleteCachedFile`) e limpeza de instâncias em memória (`clearPdfJsCache`).
- `tests/googleDriveService.test.ts`: Testes unitários de Client Secret e fluxos de autenticação.
- `tests/setup.ts`: Mock em memória realista de `expo-file-system` (`copyAsync`, `moveAsync`, `downloadAsync`, `makeDirectoryAsync`, `deleteAsync`, `readDirectoryAsync`).
- `tests/pdfAccessAndUnlock.test.tsx`: Ciclo de vida de PDFs e autenticação com senha mestre.

---

## 🔮 Backlog de Pendências para v1.2.0-beta.1
- [ ] Implementação de assistente de voz tático para o G.L.I.T.C.H.
- [ ] Suporte a anotações desenhadas na página do livro no tablet.
- [ ] Exportação completa de histórico da mesa virtual em formato JSON/PDF.
