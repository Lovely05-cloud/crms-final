<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RequiredDocument;
use App\Models\User;

class RequiredDocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the first admin user to be the creator
        $admin = User::where('role', 'Admin')->first();
        
        if (!$admin) {
            $this->command->error('No admin user found. Please create an admin user first.');
            return;
        }

        $documents = [
            [
                'name' => 'Medical Certificate',
                'description' => 'Medical certificate stating the patient\'s Type of Disability & Doctor\'s qualification for PWD ID (Latest date and original copy)',
                'is_required' => true,
                'file_types' => ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'Clinical Abstract/Assessment',
                'description' => 'Clinical Abstract/Protocol/Behavioral Assessment/Audiometry Test (photocopy)',
                'is_required' => false,
                'file_types' => ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'Voter Certificate',
                'description' => 'Voter Certificate (Photocopy)',
                'is_required' => false,
                'file_types' => ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'ID Pictures',
                'description' => '1pc 1"x1" ID picture, white background (latest photo)',
                'is_required' => true,
                'file_types' => ['jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'Birth Certificate',
                'description' => 'Birth Certificate if minor (Photocopy)',
                'is_required' => false,
                'file_types' => ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'Whole Body Picture',
                'description' => 'Whole body picture Only for Apparent Disability',
                'is_required' => false,
                'file_types' => ['jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'Affidavit of Guardianship/Loss',
                'description' => 'Affidavit of Guardianship/Loss',
                'is_required' => false,
                'file_types' => ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
            [
                'name' => 'Barangay Certificate of Residency',
                'description' => 'Barangay Certificate of Residency',
                'is_required' => true,
                'file_types' => ['pdf', 'jpg', 'jpeg', 'png'],
                'max_file_size' => 15360,
                'created_by' => $admin->userID,
                'status' => 'active',
                'effective_date' => now(),
            ],
        ];

        foreach ($documents as $document) {
            RequiredDocument::create($document);
        }

        $this->command->info('Required documents seeded successfully!');
    }
}
