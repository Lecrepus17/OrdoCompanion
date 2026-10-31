# 📚 Central de Documentação — Ordo Companion

Bem-vindo à central de documentação unificada do **Ordo Companion**. Todos os manuais, guias de distribuição, changelogs e especificações do projeto estão centralizados nesta pasta (`docs/`) para fácil consulta e navegação rápida.

---

## 🧭 Índice Geral de Documentos

| Documento | Público-Alvo | Descrição & Finalidade |
| :--- | :---: | :--- |
| [**`MANUAL_DO_USUARIO.md`**](./MANUAL_DO_USUARIO.md) | Jogadores & Mestres | **Manual Completo do Aplicativo**: Visão detalhada das 9 telas principais, criação de fichas, combate, VTT multiplayer, regras canônicas de Ordem Paranormal RPG e uso da IA G.L.I.T.C.H. |
| [**`MANUAL_DE_DESENVOLVIMENTO.md`**](./MANUAL_DE_DESENVOLVIMENTO.md) | Desenvolvedores & IA | **Guia de Operação e Governança**: Fluxo de trabalho com agentes autônomos, testes obrigatórios (`npm run test:all`), SemVer e publicação de releases. |
| [**`GUIA_ATUALIZACOES.md`**](./GUIA_ATUALIZACOES.md) | Desenvolvedores & Release | **Distribuição e Publicação**: Comparativo de métodos de distribuição (GitHub Releases, APK direto, Google Play, EAS Update), compilação e versionamento. |
| [**`ATUALIZACOES_PENDENTES.md`**](./ATUALIZACOES_PENDENTES.md) | Release Manager & Equipe | **Changelog Vivo & SemVer**: Registro consolidado de todas as novas features, correções e refatorações prontas para o próximo lançamento de versão. |
| [**`COMMITS_PENDENTES.md`**](./COMMITS_PENDENTES.md) | Git Architect & Devs | **Fila e Histórico de Commits**: Mensagens padronizadas em Conventional Commits prontas para execução imediata no Git. |
| [**`MELHORIAS_AGENTES_IA.md`**](./MELHORIAS_AGENTES_IA.md) | Engenharia de IA | **Especificação Técnica da IA**: Relatório de evolução do assistente paranormal G.L.I.T.C.H., personas das Relíquias e pipeline RAG. |
| [**`screenshots/`**](./screenshots/) | Todos | **Galeria de Telas Oficiais**: Capturas de tela e mockups em alta resolução utilizados na documentação e no `README.md`. |

---

## 📌 Arquivos Especiais na Raiz do Projeto

Alguns arquivos markdown possuem localização canônica reservada fora da pasta `docs/`:

* [**`README.md`**](../README.md): Página principal de apresentação do projeto no GitHub (visão geral, badges, prints, instalação e licença).
* [**`GEMINI.md`**](../GEMINI.md): Arquivo de instruções e regras canônicas de domínio para os agentes de IA na raiz do workspace.
* [**`.agents/skills/**/SKILL.md`**](../.agents/skills/): Manuais técnicos e diretrizes operacionais de cada skill dos agentes especializados.
