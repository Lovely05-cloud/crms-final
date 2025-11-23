<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PWDMember;
use Carbon\Carbon;

class ArchiveExpiredMembers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pwd:archive-expired-members';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Archive PWD members whose ID cards have expired';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Checking for expired PWD ID cards...');

        $today = Carbon::today();

        // Find members with expired cards that are not already archived
        $expiredMembers = PWDMember::where('cardClaimed', true)
            ->whereNotNull('cardExpirationDate')
            ->where('cardExpirationDate', '<', $today)
            ->whereNull('archived_at')
            ->get();

        $archivedCount = 0;

        foreach ($expiredMembers as $member) {
            $member->update([
                'archived_at' => now()
            ]);
            $archivedCount++;
        }

        $this->info("Archived {$archivedCount} members with expired ID cards.");
        return Command::SUCCESS;
    }
}
