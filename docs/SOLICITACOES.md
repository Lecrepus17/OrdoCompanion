# 🗂️ Central de Solicitações — Ordo Companion (Erros & Melhorias)

Este documento centraliza o backlog triado de **🐛 Erros** e **💡 Melhorias** vindos do servidor **Discord** (membros e Central de Suporte do App) ou de **solicitações diretas no chat** com a IA.

---

## ⚡ Como Usar no Dia a Dia

### 1. Buscar e Avaliar Novidades do Discord
Basta pedir no chat:
> *"Veja quais são os novos erros e melhorias do Discord e me passe o relatório para eu escolher."*

Ou para filtrar apenas um tipo:
> *"Busque apenas os novos erros do Discord."* / *"Avalie as novas melhorias do Discord."*

### 2. Fazer uma Solicitação Direta pelo Chat (Mesmo Crivo Crítico)
Basta enviar sua ideia ou bug no chat dizendo:
> *"Avalie essa melhoria: [descreva a ideia]"*  
> *"Avalie esse erro: [descreva o problema]"*

Em ambos os casos, a IA inspecionará o código real, responderá às perguntas críticas, consultará os agentes especializados (**Regras Canônicas**, **UI/UX Mobile**, **Android APK/Hermes**, **Sync Offline**, **IA G.L.I.T.C.H.**) e abrirá o **questionário interativo** para você escolher o que aprovar, implementar na hora ou guardar aqui.

### 3. Como Editar, Adicionar ou Remover Perguntas da Análise (Lugar Único / SSOT)
Todas as perguntas da avaliação crítica ficam centralizadas em um único arquivo:
* 📄 **[`data/request_triage_questions.json`](../data/request_triage_questions.json)**

Para mudar o questionário da IA:
* **Remover / Desativar**: mude `"active": false` ou remova o objeto do array `"questions"`.
* **Modificar**: edite `"title"` ou `"promptHint"`.
* **Adicionar**: inclua um novo objeto com `"id"`, `"number"`, `"title"`, `"promptHint"` e `"active": true`.

Você pode conferir a lista ativa pelo terminal com:
```bash
npm run requests:questions
```

---

## 🤖 Configuração Rápida do Bot Leitor do Discord

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications) ➔ **New Application** ➔ aba **Bot** ➔ copie o **Token** (e ative **Message Content Intent** em *Privileged Gateway Intents* para ler textos livres dos membros).
2. Gere o link de convite em **OAuth2 ➔ URL Generator** marcando `bot` com permissões somente de leitura/triagem: `View Channels`, `Read Message History` e (opcional) `Add Reactions`. Convide o Bot para o servidor do Ordo Companion.
3. No Discord, ative o *Modo Desenvolvedor* (*Configurações ➔ Avançado*), clique com o botão direito nos canais `#erros` e `#melhorias` e copie os IDs.
4. No arquivo `.env` local (nunca versionado no Git), preencha:
   ```dotenv
   # Dica: você pode ofuscar o token com `node scripts/obfuscate_secrets.js "SEU_TOKEN"`
   DISCORD_BOT_TOKEN=
   DISCORD_BUGS_CHANNEL_ID=ID_DO_CANAL_DE_ERROS
   DISCORD_SUGGESTIONS_CHANNEL_ID=ID_DO_CANAL_DE_MELHORIAS
   # Opcional: se também tiver um canal único misto (#suporte)
   DISCORD_GENERAL_SUPPORT_CHANNEL_ID=
   ```
5. Teste a conexão no terminal:
   ```bash
   npm run requests:test
   ```

> **Compatibilidade APK (Envio pelo App)**:
> O aplicativo Android (`.apk`) continua enviando relatos com segurança via Supabase Edge Function (`support-webhook`) ou Webhook direto (`SupportService.ts`), roteando automaticamente `bug` / `rule_error` para `DISCORD_BUGS_WEBHOOK_URL` (`#erros`) e `suggestion` para `DISCORD_SUGGESTIONS_WEBHOOK_URL` (`#melhorias`), com fallback para o Webhook geral.

---

## 🐛 Fila 1: Erros Validados Aguardando Correção (`SOL-ERR-XXX`)

| ID | Origem / Protocolo | Resumo | Nível | Veredito IA | Agentes Envolvidos |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *(Nenhum erro aprovado aguardando implementação no momento)* | — | — | — | — | — |

---

## 💡 Fila 2: Melhorias Aprovadas Aguardando Implementação (`SOL-MEL-XXX`)

| ID | Origem / Protocolo | Resumo | Nível | Veredito IA | Agentes Envolvidos |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *(Nenhuma melhoria aprovada aguardando implementação no momento)* | — | — | — | — | — |

---

## ✅ Histórico de Solicitações Implementadas

| ID | Tipo | Origem / Protocolo | Título | Data / Versão |
| :--- | :--- | :--- | :--- | :--- |
| `SOL-ERR-HIST-01` | 🐛 Erro | Discord `#erros` (`#ORD-9386DK`, `#ORD-5040KS`) | OutOfMemoryError no upload de PDF no Android | `2026-11-09` / `v1.5.1-beta.1` |
| `SOL-ERR-HIST-02` | 🐛 Erro | Discord `#erros` (`#ORD-5322T7`) | Maldições em proteções e salto de atributo na ficha assistida | `2026-11-18` / `v1.6.0-beta.1` |
| `SOL-ERR-HIST-03` | 🐛 Erro | Chat Direto (`SOL-ERR-001`) | Falha no login Google OAuth em celulares de outros usuários (`access_denied`, scheme reverso Android e diagnóstico OAuth) | `2026-11-20` / `v1.6.0-beta.2` |
| `SOL-MEL-HIST-01` | 💡 Melhoria | Discord `#erros` (`#ORD-33762V`) | Mecânica dos Mascarados & Forma Suprema | `2026-11-13` / `v1.6.0-beta.1` |
| `SOL-MEL-HIST-02` | 💡 Melhoria | Discord `#erros` (`#ORD-4662K3`) | Importar itens do Compêndio na aba Inventário do Agente | `2026-11-14` / `v1.6.0-beta.1` |
| `SOL-MEL-HIST-03` | 💡 Melhoria | Discord `#erros` (`#ORD-4017YV`) | Armaria para proteções, vestimentas e itens com maldições | `2026-11-18` / `v1.6.0-beta.1` |
| `SOL-MEL-HIST-04` | 💡 Melhoria | Discord `#erros` (`#ORD-913969`) | Criador completo de Ameaças estilo C.R.I.S. (VD 20–400) | `2026-11-18` / `v1.6.0-beta.1` |
| `SOL-MEL-HIST-05` | 💡 Melhoria | Chat Direto (`SOL-MEL-001`) | Aplicativo para PC (Web App + PWA Instalável Offline) com backup `.json` em disco e atualizador PC | `2026-11-20` / `v1.6.0-beta.2` |

---

## ❌ Histórico de Solicitações Recusadas / Descartadas

| ID | Tipo | Origem / Protocolo | Título | Motivo Técnico / Crítico da Rejeição | Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SOL-ERR-HIST-00` | 🐛 Ruído / Teste | Discord `#erros` (`#ORD-3923R0`, `#ORD-5686TZ`, `#ORD-8340DT`, `#ORD-6484JQ`) | Mensagens de teste de formulário e verificação de Proxy | Registros históricos de teste de fumaça / integração sem defeito real associado | `2026-11-07` |
