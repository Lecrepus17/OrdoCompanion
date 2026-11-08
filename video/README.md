# 🎬 Ordo Companion — Vídeo Promocional (Remotion)

Projeto isolado em **Remotion (React + TypeScript)** para geração do vídeo promocional do APK do **Ordo Companion** nos formatos:
- **16:9 (`1920x1080`, 30fps, 45s)**: LinkedIn, YouTube, X
- **9:16 (`1080x1920`, 30fps, 45s)**: Instagram Reels, TikTok, YouTube Shorts
- **Discord (`1280x720`, comprimido < 10 MB)**: Discord (sem Nitro)
- **Thumbnail (`1920x1080`)**: Capa de alta resolução

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

### 3. Capturar Clipes do Emulador Android
Com o emulador `Medium_Phone_API_37.0` aberto e o Ordo Companion instalado:
```powershell
cd video
npm run capture
```
Os clipes `.mp4` são salvos em `video/public/clips/`:
- `home.mp4` (Cena 2 — Tela Inicial)
- `compendio.mp4` (Cena 3 — Compêndio / Busca de Rituais)
- `agentes.mp4` (Cena 4 — Fichas de Agentes com PV/PE/SAN)
- `dados.mp4` (Cena 5 — Rolador de Dados)
- `mestre.mp4` (Cena 6 — Central do Mestre / Mesa)
- `oraculo.mp4` (Cena 7 — Oráculo G.L.I.T.C.H. Offline)

> **Dica (Captura Híbrida):** Se quiser substituir qualquer clipe por uma gravação manual feita no celular, basta salvar o arquivo `.mp4` com o mesmo nome dentro de `video/public/clips/`.

### 4. Música de Fundo
Salve a faixa de áudio escolhida em:
```
video/public/music.mp3
```
*(Se `music.mp3` ainda não estiver presente, o vídeo renderiza normalmente sem quebrar e ativa a trilha com fade-in de 1s e fade-out de 2s assim que o arquivo for adicionado).*

### 5. Editar Textos e Frases
Todos os textos, durações e links ficam centralizados em `video/src/copy.ts`.

### 6. Renderizar Todos os Formatos
```powershell
cd video
npm run render:all
```
Os arquivos finais serão gerados em `video/out/`.
