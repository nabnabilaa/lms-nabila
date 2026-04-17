<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CertificateTemplate;
use App\Models\CertificateMapping;
use App\Models\Certificate;
use App\Models\User;
use App\Models\Course;
use App\Models\Student;
use Illuminate\Support\Str;

class CertificateSeeder extends Seeder
{
    public function run()
    {
        // Create Default Template (Classic)
        $template = CertificateTemplate::create([
            'name' => 'Default Professional', // classic
            'background_url' => 'certificates/default-bg.jpg',
            'orientation' => 'landscape',
            'is_active' => true,
        ]);

        // Create Modern Template
        $modernTemplate = CertificateTemplate::create([
            'name' => 'Modern Blue', // modern
            'background_url' => 'certificates/modern-bg.jpg',
            'orientation' => 'landscape',
            'is_active' => true,
        ]);

        // Create Tech Template
        $techTemplate = CertificateTemplate::create([
            'name' => 'Tech Dark', // tech
            'background_url' => 'certificates/tech-bg.jpg',
            'orientation' => 'landscape',
            'is_active' => true,
        ]);

        // Create Mappings
        $mappings = [
            [
                'field_name' => 'student_name',
                'x_position' => 100,
                'y_position' => 200,
                'font_size' => 36,
                'color' => '#000000',
            ],
            [
                'field_name' => 'course_title',
                'x_position' => 100,
                'y_position' => 300,
                'font_size' => 24,
                'color' => '#333333',
            ],
            [
                'field_name' => 'completion_date',
                'x_position' => 100,
                'y_position' => 400,
                'font_size' => 14,
                'color' => '#666666',
            ],
        ];

        foreach ($mappings as $map) {
            $template->mappings()->create($map);
        }

        // Create a Mock Certificate WITH Real Prerequisite Data
        $fandiUser = User::where('email', 'fandi@lms.test')->first();
        $student = $fandiUser ? Student::where('user_id', $fandiUser->id)->first() : null;
        //$student = Student::first(); // OLD logic
        $course = Course::first();

        if ($student && $course) {
            $user = $student->user;

            // 1. Ensure Course Enrollment is 'completed'
            \App\Models\CourseEnrollment::updateOrCreate(
                ['user_id' => $user->id, 'course_id' => $course->id],
                [
                    'status' => 'completed',
                    'enrolled_at' => now()->subMonth(),
                    'completed_at' => now()->subDay(),
                    'progress_percent' => 100
                ]
            );

            // 2. Add Quiz Scores to UserContentProgress
            $contents = \App\Models\Content::whereHas('module', function ($q) use ($course) {
                $q->where('course_id', $course->id);
            })->get();

            foreach ($contents as $content) {
                $answers = null;
                if ($content->type === 'quiz' && $content->body) {
                    $questions = json_decode($content->body, true);
                    if (is_array($questions)) {
                        $answers = [];
                        foreach ($questions as $index => $q) {
                            $answers[$index] = $q['correct'] ?? 0;
                        }
                    }
                }

                \App\Models\UserContentProgress::updateOrCreate(
                    ['user_id' => $user->id, 'content_id' => $content->id],
                    [
                        'course_id' => $course->id,
                        'completed' => true,
                        'completed_at' => now()->subDays(rand(1, 5)),
                        'quiz_score' => rand(85, 95),
                        'answers' => $answers
                    ]
                );
            }

            // 3. Create Certificate
            Certificate::create([
                'certificate_id' => 'MAXY-CERT-' . date('Y') . '-' . Str::upper(Str::random(6)),
                'student_id' => $student->id,
                'course_id' => $course->id,
                'issued_at' => now(),
                'certificate_template_id' => $template->id,

                // PERUBAHAN DISINI: Set null agar digenerate otomatis oleh React
                'file_url' => null,

                'final_score' => 92.5,
                'grade_breakdown' => [
                    'Backend Development' => 90,
                    'Frontend Architecture' => 88,
                    'Database Design' => 92
                ],
                'strengths' => 'Demonstrated strong understanding of backend architecture and database design.',
                'improvements' => 'Could improve on frontend component optimization and state management complexity.',
                'career_recommendation' => 'Highly recommended for a Junior Fullstack Engineer role or Backend Specialist.',
                'mentor_review' => 'Student has consistently shown great problem-solving skills and dedication throughout the course.',
                'is_published' => true, // VERIFIED: Visible to user
            ]);
        }

        // --- COURSE 2: Cyber Security (For AI Generation Test) ---
        $course2 = Course::where('title->id', 'Cyber Security Fundamentals')->first();
        if ($student && $course2) {
            $user = $student->user;

            // 1. Enrollment
            \App\Models\CourseEnrollment::updateOrCreate(
                ['user_id' => $user->id, 'course_id' => $course2->id],
                [
                    'status' => 'completed',
                    'enrolled_at' => now()->subMonths(2),
                    'completed_at' => now()->subDays(2),
                    'progress_percent' => 100
                ]
            );

            // 2. Progress with Answers
            $contents2 = \App\Models\Content::whereHas('module', function ($q) use ($course2) {
                $q->where('course_id', $course2->id);
            })->get();

            foreach ($contents2 as $content) {
                $answers = null;
                if ($content->type === 'quiz' && $content->body) {
                    $questions = json_decode($content->body, true);
                    if (is_array($questions)) {
                        $answers = [];
                        foreach ($questions as $index => $q) {
                            $answers[$index] = $q['correct'] ?? 0;
                        }
                    }
                }

                \App\Models\UserContentProgress::updateOrCreate(
                    ['user_id' => $user->id, 'content_id' => $content->id],
                    [
                        'course_id' => $course2->id,
                        'completed' => true,
                        'completed_at' => now()->subDays(rand(1, 4)),
                        'quiz_score' => 100,
                        'answers' => $answers
                    ]
                );
            }

            // 3. Certificate
            Certificate::create([
                'certificate_id' => 'MAXY-CYBER-' . date('Y') . '-' . Str::upper(Str::random(6)),
                'student_id' => $student->id,
                'course_id' => $course2->id,
                'issued_at' => now(),
                'certificate_template_id' => $template->id,

                // PERUBAHAN DISINI: Set null juga agar fitur generate frontend berjalan
                'file_url' => null,

                'final_score' => 88.0,
                'grade_breakdown' => null,
                'strengths' => null,
                'improvements' => null,
                'career_recommendation' => null,
                'is_published' => false, // UNVERIFIED: Hidden from user
            ]);
        }
    }
}