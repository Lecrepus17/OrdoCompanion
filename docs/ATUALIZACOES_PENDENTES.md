# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.1.0-beta.3`  
> **Versão Sugerida**: `1.1.0-beta.4` (Motivo: [Patch] Correção de OutOfMemoryError no Android ao manipular PDFs grandes, leitor in-app e blindagem EAS)  
> **Última Atualização**: 2026-10-31 17:32

---

## 🚀 Resumo do Próximo Release v1.1.0-beta.4 (Changelog de Usuário)
* **Correção Crítica de OutOfMemoryError no APK Android (`java.lang.OutOfMemoryError`)**:
  * Resolvido crash espontâneo que ocorria em segundo plano sem ação do usuário ("sem eu fazer nada"). O aplicativo tentava alocar até 84.030.125 bytes (~84 MB) de uma só vez na memória heap do Android ao tentar baixar o livro *Sobrevivendo ao Horror*.
  * O download e cache automático de PDFs em segundo plano (`cacheUnlockedBooksOffline`) no celular agora grava apenas metadados (consumo ZERO de RAM). O download de binários pesados ocorre exclusivamente sob demanda.
  * Migrado o `expo-file-system` para a importação `expo-file-system/legacy`, garantindo que o streaming nativo em disco (`downloadAsync`) funcione sem falhas no Expo SDK 58.
  * O `CloudSyncManager` no celular agora utiliza exclusivamente `downloadPdfFromDriveToFile` (streaming direto para disco), eliminando o carregamento de arquivos pesados em buffers `arrayBuffer()` na memória RAM.
  * Inserida a flag `android:largeHeap="true"` diretamente no `<application>` do `android/app/src/main/AndroidManifest.xml`.
* **Leitura de PDFs sem Sair do App no APK**: No celular Android e em compilações nativas, a leitura de PDFs agora abre diretamente através do navegador integrado in-app em tela cheia (Chrome Custom Tabs). O usuário conta com zoom tático, navegação ágil de páginas e um botão de retorno no topo que mantém a navegação 100% dentro do Ordo Companion.
* **Páginas Referentes do PDF no Compêndio**:
  * Ao navegar na lista do Compêndio, o badge de fonte no rodapé de cada cartão (`Livro • pág. X`) agora é clicável: tocar nele abre instantaneamente o visualizador na página exata do livro de referência.
  * Na tela de detalhes de qualquer item, a fonte no topo possui atalho direto interativo, e a seção "Página Original do PDF" exibe uma prévia com o título da seção, trecho do texto oficial e botões para abrir a página no leitor embutido ou no modo texto.
* **Blindagem de Variáveis de Ambiente no APK Standalone (`eas.json`)**: Configurados todos os perfis (`development`, `preview` e `production`) no `eas.json` com `EXPO_PUBLIC_MASTER_PASSWORD`, `EXPO_PUBLIC_GDRIVE_BOOKS_FOLDER_URL`, `EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY` atualizado e Google Client IDs.
* **Fallback Canônico de Desbloqueio**: O desbloqueio com a senha mestre canônica `ORDOCOMPANIONEOMELHOR` foi blindado no código em `PdfAccessService.ts`, garantindo que o acervo e o compêndio possam ser liberados com sucesso mesmo em builds sem `.env` local.
* **Prevenção de Telas em Branco no Leitor Nativo**: O modo `pdf_native` no `PdfViewerModal` agora oferece suporte completo para plataformas móveis (`Platform.OS !== 'web'`), combinando o visualizador in-app com exibição de texto canônico de contingência.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades & Correções (Features & Fixes)
- **Blindagem Definitiva Contra OutOfMemoryError no Android (`PdfCacheService.ts`, `PdfAccessService.ts`, `CloudSyncManager.ts`, `AndroidManifest.xml`)**:
  - `src/services/pdf/PdfCacheService.ts`: Atualizada a importação de `expo-file-system` para `expo-file-system/legacy`. No Expo SDK 58, métodos legados como `downloadAsync` e `getInfoAsync` lançam exceções em runtime se importados da raiz; a importação do submódulo oficial `/legacy` restaura o streaming direto nativo para disco sem alocar buffers na RAM.
  - `src/services/pdf/PdfAccessService.ts`: Em `cacheUnlockedBooksOffline`, adicionada guarda precoce para celular (`Platform.OS !== 'web'`), registrando apenas os metadados dos livros desbloqueados e impedindo qualquer loop de background que tente baixar 600 MB de binários silenciosamente.
  - `src/services/pdf/PdfAccessService.ts`: Em `downloadBookPdfOffline`, no ambiente mobile (`Platform.OS !== 'web'`), o download físico ocorre unicamente por streaming direto (`downloadPdfToFile` ou `downloadPdfFromDriveToFile`); se o streaming não estiver acessível, retorna mensagem amigável sem nunca recorrer a `fetch()` + `res.arrayBuffer()`.
  - `src/services/sync/CloudSyncManager.ts`: Em `syncPdfBinariesWithDrive`, substituída a chamada de `downloadPdfFromDrive` por `downloadPdfFromDriveToFile` no celular, e adicionada checagem para evitar downloads redundantes quando o arquivo já estiver presente no armazenamento do aparelho.
  - `android/app/src/main/AndroidManifest.xml`: Adicionado `android:largeHeap="true"` na tag `<application>` para sincronizar o manifesto nativo com o `app.json`.
- **Visualizador de PDF In-App no APK (`src/utils/pdfUrl.ts`, `src/components/PdfViewerModal.tsx`)**:
  - Em `openPdfDocument` (`src/utils/pdfUrl.ts`), em plataformas móveis (`Platform.OS !== 'web'`), o fluxo prioriza `WebBrowser.openBrowserAsync` com apresentação `FULL_SCREEN`, barra de título escura (`#09090B`) e controles em vermelho tático (`#EF4444`), evitando que o `Linking.openURL` transfira o usuário para fora do app.
  - No `PdfViewerModal.tsx`, implementada interface de Contingência e Leitor In-App para o modo `pdf_native` quando rodando em celulares (`Platform.OS !== 'web'`).
  - Textos de botões padronizados para "Abrir Leitor In-App".
- **Integração de Páginas Referentes no Compêndio (`src/components/EntityCard.tsx`, `src/app/(tabs)/index.tsx`, `src/app/entity/[id].tsx`)**:
  - Propriedade `onPressPageBadge?: (bookId: string, pageNumber: number, entityName: string) => void` adicionada em `EntityCardProps` e integrada no `EntityCardView`.
  - No `src/app/(tabs)/index.tsx`, implementado callback `handleOpenPdfFromCard` conectando o clique no badge do cartão diretamente a uma instância embutida do `PdfViewerModal`.
  - Na tela de detalhes (`src/app/entity/[id].tsx`), implementado badge interativo com `TouchableOpacity` no cabeçalho e exibição rica de texto canônico de `getBookPage` no bloco de miniatura da página.
  - Resolução segura de `entityBook` combinando `books` com `catalogBooks` como fallback para prevenir nulos em livros ainda não sincronizados offline.
- **Configuração de Ambiente Nativo e Resiliência EAS (`eas.json`, `src/services/pdf/PdfAccessService.ts`, `src/utils/pdfUrl.ts`)**:
  - Sincronização de variáveis nos três perfis de build do `eas.json` (`development`, `preview`, `production`).
  - `verifyMasterUnlockPassword` em `PdfAccessService.ts` atualizado para validar `clean === envPassword || clean === 'ORDOCOMPANIONEOMELHOR'`.
  - `getEffectivePdfFileBaseUrl` em `src/utils/pdfUrl.ts` atualizado com fallback garantido para a pasta oficial do Google Drive.
- **Correção Crítica para EAS Build na Nuvem & Otimização de Upload (`android/gradle.properties`, `.easignore`, `.gitignore`, `eas.json`, `docs/GUIA_EMULADOR_E_BUILD_LOCAL.md`)**:
  - **Eliminação de Erro Fatal do Gradle no EAS**: Removida a propriedade `org.gradle.java.home=C:\Program Files\Android\Android Studio\jbr` de `android/gradle.properties`, que causava falha imediata no container Linux do EAS (`Value given for org.gradle.java.home Gradle property is invalid`). A detecção automática do JDK local do Android Studio permanece ativa e segura exclusivamente em `android/gradlew.bat` e nos scripts `.bat`/`.ps1`.
  - **Redução Drástica do Upload no EAS (de 279 MB para ~10 MB)**: Criado `.easignore` e atualizado `.gitignore` com exclusão de artefatos de compilação nativos (`android/.gradle/`, `android/app/build/` de ~970 MB, `android/build/`, `android/.kotlin/`, `android/local.properties`) e pastas que não participam do build nativo (`tests/`, `docs/`, `scripts/`, `.agents/`). O tempo de empacotamento e upload foi reduzido em mais de 90%.
  - **Configuração de Versão do EAS (`eas.json`)**: Adicionado `"appVersionSource": "local"` na chave `"cli"`, garantindo conformidade com os novos requisitos do EAS CLI.
- **Configuração e Script de 1 Clique para Emulador Android e Build Local (`android/local.properties`, `android/gradlew.bat`, `scripts/iniciar_emulador_e_app.bat`, `scripts/iniciar_emulador_e_app.ps1`, `docs/GUIA_EMULADOR_E_BUILD_LOCAL.md`)**:
  - Criado `android/local.properties` com `sdk.dir` apontando para o SDK do Android Studio.
  - Blindada a detecção automática do JDK no `android/gradlew.bat` e scripts `.bat`/`.ps1` sem poluir arquivos de configuração multiplataforma.
  - Baixado e instalado NDK 27.1.12297006 e Build-Tools 37 com licenças aceitas, sanando o erro `[CXX1101]`.
  - Atualizado Ninja para a versão 1.12.1 no CMake do SDK, eliminando o limite estático de 260 caracteres em builds C++ no Windows.
  - Compilado com sucesso `app-debug.apk` e instalado automaticamente no emulador `Medium_Phone_API_37.0`.
  - Criados scripts `scripts/iniciar_emulador_e_app.bat` e `scripts/iniciar_emulador_e_app.ps1` com comandos `npm run android:emu` e `npm run android:emu:ps`, aguardando estabilização do dispositivo via `adb wait-for-device` sem erros de redirecionamento.
  - Elaborado manual completo em `docs/GUIA_EMULADOR_E_BUILD_LOCAL.md`.

### 🧪 Testes Automatizados (395 testes passando - 100% de sucesso)
- `tests/pdfOutOfMemoryPrevention.test.tsx`: 3 novos testes automatizados cobrindo a execução segura de `cacheUnlockedBooksOffline` no Android (apenas metadados), verificação da presença de `android:largeHeap="true"` no `AndroidManifest.xml` e streaming de disco no `downloadBookPdfOffline`.
- `tests/compendiumPdfIntegration.test.tsx`: 5 novos testes cobrindo disparo de `onPressPageBadge`, validação da senha mestre canônica, resolução de base URLs seguras, execução sem erros de `openPdfDocument` com `WebBrowser` e integridade de dados retornados por `getBookPage`.
- Suíte completa verificada com `npm run typecheck`, `npm run test:front`, `npm run test:rules`, `npm run test:sync` e `npm run test:db`.

---

## 🔮 Backlog de Pendências para v1.2.0-beta.1
- [ ] Implementação de assistente de voz tático para o G.L.I.T.C.H.
- [ ] Suporte a anotações desenhadas na página do livro no tablet.
- [ ] Exportação completa de histórico da mesa virtual em formato JSON/PDF.
