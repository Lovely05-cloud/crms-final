# Start Both Backend and Frontend Servers with Cloudflare Tunnels
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    FULL STACK + CLOUDFLARE TUNNELS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend Server
Write-Host "Starting Laravel Backend Server..." -ForegroundColor Yellow
Set-Location "pwd-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Laravel Backend Server' -ForegroundColor Green; Write-Host 'Running on: http://localhost:8000' -ForegroundColor Cyan; php artisan serve --host=0.0.0.0 --port=8000"
Set-Location ".."
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "Starting React Frontend Server..." -ForegroundColor Yellow
Set-Location "pwd-frontend"
$env:HOST = "0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'React Frontend Server' -ForegroundColor Green; Write-Host 'Running on: http://localhost:3000' -ForegroundColor Cyan; npm start"
Set-Location ".."
Start-Sleep -Seconds 5

# Start Cloudflare Tunnel for Backend
Write-Host "Starting Cloudflare Tunnel for Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - Backend' -ForegroundColor Green; Write-Host 'Tunneling: http://localhost:8000 -> https://volume-formatting-finest-municipal.trycloudflare.com' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url http://localhost:8000"
Start-Sleep -Seconds 2

# Start Cloudflare Tunnel for Frontend
Write-Host "Starting Cloudflare Tunnel for Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - Frontend' -ForegroundColor Green; Write-Host 'Tunneling: http://localhost:3000 -> https://advancement-nuclear-recommends-oliver.trycloudflare.com' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url http://localhost:3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All Servers and Cloudflare Tunnels Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local URLs:" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cloudflare Tunnel URLs:" -ForegroundColor White
Write-Host "  Backend:  https://volume-formatting-finest-municipal.trycloudflare.com" -ForegroundColor Green
Write-Host "  Frontend: https://advancement-nuclear-recommends-oliver.trycloudflare.com" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit (servers will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

