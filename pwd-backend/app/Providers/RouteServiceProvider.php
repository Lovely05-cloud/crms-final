<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            // Add a test route directly here
            Route::get('/api/test-direct', function () {
                return response()->json(['message' => 'Direct route test']);
            });

            // Add login route directly here
            Route::post('/api/login', [\App\Http\Controllers\API\AuthController::class, 'login']);

            // Add dashboard stats route (requires authentication)
            Route::middleware('auth:sanctum')->get('/api/applications/dashboard/stats', function (Request $request) {
                try {
                    // Get the authenticated user
                    $user = $request->user();
                    $barangay = 'Barangay Poblacion'; // Default
                    
                    if ($user && $user->role === 'BarangayPresident') {
                        // Load the barangay president relationship
                        try {
                            $user->load('barangayPresident');
                            if ($user->barangayPresident && $user->barangayPresident->barangay) {
                                $barangay = $user->barangayPresident->barangay;
                            }
                        } catch (\Exception $e) {
                            // Handle missing barangay_president table gracefully
                            \Log::warning('Barangay president table not available: ' . $e->getMessage());
                            // Extract barangay from username (e.g., bp_mamatid -> Mamatid)
                            if (strpos($user->username, 'bp_') === 0) {
                                $barangayName = str_replace('bp_', '', $user->username);
                                $barangayName = str_replace('_', ' ', $barangayName);
                                $barangayName = ucwords(strtolower($barangayName));
                                $barangay = $barangayName; // Use just the barangay name, not "Barangay " prefix
                            }
                        }
                    }
                    
                    // Filter applications by barangay
                    $query = \App\Models\Application::where('barangay', $barangay);
                    
                    $stats = [
                        'totalApplications' => $query->count(),
                        'pendingApplications' => $query->where('status', 'Pending Barangay Approval')->count(),
                        'approvedApplications' => $query->where('status', 'Approved')->count(),
                        'rejectedApplications' => $query->where('status', 'Rejected')->count(),
                        'pendingAdminApproval' => $query->where('status', 'Pending Admin Approval')->count(),
                        'barangay' => $barangay
                    ];
                    
                    return response()->json($stats);
                } catch (\Exception $e) {
                    // Fallback to mock data if there's an error
                    return response()->json([
                        'totalApplications' => 0,
                        'pendingApplications' => 0,
                        'approvedApplications' => 0,
                        'rejectedApplications' => 0,
                        'pendingAdminApproval' => 0,
                        'barangay' => 'Barangay Poblacion',
                        'error' => $e->getMessage()
                    ]);
                }
            });

            // Add applications routes
            Route::get('/api/applications', function () {
                try {
                    $applications = \App\Models\Application::orderBy('created_at', 'desc')->get();
                    return response()->json($applications);
                } catch (\Exception $e) {
                    return response()->json(['error' => $e->getMessage()], 500);
                }
            });
            
            // Add application by ID route
            Route::get('/api/applications/{id}', function ($id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    return response()->json($application);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Application not found'], 404);
                }
            });
            
            // Add application update route
            Route::put('/api/applications/{id}', function (Request $request, $id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    $application->update($request->all());
                    return response()->json($application);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to update application'], 500);
                }
            });
            
            // Add application delete route
            Route::delete('/api/applications/{id}', function ($id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    $application->delete();
                    return response()->json(['message' => 'Application deleted successfully']);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to delete application'], 500);
                }
            });
            
            // Add application status update route
            Route::patch('/api/applications/{id}/status', function (Request $request, $id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    $application->update([
                        'status' => $request->status,
                        'remarks' => $request->remarks
                    ]);
                    return response()->json($application);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to update application status'], 500);
                }
            });
            
            
            // Add application approval routes
            Route::middleware('auth:sanctum')->post('/api/applications/{id}/approve-barangay', function (Request $request, $id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'remarks' => 'nullable|string|max:500',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'error' => 'Validation failed',
                            'messages' => $validator->errors()
                        ], 422);
                    }

                    $application->update([
                        'status' => 'Pending Admin Approval',
                        'remarks' => $request->remarks || 'Approved by Barangay President'
                    ]);

                    return response()->json([
                        'message' => 'Application approved successfully',
                        'application' => $application
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to approve application',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });
            
            Route::middleware('auth:sanctum')->post('/api/applications/{id}/reject', function (Request $request, $id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'remarks' => 'required|string|max:500',
                        'rejectionReason' => 'required|string',
                        'customReason' => 'nullable|string|max:200',
                    ]);

                    if ($validator->fails()) {
                        return response()->json([
                            'error' => 'Validation failed',
                            'messages' => $validator->errors()
                        ], 422);
                    }

                    // Build rejection reason text
                    $rejectionReasonText = '';
                    $reasonMap = [
                        'incomplete_information' => 'Incomplete Information',
                        'incorrect_information' => 'Incorrect Information',
                        'document_resubmission' => 'Document Resubmission/Correction Required',
                        'does_not_meet_criteria' => 'Does Not Meet Criteria',
                        'other' => $request->customReason ?? 'Other'
                    ];
                    $rejectionReasonText = $reasonMap[$request->rejectionReason] ?? $request->rejectionReason;

                    // Combine rejection reason and remarks for the remarks field
                    $fullRemarks = "Rejection Reason: {$rejectionReasonText}\n\nRemarks:\n{$request->remarks}";

                    // Update application status to Rejected and schedule deletion after 1 day
                    $application->update([
                        'status' => 'Rejected',
                        'remarks' => $fullRemarks,
                        'scheduled_deletion_at' => now()->addDay() // Schedule deletion after 1 day
                    ]);

                    // Send rejection email notification
                    try {
                        $emailService = new \App\Services\EmailService();
                        $emailService->sendApplicationRejectionEmail([
                            'email' => $application->email,
                            'firstName' => $application->firstName,
                            'lastName' => $application->lastName,
                            'referenceNumber' => $application->referenceNumber ?? 'N/A',
                            'rejectionReason' => $rejectionReasonText,
                            'remarks' => $request->remarks
                        ]);
                    } catch (\Exception $emailException) {
                        \Illuminate\Support\Facades\Log::error('Failed to send rejection email', [
                            'application_id' => $application->applicationID,
                            'error' => $emailException->getMessage()
                        ]);
                        // Don't fail the rejection if email fails
                    }

                    return response()->json([
                        'message' => 'Application rejected successfully',
                        'application' => $application
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to reject application',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });
            
            // Add admin dashboard stats route
            Route::middleware('auth:sanctum')->get('/api/admin/dashboard/stats', function (Request $request) {
                try {
                    $user = $request->user();
                    
                    // Only allow admin users
                    if ($user->role !== 'Admin') {
                        return response()->json(['error' => 'Unauthorized'], 403);
                    }
                    
                    // Get all applications across all barangays
                    $totalApplications = \App\Models\Application::count();
                    $pendingBarangayApproval = \App\Models\Application::where('status', 'Pending Barangay Approval')->count();
                    $pendingAdminApproval = \App\Models\Application::where('status', 'Pending Admin Approval')->count();
                    $approvedApplications = \App\Models\Application::where('status', 'Approved')->count();
                    $rejectedApplications = \App\Models\Application::where('status', 'Rejected')->count();
                    
                    return response()->json([
                        'totalApplications' => $totalApplications,
                        'pendingBarangayApproval' => $pendingBarangayApproval,
                        'pendingAdminApproval' => $pendingAdminApproval,
                        'approvedApplications' => $approvedApplications,
                        'rejectedApplications' => $rejectedApplications,
                        'totalRegisteredPWDs' => $approvedApplications, // Same as approved applications
                        'unclaimedPWDCards' => $approvedApplications, // Assuming all approved need cards
                        'complaintsFeedback' => 0 // Placeholder - would need separate table
                    ]);
                    
                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to fetch admin dashboard stats',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });

            // Announcement Routes
            Route::get('/api/announcements', function () {
                try {
                    $announcements = \App\Models\Announcement::with('author')->get();
                    return response()->json($announcements);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to fetch announcements', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::get('/api/announcements/admin', function () {
                try {
                    $announcements = \App\Models\Announcement::with('author')
                        ->whereHas('author', function($query) {
                            $query->where('role', 'Admin');
                        })
                        ->get();
                    return response()->json($announcements);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to fetch admin announcements', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::post('/api/announcements', function (Request $request) {
                try {
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'title' => 'required|string|max:100',
                        'content' => 'required|string',
                        'type' => 'required|string|in:Information,Event,Notice,Emergency',
                        'priority' => 'required|string|in:Low,Medium,High',
                        'targetAudience' => 'required|string|max:100',
                        'status' => 'required|string|in:Draft,Active,Archived',
                        'expiryDate' => 'nullable|date|after_or_equal:today',
                    ]);

                    if ($validator->fails()) {
                        return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 400);
                    }

                    $data = $request->all();
                    $data['authorID'] = 1; // Default author ID
                    $data['views'] = 0;
                    $data['publishDate'] = now()->toDateString();

                    $announcement = \App\Models\Announcement::create($data);
                    return response()->json($announcement, 201);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to create announcement', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::put('/api/announcements/{id}', function (Request $request, $id) {
                try {
                    $announcement = \App\Models\Announcement::find($id);
                    
                    if (!$announcement) {
                        return response()->json(['error' => 'Announcement not found'], 404);
                    }

                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'title' => 'sometimes|required|string|max:100',
                        'content' => 'sometimes|required|string',
                        'type' => 'sometimes|required|string|in:Information,Event,Notice,Emergency',
                        'priority' => 'sometimes|required|string|in:Low,Medium,High',
                        'targetAudience' => 'sometimes|required|string|max:100',
                        'status' => 'sometimes|required|string|in:Draft,Active,Archived',
                        'expiryDate' => 'sometimes|nullable|date|after_or_equal:today',
                    ]);

                    if ($validator->fails()) {
                        return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 400);
                    }

                    $announcement->update($request->all());
                    return response()->json($announcement);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to update announcement', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::delete('/api/announcements/{id}', function ($id) {
                try {
                    $announcement = \App\Models\Announcement::find($id);
                    
                    if (!$announcement) {
                        return response()->json(['error' => 'Announcement not found'], 404);
                    }

                    $announcement->delete();
                    return response()->json(['message' => 'Announcement deleted successfully']);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to delete announcement', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::get('/api/announcements/audience/{audience}', function ($audience) {
                try {
                    $announcements = \App\Models\Announcement::where('targetAudience', $audience)
                        ->orderBy('created_at', 'desc')
                        ->get();
                    
                    return response()->json($announcements);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to fetch announcements', 'message' => $e->getMessage()], 500);
                }
            });
            
            // Support Desk Routes
            Route::get('/api/support/tickets', function () {
                try {
                    // Mock support tickets data
                    $tickets = [
                        [
                            'id' => 1,
                            'ticketNumber' => 'SUP-001',
                            'subject' => 'PWD Card Application Issue',
                            'description' => 'I submitted my PWD card application 2 weeks ago but haven\'t received any updates. Can you please check the status?',
                            'requester' => 'John Doe',
                            'email' => 'john.doe@email.com',
                            'phone' => '+63 912 345 6789',
                            'status' => 'Open',
                            'priority' => 'High',
                            'category' => 'PWD Card',
                            'createdAt' => '2025-09-01',
                            'updatedAt' => '2025-09-05',
                            'replies' => [
                                [
                                    'id' => 1,
                                    'message' => 'Thank you for contacting us. We have received your application and it is currently under review.',
                                    'author' => 'Admin',
                                    'createdAt' => '2025-09-02'
                                ]
                            ]
                        ],
                        [
                            'id' => 2,
                            'ticketNumber' => 'SUP-002',
                            'subject' => 'Benefits Information Request',
                            'description' => 'I would like to know what benefits are available for PWD members in our barangay.',
                            'requester' => 'Maria Santos',
                            'email' => 'maria.santos@email.com',
                            'phone' => '+63 987 654 3210',
                            'status' => 'In Progress',
                            'priority' => 'Medium',
                            'category' => 'Benefits',
                            'createdAt' => '2025-09-03',
                            'updatedAt' => '2025-09-04',
                            'replies' => []
                        ],
                        [
                            'id' => 3,
                            'ticketNumber' => 'SUP-003',
                            'subject' => 'Account Login Problem',
                            'description' => 'I cannot log into my PWD member account. It says invalid credentials.',
                            'requester' => 'Pedro Cruz',
                            'email' => 'pedro.cruz@email.com',
                            'phone' => '+63 923 456 7890',
                            'status' => 'Resolved',
                            'priority' => 'High',
                            'category' => 'Technical',
                            'createdAt' => '2025-08-28',
                            'updatedAt' => '2025-08-30',
                            'replies' => [
                                [
                                    'id' => 1,
                                    'message' => 'We have reset your password and sent new login credentials to your email.',
                                    'author' => 'Admin',
                                    'createdAt' => '2025-08-29'
                                ]
                            ]
                        ]
                    ];
                    
                    return response()->json($tickets);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to fetch support tickets', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::post('/api/support/tickets', function (Request $request) {
                try {
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'subject' => 'required|string|max:255',
                        'description' => 'required|string',
                        'requester' => 'required|string|max:255',
                        'email' => 'required|email|max:255',
                        'phone' => 'required|string|max:20',
                        'category' => 'required|string|in:PWD Card,Benefits,Technical,General',
                        'priority' => 'required|string|in:Low,Medium,High'
                    ]);

                    if ($validator->fails()) {
                        return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 400);
                    }

                    // Generate ticket number
                    $ticketNumber = 'SUP-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                    
                    $ticket = [
                        'id' => rand(100, 999),
                        'ticketNumber' => $ticketNumber,
                        'subject' => $request->subject,
                        'description' => $request->description,
                        'requester' => $request->requester,
                        'email' => $request->email,
                        'phone' => $request->phone,
                        'status' => 'Open',
                        'priority' => $request->priority,
                        'category' => $request->category,
                        'createdAt' => now()->toDateString(),
                        'updatedAt' => now()->toDateString(),
                        'replies' => []
                    ];
                    
                    return response()->json($ticket, 201);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to create support ticket', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::post('/api/support/tickets/{id}/reply', function (Request $request, $id) {
                try {
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'message' => 'required|string'
                    ]);

                    if ($validator->fails()) {
                        return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 400);
                    }

                    $reply = [
                        'id' => rand(1, 999),
                        'message' => $request->message,
                        'author' => 'Admin',
                        'createdAt' => now()->toDateString()
                    ];
                    
                    return response()->json($reply, 201);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to add reply', 'message' => $e->getMessage()], 500);
                }
            });
            
            // Add PWD Member Profile routes
            Route::middleware('auth:sanctum')->get('/api/pwd-member/profile', function (Request $request) {
                try {
                    $user = $request->user();
                    
                    if ($user->role !== 'PWDMember') {
                        return response()->json(['error' => 'Unauthorized'], 403);
                    }
                    
                    $pwdMember = \App\Models\PWDMember::where('userID', $user->userID)->first();
                    
                    if (!$pwdMember) {
                        return response()->json(['error' => 'PWD Member profile not found'], 404);
                    }
                    
                    // Get barangay from the original application
                    $application = \App\Models\Application::where('pwdID', $user->userID)->first();
                    $barangay = $application ? $application->barangay : 'Unknown';
                    
                    return response()->json([
                        'userID' => $user->userID,
                        'firstName' => $pwdMember->firstName,
                        'lastName' => $pwdMember->lastName,
                        'email' => $user->email,
                        'contactNumber' => $pwdMember->contactNumber ?? '',
                        'address' => $pwdMember->address,
                        'birthDate' => $pwdMember->birthDate,
                        'gender' => $pwdMember->gender,
                        'disabilityType' => $pwdMember->disabilityType,
                        'barangay' => $barangay,
                        'created_at' => $pwdMember->created_at,
                        'updated_at' => $pwdMember->updated_at
                    ]);
                    
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to fetch profile', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::middleware('auth:sanctum')->put('/api/pwd-member/profile', function (Request $request) {
                try {
                    $user = $request->user();
                    
                    if ($user->role !== 'PWDMember') {
                        return response()->json(['error' => 'Unauthorized'], 403);
                    }
                    
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'firstName' => 'required|string|max:255',
                        'lastName' => 'required|string|max:255',
                        'contactNumber' => 'nullable|string|max:20',
                        'address' => 'nullable|string|max:500',
                        'birthDate' => 'nullable|date',
                        'gender' => 'nullable|in:Male,Female,Other',
                        'disabilityType' => 'nullable|in:Physical,Visual,Hearing,Mental,Intellectual,Learning,Speech,Multiple'
                    ]);
                    
                    if ($validator->fails()) {
                        return response()->json(['error' => 'Validation failed', 'messages' => $validator->errors()], 422);
                    }
                    
                    $pwdMember = \App\Models\PWDMember::where('userID', $user->userID)->first();
                    
                    if (!$pwdMember) {
                        return response()->json(['error' => 'PWD Member profile not found'], 404);
                    }
                    
                    $pwdMember->update([
                        'firstName' => $request->firstName,
                        'lastName' => $request->lastName,
                        'contactNumber' => $request->contactNumber,
                        'address' => $request->address,
                        'birthDate' => $request->birthDate,
                        'gender' => $request->gender,
                        'disabilityType' => $request->disabilityType
                    ]);
                    
                    return response()->json([
                        'message' => 'Profile updated successfully',
                        'profile' => [
                            'firstName' => $pwdMember->firstName,
                            'lastName' => $pwdMember->lastName,
                            'email' => $user->email,
                            'contactNumber' => $pwdMember->contactNumber,
                            'address' => $pwdMember->address,
                            'birthDate' => $pwdMember->birthDate,
                            'gender' => $pwdMember->gender,
                            'disabilityType' => $pwdMember->disabilityType
                        ]
                    ]);
                    
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to update profile', 'message' => $e->getMessage()], 500);
                }
            });
            
            Route::middleware('auth:sanctum')->put('/api/pwd-member/change-password', function (Request $request) {
                try {
                    $user = $request->user();
                    
                    if ($user->role !== 'PWDMember') {
                        return response()->json(['error' => 'Unauthorized'], 403);
                    }
                    
                    $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                        'currentPassword' => 'required|string',
                        'newPassword' => 'required|string|min:6'
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
                    return response()->json(['error' => 'Failed to change password', 'message' => $e->getMessage()], 500);
                }
            });

            // Password reset routes for all user types
            Route::post('/api/reset-password', function (\Illuminate\Http\Request $request) {
                try {
                    $request->validate([
                        'email' => 'required|email',
                        'newPassword' => 'required|min:6',
                        'confirmPassword' => 'required|same:newPassword'
                    ]);
                    
                    $user = \App\Models\User::where('email', $request->email)->first();
                    if (!$user) {
                        return response()->json(['error' => 'User not found'], 404);
                    }
                    
                    // Update password
                    $user->update([
                        'password' => \Illuminate\Support\Facades\Hash::make($request->newPassword)
                    ]);
                    
                    return response()->json([
                        'message' => 'Password reset successfully',
                        'email' => $user->email,
                        'role' => $user->role
                    ]);
                } catch (\Illuminate\Validation\ValidationException $e) {
                    return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to reset password', 'message' => $e->getMessage()], 500);
                }
            });

            // Change password route (requires authentication)
            Route::post('/api/change-password', function (\Illuminate\Http\Request $request) {
                try {
                    $request->validate([
                        'currentPassword' => 'required',
                        'newPassword' => 'required|min:6',
                        'confirmPassword' => 'required|same:newPassword'
                    ]);
                    
                    $user = auth()->user();
                    if (!$user) {
                        return response()->json(['error' => 'User not authenticated'], 401);
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
                    
                } catch (\Illuminate\Validation\ValidationException $e) {
                    return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to change password', 'message' => $e->getMessage()], 500);
                }
            })->middleware('auth:sanctum');

            // Admin route to reset any user's password
            Route::post('/api/admin/reset-user-password', function (\Illuminate\Http\Request $request) {
                try {
                    $request->validate([
                        'email' => 'required|email',
                        'newPassword' => 'required|min:6'
                    ]);
                    
                    $admin = auth()->user();
                    if (!$admin || $admin->role !== 'SuperAdmin') {
                        return response()->json(['error' => 'SuperAdmin access required'], 403);
                    }
                    
                    $user = \App\Models\User::where('email', $request->email)->first();
                    if (!$user) {
                        return response()->json(['error' => 'User not found'], 404);
                    }
                    
                    // Update password
                    $user->update([
                        'password' => \Illuminate\Support\Facades\Hash::make($request->newPassword)
                    ]);
                    
                    return response()->json([
                        'message' => 'User password reset successfully',
                        'email' => $user->email,
                        'role' => $user->role
                    ]);
                    
                } catch (\Illuminate\Validation\ValidationException $e) {
                    return response()->json(['error' => 'Validation failed', 'errors' => $e->errors()], 422);
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Failed to reset password', 'message' => $e->getMessage()], 500);
                }
            })->middleware('auth:sanctum');

            // Add test route to check PWD member accounts
            Route::get('/api/test-pwd-login/{email}', function ($email) {
                try {
                    $user = \App\Models\User::where('email', $email)->first();
                    if (!$user) {
                        return response()->json(['error' => 'User not found'], 404);
                    }
                    
                    $pwdMember = \App\Models\PWDMember::where('userID', $user->userID)->first();
                    
                    return response()->json([
                        'user' => [
                            'userID' => $user->userID,
                            'username' => $user->username,
                            'email' => $user->email,
                            'role' => $user->role,
                            'status' => $user->status,
                            'created_at' => $user->created_at
                        ],
                        'pwdMember' => $pwdMember ? [
                            'id' => $pwdMember->id,
                            'firstName' => $pwdMember->firstName,
                            'lastName' => $pwdMember->lastName,
                            'disabilityType' => $pwdMember->disabilityType
                        ] : null
                    ]);
                } catch (\Exception $e) {
                    return response()->json(['error' => $e->getMessage()], 500);
                }
            });

            // Test route to approve application without authentication
            Route::post('/api/test-approve-application/{id}', function (Request $request, $id) {
                try {
                    $application = \App\Models\Application::findOrFail($id);
                    
                    // Create a password setup token instead of generating a password
                    $passwordSetupToken = base64_encode(json_encode([
                        'email' => $application->email,
                        'ts' => time()
                    ]));
                    
                    // Check if user already exists
                    $existingUser = \App\Models\User::where('email', $application->email)->first();
                    
                    if ($existingUser) {
                        // User already exists, update their role to PWDMember (keep password unchanged until user sets it)
                        $existingUser->update([
                            'role' => 'PWDMember',
                            'status' => 'active'
                        ]);
                        $pwdUser = $existingUser;
                    } else {
                        // Create new PWD Member User Account
                        $pwdUser = \App\Models\User::create([
                            'username' => $application->email, // Use email as username
                            'email' => $application->email,
                            // Set a temporary random password; user will replace via reset link
                            'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(20)),
                            'role' => 'PWDMember',
                            'status' => 'active',
                            'password_change_required' => true
                        ]);
                    }

                    // Generate unique PWD ID
                    $pwdId = \App\Services\PWDIdGenerator::generate();
                    
                    // Create or update PWD Member Record
                    $existingPwdMember = \App\Models\PWDMember::where('userID', $pwdUser->userID)->first();
                    
                    if ($existingPwdMember) {
                        // Update existing PWD Member record
                        $existingPwdMember->update([
                            'pwd_id' => $pwdId,
                            'pwd_id_generated_at' => now(),
                            'firstName' => $application->firstName,
                            'lastName' => $application->lastName,
                            'middleName' => $application->middleName,
                            'birthDate' => $application->birthDate,
                            'gender' => $application->gender,
                            'disabilityType' => $application->disabilityType,
                            'address' => $application->address,
                            'barangay' => $application->barangay,
                            'contactNumber' => $application->contactNumber,
                            'email' => $application->email,
                            'emergencyContact' => $application->emergencyContact,
                            'emergencyPhone' => $application->emergencyPhone,
                            'emergencyRelationship' => $application->emergencyRelationship
                        ]);
                        $pwdMember = $existingPwdMember;
                    } else {
                        // Create new PWD Member Record
                        $pwdMember = \App\Models\PWDMember::create([
                            'userID' => $pwdUser->userID,
                            'pwd_id' => $pwdId,
                            'pwd_id_generated_at' => now(),
                            'firstName' => $application->firstName,
                            'lastName' => $application->lastName,
                            'middleName' => $application->middleName,
                            'birthDate' => $application->birthDate,
                            'gender' => $application->gender,
                            'disabilityType' => $application->disabilityType,
                            'address' => $application->address,
                            'barangay' => $application->barangay,
                            'contactNumber' => $application->contactNumber,
                            'email' => $application->email,
                            'emergencyContact' => $application->emergencyContact,
                            'emergencyPhone' => $application->emergencyPhone,
                            'emergencyRelationship' => $application->emergencyRelationship
                        ]);
                    }

                    // Update application status
                    $application->update([
                        'status' => 'Approved',
                        'remarks' => 'Approved by Test Route',
                        'pwdID' => $pwdUser->userID
                    ]);

                    return response()->json([
                        'message' => 'Application approved successfully. PWD Member account created.',
                        'application' => $application,
                        'pwdUser' => [
                            'userID' => $pwdUser->userID,
                            'pwdId' => $pwdId,
                            'email' => $pwdUser->email,
                            'password' => $randomPassword
                        ],
                        'pwdMember' => $pwdMember
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to approve application',
                        'message' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ], 500);
                }
            });

            // Add test route for debugging
            Route::get('/api/test-pwd-creation', function () {
                try {
                    // Test User creation
                    $user = \App\Models\User::create([
                        'username' => 'test@example.com',
                        'email' => 'test@example.com',
                        'password' => \Illuminate\Support\Facades\Hash::make(\Illuminate\Support\Str::random(12)),
                        'role' => 'PWDMember',
                        'status' => 'active'
                    ]);
                    
                    // Test PWDMember creation
                    $pwdMember = \App\Models\PWDMember::create([
                        'userID' => $user->userID,
                        'firstName' => 'Test',
                        'lastName' => 'User',
                        'birthDate' => '1990-01-01',
                        'gender' => 'Male',
                        'disabilityType' => 'Physical',
                        'address' => 'Test Address'
                    ]);
                    
                    return response()->json([
                        'message' => 'Test successful',
                        'user' => $user,
                        'pwdMember' => $pwdMember
                    ]);
                    
                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Test failed',
                        'message' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ], 500);
                }
            });
            
            
            // Add applications by status route
            Route::middleware('auth:sanctum')->get('/api/applications/status/{status}', function (Request $request, $status) {
                try {
                    $user = $request->user();
                    
                    // Decode the status parameter
                    $decodedStatus = urldecode($status);
                    
                    $applications = \App\Models\Application::where('status', $decodedStatus)->get();
                    
                    return response()->json($applications);
                    
                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to fetch applications by status',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });
            
            // Add user details route for barangay information
            Route::middleware('auth:sanctum')->get('/api/users/{id}', [\App\Http\Controllers\API\UserController::class, 'show']);

            // Add barangay-specific application routes
            Route::middleware('auth:sanctum')->get('/api/applications/barangay/{barangay}/status/{status}', function (Request $request, $barangay, $status) {
                try {
                    $decodedBarangay = urldecode($barangay);
                    $decodedStatus = urldecode($status);
                    
                    $query = \App\Models\Application::where('barangay', $decodedBarangay);
                    
                    if ($decodedStatus !== 'all') {
                        $query->where('status', $decodedStatus);
                    }
                    
                    $applications = $query->get();
                    
                    return response()->json($applications);
                } catch (\Exception $e) {
                    return response()->json(['error' => $e->getMessage()], 500);
                }
            });

            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            // Simple test route
            Route::get('/api/test-basic', function () {
                return response()->json([
                    'message' => 'Server is working!',
                    'status' => 'OK',
                    'time' => now()
                ]);
            });

            // Get login credentials for a specific user
            Route::get('/api/get-user-credentials/{email}', function ($email) {
                try {
                    $user = \App\Models\User::where('email', $email)->first();
                    
                    if (!$user) {
                        return response()->json([
                            'error' => 'User not found',
                            'email' => $email
                        ], 404);
                    }

                    return response()->json([
                        'user_found' => true,
                        'user_details' => [
                            'userID' => $user->userID,
                            'email' => $user->email,
                            'role' => $user->role,
                            'status' => $user->status,
                            'created_at' => $user->created_at
                        ],
                        'note' => 'Password is hashed in database. Use the password from the approval email.'
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to get user credentials',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });

            // Reset password for testing
            Route::get('/api/reset-password/{email}', function ($email) {
                try {
                    $user = \App\Models\User::where('email', $email)->first();
                    
                    if (!$user) {
                        return response()->json([
                            'error' => 'User not found',
                            'email' => $email
                        ], 404);
                    }

                    // Generate a simple password for testing
                    $newPassword = 'password123';
                    
                    // Update user password
                    $user->update([
                        'password' => \Illuminate\Support\Facades\Hash::make($newPassword)
                    ]);

                    return response()->json([
                        'message' => 'Password reset successfully',
                        'user' => [
                            'userID' => $user->userID,
                            'email' => $user->email,
                            'role' => $user->role,
                            'status' => $user->status
                        ],
                        'new_password' => $newPassword,
                        'login_instructions' => [
                            'email' => $email,
                            'password' => $newPassword,
                            'redirect_to' => $user->role === 'PWDMember' ? '/pwd-dashboard' : '/admin-dashboard'
                        ]
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to reset password',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });

            // Test route to create PwdMember record for existing user
            Route::get('/api/create-pwd-member/{email}', function ($email) {
                try {
                    $user = \App\Models\User::where('email', $email)->first();
                    if (!$user) {
                        return response()->json(['error' => 'User not found'], 404);
                    }
                    
                    // Check if PwdMember already exists
                    $existingPwdMember = \App\Models\PWDMember::where('userID', $user->userID)->first();
                    if ($existingPwdMember) {
                        return response()->json([
                            'message' => 'PwdMember already exists',
                            'pwd_member_id' => $existingPwdMember->id,
                            'pwd_id' => $existingPwdMember->pwd_id
                        ]);
                    }
                    
                    // Create PwdMember record
                    $pwdId = 'PWD-' . str_pad($user->userID, 6, '0', STR_PAD_LEFT);
                    $pwdMember = \App\Models\PWDMember::create([
                        'userID' => $user->userID,
                        'pwd_id' => $pwdId,
                        'pwd_id_generated_at' => now(),
                        'firstName' => 'Nhoel Ivan',
                        'lastName' => 'Sarino',
                        'birthDate' => '1995-01-01',
                        'gender' => 'Male',
                        'disabilityType' => 'visual',
                        'address' => 'Test Address',
                        'contactNumber' => '09917404331'
                    ]);
                    
                    return response()->json([
                        'message' => 'PwdMember created successfully',
                        'pwd_member_id' => $pwdMember->id,
                        'pwd_id' => $pwdMember->pwd_id,
                        'user_id' => $user->userID
                    ]);
                } catch (\Exception $e) {
                    return response()->json(['error' => $e->getMessage()], 500);
                }
            });


            // Test route to call BenefitController directly
            Route::get('/api/test-benefit-controller', function () {
                try {
                    $controller = new \App\Http\Controllers\API\BenefitController();
                    $response = $controller->index();
                    return $response;
                } catch (\Exception $e) {
                    return response()->json([
                        'success' => false,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ], 500);
                }
            });

            // Test route to debug Benefit model
            Route::get('/api/test-benefit-model', function () {
                try {
                    $benefits = \App\Models\Benefit::all();
                    return response()->json([
                        'success' => true,
                        'count' => count($benefits),
                        'benefits' => $benefits
                    ]);
                } catch (\Exception $e) {
                    return response()->json([
                        'success' => false,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ], 500);
                }
            });

            // Test route to check benefits table structure
            Route::get('/api/check-benefits-table', function () {
                try {
                    $benefits = \App\Models\Benefit::all();
                    
                    return response()->json([
                        'total_benefits' => count($benefits),
                        'benefits' => $benefits,
                        'table_structure' => [
                            'primary_key' => 'benefitID',
                            'fillable_fields' => ['benefitType', 'description', 'schedule'],
                            'relationships' => ['benefitClaims']
                        ]
                    ]);
                } catch (\Exception $e) {
                    return response()->json(['error' => $e->getMessage()], 500);
                }
            });

            // Test route to check all PWD members and their birth dates
            Route::get('/api/check-pwd-birthdays', function () {
                try {
                    $pwdMembers = \App\Models\PWDMember::all();
                    
                    $membersWithBirthdays = [];
                    foreach ($pwdMembers as $member) {
                        $birthDate = $member->birthDate;
                        $month = $birthDate ? $birthDate->format('n') : null; // 1-12
                        $quarter = $month ? ceil($month / 3) : null; // 1-4
                        
                        $membersWithBirthdays[] = [
                            'id' => $member->id,
                            'userID' => $member->userID,
                            'pwd_id' => $member->pwd_id,
                            'firstName' => $member->firstName,
                            'lastName' => $member->lastName,
                            'birthDate' => $birthDate ? $birthDate->format('Y-m-d') : null,
                            'birthMonth' => $month,
                            'quarter' => $quarter,
                            'age' => $birthDate ? $birthDate->age : null
                        ];
                    }
                    
                    return response()->json([
                        'total_members' => count($membersWithBirthdays),
                        'members' => $membersWithBirthdays,
                        'quarter_summary' => [
                            'Q1 (Jan-Mar)' => count(array_filter($membersWithBirthdays, fn($m) => $m['quarter'] == 1)),
                            'Q2 (Apr-Jun)' => count(array_filter($membersWithBirthdays, fn($m) => $m['quarter'] == 2)),
                            'Q3 (Jul-Sep)' => count(array_filter($membersWithBirthdays, fn($m) => $m['quarter'] == 3)),
                            'Q4 (Oct-Dec)' => count(array_filter($membersWithBirthdays, fn($m) => $m['quarter'] == 4)),
                            'No Birth Date' => count(array_filter($membersWithBirthdays, fn($m) => $m['birthDate'] === null))
                        ]
                    ]);
                } catch (\Exception $e) {
                    return response()->json(['error' => $e->getMessage()], 500);
                }
            });

            Route::post('/api/test-login', function (Request $request) {
                try {
                    $credentials = $request->only(['email', 'password']);
                    
                    if (\Illuminate\Support\Facades\Auth::attempt($credentials)) {
                        $user = \Illuminate\Support\Facades\Auth::user();
                        
                        return response()->json([
                            'login_successful' => true,
                            'user' => [
                                'userID' => $user->userID,
                                'email' => $user->email,
                                'role' => $user->role,
                                'status' => $user->status
                            ],
                            'redirect_to' => $user->role === 'PWDMember' ? '/pwd-dashboard' : '/admin-dashboard'
                        ]);
                    } else {
                        return response()->json([
                            'login_successful' => false,
                            'error' => 'Invalid credentials'
                        ], 401);
                    }

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Login failed',
                        'message' => $e->getMessage()
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
                            'status' => 'active',
                            'password_change_required' => true
                        ]);
                    }

                    // Generate unique PWD ID
                    $pwdId = 'PWD-' . str_pad($pwdUser->userID, 6, '0', STR_PAD_LEFT);

                    // Create PWD Member record
                    \App\Models\PWDMember::create([
                        'userID' => $pwdUser->userID,
                        'pwd_id' => $pwdId,
                        'pwd_id_generated_at' => now(),
                        'firstName' => $application->firstName,
                        'lastName' => $application->lastName,
                        'middleName' => $application->middleName,
                        'birthDate' => $application->birthDate,
                        'gender' => $application->gender,
                        'disabilityType' => $application->disabilityType,
                        'address' => $application->address,
                        'barangay' => $application->barangay,
                        'contactNumber' => $application->contactNumber,
                        'email' => $application->email,
                        'emergencyContact' => $application->emergencyContact,
                        'emergencyPhone' => $application->emergencyPhone,
                        'emergencyRelationship' => $application->emergencyRelationship
                    ]);

                    // Update application status
                    $application->update([
                        'status' => 'Approved',
                        'remarks' => 'Test approval - Account created',
                        'pwdID' => $pwdUser->userID
                    ]);

                    // Calculate card claim date (10 business days from approval)
                    $cardClaimDate = \Carbon\Carbon::now();
                    $businessDays = 0;
                    while ($businessDays < 10) {
                        $cardClaimDate->addDay();
                        if ($cardClaimDate->dayOfWeek !== \Carbon\Carbon::SATURDAY && $cardClaimDate->dayOfWeek !== \Carbon\Carbon::SUNDAY) {
                            $businessDays++;
                        }
                    }
                    $cardClaimDateFormatted = $cardClaimDate->format('F d, Y');

                    // Send email notification using SMTP
                    try {
                        \Illuminate\Support\Facades\Mail::send('emails.application-approved', [
                            'firstName' => $application->firstName,
                            'lastName' => $application->lastName,
                            'email' => $application->email,
                            'username' => $pwdUser->username,
                            'password' => $randomPassword,
                            'pwdId' => $pwdId,
                            'loginUrl' => config('app.frontend_url', 'http://localhost:3000') . '/login',
                            'cardClaimDate' => $cardClaimDateFormatted
                        ], function ($message) use ($application) {
                            $message->to($application->email)
                                   ->subject('PWD Application Approved - Welcome!')
                                   ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
                        });

                        $emailSent = true;
                    } catch (\Exception $mailError) {
                        $emailSent = false;
                        \Illuminate\Support\Facades\Log::error('Email sending failed: ' . $mailError->getMessage());
                    }

                    return response()->json([
                        'message' => '✅ ADMIN APPROVAL SUCCESSFUL!',
                        'details' => [
                            'application_approved' => true,
                            'user_account_created' => true,
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

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'Failed to approve application',
                        'message' => $e->getMessage()
                    ], 500);
                }
            });
            Route::get('/api/test-smtp/{email}', function ($email) {
                try {
                    // Use Laravel's Mail facade directly (SMTP only)
                    \Illuminate\Support\Facades\Mail::send('emails.application-approved', [
                        'firstName' => 'Test',
                        'lastName' => 'User',
                        'email' => $email,
                        'username' => $email,
                        'password' => 'test123',
                        'pwdId' => 'PWD-000001',
                        'loginUrl' => config('app.frontend_url', 'http://localhost:3000') . '/login'
                    ], function ($message) use ($email) {
                        $message->to($email)
                               ->subject('PWD Application Approved - Test')
                               ->from('sarinonhoelivan29@gmail.com', 'Cabuyao PDAO RMS');
                    });

                    return response()->json([
                        'message' => 'SMTP email sent successfully!',
                        'email' => $email,
                        'from' => 'sarinonhoelivan29@gmail.com',
                        'method' => 'SMTP'
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'error' => 'SMTP email failed',
                        'message' => $e->getMessage(),
                        'email' => $email
                    ], 500);
                }
            });

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
