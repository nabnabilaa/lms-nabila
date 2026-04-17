<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\User;

class StudentSeeder extends Seeder
{
    public function run()
    {
        // Cari user Fandi
        $user = User::where('email', 'fandi@lms.test')->first();

        if ($user) {
            Student::create([
                'user_id' => $user->id,
                'name' => $user->name,
                'level' => 'Silver Elite',
                'total_xp' => 1250,
                'current_streak' => 7,
            ]);
        }
    }
}