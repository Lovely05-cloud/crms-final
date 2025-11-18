<?php

namespace App\Console\Commands;

use App\Models\PWDMember;
use Illuminate\Console\Command;
use Carbon\Carbon;

class UpdateMelIvanExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pwd:update-mel-ivan-expiry';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update Mel Ivan Mananquil\'s card expiration date to 25 days from now for testing';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        try {
            // Find Mel Ivan Mananquil with various name patterns
            $member = PWDMember::where(function($query) {
                $query->where('firstName', 'LIKE', '%Mel%')
                      ->where('lastName', 'LIKE', '%Mananquil%');
            })->orWhere(function($query) {
                $query->where('firstName', 'LIKE', '%Mel Ivan%')
                      ->where('lastName', 'LIKE', '%Mananquil%');
            })->first();
            
            if (!$member) {
                // Try exact match
                $member = PWDMember::where('firstName', 'Mel Ivan')
                    ->where('lastName', 'Mananquil')
                    ->first();
            }
            
            if (!$member) {
                // Try with middle name
                $member = PWDMember::where('firstName', 'Mel')
                    ->where('middleName', 'Ivan')
                    ->where('lastName', 'Mananquil')
                    ->first();
            }
            
            if (!$member) {
                $this->error('Mel Ivan Mananquil not found in PWD members');
                $this->info('Searching in applications...');
                
                $application = \App\Models\Application::where(function($query) {
                    $query->where('firstName', 'LIKE', '%Mel%')
                          ->where('lastName', 'LIKE', '%Mananquil%');
                })->first();
                
                if ($application) {
                    $this->info('Found in applications but not in PWD members. Application ID: ' . $application->applicationID);
                    $this->info('Please ensure the application is approved and a PWD member record exists.');
                }
                
                return 1;
            }
            
            // Set expiration date to 25 days from now
            $newExpirationDate = Carbon::now()->addDays(25);
            
            // Update the member
            $member->update([
                'cardExpirationDate' => $newExpirationDate,
                'cardClaimed' => true,
                'cardIssueDate' => $member->cardIssueDate ?? Carbon::now()->subYears(3)->addDays(25)
            ]);
            
            $daysUntilExpiration = Carbon::now()->diffInDays($newExpirationDate, false);
            
            $this->info('Successfully updated Mel Ivan Mananquil\'s card expiration date!');
            $this->table(
                ['Field', 'Value'],
                [
                    ['ID', $member->id],
                    ['User ID', $member->userID],
                    ['PWD ID', $member->pwd_id ?? 'N/A'],
                    ['Name', $member->firstName . ' ' . ($member->middleName ?? '') . ' ' . $member->lastName],
                    ['Card Claimed', $member->cardClaimed ? 'Yes' : 'No'],
                    ['Card Issue Date', $member->cardIssueDate ? $member->cardIssueDate->format('Y-m-d') : 'N/A'],
                    ['Card Expiration Date', $member->cardExpirationDate->format('Y-m-d')],
                    ['Days Until Expiration', $daysUntilExpiration . ' days'],
                ]
            );
            
            return 0;
        } catch (\Exception $e) {
            $this->error('Error updating expiration date: ' . $e->getMessage());
            return 1;
        }
    }
}

