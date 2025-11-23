# WebSocket Quick Start Guide

## ✅ Status Check

The WebSocket implementation is **complete**, but you need to:

1. **Start the WebSocket server** (see options below)
2. **Create a Cloudflare tunnel for WebSocket** (port 8080)
3. **Set the WebSocket URL in the browser** (if using Cloudflare tunnel)

## 🚀 Quick Start (3 Steps)

### Step 1: Start WebSocket Server

**Option A: Using PHP Script (Recommended if Artisan doesn't work)**
```powershell
cd pwd-backend
php start-websocket-server.php
```

**Option B: Using Artisan (if command is discovered)**
```powershell
cd pwd-backend
php artisan websocket:serve --port=8080 --host=0.0.0.0
```

You should see:
```
WebSocket server is running on ws://0.0.0.0:8080
```

### Step 2: Create WebSocket Tunnel

Open a **new PowerShell window** and run:

```powershell
.\cloudflared.exe tunnel --url ws://localhost:8080
```

**Copy the tunnel URL** that appears (e.g., `https://random-words.trycloudflare.com`)

### Step 3: Set WebSocket URL in Browser

1. Open your application in the browser
2. Open browser console (F12)
3. Run this command (replace with your actual tunnel URL):

```javascript
localStorage.setItem('websocket.url', 'wss://your-websocket-tunnel-url.trycloudflare.com');
```

4. **Refresh the page**

## ✅ Verify It's Working

1. Open browser console (F12)
2. Look for: `"WebSocket connected successfully"`
3. Open support ticket interface
4. Messages should appear in real-time!

## 🔧 Troubleshooting

### "Command not found"
- Use the PHP script instead: `php start-websocket-server.php`

### "Connection refused"
- Make sure WebSocket server is running
- Check if port 8080 is accessible
- Verify tunnel URL is correct

### "Authentication failed"
- Check if you're logged in
- Verify token is valid in localStorage

## 📝 Notes

- **WebSocket server must be running** for real-time features to work
- **Separate tunnel needed** for WebSocket (different port)
- **Tunnel URLs change** each time you restart Cloudflare tunnel
- **Update localStorage** when tunnel URL changes

## 🎯 What's Working

✅ WebSocket server implementation  
✅ Frontend WebSocket service  
✅ Real-time message broadcasting  
✅ Typing indicators  
✅ Ticket room management  
✅ Authentication  

## ⚠️ What You Need to Do

1. Start WebSocket server (separate process)
2. Start WebSocket tunnel (separate process)
3. Set tunnel URL in browser localStorage
4. Keep both processes running

The WebSocket server and tunnel need to be running continuously for real-time features to work!

