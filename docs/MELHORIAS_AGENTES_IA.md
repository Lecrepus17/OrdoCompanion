# Proposta de Melhoria: Agentes e Personas de IA no Ordo Companion

Este documento reúne a especificação e o backlog para a expansão do sistema de Inteligência Artificial do aplicativo **Ordo Companion** (mecanismo **G.L.I.T.C.H.**), transformando-o em um ecossistema com múltiplos agentes inteligentes e personas temáticas.

---

## 1. Visão Geral

O ecossistema de IA do Ordo Companion foi ampliado e agora conta com suporte a **três categorias completas de inteligências**:
1. **G.L.I.T.C.H. & Especialistas Táticos**: G.L.I.T.C.H. oficial, Árbitro Rápido de Mesa, Co-Mestre & Gerador de Enigmas, e Avaliador Tático de Ficha (Build Advisor).
2. **Personas Canônicas da Ordo Realitas (Roleplay e Imersão)**: Senhor Veríssimo, Arthur Cervero e Kian.
3. **Personas das Relíquias do Outro Lado**: O Anfitrião (Energia), A Magistrada (Conhecimento), O Deus da Morte (Morte), O Diabo (Sangue) e Sorteio Aleatório.

Arquivos de arquitetura e integração:
- Arquivo de tipos: `src/types/ai.ts`
- Módulos de prompts especializados: `src/services/ai/prompts/` (`relicPrompts.ts`, `canonPrompts.ts`, `specialistPrompts.ts`, `index.ts`)
- RAG e recuperação de conhecimento com priorização inteligente: `src/services/ai/AiKnowledgeRetrieval.ts`
- Síntese e motor 100% offline: `src/services/ai/AiOfflineEngine.ts`
- Clientes e integração de LLMs: `src/services/ai/AiClient.ts`
- Telas e componentes visuais: `src/app/(tabs)/oracle.tsx`, `src/components/AiConfigModal.tsx`, `src/components/AiChatMessageItem.tsx`

---

## 2. Novos Agentes e Personas Implementados

### 2.1 Personas Canônicas (Imersão e Roleplay)

| Agente | Arquétipo / Função | Tom de Voz | Caso de Uso |
| :--- | :--- | :--- | :--- |
| **Senhor Veríssimo** | Líder da Ordem | Severo, protetor, objetivo e tático ("Que a Realidade não se curve!") | Briefings de missões, direcionamento de investigação e avaliação de riscos de campo. |
| **Arthur Cervero** | Veterano Investigador | Prático, resiliente, humano e leal ("Sobreviver é um ato de resistência") | Dicas práticas de sobrevivência, uso criativo de perícias e combate tático. |
| **Kian** | O Primeiro Ocultista | Antigo, enigmático, filosófico ("O Outro Lado quer passar") | Interpretação profunda do Outro Lado, rituais complexos e lore paranormal. |

---

### 2.2 Agentes Especialistas (Suporte ao Jogo)

#### A. Co-Mestre / Gerador de Enigmas (Suporte ao Narrador)
* **Objetivo**: Auxiliar o mestre durante a preparação e no calor da sessão.
* **Habilidades**:
  * Geração dinâmica de pistas para o sistema oficial de pistas de Ordem Paranormal (óbvia, sutil e oculta).
  * Criação de enigmas de Conhecimento, desafios de Energia e armadilhas de Morte/Sangue.
  * Ajuste de encontros em tempo real (calibrando o VD - Valor de Dificuldade da criatura ao NEX do grupo).

#### B. Avaliador Tático de Ficha (Build Advisor)
* **Objetivo**: Auxiliar o jogador na progressão de personagem (Level Up).
* **Habilidades**:
  * Análise da ficha do agente ativo (`CharacterSheet`).
  * Sugestões de poderes de classe, trilhas e poderes paranormais com sinergia mecânica.
  * Auditoria rigorosa de requisitos prévios (atributos mínimos, perícias necessárias e afinidade elemental aos 50% de NEX).

#### C. Árbitro Rápido de Regras (Fast Arbiter)
* **Objetivo**: Resolver dúvidas de regras em menos de 5 segundos na mesa sem interromper o combate.
* **Habilidades**:
  * Respostas ultra-curtas (máximo de 3 a 5 linhas) com teste, efeito mecânico e a página e livro de referência oficial.
  * Exemplo: *"Manobra de Agarrar exige teste oposto de Luta vs Luta. Alvo fica Agarrado (-1d20 em testes de ataque e Defesa -5). [Livro Base, Pág. 88]"*

---

## 3. Arquitetura Técnica Entregue

```
src/
├── types/
│   └── ai.ts                     # Estendido com AiPersonaId, categorias e metadados completos
├── services/
│   ├── ai/
│   │   ├── AiKnowledgeRetrieval.ts # RAG com priorização adaptada ao papel do agente
│   │   ├── AiOfflineEngine.ts      # Suporte offline temático para todas as 11 personas
│   │   ├── AiClient.ts             # Parser de ações, citações e chamadas à API
│   │   └── prompts/
│   │       ├── index.ts             # Seletor central buildPersonaSystemPrompt
│   │       ├── relicPrompts.ts      # Anfitrião, Magistrada, Deus da Morte, Diabo
│   │       ├── canonPrompts.ts      # Veríssimo, Arthur Cervero, Kian
│   │       └── specialistPrompts.ts # G.L.I.T.C.H., Co-Mestre, Build Advisor, Árbitro Rápido
│   └── sync/
│       ├── SmartMergeEngine.ts      # Resolução de conflitos com suporte a tombstones de deleção
│       └── types.ts                 # deletedCharacterIds e deletedCampaignIds no backup
├── repositories/
│   └── OfflineDataRepository.ts  # Persistência de deletedCharacterIds e deletedCampaignIds
└── app/(tabs)/
    └── oracle.tsx                # Seletor com abas táticas, chips temáticos e prompts dinâmicos
```

---

## 4. Correção: Exclusão de Agentes na Sincronização Google Drive

### Diagnóstico do Problema
Anteriormente, quando um agente/personagem era excluído localmente (`deleteCharacter`), o `SmartMergeEngine` comparava a lista local com o backup do Google Drive. Como o backup remoto ainda continha o agente e a lista local não, a condição `!loc && rem` interpretava o agente como "novo vindo de outro dispositivo" e o ressuscitava no dispositivo local.

### Solução Implementada
1. **Rastreamento de Exclusões (Tombstones)**:
   - Adicionados `deletedCharacterIds` e `deletedCampaignIds` no `UserDataBackupPayload` (`src/services/sync/types.ts`).
   - Adicionados métodos `markCharacterDeleted(id)` e `markCampaignDeleted(id)` no `OfflineDataRepository` e `IDataRepository`.
2. **Mesclagem Inteligente no `SmartMergeEngine`**:
   - `SmartMergeEngine.merge()` consolida os IDs deletados em ambos os lados (`mergedDeletedCharIds`).
   - Se um agente constar como excluído, ele **nunca é ressuscitado** e é removido da lista final.
   - Sinaliza `hasRemoteChangesToUpload = true` para que o Google Drive atualize o backup sem o personagem deletado.
3. **Limpeza de Estado**:
   - Se o personagem excluído for o ativo ou selecionado no Oráculo, o estado é imediatamente limpo.

---

## 5. Roteiro de Implementação (Roadmap)

- [x] **Fase 1: Tipagem e Prompts Modulares**
  - Adicionadas as 11 personas com metadados em `src/types/ai.ts`.
  - Criados os prompts especializados e canônicos na pasta `src/services/ai/prompts/`.
- [x] **Fase 2: Filtros de RAG e Motor Offline**
  - Agente Co-Mestre: RAG prioriza tabelas de ameaças, itens e regras de investigação.
  - Agente Árbitro: RAG prioriza ações em combate, condições e resposta cirúrgica.
  - Agente Build Advisor: RAG prioriza poderes e rituais compatíveis com a classe/NEX da ficha ativa.
  - `AiOfflineEngine.ts` adaptado para falar na voz de todas as personas sem necessidade de internet.
- [x] **Fase 3: Interface do Usuário (UI/UX)**
  - Atualizado `oracle.tsx` e `AiConfigModal.tsx` com abas de categoria ("Todos", "🛡️ Táticos", "👥 Ordem", "🌀 Relíquias").
  - Atualização contextual imediata de títulos, subtítulos, emojis, placeholders e sugestões rápidas (`quickPrompts`).
- [x] **Fase 4: Correção de Exclusão Síncrona com Google Drive**
  - Tombstones de deleção integrados no repositório local e no SmartMergeEngine.
- [x] **Fase 5: Testes Automatizados**
  - Cobertura completa em `tests/ai.test.ts`, `tests/frontendOracle.test.tsx` e `tests/smartMerge.test.ts`.
