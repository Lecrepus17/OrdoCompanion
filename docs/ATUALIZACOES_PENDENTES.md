# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.1.0-beta.3`  
> **Versão Sugerida**: `1.2.0-beta.2` (Motivo: [Minor] Recálculo e escalonamento automático de vitais por NEX e bônus passivos, alerta permissivo de pré-requisitos, comando e resposta por voz no G.L.I.T.C.H., exportação de sessões em JSON/PDF tático na Mesa Virtual, assistente de proteções/defesa, proficiências e bônus de vestimentas/utensílios)  
> **Última Atualização**: 2026-11-02 14:43

---

## 🚀 Resumo do Próximo Release v1.2.0-beta.2 (Changelog de Usuário)

* **Recálculo e Escalonamento Automático de Vitais por NEX e Bônus Passivos**:
  * **Motor Unificado de Vitais (`progression.ts`)**: Cálculo automático e retroativo de PV, PE, SAN, Limite de PE/Rodada e DT de Rituais integrando classes (*Combatente*, *Especialista*, *Ocultista*, *Sobrevivente*), poderes progressivos (*Vitalidade Reforçada*, *Sangue de Ferro* com afinidade, *Potencial Aprimorado* com afinidade, *Vontade Inabalável*, *Combatente Esforçado*) e origens (*Desgarrado*, *Universitário*, *Vítima*, *Cultista Arrependido*, *Mergulhador*, *Personalidade Esotérica*).
  * **Concessão Automática de Bônus Passivos em Perícias**: Aplicação e sincronização automática dos bônus passivos de Fortitude (`+2` em *Vitalidade Reforçada*, `+5` em *Sangue de Ferro* com afinidade) e Vontade (`+2` em *Vontade Inabalável*).
  * **Integração Completa nos Modais e na Ficha**: `CreateAgentModal.tsx` aplica vitais de origem desde a criação; `LevelUpModal.tsx` recalcula ganhos retroativos por NEX ao adquirir poderes passivos; e `characters.tsx` mantém vitais e perícias sincronizados ao recalcular ou vincular poderes.
  * **Alerta Permissivo de Pré-Requisitos ("Adicionar mesmo assim")**: Ao selecionar poderes ou entidades cujos pré-requisitos ainda não são atendidos, exibe confirmação informativa permitindo prosseguir sem bloqueio forçado.
* **Comando e Resposta por Voz no Assistente G.L.I.T.C.H. (Speech-to-Text & Text-to-Speech)**:
  * **Ditado por Microfone na Barra de Mensagens**: Novo botão de microfone tático integrado na barra de envio do G.L.I.T.C.H. (`oracle.tsx`), permitindo ditar perguntas diretamente ao assistente com transcrição em tempo real, visualizador de estado de escuta e detecção de encerramento.
  * **Leitura de Respostas por Voz (TTS)**: Mecanismo de Text-to-Speech com higienização inteligente que remove tags internas, marcações markdown, blocos de código e fórmulas LaTeX para fala natural e compreensível.
  * **Filtro de Tom & Estática Militar Opcional**: Ajuste de pitch (~0.88) e cadência tática (~1.08) para transmitir a autoridade operacional da Ordem, finalização padronizada com "Câmbio." e sintetizador de estática sonora (squelch de rádio) puramente em Web Audio API sem necessidade de internet ou arquivos externos.
  * **Controles Integrados no Modal de Configurações**: Seção de voz no `AiConfigModal.tsx` com toggles para ativação geral de voz, leitura automática de novas respostas, filtro militar e botão para testar a prévia de voz do assistente.
  * **Ação Rápida de Leitura nas Mensagens do Chat**: Botão "Ouvir" / "Parar" no cabeçalho de cada resposta emitida pelo assistente (`AiChatMessageItem.tsx`), permitindo reproduzir e pausar a leitura sob demanda.
* **Exportação Completa do Histórico de Sessão da Mesa Virtual (JSON & PDF Tático)**:
  * **Exportação Completa de Logs da Sessão**: O mestre agora pode exportar todos os registros da sessão da Mesa Virtual diretamente pelo cabeçalho da mesa ou na aba de Rolagens (`table.tsx`).
  * **Exportação em JSON Estruturado**: Gera arquivo `.json` completo contendo dados rolados brutos (`diceResults`, `chosenDie`), fórmulas, modificadores e bônus de combate, danos sofridos pelos agentes e criaturas (`damageSuffered`), trilha ordenada de iniciativas e eventos de cena com pistas descobertas e ocultas.
  * **Dossiê Tático em PDF Oficial da Ordo Realitas**: Gera resumo tático de alta resolução via `expo-print` no tema militar/investigativo escuro, formatado com painel de métricas operacionais, tabela do esquadrão de agentes (PV, PE, SAN, DEF, Condições), trilha de iniciativa de combate e registro cronológico de ações.
  * **Compartilhamento Nativo via Expo Sharing**: Integração com `expo-sharing` permitindo compartilhar o JSON ou PDF diretamente para mensageiros, Drive, e-mail ou salvar no dispositivo (com fallback transparente para download de Blob na Web).
* **Assistente Interativo de Proteções e Defesa na Ficha de Personagem**:
  * **Modal Assistente de Proteções**: Acessível diretamente pelo botão "Assistente" no card de Defesa da ficha do agente (`characters.tsx`).
  * **Catálogo Oficial e Customizado**: Permite selecionar armaduras corporais (Proteção Leve, Proteção Pesada) e escudos (Escudo, Escudo Balístico LED) do compêndio oficial ou definir itens customizados com modificações canônicas (*Reforçada*, *Blindada*, *Antibombas*, *Discreta*).
  * **Cálculo Automático de Defesa e RD**: Preenche automaticamente o bônus de Defesa de equipamento (`defenseEquip`), resistências a dano (RD física e balística) e preserva a fórmula canônica da Defesa Total (`10 + AGI + Equipamento + Outros`).
  * **Sincronização com Inventário**: Atualiza instantaneamente os itens selecionados no inventário do agente, marcando-os como equipados (`equipped: true`) e somando os espaços de carga ocupados.
* **Verificação Canônica de Proficiência em Armas e Proteções**:
  * **Motor Inteligente de Proficiências**: Reconhece automaticamente as proficiências do agente com base em sua classe (Combatente, Especialista, Ocultista, Sobrevivente), origem (*Treinado pela Hell Hunters*, *Operário*) e poderes ativos (*Armamento Pesado*, *Proteção Pesada*, *Balística Avançada*, *Ninja Urbano*, *Atirador de Elite*).
  * **Alertas Visuais na Ficha e Armaria**: Exibe badges explícitos `⚠️ Não Proficiente (-2d20)` nos cards de ataque de armas desprovidas de proficiência, banner de alerta vermelho na seção de Defesa ao trajar armaduras pesadas/escudos sem proficiência, e chips coloridos por categoria (`Simples`, `Tática`, `Pesada`) na Armaria (`weapons.tsx`).
  * **Penalidades Canônicas Automáticas (-2d20)**: Aplica redução de 2 dados nos testes de ataque com armas sem proficiência, e penalidade de -2d20 em testes baseados em Força e Agilidade e defesas ativas (Esquiva, Contra-ataque, Iniciativa) ao equipar proteções sem proficiência, acionando automaticamente a mecânica de desvantagem quando os dados resultarem em $\le 0$.
* **Sistema Didático de Bônus de Vestimentas e Utensílios em Perícias**:
  * **Classificação e Bônus de Itens no Inventário**: Modal de item expandido com seletor segmented (`Geral`, `Vestimenta`, `Utensílio`), escolha de bônus (`+2` normal ou `+5` aprimorado) e campo de justificativa narrativa para validação com o mestre.
  * **Painel Didático e Limite Canônico de 2 Vestimentas**: Card `Vestimentas Ativas: X/2` no topo da aba de Inventário com botão de ação rápida (*Vestir/Despir*, *Empunhar/Guardar*) e alerta visual preventivo caso o jogador exceda o teto oficial de 2 vestimentas simultâneas.
  * **Veto Canônico a Luta e Pontaria**: Regra do Livro Base p. 63 aplicada estritamente, impedindo que vestimentas ou utensílios forneçam bônus em perícias de ataque físico.
  * **Reflexão Automática em Perícias e Rolagens**: A aba Perícias soma automaticamente o bônus de itens ativos ao total da perícia, exibe badge discriminando o item (`+2 (Vestimenta: Jaqueta)`) e detalha a origem do bônus no histórico e Toast de rolagem.
* **Novo Padrão Canônico da Barra de Abas & Menu "+ Mais"**:
  * **Abas Fixadas na Barra Inferior (5)**: Compêndio (`#1`), Agentes (`#2`), Livros (`#3`), Salvos (`#4`) e Dados (`#5`) são as telas principais por padrão.
  * **Abas no Menu "+ Mais" (2)**: Armaria e Suporte organizadas no modal de opções complementares.
  * **Abas Ocultas por Padrão (3)**: Central do Mestre, G.L.I.T.C.H. e Mesa Virtual iniciam desativadas da navegação (com o assistente G.L.I.T.C.H. acessível pelo botão de brilho no cabeçalho).
  * **Respeito Integral às Preferências do Usuário**: Perfis personalizados mantêm suas escolhas intactas e perfis legados são migrados suavemente.
* **Correção Crítica de OutOfMemoryError no APK Android (`java.lang.OutOfMemoryError`)**:
  * Eliminado crash espontâneo de alocação de ~84 MB na memória heap ao tentar baixar o livro *Sobrevivendo ao Horror*.
  * O download e cache automático de PDFs em segundo plano no celular grava apenas metadados (consumo ZERO de RAM).
  * Migrado o `expo-file-system` para a importação oficial `/legacy`, restaurando o streaming nativo direto para disco (`downloadAsync`).
  * Inserida a flag `android:largeHeap="true"` no `AndroidManifest.xml`.
* **Leitura de PDFs In-App no Celular & Páginas Referentes no Compêndio**:
  * Leitura de PDFs abre diretamente através do navegador integrado in-app em tela cheia (Chrome Custom Tabs).
  * Badge de fonte no rodapé de cada cartão do Compêndio (`Livro • pág. X`) é clicável, abrindo instantaneamente o leitor na página exata.
* **Fidelidade Canônica nos Resumos dos Poderes Gerais (Compêndio & Ficha)**:
  * *Vitalidade Reforçada*: `+1 PV para cada 5% de NEX e +2 em Fortitude.`
  * *Vontade Inabalável*: `+1 PE para cada 10% de NEX e +2 em Vontade.`

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades (Features)

- **Recálculo e Escalonamento Automático de Vitais por NEX e Alerta Permissivo (`src/utils/progression.ts`, `src/components/CreateAgentModal.tsx`, `src/components/LevelUpModal.tsx`, `src/app/(tabs)/characters.tsx`, `tests/progression.test.ts`)**:
  - `src/utils/progression.ts`: Implementação de `calculateMaxStats`, `detectVitalsModifiers`, `calculateCharacterVitals`, `confirmUnmetPrerequisites`, `applyCanonicalSkillGrant` e `checkRitualPrerequisites` cobrindo bônus progressivos e fixos de todas as classes, poderes e origens canônicas.
  - `src/components/CreateAgentModal.tsx`: Cálculo de vitais iniciais em 5% NEX (ou 0% Sobrevivente) integrando modificadores da origem selecionada.
  - `src/components/LevelUpModal.tsx`: Cálculo diferencial retroativo de PV, PE, SAN e bônus de perícias, além de alerta permissivo ao selecionar poderes com pré-requisitos pendentes.
  - `src/app/(tabs)/characters.tsx`: Remoção de função duplicada e sincronização de vitais e perícias no recálculo e na vinculação de registros do compêndio com alerta permissivo.
  - `tests/progression.test.ts`: Adicionados 64 novos testes unitários validando todas as fórmulas, origens, acúmulos (stacking), casos limítrofes e helpers de pré-requisitos (totalizando 132 testes em `npm run test:rules`).
- **Comando e Resposta por Voz no Assistente G.L.I.T.C.H. (`src/services/ai/GlitchVoiceService.ts`, `src/types/ai.ts`, `src/components/AiConfigModal.tsx`, `src/components/AiChatMessageItem.tsx`, `src/app/(tabs)/oracle.tsx`, `tests/glitchVoice.test.ts`, `tests/frontendOracle.test.tsx`)**:
  - `src/services/ai/GlitchVoiceService.ts`: Serviço unificado de voz para Web e Mobile com suporte a Speech-to-Text (`SpeechRecognition`), Text-to-Speech (`SpeechSynthesis`), sintetizador sonoro de estática e clique de rádio tático militar em Web Audio API e função pura `cleanTextForTts` para higienização de tags, markdown e fórmulas LaTeX.
  - `src/types/ai.ts`: Extensão do modelo `AiConfig` e `DEFAULT_AI_CONFIG` com os parâmetros `voiceEnabled`, `voiceAutoRead`, `voiceMilitaryTone`, `voiceLanguage`, `voicePitch` e `voiceRate`.
  - `src/components/AiConfigModal.tsx`: Seção dedicada "Comandos e Respostas por Voz" com switches de ativação geral, leitura automática de respostas, filtro militar e botão interativo para ouvir a prévia da voz do assistente.
  - `src/components/AiChatMessageItem.tsx`: Integração de botão "Ouvir" / "Parar" no cabeçalho das mensagens emitidas pelo G.L.I.T.C.H., com controle de reprodução sob demanda.
  - `src/app/(tabs)/oracle.tsx`: Inclusão do botão de microfone na barra de mensagens (`testID="voice-mic-button"`), banners contextuais de status ("🎙️ Ouvindo comando de voz...", "🔊 Transmitindo resposta em áudio..."), leitura automática de respostas quando configurada e limpeza de listeners ao desmontar a tela.
  - `tests/glitchVoice.test.ts` e `tests/frontendOracle.test.tsx`: Adicionados testes de higienização de texto, efeito militar, mocks de STT/TTS e validação de componentes visuais de voz.
- **Exportação de Histórico de Sessão da Mesa Virtual (`src/services/virtualTable/tableSessionExportService.ts`, `src/components/virtualTable/TableExportModal.tsx`, `src/app/(tabs)/table.tsx`)**:
  - `tableSessionExportService.ts`: Funções puras `buildTableSessionExportData`, `generateTacticalPdfHtml`, `exportSessionToJsonFile` e `exportSessionToPdfFile` para estruturação de dados de sessão, métricas de combate e compilação de HTML tático da Ordem.
  - `TableExportModal.tsx`: Modal temático com métricas resumidas da sessão em tempo real (rolagens, críticos, desastres, combatentes, pistas) e botões de ação para exportar JSON estruturado ou gerar PDF tático.
  - `table.tsx`: Integração de botão de exportação no cabeçalho exclusivo para o Mestre da mesa (`testID="table-export-session-btn"`) e na aba de rolagens (`testID="table-export-rolls-btn"`).
  - `tests/setup.ts`: Adicionado mock nativo de `expo-sharing` (`isAvailableAsync`, `shareAsync`, `mockShareCalls`) e `writeAsStringAsync` em `expo-file-system`.
- **Assistente de Proteções e Defesa na Ficha (`src/components/ProtectionModal.tsx`, `src/utils/protections.ts`, `src/app/(tabs)/characters.tsx`)**:
  - `src/components/ProtectionModal.tsx`: Componente de modal completo permitindo seleção de armadura leve, pesada, escudo e customizados, seleção de modificações oficiais (*Reforçada*, *Blindada*, *Antibombas*, *Discreta*) com prévia em tempo real de Defesa, RD e espaços de carga ocupados.
  - `src/utils/protections.ts`: Funções canônicas `calculateEquippedProtections`, `parseDamageResistances`, `formatDamageResistances`, `sanitizeArmorModifications` e catálogo `OFFICIAL_PROTECTIONS`.
  - `src/app/(tabs)/characters.tsx`: Integração do modal no botão "Assistente" do card de Defesa, atualização automática dos estados `defenseEquip`, `resistances` e sincronização bidirecional com o inventário da ficha.
- **Motor Canônico e Avisos de Proficiências (`src/utils/proficiencies.ts`, `src/app/(tabs)/weapons.tsx`, `src/app/(tabs)/characters.tsx`)**:
  - `src/utils/proficiencies.ts`: Módulo de resolução pura `getCharacterProficiencies`, `checkWeaponProficiency`, `checkProtectionProficiency` e `getProtectionDicePenalty`.
  - `src/app/(tabs)/weapons.tsx`: Exibição de badges coloridos de proficiência nos cards de armas e aviso explícito de não-proficiência ao selecionar o agente no modal de equipar.
  - `src/app/(tabs)/characters.tsx`: Alertas visuais `⚠️ Não Proficiente (-2d20)` nos cards de ataque e no banner de Defesa. Redução de 2 dados (`Math.max(-5, attrVal - 2)`) em rolagens de ataque e testes de Força/Agilidade sem proficiência.
- **Sistema Didático de Vestimentas e Utensílios em Perícias (`src/utils/inventorySkills.ts`, `src/app/(tabs)/characters.tsx`)**:
  - `src/utils/inventorySkills.ts`: Funções `calculateActiveItemSkillBonuses`, `isClothingItem`, `isUtensilItem` e `isBannedItemSkill`. Enforce de teto de até 2 vestimentas ativas, regra do maior bônus (`Math.max`) e veto a Luta e Pontaria.
  - `src/app/(tabs)/characters.tsx`: Modal de criação e edição manual de itens com campos dedicados para tipo, perícia alvo, bônus (+2/+5) e justificativa. Painel didático de contagem `Vestimentas Ativas: X/2` no topo do inventário e botão rápido de toggle equipar. Reflexão em tempo real na aba Perícias com badge de item.
- **Padronização da Barra de Navegação e Menu Mais (`src/types/compendium.ts`, `src/utils/tabNavigation.ts`, `src/components/UserProfileModal.tsx`, `src/repositories/OfflineDataRepository.ts`)**:
  - Padronização de 5 abas fixadas na barra inferior, 2 no menu Mais e 3 ocultas por padrão com migração transparente de configurações legadas.
- **Blindagem Contra OutOfMemoryError no Android (`PdfCacheService.ts`, `PdfAccessService.ts`, `CloudSyncManager.ts`, `AndroidManifest.xml`)**:
  - Streaming nativo para disco com `expo-file-system/legacy`, supressão de download de binários no celular e `android:largeHeap="true"`.
- **Visualizador de PDF In-App e Páginas no Compêndio (`src/utils/pdfUrl.ts`, `src/components/PdfViewerModal.tsx`, `src/components/EntityCard.tsx`, `src/app/entity/[id].tsx`)**:
  - Visualizador in-app via `WebBrowser.openBrowserAsync`, badges clicáveis no Compêndio e integração de miniaturas de páginas de livros.

### 🧪 Testes Automatizados (572 testes passando - 100% de sucesso)

- `tests/progression.test.ts`: 115 testes unitários cobrindo todas as fórmulas de progressão, vitais por NEX, bônus passivos de poderes e origens, alerta permissivo de pré-requisitos e concessão canônica de perícias (`132/132` em `npm run test:rules`).
- `tests/tableExport.test.tsx`: 6 testes automatizados cobrindo cálculo de métricas de sessão, danos sofridos, iniciativas e pistas em `buildTableSessionExportData`, compilação do HTML do PDF tático militar, geração/compartilhamento de JSON e PDF via Expo Sharing e renderização de botões do mestre no `TableScreen` e `TableExportModal`.
- `tests/rulesProtections.test.ts`: 17 testes cobrindo catálogo oficial de proteções, modificações (Reforçada, Blindada, Discreta), cálculo de Defesa e acúmulo com escudos.
- `tests/rulesProficiencies.test.ts`: 22 testes cobrindo proficiências de classe, upgrades cumulativos (Hell Hunters), poderes e penalidade de -2d20 por falta de proficiência.
- `tests/rulesInventorySkills.test.ts`: 15 testes cobrindo teto de 2 vestimentas equipadas, não-cumulatividade (maior bônus) e veto canônico a Luta/Pontaria.
- `tests/defenseProtections.test.ts`: 19 testes de integração do modal de proteção, cálculo e preenchimento de Defesa, RD e sincronização com inventário.
- `tests/proficienciesAndClothing.test.ts`: 20 testes de regras de proficiências, penalidades de -2d20 de ataque e proteção e vestimentas didáticas.
- `tests/frontendCharacters.test.tsx`: 11 testes de frontend validando renderização de banners de proficiência, cards de ataque, contador de vestimentas e reflexão de bônus em perícias.
- `tests/tabNavigation.test.ts`: 11 testes cobrindo navegação canônica, menu Mais e migração de perfis legados.
- `tests/pdfOutOfMemoryPrevention.test.tsx`: 3 testes cobrindo prevenção de OOM e streaming de disco.
- `tests/compendiumPdfIntegration.test.tsx`: 5 testes cobrindo badges de páginas referentes e visualizador in-app.
- Suíte completa verificada com `npm run test:all`: **491 testes aprovados em 112 suítes, 0 falhas, 0 pendências**, e 1.371 entidades validadas em `test_database_integrity.py`.

---

## 🔮 Backlog de Pendências para v1.2.0-beta.2
- [x] **Mecanismo Unificado de Bônus Passivos e Escalonamento com NEX (`progression.ts`, `LevelUpModal.tsx`, `CreateAgentModal.tsx`, `characters.tsx`)**:
  - Automação de poderes e origens com escalonamento por NEX (*Vitalidade Reforçada*, *Sangue de Ferro*, *Potencial Aprimorado*, *Vontade Inabalável*, *Combatente Esforçado*, *Desgarrado*, *Universitário*, *Vítima*).
  - Bônus fixos de vitais (*Cultista Arrependido*, *Mergulhador*, *Personalidade Esotérica*).
  - Alerta permissivo de pré-requisitos não atendidos com opção de confirmação ("Adicionar mesmo assim").
- [x] Implementação de assistente de voz tático para o G.L.I.T.C.H.
- [ ] Suporte a anotações desenhadas na página do livro no tablet.
- [x] Exportação completa de histórico da mesa virtual em formato JSON/PDF (Concluído em table.tsx via expo-sharing e expo-print).

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.2.0-beta.2 "Recálculo automático de vitais por NEX, voz tática no G.L.I.T.C.H., exportação da mesa virtual e assistente de proteções"
```

---

## ✨ Validação Permissiva de Pré-requisitos e Perícias Canônicas (Atualização 2026-11-02)

* **Modal de alerta `PrerequisiteAlertModal.tsx`**: lista os requisitos pendentes de poderes/rituais com botões *Cancelar* e *Adicionar mesmo assim* (tema tático, funciona em Web/Android/iOS).
* **`CreateAgentModal.tsx`**: rituais de qualquer círculo e poderes iniciais opcionais passam por `checkRitualPrerequisites`/`checkPrerequisite`; fora do requisito abre o alerta.
* **`LevelUpModal.tsx`**: poderes de classe, paranormais, gerais e rituais (todos os círculos, via busca) usam o novo modal em vez do diálogo nativo.
* **Perícias canônicas (`applyCanonicalSkillGrant` / `extractCanonicalSkillGrants`)**: perícia nova concedida por origem/poder/trilha vira **Treinado**; se já treinado, recebe **+2 fixo**.
* **Testes**: `tests/prerequisiteAlert.test.tsx` (novo) e suíte 10 em `tests/progression.test.ts`. `npm run typecheck` e `npm run test:front` (148/148) passando.
