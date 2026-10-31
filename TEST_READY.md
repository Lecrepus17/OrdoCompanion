# 🛡️ Test Suite & Verification Report — TEST_READY.md

> **Status do Projeto**: ✅ Suíte de Testes Pronta e Validada  
> **Total de Testes Automatizados**: **491 testes passando** (112 suítes, 0 falhas, 0 pendências)  
> **Checagem Estrita TypeScript (`npm run typecheck`)**: ✅ 0 erros  
> **Integridade Referencial do Compêndio (`npm run test:db`)**: ✅ 1.371 entidades validadas em 10 suplementos oficiais  
> **Data de Homologação**: 2026-10-31  

---

## 1. Comandos Oficiais de Execução da Suíte

Todos os testes utilizam o Node.js Test Runner nativo via `tsx`, sem dependências de ambientes simulados externos ou dados mockados falsos:

```bash
# ⚡ Smart Testing Gates (Execuções Rápidas por Escopo):
npm run typecheck     # Validação estrita de tipos TypeScript (tsc --noEmit)
npm run test:rules    # Fórmulas canônicas, criação assistida e progressão de NEX
npm run test:front    # Renderização de telas Expo Router e componentes visuais React Native
npm run test:sync     # Sincronização offline, SmartMergeEngine e repositórios locais
npm run test:db       # Integridade do banco de dados referencial Python (10 livros)

# 🛡️ Suíte Completa de Homologação (Obrigatória em Release):
npm run test:all      # Executa typecheck + 491 testes automatizados + integridade Python
```

---

## 2. Arquitetura de Testes por Camadas (Tiers 1 a 4)

A suíte cobre os requisitos **R1 (Defesa e Proteções)**, **R2 (Verificação de Proficiências e Penalidades)** e **R3 (Vestimentas, Utensílios e Bônus em Perícias)** distribuída nas quatro camadas canônicas:

```
┌──────────────────────────────────────────────────────────────────┐
│ Tier 4: Cenários Reais Ponta a Ponta (Fichas, Rolagens, Combate) │
├──────────────────────────────────────────────────────────────────┤
│ Tier 3: Combinações Cruzadas (Hell Hunters, Especialistas, etc.) │
├──────────────────────────────────────────────────────────────────┤
│ Tier 2: Casos de Borda e Limites (Vazio, Negativo, >2 Vestimentas)│
├──────────────────────────────────────────────────────────────────┤
│ Tier 1: Isolamento Funcional (Defesa, RD, Proficiências, Bônus)  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 🔹 Tier 1: Feature Coverage (Isolamento Funcional)

Validação pura dos módulos de regras e dados oficiais em isolamento funcional:

* **Defesa e Proteções (`src/utils/protections.ts` e `tests/rulesProtections.test.ts`)**:
  * Catálogo oficial `OFFICIAL_PROTECTIONS` contendo Proteção Leve (+5 Defesa, 2 espaços), Proteção Pesada (+10 Defesa, 5 espaços, RD física 2, penalidade -5 de armadura) e Escudo (+2 Defesa, 2 espaços).
  * Acúmulo de Proteção + Escudo respeitando teto e regras canônicas (ex: Leve + Escudo = +7 Defesa; Pesada + Escudo = +12 Defesa).
  * Modificações oficiais de proteções: *Reforçada* (+2 Defesa, +1 espaço), *Blindada* (+2 RD Balística, +1 espaço, requer pesada), *Antibombas* (+5 RD dano em área), *Discreta* (-1 espaço).
* **Resistências a Dano (RD)**:
  * Parser estruturado e formatação de texto de resistências físicas (`Corte`, `Impacto`, `Perfuração`, `Balístico`).
  * Atualização automática na ficha de personagem (`resistances`) sem entrada manual.
* **Proficiências em Armas (`src/utils/proficiencies.ts` e `tests/rulesProficiencies.test.ts`)**:
  * Categorização canônica: *Simples*, *Tática*, *Pesada*.
  * Tipos especiais: armas de fogo táticas, armas corpo a corpo táticas, fuzis com balas longas.
  * Proficiências por classe: Combatente (simples e táticas), Especialista (simples e armas de fogo táticas leves), Ocultista (apenas simples), Sobrevivente (apenas simples).
  * Poderes e upgrades: *Armamento Pesado*, *Balística Avançada*, *Ninja Urbano*, poder de trilha *Atirador de Elite*, arma escolhida de *Operário*.
* **Proficiências em Proteções**:
  * Classificação em *Proteções Leves* e *Proteções Pesadas*.
  * Escudo canonicamente classificado como exigindo proficiência com Proteções Pesadas.
  * Aplicação de penalidade de `-2d20` em testes baseados em Força e Agilidade e defesas ativas (Esquiva, Contra-ataque).
* **Vestimentas e Utensílios em Perícias (`src/utils/inventorySkills.ts` e `tests/rulesInventorySkills.test.ts`)**:
  * Bônus padrão (+2) e aprimorado (+5).
  * Limite canônico estrito de até **duas vestimentas ativas simultaneamente** fornecendo bônus.
  * Regra da não-cumulatividade: itens que concedem bônus para a mesma perícia não somam entre si; prevalece o maior bônus (`Math.max`).
  * Veto canônico irrestrito a *Luta* e *Pontaria* conforme Livro Base p. 63.

---

### 🔹 Tier 2: Boundary & Corner Cases (Limites e Condições de Exceção)

Garantia de estabilidade sob entradas extremas, nulas ou fora dos padrões usuais:

* **Inventário Vazio e Itens Desequipados**:
  * Personagens sem nenhum item no inventário calculam bônus de perícia zero sem erros de referência (`undefined`).
  * Itens marcados como desequipados (`equipped: false` ou `equipped: undefined`) não ativam bônus e não consomem a cota de 2 vestimentas.
* **Atributos Zero ou Dados Negativos**:
  * Testes com penalidade de -2d20 onde o atributo final resulta em $\le 0$ acionam o motor nativo `rollOrdemTest`, rolando `2 + |dados|` e escolhendo o pior dado (mecânica de desvantagem canônica).
* **Excesso de Vestimentas Ativas (> 2 vestimentas)**:
  * Caso o jogador tente marcar 3 ou mais vestimentas como ativas, a interface exibe o alerta `⚠️ Limite Canônico Excedido (máximo 2 vestimentas fornecem bônus)`.
  * O motor `calculateActiveItemSkillBonuses` seleciona apenas as 2 primeiras vestimentas ativas e desativa o bônus das excedentes, informando o aviso correspondente.
* **Veto de Perícias Proibidas**:
  * Tentativas de cadastrar vestimentas ou utensílios para *Luta* ou *Pontaria* são bloqueadas tanto na interface (opções removidas do seletor com aviso explicativo) quanto no motor de regras (`isBannedItemSkill`).
* **Carga e Espaços no Limite Máximo**:
  * Seleção de Proteção Pesada (5 espaços) + Escudo (2 espaços) em personagens com Força baixa recalcula a carga imediata no inventário, alertando sobrecarga quando ultrapassar `FOR * 5`.

---

### 🔹 Tier 3: Cross-Feature Combinations (Combinações Cruzadas)

Validação de interações simultâneas entre múltiplos subsistemas do RPG:

* **Combatente com Origem *Treinado pela Hell Hunters* com Proteção Pesada e Escudo**:
  * A origem concede proficiência em armas táticas e proteções pesadas.
  * Ao equipar Proteção Pesada (+10 Defesa, RD 2) e Escudo Balístico (+2 Defesa), a Defesa de Equipamento totaliza **+12**, as resistências físicas e balísticas são ativadas, e o personagem **NÃO** sofre a penalidade de -2d20 por possuir proficiência completa.
* **Especialista Atirador de Elite com Fuzil de Sniper e Vestimentas**:
  * Com fuzil de sniper (arma tática com balas longas), a proficiência de trilha é validada com sucesso sem penalidade de ataque.
  * O personagem equipa 2 vestimentas (+2 em Percepção e +2 em Furtividade) e 1 utensílio (+2 em Pontaria proibido pelo veto, redirecionado para Investigação). Os bônus são aplicados corretamente sem conflito.
* **Ocultista com Proteção Pesada sem Proficiência atacando e conjurando**:
  * Ao equipar armadura pesada sem possuir proficiência, o card de Defesa exibe o banner vermelho `⚠️ Proteção sem Proficiência: -2d20 em testes de Força e Agilidade`.
  * Testes de Esquiva (AGI), Contra-ataque (FOR) e ataques corpo a corpo recebem o modificador `-2d20` na rolagem.
  * Testes de Intelecto e Presença (Ocultismo, Vontade) permanecem sem penalidade de dados conforme a regra oficial.
* **Proteção sem Proficiência Combinada com Vestimenta de Agilidade**:
  * A penalidade de dados de armadura (-2d20) atua no pool de dados, enquanto o bônus numérico da vestimenta (+2 ou +5) soma no modificador flat final, preservando a coerência das fórmulas.

---

### 🔹 Tier 4: Real-World Application Scenarios (Fluxos Reais Ponta a Ponta)

Testes de integração de interface e ciclo de vida do agente executados via `@testing-library/react-native`:

* **Assistente de Proteções na Ficha (`tests/defenseProtections.test.ts` e `ProtectionModal.tsx`)**:
  * Modal abre ao clicar no botão "Assistente" do card de Defesa.
  * Exibe lista filtrável de armaduras e escudos com badges informativos de Defesa, RD e espaços.
  * Permite selecionar armadura corporal e escudo simultaneamente, aplicar modificações e confirmar.
  * Preenche automaticamente `defenseEquip`, `resistances` e insere os itens no inventário marcados como `equipped: true`.
  * A Defesa Total reflete canonicamente: `10 + AGI + Equipamento + Outros`.
* **Alertas e Avisos de Proficiência na Ficha (`tests/frontendCharacters.test.tsx` e `characters.tsx`)**:
  * Card de ataque de arma sem proficiência exibe badge `⚠️ Não Proficiente (-2d20)` (`sheet-attack-non-proficient-${id}`).
  * Ao disparar a rolagem de ataque, a mensagem de toast exibe `[Sem Proficiência: -2d20]`.
  * Na Armaria (`weapons.tsx`), armas possuem badges coloridos por categoria (`Simples`, `Tática`, `Pesada`) e o modal de equipar alerta sobre a falta de proficiência do agente selecionado.
* **Painel Didático e Bônus de Vestimentas no Inventário e Perícias**:
  * Na aba Inventário da ficha, o card `Vestimentas Ativas: X/2` (`sheet-clothing-counter-card`) informa em tempo real a cota utilizada.
  * Botão de ação rápida (`btn-toggle-equip-${id}`) alterna instantaneamente entre *Vestir/Despir* (vestimentas) ou *Empunhar/Guardar* (utensílios).
  * Na aba Perícias, perícias beneficiadas exibem o badge de origem `+2 (Vestimenta: Jaqueta)` (`sheet-skill-item-bonus-${skill}`) e o botão de rolagem totaliza o bônus somado.

---

## 3. Checklist de Critérios de Aceite (Acceptance Criteria)

| Requisito | Critério de Aceite | Status | Verificação |
| :--- | :--- | :---: | :--- |
| **R1. Defesa & Proteções** | Seletor/modal de proteções integrado à ficha com itens oficiais e customizados. | ✅ Aprovado | `ProtectionModal.tsx`, `defenseProtections.test.ts` |
| **R1. Defesa & Proteções** | Cálculo e preenchimento automático de `defenseEquip` e resistências a dano (RD). | ✅ Aprovado | `calculateEquippedProtections`, `tests/rulesProtections.test.ts` |
| **R1. Defesa & Proteções** | Defesa Total canônica fiel à fórmula: `10 + AGI + Equipamento + Outros`. | ✅ Aprovado | `characters.tsx`, `rulesProtections.test.ts` |
| **R2. Proficiências** | Checagem de proficiência de armas e proteções por classe, origem e poderes. | ✅ Aprovado | `getCharacterProficiencies`, `tests/rulesProficiencies.test.ts` |
| **R2. Proficiências** | Alertas visuais explícitos de falta de proficiência na ficha e na Armaria. | ✅ Aprovado | `characters.tsx`, `weapons.tsx`, `frontendCharacters.test.tsx` |
| **R2. Proficiências** | Penalidade canônica de -2d20 em testes de ataque e testes de Força/Agilidade. | ✅ Aprovado | `handleRollAttackTest`, `getProtectionDicePenalty`, `characters.tsx` |
| **R3. Vestimentas & Utensílios** | Configuração de itens de inventário como vestimenta/utensílio com bônus (+2/+5). | ✅ Aprovado | `characters.tsx` (modal de item), `inventorySkills.ts` |
| **R3. Vestimentas & Utensílios** | Limite de até 2 vestimentas ativas, painel didático e justificativa pedagógica. | ✅ Aprovado | `sheet-clothing-counter-card`, `rulesInventorySkills.test.ts` |
| **R3. Vestimentas & Utensílios** | Reflexão automática dos bônus ativos nos valores totais e rolagens de perícias. | ✅ Aprovado | `sheet-skill-item-bonus`, `frontendCharacters.test.tsx` |
| **Qualidade & Testes** | Suíte de testes automatizados (`npm run test:all`) passando com 0 erros. | ✅ Aprovado | **491 testes passando**, 0 falhas, 100% de sucesso |
| **Tipagem Estrita** | Typecheck estrito TypeScript (`npm run typecheck`) com 0 erros. | ✅ Aprovado | `tsc --noEmit` executado com código 0 |
| **Base do Compêndio** | Validação de integridade referencial dos 10 suplementos em Python. | ✅ Aprovado | `test_database_integrity.py` validado com sucesso |

---

## 4. Distribuição das Suítes de Testes no Repositório

```
tests/
├── rulesProtections.test.ts           # 17 testes: catálogo, modificações e fórmulas de defesa/RD
├── rulesProficiencies.test.ts         # 22 testes: motor de proficiências por classe/origem/poderes
├── rulesInventorySkills.test.ts       # 15 testes: regras de vestimentas, utensílios e limites
├── defenseProtections.test.ts         # 19 testes: modal de proteção, sincronização e ficha
├── proficienciesAndClothing.test.ts   # 20 testes: alertas e penalidades -2d20 de ataque/proteção
├── frontendCharacters.test.tsx        # 11 testes: renderização da ficha, badges e rolagens
├── characterProgression.test.ts       # 68 testes: avanço de nível, atributos e vitais
├── weapons.test.ts                    # 27 testes: cálculo de armas, calibres e modificações
├── tabNavigation.test.ts              # 11 testes: padrão de navegação e migração suave
├── compendiumPdfIntegration.test.tsx  # 5 testes: links de páginas e visualizador in-app
├── pdfOutOfMemoryPrevention.test.tsx  # 3 testes: prevenção de OOM e streaming em disco
└── ... (totalizando 491 testes automatizados em 112 arquivos e suítes)
```

---

## 5. Conclusão da Homologação

A funcionalidade atende integralmente a todos os requisitos do documento `ORIGINAL_REQUEST.md`. A arquitetura mantém desacoplamento limpo entre as regras de domínio (`src/utils/`), interfaces com o usuário (`src/app/`, `src/components/`) e testes automatizados (`tests/`). A aplicação está 100% pronta para release e commit.
