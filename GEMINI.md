# Diretrizes dos Agentes de IA - Ordo Companion

Bem-vindo ao repositório do **Ordo Companion**, a aplicação assistente definitiva para o RPG de mesa *Ordem Paranormal* (baseado no sistema oficial da Jambô Editora / Cellbit).

Este arquivo define as diretrizes, padrões técnicos, regras do domínio do RPG e papéis de agentes especializados para orientar o desenvolvimento e manutenção do projeto.

---

## 1. Visão Geral da Stack Tecnológica

* **Framework Principal**: React 19.3.0, React Native 0.88.0, Expo ~58.0.19, Expo Router ~58.0.26
* **Linguagem**: TypeScript com tipagem estrita (`tsc --noEmit`)
* **Armazenamento e Backend**: `@react-native-async-storage/async-storage`, `@supabase/supabase-js`
* **Testes**: Node.js Test Runner nativo com `tsx` (`tsx --test tests/*.test.ts tests/*.test.tsx`)
* **Integridade de Dados e Scripts**: Python 3 (`scripts/test_database_integrity.py`, `scripts/extract_all.py`)
* **Mecanismo de IA do App (G.L.I.T.C.H.)**: Suporte a múltiplos provedores (`Gemini`, `Groq`, `OpenRouter`, `Ollama`, `Offline`) em `src/services/ai/`

---

## 2. Comandos de Verificação & Smart Testing Gates

Para otimizar o tempo de desenvolvimento sem comprometer a estabilidade, utilize os **Smart Testing Gates** focados no escopo modificado:

```bash
# ⚡ Smart Testing Gates (Execução Rápida por Escopo):
npm run typecheck     # Validação estrita de tipos TypeScript (~5s)
npm run test:rules    # Fórmulas de RPG, fichas e progressão de NEX (~4s)
npm run test:front    # Apenas testes de telas e componentes React (~15s)
npm run test:sync     # Sincronização, SmartMerge e repositórios offline (~5s)
npm run test:db       # Integridade referencial dos JSONs do compêndio em Python (~2s)

# 🛡️ Suíte Completa (Obrigatória em Pré-Release ou Refatorações Globais):
npm run test:all      # Executa typecheck + todos os testes unitários + test:db (~40s)
```

> [!IMPORTANT]
> **Nunca commite alterações que quebrem os testes do escopo ou o `npm run typecheck`**. Antes de lançar releases ou fechar branches principais, execute a suíte completa com `npm run test:all`.

---

## 3. Regras do Domínio: RPG Ordem Paranormal

Qualquer agente trabalhando em regras, fichas ou compêndio deve respeitar as mecânicas canônicas:

1. **Atributos Principais (1 a 5, limite 5 para humanos normais)**:
   * `AGI` (Agilidade), `FOR` (Força), `INT` (Intelecto), `PRE` (Presença), `VIG` (Vigor).
2. **Estatísticas Derivadas**:
   * **PV (Pontos de Vida)**: Base da classe + VIG inicial; ganho por avanço de NEX (+VIG).
   * **PE (Pontos de Esforço)**: Base da classe + PRE inicial; ganho por avanço de NEX (+PRE).
   * **SAN (Sanidade)**: Base da classe; ganho fixo por avanço de NEX.
   * **Limite de PE por Turno**: Equivalente ao NEX / 5 (Ex.: 20% NEX = 4 PE/turno).
3. **NEX (Nível de Exposição Paranormal)**:
   * Varia de 0% (Mundano/Sobrevivente), 5% a 99% em passos de 5%.
   * Patentes: Recruta (0-15%), Operador (20-45%), Agente Especial (50-60%), Oficial de Operações (65-80%), Agente de Elite (85-99%).
4. **Elementos do Outro Lado**:
   * **Sangue** (Sentimento, dor, força física)
   * **Morte** (Tempo, distorção, entropia)
   * **Conhecimento** (Razão, lógica, controle mental)
   * **Energia** (Caos, calor, eletricidade, acaso)
   * **Medo** (O elemento infinito e desconhecido)

---

## 4. Agentes Especializados & Roteamento Automático

> [!IMPORTANT]
> **Acionamento Automático Obrigatório**: O usuário **não precisa solicitar** a ativação ou chamada de agentes. O assistente principal DEVE identificar automaticamente a natureza de cada demanda e acionar/adotar o agente especializado correspondente (seja assumindo seu papel técnico imediatamente, seja instanciando subagentes via `invoke_subagent` quando a tarefa exigir isolamento ou processamento em paralelo).

### 🗺️ Matriz de Roteamento Automático (Gatilhos x Agentes)

| Domínio da Alteração | Gatilhos & Arquivos Afetados | Agente Especializado | Skill Vinculada | Ação Automática Obrigatória |
| :--- | :--- | :--- | :--- | :--- |
| **Regras e Fórmulas de RPG** | Alterações em fórmulas, PV/PE/SAN, NEX, perícias, rituais, poderes, itens amaldiçoados, patentes ou CD/DT.<br>• `src/utils/progression.ts`<br>• `src/types/character.ts`<br>• `data/*.json`<br>• `src/services/rules/` | 🛡️ `rpg-rules-expert`<br>*(Auditor de Regras)* | `rpg-rules-audit` | Auditar conformidade estrita com o livro canônico v1.1 e suplementos; validar limites de PE (`NEX / 5`), CD de rituais (`10 + limite PE + PRE`) e pré-requisitos antes de aprovar. |
| **Interface, Telas & UX** | Telas Expo Router, componentes visuais, modais, estilização tática, temas sombrios, responsividade ou áudio.<br>• `app/**/*.tsx`<br>• `src/components/**`<br>• `src/theme/**` | 📱 `mobile-ui-expert`<br>*(Frontend & Mobile UX)* | `mobile-ui-audit` | Implementar seguindo o tema tático sombrio (Ordo/Outro Lado), `SafeAreaView`, prevenção de quebras de layout/overflow e suporte multiplataforma (Android, iOS, Web). |
| **Sincronização & Offline First** | Sincronização Google Drive/Supabase, mesclagem temporal, resolução de conflitos, soft delete de fichas e campanhas.<br>• `src/services/sync/**`<br>• `src/repositories/**`<br>• `src/context/AppContext.tsx` | 🔄 `sync-offline-guardian`<br>*(Guardião de Sync & Offline)* | `sync-offline-audit` | Garantir persistência offline local, integridade do SmartMergeEngine, propagação de exclusões suaves (`deletedCharacterIds`) e ausência total de perda de dados. |
| **IA Paranormal (G.L.I.T.C.H.)** | Prompts de sistema, personas da Ordem, injeção de contexto RAG, provedores remotos e motor offline.<br>• `src/services/ai/**`<br>• `src/types/ai.ts` | 🔮 `glitch-prompt-engineer`<br>*(Engenheiro de IA Paranormal)* | `glitch-prompt-audit` | Calibrar tom tático militar/investigativo, resiliência do modo offline (`AiOfflineEngine`), RAG enxuto com economia de tokens e estrita fidelidade sem alucinação de regras. |
| **Pipeline de Dados & Compêndio** | Extração de PDFs oficiais (10 livros), scripts OCR/regex em Python, seeds JSON e páginas de livros.<br>• `scripts/extract_*.py`<br>• `data/compendium_seed.json` | 📚 `data-pipeline-architect`<br>*(Arquiteto de Compêndio)* | `data-pipeline-audit` | Auditar integridade referencial dos 10 suplementos oficiais (1.261 páginas), índices remissivos "Ver no Livro", busca fonética e normalização de entidades. |
| **Testes, Lógica & Integridade** | Qualquer alteração de código, correção de bugs, refatoração de utilitários ou mudanças nos JSONs do compêndio.<br>• `tests/**`<br>• `scripts/test_database_integrity.py`<br>• `src/types/**` | 🧪 `qa-reliability-engineer`<br>*(QA & Integridade)* | `run-suite` | Aplicar Smart Testing Gates (`npm run test:rules`, `npm run test:front`, `npm run test:sync` ou `npm run test:all`), garantindo `typecheck` e ausência de regressões. |
| **Finalização de Recurso (Changelog)** | Conclusão de qualquer funcionalidade, melhoria, refatoração ou correção de bug aprovada. | 📋 `release-manager`<br>*(Gerente de Releases)* | `update-recorder` | Atualizar imediatamente `docs/ATUALIZACOES_PENDENTES.md`, classificar SemVer (Patch, Minor ou Major) e fornecer comando pronto de release sem o usuário pedir. |
| **Registro de Commits Git** | Finalização do ciclo de trabalho e preparação para persistir alterações no Git. | 🎯 `git-commit-architect`<br>*(Arquiteto de Commits)* | `commit-generator` | Inspecionar `git status`, redigir mensagem semântica (Conventional Commits) e atualizar `docs/COMMITS_PENDENTES.md` com comando pronto de terminal. |

---

### 🔄 Pipeline de Execução Autônoma (Ciclo de Vida da Tarefa)

Sempre que uma alteração ou nova funcionalidade for solicitada, siga rigorosamente o ciclo abaixo **sem intervenção manual**:

```
[Demanda do Usuário]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 1. Triagem Automática de Domínio                       │
│    • Regras/Fichas ➔ 🛡️ rpg-rules-expert               │
│    • Telas/Componentes/UX ➔ 📱 mobile-ui-expert        │
│    • Sincronização/Offline ➔ 🔄 sync-offline-guardian  │
│    • IA G.L.I.T.C.H. ➔ 🔮 glitch-prompt-engineer       │
│    • Extração/Dados ➔ 📚 data-pipeline-architect       │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 2. Execução & Validação Técnica (Smart Testing Gates)  │
│    ➔ 🧪 qa-reliability-engineer                        │
│    • Executa typecheck estrito + Smart Gate direcionado│
│    • Adiciona/atualiza testes de cobertura em tests/   │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 3. Governança de Release & Versão                      │
│    ➔ 📋 release-manager                                │
│    • Registra em docs/ATUALIZACOES_PENDENTES.md        │
│    • Recalcula SemVer para a próxima versão            │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 4. Registro de Commit Semântico                        │
│    ➔ 🎯 git-commit-architect                           │
│    • Registra em docs/COMMITS_PENDENTES.md             │
│    • Fornece bloco git pronto para execução rápida     │
└────────────────────────────────────────────────────────┘
        │
        ▼
[Resposta Sucinta ao Usuário com Resultados Prontos]
```

---

### 🤖 Padrões de Invocação de Subagentes em Paralelo (`invoke_subagent`)

Quando uma tarefa envolver análise volumosa, pesquisa abrangente ou execução assíncrona, utilize a ferramenta `invoke_subagent` seguindo os padrões canônicos:

#### ⚡ Padrão 1: Auditoria em Segundo Plano (Background Data & Rules Audit)
* **Cenário**: Atualização de fichas ou itens que exija conferir centenas de registros no compêndio ou validar as 59 origens.
* **Configuração**: `TypeName: "self"`, `Role: "Compendium Auditor"`, `Prompt: "Audite a integridade dos dados em data/ contra scripts/test_database_integrity.py..."`.
* **Benefício**: Permite que o agente principal implemente a interface visual enquanto o subagente audita a base em paralelo.

#### 🧪 Padrão 2: Executor de Testes Assíncrono (Async Test Runner)
* **Cenário**: Execução de suites completas (`npm run test:all`) que levam mais de 30 segundos.
* **Configuração**: `TypeName: "self"`, `Role: "QA Test Specialist"`.
* **Benefício**: Executa os testes em background sem travar o diálogo principal.

#### 🔍 Padrão 3: Exploração Read-Only Profunda
* **Cenário**: Mapeamento de dependências ou pesquisa em múltiplos PDFs indexados.
* **Configuração**: `TypeName: "research"`, `Role: "Codebase & Rules Researcher"`.
* **Benefício**: Sandbox segura somente leitura, evitando poluir o contexto da conversa com dumps de arquivos.

---

### Detalhamento dos Papéis de Agentes Especializados

#### 🛡️ Agente Auditor de Regras (`rpg-rules-expert`)
* **Foco**: Fidelidade estrita ao livro de regras de Ordem Paranormal v1.1 e suplementos.
* **Skill**: `rpg-rules-audit`
* **Responsabilidades**:
  * Validar fórmulas em `src/utils/progression.ts`.
  * Garantir cálculo correto de CD/DT de rituais (`10 + limite de PE + PRE`).
  * Conferir pré-requisitos de poderes e requisitos de atributos para itens de prestígio.
  * Auditar consistência das 59 origens oficiais e poderes de classe.

#### 📱 Agente Frontend & Mobile UX (`mobile-ui-expert`)
* **Foco**: Interface tática, fluida e responsiva em React Native / Expo.
* **Skill**: `mobile-ui-audit`
* **Responsabilidades**:
  * Desenvolver componentes seguindo o tema tático sombrio (paleta Ordo Realitas / Outro Lado).
  * Garantir responsividade tanto em smartphones (iOS/Android) quanto na versão Web do Expo.
  * Usar `SafeAreaView`, animações performáticas e feedback tátil/sonoro adequado.
  * Evitar regressões visuais em modais complexos (`CreateAgentModal`, `OracleModal`).

#### 🔄 Agente de Sincronização & Offline (`sync-offline-guardian`)
* **Foco**: Resiliência Offline-First e sincronização híbrida sem conflito.
* **Skill**: `sync-offline-audit`
* **Responsabilidades**:
  * Proteger o algoritmo `SmartMergeEngine` com Last-Write-Wins ponderado e tombstones de deleção.
  * Garantir integridade do backup com o Google Drive e Supabase.
  * Assegurar que nenhuma operação essencial (combate, fichas, dados) seja bloqueada por falta de rede.

#### 🔮 Engenheiro de IA Paranormal (`glitch-prompt-engineer`)
* **Foco**: Assistente de IA militar/paranormal G.L.I.T.C.H. e provedores LLM.
* **Skill**: `glitch-prompt-audit`
* **Responsabilidades**:
  * Calibrar o tom militar e atmosférico da IA (estática, jargão tático da Ordem).
  * Otimizar injeção de contexto RAG (`AiKnowledgeRetrieval`) respeitando cotas de tokens.
  * Garantir resiliência com fallback automático para o motor offline (`AiOfflineEngine`).

#### 📚 Arquiteto de Pipeline de Dados (`data-pipeline-architect`)
* **Foco**: Extração, OCR, normalização e integridade do acervo de 10 suplementos oficiais.
* **Skill**: `data-pipeline-audit`
* **Responsabilidades**:
  * Manter os scripts Python de extração (`scripts/extract_all.py`, `scripts/extract_book_pages.py`).
  * Garantir a integridade referencial dos 1.367 registros do `compendium_seed.json`.
  * Manter a busca fonética sem acentos e a indexação de páginas para o "Ver no Livro".

#### 🧪 Agente de QA & Integridade (`qa-reliability-engineer`)
* **Foco**: Cobertura de testes, estabilidade de dados e prevenção de bugs.
* **Skill**: `run-suite`
* **Responsabilidades**:
  * Orquestrar os Smart Testing Gates por escopo de arquivo modificado.
  * Escrever testes em `tests/` para novos fluxos utilizando `node:test` e `@testing-library/react-native`.
  * Auditar integridade referencial dos dados em `data/*.json` contra `scripts/test_database_integrity.py`.
  * Garantir tipagem semântica rigorosa em `src/types/`.

#### 📋 Agente de Releases & Versões (`release-manager`)
* **Foco**: Manter o changelog atualizado e calcular a versão sugerida (SemVer) para o próximo release.
* **Skill**: `update-recorder`
* **Responsabilidades**:
  * Manter `docs/ATUALIZACOES_PENDENTES.md` com as alterações consolidadas e bullets prontos para o `version.json`.
  * Determinar o impacto das mudanças (Patch, Minor ou Major) com base nas funcionalidades entregues.
  * Fornecer o comando pronto de `npm run release <versao> "..."`.

#### 🎯 Arquiteto de Commits Git (`git-commit-architect`)
* **Foco**: Histórico do Git limpo, atômico e semântico (Conventional Commits).
* **Skill**: `commit-generator`
* **Responsabilidades**:
  * Analisar arquivos alterados via `git status` e compor commits com `<tipo>(<escopo>): <mensagem>`.
  * Registrar as sugestões formatadas em `docs/COMMITS_PENDENTES.md` com bloco de execução pronto.

---

## 5. Diretrizes de Código e Estilo

* **Semântica e Comentários**: Manter comentários explicativos em português quando detalharem regras específicas do livro.
* **Gerenciamento de Estado**: Preferir stores locais e repositórios offline desacoplados (`OfflineDataRepository`).
* **Resiliência Offline First**: O aplicativo deve operar completamente offline; a IA G.L.I.T.C.H. possui fallback para o motor offline (`AiOfflineEngine.ts`).

---

## 6. Registro Obrigatório de Atualizações e Commits

> [!CAUTION]
> **Garantia de Autonomia & Atualização Contínua**:
> * É terminantemente **proibido encerrar qualquer interação de desenvolvimento** em que arquivos tenham sido modificados sem antes atualizar os documentos de governança (`docs/ATUALIZACOES_PENDENTES.md` e `docs/COMMITS_PENDENTES.md`).
> * O usuário **NÃO deve precisar solicitar** a atualização desses registros nem a validação dos testes.
> * Quando o usuário solicitar comandos como `"comite"`, `"faça o commit"`, `"faça esse aqui"` ou indicar `COMMITS_PENDENTES.md`, o assistente deve:
>   1. Validar a integridade (`npm run test:all` ou suíte relevante);
>   2. Executar imediatamente o commit via terminal (`git add ... && git commit ...`);
>   3. Atualizar o histórico em `docs/COMMITS_PENDENTES.md` marcando a etapa como concluída.

Executado **automaticamente** pelos agentes `release-manager` e `git-commit-architect` ao concluir qualquer modificação:
1. **Atualizar `docs/ATUALIZACOES_PENDENTES.md`** (via skill `update-recorder`):
   * Recalcular e exibir no topo a **Versão Sugerida** com base em SemVer.
   * Categorizar as mudanças em Features, Fixes, Refactor ou Docs.
2. **Atualizar `docs/COMMITS_PENDENTES.md`** (via skill `commit-generator`):
   * Gerar o título e a descrição padronizada no formato Conventional Commits.
   * Incluir o comando pronto `git add ... && git commit -m ...` para o desenvolvedor.
