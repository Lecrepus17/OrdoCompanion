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

## 2. Comandos Essenciais de Verificação e Qualidade

Sempre que realizar alterações significativas no código ou compêndio, utilize:

```bash
# Verificação completa (TypeScript + Testes Automatizados + Integridade do Banco):
npm run test:all

# Verificações individuais:
npm run typecheck     # Validação estrita de tipos TypeScript
npm run test          # Testes de unidade e componentes com tsx
npm run test:front    # Apenas testes de telas e componentes React
npm run test:db       # Validação de integridade referencial dos JSONs em data/
```

> [!IMPORTANT]
> **Nunca commite alterações que quebrem `npm run test:all`**. Se modificar esquemas de dados em `data/`, execute `npm run test:db` para garantir que nenhuma referência cruzada (como poderes, rituais ou origens) foi corrompida.

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
| **Interface, Telas & UX** | Telas Expo Router, componentes visuais, modais, estilização tática, temas sombrios, responsividade ou áudio.<br>• `app/**/*.tsx`<br>• `src/components/**`<br>• `src/theme/**` | 📱 `mobile-ui-expert`<br>*(Frontend & Mobile UX)* | — | Implementar seguindo o tema tático sombrio (Ordo/Outro Lado), `SafeAreaView`, prevenção de quebras de layout/overflow e suporte multiplataforma (Android, iOS, Web). |
| **Testes, Lógica & Integridade** | Qualquer alteração de código, correção de bugs, refatoração de utilitários ou mudanças nos JSONs do compêndio.<br>• `tests/**`<br>• `scripts/test_database_integrity.py`<br>• `src/types/**` | 🧪 `qa-reliability-engineer`<br>*(QA & Integridade)* | `run-suite` | Executar automaticamente validações (`npm run test:all`, `npm run typecheck`, `npm run test:db`) e escrever novos testes para evitar regressões em cada alteração. |
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
│    • Regras/Fichas/Compêndio ➔ 🛡️ rpg-rules-expert     │
│    • Telas/Componentes/UX   ➔ 📱 mobile-ui-expert     │
└────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────┐
│ 2. Execução & Validação Técnica                        │
│    ➔ 🧪 qa-reliability-engineer                        │
│    • Executa typecheck estrito e suíte de testes       │
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

### 🤖 Diretrizes para Invocação de Subagentes (`invoke_subagent`)

Quando uma tarefa envolver análise volumosa, pesquisa abrangente ou execução em segundo plano, utilize a ferramenta `invoke_subagent` com:

1. **`TypeName: "self"`**: Para subagentes que precisam de acesso completo de escrita, testes e ferramentas de terminal.
2. **`TypeName: "research"`**: Para subagentes de exploração profunda e somente leitura de arquivos e documentação.
3. **Parâmetros Mandatórios**:
   * `Role`: Papel claro alinhado à persona (ex: `"RPG Rules Auditor"`, `"QA Automation Specialist"`, `"Mobile UI Refactorer"`).
   * `Prompt`: Objetivo específico, contexto do arquivo e critérios de aceite esperados.

---

### Detalhamento dos Papéis de Agentes Especializados

#### 🛡️ Agente Auditor de Regras (`rpg-rules-expert`)
* **Foco**: Fidelidade estrita ao livro de regras de Ordem Paranormal v1.1 e suplementos.
* **Responsabilidades**:
  * Validar fórmulas em `src/utils/progression.ts`.
  * Garantir cálculo correto de CD/DT de rituais (`10 + limite de PE + PRE`).
  * Conferir pré-requisitos de poderes e requisitos de atributos para itens de prestígio.
  * Auditar consistência das 59 origens oficiais e poderes de classe.

#### 📱 Agente Frontend & Mobile UX (`mobile-ui-expert`)
* **Foco**: Interface tática, fluida e responsiva em React Native / Expo.
* **Responsabilidades**:
  * Desenvolver componentes seguindo o tema tático sombrio (paleta Ordo Realitas / Outro Lado).
  * Garantir responsividade tanto em smartphones (iOS/Android) quanto na versão Web do Expo.
  * Usar `SafeAreaView`, animações performáticas e feedback tátil/sonoro adequado.
  * Evitar regressões visuais em modais complexos (`CreateAgentModal`, `OracleModal`).

#### 🧪 Agente de QA & Integridade (`qa-reliability-engineer`)
* **Foco**: Cobertura de testes, estabilidade de dados e prevenção de bugs.
* **Responsabilidades**:
  * Escrever testes em `tests/` para novos fluxos utilizando `node:test` e `@testing-library/react-native`.
  * Auditar integridade referencial dos dados em `data/*.json` contra `scripts/test_database_integrity.py`.
  * Garantir tipagem semântica rigorosa em `src/types/`.

#### 📋 Agente de Releases & Versões (`release-manager`)
* **Foco**: Manter o changelog atualizado e calcular a versão sugerida (SemVer) para o próximo release.
* **Responsabilidades**:
  * Manter `docs/ATUALIZACOES_PENDENTES.md` com as alterações consolidadas e bullets prontos para o `version.json`.
  * Determinar o impacto das mudanças (Patch, Minor ou Major) com base nas funcionalidades entregues.
  * Fornecer o comando pronto de `npm run release <versao> "..."`.

#### 🎯 Arquiteto de Commits Git (`git-commit-architect`)
* **Foco**: Histórico do Git limpo, atômico e semântico (Conventional Commits).
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

Executado **automaticamente** pelos agentes `release-manager` e `git-commit-architect` ao concluir qualquer modificação:
1. **Atualizar `docs/ATUALIZACOES_PENDENTES.md`** (via skill `update-recorder`):
   * Recalcular e exibir no topo a **Versão Sugerida** com base em SemVer.
   * Categorizar as mudanças em Features, Fixes, Refactor ou Docs.
2. **Atualizar `docs/COMMITS_PENDENTES.md`** (via skill `commit-generator`):
   * Gerar o título e a descrição padronizada no formato Conventional Commits.
   * Incluir o comando pronto `git add ... && git commit -m ...` para o desenvolvedor.
