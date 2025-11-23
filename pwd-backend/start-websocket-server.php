<?php

/**
 * Direct WebSocket Server Startup Script
 * 
 * This script starts the WebSocket server directly without using Artisan.
 * Use this if the artisan command doesn't work.
 * 
 * Usage: php start-websocket-server.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Ratchet\WebSocket\WsServer;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use App\WebSocket\WebSocketServer;
use React\Socket\Server as Reactor;
use React\EventLoop\Factory as LoopFactory;

$port = isset($argv[1]) ? (int)$argv[1] : 8080;
$host = isset($argv[2]) ? $argv[2] : '0.0.0.0';

echo "========================================\n";
echo "   WebSocket Server Starting\n";
echo "========================================\n";
echo "Host: {$host}\n";
echo "Port: {$port}\n";
echo "URL: ws://{$host}:{$port}\n";
echo "========================================\n";
echo "Press Ctrl+C to stop the server.\n\n";

try {
    $loop = LoopFactory::create();
    $socket = new Reactor("{$host}:{$port}", $loop);

    $wsServer = new WsServer(new WebSocketServer());
    $httpServer = new HttpServer($wsServer);
    $server = new IoServer($httpServer, $socket, $loop);

    echo "WebSocket server is running!\n";
    echo "Waiting for connections...\n\n";

    $server->run();
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

