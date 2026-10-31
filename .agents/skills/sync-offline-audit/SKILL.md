---
name: sync-offline-audit
description: >-
  Audita e valida a arquitetura de sincronização híbrida (Supabase, Google Drive e AsyncStorage local) e o motor SmartMergeEngine do Ordo Companion, garantindo resiliência Offline-First, resolução de conflitos sem perda de dados e propagação segura de tombstones de deleção.
---

# Auditoria de Sincronização & Offline-First - Ordo Companion

Utilize este guia para auditar modificações nos módulos de persistência local, migrações de dados, backup em nuvem e resolução de conflitos multiplayer e VTT.

---

## 📂 Arquivos Chave de Persistência & Sync

* `src/services/sync/SmartMergeEngine.ts`: Algoritmo de merge inteligente baseado em timestamps e resolução de conflitos.
* `src/services/sync/types.ts`: Tipos do payload de backup (`UserDataBackupPayload`), status de sync e metadados.
* `src/services/sync/GoogleDriveSyncService.ts`: Integração com API do Google Drive via autenticação OAuth e arquivo de backup único.
* `src/repositories/OfflineDataRepository.ts`: Repositório local desacoplado sobre `@react-native-async-storage/async-storage`.
* `src/repositories/IDataRepository.ts`: Interface desacoplada para suportar repositórios locais e remotos.
* `src/context/AppContext.tsx`: Orquestração global do estado da aplicação e gatilhos de sincronização em segundo plano.

---

## 🛡️ Regras de Ouro do Offline-First

1. **Prioridade Offline Absoluta**:
   * O aplicativo NUNCA deve bloquear a navegação, criação de fichas ou rolagem de dados por falta de conexão à internet.
   * Todas as operações de escrita devem salvar primeiro no AsyncStorage local e enfileirar para sync se online.

2. **Resolução de Conflitos (`SmartMergeEngine`)**:
   * **Last-Write-Wins Ponderado**: Entre duas versões de um mesmo personagem ou campanha, prevalece a com maior `updatedAt`.
   * **Preservação de Fichas Únicas**: Se um agente existir apenas no local ou apenas na nuvem, ele NUNCA deve ser descartado, e sim somado à coleção resultante.
   * **Tombstones de Deleção (`deletedCharacterIds`, `deletedCampaignIds`)**:
     - Se um usuário deletar uma ficha localmente enquanto offline, o ID dessa ficha DEVE ser registrado nos tombstones.
     - Durante o merge, se um ID estiver na lista de tombstones com timestamp posterior à criação, o item não deve ser ressuscitado do backup remoto.

3. **Integridade de PDFs Armazenados**:
   * Arquivos locais de PDF têm referências mapeadas em `drivePdfFiles`. Não baixar novamente PDFs cujo hash SHA-256 e tamanho já estejam em cache local.

---

## 🧪 Validação e Testes Automatizados

Sempre execute os testes de persistência e merge após alterar fluxos de dados:

```bash
# Executa testes unitários do motor de SmartMerge
npx tsx --test tests/smartMerge.test.ts

# Executa testes do Google Drive e repositório
npx tsx --test tests/googleDriveService.test.ts
npx tsx --test tests/repository.test.ts
npx tsx --test tests/campaignRepository.test.ts
```
