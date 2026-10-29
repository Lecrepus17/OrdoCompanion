---
name: commit-generator
description: >-
  Analisa os arquivos modificados e gera títulos e descrições semânticas de commit seguindo Conventional Commits. Registra o histórico em docs/COMMITS_PENDENTES.md e fornece o comando exato de git commit para execução.
---

# Skill: Gerador de Commits Semânticos (commit-generator)

Esta skill orienta a geração padronizada de mensagens de commit baseadas nas especificações de **Conventional Commits** e seu registro estruturado em `docs/COMMITS_PENDENTES.md`.

---

## 1. Padrão de Nomenclatura (Conventional Commits)

### Estrutura do Título:
`<tipo>(<escopo>): <descrição no imperativo/presente em português>` (máx. 72 caracteres)

### Tipos Válidos:
* `feat`: Nova funcionalidade para o usuário ou app.
* `fix`: Correção de bug ou fórmula incorreta.
* `refactor`: Mudança de código que não corrige bug nem adiciona funcionalidade.
* `perf`: Melhoria de desempenho ou otimização de renderização.
* `test`: Adição ou refatoração de testes automatizados (`tests/`).
* `docs`: Atualização em documentação, manuais ou regras de agentes (`GEMINI.md`, `docs/`).
* `chore`: Ajustes de build, dependências ou scripts (`package.json`, `scripts/`).

### Escopos Comuns do Ordo Companion:
`agents`, `rules`, `compendium`, `character`, `combat`, `ai`, `dice`, `pdf`, `ui`, `theme`.

---

## 2. Estrutura do Arquivo `docs/COMMITS_PENDENTES.md`

O arquivo deve listar os commits sugeridos prontos para serem executados:

```markdown
# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada.

---

## Sugestão de Commit Mais Recente

### Título:
`tipo(escopo): descrição concisa`

### Descrição (Body):
- Detalhe da alteração 1
- Detalhe da alteração 2
- Arquivos afetados principais

### Comando Git Pronto:
```bash
git add <arquivos>
git commit -m "tipo(escopo): descrição concisa" -m "- Detalhe 1" -m "- Detalhe 2"
```

---

## 📜 Histórico de Sugestões Anteriores
*(Manter os últimos commits sugeridos para referência)*
```

---

## 3. Passo a Passo do Agente

1. Execute `git status -s` ou inspecione os arquivos alterados nesta sessão.
2. Identifique o tipo e escopo dominante da entrega.
3. Elabore um título claro e uma lista de bullet points destacando os arquivos e o valor da modificação.
4. Escreva ou atualize `docs/COMMITS_PENDENTES.md`.
5. Apresente o bloco de comando para o usuário no chat.
