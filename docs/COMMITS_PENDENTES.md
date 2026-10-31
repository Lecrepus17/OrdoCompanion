# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*(Nenhum commit pendente no momento. Todo o código de funcionalidades, correções e testes foi commitado).*

---

## 📜 Histórico de Commits Recentes

### 1. Prevenção de OutOfMemoryError no Android e Otimização do Google OAuth:
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

### 2. Centralização e Padronização da Documentação:
```bash
git add README.md docs/
git commit -m "docs: centraliza documentação na pasta docs/ com índice unificado e atualiza README" \
  -m "- Centraliza manuais e guias na pasta docs/ com índice unificado em docs/README.md" \
  -m "- Adiciona docs/MANUAL_DE_DESENVOLVIMENTO.md com fluxo dos agentes autônomos" \
  -m "- Atualiza README.md na raiz com nova seção de Documentação e árvore de diretórios" \
  -m "- Atualiza changelog contínuo em docs/ATUALIZACOES_PENDENTES.md" \
  -m "- Preserva canonicamente na raiz apenas README.md e GEMINI.md, e as skills em .agents/skills/"
```

### 3. Expansão do G.L.I.T.C.H. com 6 Novas Personas e Prompts Modulares:
```bash
git commit -m "feat(ai): expande G.L.I.T.C.H. com 6 novas personas, prompts modulares, abas temáticas e RAG por papel" \
  -m "- Adiciona personas canônicas (Veríssimo, Arthur Cervero, Kian) e especialistas (Árbitro Rápido, Co-Mestre, Build Advisor)" \
  -m "- Modula arquitetura de prompts em src/services/ai/prompts/" \
  -m "- Implementa RAG adaptativo por papel do agente e suporte offline temático em AiOfflineEngine" \
  -m "- Adiciona abas de categoria (Táticos, Ordem, Relíquias) e sugestões dinâmicas no Oráculo e ConfigModal" \
  -m "- Adiciona cobertura de testes automatizados em tests/ai.test.ts e tests/frontendOracle.test.tsx" \
  -m "- Documenta roadmap e personas em docs/MELHORIAS_AGENTES_IA.md"
```

### 4. Governança de Agentes e Smart Testing Gates:
```bash
git commit -m "chore(agents): estrutura matriz de 8 especialistas e configura smart testing gates" \
  -m "- Configura matriz de roteamento autônomo com gatilhos automáticos no GEMINI.md" \
  -m "- Adiciona scripts de testes rápidos npm run test:rules e npm run test:sync no package.json" \
  -m "- Documenta matriz de Smart Testing Gates em .agents/skills/run-suite/SKILL.md" \
  -m "- Documenta papéis e comandos rápidos no GEMINI.md"
```
