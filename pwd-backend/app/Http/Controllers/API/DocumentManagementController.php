<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\RequiredDocument;
use App\Models\MemberDocument;
use App\Models\DocumentNotification;
use App\Models\PWDMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class DocumentManagementController extends Controller
{
    // Admin functions
    public function index(Request $request)
    {
        // Check if this is a superadmin request (for document management page)
        $isSuperAdmin = $request->user() && $request->user()->role === 'SuperAdmin';
        
        $cacheKey = $isSuperAdmin ? 'documents.all.admin' : 'documents.all.public';
        
        $documents = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($isSuperAdmin) {
            if ($isSuperAdmin) {
                // SuperAdmin sees all documents for management
                return RequiredDocument::with('creator')
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->unique('name') // Remove duplicates based on document name
                    ->values(); // Re-index array
            } else {
                // Public/application form sees only active documents within date range
                return RequiredDocument::with('creator')
                    ->active()
                    ->where(function($query) {
                        $query->whereNull('effective_date')
                              ->orWhere('effective_date', '<=', now());
                    })
                    ->where(function($query) {
                        $query->whereNull('expiry_date')
                              ->orWhere('expiry_date', '>=', now());
                    })
                    ->orderBy('created_at', 'desc')
                    ->get()
                    ->unique('name') // Remove duplicates based on document name
                    ->values(); // Re-index array
            }
        });

        return response()->json([
            'success' => true,
            'documents' => $documents
        ]);
    }

    public function getPublicDocuments()
    {
        // Public endpoint for application form - returns only active documents within date range
        $documents = Cache::remember('documents.public', now()->addMinutes(10), function () {
            return RequiredDocument::active()
                ->where(function($query) {
                    $query->whereNull('effective_date')
                          ->orWhere('effective_date', '<=', now());
                })
                ->where(function($query) {
                    $query->whereNull('expiry_date')
                          ->orWhere('expiry_date', '>=', now());
                })
                ->orderBy('created_at', 'desc')
                ->get()
                ->unique('name') // Remove duplicates based on document name
                ->values(); // Re-index array
        });

        return response()->json([
            'success' => true,
            'documents' => $documents
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_required' => 'boolean',
            'file_types' => 'nullable|array',
            'file_types.*' => 'string|in:pdf,jpg,jpeg,png,doc,docx',
            'max_file_size' => 'integer|min:2048|max:51200', // 2MB to 50MB
            'effective_date' => 'nullable|date|after_or_equal:today',
            'expiry_date' => 'nullable|date|after:effective_date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $document = RequiredDocument::create([
                'name' => $request->name,
                'description' => $request->description,
                'is_required' => $request->is_required ?? true,
                'file_types' => $request->file_types ?? ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => $request->max_file_size ?? 2048,
                'created_by' => $request->user()->userID,
                'effective_date' => $request->effective_date,
                'expiry_date' => $request->expiry_date
            ]);

            // Notify all PWD members about the new required document
            $this->notifyMembers($document);
            
            // Clear documents cache
            Cache::forget('documents.all.admin');
            Cache::forget('documents.all.public');
            Cache::forget('documents.public');

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Required document created successfully',
                'document' => $document->load('creator')
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create required document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $document = RequiredDocument::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_required' => 'boolean',
            'file_types' => 'nullable|array',
            'file_types.*' => 'string|in:pdf,jpg,jpeg,png,doc,docx',
            'max_file_size' => 'integer|min:2048|max:51200', // 2MB to 50MB
            'status' => 'in:active,inactive',
            'effective_date' => 'nullable|date|after_or_equal:today',
            'expiry_date' => 'nullable|date|after:effective_date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $document->update($request->only([
            'name', 'description', 'is_required', 'file_types', 
            'max_file_size', 'status', 'effective_date', 'expiry_date'
        ]));
        
        // Clear documents cache
        Cache::forget('documents.all.admin');
        Cache::forget('documents.all.public');
        Cache::forget('documents.public');

        return response()->json([
            'success' => true,
            'message' => 'Required document updated successfully',
            'document' => $document->load('creator')
        ]);
    }

    public function destroy($id)
    {
        $document = RequiredDocument::findOrFail($id);
        
        // Check if any members have uploaded this document
        $memberDocuments = MemberDocument::where('required_document_id', $id)->count();
        
        if ($memberDocuments > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete document. Members have already uploaded this document.'
            ], 400);
        }

        $document->delete();
        
        // Clear documents cache
        Cache::forget('documents.all.admin');
        Cache::forget('documents.all.public');
        Cache::forget('documents.public');

        return response()->json([
            'success' => true,
            'message' => 'Required document deleted successfully'
        ]);
    }

    // Member functions
    public function getMemberDocuments(Request $request)
    {
        $memberId = $request->user()->userID;
        
        // Don't use cache for now to ensure fresh data - cache can be re-enabled later if needed
        // $documents = Cache::remember("documents.member.{$memberId}", now()->addMinutes(5), function () use ($memberId) {
        $documents = (function () use ($memberId) {
            // Get unique required documents by name (in case of duplicates)
            // Group by name and get the most recent one (by id or created_at)
            $uniqueDocuments = RequiredDocument::active()
                ->orderBy('is_required', 'desc')
                ->orderBy('name')
                ->orderBy('id', 'desc') // Get the most recent if duplicates exist
                ->get()
                ->unique('name')
                ->values(); // Re-index array after unique()
            
            return $uniqueDocuments->map(function ($document) use ($memberId) {
                    // Get the most recent member document for this required document type
                    // This ensures only one document per required document type is returned
                    $memberDocument = MemberDocument::where('member_id', $memberId)
                        ->where('required_document_id', $document->id)
                        ->orderBy('uploaded_at', 'desc')
                        ->orderBy('id', 'desc') // Also order by ID as fallback
                        ->first();
                    
                    // Log for debugging
                    if ($memberDocument) {
                        \Illuminate\Support\Facades\Log::info('Found member document', [
                            'member_id' => $memberId,
                            'required_document_id' => $document->id,
                            'document_name' => $document->name,
                            'member_document_id' => $memberDocument->id,
                            'file_path' => $memberDocument->file_path
                        ]);
                    } else {
                        \Illuminate\Support\Facades\Log::info('No member document found', [
                            'member_id' => $memberId,
                            'required_document_id' => $document->id,
                            'document_name' => $document->name
                        ]);
                    }
                    
                    // Set the memberDocuments relationship to only include the most recent one
                    if ($memberDocument) {
                        $document->setRelation('memberDocuments', collect([$memberDocument]));
                    } else {
                        $document->setRelation('memberDocuments', collect([]));
                    }
                    
                    // Ensure the relationship is properly serialized
                    // Laravel will serialize memberDocuments as camelCase in JSON
                    // The frontend will normalize it to member_documents
                    return $document;
                });
        })(); // Execute immediately instead of caching

        // Log the response for debugging
        \Illuminate\Support\Facades\Log::info('getMemberDocuments response', [
            'member_id' => $memberId,
            'total_documents' => $documents->count(),
            'documents_with_member_docs' => $documents->filter(function ($doc) {
                return $doc->memberDocuments && $doc->memberDocuments->count() > 0;
            })->count()
        ]);
        
        return response()->json([
            'success' => true,
            'documents' => $documents->map(function ($doc) {
                // Ensure memberDocuments is properly included in JSON response
                $docData = $doc->toArray();
                // Laravel will automatically serialize the relationship as 'memberDocuments' (camelCase)
                // The frontend will normalize it to 'member_documents' (snake_case)
                return $docData;
            })
        ]);
    }

    public function uploadDocument(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'required_document_id' => 'required|exists:required_documents,id',
            'document' => 'required|file|max:15360' // 15MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $requiredDocument = RequiredDocument::findOrFail($request->required_document_id);
        $memberId = $request->user()->userID;

        // Validate file type
        $file = $request->file('document');
        $fileExtension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($fileExtension, $requiredDocument->file_types)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file type. Allowed types: ' . implode(', ', $requiredDocument->file_types)
            ], 422);
        }

        // Validate file size
        if ($file->getSize() > ($requiredDocument->max_file_size * 1024)) {
            return response()->json([
                'success' => false,
                'message' => 'File size exceeds maximum allowed size of ' . $requiredDocument->max_file_size . 'KB'
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Store file
            $uploadPath = 'member-documents/' . date('Y/m/d');
            $fileName = 'doc_' . $memberId . '_' . $requiredDocument->id . '_' . time() . '.' . $fileExtension;
            $filePath = $file->storeAs($uploadPath, $fileName, 'public');

            // Delete existing document if any
            $existingDocument = MemberDocument::where('member_id', $memberId)
                ->where('required_document_id', $requiredDocument->id)
                ->first();

            if ($existingDocument) {
                Storage::disk('public')->delete($existingDocument->file_path);
                $existingDocument->delete();
            }

            // Create new document record
            $memberDocument = MemberDocument::create([
                'member_id' => $memberId,
                'required_document_id' => $requiredDocument->id,
                'file_path' => $filePath,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
                'file_type' => $file->getMimeType(),
                'uploaded_at' => now(),
                'status' => 'pending'
            ]);

            DB::commit();
            
            // Clear member documents cache
            Cache::forget("documents.member.{$memberId}");
            Cache::forget('documents.pending_reviews');

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'document' => $memberDocument
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getDocumentFile($id)
    {
        try {
            \Illuminate\Support\Facades\Log::info('Serving member document file', [
                'document_id' => $id,
                'has_token' => request()->has('token'),
                'auth_header' => request()->header('Authorization') ? 'present' : 'missing'
            ]);
            
            // Check for token-based authentication (support both Sanctum and query token)
            $user = Auth::user();
            
            // Try Sanctum authentication first
            if (!$user && request()->bearerToken()) {
                try {
                    $user = Auth::guard('sanctum')->user();
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Sanctum auth failed', ['error' => $e->getMessage()]);
                }
            }
            
            // Fallback to query parameter token (for backward compatibility)
            if (!$user && request()->has('token')) {
                $token = request()->get('token');
                // Try Sanctum token first
                try {
                    $personalAccessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                    if ($personalAccessToken) {
                        $user = $personalAccessToken->tokenable;
                    }
                } catch (\Exception $e) {
                    // Fallback to remember_token
                    $user = \App\Models\User::where('remember_token', $token)->first();
                }
                
                if ($user) {
                    Auth::setUser($user);
                }
            }
            
            $memberDocument = MemberDocument::findOrFail($id);
            
            \Illuminate\Support\Facades\Log::info('Member document found', [
                'document_id' => $id,
                'member_id' => $memberDocument->member_id,
                'file_path' => $memberDocument->file_path,
                'user_id' => $user ? $user->userID : null,
                'user_role' => $user ? $user->role : null
            ]);
            
            // Check permissions if user is authenticated
            if ($user) {
                // Admin users can access any file
                if (!in_array($user->role, ['Admin', 'SuperAdmin', 'Staff1', 'Staff2'])) {
                    // PWD members can only access their own files
                    if ($user->role === 'PWDMember' && $memberDocument->member_id !== $user->userID) {
                        \Illuminate\Support\Facades\Log::warning('Unauthorized access attempt', [
                            'document_id' => $id,
                            'member_id' => $memberDocument->member_id,
                            'user_id' => $user->userID
                        ]);
                        return response()->json([
                            'success' => false,
                            'message' => 'Unauthorized access to document'
                        ], 403);
                    }
                }
            }
            
            // Get the file path from member document
            // Files are now stored in member-documents/{member_id}/{year}/{month}/{day}/ directory
            $filePath = $memberDocument->file_path;
            
            if (empty($filePath)) {
                \Illuminate\Support\Facades\Log::error('File path is empty', [
                    'document_id' => $id,
                    'member_document_file_path' => $memberDocument->file_path
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'File path is empty for this document'
                ], 404);
            }
            
            $fullFilePath = storage_path('app/public/' . $filePath);
            
            \Illuminate\Support\Facades\Log::info('Checking file existence in member documents storage', [
                'file_path' => $filePath,
                'full_file_path' => $fullFilePath,
                'exists' => file_exists($fullFilePath),
                'is_readable' => file_exists($fullFilePath) ? is_readable($fullFilePath) : false
            ]);
            
            if (!file_exists($fullFilePath)) {
                \Illuminate\Support\Facades\Log::warning('File not found in member documents storage, checking if it\'s in old application storage', [
                    'document_id' => $id,
                    'file_path' => $filePath,
                    'full_file_path' => $fullFilePath
                ]);
                
                // Fallback: If file path starts with "uploads/applications", it's an old path from application storage
                // This handles backward compatibility for documents migrated before this change
                if (strpos($filePath, 'uploads/applications') === 0 || strpos($filePath, 'applications/') === 0) {
                    // File is in old application storage, try to serve it from there
                    if (file_exists($fullFilePath)) {
                        \Illuminate\Support\Facades\Log::info('Serving file from old application storage (backward compatibility)', [
                            'document_id' => $id,
                            'file_path' => $filePath
                        ]);
                        // Continue to serve the file
                    } else {
                        \Illuminate\Support\Facades\Log::error('File not found in member documents storage or old application storage', [
                            'document_id' => $id,
                            'file_path' => $filePath,
                            'full_file_path' => $fullFilePath,
                            'member_document_file_path' => $memberDocument->file_path
                        ]);
                        
                        return response()->json([
                            'success' => false,
                            'message' => 'File not found at path: ' . $fullFilePath,
                            'document_id' => $id,
                            'stored_path' => $memberDocument->file_path
                        ], 404);
                    }
                } else {
                    // File path doesn't match expected patterns
                    \Illuminate\Support\Facades\Log::error('File not found and path doesn\'t match expected patterns', [
                        'document_id' => $id,
                        'file_path' => $filePath,
                        'full_file_path' => $fullFilePath,
                        'member_document_file_path' => $memberDocument->file_path
                    ]);
                    
                    return response()->json([
                        'success' => false,
                        'message' => 'File not found at path: ' . $fullFilePath,
                        'document_id' => $id,
                        'stored_path' => $memberDocument->file_path
                    ], 404);
                }
            }

            // Get file info
            $fileSize = filesize($fullFilePath);
            $mimeType = mime_content_type($fullFilePath);
            
            \Illuminate\Support\Facades\Log::info('File found, serving', [
                'document_id' => $id,
                'file_size' => $fileSize,
                'mime_type' => $mimeType
            ]);
            
            // Set appropriate headers
            $headers = [
                'Content-Type' => $mimeType,
                'Content-Length' => $fileSize,
                'Content-Disposition' => 'inline; filename="' . $memberDocument->file_name . '"',
                'Cache-Control' => 'private, max-age=3600',
                'Pragma' => 'private'
            ];

            // Return file response with proper headers
            return response()->file($fullFilePath, $headers);
            
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Illuminate\Support\Facades\Log::error('Member document not found', [
                'document_id' => $id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Document not found'
            ], 404);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error serving member document file', [
                'document_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error serving file: ' . $e->getMessage()
            ], 500);
        }
    }

    // Admin review functions
    public function reviewDocument(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $memberDocument = MemberDocument::findOrFail($id);
        
        $memberDocument->update([
            'status' => $request->status,
            'notes' => $request->notes,
            'reviewed_by' => $request->user()->userID,
            'reviewed_at' => now()
        ]);
        
        // Clear caches
        Cache::forget("documents.member.{$memberDocument->member_id}");
        Cache::forget('documents.pending_reviews');

        return response()->json([
            'success' => true,
            'message' => 'Document review completed',
            'document' => $memberDocument->load('reviewer')
        ]);
    }

    public function getPendingReviews()
    {
        $documents = Cache::remember('documents.pending_reviews', now()->addMinutes(2), function () {
            return MemberDocument::with(['member', 'requiredDocument', 'reviewer'])
                ->where('status', 'pending')
                ->orderBy('uploaded_at', 'asc')
                ->get();
        });

        return response()->json([
            'success' => true,
            'documents' => $documents
        ]);
    }

    public function getAllMemberDocuments()
    {
        // Get all members with their submitted documents for admin management
        $members = Cache::remember('documents.all_members', now()->addMinutes(5), function () {
            return PWDMember::with(['memberDocuments' => function($query) {
                $query->with(['requiredDocument', 'reviewer'])
                      ->orderBy('uploaded_at', 'desc');
            }])
            ->whereHas('memberDocuments') // Only members who have submitted documents
            ->orderBy('lastName')
            ->orderBy('firstName')
            ->get();
        });

        return response()->json([
            'success' => true,
            'members' => $members
        ]);
    }

    // Notification functions
    public function getNotifications(Request $request)
    {
        $memberId = $request->user()->userID;
        
        $notifications = DocumentNotification::with('requiredDocument')
            ->where('member_id', $memberId)
            ->orderBy('sent_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'notifications' => $notifications
        ]);
    }

    public function markNotificationAsRead(Request $request, $id)
    {
        $notification = DocumentNotification::where('id', $id)
            ->where('member_id', $request->user()->userID)
            ->firstOrFail();

        $notification->update([
            'is_read' => true,
            'read_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read'
        ]);
    }

    // Private helper methods
    private function notifyMembers(RequiredDocument $document)
    {
        $members = PWDMember::all();

        foreach ($members as $member) {
            DocumentNotification::create([
                'member_id' => $member->userID,
                'required_document_id' => $document->id,
                'title' => 'New Required Document: ' . $document->name,
                'message' => 'A new required document "' . $document->name . '" has been added. Please upload this document to maintain your PWD membership status.',
                'sent_at' => now()
            ]);
        }
    }
}