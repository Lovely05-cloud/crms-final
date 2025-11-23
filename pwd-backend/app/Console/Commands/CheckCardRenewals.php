<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PWDMember;
use App\Models\Notification;
use Carbon\Carbon;

class CheckCardRenewals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pwd:check-card-renewals';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for PWD cards that need renewal and create notifications';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Checking for cards that need renewal...');

        $today = Carbon::today();
        $thirtyDaysFromNow = Carbon::today()->addDays(30);

        // Find cards that are expiring within the next 30 days (exclude archived members)
        $membersNeedingRenewal = PWDMember::where('cardClaimed', true)
            ->whereNull('archived_at')
            ->whereNotNull('cardExpirationDate')
            ->whereBetween('cardExpirationDate', [$today, $thirtyDaysFromNow])
            ->get();

        $notificationsCreated = 0;

        foreach ($membersNeedingRenewal as $member) {
            // Check if notification already exists for this renewal (last 7 days)
            $sevenDaysAgo = Carbon::today()->subDays(7);
            $existingNotification = Notification::where('user_id', $member->userID)
                ->where('type', 'card_renewal_due')
                ->where('is_read', false)
                ->whereDate('created_at', '>=', $sevenDaysAgo)
                ->first();

            if (!$existingNotification) {
                $daysUntilExpiration = Carbon::parse($member->cardExpirationDate)->diffInDays($today);

                Notification::create([
                    'user_id' => $member->userID,
                    'type' => 'card_renewal_due',
                    'title' => 'PWD Card Renewal Due',
                    'message' => "Your PWD ID card will expire on " . Carbon::parse($member->cardExpirationDate)->format('F d, Y') . " ({$daysUntilExpiration} days remaining). Please submit your renewal request with your old ID card and a recent medical certificate.",
                    'data' => [
                        'member_id' => $member->id,
                        'expiration_date' => $member->cardExpirationDate,
                        'days_remaining' => $daysUntilExpiration
                    ]
                ]);

                $notificationsCreated++;
            }
        }

        // Also check for cards ready to claim (when PWD ID is generated but not claimed, exclude archived)
        $membersReadyToClaim = PWDMember::where('cardClaimed', false)
            ->whereNull('archived_at')
            ->whereNotNull('pwd_id')
            ->whereNotNull('pwd_id_generated_at')
            ->get();

        foreach ($membersReadyToClaim as $member) {
            // Check if notification already exists (last 7 days)
            $sevenDaysAgo = Carbon::today()->subDays(7);
            $existingNotification = Notification::where('user_id', $member->userID)
                ->where('type', 'card_ready_to_claim')
                ->where('is_read', false)
                ->whereDate('created_at', '>=', $sevenDaysAgo)
                ->first();

            if (!$existingNotification) {
                Notification::create([
                    'user_id' => $member->userID,
                    'type' => 'card_ready_to_claim',
                    'title' => 'PWD Card Ready to Claim',
                    'message' => "Your PWD ID card (ID: {$member->pwd_id}) is ready for claiming. Please visit the PDAO office to claim your card.",
                    'data' => [
                        'member_id' => $member->id,
                        'pwd_id' => $member->pwd_id
                    ]
                ]);

                $notificationsCreated++;
            }
        }

        $this->info("Created {$notificationsCreated} notifications.");
        return 0;
    }
}

