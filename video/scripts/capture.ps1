$ErrorActionPreference = "Continue"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"
$emulator = "$env:ANDROID_HOME\emulator\emulator.exe"
$clipsDir = Join-Path $PSScriptRoot "..\public\clips"

if (-not (Test-Path $clipsDir)) {
    New-Item -ItemType Directory -Path $clipsDir -Force | Out-Null
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Captura Automatica de Clipes - Ordo Companion (ADB)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Garantir emulador ativo
$devices = & $adb devices
if ($devices -notmatch "emulator-") {
    Write-Host "Iniciando emulador Medium_Phone_API_37.0..." -ForegroundColor Yellow
    Start-Process $emulator -ArgumentList "-avd Medium_Phone_API_37.0"
    & $adb wait-for-device
}

# Aguardar boot completo do Android
Write-Host "Verificando boot do Android..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 2
    $boot = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
} while ($boot -ne "1")
Write-Host "Android pronto!" -ForegroundColor Green

# 2. Ativar SystemUI Demo Mode (Status bar limpa: 12:00, bateria 100%, sem notificações)
Write-Host "Configurando Status Bar limpa (Modo Demo)..." -ForegroundColor Yellow
& $adb shell settings put global sysui_demo_allowed 1
& $adb shell am broadcast -a com.android.systemui.demo -e command enter | Out-Null
& $adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1200 | Out-Null
& $adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false | Out-Null
& $adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false | Out-Null

# 3. Abrir o Ordo Companion via Deep Link (com.ordemparanormal.ordo)
function Open-Route([string]$route) {
    $uri = "com.ordemparanormal.ordo://$route"
    & $adb shell am start -a android.intent.action.VIEW -d $uri com.ordemparanormal.ordo | Out-Null
    Start-Sleep -Seconds 2
}

function Record-Clip([string]$clipName, [int]$seconds, [scriptblock]$actions) {
    Write-Host "Gravando clipe: $clipName ($seconds s)..." -ForegroundColor Cyan
    $remotePath = "/sdcard/$clipName"
    $localPath = Join-Path $clipsDir $clipName

    & $adb shell rm -f $remotePath 2>$null

    # Inicia screenrecord em background no device
    $recordJob = Start-Job -ScriptBlock {
        param($adbExe, $sec, $rem)
        & $adbExe shell screenrecord --bit-rate 12000000 --time-limit $sec $rem
    } -ArgumentList $adb, $seconds, $remotePath

    Start-Sleep -Milliseconds 900
    & $actions

    Wait-Job $recordJob | Out-Null
    Receive-Job $recordJob | Out-Null
    Remove-Job $recordJob

    Start-Sleep -Milliseconds 600
    & $adb pull $remotePath $localPath | Out-Null
    & $adb shell rm -f $remotePath 2>$null

    if (Test-Path $localPath) {
        $sizeKB = [math]::Round((Get-Item $localPath).Length / 1KB, 1)
        Write-Host "  -> Salvo em public/clips/$clipName ($sizeKB KB)" -ForegroundColor Green
    } else {
        Write-Host "  -> Falha ao salvar $clipName" -ForegroundColor Red
    }
}

# Cena 2: Home (index)
Open-Route ""
Record-Clip "home.mp4" 6 {
    Start-Sleep -Seconds 1
    & $adb shell input swipe 540 1600 540 700 600
    Start-Sleep -Seconds 2
    & $adb shell input swipe 540 700 540 1600 600
}

# Cena 3: Compêndio (books)
Open-Route "books"
Record-Clip "compendio.mp4" 8 {
    Start-Sleep -Seconds 1
    & $adb shell input swipe 540 1500 540 650 550
    Start-Sleep -Seconds 2
    & $adb shell input tap 540 900
    Start-Sleep -Seconds 2
}

# Cena 4: Agentes (characters)
Open-Route "characters"
Record-Clip "agentes.mp4" 8 {
    Start-Sleep -Seconds 1
    & $adb shell input tap 540 600
    Start-Sleep -Seconds 2
    & $adb shell input swipe 540 1500 540 700 550
    Start-Sleep -Seconds 2
}

# Cena 5: Rolador de Dados (dice)
Open-Route "dice"
Record-Clip "dados.mp4" 6 {
    Start-Sleep -Seconds 1
    & $adb shell input tap 540 1200
    Start-Sleep -Seconds 1
    & $adb shell input tap 540 1200
    Start-Sleep -Seconds 2
}

# Cena 6: Central do Mestre (master)
Open-Route "master"
Record-Clip "mestre.mp4" 7 {
    Start-Sleep -Seconds 1
    & $adb shell input swipe 540 1500 540 650 550
    Start-Sleep -Seconds 2
    & $adb shell input swipe 540 650 540 1500 550
}

# Cena 7: Oráculo G.L.I.T.C.H. (oracle)
Open-Route "oracle"
Record-Clip "oraculo.mp4" 6 {
    Start-Sleep -Seconds 1
    & $adb shell input swipe 540 1400 540 700 550
    Start-Sleep -Seconds 2
}

# Sair do Demo Mode
& $adb shell am broadcast -a com.android.systemui.demo -e command exit | Out-Null

Write-Host "`nCaptura finalizada! Confira os arquivos em video/public/clips/" -ForegroundColor Green
