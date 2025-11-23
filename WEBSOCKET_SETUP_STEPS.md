# WebSocket Setup - Step by Step Guide

## Current Issue
The WebSocket is trying to connect but failing because:
1. Cloudflare tunnels don't support port numbers in URLs
2. You need a **separate WebSocket tunnel** (different from backend tunnel)
3. The WebSocket URL needs to be set in browser localStorage

## Step-by-Step Solution

### Step 1: Start WebSocket Server (Already Running)
✅ The WebSocket server should be running on `ws://localhost:8080`

If not running, start it:
```powershell
cd pwd-backend
php start-websocket-server.php
```

### Step 2: Create WebSocket Tunnel

Open a **NEW PowerShell window** and run:

```powershell
.\cloudflared.exe tunnel --url ws://localhost:8080
```

**IMPORTANT:** You'll see output like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
|  https://random-words-here.trycloudflare.com                                              |
+--------------------------------------------------------------------------------------------+
```

**COPY THIS URL** - this is your WebSocket tunnel URL!

### Step 3: Set WebSocket URL in Browser

1. **Open your application** in the browser:
   - Go to: https://dry-agencies-rendering-wifi.trycloudflare.com

2. **Open Browser Developer Console:**
   - Press `F12` (or right-click → Inspect)
   - Click on the **"Console"** tab

3. **Run this command** (replace with your actual WebSocket tunnel URL):
   ```javascript
   localStorage.setItem('websocket.url', 'wss://your-websocket-tunnel-url.trycloudflare.com');
   ```
   
   **Example:**
   ```javascript
   localStorage.setItem('websocket.url', 'wss://random-words-here.trycloudflare.com');
   ```

4. **Verify it was set:**
   ```javascript
   localStorage.getItem('websocket.url');
   ```
   This should return your WebSocket URL.

5. **Refresh the page** (F5 or Ctrl+R)

### Step 4: Verify Connection

After refreshing, check the console:
- ✅ You should see: `"WebSocket connected successfully"`
- ❌ If you see errors, check:
  - Is WebSocket server running?
  - Is WebSocket tunnel running?
  - Did you use the correct URL (with `wss://` not `ws://`)?
  - Did you remove the port number from the URL?

## Quick Reference

### Where to Set localStorage

**Location:** Browser Developer Console (F12 → Console tab)

**Command:**
```javascript
localStorage.setItem('websocket.url', 'wss://your-websocket-tunnel-url.trycloudflare.com');
```

**When to set it:**
- Every time you restart the WebSocket tunnel (URLs change)
- When you first set up WebSocket
- If the connection fails

### Important Notes

1. **WebSocket tunnel URL changes** every time you restart the tunnel
2. **No port number** in Cloudflare tunnel URLs (just `wss://domain.trycloudflare.com`)
3. **Use `wss://`** (secure WebSocket) for HTTPS tunnels
4. **Keep both running:**
   - WebSocket server (port 8080)
   - WebSocket tunnel (Cloudflare)

### Troubleshooting

**Error: "ERR_CONNECTION_RESET"**
- WebSocket tunnel not running
- Wrong URL in localStorage
- Port number in URL (remove it!)

**Error: "ERR_CONNECTION_TIMED_OUT"**
- WebSocket server not running
- Firewall blocking port 8080
- Tunnel URL incorrect

**"WebSocket server not available"**
- This is expected if localStorage is not set
- Set the WebSocket URL in localStorage as shown above

## Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│  Browser (F12 → Console Tab)                            │
│                                                          │
│  > localStorage.setItem('websocket.url',                │
│      'wss://your-tunnel-url.trycloudflare.com');        │
│  undefined                                               │
│                                                          │
│  > localStorage.getItem('websocket.url');                │
│  'wss://your-tunnel-url.trycloudflare.com'              │
│                                                          │
│  [Refresh Page]                                          │
│                                                          │
│  ✓ WebSocket connected successfully                     │
└─────────────────────────────────────────────────────────┘
```

## Summary

1. ✅ Start WebSocket server: `php start-websocket-server.php`
2. ✅ Start WebSocket tunnel: `cloudflared tunnel --url ws://localhost:8080`
3. ✅ Copy tunnel URL
4. ✅ Open browser console (F12)
5. ✅ Run: `localStorage.setItem('websocket.url', 'wss://tunnel-url')`
6. ✅ Refresh page
7. ✅ Check console for "WebSocket connected successfully"

