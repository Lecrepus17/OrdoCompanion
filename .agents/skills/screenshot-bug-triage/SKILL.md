---
name: screenshot-bug-triage
description: Triagem automática, roteamento multi-agente e resolução em lote de problemas reportados via capturas de tela (prints) na pasta docs/imagens dos problemas/, onde o nome de cada arquivo descreve o bug encontrado.
---

# 📸 Skill: Triagem e Resolução de Prints de Problemas (`screenshot-bug-triage`)

Esta skill automatiza o fluxo contínuo de correção de bugs visuais, de UX, APK, sincronização e regras a partir de capturas de tela salvas pelo desenvolvedor na pasta `docs/imagens dos problemas/`.

---

## 1. Como Funciona o Fluxo

1. **Coleta de Evidências (Pelo Usuário)**:
   * Durante o uso do app no celular ou emulador, o usuário tira prints dos problemas encontrados.
   * O usuário salva os arquivos em `docs/imagens dos problemas/` colocando **a descrição do problema como o próprio nome do arquivo** (ex.: `botão de salvar cortado no modo deitado.png`, `pdf trava ao rolar página.jpg`).
   * A pasta `docs/imagens dos problemas/` já está configurada no `.gitignore` para nunca poluir o repositório Git.

2. **Disparo do Processamento**:
   * Quando acumular uma quantidade de prints, o usuário aciona o **Prompt Padrão** (com ou sem `/teamwork [skip-interview]`).

---

## 2. Passo a Passo de Execução Obrigatória para o Agente

Sempre que esta skill for acionada ou o usuário pedir para processar a pasta `docs/imagens dos problemas`:

### Passo 1: Inventário e Inspeção Visual
1. Liste todos os arquivos de imagem (`.png`, `.jpg`, `.jpeg`, `.webp`) presentes em `docs/imagens dos problemas/`.
2. Utilize a ferramenta `read_file` em cada imagem para inspecionar visualmente o print da tela e extrair:
   * **O que o título do arquivo relata** (sintoma principal descrito pelo usuário);
   * **O que a imagem mostra** (tela exata do app, modal aberto, estado de botões, cortes de texto, orientação retrato/paisagem, mensagens de erro).

### Passo 2: Roteamento por Domínio Especializado
Classifique cada print e acione o papel/subagente correspondente conforme a matriz do `GEMINI.md`:
* 📱 **`mobile-ui-expert`** (`mobile-ui-audit`): Cortes de texto, sobreposição de botões, modo paisagem (`landscape`), cabeçalhos, responsividade em telas pequenas e modais.
* 🤖 **`android-apk-guardian`** (`android-apk-audit`): Falhas exclusivas do celular/APK, `BackHandler`, `expo-sharing`, `expo-file-system`, `expo-print`, `expo-speech`, teclado virtual ou APIs Web ausentes no Hermes.
* 🔄 **`sync-offline-guardian`** (`sync-offline-audit`): Problemas de sincronização com Google Drive/Supabase, exclusões que retornam (falta de tombstones) ou cache offline.
* 🔮 **`glitch-prompt-engineer`** (`glitch-prompt-audit`): Erros de chave de API (Gemini/Groq/Ollama), voz/TTS do G.L.I.T.C.H. ou respostas do modo offline.
* 🛡️ **`rpg-rules-expert`** (`rpg-rules-audit`): Erros de cálculo de PV/PE/SAN, NEX, Defesa, RD, proficiências, rituais ou armas.

### Passo 3: Implementação e Validação Estrita (`qa-reliability-engineer`)
1. Aplique as correções definitivas nos componentes e serviços mapeados.
2. Adicione ou atualize testes automatizados em `tests/` cobrindo os cenários corrigidos.
3. Execute obrigatoriamente os Smart Testing Gates:
   * `npm run typecheck` (0 erros)
   * `npm run test:front` / `npm run test:rules` / `npm run test:sync` ou `npm run test:all` (100% aprovados).

### Passo 4: Limpeza da Fila de Prints & Governança
1. **Após todas as correções passarem nos testes**, remova os arquivos de imagem já resolvidos de dentro de `docs/imagens dos problemas/` (mantendo a pasta vazia pronta para a próxima leva de prints).
2. Atualize `docs/ATUALIZACOES_PENDENTES.md` (`update-recorder`) e `docs/COMMITS_PENDENTES.md` (`commit-generator`).

---

## 3. Prompts Padrão Recomendados para o Usuário

### Opção A — Execução Direta Rápida (Agente Principal + Subagentes sob Demanda)
> `Processe e corrija todos os problemas da pasta docs/imagens dos problemas seguindo a skill screenshot-bug-triage. Ao finalizar e validar nos testes, limpe as imagens processadas da pasta.`

### Opção B — Execução em Equipe Completa Multi-Agente (`/teamwork` sem entrevista)
> `/teamwork [skip-interview] Processe e resolva todos os problemas documentados nos prints em docs/imagens dos problemas (onde o nome de cada arquivo descreve o erro). Inspecione as imagens, distribua para os agentes especializados (mobile-ui-expert, android-apk-guardian, sync-offline-guardian, glitch-prompt-engineer, rpg-rules-expert), valide com npm run typecheck e testes automatizados, limpe as imagens da pasta após corrigir e atualize a governança.`
