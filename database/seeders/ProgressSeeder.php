<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\Course;
use App\Models\User;
use App\Models\UserContentProgress;

class ProgressSeeder extends Seeder
{
    public function run()
    {
        // 1. Ambil User & Student
        $fandiUser = User::where('email', 'fandi@lms.test')->first();

        if ($fandiUser) {
            $student = Student::where('user_id', $fandiUser->id)->first();
            $course = Course::where('title->id', 'Fullstack Web Developer Professional')->first();

            if ($student && $course) {
                // Ambil semua modules dari course ini
                $modules = $course->modules()->with('contents')->get();

                // 2. Loop setiap module untuk membuat progress
                foreach ($modules as $index => $module) {
                    // Ambil konten pertama dari module tersebut
                    $content = $module->contents->first();

                    // Skip jika module tidak punya konten (menghindari error id null)
                    if (!$content)
                        continue;

                    // Tentukan status: 3 module pertama completed, sisanya in_progress
                    $status = ($index < 3) ? 'completed' : 'in_progress';

                    // FIX: Hapus 'content_type', Tambahkan 'course_id'
                    UserContentProgress::updateOrCreate([
                        'user_id' => $fandiUser->id,
                        'content_id' => $content->id,
                    ], [
                        'course_id' => $course->id, // WAJIB DIISI (Sesuai struktur table)
                        'completed' => $status === 'completed',
                        'completed_at' => $status === 'completed' ? now()->subDays(rand(1, 7)) : null,
                        'last_position' => 0,
                        'quiz_score' => $status === 'completed' ? rand(80, 100) : null,
                        'updated_at' => now()->subMinutes(rand(10, 60))
                    ]);
                }

                // 3. SIMULASI STREAK (Update timestamp agar tersebar di 7 hari terakhir)
                $completedContents = UserContentProgress::where('user_id', $fandiUser->id)
                    ->where('completed', true)
                    ->take(7)
                    ->get();

                foreach ($completedContents as $idx => $progress) {
                    $progress->updated_at = now()->subDays($idx);
                    $progress->save();
                }
            }
        }
    }
}