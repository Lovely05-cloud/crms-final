<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RequiredDocument;
use App\Models\MemberDocument;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleanupDuplicateRequiredDocuments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:cleanup-duplicate-required';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove duplicate required documents, keeping only the most recent one per name';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of duplicate required documents...');

        // Find all duplicate groups (same name with more than 1 document)
        $duplicates = RequiredDocument::select('name', DB::raw('COUNT(*) as count'))
            ->where('status', 'active')
            ->groupBy('name')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('No duplicates found. Database is clean!');
            return 0;
        }

        $this->info("Found {$duplicates->count()} duplicate document types.");

        $totalDeleted = 0;
        $totalUpdated = 0;

        foreach ($duplicates as $duplicate) {
            // Get all documents with this name
            $documents = RequiredDocument::where('name', $duplicate->name)
                ->where('status', 'active')
                ->orderBy('id', 'desc') // Keep the most recent one (highest ID)
                ->get();

            // Keep the first (most recent) one, delete the rest
            $keepDocument = $documents->first();
            $toDelete = $documents->skip(1);

            $this->info("\nDocument: {$duplicate->name}");
            $this->info("  Keeping document ID: {$keepDocument->id}");

            foreach ($toDelete as $document) {
                $this->warn("  Processing duplicate document ID: {$document->id}");
                
                // Check if any member documents reference this required document
                $memberDocsCount = MemberDocument::where('required_document_id', $document->id)->count();
                
                if ($memberDocsCount > 0) {
                    // Update member documents to reference the kept document
                    $updated = MemberDocument::where('required_document_id', $document->id)
                        ->update(['required_document_id' => $keepDocument->id]);
                    
                    $this->info("    Updated {$updated} member documents to reference document ID {$keepDocument->id}");
                    $totalUpdated += $updated;
                }
                
                // Delete the duplicate required document
                $document->delete();
                $totalDeleted++;
                $this->info("    Deleted duplicate document ID: {$document->id}");
            }
        }

        $this->info("\nCleanup complete!");
        $this->info("  Deleted {$totalDeleted} duplicate required documents");
        $this->info("  Updated {$totalUpdated} member documents to reference kept documents");
        
        // Clear all document caches
        $this->info('Clearing document caches...');
        \Illuminate\Support\Facades\Cache::flush();
        $this->info('Cache cleared.');

        Log::info('Duplicate required documents cleanup completed', [
            'duplicate_groups' => $duplicates->count(),
            'total_deleted' => $totalDeleted,
            'total_updated' => $totalUpdated
        ]);

        return 0;
    }
}

