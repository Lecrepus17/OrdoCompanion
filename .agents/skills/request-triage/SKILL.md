---
name: request-triage
description: >-
  Centraliza e audita criticamente solicitações de Erros e Melhorias vindas do Discord (via npm run requests:fetch) ou enviadas diretamente no chat pelo desenvolvedor. Separa Erros e Melhorias, lê dinamicamente as perguntas configuradas em data/request_triage_questions.json (SSOT), exige parecer dos agentes especializados (UI/UX, Regras Canônicas, Android APK, Sync/Offline, IA) e apresenta questionário interativo de aprovação antes de executar ou salvar em docs/SOLICITACOES.md.
---

# ⚖️ Skill: Central de Solicitações & Triagem Crítica Multi-Agente (`request-triage`)

Esta skill transforma todas as ideias, correções e relatos (do Discord, do App ou pedidos diretamente no chat) em um **processo estruturado, cético e auditado**, impedindo alterações impulsivas que quebrem regras canônicas, poluam a interface mobile ou comprometam o APK Android.

---

## 1. Quando Acionar Automaticamente

Acione esta skill **sem esperar que o usuário cite o nome da skill** sempre que houver:
1. **Busca no Discord**:
   * *"veja as solicitações do discord"*, *"quais são os novos erros e melhorias do discord"*, *"cheque o discord"*, *"busque os erros/melhorias"*.
2. **Solicitação Direta no Chat**:
   * *"nova solicitação: ..."*, *"avalie essa melhoria: ..."*, *"avalie esse erro: ..."*, *"quero pedir uma melhoria/correção: ..."*, *"analise se vale a pena fazer ..."*.
3. **Execução da Fila**:
   * *"implemente os itens pendentes de SOLICITACOES.md"*, *"mostre a fila de solicitações aprovadas"*.

---

## 2. Regra da Fonte Única da Verdade (SSOT) das Perguntas

> [!IMPORTANT]
> **NUNCA use perguntas fixas de memória!**
> Antes de redigir qualquer relatório de triagem, **LEIA obrigatoriamente o arquivo [`data/request_triage_questions.json`](../../../data/request_triage_questions.json)**.
> * Renderize **todas** as perguntas onde `"active": true`, na ordem de `number`, usando exatamente o `title` e seguindo o `promptHint` definido lá.
> * Se o usuário tiver adicionado, editado ou desativado uma pergunta nesse único JSON, o relatório refletirá a mudança imediatamente em todo o fluxo (Discord e Chat Direto).

---

## 3. Passo a Passo Obrigatório de Execução

### Passo 1: Coleta e Separação Estrita (`🐛 ERROS` vs. `💡 MELHORIAS`)

* **Caso A — Origem Discord**:
  1. Leia `data/request_triage_questions.json` e `docs/SOLICITACOES.md`.
  2. Execute `npm run requests:fetch -- --json` (ou `node scripts/discord_requests.js fetch --json --type=errors|improvements` se o usuário pediu apenas um tipo).
  3. Se o token/canais do Discord ainda não estiverem configurados no `.env`, informe exatamente quais variáveis faltam (`DISCORD_BOT_TOKEN`, `DISCORD_BUGS_CHANNEL_ID`, `DISCORD_SUGGESTIONS_CHANNEL_ID`) e aponte para o guia rápido em [`docs/SOLICITACOES.md`](../../../docs/SOLICITACOES.md).
  4. Mantenha os resultados estritamente separados em duas filas distintas:
     * **Fila 1 — 🐛 ERROS (`SOL-ERR-XXX`)**: Bugs técnicos, falhas visuais, travamentos ou divergências de regras.
     * **Fila 2 — 💡 MELHORIAS (`SOL-MEL-XXX`)**: Sugestões de features, melhorias de UX/UI ou ajustes opcionais.
* **Caso B — Origem Chat Direto**:
  1. Leia `data/request_triage_questions.json` e `docs/SOLICITACOES.md`.
  2. Classifique a demanda do usuário em **🐛 ERRO (`SOL-ERR-XXX`)** ou **💡 MELHORIA (`SOL-MEL-XXX`)** (ou ambos se houver múltiplos itens na mesma mensagem).
  3. **Não comece a editar o código antes de concluir a análise crítica e a aprovação no questionário!**

---

### Passo 2: Inspeção Real do Código + Postura Crítica ("Anti-Sim-Senhor")

Antes de responder, **pesquise e leia os arquivos reais do projeto** afetados por cada solicitação.

> [!CAUTION]
> **Obrigatório: Seja Crítico, Cético e Protetor da Arquitetura!**
> * **NÃO aprove todas as melhorias automaticamente.** Seu papel é atuar como um Tech Lead exigente protegendo a estabilidade do Ordo Companion.
> * **Recomende `❌ Não Recomendado`** ou **`⚠️ Recomendado com Ressalvas`** sempre que identificar qualquer um destes problemas:
>   1. **Violação Canônica**: Altera fórmulas de Ordem Paranormal RPG v1.1 sem base nos livros oficiais.
>   2. **Poluição Visual / Quebra Mobile**: Adiciona botões/campos redundantes que apertam telas de `360px` ou quebram modais.
>   3. **Risco de Android APK (Hermes)**: Introduz dependência web (`window`, `document`, `navigator`), consumo excessivo de RAM/heap ou fluxo sem `BackHandler`.
>   4. **Risco de Dados / Sync**: Pode corromper fichas antigas já salvas no `AsyncStorage`, quebrar o `SmartMergeEngine` ou exigir migração pesada sem ganho proporcional.
>   5. **Custo x Benefício Ruim**: Exige alteração arquitetural grande (`🔴 Arquitetural` / `🟠 Alto`) para resolver um desejo muito nichado ou já coberto por outro recurso do app.

---

### Passo 3: Formato Obrigatório do Relatório no Chat

Apresente o relatório claramente dividido em **2 blocos independentes** (`## 🐛 Erros Analisados` e `## 💡 Melhorias Analisadas`). Para cada item, use a estrutura abaixo (substituindo o bloco numerado pelas perguntas ativas lidas de `data/request_triage_questions.json`):

```markdown
### [SOL-ERR-001 / SOL-MEL-001] Título Objetivo da Solicitação
* **Origem**: Discord (`#canal` • `@autor` • `#ORD-XXXX`) | Chat Direto
* **Nível de Alteração**: 🟢 Baixo | 🟡 Médio | 🟠 Alto | 🔴 Arquitetural
* **Veredito da IA**: ✅ Recomendado | ⚠️ Recomendado com Ressalvas | ❌ Não Recomendado

<!-- Renderizar dinamicamente TODAS as perguntas ativas de data/request_triage_questions.json -->
1. **<questions[0].title>**
   Resposta técnica objetiva baseada no código real.
2. **<questions[1].title>**
   Resposta crítica (sem bajulação).
...

* **Parecer dos Agentes Especializados**:
  * 🛡️ **`rpg-rules-expert`**: Impacto nas regras canônicas v1.1 e suplementos.
  * 📱 **`mobile-ui-expert`**: Impacto em UX/UI tática, tema claro/escuro, modais e largura 360px.
  * 🤖 **`android-apk-guardian`**: Riscos no APK Android (Hermes, `BackHandler`, `expo-sharing`, `expo-file-system`, teclado).
  * 🔄 **`sync-offline-guardian`** / 🔮 **`glitch-prompt-engineer`** / 📚 **`data-pipeline-architect`**: *(incluir sempre que tocar sync/dados, IA G.L.I.T.C.H. ou compêndio/PDFs)*.
```

---

### Passo 4: Questionário Interativo Obrigatório (`ask_question`)

Imediatamente após exibir o relatório no chat (ou na mesma resposta), dispare a ferramenta **`ask_question`**:

1. **Se houver Erros avaliados**:
   * `is_multi_select: true`
   * Pergunta: `"Quais ERROS analisados você deseja aprovar?"`
   * Opções: Uma por erro no formato `"[SOL-ERR-001] Título curto — (Veredito IA | Nível)"` + opção `"Nenhum erro desta lista"`.
2. **Se houver Melhorias avaliadas**:
   * `is_multi_select: true`
   * Pergunta: `"Quais MELHORIAS analisadas você deseja aprovar?"`
   * Opções: Uma por melhoria no formato `"[SOL-MEL-001] Título curto — (Veredito IA | Nível)"` + opção `"Nenhuma melhoria desta lista"`.
3. **Pergunta de Destino/Execução**:
   * `is_multi_select: false`
   * Pergunta: `"O que devo fazer com os itens selecionados?"`
   * Opções:
     * `"(Recommended) Executar agora no código os itens selecionados"`
     * `"Apenas salvar os selecionados em docs/SOLICITACOES.md para implementar depois"`
     * `"Executar apenas os Erros agora e salvar as Melhorias em docs/SOLICITACOES.md"`
     * `"Apenas registrar os rejeitados e encerrar sem alterar código"`

---

### Passo 5: Pós-Decisão (Execução, Registro & Ack no Discord)

Após o usuário responder ao `ask_question`:
1. **Confirmar leitura do Discord (`ack`)**:
   * Para mensagens vindas do Discord, execute `npm run requests:ack` marcando os IDs aprovados (`--status=approved` ou `done`), salvos para depois (`--status=backlog`) ou recusados (`--status=rejected`) para que nunca sejam reexibidos como inéditos.
2. **Atualizar `docs/SOLICITACOES.md`**:
   * Itens salvos para depois entram na **Fila 1 (Erros Validados)** ou **Fila 2 (Melhorias Aprovadas)**.
   * Itens recusados/não selecionados vão para o **Histórico de Solicitações Recusadas** com o motivo técnico resumido.
3. **Se houver itens para Executar Agora**:
   * Se estiver em modo de planejamento ou a implementação for complexa (`🟠 Alto` / `🔴 Arquitetural`), use o fluxo de plano ou execute com os agentes especializados do `GEMINI.md` (`rpg-rules-expert`, `mobile-ui-expert`, `android-apk-guardian`, etc.).
   * Valide obrigatoriamente com `qa-reliability-engineer` (`npm run typecheck` + Smart Testing Gates / `npm run test:all`).
   * Mova os itens executados para `✅ Histórico de Solicitações Implementadas` em `docs/SOLICITACOES.md`.
   * Atualize `docs/ATUALIZACOES_PENDENTES.md` (`update-recorder`) e `docs/COMMITS_PENDENTES.md` (`commit-generator`) respeitando o isolamento estrito de arquivos.
