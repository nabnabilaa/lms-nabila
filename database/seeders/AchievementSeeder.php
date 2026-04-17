<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Achievement;
use App\Models\User;
use App\Models\UserAchievement;

class AchievementSeeder extends Seeder
{
    public function run()
    {
        // 1. Create Dynamic Badges based on Real Courses
        $courses = \App\Models\Course::all();

        foreach ($courses as $course) {
            // Get bilingual course title
            $courseTitle = is_array($course->title) ? $course->title : ['id' => $course->title, 'en' => $course->title];
            $courseTitleId = $courseTitle['id'] ?? $courseTitle['en'] ?? '';
            $courseTitleEn = $courseTitle['en'] ?? $courseTitle['id'] ?? '';

            \App\Models\Achievement::updateOrCreate(
                ['criteria_type' => 'course_completion', 'criteria_value' => $course->id],
                [
                    'title' => json_encode([
                        'id' => "Master: {$courseTitleId}",
                        'en' => "Master: {$courseTitleEn}",
                    ]),
                    'description' => json_encode([
                        'id' => "Selesaikan kursus {$courseTitleId} dengan nilai sempurna.",
                        'en' => "Complete the {$courseTitleEn} course with a perfect score.",
                    ]),
                    'icon' => 'Trophy',
                    'points' => 500,
                    'badge_url' => 'emerald'
                ]
            );
        }

        // Add some General Badges
        $generalBadges = [
            [
                'title' => json_encode(['id' => 'First Step', 'en' => 'First Step']),
                'description' => json_encode([
                    'id' => 'Bergabung dalam kelas pertama Anda',
                    'en' => 'Join your first class',
                ]),
                'icon' => 'Flag',
                'color' => 'blue',
                'criteria_type' => 'enrollment_count',
                'criteria_value' => 1,
                'points' => 100
            ],
            [
                'title' => json_encode(['id' => 'Social Butterfly', 'en' => 'Social Butterfly']),
                'description' => json_encode([
                    'id' => 'Ikut serta dalam 5 diskusi',
                    'en' => 'Participate in 5 discussions',
                ]),
                'icon' => 'MessageCircle',
                'color' => 'purple',
                'criteria_type' => 'discussion_count',
                'criteria_value' => 5,
                'points' => 200
            ]
        ];

        foreach ($generalBadges as $badge) {
            \App\Models\Achievement::updateOrCreate(
                ['criteria_type' => $badge['criteria_type'], 'criteria_value' => $badge['criteria_value']],
                [
                    'title' => $badge['title'],
                    'description' => $badge['description'],
                    'icon' => $badge['icon'],
                    'points' => $badge['points'],
                    'badge_url' => $badge['color']
                ]
            );
        }

        // 2. Grant Badges to first user (Real Logic Trigger)
        $fandi = User::where('email', 'fandi@lms.test')->first();
        if (!$fandi && User::count() > 0)
            $fandi = User::first();

        if ($fandi) {
            // Grant 'First Step' badge
            $badge = \App\Models\Achievement::where('criteria_type', 'enrollment_count')
                ->where('criteria_value', 1)
                ->first();
            if ($badge) {
                $exists = UserAchievement::where('user_id', $fandi->id)->where('achievement_id', $badge->id)->exists();
                if (!$exists) {
                    UserAchievement::create([
                        'user_id' => $fandi->id,
                        'achievement_id' => $badge->id,
                        'unlocked_at' => now()
                    ]);
                }
            }
        }
    }
}
