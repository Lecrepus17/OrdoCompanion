# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*Nenhum commit pendente. Todos os arquivos e partes foram comitados com sucesso.*

---

## 📜 Histórico de Commits Recentes

### 1. Páginas Referentes no Compêndio e Leitor de PDFs In-App no APK:
```bash
git add src/app/(tabs)/index.tsx src/app/entity/[id].tsx src/components/EntityCard.tsx src/components/PdfViewerModal.tsx src/utils/pdfUrl.ts tests/compendiumPdfIntegration.test.tsx docs/
git commit -m "feat(compendium,pdf): adiciona páginas referentes interativas e leitor de PDFs in-app no APK" \
  -m "- Implementa WebBrowser.openBrowserAsync no openPdfDocument e leitor in-app no PdfViewerModal para ler PDFs sem sair do app no APK" \
  -m "- Torna interativo o badge de fonte e página no EntityCard, abrindo o modal do PDF na página referente direto do Compêndio" \
  -m "- Exibe card de prévia e atalhos na tela de detalhes da entidade (entity/[id].tsx) com trecho canônico da página do livro" \
  -m "- Injeta fallback canônico para senha mestre ORDOCOMPANIONEOMELHOR em PdfAccessService.ts" \
  -m "- Adiciona cobertura completa de testes em tests/compendiumPdfIntegration.test.tsx" \
  -m "- Atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 2. Eliminação de OutOfMemoryError no Android e Migração de FileSystem:
```bash
git add src/services/pdf/PdfCacheService.ts src/services/pdf/PdfAccessService.ts src/services/sync/CloudSyncManager.ts tests/pdfOutOfMemoryPrevention.test.tsx
git commit -m "fix(android,pdf): elimina OutOfMemoryError de 84MB no APK com streaming nativo e expo-file-system/legacy" \
  -m "- Elimina OutOfMemoryError no Android proibindo fetch() em RAM de PDFs grandes em cacheUnlockedBooksOffline e CloudSyncManager" \
  -m "- Migra expo-file-system para expo-file-system/legacy em PdfCacheService.ts para streaming direto em disco sem erro de deprecação" \
  -m "- Utiliza downloadPdfFromDriveToFile exclusivo no celular em CloudSyncManager evitando carregar 84MB na RAM no boot" \
  -m "- Adiciona testes de prevenção de OOM em tests/pdfOutOfMemoryPrevention.test.tsx para validar ausência de fetch de binários no celular"
```

### 3. Configuração de Ambiente Nativo Android e Otimização de Upload EAS:
```bash
git add .easignore .gitignore eas.json package.json package-lock.json android/ scripts/iniciar_emulador_e_app.bat scripts/iniciar_emulador_e_app.ps1 docs/GUIA_EMULADOR_E_BUILD_LOCAL.md
git commit -m "build(android,eas): configura ambiente nativo, scripts de emulador e otimização de upload no EAS" \
  -m "- Remove org.gradle.java.home de android/gradle.properties sanando falha do Gradle no Linux durante o EAS Build" \
  -m "- Cria .easignore e atualiza .gitignore para ignorar android/app/build/ e artefatos locais, reduzindo o upload de 279 MB para ~10 MB" \
  -m "- Adiciona cli.appVersionSource local no eas.json e sincroniza variáveis de ambiente em todos os perfis" \
  -m "- Adiciona scripts scripts/iniciar_emulador_e_app.bat e scripts/iniciar_emulador_e_app.ps1 (npm run android:emu / android:emu:ps)" \
  -m "- Elabora guia completo de compilação e execução local em docs/GUIA_EMULADOR_E_BUILD_LOCAL.md"
```

### 1. Preparação de Release v1.1.0-beta.3 e Incremento de VersionCode:
```bash
git add package.json app.json version.json docs/
git commit -m "chore: release v1.1.0-beta.3" \
  -m "- Sincroniza package.json e app.json para v1.1.0-beta.3" \
  -m "- Incrementa versionCode do Android de 2 para 3 no app.json" \
  -m "- Atualiza version.json remoto com notas de versão e URLs da release" \
  -m "- Atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
git tag v1.1.0-beta.3
```

### 2. Prevenção de OutOfMemoryError no Android e Otimização do Google OAuth:
```bash
git add app.json package.json package-lock.json src/services/pdf/ src/components/PdfUploadAccessModal.tsx src/components/PdfViewerModal.tsx src/context/AppContext.tsx src/services/sync/GoogleDriveService.ts scripts/create_release.js tests/pdfOutOfMemoryPrevention.test.tsx tests/deletePdfBook.test.tsx tests/googleDriveService.test.ts tests/setup.ts docs/
git commit -m "fix(pdf,sync): previne OutOfMemoryError no Android com streaming de PDFs e aprimora Google OAuth" \
  -m "- Adiciona largeHeap: true na configuração do Android no app.json para expandir o limite de heap no APK" \
  -m "- Elimina fetch(asset.uri) e response.arrayBuffer() no DocumentPicker do PdfUploadAccessModal.tsx" \
  -m "- Implementa streaming em disco via FileSystem.copyAsync e FileSystem.downloadAsync em PdfCacheService.ts" \
  -m "- Adiciona savePdfOfflineFromUri e getLocalPdfFileUriSync em PdfAccessService.ts e AppContext.tsx" \
  -m "- Adiciona downloadPdfFromDriveToFile em GoogleDriveService.ts para streaming de PDFs do Drive sem carregar em RAM" \
  -m "- Suporta fluxo de token implícito (Implicit Flow) no Web quando client_secret não estiver configurado no .env" \
  -m "- Incrementa automaticamente versionCode no app.json no script scripts/create_release.js para releases de APK" \
  -m "- Adiciona cobertura completa de testes em tests/pdfOutOfMemoryPrevention.test.tsx, tests/deletePdfBook.test.tsx e tests/googleDriveService.test.ts"
```
