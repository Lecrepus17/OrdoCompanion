# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.2.0-beta.2`  
> **Versão Sugerida**: `1.2.0-beta.3` (Motivo: [Patch] Sistema de dano crítico com modos selecionáveis por usuário e agente, botão de Crítico Máximo e atalho rápido no DiceToast ao tirar 20 no teste de ataque)  
> **Última Atualização**: 2026-11-03 14:55

---

## 🚀 Resumo do Próximo Release v1.2.0-beta.3 (Changelog de Usuário)

* **Sistema Flexível de Dano Crítico de Armas (Dados vs Dano)**:
  * **Modo Canônico Padrão (Multiplicar Dados)**: Conforme o livro oficial de *Ordem Paranormal v1.1* (p. 56 e p. 84), multiplica a quantidade de dados de dano rolados da arma base pelo multiplicador de crítico (ex.: `1d8+3` com crítico x2 rola `2d8+3`; `2d6` com x3 rola `6d6`).
  * **Modo Alternativo (Multiplicar Dano)**: Para mesas e jogadores que preferem rolar menos dados físicos/virtuais, rola o dano base da arma e multiplica o resultado obtido pelo multiplicador do crítico (ex.: rola `1d8+3`, obtém 7 e multiplica por 2 $\rightarrow$ 14).
  * **Configuração Global nas Preferências de Usuário**: Novo seletor no modal de configurações de perfil (`UserProfileModal.tsx`), permitindo definir a preferência padrão global da conta com interface tática clara.
  * **Seletor de Preferência por Agente na Ficha**: Na aba de Ataques da ficha do agente (`characters.tsx`), foi adicionado um seletor rápido permitindo alternar a qualquer momento entre *Multiplicar Dados* e *Multiplicar Dano* especificamente para aquele personagem.

* **Botão de Crítico Máximo (Dano Máximo sem Rolagem Aleatória)**:
  * **Botão "Crítico Máx" nos Cards de Ataque**: Adicionado novo botão de ação nos cartões de ataque da ficha (`characters.tsx`), na Armaria (`weapons.tsx`) e no modal de prévia de armas (`RecordPreviewModal.tsx`).
  * **Cálculo Preciso de Dano Máximo**: Calcula instantaneamente o valor máximo de dano considerando todas as faces máximas dos dados (ex: d8 vira 8, d6 vira 6) sem depender de aleatoriedade, ideal para acertos com 20 natural ou habilidades como *Atirar para Matar* do Aniquilador.
  * **Visual Tático com Destaque Dourado**: Badge e botão dourado tático diferenciado para identificação imediata durante o combate.

* **Atalho Rápido de Dano no Toast de Rolagem (`DiceToast.tsx`)**:
  * **Integração de Ataque $\rightarrow$ Dano com 1 Toque**: Ao realizar um teste de ataque ("Testar Ataque"), o resultado do d20 guarda o contexto da arma e exibe botões de ação imediata no próprio toast: `[Dano]`, `[Crítico]` e `[Crítico Máx]`.
  * **Destaque Especial para 20 Natural**: Ao tirar 20 no dado de ataque, o toast acende uma badge de alerta dourada e destaca o botão de *Crítico Máx (20)!*, permitindo ao jogador rolar o dano com 1 toque sem fechar o aviso nem rolar a tela.

* **Correção no Cálculo de Dano da Armaria (`weapons.tsx`)**:
  * Corrigido comportamento anterior que truncava a fórmula de dano no primeiro `+`, preservando agora todos os modificadores numéricos e dados extras de modificações e maldições (ex.: Calibre Grosso + Cruel + Munição Explosiva).

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ⚔️ Combate e Rolagem de Dados
- `src/types/compendium.ts`: Adicionados tipos `CriticalDamageMode = 'multiply_damage' | 'multiply_dice'`, `WeaponAttackContext`, propriedade `attackContext` e `isMaxDamage` em `DiceRollResult`, e campos `criticalDamageMode` em `CharacterAttack`, `CharacterSheet` e `UserProfile` (com padrão oficial `multiply_dice`).
- `src/utils/dice.ts`: Implementadas as funções `expandFormulaForCritical` (multiplicação canônica de dados base), `calculateMaxDamageForFormula` (cálculo determinístico de faces máximas) e `rollWeaponDamage` com suporte completo aos modos `multiply_dice`, `multiply_damage` e `isMaxDamage`.
- `src/context/AppContext.tsx`: Atualizado `rollSkillTest` para propagar o `WeaponAttackContext` e adicionada a ação global `rollWeaponDamage` integrada à sincronização da Mesa Virtual.
- `src/components/DiceToast.tsx`: Implementada barra de atalhos táticos de dano para testes de ataque com realce quando `chosenDie === 20`, e badge de destaque para rolagem de dano máximo.
- `src/app/(tabs)/characters.tsx`: Seletor de modo de crítico por agente na tabela de ataques, 4 botões de rolagem (`Ataque`, `Dano`, `Crítico`, `Crítico Máx`) e propagação de contexto no teste de ataque.
- `src/app/(tabs)/weapons.tsx`: Botões de `Dano`, `Crítico` e `Crítico Máx` na Armaria respeitando o modo ativo e eliminando o truncamento de bônus em `finalDamage`.
- `src/components/RecordPreviewModal.tsx`: Adicionados botões de `Dano`, `Crítico` e `Crítico Máx` no preview de armas da armaria e ataques de ficha.
- `src/components/UserProfileModal.tsx`: Seletor de preferência global do modo de Dano Crítico nas Configurações de Usuário.
- `src/types/declarations.d.ts`: Adicionadas declarações de tipo para o módulo `expo-sharing`.

### 🧪 Testes Automatizados
- `tests/dice.test.ts`: Expandido com 20 testes unitários validando expansão de dados em fórmulas simples e compostas, cálculo de dano máximo em d6/d8/d10, rolagem nos dois modos de crítico (`multiply_dice` e `multiply_damage`), crítico x3 em Revólver e preservação de contexto de ataque.
- Verificação via Smart Testing Gates:
  - `npm run typecheck` (tsc estrito): 0 erros.
  - `npm run test:rules`: 136 testes passando (100%).
  - `tests/dice.test.ts`: 20 testes passando (100%).
  - `tests/weapons.test.ts`: 36 testes passando (100%).

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.2.0-beta.3 "Dano crítico flexível (dados vs dano), botão de Crítico Máximo e atalhos rápidos no toast"
```
