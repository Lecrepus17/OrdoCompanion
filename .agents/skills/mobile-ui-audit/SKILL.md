---
name: mobile-ui-audit
description: >-
  Audita a interface multiplataforma (Mobile, Tablet e Desktop Web/PWA) e UX do Ordo Companion, garantindo conformidade com a paleta tática sombria e tema claro/escuro, contraste, uso obrigatório de SafeAreaView, responsividade desde smartphones compactos (360px e paisagem) até monitores widescreen no PC (1024px–1920px+), e ausência de quebras de layout ou overflow em modais.
---

# Auditoria de Frontend & UI/UX Multiplataforma (Mobile, Tablet & PC) - Ordo Companion

Utilize este guia e checklist tático para criar, auditar e refatorar telas, modais e componentes no Ordo Companion garantindo ergonomia tanto no celular (Android/iOS) quanto no tablet e no **Aplicativo para PC (Web/PWA Desktop)**.

---

## 🎨 1. Identidade Visual, Paleta Paranormal & Temas (Escuro e Claro)

O design do Ordo Companion simula uma interface tática de operações de campo da **Ordo Realitas**, impregnada pela influência do Outro Lado.

### Cores Base do Sistema
* **Fundo Primário (Tema Escuro)**: `#0A0A0C` / `#0D0F12` ou `#12151B` (Preto/Grafite profundo tático).
* **Fundo de Cards**: `#171A21` ou `#1C2029` com bordas sutis em `#2A303C`.
* **Texto Primário**: `#F0F4F8` (Alto contraste para legibilidade em campo).
* **Texto Secundário / Labels**: `#94A3B8` ou `#7E8B9B`.
* **Tema Claro & Temas dos Elementos**: Toda alteração visual **DEVE** usar `useTheme()` / `useThemedStyles(createStyles)` (nunca hardcodar `#FFFFFF` ou `#000000` em fundos/textos dinâmicos) e preservar contraste legível em todos os temas disponíveis.

### Elementos do Outro Lado (Acentos Táticos)
* 🩸 **Sangue**: `#E63946` ou `#B91C1C` (Agressividade, dano, PV crítico).
* ⏳ **Morte**: `#1F2421` com acentos cinza-espiral `#9CA3AF` e lodo `#4B5563`.
* 👁️ **Conhecimento**: `#EAB308` ou `#CA8A04` (Dourado/âmbar, lógica, sigilos).
* ⚡ **Energia**: `#A855F7` ou `#8B5CF6` (Roxo/magenta caótico, imprevisibilidade).
* 🌑 **Medo**: `#0F172A` / `#38BDF8` (O desconhecido, névoa ciana tênue).

---

## 📐 2. Responsividade Multiplataforma por Breakpoint

O aplicativo roda em **smartphones compactos (`360px`)**, **modo paisagem (`height < 500`)**, **tablets (`768px+`)** e **PC / Desktop Web & PWA (`1024px–1920px+`)**.

### 📱 A) Mobile Compacto (`360px`–`430px`) e Paisagem (`height < 500px`)
- [ ] **SafeAreaView & Insets**: Envolver telas completas com `SafeAreaView` (`react-native-safe-area-context`) para evitar invasão de notch, barra de status translúcida e navegação por gestos.
- [ ] **Zero Larguras Fixas Excessivas**: Nunca usar larguras fixas superiores a `320px` sem `maxWidth: '100%'`. Preferir `flex: 1`, porcentagens e `flexWrap: 'wrap'` em linhas de badges/botões.
- [ ] **Modo Paisagem Compacto**: Respeitar `isLandscape = width > height && height < 500` em cabeçalhos (`TabsLayout`) e barra inferior (`CustomBottomTabBar`) para preservar área útil de leitura.
- [ ] **Prevenção de Text Overflow**: Títulos, chips e nomes de habilidades devem usar `numberOfLines` e `ellipsizeMode="tail"` quando delimitados, sem cortar botões de ação.

### 📲 B) Tablet (`768px`–`1023px`)
- [ ] **Aproveitamento de Grade**: Suportar visualização em 2 colunas (`listingColumns: 2`) sem distorcer proporção de cards.
- [ ] **Anotações & Leitor de PDF**: Garantir área confortável de toque/stylus e barra de ferramentas sem sobrepor conteúdo da página.

### 💻 C) Desktop / PC Web & PWA (`>= 1024px` até `1920px+`)
- [ ] **Contenção de Largura Legível (`maxWidth`)**: Em telas largas no PC, formulários, containers de leitura, cards de detalhe e painéis centrais devem limitar largura máxima ou centralizar conteúdo (`alignSelf: 'center'`, `width: '100%'`, `maxWidth`) para evitar linhas intermináveis em monitores widescreen — **sem alterar** o comportamento `100%` no mobile.
- [ ] **Janela PWA Redimensionável**: O layout deve responder dinamicamente a `useWindowDimensions()` ao redimensionar a janela standalone do aplicativo no PC (inclusive quando encolhida para largura compacta lado a lado com Discord/VTT).
- [ ] **Ergonomia de Mouse & Teclado**:
  - Áreas clicáveis com feedback visual claro, textos informativos selecionáveis (`selectable`) e barras de rolagem funcionais via roda do mouse (`ScrollView` / `FlatList`) sem travamentos de scroll aninhado.
  - Em listas horizontais no PC, garantir setas/controles ou rolagem acessível sem depender exclusivamente de swipe touch.

---

## 🪟 3. Modais, Overlays & Interações Complexas (Mobile + PC)

Modais críticos (`CreateAgentModal`, `LevelUpModal`, `RecordPreviewModal`, `OracleModal`, `UserProfileModal`, `UpdateNotificationModal`, `PdfViewerModal`, `ThreatCreatorModal`):
- [ ] **Cabeçalho e Fechamento**: O cabeçalho com botão de fechar (`X`) deve permanecer fixo/acessível mesmo em telas pequenas ou janelas desktop de altura reduzida.
- [ ] **Teclado Virtual & Físico**: Rodapé e campos devem respeitar `KeyboardAvoidingView` (iOS), `adjustPan` (Android) e `keyboardShouldPersistTaps="handled"`, sem roubar foco no teclado físico do PC.
- [ ] **Hardware Back vs. Desktop**: No Android, respeitar `BackHandler` e `onRequestClose` (com guarda `Platform.OS !== 'web'`); na Web/Desktop, limitar largura máxima (`maxWidth: 480`–`680`, `maxHeight: '90%'`) e centralizar o modal com backdrop clicável quando apropriado.

---

## 🧪 4. Validação e Testes Visuais

Execute a suíte focada em interface e responsividade multiplataforma:

```powershell
# Executa todos os testes de componentes e telas frontend
npm run test:front

# Testes específicos de navegação mobile, modais e UI PC/PWA
npx tsx --test tests/frontendNavigationMobile.test.tsx tests/desktopPwaSupport.test.ts tests/frontendUpdateNotification.test.tsx tests/createAgentModal.test.tsx
```
