# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.5.1-beta.1`  
> **Versão Sugerida**: `1.6.0-beta.1` (Motivo: Minor - Depósito de Itens com sincronização, importação curada do Compêndio e sistema completo de mecânicas interativas no inventário)  
> **Última Atualização**: 2026-11-15 14:55

---

## 🚀 Resumo do Próximo Release v1.6.0-beta.1 (Changelog de Usuário)

* **Depósito de Itens & Importação do Compêndio na Ficha e na Armaria**:
  * Nova sub-aba **Itens & Acessórios** dentro da tela **Armaria**, funcionando como catálogo compartilhado entre todos os agentes e sincronizado offline, via Google Drive e Supabase, com botão **Compêndio / Importar do Compêndio** para trazer itens e itens amaldiçoados existentes com 1 toque.
  * Três fluxos diretos na aba **Inventário** do agente: **Novo Item**, **Do Depósito** (com escolha entre **Vincular / Usar o Mesmo** ou **Duplicar**) e **Do Compêndio** (158 itens curados entre comuns, paranormais e 60 itens amaldiçoados com atalho `+ Depósito`).
* **Editor Unificado e Modificações Oficiais de Acessórios**:
  * Novo `ItemEditorModal` com seleção opcional de base do Compêndio, tipos/subcategorias de equipamento, espaços decimais (`0,5`) ou nulos (`0`), cargas/usos, melhorias caseiras e modificações oficiais de acessórios (*Aprimorado*, *Discreto*, *Função Adicional*, *Instrumental*).
* **Mecânicas Interativas de Itens & Status Temporários**:
  * Botão **Usar / Ativar / Rolar** direto nos cards do inventário com suporte a cura de PV/PE/Sanidade, rolagem de dano/explosivos com cálculo automático de **DT** (`10 + PE/rodada + atributo`), gasto de PE e habilidades de perícias.
  * Itens de cura e pontos temporários oferecem escolha rápida **"Aplicar em Mim"** vs **"Aplicar em Aliado (Apenas Rolar)"**, além de badges exclusivos de **PV Temp.** e **PE Temp.** no Status Vital com absorção automática ao sofrer dano/gasto.
  * Consumíveis esgotados permanecem no inventário com badge **`0 usos`** e botão **Usar** bloqueado para preservar registro, oferecendo atalho rápido de **Recarregar / Repor**.
  * Bônus passivos automáticos aplicados quando equipados: carga máxima expandida (*Mochila Militar*), RD adicional de bloqueio (*Braçadeira Reforçada*) e bônus fixos em perícias.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades (Features)
- **Modelagem, Catálogo Curado e Regras (`src/types/compendium.ts`, `src/utils/inventoryItems.ts`, `src/utils/inventorySkills.ts`)**: Definição de `ItemMechanic`, `CustomCatalogItem`, extensões em `CharacterInventoryItem` e `CharacterSheet` (`pvTemp`, `peTemp`), catálogo curado (`getCuratedCompendiumItems`), cálculo de modificações (`calculateCatalogItemStats`), carga decimal (`parseSpacesInput`, `formatSpacesLabel`), `calculateItemSaveDt`, `calculateInventoryMechanicsSummary` e bônus passivos em perícias via `skill_bonus`.
- **Persistência & Sincronização Híbrida (`IDataRepository.ts`, `OfflineDataRepository.ts`, `SmartMergeEngine.ts`, `AppContext.tsx`)**: Persistência local de `customItems` e tombstones `deletedCustomItemIds`, merge LWW multi-dispositivo (Google Drive / Supabase) e propagação automática de edições para itens vinculados (`shared`).
- **Interface Mobile/Web & Exportação (`ItemEditorModal.tsx`, `weapons.tsx`, `characters.tsx`, `RecordPreviewModal.tsx`, `sheetPrinter.ts`)**: Sub-aba `Itens & Acessórios` na Armaria, editor unificado com `BackHandler`, badges de `PV Temp.`/`PE Temp.`, absorção de temporários na ficha, importação curada e impressão PDF/HTML com espaços fracionados, quantidade e mecânicas.

### 🧪 Testes Automatizados
- `npm run test:all` aprovado com **0 falhas**:
  - `npm run typecheck`: `tsc --noEmit` sem erros.
  - `npm run test`: **935** testes passando em **216** suítes (incluindo novas suítes em `tests/inventoryItems.test.ts` e cobertura estendida em `repository.test.ts`, `smartMerge.test.ts`, `frontendCharacters.test.tsx` e `frontendWeapons.test.tsx`).
  - `npm run test:db`: 10 livros e 1.708 entidades verificadas com sucesso.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.6.0-beta.1
```
