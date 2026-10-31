# 📖 Manual de Operação e Governança do Desenvolvedor - Ordo Companion

Bem-vindo ao guia de operação do ecossistema de desenvolvimento do **Ordo Companion**.

Este manual foi elaborado para você saber exatamente **como interagir com a IA**, o que acontece **de forma 100% automática nos bastidores**, e como publicar novos recursos e releases sem burocracia.

---

## 🎯 1. Princípio Fundamental: Automação Total dos Agentes

Você **NUNCA** precisa se preocupar em:
* Lembrar o assistente de rodar testes (`npm run test:all` é obrigatório antes de aprovar qualquer alteração).
* Atualizar manualmente o histórico de pendências ou changelogs.
* Redigir mensagens de commit no padrão Conventional Commits.
* Calcular se a próxima versão é Patch, Minor ou Major (o assistente calcula SemVer sozinho).

---

## 🗺️ 2. Como Você Deve Agir (Fluxo do Usuário)

No dia a dia de desenvolvimento, suas interações são simples e diretas:

### A. Solicitar Funcionalidades ou Correções
Basta pedir em linguagem natural. Exemplos:
* *"Adicione suporte a mais armas de fogo da comunidade na Armaria."*
* *"O cálculo de Sanidade do Combatente com NEX 35% está dando 1 ponto a menos, corrija isso."*
* *"Crie uma nova tela para visualizar as relíquias do Outro Lado."*

### B. Efetuar Commits das Alterações Prontas
Sempre que uma alteração for finalizada e validada pelos testes, o assistente atualizará automaticamente o arquivo [`docs/COMMITS_PENDENTES.md`](./COMMITS_PENDENTES.md). Para efetivar o commit, você tem duas opções:
1. **Pelo Chat (Mais fácil)**: Basta digitar:
   > *"faça o commit"* ou *"faça esse aqui"*
   O assistente executará o commit via terminal com título e corpo semânticos padronizados.
2. **Pelo Terminal**: Copie e cole o comando pronto que sempre estará visível em [`docs/COMMITS_PENDENTES.md`](./COMMITS_PENDENTES.md).

### C. Gerar e Publicar uma Nova Versão (Release)
Quando acumular várias novidades e quiser gerar um novo APK ou publicação no GitHub:
1. **Pelo Chat**: Diga simplesmente:
   > *"gere a release"* ou *"lance a versão recomendada"*
2. **Pelo Terminal**:
   ```bash
   npm run release <versao_sugerida> "Resumo das novidades para os usuários"
   git tag v<versao_sugerida>
   git push origin main --tags
   ```
   *(A versão sugerida e o texto do changelog estarão sempre prontos no topo de [`docs/ATUALIZACOES_PENDENTES.md`](./ATUALIZACOES_PENDENTES.md)).*

---

## ⚙️ 3. O Que Acontece Automaticamente nos Bastidores

A cada demanda enviada por você, a IA percorre autonomamente o pipeline de 4 fases definido no [`GEMINI.md`](../GEMINI.md):

```
[Sua Mensagem]
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 1. Triagem Automática & Adoção de Especialistas        │
│    • RPG/Regras: 🛡️ rpg-rules-expert                  │
│    • Telas/Design: 📱 mobile-ui-expert                 │
│    • Sincronização: 🔄 sync-architect                  │
│    • Prompts G.L.I.T.C.H.: 🧠 glitch-prompt-engineer   │
│    • Livros/Compêndio: 📚 data-pipeline-specialist     │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 2. Execução Técnica & Bateria de Testes (QA)           │
│    • 🧪 qa-reliability-engineer                        │
│    • Executa typecheck estrito TypeScript              │
│    • Executa suíte de 378+ testes automatizados        │
│    • Valida integridade referencial do banco de dados  │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 3. Governança de Release & Versionamento               │
│    • 📋 release-manager                                │
│    • Atualiza docs/ATUALIZACOES_PENDENTES.md           │
│    • Recalcula SemVer (Patch, Minor ou Major)          │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 4. Arquiteto de Commits Semânticos                     │
│    • 🎯 git-commit-architect                           │
│    • Atualiza docs/COMMITS_PENDENTES.md                │
│    • Prepara comando git commit convencional           │
└────────────────────────────────────────────────────────┘
```

---

## 📁 4. Painel de Controle de Arquivos Chave

| Arquivo | Função Principal |
| :--- | :--- |
| [`GEMINI.md`](../GEMINI.md) | **Cérebro de Governança**: Define regras do livro, matriz de roteamento e regras obrigatórias de execução autônoma. |
| [`docs/README.md`](./README.md) | **Central de Documentação**: Hub com índice e links para todos os manuais e guias do projeto. |
| [`docs/MANUAL_DO_USUARIO.md`](./MANUAL_DO_USUARIO.md) | **Manual do Usuário**: Guia completo de telas, fichas, combate, VTT e regras canônicas. |
| [`docs/GUIA_ATUALIZACOES.md`](./GUIA_ATUALIZACOES.md) | **Guia de Distribuição**: Métodos de hospedagem, build de APK e publicação de releases. |
| [`docs/ATUALIZACOES_PENDENTES.md`](./ATUALIZACOES_PENDENTES.md) | **Changelog Vivo**: Lista todas as melhorias prontas para a próxima release, com versão sugerida e comando `npm run release`. |
| [`docs/COMMITS_PENDENTES.md`](./COMMITS_PENDENTES.md) | **Fila de Commits**: Armazena os commits semanticamente formatados e o comando exato para salvar no Git. |
| [`.agents/skills/`](../.agents/skills/) | **Skills Especializadas**: Contém os manuais técnicos de auditoria do sistema. |

---

## 🛠️ 5. Comandos Rápidos de Consulta para Você

Se você desejar rodar verificações manuais no seu próprio terminal PowerShell:

```bash
# 1. Validação Completa (TypeScript + Testes + Integridade do Banco):
npm run test:all

# 2. Apenas testes de tela e componentes React Native:
npm run test:front

# 3. Enviar commits e tags já criados para o GitHub:
git push origin main --tags
```
