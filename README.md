# Guia Ordem Paranormal — Extrator de PDFs & App Multiplataforma (Expo)

Aplicativo completo de consulta, filtragem avançada, leitura de capítulos/páginas, gerenciamento de fichas de agentes, construtor de armas customizadas, rolagem de dados oficial e sincronização em nuvem para **Ordem Paranormal RPG**. Construído com **React Native + Expo Router (Android, iOS e Web)** e alimentado por um pipeline automatizado de extração de PDFs em **Python (`PyMuPDF` + OCR Nativo)**.

---

## 📊 Base de Dados Extraída dos 10 PDFs

O pipeline processa todos os **10 livros/suplementos** presentes no repositório:
- `Livro base.pdf` (322 páginas)
- `Sobrevivendo-Ao-Horror-v1.pdf` (226 páginas — texto vetorial selecionável nativo e sumário oficial com 62 tópicos)
- `Arquivos-Secretos-01.pdf` a `Arquivos-Secretos-07.pdf` e `Arquivos-Secretos-09.pdf` (713 páginas somadas)

### Estatísticas da Base Unificada (`src/data/seed/`)
- **1.367 Entidades Estruturadas e Categorizadas**:
  - **106 Rituais** (1º ao 4º Círculo, Elementos, Execução, Alcance, Alvo/Área, Duração, Resistência, Discente, Verdadeiro e fórmulas de dados)
  - **59 Origens** (Perícias treinadas, poder de origem e lore)
  - **4 Classes** (*Combatente*, *Especialista*, *Ocultista* e *Sobrevivente*)
  - **35 Trilhas** (Todas as 15 trilhas do Livro Base, 12 do Sobrevivendo ao Horror e 8 dos Arquivos Secretos)
  - **207 Poderes** (Poderes de Classe, Poderes Gerais com pré-requisitos, Poderes Paranormais com Afinidade)
  - **58 Armas** (Tabela completa com categoria, dano, crítico, alcance, tipo e espaços)
  - **274 Equipamentos, Modificações, Itens Paranormais, Itens Amaldiçoados, Máscaras, Doenças, Venenos, Veículos e Aliados**
  - **28 Perícias** (Atributo-base, penalidade de carga, somente treinada, kit e usos)
  - **37 Condições** (Efeitos mecânicos e categorias de condição)
  - **186 Criaturas, Ameaças da Realidade e NPCs** (VD, PV, Defesa, Presença Perturbadora, Atributos, Ações e Enigma de Medo)
  - **373 Regras, Capítulos e Dossiês dos Arquivos Secretos**
- **1.261 Páginas Integrais Indexadas (`books_pages_seed.json`)**:
  - Permite clicar em **"Ver no Livro"** dentro de qualquer item do compêndio para ler a página original na íntegra e navegar pelas páginas vizinhas, além de pesquisar qualquer termo nas 1.261 páginas na aba **Livros & PDFs**.

---

## 🚀 Como Executar o Aplicativo (Expo)

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o aplicativo
```bash
# Iniciar servidor de desenvolvimento Expo
npm start

# Abrir diretamente na Web (Navegador)
npm run web

# Abrir no Android / iOS (via Expo Go)
npm run android
npm run ios
```

---

## 🧪 Suíte de Testes Unitários e Integridade (79 Testes)

O sistema conta com uma **suíte robusta de testes unitários automatizados** construída com **TypeScript + `node:test`**, garantindo que futuras atualizações de código, adições de conteúdo ou migrações de bibliotecas **não quebrem** as regras do sistema, cálculos de combate ou dados de usuários.

### 📋 Cobertura dos Módulos Testados

| Suíte de Teste | Arquivo | Testes | O que é validado e protegido contra regressão |
| :--- | :--- | :---: | :--- |
| **Sistema de Rolagem de Dados** | [`tests/dice.test.ts`](tests/dice.test.ts) | **9** | Regra oficial de Ordem Paranormal: rola $N$ dados e escolhe o maior se atributo $\ge 1$; regra de penalidade ($2 + \|\text{atributo}\|$ dados pegando o menor) se atributo $\le 0$; detecção de crítico (20) e desastre (1); parser de fórmulas livres (`4d6+10`, `2d8+1d6+4`, `2d10-3`, atalhos de criaturas `5d20+20`). |
| **Armas, Modificações & Maldições** | [`tests/weapons.test.ts`](tests/weapons.test.ts) | **23** | Parser de críticos (`19/x3`, `x4`, etc.); escala oficial de passos de dano (`1d6` $\to$ `1d8` $\to$ `1d10` $\to$ `1d12` $\to$ `2d8` $\to$ `2d10` $\to$ `2d12`); progressão de alcance; cálculo automático de modificações oficiais (*Mira Laser*, *Calibre Grosso*, *Cruel*, *Perigosa*, *Alongada*, *Silenciador*); maldições elementais (*Carniceira*, *Hemofágica*, *Energética*); modificações caseiras e piso mínimo de espaços. |
| **Sincronização & Smart Merge** | [`tests/smartMerge.test.ts`](tests/smartMerge.test.ts) | **6** | Resolução inteligente de conflitos em fichas por timestamp individual (`updatedAt` mais recente prevalece); união sem perda de personagens criados em dispositivos diferentes; união de conjuntos de favoritos sem duplicações; fusão de armas customizadas e listas salvas; preservação de estado da nuvem no perfil. |
| **Repositório Offline & Compêndio** | [`tests/repository.test.ts`](tests/repository.test.ts) | **13** | Normalização de busca sem acentos e sem case sensitivity; ordenação canônica de livros; mapeamento de classes e filtros de exclusão; CRUD de entidades Homebrew; edição de entidades oficiais com marcação `isEdited` e restauração segura para o padrão do seed (`resetEntityToDefault`); persistência local de favoritos e fichas; exportação/importação de backup JSON. |
| **Sistema de Temas Dinâmicos** | [`tests/themes.test.ts`](tests/themes.test.ts) | **6** | Integridade dos 7 temas oficiais (*Preto*, *Sangue*, *Morte*, *Conhecimento*, *Energia*, *Medo*, *Branco*); contraste de cores e `statusBarStyle`; presença obrigatória dos 7 elementos paranormais (*Sangue*, *Morte*, *Conhecimento*, *Energia*, *Medo*, *Variável*, *Nenhum*) em cada tema; fallback seguro e registro dinâmico de novos temas. |
| **Impressão & Renderização de Fichas** | [`tests/sheetPrinter.test.ts`](tests/sheetPrinter.test.ts) | **8** | Conferência das 28 perícias oficiais; conversão de graus de treinamento para algarismos romanos (`I`, `II`, `III`); cálculo de bônus numéricos; formatação de referências a páginas (`LB p. 42`, `SH p. 30`, `Origem`, `Trilha`); geração e sanitização segura de HTML contra injeção XSS nos modelos *Livro Base* e *Sobrevivendo ao Horror*. |
| **Integridade Estrutural da Base** | [`tests/databaseIntegrity.test.ts`](tests/databaseIntegrity.test.ts) | **4** | Verificação em TypeScript dos 10 livros oficiais; unicidade e validade dos IDs de 1.367 entidades; conferência das contagens exatas e mínimas de rituais, origens, trilhas, criaturas, poderes e itens; integridade referencial dos índices de página. |
| **Utilitários Web & Diálogos** | [`tests/alert.test.ts`](tests/alert.test.ts) & [`tests/pdfUrl.test.ts`](tests/pdfUrl.test.ts) | **10** | Chamadas de confirmação e alerta compatíveis com Web e Mobile; geração de URLs com `#page=N&view=FitH` para PDFs; clamping seguro de DPI (72 a 260) e garantia de número de página positivo na renderização. |

### 🛠️ Comandos de Execução

```bash
# Executa todos os 79 testes unitários (execução em ~2 segundos)
npm test

# Executa verificação estática de tipos em todo o projeto e testes
npm run typecheck

# Executa a verificação completa (TypeScript + 79 Testes Unitários + Integridade Python)
npm run test:all

# Executa apenas o teste de integridade da base via Python
npm run test:db
```

---

## 🖨️ Exportação e Impressão de Fichas em PDF

O aplicativo conta com um motor completo de geração de fichas pré-preenchidas nos layouts oficiais do RPG:

- **Modelos Suportados**:
  - **Livro Base** (Páginas 321 e 322 da versão clássica).
  - **Sobrevivendo ao Horror** (Páginas 222 e 223 com visual estilizado e seções de sobrevivência).
- **Campos Mapeados Automaticamente**:
  - Atributos (*AGI*, *FOR*, *INT*, *PRE*, *VIG*).
  - Tabela completa de perícias com marcação em algarismos romanos (`I`, `II`, `III`) e cálculo do bônus total somado.
  - Tabela de ataques, armas calculadas, dano, margem de ameaça e alcance.
  - Rituais aprendidos, círculos, execuções e resistências.
  - Itens de inventário, peso e categoria.
  - Habilidades de classe, poderes de origem e trilhas.
- **Opções de Exportação**:
  - Pré-visualização da Frente, Verso ou Ambas as páginas.
  - Botão de **Imprimir / Salvar em PDF** nativo (Web e Mobile via `expo-print`).

---

## 📄 Como Adicionar Novos PDFs Automaticamente

O projeto conta com um pipeline automatizado em Python que detecta qualquer novo arquivo `.pdf` adicionado na pasta `pdfs/` do projeto:

1. Coloque o novo arquivo `.pdf` (ex.: `Arquivos-Secretos-08.pdf` ou `Arquivos-Secretos-10.pdf`) na pasta `pdfs/` deste repositório (arquivos colocados na raiz também são detectados como fallback).
2. Execute o comando:
   ```bash
   npm run extract
   # ou diretamente:
   python scripts/extract_all.py
   ```
3. O script:
   - Extrai todas as páginas do novo PDF (e aplica OCR automático em português caso alguma página seja escaneada/imagem).
   - Detecta automaticamente novos Rituais, Origens, Trilhas, Poderes, Equipamentos/Itens, Criaturas/Ameaças e Seções do Sumário.
   - Atualiza e valida os arquivos `src/data/seed/compendium_seed.json` e `src/data/seed/books_pages_seed.json` utilizados pelo aplicativo.
4. Para rodar a verificação de integridade da base:
   ```bash
   npm run test:db
   ```

---

## ☁️ Arquitetura 100% Offline Pronta para Nuvem

Toda a camada de acesso a dados foi construída sobre o contrato [`IDataRepository`](src/repositories/IDataRepository.ts):
- Atualmente utiliza [`OfflineDataRepository`](src/repositories/OfflineDataRepository.ts), que carrega a base oficial (`src/data/seed/`) em memória e persiste localmente via `AsyncStorage` uma camada de **Delta/Overrides** contendo:
  - Novos itens criados manualmente pelo usuário (**Homebrew**).
  - Edições feitas em itens oficiais (mantendo a possibilidade de restaurar o original do PDF a qualquer momento).
  - Favoritos, Listas Salvas (Grimórios/Missões) e Fichas de Agentes.
- **Para migrar para Nuvem (Supabase / Firebase) no futuro**:
  1. Crie `src/repositories/SupabaseDataRepository.ts` implementando `IDataRepository`.
  2. Use a função `exportUserDataJson()` já disponível na aba **Salvos > Backup JSON** para sincronizar os registros customizados e fichas com as tabelas da nuvem.

---

## 🎨 Sistema de Temas Dinâmicos e Configuráveis

O aplicativo suporta múltiplos temas com persistência automática via `AsyncStorage` e fácil extensão:

### Temas Inclusos (7 Temas Oficiais):
1. **Preto (Original / Escuridão Paranormal)**: Tema clássico escuro do Ordem Paranormal com acentos carmesins (`#DC2626`).
2. **Sangue (Sentimento & Dor)**: Atmosfera carmesim profunda e visceral inspirada nas entidades e no fluxo de Sangue (`#E11D48`).
3. **Morte (Lodo & Tempo)**: Estética monocromática espectral inspirada no lodo negro, na passagem do tempo e nas cinzas da espiral (`#A1A1AA` / `#D4D4D8`).
4. **Conhecimento (Sigilos & Razão)**: Tons dourados místicos, pergaminho antigo e sigilos esotéricos sobre superfícies de ônix (`#F59E0B`).
5. **Energia (Caos & Vibração)**: Tons profundos de violeta, ametista e neon elétrico do elemento Energia (`#A855F7`).
6. **Medo (O Desconhecido & Abismo)**: Imersão abissal com tons de azul marinho profundo, ciano etéreo e o enigma do Medo insondável (`#0284C7`).
7. **Branco (Dossiê Clínico / Arquivo da Ordem)**: Tema claro de alta legibilidade inspirado em relatórios e pastas de investigação, com contraste adaptado para elementos e ícones.

### Como Trocar de Tema:
- **Botão Rápido no Topo**: Ícone de paleta de cores (`color-palette`) no canto superior direito de qualquer aba.
- **Aba Salvos > Temas & Visual**: Gerenciador visual completo com pré-visualização das paletas de cores.

### Como Adicionar Novos Temas Facilmente:
Em [`src/theme/themes.ts`](src/theme/themes.ts), basta definir um novo objeto `ThemeDefinition` e registrá-lo no dicionário `THEMES`:
```typescript
import { registerTheme, ThemeDefinition } from './themes';

export const meuTemaVerde: ThemeDefinition = {
  id: 'green',
  name: 'Verde (Lodo / Morte)',
  subtitle: 'Decadência Paranormal',
  description: 'Atmosfera com tons esmeralda e detalhes fúnebres.',
  isDark: true,
  statusBarStyle: 'light',
  badgeColor: '#10B981',
  previewColors: ['#0A120E', '#11221A', '#10B981', '#E6F4EA'],
  colors: { ... }
};

registerTheme(meuTemaVerde);
```
Todos os componentes utilizam o hook `useTheme()` e `useThemedStyles(createStyles)` que reagem instantaneamente a trocas de tema em tempo real.

---

## ☁️ Sincronização em Nuvem (Google Drive Cloud Sync)

O aplicativo conta com sincronização online integrada com o **Google Drive**:

- **Pasta Oculta Segura (`appDataFolder`)**: Todos os dados do usuário (fichas de personagens, armas customizadas, homebrews, listas e favoritos) são salvos na área isolada do aplicativo no Google Drive do jogador. Isso evita exclusões acidentais na lixeira comum do Drive.
- **Custo Zero & Privacidade Total**: Nenhum dado pessoal é mantido em servidores ou bancos de dados centrais de terceiros. A conta Google pessoal do jogador armazena com segurança seu progresso.
- **Smart Merge Inteligente**: Ao alternar entre o celular (Android) e o computador (Web), o motor de mesclagem compara timestamps (`updatedAt`) individualmente por ficha, unindo favoritos e listas sem perda de dados.
- **Sincronização Automática**: Salva alterações em segundo plano com debounce assim que o usuário edita fichas ou armas.
- **Configuração Customizável de Client ID**: Permite usar as credenciais padrão do app ou inserir seu próprio Client ID do Google Cloud Console no modal de Perfil > Nuvem.

---

## 💡 Possíveis Melhorias e Roadmap Futuro

Durante o desenvolvimento e análise dos 10 livros, mapeamos as seguintes sugestões de evolução para o projeto:

1. **Rastreador de Iniciativa e Combate para o Mestre (Combat Tracker)**:
   - Adicionar uma tela onde o Mestre possa selecionar múltiplas Ameaças/Criaturas do Compêndio e Agentes do grupo, controlar a ordem de Iniciativa, aplicar Condições (ex.: *Sangrando*, *Abalado*, *Agarrado*) com cálculo automático de penalidades em `-1d20`/`-2d20` e controlar os PVs de cada monstro na cena.
2. **Gerador Automático de Missões, Transtornados, Produção do Anfitrião e Mercenários**:
   - Os PDFs (*Livro Base* pág. 157, *Arquivos Secretos #01* pág. 23, *#04* pág. 48, *#05* pág. 23 e *#09* pág. 14) possuem tabelas de rolagem para gerar missões e cultistas aleatórios. Podemos criar um botão **"Gerar Missão / Cultista Aleatório"** que rola todas as tabelas automaticamente em 1 clique.
3. **Calculadora Automática de Carga e Limite de Categoria por Patente na Ficha**:
   - Validar automaticamente na ficha se a soma de espaços dos itens ultrapassa `5 × Força` (aplicando a condição *Sobrecarregado*) e verificar a quantidade máxima de itens de Categoria I, II, III e IV de acordo com a Patente (*Recruta*, *Operador*, *Agente Especial*, *Oficial de Operações*, *Agente de Elite*).
4. **Rastreador de Cenas de Perseguição e Furtividade (*Sobrevivendo ao Horror*)**:
   - Widget interativo para controlar os acúmulos de sucessos em cenas de Perseguição e o nível de Visibilidade (`1` a `3`) em cenas de Furtividade introduzidas no suplemento *Sobrevivendo ao Horror*.
5. **Modo Mesa Compartilhada em Tempo Real (WebSockets / Supabase Realtime)**:
   - Quando a camada de nuvem for ativada, permitir que os jogadores rolem dados na ficha e o Mestre veja o resultado da rolagem instantaneamente na tela da mesa.
