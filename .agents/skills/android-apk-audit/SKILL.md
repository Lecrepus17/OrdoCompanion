---
name: android-apk-audit
description: >-
  Audita e valida a compatibilidade da aplicação com o runtime nativo do Android APK (Hermes), prevenindo vazamento de APIs exclusivas de navegador (window, document, navigator), garantindo interceptação de botão físico de retorno (BackHandler), persistência e compartilhamento seguro de arquivos locais (expo-file-system, expo-sharing) e estabilidade de layout e teclado em dispositivos Android.
---

# Auditoria de Compatibilidade Android APK - Ordo Companion

Utilize este guia e checklist tático para garantir que qualquer alteração no código seja 100% compatível com a execução nativa em dispositivos Android empacotados em formato standalone `.apk`.

---

## 📂 Arquivos Chave de Compatibilidade Android

* `app.json`: Configurações nativas do Android (`package`, `versionCode`, `largeHeap`, `softwareKeyboardLayoutMode`, `usesCleartextTraffic`).
* `android/app/src/main/AndroidManifest.xml`: Permissões, intent-filters, `largeHeap` e flags de sistema.
* `eas.json`: Perfis de build de APK (`preview` e `production` com `buildType: "apk"`).
* `src/utils/alert.ts`: Abstração unificada entre `Alert.alert` (nativo) e navegador.
* `src/utils/clipboard.ts`: Abstração de área de transferência multiplataforma com fallback nativo.
* `src/utils/agentSharing.ts`: Codificação e decodificação Base64 resiliente ao motor Hermes.
* `src/utils/sheetPrinter.ts`: Impressão de ficha via `expo-print` no Android vs `iframe` no web.
* `src/services/cardImage/cardExportService.ts`: Renderização e compartilhamento nativo de cards.
* `src/services/virtualTable/tableSessionExportService.ts`: Exportação e compartilhamento de sessões VTT.
* `src/components/CreateAgentModal.tsx` e `src/components/LevelUpModal.tsx`: Fluxos modais assistidos de múltiplas etapas.
* `src/components/UserProfileModal.tsx`: Backup, restauração de dados e perfil do agente.
* `src/app/(tabs)/master.tsx`: Central do Mestre com navegação hierárquica de campanhas.
* `src/components/SupportCenterView.tsx`: Diagnóstico e suporte com cópia/compartilhamento de logs.
* `src/components/AiChatMessageItem.tsx`: Cópia de respostas da IA G.L.I.T.C.H.
* `src/app/(tabs)/characters.tsx`: Exportação e compartilhamento rápido de fichas.

---

## 🛡️ 1. Isolamento de APIs Web/DOM (Hermes Engine)

No runtime Android nativo com motor Hermes, objetos do navegador como `window`, `document`, `navigator`, `localStorage` e `sessionStorage` **não existem** no escopo global. Além disso, `btoa`, `atob` e `Buffer` podem ser indisponíveis ou causar falhas com caracteres especiais.

### Regras Mandatórias:
1. **Guarda Dupla Obrigatória para Globais Web**:
   ```typescript
   // ❌ INCORRETO:
   window.history.pushState(...);
   const a = document.createElement('a');

   // ✅ CORRETO:
   if (Platform.OS === 'web' && typeof window !== 'undefined') {
     window.history.pushState(...);
   }
   if (Platform.OS === 'web' && typeof document !== 'undefined') {
     const a = document.createElement('a');
   }
   ```
2. **Abstração Universal para Área de Transferência (Clipboard)**:
   - Em Android APK, `navigator.clipboard` é `undefined`.
   - Utilize sempre a abstração centralizada em `src/utils/clipboard.ts` (`copyToClipboard`), que realiza fallback transparente para `Share.share` quando executando em dispositivo móvel.
3. **Diálogos Nativos em vez de Prompts Web**:
   - Utilize exclusivamente `showAlert` e `confirmAction` de `src/utils/alert.ts`.
   - **Nunca** utilize `window.alert`, `window.confirm` ou `window.prompt` em fluxos acessíveis no Android. Para entrada de dados (como importação de backup), forneça um componente de formulário (`TextInput`).
4. **Resiliência Base64 no Hermes**:
   - Rotinas de compartilhamento e exportação (`src/utils/agentSharing.ts`) não devem depender exclusivamente de `Buffer` do Node.js nem de `btoa`/`atob` do navegador sem fallback puramente algorítmico em TypeScript.

---

## 🔙 2. Gestão de Hardware Back Press (`BackHandler`)

Dispositivos Android utilizam o botão físico/capacitivo de retorno ou o gesto lateral de borda como navegação primária.

### Checklist Obrigatório para Telas e Modais:
- [ ] **Modais de Múltiplas Etapas (`CreateAgentModal`, `LevelUpModal`)**:
  - Se `step > 1`: o botão voltar DEVE retroceder uma etapa (`setStep(step - 1)`) e retornar `true`.
  - Se `step === 1`: solicitar confirmação do usuário antes de descartar os dados preenchidos (`confirmAction`).
  - Passar a mesma lógica para o prop `onRequestClose` da tag `<Modal>`.
- [ ] **Navegação Hierárquica de Telas (`master.tsx`)**:
  - Se uma campanha estiver selecionada na visualização detalhada (`activeCampaignId !== null`), o botão Voltar deve deselecionar a campanha (`setActiveCampaignId(null)`) e retornar `true`, em vez de fechar a aplicação.
- [ ] **Visualizadores e Modais Simples (`UserProfileModal`, `OracleModal`, etc.)**:
  - Implementar `onRequestClose={onClose}` para fechamento suave sem travamentos.
- [ ] **Desinscrição Estrita de Listeners**:
  - Todo registro de `BackHandler.addEventListener` deve obrigatoriamente retornar a função de remoção no cleanup do `useEffect`:
    ```typescript
    useEffect(() => {
      if (Platform.OS !== 'android') return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canHandleBack) {
          handleBack();
          return true; // Consome o evento
        }
        return false;
      });
      return () => sub.remove();
    }, [canHandleBack]);
    ```

---

## 📁 3. Operações de Arquivos & Compartilhamento (Scoped Storage)

No Android 11+ (API 30+), o acesso ao disco opera sob restrições do Scoped Storage.

### Diretrizes de I/O e Arquivos:
- [ ] **Diretórios Seguros**:
  - Arquivos transitórios (PDFs gerados, temporários de impressão) devem usar `FileSystem.cacheDirectory`.
  - Arquivos persistentes do usuário devem usar `FileSystem.documentDirectory`.
- [ ] **Compartilhamento de Arquivos via Intent**:
  - Nunca emita tags `<a download="...">` no Android. Utilize `expo-sharing` ou `Share`:
    ```typescript
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar' });
    } else {
      await Share.share({ url: fileUri, title: 'Compartilhar' });
    }
    ```
- [ ] **Prevenção de OutOfMemory (OOM)**:
  - Manter `largeHeap: true` em `app.json` e `android:largeHeap="true"` no `AndroidManifest.xml`.
  - Evitar alocar arquivos binários inteiros como strings Base64 na memória; priorizar leitura por streams ou referências diretas de URI de arquivo local.

---

## 📱 4. Layout, Insets, Teclado & Conectividade Local

- [ ] **Compensação de Barra de Status Translúcida**:
  - Utilizar `paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12)` para prevenir invasão de conteúdo sob a barra de status do Android.
- [ ] **Acomodação do Teclado Virtual**:
  - Manter `softwareKeyboardLayoutMode: "pan"` em `app.json` e `windowSoftInputMode="adjustPan"` no AndroidManifest para evitar distorção ou elevação indesejada da barra de abas inferior.
- [ ] **Barra de Abas e Safe Area Inferior**:
  - Componentes com posicionamento absoluto no rodapé devem considerar `insets.bottom` para não colidir com os botões de navegação por gestos do Android.
- [ ] **Conexão Local HTTP (Ollama / Dev Server)**:
  - Manter `usesCleartextTraffic: true` em `app.json` sob a chave `expo.android`.
  - Ao conectar a servidores locais Ollama no emulador, utilizar `http://10.0.2.2:11434` ou o IP LAN da máquina host, em vez de `http://localhost:11434`.
- [ ] **Fontes Tipográficas Nativas**:
  - Fontes de largura fixa devem incluir `monospace` como fallback nativo para `Courier` ou `Menlo`.

---

## 🧪 5. Validação Automatizada de Compatibilidade Android

Execute os testes e verificações estáticas para certificar paridade antes de aprovar qualquer alteração:

```bash
# Validação estrita de tipos TypeScript
npm run typecheck

# Testes de componentes frontend e navegação mobile
npm run test:front

# Testes específicos de navegação mobile e prevenção de OOM
npx tsx --test tests/frontendNavigationMobile.test.tsx tests/pdfOutOfMemoryPrevention.test.tsx

# Verificação estática contra vazamento de globais de navegador desprotegidos
git grep -n "window\." src/
git grep -n "document\." src/
git grep -n "navigator\.clipboard" src/

# Exportação estática do bundle Android (validação do empacotamento Metro/Hermes)
npx expo export --platform android

# Suíte completa de qualidade e integridade
npm run test:all
```

---

## 🔧 6. Diagnóstico & Resolução de Falhas Comuns no APK

| Sintoma de Falha no APK | Causa Raiz Provável | Correção Recomendada |
| :--- | :--- | :--- |
| `ReferenceError: Property 'window' doesn't exist` | Acesso direto a `window` em componente ou serviço no runtime Hermes | Proteger o bloco com `if (Platform.OS === 'web' && typeof window !== 'undefined')`. |
| Botão de copiar não tem efeito e não copia texto | Chamada direta a `navigator.clipboard.writeText` em runtime nativo | Substituir por `copyToClipboard` de `src/utils/clipboard.ts` com fallback para `Share.share`. |
| Modal fecha e perde progresso ao tocar em Voltar | Modal multi-etapas sem interceptação de `onRequestClose` e `BackHandler` | Implementar recuo de `step` e confirmação antes de fechar (`confirmAction`). |
| `Network request failed` ao conectar a Ollama local | Bloqueio de tráfego HTTP claro (cleartext) no Android 9+ | Adicionar `usesCleartextTraffic: true` em `app.json` e usar `10.0.2.2` no emulador. |
| Crash `OutOfMemoryError` ao abrir múltiplos PDFs | Esgotamento de heap da JVM no carregamento de documentos | Verificar se `largeHeap: true` está ativo em `app.json` e liberar cache via `expo-file-system`. |
