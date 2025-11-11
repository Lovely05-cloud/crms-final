<?php

namespace App\Services;

use App\Models\PWDMember;
use Illuminate\Support\Facades\Log;

class QRCodeGenerator
{
    /**
     * Generate QR code data for a PWD member
     *
     * @param PWDMember $pwdMember
     * @param bool $forceRegenerate Force regeneration even if QR code exists
     * @return string JSON encoded QR code data
     */
    public static function generateQRData(PWDMember $pwdMember, bool $forceRegenerate = false): string
    {
        try {
            // If QR code already exists and we're not forcing regeneration, check if it needs updating
            if (!$forceRegenerate && !empty($pwdMember->qr_code_data)) {
                try {
                    // Check if the stored QR code has validUntil field (old format) - if so, regenerate it
                    $existingData = json_decode($pwdMember->qr_code_data, true);
                    if ($existingData && isset($existingData['validUntil'])) {
                        // Old format with expiration - regenerate without it
                        Log::info("Regenerating QR code for member {$pwdMember->pwd_id} to remove expiration");
                        // Continue to regenerate below
                    } else {
                        // QR code is in new format without expiration - return as is
                        return $pwdMember->qr_code_data;
                    }
                } catch (\Exception $e) {
                    // If parsing fails, regenerate the QR code
                    Log::warning("Failed to parse QR code data for member {$pwdMember->pwd_id}, regenerating: " . $e->getMessage());
                    // Continue to regenerate below
                }
            }
            
            // Get barangay from application
            $application = $pwdMember->applications()->where('status', 'Approved')->first();
            $barangay = $application ? $application->barangay : ($pwdMember->barangay ?? 'Unknown');
            $emergencyContact = $application ? $application->emergencyContact : ($pwdMember->emergencyContact ?? null);
            
            // Use stored issuedDate if it exists, otherwise use current time
            $issuedDate = $pwdMember->qr_code_generated_at 
                ? $pwdMember->qr_code_generated_at->toISOString() 
                : now()->toISOString();
            
            // QR codes for benefit claims do not expire - they are permanent and unique per member
            // No validUntil field needed
            
            $qrData = [
                'type' => 'PWD_BENEFIT_CLAIM',
                'version' => '1.0',
                'pwdId' => $pwdMember->id,
                'memberId' => $pwdMember->userID,
                'userID' => $pwdMember->userID,
                'pwd_id' => $pwdMember->pwd_id,
                'name' => trim($pwdMember->firstName . ' ' . $pwdMember->lastName),
                'firstName' => $pwdMember->firstName,
                'middleName' => $pwdMember->middleName ?? '',
                'lastName' => $pwdMember->lastName,
                'birthDate' => $pwdMember->birthDate ? $pwdMember->birthDate->format('Y-m-d') : null,
                'barangay' => $barangay,
                'disabilityType' => $pwdMember->disabilityType,
                'contactNumber' => $pwdMember->contactNumber,
                'emergencyContact' => $emergencyContact,
                'issuedDate' => $issuedDate,
                'generatedAt' => $issuedDate, // For backward compatibility
                'qrVersion' => '1.0' // For future compatibility
            ];
            
            return json_encode($qrData, JSON_UNESCAPED_UNICODE);
            
        } catch (\Exception $e) {
            Log::error('QR Code generation failed: ' . $e->getMessage());
            throw new \Exception('Failed to generate QR code data');
        }
    }
    
    /**
     * Generate and store QR code data for a PWD member
     * Only generates if QR code doesn't exist yet
     *
     * @param PWDMember $pwdMember
     * @param bool $forceRegenerate Force regeneration even if QR code exists
     * @return string The generated QR code data
     */
    public static function generateAndStore(PWDMember $pwdMember, bool $forceRegenerate = false): string
    {
        try {
            // If QR code already exists and we're not forcing regeneration, check if it needs updating
            if (!$forceRegenerate && self::hasQRCode($pwdMember)) {
                // Check if the stored QR code has validUntil field (old format) - if so, regenerate it
                try {
                    $existingData = json_decode($pwdMember->qr_code_data, true);
                    if ($existingData && isset($existingData['validUntil'])) {
                        // Old format with expiration - regenerate without it
                        Log::info("Regenerating QR code for member {$pwdMember->pwd_id} to remove expiration during store");
                        // Continue to regenerate below
                    } else {
                        // QR code is in new format without expiration - return as is
                        return $pwdMember->qr_code_data;
                    }
                } catch (\Exception $e) {
                    // If parsing fails, regenerate the QR code
                    Log::warning("Failed to parse QR code data for member {$pwdMember->pwd_id} during store, regenerating: " . $e->getMessage());
                    // Continue to regenerate below
                }
            }
            
            // Generate QR code data (will use stored issuedDate if exists)
            $qrData = self::generateQRData($pwdMember, $forceRegenerate);
            
            // Only update generated_at if it doesn't exist (preserve original generation date)
            $updateData = ['qr_code_data' => $qrData];
            if (empty($pwdMember->qr_code_generated_at)) {
                $updateData['qr_code_generated_at'] = now();
            }
            
            // Update the PWD member with QR code data
            $pwdMember->update($updateData);
            
            Log::info("QR code generated for PWD member: {$pwdMember->pwd_id}");
            
            return $qrData;
            
        } catch (\Exception $e) {
            Log::error('QR Code storage failed: ' . $e->getMessage());
            throw new \Exception('Failed to generate and store QR code');
        }
    }
    
    /**
     * Validate QR code data
     *
     * @param string $qrData
     * @return bool
     */
    public static function validateQRData(string $qrData): bool
    {
        try {
            $data = json_decode($qrData, true);
            
            if (!$data || !is_array($data)) {
                return false;
            }
            
            // Check required fields
            $requiredFields = ['pwdId', 'userID', 'pwd_id', 'firstName', 'lastName'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return false;
                }
            }
            
            // QR codes for benefit claims do not expire - they are permanent and unique per member
            // No expiration check needed
            
            return true;
            
        } catch (\Exception $e) {
            Log::error('QR Code validation failed: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get QR code data for a PWD member
     *
     * @param PWDMember $pwdMember
     * @return string|null
     */
    public static function getQRData(PWDMember $pwdMember): ?string
    {
        return $pwdMember->qr_code_data;
    }
    
    /**
     * Check if QR code exists for a PWD member
     *
     * @param PWDMember $pwdMember
     * @return bool
     */
    public static function hasQRCode(PWDMember $pwdMember): bool
    {
        return !empty($pwdMember->qr_code_data) && !empty($pwdMember->qr_code_generated_at);
    }
}
