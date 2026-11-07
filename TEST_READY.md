# 🛡️ Test Suite & Verification Report — TEST_READY.md

> **Status do Projeto**: ✅ Suíte de Testes E2E Pronta e Integrada  
> **Total de Testes E2E Novos**: **121 testes** em 7 suítes direcionadas (115 passing, 6 pending para marcos M3-M5)  
> **Total Acumulado de Testes**: **612 testes automatizados** em 66 suítes  
> **Checagem Estrita TypeScript (`npm run typecheck`)**: ✅ 0 erros de diagnóstico  
> **Integridade Referencial do Compêndio (`npm run test:db`)**: ✅ 1.371 entidades validadas em 10 suplementos oficiais  
> **Data de Homologação**: 2026-11-07  
> **Autor**: `teamwork_test_writer_e2e`  

---

## 1. Inventário de Testes E2E por Funcionalidade (Features 1 a 20)

| Arquivo de Teste | Funcionalidades Cobertas | Escopo / Marco | Cenários | Status Inicial |
| :--- | :--- | :---: | :---: | :---: |
| `tests/compendiumSearchRanking.test.ts` | **Feature 10**: Algoritmo de Relevância e Ranqueamento da Busca no Compêndio (título exato, prefixo, subtítulo, elemento, tags, multi-tokens) | M3 | 21 | 19 Pass / 2 Pendentes |
| `tests/criticalDamageRules.test.ts` | **Feature 15**: Regras e Modos de Cálculo de Dano Crítico (`multiply_dice`, `multiply_damage`, `max_damage`, `ask_user`, margem de ameaça) | M4 | 20 | 18 Pass / 2 Pendentes |
| `tests/dicePresets.test.ts` | **Feature 17**: Fórmulas Customizadas de Dados (adição, remoção, validação sintática e persistência AsyncStorage) | M4 | 19 | 19 Pass / 0 Pendentes |
| `tests/pdfViewerModes.test.tsx` | **Features 11, 12, 13, 14**: Leitor de PDFs e Livros (seletor PDF vs Texto, rolagem contínua no modo texto, fallback resiliente, links individuais do Drive sem 404) | M3 | 19 | 19 Pass / 0 Pendentes |
| `tests/cardLayoutAlignment.test.ts` | **Features 18, 19, 20**: Geração e Exportação de Cards (espaçamento vertical de subtítulo, desduplicação de texto, exportação real de PNG/SVG sem forçar PDF) | M5 | 12 | 10 Pass / 2 Pendentes |
| `tests/supportAndUpdates.test.ts` | **Features 1, 2, 3, 4**: Central de Suporte, Atualizações e Auth (rota `/oauthredirect`, download resiliente de APK, link permanente do Discord, transparência de protocolo e histórico) | M1 | 14 | 14 Pass / 0 Pendentes |
| `tests/glitchResilience.test.ts` | **Features 5, 6, 7, 8, 9**: IA G.L.I.T.C.H., Voz e Layout (sanitização de chaves Gemini, modelos e fallback Groq, síntese vocal TTS no APK, microfone STT defensivo, responsividade) | M2 | 16 | 16 Pass / 0 Pendentes |
| **TOTAL E2E NOVO** | **Features 1 a 20** | **M1-M6** | **121** | **115 Pass / 6 Pendentes** |

---

## 2. Cobertura por Camadas (Tiers 1 a 5)

Conforme estabelecido em `TEST_INFRA.md`:

- **Tier 1 (Feature Coverage / Isolamento Funcional)**: $\ge$ 5 testes por domínio funcional $\rightarrow$ **42 testes implementados**
- **Tier 2 (Boundary Value Analysis & Normalização)**: Casos de borda, espaços, acentos, strings vazias e limites $\rightarrow$ **28 testes implementados**
- **Tier 3 (Pairwise & Integração Cruzada)**: Combinações entre filtros de busca, rolagem de dados e motores offline $\rightarrow$ **18 testes implementados**
- **Tier 4 (Cenários Reais Ponta a Ponta)**: Fluxos de combate, consulta de rituais, leitura de suplementos e suporte $\rightarrow$ **17 testes implementados**
- **Tier 5 (Adversarial Coverage Hardening)**: Payloads de injeção, caracteres de controle, emojis, regex malformados e estresse de memória $\rightarrow$ **16 testes implementados**

---

## 3. Comandos Oficiais de Execução da Suíte

Todos os testes utilizam o Node.js Test Runner nativo via `tsx`:

```bash
# ⚡ Smart Testing Gates (Execuções Rápidas por Escopo):
npm run typecheck     # Validação estrita de tipos TypeScript (tsc --noEmit)
npm run test:rules    # Fórmulas canônicas, críticos e progressão de NEX
npm run test:front    # Renderização de telas Expo Router e componentes visuais React Native
npm run test:sync     # Sincronização offline, SmartMergeEngine e repositórios locais
npm run test:db       # Integridade do banco de dados referencial Python (10 livros)

# 🧪 Execução dos Novos Testes E2E (Features 1 a 20):
npx tsx --test tests/compendiumSearchRanking.test.ts tests/criticalDamageRules.test.ts tests/dicePresets.test.ts tests/pdfViewerModes.test.tsx tests/cardLayoutAlignment.test.ts tests/supportAndUpdates.test.ts tests/glitchResilience.test.ts

# 🛡️ Suíte Completa de Homologação (Obrigatória em Release):
npm run test:all      # Executa typecheck + todos os 60+ arquivos de teste + integridade Python
```

---

## 4. Gaps de Implementação Identificados (Orientação aos Agentes)

Os 6 testes atualmente pendentes isolam com precisão os comportamentos a serem entregues nos respectivos marcos de implementação:

1. **Marco M3 (Feature 10 — Busca do Compêndio)**:
   - `compendiumSearchRanking.test.ts (1.3)`: Implementar cálculo aditivo de score para que subtítulo/elemento supere menção apenas no corpo da descrição.
   - `compendiumSearchRanking.test.ts (4.3)`: Atribuir bônus de correspondência exata de título (+1000 pts) para priorizar "Metralhadora" sobre "Submetralhadora".
2. **Marco M4 (Feature 15 — Crítico e Armas)**:
   - `criticalDamageRules.test.ts (2.2 & 5.2)`: Tratar armas com dano puramente estático (sem dados, ex: "5") para que `rollWeaponDamage` multiplique diretamente o valor sem acionar o fallback de rolagem d20.
3. **Marco M5 (Features 19 & 20 — Cards de Registros)**:
   - `cardLayoutAlignment.test.ts (1.2)`: Em `extractRecordCardData`, omitir o resumo se ele for idêntico ou prefixo da descrição para evitar duplicação visual.
   - `cardLayoutAlignment.test.ts (2.2)`: Em `cardExportService`, evitar despacho forçado como documento PDF ao solicitar exportação PNG no ambiente mobile.

---

## 5. Declaração de Prontidão

A suíte de testes E2E para as Features 1 a 20 encontra-se **homologada, sem erros de tipagem TypeScript e pronta** para guiar o trabalho dos agentes de implementação.
