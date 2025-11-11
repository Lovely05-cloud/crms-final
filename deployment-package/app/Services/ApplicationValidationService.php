<?php

namespace App\Services;

use App\Models\Application;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ApplicationValidationService
{
    /**
     * Check for duplicate applications based on multiple criteria
     */
    public function checkForDuplicates($data, $excludeApplicationId = null)
    {
        $duplicates = [];
        
        // Check email duplicates (only if email is provided)
        if (isset($data['email']) && !empty($data['email'])) {
            $emailDuplicate = $this->checkEmailDuplicate($data['email'], $excludeApplicationId);
            if ($emailDuplicate) {
                $duplicates['email'] = $emailDuplicate;
            }
        }
        
        // Check phone number duplicates (accept either key from request)
        $incomingPhone = $data['phoneNumber'] ?? ($data['contactNumber'] ?? null);
        if (!empty($incomingPhone)) {
            $phoneDuplicate = $this->checkPhoneDuplicate($incomingPhone, $excludeApplicationId);
            if ($phoneDuplicate) {
                $duplicates['phoneNumber'] = $phoneDuplicate;
            }
        }
        
        // Check name + birth date combination (accept either key from request)
        $incomingDob = $data['dateOfBirth'] ?? ($data['birthDate'] ?? null);
        if (isset($data['firstName']) && isset($data['lastName']) && !empty($incomingDob)) {
            $nameBirthDuplicate = $this->checkNameBirthDuplicate(
                $data['firstName'], 
                $data['lastName'], 
                $incomingDob, 
                $excludeApplicationId
            );
            if ($nameBirthDuplicate) {
                $duplicates['name_birth'] = $nameBirthDuplicate;
            }
        }
        
        // Check ID number duplicates (if provided)
        if (isset($data['idNumber'])) {
            $idDuplicate = $this->checkIdNumberDuplicate($data['idNumber'], $excludeApplicationId);
            if ($idDuplicate) {
                $duplicates['idNumber'] = $idDuplicate;
            }
        }
        
        return $duplicates;
    }
    
    /**
     * Check for email duplicates
     */
    private function checkEmailDuplicate($email, $excludeApplicationId = null)
    {
        $query = Application::where('email', $email);
        
        if ($excludeApplicationId) {
            $query->where('applicationID', '!=', $excludeApplicationId);
        }
        
        $duplicate = $query->first();
        
        if ($duplicate) {
            return [
                'type' => 'email',
                'message' => 'An application with this email address already exists.',
                'existing_application' => [
                    'id' => $duplicate->applicationID,
                    'name' => $duplicate->firstName . ' ' . $duplicate->lastName,
                    'email' => $duplicate->email,
                    'status' => $duplicate->status,
                    'submission_date' => $duplicate->submissionDate,
                    'created_at' => $duplicate->created_at
                ]
            ];
        }
        
        // Also check if user account already exists
        $existingUser = User::where('email', $email)->where('role', 'PWDMember')->first();
        if ($existingUser) {
            return [
                'type' => 'email',
                'message' => 'A PWD member account with this email address already exists.',
                'existing_user' => [
                    'id' => $existingUser->userID,
                    'email' => $existingUser->email,
                    'role' => $existingUser->role,
                    'status' => $existingUser->status,
                    'created_at' => $existingUser->created_at
                ]
            ];
        }
        
        return null;
    }
    
    /**
     * Check for phone number duplicates
     */
    private function checkPhoneDuplicate($phoneNumber, $excludeApplicationId = null)
    {
        // Database column is contactNumber
        $query = Application::where('contactNumber', $phoneNumber);
        
        if ($excludeApplicationId) {
            $query->where('applicationID', '!=', $excludeApplicationId);
        }
        
        $duplicate = $query->first();
        
        if ($duplicate) {
            return [
                'type' => 'phone',
                'message' => 'An application with this phone number already exists.',
                'existing_application' => [
                    'id' => $duplicate->applicationID,
                    'name' => $duplicate->firstName . ' ' . $duplicate->lastName,
                    'phone' => $duplicate->phoneNumber,
                    'status' => $duplicate->status,
                    'submission_date' => $duplicate->submissionDate,
                    'created_at' => $duplicate->created_at
                ]
            ];
        }
        
        return null;
    }
    
    /**
     * Check for name + birth date combination duplicates
     */
    private function checkNameBirthDuplicate($firstName, $lastName, $dateOfBirth, $excludeApplicationId = null)
    {
        // Database column is birthDate
        $query = Application::where('firstName', $firstName)
            ->where('lastName', $lastName)
            ->where('birthDate', $dateOfBirth);
        
        if ($excludeApplicationId) {
            $query->where('applicationID', '!=', $excludeApplicationId);
        }
        
        $duplicate = $query->first();
        
        if ($duplicate) {
            return [
                'type' => 'name_birth',
                'message' => 'An application with the same name and date of birth already exists.',
                'existing_application' => [
                    'id' => $duplicate->applicationID,
                    'name' => $duplicate->firstName . ' ' . $duplicate->lastName,
                    'date_of_birth' => $duplicate->dateOfBirth,
                    'status' => $duplicate->status,
                    'submission_date' => $duplicate->submissionDate,
                    'created_at' => $duplicate->created_at
                ]
            ];
        }
        
        return null;
    }
    
    /**
     * Check for ID number duplicates
     */
    private function checkIdNumberDuplicate($idNumber, $excludeApplicationId = null)
    {
        $query = Application::where('idNumber', $idNumber);
        
        if ($excludeApplicationId) {
            $query->where('applicationID', '!=', $excludeApplicationId);
        }
        
        $duplicate = $query->first();
        
        if ($duplicate) {
            return [
                'type' => 'id_number',
                'message' => 'An application with this ID number already exists.',
                'existing_application' => [
                    'id' => $duplicate->applicationID,
                    'name' => $duplicate->firstName . ' ' . $duplicate->lastName,
                    'id_number' => $duplicate->idNumber,
                    'status' => $duplicate->status,
                    'submission_date' => $duplicate->submissionDate,
                    'created_at' => $duplicate->created_at
                ]
            ];
        }
        
        return null;
    }
    
    /**
     * Get validation rules with duplicate checks
     */
    public function getValidationRules($excludeApplicationId = null)
    {
        return [
            'firstName' => 'required|string|max:50',
            'lastName' => 'required|string|max:50',
            'middleName' => 'nullable|string|max:50',
            'suffix' => 'nullable|string|in:,Jr.,Sr.,I,II,III',
            'email' => [
                'required',
                'email',
                'max:100',
                new \App\Rules\NoDuplicateApplication('email', $excludeApplicationId)
            ],
            'phoneNumber' => [
                'required',
                'string',
                'max:20',
                new \App\Rules\NoDuplicateApplication('phoneNumber', $excludeApplicationId)
            ],
            'dateOfBirth' => 'required|date|before:today',
            'gender' => 'required|string|max:10',
            'civilStatus' => 'required|string|max:20',
            'nationality' => 'required|string|max:50',
            'disabilityType' => 'required|string|max:100',
            'disabilityCause' => 'nullable|string|max:200',
            'disabilityDate' => 'nullable|date|before:today|before:' . date('Y-m-d', strtotime('-14 days')),
            'address' => 'required|string|max:500',
            'barangay' => 'required|string|max:100',
            'city' => 'required|string|max:100',
            'province' => 'required|string|max:100',
            'postalCode' => 'required|string|max:10',
            'emergencyContact' => 'required|string|max:100',
            'emergencyPhone' => 'required|string|max:20',
            'emergencyRelationship' => 'required|string|in:Parent,Sibling,Spouse,Child,Friend,Colleague,Relative,Guardian,Other',
            // Document validation rules
            'medicalCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048',
            'clinicalAbstract' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048',
            'voterCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048',
            'idPictures' => 'nullable|file|mimes:jpeg,png,jpg|max:15360', // Changed to single file (standardized)
            'birthCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048',
            'wholeBodyPicture' => 'nullable|file|mimes:jpeg,png,jpg|max:2048',
            'affidavit' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048',
            'barangayCertificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:2048',
        ];
    }
    
    /**
     * Get custom validation messages
     */
    public function getValidationMessages()
    {
        return [
            'firstName.required' => 'First name is required.',
            'lastName.required' => 'Last name is required.',
            'middleName.required' => 'Middle name is required.',
            'suffix.in' => 'Please select a valid suffix option.',
            'email.required' => 'Email address is required.',
            'email.email' => 'Please enter a valid email address.',
            'email.unique' => 'An application with this email address already exists.',
            'phoneNumber.required' => 'Phone number is required.',
            'dateOfBirth.required' => 'Date of birth is required.',
            'dateOfBirth.before' => 'Date of birth must be in the past.',
            'gender.required' => 'Gender is required.',
            'civilStatus.required' => 'Civil status is required.',
            'nationality.required' => 'Nationality is required.',
            'disabilityType.required' => 'Type of disability is required.',
            'address.required' => 'Address is required.',
            'barangay.required' => 'Barangay is required.',
            'city.required' => 'City is required.',
            'province.required' => 'Province is required.',
            'postalCode.required' => 'Postal code is required.',
            'emergencyContact.required' => 'Guardian name is required.',
            'emergencyPhone.required' => 'Guardian phone is required.',
            'emergencyRelationship.required' => 'Relationship to guardian is required.',
            'emergencyRelationship.in' => 'Please select a valid relationship option.',
            'disabilityDate.before' => 'Date of disability onset must be at least 2 weeks before the current date and cannot be in the future.',
        ];
    }
}
