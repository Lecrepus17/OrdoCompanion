$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$musicPath = "public/music.mp3"
if (-not (Test-Path $musicPath)) {
    Write-Host "Arquivo public/music.mp3 nao encontrado! Salve a faixa em video/public/music.mp3 primeiro." -ForegroundColor Red
    exit 1
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Mixando Trilha Sonora (music.mp3) nos Videos (FFmpeg)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$targets = @(
    @{ In = "out/ordo-companion-16x9.mp4"; Temp = "out/temp-16x9.mp4"; Bitrate = "192k" },
    @{ In = "out/ordo-companion-9x16.mp4"; Temp = "out/temp-9x16.mp4"; Bitrate = "192k" },
    @{ In = "out/ordo-companion-discord.mp4"; Temp = "out/temp-discord.mp4"; Bitrate = "128k" }
)

foreach ($t in $targets) {
    if (Test-Path $t.In) {
        Write-Host "Aplicando musica com fade-in (1s) e fade-out (2s) em $($t.In)..." -ForegroundColor Yellow
        npx remotion ffmpeg -y -i $t.In -i $musicPath `
            -filter_complex "[1:a]atrim=0:45,afade=t=in:st=0:d=1,afade=t=out:st=43:d=2,volume=0.85[a]" `
            -map 0:v:0 -map "[a]" -c:v copy -c:a aac -b:a $t.Bitrate -shortest $t.Temp
        Move-Item $t.Temp $t.In -Force
        Write-Host "  -> Concluido: $($t.In)" -ForegroundColor Green
    }
}

Write-Host "`nTrilha sonora mixada com sucesso nos 3 formatos!" -ForegroundColor Green
Get-ChildItem "out/*.mp4" | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length / 1MB, 2)}}
