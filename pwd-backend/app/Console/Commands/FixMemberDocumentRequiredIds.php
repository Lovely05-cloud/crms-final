<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MemberDocument;
use App\Models\RequiredDocument;
use Illuminate\Support\Facades\Log;

class FixMemberDocumentRequiredIds extends Command
{
    protected $signature = 'documents:fix-required-ids {--member-id= : Specific member ID to fix}';
    protected $description = 'Fixes MemberDocument records that use old RequiredDocument IDs by updating them to use the most recent active RequiredDocument ID for each document name.';

    public function handle()
    {
        $this->info('Fixing MemberDocument required_document_id references...');

        // Get all unique required documents (most recent active ones)
        $uniqueDocuments = RequiredDocument::active()
            ->orderBy('is_required', 'desc')
            ->orderBy('name')
            ->orderBy('id', 'desc')
            ->get()
            ->unique('name')
            ->values();

        // Create a mapping of document name to the correct (most recent) required_document_id
        $correctDocumentIds = [];
        foreach ($uniqueDocuments as $doc) {
            $correctDocumentIds[$doc->name] = $doc->id;
        }

        $this->info('Correct RequiredDocument IDs:');
        foreach ($correctDocumentIds as $name => $id) {
            $this->line("  {$name}: {$id}");
        }

        // Get all MemberDocuments
        $query = MemberDocument::query();
        if ($this->option('member-id')) {
            $query->where('member_id', $this->option('member-id'));
        }
        $memberDocuments = $query->with('requiredDocument')->get();

        $this->info("\nFound {$memberDocuments->count()} MemberDocument records to check.");

        $fixedCount = 0;
        $notFoundCount = 0;

        foreach ($memberDocuments as $memberDoc) {
            if (!$memberDoc->requiredDocument) {
                $this->warn("MemberDocument ID {$memberDoc->id} has no RequiredDocument (ID: {$memberDoc->required_document_id})");
                $notFoundCount++;
                continue;
            }

            $documentName = $memberDoc->requiredDocument->name;
            $currentRequiredDocId = $memberDoc->required_document_id;
            
            // Check if this MemberDocument is using the correct RequiredDocument ID
            if (isset($correctDocumentIds[$documentName])) {
                $correctRequiredDocId = $correctDocumentIds[$documentName];
                
                if ($currentRequiredDocId !== $correctRequiredDocId) {
                    $this->line("Fixing MemberDocument ID {$memberDoc->id}: {$documentName}");
                    $this->line("  Current required_document_id: {$currentRequiredDocId}");
                    $this->line("  Correct required_document_id: {$correctRequiredDocId}");
                    
                    $memberDoc->required_document_id = $correctRequiredDocId;
                    $memberDoc->save();
                    
                    $fixedCount++;
                    
                    Log::info('Fixed MemberDocument required_document_id', [
                        'member_document_id' => $memberDoc->id,
                        'member_id' => $memberDoc->member_id,
                        'document_name' => $documentName,
                        'old_required_document_id' => $currentRequiredDocId,
                        'new_required_document_id' => $correctRequiredDocId
                    ]);
                }
            } else {
                $this->warn("Document name '{$documentName}' not found in correct documents list for MemberDocument ID {$memberDoc->id}");
                $notFoundCount++;
            }
        }

        $this->info("\nFixed {$fixedCount} MemberDocument records.");
        if ($notFoundCount > 0) {
            $this->warn("{$notFoundCount} MemberDocument records could not be fixed (RequiredDocument not found).");
        }

        // Clear cache
        \Illuminate\Support\Facades\Cache::forget('documents.all.admin');
        \Illuminate\Support\Facades\Cache::forget('documents.all.public');
        \Illuminate\Support\Facades\Cache::forget('documents.public');
        $this->info('Cleared relevant caches.');

        return Command::SUCCESS;
    }
}

