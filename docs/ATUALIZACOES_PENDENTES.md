# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.0.1-beta.1`  
> **Versão Sugerida**: `1.1.0-beta.1` (Motivo: Adição do ecossistema de agentes de IA, skills de automação e melhorias de compêndio)  
> **Última Atualização**: 2026-10-29 19:57

---

## 🚀 Resumo para Release (Changelog de Usuário)
* Configurado ecossistema de subagentes e regras de desenvolvimento autônomo para o Ordo Companion.
* Proposta técnica de novos agentes e personas de IA (Senhor Veríssimo, Co-Mestre de Enigmas e Avaliador de Fichas).
* Automação de changelog estruturado e geração de mensagens de commit semântico.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades e Arquitetura (Features)
- **Governança de Agentes de IA (`GEMINI.md`)**: Diretrizes para agentes de desenvolvimento com personas especializadas (`rpg-rules-expert`, `mobile-ui-expert`, `qa-reliability-engineer`, `release-manager`, `git-commit-architect`).
- **Skills do Workspace (`.agents/skills/`)**:
  - `run-suite`: Automação da validação tripla (TypeScript, tsx e integridade do banco de dados).
  - `rpg-rules-audit`: Procedimentos para auditoria das fórmulas mecânicas de Ordem Paranormal.
  - `update-recorder`: Gravação automática de changelog estruturado com sugestão SemVer.
  - `commit-generator`: Geração de títulos e descrições no padrão Conventional Commits.

### 📚 Documentação (Docs)
- **Proposta de IA (`docs/MELHORIAS_AGENTES_IA.md`)**: Roadmap e arquitetura para agentes temáticos e utilitários dentro do app.
- **Backlog de Atualizações (`docs/ATUALIZACOES_PENDENTES.md`)**: Registro contínuo de novidades prontas para release.
- **Backlog de Commits (`docs/COMMITS_PENDENTES.md`)**: Rastreamento de commits semânticos sugeridos.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.1.0-beta.1 "Ecossistema de agentes inteligentes, automação de changelogs e melhorias técnicas"
```
