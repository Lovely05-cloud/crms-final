<?php

namespace App\WebSocket;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\WebSocket\WsServer;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use React\Socket\Server as Reactor;
use React\EventLoop\Factory as LoopFactory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class WebSocketServer implements MessageComponentInterface
{
    protected $clients;
    protected $users; // Map user IDs to connections
    protected $ticketRooms; // Map ticket IDs to user connections

    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
        $this->users = [];
        $this->ticketRooms = [];
    }

    public function onOpen(ConnectionInterface $conn)
    {
        // Store the new connection
        $this->clients->attach($conn);
        
        // Parse query string for authentication token
        $queryString = $conn->httpRequest->getUri()->getQuery();
        parse_str($queryString, $queryParams);
        
        $token = $queryParams['token'] ?? null;
        
        if ($token) {
            // Authenticate user
            $user = $this->authenticateUser($token);
            
            if ($user) {
                $conn->userId = $user->id;
                $conn->user = $user;
                $this->users[$user->id] = $conn;
                
                Log::info("WebSocket: User {$user->id} connected");
                
                // Send welcome message
                $conn->send(json_encode([
                    'type' => 'connection',
                    'payload' => [
                        'status' => 'connected',
                        'user_id' => $user->id,
                        'message' => 'WebSocket connection established'
                    ]
                ]));
            } else {
                Log::warning("WebSocket: Authentication failed for connection");
                $conn->send(json_encode([
                    'type' => 'error',
                    'payload' => [
                        'message' => 'Authentication failed'
                    ]
                ]));
                $conn->close();
            }
        } else {
            Log::warning("WebSocket: No token provided");
            $conn->send(json_encode([
                'type' => 'error',
                'payload' => [
                    'message' => 'No authentication token provided'
                ]
            ]));
            $conn->close();
        }
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        try {
            $data = json_decode($msg, true);
            
            if (!$data || !isset($data['type'])) {
                return;
            }

            $type = $data['type'];
            $payload = $data['payload'] ?? [];

            switch ($type) {
                case 'join_ticket':
                    $this->handleJoinTicket($from, $payload);
                    break;
                    
                case 'leave_ticket':
                    $this->handleLeaveTicket($from, $payload);
                    break;
                    
                case 'typing_indicator':
                    $this->handleTypingIndicator($from, $payload);
                    break;
                    
                case 'message_seen':
                    $this->handleMessageSeen($from, $payload);
                    break;
                    
                case 'ping':
                    // Respond to ping with pong
                    $from->send(json_encode([
                        'type' => 'pong',
                        'payload' => ['timestamp' => time()]
                    ]));
                    break;
                    
                default:
                    Log::warning("WebSocket: Unknown message type: {$type}");
            }
        } catch (\Exception $e) {
            Log::error("WebSocket: Error processing message: " . $e->getMessage());
            $from->send(json_encode([
                'type' => 'error',
                'payload' => [
                    'message' => 'Error processing message'
                ]
            ]));
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        
        if (isset($conn->userId)) {
            $userId = $conn->userId;
            unset($this->users[$userId]);
            
            // Remove from all ticket rooms
            foreach ($this->ticketRooms as $ticketId => $connections) {
                if (isset($connections[$userId])) {
                    unset($this->ticketRooms[$ticketId][$userId]);
                    
                    // Notify others in the room
                    $this->broadcastToTicketRoom($ticketId, [
                        'type' => 'user_left',
                        'payload' => [
                            'user_id' => $userId,
                            'ticket_id' => $ticketId
                        ]
                    ], $conn);
                }
            }
            
            Log::info("WebSocket: User {$userId} disconnected");
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        Log::error("WebSocket error: " . $e->getMessage());
        $conn->close();
    }

    /**
     * Authenticate user from token
     */
    protected function authenticateUser($token)
    {
        try {
            // Use Laravel Sanctum to verify token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
            
            if ($accessToken && $accessToken->tokenable) {
                return $accessToken->tokenable;
            }
            
            return null;
        } catch (\Exception $e) {
            Log::error("WebSocket authentication error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Handle join ticket room
     */
    protected function handleJoinTicket(ConnectionInterface $conn, $payload)
    {
        if (!isset($conn->userId) || !isset($payload['ticket_id'])) {
            return;
        }

        $ticketId = $payload['ticket_id'];
        $userId = $conn->userId;

        if (!isset($this->ticketRooms[$ticketId])) {
            $this->ticketRooms[$ticketId] = [];
        }

        $this->ticketRooms[$ticketId][$userId] = $conn;

        // Notify others in the room
        $this->broadcastToTicketRoom($ticketId, [
            'type' => 'user_joined',
            'payload' => [
                'user_id' => $userId,
                'ticket_id' => $ticketId
            ]
        ], $conn);

        Log::info("WebSocket: User {$userId} joined ticket room {$ticketId}");
    }

    /**
     * Handle leave ticket room
     */
    protected function handleLeaveTicket(ConnectionInterface $conn, $payload)
    {
        if (!isset($conn->userId) || !isset($payload['ticket_id'])) {
            return;
        }

        $ticketId = $payload['ticket_id'];
        $userId = $conn->userId;

        if (isset($this->ticketRooms[$ticketId][$userId])) {
            unset($this->ticketRooms[$ticketId][$userId]);

            // Notify others in the room
            $this->broadcastToTicketRoom($ticketId, [
                'type' => 'user_left',
                'payload' => [
                    'user_id' => $userId,
                    'ticket_id' => $ticketId
                ]
            ], $conn);

            Log::info("WebSocket: User {$userId} left ticket room {$ticketId}");
        }
    }

    /**
     * Handle typing indicator
     */
    protected function handleTypingIndicator(ConnectionInterface $conn, $payload)
    {
        if (!isset($conn->userId) || !isset($payload['ticket_id'])) {
            return;
        }

        $ticketId = $payload['ticket_id'];
        $userId = $conn->userId;
        $isTyping = $payload['is_typing'] ?? false;

        // Broadcast to others in the ticket room
        $this->broadcastToTicketRoom($ticketId, [
            'type' => 'typing_indicator',
            'payload' => [
                'ticket_id' => $ticketId,
                'user_id' => $userId,
                'user_name' => $conn->user->name ?? 'Unknown',
                'is_typing' => $isTyping
            ]
        ], $conn);
    }

    /**
     * Handle message seen
     */
    protected function handleMessageSeen(ConnectionInterface $conn, $payload)
    {
        if (!isset($conn->userId) || !isset($payload['message_id'])) {
            return;
        }

        $messageId = $payload['message_id'];
        $userId = $conn->userId;

        // Broadcast to others in the ticket room
        $ticketId = $payload['ticket_id'] ?? null;
        if ($ticketId) {
            $this->broadcastToTicketRoom($ticketId, [
                'type' => 'message_status_update',
                'payload' => [
                    'message_id' => $messageId,
                    'status' => 'seen',
                    'user_id' => $userId
                ]
            ], $conn);
        }
    }

    /**
     * Broadcast message to all connections in a ticket room
     */
    protected function broadcastToTicketRoom($ticketId, $message, ConnectionInterface $exclude = null)
    {
        if (!isset($this->ticketRooms[$ticketId])) {
            return;
        }

        $messageJson = json_encode($message);

        foreach ($this->ticketRooms[$ticketId] as $userId => $conn) {
            if ($conn !== $exclude && $conn->getRemoteAddress()) {
                $conn->send($messageJson);
            }
        }
    }

    /**
     * Broadcast new message to ticket room
     */
    public function broadcastNewMessage($ticketId, $message)
    {
        $this->broadcastToTicketRoom($ticketId, [
            'type' => 'new_message',
            'payload' => [
                'ticket_id' => $ticketId,
                'message' => $message
            ]
        ]);
    }

    /**
     * Broadcast ticket status update
     */
    public function broadcastTicketStatusUpdate($ticketId, $status)
    {
        $this->broadcastToTicketRoom($ticketId, [
            'type' => 'ticket_status_update',
            'payload' => [
                'ticket_id' => $ticketId,
                'status' => $status
            ]
        ]);
    }

    /**
     * Get instance of WebSocket server
     */
    public static function getInstance()
    {
        static $instance = null;
        if ($instance === null) {
            $instance = new static();
        }
        return $instance;
    }
}

