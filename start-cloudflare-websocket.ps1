# Start WebSocket Server with Cloudflare Tunnel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    WEBSOCKET SERVER + CLOUDFLARE TUNNEL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start WebSocket Server
Write-Host "Starting WebSocket Server..." -ForegroundColor Yellow
Set-Location "pwd-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'WebSocket Server' -ForegroundColor Green; Write-Host 'Running on: ws://localhost:8080' -ForegroundColor Cyan; php artisan websocket:serve --port=8080 --host=0.0.0.0"
Set-Location ".."
Start-Sleep -Seconds 3

# Start Cloudflare Tunnel for WebSocket
Write-Host "Starting Cloudflare Tunnel for WebSocket..." -ForegroundColor Yellow
Write-Host "WebSocket will be accessible via the backend tunnel" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: Cloudflare tunnels support WebSocket automatically!" -ForegroundColor Yellow
Write-Host "The WebSocket will be accessible at: wss://[backend-tunnel-url]:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "However, for proper WebSocket support, you may need to:" -ForegroundColor Yellow
Write-Host "1. Use a named tunnel with ingress rules" -ForegroundColor White
Write-Host "2. Or access WebSocket directly through the backend tunnel" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "WebSocket Server Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local WebSocket: ws://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit (server will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

