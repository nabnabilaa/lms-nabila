<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class LevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $levels = [
            [
                'name' => 'Novice',
                'min_xp' => 0,
                'icon' => 'Award',
                'color_hex' => '#9CA3AF', // Gray
                'description' => 'Langkah awal perjalanan belajarmu.',
            ],
            [
                'name' => 'Apprentice',
                'min_xp' => 500,
                'icon' => 'Shield',
                'color_hex' => '#3B82F6', // Blue
                'description' => 'Mulai menguasai dasar-dasar coding.',
            ],
            [
                'name' => 'Expert',
                'min_xp' => 1500,
                'icon' => 'Zap',
                'color_hex' => '#10B981', // Green
                'description' => 'Kemampuan coding yang solid dan teruji.',
            ],
            [
                'name' => 'Master',
                'min_xp' => 3000,
                'icon' => 'Star',
                'color_hex' => '#F59E0B', // Amber
                'description' => 'Ahli dalam memecahkan masalah kompleks.',
            ],
            [
                'name' => 'Legend',
                'min_xp' => 5000,
                'icon' => 'Crown',
                'color_hex' => '#8B5CF6', // Purple
                'description' => 'Tingkat tertinggi penguasaan teknologi.',
            ],
            [
                'name' => 'Silver Elite', // For compatibility with Seeded User
                'min_xp' => 1000,
                'icon' => 'Trophy',
                'color_hex' => '#94A3B8', // Slate
                'description' => 'Member elit dengan dedikasi tinggi.',
            ]
        ];

        foreach ($levels as $level) {
            \App\Models\Level::create($level);
        }
    }
}
