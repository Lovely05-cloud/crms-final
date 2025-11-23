# WebSocket Implementation Summary

## Overview

WebSocket connections have been successfully implemented for real-time features in the PWD Management System. This enables instant messaging, typing indicators, and real-time updates in the support ticket system.

## Backend Implementation

### Files Created/Modified

1. **`pwd-backend/app/WebSocket/WebSocketServer.php`**
   - Main WebSocket server class using Ratchet
   - Handles connections, authentication, and message routing
   - Manages ticket rooms and user connections
   - Supports: join/leave rooms, typing indicators, message status updates

2. **`pwd-backend/app/Console/Commands/WebSocketServer.php`**
   - Artisan command to start the WebSocket server
   - Usage: `php artisan websocket:serve --port=8080 --host=0.0.0.0`

3. **`pwd-backend/app/Services/WebSocketBroadcastService.php`**
   - Service class for broadcasting messages from Laravel controllers
   - Used by SupportTicketController to broadcast new messages

4. **`pwd-backend/app/Http/Controllers/API/SupportTicketController.php`**
   - Modified to broadcast messages via WebSocket when:
     - New messages are created
     - Ticket status is updated

### Dependencies

- **Ratchet** (`cboden/ratchet`) - PHP WebSocket library
- Already installed via Composer

## Frontend Implementation

### Files Modified

1. **`pwd-frontend/src/services/websocketService.js`**
   - Updated WebSocket URL generation to use port 8080
   - Improved token handling for authentication
   - Supports automatic reconnection
   - Handles all WebSocket message types

### Features

- Automatic connection on component mount
- Token-based authentication
- Automatic reconnection on disconnect
- Event-based message handling
- Typing indicators
- Message status updates
- Ticket room management

## How to Use

### Starting the WebSocket Server

1. **Development:**
   ```bash
   cd pwd-backend
   php artisan websocket:serve
   ```

2. **Production (with Supervisor):**
   - See `pwd-backend/WEBSOCKET_SETUP.md` for detailed instructions

### Frontend Usage

The WebSocket service is already integrated into:
- `AdminSupportDesk.js` - Admin support ticket interface
- `PWDMemberSupportDesk.js` - PWD member support ticket interface

The service automatically:
- Connects when the component mounts
- Joins ticket rooms when a ticket is selected
- Broadcasts typing indicators
- Receives new messages in real-time
- Updates message status

## WebSocket Message Types

### Client → Server

1. **`join_ticket`** - Join a ticket room
   ```json
   {
     "type": "join_ticket",
     "payload": { "ticket_id": 123 }
   }
   ```

2. **`leave_ticket`** - Leave a ticket room
   ```json
   {
     "type": "leave_ticket",
     "payload": { "ticket_id": 123 }
   }
   ```

3. **`typing_indicator`** - Send typing indicator
   ```json
   {
     "type": "typing_indicator",
     "payload": {
       "ticket_id": 123,
       "is_typing": true
     }
   }
   ```

4. **`message_seen`** - Mark message as seen
   ```json
   {
     "type": "message_seen",
     "payload": {
       "message_id": 456,
       "ticket_id": 123
     }
   }
   ```

5. **`ping`** - Keep-alive ping
   ```json
   {
     "type": "ping"
   }
   ```

### Server → Client

1. **`connection`** - Connection status
   ```json
   {
     "type": "connection",
     "payload": {
       "status": "connected",
       "user_id": 1
     }
   }
   ```

2. **`new_message`** - New message received
   ```json
   {
     "type": "new_message",
     "payload": {
       "ticket_id": 123,
       "message": { ... }
     }
   }
   ```

3. **`ticket_status_update`** - Ticket status changed
   ```json
   {
     "type": "ticket_status_update",
     "payload": {
       "ticket_id": 123,
       "status": "in_progress"
     }
   }
   ```

4. **`typing_indicator`** - User typing
   ```json
   {
     "type": "typing_indicator",
     "payload": {
       "ticket_id": 123,
       "user_id": 1,
       "user_name": "John Doe",
       "is_typing": true
     }
   }
   ```

5. **`message_status_update`** - Message status changed
   ```json
   {
     "type": "message_status_update",
     "payload": {
       "message_id": 456,
       "status": "seen",
       "user_id": 1
     }
   }
   ```

6. **`user_joined`** - User joined ticket room
   ```json
   {
     "type": "user_joined",
     "payload": {
       "user_id": 1,
       "ticket_id": 123
     }
   }
   ```

7. **`user_left`** - User left ticket room
   ```json
   {
     "type": "user_left",
     "payload": {
       "user_id": 1,
       "ticket_id": 123
     }
   }
   ```

8. **`pong`** - Response to ping
   ```json
   {
     "type": "pong",
     "payload": {
       "timestamp": 1234567890
     }
   }
   ```

## Configuration

### WebSocket Server Port

Default: **8080**

To change:
```bash
php artisan websocket:serve --port=9000
```

### Frontend WebSocket URL

Automatically generated from API config:
- HTTP: `ws://hostname:8080`
- HTTPS: `wss://hostname:8080`

### Authentication

Uses Laravel Sanctum tokens passed as query parameter:
```
ws://hostname:8080?token=your-sanctum-token
```

## Testing

### Test Connection

1. Start the WebSocket server:
   ```bash
   php artisan websocket:serve
   ```

2. Open browser console and test:
   ```javascript
   const ws = new WebSocket('ws://localhost:8080?token=your-token');
   ws.onopen = () => console.log('Connected!');
   ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
   ```

### Test in Application

1. Start both backend and WebSocket server
2. Open support ticket interface
3. Send a message - it should appear instantly for other users in the same ticket
4. Type in message box - typing indicator should appear for other users

## Troubleshooting

### Connection Issues

- **Check if server is running:** `netstat -tuln | grep 8080`
- **Check firewall:** Ensure port 8080 is open
- **Check logs:** `storage/logs/laravel.log`

### Authentication Issues

- Verify token is valid and not expired
- Check Laravel Sanctum configuration
- Ensure token is being sent correctly

### Messages Not Broadcasting

- Verify WebSocket server is running
- Check if users are in the same ticket room
- Review server logs for errors

## Security

- ✅ Token-based authentication
- ✅ User validation on connection
- ✅ Room-based message isolation
- ⚠️ Use WSS in production (secure WebSocket)
- ⚠️ Configure firewall to restrict access
- ⚠️ Consider rate limiting for high traffic

## Performance

- Lightweight connections
- Efficient room management
- Automatic cleanup on disconnect
- Supports multiple concurrent connections

## Next Steps

1. **Production Deployment:**
   - Set up Supervisor or PM2 for process management
   - Configure firewall rules
   - Use WSS (secure WebSocket) with SSL certificate
   - Set up monitoring and logging

2. **Enhancements:**
   - Add rate limiting
   - Implement connection pooling
   - Add metrics and monitoring
   - Support for file uploads via WebSocket

## Documentation

For detailed setup instructions, see:
- `pwd-backend/WEBSOCKET_SETUP.md` - Server setup guide

