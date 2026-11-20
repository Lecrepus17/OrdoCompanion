# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.6.0-beta.1` (Android `versionCode: 12`)  
> **Versão Sugerida**: `1.6.0-beta.2` (Motivo: [Patch] Centralização de Solicitações, Triagem Crítica via Discord/Chat e Roteamento Separado de Erros vs. Melhorias no App/APK)  
> **Última Atualização**: 2026-11-20 13:15

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.6.0-beta.2`). Tudo o que pertenceu à `v1.6.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.6.0-beta.2 (Changelog de Usuário)
* **Central de Suporte com Filas Separadas (Erros vs. Melhorias)**:
  * Chamados enviados pelo aplicativo (incluindo APK Android via Proxy Seguro Supabase ou Discord Webhook) agora identificam a fila de triagem (`🐛 ERROS` para bugs/erros de regra vs. `💡 MELHORIAS` para sugestões) e suportam roteamento automático para canais distintos no Discord (`#erros` e `#melhorias`), com fallback seguro para o webhook geral.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- **Central de Solicitações & Triagem Crítica (`request-triage`, `docs/SOLICITACOES.md`)**:
  - Criada a Fonte Única da Verdade (SSOT) das perguntas de avaliação crítica em `data/request_triage_questions.json` (permitindo adicionar, editar ou desativar perguntas em um único arquivo).
  - Criado o leitor incremental do Discord `scripts/discord_requests.js` (`npm run requests:fetch`, `requests:ack`, `requests:test`, `requests:questions`) com suporte a canais de texto, canais de fórum e embeds da Central de Suporte, separando estritamente **🐛 Erros** e **💡 Melhorias** e evitando repetições via `docs/.discord_requests_state.json`.
  - Criada a skill `.agents/skills/request-triage/SKILL.md` e integrado o Padrão 6 em `GEMINI.md` exigindo postura crítica ("Anti-Sim-Senhor"), parecer dos agentes especializados (`rpg-rules-expert`, `mobile-ui-expert`, `android-apk-guardian`, `sync-offline-guardian`, `glitch-prompt-engineer`, `data-pipeline-architect`) e aprovação via questionário interativo (`ask_question`) tanto para demandas do Discord quanto diretas no chat.
- **Roteamento Separado no App & Compatibilidade APK (`SupportService.ts`, `SupportCenterView.tsx`, `support-webhook/index.ts`)**:
  - Adicionado suporte a Webhooks específicos por fila (`errors` vs. `improvements`) em `SupportService` (com persistência ofuscada `obf:v1:...` no `AsyncStorage` compatível com Hermes Android APK), no Proxy Seguro do Supabase (`DISCORD_BUGS_WEBHOOK_URL`, `DISCORD_SUGGESTIONS_WEBHOOK_URL`) e no painel de desenvolvedor do `SupportCenterView.tsx`.

### 🐛 Correções de Bugs (Fixes)
- *(Nenhuma correção registrada neste ciclo ainda)*

### 🧪 Testes Automatizados
- Adicionada suíte `tests/discordRequests.test.ts` (5 testes cobrindo SSOT em `data/request_triage_questions.json`, classificação separada Erros vs. Melhorias, cursor incremental com BigInt Snowflake e roteamento de webhooks com compatibilidade Hermes APK).
- Validada a suíte completa `npm run test:all`: `tsc --noEmit` (0 erros), `951/951` testes unitários/frontend aprovados em 219 suítes e `npm run test:db` aprovado (`10` livros, `1708` entidades).

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.6.0-beta.2
```
