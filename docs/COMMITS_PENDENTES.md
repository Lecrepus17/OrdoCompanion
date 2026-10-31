# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ✅ Fila Atual: Vazia (Todos os commits executados com sucesso)

Todos os arquivos modificados e novas funcionalidades foram commitados em commits atômicos e semânticos.

---

## 📜 Histórico de Commits Recentes

### 1. Centralização e Padronização da Documentação:
```bash
git add README.md docs/
git commit -m "docs: centraliza documentação na pasta docs/ com índice unificado e atualiza README" \
  -m "- Centraliza manuais e guias na pasta docs/ com índice unificado em docs/README.md" \
  -m "- Adiciona docs/MANUAL_DE_DESENVOLVIMENTO.md com fluxo dos agentes autônomos" \
  -m "- Atualiza README.md na raiz com nova seção de Documentação e árvore de diretórios" \
  -m "- Atualiza changelog contínuo em docs/ATUALIZACOES_PENDENTES.md" \
  -m "- Preserva canonicamente na raiz apenas README.md e GEMINI.md, e as skills em .agents/skills/"
```

### 2. Expansão do G.L.I.T.C.H. com 6 Novas Personas e Prompts Modulares:
```bash
git commit -m "feat(ai): expande G.L.I.T.C.H. com 6 novas personas, prompts modulares, abas temáticas e RAG por papel" \
  -m "- Adiciona personas canônicas (Veríssimo, Arthur Cervero, Kian) e especialistas (Árbitro Rápido, Co-Mestre, Build Advisor)" \
  -m "- Modula arquitetura de prompts em src/services/ai/prompts/" \
  -m "- Implementa RAG adaptativo por papel do agente e suporte offline temático em AiOfflineEngine" \
  -m "- Adiciona abas de categoria (Táticos, Ordem, Relíquias) e sugestões dinâmicas no Oráculo e ConfigModal" \
  -m "- Adiciona cobertura de testes automatizados em tests/ai.test.ts e tests/frontendOracle.test.tsx" \
  -m "- Documenta roadmap e personas em docs/MELHORIAS_AGENTES_IA.md"
```

### 3. Governança de Agentes e Smart Testing Gates:
```bash
git commit -m "chore(agents): estrutura matriz de 8 especialistas e configura smart testing gates" \
  -m "- Configura matriz de roteamento autônomo com gatilhos automáticos no GEMINI.md" \
  -m "- Adiciona scripts de testes rápidos npm run test:rules e npm run test:sync no package.json" \
  -m "- Documenta matriz de Smart Testing Gates em .agents/skills/run-suite/SKILL.md" \
  -m "- Adiciona 4 novas skills especializadas: data-pipeline-audit, glitch-prompt-audit, mobile-ui-audit e sync-offline-audit"
```
