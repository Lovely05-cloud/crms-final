<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PWDMember;
use App\Services\QRCodeGenerator;

class RegenerateQRCodes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'qr:regenerate {--all : Regenerate all QR codes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Regenerate QR codes for PWD members (removes expiration)';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $regenerateAll = $this->option('all');
        
        if ($regenerateAll) {
            $members = PWDMember::all();
            $this->info("Regenerating QR codes for all {$members->count()} members...");
        } else {
            // Only regenerate QR codes that have validUntil field (old format)
            // Get all members and filter in PHP to avoid table name issues
            $members = PWDMember::all();
            $membersWithQR = $members->filter(function($member) {
                return !empty($member->qr_code_data);
            });
            $this->info("Checking {$membersWithQR->count()} members with existing QR codes...");
            $members = $membersWithQR;
        }
        
        $regenerated = 0;
        $skipped = 0;
        
        foreach ($members as $member) {
            try {
                if ($regenerateAll) {
                    // Force regenerate all
                    QRCodeGenerator::generateAndStore($member, true);
                    $regenerated++;
                    $this->line("✓ Regenerated QR code for: {$member->pwd_id}");
                } else {
                    // Check if QR code has validUntil field
                    $data = json_decode($member->qr_code_data, true);
                    if ($data && isset($data['validUntil'])) {
                        QRCodeGenerator::generateAndStore($member, true);
                        $regenerated++;
                        $this->line("✓ Regenerated QR code for: {$member->pwd_id}");
                    } else {
                        $skipped++;
                    }
                }
            } catch (\Exception $e) {
                $this->error("✗ Error regenerating QR code for {$member->pwd_id}: {$e->getMessage()}");
            }
        }
        
        $this->info("\nCompleted!");
        $this->info("Regenerated: {$regenerated}");
        if (!$regenerateAll) {
            $this->info("Skipped (already in new format): {$skipped}");
        }
        
        return 0;
    }
}

