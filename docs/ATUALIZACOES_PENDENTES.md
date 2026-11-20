# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.5.1-beta.1`  
> **Versão Sugerida**: `1.6.0-beta.1` (Motivo: Minor - Depósito de Itens com sincronização, criador completo de ameaças estilo C.R.I.S., mecânica Forma Suprema dos Mascarados, maldições completas de proteções/acessórios e correções de evolução/regras/UI APK)  
> **Última Atualização**: 2026-11-19 23:54

---

## 🚀 Resumo do Próximo Release v1.6.0-beta.1 (Changelog de Usuário)

* **Criador Completo de Ameaças Estilo C.R.I.S. (`#ORD-913969`)**:
  * Novo `ThreatCreatorModal` acessível tanto pela **Aba do Mestre** (campanhas) quanto pelo botão **Criar Ameaça (C.R.I.S.)** na tela inicial do **Compêndio**.
  * Presets automáticos de **VD 20 a 400** (PV, Defesa, Resistências Fort/Ref/Von, Atributos, Presença Perturbadora com imunidade canônica até VD 340, Ataque, Dano e RD), ataques e habilidades estruturadas com rolagem rápida em 1 toque (incluindo margem de ameaça crítica na rolagem de ataque), Enigma de Medo e opção de exportação ao Compêndio.
* **Mascarados & Forma Suprema (`#ORD-33762V` — Arquivos Secretos #02 p. 47, 94-97)**:
  * Novo painel interativo **Máscara & Forma Suprema** na ficha do agente com ativação (`-6 SAN`, `+20 PV`, `+10 PE`, `+10 Defesa`), contador e manutenção por rodada (`-2 SAN` com alerta ao zerar SAN/entrar em Morrendo), suporte a `+5` em testes/ataques/iniciativa/reações/atributos e DT de rituais, `+2d` de dano em armas (sem multiplicar no crítico) e rituais, além da opção **Discente/Verdadeiro Livre**.
  * Novo filtro **Mascarados & Aliados** no seletor do Compêndio da ficha.
* **Maldições para Proteções & Acessórios, Armaria Expandida & Compêndio (`#ORD-5322T7`, `#ORD-4017YV`, `#ORD-4662K3`)**:
  * Suporte completo às **10 Maldições Oficiais de Proteções & Escudos** e **13 Maldições Oficiais de Acessórios** em `ProtectionModal`, `ItemEditorModal` e **Armaria**, com progressão canônica (`+II` na 1ª maldição, `+I` nas seguintes) e bloqueio automático de elementos opressores (*Sangue ↔ Conhecimento ↔ Energia ↔ Morte*) inclusive contra o elemento base do item.
  * Sub-aba na **Armaria** expandida para **Proteções & Itens** com atalhos rápidos (`+ Proteção`, `+ Vestimenta`, `+ Utensílio`, `+ Item Geral`), escolha de proteções equipáveis múltiplas (`replaceExisting=false`) no `ProtectionModal`, recálculo automático de Defesa/RD ao equipar/desequipar no inventário e respeito estrito a `appliesTo` em Itens Gerais.
* **Correções de Regras na Evolução Assistida & Auditoria Mobile/APK (`#ORD-5322T7`)**:
  * Isolamento estrito de aumentos de atributo (somente 20/50/80/95%), promoções de perícias no NEX 35%/70% restritas a perícias já treinadas em degraus de `+5`, cota canônica `2 + Int` no Grau de Treinamento de Combatente Veterano, detecção de *Transcender* como Poder Paranormal, isolamento completo do modo *"Não aumentar NEX"* e limite de PE por rodada (`getPeRoundLimit`).
  * Auditoria completa de **UI Mobile/Web (360px & tema claro)** e **Android APK**: `BackHandler` exclusivo no Android e isolamento de `popstate` Web quando modais estão abertos, `onRequestClose`/`statusBarTranslucent`/`KeyboardAvoidingView` em modais, `keyboardShouldPersistTaps="handled"` em listas/modais e contrastes por tokens do tema.
* **Depósito de Itens & Importação do Compêndio na Ficha e na Armaria**:
  * Nova sub-aba dentro da tela **Armaria** funcionando como catálogo compartilhado entre todos os agentes e sincronizado offline, via Google Drive e Supabase, com botão **Compêndio / Importar do Compêndio** para trazer itens e itens amaldiçoados existentes com 1 toque.
  * Três fluxos diretos na aba **Inventário** do agente: **Novo Item**, **Do Depósito** (com escolha entre **Vincular / Usar o Mesmo** ou **Duplicar**) e **Do Compêndio** (158 itens curados entre comuns, paranormais e 60 itens amaldiçoados com atalho `+ Depósito`).
* **Editor Unificado e Modificações Oficiais de Acessórios**:
  * Novo `ItemEditorModal` com seleção opcional de base do Compêndio, tipos/subcategorias de equipamento, espaços decimais (`0,5`) ou nulos (`0`), cargas/usos, melhorias caseiras e modificações oficiais de acessórios (*Aprimorado*, *Discreto*, *Função Adicional* com 2º Aprimorado, *Instrumental*).
* **Mecânicas Interativas de Itens & Status Temporários**:
  * Botão **Usar / Ativar / Rolar** direto nos cards do inventário com suporte a cura de PV/PE/Sanidade, rolagem de dano/explosivos com cálculo automático de **DT** (`10 + PE/rodada + atributo`), gasto de PE e habilidades de perícias.
  * Itens de cura e pontos temporários oferecem escolha rápida **"Aplicar em Mim"** vs **"Aplicar em Aliado (Apenas Rolar)"**, além de badges exclusivos de **PV Temp.** e **PE Temp.** no Status Vital com absorção automática ao sofrer dano/gasto.
  * Consumíveis esgotados permanecem no inventário com badge **`0 usos`** e botão **Usar** bloqueado para preservar registro, oferecendo atalho rápido de **Recarregar / Repor**.
  * Bônus passivos automáticos aplicados quando equipados: carga máxima expandida (*Mochila Militar*), RD adicional de bloqueio (*Braçadeira Reforçada*) e bônus fixos em perícias.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades (Features)
- **Modelagem, Catálogo Curado e Regras (`src/types/compendium.ts`, `src/utils/inventoryItems.ts`, `src/utils/inventorySkills.ts`, `src/utils/protections.ts`, `src/utils/damageModifiers.ts`, `src/utils/progression.ts`)**: `CharacterMaskConfig`, `ThreatAttackAction`/`ThreatAbilityAction` e campos estruturados de `CampaignMonster`/`CompendiumEntity`; `OFFICIAL_PROTECTION_CURSES` (10), `OFFICIAL_ACCESSORY_CURSES` (13), `areElementsIncompatible`, `calculateCurseCategoryIncrease`, suporte a escudo com `Reforçada` e `shieldCurses`; `+2d` da Forma Suprema sem multiplicar no crítico e bônus/dispensa em rituais; cota `2 + Int` em Combatente Veterano.
- **Criador de Ameaças & Rolagem (`ThreatCreatorModal.tsx`, `src/utils/dice.ts`, `src/context/AppContext.tsx`, `master.tsx`, `index.tsx`, `entity/editor.tsx`, `entity/[id].tsx`, `RecordPreviewModal.tsx`)**: Presets de VD 20–400 com `parseAttr` preservando `0`, geração/edição completa estilo C.R.I.S., inspeção unificada no `RecordPreviewModal` (correção de Defesa duplicada em personagens) e suporte a margem crítica opcional no `rollFormula`.
- **Persistência & Sincronização Híbrida (`IDataRepository.ts`, `OfflineDataRepository.ts`, `SmartMergeEngine.ts`, `AppContext.tsx`)**: Persistência local de `customItems`, `deletedCustomItemIds`, ameaças criadas exportáveis para o compêndio, merge LWW multi-dispositivo (Google Drive / Supabase) e propagação automática de edições para itens vinculados (`shared`).
- **Interface Mobile/Web & Compatibilidade Android APK (`ProtectionModal.tsx`, `ItemEditorModal.tsx`, `LevelUpModal.tsx`, `characters.tsx`, `master.tsx`, `weapons.tsx`, `sheetPrinter.ts`)**: Auditoria completa de 360px, temas claros (`colors.elements.*`), `KeyboardAvoidingView`, `SafeAreaView` insets em modais translúcidos, `BackHandler` isolado no Android, proteção contra stack exploit da Forma Suprema, recálculo automático de proteção/Defesa ao equipar/desequipar itens e correções de evolução assistida (`doNotIncreaseNex`, promoções treinadas `+5`, `Transcender`).

### 🧪 Testes Automatizados
- `npm run test:all` aprovado com **0 falhas**:
  - `npm run typecheck`: `tsc --noEmit` sem erros.
  - `npm run test`: **946** testes passando em **218** suítes (incluindo novas suítes `tests/supportTicketsRegressions.test.tsx` e `tests/threatCreator.test.tsx`, além de cobertura atualizada em `tests/damageModifiers.test.ts`, `tests/progression.test.ts`, `tests/rulesProtections.test.ts` e `tests/inventoryItems.test.ts`).
  - `npm run test:db`: 10 livros e **1.708** entidades verificadas com sucesso.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.6.0-beta.1
```
