---
name: rpg-rules-audit
description: >-
  Audita e valida regras e fórmulas de Ordem Paranormal no Ordo Companion, incluindo cálculo de PV, PE, Sanidade, Limite de PE por turno, CD/DT de rituais, patentes e integridade das 59 origens e poderes de classe.
---

# Auditoria de Regras de Ordem Paranormal

Utilize este guia para auditar modificações nas regras mecânicas do RPG e na lógica de criação/evolução de fichas de agentes.

## Arquivos Chave de Regras

* `src/utils/progression.ts`: Fórmulas de cálculo de PV, PE, Sanidade, Perícias e Patentes.
* `src/types/compendium.ts`: Interfaces de entidades (`CompendiumEntity`, `CharacterSheet`, etc.).
* `src/components/CreateAgentModal.tsx`: Fluxo assistido de criação de agentes.
* `src/components/LevelUpModal.tsx`: Fluxo de avanço de nível (NEX).
* `tests/createAgentModal.test.ts`: Bateria de testes de fidelidade das 59 origens e regras.

## Fórmulas Canônicas do Sistema

### 1. Limite de PE por Turno
```typescript
// O limite de PE que um agente pode gastar por turno é igual ao seu NEX dividido por 5 (arredondado para baixo)
const limitePE = Math.max(1, Math.floor(nex / 5));
```

### 2. Dificuldade de Testes de Resistência de Rituais (DT)
```typescript
// DT padrão de ritual para ocultistas
const dtRitual = 10 + limitePE + atributoPresenca;
```

### 3. Patentes por NEX
* **Recruta**: 0% a 15% NEX
* **Operador**: 20% a 45% NEX
* **Agente Especial**: 50% a 60% NEX
* **Oficial de Operações**: 65% a 80% NEX
* **Agente de Elite**: 85% a 99% NEX

## Checklist de Validação ao Adicionar/Alterar Regras

- [ ] Toda origem oficial do compêndio deve fornecer exatamente 2 perícias treinadas ou opções de escolha equivalentes.
- [ ] O valor de atributos deve respeitar o limite padrão humano (máximo 5 na criação).
- [ ] Pontos de Vida, Esforço e Sanidade devem recalcular corretamente ao alterar Vigor e Presença retroativamente.
- [ ] Executar o teste específico de auditoria: `npx tsx --test tests/createAgentModal.test.tsx`
