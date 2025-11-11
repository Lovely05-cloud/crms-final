<?php
// app/Http/Controllers/API/BenefitClaimController.php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BenefitClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BenefitClaimController extends Controller
{
    public function index()
    {
        $claims = BenefitClaim::with('pwdMember.user', 'benefit')->get();
        return response()->json($claims);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pwdID' => 'required|exists:pwd_members,userID',
            'benefitID' => 'required|exists:benefits,benefitID',
            'claimDate' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $claim = BenefitClaim::create([
            'pwdID' => $request->pwdID,
            'benefitID' => $request->benefitID,
            'claimDate' => $request->claimDate,
            'status' => 'Unclaimed',
        ]);

        return response()->json($claim->load('pwdMember.user', 'benefit'), 201);
    }

    public function show($id)
    {
        $claim = BenefitClaim::with('pwdMember.user', 'benefit')->find($id);
        
        if (!$claim) {
            return response()->json(['message' => 'Benefit claim not found'], 404);
        }
        
        return response()->json($claim);
    }

    public function update(Request $request, $id)
    {
        $claim = BenefitClaim::find($id);
        
        if (!$claim) {
            return response()->json(['message' => 'Benefit claim not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'claimDate' => 'sometimes|required|date',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $claim->update($request->only(['claimDate']));

        return response()->json($claim->load('pwdMember.user', 'benefit'));
    }

    public function destroy($id)
    {
        $claim = BenefitClaim::find($id);
        
        if (!$claim) {
            return response()->json(['message' => 'Benefit claim not found'], 404);
        }

        $claim->delete();

        return response()->json(['message' => 'Benefit claim deleted successfully']);
    }

    public function updateStatus(Request $request, $id)
    {
        $claim = BenefitClaim::find($id);
        
        if (!$claim) {
            return response()->json(['message' => 'Benefit claim not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Claimed,Unclaimed',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 400);
        }

        $claim->update(['status' => $request->status]);

        return response()->json($claim->load('pwdMember.user', 'benefit'));
    }

    /**
     * Handle QR scan claim benefits with claimant information
     */
    public function claimBenefits(Request $request)
    {
        try {
            \Illuminate\Support\Facades\Log::info('QR scan claim benefits request', [
                'request_data' => $request->except(['authorizationLetter']),
                'has_file' => $request->hasFile('authorizationLetter'),
                'content_type' => $request->header('Content-Type'),
            ]);

            // Validate required fields
            $validator = Validator::make($request->all(), [
                'memberId' => 'required',
                'pwdId' => 'required',
                'qrCodeHash' => 'nullable', // Make optional for now, can verify later if needed
                'claimantType' => 'required|in:Member,Guardian,Others',
                'claimantName' => 'required_if:claimantType,Others',
                'claimantRelation' => 'required_if:claimantType,Others',
                'authorizationLetter' => 'nullable|file|image|mimes:jpeg,jpg,png,pdf|max:10240',
                'benefitID' => 'sometimes',
            ]);

            if ($validator->fails()) {
                \Illuminate\Support\Facades\Log::error('QR scan claim benefits validation failed', [
                    'errors' => $validator->errors()->toArray()
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Validation failed: ' . $validator->errors()->first(),
                    'errors' => $validator->errors()
                ], 400);
            }

            // Find the PWD member - try multiple lookup strategies
            $member = null;
            
            // Try to find by userID first (most reliable)
            if ($request->memberId) {
                // Check if memberId looks like a pwd_id (starts with "PWD-")
                if (strpos($request->memberId, 'PWD-') === 0) {
                    // memberId is actually a pwd_id, try finding by pwd_id
                    $member = \App\Models\PWDMember::where('pwd_id', $request->memberId)->first();
                } else {
                    // memberId is likely a userID, try finding by userID
                    $member = \App\Models\PWDMember::where('userID', $request->memberId)->first();
                }
            }
            
            // If not found, try by pwd_id field using memberId (if it looks like a pwd_id)
            if (!$member && $request->memberId && strpos($request->memberId, 'PWD-') === 0) {
                $member = \App\Models\PWDMember::where('pwd_id', $request->memberId)->first();
            }
            
            // If not found, try by pwd_id field using pwdId (if it's not "PWD-undefined")
            if (!$member && $request->pwdId && $request->pwdId !== 'PWD-undefined' && strpos($request->pwdId, 'PWD-') === 0) {
                $member = \App\Models\PWDMember::where('pwd_id', $request->pwdId)->first();
            }
            
            // If not found, try by database id (pwdId might be the database id, if it's numeric)
            if (!$member && $request->pwdId && $request->pwdId !== 'PWD-undefined' && is_numeric($request->pwdId)) {
                $member = \App\Models\PWDMember::find($request->pwdId);
            }
            
            // If still not found, try by pwd_id field using pwdId (any format)
            if (!$member && $request->pwdId && $request->pwdId !== 'PWD-undefined') {
                $member = \App\Models\PWDMember::where('pwd_id', $request->pwdId)->first();
            }
            
            // Last resort: try by memberId as database id (if it's numeric)
            if (!$member && $request->memberId && is_numeric($request->memberId)) {
                $member = \App\Models\PWDMember::find($request->memberId);
            }

            if (!$member) {
                \Illuminate\Support\Facades\Log::error('PWD member not found in claim benefits', [
                    'memberId' => $request->memberId,
                    'pwdId' => $request->pwdId,
                    'request_data' => $request->except(['authorizationLetter'])
                ]);
                
                return response()->json([
                    'success' => false,
                    'error' => 'PWD member not found',
                    'debug' => [
                        'memberId_received' => $request->memberId,
                        'pwdId_received' => $request->pwdId
                    ]
                ], 404);
            }
            
            \Illuminate\Support\Facades\Log::info('PWD member found in claim benefits', [
                'member_id' => $member->userID,
                'pwd_id' => $member->pwd_id,
                'memberId_received' => $request->memberId,
                'pwdId_received' => $request->pwdId
            ]);

            // Verify QR code hash if provided and member has one
            if ($request->has('qrCodeHash') && $request->qrCodeHash && $member->qr_code_hash) {
                if ($member->qr_code_hash !== $request->qrCodeHash) {
                    \Illuminate\Support\Facades\Log::warning('QR code hash mismatch', [
                        'member_id' => $member->userID,
                        'expected' => $member->qr_code_hash,
                        'received' => $request->qrCodeHash
                    ]);
                    // Don't fail, just log - QR codes might not always have hash
                }
            }

            // Handle authorization letter upload if provided
            $authorizationLetterPath = null;
            if ($request->hasFile('authorizationLetter')) {
                $file = $request->file('authorizationLetter');
                $fileName = 'authorization_' . time() . '_' . $member->userID . '.' . $file->getClientOriginalExtension();
                $authorizationLetterPath = $file->storeAs('authorization_letters', $fileName, 'public');
            }

            // Get active benefits
            $benefits = [];
            if ($request->has('benefitID')) {
                // Claim specific benefit - benefit table only has 'id' column, not 'benefitID'
                $benefit = \App\Models\Benefit::where('id', $request->benefitID)->first();
                if ($benefit && $benefit->status === 'Active') {
                    $benefits[] = $benefit;
                }
            } else {
                // Claim all eligible active benefits
                $benefits = \App\Models\Benefit::where('status', 'Active')->get();
            }

            if (empty($benefits)) {
                return response()->json([
                    'success' => false,
                    'error' => 'No active benefits found to claim'
                ], 404);
            }

            $claimsCreated = [];
            foreach ($benefits as $benefit) {
                // Benefit table only has 'id' column, not 'benefitID'
                $benefitId = $benefit->id;
                
                // Check if claim already exists
                $existingClaim = BenefitClaim::where('pwdID', $member->userID)
                    ->where('benefitID', $benefitId)
                    ->first();

                if (!$existingClaim) {
                    $claim = BenefitClaim::create([
                        'pwdID' => $member->userID,
                        'benefitID' => $benefitId,
                        'claimDate' => now(),
                        'status' => 'Claimed',
                        'claimantType' => $request->claimantType,
                        'claimantName' => $request->claimantName,
                        'claimantRelation' => $request->claimantRelation,
                        'authorizationLetter' => $authorizationLetterPath,
                    ]);
                    $claimsCreated[] = $claim;
                } else {
                    // Update existing claim
                    $existingClaim->update([
                        'status' => 'Claimed',
                        'claimDate' => now(),
                        'claimantType' => $request->claimantType,
                        'claimantName' => $request->claimantName,
                        'claimantRelation' => $request->claimantRelation,
                        'authorizationLetter' => $authorizationLetterPath ?: $existingClaim->authorizationLetter,
                    ]);
                    $claimsCreated[] = $existingClaim;
                }
            }

            // Convert benefits to array format
            $benefitsArray = collect($benefits)->map(function($b) {
                return [
                    'id' => $b->id, // Benefit table only has 'id' column
                    'title' => $b->title ?? $b->type ?? 'Benefit',
                    'type' => $b->type ?? 'N/A',
                    'amount' => $b->amount ?? 0
                ];
            })->toArray();

            return response()->json([
                'success' => true,
                'benefitsClaimed' => count($claimsCreated),
                'benefits' => $benefitsArray,
                'member' => [
                    'userID' => $member->userID,
                    'firstName' => $member->firstName,
                    'lastName' => $member->lastName,
                    'pwd_id' => $member->pwd_id
                ],
                'claimantType' => $request->claimantType,
                'claimantName' => $request->claimantName,
                'claimantRelation' => $request->claimantRelation,
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('QR scan claim benefits error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to claim benefits: ' . $e->getMessage()
            ], 500);
        }
    }
}