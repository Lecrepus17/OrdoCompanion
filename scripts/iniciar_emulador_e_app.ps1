Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Emulador e Ambiente Nativo do Ordo Companion" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

Write-Host "1. Verificando emulador..." -ForegroundColor Yellow
$proc = Get-Process -Name "qemu-system-x86_64" -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "   Emulador ja esta em execucao!" -ForegroundColor Green
} else {
    Write-Host "   Iniciando emulador Medium_Phone_API_37.0..." -ForegroundColor Yellow
    Start-Process "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd Medium_Phone_API_37.0"
    Write-Host "   Aguardando conexao com o emulador via ADB..." -ForegroundColor Yellow
    & "$env:ANDROID_HOME\platform-tools\adb.exe" wait-for-device
    Write-Host "   Emulador online. Aguardando inicializacao do Android..." -ForegroundColor Yellow
    Start-Sleep -Seconds 7
}

Write-Host "2. Executando npx expo run:android..." -ForegroundColor Green
Set-Location "$PSScriptRoot\.."
npx expo run:android
