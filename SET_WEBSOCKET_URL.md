# Set WebSocket URL - Quick Command

## Your WebSocket Tunnel URL
**Original:** `https://defendant-jul-critics-identity.trycloudflare.com`  
**WebSocket URL:** `wss://defendant-jul-critics-identity.trycloudflare.com`

## Quick Setup (Choose One Method)

### Method 1: Browser Console (Fastest)
1. Open your app: https://dry-agencies-rendering-wifi.trycloudflare.com
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Copy and paste this command:
   ```javascript
   localStorage.setItem('websocket.url', 'wss://defendant-jul-critics-identity.trycloudflare.com');
   ```
5. Press **Enter**
6. **Refresh the page** (F5)

### Method 2: Setup Page
1. Go to: https://dry-agencies-rendering-wifi.trycloudflare.com/websocket-setup.html
2. Paste: `wss://defendant-jul-critics-identity.trycloudflare.com`
3. Click "Set WebSocket URL"
4. Go back to your main app and refresh

## Verify It's Set
In browser console, run:
```javascript
localStorage.getItem('websocket.url');
```
Should return: `wss://defendant-jul-critics-identity.trycloudflare.com`

## After Setting
1. Refresh your application page
2. Check console for: `"WebSocket connected successfully"` ✅
3. Open support ticket interface to test real-time messaging

## Important
- ✅ Use `wss://` (not `https://`)
- ✅ No port number needed
- ✅ Keep WebSocket tunnel running
- ✅ Keep WebSocket server running

