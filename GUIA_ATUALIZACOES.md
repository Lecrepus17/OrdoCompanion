# 🚀 Guia de Distribuição e Atualizações — Ordo Companion

Este documento explica em detalhes **como disponibilizar novas versões do Ordo Companion para os usuários**, comparando todos os métodos possíveis de hospedagem, seus **benefícios**, **desvantagens** e o **passo a passo** para cada um.

---

## 🧭 Como Funciona o Sistema de Atualização do App

O **Ordo Companion** possui um sistema inteligente de detecção de versões:
1. **Ao abrir o aplicativo**: Após 2,5 segundos, o app consulta o arquivo remoto `version.json` hospedado no repositório GitHub (com fallback para a API pública de Releases do GitHub).
2. **Comparação SemVer**: Se a versão remota (`latestVersion`) for maior que a versão instalada (`currentVersion`), um modal com o tema paranormal é exibido na tela.
3. **Notas e Download**: O usuário visualiza o que mudou (changelog) e clica em **"Baixar Nova Versão"**, sendo redirecionado para o link configurado.
4. **Lembrar Mais Tarde**: Se o usuário preferir atualizar depois, ele pode adiar a notificação por 24 horas (a menos que seja uma atualização marcada como obrigatória via `minVersion` ou `forceUpdate`).
5. **Verificação Manual**: Na aba de perfil (`UserProfileModal`), o usuário pode tocar em **"Verificar Atualizações"** a qualquer momento.

---

## 📊 Comparativo dos Métodos de Distribuição

| Método | Custo | Dificuldade | Experiência do Usuário | Suporte a iOS | Atualização Automática |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. GitHub Releases (APK Direto)** ⭐ | **Gratuito** | Muito Fácil | ⭐⭐⭐⭐ (Baixa APK com 1 clique) | ❌ (Apenas Android/Web) | Manual (com aviso no app) |
| **2. Google Drive / Nuvem Pessoal** | **Gratuito** | Fácil | ⭐⭐⭐ (Download via Drive) | ❌ (Apenas Android/Web) | Manual (com aviso no app) |
| **3. Google Play Store** | \$25 (taxa única) | Moderada | ⭐⭐⭐⭐⭐ (Instalação oficial da loja) | ❌ (Android apenas) | Sim (Automático pela loja) |
| **4. Expo EAS Update (OTA)** | Gratuito (com limite) | Moderada | ⭐⭐⭐⭐⭐ (Silencioso em segundo plano) | ✔️ (Android e iOS) | Sim (Automático sem baixar APK) |
| **5. Web App (Vercel / GitHub Pages)** | **Gratuito** | Muito Fácil | ⭐⭐⭐⭐⭐ (Basta atualizar a página) | ✔️ (Qualquer navegador) | Imediato no carregamento |

---

## 🔍 Detalhamento de Cada Método

### 1. GitHub Releases (APK Direto) — ⭐ *Opção Mais Recomendada*

Como o projeto é código aberto no GitHub (`https://github.com/Lecrepus17/OrdoCompanion`), você pode usar a aba de **Releases** do próprio repositório para distribuir o aplicativo.

#### Como funciona:
1. Você gera o arquivo `.apk` no seu computador ou via Expo Application Services (`eas build -p android --profile preview`).
2. Acesse a aba **Releases** no GitHub e clique em **"Draft a new release"**.
3. Crie uma tag (ex.: `v1.1.0`), escreva as novidades e faça upload do arquivo `.apk`.
4. Os usuários do aplicativo recebem a notificação e, ao clicar em "Baixar Nova Versão", o navegador baixa o `.apk` direto do GitHub e abre o instalador do Android.

#### ✅ Benefícios:
- **100% Gratuito**: Sem taxas de loja, servidores ou custos de hospedagem.
- **Velocidade & Confiabilidade**: Download rápido nos servidores globais da Microsoft/GitHub.
- **Histórico Completo**: Os usuários podem baixar versões antigas caso queiram.
- **Zero Burocracia**: Não precisa passar por moderação ou aprovação de lojas.
- **Integração Total**: O app já possui fallback direto para ler a API de releases do GitHub caso o `version.json` esteja inacessível.

#### ❌ Desvantagens:
- No Android, o usuário precisará permitir "Instalar aplicativos de fontes desconhecidas" no primeiro download.
- Não instala em iPhones (iOS não permite instalação direta de arquivos de pacote sem certificado de desenvolvedor da Apple).

---

### 2. Google Drive / Nuvem Pessoal

Armazenar o `.apk` gerado em uma pasta compartilhada pública no Google Drive, Dropbox ou OneDrive.

#### Como funciona:
1. Você sobe o `.apk` gerado para o Google Drive.
2. Define a permissão do arquivo como *"Qualquer pessoa com o link pode ler/baixar"*.
3. Coloca o link de download no campo `downloadUrl` do `version.json`.

#### ✅ Benefícios:
- Gratuito e extremamente simples para quem já usa o Google Drive.
- Familiar para mestres e jogadores de RPG de mesa.

#### ❌ Desvantagens:
- O Google Drive costuma exibir telas intermediárias de *"Este arquivo não pode ser verificado contra vírus devido ao tamanho"*.
- Links públicos de arquivos grandes no Google Drive podem sofrer bloqueio temporário por limite de tráfego (*quota exceeded*) se muitas pessoas baixarem no mesmo dia.
- Menos profissional e sem versionamento automatizado.

---

### 3. Google Play Store (Distribuição Oficial Android)

Publicar o aplicativo oficialmente na loja da Google Play para qualquer pessoa instalar diretamente.

#### Como funciona:
1. É necessário criar uma conta no **Google Play Console** pagando a taxa única de registro de **\$25 dólares**.
2. Em vez de gerar APK, você gera um pacote `.aab` (Android App Bundle) usando:
   ```bash
   eas build -p android --profile production
   ```
3. Envia o pacote no painel da Google Play, preenche imagens promocionais, descrição e classificação indicativa.
4. Coloca o link da Play Store no `downloadUrl` do `version.json`.

#### ✅ Benefícios:
- **Máxima Confiança**: Instalação com 1 clique pela loja oficial, sem avisos de segurança.
- **Atualizações Automáticas**: O celular do usuário pode atualizar o app sozinho via Wi-Fi sem que ele precise fazer nada.
- **Estatísticas Avançadas**: Painel com quantidade de instalações ativas, relatórios de falhas (ANRs e crashes) e avaliações.

#### ❌ Desvantagens:
- Custo de \$25 USD.
- **Processo de Revisão da Google**: Toda atualização passa por aprovação humana/automatizada que pode levar de 2 a 7 dias úteis.
- **Atenção aos Direitos Autorais**: Como o aplicativo é um companheiro não-oficial para Ordem Paranormal RPG (Jambô Editora), as lojas de aplicativos costumam ter regras rígidas sobre uso de marcas no nome ou imagens protegidas. No GitHub (Open Source sob licença GPL), esse atrito é muito menor.

---

### 4. Expo EAS Update (Atualizações Over-The-Air / OTA)

Atualizar o código JavaScript e telas do aplicativo **diretamente no celular do usuário sem que ele precise reinstalar o APK**.

#### Como funciona:
1. Você faz alterações em telas React, componentes ou lógica TypeScript.
2. Roda o comando no terminal:
   ```bash
   npx eas update --branch production --message "Adicionado novo filtro de rituais"
   ```
3. Quando o usuário abrir o aplicativo conectado à internet, o Expo baixa o novo pacote de scripts silenciosamente e recarrega a tela com as novidades.

#### ✅ Benefícios:
- **Atualização Instantânea**: O usuário não precisa baixar nenhum `.apk` novo nem desinstalar nada.
- Funciona tanto em celulares Android quanto em iPhones (caso usem o app compilado).
- Excelente para correção urgente de bugs visuais ou adição de regras no compêndio.

#### ❌ Desvantagens:
- **Limitação de Código Nativo**: Se você adicionar uma nova biblioteca nativa que altera o código Android (como adicionar uma nova dependência que requer permissões de hardware no AndroidManifest), o EAS Update **não** consegue atualizar sozinho; é necessário gerar um novo APK.
- **Cota de Uso**: O plano gratuito do Expo possui uma cota mensal de requisições de atualização OTA.

---

### 5. Versão Web / PWA (Hospedagem em Nuvem)

O Ordo Companion já suporta compilação Web (`react-native-web`) pronta para hospedar em plataformas gratuitas como **Vercel**, **Netlify** ou **GitHub Pages**.

#### Como funciona:
1. Compila os arquivos estáticos:
   ```bash
   npx expo export -p web
   ```
2. Sobe a pasta `dist/` gerada para a Vercel ou Netlify.
3. Os usuários acessam por qualquer computador ou navegador de celular (`ordo-companion.vercel.app`) e podem até clicar em "Adicionar à Tela Inicial" (PWA).

#### ✅ Benefícios:
- Atualização 100% imediata: quando você publica, qualquer pessoa que atualizar a página recebe a versão mais recente instantaneamente.
- Funciona em qualquer sistema operacional (Windows, Mac, Linux, Android, iOS).

---

## 🛠️ Passo a Passo Prático: Como Lançar uma Nova Versão Hoje

Para lançar uma atualização (por exemplo, a versão `1.1.0`) e notificar todos os usuários:

### Passo 1: Atualizar o número de versão no código
1. No arquivo `package.json`:
   ```json
   "version": "1.1.0"
   ```
2. No arquivo `app.json`:
   ```json
   "version": "1.1.0"
   ```

### Passo 2: Gerar o novo arquivo APK
Execute o build pelo EAS:
```bash
eas build -p android --profile preview
```
*(Ao final, o EAS fornecerá o link direto para download do arquivo `.apk` compilado).*

### Passo 3: Publicar no GitHub Releases
1. Acesse: `https://github.com/Lecrepus17/OrdoCompanion/releases/new`
2. No campo **Tag**, digite: `v1.1.0`
3. No campo **Release Title**, digite: `Ordo Companion v1.1.0`
4. Arraste e solte o arquivo `.apk` baixado na área de anexos (*Attach binaries by dropping them here*).
5. Clique em **Publish release**.

### Passo 4: Atualizar o `version.json` na raiz do repositório
Edite o arquivo [`version.json`](version.json) no repositório:
```json
{
  "version": "1.1.0",
  "minVersion": "1.0.0",
  "releaseName": "Ordo Companion v1.1.0 - Suporte ao Suplemento #09 e Ameaças",
  "releaseDate": "2026-10-25",
  "downloadUrl": "https://github.com/Lecrepus17/OrdoCompanion/releases/latest",
  "apkUrl": "https://github.com/Lecrepus17/OrdoCompanion/releases/download/v1.1.0/OrdoCompanion.apk",
  "changelog": [
    "Adicionados 50 novos rituais e poderes de classes",
    "Novo sistema de busca com filtros avançados",
    "Correção nos cálculos de passos de dano em armas amaldiçoadas",
    "Melhorias na performance de renderização de fichas"
  ],
  "forceUpdate": false
}
```

Faça commit e push para a branch `main`:
```bash
git add version.json package.json app.json
git commit -m "chore: lançar versão 1.1.0 com novo compêndio"
git push origin main
```

🎉 **Pronto!** Em questão de segundos, qualquer usuário com uma versão anterior (como a `1.0.0`) receberá o modal de atualização com as novidades descritas e o botão direto para baixar a nova versão.
