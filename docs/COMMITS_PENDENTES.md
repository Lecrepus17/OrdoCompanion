# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## Sugestão de Commit Mais Recente

### Título:
`feat(sync): rastreia exclusão suave no backup, atualiza senha mestre e roteamento de agentes`

### Descrição (Body):
- Implementa rastreamento de deletedCharacterIds e deletedCampaignIds no SmartMergeEngine e OfflineDataRepository
- Integra exclusão suave no AppContext para evitar que agentes e campanhas excluídos ressuscitem na nuvem
- Atualiza hash SHA-256 e testes para senha mestre ORDOCOMPANIONEOMELHOR com retrocompatibilidade
- Adiciona matriz de roteamento autônomo de agentes e ciclo de vida de tarefas no GEMINI.md
- Atualiza documentação de releases e commits pendentes

### Comando Git Pronto:
```bash
git add GEMINI.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md src/context/AppContext.tsx src/repositories/IDataRepository.ts src/repositories/OfflineDataRepository.ts src/services/pdf/PdfAccessService.ts src/services/sync/SmartMergeEngine.ts src/services/sync/types.ts tests/pdfAccessAndUnlock.test.tsx
git commit -m "feat(sync): rastreia exclusão suave no backup, atualiza senha mestre e roteamento de agentes" -m "- Implementa rastreamento de deletedCharacterIds e deletedCampaignIds no SmartMergeEngine e OfflineDataRepository" -m "- Integra exclusão suave no AppContext para evitar que agentes e campanhas excluídos ressuscitem na nuvem" -m "- Atualiza hash SHA-256 e testes para senha mestre ORDOCOMPANIONEOMELHOR com retrocompatibilidade" -m "- Adiciona matriz de roteamento autônomo de agentes e ciclo de vida de tarefas no GEMINI.md" -m "- Atualiza documentação de releases e commits pendentes"
```

---

## 📜 Histórico de Commits Já Realizados
- `a13a176 feat(compendium): adiciona resumidor de habilidades, atualiza seeds da base e docs`
- `cc4865f feat(characters): refina fluxo de level up, impressao de fichas e formulas`
- `b326574 feat(pdf): adiciona exclusao de livros, fluxo de desbloqueio e leitor aprimorado`
- `cd6fd1e feat(cards): implementa exportação e compartilhamento de cards em imagem`
- `69641ce feat(agents): implementa governança de subagentes, skills de automação e changelog contínuo`
