# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.3.0-beta.1` (Android `versionCode: 5`)  
> **Versão Sugerida**: `1.3.0-beta.2` (Motivo: [Aguardando novas entregas] Ciclo limpo iniciado após a release `v1.3.0-beta.1`)  
> **Última Atualização**: 2026-11-07 22:38

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.3.0-beta.2`). Tudo o que pertenceu à `v1.3.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.3.0-beta.2 (Changelog de Usuário)
- Relatos enviados pela Central de Suporte agora chegam automaticamente ao canal oficial de suporte no Discord.
- O painel de configuração de webhook do desenvolvedor não aparece mais para os usuários finais.
- Mesa Virtual online funciona direto, sem precisar configurar Supabase (servidor oficial embutido).
- G.L.I.T.C.H. ganha o Groq como segundo provedor gratuito padrão.
- Botão "Discord" do suporte agora leva ao servidor oficial do Ordo Companion.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- `eas.json`: adicionada `EXPO_PUBLIC_SUPPORT_DISCORD_WEBHOOK_URL` nos perfis development, preview e production, consumida por `SupportService.getEffectiveWebhookUrl()` como webhook padrão embutido no APK.
- `SupportCenterView.tsx`: Bloco 4 (Painel do Desenvolvedor / Mestre) envolvido em `__DEV__`, ficando oculto em builds de release.
- `eas.json`: adicionadas `EXPO_PUBLIC_SUPPORT_DISCORD_INVITE`, `EXPO_PUBLIC_DEFAULT_GROQ_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` nos 3 perfis; chave padrão do Gemini rotacionada.
- `SupabaseTableConnector.ts`: `DEFAULT_SUPABASE_CONFIG` lido das variáveis de ambiente (normaliza sufixo `/rest/v1/`).
- `VirtualTableManager.ts`: usa o Supabase oficial como padrão quando o mestre não informa credenciais próprias (antes caía no simulador local).
- `SupportService.ts`: fallback do convite do Discord atualizado para `https://discord.gg/vPCZzr2wFR`.
- `.env.example`: removida chave real do Gemini e documentadas as novas variáveis com placeholders.

### 🐛 Correções de Bugs (Fixes)
- `.vscode/settings.json`: substituídas as chaves depreciadas `typescript.tsdk` e `typescript.enablePromptUseWorkspaceTsdk` pelas novas `js/ts.tsdk.path` e `js/ts.tsdk.promptToUseWorkspaceVersion`.

### 🧪 Testes Automatizados
- *(Aguardando novos testes do ciclo)*

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.3.0-beta.2
```
