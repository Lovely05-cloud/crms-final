<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MemberDocument;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleanupDuplicateMemberDocuments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:cleanup-duplicates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove duplicate member documents, keeping only the most recent one per member and required document type';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of duplicate member documents...');

        // Find all duplicate groups (member_id + required_document_id combinations with more than 1 document)
        $duplicates = MemberDocument::select('member_id', 'required_document_id', DB::raw('COUNT(*) as count'))
            ->groupBy('member_id', 'required_document_id')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('No duplicates found. Database is clean!');
            return 0;
        }

        $this->info("Found {$duplicates->count()} duplicate groups.");

        $totalDeleted = 0;

        foreach ($duplicates as $duplicate) {
            // Get all documents for this member and required document combination
            $documents = MemberDocument::where('member_id', $duplicate->member_id)
                ->where('required_document_id', $duplicate->required_document_id)
                ->orderBy('uploaded_at', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Keep the first (most recent) one, delete the rest
            $keepDocument = $documents->first();
            $toDelete = $documents->skip(1);

            $this->info("Member ID: {$duplicate->member_id}, Required Doc ID: {$duplicate->required_document_id}");
            $this->info("  Keeping document ID: {$keepDocument->id} (uploaded: {$keepDocument->uploaded_at})");
            
            foreach ($toDelete as $document) {
                $this->warn("  Deleting duplicate document ID: {$document->id} (uploaded: {$document->uploaded_at})");
                
                // Delete the file if it exists and is different from the one we're keeping
                if ($document->file_path !== $keepDocument->file_path) {
                    $fullPath = storage_path('app/public/' . $document->file_path);
                    if (file_exists($fullPath)) {
                        unlink($fullPath);
                        $this->info("    Deleted file: {$document->file_path}");
                    }
                }
                
                $document->delete();
                $totalDeleted++;
            }
        }

        $this->info("\nCleanup complete! Deleted {$totalDeleted} duplicate documents.");
        
        // Clear cache
        $this->info('Clearing document caches...');
        foreach ($duplicates as $duplicate) {
            \Illuminate\Support\Facades\Cache::forget("documents.member.{$duplicate->member_id}");
        }
        $this->info('Cache cleared.');

        Log::info('Duplicate member documents cleanup completed', [
            'duplicate_groups' => $duplicates->count(),
            'total_deleted' => $totalDeleted
        ]);

        return 0;
    }
}

