# 🎬 Ordo Companion — Vídeo Promocional (Remotion)

Projeto isolado em **Remotion (React + TypeScript)** para geração do vídeo promocional multiplataforma (**Android APK + PC Web / Desktop PWA**) do **Ordo Companion** nos formatos:
- **16:9 (`1920x1080`, 30fps, 45s)**: LinkedIn, YouTube, X
- **9:16 (`1080x1920`, 30fps, 45s)**: Instagram Reels, TikTok, YouTube Shorts
- **Discord (`1280x720`, comprimido < 10 MB)**: Discord (sem Nitro)
- **Thumbnail (`1920x1080`)**: Capa de alta resolução com **PC Desktop PWA + Celular Android** juntos

---

## 📱💻 Cenas Híbridas (Celular + PC)

O storyboard alterna entre a moldura **Celular 3D (`PhoneFrame.tsx`)** e a moldura **PC Desktop PWA Standalone 3D (`DesktopFrame.tsx`)**:
- **Cena 2 — Home (`home`)**: 📱 Android APK (`clips/home.mp4`)
- **Cena 3 — Acervo de Livros & PDFs (`compendio`)**: 💻 PC Web / Desktop PWA (`clips/compendio-pc.mp4`)
- **Cena 4 — Fichas de Agentes (`agentes`)**: 📱 Android APK (`clips/agentes.mp4`)
- **Cena 5 — Rolador de Dados (`dados`)**: 📱 Android APK (`clips/dados.mp4`)
- **Cena 6 — Central do Mestre & Mesa VTT (`mestre`)**: 💻 PC Web / Desktop PWA (`clips/mestre-pc.mp4`)
- **Cena 7 — G.L.I.T.C.H. Paranormal (`oraculo`)**: 💻 PC Web / Desktop PWA (`clips/oraculo-pc.mp4`)

> **Fallback Animado Inteligente:** Caso algum arquivo `.mp4` não exista em `video/public/clips/`, tanto o `PhoneFrame` quanto o `DesktopFrame` renderizam telas animadas fiéis à interface real do app (incluindo layout widescreen em 2 colunas no PC).

---

## 🚀 Como Usar

### 1. Instalar dependências (apenas na primeira vez)
```powershell
cd video
npm install
```

### 2. Abrir o Studio Interativo (Prévia em tempo real)
```powershell
cd video
npm run studio
```

### 3. Capturar Clipes (Opcional)
- **Emulador Android** (`Medium_Phone_API_37.0`):
  ```powershell
  cd video
  npm run capture
  ```
  Salva em `video/public/clips/` (`home.mp4`, `agentes.mp4`, `dados.mp4`).
- **PC Web / Desktop PWA**: grave a janela standalone do PC (~1920x1080 ou ~16:10) e salve como `compendio-pc.mp4`, `mestre-pc.mp4` e `oraculo-pc.mp4` dentro de `video/public/clips/` caso queira substituir as telas animadas padrão.

### 4. Música de Fundo
Salve a faixa de áudio escolhida em:
```
video/public/music.mp3
```
*(Se `music.mp3` ainda não estiver presente, o vídeo renderiza normalmente sem quebrar e ativa a trilha com fade-in de 1s e fade-out de 2s assim que o arquivo for adicionado).*

### 5. Editar Textos, Dispositivos e Frases
Todos os textos, dispositivos (`'phone' | 'desktop'`), durações e links ficam centralizados em `video/src/copy.ts`.

### 6. Renderizar Todos os Formatos
```powershell
cd video
npm run render:all
```
Os arquivos finais serão gerados em `video/out/`.
