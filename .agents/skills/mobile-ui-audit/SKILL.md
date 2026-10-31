---
name: mobile-ui-audit
description: >-
  Audita a interface móvel e web do Ordo Companion, garantindo conformidade com a paleta tática sombria paranormal, uso obrigatório de SafeAreaView, responsividade em telas menores (360px), suporte multiplataforma (iOS, Android e Web) e ausência de quebras de layout ou overflow em modais.
---

# Auditoria de Frontend & Mobile UX - Ordo Companion

Utilize este guia e checklist tático para criar, auditar e refatorar telas e componentes no Ordo Companion.

---

## 🎨 1. Identidade Visual & Paleta Sombria Paranormal

O design do Ordo Companion simula uma interface tática de operações de campo da **Ordo Realitas**, impregnada pela influência do Outro Lado.

### Cores Base do Sistema
* **Fundo Primário**: `#0D0F12` ou `#12151B` (Preto/Grafite profundo tático).
* **Fundo de Cards**: `#171A21` ou `#1C2029` com bordas sutis em `#2A303C`.
* **Texto Primário**: `#F0F4F8` (Alto contraste para legibilidade em campo).
* **Texto Secundário / Labels**: `#94A3B8` ou `#7E8B9B`.

### Elementos do Outro Lado (Acentos Táticos)
* 🩸 **Sangue**: `#E63946` ou `#B91C1C` (Agressividade, dano, PV crítico).
* ⏳ **Morte**: `#1F2421` com acentos cinza-espiral `#9CA3AF` e lodo `#4B5563`.
* 👁️ **Conhecimento**: `#EAB308` ou `#CA8A04` (Dourado/âmbar, lógica, sigilos).
* ⚡ **Energia**: `#A855F7` ou `#8B5CF6` (Roxo/magenta caótico, imprevisibilidade).
* 🌑 **Medo**: `#0F172A` / `#38BDF8` (O desconhecido, névoa ciana tênue).

---

## 📐 2. Responsividade & Compatibilidade de Telas

O aplicativo roda em **smartphones Android compactos (360px de largura)**, **iPhones modernos com notch/Dynamic Island** e **navegadores desktop (Expo Web)**.

### Checklist Obrigatório:
- [ ] **SafeAreaView**: Sempre envolver telas completas com `SafeAreaView` do pacote `react-native-safe-area-context` para evitar invasão do notch superior e da barra de navegação por gestos inferior.
- [ ] **Evitar Larguras Fixas Excessivas**: Nunca use larguras fixas superiores a `320px` sem `maxWidth: '100%'`. Prefira porcentagens ou layouts flexíveis (`flex: 1`).
- [ ] **Scroll em Conteúdo Dinâmico**: Formulários, listas e modais devem sempre estar dentro de `ScrollView` ou `FlatList` com `keyboardShouldPersistTaps="handled"`.
- [ ] **Prevenção de Text Overflow**: Textos de títulos e nomes de habilidades devem utilizar `numberOfLines` e `ellipsizeMode="tail"` quando o espaço for delimitado.

---

## 📱 3. Modais & Interações Complexas

Modais críticos (`CreateAgentModal`, `LevelUpModal`, `RecordPreviewModal`, `OracleModal`):
- [ ] O cabeçalho com botão de fechar (`X`) deve permanecer fixo ou sempre acessível.
- [ ] O rodapé com botões de ação primária/secundária deve respeitar o teclado virtual (`KeyboardAvoidingView` no iOS).
- [ ] Em Expo Web, os modais devem limitar sua largura máxima (`maxWidth: 600`) e centralizar na tela.

---

## 🧪 4. Validação e Testes Visuais

Execute a suíte focada em interface:
```bash
# Executa testes unitários de componentes e telas
npm run test:front

# Teste específico de modais ou telas
npx tsx --test tests/frontendNavigationMobile.test.tsx
npx tsx --test tests/createAgentModal.test.tsx
```
