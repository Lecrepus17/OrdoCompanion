# Proposta de Melhoria: Agentes e Personas de IA no Ordo Companion

Este documento reúne a especificação e o backlog para a expansão do sistema de Inteligência Artificial do aplicativo **Ordo Companion** (mecanismo **G.L.I.T.C.H.**), transformando-o em um ecossistema com múltiplos agentes inteligentes e personas temáticas.

---

## 1. Visão Geral

Atualmente, o aplicativo conta com o suporte do **G.L.I.T.C.H.** e personas das Relíquias do Outro Lado (O Anfitrião, A Magistrada, O Deus da Morte e O Diabo) definidos em:
- Arquivo de tipos: `src/types/ai.ts`
- RAG e recuperação de conhecimento: `src/services/ai/AiKnowledgeRetrieval.ts`
- Clientes e integração de LLMs: `src/services/ai/AiClient.ts`
- Interface do usuário: `src/components/OracleModal.tsx`

A proposta é expandir essa funcionalidade criando **dois tipos de novos agentes no app**:
1. **Personas Canônicas da Ordo Realitas** (Roleplay e Imersão).
2. **Agentes Utilitários Especialistas** (Ferramentas cognitivas para Mestres e Jogadores).

---

## 2. Novos Agentes e Personas

### 2.1 Personas Canônicas (Imersão e Roleplay)

| Agente | Arquétipo / Função | Tom de Voz | Caso de Uso |
| :--- | :--- | :--- | :--- |
| **Senhor Veríssimo** | Líder da Ordem | Severo, protetor, objetivo e tático | Briefings de missões, direcionamento de investigação e avaliação de riscos de campo. |
| **Arthur Cervero** | Veterano Investigador | Prático, resiliente, humano e leal | Dicas práticas de sobrevivência, uso criativo de perícias e combate tático. |
| **Kian** | O Primeiro Ocultista | Antigo, enigmático, filosófico | Interpretação profunda do Outro Lado, rituais complexos e lore paranormal. |

---

### 2.2 Agentes Especialistas (Suporte ao Jogo)

#### A. Co-Mestre / Gerador de Enigmas (Suporte ao Narrador)
* **Objetivo**: Auxiliar o mestre durante a preparação e no meio da sessão.
* **Habilidades**:
  * Geração dinâmica de pistas para o sistema de pistas de Ordem Paranormal.
  * Criação de enigmas de Conhecimento, desafios de Energia e armadilhas de Morte/Sangue.
  * Ajuste de encontros em tempo real (adaptando o VD - Valor de Dificuldade da criatura ao NEX do grupo).

#### B. Avaliador Tático de Ficha (Build Advisor)
* **Objetivo**: Auxiliar o jogador na progressão de personagem (Level Up).
* **Habilidades**:
  * Análise da ficha atual (`CharacterSheet` de `src/types/compendium.ts`).
  * Sugestões de poderes de classe, trilhas e poderes paranormais com sinergia.
  * Alertas sobre requisitos prévios (atributos mínimos, perícias necessárias e afinidade elemental).

#### C. Árbitro Rápido de Regras (Fast Arbiter)
* **Objetivo**: Resolver dúvidas de regras em menos de 5 segundos na mesa sem interromper o combate.
* **Habilidades**:
  * Respostas ultra-curtas com a página e o livro de referência.
  * Exemplo: *"Manobra de Agarrar exige teste oposto de Luta vs Luta. Alvo fica Imóvel e Vulnerável."*

---

## 3. Arquitetura Técnica Proposta

```
src/
├── types/
│   └── ai.ts                     # Estender AiPersonaId com novas personas e papéis
├── services/
│   └── ai/
│       ├── AiKnowledgeRetrieval.ts # Prompts de sistema especializados por agente
│       ├── AiClient.ts             # Chamadas com suporte a structured outputs (JSON)
│       └── prompts/
│           ├── verissimoPrompt.ts
│           ├── gameMasterPrompt.ts
│           └── buildAdvisorPrompt.ts
└── components/
    ├── OracleModal.tsx             # Seletor visual de Agentes/Personas
    └── ai/
        └── AgentSelectorCards.tsx  # Carrossel de seleção com insígnias e cores temáticas
```

---

## 4. Roteiro de Implementação (Roadmap)

- [ ] **Fase 1: Tipagem e Prompts**
  - Adicionar as novas personas em `src/types/ai.ts`.
  - Criar os prompts canônicos em `src/services/ai/AiKnowledgeRetrieval.ts`.
- [ ] **Fase 2: Filtros de RAG Específicos**
  - Agente Mestre: RAG prioriza tabelas de ameaças, itens amaldiçoados e regras de investigação.
  - Agente Árbitro: RAG prioriza ações em combate, condições e rituais.
- [ ] **Fase 3: Interface do Usuário**
  - Atualizar o `OracleModal` com abas ou cards para escolher entre "Oráculo Tático", "Personas da Ordem" e "Auxiliar do Mestre".
- [ ] **Fase 4: Testes Automatizados**
  - Adicionar testes em `tests/ai.test.ts` cobrindo o roteamento de conhecimento e os novos prompts.








a mais, lembrar de ver erro ao excluir agentes quando sincrono com google gmail