# 🎯 Commits Pendentes

Registro das alterações prontas para commit com título e descrição detalhada no padrão **Conventional Commits**.

---

## Opção 1: Commit Único Consolidado (Tudo de uma vez)

### Título:
`feat(app): aprimora leitor de PDF, exportação de cards em imagem, progressão de NEX e compêndio`

### Descrição (Body):
- Aprimora serviço de acesso e desbloqueio de PDF com exclusão segura e testes
- Implementa exportação de cards de entidades e fichas em imagem de alta resolução
- Refina fluxo de LevelUp, impressão de fichas de agentes e cálculo de regras
- Adiciona resumidor inteligente de habilidades e atualiza sementes do compêndio

### Comando Git Pronto:
```bash
git add .
git commit -m "feat(app): aprimora leitor de PDF, exportação de cards em imagem, progressão de NEX e compêndio" -m "- Aprimora serviço de acesso e desbloqueio de PDF com exclusão segura e testes" -m "- Implementa exportação de cards de entidades e fichas em imagem de alta resolução" -m "- Refina fluxo de LevelUp, impressão de fichas de agentes e cálculo de regras" -m "- Adiciona resumidor inteligente de habilidades e atualiza sementes do compêndio"
```

---

## Opção 2: Commits Semânticos Granulares (Por Escopo)

### 1. Módulo de PDF e Livros:
```bash
git add src/services/pdf/ src/components/Pdf* src/app/\(tabs\)/books.tsx tests/*pdf* tests/deletePdfBook.test.tsx
git commit -m "feat(pdf): adiciona exclusão de livros, fluxo de desbloqueio e leitor aprimorado" -m "- Adiciona modal de confirmação e exclusão segura de livros locais" -m "- Aprimora suporte a URLs e armazenamento de PDFs protegidos" -m "- Adiciona testes automatizados para fluxo de desbloqueio e remoção"
```

### 2. Exportação de Cards em Imagem:
```bash
git add src/services/cardImage/ src/components/cardImage/ src/components/RecordPreviewModal.tsx tests/cardImage.test.ts
git commit -m "feat(cards): implementa exportação e compartilhamento de cards em imagem" -m "- Adiciona gerador de imagem para registros e habilidades" -m "- Inclui modal de pré-visualização e exportação com tema paranormal" -m "- Adiciona testes unitários para extração e renderização de cards"
```

### 3. Fichas de Personagem e Progressão:
```bash
git add src/utils/progression.ts src/utils/sheetPrinter.ts src/components/LevelUpModal.tsx src/components/CreateAgentModal.tsx src/app/\(tabs\)/characters.tsx tests/progression.test.ts tests/sheetPrinter.test.ts
git commit -m "feat(characters): refina fluxo de level up, impressão de fichas e fórmulas" -m "- Melhora seleção de poderes e aumento de atributos no LevelUpModal" -m "- Aprimora layout de impressão e exportação da ficha de agente" -m "- Expande testes de progressão e fidelidade de regras"
```

### 4. Compêndio, Resumidor e Infraestrutura:
```bash
git add data/ src/data/ scripts/ src/types/ src/repositories/ src/utils/abilitySummarizer.ts src/context/ tests/abilitySummarizer.test.ts tests/setup.ts metro.config.js src/components/EntityCard.tsx src/app/\(tabs\)/weapons.tsx
git commit -m "feat(compendium): adiciona resumidor de habilidades e atualiza seeds da base" -m "- Implementa abilitySummarizer para compactação de descrições longas" -m "- Atualiza compendium_seed com sinopses automáticas e correção de tags" -m "- Ajusta metro.config e repositório offline para novos fluxos"
```
