# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

*Nenhum commit pendente no momento.*

---

## 📜 Histórico de Commits Recentes

### 1. Assistente de Proteções, Proficiências e Vestimentas na Ficha de Personagens:
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

### 2. Motores Canônicos de Proteções, Proficiências e Vestimentas em Perícias (`4e4985d`):
```bash
git add .gitignore src/utils/inventorySkills.ts src/utils/proficiencies.ts src/utils/protections.ts tests/rulesInventorySkills.test.ts tests/rulesProficiencies.test.ts tests/rulesProtections.test.ts docs/
git commit -m "feat(rules): implementa motores canonicos de protecoes, proficiencias e bonus de vestimentas em pericias" \
  -m "- Implementa catalogo e calculos de protecoes e escudos com modificacoes em protections.ts" \
  -m "- Implementa checagem de proficiencias de armas e protecoes por classe, origem e poderes com penalidade de dados em proficiencies.ts" \
  -m "- Implementa aplicacao de bonus de vestimentas e utensilios com limite de 2 ativas e veto a Luta/Pontaria em inventorySkills.ts" \
  -m "- Adiciona 54 testes automatizados em tests/rulesProtections.test.ts, tests/rulesProficiencies.test.ts e tests/rulesInventorySkills.test.ts (454 testes 100% passando)" \
  -m "- Adiciona .agents/teamwork/ ao .gitignore e atualiza governanca em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 3. Correção e Fidelidade dos Resumos de Vitalidade Reforçada e Vontade Inabalável (`3e26d30`):
```bash
git add data/compendium_seed.json src/data/seed/compendium_seed.json src/utils/abilitySummarizer.ts scripts/build_full_database_summaries.js docs/
git commit -m "fix(compendium): inclui bônus de Fortitude e PE nos resumos de Vitalidade Reforçada e Vontade Inabalável" \
  -m "- Corrige resumo de Vitalidade Reforçada para '+1 PV para cada 5% de NEX e +2 em Fortitude' conforme Sobrevivendo ao Horror p. 37" \
  -m "- Corrige resumo de Vontade Inabalável para '+1 PE para cada 10% de NEX e +2 em Vontade' incluindo ganho de PE canônico" \
  -m "- Sincroniza sementes em data/compendium_seed.json, src/data/seed/compendium_seed.json, abilitySummarizer.ts e build_full_database_summaries.js" \
  -m "- Registra no backlog de pendências a revisão geral e arquitetura de automação de poderes/origens que escalam com NEX (Vitalidade Reforçada, Sangue de Ferro, Potencial Aprimorado, Desgarrado, Universitário, Vítima), bônus de perícias ('Treinado ou +2') e alerta permissivo de pré-requisitos" \
  -m "- Atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```

### 4. Padronização Canônica das Abas de Navegação Inferior, Menu Mais e Telas Ocultas (`3845e9c`):
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

### 5. Páginas Referentes no Compêndio e Leitor de PDFs In-App no APK:
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
