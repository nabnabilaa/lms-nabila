<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\CourseEnrollment;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Notifications\AchievementUnlocked; // Import Notifikasi
use App\Notifications\CertificateIssued;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

class CertificateController extends Controller
{
    /**
     * Generate Sertifikat Baru (Trigger Notifikasi Disini)
     */
    public function generate(Request $request)
    {
        $request->validate([
            'course_id' => 'required|exists:courses,id',
        ]);

        $user = Auth::user();
        $courseId = $request->course_id;

        // 1. Ambil Data Student
        $student = Student::where('user_id', $user->id)->first();
        if (!$student) {
            return response()->json(['message' => 'Data siswa tidak ditemukan.'], 404);
        }

        // 2. Cek Kelayakan (Apakah kursus sudah selesai?)
        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->where('status', 'completed')
            ->first();

        if (!$enrollment) {
            return response()->json([
                'message' => 'Anda belum menyelesaikan kursus ini. Silakan lengkapi semua materi terlebih dahulu.'
            ], 403);
        }

        // 3. Cek Duplikasi (Jangan buat double)
        $existingCert = Certificate::where('student_id', $student->id)
            ->where('course_id', $courseId)
            ->first();

        if ($existingCert) {
            return response()->json([
                'message' => 'Sertifikat sudah tersedia.',
                'certificate_id' => $existingCert->certificate_id
            ], 200);
        }

        // 4. Buat Sertifikat Baru
        $certId = 'CERT-' . date('Y') . '-' . strtoupper(Str::random(8));

        $certificate = Certificate::create([
            'certificate_id' => $certId,
            'student_id' => $student->id,
            'course_id' => $courseId,
            'issued_at' => now(),
            'total_score' => 0, // Akan dihitung ulang saat 'show'
            'grade' => 'A',     // Placeholder
            'is_published' => true,
        ]);

        // 5. KIRIM NOTIFIKASI (Logic yang Anda minta)
        /* $user->notify(new AchievementUnlocked(
            'Sertifikat Terbit! 🏅',
            'Selamat! Sertifikat kompetensi Anda telah terbit. Klik untuk melihat analisis AI.',
            'success'
        )); */

        // [TRIGGER 4] Certificate Notification
        \App\Services\NotificationService::send(
            $user,
            'Sertifikat Terbit! 🏅',
            'Selamat! Sertifikat kompetensi Anda telah terbit. Klik untuk melihat analisis AI.',
            'success',
            "/certificates/{$certId}",
            [
                'title_key' => 'notif.certificate_issued_title',
                'message_key' => 'notif.certificate_issued_message'
            ]
        );

        // Notify Admins
        $admins = User::where('role', 'admin')->get();
        // Assuming grades are calculated or defaulted. The controller sets grade='A' initially.
        Notification::send($admins, new CertificateIssued($student->name, $certificate->course->title, 'A'));

        return response()->json([
            'message' => 'Sertifikat berhasil diterbitkan!',
            'certificate_id' => $certId
        ], 201);
    }

    public function index(Request $request)
    {
        // Get certificates for the authenticated user via Student model
        $certificates = Certificate::whereHas('student', function ($query) {
            $query->where('user_id', Auth::id());
        })
            ->where('is_published', true) // ENFORCE VERIFICATION
            ->with(['course'])
            ->orderBy('issued_at', 'desc')
            ->get();

        return response()->json($certificates);
    }

    public function show(Request $request, $id)
    {
        // Find certificate by certificate_id (hash) or database ID
        $certificate = Certificate::where('certificate_id', $id)
            ->orWhere('id', $id)
            ->with(['student.user', 'course', 'course.modules'])
            ->firstOrFail();

        if (!$certificate->student || !$certificate->course) {
            return response()->json(['message' => 'Data incomplete'], 404);
        }

        // Security check: Only owner or admin can view (Optional)
        // if ($certificate->student->user_id !== Auth::id()) { ... }

        // --- Calculate REAL scores logic (Sama seperti kode lama) ---
        $enrollment = CourseEnrollment::where('user_id', $certificate->student->user_id)
            ->where('course_id', $certificate->course_id)
            ->first();

        $progressItems = \App\Models\Content::whereHas('module', function ($q) use ($certificate) {
            $q->where('course_id', $certificate->course_id);
        })
            ->leftJoin('user_content_progress', function ($join) use ($certificate) {
                $join->on('contents.id', '=', 'user_content_progress.content_id')
                    ->where('user_content_progress.user_id', $certificate->student->user_id);
            })
            ->join('modules', 'contents.module_id', '=', 'modules.id')
            ->select(
                'modules.id as module_id',
                'modules.title as module_name',
                'contents.type',
                'user_content_progress.completed',
                'user_content_progress.quiz_score'
            )
            ->get();

        // Parse Grading Map from Course config
        $templateConfig = json_decode($certificate->course->certificate_template ?? '{}', true);
        $gradingMap = $templateConfig['gradingMap'] ?? [];

        $modulesWithScores = $progressItems->groupBy('module_name')->map(function ($items) use ($gradingMap, $progressItems) {
            $avgScore = $items->avg(function ($item) {
                if ($item->type === 'quiz') {
                    // Trust the score stored in DB (0-100)
                    return $item->quiz_score ?? 0;
                }
                return $item->completed ? 100 : 0;
            });

            // Find module ID by name (or improve query to include ID)
            $moduleName = $items->first()->module_name;
            // Since we grouped by name, we need to associate back to ID to check map
            // Ideally we should group by ID, but for now we look up in gradingMap by checking logical match or assuming map uses ID
            // NOTE: In AdminCertificateBuilder, key is Module ID. We need Module ID here.
            // Let's rely on the fact that existing logic doesn't easily give ID in the grouping.
            // Improve: Fetch Module ID in query.
            $moduleId = $items->first()->module_id; // Need to ensure select includes module_id

            $weight = 0;
            // Lookup weight
            if (isset($gradingMap[$moduleId]['weight'])) {
                $weight = $gradingMap[$moduleId]['weight'];
            } else {
                // Default fallback if map missing
                $weight = 0; // Will be normalized later if 0
            }

            return [
                'id' => $moduleId,
                'name' => $moduleName,
                'score' => round($avgScore, 1),
                'weight' => $weight
            ];
        })->values();

        // Calculate Weighted Score
        // If weights are 0 or empty, distribute evenly
        $totalWeight = $modulesWithScores->sum('weight');

        if ($totalWeight > 0) {
            // Weighted Calculation
            $totalScore = $modulesWithScores->reduce(function ($carry, $item) {
                return $carry + ($item['score'] * ($item['weight'] / 100));
            }, 0);
        } else {
            // Simple Average Fallback
            $totalScore = $modulesWithScores->isNotEmpty() ? $modulesWithScores->avg('score') : 0;
            // Assign dummy weights for display
            $fallbackWeight = $modulesWithScores->count() > 0 ? floor(100 / $modulesWithScores->count()) : 0;
            $modulesWithScores = $modulesWithScores->map(function ($m) use ($fallbackWeight) {
                $m['weight'] = $fallbackWeight;
                return $m;
            });
        }

        // Grade Logic
        $grade = 'F';
        if ($totalScore >= 90)
            $grade = 'A';
        elseif ($totalScore >= 80)
            $grade = 'B';
        elseif ($totalScore >= 70)
            $grade = 'C';
        elseif ($totalScore >= 60)
            $grade = 'D';

        // --- GEMINI AI INTEGRATION ---
        // MOVED TO ADMIN AREA. User can only view what is published.

        // Final Check: If not published, admin can see it? 
        // Logic: if not published, return 404 or specific message
        if (!$certificate->is_published && $certificate->student->user_id === Auth::id()) {
            // If user is the owner but it's not published yet
            return response()->json(['message' => 'Sertifikat sedang dalam proses verifikasi instruktur.'], 403);
        }

        return response()->json([
            'certificate' => $certificate,
            'details' => [
                'student_name' => $certificate->student->name,
                'course_title' => $certificate->course->title,
                'completion_date' => ($enrollment && $enrollment->completed_at) ? $enrollment->completed_at->format('d F Y') : $certificate->issued_at->format('d F Y'),
                'instructor' => ($certificate->course->instructor) ? $certificate->course->instructor->name : 'Tim Pengajar',
                'modules' => $modulesWithScores,
                'total_score' => round($totalScore, 1),
                'grade' => $grade,
                'skills' => $certificate->grade_breakdown,
                'isPublished' => $certificate->is_published, // Send status to frontend
                'feedback' => [
                    'strengths' => $certificate->strengths,
                    'improvements' => $certificate->improvements,
                    'career' => $certificate->career_recommendation
                ],
                // Return configuration from Course model (which is JSON) or default
                'style_config' => $certificate->course->certificate_template ?? [
                    'templateStyle' => 'modern',
                    'primaryColor' => 'blue',
                    'passingGrade' => 70,
                    'distinctionGrade' => 90
                ]
            ]
        ]);
    }
}