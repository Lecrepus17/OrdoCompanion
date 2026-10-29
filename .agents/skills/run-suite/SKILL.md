---
name: run-suite
description: >-
  Executa a suíte de validação e testes completa do Ordo Companion (typecheck estrito TypeScript, testes automatizados via tsx e integridade do banco de dados em Python). Use sempre que fizer alterações de código ou dados para evitar regressões.
---

# Suíte de Testes e Validação - Ordo Companion

Este procedimento orienta a execução e análise da integridade técnica do projeto.

## Comandos de Execução

Execute a verificação completa com:

```bash
npm run test:all
```

Ou execute cada etapa individualmente para isolar problemas:

1. **Checagem de Tipos (TypeScript)**:
   ```bash
   npm run typecheck
   ```
   *Se falhar*: Inspecione incompatibilidades de tipo em `src/types/` ou retornos ausentes.

2. **Testes Automatizados (Node Test Runner + tsx)**:
   ```bash
   npm run test
   ```
   *Para rodar apenas testes de tela*:
   ```bash
   npm run test:front
   ```

3. **Integridade do Banco de Dados (Python)**:
   ```bash
   npm run test:db
   ```
   *Se falhar*: Verifique chaves faltantes ou IDs duplicados nos arquivos JSON em `data/`.

## Diagnóstico de Falhas Comuns

* **Erro de Importação em Componentes de Teste**: Certifique-se de importar `./setup` no topo dos arquivos em `tests/`.
* **Erro de AsyncStorage nos testes**: O mock de AsyncStorage está centralizado em `tests/setup.ts`.
* **Inconsistência de IDs no Compêndio**: Cada entidade deve conter `id`, `name`, `category` e campos obrigatórios de sua respectiva categoria.
