<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Models\IDRenewal;
use App\Models\PWDMember;
use App\Models\Notification;
use App\Services\EmailService;
use Carbon\Carbon;

class IDRenewalController extends Controller
{
    /**
     * Submit a renewal request
     * Member must upload old ID card image and medical certificate
     */
    public function submitRenewal(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'old_card_image' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120', // 5MB max
            'medical_certificate' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120' // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $memberId = $request->user()->userID;
        $member = PWDMember::where('userID', $memberId)->first();

        if (!$member) {
            return response()->json([
                'success' => false,
                'message' => 'PWD Member not found'
            ], 404);
        }

        // Check if member has a claimed card
        if (!$member->cardClaimed) {
            return response()->json([
                'success' => false,
                'message' => 'You must have a claimed PWD ID card before renewing'
            ], 400);
        }

        // Check if there's already a pending renewal request
        $existingRenewal = IDRenewal::where('member_id', $memberId)
            ->where('status', 'pending')
            ->first();

        if ($existingRenewal) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a pending renewal request. Please wait for it to be reviewed.'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Store old card image
            $oldCardFile = $request->file('old_card_image');
            $oldCardPath = 'id-renewals/' . date('Y/m/d') . '/old-card_' . $memberId . '_' . time() . '.' . $oldCardFile->getClientOriginalExtension();
            $oldCardPath = $oldCardFile->storeAs('id-renewals/' . date('Y/m/d'), 'old-card_' . $memberId . '_' . time() . '.' . $oldCardFile->getClientOriginalExtension(), 'public');

            // Store medical certificate
            $medicalCertFile = $request->file('medical_certificate');
            $medicalCertPath = $medicalCertFile->storeAs('id-renewals/' . date('Y/m/d'), 'medical-cert_' . $memberId . '_' . time() . '.' . $medicalCertFile->getClientOriginalExtension(), 'public');

            // Create renewal request
            $renewal = IDRenewal::create([
                'member_id' => $memberId,
                'old_card_image_path' => $oldCardPath,
                'medical_certificate_path' => $medicalCertPath,
                'status' => 'pending',
                'submitted_at' => now()
            ]);

            // Create notification for admin (optional - can be added later)
            // For now, we'll just notify the member
            Notification::create([
                'user_id' => $memberId,
                'type' => 'renewal_submitted',
                'title' => 'Renewal Request Submitted',
                'message' => 'Your ID renewal request has been submitted successfully. Please wait for admin review.',
                'data' => [
                    'renewal_id' => $renewal->id,
                    'submitted_at' => $renewal->submitted_at
                ]
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Renewal request submitted successfully',
                'renewal' => $renewal->load('member')
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit renewal request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get renewal status for the authenticated member
     */
    public function getMyRenewalStatus(Request $request)
    {
        $memberId = $request->user()->userID;

        $renewal = IDRenewal::where('member_id', $memberId)
            ->with(['member', 'reviewer'])
            ->orderBy('submitted_at', 'desc')
            ->first();

        $member = PWDMember::where('userID', $memberId)->first();

        return response()->json([
            'success' => true,
            'renewal' => $renewal,
            'card_info' => [
                'card_claimed' => $member->cardClaimed ?? false,
                'card_issue_date' => $member->cardIssueDate ?? null,
                'card_expiration_date' => $member->cardExpirationDate ?? null,
                'days_until_expiration' => $member->cardExpirationDate ? Carbon::parse($member->cardExpirationDate)->diffInDays(Carbon::today()) : null,
                'is_expiring_soon' => $member->cardExpirationDate ? Carbon::parse($member->cardExpirationDate)->diffInDays(Carbon::today()) <= 30 : false
            ]
        ]);
    }

    /**
     * Get all renewal requests (Admin only)
     */
    public function getAllRenewals(Request $request)
    {
        $status = $request->query('status', 'all'); // all, pending, approved, rejected

        $query = IDRenewal::with(['member', 'reviewer']);

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $renewals = $query->orderBy('submitted_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'renewals' => $renewals,
            'counts' => [
                'total' => IDRenewal::count(),
                'pending' => IDRenewal::where('status', 'pending')->count(),
                'approved' => IDRenewal::where('status', 'approved')->count(),
                'rejected' => IDRenewal::where('status', 'rejected')->count()
            ]
        ]);
    }

    /**
     * Get a specific renewal request (Admin)
     */
    public function getRenewal($id)
    {
        $renewal = IDRenewal::with(['member', 'reviewer'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'renewal' => $renewal
        ]);
    }

    /**
     * Approve a renewal request (Admin)
     */
    public function approveRenewal(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $renewal = IDRenewal::with(['member', 'member.user'])->findOrFail($id);

        if ($renewal->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'This renewal request has already been processed'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $member = $renewal->member;
            $adminId = $request->user()->userID;

            // Update renewal status
            $renewal->update([
                'status' => 'approved',
                'reviewed_by' => $adminId,
                'reviewed_at' => now(),
                'notes' => $request->notes
            ]);

            // Renew the card - set new expiration date (3 years from now)
            $newExpirationDate = now()->addYears(3);
            $member->update([
                'cardExpirationDate' => $newExpirationDate,
                'cardIssueDate' => now() // Update issue date to renewal date
            ]);

            // Notify the member
            Notification::create([
                'user_id' => $member->userID,
                'type' => 'renewal_approved',
                'title' => 'ID Renewal Approved',
                'message' => 'Your ID renewal request has been approved. Your new card expiration date is ' . $newExpirationDate->format('F d, Y') . '.',
                'data' => [
                    'renewal_id' => $renewal->id,
                    'new_expiration_date' => $newExpirationDate->toDateString()
                ]
            ]);

            // Send email notification to the member
            try {
                // Get member's email (try from member first, then from user relationship)
                $memberEmail = $member->email;
                if (empty($memberEmail) && $member->user) {
                    $memberEmail = $member->user->email;
                }

                if (!empty($memberEmail)) {
                    $emailService = new EmailService();
                    $emailService->sendRenewalApprovalEmail([
                        'email' => $memberEmail,
                        'firstName' => $member->firstName,
                        'lastName' => $member->lastName,
                        'pwdId' => $member->pwd_id ?? 'N/A',
                        'newExpirationDate' => $newExpirationDate->format('F d, Y'),
                        'renewalDate' => now()->format('F d, Y'),
                        'notes' => $request->notes ?? ''
                    ]);
                }
            } catch (\Exception $emailException) {
                // Log email error but don't fail the approval
                \Illuminate\Support\Facades\Log::warning('Failed to send renewal approval email', [
                    'member_id' => $member->id,
                    'error' => $emailException->getMessage()
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Renewal approved successfully',
                'renewal' => $renewal->fresh(['member', 'reviewer'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve renewal',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject a renewal request (Admin)
     */
    public function rejectRenewal(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'notes' => 'required|string|max:1000'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $renewal = IDRenewal::with('member')->findOrFail($id);

        if ($renewal->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'This renewal request has already been processed'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $adminId = $request->user()->userID;

            // Update renewal status
            $renewal->update([
                'status' => 'rejected',
                'reviewed_by' => $adminId,
                'reviewed_at' => now(),
                'notes' => $request->notes
            ]);

            // Notify the member
            Notification::create([
                'user_id' => $renewal->member->userID,
                'type' => 'renewal_rejected',
                'title' => 'ID Renewal Rejected',
                'message' => 'Your ID renewal request has been rejected. Reason: ' . $request->notes . '. Please review the requirements and submit a new request.',
                'data' => [
                    'renewal_id' => $renewal->id,
                    'rejection_reason' => $request->notes
                ]
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Renewal rejected',
                'renewal' => $renewal->fresh(['member', 'reviewer'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject renewal',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get file for download (old card image or medical certificate)
     */
    public function getFile($id, $type)
    {
        $renewal = IDRenewal::findOrFail($id);
        
        if (!in_array($type, ['old_card', 'medical_certificate'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file type'
            ], 400);
        }

        $filePath = $type === 'old_card' ? $renewal->old_card_image_path : $renewal->medical_certificate_path;

        if (!$filePath || !Storage::disk('public')->exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found'
            ], 404);
        }

        return Storage::disk('public')->download($filePath);
    }
}
