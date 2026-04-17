<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Disable mass assignment protection to allow setting IDs
        \Illuminate\Database\Eloquent\Model::unguard();

        // Fetch Levels
        $masterParams = \App\Models\Level::where('name', 'Master')->first();
        $expertParams = \App\Models\Level::where('name', 'Expert')->first();
        $silverParams = \App\Models\Level::where('name', 'Silver Elite')->first();

        // 1. Admin
        User::updateOrCreate(['email' => 'admin@lms.test'], [
            'id' => 1,
            'name' => 'Admin',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'status' => 'active',
            'level_id' => $masterParams?->id,
            'xp_points' => 9999,
        ]);

        // 2. Instructor (Rizky)
        User::updateOrCreate(['email' => 'rizky@lms.test'], [
            'id' => 2,
            'name' => 'Rizky Ramadhan',
            'password' => Hash::make('password'),
            'role' => 'instructor',
            'status' => 'active',
            'level_id' => $expertParams?->id,
        ]);

        // 3. Student User (Fandi)
        User::updateOrCreate(['email' => 'fandi@lms.test'], [
            'id' => 3,
            'name' => 'Fandi Ahmad',
            'password' => Hash::make('password'),
            'role' => 'learner',
            'status' => 'active',
            'level_id' => $silverParams?->id,
            'xp_points' => 1250,
            'title' => 'Fullstack Web Developer',
            'bio' => 'Saya adalah seorang pembelajar yang antusias di dunia Web Development. Sedang fokus mendalami Laravel dan React untuk menjadi Fullstack Developer profesional.',
        ]);

        // 4. Dummy Users for Leaderboard (20 People)
        $faker = \Faker\Factory::create('id_ID'); // Indonesian Locale
        $levels = \App\Models\Level::all();

        for ($i = 0; $i < 20; $i++) {
            // Create User first with 0 XP and explicit ID starting from 4
            $user = User::create([
                'id' => $i + 4,
                'name' => $faker->name,
                'email' => $faker->unique()->safeEmail,
                'password' => Hash::make('password'),
                'role' => 'learner',
                'status' => 'active',
                'level_id' => $levels->first()->id,
                'xp_points' => 0,
                'avatar' => null,
                'created_at' => now()->subDays(rand(1, 365))
            ]);

            // Distributed XP Generation
            // 20% Weekly, 30% Monthly, 50% Older
            $totalXp = 0;
            $logsCount = rand(5, 15); // How many activities they did

            for ($j = 0; $j < $logsCount; $j++) {
                $amount = rand(50, 300);
                $rand = rand(1, 100);
                $date = now();

                if ($rand <= 20) {
                    $date = now()->subDays(rand(0, 6)); // This Week
                } elseif ($rand <= 50) {
                    $date = now()->subDays(rand(7, 29)); // This Month
                } else {
                    $date = now()->subDays(rand(30, 300)); // Older
                }

                \App\Models\UserXpLog::create([
                    'user_id' => $user->id,
                    'xp_amount' => $amount,
                    'action' => 'course_completion',
                    'description' => 'Completed a module',
                    'created_at' => $date,
                    'updated_at' => $date
                ]);

                $totalXp += $amount;
            }

            // Sync Total XP & Level
            $level = $levels->where('min_xp', '<=', $totalXp)->sortByDesc('min_xp')->first();
            $user->update([
                'xp_points' => $totalXp,
                'level_id' => $level ? $level->id : $levels->first()->id
            ]);
        }

        \Illuminate\Database\Eloquent\Model::reguard();
    }
}