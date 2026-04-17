<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Course;
use App\Models\Module;
use App\Models\User;

class CourseSeeder extends Seeder
{
    public function run()
    {
        // Cari instruktur Rizky
        $instructor = User::where('email', 'rizky@lms.test')->first();

        if ($instructor) {
            // Create Course 1
            $course1 = Course::create([
                'title' => ['id' => 'Fullstack Web Developer Professional', 'en' => 'Professional Fullstack Web Developer'],
                'description' => ['id' => 'Kuasai logika backend, arsitektur sistem, dan frontend modern.', 'en' => 'Master backend logic, system architecture, and modern frontend.'],
                'instructor_id' => $instructor->id,
                'difficulty' => 'advanced',
                'rating' => 4.9,
                'duration_minutes' => 600,
                'is_active' => true,
                'is_premium' => false,
                'price' => 0,
                'certificate_template' => json_encode([
                    'templateStyle' => 'modern', // Force Modern Style
                    'orientation' => 'landscape',
                    'elements' => [
                        ['id' => 'bg', 'type' => 'image', 'src' => '/certificates/bg-default.png', 'x' => 0, 'y' => 0, 'width' => 842, 'height' => 595],
                        ['id' => 'name', 'type' => 'text', 'text' => '{student_name}', 'x' => 421, 'y' => 280, 'fontSize' => 40, 'fontFamily' => 'Serif', 'color' => '#000000', 'align' => 'center'],
                        ['id' => 'title', 'type' => 'text', 'text' => '{course_title}', 'x' => 421, 'y' => 350, 'fontSize' => 24, 'fontFamily' => 'Sans', 'color' => '#555555', 'align' => 'center'],
                        ['id' => 'date', 'type' => 'text', 'text' => 'Has successfully completed on {date}', 'x' => 421, 'y' => 420, 'fontSize' => 16, 'fontFamily' => 'Sans', 'color' => '#777777', 'align' => 'center'],
                    ]
                ]),
            ]);

            // Modules for Course 1
            $modules1 = [
                [
                    'title' => ['id' => 'Introduction to Fullstack', 'en' => 'Introduction to Fullstack'],
                    'description' => ['id' => 'Overview of fullstack development', 'en' => 'Overview of fullstack development'],
                    'type' => 'video',
                    'duration_minutes' => 45,
                    'order' => 1,
                ],
                [
                    'title' => ['id' => 'Database Design', 'en' => 'Database Design'],
                    'description' => ['id' => 'Learn database architecture and design patterns', 'en' => 'Learn database architecture and design patterns'],
                    'type' => 'video',
                    'duration_minutes' => 80,
                    'order' => 2,
                ],
                [
                    'title' => ['id' => 'Laravel Basics', 'en' => 'Laravel Fundamentals'],
                    'description' => ['id' => 'Master Laravel framework fundamentals', 'en' => 'Master Laravel framework fundamentals'],
                    'type' => 'practice',
                    'duration_minutes' => 135,
                    'order' => 3,
                ],
                [
                    'title' => ['id' => 'API Development', 'en' => 'API Development'],
                    'description' => ['id' => 'Build RESTful APIs with Laravel', 'en' => 'Build RESTful APIs with Laravel'],
                    'type' => 'video',
                    'duration_minutes' => 105,
                    'order' => 4,
                ],
                [
                    'title' => ['id' => 'React Frontend', 'en' => 'React Frontend'],
                    'description' => ['id' => 'Create modern frontends with React', 'en' => 'Create modern frontends with React'],
                    'type' => 'quiz',
                    'duration_minutes' => 50,
                    'order' => 5,
                ],
            ];

            foreach ($modules1 as $moduleData) {
                Module::create(array_merge($moduleData, ['course_id' => $course1->id]));
            }

            // Create Course 2: Cyber Security Fundamentals
            $course2 = Course::updateOrCreate(
                ['title->id' => 'Cyber Security Fundamentals'],
                [
                    'title' => ['id' => 'Cyber Security Fundamentals', 'en' => 'Cyber Security Fundamentals'],
                    'description' => ['id' => 'Pelajari dasar keamanan jaringan, enkripsi, dan ethical hacking.', 'en' => 'Learn network security basics, encryption, and ethical hacking.'],
                    'instructor_id' => $instructor->id,
                    'difficulty' => 'intermediate',
                    'rating' => 4.8,
                    'duration_minutes' => 420,
                    'is_active' => true,
                    'is_premium' => false,
                    'price' => 0,
                    'certificate_template' => json_encode([
                        'templateStyle' => 'tech',
                        'orientation' => 'landscape',
                        'elements' => [
                            ['id' => 'bg', 'type' => 'image', 'src' => '/certificates/bg-cyber.png', 'x' => 0, 'y' => 0, 'width' => 842, 'height' => 595],
                            ['id' => 'name', 'type' => 'text', 'text' => '{student_name}', 'x' => 421, 'y' => 280, 'fontSize' => 40, 'fontFamily' => 'Serif', 'color' => '#000000', 'align' => 'center'],
                            ['id' => 'title', 'type' => 'text', 'text' => '{course_title}', 'x' => 421, 'y' => 350, 'fontSize' => 24, 'fontFamily' => 'Sans', 'color' => '#555555', 'align' => 'center'],
                            ['id' => 'date', 'type' => 'text', 'text' => 'Has successfully completed on {date}', 'x' => 421, 'y' => 420, 'fontSize' => 16, 'fontFamily' => 'Sans', 'color' => '#777777', 'align' => 'center'],
                        ]
                    ]),
                ]
            );

            // Modules for Course 2
            $modules2 = [
                [
                    'title' => ['id' => 'Network Security Basics', 'en' => 'Network Security Basics'],
                    'description' => ['id' => 'Firewalls, VPNs, and Protocols', 'en' => 'Firewalls, VPNs, and Protocols'],
                    'type' => 'video',
                    'duration_minutes' => 60,
                    'order' => 1,
                ],
                [
                    'title' => ['id' => 'Cryptography & Encryption', 'en' => 'Cryptography & Encryption'],
                    'description' => ['id' => 'Understanding SSL/TLS and Hashing', 'en' => 'Understanding SSL/TLS and Hashing'],
                    'type' => 'video',
                    'duration_minutes' => 90,
                    'order' => 2,
                ],
                [
                    'title' => ['id' => 'Ethical Hacking 101', 'en' => 'Ethical Hacking 101'],
                    'description' => ['id' => 'Penetration testing fundamentals', 'en' => 'Penetration testing fundamentals'],
                    'type' => 'quiz',
                    'duration_minutes' => 120,
                    'order' => 3,
                ],
            ];

            foreach ($modules2 as $moduleData) {
                Module::create(array_merge($moduleData, ['course_id' => $course2->id]));
            }

            // Create Course 3: PREMIUM COURSE
            $course3 = Course::updateOrCreate(
                ['title->id' => 'React Native Masterclass (Premium)'],
                [
                    'title' => ['id' => 'React Native Masterclass (Premium)', 'en' => 'React Native Masterclass (Premium)'],
                    'description' => ['id' => 'Bangun aplikasi mobile Android & iOS dengan React Native dan Expo. Studi kasus: E-Commerce App.', 'en' => 'Build Android & iOS mobile apps with React Native and Expo. Case study: E-Commerce App.'],
                    'instructor_id' => $instructor->id,
                    'difficulty' => 'advanced',
                    'rating' => 5.0,
                    'duration_minutes' => 850,
                    'is_active' => true,
                    'is_premium' => true,
                    'price' => 150000,
                    'certificate_template' => json_encode([
                        'templateStyle' => 'classic',
                        'orientation' => 'landscape',
                        'elements' => []
                    ]),
                ]
            );

            $modules3 = [
                ['title' => ['id' => 'React Native setup', 'en' => 'React Native Setup'], 'type' => 'video', 'duration_minutes' => 60, 'order' => 1],
                ['title' => ['id' => 'Building UI Components', 'en' => 'Building UI Components'], 'type' => 'video', 'duration_minutes' => 120, 'order' => 2],
                ['title' => ['id' => 'Navigation & Routing', 'en' => 'Navigation & Routing'], 'type' => 'practice', 'duration_minutes' => 90, 'order' => 3],
            ];

            foreach ($modules3 as $moduleData) {
                Module::create(array_merge($moduleData, ['course_id' => $course3->id]));
            }
        }
    }
}