<?php

namespace App\Services;

use App\Models\Application;
use App\Models\RequiredDocument;
use App\Models\MemberDocument;
use App\Models\PWDMember;
use Illuminate\Support\Facades\Log;

class DocumentMigrationService
{
    /**
     * Migrate documents from application to member_documents table
     * @param Application $application The approved application
     * @param \App\Models\User $pwdUser The PWD member user account
     * @param int|null $reviewedBy The user ID of the admin who approved (optional)
     */
    public function migrateApplicationDocuments($application, $pwdUser, $reviewedBy = null)
    {
        try {
            Log::info('Starting document migration for application', [
                'application_id' => $application->applicationID,
                'pwd_user_id' => $pwdUser->userID
            ]);

            // Create a mapping of application document fields to required document names
            // Note: Document names must match exactly with RequiredDocumentSeeder
            $documentMapping = [
                'medicalCertificate' => 'Medical Certificate',
                'idPictures' => 'ID Pictures', // Updated to match seeder and handle as single file
                'clinicalAbstract' => 'Clinical Abstract/Assessment',
                'voterCertificate' => 'Voter Certificate',
                'birthCertificate' => 'Birth Certificate',
                'wholeBodyPicture' => 'Whole Body Picture',
                'affidavit' => 'Affidavit of Guardianship/Loss',
                'barangayCertificate' => 'Barangay Certificate of Residency'
            ];

            $migratedCount = 0;

            // Process each document field
            foreach ($documentMapping as $fieldName => $documentName) {
                $filePath = $application->$fieldName;
                
                // Handle idPictures as single file string (standardized format)
                // Support backward compatibility for old array format
                if ($fieldName === 'idPictures' && !empty($filePath)) {
                    // Check if it's stored as array (old format) or string (new format)
                    if (is_array($filePath)) {
                        // Old format: array - get first file
                        $filePath = !empty($filePath) ? $filePath[0] : null;
                    } elseif (is_string($filePath)) {
                        // Check if it's a JSON string (old format)
                        if ((strpos(trim($filePath), '[') === 0) || (strpos(trim($filePath), '"') === 0 && strpos(trim($filePath), '[') !== false)) {
                            // Try to decode if it's a JSON string (old format)
                            $decoded = json_decode($filePath, true);
                            if (is_array($decoded) && count($decoded) > 0) {
                                $filePath = $decoded[0];
                            }
                        }
                        // If it's a regular string path (new format), use it as-is
                    }
                }
                
                if (!empty($filePath)) {
                    Log::info('Processing document', [
                        'field' => $fieldName,
                        'document_name' => $documentName,
                        'file_path' => $filePath
                    ]);

                    // Find the required document by name
                    // Use active() and orderBy id desc to get the most recent one if duplicates exist
                    $requiredDocument = RequiredDocument::where('name', $documentName)
                        ->active()
                        ->orderBy('id', 'desc')
                        ->first();
                    
                    if (!$requiredDocument) {
                        Log::warning('Required document not found', [
                            'document_name' => $documentName,
                            'field' => $fieldName,
                            'all_matching_docs' => RequiredDocument::where('name', $documentName)->get()->pluck('id', 'status')->toArray()
                        ]);
                        continue; // Skip if required document doesn't exist
                    }
                    
                    Log::info('Found required document for migration', [
                        'document_name' => $documentName,
                        'required_document_id' => $requiredDocument->id,
                        'field' => $fieldName
                    ]);

                    // Get the source file path from application
                    $sourceFilePath = storage_path('app/public/' . $filePath);
                    
                    if (!file_exists($sourceFilePath)) {
                        Log::warning('Source file not found, skipping migration', [
                            'field' => $fieldName,
                            'source_path' => $sourceFilePath,
                            'application_id' => $application->applicationID
                        ]);
                        continue; // Skip if source file doesn't exist
                    }
                    
                    // Get file info from source
                    $fileSize = filesize($sourceFilePath);
                    $fileType = mime_content_type($sourceFilePath) ?: 'application/octet-stream';
                    $originalFileName = basename($filePath);
                    $fileExtension = pathinfo($originalFileName, PATHINFO_EXTENSION);
                    
                    // Create destination directory structure: member-documents/{member_id}/{year}/{month}/{day}/
                    $now = now();
                    $destinationDir = 'member-documents/' . $pwdUser->userID . '/' . $now->format('Y/m/d');
                    $destinationPath = storage_path('app/public/' . $destinationDir);
                    
                    // Create directory if it doesn't exist
                    if (!is_dir($destinationPath)) {
                        \Illuminate\Support\Facades\File::makeDirectory($destinationPath, 0755, true);
                    }
                    
                    // Generate unique filename to avoid conflicts
                    $uniqueId = str_replace('.', '', microtime(true));
                    $destinationFileName = $fieldName . '_' . $uniqueId . '.' . $fileExtension;
                    $destinationFilePath = $destinationPath . '/' . $destinationFileName;
                    $destinationRelativePath = $destinationDir . '/' . $destinationFileName;
                    
                    // Copy file from application storage to member documents storage
                    if (copy($sourceFilePath, $destinationFilePath)) {
                        Log::info('File copied to member documents storage', [
                            'source' => $sourceFilePath,
                            'destination' => $destinationFilePath,
                            'member_id' => $pwdUser->userID,
                            'document' => $documentName
                        ]);
                        
                    // Use updateOrCreate to prevent duplicates and update if exists
                    $memberDocument = MemberDocument::updateOrCreate(
                        [
                            'member_id' => $pwdUser->userID,
                            'required_document_id' => $requiredDocument->id,
                        ],
                        [
                            'file_path' => $destinationRelativePath, // Store new path in member-documents storage
                            'file_name' => $originalFileName, // Keep original filename
                            'file_size' => $fileSize,
                            'file_type' => $fileType,
                            'uploaded_at' => $application->submissionDate ?? now(),
                            'status' => 'approved', // Mark as approved since application was approved
                            'notes' => 'Migrated from application form',
                            'reviewed_by' => $reviewedBy, // Admin who approved the application
                            'reviewed_at' => now(),
                            'updated_at' => now()
                        ]
                    );
                    
                    Log::info('MemberDocument created/updated', [
                        'member_document_id' => $memberDocument->id,
                        'member_id' => $pwdUser->userID,
                        'required_document_id' => $requiredDocument->id,
                        'document_name' => $documentName,
                        'file_path' => $destinationRelativePath,
                        'was_recently_created' => $memberDocument->wasRecentlyCreated
                    ]);
                } else {
                        Log::error('Failed to copy file to member documents storage', [
                            'source' => $sourceFilePath,
                            'destination' => $destinationFilePath,
                            'member_id' => $pwdUser->userID,
                            'document' => $documentName
                        ]);
                        continue; // Skip if copy failed
                    }
                    
                    // Count as migrated if it was newly created OR updated
                    if ($memberDocument->wasRecentlyCreated) {
                        $migratedCount++;
                        Log::info('Document migrated successfully', [
                            'member_id' => $pwdUser->userID,
                            'document' => $documentName,
                            'member_document_id' => $memberDocument->id,
                            'source_path' => $filePath,
                            'destination_path' => $destinationRelativePath
                        ]);
                    } else {
                        $migratedCount++; // Also count updates as migrations
                        Log::info('Document already exists, updated', [
                            'member_id' => $pwdUser->userID,
                            'document' => $documentName,
                            'member_document_id' => $memberDocument->id,
                            'new_path' => $destinationRelativePath
                        ]);
                    }
                }
            }

            // Clear cache for this member's documents
            // Clear all relevant caches to ensure fresh data
            \Illuminate\Support\Facades\Cache::forget("documents.member.{$pwdUser->userID}");
            \Illuminate\Support\Facades\Cache::forget('documents.all.admin');
            \Illuminate\Support\Facades\Cache::forget('documents.all.public');
            \Illuminate\Support\Facades\Cache::forget('documents.public');
            
            // Also clear cache using pattern (if supported)
            try {
                \Illuminate\Support\Facades\Cache::flush(); // Clear all cache to be safe
            } catch (\Exception $cacheError) {
                Log::warning('Could not flush all cache', ['error' => $cacheError->getMessage()]);
            }

            Log::info('Document migration completed', [
                'application_id' => $application->applicationID,
                'pwd_user_id' => $pwdUser->userID,
                'migrated_count' => $migratedCount,
                'total_documents_processed' => count($documentMapping)
            ]);

            return [
                'success' => true,
                'migrated_count' => $migratedCount
            ];

        } catch (\Exception $e) {
            Log::error('Document migration failed', [
                'application_id' => $application->applicationID,
                'pwd_user_id' => $pwdUser->userID,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Migrate documents for all approved applications
     */
    public function migrateAllApprovedApplications()
    {
        try {
            Log::info('Starting bulk document migration for all approved applications');

            $approvedApplications = Application::where('status', 'Approved')->get();
            $totalMigrated = 0;
            $totalSkipped = 0;

            foreach ($approvedApplications as $application) {
                // Find the corresponding PWD member
                $pwdMember = PWDMember::where('userID', $application->pwdID)->first();
                
                if (!$pwdMember) {
                    Log::warning('PWD member not found for application', [
                        'application_id' => $application->applicationID,
                        'pwd_id' => $application->pwdID
                    ]);
                    $totalSkipped++;
                    continue;
                }

                $result = $this->migrateApplicationDocuments($application, $pwdMember->user);
                if ($result['success']) {
                    $totalMigrated += $result['migrated_count'];
                } else {
                    $totalSkipped++;
                }
            }

            Log::info('Bulk document migration completed', [
                'total_applications' => $approvedApplications->count(),
                'total_migrated' => $totalMigrated,
                'total_skipped' => $totalSkipped
            ]);

            return [
                'success' => true,
                'total_applications' => $approvedApplications->count(),
                'total_migrated' => $totalMigrated,
                'total_skipped' => $totalSkipped
            ];

        } catch (\Exception $e) {
            Log::error('Bulk document migration failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
