# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*(Nenhum commit pendente na fila no momento)*

---

## 📜 Histórico de Commits Recentes

### ✅ 1. Suporte a Build ID Existente e Otimização do EAS CLI no Upload de APK:
```bash
git add scripts/build_and_upload_apk.js docs/COMMITS_PENDENTES.md
git commit -m "chore(build): suporta build id manual e otimiza chamada eas no build_and_upload_apk" \
  -m "- Permite passar o buildId como argumento opcional para retomar o monitoramento de builds em andamento" \
  -m "- Remove flags redundantes para evitar falhas de GraphQL com versoes antigas do eas-cli"
```

### ✅ 2. Preparação da Release v1.5.0-beta.1 (versionCode 8):
```bash
git add package.json app.json version.json docs/RELEASE_NOTES.md docs/HISTORICO_RELEASES.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "chore(release): prepara versao v1.5.0-beta.1 (versionCode 8)" \
  -m "- Atualiza versao em package.json, app.json e version.json para 1.5.0-beta.1" \
  -m "- Incrementa android.versionCode para 8 em app.json" \
  -m "- Gera docs/RELEASE_NOTES.md e arquiva notas da v1.5.0-beta.1 em docs/HISTORICO_RELEASES.md" \
  -m "- Reseta docs/ATUALIZACOES_PENDENTES.md para o proximo ciclo e atualiza docs/COMMITS_PENDENTES.md"
git tag v1.5.0-beta.1
```
### ✅ 1. Leitor de PDF Nativo Offline no APK (`react-native-pdf`):
```bash
git add package.json package-lock.json app.json src/types/declarations.d.ts src/utils/nativePdfSource.ts src/components/pdf/NativePdfReader.native.tsx src/components/pdf/NativePdfReader.web.tsx src/components/pdf/NativePdfReader.tsx src/components/PdfViewerModal.tsx tests/setup.ts tests/nativePdfReader.test.tsx docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(pdf): adiciona leitor de pdf nativo offline no apk com react-native-pdf" \
  -m "- Renderiza PDFs locais (file://) dentro do app no Android/iOS sem depender do servidor Metro" \
  -m "- Cria NativePdfReader com isolamento por plataforma (.native.tsx, .web.tsx e stub Node/test)" \
  -m "- Implementa resolveNativePdfUri em src/utils/nativePdfSource.ts com streaming direto do disco (cache: false)" \
  -m "- Integra navegacao de paginas, TOC, links Ver no Livro e fallback para modo texto/abertura externa com content URI no PdfViewerModal" \
  -m "- Adiciona mocks em tests/setup.ts e suite de testes em tests/nativePdfReader.test.tsx"
```

### ✅ 1. Alinhamento Fiel de Abas/Cabeçalhos do App e Crédito Musical (Sub_Clair) no Vídeo Promocional:
```bash
git add video/src/copy.ts video/src/components/PhoneFrame.tsx video/src/components/EndCard.tsx video/scripts/add_music.ps1 video/LEGENDAS_POSTS.md docs/COMMITS_PENDENTES.md
git commit -m "chore(marketing): alinha nomes reais das abas no video e adiciona creditos de Sub_Clair" \
  -m "- Atualiza PhoneFrame.tsx para exibir os cabecalhos (Guia Ordem Paranormal, Acervo de Livros, Fichas de Agentes, etc.) e a barra inferior (Compendio, Agentes, Livros, Salvos, Dados, Mais) identicos ao app real" \
  -m "- Sincroniza cortes de cena com os drops da faixa de Sub_Clair (4.0s e 23.5s) e adiciona credito visual no EndCard e em LEGENDAS_POSTS.md"
```

### ✅ 1. Projeto Remotion para Vídeo Promocional do APK (`video/`):
```bash
git add .gitignore tsconfig.json docs/PLANO_VIDEO_PROMOCIONAL.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md video/package.json video/package-lock.json video/tsconfig.json video/remotion.config.ts video/README.md video/LEGENDAS_POSTS.md video/public/icon.png video/scripts/capture.ps1 video/scripts/render.ps1 video/scripts/add_music.ps1 video/src/
git commit -m "chore(marketing): adiciona projeto remotion para video promocional do apk" \
  -m "- Cria workspace isolado em video/ com Remotion 4 (composicoes Promo16x9, Promo9x16 e Thumbnail)" \
  -m "- Implementa componentes visuais 3D (PhoneFrame, AnimatedBackground, GlitchText, CtaBadge, EndCard) com paleta oficial do tema escuro" \
  -m "- Adiciona scripts automatizados de captura via ADB (capture.ps1), renderizacao multi-formato (render.ps1), mixagem rapida de audio (add_music.ps1) e legendas prontas (LEGENDAS_POSTS.md)" \
  -m "- Atualiza .gitignore, tsconfig.json, docs/PLANO_VIDEO_PROMOCIONAL.md e governanca"
```

### ✅ 1. Remoção do Plano de Compatibilidade Android APK Concluído:
```bash
git add docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "docs: remove plano de compatibilidade android apk apos conclusao integral" \
  -m "- Remove docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md visto que todas as diretrizes de compatibilidade com o runtime Hermes Android ja foram 100% implementadas e validadas" \
  -m "- Atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### ✅ 1. Automação de Build e Upload de APK (`d4c0225`):
```bash
git add package.json package-lock.json scripts/build_and_upload_apk.js
git commit -m "fix(build): sincroniza package-lock.json com expo-speech e adiciona script build:apk" \
  -m "- Sincroniza package-lock.json com expo-speech@58.0.3 para suportar npm ci no EAS Build" \
  -m "- Cria script scripts/build_and_upload_apk.js para compilacao e upload automatico de APK no GitHub Releases"
git tag -f v1.4.0-beta.1
```

### ✅ 2. Preparação da Release v1.4.0-beta.1 (versionCode 7):
```bash
git add package.json app.json version.json docs/RELEASE_NOTES.md docs/HISTORICO_RELEASES.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "chore(release): prepara versao v1.4.0-beta.1 (versionCode 7)" \
  -m "- Atualiza versao em package.json, app.json e version.json para 1.4.0-beta.1" \
  -m "- Incrementa android.versionCode para 7 em app.json" \
  -m "- Gera docs/RELEASE_NOTES.md e arquiva notas da v1.4.0-beta.1 em docs/HISTORICO_RELEASES.md" \
  -m "- Reseta docs/ATUALIZACOES_PENDENTES.md para o proximo ciclo e atualiza docs/COMMITS_PENDENTES.md"
git tag v1.4.0-beta.1
```
### ✅ 1. Plano do Vídeo Promocional e Governança Consolidada:
```bash
git add docs/PLANO_VIDEO_PROMOCIONAL.md docs/README.md GEMINI.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "docs(marketing): registra plano aprovado do video promocional do apk e atualiza governanca" \
  -m "- Cria docs/PLANO_VIDEO_PROMOCIONAL.md com roteiro, decisoes do usuario, estrutura Remotion e captura hibrida via emulador" \
  -m "- Adiciona secao Pendencias Aprovadas no GEMINI.md e padroniza pasta docs/imagensDosProblemas" \
  -m "- Indexa o plano em docs/README.md e atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### ✅ 2. Blindagem de Segurança do Webhook do Discord (Proxy Supabase), Ofuscação de Chaves e Limpeza do Git (`c84194c`):
```bash
git add eas.json .env.example scripts/obfuscate_secrets.js src/utils/secretObfuscator.ts supabase/functions/support-webhook/index.ts supabase/migrations/20261107_support_tickets_security.sql tests/supportService.test.ts
git commit -m "feat(security): implementa proxy supabase para webhook, ofuscacao de chaves e protecao anti-spam" \
  -m "- Remove chaves de API, senha mestre e URL do Discord Webhook em texto claro do eas.json" \
  -m "- Cria utilitario secretObfuscator.ts e CLI scripts/obfuscate_secrets.js (formato obf:v1: com XOR + Base64)" \
  -m "- Implementa Supabase Edge Function (support-webhook) e migracao RLS com validacao de assinatura X-Ordo-Signature e rate limit por IP" \
  -m "- Adiciona testes unitarios de seguranca em tests/supportService.test.ts"
```

### ✅ 3. Resolução dos 18 Problemas Reportados nos Prints (`19ec0b0`):
```bash
git add package.json .gitignore .agents/skills/screenshot-bug-triage/SKILL.md docs/HISTORICO_RELEASES.md src/app/oauthredirect.tsx src/app/_layout.tsx src/app/(tabs)/books.tsx src/app/(tabs)/characters.tsx src/app/(tabs)/dice.tsx src/app/(tabs)/oracle.tsx src/components/AiConfigModal.tsx src/components/PdfViewerModal.tsx src/components/SupportCenterView.tsx src/components/UpdateNotificationModal.tsx src/components/UserProfileModal.tsx src/repositories/OfflineDataRepository.ts src/services/ai/AiClient.ts src/services/ai/GlitchVoiceService.ts src/services/cardImage/cardDataExtractor.ts src/services/cardImage/cardExportService.ts src/services/cardImage/svgCardRenderer.ts src/services/pdf/PdfAccessService.ts src/services/support/SupportService.ts src/services/support/types.ts src/services/updates/UpdateCheckerService.ts src/types/compendium.ts src/utils/dice.ts tests/compendiumSearchRanking.test.ts tests/criticalDamageRules.test.ts tests/dicePresets.test.ts tests/pdfViewerModes.test.tsx tests/cardLayoutAlignment.test.ts tests/supportAndUpdates.test.ts tests/glitchResilience.test.ts tests/m1ChallengerStress.test.tsx tests/m1EdgeCaseCompatibility.test.tsx TEST_READY.md
git commit -m "feat(mobile): resolve os 18 problemas de interface, leitor pdf, busca, dados, critico e cards reportados nos prints" \
  -m "- Implementa leitor de PDF/texto com modo duplo, rolagem continua em FlatList e fallback resiliente (Features 11, 12, 13, 14)" \
  -m "- Adiciona algoritmo aditivo de relevancia e ranqueamento na busca do compendio priorizando correspondencia exata e prefixos (Feature 10)" \
  -m "- Implementa selecao de calculo de dano critico (dados, dano, maximo, perguntar), atalho para armaria e presets customizados de dados no AsyncStorage (Features 15, 16, 17)" \
  -m "- Adiciona exportacao real de imagens PNG/SVG nativas via expo-sharing, alinhamento de subtitulo e desduplicacao de resumo nos cards (Features 18, 19, 20)" \
  -m "- Implementa rota /oauthredirect para retorno de login Google, download resiliente de APK com fallback para releases, convite permanente do Discord e transparencia de tickets ORD- (Features 1, 2, 3, 4)" \
  -m "- Melhora IA GLITCH com sanitizacao Gemini, fallback Groq 8B, sintese TTS defensiva, feedback STT gracioso e ScrollView no topo do Oraculo (Features 5, 6, 7, 8, 9)" \
  -m "- Remove 100% dos prints resolvidos em docs/imagensDosProblemas/ e adiciona 7 suites E2E (133 testes)"
```

### ✅ 1. Selo Latest Automático nas Releases do GitHub:
```bash
git add scripts/create_release.js docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "fix(release): define make_latest=true ao publicar releases no GitHub" \
  -m "- Configura prerelease: false e make_latest: 'true' na API REST do GitHub em create_release.js" \
  -m "- Adiciona flag --latest no fallback via GitHub CLI" \
  -m "- Atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### ✅ 2. Preparação da Release v1.3.0-beta.2 (versionCode 6):
```bash
git add package.json app.json version.json docs/RELEASE_NOTES.md docs/HISTORICO_RELEASES.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "chore(release): prepara versao v1.3.0-beta.2 (versionCode 6)" \
  -m "- Atualiza versao em package.json, app.json e version.json para 1.3.0-beta.2" \
  -m "- Incrementa android.versionCode de 5 para 6 em app.json" \
  -m "- Gera docs/RELEASE_NOTES.md e arquiva notas da v1.3.0-beta.2 em docs/HISTORICO_RELEASES.md" \
  -m "- Reseta docs/ATUALIZACOES_PENDENTES.md para o proximo ciclo (1.3.0-beta.3) e atualiza docs/COMMITS_PENDENTES.md"
git tag v1.3.0-beta.2
```

### ✅ 2. Atualização de Configurações do TypeScript no VS Code:
```bash
git add .vscode/settings.json docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "chore(vscode): atualiza chaves depreciadas do tsdk no settings.json" \
  -m "- Substitui typescript.tsdk por js/ts.tsdk.path" \
  -m "- Substitui typescript.enablePromptUseWorkspaceTsdk por js/ts.tsdk.promptToUseWorkspaceVersion" \
  -m "- Atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### ✅ 2. Painel Dev Oculto em Release na Central de Suporte:
```bash
git add src/components/SupportCenterView.tsx
git commit -m "feat(support): oculta painel do desenvolvedor em builds de release" \
  -m "- Envolve o Painel do Desenvolvedor / Mestre da Central de Suporte em __DEV__, ocultando-o no APK de release"
```

### ✅ 2. Configuração Oficial do Build (Webhook, Supabase, Groq, Discord e Rotação do Gemini):
```bash
git add eas.json .env.example src/services/virtualTable/SupabaseTableConnector.ts src/services/virtualTable/VirtualTableManager.ts src/services/support/SupportService.ts docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(config): embute webhook, supabase, groq e convite do discord oficiais no build" \
  -m "- Adiciona EXPO_PUBLIC_SUPPORT_DISCORD_WEBHOOK_URL, SUPABASE_URL/ANON_KEY, DEFAULT_GROQ_API_KEY e SUPPORT_DISCORD_INVITE aos perfis do eas.json" \
  -m "- DEFAULT_SUPABASE_CONFIG passa a ler variaveis de ambiente e VirtualTableManager usa o Supabase oficial como padrao" \
  -m "- Rotaciona a chave padrao do Gemini e remove chave real do .env.example" \
  -m "- Atualiza fallback do convite do Discord no SupportService" \
  -m "- Atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 1. Automação de Release Notes, Clipboard e Isolamento de Ciclo entre Versões:
```bash
git add scripts/create_release.js .agents/skills/update-recorder/SKILL.md GEMINI.md docs/RELEASE_NOTES.md docs/HISTORICO_RELEASES.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "chore(release): automatiza release notes, clipboard e reset de ciclo por versao" \
  -m "- Evolui scripts/create_release.js para gerar docs/RELEASE_NOTES.md e copiar automaticamente para o Clipboard (Ctrl+V)" \
  -m "- Arquiva a versao lancada em docs/HISTORICO_RELEASES.md e reseta docs/ATUALIZACOES_PENDENTES.md isolando cada ciclo de versao" \
  -m "- Torna o incremento de android.versionCode idempotente e adiciona flags --open e --publish" \
  -m "- Atualiza skill update-recorder e GEMINI.md com a regra de isolamento estrito entre releases"
```

### 1. Preparação da Release v1.3.0-beta.1 (versionCode 5):
```bash
git add package.json app.json version.json docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "chore(release): prepara versao v1.3.0-beta.1 (versionCode 5)" \
  -m "- Atualiza versao em package.json, app.json e version.json para 1.3.0-beta.1" \
  -m "- Incrementa android.versionCode de 4 para 5 em app.json" \
  -m "- Sincroniza manifesto version.json com URLs da release v1.3.0-beta.1 e changelog consolidado" \
  -m "- Atualiza registros de governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
git tag v1.3.0-beta.1
```

### 1. Resolução Completa dos 22 Problemas de UI Mobile, APK, PDF, Sincronização Drive, IA G.L.I.T.C.H. e Fluxo de Prints:
```bash
git add .gitignore GEMINI.md .agents/skills/screenshot-bug-triage/SKILL.md src/services/ai/AiClient.ts src/services/ai/AiKnowledgeRetrieval.ts src/services/ai/AiOfflineEngine.ts src/services/ai/GlitchVoiceService.ts src/app/(tabs)/oracle.tsx src/components/AiConfigModal.tsx src/components/PdfViewerModal.tsx src/utils/pdfUrl.ts src/app/(tabs)/books.tsx src/app/(tabs)/characters.tsx src/components/PrintSheetModal.tsx src/components/cardImage/RecordImageExportModal.tsx src/services/cardImage/cardExportService.ts src/services/support/SupportService.ts src/services/support/types.ts src/components/SupportCenterView.tsx src/app/(tabs)/_layout.tsx src/components/CustomBottomTabBar.tsx src/repositories/OfflineDataRepository.ts src/services/sync/SmartMergeEngine.ts src/context/AppContext.tsx tests/pdfUrl.test.ts tests/pdfViewer.test.ts tests/e2e_issues_suite.test.ts docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "fix(mobile): resolve os 22 problemas de ui, apk, pdf, sync drive, voz e ia reportados nos prints" \
  -m "- Corrige validacao da chave padrao Gemini com fallback offline, TTS nativo via expo-speech e priorizacao RAG no modo offline (Problemas 5, 7, 21)" \
  -m "- Implementa download direto de PDF, pre-visualizacao in-app, remocao de spinner/botao flutuante travado e tipografia do leitor texto (Problemas 3, 4, 8, 16, 22)" \
  -m "- Adiciona rolagem horizontal no topo da ficha, edicao de arma in-place no agente, pilulas sem corte, ajuste do botao de protecao e pre-visualizacao de impressao (Problemas 10, 11, 12, 18, 20)" \
  -m "- Corrige sobreposicao de botoes PNG, compartilhamento nativo de imagem via expo-sharing, layout em paisagem do gerador e formato PNG 1080x1350 (Problemas 6, 9, 14, 15)" \
  -m "- Ajusta deep-link do Discord, modal de configuracoes do desenvolvedor/webhook, cabecalho do menu de suporte e compactacao global em modo paisagem (Problemas 1, 2, 17, 19)" \
  -m "- Implementa tombstones deletedDynamicBookIds no SmartMergeEngine e OfflineDataRepository impedindo retorno de PDFs excluidos ao sincronizar com o Drive (Problema 13)" \
  -m "- Adiciona suite E2E automatizada em tests/e2e_issues_suite.test.ts (39 testes cobrindo os 22 problemas, 100% aprovados)" \
  -m "- Configura fluxo continuo de triagem de prints em docs/imagensDosProblemas no .gitignore, GEMINI.md e skill screenshot-bug-triage" \
  -m "- Atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 2. Suporte a Anotações Desenhadas na Página do Livro no Tablet (Stylus e Gestos):
```bash
git add src/types/annotations.ts src/services/annotations/pageAnnotationsService.ts src/utils/annotationGeometry.ts src/components/PageAnnotationOverlay.tsx src/components/AnnotationToolbar.tsx tests/pageAnnotations.test.ts tests/pageAnnotationOverlay.test.tsx
git commit -m "feat(books): implementa suporte a anotacoes desenhadas na pagina do livro no tablet" \
  -m "- Cria PageAnnotationOverlay com captura de gestos PanResponder e renderizacao vetorial multiplataforma (SVG na Web e Native segments)" \
  -m "- Implementa AnnotationToolbar dedicada para tablets e celulares com ferramentas de Caneta, Marca-Texto, Borracha e paleta dos 5 Elementos" \
  -m "- Adiciona utilitarios geometricos com normalizacao de coordenadas [0, 1] e hit-test de borracha em annotationGeometry.ts" \
  -m "- Implementa PageAnnotationsService para persistencia local no AsyncStorage com cache sincrono e indexacao de paginas anotadas" \
  -m "- Integra botao Anotar, badge indicador e suporte a Undo/Redo/Limpar no PdfViewerModal em modos pagina unica e rolagem continua" \
  -m "- Adiciona suites de testes em tests/pageAnnotations.test.ts e tests/pageAnnotationOverlay.test.tsx (100% aprovados)"
```

### 3. Validação do Livro Base v1.3 e Integração de 28 Itens Amaldiçoados Especiais (1.645 Entidades):
```bash
git add data/compendium_seed.json src/data/seed/compendium_seed.json scripts/parse_entities.py
git commit -m "feat(compendium): valida livro base v1.3 e cataloga 28 itens amaldicoados especiais (1645 entidades)" \
  -m "- Valida e audita extração canônica do Livro Base oficial v1.3 (332 páginas) com todas as erratas integradas" \
  -m "- Implementa parser dedicado para os 28 Itens Amaldiçoados Especiais (Punhos Enraivecidos, Jaqueta de Veríssimo, Crânio Espiral, etc.) em parse_entities.py" \
  -m "- Expande compêndio para 1.645 entidades únicas (311 itens, 107 rituais, 58 armas, 39 condições, 59 origens, 606 regras)" \
  -m "- Sincroniza binários do PDF oficial v1.3 em pdfs/, public/pdfs/ e dist/pdfs/ para visualização in-app" \
  -m "- Valida integridade referencial com test_database_integrity.py e suíte completa de Smart Testing Gates (100% aprovados)"
```

### 4. Conclusão da Compatibilidade Android APK (BackHandler, Clipboard Universal e Blindagem Hermes):
```bash
git add src/utils/clipboard.ts src/app/(tabs)/master.tsx src/components/AiChatMessageItem.tsx src/components/AppManualModal.tsx src/components/CreateAgentModal.tsx src/components/LevelUpModal.tsx src/components/MoreTabsModal.tsx src/components/PrerequisiteAlertModal.tsx src/components/ProtectionModal.tsx src/components/RecordPreviewModal.tsx src/components/ThemeSelectorModal.tsx src/components/UpdateNotificationModal.tsx src/components/UserProfileModal.tsx src/services/virtualTable/tableSessionExportService.ts src/utils/sheetPrinter.ts tests/backHandlerNavigation.test.tsx tests/clipboard.test.ts
git commit -m "feat(android): completa 100% de compatibilidade apk hermes com backhandler e clipboard unificado" \
  -m "- Implementa utilitário universal clipboard.ts com cópia e leitura resilientes e fallback para Share.share no Android nativo" \
  -m "- Substitui ocorrências diretas de navigator.clipboard em fichas, perfil, IA GLITCH, suporte e exportação de cards" \
  -m "- Adiciona fluxo de restauração manual de backup com TextInput nativo no UserProfileModal, eliminando dependência de window.prompt" \
  -m "- Implementa interceptação de BackHandler com retrocesso de etapas e diálogo confirmAction em CreateAgentModal e LevelUpModal" \
  -m "- Implementa navegação hierárquica por hardware em master.tsx deselecionando campanha ativa antes de fechar tela" \
  -m "- Adiciona listeners seguros de BackHandler em todos os modais da aplicação prevenindo fechamento involuntário do app" \
  -m "- Blinda chamadas a window.open e document.createElement em sheetPrinter.ts e tableSessionExportService.ts com integração Expo Print e Sharing" \
  -m "- Adiciona baterias de testes em tests/clipboard.test.ts e tests/backHandlerNavigation.test.tsx (100% aprovados)"
```

### 1. Compatibilidade Android APK, Agente Especializado e Runtime Hermes:
```bash
git add .agents/skills/android-apk-audit/ app.json src/services/ai/AiClient.ts src/utils/agentSharing.ts tests/agentSharing.test.ts tests/agentSharing.adversarial.test.ts tests/aiOllama.adversarial.test.ts tests/appJson.adversarial.test.ts docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(android): implementa agente guardiao e compatibilidade de runtime para apk hermes" \
  -m "- Cria skill especializada android-apk-audit em .agents/skills/ e registra agente android-apk-guardian" \
  -m "- Configura app.json com largeHeap, permissao INTERNET, usesCleartextTraffic e adjustPan para Android" \
  -m "- Implementa resolucao dinamica de host (10.0.2.2 / dev server) para IA Ollama local no Android em AiClient.ts" \
  -m "- Reimplementa codificacao Base64 sem Buffer/btoa no motor Hermes com suporte a UTF-8 e emojis em agentSharing.ts" \
  -m "- Adiciona testes adversariais em tests/agentSharing.adversarial.test.ts, tests/aiOllama.adversarial.test.ts e tests/appJson.adversarial.test.ts" \
  -m "- Cria documento de diagnostico e instrucoes passo a passo em docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md" \
  -m "- Atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 1. Livro Base v1.3 com 1.617 Entidades e Erratas Oficiais:
```bash
git add .agents/skills/commit-generator/SKILL.md .gitignore GEMINI.md data/books_pages_seed.json data/cache/pages_livro_base.json data/compendium_seed.json scripts/extract_all.py scripts/extract_raw_pages.py scripts/parse_entities.py scripts/test_database_integrity.py src/data/seed/books_pages_seed.json src/data/seed/compendium_seed.json tests/compendiumPdfIntegration.test.tsx tests/databaseIntegrity.test.ts tests/levelUpModal.test.tsx docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(compendium): atualiza livro base para v1.3 com 1617 entidades e erratas oficiais" \
  -m "- Extrai e indexa livro base v1.3 oficial (332 páginas) preservando os 10 suplementos canônicos (1.271 páginas totais)" \
  -m "- Expande base de dados para 1.617 entidades únicas (606 regras, 107 rituais, 58 armas, 39 condições e 59 origens)" \
  -m "- Adiciona condições oficiais Enlouquecendo e Perturbado, novo item Medidor de Estabilidade da Membrana e ritual Flagelo de Sangue" \
  -m "- Aplica erratas canônicas em Artista Marcial, Golpe Pesado, Disparo Impactante, Lâmina Maldita, Perda de Vida e ameaças" \
  -m "- Atualiza scripts de extração/integridade e suíte de testes de banco de dados" \
  -m "- Atualiza diretrizes de governança em GEMINI.md e commit-generator para isolamento estrito de commits por escopo de IA"
```

### 2. Sistema de Dano Crítico Flexível, Crítico Máximo e Atalhos no DiceToast (`dc36e94`):
```bash
git commit -m "feat(combat): implementa modos de dano critico, botao de critico maximo e atalhos rapidos no toast" \
  -m "- Implementa motor rollWeaponDamage com suporte aos modos multiply_dice (padrao oficial v1.1) e multiply_damage (alternativo) em dice.ts" \
  -m "- Implementa calculo e botao de Critico Maximo (faces maximas sem aleatoriedade) na ficha de agentes, Armaria e RecordPreviewModal" \
  -m "- Adiciona seletor de preferencia de dano critico no perfil de usuario (UserProfileModal) e por agente (characters.tsx)" \
  -m "- Adiciona atalhos rapidos de rolagem de dano no DiceToast ao testar ataque com destaque tatico para 20 natural" \
  -m "- Corrige truncamento de bonus de dano na Armaria (weapons.tsx)" \
  -m "- Adiciona bateria de 20 testes unitarios em tests/dice.test.ts e atualiza governanca"
```

### 2. Release v1.2.0-beta.2 (Vitais por NEX, Voz no G.L.I.T.C.H. e Exportação de Sessão):
```bash
git commit -m "feat: release v1.2.0-beta.2 - vitais por NEX, voz no GLITCH e exportacao de mesa" \
  -m "- Recalculo unificado e escalonamento automatico de vitais (PV, PE, SAN) por NEX e bonus passivos canonicos em progression.ts, LevelUpModal e CreateAgentModal" \
  -m "- Alerta permissivo de pre-requisitos (Adicionar mesmo assim) em poderes e rituais" \
  -m "- Comando e resposta por voz (STT/TTS) com filtro de radio militar no G.L.I.T.C.H." \
  -m "- Exportacao completa do historico de sessao da Mesa Virtual em JSON estruturado e PDF tatico da Ordo Realitas" \
  -m "- Suporte a expo-sharing para compartilhamento de relatorios" \
  -m "- Incremento de versao no app.json (versionCode 4, 1.2.0-beta.2), package.json e version.json"
```

### 3. Assistente de Proteções, Proficiências e Vestimentas na Ficha de Personagens:
```bash
git add TEST_READY.md src/components/ProtectionModal.tsx src/app/(tabs)/characters.tsx src/app/(tabs)/weapons.tsx tests/frontendCharacters.test.tsx tests/defenseProtections.test.ts tests/proficienciesAndClothing.test.ts docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(characters): assistente de proteções, proficiências e vestimentas" \
  -m "- Implementa ProtectionModal.tsx para seleção de proteções e escudos com modificações oficiais e cálculo de Defesa/RD" \
  -m "- Integra assistente de proteções no card de Defesa e sincroniza com inventário da ficha em characters.tsx" \
  -m "- Implementa verificação de proficiências de armas/proteções com alertas visuais e penalidades de -2d20 em characters.tsx e weapons.tsx" \
  -m "- Implementa sistema didático de vestimentas/utensílios com limite de 2 ativas, justificativa narrativa e reflexão de bônus em perícias" \
  -m "- Cria suítes de testes em tests/defenseProtections.test.ts, tests/proficienciesAndClothing.test.ts e tests/frontendCharacters.test.tsx (491 testes 100% passando)" \
  -m "- Documenta matriz de cobertura de testes em TEST_READY.md e atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```
