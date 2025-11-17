# Start Laravel Backend Server with Cloudflare Tunnel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    BACKEND SERVER + CLOUDFLARE TUNNEL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend Server
Write-Host "Starting Laravel Backend Server..." -ForegroundColor Yellow
Set-Location "pwd-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Laravel Backend Server' -ForegroundColor Green; Write-Host 'Running on: http://localhost:8000' -ForegroundColor Cyan; php artisan serve --host=0.0.0.0 --port=8000"
Set-Location ".."
Start-Sleep -Seconds 3

# Start Cloudflare Tunnel for Backend
Write-Host "Starting Cloudflare Tunnel for Backend..." -ForegroundColor Yellow
Write-Host "Backend URL: https://trained-portion-dec-trek.trycloudflare.com" -ForegroundColor Green
Write-Host ""
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - Backend' -ForegroundColor Green; Write-Host 'Tunneling: http://localhost:8000 -> https://trained-portion-dec-trek.trycloudflare.com' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url http://localhost:8000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Backend Server and Cloudflare Tunnel Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local Backend: http://localhost:8000" -ForegroundColor White
Write-Host "Cloudflare Backend: https://trained-portion-dec-trek.trycloudflare.com" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit (servers will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

