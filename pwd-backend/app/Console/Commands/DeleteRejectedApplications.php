<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Application;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class DeleteRejectedApplications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'applications:delete-rejected';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete rejected applications that have been scheduled for deletion (after 1 day)';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting deletion of rejected applications...');

        // Find all rejected applications where scheduled_deletion_at is in the past
        $applicationsToDelete = Application::where('status', 'Rejected')
            ->whereNotNull('scheduled_deletion_at')
            ->where('scheduled_deletion_at', '<=', now())
            ->get();

        if ($applicationsToDelete->isEmpty()) {
            $this->info('No rejected applications found that are ready for deletion.');
            return Command::SUCCESS;
        }

        $this->info("Found {$applicationsToDelete->count()} rejected application(s) to delete.");

        $deletedCount = 0;
        $errorCount = 0;

        foreach ($applicationsToDelete as $application) {
            try {
                // Delete associated files from storage
                $this->deleteApplicationFiles($application);

                // Delete the application record
                $application->delete();

                $deletedCount++;
                $this->line("Deleted application: {$application->applicationID} - {$application->firstName} {$application->lastName}");

                Log::info('Rejected application deleted', [
                    'application_id' => $application->applicationID,
                    'reference_number' => $application->referenceNumber,
                    'deleted_at' => now()
                ]);
            } catch (\Exception $e) {
                $errorCount++;
                $this->error("Failed to delete application {$application->applicationID}: {$e->getMessage()}");
                
                Log::error('Failed to delete rejected application', [
                    'application_id' => $application->applicationID,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $this->info("Deletion complete. Deleted: {$deletedCount}, Errors: {$errorCount}");

        return Command::SUCCESS;
    }

    /**
     * Delete files associated with an application
     *
     * @param Application $application
     * @return void
     */
    private function deleteApplicationFiles($application)
    {
        $fileFields = [
            'medicalCertificate',
            'clinicalAbstract',
            'voterCertificate',
            'idPictures',
            'birthCertificate',
            'wholeBodyPicture',
            'affidavit',
            'barangayCertificate'
        ];

        foreach ($fileFields as $field) {
            $filePath = $application->$field;
            
            if ($field === 'idPictures' && is_string($filePath)) {
                // Handle JSON array of file paths
                $files = json_decode($filePath, true);
                if (is_array($files)) {
                    foreach ($files as $file) {
                        $this->deleteFile($file);
                    }
                }
            } elseif ($filePath) {
                $this->deleteFile($filePath);
            }
        }
    }

    /**
     * Delete a single file from storage
     *
     * @param string $filePath
     * @return void
     */
    private function deleteFile($filePath)
    {
        if (empty($filePath)) {
            return;
        }

        try {
            // Remove 'storage/' prefix if present
            $filePath = str_replace('storage/', '', $filePath);
            
            // Try to delete from public disk
            if (Storage::disk('public')->exists($filePath)) {
                Storage::disk('public')->delete($filePath);
            }
        } catch (\Exception $e) {
            // Log but don't fail the deletion process
            Log::warning('Failed to delete application file', [
                'file_path' => $filePath,
                'error' => $e->getMessage()
            ]);
        }
    }
}

