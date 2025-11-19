<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use App\Models\User;
use App\Models\PWDMember;
use App\Models\Application;
use App\Models\BenefitClaim;
use App\Models\Complaint;
use App\Models\MemberDocument;
use App\Models\IDRenewal;
use App\Models\SupportTicket;
use App\Models\SupportTicketMessage;
use App\Models\Notification;

class ClearPWDMemberData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:clear-pwd-members';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all PWD member data while preserving other user accounts';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting to clear PWD member data...');
        $this->newLine();

        // Get all PWD member user IDs
        $pwdMemberUserIds = User::where('role', 'PWDMember')->pluck('userID')->toArray();
        
        if (empty($pwdMemberUserIds)) {
            $this->info('No PWD members found in the database.');
            return 0;
        }

        $this->info('Found ' . count($pwdMemberUserIds) . ' PWD member(s) to remove.');
        $this->newLine();

        // Start transaction for safety
        \DB::beginTransaction();

        try {
            // Get PWD member IDs (pwd_members.id, not userID)
            $pwdMemberIds = PWDMember::whereIn('userID', $pwdMemberUserIds)->pluck('id')->toArray();
            
            // 1. Delete Support Ticket Messages (related to tickets from PWD members)
            $supportTicketIds = SupportTicket::whereIn('pwd_member_id', $pwdMemberIds)->pluck('id')->toArray();
            if (!empty($supportTicketIds)) {
                $deleted = SupportTicketMessage::whereIn('support_ticket_id', $supportTicketIds)->delete();
                $this->info("Deleted {$deleted} support ticket message(s).");
            }

            // 2. Delete Support Tickets
            $deleted = SupportTicket::whereIn('pwd_member_id', $pwdMemberIds)->delete();
            $this->info("Deleted {$deleted} support ticket(s).");

            // 3. Delete ID Renewals
            $deleted = IDRenewal::whereIn('member_id', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} ID renewal(s).");

            // 4. Delete Member Documents
            $deleted = MemberDocument::whereIn('member_id', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} member document(s).");

            // 5. Delete Benefit Claims
            $deleted = BenefitClaim::whereIn('pwdID', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} benefit claim(s).");

            // 6. Delete Complaints (if table has pwdID column)
            try {
                if (Schema::hasColumn('complaint', 'pwdID')) {
                    $deleted = Complaint::whereIn('pwdID', $pwdMemberUserIds)->delete();
                    $this->info("Deleted {$deleted} complaint(s).");
                } else {
                    $this->warn("Complaint table does not have pwdID column, skipping...");
                }
            } catch (\Exception $e) {
                $this->warn("Could not delete complaints: " . $e->getMessage());
            }

            // 7. Delete Applications
            $deleted = Application::whereIn('pwdID', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} application(s).");

            // 8. Delete Notifications for PWD members
            $deleted = Notification::whereIn('user_id', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} notification(s).");

            // 9. Delete PWDMember records
            $deleted = PWDMember::whereIn('userID', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} PWD member record(s).");

            // 10. Delete User records (PWD members only)
            $deleted = User::whereIn('userID', $pwdMemberUserIds)->delete();
            $this->info("Deleted {$deleted} PWD member user account(s).");

            // Commit transaction
            \DB::commit();

            $this->newLine();
            $this->info('✓ Successfully cleared all PWD member data!');
            $this->info('✓ All other user accounts (Admin, SuperAdmin, Staff, FrontDesk, BarangayPresident) have been preserved.');

        } catch (\Exception $e) {
            \DB::rollBack();
            $this->error('Error clearing PWD member data: ' . $e->getMessage());
            $this->error('Transaction rolled back. No changes were made.');
            return 1;
        }

        return 0;
    }
}

