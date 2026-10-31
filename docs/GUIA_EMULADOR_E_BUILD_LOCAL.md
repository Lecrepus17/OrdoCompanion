# 📱 Guia de Execução Local: Emulador Android & Build do APK

Este documento registra o diagnóstico do erro de build local com o Gradle, as correções aplicadas no projeto e o passo a passo exato para quando você retomar o desenvolvimento.

---

## 🔍 O que ocorreu (Diagnóstico do Erro)

Ao executar `npx expo run:android`, o Expo e o Gradle retornaram:
```text
ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local properties file...
```

### Causas:
1. **Sessão do PowerShell sem variáveis ativas**: O terminal atual do Windows foi aberto antes da instalação do Android Studio e não recarregou o `JAVA_HOME` e `ANDROID_HOME` na memória da sessão.
2. **`local.properties` ausente na pasta `android/`**: O Gradle em projetos nativos do Android exige o arquivo `android/local.properties` com o caminho absoluto do SDK (`sdk.dir`).
3. **Versão do Java no Windows**: O Windows possuía um Java 8 antigo no PATH global, enquanto o React Native 0.88 / Expo exige Java moderno (JDK 17 ou superior). O Android Studio instala esse JDK moderno em `C:\Program Files\Android\Android Studio\jbr`.

---

## 🛠️ O que já foi corrigido e configurado

Todas as configurações estruturais já foram aplicadas no projeto:

1. **`android/local.properties` Criado**:
   ```properties
   sdk.dir=C\:\\Users\\Pichau\\AppData\\Local\\Android\\Sdk
   ```
2. **Detecção do JDK no `android/gradlew.bat` & Scripts de Inicialização**:
   - O JDK moderno do Android Studio (`C:\Program Files\Android\Android Studio\jbr`) é resolvido automaticamente pelo `android/gradlew.bat` e pelos scripts `iniciar_emulador_e_app.bat`/`.ps1`.
   - **Importante**: O caminho local de Windows **não** deve ser fixado em `android/gradle.properties` (`org.gradle.java.home`), pois isso quebra compilações na nuvem do Expo EAS Build (que executam em containers Linux).
3. **`android/gradlew.bat` Blindado**:
   Adicionada verificação de contingência que detecta o JDK do Android Studio mesmo em terminais sem `JAVA_HOME`.
4. **Android NDK 27.1, CMake e Ninja 1.12.1 Instalados**:
   - O erro `[CXX1101]` foi sanado com o download completo do NDK 27.1.12297006 e Build-Tools 37.
   - O erro `Filename longer than 260 characters` causado pela versão antiga do `ninja.exe` (1.10.2) foi superado com a atualização do executável do Ninja para a versão moderna **1.12.1**, que remove o limite estático de 260 caracteres em builds do CMake no Windows.
5. **APK Compilado e Instalado com Sucesso**:
   - O build de debug nativo (`app-debug.apk` ~74 MB) foi compilado com `BUILD SUCCESSFUL` e instalado no emulador `Medium_Phone_API_37.0`.
6. **Gradle 9.4.1 Validado**: O wrapper do Gradle já foi baixado e testado com sucesso.
7. **Emulador Conectado e App Inicializado**: O emulador `Medium_Phone_API_37.0` já está funcionando e com o Ordo Companion instalado e em execução via ADB.

---

## ⚠️ Passo Único Obrigatório no Windows: Habilitar Long Paths

No React Native 0.88 com a Nova Arquitetura, bibliotecas nativas como `react-native-safe-area-context` geram arquivos C++ intermediários com caminhos profundos. O Windows possui um limite legado de **260 caracteres** que faz o compilador `ninja.exe` parar com o erro `Filename longer than 260 characters`.

Para desativar esse limite no seu Windows de uma vez por todas:

1. Abra o **PowerShell como Administrador** (clique com o botão direito no menu Iniciar > "Terminal (Administrador)" ou "PowerShell (Administrador)").
2. Cole e execute o comando:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```
3. Pronto! O Windows aceitará caminhos de até 32.767 caracteres sem qualquer restrição.

---

## 🚀 Como Executar quando Retomar (2 Opções)

### Opção 1: Arquivo de 1 Clique ou Comando npm (Recomendado)
Criamos scripts automatizados que já gerenciam variáveis, inicialização e conexão com o emulador:

* Pelo terminal (CMD ou PowerShell):
  ```bash
  npm run android:emu
  ```
* Ou caso prefira o script direto no PowerShell:
  ```powershell
  npm run android:emu:ps
  ```
* Ou simplesmente dê **dois cliques** em [`scripts/iniciar_emulador_e_app.bat`](file:///c:/Users/Pichau/Documents/GitHub/OrdoCompanion/scripts/iniciar_emulador_e_app.bat) pelo Windows Explorer.

> Esse script injeta o `JAVA_HOME` e `ANDROID_HOME`, verifica se o emulador já está aberto (e abre caso não esteja), aguarda a conexão com o ADB (`adb wait-for-device`) e roda o `npx expo run:android` automaticamente!

---

### Opção 2: Manual pelo PowerShell

Se preferir rodar manualmente no seu terminal:

1. **Abra o Emulador em segundo plano** (caso não esteja aberto):
   ```powershell
   Start-Process "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd Medium_Phone_API_37.0"
   ```
2. **No terminal do projeto, execute**:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
   npx expo run:android
   ```

---

## ⚡ O que esperar durante o primeiro build:
* O primeiro build baixa as bibliotecas nativas e o NDK (leva cerca de 3 a 5 minutos na primeira vez).
* Nos builds seguintes, a compilação é quase instantânea graças ao cache do Gradle.
* Uma vez instalado no emulador, você terá **Hot Reload / Fast Refresh**: qualquer alteração no código atualiza no celular na hora sem recompilar!
