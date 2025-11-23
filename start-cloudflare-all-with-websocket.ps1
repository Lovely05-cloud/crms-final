# Start Backend, Frontend, WebSocket Server, and Cloudflare Tunnels
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    FULL STACK + WEBSOCKET + TUNNELS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend Server
Write-Host "Starting Laravel Backend Server..." -ForegroundColor Yellow
Set-Location "pwd-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Laravel Backend Server' -ForegroundColor Green; Write-Host 'Running on: http://localhost:8000' -ForegroundColor Cyan; php artisan serve --host=0.0.0.0 --port=8000"
Set-Location ".."
Start-Sleep -Seconds 3

# Start WebSocket Server
Write-Host "Starting WebSocket Server..." -ForegroundColor Yellow
Set-Location "pwd-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'WebSocket Server' -ForegroundColor Green; Write-Host 'Running on: ws://localhost:8080' -ForegroundColor Cyan; php artisan websocket:serve --port=8080 --host=0.0.0.0"
Set-Location ".."
Start-Sleep -Seconds 2

# Start Frontend Server
Write-Host "Starting React Frontend Server..." -ForegroundColor Yellow
Set-Location "pwd-frontend"
$env:HOST = "0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'React Frontend Server' -ForegroundColor Green; Write-Host 'Running on: http://localhost:3000' -ForegroundColor Cyan; npm start"
Set-Location ".."
Start-Sleep -Seconds 5

# Start Cloudflare Tunnel for Backend (includes WebSocket support)
Write-Host "Starting Cloudflare Tunnel for Backend (HTTP + WebSocket)..." -ForegroundColor Yellow
Write-Host "NOTE: Cloudflare quick tunnels support WebSocket automatically!" -ForegroundColor Cyan
Write-Host "WebSocket will be accessible at: wss://[backend-tunnel-url]:8080" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - Backend' -ForegroundColor Green; Write-Host 'Tunneling: http://localhost:8000 -> https://[tunnel-url]' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url http://localhost:8000"
Start-Sleep -Seconds 2

# Start Cloudflare Tunnel for WebSocket (separate tunnel for WebSocket port)
Write-Host "Starting Cloudflare Tunnel for WebSocket..." -ForegroundColor Yellow
Write-Host "WebSocket Tunnel URL will be shown above" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - WebSocket' -ForegroundColor Green; Write-Host 'Tunneling: ws://localhost:8080 -> wss://[tunnel-url]' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url ws://localhost:8080"
Start-Sleep -Seconds 2

# Start Cloudflare Tunnel for Frontend
Write-Host "Starting Cloudflare Tunnel for Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - Frontend' -ForegroundColor Green; Write-Host 'Tunneling: http://localhost:3000 -> https://[tunnel-url]' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url http://localhost:3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "All Servers and Tunnels Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Update frontend WebSocket URL with the WebSocket tunnel URL!" -ForegroundColor Yellow
Write-Host "The WebSocket tunnel URL will be shown in the WebSocket tunnel window." -ForegroundColor Yellow
Write-Host ""
Write-Host "Local URLs:" -ForegroundColor White
Write-Host "  Backend: http://localhost:8000" -ForegroundColor White
Write-Host "  WebSocket: ws://localhost:8080" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Check the tunnel windows for Cloudflare URLs" -ForegroundColor Cyan
Write-Host ""

