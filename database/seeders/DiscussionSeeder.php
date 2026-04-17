<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DiscussionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $courseId = 1;
        $user = \App\Models\User::first();

        // Topic 1
        \App\Models\CourseDiscussion::create([
            'course_id' => $courseId,
            'user_id' => $user->id ?? 1,
            'title' => 'Bagaimana cara setup environment lokal?',
            'body' => 'Saya mengalami kesulitan saat menginstal dependensi dengan npm install. Apakah ada yang pernah mengalami error ERESOLVE?',
            'likes' => 5,
            'dislikes' => 0,
            'is_resolved' => false,
            'replies' => [
                [
                    'id' => uniqid(),
                    'user_id' => 2,
                    'user_name' => 'Rizky Ramadhan',
                    'user_avatar' => null,
                    'body' => 'Coba jalankan dengan flag --legacy-peer-deps, biasanya itu membantu jika ada konflik versi.',
                    'created_at' => now()->subHours(2)->toIso8601String(),
                ],
                [
                    'id' => uniqid(),
                    'user_id' => 3,
                    'user_name' => 'John Smith',
                    'user_avatar' => null,
                    'body' => 'Betul, atau coba hapus node_modules dan package-lock.json lalu install ulang.',
                    'created_at' => now()->subHour(1)->toIso8601String(),
                ]
            ]
        ]);

        // Topic 2
        \App\Models\CourseDiscussion::create([
            'course_id' => $courseId,
            'user_id' => $user->id ?? 1,
            'title' => 'Materi tentang Redux State',
            'body' => 'Apakah modul tentang Redux akan mencakup Redux Toolkit atau hanya Redux biasa?',
            'likes' => 12,
            'dislikes' => 1,
            'is_resolved' => true,
            'replies' => [
                [
                    'id' => uniqid(),
                    'user_id' => 2,
                    'user_name' => 'Instructor Maxy',
                    'user_avatar' => null,
                    'body' => 'Kita akan fokus ke Redux Toolkit karena itu adalah standar modern saat ini.',
                    'created_at' => now()->toIso8601String(),
                ]
            ]
        ]);
    }
}
