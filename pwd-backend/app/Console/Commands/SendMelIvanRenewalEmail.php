<?php

namespace App\Console\Commands;

use App\Models\PWDMember;
use App\Services\EmailService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class SendMelIvanRenewalEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pwd:send-mel-ivan-renewal-email';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a renewal approval email to Mel Ivan Mananquil for testing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            // Find Mel Ivan Mananquil
            $member = PWDMember::where(function($query) {
                $query->where('firstName', 'LIKE', '%Mel%')
                      ->where('lastName', 'LIKE', '%Mananquil%');
            })->orWhere(function($query) {
                $query->where('firstName', 'LIKE', '%Mel Ivan%')
                      ->where('lastName', 'LIKE', '%Mananquil%');
            })->with('user')->first();
            
            if (!$member) {
                // Try with different name variations
                $member = PWDMember::where('firstName', 'Mel Ivan')
                    ->where('lastName', 'Mananquil')
                    ->with('user')
                    ->first();
            }
            
            if (!$member) {
                $this->error('Mel Ivan Mananquil not found in PWD members');
                return 1;
            }
            
            // Get member's email
            $memberEmail = $member->email;
            if (empty($memberEmail) && $member->user) {
                $memberEmail = $member->user->email;
            }
            
            if (empty($memberEmail)) {
                $this->error('No email address found for Mel Ivan Mananquil');
                $this->info('Member ID: ' . $member->id);
                $this->info('User ID: ' . $member->userID);
                return 1;
            }
            
            // Get expiration date (use current if not set, or add 3 years)
            $expirationDate = $member->cardExpirationDate 
                ? Carbon::parse($member->cardExpirationDate)
                : Carbon::now()->addYears(3);
            
            $this->info('Sending renewal approval email to: ' . $memberEmail);
            $this->info('Member: ' . $member->firstName . ' ' . $member->lastName);
            $this->info('PWD ID: ' . ($member->pwd_id ?? 'N/A'));
            $this->info('Expiration Date: ' . $expirationDate->format('F d, Y'));
            
            // Send renewal approval email
            $emailService = new EmailService();
            $emailSent = $emailService->sendRenewalApprovalEmail([
                'email' => $memberEmail,
                'firstName' => $member->firstName,
                'lastName' => $member->lastName,
                'pwdId' => $member->pwd_id ?? 'N/A',
                'newExpirationDate' => $expirationDate->format('F d, Y'),
                'renewalDate' => Carbon::now()->format('F d, Y'),
                'notes' => 'This is a test email for renewal approval.'
            ]);
            
            if ($emailSent) {
                $this->info('✅ Renewal approval email sent successfully!');
                $this->table(
                    ['Field', 'Value'],
                    [
                        ['Email', $memberEmail],
                        ['Name', $member->firstName . ' ' . $member->lastName],
                        ['PWD ID', $member->pwd_id ?? 'N/A'],
                        ['Expiration Date', $expirationDate->format('F d, Y')],
                        ['Status', 'Email Sent']
                    ]
                );
                return 0;
            } else {
                $this->error('❌ Failed to send renewal approval email. Check logs for details.');
                return 1;
            }
            
        } catch (\Exception $e) {
            $this->error('Error sending renewal approval email: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }
    }
}

