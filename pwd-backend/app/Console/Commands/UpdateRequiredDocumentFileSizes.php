<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RequiredDocument;
use Illuminate\Support\Facades\Log;

class UpdateRequiredDocumentFileSizes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:update-file-sizes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update max_file_size for all required documents to 15MB (15360 KB)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating max_file_size for all required documents to 15MB (15360 KB)...');

        $updated = RequiredDocument::where('status', 'active')
            ->update(['max_file_size' => 15360]);

        $this->info("Updated {$updated} required documents.");

        Log::info('Required documents file sizes updated', [
            'updated_count' => $updated,
            'new_max_size' => 15360
        ]);

        return 0;
    }
}

