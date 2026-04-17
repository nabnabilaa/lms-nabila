<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class NotificationSeeder extends Seeder
{
    public function run()
    {
        // Cari user yang akan dikasih notif (Sesuaikan email dengan user login Anda)
        // Di seeder sebelumnya kita pakai 'fandi@lms.test' atau user ID 1
        $user = User::where('email', 'fandi@lms.test')->first() ?? User::first();

        if (!$user) {
            $this->command->info('⚠️ Tidak ada user ditemukan untuk diberi notifikasi.');
            return;
        }

        $this->command->info("🔔 Menambahkan notifikasi untuk user: {$user->email}");

        // --- 1. Notifikasi Belum Dibaca (Unread) ---

        // Notif Tipe Success
        \App\Services\NotificationService::send(
            $user,
            'Kursus Selesai! 🎓',
            'Selamat! Anda telah menyelesaikan modul "React Dashboard Integration".',
            'success',
            '/courses' // Dummy Link
        );

        // Notif Tipe Info (Jeda 1 detik agar urutan timestamp beda)
        sleep(1);
        \App\Services\NotificationService::send(
            $user,
            'Jadwal Live Session 📹',
            'Jangan lupa besok ada sesi Q&A bersama instruktur jam 19:00 WIB.',
            'info',
            '/sessions'
        );

        // Notif Tipe Warning
        sleep(1);
        \App\Services\NotificationService::send(
            $user,
            'Tugas Hampir Tenggat ⏳',
            'Tugas "Database Seeding" harus dikumpulkan dalam 24 jam.',
            'warning',
            '/assignments'
        );

        // --- 2. Notifikasi Sudah Dibaca (Read) ---
        // Create manual records via service then update timestamps
        $oldNotifications = [
            [
                'title' => 'Selamat Datang! 👋',
                'message' => 'Selamat bergabung di platform Virtual Intern.',
                'type' => 'info',
                'days_ago' => 5
            ],
            [
                'title' => 'Sertifikat Terbit 🏅',
                'message' => 'Sertifikat kompetensi dasar Anda sudah dapat diunduh.',
                'type' => 'success',
                'days_ago' => 3
            ]
        ];

        foreach ($oldNotifications as $data) {
            \App\Services\NotificationService::send(
                $user,
                $data['title'],
                $data['message'],
                $data['type'],
                '#'
            );

            // Manipulasi langsung ke DB agar terlihat sudah lama dan sudah dibaca
            // Ambil notif terakhir milik user
            $lastNotifId = DB::table('notifications')
                ->where('notifiable_id', $user->id)
                ->where('notifiable_type', get_class($user))
                ->orderBy('created_at', 'desc')
                ->value('id');

            if ($lastNotifId) {
                DB::table('notifications')->where('id', $lastNotifId)->update([
                    'read_at' => now()->subDays($data['days_ago']),
                    'created_at' => now()->subDays($data['days_ago']),
                    'updated_at' => now()->subDays($data['days_ago']),
                ]);
            }
        }

        $this->command->info('✅ Berhasil membuat notifikasi real via NotificationService.');
    }
}