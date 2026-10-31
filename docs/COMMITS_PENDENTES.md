# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*Nenhum commit pendente. Todos os arquivos e partes foram comitados com sucesso.*

---

## 📜 Histórico de Commits Recentes

### 1. Motores Canônicos de Proteções, Proficiências e Vestimentas em Perícias (`9d2b4cb`):
```bash
git add .gitignore src/utils/inventorySkills.ts src/utils/proficiencies.ts src/utils/protections.ts tests/rulesInventorySkills.test.ts tests/rulesProficiencies.test.ts tests/rulesProtections.test.ts docs/
git commit -m "feat(rules): implementa motores canonicos de protecoes, proficiencias e bonus de vestimentas em pericias" \
  -m "- Implementa catalogo e calculos de protecoes e escudos com modificacoes em protections.ts" \
  -m "- Implementa checagem de proficiencias de armas e protecoes por classe, origem e poderes com penalidade de dados em proficiencies.ts" \
  -m "- Implementa aplicacao de bonus de vestimentas e utensilios com limite de 2 ativas e veto a Luta/Pontaria em inventorySkills.ts" \
  -m "- Adiciona 54 testes automatizados em tests/rulesProtections.test.ts, tests/rulesProficiencies.test.ts e tests/rulesInventorySkills.test.ts (454 testes 100% passando)" \
  -m "- Adiciona .agents/teamwork/ ao .gitignore e atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 2. Correção e Fidelidade dos Resumos de Vitalidade Reforçada e Vontade Inabalável (`3e26d30`):
```bash
git add data/compendium_seed.json src/data/seed/compendium_seed.json src/utils/abilitySummarizer.ts scripts/build_full_database_summaries.js docs/
git commit -m "fix(compendium): inclui bônus de Fortitude e PE nos resumos de Vitalidade Reforçada e Vontade Inabalável" \
  -m "- Corrige resumo de Vitalidade Reforçada para '+1 PV para cada 5% de NEX e +2 em Fortitude' conforme Sobrevivendo ao Horror p. 37" \
  -m "- Corrige resumo de Vontade Inabalável para '+1 PE para cada 10% de NEX e +2 em Vontade' incluindo ganho de PE canônico" \
  -m "- Sincroniza sementes em data/compendium_seed.json, src/data/seed/compendium_seed.json, abilitySummarizer.ts e build_full_database_summaries.js" \
  -m "- Registra no backlog de pendências a revisão geral e arquitetura de automação de poderes/origens que escalam com NEX (Vitalidade Reforçada, Sangue de Ferro, Potencial Aprimorado, Desgarrado, Universitário, Vítima), bônus de perícias ('Treinado ou +2') e alerta permissivo de pré-requisitos" \
  -m "- Atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 2. Padronização Canônica das Abas de Navegação Inferior, Menu Mais e Telas Ocultas (`7b0c10c`):
```bash
git add src/types/compendium.ts src/utils/tabNavigation.ts src/components/UserProfileModal.tsx src/repositories/OfflineDataRepository.ts tests/tabNavigation.test.ts docs/
git commit -m "feat(navigation): padroniza abas fixadas na barra, menu mais e telas ocultas" \
  -m "- Configura o padrão oficial da barra de abas com 5 fixadas: Compêndio (#1), Agentes (#2), Livros (#3), Salvos (#4) e Dados (#5)" \
  -m "- Organiza 2 abas excedentes no menu + Mais: Armaria e Suporte" \
  -m "- Define 3 abas ocultas por padrão: Mestre, G.L.I.T.C.H. e Mesa (com acesso ao G.L.I.T.C.H. mantido no cabeçalho superior)" \
  -m "- Implementa migração transparente do padrão legado antigo em tabNavigation.ts e OfflineDataRepository.ts, preservando alterações personalizadas de usuários" \
  -m "- Atualiza resetNavigationConfig e UserProfileModal.tsx para restaurar o novo padrão oficial" \
  -m "- Expande testes automatizados em tests/tabNavigation.test.ts (11 testes cobrindo padrão, migração e customizações)" \
  -m "- Atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 2. Páginas Referentes no Compêndio e Leitor de PDFs In-App no APK:
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

### 3. Eliminação de OutOfMemoryError no Android e Migração de FileSystem:
```bash
git add src/services/pdf/PdfCacheService.ts src/services/pdf/PdfAccessService.ts src/services/sync/CloudSyncManager.ts tests/pdfOutOfMemoryPrevention.test.tsx
git commit -m "fix(android,pdf): elimina OutOfMemoryError de 84MB no APK com streaming nativo e expo-file-system/legacy" \
  -m "- Elimina OutOfMemoryError no Android proibindo fetch() em RAM de PDFs grandes em cacheUnlockedBooksOffline e CloudSyncManager" \
  -m "- Migra expo-file-system para expo-file-system/legacy em PdfCacheService.ts para streaming direto em disco sem erro de deprecação" \
  -m "- Utiliza downloadPdfFromDriveToFile exclusivo no celular em CloudSyncManager evitando carregar 84MB na RAM no boot" \
  -m "- Adiciona testes de prevenção de OOM em tests/pdfOutOfMemoryPrevention.test.tsx para validar ausência de fetch de binários no celular"
```

### 4. Configuração de Ambiente Nativo Android e Otimização de Upload EAS:
```bash
git add .easignore .gitignore eas.json package.json package-lock.json android/ scripts/iniciar_emulador_e_app.bat scripts/iniciar_emulador_e_app.ps1 docs/GUIA_EMULADOR_E_BUILD_LOCAL.md
git commit -m "build(android,eas): configura ambiente nativo, scripts de emulador e otimização de upload no EAS" \
  -m "- Remove org.gradle.java.home de android/gradle.properties sanando falha do Gradle no Linux durante o EAS Build" \
  -m "- Cria .easignore e atualiza .gitignore para ignorar android/app/build/ e artefatos locais, reduzindo o upload de 279 MB para ~10 MB" \
  -m "- Adiciona cli.appVersionSource local no eas.json e sincroniza variáveis de ambiente em todos os perfis" \
  -m "- Adiciona scripts scripts/iniciar_emulador_e_app.bat e scripts/iniciar_emulador_e_app.ps1 (npm run android:emu / android:emu:ps)" \
  -m "- Elabora guia completo de compilação e execução local em docs/GUIA_EMULADOR_E_BUILD_LOCAL.md"
```
