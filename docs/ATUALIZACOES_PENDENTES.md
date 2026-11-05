# 📋 Atualizações Pendentes para o Próximo Release

> **Versão Atual**: `1.2.0-beta.2`  
> **Versão Sugerida**: `1.3.0-beta.1` (Motivo: [Minor] Atualização para o Livro Base oficial v1.3 com 1.617 entidades, 107 rituais, 39 condições, regras canônicas revisadas e sistema de dano crítico flexível)  
> **Última Atualização**: 2026-11-05 20:05

---

## 🚀 Resumo do Próximo Release v1.3.0-beta.1 (Changelog de Usuário)

* **Livro de Regras Base Atualizado para a Versão Oficial 1.3 (332 páginas)**:
  * **Índice e Regras Expandidos**: Compêndio ampliado para **1.617 entidades** no total, incluindo **606 regras e mecânicas oficiais** indexadas diretamente do Sumário expandido da v1.3.
  * **Novas Condições Canônicas**: Adição oficial das condições `Enlouquecendo` e `Perturbado`, além da atualização do texto de `Sangrando` (estabilização com Medicina DT 20), `Morrendo`, `Asfixiado` e `Vulnerável`. Total de 39 condições no compêndio.
  * **Novo Item Paranormal**: Inclusão do `Medidor de Estabilidade da Membrana` (p. 67/77), equipamento oficial da Ordo Realitas.
  * **Novo Ritual Resgatado & Rituais Revisados**: Adição canônica do ritual `Flagelo de Sangue` (2º Círculo de Sangue, folha 143), elevando o total para 107 rituais. Atualização dos textos de `Transfusão Vital` (alvo/perda de vida), `Miasma Entrópico` (versão verdadeira inclui discente) e `Transfigurar Água`.
  * **Poderes e Habilidades Canônicos Revisados**:
    * `Artista Marcial`: Seus ataques desarmados "se tornam" armas ágeis e causam 1d6 de dano letal.
    * `Golpe Pesado`: Especificado para armas corpo a corpo ("Enquanto estiver empunhando uma arma corpo a corpo...").
    * `Disparo Impactante` (Atirador de Elite): Redefinido para gastar 2 PE para realizar manobras de derrubar, desarmar, empurrar ou quebrar com armas de fogo sem exigir modificações prévias.
    * `Lâmina Maldita` (Lâmina Paranormal): Permite gastar +1 PE para conjurar *Amaldiçoar Arma* como ação de movimento caso já conheça o ritual.
    * Nova regra de `Perda de Vida`: Redução direta de PV ignorando resistência a dano (RD).
  * **Balanceamento de Ameaças Oficiais**:
    * `Titã de Sangue`: Tamanho corrigido para *Enorme* (pág. 211).
    * `Aracnasita`: Ajustada imunidade a dano exceto dano de fogo (pág. 216).
    * `O Anfitrião`: Enigma de Medo atualizado para anular imunidades a dano com captura exata de VD (400).
    * `Nidere` e `Sempiternal`: Bônus de perícias e Percepção às Cegas sincronizados.
  * **"Ver no Livro" 100% Sincronizado**: Integração de leitura rápida de páginas atualizada para os 10 suplementos oficiais (1.271 páginas totais indexadas).

* **Sistema Flexível de Dano Crítico de Armas (Dados vs Dano)**:
  * **Modo Canônico Padrão (Multiplicar Dados)**: Conforme o livro oficial de *Ordem Paranormal* (multiplica os dados rolados pelo crítico, ex: `1d8+3` vira `2d8+3`).
  * **Modo Alternativo (Multiplicar Dano)**: Rola o dano base da arma e multiplica o resultado obtido pelo multiplicador (ex: rola `1d8+3` = 7, multiplica por 2 $\rightarrow$ 14).
  * **Configuração Global e por Agente**: Seletor global no perfil do usuário (`UserProfileModal.tsx`) e seletor rápido na aba de Ataques da ficha do agente (`characters.tsx`).

* **Botão de Crítico Máximo & Atalhos no DiceToast**:
  * **Botão "Crítico Máx"**: Calcula o valor máximo determinístico das faces dos dados nos cards da ficha, Armaria e prévias.
  * **Atalhos no Toast de Ataque**: Rolou teste de ataque? Os botões `[Dano]`, `[Crítico]` e `[Crítico Máx]` surgem diretamente no toast, com destaque dourado especial para 20 natural.

---

## 📦 Detalhamento Técnico das Modificações Consolidadas

### ✨ Novas Funcionalidades (Features)
- `data/compendium_seed.json` & `src/data/seed/compendium_seed.json`: Base de dados reconstruída com 1.617 entidades do Livro Base v1.3 e 9 suplementos canônicos.
- `data/books_pages_seed.json` & `src/data/seed/books_pages_seed.json`: 1.271 páginas mapeadas cobrindo os 10 livros oficiais da Jambô Editora.
- `scripts/extract_raw_pages.py`: Parser adaptado para sufixos de versão (`-v1-3`), preservação de livros cacheados quando apenas um PDF for fornecido e normalização contínua de metadados.
- `scripts/parse_entities.py`: Parser inteligente com detecção de versão (`is_v13`), suporte a 307 seções do sumário digital, 39 condições, 58 armas e 107 rituais.

### ⚔️ Combate e Rolagem de Dados
- `src/types/compendium.ts`: Tipos `CriticalDamageMode`, `WeaponAttackContext` e suporte a modos de crítico em ficha e usuário.
- `src/utils/dice.ts`: Algoritmos `expandFormulaForCritical`, `calculateMaxDamageForFormula` e `rollWeaponDamage`.
- `src/context/AppContext.tsx`: Propagação de contexto de ataque e suporte à sincronização de dano na Mesa Virtual.
- `src/components/DiceToast.tsx`: Atalhos de dano rápido com realce de 20 natural.
- `src/app/(tabs)/characters.tsx` & `src/app/(tabs)/weapons.tsx`: Seletores de modo de crítico, botões de dano máximo e eliminação de truncamento de bônus.

### 🤖 Compatibilidade Android APK & Runtime Hermes
- `.agents/skills/android-apk-audit/SKILL.md`: Criação de skill especializada com auditoria de runtime, checklists de APIs nativas, BackHandler e manipulação de arquivos no Android.
- `GEMINI.md`: Registro do agente `android-apk-guardian` e regras de roteamento automatizado para o ecossistema Android APK.
- `app.json`: Configurações nativas essenciais para APK (`largeHeap: true`, `usesCleartextTraffic: true`, permissão `INTERNET` e `softwareKeyboardLayoutMode: "adjustPan"`).
- `src/services/ai/AiClient.ts`: Resolução dinâmica de host no Android (`10.0.2.2` / dev server IP) para conexão transparente com servidor de IA Ollama local.
- `src/utils/agentSharing.ts`: Reescrita de codificação/decodificação Base64 sem dependências de Node `Buffer` ou browser `btoa`/`atob`, com suporte estrito a UTF-8 e emojis no motor Hermes.
- `docs/PLANO_COMPATIBILIDADE_ANDROID_APK.md`: Documentação de diagnóstico, status atual e instruções passo a passo para finalização das telas restantes.

### 🧪 Testes Automatizados
- `tests/databaseIntegrity.test.ts` & `scripts/test_database_integrity.py`: Validação de 1.617 entidades e integridade referencial dos 10 suplementos.
- `tests/levelUpModal.test.tsx`: Asserção de habilidades de trilha de NEX 65% atualizada conforme progressão canônica.
- `tests/compendiumPdfIntegration.test.tsx`: Índice da seção "Mecânica Básica" atualizado para a folha 19 da v1.3.
- `tests/dice.test.ts`: 20 testes de cálculo de dano crítico determinístico e alternativo.
- `tests/agentSharing.adversarial.test.ts`: Validação de paridade bit-a-bit de codificação Base64 com payloads massivos (até 1 MB) e emojis para Hermes.
- `tests/aiOllama.adversarial.test.ts`: 10 testes de resolução de IP e loopback no Android para IA Ollama local.
- `tests/appJson.adversarial.test.ts`: Testes de estrutura e integridade sintática das configurações do Android APK.

---

## 🛠️ Comando para Gerar o Release
```bash
npm run release 1.3.0-beta.1 "Livro Base v1.3 com novas regras e 1617 entidades do compendio e modos de dano critico"
```
