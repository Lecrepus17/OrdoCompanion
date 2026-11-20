# 🩸 Ordo Companion v1.7.0-beta.1

## 🚀 Principais Novidades da v1.7.0-beta.1

* **Aplicativo para PC (Web App + PWA Instalável Offline — `SOL-MEL-001`)**:
  * O Ordo Companion agora pode ser instalado e executado como aplicativo standalone no computador (Windows, macOS e Linux) via Chrome/Edge com suporte offline (Service Worker + manifesto PWA), atualização direta pelo modal de novidades (`Atualizar Aplicativo no PC`), botão de instalação no Perfil e exportação/importação direta de arquivos `.json` de backup no disco.
* **Central de Suporte com Filas Separadas (Erros vs. Melhorias)**:
  * Chamados enviados pelo aplicativo (incluindo APK Android via Proxy Seguro Supabase ou Discord Webhook) agora identificam a fila de triagem (`🐛 ERROS` para bugs/erros de regra vs. `💡 MELHORIAS` para sugestões) e suportam roteamento automático para canais distintos no Discord (`#erros` e `#melhorias`), com fallback seguro para o webhook geral.
* **Login Google Drive OAuth (Android & PC/Web) + Política de Privacidade & Termos (`SOL-ERR-001`)**:
  * Suporte ao scheme reverso oficial do Google no Android APK, páginas estáticas de callback `/oauthredirect` para Web/PC, mensagens claras para erros OAuth (403/400) com painel de diagnóstico copiável na aba Nuvem e publicação oficial de Política de Privacidade e Termos de Serviço.

---

## 📲 Instalação e Atualização (Android APK)
1. Baixe o arquivo **`OrdoCompanion.apk`** anexado abaixo na seção **Assets**.
2. Abra o arquivo no seu smartphone ou tablet Android para instalar ou atualizar mantendo todas as suas fichas, anotações e campanhas salvas.

## 💻 Instalação e Uso no PC (Windows, macOS e Linux)
1. Acesse a versão Web do **Ordo Companion** no navegador **Google Chrome** ou **Microsoft Edge** (ou gere localmente com `npm run build:pc`).
2. Clique no ícone de **Instalar Aplicativo** na barra de endereços (ou em **Perfil ➔ Instalar Aplicativo no PC**) para usar em janela dedicada e offline como aplicativo desktop (PWA).
3. Sincronize suas fichas, campanhas e PDFs entre o celular e o PC pelo **Google Drive** ou exportando/importando o arquivo **`.json`** na aba **Nuvem**.
