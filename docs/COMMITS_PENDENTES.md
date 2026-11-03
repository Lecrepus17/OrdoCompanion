# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## ⏳ Fila de Commits Pendentes

### Sugestão 1: Sistema de Dano Crítico Flexível, Crítico Máximo e Atalhos no DiceToast

#### Título:
`feat(combat): implementa modos de dano crítico, botão de crítico máximo e atalhos rápidos no toast`

#### Descrição (Body):
- Implementa motor `rollWeaponDamage` com suporte aos modos `multiply_dice` (padrão oficial v1.1) e `multiply_damage` (alternativo) em `dice.ts`
- Implementa cálculo e botão de `Crítico Máximo` (todas as faces máximas de dados sem aleatoriedade) na ficha de agentes, Armaria e RecordPreviewModal
- Adiciona seletor de modo de dano crítico nas Configurações de Usuário (`UserProfileModal.tsx`) e diretamente na tabela de ataques do agente (`characters.tsx`)
- Implementa barra de ações rápidas no `DiceToast.tsx` para testes de ataque com realce de 20 natural permitindo rolar dano, crítico e crítico máximo com 1 toque
- Corrige cálculo de dano na Armaria (`weapons.tsx`) para preservar todos os bônus e dados extras
- Adiciona tipagens `CriticalDamageMode` e `WeaponAttackContext` em `compendium.ts` e declarações para `expo-sharing` em `declarations.d.ts`
- Adiciona 20 testes automatizados cobrindo expansão de dados, dano máximo e os dois modos de crítico em `tests/dice.test.ts`

#### Comando Git Pronto:
```bash
git add src/types/compendium.ts src/types/declarations.d.ts src/utils/dice.ts src/context/AppContext.tsx src/components/DiceToast.tsx src/app/\(tabs\)/characters.tsx src/app/\(tabs\)/weapons.tsx src/components/RecordPreviewModal.tsx src/components/UserProfileModal.tsx tests/dice.test.ts docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(combat): implementa modos de dano crítico, botão de crítico máximo e atalhos rápidos no toast" \
  -m "- Implementa motor rollWeaponDamage com suporte aos modos multiply_dice (padrão oficial v1.1) e multiply_damage (alternativo) em dice.ts" \
  -m "- Implementa cálculo e botão de Crítico Máximo (faces máximas sem aleatoriedade) na ficha de agentes, Armaria e RecordPreviewModal" \
  -m "- Adiciona seletor de preferência de dano crítico no perfil de usuário (UserProfileModal) e por agente (characters.tsx)" \
  -m "- Adiciona atalhos rápidos de rolagem de dano no DiceToast ao testar ataque com destaque tático para 20 natural" \
  -m "- Corrige truncamento de bônus de dano na Armaria (weapons.tsx)" \
  -m "- Adiciona bateria de 20 testes unitários em tests/dice.test.ts e atualiza governança"
```

---

## 📜 Histórico de Commits Recentes

### 1. Release v1.2.0-beta.2 (Vitais por NEX, Voz no G.L.I.T.C.H. e Exportação de Sessão):
```bash
git commit -m "feat: release v1.2.0-beta.2 - vitais por NEX, voz no GLITCH e exportacao de mesa" \
  -m "- Recalculo unificado e escalonamento automatico de vitais (PV, PE, SAN) por NEX e bonus passivos canonicos em progression.ts, LevelUpModal e CreateAgentModal" \
  -m "- Alerta permissivo de pre-requisitos (Adicionar mesmo assim) em poderes e rituais" \
  -m "- Comando e resposta por voz (STT/TTS) com filtro de radio militar no G.L.I.T.C.H." \
  -m "- Exportacao completa do historico de sessao da Mesa Virtual em JSON estruturado e PDF tatico da Ordo Realitas" \
  -m "- Suporte a expo-sharing para compartilhamento de relatorios" \
  -m "- Incremento de versao no app.json (versionCode 4, 1.2.0-beta.2), package.json e version.json"
```

### 2. Assistente de Proteções, Proficiências e Vestimentas na Ficha de Personagens:
```bash
git add TEST_READY.md src/components/ProtectionModal.tsx src/app/(tabs)/characters.tsx src/app/(tabs)/weapons.tsx tests/frontendCharacters.test.tsx tests/defenseProtections.test.ts tests/proficienciesAndClothing.test.ts docs/ATUALIZACOES_PENDENTES.md docs/COMMITS_PENDENTES.md
git commit -m "feat(characters): assistente de proteções, proficiências e vestimentas" \
  -m "- Implementa ProtectionModal.tsx para seleção de proteções e escudos com modificações oficiais e cálculo de Defesa/RD" \
  -m "- Integra assistente de proteções no card de Defesa e sincroniza com inventário da ficha em characters.tsx" \
  -m "- Implementa verificação de proficiências de armas/proteções com alertas visuais e penalidades de -2d20 em characters.tsx e weapons.tsx" \
  -m "- Implementa sistema didático de vestimentas/utensílios com limite de 2 ativas, justificativa narrativa e reflexão de bônus em perícias" \
  -m "- Cria suítes de testes em tests/defenseProtections.test.ts, tests/proficienciesAndClothing.test.ts e tests/frontendCharacters.test.tsx (491 testes 100% passando)" \
  -m "- Documenta matriz de cobertura de testes em TEST_READY.md e atualiza governança em docs/ATUALIZACOES_PENDENTES.md e docs/COMMITS_PENDENTES.md"
```
