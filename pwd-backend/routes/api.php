<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\PWDMemberController;
use App\Http\Controllers\API\ComplaintController;
use App\Http\Controllers\API\BenefitController;
use App\Http\Controllers\API\BenefitClaimController;
use App\Http\Controllers\API\AnnouncementController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\AuditLogController;
use App\Http\Controllers\API\SecurityMonitoringController;
use App\Http\Controllers\API\SupportTicketController;
use App\Http\Controllers\API\DashboardController;
use App\Http\Controllers\API\GmailController;
use App\Http\Controllers\LanguageController;
use App\Http\Controllers\DashboardController as MainDashboardController;
use App\Http\Controllers\API\AnalyticsController;
use App\Http\Controllers\API\DocumentManagementController;
use App\Http\Controllers\API\IDRenewalController;

// Language routes
Route::prefix('language')->group(function () {
    Route::post('/change', [LanguageController::class, 'changeLanguage']);
    Route::get('/current', [LanguageController::class, 'getCurrentLanguage']);
    Route::get('/supported', [LanguageController::class, 'getSupportedLanguages']);
});

// Google Translate routes (commented out - controller needs to be created)
/*
Route::prefix('translate')->group(function () {
    Route::post('/', [TranslateController::class, 'translate']);
    Route::post('/batch', [TranslateController::class, 'translateBatch']);
    Route::post('/detect', [TranslateController::class, 'detectLanguage']);
    Route::post('/section', [TranslateController::class, 'translateSection']);
});
*/

// Public Dashboard routes (working)
Route::get('/dashboard-stats', [MainDashboardController::class, 'getDashboardStats']);
Route::get('/dashboard-monthly', [MainDashboardController::class, 'getMonthlyStats']);
Route::get('/dashboard-activities', [MainDashboardController::class, 'getRecentActivities']);
Route::get('/dashboard-coordination', [MainDashboardController::class, 'getBarangayCoordination']);

// Public application status check route
Route::get('/application-status/{referenceNumber}', function ($referenceNumber) {
    try {
        $application = \App\Models\Application::where('referenceNumber', $referenceNumber)->first();
        
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Application not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'application' => [
                'applicationID' => $application->applicationID,
                'referenceNumber' => $application->referenceNumber,
                'firstName' => $application->firstName,
                'middleName' => $application->middleName,
                'lastName' => $application->lastName,
                'suffix' => $application->suffix,
                'email' => $application->email,
                'status' => $application->status,
                'submissionDate' => $application->submissionDate,
                'remarks' => $application->remarks,
                // Include document paths for rejected applications (allowing re-upload)
                'canReuploadDocuments' => $application->status === 'Rejected',
                'documentFields' => [
                    'medicalCertificate' => $application->medicalCertificate,
                    'clinicalAbstract' => $application->clinicalAbstract,
                    'voterCertificate' => $application->voterCertificate,
                    'idPictures' => $application->idPictures,
                    'birthCertificate' => $application->birthCertificate,
                    'wholeBodyPicture' => $application->wholeBodyPicture,
                    'affidavit' => $application->affidavit,
                    'barangayCertificate' => $application->barangayCertificate
                ]
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error checking application status: ' . $e->getMessage()
        ], 500);
    }
});

// Route to re-upload documents for rejected applications
Route::post('/application-status/{referenceNumber}/reupload-documents', function (Request $request, $referenceNumber) {
    try {
        $application = \App\Models\Application::where('referenceNumber', $referenceNumber)->first();
        
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Application not found'
            ], 404);
        }
        
        // Only allow re-upload for rejected applications
        if ($application->status !== 'Rejected') {
            return response()->json([
                'success' => false,
                'message' => 'Documents can only be re-uploaded for rejected applications'
            ], 400);
        }
        
        // Handle file uploads
        $uploadPath = 'uploads/applications/' . date('Y/m/d');
        \Illuminate\Support\Facades\Storage::makeDirectory($uploadPath);
        
        $updatedFields = [];
        
        // Handle each document type
        $documentTypes = [
            'medicalCertificate', 'clinicalAbstract', 'voterCertificate', 
            'birthCertificate', 'wholeBodyPicture', 'affidavit', 'barangayCertificate'
        ];
        
        foreach ($documentTypes as $docType) {
            if ($request->hasFile($docType)) {
                $file = $request->file($docType);
                $fileName = $docType . '_' . time() . '.' . $file->getClientOriginalExtension();
                $filePath = $file->storeAs($uploadPath, $fileName, 'public');
                $updatedFields[$docType] = $filePath;
            }
        }
        
        // Handle ID pictures separately (multiple files)
        $idPictures = [];
        for ($i = 0; $i < 2; $i++) {
            if ($request->hasFile("idPicture_$i")) {
                $idPictureFile = $request->file("idPicture_$i");
                $idPictureName = "id_picture_{$i}_" . time() . '.' . $idPictureFile->getClientOriginalExtension();
                $idPicturePath = $idPictureFile->storeAs($uploadPath, $idPictureName, 'public');
                $idPictures[] = $idPicturePath;
            }
        }
        if (!empty($idPictures)) {
            $updatedFields['idPictures'] = json_encode($idPictures);
        }
        
        // Update application with new documents
        if (!empty($updatedFields)) {
            // Update status back to pending after re-upload
            $updatedFields['status'] = 'Pending Barangay Approval';
            $updatedFields['remarks'] = null; // Clear rejection remarks
            $updatedFields['submissionDate'] = now(); // Update submission date
            
            $application->update($updatedFields);
            
            \Illuminate\Support\Facades\Log::info('Documents re-uploaded for rejected application', [
                'application_id' => $application->applicationID,
                'reference_number' => $referenceNumber,
                'updated_fields' => array_keys($updatedFields)
            ]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Documents uploaded successfully. Your application has been resubmitted for review.',
            'application' => $application->fresh()
        ]);
        
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Error re-uploading documents', [
            'reference_number' => $referenceNumber,
            'error' => $e->getMessage()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Error uploading documents: ' . $e->getMessage()
        ], 500);
    }
});

// Public user status check route (for troubleshooting login issues)
Route::get('/check-user-status/{email}', function ($email) {
    try {
        $user = \App\Models\User::where('email', $email)->first();
        $application = \App\Models\Application::where('email', $email)->first();
        
        if (!$user && !$application) {
            return response()->json([
                'exists' => false,
                'message' => 'No account or application found with this email address'
            ]);
        }
        
        $response = [
            'email' => $email,
            'user_account' => null,
            'application' => null
        ];
        
        if ($user) {
            $response['user_account'] = [
                'userID' => $user->userID,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at
            ];
        }
        
        if ($application) {
            $response['application'] = [
                'applicationID' => $application->applicationID,
                'firstName' => $application->firstName,
                'lastName' => $application->lastName,
                'email' => $application->email,
                'status' => $application->status,
                'submissionDate' => $application->submissionDate,
                'created_at' => $application->created_at,
                'updated_at' => $application->updated_at
            ];
        }
        
        return response()->json($response);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to check user status',
            'message' => $e->getMessage()
        ], 500);
    }
});






// Get applications by status
Route::get('/applications/status/{status}', function ($status) {
    try {
        $applications = \App\Models\Application::where('status', urldecode($status))->get();
        
        // Add pending correction request status to each application
        $applicationsWithCorrections = $applications->map(function ($application) {
            $pendingCorrection = \App\Models\DocumentCorrectionRequest::where('application_id_string', $application->applicationID)
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->first();
            
            $application->has_pending_correction = $pendingCorrection ? true : false;
            return $application;
        });
        
        return response()->json($applicationsWithCorrections);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// Get all applications (adjusting for singular table name)
Route::get('/applications', function () {
    try {
        $applications = \App\Models\Application::all();
        
        // Add pending correction request status to each application
        $applicationsWithCorrections = $applications->map(function ($application) {
            $pendingCorrection = \App\Models\DocumentCorrectionRequest::where('application_id_string', $application->applicationID)
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->first();
            
            $application->has_pending_correction = $pendingCorrection ? true : false;
            return $application;
        });
        
        return response()->json($applicationsWithCorrections);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
});

// PWD Members fallback route (when pwd_member table doesn't exist)
Route::get('/pwd-members-fallback', function () {
    try {
        // Get approved applications as PWD members
        $approvedApplications = \App\Models\Application::where('status', 'Approved')->get();
        
        $members = $approvedApplications->map(function ($app) {
            return [
                'id' => $app->applicationID,
                'userID' => $app->applicationID,
                'firstName' => $app->firstName,
                'lastName' => $app->lastName,
                'middleName' => $app->middleName,
                'suffix' => $app->suffix,
                'birthDate' => $app->birthDate,
                'gender' => $app->gender,
                'disabilityType' => $app->disabilityType,
                'address' => $app->address,
                'contactNumber' => $app->contactNumber,
                'email' => $app->email,
                'barangay' => $app->barangay,
                'emergencyContact' => $app->emergencyContact,
                'emergencyPhone' => $app->emergencyPhone,
                'emergencyRelationship' => $app->emergencyRelationship,
                'status' => 'Active',
                'created_at' => $app->created_at,
                'updated_at' => $app->updated_at
            ];
        });
        
        return response()->json([
            'success' => true,
            'members' => $members,
            'count' => $members->count(),
            'source' => 'approved_applications'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch PWD members',
            'error' => $e->getMessage()
        ], 500);
    }
});


// Database and email test route
Route::get('/test-database-email', function () {
    try {
        // Test database connection
        $dbTest = 'Database: ';
        try {
            $appCount = \App\Models\Application::count();
            $dbTest .= "SUCCESS - Applications count: {$appCount}";
        } catch (\Exception $e) {
            $dbTest .= "ERROR - " . $e->getMessage();
        }

        // Test email service
        $emailTest = 'Email: ';
        try {
            $emailService = new \App\Services\EmailService();
            $gmailService = $emailService->getGmailService();
            $emailTest .= "Gmail API configured: " . ($gmailService->isConfigured() ? 'YES' : 'NO');
        } catch (\Exception $e) {
            $emailTest .= "ERROR - " . $e->getMessage();
        }

        return response()->json([
            'message' => 'Database and Email Test',
            'database_test' => $dbTest,
            'email_test' => $emailTest,
            'env_check' => [
                'db_connection' => config('database.default'),
                'db_host' => config('database.connections.mysql.host'),
                'db_database' => config('database.connections.mysql.database'),
                'mail_mailer' => config('mail.default'),
                'mail_host' => config('mail.mailers.smtp.host'),
                'mail_username' => config('mail.mailers.smtp.username'),
                'google_client_id' => !empty(config('services.google.client_id')) ? 'SET' : 'NOT SET',
                'google_refresh_token' => !empty(config('services.google.refresh_token')) ? 'SET' : 'NOT SET'
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Test failed',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Test approval email for existing application
Route::get('/test-approval-email/{applicationId}', function ($applicationId) {
    try {
        $application = \App\Models\Application::find($applicationId);
        
        if (!$application) {
            return response()->json([
                'error' => 'Application not found',
                'application_id' => $applicationId
            ], 404);
        }

        // Generate test credentials
        $testPassword = 'testpass123';
        $testPwdId = 'PWD-TEST-' . $applicationId;

        // Send approval email using SMTP only
        \Illuminate\Support\Facades\Mail::send('emails.application-approved', [
            'firstName' => $application->firstName,
            'lastName' => $application->lastName,
            'email' => $application->email,
            'username' => $application->email,
            'password' => $testPassword,
            'pwdId' => $testPwdId,
            'loginUrl' => 'http://localhost:3000/login'
        ], function ($message) use ($application) {
            $message->to($application->email)
                   ->subject('PWD Application Approved - Account Created')
                   ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
        });

        return response()->json([
            'message' => 'Approval email sent successfully',
            'application' => [
                'id' => $application->applicationID,
                'name' => $application->firstName . ' ' . $application->lastName,
                'email' => $application->email
            ],
            'credentials' => [
                'email' => $application->email,
                'password' => $testPassword,
                'pwdId' => $testPwdId
            ],
            'from' => 'sarinonhoelivan29@gmail.com'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to send approval email',
            'message' => $e->getMessage(),
            'application_id' => $applicationId
        ], 500);
    }
});

// Test Gmail integration route (for testing purposes)
Route::get('/test-gmail-integration', function () {
    try {
        $emailService = new \App\Services\EmailService();
        $gmailService = $emailService->getGmailService();
        
        $status = [
            'gmail_configured' => $gmailService->isConfigured(),
            'client_id_set' => !empty(config('services.google.client_id')),
            'client_secret_set' => !empty(config('services.google.client_secret')),
            'refresh_token_set' => !empty(config('services.google.refresh_token')),
            'redirect_uri' => config('services.google.redirect_uri'),
            'frontend_url' => config('app.frontend_url', 'http://localhost:3000'),
            'admin_email' => 'sarinonhoelivan29@gmail.com',
            'mail_from_address' => config('mail.from.address'),
            'mail_from_name' => config('mail.from.name')
        ];
        
        return response()->json([
            'message' => 'Gmail integration test for admin email',
            'status' => $status,
            'admin_email' => 'sarinonhoelivan29@gmail.com',
            'instructions' => [
                '1. Set up Google Cloud Console project',
                '2. Enable Gmail API',
                '3. Create OAuth 2.0 credentials',
                '4. Add environment variables to .env',
                '5. Complete OAuth flow via /api/gmail/auth-url',
                '6. Test email sending via /api/gmail/test'
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Gmail integration test failed',
            'message' => $e->getMessage(),
            'admin_email' => 'sarinonhoelivan29@gmail.com'
        ], 500);
    }
});

// Test sending approval email to applicant
Route::get('/test-send-approval-email/{email}', function ($email) {
    try {
        $emailService = new \App\Services\EmailService();
        
        $testData = [
            'firstName' => 'Test',
            'lastName' => 'User',
            'email' => $email, // This will be the recipient
            'username' => $email,
            'password' => 'testpass123',
            'pwdId' => 'PWD-TEST-001',
            'loginUrl' => 'http://localhost:3000/login'
        ];
        
        $result = $emailService->sendApplicationApprovalEmail($testData);
        
        return response()->json([
            'message' => 'Test approval email sent',
            'success' => $result,
            'recipient' => $email,
            'from' => 'sarinonhoelivan29@gmail.com',
            'test_data' => $testData
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to send test approval email',
            'message' => $e->getMessage(),
            'recipient' => $email
        ], 500);
    }
});

// Test application submission (for debugging)
Route::post('/test-application-submission', function (Request $request) {
    try {
        // Log the incoming request
        \Illuminate\Support\Facades\Log::info('Test application submission', [
            'request_data' => $request->all(),
            'has_files' => $request->hasFile('medicalCertificate') || $request->hasFile('barangayCertificate')
        ]);

        // Use the validation service for comprehensive duplicate checking
        $validationService = new \App\Services\ApplicationValidationService();
        
        // First, check for duplicates before validation
        $duplicates = $validationService->checkForDuplicates($request->all());
        if (!empty($duplicates)) {
            \Illuminate\Support\Facades\Log::warning('Duplicate test application detected', [
                'duplicates' => $duplicates,
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'error' => 'Duplicate application detected',
                'message' => 'An application with similar information already exists.',
                'duplicates' => $duplicates,
                'suggestions' => [
                    'Check your existing application status',
                    'Contact support if you believe this is an error',
                    'Use a different email address if this is for a different person'
                ]
            ], 409); // 409 Conflict
        }

        // Get validation rules from service
        $rules = $validationService->getValidationRules();
        $messages = $validationService->getValidationMessages();
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            \Illuminate\Support\Facades\Log::error('Validation failed', [
                'errors' => $validator->errors()
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['status'] = 'Pending Barangay Approval';
        $data['submissionDate'] = now();

        // Handle file uploads
        $uploadPath = 'uploads/applications/' . date('Y/m/d');
        \Illuminate\Support\Facades\Storage::makeDirectory($uploadPath);


        if ($request->hasFile('medicalCertificate')) {
            $medicalFile = $request->file('medicalCertificate');
            $medicalName = 'medical_cert_' . time() . '.' . $medicalFile->getClientOriginalExtension();
            $medicalPath = $medicalFile->storeAs($uploadPath, $medicalName, 'public');
            $data['medicalCertificate'] = $medicalPath;
        }


        // Handle new document fields
        if ($request->hasFile('clinicalAbstract')) {
            $clinicalFile = $request->file('clinicalAbstract');
            $clinicalName = 'clinical_abstract_' . time() . '.' . $clinicalFile->getClientOriginalExtension();
            $clinicalPath = $clinicalFile->storeAs($uploadPath, $clinicalName, 'public');
            $data['clinicalAbstract'] = $clinicalPath;
        }

        if ($request->hasFile('voterCertificate')) {
            $voterFile = $request->file('voterCertificate');
            $voterName = 'voter_certificate_' . time() . '.' . $voterFile->getClientOriginalExtension();
            $voterPath = $voterFile->storeAs($uploadPath, $voterName, 'public');
            $data['voterCertificate'] = $voterPath;
        }

        // Handle ID picture (single file, same as other documents)
        if ($request->hasFile('idPictures') || $request->hasFile('idPicture_0')) {
            $idPictureFile = $request->hasFile('idPictures') 
                ? $request->file('idPictures') 
                : $request->file('idPicture_0');
            $idPictureName = 'id_picture_' . time() . '.' . $idPictureFile->getClientOriginalExtension();
                $idPicturePath = $idPictureFile->storeAs($uploadPath, $idPictureName, 'public');
            $data['idPictures'] = $idPicturePath;
        }

        if ($request->hasFile('birthCertificate')) {
            $birthFile = $request->file('birthCertificate');
            $birthName = 'birth_certificate_' . time() . '.' . $birthFile->getClientOriginalExtension();
            $birthPath = $birthFile->storeAs($uploadPath, $birthName, 'public');
            $data['birthCertificate'] = $birthPath;
        }

        if ($request->hasFile('wholeBodyPicture')) {
            $wholeBodyFile = $request->file('wholeBodyPicture');
            $wholeBodyName = 'whole_body_picture_' . time() . '.' . $wholeBodyFile->getClientOriginalExtension();
            $wholeBodyPath = $wholeBodyFile->storeAs($uploadPath, $wholeBodyName, 'public');
            $data['wholeBodyPicture'] = $wholeBodyPath;
        }

        if ($request->hasFile('affidavit')) {
            $affidavitFile = $request->file('affidavit');
            $affidavitName = 'affidavit_' . time() . '.' . $affidavitFile->getClientOriginalExtension();
            $affidavitPath = $affidavitFile->storeAs($uploadPath, $affidavitName, 'public');
            $data['affidavit'] = $affidavitPath;
        }

        if ($request->hasFile('barangayCertificate')) {
            $barangayCertFile = $request->file('barangayCertificate');
            $barangayCertName = 'barangay_certificate_' . time() . '.' . $barangayCertFile->getClientOriginalExtension();
            $barangayCertPath = $barangayCertFile->storeAs($uploadPath, $barangayCertName, 'public');
            $data['barangayCertificate'] = $barangayCertPath;
        }

        \Illuminate\Support\Facades\Log::info('Creating application with data', [
            'data' => $data
        ]);

        $application = \App\Models\Application::create($data);

        \Illuminate\Support\Facades\Log::info('Application created successfully', [
            'application_id' => $application->applicationID,
            'application' => $application->toArray()
        ]);

        return response()->json([
            'message' => 'Test application submitted successfully',
            'application' => $application,
            'debug_info' => [
                'data_sent' => $data,
                'application_id' => $application->applicationID
            ]
        ], 201);

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Test application submission failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'error' => 'Failed to submit test application',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Mobile connectivity test
Route::get('/mobile-test', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Mobile connection successful',
        'timestamp' => now()->toISOString(),
        'server_info' => [
            'ip' => request()->server('SERVER_ADDR'),
            'port' => request()->server('SERVER_PORT'),
            'host' => request()->getHost()
        ]
    ]);
});

// Test PWD members route
Route::get('/test-pwd', function () {
    try {
        $members = \App\Models\PWDMember::all();
        return response()->json(['count' => $members->count(), 'members' => $members]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Simple PWD members route
Route::get('/simple-pwd', function () {
    try {
        $members = DB::table('pwd_members')->get();
        return response()->json(['count' => $members->count(), 'members' => $members]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Debug PWD members and applications
Route::get('/debug-pwd-applications', function () {
    try {
        $members = \App\Models\PWDMember::all();
        $applications = \App\Models\Application::where('status', 'Approved')->get();
        
        $debug = [
            'pwd_members' => $members->map(function($member) {
                return [
                    'id' => $member->id,
                    'userID' => $member->userID,
                    'name' => $member->firstName . ' ' . $member->lastName
                ];
            }),
            'approved_applications' => $applications->map(function($app) {
                return [
                    'applicationID' => $app->applicationID,
                    'pwdID' => $app->pwdID,
                    'name' => $app->firstName . ' ' . $app->lastName,
                    'barangay' => $app->barangay
                ];
            })
        ];
        
        return response()->json($debug);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// PWD members route - Returns real database data with emergency contact
Route::get('/mock-pwd', function () {
    try {
        $members = \App\Models\PWDMember::all();
        
        // Transform the data to match the expected format
        $transformedMembers = $members->map(function ($member) {
            // Get emergency contact and barangay from the approved application
            // Match pwdID in applications to the PWD member's userID field
            $approvedApplication = \App\Models\Application::where('pwdID', $member->userID)
                ->where('status', 'Approved')
                ->latest()
                ->first();
            
            $emergencyContact = $approvedApplication ? $approvedApplication->emergencyContact : $member->emergencyContact;
            $barangay = $approvedApplication ? $approvedApplication->barangay : $member->barangay;
            $idPictures = $approvedApplication ? $approvedApplication->idPictures : null;
            
            // Get email from the User table
            $user = \App\Models\User::where('userID', $member->userID)->first();
            $email = $user ? $user->email : $member->email;
            
            // Generate PWD ID if not exists
            $pwdId = $member->pwd_id ?: 'PWD-' . str_pad($member->userID, 6, '0', STR_PAD_LEFT);
            
            return [
                'id' => $member->id,
                'userID' => $member->userID,
                'pwd_id' => $pwdId,
                'firstName' => $member->firstName,
                'lastName' => $member->lastName,
                'middleName' => $member->middleName,
                'suffix' => $member->suffix,
                'birthDate' => $member->birthDate,
                'gender' => $member->gender,
                'disabilityType' => $member->disabilityType,
                'address' => $member->address,
                'contactNumber' => $member->contactNumber,
                'emergencyContact' => $emergencyContact,
                'barangay' => $barangay,
                'idPictures' => $idPictures,
                'email' => $email,
                'qr_code_data' => $member->qr_code_data,
                'qr_code_generated_at' => $member->qr_code_generated_at
            ];
        });
        
        return response()->json([
            'count' => $members->count(),
            'members' => $transformedMembers
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to fetch PWD members',
            'message' => $e->getMessage(),
            'count' => 0,
            'members' => []
        ], 500);
    }
});

Route::apiResource('users', 'App\Http\Controllers\API\UserController');
Route::apiResource('complaints', 'App\Http\Controllers\API\ComplaintController');
Route::apiResource('reports', 'App\Http\Controllers\API\ReportController');

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});

// Public benefit routes (for frontend access)
Route::get('/benefits', [BenefitController::class, 'index']);
Route::get('/benefits/{id}', [BenefitController::class, 'show']);

// Test route for benefits
Route::get('/test-benefits', function () {
    return response()->json(['message' => 'Benefits route test']);
});

// Simple benefits routes
Route::get('/benefits-simple', function () {
    try {
        $benefits = \App\Models\Benefit::all();
        return response()->json($benefits);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::post('/benefits-simple', function (Request $request) {
    try {
        $benefit = \App\Models\Benefit::create($request->all());
        return response()->json($benefit, 201);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::put('/benefits-simple/{id}', function (Request $request, $id) {
    try {
        $benefit = \App\Models\Benefit::find($id);
        if (!$benefit) {
            return response()->json(['error' => 'Benefit not found'], 404);
        }
        $benefit->update($request->all());
        return response()->json($benefit);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::delete('/benefits-simple/{id}', function ($id) {
    try {
        $benefit = \App\Models\Benefit::find($id);
        if (!$benefit) {
            return response()->json(['error' => 'Benefit not found'], 404);
        }
        $benefit->delete();
        return response()->json(['message' => 'Benefit deleted successfully']);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Benefit claims routes
Route::get('/benefit-claims/{benefitId}', function ($benefitId) {
    try {
        $claims = \App\Models\BenefitClaim::where('benefitID', $benefitId)->get();
        return response()->json($claims);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::post('/benefit-claims', function (Request $request) {
    try {
        $claim = \App\Models\BenefitClaim::create($request->all());
        return response()->json($claim, 201);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Public announcements route - PWD members need to see announcements
Route::get('/announcements', [AnnouncementController::class, 'index']);
Route::get('/announcements/admin', [AnnouncementController::class, 'getAdminAnnouncements']);
Route::get('/announcements/audience/{audience}', [AnnouncementController::class, 'getByAudience']);
Route::get('/announcements/{id}', [AnnouncementController::class, 'show']);

// Public benefit claim routes for QR scanner
Route::get('/benefit-claims', [BenefitClaimController::class, 'index']);
Route::post('/benefit-claims', [BenefitClaimController::class, 'store']);
Route::patch('/benefit-claims/{id}/status', [BenefitClaimController::class, 'updateStatus']);
Route::get('/benefit-claims/{id}/treasury-letter', [BenefitClaimController::class, 'downloadTreasuryLetter']);
Route::post('/benefit-claims/{id}/upload-signed-letter', [BenefitClaimController::class, 'uploadSignedLetter']);
Route::get('/benefit-claims/{id}/signed-letter', [BenefitClaimController::class, 'viewSignedLetter']);

// QR scan claim benefits route
Route::post('/qr-scan/claim-benefits', [BenefitClaimController::class, 'claimBenefits']);

// PWD Member profile routes
Route::get('/pwd-member/profile', function (Request $request) {
    try {
        $user = $request->user();
        if (!$user || $user->role !== 'PWDMember') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $pwdMember = $user->pwdMember;
        if (!$pwdMember) {
            return response()->json(['error' => 'PWD Member not found'], 404);
        }
        
        // Get barangay from approved application
        $approvedApplication = $pwdMember->applications()
            ->where('status', 'Approved')
            ->latest()
            ->first();
        
        // Ensure QR code is generated if it doesn't exist
        if (empty($pwdMember->qr_code_data)) {
            try {
                \App\Services\QRCodeGenerator::generateAndStore($pwdMember);
                $pwdMember->refresh(); // Refresh to get the newly generated QR code data
            } catch (\Exception $qrError) {
                \Illuminate\Support\Facades\Log::error('QR code generation failed in profile endpoint', [
                    'error' => $qrError->getMessage(),
                    'pwd_member_id' => $pwdMember->userID
                ]);
            }
        }
        
        $profile = [
            'userID' => $user->userID,
            'firstName' => $pwdMember->firstName,
            'lastName' => $pwdMember->lastName,
            'email' => $user->email,
            'contactNumber' => $pwdMember->contactNumber,
            'address' => $pwdMember->address,
            'birthDate' => $pwdMember->birthDate,
            'gender' => $pwdMember->gender,
            'disabilityType' => $pwdMember->disabilityType,
            'pwd_id' => $pwdMember->pwd_id,
            'barangay' => $approvedApplication ? $approvedApplication->barangay : null,
            'created_at' => $pwdMember->created_at,
            'qr_code_data' => $pwdMember->qr_code_data,
            'qr_code_generated_at' => $pwdMember->qr_code_generated_at,
        ];
        
        return response()->json($profile);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::put('/pwd-member/profile', function (Request $request) {
    try {
        $user = $request->user();
        if (!$user || $user->role !== 'PWDMember') {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $pwdMember = $user->pwdMember;
        if (!$pwdMember) {
            return response()->json(['error' => 'PWD Member not found'], 404);
        }
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'firstName' => 'required|string|max:50',
            'lastName' => 'required|string|max:50',
            'email' => 'required|email',
            'contactNumber' => 'required|string|max:20',
            'address' => 'required|string',
            'birthDate' => 'required|date',
            'gender' => 'required|string',
            'disabilityType' => 'required|string',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 422);
        }
        
        // Update user email
        $user->update(['email' => $request->email]);
        
        // Update PWD member data
        $pwdMember->update([
            'firstName' => $request->firstName,
            'lastName' => $request->lastName,
            'contactNumber' => $request->contactNumber,
            'address' => $request->address,
            'birthDate' => $request->birthDate,
            'gender' => $request->gender,
            'disabilityType' => $request->disabilityType,
        ]);
        
        return response()->json(['message' => 'Profile updated successfully']);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});


// Public route to get active required documents for application form
Route::get('/documents/public', [App\Http\Controllers\API\DocumentManagementController::class, 'getPublicDocuments']);

// Public route to check for duplicate applications before submission
Route::post('/applications/check-duplicates', function (Request $request) {
    try {
        $validationService = new \App\Services\ApplicationValidationService();
        $duplicates = $validationService->checkForDuplicates($request->all());
        
        return response()->json([
            'has_duplicates' => !empty($duplicates),
            'duplicates' => $duplicates,
            'message' => empty($duplicates) ? 'No duplicates found. You can proceed with your application.' : 'Duplicate applications detected.'
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to check for duplicates',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Email verification routes
Route::post('/send-verification-code', function (Request $request) {
    try {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'email' => 'required|email',
            'purpose' => 'sometimes|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $purpose = $request->purpose ?? 'application_submission';

        // Create verification record
        $verification = \App\Models\EmailVerification::createVerification($email, $purpose);

        // Send email
        \Illuminate\Support\Facades\Mail::send('emails.verification-code', [
            'verificationCode' => $verification->verification_code
        ], function ($message) use ($email) {
            $message->to($email)
                   ->subject('PWD Application - Email Verification Code')
                   ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
        });

        return response()->json([
            'success' => true,
            'message' => 'Verification code sent successfully',
            'expires_in_minutes' => 10
        ]);

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Failed to send verification code', [
            'error' => $e->getMessage(),
            'email' => $request->email ?? 'unknown'
        ]);

        return response()->json([
            'error' => 'Failed to send verification code',
            'message' => 'Please try again later'
        ], 500);
    }
});

Route::post('/verify-code', function (Request $request) {
    try {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'purpose' => 'sometimes|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $code = $request->code;
        $purpose = $request->purpose ?? 'application_submission';

        // Check if code exists and is valid (but don't mark as used yet)
        $verification = \App\Models\EmailVerification::where('email', $email)
            ->where('verification_code', $code)
            ->where('purpose', $purpose)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->first();

        if ($verification) {
            return response()->json([
                'success' => true,
                'message' => 'Email verified successfully'
            ]);
        } else {
            return response()->json([
                'error' => 'Invalid verification code',
                'message' => 'The verification code is invalid, expired, or already used'
            ], 400);
        }

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Failed to verify code', [
            'error' => $e->getMessage(),
            'email' => $request->email ?? 'unknown'
        ]);

        return response()->json([
            'error' => 'Failed to verify code',
            'message' => 'Please try again later'
        ], 500);
    }
});

// Test route to check applications
Route::get('/test-applications', function () {
    $applications = \App\Models\Application::select('applicationID', 'firstName', 'lastName', 'email')->get();
    return response()->json([
        'applications' => $applications,
        'count' => $applications->count()
    ]);
});

// Document correction request route
Route::post('/applications/correction-request', function (Request $request) {
    try {
        // Log the incoming request for debugging
        \Illuminate\Support\Facades\Log::info('Correction request received', [
            'request_data' => $request->all(),
            'has_applicationId' => $request->has('applicationId'),
            'has_documentsToCorrect' => $request->has('documentsToCorrect'),
            'has_notes' => $request->has('notes'),
            'has_requestedBy' => $request->has('requestedBy'),
            'has_requestedByName' => $request->has('requestedByName'),
            'documentsToCorrect_count' => is_array($request->documentsToCorrect) ? count($request->documentsToCorrect) : 'not_array'
        ]);

        try {
            $request->validate([
                'applicationId' => 'required|string',
                'documentsToCorrect' => 'required|array|min:1',
                'notes' => 'nullable|string|max:1000',
                'requestedBy' => 'required|string',
                'requestedByName' => 'required|string'
            ]);
            \Illuminate\Support\Facades\Log::info('Validation passed for correction request');
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Illuminate\Support\Facades\Log::error('Validation failed for correction request', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'errors' => $e->errors()
            ], 422);
        }

        // Convert empty string notes to null
        $notes = $request->notes === '' ? null : $request->notes;

        // Find the application
        $application = \App\Models\Application::where('applicationID', $request->applicationId)->first();
        if (!$application) {
            \Illuminate\Support\Facades\Log::error('Application not found for correction request', [
                'applicationId' => $request->applicationId,
                'request_data' => $request->all(),
                'available_applications' => \App\Models\Application::pluck('applicationID')->toArray()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Application not found',
                'message' => 'The application you are trying to correct does not exist. Please refresh the page and try again.'
            ], 404);
        }

        \Illuminate\Support\Facades\Log::info('Application found for correction request', [
            'applicationId' => $request->applicationId,
            'application_name' => $application->firstName . ' ' . $application->lastName,
            'application_email' => $application->email
        ]);

        // Create correction request record
        try {
            $correctionRequest = \App\Models\DocumentCorrectionRequest::create([
                'application_id_string' => $request->applicationId,
                'documents_to_correct' => json_encode($request->documentsToCorrect),
                'notes' => $notes,
                'requested_by' => $request->requestedBy,
                'requested_by_name' => $request->requestedByName,
                'status' => 'pending',
                'correction_token' => \Illuminate\Support\Str::random(32),
                'expires_at' => now()->addDays(7) // Token expires in 7 days
            ]);

            \Illuminate\Support\Facades\Log::info('Correction request created successfully', [
                'correction_request_id' => $correctionRequest->id,
                'application_id' => $request->applicationId,
                'token' => $correctionRequest->correction_token
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to create correction request', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return response()->json([
                'success' => false,
                'error' => 'Failed to create correction request: ' . $e->getMessage()
            ], 500);
        }

        // Send email notification to applicant
        try {
            \App\Services\EmailService::sendCorrectionRequestEmail(
                $application->email,
                $application->firstName . ' ' . $application->lastName,
                $request->documentsToCorrect,
                $notes,
                $correctionRequest->correction_token
            );
        } catch (\Exception $emailError) {
            \Illuminate\Support\Facades\Log::error('Failed to send correction request email', [
                'application_id' => $request->applicationId,
                'error' => $emailError->getMessage()
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Correction request created successfully',
            'correction_request_id' => $correctionRequest->id
        ]);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Error creating correction request', [
            'error' => $e->getMessage(),
            'request_data' => $request->all()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => 'Failed to create correction request'
        ], 500);
    }
});

// Get correction request by token (public endpoint, no auth required)
Route::get('/applications/correction-request/{token}', function ($token) {
    try {
        \Illuminate\Support\Facades\Log::info('Fetching correction request', [
            'token' => $token,
            'token_length' => strlen($token)
        ]);
        
        // First, try to find pending and not expired correction request
        $correctionRequest = \App\Models\DocumentCorrectionRequest::where('correction_token', $token)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();

        // If not found, check if it exists but is completed or expired
        if (!$correctionRequest) {
            $existingRequest = \App\Models\DocumentCorrectionRequest::where('correction_token', $token)->first();
            
            \Illuminate\Support\Facades\Log::warning('Correction request not found or invalid', [
                'token' => $token,
                'exists' => $existingRequest ? true : false,
                'status_if_exists' => $existingRequest ? $existingRequest->status : null,
                'expires_at_if_exists' => $existingRequest ? $existingRequest->expires_at : null,
                'is_expired' => $existingRequest && $existingRequest->expires_at ? $existingRequest->expires_at->isPast() : null
            ]);
            
            if ($existingRequest) {
                if ($existingRequest->status === 'completed') {
            return response()->json([
                'success' => false,
                        'message' => 'This correction request has already been completed. If you need to make additional corrections, please contact support.',
                        'status' => 'completed'
                    ], 404);
                } elseif ($existingRequest->expires_at && $existingRequest->expires_at->isPast()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'This correction request has expired. Please request a new correction link from the administrator.',
                        'status' => 'expired'
                    ], 404);
                }
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired correction request. Please check your link or contact support.'
            ], 404);
        }

        // Find the application
        $application = \App\Models\Application::where('applicationID', $correctionRequest->application_id_string)->first();
        if (!$application) {
            \Illuminate\Support\Facades\Log::error('Application not found for correction request', [
                'token' => $token,
                'application_id_string' => $correctionRequest->application_id_string
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Application not found'
            ], 404);
        }

        \Illuminate\Support\Facades\Log::info('Correction request found successfully', [
            'token' => $token,
            'correction_request_id' => $correctionRequest->id,
            'application_id' => $application->applicationID
        ]);

        return response()->json([
            'success' => true,
            'correction_request' => $correctionRequest,
            'application' => $application
        ]);

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Error fetching correction request', [
            'token' => $token,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch correction request: ' . $e->getMessage()
        ], 500);
    }
});

// Handle OPTIONS preflight for submit-corrections (important for mobile browsers)
Route::options('/applications/submit-corrections', function () {
    return response()->json([], 200)->withHeaders([
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'POST, OPTIONS',
        'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age' => '86400',
    ]);
});

// Submit document corrections
Route::post('/applications/submit-corrections', function (Request $request) {
    try {
        \Illuminate\Support\Facades\Log::info('Document correction submission received', [
            'has_correction_token' => $request->has('correction_token'),
            'correction_token' => $request->input('correction_token'),
            'has_files' => $request->hasFile('medicalCertificate') || $request->hasFile('idPictures') || $request->hasFile('barangayCertificate'),
            'user_agent' => $request->header('User-Agent'),
            'origin' => $request->header('Origin'),
            'content_type' => $request->header('Content-Type'),
            'content_length' => $request->header('Content-Length'),
            'request_method' => $request->method()
        ]);
        
        $request->validate([
            'correction_token' => 'required|string|size:32',
            'medicalCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:15360',
            'clinicalAbstract' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:15360',
            'voterCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:15360',
            'idPictures' => 'nullable|file|mimes:jpeg,png,jpg|max:15360',
            'birthCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:15360',
            'wholeBodyPicture' => 'nullable|file|mimes:jpeg,png,jpg|max:15360',
            'affidavit' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:15360',
            'barangayCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:15360'
        ]);

        // Find the correction request
        $correctionRequest = \App\Models\DocumentCorrectionRequest::where('correction_token', $request->correction_token)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();

        if (!$correctionRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid, expired, or completed correction request'
            ], 404);
        }

        // Find the application
        $application = \App\Models\Application::where('applicationID', $correctionRequest->application_id_string)->first();
        if (!$application) {
            return response()->json([
                'success' => false,
                'message' => 'Application not found'
            ], 404);
        }

        // Process file uploads
        $uploadedFiles = [];
        $documentsToCorrect = json_decode($correctionRequest->documents_to_correct, true);
        
        // Use the same storage path structure as original application
        $uploadPath = 'uploads/applications/' . date('Y/m/d');
        \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory($uploadPath);

        // Get all uploaded files once for efficiency
        $allFiles = $request->allFiles();
        
        \Illuminate\Support\Facades\Log::info('Processing document corrections', [
            'documents_to_correct' => $documentsToCorrect,
            'all_uploaded_files' => array_keys($allFiles)
        ]);

        foreach ($documentsToCorrect as $docType) {
            // Handle all documents the same way (including idPictures)
            // Support both direct file name and array notation for backward compatibility
            $file = null;
            
            // Try direct file name first (standard way)
            if (isset($allFiles[$docType]) || $request->hasFile($docType)) {
                $file = isset($allFiles[$docType]) ? $allFiles[$docType] : $request->file($docType);
            }
            // For idPictures, also check array notation (idPictures[0]) for backward compatibility
            elseif ($docType === 'idPictures') {
                if (isset($allFiles['idPictures']) && is_array($allFiles['idPictures']) && !empty($allFiles['idPictures'])) {
                    $file = $allFiles['idPictures'][0];
                } elseif (isset($allFiles['idPictures.0'])) {
                    $file = $allFiles['idPictures.0'];
                } elseif ($request->hasFile('idPictures.0')) {
                    $file = $request->file('idPictures.0');
                }
            }
            
            if ($file && $file->isValid()) {
                // Delete old file if it exists
                // Handle both string (new format) and array (old format) for backward compatibility
                $oldFilePath = $application->$docType;
                if ($oldFilePath) {
                    // If it's stored as array (old format), get first element
                    if (is_array($oldFilePath)) {
                        $oldFilePath = !empty($oldFilePath) ? $oldFilePath[0] : null;
                    } elseif (is_string($oldFilePath) && (strpos($oldFilePath, '[') === 0 || strpos($oldFilePath, '"') === 0)) {
                        // Try to decode if it's a JSON string
                        $decoded = json_decode($oldFilePath, true);
                        if (is_array($decoded) && !empty($decoded)) {
                            $oldFilePath = $decoded[0];
                        }
                    }
                    
                    if ($oldFilePath) {
                        \Illuminate\Support\Facades\Storage::disk('public')->delete($oldFilePath);
                    }
                }
                
                // Generate filename based on document type
                $fileNamePrefix = match($docType) {
                    'medicalCertificate' => 'medical_cert',
                    'clinicalAbstract' => 'clinical_abstract',
                    'voterCertificate' => 'voter_certificate',
                    'birthCertificate' => 'birth_certificate',
                    'wholeBodyPicture' => 'whole_body_picture',
                    'affidavit' => 'affidavit',
                    'barangayCertificate' => 'barangay_certificate',
                    'idPictures' => 'id_picture',
                    default => $docType
                };
                
                // Use microtime for more unique filenames to avoid collisions
                $uniqueId = str_replace('.', '', microtime(true));
                $fileName = $fileNamePrefix . '_' . $uniqueId . '.' . $file->getClientOriginalExtension();
                $filePath = $file->storeAs($uploadPath, $fileName, 'public');
                $uploadedFiles[$docType] = $filePath;
                
                \Illuminate\Support\Facades\Log::info('Processed file for correction', [
                    'doc_type' => $docType,
                    'file_path' => $filePath,
                    'old_file_path' => $oldFilePath,
                    'original_name' => $file->getClientOriginalName(),
                    'file_deleted' => $oldFilePath ? \Illuminate\Support\Facades\Storage::disk('public')->exists($oldFilePath) ? 'not_deleted' : 'deleted' : 'no_old_file'
                ]);
            } else {
                \Illuminate\Support\Facades\Log::warning('File not valid or not found', [
                    'doc_type' => $docType,
                    'has_file_in_allFiles' => isset($allFiles[$docType]),
                    'has_file_in_request' => $request->hasFile($docType)
                ]);
            }
        }

        // Log what we're about to update
        \Illuminate\Support\Facades\Log::info('About to update application with files', [
            'application_id' => $application->applicationID,
            'uploaded_files' => $uploadedFiles,
            'uploaded_files_keys' => array_keys($uploadedFiles),
            'current_medicalCertificate' => $application->medicalCertificate,
            'current_idPictures' => $application->idPictures,
            'current_barangayCertificate' => $application->barangayCertificate
        ]);

        // Update application with new files
        $updateResult = $application->update($uploadedFiles);
        
        // Refresh the model to get the latest data
        $application->refresh();

        // Log what was actually saved
        \Illuminate\Support\Facades\Log::info('Application updated with files', [
            'application_id' => $application->applicationID,
            'update_result' => $updateResult,
            'updated_medicalCertificate' => $application->medicalCertificate,
            'updated_idPictures' => $application->idPictures,
            'updated_barangayCertificate' => $application->barangayCertificate,
            'was_changed' => $application->wasChanged()
        ]);

        // Mark correction request as completed
        $correctionRequest->markAsCompleted();

        // Log the correction submission
        \Illuminate\Support\Facades\Log::info('Document corrections submitted', [
            'application_id' => $application->applicationID,
            'correction_request_id' => $correctionRequest->id,
            'documents_corrected' => $documentsToCorrect,
            'uploaded_files' => array_keys($uploadedFiles)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document corrections submitted successfully'
        ]);

    } catch (\Illuminate\Validation\ValidationException $e) {
        return response()->json([
            'success' => false,
            'errors' => $e->errors()
        ], 422);
    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Error submitting document corrections', [
            'token' => $request->correction_token,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to submit corrections'
        ], 500);
    }
});

// Public application submission route
Route::post('/applications', function (Request $request) {
    try {
        // Log the incoming request for debugging
        \Illuminate\Support\Facades\Log::info('Application submission attempt', [
            'request_data' => $request->all(),
            'has_files' => $request->hasFile('medicalCertificate') || $request->hasFile('barangayCertificate')
        ]);

        // Check email verification first
        $email = $request->email;
        $verificationCode = $request->verification_code;
        
        if (!$email || !$verificationCode) {
            return response()->json([
                'error' => 'Email verification required',
                'message' => 'Please verify your email address before submitting the application'
            ], 400);
        }

        // Verify the email code
        $isVerified = \App\Models\EmailVerification::verifyCode($email, $verificationCode, 'application_submission');
        
        if (!$isVerified) {
            return response()->json([
                'error' => 'Email verification failed',
                'message' => 'Invalid or expired verification code. Please request a new code.'
            ], 400);
        }

        // Use the validation service for comprehensive duplicate checking
        $validationService = new \App\Services\ApplicationValidationService();
        
        // First, check for duplicates before validation
        $duplicates = $validationService->checkForDuplicates($request->all());
        if (!empty($duplicates)) {
            \Illuminate\Support\Facades\Log::warning('Duplicate application detected', [
                'duplicates' => $duplicates,
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'error' => 'Duplicate application detected',
                'message' => 'An application with similar information already exists.',
                'duplicates' => $duplicates,
                'suggestions' => [
                    'Check your existing application status',
                    'Contact support if you believe this is an error',
                    'Use a different email address if this is for a different person'
                ]
            ], 409); // 409 Conflict
        }

        // Get validation rules from service
        $rules = $validationService->getValidationRules();
        $messages = $validationService->getValidationMessages();
        
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            \Illuminate\Support\Facades\Log::error('Application validation failed', [
                'errors' => $validator->errors()
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['status'] = 'Pending Barangay Approval';
        $data['submissionDate'] = now();
        
        // Normalize middleName: if empty or whitespace, set to "N/A"
        if (empty($data['middleName']) || trim($data['middleName']) === '') {
            $data['middleName'] = 'N/A';
        } else {
            $data['middleName'] = trim($data['middleName']);
        }

        // Handle file uploads
        $uploadPath = 'uploads/applications/' . date('Y/m/d');
        \Illuminate\Support\Facades\Storage::makeDirectory($uploadPath);


        if ($request->hasFile('medicalCertificate')) {
            $medicalFile = $request->file('medicalCertificate');
            $medicalName = 'medical_cert_' . time() . '.' . $medicalFile->getClientOriginalExtension();
            $medicalPath = $medicalFile->storeAs($uploadPath, $medicalName, 'public');
            $data['medicalCertificate'] = $medicalPath;
        }


        // Handle new document fields
        if ($request->hasFile('clinicalAbstract')) {
            $clinicalFile = $request->file('clinicalAbstract');
            $clinicalName = 'clinical_abstract_' . time() . '.' . $clinicalFile->getClientOriginalExtension();
            $clinicalPath = $clinicalFile->storeAs($uploadPath, $clinicalName, 'public');
            $data['clinicalAbstract'] = $clinicalPath;
        }

        if ($request->hasFile('voterCertificate')) {
            $voterFile = $request->file('voterCertificate');
            $voterName = 'voter_certificate_' . time() . '.' . $voterFile->getClientOriginalExtension();
            $voterPath = $voterFile->storeAs($uploadPath, $voterName, 'public');
            $data['voterCertificate'] = $voterPath;
        }

        // Handle ID picture (single file, same as other documents)
        if ($request->hasFile('idPictures') || $request->hasFile('idPicture_0')) {
            $idPictureFile = $request->hasFile('idPictures') 
                ? $request->file('idPictures') 
                : $request->file('idPicture_0');
            $idPictureName = 'id_picture_' . time() . '.' . $idPictureFile->getClientOriginalExtension();
                $idPicturePath = $idPictureFile->storeAs($uploadPath, $idPictureName, 'public');
            $data['idPictures'] = $idPicturePath;
        }

        if ($request->hasFile('birthCertificate')) {
            $birthFile = $request->file('birthCertificate');
            $birthName = 'birth_certificate_' . time() . '.' . $birthFile->getClientOriginalExtension();
            $birthPath = $birthFile->storeAs($uploadPath, $birthName, 'public');
            $data['birthCertificate'] = $birthPath;
        }

        if ($request->hasFile('wholeBodyPicture')) {
            $wholeBodyFile = $request->file('wholeBodyPicture');
            $wholeBodyName = 'whole_body_picture_' . time() . '.' . $wholeBodyFile->getClientOriginalExtension();
            $wholeBodyPath = $wholeBodyFile->storeAs($uploadPath, $wholeBodyName, 'public');
            $data['wholeBodyPicture'] = $wholeBodyPath;
        }

        if ($request->hasFile('affidavit')) {
            $affidavitFile = $request->file('affidavit');
            $affidavitName = 'affidavit_' . time() . '.' . $affidavitFile->getClientOriginalExtension();
            $affidavitPath = $affidavitFile->storeAs($uploadPath, $affidavitName, 'public');
            $data['affidavit'] = $affidavitPath;
        }

        if ($request->hasFile('barangayCertificate')) {
            $barangayCertFile = $request->file('barangayCertificate');
            $barangayCertName = 'barangay_certificate_' . time() . '.' . $barangayCertFile->getClientOriginalExtension();
            $barangayCertPath = $barangayCertFile->storeAs($uploadPath, $barangayCertName, 'public');
            $data['barangayCertificate'] = $barangayCertPath;
        }

        \Illuminate\Support\Facades\Log::info('Creating application with data', [
            'data' => $data
        ]);

        $application = \App\Models\Application::create($data);

        \Illuminate\Support\Facades\Log::info('Application created successfully', [
            'application_id' => $application->applicationID,
            'application' => $application->toArray()
        ]);

        // Send submission confirmation email with reference number
        try {
            $emailService = new \App\Services\EmailService();
            $emailService->sendApplicationSubmissionEmail([
                'email' => $application->email,
                'firstName' => $application->firstName,
                'lastName' => $application->lastName,
                'referenceNumber' => $application->referenceNumber ?? 'N/A',
                'submissionDate' => $application->submissionDate ?? now()->toDateString()
            ]);
        } catch (\Exception $emailException) {
            \Illuminate\Support\Facades\Log::error('Failed to send submission email', [
                'application_id' => $application->applicationID,
                'error' => $emailException->getMessage()
            ]);
            // Don't fail the submission if email fails
        }

        return response()->json([
            'message' => 'Application submitted successfully',
            'application' => $application
        ], 201);

    } catch (\Exception $e) {
        \Illuminate\Support\Facades\Log::error('Application submission failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'error' => 'Failed to submit application',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Test route for file preview (no auth required for testing)
Route::get('test-file/{messageId}', function($messageId) {
    try {
        $message = App\Models\SupportTicketMessage::find($messageId);
        if (!$message || !$message->hasAttachment()) {
            return response()->json(['error' => 'No attachment found'], 404);
        }
        
        $filePath = storage_path('app/public/' . $message->attachment_path);
        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found: ' . $filePath], 404);
        }
        
        $fileContent = file_get_contents($filePath);
        $mimeType = $message->attachment_type ?: mime_content_type($filePath);
        
        return response($fileContent)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="' . $message->attachment_name . '"');
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

// Test route for document file serving (no auth required for testing)
Route::get('test-document-file/{id}', function($id) {
    try {
        $memberDocument = \App\Models\MemberDocument::find($id);
        
        if (!$memberDocument) {
            return response()->json(['error' => 'Document not found'], 404);
        }
        
        $filePath = storage_path('app/public/' . $memberDocument->file_path);
        
        if (!file_exists($filePath)) {
            return response()->json([
                'error' => 'File not found',
                'file_path' => $filePath,
                'member_document' => $memberDocument
            ], 404);
        }

        // Get file info
        $fileSize = filesize($filePath);
        $mimeType = mime_content_type($filePath);
        
        // Set appropriate headers
        $headers = [
            'Content-Type' => $mimeType,
            'Content-Length' => $fileSize,
            'Content-Disposition' => 'inline; filename="' . $memberDocument->file_name . '"',
            'Cache-Control' => 'private, max-age=3600',
            'Pragma' => 'private'
        ];

        // Return file response with proper headers
        return response()->file($filePath, $headers);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error serving file: ' . $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Test storage configuration
Route::get('test-storage-config', function() {
    try {
        $storagePath = storage_path('app/public');
        $publicPath = public_path('storage');
        
        $info = [
            'storage_path' => $storagePath,
            'public_path' => $publicPath,
            'storage_exists' => is_dir($storagePath),
            'public_storage_exists' => is_dir($publicPath),
            'storage_link_exists' => is_link($publicPath),
            'storage_writable' => is_writable($storagePath),
            'public_writable' => is_writable($publicPath),
        ];
        
        // List some files in storage
        if (is_dir($storagePath)) {
            $files = [];
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($storagePath, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $files[] = [
                        'path' => str_replace($storagePath, '', $file->getPathname()),
                        'size' => $file->getSize(),
                        'modified' => date('Y-m-d H:i:s', $file->getMTime())
                    ];
                }
                
                if (count($files) >= 10) break; // Limit to 10 files
            }
            
            $info['sample_files'] = $files;
        }
        
        return response()->json($info);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error checking storage: ' . $e->getMessage()
        ], 500);
    }
});

// Document file serving route (public access for viewing)
Route::get('documents/file/{id}', [DocumentManagementController::class, 'getDocumentFile']);

// Support ticket file serving route (public access for viewing)
Route::get('support-tickets/messages/{messageId}/download', [SupportTicketController::class, 'downloadAttachment']);
Route::get('support-tickets/messages/{messageId}/image', [SupportTicketController::class, 'serveImage']);

// Application file serving route (for admin document preview)
Route::get('application-file/{applicationId}/{fileType}', function($applicationId, $fileType) {
    try {
        // Check for token-based authentication
        $user = Auth::user();
        if (!$user && request()->has('token')) {
            $token = request()->get('token');
            $user = \App\Models\User::where('remember_token', $token)->first();
            if ($user) {
                Auth::setUser($user);
            }
        }
        
        $application = \App\Models\Application::findOrFail($applicationId);
        
        // Check permissions if user is authenticated
        if ($user) {
            // Admin users can access any file
            if (!in_array($user->role, ['Admin', 'SuperAdmin'])) {
                // PWD members can only access their own application files
                if ($user->role === 'PWDMember' && $application->email !== $user->email) {
                    return response()->json([
                        'error' => 'Unauthorized access to application file'
                    ], 403);
                }
            }
        }
        
        // Map file types to database fields
        $fileFieldMap = [
            'medicalCertificate' => 'medicalCertificate',
            'barangayCertificate' => 'barangayCertificate',
            'clinicalAbstract' => 'clinicalAbstract',
            'voterCertificate' => 'voterCertificate',
            'birthCertificate' => 'birthCertificate',
            'wholeBodyPicture' => 'wholeBodyPicture',
            'affidavit' => 'affidavit',
            'idPictures' => 'idPictures' // Support idPictures (array)
        ];
        
        if (!isset($fileFieldMap[$fileType])) {
            return response()->json([
                'error' => 'Invalid file type',
                'valid_types' => array_keys($fileFieldMap)
            ], 400);
        }
        
        $fileField = $fileFieldMap[$fileType];
        $filePath = $application->$fileField;
        
        if (!$filePath) {
            return response()->json([
                'error' => 'File not found for this application',
                'application_id' => $applicationId,
                'file_type' => $fileType
            ], 404);
        }
        
        // Handle idPictures - now stored as single file (standardized), but support old array format for backward compatibility
        if ($fileType === 'idPictures') {
            // Check if it's stored as array (old format) or string (new format)
            if (is_array($filePath) && count($filePath) > 0) {
                // Old format: already an array - get first file (or index if provided)
                $index = request()->get('index', 0);
                $index = (int)$index;
                if ($index < 0 || $index >= count($filePath)) {
                    $index = 0;
                }
                $filePath = $filePath[$index];
            } elseif (is_string($filePath)) {
                // Check if it's a JSON string (old format) or regular path (new format)
                // JSON arrays start with '[' and JSON strings start with '"'
                if ((strpos(trim($filePath), '[') === 0) || (strpos(trim($filePath), '"') === 0 && strpos(trim($filePath), '[') !== false)) {
                    // Try to decode if it's a JSON string (old format)
                    $decoded = json_decode($filePath, true);
                    if (is_array($decoded) && count($decoded) > 0) {
                        // Old format: array - get first file (or index if provided)
                        $index = request()->get('index', 0);
                        $index = (int)$index;
                        if ($index < 0 || $index >= count($decoded)) {
                    $index = 0; // Default to first image if index is invalid
                }
                        $filePath = $decoded[$index];
                    }
                    // If decoding fails or returns null, treat as regular string path (new format)
                }
                // If it's a regular string path (new format), use it as-is
            }
        }
        
        $fullFilePath = storage_path('app/public/' . $filePath);
        
        // Log for debugging
        \Illuminate\Support\Facades\Log::info('Serving application file', [
            'application_id' => $applicationId,
            'file_type' => $fileType,
            'file_path' => $filePath,
            'full_file_path' => $fullFilePath,
            'file_exists' => file_exists($fullFilePath)
        ]);
        
        if (!file_exists($fullFilePath)) {
            \Illuminate\Support\Facades\Log::error('Application file not found', [
                'application_id' => $applicationId,
                'file_type' => $fileType,
                'file_path' => $filePath,
                'full_file_path' => $fullFilePath,
                'storage_path' => storage_path('app/public'),
                'directory_exists' => is_dir(storage_path('app/public'))
            ]);
            
            return response()->json([
                'error' => 'File not found on disk',
                'file_path' => $filePath,
                'full_file_path' => $fullFilePath,
                'application_id' => $applicationId,
                'file_type' => $fileType
            ], 404);
        }

        // Get file info
        $fileSize = filesize($fullFilePath);
        $mimeType = mime_content_type($fullFilePath);
        
        // Generate filename
        $fileName = $fileType . '_' . $application->firstName . '_' . $application->lastName . '.' . pathinfo($fullFilePath, PATHINFO_EXTENSION);
        
        // Set appropriate headers - reduce cache time for application files that might be updated
        $headers = [
            'Content-Type' => $mimeType,
            'Content-Length' => $fileSize,
            'Content-Disposition' => 'inline; filename="' . $fileName . '"',
            'Cache-Control' => 'private, max-age=60, must-revalidate', // Reduced to 60 seconds and must-revalidate
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ];

        // Return file response with proper headers
        return response()->file($fullFilePath, $headers);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error serving application file: ' . $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Authorization letter file serving route
Route::get('authorization-letter/{claimId}', function($claimId) {
    try {
        // Check for token-based authentication
        $user = Auth::user();
        if (!$user && request()->has('token')) {
            $token = request()->get('token');
            $user = \App\Models\User::where('remember_token', $token)->first();
            if ($user) {
                Auth::setUser($user);
            }
        }
        
        $claim = \App\Models\BenefitClaim::findOrFail($claimId);
        
        // Check permissions if user is authenticated
        if ($user) {
            // Admin, SuperAdmin, and Staff2 can access any authorization letter
            if (!in_array($user->role, ['Admin', 'SuperAdmin', 'Staff2'])) {
                // PWD members can only access their own authorization letters
                if ($user->role === 'PWDMember' && $claim->pwdID !== $user->userID) {
                    return response()->json([
                        'error' => 'Unauthorized access to authorization letter'
                    ], 403);
                }
            }
        }
        
        if (!$claim->authorizationLetter) {
            return response()->json([
                'error' => 'Authorization letter not found for this claim'
            ], 404);
        }
        
        $filePath = $claim->authorizationLetter;
        $fullFilePath = storage_path('app/public/' . $filePath);
        
        if (!file_exists($fullFilePath)) {
            \Illuminate\Support\Facades\Log::error('Authorization letter file not found', [
                'claim_id' => $claimId,
                'file_path' => $filePath,
                'full_file_path' => $fullFilePath,
                'storage_path' => storage_path('app/public')
            ]);
            
            return response()->json([
                'error' => 'File not found on disk',
                'file_path' => $filePath,
                'full_file_path' => $fullFilePath
            ], 404);
        }
        
        // Get file info
        $fileSize = filesize($fullFilePath);
        $mimeType = mime_content_type($fullFilePath);
        
        // Generate filename
        $fileName = 'authorization_letter_' . $claimId . '.' . pathinfo($fullFilePath, PATHINFO_EXTENSION);
        
        // Set appropriate headers
        $headers = [
            'Content-Type' => $mimeType,
            'Content-Length' => $fileSize,
            'Content-Disposition' => 'inline; filename="' . $fileName . '"',
            'Cache-Control' => 'private, max-age=3600',
            'Pragma' => 'private'
        ];

        // Return file response with proper headers
        return response()->file($fullFilePath, $headers);
        
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Error serving authorization letter: ' . $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // User management routes
    Route::apiResource('users', UserController::class);
    
    // PWD Member routes
    Route::apiResource('pwd-members', PWDMemberController::class);
    Route::get('pwd-members/{id}/applications', [PWDMemberController::class, 'getApplications']);
    Route::get('pwd-members/{id}/complaints', [PWDMemberController::class, 'getComplaints']);
    Route::get('pwd-members/{id}/benefit-claims', [PWDMemberController::class, 'getBenefitClaims']);
    Route::post('pwd-members/{id}/claim-card', [PWDMemberController::class, 'claimCard']);
    Route::post('pwd-members/{id}/renew-card', [PWDMemberController::class, 'renewCard']);
    
    // PWD Member change password route
    Route::put('/pwd-member/change-password', function (Request $request) {
        try {
            $user = $request->user();
            if (!$user || $user->role !== 'PWDMember') {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
            
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'currentPassword' => 'required',
                'newPassword' => 'required|min:6',
            ]);
            
            if ($validator->fails()) {
                return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 422);
            }
            
            // Verify current password
            if (!\Illuminate\Support\Facades\Hash::check($request->currentPassword, $user->password)) {
                return response()->json(['error' => 'Current password is incorrect'], 400);
            }
            
            // Update password
            $user->update([
                'password' => \Illuminate\Support\Facades\Hash::make($request->newPassword)
            ]);
            
            return response()->json(['message' => 'Password changed successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });
    
    // Application routes are handled in RouteServiceProvider
    
    // Complaint routes
    Route::apiResource('complaints', ComplaintController::class);
    Route::patch('complaints/{id}/status', [ComplaintController::class, 'updateStatus']);
    
    // Benefit routes
    Route::apiResource('benefits', BenefitController::class);
    
    // Benefit Claim routes
    Route::apiResource('benefit-claims', BenefitClaimController::class);
    Route::patch('benefit-claims/{id}/status', [BenefitClaimController::class, 'updateStatus']);
    Route::get('benefit-claims/{id}/treasury-letter', [BenefitClaimController::class, 'downloadTreasuryLetter']);
    Route::post('benefit-claims/{id}/upload-signed-letter', [BenefitClaimController::class, 'uploadSignedLetter']);
    Route::get('benefit-claims/{id}/signed-letter', [BenefitClaimController::class, 'viewSignedLetter']);
    
    // Announcement routes (protected - for admin operations)
    Route::post('/announcements', [AnnouncementController::class, 'store']);
    Route::put('/announcements/{id}', [AnnouncementController::class, 'update']);
    Route::patch('/announcements/{id}', [AnnouncementController::class, 'update']);
    Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);
    Route::get('announcements/audience/{audience}', [AnnouncementController::class, 'getByAudience']);
    
    // Report routes
    Route::apiResource('reports', ReportController::class);
    Route::post('reports/generate/{type}', [ReportController::class, 'generateReport']);
    
    // Additional report endpoints
    Route::get('reports/barangay-stats/{barangay}', [ReportController::class, 'getBarangayStats']);
    Route::get('reports/pwd-masterlist/{barangay}', [ReportController::class, 'getPWDMasterlist']);
    Route::get('reports/application-status/{barangay}', [ReportController::class, 'getApplicationStatusReport']);
    Route::get('reports/disability-distribution/{barangay}', [ReportController::class, 'getDisabilityDistribution']);
    Route::get('reports/age-group-analysis/{barangay}', [ReportController::class, 'getAgeGroupAnalysis']);
    Route::get('reports/benefit-distribution/{barangay}', [ReportController::class, 'getBenefitDistribution']);
    Route::get('reports/monthly-activity/{barangay}', [ReportController::class, 'getMonthlyActivitySummary']);
    Route::get('reports/city-wide-stats', [ReportController::class, 'getCityWideStats']);
    Route::get('reports/barangay-performance', [ReportController::class, 'getBarangayPerformance']);
    Route::get('reports/all-barangays', [ReportController::class, 'getAllBarangays']);
    Route::get('reports/{id}/download', [ReportController::class, 'downloadReport']);
    
    // Audit Log routes (SuperAdmin only)
    Route::middleware('superadmin')->group(function () {
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/user/{userId}', [AuditLogController::class, 'getByUser']);
        Route::get('audit-logs/action/{action}', [AuditLogController::class, 'getByAction']);
        
        // Security Monitoring routes (SuperAdmin only)
        Route::prefix('security-monitoring')->group(function () {
            Route::get('/', [SecurityMonitoringController::class, 'index']);
            Route::get('/statistics', [SecurityMonitoringController::class, 'getStatistics']);
            Route::get('/{eventId}', [SecurityMonitoringController::class, 'show']);
            Route::put('/{eventId}/status', [SecurityMonitoringController::class, 'updateStatus']);
            Route::post('/bulk-update-status', [SecurityMonitoringController::class, 'bulkUpdateStatus']);
            Route::delete('/delete-events', [SecurityMonitoringController::class, 'deleteEvents']);
        });
    });
    
    // Support Ticket routes
    Route::get('support-tickets/archived', [SupportTicketController::class, 'archived']);
    Route::apiResource('support-tickets', SupportTicketController::class);
    Route::post('support-tickets/{id}/messages', [SupportTicketController::class, 'addMessage']);
    Route::get('support-tickets/messages/{messageId}/force-download', [SupportTicketController::class, 'forceDownloadAttachment']);
    
    // Dashboard data routes
    Route::get('dashboard/test', [DashboardController::class, 'test']);
    Route::get('dashboard/recent-activities', [DashboardController::class, 'getRecentActivities']);
    Route::get('dashboard/barangay-contacts', [DashboardController::class, 'getBarangayContacts']);
    
    // Gmail API routes for admin email (sarinonhoelivan29@gmail.com)
    Route::get('gmail/auth-url', [GmailController::class, 'getAuthUrl']);
    Route::post('gmail/callback', [GmailController::class, 'handleCallback']);
    Route::get('gmail/test', [GmailController::class, 'testConnection']);
    Route::get('gmail/status', [GmailController::class, 'getStatus']);
    
    // Analytics routes with automated suggestions
    Route::prefix('analytics')->group(function () {
        Route::get('suggestions', [AnalyticsController::class, 'getAutomatedSuggestions']);
        Route::get('suggestions/category/{category}', [AnalyticsController::class, 'getCategorySuggestions']);
        Route::get('suggestions/summary', [AnalyticsController::class, 'getSuggestionSummary']);
        Route::get('suggestions/high-priority', [AnalyticsController::class, 'getHighPrioritySuggestions']);
        Route::get('transaction-analysis', [AnalyticsController::class, 'getTransactionAnalysis']);
    });

    // Document Management routes
    Route::prefix('documents')->group(function () {
        // Admin routes
        Route::get('/', [DocumentManagementController::class, 'index']);
        Route::post('/', [DocumentManagementController::class, 'store']);
        Route::put('/{id}', [DocumentManagementController::class, 'update']);
        Route::delete('/{id}', [DocumentManagementController::class, 'destroy']);
        Route::get('/pending-reviews', [DocumentManagementController::class, 'getPendingReviews']);
        Route::get('/all-members', [DocumentManagementController::class, 'getAllMemberDocuments']);
        Route::post('/{id}/review', [DocumentManagementController::class, 'reviewDocument']);
        
        // Member routes
        Route::get('/my-documents', [DocumentManagementController::class, 'getMemberDocuments']);
        Route::post('/upload', [DocumentManagementController::class, 'uploadDocument']);
        
        // Notification routes
        Route::get('/notifications', [DocumentManagementController::class, 'getNotifications']);
        Route::post('/notifications/{id}/read', [DocumentManagementController::class, 'markNotificationAsRead']);
    });

    // ID Renewal routes
    Route::prefix('id-renewals')->group(function () {
        // Member routes
        Route::post('/submit', [IDRenewalController::class, 'submitRenewal']);
        Route::get('/my-status', [IDRenewalController::class, 'getMyRenewalStatus']);
        
        // Admin routes
        Route::get('/', [IDRenewalController::class, 'getAllRenewals']);
        Route::get('/{id}', [IDRenewalController::class, 'getRenewal']);
        Route::post('/{id}/approve', [IDRenewalController::class, 'approveRenewal']);
        Route::post('/{id}/reject', [IDRenewalController::class, 'rejectRenewal']);
        Route::get('/{id}/file/{type}', [IDRenewalController::class, 'getFile']);
    });

    // Document Migration routes (Admin only)
    Route::prefix('admin')->group(function () {
        Route::post('/migrate-documents', [App\Http\Controllers\API\DocumentMigrationController::class, 'migrateApplicationDocuments']);
        Route::get('/migration-status', [App\Http\Controllers\API\DocumentMigrationController::class, 'getMigrationStatus']);
        Route::post('/migrate-all-documents', function (Request $request) {
            if ($request->user()->role !== 'Admin' && $request->user()->role !== 'SuperAdmin') {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
            
            $documentMigrationService = new \App\Services\DocumentMigrationService();
            $result = $documentMigrationService->migrateAllApprovedApplications();
            
            return response()->json($result);
        });
    });

    // Notification routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', function (Request $request) {
            try {
                $user = $request->user();
                $notifications = \App\Models\Notification::forUser($user->userID)
                    ->orderBy('created_at', 'desc')
                    ->get();
                
                return response()->json([
                    'success' => true,
                    'notifications' => $notifications
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to fetch notifications',
                    'message' => $e->getMessage()
                ], 500);
            }
        });

        Route::get('/unread', function (Request $request) {
            try {
                $user = $request->user();
                $unreadCount = \App\Models\Notification::forUser($user->userID)
                    ->unread()
                    ->count();
                
                return response()->json([
                    'success' => true,
                    'unread_count' => $unreadCount
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to fetch unread count',
                    'message' => $e->getMessage()
                ], 500);
            }
        });

        Route::post('/{id}/mark-read', function (Request $request, $id) {
            try {
                $user = $request->user();
                $notification = \App\Models\Notification::forUser($user->userID)
                    ->findOrFail($id);
                
                $notification->markAsRead();
                
                return response()->json([
                    'success' => true,
                    'message' => 'Notification marked as read'
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to mark notification as read',
                    'message' => $e->getMessage()
                ], 500);
            }
        });

        Route::post('/mark-all-read', function (Request $request) {
            try {
                $user = $request->user();
                \App\Models\Notification::forUser($user->userID)
                    ->unread()
                    ->update([
                        'is_read' => true,
                        'read_at' => now()
                    ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'All notifications marked as read'
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to mark all notifications as read',
                    'message' => $e->getMessage()
                ], 500);
            }
        });
    });
});

// Simple test route
Route::get('/api/test-basic', function () {
    return response()->json([
        'message' => 'Server is working!',
        'status' => 'OK',
        'time' => now()
    ]);
});

// Test email sending with updated credentials
Route::get('/api/test-email/{email}', function ($email) {
    try {
        $emailService = new \App\Services\EmailService();
        
        $result = $emailService->sendApplicationApprovalEmail([
            'firstName' => 'Test',
            'lastName' => 'User',
            'email' => $email,
            'username' => $email,
            'password' => 'test123',
            'pwdId' => 'PWD-000001',
            'loginUrl' => 'http://localhost:3000/login'
        ]);

        return response()->json([
            'message' => 'Email test completed',
            'email' => $email,
            'sent' => $result,
            'from' => 'sarinonhoelivan29@gmail.com'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Email test failed',
            'message' => $e->getMessage(),
            'email' => $email
        ], 500);
    }
});

Route::get('/api/test-admin-approve/{applicationId}', function ($applicationId) {
    try {
        $application = \App\Models\Application::findOrFail($applicationId);
        
        // Generate secure random password
        $randomPassword = \Illuminate\Support\Str::random(12);
        
        // Check if user already exists
        $existingUser = \App\Models\User::where('email', $application->email)->first();
        
        if ($existingUser) {
            // User already exists, update their role to PWDMember and password
            $existingUser->update([
                'role' => 'PWDMember',
                'status' => 'active',
                'password' => \Illuminate\Support\Facades\Hash::make($randomPassword)
            ]);
            $pwdUser = $existingUser;
        } else {
            // Create new PWD Member User Account
            $pwdUser = \App\Models\User::create([
                'username' => $application->email, // Use email as username
                'email' => $application->email,
                'password' => \Illuminate\Support\Facades\Hash::make($randomPassword),
                'role' => 'PWDMember',
                'status' => 'active'
            ]);
        }

        // Generate unique PWD ID
        $pwdId = 'PWD-' . str_pad($pwdUser->userID, 6, '0', STR_PAD_LEFT);

        // Update application status
        $application->update([
            'status' => 'Approved',
            'remarks' => 'Test approval - Account created',
            'pwdID' => $pwdUser->userID
        ]);

        // Migrate documents from application to member_documents table
        $documentMigrationService = new \App\Services\DocumentMigrationService();
        $migrationResult = $documentMigrationService->migrateApplicationDocuments($application, $pwdUser);

        // Send email notification
        try {
            $emailService = new \App\Services\EmailService();
            $emailSent = $emailService->sendApplicationApprovalEmail([
                'firstName' => $application->firstName,
                'lastName' => $application->lastName,
                'email' => $application->email,
                'username' => $pwdUser->username,
                'password' => $randomPassword,
                'pwdId' => $pwdId,
                'loginUrl' => config('app.frontend_url', 'http://localhost:3000/login')
            ]);

            return response()->json([
                'message' => '✅ ADMIN APPROVAL SUCCESSFUL!',
                'details' => [
                    'application_approved' => true,
                    'user_account_created' => true,
                    'documents_migrated' => $migrationResult['success'] ?? false,
                    'documents_migrated_count' => $migrationResult['migrated_count'] ?? 0,
                    'email_sent' => $emailSent
                ],
                'application' => [
                    'id' => $application->applicationID,
                    'name' => $application->firstName . ' ' . $application->lastName,
                    'email' => $application->email,
                    'status' => $application->status
                ],
                'user_account' => [
                    'userID' => $pwdUser->userID,
                    'email' => $pwdUser->email,
                    'role' => $pwdUser->role,
                    'status' => $pwdUser->status,
                    'pwdId' => $pwdId
                ],
                'login_credentials' => [
                    'email' => $application->email,
                    'password' => $randomPassword,
                    'note' => 'Password is hashed in database for security'
                ],
                'email_status' => $emailSent ? 'Email sent successfully' : 'Email failed to send'
            ]);

        } catch (\Exception $mailError) {
            return response()->json([
                'message' => '✅ ADMIN APPROVAL SUCCESSFUL! (Email failed)',
                'details' => [
                    'application_approved' => true,
                    'user_account_created' => true,
                    'email_sent' => false,
                    'email_error' => $mailError->getMessage()
                ],
                'application' => $application,
                'user_account' => $pwdUser,
                'login_credentials' => [
                    'email' => $application->email,
                    'password' => $randomPassword
                ]
            ]);
        }

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to approve application',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Test route to check Richard Carandang PWD-1
Route::get('/api/test-richard-pwd1', function () {
    try {
        // Check if Richard Carandang exists in PWD members
        $richard = \App\Models\PWDMember::where('firstName', 'Richard')
            ->where('lastName', 'Carandang')
            ->first();
        
        if ($richard) {
            return response()->json([
                'success' => true,
                'message' => 'Richard Carandang found',
                'member' => [
                    'id' => $richard->id,
                    'userID' => $richard->userID,
                    'pwd_id' => $richard->pwd_id,
                    'firstName' => $richard->firstName,
                    'lastName' => $richard->lastName,
                    'birthDate' => $richard->birthDate,
                    'disabilityType' => $richard->disabilityType,
                    'barangay' => $richard->barangay
                ]
            ]);
        } else {
            // Check if he exists in applications
            $application = \App\Models\Application::where('firstName', 'Richard')
                ->where('lastName', 'Carandang')
                ->first();
                
            if ($application) {
                return response()->json([
                    'success' => false,
                    'message' => 'Richard Carandang found in applications but not in PWD members',
                    'application' => [
                        'applicationID' => $application->applicationID,
                        'firstName' => $application->firstName,
                        'lastName' => $application->lastName,
                        'status' => $application->status,
                        'email' => $application->email
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Richard Carandang not found in database'
                ]);
            }
        }
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error checking Richard Carandang',
            'error' => $e->getMessage()
        ], 500);
    }
});

// Test route to update Mel Ivan Mananquil's card expiration date to 25 days from now
Route::get('/api/test-update-mel-ivan-expiry', function () {
    try {
        // Find Mel Ivan Mananquil
        $member = \App\Models\PWDMember::where(function($query) {
            $query->where('firstName', 'LIKE', '%Mel%')
                  ->where('lastName', 'LIKE', '%Mananquil%');
        })->orWhere(function($query) {
            $query->where('firstName', 'LIKE', '%Mel Ivan%')
                  ->where('lastName', 'LIKE', '%Mananquil%');
        })->first();
        
        if (!$member) {
            // Try with different name variations
            $member = \App\Models\PWDMember::where('firstName', 'Mel Ivan')
                ->where('lastName', 'Mananquil')
                ->first();
        }
        
        if (!$member) {
            return response()->json([
                'success' => false,
                'message' => 'Mel Ivan Mananquil not found in PWD members'
            ], 404);
        }
        
        // Set expiration date to 25 days from now (within 30-day window for testing)
        $newExpirationDate = now()->addDays(25);
        
        // Update the member
        $member->update([
            'cardExpirationDate' => $newExpirationDate,
            'cardClaimed' => true, // Ensure card is claimed
            'cardIssueDate' => $member->cardIssueDate ?? now()->subYears(3)->addDays(25) // Set issue date if not set
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Mel Ivan Mananquil\'s card expiration date updated successfully',
            'member' => [
                'id' => $member->id,
                'userID' => $member->userID,
                'pwd_id' => $member->pwd_id,
                'firstName' => $member->firstName,
                'lastName' => $member->lastName,
                'cardClaimed' => $member->cardClaimed,
                'cardIssueDate' => $member->cardIssueDate,
                'cardExpirationDate' => $member->cardExpirationDate,
                'daysUntilExpiration' => now()->diffInDays($member->cardExpirationDate, false)
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error updating Mel Ivan Mananquil\'s expiration date',
            'error' => $e->getMessage()
        ], 500);
    }
});

// Test route to send renewal approval email to Mel Ivan Mananquil
Route::get('/api/test-send-mel-ivan-renewal-email', function () {
    try {
        // Find Mel Ivan Mananquil
        $member = \App\Models\PWDMember::where(function($query) {
            $query->where('firstName', 'LIKE', '%Mel%')
                  ->where('lastName', 'LIKE', '%Mananquil%');
        })->orWhere(function($query) {
            $query->where('firstName', 'LIKE', '%Mel Ivan%')
                  ->where('lastName', 'LIKE', '%Mananquil%');
        })->with('user')->first();
        
        if (!$member) {
            // Try with different name variations
            $member = \App\Models\PWDMember::where('firstName', 'Mel Ivan')
                ->where('lastName', 'Mananquil')
                ->with('user')
                ->first();
        }
        
        if (!$member) {
            return response()->json([
                'success' => false,
                'message' => 'Mel Ivan Mananquil not found in PWD members'
            ], 404);
        }
        
        // Get member's email
        $memberEmail = $member->email;
        if (empty($memberEmail) && $member->user) {
            $memberEmail = $member->user->email;
        }
        
        if (empty($memberEmail)) {
            return response()->json([
                'success' => false,
                'message' => 'No email address found for Mel Ivan Mananquil'
            ], 400);
        }
        
        // Get expiration date (use current if not set, or add 3 years)
        $expirationDate = $member->cardExpirationDate 
            ? \Carbon\Carbon::parse($member->cardExpirationDate)
            : now()->addYears(3);
        
        // Send renewal approval email
        $emailService = new \App\Services\EmailService();
        $emailSent = $emailService->sendRenewalApprovalEmail([
            'email' => $memberEmail,
            'firstName' => $member->firstName,
            'lastName' => $member->lastName,
            'pwdId' => $member->pwd_id ?? 'N/A',
            'newExpirationDate' => $expirationDate->format('F d, Y'),
            'renewalDate' => now()->format('F d, Y'),
            'notes' => 'This is a test email for renewal approval.'
        ]);
        
        if ($emailSent) {
            return response()->json([
                'success' => true,
                'message' => 'Renewal approval email sent successfully to Mel Ivan Mananquil',
                'details' => [
                    'email' => $memberEmail,
                    'name' => $member->firstName . ' ' . $member->lastName,
                    'pwdId' => $member->pwd_id ?? 'N/A',
                    'expirationDate' => $expirationDate->format('F d, Y')
                ]
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send renewal approval email. Check logs for details.',
                'email' => $memberEmail
            ], 500);
        }
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error sending renewal approval email',
            'error' => $e->getMessage()
        ], 500);
    }
});

Route::get('/api/test-approve-application/{applicationId}', function ($applicationId) {
    try {
        $application = \App\Models\Application::findOrFail($applicationId);
        
        // Generate secure random password
        $randomPassword = \Illuminate\Support\Str::random(12);
        
        // Check if user already exists
        $existingUser = \App\Models\User::where('email', $application->email)->first();
        
        if ($existingUser) {
            // User already exists, update their role to PWDMember and password
            $existingUser->update([
                'role' => 'PWDMember',
                'status' => 'active',
                'password' => \Illuminate\Support\Facades\Hash::make($randomPassword)
            ]);
            $pwdUser = $existingUser;
        } else {
            // Create new PWD Member User Account
            $pwdUser = \App\Models\User::create([
                'username' => $application->email, // Use email as username
                'email' => $application->email,
                'password' => \Illuminate\Support\Facades\Hash::make($randomPassword),
                'role' => 'PWDMember',
                'status' => 'active'
            ]);
        }

        // Generate unique PWD ID
        $pwdId = 'PWD-' . str_pad($pwdUser->userID, 6, '0', STR_PAD_LEFT);

        // Update application status
        $application->update([
            'status' => 'Approved',
            'remarks' => 'Test approval - Account created',
            'pwdID' => $pwdUser->userID
        ]);

        // Migrate documents from application to member_documents table
        $documentMigrationService = new \App\Services\DocumentMigrationService();
        $migrationResult = $documentMigrationService->migrateApplicationDocuments($application, $pwdUser);

        // Send email notification
        try {
            $emailService = new \App\Services\EmailService();
            $emailSent = $emailService->sendApplicationApprovalEmail([
                'firstName' => $application->firstName,
                'lastName' => $application->lastName,
                'email' => $application->email,
                'username' => $pwdUser->username,
                'password' => $randomPassword,
                'pwdId' => $pwdId,
                'loginUrl' => config('app.frontend_url', 'http://localhost:3000/login')
            ]);

            return response()->json([
                'message' => 'Application approved successfully! User account created and email sent.',
                'application' => [
                    'id' => $application->applicationID,
                    'name' => $application->firstName . ' ' . $application->lastName,
                    'email' => $application->email,
                    'status' => $application->status
                ],
                'user_account' => [
                    'userID' => $pwdUser->userID,
                    'email' => $pwdUser->email,
                    'role' => $pwdUser->role,
                    'status' => $pwdUser->status,
                    'pwdId' => $pwdId
                ],
                'login_credentials' => [
                    'email' => $application->email,
                    'password' => $randomPassword,
                    'note' => 'Password is hashed in database for security'
                ],
                'email_sent' => $emailSent
            ]);

        } catch (\Exception $mailError) {
            return response()->json([
                'message' => 'Application approved and user account created, but email failed to send.',
                'error' => $mailError->getMessage(),
                'application' => $application,
                'user_account' => $pwdUser,
                'login_credentials' => [
                    'email' => $application->email,
                    'password' => $randomPassword
                ]
            ]);
        }

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to approve application',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Admin approval route for applications (protected)
Route::middleware('auth:sanctum')->post('/applications/{applicationId}/approve-admin', function (Request $request, $applicationId) {
    try {
        // Check if user is admin
        $user = $request->user();
        if (!$user || !in_array($user->role, ['Admin', 'SuperAdmin', 'Staff1'])) {
            return response()->json([
                'error' => 'Unauthorized. Admin privileges required.'
            ], 403);
        }

        // Find the application
        $application = \App\Models\Application::where('applicationID', $applicationId)->first();
        
        if (!$application) {
            return response()->json([
                'error' => 'Application not found'
            ], 404);
        }

        // Check if application is in pending status
        if ($application->status !== 'Pending Admin Approval') {
            return response()->json([
                'error' => 'Application is not pending admin approval'
            ], 400);
        }

        // Check if there's a pending document correction request
        $pendingCorrection = \App\Models\DocumentCorrectionRequest::where('application_id_string', $applicationId)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();
        
        if ($pendingCorrection) {
            return response()->json([
                'error' => 'Cannot approve application',
                'message' => 'A document correction request is pending. Please wait for the applicant to submit corrected documents before approving.'
            ], 400);
        }

        // Generate secure random password
        $randomPassword = \Illuminate\Support\Str::random(12);
        
        // Generate PWD ID
        $pwdId = 'PWD-' . strtoupper(substr($application->firstName, 0, 2)) . 
                strtoupper(substr($application->lastName, 0, 2)) . 
                str_pad($application->applicationID, 4, '0', STR_PAD_LEFT);

        // Update application status (don't set pwdID as it's a foreign key to users.userID)
        $application->status = 'Approved';
        $application->save();

        // Get the next available user ID first
        $nextUserId = \App\Models\User::max('userID') + 1;
        
        // Create PWD Member record
        $pwdMember = new \App\Models\PWDMember();
        $pwdMember->userID = $nextUserId;
        $pwdMember->firstName = $application->firstName;
        $pwdMember->lastName = $application->lastName;
        $pwdMember->middleName = $application->middleName;
        $pwdMember->birthDate = $application->birthDate;
        $pwdMember->disabilityType = $application->disabilityType;
        $pwdMember->address = $application->address;
        $pwdMember->barangay = $application->barangay;
        $pwdMember->emergencyContact = $application->emergencyContact;
        $pwdMember->emergencyPhone = $application->emergencyPhone;
        $pwdMember->emergencyRelationship = $application->emergencyRelationship;
        $pwdMember->pwd_id = $pwdId;
        $pwdMember->status = 'Active';
        $pwdMember->save();
        
        // Generate and store QR code for the new PWD member
        try {
            \App\Services\QRCodeGenerator::generateAndStore($pwdMember);
        } catch (\Exception $qrError) {
            \Illuminate\Support\Facades\Log::error('QR code generation failed during approval', [
                'error' => $qrError->getMessage(),
                'pwd_member_id' => $pwdMember->userID
            ]);
        }

        // Create User account
        $newUser = new \App\Models\User();
        $newUser->userID = $nextUserId; // Use next available ID instead of application ID
        $newUser->username = $application->email; // Use email as username
        $newUser->email = $application->email;
        $newUser->password = \Illuminate\Support\Facades\Hash::make($randomPassword);
        $newUser->role = 'PWDMember';
        $newUser->status = 'Active';
        $newUser->password_change_required = true; // Require password change on first login
        $newUser->save();

        // Migrate documents from application to member_documents table
        try {
            $documentMigrationService = new \App\Services\DocumentMigrationService();
            $migrationResult = $documentMigrationService->migrateApplicationDocuments($application, $newUser, $user->userID);
            
            \Illuminate\Support\Facades\Log::info('Document migration result', [
                'application_id' => $application->applicationID,
                'migration_result' => $migrationResult
            ]);
        } catch (\Exception $migrationError) {
            \Illuminate\Support\Facades\Log::error('Document migration failed during approval', [
                'application_id' => $application->applicationID,
                'error' => $migrationError->getMessage(),
                'trace' => $migrationError->getTraceAsString()
            ]);
            // Don't fail the approval if migration fails, just log it
        }

        // Send approval email
        $emailSent = false;
        try {
            \Illuminate\Support\Facades\Mail::send('emails.application-approved', [
                'firstName' => $application->firstName,
                'lastName' => $application->lastName,
                'email' => $application->email,
                'username' => $application->email,
                'password' => $randomPassword,
                'pwdId' => $pwdId,
                'loginUrl' => config('app.frontend_url', 'http://localhost:3000/login')
            ], function ($message) use ($application) {
                $message->to($application->email)
                        ->subject('PWD Application Approved - Your Account Details');
            });
            $emailSent = true;
        } catch (\Exception $mailError) {
            \Illuminate\Support\Facades\Log::error('Email sending failed', ['error' => $mailError->getMessage()]);
        }

        return response()->json([
            'message' => 'Application approved successfully',
            'application' => [
                'id' => $application->applicationID,
                'name' => $application->firstName . ' ' . $application->lastName,
                'email' => $application->email,
                'status' => $application->status,
                'pwdId' => $pwdId
            ],
            'user_account' => [
                'email' => $application->email,
                'password' => $randomPassword
            ],
            'email_sent' => $emailSent
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to approve application',
            'message' => $e->getMessage()
        ], 500);
    }
});

// Fallback route for undefined API endpoints
Route::fallback(function () {
    return response()->json([
        'message' => 'API endpoint not found. Please check your request.'
    ], 404);
});