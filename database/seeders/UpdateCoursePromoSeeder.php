<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Course;
use App\Models\Coupon;

class UpdateCoursePromoSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Coupon Exists
        Coupon::firstOrCreate(
            ['code' => 'QR_SPECIAL_50'],
            [
                'type' => 'percent',
                'value' => 50,
                'max_uses' => 1000,
                'is_active' => true,
                'expires_at' => now()->addYear(),
            ]
        );

        Coupon::firstOrCreate(
            ['code' => 'MANUAL_10'],
            [
                'type' => 'percent',
                'value' => 10,
                'max_uses' => 1000,
                'is_active' => true,
                'expires_at' => now()->addYear(),
            ]
        );

        // 2. Assign to First Premium Course
        $course = Course::where('is_premium', true)->first();

        if ($course) {
            $course->promoted_coupon_code = 'QR_SPECIAL_50';
            $course->save();
            $this->command->info("✅ Assigned QR_SPECIAL_50 to Course: {$course->title}");
        } else {
            $this->command->warn("⚠️ No premium course found to assign promo.");
        }
    }
}
