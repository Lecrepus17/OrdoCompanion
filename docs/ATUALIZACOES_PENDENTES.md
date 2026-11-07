# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual Publicada**: `1.3.0-beta.2` (Android `versionCode: 6`)  
> **Versão Sugerida**: `1.4.0-beta.1` (Motivo: Resolução dos 18 problemas reportados via screenshots, novo leitor com modos PDF/Texto e rolagem contínua, algoritmo de relevância aditiva no compêndio, presets customizados de dados, regras flexíveis de crítico, exportação real de cards em PNG/SVG, blindagem de suporte e rota OAuth)  
> **Última Atualização**: 2026-11-07 18:50

> [!IMPORTANT]
> **Isolamento Estrito de Ciclo**: Este arquivo acumula **exclusivamente** o que foi desenvolvido a partir da release `v1.3.0-beta.2` para a futura versão (`1.4.0-beta.1`). Tudo o que pertenceu a versões anteriores já se encontra registrado em `docs/HISTORICO_RELEASES.md`.

---

## 🚀 Resumo do Próximo Release v1.4.0-beta.1 (Changelog de Usuário)
- **Leitor de Livros e PDFs Renovado**: Escolha entre leitura visual direta do PDF e modo texto oficial, com alternador para rolagem contínua (estilo feed) ou página única, além de fallback automático e priorização de PDFs locais.
- **Busca Ponderada no Compêndio**: Algoritmo de relevância aditiva que prioriza correspondências exatas de título, prefixos e subtítulos, eliminando resultados imprecisos.
- **Rolador Livre com Presets Salvos**: Crie botões com suas próprias fórmulas de dados personalizadas (ex.: `2d20+5`, `3d6+1d8+3`) salvas no aparelho.
- **Configurações de Dano Crítico**: Escolha como prefere calcular críticos (multiplicar dados, multiplicar dano final, crítico máximo ou perguntar a cada rolagem) e atalho direto para a Armaria a partir da ficha.
- **Cards de Registro Táticos**: Exportação real e compartilhamento nativo em PNG e vetor SVG no celular, com espaçamento corrigido de subtítulos e sem repetição de texto redundante.
- **Resiliência e Suporte Ordo Realitas**: Nova rota de retorno para login do Google OAuth (`/oauthredirect`), download inteligente de novas versões via GitHub Releases se o link direto falhar, convite permanente do Discord, transparência no status de chamados de suporte e melhorias de voz e estabilidade na IA G.L.I.T.C.H.

---

## 📦 Detalhamento Técnico das Modificações

### ✨ Novas Funcionalidades (Features)

#### 📚 Leitor de Livros e Suplementos (Features 11, 12, 13, 14)
- `src/components/PdfViewerModal.tsx`: implementado seletor duplo no cabeçalho permitindo alternar entre "Leitura Direta PDF" e "Texto Oficial".
- `src/components/PdfViewerModal.tsx`: adicionado botão alternador entre "Rolagem Contínua" (usando `FlatList` virtualizada com renderização contínua das páginas extraídas) e "Página Única".
- `src/components/PdfViewerModal.tsx` & `src/app/(tabs)/books.tsx`: adicionado fallback inteligente para modo texto caso o carregamento do PDF direto falhe.
- `src/services/pdf/PdfAccessService.ts`: aprimorada a verificação local de arquivos PDF antes de efetuar consultas ao Google Drive, eliminando erros 404 e requisições desnecessárias.

#### 🔍 Compêndio & Busca Ponderada (Feature 10)
- `src/repositories/OfflineDataRepository.ts` & `src/types/compendium.ts`: implementado algoritmo de pontuação aditiva por relevância em `searchEntities`:
  - Correspondência exata de título: **+1000 pontos**
  - Correspondência de prefixo de título: **+500 pontos**
  - Correspondência em subtítulo / elemento: **+200 pontos**
  - Correspondência em tags: **+100 pontos**
  - Ocorrências no corpo da descrição: **+10 pontos**
  - Garantia de que itens com correspondência no título (ex.: "Metralhadora") sempre apareçam no topo sem serem obscurecidos por menções indiretas.

#### 🎲 Rolador de Dados & Dano Crítico (Features 15, 16, 17)
- `src/utils/dice.ts` & `src/components/UserProfileModal.tsx`: adicionado suporte canônico aos 4 modos de dano crítico: `multiply_dice` (padrão v1.1), `multiply_damage` (multiplica dano total), `max_damage` (faces máximas sem rolagem) e `ask_user` (solicita confirmação).
- `src/app/(tabs)/characters.tsx`: adicionado botão de atalho direto no card de armas/ataques para inspecionar e editar a arma na aba Armaria (`weapons.tsx`).
- `src/app/(tabs)/dice.tsx`: implementado sistema de fórmulas customizadas salvas no `AsyncStorage` (`@ordo_dice_custom_presets`), com validação sintática em tempo real, adição dinâmica e remoção por pressão longa.

#### 📇 Exportação de Cards de Registro (Features 18, 19, 20)
- `src/services/cardImage/cardExportService.ts`: implementado download e compartilhamento nativo de imagens nos formatos PNG e SVG via `expo-sharing` no Android, eliminando despacho forçado como documento PDF.
- `src/services/cardImage/svgCardRenderer.ts`: corrigido o espaçamento vertical de `subCategory`, prevenindo sobreposição com divisores e caixas de pré-requisitos.
- `src/services/cardImage/cardDataExtractor.ts`: implementada desduplicação de texto, suprimindo o campo `summary` caso ele seja idêntico ou redundante ao corpo da `description`.

#### 🛡️ Central de Suporte, Atualizações & OAuth (Features 1, 2, 3, 4)
- `src/app/oauthredirect.tsx` & `src/app/_layout.tsx`: criada rota `/oauthredirect` com `maybeCompleteAuthSession()` do Expo WebBrowser, prevenindo tela de "Unmatched Route" ao retornar do login do Google.
- `src/services/updates/UpdateCheckerService.ts` & `src/components/UpdateNotificationModal.tsx`: implementada cadeia resiliente de download com fallback automático para a página de releases do GitHub caso o asset direto do APK retorne 404.
- `src/services/support/SupportService.ts`: atualizado convite do Discord para URL permanente ativa (`https://discord.gg/vPCZzr2wFR`).
- `src/services/support/SupportService.ts` & `src/components/SupportCenterView.tsx`: implementada geração de protocolos com prefixo `ORD-`, transparência visual do canal de entrega (remoto via proxy/webhook vs local offline) e fechamento do teclado com `Keyboard.dismiss()`.
- `src/utils/secretObfuscator.ts`, `scripts/obfuscate_secrets.js`, `supabase/functions/support-webhook/index.ts`: implementado proxy seguro Supabase com ofuscação `obf:v1:`, validação `X-Ordo-Signature` e blindagem anti-spam (`@everyone`/`@here`).

#### 🔮 IA Paranormal G.L.I.T.C.H. & Interface (Features 5, 6, 7, 8, 9)
- `src/services/ai/AiClient.ts` & `src/components/AiConfigModal.tsx`: sanitização permissiva de chaves do Gemini (remoção de espaços acidentais e aspas).
- `src/services/ai/AiClient.ts`: fallback automático do Groq para `llama-3.1-8b-instant` caso o modelo `llama-3.3-70b-versatile` retorne 404 ou limite de cota 429.
- `src/services/ai/GlitchVoiceService.ts`: síntese vocal (TTS) defensiva em português (`pt-BR`) no Android sem lançar exceções.
- `src/services/ai/GlitchVoiceService.ts` & `src/app/(tabs)/oracle.tsx`: reconhecimento de voz (STT) com feedback gracioso orientando o uso do ditado por voz do teclado virtual no Android Hermes.
- `src/app/(tabs)/oracle.tsx`: inclusão de `ScrollView` responsivo no topo da tela do Oráculo, eliminando sobreposição dos chips de relíquias com o card de boas-vindas.

---

### 🐛 Correções de Bugs & Usabilidade (Fixes)
- `docs/imagensDosProblemas/`: limpos e resolvidos 100% dos 18 problemas documentados nas capturas de tela.
- `src/utils/dice.ts`: corrigido cálculo de dano crítico para armas com dano estático numérico puro sem dados.
- `src/components/SupportCenterView.tsx`: painel do desenvolvedor mantido exclusivamente em `__DEV__`.

---

### 🧪 Testes Automatizados
- **7 Novas Suítes E2E Homologadas (133 testes, 100% de sucesso)**:
  - `tests/compendiumSearchRanking.test.ts`: 21 testes cobrindo relevância, correspondência exata, prefixos, tags e sanitização.
  - `tests/pdfViewerModes.test.tsx`: 19 testes cobrindo alternância de modos, rolagem contínua, fallback e resiliência de PDF.
  - `tests/criticalDamageRules.test.ts`: 20 testes cobrindo os 4 modos de cálculo de crítico e armas estáticas.
  - `tests/dicePresets.test.ts`: 19 testes cobrindo fórmulas customizadas, persistência no AsyncStorage e validação.
  - `tests/cardLayoutAlignment.test.ts`: 12 testes cobrindo layout de subtítulo, desduplicação e exportação real PNG/SVG.
  - `tests/supportAndUpdates.test.ts`: 24 testes cobrindo OAuth redirect, download resiliente de APK, Discord permanente e transparência de suporte.
  - `tests/glitchResilience.test.ts`: 18 testes cobrindo sanitização Gemini, fallback Groq 8B, TTS/STT e layout do Oráculo.
- **Suíte Completa do Projeto (`npm run test:all`)**:
  - `npm run typecheck`: 0 erros de diagnóstico TypeScript.
  - `tsx --test`: **866 testes passando** em 205 suítes (0 falhas).
  - `python scripts/test_database_integrity.py`: 1.645 entidades verificadas em 10 suplementos oficiais.

---

## 🛠️ Comando para Gerar o Próximo Release
```bash
npm run release 1.4.0-beta.1
```
