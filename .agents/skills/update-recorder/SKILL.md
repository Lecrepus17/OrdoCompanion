---
name: update-recorder
description: >-
  Registra alterações de código e novas funcionalidades em docs/ATUALIZACOES_PENDENTES.md, calculando a sugestão de próxima versão SemVer (Patch, Minor ou Major) e mantendo o changelog pronto para o script de release do app.
---

# Skill: Gravador de Atualizações e Versionamento (update-recorder)

Esta skill orienta o registro padronizado de mudanças no arquivo `docs/ATUALIZACOES_PENDENTES.md` sempre que arquivos forem alterados no projeto.

---

## 1. Verificação da Versão Atual

1. Inspecione a versão corrente em `package.json` ou `version.json` (ex: `1.0.1-beta.1`).
2. Analise a natureza das alterações recentes:
   * **PATCH** (ex.: `1.0.1-beta.1` ➔ `1.0.2-beta.1`): Correções de bugs, pequenas melhorias de layout ou ajustes sem adição de grandes recursos.
   * **MINOR** (ex.: `1.0.1-beta.1` ➔ `1.1.0-beta.1`): Adição de novas telas, novas entidades no compêndio, novos recursos ou integrações.
   * **MAJOR** (ex.: `1.0.1-beta.1` ➔ `2.0.0-beta.1`): Mudanças estruturais que quebram retrocompatibilidade no banco de dados local ou arquitetura.

---

## 2. Estrutura do Arquivo `docs/ATUALIZACOES_PENDENTES.md`

O arquivo deve sempre manter no topo a sugestão de versão atualizada e acumular os tópicos das mudanças recentes:

```markdown
# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `X.Y.Z-beta.W`  
> **Versão Sugerida**: `X.Y.Z-beta.W` (Motivo: [Patch/Minor/Major] - resumo)  
> **Última Atualização**: AAAA-MM-DD HH:MM

---

## 🚀 Resumo para Release (Changelog de Usuário)
*Item 1 pronto para o version.json*
*Item 2 pronto para o version.json*

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- [Área/Componente]: Descrição clara do que foi introduzido.

### 🐛 Correções de Bugs (Fixes)
- [Área/Componente]: Descrição do problema corrigido e comportamento anterior.

### ⚡ Melhorias e Refatorações
- [Área/Componente]: Otimização de performance ou código.

### 📚 Documentação e Governança
- [Área/Componente]: Guias, regras de agentes e skills criadas.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release <versao_sugerida> "Resumo das novidades para os usuários"
```
```

---

## 3. Procedimento de Atualização

1. Ao finalizar edições, abra ou atualize `docs/ATUALIZACOES_PENDENTES.md`.
2. Se já existirem itens pendentes acumulados de tarefas anteriores, mantenha-os e agrupe a nova entrega.
3. Recalcule a versão sugerida caso a nova entrega eleve o impacto (ex: se era Patch e agora foi adicionada uma Feature, a sugestão sobe para Minor).
