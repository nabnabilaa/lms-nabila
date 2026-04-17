<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DailyMission;
use Carbon\Carbon;

class DailyMissionSeeder extends Seeder
{
    public function run()
    {
        // 1. Mission Harian: Login
        DailyMission::updateOrCreate(
            ['action_type' => 'login', 'type' => 'daily'],
            [
                'title' => json_encode([
                    'id' => 'Login Harian',
                    'en' => 'Daily Login',
                ]),
                'description' => json_encode([
                    'id' => 'Login ke platform untuk memulai hari belajarmu!',
                    'en' => 'Log in to the platform to start your learning day!',
                ]),
                'xp_reward' => 10,
                'icon' => 'Key',
                'action_target' => 1,
                'is_active' => true,
            ]
        );

        // 2. Mission Harian: Selesaikan 1 Lesson
        DailyMission::updateOrCreate(
            ['action_type' => 'complete_lesson', 'type' => 'daily'],
            [
                'title' => json_encode([
                    'id' => 'Belajar Kilat',
                    'en' => 'Quick Study',
                ]),
                'description' => json_encode([
                    'id' => 'Selesaikan minimal 1 materi pelajaran hari ini.',
                    'en' => 'Complete at least 1 lesson today.',
                ]),
                'xp_reward' => 20,
                'icon' => 'BookOpen',
                'action_target' => 1,
                'is_active' => true,
            ]
        );

        // 3. Mission Harian: Klaim Bonus (Manual)
        DailyMission::updateOrCreate(
            ['action_type' => 'manual', 'type' => 'daily'],
            [
                'title' => json_encode([
                    'id' => 'Bonus Semangat Pagi',
                    'en' => 'Morning Boost Bonus',
                ]),
                'description' => json_encode([
                    'id' => 'Klaim bonus XP gratis untuk menyemangati harimu!',
                    'en' => 'Claim free bonus XP to brighten your day!',
                ]),
                'xp_reward' => 5,
                'icon' => 'Gift',
                'action_target' => 1,
                'is_active' => true,
            ]
        );

        // 4. Mission Mingguan: Rajin Belajar
        DailyMission::updateOrCreate(
            ['action_type' => 'complete_lesson', 'type' => 'weekly'],
            [
                'title' => json_encode([
                    'id' => 'Marathon Belajar',
                    'en' => 'Learning Marathon',
                ]),
                'description' => json_encode([
                    'id' => 'Selesaikan 5 materi pelajaran dalam minggu ini.',
                    'en' => 'Complete 5 lessons this week.',
                ]),
                'xp_reward' => 100,
                'icon' => 'Flame',
                'action_target' => 5,
                'is_active' => true,
                'starts_at' => Carbon::now()->startOfWeek(),
                'expires_at' => Carbon::now()->endOfWeek(),
            ]
        );

        // 5. Mission Mingguan: Diskusi Aktif
        DailyMission::updateOrCreate(
            ['action_type' => 'post_discussion', 'type' => 'weekly'],
            [
                'title' => json_encode([
                    'id' => 'Suara Komunitas',
                    'en' => 'Community Voice',
                ]),
                'description' => json_encode([
                    'id' => 'Berikan 3 komentar atau post di forum diskusi.',
                    'en' => 'Post 3 comments or posts in the discussion forum.',
                ]),
                'xp_reward' => 50,
                'icon' => 'MessageCircle',
                'action_target' => 3,
                'is_active' => true,
            ]
        );

        // 6. Mission Spesial: Quiz Master
        DailyMission::updateOrCreate(
            ['action_type' => 'complete_quiz', 'type' => 'special'],
            [
                'title' => json_encode([
                    'id' => 'Quiz Master',
                    'en' => 'Quiz Master',
                ]),
                'description' => json_encode([
                    'id' => 'Selesaikan 1 kuis dengan nilai sempurna.',
                    'en' => 'Complete 1 quiz with a perfect score.',
                ]),
                'xp_reward' => 150,
                'icon' => 'Trophy',
                'action_target' => 1,
                'is_active' => true,
            ]
        );

        // 7. Mission Spesial: Webinar Enthusiast
        DailyMission::updateOrCreate(
            ['action_type' => 'watch_session', 'type' => 'special'],
            [
                'title' => json_encode([
                    'id' => 'Webinar Enthusiast',
                    'en' => 'Webinar Enthusiast',
                ]),
                'description' => json_encode([
                    'id' => 'Tonton sesi live conference atau rekaman.',
                    'en' => 'Watch a live conference session or recording.',
                ]),
                'xp_reward' => 75,
                'icon' => 'Video',
                'action_target' => 1,
                'is_active' => true,
            ]
        );
    }
}
