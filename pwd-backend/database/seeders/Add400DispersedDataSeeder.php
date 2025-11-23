<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class Add400DispersedDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder adds 400 data entries distributed across different system functions:
     * - PWD Members/Applications: ~100
     * - Support Tickets: ~80
     * - Benefit Claims: ~80
     * - Complaints: ~50
     * - ID Renewals: ~40
     * - Announcements: ~30
     * - Audit Logs: ~20
     * Total: 400 entries
     *
     * @return void
     */
    public function run()
    {
        echo "Starting to generate 400 dispersed data entries...\n\n";

        // Get existing data counts
        $lastUserID = DB::table('users')->max('userID') ?? 0;
        $startUserID = $lastUserID + 1;

        // All 18 Barangays in Cabuyao
        $barangays = [
            'Baclaran', 'Banay-Banay', 'Banlic', 'Bigaa', 'Butong', 'Casile',
            'Diezmo', 'Gulod', 'Mamatid', 'Marinig', 'Niugan', 'Pittland',
            'Pulo', 'Sala', 'San Isidro', 'Barangay I Poblacion', 'Barangay II Poblacion', 'Barangay III Poblacion'
        ];

        // Disability types
        $disabilityTypes = [
            'Visual Impairment', 'Hearing Impairment', 'Speech and Language Impairment',
            'Intellectual Disability', 'Mental Health Condition', 'Learning Disability',
            'Psychosocial Disability', 'Autism Spectrum Disorder', 'ADHD',
            'Physical Disability', 'Orthopedic/Physical Disability', 'Chronic Illness', 'Multiple Disabilities'
        ];

        // Filipino names
        $firstNames = [
            'Maria', 'Jose', 'Juan', 'Antonio', 'Francisco', 'Manuel', 'Pedro', 'Carlos',
            'Rosa', 'Carmen', 'Elena', 'Ana', 'Teresa', 'Josefa', 'Patricia',
            'Rodrigo', 'Miguel', 'Fernando', 'Ricardo', 'Eduardo', 'Roberto', 'Alberto',
            'Marco', 'Luis', 'Sofia', 'Isabella', 'Andrea', 'Gabriela', 'Valentina',
            'Diego', 'Sebastian', 'Matias', 'Samuel', 'Benjamin', 'Daniel', 'Leonardo',
            'Ramon', 'Felix', 'Enrique', 'Alfredo', 'Mariano', 'Julio', 'Victor',
            'Rafael', 'Alejandro', 'Sergio', 'Javier', 'Andres', 'Felipe', 'Ignacio',
            'Cristina', 'Margarita', 'Laura', 'Monica', 'Lucia', 'Paula', 'Claudia',
            'Victoria', 'Adriana', 'Beatriz', 'Catalina', 'Diana', 'Esperanza', 'Felicia',
            'Gloria', 'Herminia', 'Imelda', 'Jocelyn', 'Karina', 'Lourdes', 'Marcela',
            'Natalia', 'Olga', 'Querida', 'Ramona', 'Soledad', 'Trinidad',
            'Ursula', 'Veronica', 'Wilma', 'Ximena', 'Yolanda', 'Zenaida', 'Aurora',
            'Belen', 'Corazon', 'Dolores', 'Ester', 'Flora', 'Graciela', 'Helena'
        ];

        $lastNames = [
            'Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres',
            'Delos Santos', 'Ramos', 'Gonzales', 'Villanueva', 'Fernandez', 'Lopez', 'Sanchez',
            'Rivera', 'Gomez', 'Diaz', 'Morales', 'Castro', 'Ortiz', 'Vargas', 'Romero',
            'Jimenez', 'Herrera', 'Moreno', 'Flores', 'Silva', 'Martinez', 'Medina',
            'Alvarez', 'Ruiz', 'Delgado', 'Castillo', 'Ortega', 'Soto', 'Rodriguez',
            'Perez', 'Gutierrez', 'Chavez', 'Rojas', 'Molina', 'Navarro', 'Marquez',
            'Vega', 'Paredes', 'Salazar', 'Dominguez', 'Campos', 'Mendez', 'Acosta',
            'Guerrero', 'Vasquez', 'Valdez', 'Sandoval', 'Velasco', 'Aguilar', 'Benitez',
            'Bravo', 'Calderon', 'Cardenas', 'De Leon', 'Espinoza', 'Fuentes', 'Galvan',
            'Ibarra', 'Juarez', 'Kumar', 'Luna', 'Maldonado', 'Nunez', 'Ochoa',
            'Pacheco', 'Quintero', 'Rios', 'Suarez', 'Trujillo', 'Uribe', 'Valenzuela',
            'Zamora', 'Aguirre', 'Beltran', 'Cervantes', 'Duran', 'Escobar', 'Fuentes',
            'Guerra', 'Jaramillo', 'Khan', 'Lara', 'Machado'
        ];

        $middleNames = [
            'Cruz', 'Reyes', 'Santos', 'Garcia', 'Ramos', 'Mendoza', 'Lopez', 'Torres',
            'Delos Santos', 'Villanueva', 'Fernandez', 'Sanchez', 'Rivera', 'Gomez',
            'Diaz', 'Morales', 'Castro', 'Ortiz', 'Vargas', 'Romero', 'Jimenez',
            'Herrera', 'Moreno', 'Flores', 'Silva', 'Martinez', 'Medina', 'Alvarez',
            'Ruiz', 'Delgado', 'Castillo', 'Ortega', 'Soto', 'Rodriguez', 'Perez',
            'Gutierrez', 'Chavez', 'Rojas', 'Molina', 'Navarro', null, null, null
        ];

        $suffixes = [null, null, null, null, null, null, null, null, null, null, 'Jr.', 'Sr.', 'II', 'III'];
        $genders = ['Male', 'Female', 'Other'];
        $idTypes = ['National ID', 'Passport', 'Driver\'s License', 'SSS ID', 'TIN ID', 'PhilHealth ID'];
        $relationships = ['Spouse', 'Parent', 'Sibling', 'Child', 'Relative', 'Friend', 'Guardian'];
        $civilStatuses = ['Single', 'Married', 'Widowed', 'Divorced', 'Separated'];
        $disabilityCauses = [
            'Birth defect', 'Accident', 'Illness', 'Age-related',
            'Work-related injury', 'Genetic condition', 'Unknown', 'Other'
        ];

        $totalCreated = 0;

        // ============================================
        // 1. PWD MEMBERS & APPLICATIONS (~100 entries)
        // ============================================
        echo "1. Generating ~100 PWD Members and Applications...\n";
        $pwdCount = 100;
        $users = [];
        $members = [];
        $applications = [];
        $newPwdUserIDs = [];

        for ($i = 0; $i < $pwdCount; $i++) {
            $currentUserID = $startUserID + $i;
            $newPwdUserIDs[] = $currentUserID;

            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $middleName = $middleNames[array_rand($middleNames)];
            $suffix = $suffixes[array_rand($suffixes)];
            $gender = $genders[array_rand($genders)];
            $barangay = $barangays[array_rand($barangays)];
            $disabilityType = $disabilityTypes[array_rand($disabilityTypes)];

            $microtime = str_replace('.', '', microtime(true));
            $uniqueId = $currentUserID . '_' . $microtime . '_' . rand(10000, 99999);
            $email = 'pwd' . $uniqueId . '@sample.pwd.local';
            $username = 'pwd_' . $currentUserID . '_' . strtolower(preg_replace('/[^a-z0-9]/', '', $firstName . $lastName)) . '_' . $currentUserID;

            $birthYear = rand(1945, 2006);
            $birthMonth = rand(1, 12);
            $birthDay = rand(1, 28);
            $birthDate = Carbon::create($birthYear, $birthMonth, $birthDay);
            $submissionDate = Carbon::now()->subDays(rand(0, 730));
            $contactNumber = '09' . str_pad(rand(0, 999999999), 9, '0', STR_PAD_LEFT);

            $streetNumber = rand(1, 999);
            $streetNames = ['Rizal', 'Mabini', 'Bonifacio', 'Luna', 'Aguinaldo', 'Quezon', 'Roxas', 'Osmena'];
            $streetName = $streetNames[array_rand($streetNames)];
            $address = "{$streetNumber} {$streetName} Street, {$barangay}, Cabuyao, Laguna";

            $pwdId = 'PWD-' . str_pad($currentUserID, 6, '0', STR_PAD_LEFT);
            $emergencyFirstName = $firstNames[array_rand($firstNames)];
            $emergencyLastName = $lastNames[array_rand($lastNames)];
            $emergencyContact = $emergencyFirstName . ' ' . $emergencyLastName;
            $emergencyPhone = '09' . str_pad(rand(0, 999999999), 9, '0', STR_PAD_LEFT);
            $emergencyRelationship = $relationships[array_rand($relationships)];
            $idType = $idTypes[array_rand($idTypes)];
            $idNumber = str_pad(rand(0, 999999999), 10, '0', STR_PAD_LEFT);
            $disabilityDate = $birthDate->copy()->addYears(rand(0, 60))->addDays(rand(0, 365));

            // Status distribution: 60% Approved, 20% Pending, 10% Under Review, 5% Needs Docs, 5% Rejected
            $statusRand = rand(1, 100);
            if ($statusRand <= 60) {
                $status = 'Approved';
            } elseif ($statusRand <= 80) {
                $status = 'Pending Admin Approval';
            } elseif ($statusRand <= 90) {
                $status = 'Under Review';
            } elseif ($statusRand <= 95) {
                $status = 'Needs Additional Documents';
            } else {
                $status = 'Rejected';
            }

            $users[] = [
                'userID' => $currentUserID,
                'username' => $username,
                'email' => $email,
                'password' => Hash::make('password123'),
                'role' => 'PWDMember',
                'status' => 'active',
                'created_at' => $submissionDate,
                'updated_at' => $submissionDate,
            ];

            if ($status === 'Approved') {
                $members[] = [
                    'userID' => $currentUserID,
                    'pwd_id' => $pwdId,
                    'pwd_id_generated_at' => $submissionDate,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'middleName' => $middleName,
                    'suffix' => $suffix,
                    'birthDate' => $birthDate->format('Y-m-d'),
                    'gender' => $gender,
                    'disabilityType' => $disabilityType,
                    'address' => $address,
                    'contactNumber' => $contactNumber,
                    'email' => $email,
                    'barangay' => $barangay,
                    'emergencyContact' => $emergencyContact,
                    'emergencyPhone' => $emergencyPhone,
                    'emergencyRelationship' => $emergencyRelationship,
                    'status' => 'Active',
                    'created_at' => $submissionDate,
                    'updated_at' => $submissionDate,
                ];
            }

            $referenceNumber = 'REF-' . date('Y') . '-' . str_pad($currentUserID, 6, '0', STR_PAD_LEFT);
            $applications[] = [
                'referenceNumber' => $referenceNumber,
                'pwdID' => $status === 'Approved' ? $currentUserID : null,
                'firstName' => $firstName,
                'lastName' => $lastName,
                'middleName' => $middleName,
                'suffix' => $suffix,
                'birthDate' => $birthDate->format('Y-m-d'),
                'gender' => $gender,
                'civilStatus' => $civilStatuses[array_rand($civilStatuses)],
                'nationality' => 'Filipino',
                'disabilityType' => $disabilityType,
                'disabilityCause' => $disabilityCauses[array_rand($disabilityCauses)],
                'disabilityDate' => $disabilityDate->format('Y-m-d'),
                'address' => $address,
                'barangay' => $barangay,
                'city' => 'Cabuyao',
                'province' => 'Laguna',
                'postalCode' => '4025',
                'email' => $email,
                'contactNumber' => $contactNumber,
                'emergencyContact' => $emergencyContact,
                'emergencyPhone' => $emergencyPhone,
                'emergencyRelationship' => $emergencyRelationship,
                'idType' => $idType,
                'idNumber' => $idNumber,
                'submissionDate' => $submissionDate->format('Y-m-d'),
                'status' => $status,
                'remarks' => $status === 'Approved' ? 'Sample approved application' : null,
                'created_at' => $submissionDate,
                'updated_at' => $submissionDate,
            ];
        }

        // Insert in batches
        $batchSize = 50;
        foreach (array_chunk($users, $batchSize) as $batch) {
            DB::table('users')->insert($batch);
        }
        if (!empty($members)) {
            foreach (array_chunk($members, $batchSize) as $batch) {
                DB::table('pwd_members')->insert($batch);
            }
        }
        foreach (array_chunk($applications, $batchSize) as $batch) {
            DB::table('application')->insert($batch);
        }

        $totalCreated += count($users) + count($members) + count($applications);
        echo "   ✓ Created " . count($users) . " users, " . count($members) . " PWD members, " . count($applications) . " applications\n";

        // ============================================
        // 2. SUPPORT TICKETS (~80 entries)
        // ============================================
        echo "\n2. Generating ~80 Support Tickets...\n";
        $ticketCount = 80;
        $pwdMembers = DB::table('pwd_members')->whereIn('userID', $newPwdUserIDs)->get();
        
        if ($pwdMembers->isEmpty()) {
            $pwdMembers = DB::table('pwd_members')->limit(50)->get();
        }

        $ticketSubjects = [
            'PWD ID Card Issue', 'Application Status Inquiry', 'Benefit Claim Assistance',
            'Document Submission Help', 'Account Access Problem', 'Password Reset Request',
            'Card Delivery Inquiry', 'Address Update Request', 'Contact Information Update',
            'Benefits Eligibility Question', 'Medical Certificate Help', 'Registration Process Inquiry',
            'Technical Support Needed', 'Payment Method Question', 'Complaint About Service'
        ];

        $ticketDescriptions = [
            'I have not received my PWD ID card yet. Can you please check the status?',
            'I submitted my application last month and would like to know the current status.',
            'I need help with claiming my benefits. How do I proceed?',
            'I am having trouble uploading my documents. Can you assist me?',
            'I cannot log into my account. Please help me regain access.',
            'I forgot my password and need to reset it.',
            'When will my PWD card be delivered?',
            'I moved to a new address and need to update my information.',
            'I need to update my contact number and email address.',
            'Can you clarify what benefits I am eligible for?',
            'What medical certificate do I need to submit?',
            'I am confused about the registration process. Can you guide me?',
            'I am experiencing technical issues with the website.',
            'What payment methods are accepted for benefits?',
            'I would like to file a complaint about the service I received.'
        ];

        $ticketCategories = [
            'General Inquiry', 'Technical Support', 'Application', 'Benefits',
            'Account Issues', 'Documentation', 'Complaint'
        ];

        $ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        $ticketPriorities = ['low', 'medium', 'high', 'urgent'];

        $supportTickets = [];
        $ticketMessages = [];
        $lastTicketId = DB::table('support_tickets')->max('id') ?? 0;
        $pwdMembersArray = $pwdMembers->toArray();
        shuffle($pwdMembersArray);
        $selectedMembers = array_slice($pwdMembersArray, 0, min($ticketCount, count($pwdMembersArray)));

        foreach ($selectedMembers as $index => $member) {
            $memberObj = is_object($member) ? $member : (object)$member;
            $ticketId = $lastTicketId + $index + 1;
            $ticketNumber = 'SUP-' . str_pad($ticketId, 6, '0', STR_PAD_LEFT);
            $status = $ticketStatuses[array_rand($ticketStatuses)];
            $priority = $ticketPriorities[array_rand($ticketPriorities)];
            $subject = $ticketSubjects[array_rand($ticketSubjects)];
            $description = $ticketDescriptions[array_rand($ticketDescriptions)];
            $category = $ticketCategories[array_rand($ticketCategories)];

            $createdAt = Carbon::now()->subDays(rand(0, 180));
            $resolvedAt = null;
            $closedAt = null;

            if (in_array($status, ['resolved', 'closed'])) {
                $resolvedAt = $createdAt->copy()->addDays(rand(1, 7));
                if ($status === 'closed') {
                    $closedAt = $resolvedAt->copy()->addDays(rand(1, 3));
                }
            }

            $supportTickets[] = [
                'ticket_number' => $ticketNumber,
                'subject' => $subject,
                'description' => $description,
                'pwd_member_id' => $memberObj->id,
                'status' => $status,
                'priority' => $priority,
                'category' => $category,
                'resolved_at' => $resolvedAt,
                'closed_at' => $closedAt,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            $ticketMessages[] = [
                'ticket_number' => $ticketNumber,
                'message' => $description,
                'sender_type' => 'pwd_member',
                'sender_id' => $memberObj->id,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ];

            if (in_array($status, ['resolved', 'closed', 'in_progress'])) {
                $adminReplies = [
                    'Thank you for contacting us. We have received your inquiry and will process it shortly.',
                    'Your request has been reviewed and is being processed.',
                    'We have resolved your issue. Please let us know if you need any further assistance.',
                    'Your ticket has been closed. Thank you for using our services.',
                    'We have updated your account information as requested.'
                ];

                $replyDate = $createdAt->copy()->addHours(rand(1, 72));
                $ticketMessages[] = [
                    'ticket_number' => $ticketNumber,
                    'message' => $adminReplies[array_rand($adminReplies)],
                    'sender_type' => 'admin',
                    'sender_id' => 1,
                    'created_at' => $replyDate,
                    'updated_at' => $replyDate,
                ];
            }
        }

        foreach (array_chunk($supportTickets, $batchSize) as $batch) {
            DB::table('support_tickets')->insert($batch);
        }

        $insertedTickets = DB::table('support_tickets')
            ->whereIn('ticket_number', array_column($supportTickets, 'ticket_number'))
            ->get()
            ->keyBy('ticket_number');

        $finalMessages = [];
        foreach ($ticketMessages as $msg) {
            $ticketNumber = $msg['ticket_number'];
            $actualTicketId = $insertedTickets[$ticketNumber]->id ?? null;
            if ($actualTicketId) {
                unset($msg['ticket_number']);
                $msg['support_ticket_id'] = $actualTicketId;
                $finalMessages[] = $msg;
            }
        }

        if (!empty($finalMessages)) {
            foreach (array_chunk($finalMessages, $batchSize) as $batch) {
                DB::table('support_ticket_messages')->insert($batch);
            }
        }

        $totalCreated += count($supportTickets) + count($finalMessages);
        echo "   ✓ Created " . count($supportTickets) . " support tickets with " . count($finalMessages) . " messages\n";

        // ============================================
        // 3. BENEFIT CLAIMS (~80 entries)
        // ============================================
        echo "\n3. Generating ~80 Benefit Claims...\n";
        $claimCount = 80;
        $benefits = DB::table('benefit')->where('status', 'Active')->get();
        
        if ($benefits->isEmpty()) {
            // Create a default benefit if none exists
            $benefitId = DB::table('benefit')->insertGetId([
                'title' => 'Financial Assistance Program 2025',
                'type' => 'Financial Assistance',
                'amount' => '5000',
                'description' => 'Financial assistance for PWD members',
                'status' => 'Active',
                'distributed' => 0,
                'pending' => 0,
                'submittedDate' => Carbon::now()->subMonths(1),
                'approvedDate' => Carbon::now()->subDays(20),
                'distributionDate' => Carbon::now()->addDays(30),
                'expiryDate' => Carbon::now()->addMonths(6),
                'selectedBarangays' => json_encode($barangays),
                'color' => '#3498DB',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
            $benefits = collect([(object)['id' => $benefitId]]);
        }

        $validMembers = DB::table('pwd_members')
            ->whereIn('userID', $newPwdUserIDs)
            ->whereNotNull('userID')
            ->get();

        if ($validMembers->isEmpty()) {
            $validMembers = DB::table('pwd_members')
                ->whereNotNull('userID')
                ->limit(50)
                ->get();
        }

        $benefitClaims = [];
        $claimStatuses = ['claimed', 'unclaimed', 'pending'];
        $selectedCount = min($claimCount, $validMembers->count());
        $selectedMembersForClaims = $validMembers->random($selectedCount);
        
        // Ensure it's a collection
        if (!is_iterable($selectedMembersForClaims)) {
            $selectedMembersForClaims = collect([$selectedMembersForClaims]);
        }

        $benefitsArray = $benefits->toArray();
        foreach ($selectedMembersForClaims as $index => $member) {
            $memberObj = is_object($member) ? $member : (object)$member;
            $randomBenefit = $benefitsArray[array_rand($benefitsArray)];
            $benefit = is_object($randomBenefit) ? $randomBenefit : (object)$randomBenefit;
            $status = $claimStatuses[array_rand($claimStatuses)];
            $claimDate = Carbon::now()->subDays(rand(0, 90));

            $benefitClaims[] = [
                'pwdID' => $memberObj->userID,
                'benefitID' => $benefit->id,
                'claimDate' => $claimDate->format('Y-m-d'),
                'status' => $status,
                'created_at' => $claimDate,
                'updated_at' => $claimDate,
            ];
        }

        if (!empty($benefitClaims)) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            foreach (array_chunk($benefitClaims, $batchSize) as $batch) {
                DB::table('benefit_claim')->insert($batch);
            }
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }

        $totalCreated += count($benefitClaims);
        echo "   ✓ Created " . count($benefitClaims) . " benefit claims\n";

        // ============================================
        // 4. COMPLAINTS (~50 entries)
        // ============================================
        echo "\n4. Generating ~50 Complaints...\n";
        $complaints = []; // Initialize to avoid undefined variable error
        
        // Check if complaint table has the required columns
        $complaintColumns = DB::select('DESCRIBE complaint');
        $hasRequiredColumns = false;
        $columnNames = array_map(function($col) {
            return is_object($col) ? $col->Field : (is_array($col) ? $col['Field'] : null);
        }, $complaintColumns);
        
        if (in_array('pwdID', $columnNames) && in_array('subject', $columnNames) && 
            in_array('description', $columnNames) && in_array('status', $columnNames)) {
            $hasRequiredColumns = true;
        }
        
        if ($hasRequiredColumns) {
            $complaintCount = 50;
            $complaintSubjects = [
                'Delayed ID Card Delivery',
                'Poor Service Quality',
                'Unresponsive Staff',
                'Incorrect Information',
                'Benefits Not Received',
                'Application Processing Delay',
                'Documentation Issues',
                'System Malfunction',
                'Inadequate Support',
                'Communication Problems'
            ];

            $complaintDescriptions = [
                'My PWD ID card has not been delivered despite approval months ago.',
                'I received poor service during my visit to the office.',
                'Staff members are not responding to my inquiries.',
                'There is incorrect information in my records.',
                'I have not received the benefits I was promised.',
                'My application has been pending for too long.',
                'I am having issues with document submission.',
                'The system is not working properly.',
                'I need better support for my disability needs.',
                'Communication channels are not effective.'
            ];

            $complaintStatuses = ['pending', 'under_review', 'resolved', 'dismissed'];
            $complaints = [];
            $selectedComplaintCount = min($complaintCount, $validMembers->count());
            $selectedMembersForComplaints = $validMembers->random($selectedComplaintCount);
            
            // Ensure it's a collection
            if (!is_iterable($selectedMembersForComplaints)) {
                $selectedMembersForComplaints = collect([$selectedMembersForComplaints]);
            }

            foreach ($selectedMembersForComplaints as $index => $member) {
                $memberObj = is_object($member) ? $member : (object)$member;
                $subject = $complaintSubjects[array_rand($complaintSubjects)];
                $description = $complaintDescriptions[array_rand($complaintDescriptions)];
                $status = $complaintStatuses[array_rand($complaintStatuses)];
                $createdAt = Carbon::now()->subDays(rand(0, 120));

                $complaints[] = [
                    'pwdID' => $memberObj->userID,
                    'subject' => $subject,
                    'description' => $description,
                    'status' => $status,
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ];
            }

            if (!empty($complaints)) {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                foreach (array_chunk($complaints, $batchSize) as $batch) {
                    DB::table('complaint')->insert($batch);
                }
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }

            $totalCreated += count($complaints);
            echo "   ✓ Created " . count($complaints) . " complaints\n";
        } else {
            echo "   ⚠ Skipped complaints - table structure incomplete (missing required columns)\n";
        }

        // ============================================
        // 5. ID RENEWALS (~40 entries)
        // ============================================
        echo "\n5. Generating ~40 ID Renewals...\n";
        $renewalCount = 40;
        $renewalStatuses = ['pending', 'approved', 'rejected'];
        $renewalNotes = [
            'Renewal application submitted',
            'Documents verified',
            'Medical certificate required',
            'Approved for renewal',
            'Rejected due to incomplete documents'
        ];

        $idRenewals = [];
        $selectedRenewalCount = min($renewalCount, $validMembers->count());
        $selectedMembersForRenewals = $validMembers->random($selectedRenewalCount);
        
        // Ensure it's a collection
        if (!is_iterable($selectedMembersForRenewals)) {
            $selectedMembersForRenewals = collect([$selectedMembersForRenewals]);
        }

        // Get admin userID for reviewer
        $adminUser = DB::table('users')->where('role', 'Admin')->first();
        $reviewerID = $adminUser ? $adminUser->userID : 1;

        foreach ($selectedMembersForRenewals as $index => $member) {
            $memberObj = is_object($member) ? $member : (object)$member;
            $status = $renewalStatuses[array_rand($renewalStatuses)];
            $submittedAt = Carbon::now()->subDays(rand(0, 60));
            $reviewedAt = null;
            $reviewedBy = null;

            if ($status !== 'pending') {
                $reviewedAt = $submittedAt->copy()->addDays(rand(1, 14));
                $reviewedBy = $reviewerID;
            }

            $idRenewals[] = [
                'member_id' => $memberObj->userID,
                'old_card_image_path' => null,
                'medical_certificate_path' => null,
                'status' => $status,
                'notes' => $renewalNotes[array_rand($renewalNotes)],
                'reviewed_by' => $reviewedBy,
                'submitted_at' => $submittedAt,
                'reviewed_at' => $reviewedAt,
                'created_at' => $submittedAt,
                'updated_at' => $reviewedAt ?? $submittedAt,
            ];
        }

        if (!empty($idRenewals)) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            foreach (array_chunk($idRenewals, $batchSize) as $batch) {
                DB::table('id_renewals')->insert($batch);
            }
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }

        $totalCreated += count($idRenewals);
        echo "   ✓ Created " . count($idRenewals) . " ID renewals\n";

        // ============================================
        // 6. ANNOUNCEMENTS (~30 entries)
        // ============================================
        echo "\n6. Generating ~30 Announcements...\n";
        $announcementCount = 30;
        $announcementTitles = [
            'New Benefits Program Available',
            'PWD ID Renewal Process Update',
            'Office Hours Change Notice',
            'Holiday Schedule Announcement',
            'New Online Services Available',
            'Document Submission Guidelines',
            'Benefit Claim Deadline Reminder',
            'System Maintenance Notice',
            'Community Event for PWD Members',
            'Important Policy Update',
            'Medical Certificate Requirements',
            'Application Processing Update',
            'Support Desk Hours Extended',
            'New Barangay Office Location',
            'Quarterly Meeting Schedule'
        ];

        $announcementContents = [
            'We are pleased to announce a new benefits program for all registered PWD members.',
            'The PWD ID renewal process has been updated. Please review the new requirements.',
            'Please note that office hours have changed. Check our website for details.',
            'The office will be closed on the following holidays. Plan your visits accordingly.',
            'New online services are now available. You can submit applications online.',
            'Please follow the updated document submission guidelines when applying.',
            'Reminder: Benefit claim deadline is approaching. Submit your claims early.',
            'System maintenance is scheduled. Services may be temporarily unavailable.',
            'Join us for a community event designed for PWD members and their families.',
            'Important policy updates have been made. Please review the changes.',
            'Medical certificate requirements have been updated. Check the new format.',
            'Application processing times have improved. Expect faster turnaround.',
            'Support desk hours have been extended to better serve our members.',
            'Our new barangay office location is now open. Visit us at the new address.',
            'Quarterly meetings are scheduled. All members are welcome to attend.'
        ];

        $announcementTypes = ['General', 'Important', 'Urgent', 'Update', 'Event'];
        $priorities = ['low', 'medium', 'high'];
        $targetAudiences = ['All', 'PWDMember', 'Admin', 'BarangayPresident'];
        $announcementStatuses = ['draft', 'published', 'archived'];

        $announcements = [];
        $adminUsers = DB::table('users')->whereIn('role', ['Admin', 'SuperAdmin'])->get();
        $authorIDs = $adminUsers->pluck('userID')->toArray();
        if (empty($authorIDs)) {
            $authorIDs = [1]; // Fallback
        }

        for ($i = 0; $i < $announcementCount; $i++) {
            $title = $announcementTitles[array_rand($announcementTitles)];
            $content = $announcementContents[array_rand($announcementContents)];
            $type = $announcementTypes[array_rand($announcementTypes)];
            $priority = $priorities[array_rand($priorities)];
            $targetAudience = $targetAudiences[array_rand($targetAudiences)];
            $status = $announcementStatuses[array_rand($announcementStatuses)];
            $authorID = $authorIDs[array_rand($authorIDs)];

            $publishDate = Carbon::now()->subDays(rand(0, 90));
            $expiryDate = $publishDate->copy()->addDays(rand(30, 180));

            $announcements[] = [
                'authorID' => $authorID,
                'title' => $title,
                'content' => $content,
                'type' => $type,
                'priority' => $priority,
                'targetAudience' => $targetAudience,
                'status' => $status,
                'publishDate' => $publishDate->format('Y-m-d'),
                'expiryDate' => $expiryDate->format('Y-m-d'),
                'views' => rand(0, 500),
                'created_at' => $publishDate,
                'updated_at' => $publishDate,
            ];
        }

        if (!empty($announcements)) {
            foreach (array_chunk($announcements, $batchSize) as $batch) {
                DB::table('announcement')->insert($batch);
            }
        }

        $totalCreated += count($announcements);
        echo "   ✓ Created " . count($announcements) . " announcements\n";

        // ============================================
        // 7. AUDIT LOGS (~20 entries)
        // ============================================
        echo "\n7. Generating ~20 Audit Logs...\n";
        $auditLogCount = 20;
        $actions = [
            'User Login',
            'Application Submitted',
            'Application Approved',
            'Application Rejected',
            'Benefit Claimed',
            'Profile Updated',
            'Password Changed',
            'Document Uploaded',
            'Support Ticket Created',
            'Support Ticket Resolved',
            'ID Renewal Submitted',
            'Complaint Filed',
            'Announcement Published',
            'Report Generated',
            'Data Exported'
        ];

        $auditLogs = [];
        $allUsers = DB::table('users')->get();
        $userIDs = $allUsers->pluck('userID')->toArray();
        if (empty($userIDs)) {
            $userIDs = [1];
        }

        for ($i = 0; $i < $auditLogCount; $i++) {
            $userID = $userIDs[array_rand($userIDs)];
            $action = $actions[array_rand($actions)];
            $timestamp = Carbon::now()->subDays(rand(0, 30))->subHours(rand(0, 23));
            $ipAddress = long2ip(rand(0, 4294967295));
            $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

            $auditLogs[] = [
                'userID' => $userID,
                'action' => $action,
                'timestamp' => $timestamp,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        }

        if (!empty($auditLogs)) {
            foreach (array_chunk($auditLogs, $batchSize) as $batch) {
                DB::table('audit_log')->insert($batch);
            }
        }

        $totalCreated += count($auditLogs);
        echo "   ✓ Created " . count($auditLogs) . " audit logs\n";

        // ============================================
        // SUMMARY
        // ============================================
        echo "\n" . str_repeat("=", 50) . "\n";
        echo "✅ DATA GENERATION COMPLETE\n";
        echo str_repeat("=", 50) . "\n";
        echo "Total entries created: {$totalCreated}\n";
        echo "\nBreakdown:\n";
        echo "  - PWD Members/Applications: ~" . (count($users) + count($members) + count($applications)) . "\n";
        echo "  - Support Tickets: ~" . count($supportTickets) . "\n";
        echo "  - Benefit Claims: ~" . count($benefitClaims) . "\n";
        echo "  - Complaints: ~" . (isset($complaints) && !empty($complaints) ? count($complaints) : 0) . "\n";
        echo "  - ID Renewals: ~" . count($idRenewals) . "\n";
        echo "  - Announcements: ~" . count($announcements) . "\n";
        echo "  - Audit Logs: ~" . count($auditLogs) . "\n";
        echo "\nDefault password for all new users: password123\n";
        echo str_repeat("=", 50) . "\n";
    }
}

