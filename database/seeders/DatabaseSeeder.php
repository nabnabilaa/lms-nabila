<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            LevelSeeder::class,
            UserSeeder::class,
            InstructorSeeder::class,
            StudentSeeder::class,

            CouponSeeder::class, // Added
            CourseSeeder::class,
            ContentSeeder::class,
            EngagementSeeder::class,
            DiscussionSeeder::class,
            ProgressSeeder::class,
            CertificateSeeder::class,
            AchievementSeeder::class,
            DailyMissionSeeder::class,
            NotificationSeeder::class,
            UpdateCoursePromoSeeder::class,
        ]);

        $this->command->info('✅ All Tables Seeded Successfully!');
    }
}