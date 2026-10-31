# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.1.0-beta.1`  
> **Versão Sugerida**: `1.1.0-beta.1` (Status: *Release preparada com sucesso*)  
> **Próxima Versão em Desenvolvimento**: `1.2.0-beta.1` (Motivo: [Minor] Expansão do sistema G.L.I.T.C.H. com novas personas e agentes especialistas)  
> **Última Atualização**: 2026-10-30 20:35

---

## 🚀 Resumo do Release v1.1.0-beta.1 (Changelog de Usuário)
* **Novo Visualizador & Gerenciador de PDFs**: Suporte a desbloqueio, leitura aprimorada e exclusão segura de livros locais.
* **Exportação de Cards em Imagem**: Gere e compartilhe imagens de alta qualidade das entidades do compêndio e rituais com tema paranormal.
* **Resumo Inteligente de Habilidades**: Descrições compactas e diretas para consulta ágil durante o combate.
* **Evolução de Agente Aprimorada**: Melhorias no fluxo de Level Up, cálculo de limites de PE e exportação de fichas.
* **Sincronização em Nuvem sem Fantasmas**: Exclusão suave rastreada que impede fichas ou campanhas deletadas de reaparecerem após o backup.
* **Roteamento Autônomo de Agentes**: Instruções no `GEMINI.md` para acionamento automático de especialistas por contexto.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades & Correções (Features & Fixes)
- **Sincronização em Nuvem & Exclusão Segura (`SmartMergeEngine.ts`, `OfflineDataRepository.ts`)**:
  - Rastreamento de `deletedCharacterIds` e `deletedCampaignIds` para evitar ressuscitar fichas e campanhas excluídas ao mesclar com Google Drive.
  - Métodos `markCharacterDeleted` e `markCampaignDeleted` integrados no repositório offline e `AppContext`.
- **Autenticação de Senha Mestre de PDFs (`PdfAccessService.ts`)**:
  - Atualizado para aceitar tanto `ORDOCOMPANIONEOMELHOR` quanto `ORDOCOMPENDIONEOMELHOR` via hashes SHA-256 autorizados com salt.
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

### 🧪 Testes Automatizados (378 testes passando - 100% de sucesso)
- `tests/pdfAccessAndUnlock.test.tsx` & `tests/deletePdfBook.test.tsx`: Cobertura de ciclo de vida de PDFs e autenticação por senha mestre.
- `tests/cardImage.test.ts`: Validação de extração de dados para renderização de cards.
- `tests/abilitySummarizer.test.ts`: Validação do algoritmo de sumarização.
- `tests/progression.test.ts` & `tests/sheetPrinter.test.ts`: Testes de regras e layout de impressão.

### 📚 Governança, IA & Compêndio
- **Padronização da Central de Documentação (`docs/`)**:
  - Centralização de manuais e guias em `docs/` (`MANUAL_DO_USUARIO.md` e `GUIA_ATUALIZACOES.md` movidos da raiz para `docs/`).
  - Criação do hub de documentação `docs/README.md` com índice completo de navegação e descritivo por público-alvo.
  - Atualização do `README.md` na raiz com nova seção de Documentação e atualização da árvore de diretórios.
  - Atualização do painel de arquivos chave em `docs/MANUAL_DE_DESENVOLVIMENTO.md`.
  - Preservação canônica na raiz de `README.md` e `GEMINI.md`, e das skills em `.agents/skills/`.
- **Roteamento Automático de Agentes (`GEMINI.md`)**:
  - Matriz de Gatilhos x Agentes x Skills para acionamento transparente sem intervenção do usuário.
  - Pipeline de Ciclo de Vida de Tarefas (Triagem -> QA -> Release -> Commit).
- Atualização completa de `compendium_seed.json` com campos normalizados.

---

## 🔮 Backlog de Pendências para v1.2.0-beta.1
1. **Personas Canônicas no G.L.I.T.C.H. (`docs/MELHORIAS_AGENTES_IA.md`)**:
   - Integração das personas Senhor Veríssimo, Arthur Cervero e Kian no `OracleModal`.
2. **Agentes Utilitários Especialistas**:
   - Co-Mestre/Gerador de Enigmas, Build Advisor e Árbitro Rápido de Regras.

---

## 🛠️ Comandos de Publicação do Release
```bash
# 1. Commit e Tag da versão preparada:
git add .
git commit -m "chore: release v1.1.0-beta.1"
git tag v1.1.0-beta.1
git push origin main --tags
```
