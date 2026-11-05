# 🤖 Plano e Guia de Compatibilidade Android APK (Hermes Runtime)

Este documento registra o estado atual da compatibilidade com o aplicativo compilado como **.apk** no Android, detalha o que já foi implementado e auditado, e fornece o checklist passo a passo com instruções exatas do que falta para atingir 100% de paridade e precisão no Android.

---

## ✅ 1. O Que Já Foi Implementado e Validado

### 🛡️ Novo Agente Especializado e Skill Dedicada
- **Skill Criada**: [SKILL.md](file:///.agents/skills/android-apk-audit/SKILL.md) sob `.agents/skills/android-apk-audit/` com diretrizes estritas contra vazamento de APIs web (`window`, `document`, `navigator`), tratamento de `BackHandler` de hardware, safe areas e exportação de dados no Android.
- **Agente Registrado**: `android-apk-guardian` registrado no [GEMINI.md](file:///GEMINI.md) na Matriz de Roteamento Automático e nos padrões de subagentes.

### ⚙️ Configurações Nativas no `app.json`
- **Gerenciamento de Memória**: `largeHeap: true` ativado para evitar *Out of Memory* (OOM) no Android ao carregar compêndios pesados e imagens de fichas.
- **Permissões Nativas**: Inclusão de `android.permission.INTERNET` no manifesto do Android.
- **Tráfego Cleartext**: Adicionado `usesCleartextTraffic: true` para viabilizar conexões com serviços locais (ex: IA Ollama local, servidores de desenvolvimento em rede Wi-Fi).
- **Layout de Teclado**: Ajustado `softwareKeyboardLayoutMode: "adjustPan"` para evitar esmagamento de layout ao abrir o teclado virtual.

### 🔮 IA G.L.I.T.C.H. & Roteamento Ollama no Android
- **Resolução Dinâmica de Host**: Atualizado [AiClient.ts](file:///src/services/ai/AiClient.ts) para mapear chamadas de loopback (`localhost`, `127.0.0.1`) para o gateway do emulador Android (`10.0.2.2`) ou para o IP da máquina de desenvolvimento via `getDevServerHostIp()`.
- **Comunicação Keyless**: Suporte para conexões com provedor Ollama sem exigir chave de API prévia.

### 📦 Compartilhamento de Fichas & Codificação Hermes
- **Base64 Nativo sem Dependências**: Em [agentSharing.ts](file:///src/utils/agentSharing.ts), a codificação e decodificação foi reescrita sem depender de `Buffer` do Node nem de `btoa`/`atob` de browser, com suporte total e verificado a emojis e caracteres UTF-8.

### 🧪 Validação Técnica & Compilação Hermes
- **Compilação de Bytecode Android**: `npx expo export --platform android` compilou com sucesso **1.391 módulos** em bytecode Hermes (`.hbc`) no diretório `dist/` com código de saída 0.
- **TypeScript**: `npm run typecheck` passando com **0 erros**.
- **Testes**: Suítes unitárias e testes adversariais passando 100% (`tests/agentSharing.adversarial.test.ts`, `tests/aiOllama.adversarial.test.ts`, `tests/appJson.adversarial.test.ts`).

---

## 📋 2. O Que Falta Implementar (Instruções Passo a Passo)

Para concluir os 100% de compatibilidade em telas e fluxo de usuário no `.apk`, execute os seguintes passos:

### 🔙 Passo 1: Interceptação do Botão Físico "Voltar" (`BackHandler`)
No Android, pressionar o botão físico ou o gesto de voltar do sistema fecha o app se o evento não for interceptado por modais abertos.
* **Arquivos**:
  - `src/components/CreateAgentModal.tsx`
  - `src/components/LevelUpModal.tsx`
  - `src/components/RecordPreviewModal.tsx`
  - `src/components/OracleModal.tsx`
* **O que fazer**:
  - Importar `BackHandler` do `react-native`:
    ```tsx
    import { BackHandler } from 'react-native';
    ```
  - Adicionar um `useEffect` ativo enquanto o modal estiver visível:
    ```tsx
    useEffect(() => {
      if (!visible) return;
      const onBackPress = () => {
        if (currentStep > 1) {
          // Retrocede etapa em vez de fechar
          setCurrentStep(prev => prev - 1);
          return true; // Consome o evento
        }
        // Se estiver na primeira etapa, pergunta ou fecha com confirmação
        onClose();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [visible, currentStep]);
    ```

### 📋 Passo 2: Utilitário Centralizado de Área de Transferência (`Clipboard`)
Atualmente, alguns componentes acessam `navigator.clipboard.writeText` diretamente sem verificar se a API existe, o que lança exceção não tratada no runtime Hermes do Android.
* **Arquivos Afetados**:
  - `src/components/UserProfileModal.tsx` (exportação/cópia de código de backup)
  - `src/app/(tabs)/characters.tsx` (cópia de código de compartilhamento da ficha)
  - `src/components/AiChatMessageItem.tsx` (cópia de mensagens do G.L.I.T.C.H.)
  - `src/components/SupportCenterView.tsx` (cópia de logs de diagnóstico)
* **O que fazer**:
  - Criar ou utilizar um utilitário unificado (ex: `src/utils/clipboard.ts`):
    ```tsx
    import { Platform, Share } from 'react-native';
    import * as Clipboard from 'expo-clipboard'; // ou fallback via Share

    export async function copyToClipboard(text: string, title?: string): Promise<boolean> {
      try {
        if (Platform.OS === 'web') {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
          }
        }
        // No Android nativo:
        await Clipboard.setStringAsync(text);
        return true;
      } catch (e) {
        // Fallback nativo: abre o dialog de compartilhamento do Android se o clipboard falhar
        try {
          await Share.share({ message: text, title });
          return true;
        } catch {
          return false;
        }
      }
    }
    ```
  - Substituir as chamadas `navigator.clipboard.writeText(...)` por `copyToClipboard(...)`.

### 🖨️ Passo 3: Blindagem em Exportadores de PDF e Impressão
* **Arquivos**:
  - `src/utils/sheetPrinter.ts`
  - Rotinas de exportação de relatórios da Mesa Virtual
* **O que fazer**:
  - Garantir que qualquer chamada a `window.print()` ou criação dinâmica de tags `<iframe>` e `<style>` esteja protegida por:
    ```tsx
    if (Platform.OS === 'web' && typeof window !== 'undefined') { ... }
    ```
  - No Android, utilizar `expo-print` (`Print.printAsync` ou `Print.printToFileAsync`) combinado com `expo-sharing` (`Sharing.shareAsync`).

---

## 🧪 3. Como Validar as Alterações Finais

Ao terminar a implementação dos passos acima, execute os comandos de verificação:

```bash
# 1. Checagem de tipos estrita
npm run typecheck

# 2. Testes de regras e componentes
npm run test:rules
npm run test:front

# 3. Compilação estática do bundle Android Hermes
npx expo export --platform android
```
