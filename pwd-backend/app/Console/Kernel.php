<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Check for cards expiring within 30 days and send notifications
        $schedule->command('pwd:check-card-renewals')
            ->daily()
            ->at('09:00'); // Run at 9:00 AM daily

        // Archive members with expired ID cards
        $schedule->command('pwd:archive-expired-members')
            ->daily()
            ->at('10:00'); // Run at 10:00 AM daily

        // Delete rejected applications after 1 day
        $schedule->command('applications:delete-rejected')
            ->daily()
            ->at('11:00'); // Run at 11:00 AM daily
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
