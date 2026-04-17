<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Course;
use App\Models\User;
use App\Models\CourseEnrollment;
use App\Models\CourseSession;
use App\Models\CourseDiscussion; // PERBAIKAN 1: Gunakan model yang benar

class EngagementSeeder extends Seeder
{
    public function run()
    {
        $course = Course::where('title->id', 'Fullstack Web Developer Professional')->first();
        $instructor = User::where('email', 'rizky@lms.test')->first();
        $student = User::where('email', 'fandi@lms.test')->first();

        if ($course && $instructor && $student) {
            // Enroll Student
            CourseEnrollment::updateOrCreate([
                'user_id' => $student->id,
                'course_id' => $course->id,
            ], [
                'enrolled_at' => now()->subDays(5),
                'status' => 'active',
                'progress_percent' => 15.5,
            ]);

            // Ensure Instructor exists in instructors table
            $instructorRecord = \App\Models\Instructor::firstOrCreate(['user_id' => $instructor->id]);

            // Create Live Session
            CourseSession::create([
                'course_id' => $course->id,
                'instructor_id' => $instructorRecord->id, // Use Instructor ID, not User ID
                'title' => 'Weekly Q&A: Laravel & React',
                'description' => 'Discussing common issues in integrating Sanctum.',
                'start_time' => now()->addDays(2)->setHour(19)->setMinute(0),
                'end_time' => now()->addDays(2)->setHour(20)->setMinute(30),
                'meeting_url' => 'https://zoom.us/j/123456789',
            ]);

            // Create Discussion
            // PERBAIKAN 2: Ganti Discussion menjadi CourseDiscussion
            CourseDiscussion::create([
                'course_id' => $course->id,
                'user_id' => $student->id,
                'title' => 'Error when installing Sanctum',
                'body' => 'I keep getting 500 error when logging in. Does anyone know why?',
                'is_resolved' => false,
                // 'views' => 12, // PERBAIKAN 3: Dihapus karena kolom tidak ada di database
            ]);

            // --- VERIFICATION FOR FILTERING ---
            // Create a "Completed" Course for testing filters
            $completedCourse = Course::firstOrCreate([
                'title' => 'Mastering React',
            ], [
                'description' => 'Advanced React patterns and performance.',
                'instructor_id' => $instructor->id,
                'difficulty' => 'intermediate',
                'rating' => 4.8,
                'duration_minutes' => 400,
                'is_active' => true,
            ]);

            // Enroll Student as Completed
            CourseEnrollment::updateOrCreate([
                'user_id' => $student->id,
                'course_id' => $completedCourse->id,
            ], [
                'enrolled_at' => now()->subDays(60),
                'completed_at' => now()->subDays(10),
                'status' => 'completed',
                'progress_percent' => 100,
            ]);

            // Create additional enrollments spread across 6 months for graph trend
            $courses = Course::where('instructor_id', $instructor->id)->get();
            $monthOffsets = [5, 4, 3, 2, 2, 1, 1, 0, 0, 0]; // upward trend: more recent = more enrollments
            foreach ($monthOffsets as $idx => $monthsAgo) {
                $dummyStudent = User::create([
                    'name' => 'Student Demo ' . ($idx + 1),
                    'email' => 'demo_student_' . ($idx + 1) . '@lms.test',
                    'password' => bcrypt('password'),
                    'role' => 'learner',
                ]);

                // Pick a course to enroll in (alternate between available courses)
                $targetCourse = $courses->count() > 0
                    ? $courses[$idx % $courses->count()]
                    : $course;

                $enrollDate = now()->subMonths($monthsAgo)->startOfMonth()->addDays(rand(0, 20));

                CourseEnrollment::create([
                    'user_id' => $dummyStudent->id,
                    'course_id' => $targetCourse->id,
                    'enrolled_at' => $enrollDate,
                    'status' => 'active',
                    'progress_percent' => rand(0, 80),
                ]);
            }
        }
    }
}