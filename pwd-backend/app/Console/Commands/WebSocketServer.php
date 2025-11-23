<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Ratchet\WebSocket\WsServer;
use Ratchet\Http\HttpServer;
use Ratchet\Server\IoServer;
use App\WebSocket\WebSocketServer;
use React\Socket\Server as Reactor;
use React\EventLoop\Factory as LoopFactory;

class WebSocketServerCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'websocket:serve {--port=8080 : The port to run the WebSocket server on} {--host=0.0.0.0 : The host to bind the server to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Start the WebSocket server';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $port = (int) $this->option('port');
        $host = $this->option('host');

        $this->info("Starting WebSocket server on {$host}:{$port}...");

        $loop = LoopFactory::create();
        $socket = new Reactor("{$host}:{$port}", $loop);

        $wsServer = new WsServer(new WebSocketServer());
        $httpServer = new HttpServer($wsServer);
        $server = new IoServer($httpServer, $socket, $loop);

        $this->info("WebSocket server is running on ws://{$host}:{$port}");
        $this->info("Press Ctrl+C to stop the server.");

        $server->run();

        return Command::SUCCESS;
    }
}

