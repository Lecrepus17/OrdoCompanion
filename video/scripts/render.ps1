$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

if (-not (Test-Path "out")) {
    New-Item -ItemType Directory -Path "out" | Out-Null
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Renderizando Video Promocional - Ordo Companion" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[1/4] Renderizando formato 16:9 (1920x1080 - LinkedIn, YouTube, X)..." -ForegroundColor Yellow
npx remotion render src/index.ts Promo16x9 out/ordo-companion-16x9.mp4 --overwrite

Write-Host "`n[2/4] Renderizando formato 9:16 (1080x1920 - Reels, TikTok, Shorts)..." -ForegroundColor Yellow
npx remotion render src/index.ts Promo9x16 out/ordo-companion-9x16.mp4 --overwrite

Write-Host "`n[3/4] Gerando formato Discord comprimido (1280x720 < 10 MB via FFmpeg)..." -ForegroundColor Yellow
npx remotion ffmpeg -y -i out/ordo-companion-16x9.mp4 -vf "scale=1280:720" -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 128k out/ordo-companion-discord.mp4

Write-Host "`n[4/4] Gerando Thumbnail (1920x1080)..." -ForegroundColor Yellow
npx remotion still src/index.ts Thumbnail out/thumbnail.png --overwrite

if (Test-Path "LEGENDAS_POSTS.md") {
    Copy-Item "LEGENDAS_POSTS.md" "out/LEGENDAS_POSTS.md" -Force
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  Renderizacao Concluida com Sucesso!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Get-ChildItem "out" | Select-Object Name, @{Name="SizeMB";Expression={[math]::Round($_.Length / 1MB, 2)}}
