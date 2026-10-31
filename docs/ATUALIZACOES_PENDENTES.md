# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.1.0-beta.3`  
> **Versão Sugerida**: `1.1.0-beta.4` (Motivo: [Patch] Padronização das 5 abas fixadas na barra, menu Mais e telas ocultas, correção de OutOfMemoryError no Android ao manipular PDFs grandes, leitor in-app e blindagem EAS)  
> **Última Atualização**: 2026-10-31 18:10

---

## 🚀 Resumo do Próximo Release v1.1.0-beta.4 (Changelog de Usuário)
* **Novo Padrão Canônico da Barra de Abas & Menu "+ Mais"**:
  * **Abas Fixadas na Barra Inferior (5)**: Compêndio (`#1`), Agentes (`#2`), Livros (`#3`), Salvos (`#4`) e Dados (`#5`) agora são as telas principais de acesso imediato por padrão.
  * **Abas no Menu "+ Mais" (2)**: Armaria e Suporte organizadas com facilidade no modal de opções complementares.
  * **Abas Ocultas por Padrão (3)**: Central do Mestre, G.L.I.T.C.H. e Mesa Virtual iniciam desativadas da navegação para maior limpeza visual (com o assistente G.L.I.T.C.H. acessível a qualquer instante pelo botão com ícone de brilho no topo de qualquer tela).
  * **Respeito Integral às Preferências do Usuário ("a menos que o usuário altere")**: Perfis que personalizaram a organização das abas mantêm suas escolhas intactas, e perfis legados são migrados suavemente para o novo padrão oficial.
* **Correção Crítica de OutOfMemoryError no APK Android (`java.lang.OutOfMemoryError`)**:
  * Resolvido crash espontâneo que ocorria em segundo plano sem ação do usuário ("sem eu fazer nada"). O aplicativo tentava alocar até 84.030.125 bytes (~84 MB) de uma só vez na memória heap do Android ao tentar baixar o livro *Sobrevivendo ao Horror*.
  * O download e cache automático de PDFs em segundo plano (`cacheUnlockedBooksOffline`) no celular agora grava apenas metadados (consumo ZERO de RAM). O download de binários pesados ocorre exclusivamente sob demanda.
  * Migrado o `expo-file-system` para a importação `expo-file-system/legacy`, garantindo que o streaming nativo em disco (`downloadAsync`) funcione sem falhas no Expo SDK 58.
  * O `CloudSyncManager` no celular agora utiliza exclusivamente `downloadPdfFromDriveToFile` (streaming direto para disco), eliminando o carregamento de arquivos pesados em buffers `arrayBuffer()` na memória RAM.
  * Inserida a flag `android:largeHeap="true"` diretamente no `<application>` do `android/app/src/main/AndroidManifest.xml`.
* **Leitura de PDFs sem Sair do App no APK**: No celular Android e em compilações nativas, a leitura de PDFs agora abre diretamente através do navegador integrado in-app em tela cheia (Chrome Custom Tabs). O usuário conta com zoom tático, navegação ágil de páginas e um botão de retorno no topo que mantém a navegação 100% dentro do Ordo Companion.
* **Páginas Referentes do PDF no Compêndio**:
  * Ao navegar na lista do Compêndio, o badge de fonte no rodapé de cada cartão (`Livro • pág. X`) agora é clicável: tocar nele abre instantaneamente o visualizador na página exata do livro de referência.
  * Na tela de detalhes de qualquer item, a fonte no topo possui atalho direto interativo, e a seção "Página Original do PDF" exibe uma prévia com o título da seção, trecho do texto oficial e botões para abrir a página no leitor embutido ou no modo texto.
* **Blindagem de Variáveis de Ambiente no APK Standalone (`eas.json`)**: Configurados todos os perfis (`development`, `preview` e `production`) no `eas.json` com `EXPO_PUBLIC_MASTER_PASSWORD`, `EXPO_PUBLIC_GDRIVE_BOOKS_FOLDER_URL`, `EXPO_PUBLIC_DEFAULT_GEMINI_API_KEY` atualizado e Google Client IDs.
* **Fallback Canônico de Desbloqueio**: O desbloqueio com a senha mestre canônica `ORDOCOMPANIONEOMELHOR` foi blindado no código em `PdfAccessService.ts`, garantindo que o acervo e o compêndio possam ser liberados com sucesso mesmo em builds sem `.env` local.
* **Prevenção de Telas em Branco no Leitor Nativo**: O modo `pdf_native` no `PdfViewerModal` agora oferece suporte completo para plataformas móveis (`Platform.OS !== 'web'`), combinando o visualizador in-app com exibição de texto canônico de contingência.
* **Fidelidade Canônica nos Resumos dos Poderes Gerais (Compêndio & Ficha)**: Atualizados os resumos dos poderes *Vitalidade Reforçada* (+1 PV para cada 5% de NEX e +2 em Fortitude) e *Vontade Inabalável* (+1 PE para cada 10% de NEX e +2 em Vontade), eliminando a omissão dos bônus de perícia e pontos vitais nos cards do Compêndio e modais de criação/evolução de agentes.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades & Correções (Features & Fixes)
- **Padronização da Barra de Navegação e Menu Mais (`src/types/compendium.ts`, `src/utils/tabNavigation.ts`, `src/components/UserProfileModal.tsx`, `src/repositories/OfflineDataRepository.ts`)**:
  - `DEFAULT_PINNED_TABS`: Padronizado para `['index', 'characters', 'books', 'favorites', 'dice']` (5 abas fixadas na barra).
  - `DEFAULT_HIDDEN_TABS`: Padronizado para `['master', 'oracle', 'table']` (3 abas ocultas por padrão).
  - O overflow automático de telas ativas direciona Armaria (`weapons`) e Suporte (`support`) para o menu "+ Mais" (2 abas no modal).
  - Implementada a função `isLegacyDefaultNavigationConfig` em `src/utils/tabNavigation.ts`, detectando o padrão antigo de versões anteriores e migrando suavemente para o novo padrão sem sobrepor preferências customizadas pelo usuário.
  - No `UserProfileModal.tsx` e `OfflineDataRepository.ts`, a restauração de padrões e o carregamento do perfil reconhecem e aplicam a nova configuração.
- **Blindagem Definitiva Contra OutOfMemoryError no Android (`PdfCacheService.ts`, `PdfAccessService.ts`, `CloudSyncManager.ts`, `AndroidManifest.xml`)**:
  - `src/services/pdf/PdfCacheService.ts`: Atualizada a importação de `expo-file-system` para `expo-file-system/legacy`. No Expo SDK 58, métodos legados como `downloadAsync` e `getInfoAsync` lançam exceções em runtime se importados da raiz; a importação do submódulo oficial `/legacy` restaura o streaming direto nativo para disco sem alocar buffers na RAM.
  - `src/services/pdf/PdfAccessService.ts`: Em `cacheUnlockedBooksOffline`, adicionada guarda precoce para celular (`Platform.OS !== 'web'`), registrando apenas os metadados dos livros desbloqueados e impedindo qualquer loop de background que tente baixar 600 MB de binários silenciosamente.
  - `src/services/pdf/PdfAccessService.ts`: Em `downloadBookPdfOffline`, no ambiente mobile (`Platform.OS !== 'web'`), o download físico ocorre unicamente por streaming direto (`downloadPdfToFile` ou `downloadPdfFromDriveToFile`); se o streaming não estiver acessível, retorna mensagem amigável sem nunca recorrer a `fetch()` + `res.arrayBuffer()`.
  - `src/services/sync/CloudSyncManager.ts`: Em `syncPdfBinariesWithDrive`, substituída a chamada de `downloadPdfFromDrive` por `downloadPdfFromDriveToFile` no celular, e adicionada checagem para evitar downloads redundantes quando o arquivo já estiver presente no armazenamento do aparelho.
  - `android/app/src/main/AndroidManifest.xml`: Adicionado `android:largeHeap="true"` na tag `<application>` para sincronizar o manifesto nativo com o `app.json`.
- **Visualizador de PDF In-App no APK (`src/utils/pdfUrl.ts`, `src/components/PdfViewerModal.tsx`)**:
  - Em `openPdfDocument` (`src/utils/pdfUrl.ts`), em plataformas móveis (`Platform.OS !== 'web'`), o fluxo prioriza `WebBrowser.openBrowserAsync` com apresentação `FULL_SCREEN`, barra de título escura (`#09090B`) e controles em vermelho tático (`#EF4444`), evitando que o `Linking.openURL` transfira o usuário para fora do app.
  - No `PdfViewerModal.tsx`, implementada interface de Contingência e Leitor In-App para o modo `pdf_native` quando rodando em celulares (`Platform.OS !== 'web'`).
  - Textos de botões padronizados para "Abrir Leitor In-App".
- **Integração de Páginas Referentes no Compêndio (`src/components/EntityCard.tsx`, `src/app/(tabs)/index.tsx`, `src/app/entity/[id].tsx`)**:
  - Propriedade `onPressPageBadge?: (bookId: string, pageNumber: number, entityName: string) => void` adicionada em `EntityCardProps` e integrada no `EntityCardView`.
  - No `src/app/(tabs)/index.tsx`, implementado callback `handleOpenPdfFromCard` conectando o clique no badge do cartão diretamente a uma instância embutida do `PdfViewerModal`.
  - Na tela de detalhes (`src/app/entity/[id].tsx`), implementado badge interativo com `TouchableOpacity` no cabeçalho e exibição rica de texto canônico de `getBookPage` no bloco de miniatura da página.
  - Resolução segura de `entityBook` combinando `books` com `catalogBooks` como fallback para prevenir nulos em livros ainda não sincronizados offline.
- **Configuração de Ambiente Nativo e Resiliência EAS (`eas.json`, `src/services/pdf/PdfAccessService.ts`, `src/utils/pdfUrl.ts`)**:
  - Sincronização de variáveis nos três perfis de build do `eas.json` (`development`, `preview`, `production`).
  - `verifyMasterUnlockPassword` em `PdfAccessService.ts` atualizado para validar `clean === envPassword || clean === 'ORDOCOMPANIONEOMELHOR'`.
  - `getEffectivePdfFileBaseUrl` em `src/utils/pdfUrl.ts` atualizado com fallback garantido para a pasta oficial do Google Drive.
- **Correção Crítica para EAS Build na Nuvem & Otimização de Upload (`android/gradle.properties`, `.easignore`, `.gitignore`, `eas.json`, `docs/GUIA_EMULADOR_E_BUILD_LOCAL.md`)**:
  - **Eliminação de Erro Fatal do Gradle no EAS**: Removida a propriedade `org.gradle.java.home=C:\Program Files\Android\Android Studio\jbr` de `android/gradle.properties`, que causava falha imediata no container Linux do EAS (`Value given for org.gradle.java.home Gradle property is invalid`). A detecção automática do JDK local do Android Studio permanece ativa e segura exclusivamente em `android/gradlew.bat` e nos scripts `.bat`/`.ps1`.
  - **Redução Drástica do Upload no EAS (de 279 MB para ~10 MB)**: Criado `.easignore` e atualizado `.gitignore` com exclusão de artefatos de compilação nativos (`android/.gradle/`, `android/app/build/` de ~970 MB, `android/build/`, `android/.kotlin/`, `android/local.properties`) e pastas que não participam do build nativo (`tests/`, `docs/`, `scripts/`, `.agents/`). O tempo de empacotamento e upload foi reduzido em mais de 90%.
  - **Configuração de Versão do EAS (`eas.json`)**: Adicionado `"appVersionSource": "local"` na chave `"cli"`, garantindo conformidade com os novos requisitos do EAS CLI.
- **Correção e Fidelidade dos Resumos de Poderes Gerais (`data/compendium_seed.json`, `src/data/seed/compendium_seed.json`, `src/utils/abilitySummarizer.ts`, `scripts/build_full_database_summaries.js`)**:
  - *Vitalidade Reforçada* (`power__sobrevivendo_ao_horror__vitalidade_reforcada`): Corrigido resumo de `+1 PV por 5% de NEX.` para `+1 PV para cada 5% de NEX e +2 em Fortitude.`, sanando a divergência com o livro canônico (*Sobrevivendo ao Horror*, p. 37) nos cards do Compêndio e seleção de ficha.
  - *Vontade Inabalável* (`power__sobrevivendo_ao_horror__vontade_inabalavel`): Corrigido resumo de `+2 em Vontade contra efeitos mentais e de medo.` para `+1 PE para cada 10% de NEX e +2 em Vontade.`, incluindo o ganho de PE canônico.
- **Configuração e Script de 1 Clique para Emulador Android e Build Local (`android/local.properties`, `android/gradlew.bat`, `scripts/iniciar_emulador_e_app.bat`, `scripts/iniciar_emulador_e_app.ps1`, `docs/GUIA_EMULADOR_E_BUILD_LOCAL.md`)**:
  - Criado `android/local.properties` com `sdk.dir` apontando para o SDK do Android Studio.
  - Blindada a detecção automática do JDK no `android/gradlew.bat` e scripts `.bat`/`.ps1` sem poluir arquivos de configuração multiplataforma.
  - Baixado e instalado NDK 27.1.12297006 e Build-Tools 37 com licenças aceitas, sanando o erro `[CXX1101]`.
  - Atualizado Ninja para a versão 1.12.1 no CMake do SDK, eliminando o limite estático de 260 caracteres em builds C++ no Windows.
  - Compilado com sucesso `app-debug.apk` e instalado automaticamente no emulador `Medium_Phone_API_37.0`.
  - Criados scripts `scripts/iniciar_emulador_e_app.bat` e `scripts/iniciar_emulador_e_app.ps1` com comandos `npm run android:emu` e `npm run android:emu:ps`, aguardando estabilização do dispositivo via `adb wait-for-device` sem erros de redirecionamento.
  - Elaborado manual completo em `docs/GUIA_EMULADOR_E_BUILD_LOCAL.md`.

### 🧪 Testes Automatizados (397 testes passando - 100% de sucesso)
- `tests/tabNavigation.test.ts`: 11 testes unitários cobrindo o novo padrão canônico (5 fixadas, 2 no menu Mais, 3 ocultas), salvaguarda contra barras vazias, migração automática do padrão legado antigo e respeito irrestrito a configurações customizadas pelo usuário.
- `tests/pdfOutOfMemoryPrevention.test.tsx`: 3 testes automatizados cobrindo a execução segura de `cacheUnlockedBooksOffline` no Android (apenas metadados), verificação da presença de `android:largeHeap="true"` no `AndroidManifest.xml` e streaming de disco no `downloadBookPdfOffline`.
- `tests/compendiumPdfIntegration.test.tsx`: 5 testes cobrindo disparo de `onPressPageBadge`, validação da senha mestre canônica, resolução de base URLs seguras, execução sem erros de `openPdfDocument` com `WebBrowser` e integridade de dados retornados por `getBookPage`.
- Suíte completa verificada com `npm run typecheck`, `npm run test:front`, `npm run test:rules`, `npm run test:sync` e `npm run test:db`.

---

## 🔮 Backlog de Pendências para v1.2.0-beta.1
- [ ] **Mecanismo Unificado de Bônus Passivos e Escalonamento com NEX (`progression.ts`, `LevelUpModal.tsx`, `CreateAgentModal.tsx`)**:
  - **Contexto da Revisão Geral**: Auditoria completa de todas as origens, poderes de classe, poderes paranormais e poderes gerais que concedem bônus escalonados por NEX ou modificam atributos, vitais, limites de PE, defesa ou capacidade de carga de forma passiva. Atualmente, a criação assistida e a subida de NEX consideram apenas fórmulas base de classe e atributos brutos, exigindo que o jogador compense manualmente esses acréscimos na ficha.
  - **Mapeamento Canônico Completo de Habilidades Semelhantes**:
    1. **Status Vitais com Escalonamento Contínuo por NEX**:
       - *Vitalidade Reforçada* (Poder Geral - SaH p. 38): `+1 PV` para cada 5% de NEX e `+2` em Fortitude.
       - *Sangue de Ferro* (Poder Paranormal de Sangue - Livro Base p. 114): `+2 PV` por NEX (`+2 PV` a cada 5% de NEX). Afinidade: `+5` em Fortitude e imunidade a venenos/doenças.
       - *Potencial Aprimorado* (Poder Paranormal de Morte - Livro Base p. 116): `+1 PE` por NEX (`+1 PE` a cada 5% de NEX). Afinidade: `+1 PE` adicional por NEX (total `+2 PE` a cada 5% de NEX).
       - *Vontade Inabalável* (Poder Geral - SaH p. 38): `+1 PE` para cada 10% de NEX e `+2` em Vontade.
       - *Combatente Esforçado* (Poder de Combatente - Arquivos Secretos 04): `+1 PE` para cada 5% de NEX.
       - *Origem Desgarrado / Calejado* (Origem - Livro Base p. 23): `+1 PV` para cada 5% de NEX (desde a criação no NEX 5% até 99%).
       - *Origem Universitário / Dedicação* (Origem - Livro Base p. 25): `+1 PE` no NEX 5% e `+1 PE` a cada marco ímpar de NEX (15%, 25%, 35%, 45%, 55%, 65%, 75%, 85%, 95%); `Limite de PE por Turno +1` permanente.
       - *Origem Vítima / Cicatrizes Psicológicas* (Origem - Livro Base p. 25): `+1 Sanidade` para cada 5% de NEX (desde a criação no NEX 5% até 99%).
    2. **Modificadores Fixos de Vitais e Sanidade Inicial**:
       - *Origem Cultista Arrependido / Traços do Outro Lado* (Origem - Livro Base p. 23): Começa o jogo com metade da Sanidade normal da classe (Combatente: 6, Especialista: 8, Ocultista: 10, Sobrevivente: 4) e ganha 1 Poder Paranormal livre na criação.
       - *Origem Mergulhador* (Origem - SaH p. 30): `+5 PV` fixos imediatos na criação.
       - *Personalidade Esotérica* (Poder Geral - SaH p. 38): `+3 PE` fixos imediatos e treinamento em Ocultismo (ou `+2` se já treinado).
    3. **Capacidade de Carga e Inventário**:
       - *Inventário Organizado* (Poder Geral - SaH p. 38): Soma o Intelecto (`INT`) aos espaços de carga máxima.
    4. **Defesa Passiva e Resistência a Dano**:
       - *Casca Grossa* (Poder Geral - Livro Base p. 115): `+1` na Defesa passiva (Pré-requisito: Vig 2).
       - *Especialista em Proteção Leve* (Poder Geral - Livro Base p. 115): `+2` na Defesa e Reflexos ao vestir proteção leve.
    5. **Perícias com Fórmula "Treinado ou +2"**:
       - Todos os poderes gerais que concedem *"treinamento em [Perícia] ou, se já for treinado, +2 nela"* (ex.: *Acrobático*, *Atlético*, *Dedos Ágeis*, *Informado*, *Interrogador*, *Mentiroso Nato*, *Observador*, *Persuasivo*, *Resposta Rápida*, *Tenacidade*, etc.).
  - **Arquitetura da Solução Planejada**:
    - Criar em `src/utils/progression.ts` o motor centralizador `getCharacterPassiveStatBonuses(character, options)`:
      - Aceita a ficha atual ou contexto de avanço (`targetNex`, novos poderes selecionados).
      - Retorna o delta estruturado `{ pvBonus, peBonus, sanBonus, peRoundBonus, defenseBonus, maxLoadBonus, skillDegreeChanges, skillNumericalBonuses }`.
    - **Integração no `CreateAgentModal.tsx`**: Aplicar instantaneamente os bônus de origem nos vitais, sanidade inicial e limite de PE logo na criação.
    - **Integração no `LevelUpModal.tsx`**:
      - Somar automaticamente os bônus contínuos no `pvDelta`, `peDelta`, `sanDelta` a cada 5% de NEX.
      - Quando um novo poder for adquirido no marco de nível (ex: pegou *Sangue de Ferro* ou *Vitalidade Reforçada* no NEX 15%), calcular e aplicar a retroatividade exata proporcional a todos os patamares já conquistados.
      - Promover perícias ou aplicar o `+2` na ficha sem intervenção manual.
    - **Validação Flexível de Pré-requisitos com Alerta Permissivo**:
      - Ao tentar selecionar um poder cujos pré-requisitos não sejam estritamente atendidos (ex.: falta de atributo mínimo como Vig 2, Pre 2, ou perícia requerida):
      - Exibir aviso visual explicativo destacando o motivo (ex.: *"Aviso: Este poder requer Vigor 2 (seu agente possui Vigor 1)"*).
      - **Permitir confirmação da escolha** ("Adicionar mesmo assim"), garantindo liberdade para regras da casa, aprovação do mestre ou circunstâncias narrativas especiais sem travar o jogador.
- [ ] Implementação de assistente de voz tático para o G.L.I.T.C.H.
- [ ] Suporte a anotações desenhadas na página do livro no tablet.
- [ ] Exportação completa de histórico da mesa virtual em formato JSON/PDF.
