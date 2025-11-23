# WebSocket Server Setup Guide

This guide explains how to set up and run the WebSocket server for real-time features in the PWD Management System.

## Prerequisites

- PHP 8.0.2 or higher
- Composer installed
- Laravel 9.x
- Ratchet library (already installed via composer)

## Installation

The WebSocket server uses Ratchet, which has already been installed. If you need to reinstall:

```bash
cd pwd-backend
composer require cboden/ratchet
```

## Starting the WebSocket Server

### Development Mode

To start the WebSocket server on the default port (8080):

```bash
cd pwd-backend
php artisan websocket:serve
```

### Custom Port and Host

To specify a custom port and host:

```bash
php artisan websocket:serve --port=8080 --host=0.0.0.0
```

### Production Mode (Background Process)

For production, you should run the WebSocket server as a background process using a process manager like Supervisor or PM2.

#### Using Supervisor (Linux)

1. Create a supervisor configuration file at `/etc/supervisor/conf.d/websocket.conf`:

```ini
[program:websocket-server]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/pwd-backend/artisan websocket:serve --port=8080 --host=0.0.0.0
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/path/to/pwd-backend/storage/logs/websocket.log
stopwaitsecs=3600
```

2. Reload supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start websocket-server:*
```

#### Using PM2 (Node.js Process Manager)

1. Install PM2 globally:

```bash
npm install -g pm2
```

2. Create a PM2 ecosystem file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'websocket-server',
    script: 'artisan',
    args: 'websocket:serve --port=8080 --host=0.0.0.0',
    interpreter: 'php',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './storage/logs/websocket-error.log',
    out_file: './storage/logs/websocket-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

3. Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Configuration

### Frontend Configuration

The frontend WebSocket service automatically detects the WebSocket URL based on the API configuration:

- For HTTPS: `wss://your-domain.com:8080`
- For HTTP: `ws://your-domain.com:8080`

Make sure port 8080 is open in your firewall and accessible from the frontend.

### Firewall Configuration

If you're using a firewall, make sure to allow connections on port 8080:

```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### Cloudflare Tunnel Configuration

If you're using Cloudflare tunnels, you need to expose port 8080:

```bash
cloudflared tunnel --url ws://localhost:8080
```

Or add to your `config.yml`:

```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: ws.yourdomain.com
    service: ws://localhost:8080
  - service: http_status:404
```

## Features

The WebSocket server supports:

1. **Real-time messaging** - Instant message delivery in support tickets
2. **Typing indicators** - Shows when users are typing
3. **Ticket room management** - Users can join/leave ticket rooms
4. **Status updates** - Real-time ticket status changes
5. **Message status** - Read receipts and message status updates

## Authentication

The WebSocket server uses Laravel Sanctum tokens for authentication. Users must provide a valid token in the connection URL:

```
ws://your-domain.com:8080?token=your-sanctum-token
```

## Testing

### Test WebSocket Connection

You can test the WebSocket connection using a browser console:

```javascript
const ws = new WebSocket('ws://localhost:8080?token=your-token-here');

ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({
    type: 'join_ticket',
    payload: { ticket_id: 1 }
  }));
};

ws.onmessage = (event) => {
  console.log('Message:', JSON.parse(event.data));
};
```

### Check Server Status

Check if the WebSocket server is running:

```bash
# Check if port 8080 is listening
netstat -tuln | grep 8080
# or
lsof -i :8080
```

## Troubleshooting

### Connection Refused

- Make sure the WebSocket server is running
- Check if port 8080 is open in the firewall
- Verify the host and port configuration

### Authentication Failed

- Ensure the token is valid and not expired
- Check Laravel Sanctum configuration
- Verify token is being sent correctly in the connection URL

### Messages Not Broadcasting

- Check server logs: `storage/logs/laravel.log`
- Verify WebSocketBroadcastService is being called
- Ensure users are in the same ticket room

## Logs

WebSocket server logs are written to:
- Laravel logs: `storage/logs/laravel.log`
- Supervisor logs: As configured in supervisor config
- PM2 logs: `storage/logs/websocket-error.log` and `storage/logs/websocket-out.log`

## Security Considerations

1. **Use WSS in production** - Always use secure WebSocket (WSS) in production
2. **Token validation** - The server validates tokens on connection
3. **Rate limiting** - Consider implementing rate limiting for WebSocket connections
4. **CORS** - Configure CORS properly if needed
5. **Firewall** - Only expose port 8080 to necessary IPs

## Performance

- The WebSocket server can handle multiple concurrent connections
- Each connection is lightweight
- Consider using multiple instances behind a load balancer for high traffic

## Support

For issues or questions, check:
- Laravel logs: `storage/logs/laravel.log`
- WebSocket server output
- Browser console for frontend errors

