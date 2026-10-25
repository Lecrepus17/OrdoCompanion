<div align="center">

  <img src="assets/icon.png" alt="Ordo Companion Logo" width="128" height="128" style="border-radius: 24px;" />

  # Ordo Companion
  ### Guia Completo, Compêndio e Ficha Interativa para Ordem Paranormal RPG

  [![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/)
  [![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
  [![Expo](https://img.shields.io/badge/Expo-~58-black.svg?logo=expo)](https://expo.dev)
  [![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB.svg?logo=react)](https://reactnative.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
  [![Tests](https://img.shields.io/badge/Tests-79%20Passing-brightgreen.svg)](tests/)
  [![Platform](https://img.shields.io/badge/Plataforma-Android%20%7C%20iOS%20%7C%20Web-lightgrey.svg)]()

  <p align="center">
    Um aplicativo multiplataforma de código aberto (Open Source) para mestres e jogadores de <b>Ordem Paranormal RPG</b>.<br />
    Conta com compêndio unificado dos 10 suplementos oficiais, construtor de personagens, rolador de dados oficial, exportação de fichas em PDF e sincronização em nuvem.
  </p>

  <p align="center">
    <a href="#-principais-funcionalidades">Funcionalidades</a> •
    <a href="#-como-rodar-no-celular">Rodar no Celular</a> •
    <a href="#-execução-para-desenvolvedores">Desenvolvimento</a> •
    <a href="#-testes-automatizados">Testes</a> •
    <a href="#-contribuindo">Contribuir</a> •
    <a href="#-licença">Licença</a>
  </p>

</div>

---

## 👁️ Sobre o Projeto

O **Ordo Companion** nasceu com o objetivo de centralizar todas as regras, itens, rituais, criaturas e suplementos de Ordem Paranormal em uma interface rápida, moderna, responsiva e acessível tanto no smartphone (Android/iOS) quanto no computador (Navegador Web).

O projeto é **100% Open Source** e distribuído sob a licença **GNU General Public License v3.0 (GPL-3.0)**. Qualquer pessoa tem a liberdade de inspecionar o código, contribuir com novas melhorias ou criar ferramentas derivadas respeitando os termos da GPL.

---

## ✨ Principais Funcionalidades

### 📖 Compêndio Unificado & Pesquisa nos Livros
- **10 Livros e Suplementos Processados**: Todos os dados do *Livro Base*, *Sobrevivendo ao Horror* e suplementos dos *Arquivos Secretos (01 a 07 e 09)*.
- **1.367 Entidades Estruturadas**: Rituais com cálculos de dados, origens, trilhas, poderes gerais e de classe, armas, itens amaldiçoados, equipamentos, condições e ameaças com enigmas de medo.
- **Leitor "Ver no Livro"**: Visualize a página original do livro oficial indexada na íntegra com navegação de páginas vizinhas e busca em texto completo em 1.261 páginas.

### 📋 Gerenciador de Agentes & Impressão de Fichas
- **Criação e Edição de Personagens**: Atributos, cálculo automático de perícias, PV, PE, SAN e inventário.
- **Exportação de Fichas Oficiais em PDF**: Renderizador de alta fidelidade com os modelos oficiais do *Livro Base* (págs. 321–322) e *Sobrevivendo ao Horror* (págs. 222–223) prontos para imprimir ou salvar via `expo-print`.

### ⚔️ Arsenal & Construtor de Armas
- **Cálculo Automático de Combate**: Modificações de armas (*Mira Laser*, *Alongada*, *Calibre Grosso*, etc.), maldições elementais (*Carniceira*, *Hemofágica*, etc.) e passos de dano oficiais (`1d6` $\to$ `1d8` $\to$ `1d10` $\to$ `1d12` $\to$ `2d8`...).

### 🎲 Rolador de Dados Oficial
- **Regras Oficiais do Sistema**: Rolagem de $N$ dados pegando o maior para atributos positivos e penalidade ($2 + \|\text{atributo}\|$ dados pegando o menor) para atributos zero ou negativos.
- **Parser de Fórmulas Livres**: Suporte completo a rolagens complexas (ex.: `4d6+10`, `2d8+1d6+4`, `5d20+20`).

### ☁️ Sincronização Segura & Modo Offline
- **Google Drive Cloud Sync**: Sincronização em segundo plano na pasta isolada `appDataFolder` do Google Drive pessoal do jogador (privacidade total, custo zero de servidor).
- **Smart Merge com Resolução de Conflitos**: Fusão automática de fichas e favoritos entre diferentes dispositivos baseada em carimbos de data/hora (`updatedAt`).
- **100% Funcional Offline**: Armazenamento local robusto via `AsyncStorage` com backup e restauração manual em JSON.
- **Notificador Automático de Atualizações**: Notifica usuários em versões antigas sobre novas atualizações, exibe notas de lançamento (changelog) e disponibiliza botão de download direto do `.apk` ou página de releases. Consulte [`GUIA_ATUALIZACOES.md`](GUIA_ATUALIZACOES.md) para o guia completo de distribuição.

### 📖 Manual Integrado & Guia Completo do Usuário
- **Manual de Cada Tela & Funcionalidade**: Modal interativo acessível em qualquer tela pelo botão `?` no cabeçalho ou botões contextuais ("Manual da Ficha", "Manual da Armaria", etc.), com busca de tópicos em tempo real, dicas de mestre e navegação direta.
- **Documentação Exaustiva no Repositório**: Consulte [`MANUAL_DO_USUARIO.md`](MANUAL_DO_USUARIO.md) para o guia detalhado tela a tela com tabelas mecânicas e passos de uso.

### 🎨 7 Temas Paranormais Imersivos
- Alternância rápida com um clique entre temas inspirados no universo do RPG:
  - **Escuridão (Original)**
  - **Sangue** (*Sentimento & Dor*)
  - **Morte** (*Lodo & Espiral*)
  - **Conhecimento** (*Sigilos Dourados & Razão*)
  - **Energia** (*Caos & Neon Violeta*)
  - **Medo** (*O Insondável & Abismo*)
  - **Dossiê Branco** (*Arquivo Investigativo de Alta Legibilidade*)

---

## 📊 Estatísticas da Base de Dados (`src/data/seed/`)

| Categoria | Quantidade | Detalhes |
| :--- | :---: | :--- |
| **Rituais** | **106** | 1º ao 4º Círculo, fórmulas, elementos, execuções e aprimoramentos |
| **Origens** | **59** | Todas as origens oficiais com perícias e poderes |
| **Classes & Trilhas** | **4 / 35** | Combatente, Especialista, Ocultista e Sobrevivente + 35 Trilhas |
| **Poderes** | **207** | Poderes de classe, gerais e poderes paranormais com afinidade |
| **Armas & Modificações** | **58** | Dano, crítico, alcance, espaços e categoria |
| **Equipamentos & Itens** | **274** | Itens paranormais, amaldiçoados, máscaras, venenos, veículos e aliados |
| **Perícias & Condições** | **28 / 37** | Grau de treinamento e efeitos mecânicos |
| **Ameaças & Criaturas** | **186** | VD, PV, Defesa, Presença Perturbadora, Ataques e Enigmas de Medo |
| **Capítulos & Regras** | **373** | Dossiês, sumários e regras dos Arquivos Secretos |
| **Páginas Indexadas** | **1.261** | Páginas integrais indexadas para consulta imediata |

---

## 📱 Como Rodar no Celular

### Opção 1: Instantâneo via Expo Go (Sem compilar)
1. Instale o app **Expo Go** no seu Android ([Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)) ou iOS ([App Store](https://apps.apple.com/app/expo-go/id982107779)).
2. No computador, inicie o servidor:
   ```bash
   npm start
   # ou com tunnel se estiver em redes Wi-Fi diferentes:
   npm run start-ngrok
   ```
3. Abra o Expo Go e aponte a câmera para o QR Code exibido no terminal.

### Opção 2: Gerar APK Standalone (Android)
O repositório já possui configuração pronta no [`eas.json`](eas.json):
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
Ao final do build na nuvem, você receberá um link e QR Code para baixar o arquivo `.apk` diretamente no seu celular.

---

## 💻 Execução para Desenvolvedores

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 20 LTS ou superior)
- [Git](https://git-scm.com/)
- [Python 3.10+](https://www.python.org/) *(apenas se for rodar o pipeline de extração de PDFs)*

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU-USUARIO/OrdoCompanion.git
   cd OrdoCompanion
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o ambiente de desenvolvimento:**
   ```bash
   # Iniciar o servidor Expo (menu interativo)
   npm start

   # Abrir diretamente no navegador (Web)
   npm run web

   # Abrir no emulador Android
   npm run android

   # Abrir no simulador iOS
   npm run ios
   ```

---

## 🧪 Testes Automatizados

O projeto conta com uma suíte de testes unitários construída em **TypeScript + `node:test`**, garantindo a estabilidade das fórmulas matemáticas, combate, integridade da base e sincronização:

```bash
# Executa todos os testes unitários (execução em ~2 segundos)
npm test

# Valida checagem estática de tipos TypeScript
npm run typecheck

# Executa bateria completa (Tipagem + Testes Unitários + Integridade Python)
npm run test:all
```

<details>
<summary><b>Visualizar Cobertura dos Módulos Testados (79 Testes)</b></summary>

- **Sistema de Rolagem de Dados** (`tests/dice.test.ts`): Regra de atributo positivo/negativo, detecção de crítico/desastre e parser livre de fórmulas.
- **Armas & Modificações** (`tests/weapons.test.ts`): Parser de margem de ameaça, escala oficial de passos de dano, modificações e maldições.
- **Sincronização & Smart Merge** (`tests/smartMerge.test.ts`): Resolução de conflitos por timestamp individual e união de dados.
- **Repositório Offline** (`tests/repository.test.ts`): Busca normalizada, filtros, entidades Homebrew, restauração para o padrão e persistência.
- **Sistema de Temas** (`tests/themes.test.ts`): Integridade dos 7 temas oficiais e paleta de elementos paranormais.
- **Impressão de Fichas** (`tests/sheetPrinter.test.ts`): Validação das 28 perícias, algarismos romanos (`I`, `II`, `III`) e sanitização HTML contra XSS.
- **Integridade da Base** (`tests/databaseIntegrity.test.ts`): Unicidade de IDs e referências dos 10 livros.
- **Utilitários Web** (`tests/alert.test.ts` / `tests/pdfUrl.test.ts`): Diálogos e compatibilidade multiplataforma.
</details>

---

## 📄 Pipeline de Extração de PDFs (`scripts/`)

Caso você deseje reprocessar os livros ou adicionar novos suplementos na pasta `pdfs/`:

1. Instale os pacotes Python necessários:
   ```bash
   pip install pymupdf pillow pytesseract
   ```
2. Adicione os novos arquivos `.pdf` na pasta `pdfs/`.
3. Execute o extrator automatizado com OCR:
   ```bash
   npm run extract
   ```
4. Verifique a integridade da base gerada:
   ```bash
   npm run test:db
   ```

---

## 🤝 Contribuindo

Contribuições da comunidade são muito bem-vindas! Como um projeto de código aberto, você pode ajudar com:

- 🐛 **Reportar Bugs**: Abra uma [Issue](https://github.com/SEU-USUARIO/OrdoCompanion/issues) detalhando o problema.
- 💡 **Sugerir Funcionalidades**: Conte-nos sua ideia na aba de Issues ou Discussions.
- 🛠️ **Pull Requests**:
  1. Faça um Fork do projeto
  2. Crie sua branch de funcionalidade (`git checkout -b feat/minha-feature`)
  3. Garanta que os testes estejam passando (`npm run test:all`)
  4. Faça o commit seguindo Conventional Commits (`git commit -m 'feat: adicionar nova funcionalidade'`)
  5. Envie a branch (`git push origin feat/minha-feature`)
  6. Abra um Pull Request

---

## 📜 Licença

Este projeto é um software livre distribuído sob os termos da licença **GNU General Public License v3.0 (GPL-3.0)**. Consulte o arquivo [LICENSE](LICENSE) para obter o texto completo da licença.

Em resumo, a licença GPL-3.0 garante a todos a liberdade de:
- Executar o programa para qualquer propósito;
- Estudar como o programa funciona e adaptá-lo às suas necessidades;
- Redistribuir cópias para ajudar outros;
- Melhorar o programa e liberar suas melhorias para o público, desde que qualquer trabalho derivado permaneça livre e sob a mesma licença GPL-3.0.

---

## ⚠️ Aviso Legal / Disclaimer

> **Ordem Paranormal RPG** é uma marca registrada e propriedade intelectual de **Cellbit** e da **Jambô Editora**.
>
> Este aplicativo é um projeto de fã, de código aberto e sem fins lucrativos, criado com o objetivo de servir como ferramenta auxiliar para jogadores e mestres durante as sessões de jogo. Todo o crédito pelo universo, ilustrações originais e regras do sistema pertence aos seus respectivos criadores e autores. Apoie a obra oficial adquirindo os livros na [Jambô Editora](https://jamboeditora.com.br/).
