<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Instructor;

class InstructorSeeder extends Seeder
{
    public function run()
    {
        // Get all users with role 'instructor'
        $instructorUsers = User::where('role', 'instructor')->get();

        foreach ($instructorUsers as $user) {
            Instructor::firstOrCreate([
                'user_id' => $user->id
            ]);
        }
    }
}
