# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.4.0-beta.1` (Android `versionCode: 7`)  
> **Versão Sugerida**: `1.4.0-beta.2` (Motivo: [Patch] Limpeza de documentação obsoleta pós-validação de compatibilidade Android)  
> **Última Atualização**: 2026-11-08 16:26

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que for desenvolvido a partir de agora para a futura versão (`1.4.0-beta.2`). Tudo o que pertenceu à `v1.4.0-beta.1` e versões anteriores já foi exportado para `docs/RELEASE_NOTES.md` e arquivado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.4.0-beta.2 (Changelog de Usuário)
- **Documentação e Manutenção**: Remoção do documento transitório de plano de compatibilidade Android APK, com todas as diretrizes e salvaguardas já incorporadas e ativas no código.

---

## 📦 Detalhamento Técnico das Modificações

### 🧹 Limpeza & Documentação (Chore / Docs)
- Remove `docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md`: Todas as etapas planejadas (interceptação de `BackHandler`, utilitário `clipboard.ts` com fallback e blindagem de exportação de PDFs via `expo-print`/`expo-sharing`) já foram integralmente implementadas e testadas.

### 🐛 Correções de Bugs (Fixes)
- *(Nenhuma correção registrada neste ciclo ainda)*

### 🧪 Testes Automatizados
- *(Aguardando novos testes do ciclo)*

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.4.0-beta.2
```
