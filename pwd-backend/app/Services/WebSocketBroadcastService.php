<?php

namespace App\Services;

use App\WebSocket\WebSocketServer;
use Illuminate\Support\Facades\Log;

class WebSocketBroadcastService
{
    protected static $serverInstance = null;

    /**
     * Get WebSocket server instance
     */
    protected static function getServerInstance()
    {
        if (self::$serverInstance === null) {
            self::$serverInstance = WebSocketServer::getInstance();
        }
        return self::$serverInstance;
    }

    /**
     * Broadcast new message to ticket room
     */
    public static function broadcastNewMessage($ticketId, $message)
    {
        try {
            $server = self::getServerInstance();
            $server->broadcastNewMessage($ticketId, $message);
            Log::info("WebSocket: Broadcasted new message to ticket {$ticketId}");
        } catch (\Exception $e) {
            Log::error("WebSocket: Failed to broadcast new message: " . $e->getMessage());
        }
    }

    /**
     * Broadcast ticket status update
     */
    public static function broadcastTicketStatusUpdate($ticketId, $status)
    {
        try {
            $server = self::getServerInstance();
            $server->broadcastTicketStatusUpdate($ticketId, $status);
            Log::info("WebSocket: Broadcasted ticket status update for ticket {$ticketId}");
        } catch (\Exception $e) {
            Log::error("WebSocket: Failed to broadcast ticket status update: " . $e->getMessage());
        }
    }

    /**
     * Check if WebSocket server is available
     */
    public static function isAvailable()
    {
        // In a production environment, you might want to check if the server is actually running
        // For now, we'll assume it's available if the class exists
        return class_exists(WebSocketServer::class);
    }
}

