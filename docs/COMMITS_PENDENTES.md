# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*(Nenhum commit pendente no momento — todas as etapas foram comitadas com sucesso).*

---

## 📜 Histórico de Commits Recentes

### ✅ 1. Atualização de Configurações do TypeScript no VS Code:
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
  -m "- Configura fluxo continuo de triagem de prints em docs/imagens dos problemas no .gitignore, GEMINI.md e skill screenshot-bug-triage" \
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
