# WebSocket Setup Instructions

## Current Status

The WebSocket implementation is complete, but you need to:

1. **Start the WebSocket server** (separate process)
2. **Create a Cloudflare tunnel for WebSocket** (port 8080)
3. **Update the frontend WebSocket URL** (if using Cloudflare tunnel)

## Step-by-Step Setup

### 1. Start the WebSocket Server

Open a new terminal/PowerShell window and run:

```powershell
cd pwd-backend
php artisan websocket:serve --port=8080 --host=0.0.0.0
```

You should see:
```
Starting WebSocket server on 0.0.0.0:8080...
WebSocket server is running on ws://0.0.0.0:8080
Press Ctrl+C to stop the server.
```

### 2. Create Cloudflare Tunnel for WebSocket

**IMPORTANT:** You need a **separate Cloudflare tunnel** for the WebSocket server because it runs on a different port (8080).

Open another PowerShell window and run:

```powershell
.\cloudflared.exe tunnel --url ws://localhost:8080
```

This will give you a WebSocket tunnel URL like:
```
https://random-words-here.trycloudflare.com
```

**Copy this URL** - you'll need it for the frontend!

### 3. Update Frontend WebSocket URL

Since Cloudflare tunnels give you a different URL for WebSocket, you need to set it in the browser:

1. Open your application in the browser
2. Open browser console (F12)
3. Run this command (replace with your actual WebSocket tunnel URL):

```javascript
localStorage.setItem('websocket.url', 'wss://your-websocket-tunnel-url.trycloudflare.com');
```

4. Refresh the page

The WebSocket service will now use this custom URL instead of trying to construct it from the API URL.

### 4. Test the Connection

1. Open browser console (F12)
2. Check for WebSocket connection messages:
   - Should see: "Attempting to connect to WebSocket: wss://..."
   - Should see: "WebSocket connected successfully"

3. Open the support ticket interface
4. The WebSocket should automatically connect when the component loads

## Quick Start Script

I've created `start-cloudflare-all-with-websocket.ps1` which starts everything, but you still need to:

1. **Copy the WebSocket tunnel URL** from the tunnel window
2. **Set it in localStorage** as shown above

## Alternative: Use Same Hostname (If Possible)

If your Cloudflare tunnel supports WebSocket on the same URL, you can try:

1. Use the backend tunnel URL
2. The frontend will try to connect to `wss://backend-tunnel-url:8080`
3. But this usually doesn't work with quick tunnels - you need a separate tunnel

## Troubleshooting

### Command Not Found

If `php artisan websocket:serve` doesn't work:

```powershell
cd pwd-backend
composer dump-autoload
php artisan clear-compiled
php artisan cache:clear
php artisan websocket:serve --port=8080
```

### Connection Refused

- Make sure WebSocket server is running
- Check if port 8080 is accessible
- Verify the tunnel URL is correct

### Authentication Failed

- Check if your token is valid
- Verify Laravel Sanctum is configured correctly
- Check browser console for error messages

### WebSocket URL Issues

- Make sure you set `localStorage.setItem('websocket.url', 'wss://...')`
- Use `wss://` for HTTPS tunnels, `ws://` for HTTP
- Don't include port number in Cloudflare tunnel URL

## Production Setup

For production, you'll want to:

1. Use a process manager (Supervisor/PM2) to keep WebSocket server running
2. Set up a named Cloudflare tunnel with ingress rules
3. Configure proper SSL certificates
4. Set up monitoring and logging

See `pwd-backend/WEBSOCKET_SETUP.md` for detailed production setup.

## Summary

**To get WebSocket working right now:**

1. ✅ Start WebSocket server: `php artisan websocket:serve --port=8080`
2. ✅ Start WebSocket tunnel: `cloudflared tunnel --url ws://localhost:8080`
3. ✅ Copy tunnel URL and set in browser: `localStorage.setItem('websocket.url', 'wss://tunnel-url')`
4. ✅ Refresh page and test!

The WebSocket server and tunnel need to be running for real-time features to work.

