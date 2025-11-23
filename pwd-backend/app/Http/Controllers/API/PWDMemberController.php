<?php
// app/Http/Controllers/API/PWDMemberController.php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PWDMember;
use Illuminate\Http\Request;

class PWDMemberController extends Controller
{
    public function index()
    {
        try {
            // Optimize query: only select needed columns and use eager loading if needed
            // Exclude archived members from normal listing
            $members = PWDMember::select([
                'id',
                'userID',
                'pwd_id',
                'pwd_id_generated_at',
                'firstName',
                'lastName',
                'middleName',
                'suffix',
                'birthDate',
                'gender',
                'disabilityType',
                'address',
                'contactNumber',
                'email',
                'barangay',
                'emergencyContact',
                'emergencyPhone',
                'emergencyRelationship',
                'status',
                'cardClaimed',
                'cardIssueDate',
                'cardExpirationDate',
                'created_at',
                'updated_at'
            ])->whereNull('archived_at')->get();
            
            // Enhance members with data from approved applications if available
            $enhancedMembers = $members->map(function ($member) {
                // Get contact number and emergency contact from approved application as fallback
                $approvedApplication = \App\Models\Application::where('pwdID', $member->userID)
                    ->where('status', 'Approved')
                    ->latest()
                    ->first();
                
                if ($approvedApplication) {
                    // Use application data as fallback if member data is missing
                    if (empty($member->contactNumber) && !empty($approvedApplication->contactNumber)) {
                        $member->contactNumber = $approvedApplication->contactNumber;
                    }
                    if (empty($member->emergencyContact) && !empty($approvedApplication->emergencyContact)) {
                        $member->emergencyContact = $approvedApplication->emergencyContact;
                    }
                }
                
                return $member;
            });
            
            return response()->json([
                'success' => true,
                'data' => $enhancedMembers,
                'count' => $enhancedMembers->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        // This is handled in UserController since PWDMember is created along with User
        return response()->json(['message' => 'Use /api/users endpoint to create PWD members'], 400);
    }

    public function show($id)
    {
        $member = PWDMember::with('user')->find($id);
        
        if (!$member) {
            return response()->json(['message' => 'PWD Member not found'], 404);
        }
        
        return response()->json($member);
    }

    public function update(Request $request, $id)
    {
        // This is handled in UserController since PWDMember is updated along with User
        return response()->json(['message' => 'Use /api/users endpoint to update PWD members'], 400);
    }

    public function destroy($id)
    {
        // This is handled in UserController since PWDMember is deleted along with User
        return response()->json(['message' => 'Use /api/users endpoint to delete PWD members'], 400);
    }

    public function getApplications($id)
    {
        $member = PWDMember::with('applications')->find($id);
        
        if (!$member) {
            return response()->json(['message' => 'PWD Member not found'], 404);
        }
        
        return response()->json($member->applications);
    }

    public function getComplaints($id)
    {
        $member = PWDMember::with('complaints')->find($id);
        
        if (!$member) {
            return response()->json(['message' => 'PWD Member not found'], 404);
        }
        
        return response()->json($member->complaints);
    }

    public function getBenefitClaims($id)
    {
        $member = PWDMember::with('benefitClaims.benefit')->find($id);
        
        if (!$member) {
            return response()->json(['message' => 'PWD Member not found'], 404);
        }
        
        return response()->json($member->benefitClaims);
    }

    /**
     * Claim PWD card
     */
    public function claimCard(Request $request, $id)
    {
        try {
            // Try to find member by database id first
            $member = PWDMember::find($id);
            
            // If not found, try by userID (memberId might be userID)
            if (!$member) {
                $member = PWDMember::where('userID', $id)->first();
            }
            
            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'PWD Member not found'
                ], 404);
            }

            if ($member->cardClaimed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Card has already been claimed'
                ], 400);
            }

            // Set card as claimed
            $issueDate = now();
            $expirationDate = now()->addYears(3); // 3 years validity

            $member->update([
                'cardClaimed' => true,
                'cardIssueDate' => $issueDate,
                'cardExpirationDate' => $expirationDate
            ]);

            // Create notification for the member (wrap in try-catch to prevent failure)
            try {
                \App\Models\Notification::create([
                    'user_id' => $member->userID,
                    'type' => 'card_claimed',
                    'title' => 'PWD Card Claimed',
                    'message' => 'Your PWD ID card has been successfully claimed. Card expires on ' . $expirationDate->format('F d, Y') . '.',
                    'data' => [
                        'member_id' => $member->id,
                        'card_issue_date' => $issueDate->toDateString(),
                        'card_expiration_date' => $expirationDate->toDateString()
                    ],
                    'is_read' => false
                ]);
            } catch (\Exception $notificationError) {
                // Log notification error but don't fail the card claim
                \Illuminate\Support\Facades\Log::warning('Failed to create notification for card claim', [
                    'member_id' => $member->id,
                    'error' => $notificationError->getMessage()
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Card claimed successfully',
                'data' => $member->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to claim card',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Renew PWD card
     */
    public function renewCard(Request $request, $id)
    {
        try {
            $member = PWDMember::find($id);
            
            if (!$member) {
                return response()->json([
                    'success' => false,
                    'message' => 'PWD Member not found'
                ], 404);
            }

            if (!$member->cardClaimed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Card must be claimed before it can be renewed'
                ], 400);
            }

            // Renew card - set new expiration date (3 years from now)
            $newExpirationDate = now()->addYears(3);
            $member->update([
                'cardExpirationDate' => $newExpirationDate,
                'cardIssueDate' => now() // Update issue date to renewal date
            ]);

            // Create notification for the member
            \App\Models\Notification::create([
                'user_id' => $member->userID,
                'type' => 'card_renewed',
                'title' => 'PWD Card Renewed',
                'message' => 'Your PWD ID card has been successfully renewed. New expiration date: ' . $newExpirationDate->format('F d, Y') . '.',
                'data' => [
                    'member_id' => $member->id,
                    'card_renewal_date' => now()->toDateString(),
                    'card_expiration_date' => $newExpirationDate->toDateString()
                ]
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Card renewed successfully',
                'data' => $member->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to renew card',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get archived members (expired ID cards)
     */
    public function archived(Request $request)
    {
        try {
             // Get all archived members
            $members = PWDMember::select([
                'id',
                'userID',
                'pwd_id',
                'pwd_id_generated_at',
                'firstName',
                'lastName',
                'middleName',
                'suffix',
                'birthDate',
                'gender',
                'disabilityType',
                'address',
                'contactNumber',
                'email',
                'barangay',
                'emergencyContact',
                'emergencyPhone',
                'emergencyRelationship',
                'status',
                'cardClaimed',
                'cardIssueDate',
                'cardExpirationDate',
                'archived_at',
                'created_at',
                'updated_at'
            ])->whereNotNull('archived_at')
              ->orderBy('archived_at', 'desc')
              ->get();
            
            // Get all userIDs for batch query
            $userIDs = $members->pluck('userID')->filter()->unique()->toArray();
            
            // Fetch all approved applications in one query to avoid N+1
            $applications = \App\Models\Application::whereIn('pwdID', $userIDs)
                ->where('status', 'Approved')
                ->get()
                ->groupBy('pwdID')
                ->map(function ($apps) {
                    return $apps->first(); // Get the latest approved application
                });
            
            // Enhance members with data from approved applications if available
            $enhancedMembers = $members->map(function ($member) use ($applications) {
                $approvedApplication = $applications->get($member->userID);
                
                if ($approvedApplication) {
                    // Use application data as fallback if member data is missing
                    if (empty($member->contactNumber) && !empty($approvedApplication->contactNumber)) {
                        $member->contactNumber = $approvedApplication->contactNumber;
                    }
                    if (empty($member->emergencyContact) && !empty($approvedApplication->emergencyContact)) {
                        $member->emergencyContact = $approvedApplication->emergencyContact;
                    }
                }
                
                return $member;
            });
            
            return response()->json([
                'success' => true,
                'data' => $enhancedMembers->values(), // Reset array keys
                'count' => $enhancedMembers->count()
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error fetching archived members', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch archived members: ' . $e->getMessage()
            ], 500);
        }
    }
}