# Start React Frontend Server with Cloudflare Tunnel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    FRONTEND SERVER + CLOUDFLARE TUNNEL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Frontend Server
Write-Host "Starting React Frontend Server..." -ForegroundColor Yellow
Set-Location "pwd-frontend"
$env:HOST = "0.0.0.0"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'React Frontend Server' -ForegroundColor Green; Write-Host 'Running on: http://localhost:3000' -ForegroundColor Cyan; npm start"
Set-Location ".."
Start-Sleep -Seconds 5

# Start Cloudflare Tunnel for Frontend
Write-Host "Starting Cloudflare Tunnel for Frontend..." -ForegroundColor Yellow
Write-Host "Frontend URL: https://quiet-sail-loans-owner.trycloudflare.com" -ForegroundColor Green
Write-Host ""
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Cloudflare Tunnel - Frontend' -ForegroundColor Green; Write-Host 'Tunneling: http://localhost:3000 -> https://quiet-sail-loans-owner.trycloudflare.com' -ForegroundColor Cyan; .\cloudflared.exe tunnel --url http://localhost:3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Frontend Server and Cloudflare Tunnel Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Cloudflare Frontend: https://quiet-sail-loans-owner.trycloudflare.com" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit (servers will continue running)..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

