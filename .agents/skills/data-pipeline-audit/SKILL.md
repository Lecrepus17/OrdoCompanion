---
name: data-pipeline-audit
description: >-
  Audita e valida o pipeline de extração, estruturação e integridade de dados do compêndio oficial do Ordo Companion (10 suplementos, 1.261 páginas, scripts Python de OCR/regex e arquivos de sementes JSON em data/).
---

# Auditoria de Pipeline de Dados & Compêndio - Ordo Companion

Utilize este guia para auditar a extração, conversão e indexação das 1.367 entidades do compêndio canônico e suplementos de Ordem Paranormal.

---

## 📂 Arquivos Chave do Pipeline de Dados

* `scripts/extract_all.py`: Script principal de orquestração de extração de PDFs e montagem das bases JSON.
* `scripts/extract_book_pages.py`: Indexador e recortador de páginas oficiais dos 10 livros para navegação rápida ("Ver no Livro").
* `scripts/test_database_integrity.py`: Validador de integridade referencial, chaves únicas, campos obrigatórios e links de página.
* `data/compendium_seed.json`: Semente consolidada de todas as entidades do sistema.
* `data/*.json`: Arquivos temáticos (`rituals.json`, `powers.json`, `items.json`, `threats.json`, `origins.json`).

---

## 📚 Os 10 Livros e Suplementos Canônicos Suportados

1. **Livro Base (v1.1)** (`livro-regras`)
2. **Sobrevivendo ao Horror** (`sobrevivendo-ao-horror`)
3. **Arquivos Secretos #01** (`arquivos-secretos-01`)
4. **Arquivos Secretos #02** (`arquivos-secretos-02`)
5. **Arquivos Secretos #03** (`arquivos-secretos-03`)
6. **Arquivos Secretos #04** (`arquivos-secretos-04`)
7. **Arquivos Secretos #05** (`arquivos-secretos-05`)
8. **Arquivos Secretos #06** (`arquivos-secretos-06`)
9. **Arquivos Secretos #07** (`arquivos-secretos-07`)
10. **Arquivos Secretos #09** (`arquivos-secretos-09`)

---

## 🔍 Checklist de Integridade de Entidades

Ao adicionar ou atualizar entidades no compêndio:

- [ ] **Chaves Obrigatórias**: Cada entidade DEVE conter `id`, `name`, `category`, `sourceBook` (ou `book`) e `description`.
- [ ] **Indexação de Página (`page`)**: O número da página deve corresponder exatamente à numeração impressa no livro oficial correspondente.
- [ ] **Busca Fonética / Normalização**:
  - Nomes e descrições devem ser indexáveis sem distinção de maiúsculas/minúsculas e sem acentos (ex: `odio incontrolavel` encontra `Ódio Incontrolável`).
- [ ] **Elementos Válidos**: Para rituais e poderes paranormais, o campo `element` deve ser estritamente: `Sangue`, `Morte`, `Conhecimento`, `Energia`, `Medo` ou `Variado`.
- [ ] **Categorias Canônicas**:
  - `ritual`, `power`, `origin`, `class`, `track` (trilha), `weapon`, `item`, `armor`, `curse` (maldição), `condition`, `threat` (ameaça).

---

## 🧪 Validação Automatizada

Sempre execute o script oficial de integridade após qualquer alteração em arquivos de dados ou scripts de extração:

```bash
# Valida integridade referencial dos JSONs
npm run test:db

# Teste unitário Node.js da integridade do compêndio
npx tsx --test tests/databaseIntegrity.test.ts
```
