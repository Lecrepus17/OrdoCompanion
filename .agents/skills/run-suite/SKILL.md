---
name: run-suite
description: >-
  Executa a suíte de validação e testes completa do Ordo Companion (typecheck estrito TypeScript, testes automatizados via tsx e integridade do banco de dados em Python) com suporte a Smart Testing Gates para execuções rápidas e direcionadas por escopo.
---

# Suíte de Testes e Validação - Ordo Companion

Este procedimento orienta a execução e análise da integridade técnica do projeto, aplicando os **Smart Testing Gates** para otimizar o tempo de feedback durante o ciclo de desenvolvimento.

---

## ⚡ 1. Matriz de Smart Testing Gates (Execução Rápida por Escopo)

Para evitar overhead desnecessário, o agente `qa-reliability-engineer` DEVE acionar o portão de teste correspondente ao escopo da alteração:

| Escopo da Modificação | Arquivos Impactados | Comando do Smart Gate | Tempo Médio |
| :--- | :--- | :--- | :--- |
| **Regras & Fichas de Agentes** | `src/utils/progression.ts`, `LevelUpModal`, `CreateAgentModal` | `npm run test:rules` | ~4s |
| **Telas, Modais & Componentes UI** | `app/**/*.tsx`, `src/components/**`, `src/theme/**` | `npm run test:front` | ~15s |
| **Persistência, Sincronização & Drive** | `src/services/sync/**`, `src/repositories/**` | `npm run test:sync` | ~5s |
| **Dados do Compêndio & OCR** | `data/*.json`, `scripts/*.py` | `npm run test:db` | ~2s |
| **IA Paranormal (G.L.I.T.C.H.)** | `src/services/ai/**` | `npx tsx --test tests/ai.test.ts` | ~2s |
| **Tipagem TypeScript** | Qualquer arquivo `.ts` ou `.tsx` | `npm run typecheck` | ~5s |

> [!TIP]
> **Pré-Requisito Rápido**: Ao alterar qualquer código TypeScript, sempre execute `npm run typecheck` em conjunto com o teste específico do escopo (ex: `npm run typecheck && npm run test:rules`).

---

## 🛡️ 2. Quality Gate Completo (Pré-Release e Refatorações Globais)

Antes de gerar releases oficiais ou quando houver refatorações profundas na arquitetura:

```bash
npm run test:all
```

A suíte completa executa em sequência:
1. `npm run typecheck` (Tipagem estrita sem emissão de código)
2. `npm run test` (Todos os 40+ arquivos de teste Node.js + React Native)
3. `npm run test:db` (Integridade referencial dos JSONs em Python)

---

## 🔧 3. Diagnóstico de Falhas Comuns

* **Erro de Importação em Componentes de Teste**: Certifique-se de importar `./setup` no topo dos arquivos em `tests/`.
* **Erro de AsyncStorage nos testes**: O mock de AsyncStorage está centralizado em `tests/setup.ts`.
* **Inconsistência de IDs no Compêndio**: Cada entidade deve conter `id`, `name`, `category` e campos obrigatórios de sua respectiva categoria.
