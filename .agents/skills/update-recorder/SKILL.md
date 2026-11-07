---
name: update-recorder
description: >-
  Registra alterações de código e novas funcionalidades em docs/ATUALIZACOES_PENDENTES.md, calculando a sugestão de próxima versão SemVer (Patch, Minor ou Major), gerando automaticamente docs/RELEASE_NOTES.md (copiado para o Clipboard) e orientando todo o ciclo de publicação de release do app.
---

# Skill: Gravador de Atualizações, Versionamento e Publicação de Release (update-recorder)

Esta skill orienta tanto o registro contínuo de mudanças no arquivo `docs/ATUALIZACOES_PENDENTES.md` quanto o **fluxo automatizado de preparação e subida de nova versão (Release)** quando solicitado pelo usuário.

---

## 1. Verificação da Versão Atual e Cálculo SemVer

1. Inspecione a versão corrente em `package.json` ou `version.json` (ex: `1.2.0-beta.2`).
2. Analise a natureza das alterações recentes:
   * **PATCH** (ex.: `1.2.0-beta.1` ➔ `1.2.0-beta.2` ou `1.2.1`): Correções de bugs, pequenas melhorias de layout ou ajustes sem adição de grandes recursos.
   * **MINOR** (ex.: `1.2.0-beta.2` ➔ `1.3.0-beta.1`): Adição de novas telas, novas entidades no compêndio, novos recursos ou integrações.
   * **MAJOR** (ex.: `1.3.0-beta.1` ➔ `2.0.0-beta.1`): Mudanças estruturais que quebram retrocompatibilidade no banco de dados local ou arquitetura.

---

## 2. Estrutura do Arquivo `docs/ATUALIZACOES_PENDENTES.md`

O arquivo deve sempre manter no topo a sugestão de versão atualizada e acumular os tópicos das mudanças recentes.
> **IMPORTANTE**: A seção `## 🚀 Resumo...` é lida automaticamente pelo script `scripts/create_release.js` para gerar o arquivo `docs/RELEASE_NOTES.md` e alimentar o `version.json`. Nunca use sintaxe LaTeX (`$\rightarrow$`) dentro dessa seção para evitar quebras no renderizador de releases do GitHub; prefira setas Unicode (`➔` ou `→`).

```markdown
# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `X.Y.Z-beta.W`  
> **Versão Sugerida**: `X.Y.Z-beta.W` (Motivo: [Patch/Minor/Major] - resumo)  
> **Última Atualização**: AAAA-MM-DD HH:MM

---

## 🚀 Resumo do Próximo Release vX.Y.Z-beta.W (Changelog de Usuário)
* **Destaque Principal 1**:
  * Detalhe de valor para o jogador/mestre.
* **Destaque Principal 2**:
  * Detalhe de valor para o jogador/mestre.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades (Features)
- [Área/Componente]: Descrição clara do que foi introduzido.

### 🐛 Correções de Bugs (Fixes)
- [Área/Componente]: Descrição do problema corrigido e comportamento anterior.

### 🧪 Testes Automatizados
- Resumo das suítes executadas e quantidade de testes passando.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release <versao_sugerida> "Item 1; Item 2; Item 3"
```
```

---

## 3. Isolamento Estrito entre Versões (Como Evitar Mistura de Releases)

> **REGRA DE OURO DE ISOLAMENTO DE CICLO**:
> Cada release deve conter **exclusivamente** o que foi feito desde a release imediatamente anterior, sem **jamais** carregar ou misturar itens de versões já lançadas.

1. **Durante o desenvolvimento (entre uma versão e outra)**:
   * Se o `docs/ATUALIZACOES_PENDENTES.md` estiver com o marcador `*(Nenhuma atualização pendente registrada neste ciclo ainda)*`, **substitua** esse marcador pelos itens da primeira entrega do novo ciclo.
   * Se já houver itens registrados **dentro do mesmo ciclo ainda não lançado** (ex.: você fez a tarefa A hoje e a tarefa B amanhã, antes de gerar a release), acumule A + B no `docs/ATUALIZACOES_PENDENTES.md`.
2. **No momento em que `npm run release` é executado**:
   * O script `scripts/create_release.js` extrai tudo o que estava pendente no ciclo atual e gera o `docs/RELEASE_NOTES.md` (copiando para o `Ctrl+V`).
   * Em seguida, ele move/arquiva automaticamente todo o conteúdo da versão lançada para `docs/HISTORICO_RELEASES.md`.
   * Por fim, ele **limpa/zera automaticamente o `docs/ATUALIZACOES_PENDENTES.md`**, deixando-o em branco para que a próxima versão (a 2ª, a 3ª, etc.) acumule **somente** o que for feito dali em diante, sem nenhum vínculo com versões passadas.

---

## 4. Fluxo Automatizado quando o Usuário Pedir "Prepare para subir nova versão" / "Gerar Release"

Sempre que o usuário pedir para preparar ou subir uma nova versão, o agente **DEVE executar automaticamente todos os passos abaixo** e orientar o usuário de forma completa na resposta:

### Passo 1: Executar a Suíte Completa de Qualidade (`npm run test:all`)
* Execute `npm run test:all` (`typecheck` + todos os testes unitários/frontend + `test:db`).
* Nenhuma release pode avançar se houver erro de tipagem ou teste quebrado.

### Passo 2: Executar o Script Automatizado de Release (`npm run release`)
* Execute:
  ```bash
  npm run release <nova_versao> "Resumo 1; Resumo 2; Resumo 3"
  ```
  *(Dica: se a versão não for passada, o script lê automaticamente a `Versão Sugerida` e os bullets da seção `## 🚀 Resumo...` de `docs/ATUALIZACOES_PENDENTES.md`).*
* O script `scripts/create_release.js` executará **automaticamente**:
  1. Atualização de `package.json` (`version`).
  2. Atualização de `app.json` (`expo.version` e incremento idempotente de `expo.android.versionCode`).
  3. Sincronização de `version.json` (`version`, `releaseName`, `releaseDate`, `downloadUrl`, `apkUrl` e `changelog`).
  4. Extração da seção `## 🚀 Resumo...` de `docs/ATUALIZACOES_PENDENTES.md` e geração do arquivo **`docs/RELEASE_NOTES.md`** pronto para a caixa *"Describe this release"* do GitHub.
  5. **Cópia automática do texto de `docs/RELEASE_NOTES.md` para a Área de Transferência (`Clipboard` / `Ctrl+V`)** do Windows/macOS/Linux preservando acentos e emojis UTF-8.

### Passo 3: Atualizar os Documentos de Governança
* Atualize o cabeçalho de `docs/ATUALIZACOES_PENDENTES.md` registrando a nova `Versão Atual` e abrindo a sugestão para o próximo ciclo.
* Atualize `docs/COMMITS_PENDENTES.md` com o comando de commit e tag (`git tag v<nova_versao>`).

### Passo 4: Resposta Obrigatória ao Usuário no Chat
Ao responder ao usuário que a versão está pronta, **SEMPRE apresente na mensagem**:
1. **Status da Validação**: Confirmação dos arquivos sincronizados (`package.json`, `app.json`, `version.json`, `docs/RELEASE_NOTES.md`) e resultado do `npm run test:all`.
2. **Bloco Markdown das Release Notes do GitHub**:
   * Informe que o texto **já foi copiado automaticamente para o `Ctrl+V` (Clipboard)** e salvo em `docs/RELEASE_NOTES.md`, mas **também exiba o bloco Markdown completo na resposta do chat** para visualização ou cópia rápida.
3. **Passo a Passo Guiado para Publicação**:
   * **A) Commit, Tag e Push**:
     ```bash
     git add package.json app.json version.json docs/RELEASE_NOTES.md docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
     git commit -m "chore(release): prepara versao v<versao> (versionCode <N>)"
     git tag v<versao>
     git push origin main --tags
     ```
   * **B) Gerar o APK Android (EAS Build)**:
     ```bash
     eas build -p android --profile production
     ```
   * **C) Publicar a Release no GitHub (2 opções)**:
     * **Via Navegador**: Clicar no link direto `https://github.com/Lecrepus17/OrdoCompanion/releases/new?tag=v<versao>&title=Ordo%20Companion%20v<versao>`, clicar na caixa *"Describe this release"* e pressionar **`Ctrl+V`** (pois o script já copiou as notas para a área de transferência), anexar o arquivo renomeado para **`OrdoCompanion.apk`** e clicar em *Publish release*.
     * **Via Terminal (se tiver GitHub CLI `gh`)**:
       ```bash
       npm run release <versao> --publish
       ```
