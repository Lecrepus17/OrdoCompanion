# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.0.1-beta.1`  
> **Versão Sugerida**: `1.1.0-beta.1` (Motivo: [Minor] Grande volume de novas funcionalidades — Leitor de PDF, Exportação de Cards em Imagem, Resumidor de Habilidades e Governança de Agentes)  
> **Última Atualização**: 2026-10-29 20:00

---

## 🚀 Resumo para Release (Changelog de Usuário)
* **Novo Visualizador & Gerenciador de PDFs**: Suporte a desbloqueio, leitura aprimorada e exclusão segura de livros locais.
* **Exportação de Cards em Imagem**: Gere e compartilhe imagens de alta qualidade das entidades do compêndio e rituais.
* **Resumo Inteligente de Habilidades**: Descrições compactas e diretas para consulta ágil durante o combate.
* **Evolução de Agente Aprimorada**: Melhorias no fluxo de Level Up, cálculo de limites de PE e exportação de fichas.
* **Ecossistema de IA e Automação**: Governança de subagentes no `GEMINI.md` e automação de changelogs.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)
- **Leitor e Gerenciador de PDFs (`src/services/pdf/`, `src/components/Pdf*`)**:
  - Implementado modal de exclusão segura de livros locais (`deletePdfBook`).
  - Suporte expandido a carregamento de URLs e fluxo de desbloqueio com senha.
- **Exportação de Cards (`src/services/cardImage/`, `RecordImageCard.tsx`)**:
  - Renderização off-screen de cards táticos com paleta paranormal.
  - Extração de estatísticas e exportação com resolução otimizada para compartilhamento.
- **Resumidor de Habilidades (`src/utils/abilitySummarizer.ts`)**:
  - Compactação automática de textos longos de rituais e poderes para visualização em cards rápidos.
- **Progressão de Personagens (`LevelUpModal.tsx`, `progression.ts`)**:
  - Refinamento de fórmulas de avanço de NEX, atributos e limite de PE por turno.
  - Melhorias no utilitário de impressão de fichas (`sheetPrinter.ts`).

### 🧪 Testes Automatizados (Tests)
- `tests/pdfAccessAndUnlock.test.tsx` & `tests/deletePdfBook.test.tsx`: Cobertura de ciclo de vida de PDFs.
- `tests/cardImage.test.ts`: Validação de extração de dados para renderização de cards.
- `tests/abilitySummarizer.test.ts`: Validação do algoritmo de sumarização.
- `tests/progression.test.ts` & `tests/sheetPrinter.test.ts`: Testes de regras e layout de impressão.

### 📚 Governança & Compêndio
- Atualização completa de `compendium_seed.json` com campos normalizados.
- Configuração do ecossistema de subagentes em `GEMINI.md` e `.agents/skills/`.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.1.0-beta.1 "Leitor de PDF aprimorado, exportação de cards em imagem, resumidor de habilidades e melhorias de ficha"
```
