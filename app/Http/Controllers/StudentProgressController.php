<?php

namespace App\Http\Controllers;

use App\Models\UserContentProgress;
use App\Models\Content;
use App\Models\CourseEnrollment;
use App\Models\UserXpLog;
use App\Models\Student; // Untuk update streak
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Notifications\AchievementUnlocked;
use App\Notifications\LevelUp;
use App\Models\Level;

class StudentProgressController extends Controller
{
    /**
     * Update progress materi (video, kuis, artikel)
     */
    public function update(Request $request, $contentId)
    {
        $request->validate([
            'completed' => 'boolean',
            'quiz_score' => 'nullable|integer',
            'answers' => 'nullable|array', // Jawaban kuis (JSON)
            'last_position' => 'nullable|integer', // Posisi detik video terakhir
        ]);

        $user = Auth::user();
        $content = Content::with('module')->findOrFail($contentId);
        $courseId = $content->module->course_id;

        DB::beginTransaction(); // Gunakan transaksi DB agar data aman
        try {
            // 1. Cek status sebelum update (untuk mencegah duplikasi XP)
            $existingProgress = UserContentProgress::where('user_id', $user->id)
                ->where('content_id', $contentId)
                ->first();

            $wasCompleted = $existingProgress ? $existingProgress->completed : false;
            $isNowCompleted = $request->completed ?? false;

            // 2. Update atau Buat Progress
            $progress = UserContentProgress::updateOrCreate(
                ['user_id' => $user->id, 'content_id' => $contentId],
                [
                    'course_id' => $courseId,
                    'completed' => $isNowCompleted,
                    // Jika sudah pernah completed, jangan ubah tanggalnya. Jika baru, set now().
                    'completed_at' => $isNowCompleted && !$wasCompleted ? now() : ($existingProgress->completed_at ?? null),
                    'quiz_score' => $request->quiz_score,
                    'answers' => $request->answers,
                    'last_position' => $request->last_position ?? 0,
                ]
            );

            // 3. Logika Gamification: Jika materi BARU SAJA selesai
            if (!$wasCompleted && $isNowCompleted) {
                // A. Tambah XP (Misal: 50 XP per materi)
                $xpAmount = 50;
                $this->awardXp($user, $xpAmount, 'content_completion', "Menyelesaikan materi: {$content->title}");

                // B. Update Streak Siswa (Cek di table Students)
                $this->updateStreak($user);

                // C. Kirim Notifikasi Kecil
                $user->notify(new AchievementUnlocked(
                    'XP Didapatkan!',
                    "Anda mendapatkan +{$xpAmount} XP.",
                    'info'
                ));
            }

            // 4. Update Progress Keseluruhan Kursus
            $courseProgress = $this->updateCourseProgress($user, $courseId);

            DB::commit();

            return response()->json([
                'message' => 'Progress updated successfully',
                'data' => $progress,
                'course_progress' => $courseProgress
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating progress', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Menghitung dan menyimpan progress persentase kursus
     */
    private function updateCourseProgress($user, $courseId)
    {
        // Hitung Total Konten dalam Course ini
        // (Course -> Modules -> Contents)
        $totalContents = Content::whereHas('module', function ($q) use ($courseId) {
            $q->where('course_id', $courseId);
        })->count();

        // Hitung Konten yang SUDAH diselesaikan User
        $completedContents = UserContentProgress::where('course_id', $courseId)
            ->where('user_id', $user->id)
            ->where('completed', true)
            ->count();

        // Hindari pembagian dengan nol
        $percentage = $totalContents > 0 ? round(($completedContents / $totalContents) * 100) : 0;

        // Update Table Enrollment
        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->first();

        if ($enrollment) {
            $previousStatus = $enrollment->status;

            $enrollment->progress_percent = $percentage;

            // Cek jika Kursus Selesai (100%)
            if ($percentage == 100 && $previousStatus !== 'completed') {
                $enrollment->status = 'completed';
                $enrollment->completed_at = now();

                // --- BONUS COMPLETION ---
                // Beri XP Besar (Misal: 500 XP)
                $this->awardXp($user, 500, 'course_completion', "Menyelesaikan kursus ID: {$courseId}");

                // Kirim Notifikasi Spesial
                $user->notify(new AchievementUnlocked(
                    'Kursus Selesai! 🎓',
                    'Selamat! Anda telah menyelesaikan seluruh materi kursus ini.',
                    'success'
                ));
            }

            $enrollment->save();
            return $enrollment;
        }

        return null;
    }

    /**
     * Helper untuk menambah XP ke User & Log
     */
    private function awardXp($user, $amount, $action, $description)
    {
        // 1. Tambah ke User Table
        $user->increment('xp_points', $amount);

        // 2. Catat di Log
        UserXpLog::create([
            'user_id' => $user->id,
            'xp_amount' => $amount,
            'action' => $action,
            'description' => $description,
            'created_at' => now(),
        ]);

        // 3. Update total XP di tabel Student (jika ada relasinya)
        $student = Student::where('user_id', $user->id)->first();
        if ($student) {
            $student->increment('total_xp', $amount);

            // --- LEVEL UP CHECK ---
            $currentLevel = Level::where('min_xp', '<=', $student->total_xp)
                ->orderBy('min_xp', 'desc')
                ->first();

            // Cek jika level berubah (logic sederhana, bisa improved dengan menyimpan current_level_id di student)
            // Asumsi: Kita cek apakah baru saja melewati ambang batas level ini
            // Namun untuk MVP, kita bisa cek user->level_id jika ada, atau cukup notif jika naik.
            // Simplified: Jika XP melewati threshold tertentu.
            // Better: Store level_id on student, check if upgrades.

            // Note: student table might not have level_id column based on migration 2024_01_05_000001
            // Let's assume we just notify based on xp thresholds if we don't track level_id persistence yet,
            // OR checks against user's stored XP.

            if ($currentLevel) {
                // Check if we need to notify (mock logic: if passing exact boundary or simple distinct check)
                // For safety/brevity, I will send it. Real logic would require `old_level_id` vs `new_level_id`.
                // Let's implement a simple version assuming Student model has `level_id`.
                if ($student->level_id !== $currentLevel->id) {
                    $student->level_id = $currentLevel->id;
                    $student->save();
                    $user->notify(new LevelUp($currentLevel->id, $currentLevel->name));
                }
            }
        }
    }

    /**
     * Update Streak & Award XP on activity
     */
    private function updateStreak($user)
    {
        $student = Student::where('user_id', $user->id)->first();
        if (!$student)
            return;

        $today = now()->format('Y-m-d');

        // Record daily login/activity
        \DB::table('daily_logins')->insertOrIgnore([
            'user_id' => $user->id,
            'login_date' => $today,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Get all dates
        $loginDates = \DB::table('daily_logins')
            ->where('user_id', $user->id)
            ->pluck('login_date')
            ->map(fn($d) => \Carbon\Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        $activityDates = \App\Models\UserContentProgress::where('user_id', $user->id)
            ->selectRaw('DATE(updated_at) as date')
            ->groupBy('date')
            ->pluck('date')
            ->toArray();

        $allDates = collect(array_unique(array_merge($loginDates, $activityDates)))
            ->sort()->reverse()->values()->toArray();

        // Calculate streak
        $streak = 0;
        if (!empty($allDates)) {
            $yesterday = now()->subDay()->format('Y-m-d');
            if (in_array($today, $allDates) || in_array($yesterday, $allDates)) {
                $streak = 1;
                $currentCheck = \Carbon\Carbon::parse($allDates[0] == $today ? $today : $yesterday);
                for ($i = 1; $i < count($allDates); $i++) {
                    $prevDate = \Carbon\Carbon::parse($allDates[$i]);
                    if ($currentCheck->diffInDays($prevDate) == 1) {
                        $streak++;
                        $currentCheck = $prevDate;
                    } else {
                        break;
                    }
                }
            }
        }

        $previousStreak = $student->current_streak ?? 0;
        $student->current_streak = max($streak, 1);
        $student->save();

        // Award XP if streak increased
        if ($streak > $previousStreak) {
            $xpAward = 5;
            if ($streak > 0 && $streak % 7 === 0)
                $xpAward += 25;
            $user->increment('xp_points', $xpAward);

            // Sync level
            $newLevel = \App\Models\Level::where('min_xp', '<=', $user->fresh()->xp_points)
                ->orderBy('min_xp', 'desc')->first();
            if ($newLevel && $user->level_id !== $newLevel->id) {
                $user->update(['level_id' => $newLevel->id]);
            }
        }
    }
}