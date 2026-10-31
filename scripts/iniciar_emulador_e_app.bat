@echo off
title Ordo Companion - Emulador Android
echo ========================================================
echo   Iniciando Emulador e Ambiente Nativo do Ordo Companion
echo ========================================================

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\emulator;%PATH%"

echo 1. Verificando emulador...
tasklist /FI "IMAGENAME eq qemu-system-x86_64.exe" 2>NUL | find /I /N "qemu-system-x86_64.exe">NUL
if "%ERRORLEVEL%"=="0" goto emu_running

echo    Iniciando emulador Medium_Phone_API_37.0...
start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd Medium_Phone_API_37.0
echo    Aguardando conexao com o emulador via ADB...
"%ANDROID_HOME%\platform-tools\adb.exe" wait-for-device
echo    Emulador online no ADB. Aguardando inicializacao do Android...
ping 127.0.0.1 -n 8 >nul
goto run_app

:emu_running
echo    Emulador ja esta em execucao!

:run_app
echo 2. Executando npx expo run:android...
cd /d "%~dp0\.."
call npx expo run:android
pause
