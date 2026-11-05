# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*(Nenhum commit pendente no momento. Todas as alterações foram consolidadas e commitadas no commit `c426a54`)*

---

## 📜 Histórico de Commits Recentes

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
