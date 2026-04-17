<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\NotificationService;

class NotifyLeaderboard extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notify:leaderboard';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Notify students about their current leaderboard rank';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Calculating leaderboard...');

        // Get all learners, ordered by XP
        $students = User::where('role', 'learner')
            ->orderBy('xp_points', 'desc')
            ->get();

        $totalStudents = $students->count();
        $bar = $this->output->createProgressBar($totalStudents);

        foreach ($students as $index => $user) {
            $rank = $index + 1;

            // Custom message based on rank
            $message = "Anda berada di peringkat #{$rank} dari {$totalStudents} siswa dengan {$user->xp_points} XP.";
            $type = 'info';

            if ($rank <= 3) {
                $message = "Luar Biasa! Anda masuk Top 3 Leaderboard (Peringkat #{$rank})! Pertahankan!";
                $type = 'success';
            } elseif ($rank <= 10) {
                $message = "Kerja bagus! Anda masuk Top 10 (Peringkat #{$rank}). Sedikit lagi menuju puncak!";
                $type = 'success';
            }

            // Send via NotificationService
            NotificationService::send(
                $user,
                'Update Leaderboard Mingguan 🏆',
                $message,
                $type,
                '/leaderboard',
                [
                    'title_key' => 'notif.leaderboard_title',
                    'message_key' => $rank <= 3 ? 'notif.leaderboard_top3' : ($rank <= 10 ? 'notif.leaderboard_top10' : 'notif.leaderboard_rank'),
                    'message_params' => ['rank' => $rank, 'total' => $totalStudents, 'xp' => $user->xp_points]
                ]
            );

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Leaderboard notifications sent successfully.');
    }
}
