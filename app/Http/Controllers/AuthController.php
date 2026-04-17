<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Notifications\NewInstructorRegistration;
use App\Notifications\NewStudentRegistration;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Hash;
use App\Models\Student;
use App\Models\Instructor;
use App\Models\DailyMission;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'code' => 'sometimes|string', // OTP Code
        ]);

        $user = User::where('email', $request->email)->first();

        if ($user && Auth::attempt(['email' => $request->email, 'password' => $request->password])) {

            // Check if suspended
            if ($user->status === 'suspended') {
                return response()->json([
                    'success' => false,
                    'message' => 'Your account has been suspended. Please contact support.'
                ], 403);
            }

            // 2FA Check
            if ($user->two_factor_confirmed_at) {
                // If code is missing or invalid
                if (!$request->code) {
                    return response()->json([
                        'success' => true,
                        'two_factor' => true,
                        'message' => 'OTP Code Required'
                    ]);
                }

                $google2fa = new \PragmaRX\Google2FA\Google2FA();
                $valid = $google2fa->verifyKey($user->two_factor_secret, $request->code);

                if (!$valid) {
                    // Check recovery codes
                    $recoveryCodes = $user->two_factor_recovery_codes ? json_decode(decrypt($user->two_factor_recovery_codes), true) : [];
                    if (in_array($request->code, $recoveryCodes)) {
                        // Remove used code
                        $recoveryCodes = array_values(array_diff($recoveryCodes, [$request->code]));
                        $user->two_factor_recovery_codes = encrypt(json_encode($recoveryCodes));
                        $user->save();
                    } else {
                        return response()->json([
                            'success' => false,
                            'message' => 'Invalid OTP Code',
                        ], 422);
                    }
                }
            }

            $user->syncLevel(); // Ensure level matches XP
            $user->load(['level', 'achievements']);
            $token = $user->createToken('auth-token')->plainTextToken;

            // [TRIGGER 9 & Student Trigger 3] Global Login Alert
            // Notify when login occurs on new device (simplified: always notify on login for security awareness as req)
            $userAgent = $request->header('User-Agent');
            \App\Services\NotificationService::send(
                $user,
                'Login Baru Terdeteksi 🛡️',
                "Login baru pada akun Anda. Perangkat: " . substr($userAgent, 0, 100) . "...",
                'warning',
                '/settings/security',
                [
                    'title_key' => 'notif.login_detected_title',
                    'message_key' => 'notif.login_detected_message',
                    'message_params' => ['device' => substr($userAgent, 0, 100)]
                ]
            );

            return response()->json([
                'success' => true,
                'user' => $user,
                'token' => $token,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid credentials',
        ], 401);
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:learner,instructor',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'], // 'learner' or 'instructor'
            'avatar' => null, // Default
            'xp_points' => 0,
        ]);

        // Create specific profile based on role
        if ($validated['role'] === 'learner') {
            Student::create(['user_id' => $user->id, 'total_xp' => 0]);

            // [TRIGGER 1] Welcome Notification to Student
            \App\Services\NotificationService::send(
                $user,
                'Selamat Datang di Learning Platform!',
                'Terima kasih telah bergabung. Mulai perjalanan belajar Anda sekarang dengan mendaftar ke kelas bootcamp pertama Anda.',
                'success',
                '/courses',
                [
                    'title_key' => 'notif.welcome_student_title',
                    'message_key' => 'notif.welcome_student_message'
                ]
            );

        } elseif ($validated['role'] === 'instructor') {
            // Create Instructor Profile (assuming Instructor model exists)
            Instructor::create(['user_id' => $user->id, 'bio' => 'New Instructor']); // Adjust fields as needed

            // [TRIGGER 1] Welcome Notification to Instructor
            \App\Services\NotificationService::send(
                $user,
                'Selamat Datang, Instructor!',
                'Akun instruktur Anda telah dibuat. Lengkapi profil Anda dan mulai buat kelas baru.',
                'success',
                '/instructor/dashboard',
                [
                    'title_key' => 'notif.welcome_instructor_title',
                    'message_key' => 'notif.welcome_instructor_message'
                ]
            );
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'user' => $user,
            'token' => $token,
            'message' => 'Registration successful'
        ], 201);
    }



    public function me(Request $request)
    {
        $user = $request->user();

        if ($user->status === 'suspended') {
            return response()->json(['message' => 'Account suspended'], 403);
        }

        $user->syncLevel(); // Ensure level matches XP
        $user->scanAchievements(); // Sync Badges with Real Progress
        $user->load(['level', 'achievements']); // Load Level & Achievements

        // Calculate Stats
        $student = \App\Models\Student::where('user_id', $user->id)->first();
        $certificatesCount = $student ? \App\Models\Certificate::where('student_id', $student->id)->count() : 0;

        // Count fully completed contents
        $modulesCompleted = \App\Models\UserContentProgress::where('user_id', $user->id)
            ->where('completed', true)
            ->count();

        // Weekly Target Calculation
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();
        $modulesCompletedThisWeek = \App\Models\UserContentProgress::where('user_id', $user->id)
            ->where('completed', true)
            ->whereBetween('updated_at', [$startOfWeek, $endOfWeek])
            ->count();

        // Target is arbitrarily 5 modules per week
        $weeklyTarget = 5;
        $weeklyProgressPercent = min(100, round(($modulesCompletedThisWeek / $weeklyTarget) * 100));

        // Calculate Average Score
        $avgScore = $student ? \App\Models\Certificate::where('student_id', $student->id)->avg('final_score') : 0;
        $avgScore = $avgScore ?? 0;

        // Estimate Learning Hours
        $learningHours = $modulesCompleted * 2;

        // ===== DAILY LOGIN TRACKING + STREAK SYSTEM =====
        $today = now()->format('Y-m-d');

        // Record daily login (insert or ignore if already exists today)
        \DB::table('daily_logins')->insertOrIgnore([
            'user_id' => $user->id,
            'login_date' => $today,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Auto-complete 'login' type daily missions
        $loginMissions = DailyMission::active()
            ->where('action_type', 'login')
            ->get();

        foreach ($loginMissions as $mission) {
            $mission->incrementProgress($user);
        }

        // Get all unique active dates (merge daily_logins + activity dates)
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

        // Merge and deduplicate, sort desc
        $allDates = collect(array_unique(array_merge($loginDates, $activityDates)))
            ->sort()
            ->reverse()
            ->values()
            ->toArray();

        // Calculate streak from merged dates
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

        // Fallback for demo/seeder
        if ($streak == 0 && $modulesCompleted > 0)
            $streak = 1;

        // Persist streak + Award XP
        if ($student) {
            $previousStreak = $student->current_streak ?? 0;
            $student->current_streak = $streak;
            $student->save();

            // Award XP if streak increased today (first login of the day)
            $loginCountToday = \DB::table('daily_logins')
                ->where('user_id', $user->id)
                ->where('login_date', $today)
                ->count();

            // Only award once per day (the insert was "insertOrIgnore" so we can check created_at)
            if ($streak > $previousStreak || ($streak >= 1 && $loginCountToday === 1)) {
                $xpAward = 5; // Base daily XP
                $bonusMsg = '';

                // Bonus every 7 days
                if ($streak > 0 && $streak % 7 === 0) {
                    $xpAward += 25;
                    $bonusMsg = " (+25 bonus streak 7 hari!)";
                }

                $user->increment('xp_points', $xpAward);

                // Sync level after XP change
                $newLevel = \App\Models\Level::where('min_xp', '<=', $user->fresh()->xp_points)
                    ->orderBy('min_xp', 'desc')
                    ->first();
                if ($newLevel && $user->level_id !== $newLevel->id) {
                    $user->update(['level_id' => $newLevel->id]);
                }
            }
        }

        // Level Progress
        $currentLevel = $user->level;
        $nextLevel = \App\Models\Level::where('min_xp', '>', $user->xp_points)->orderBy('min_xp', 'asc')->first();
        $nextLevelName = $nextLevel ? $nextLevel->name : 'Max Level';
        $xpToNext = $nextLevel ? ($nextLevel->min_xp - $user->xp_points) : 0;

        // Enrolled Courses with Progress
        $enrolledCourses = \App\Models\CourseEnrollment::where('user_id', $user->id)
            ->with('course.modules')
            ->get()
            ->map(function ($enrollment) {
                $course = $enrollment->course;
                $totalModules = $course->modules->count();
                $completedModules = round(($enrollment->progress_percent / 100) * $totalModules);

                return [
                    'id' => $course->id,
                    'title' => $course->title,
                    'thumbnail' => $course->thumbnail,
                    'progress_percent' => $enrollment->progress_percent,
                    'total_modules' => $totalModules,
                    'completed_modules' => $completedModules,
                    'status' => $enrollment->status
                ];
            });

        // ... (existing student stats calculation) ...

        $instructorStats = [];
        if ($user->role === 'instructor') {
            // 1. Total Students & Total Courses
            // Courses are linked to UserID via instructor_id
            $coursesTaught = \App\Models\Course::where('instructor_id', $user->id)->get();
            $totalCourses = $coursesTaught->count();

            // Get all course IDs
            $courseIds = $coursesTaught->pluck('id');

            // Count unique students enrolled in these courses
            $totalStudents = \App\Models\CourseEnrollment::whereIn('course_id', $courseIds)
                ->distinct('user_id')
                ->count('user_id');

            // 2. Average Rating
            $avgRating = $coursesTaught->avg('rating') ?? 0;

            // 3. Teaching Hours
            // Sessions are linked to InstructorID (which is Users -> Instructor table)
            // First get Instructor ID
            $instructor = \App\Models\Instructor::where('user_id', $user->id)->first();
            $teachingHours = 0;

            if ($instructor) {
                // Get all sessions for this instructor
                $sessions = \App\Models\CourseSession::where('instructor_id', $instructor->id)->get();
                foreach ($sessions as $session) {
                    if ($session->start_time && $session->end_time) {
                        $teachingHours += $session->start_time->diffInHours($session->end_time);
                    }
                }
            }

            // 4. Certificates Issued
            // Certificates are linked to Course -> properties of Certificate model?
            // Actually Certificate belongsTo Course. 
            // We need to count certificates where course_id is in $courseIds
            $certificatesIssued = \App\Models\Certificate::whereIn('course_id', $courseIds)->count();

            $instructorStats = [
                'total_students' => $totalStudents,
                'total_courses' => $totalCourses,
                'active_classes' => $totalCourses, // Alias
                'teaching_hours' => round($teachingHours, 1),
                'average_rating' => round($avgRating, 1),
                'certificates_issued' => $certificatesIssued
            ];
        }

        $userData = $user->toArray();
        $userData['stats'] = [
            'certificates_count' => $certificatesCount,
            'modules_completed' => $modulesCompleted,
            'user_average_score' => round($avgScore, 1), // Renamed to avoid confusion
            'learning_hours' => $learningHours,
            'daily_streak' => $streak,
            'weekly_target_percent' => $weeklyProgressPercent,
            'modules_this_week' => $modulesCompletedThisWeek,
            'xp_to_next_level' => $xpToNext,
            'next_level_name' => $nextLevelName,
            // Merge Instructor Stats if applicable
            ...($instructorStats ?? [])
        ];
        $userData['enrolled_courses'] = $enrolledCourses;

        return response()->json($userData);
    }

    public function users()
    {
        // Define Start Dates for Periods
        $startOfWeek = now()->startOfWeek();
        $startOfMonth = now()->startOfMonth();

        // Simplified query to prevent 500 errors if xp_logs relation has issues
        // We can add the sums back later if critical, but for now getting the list is priority
        $users = \App\Models\User::with(['level', 'enrolledCourses'])
            ->orderBy('id', 'desc') // Latest users first
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'xp_points' => $user->xp_points,
                    'level' => $user->level,
                    'created_at' => $user->created_at,
                    'role' => $user->role,
                    'status' => $user->status, // Ensure status is returned
                    'enrolledCourses' => $user->enrolledCourses // Assuming relations needed for stats
                ];
            });

        return response()->json($users);
    }

    public function updateUserStatus(Request $request, $id)
    {
        $user = \App\Models\User::findOrFail($id);

        $validated = $request->validate([
            'role' => 'required|in:admin,instructor,learner',
            'status' => 'required|in:active,suspended'
        ]);

        $user->role = $validated['role'];
        $user->status = $validated['status'];
        $user->save();

        // [Student Trigger 2] Account Suspended Notification
        if ($validated['status'] === 'suspended') {
            \App\Services\NotificationService::send(
                $user,
                'Akun Ditangguhkan ⚠️',
                'Akun Anda telah ditangguhkan oleh Admin. Hubungi dukungan untuk info lebih lanjut.',
                'error',
                '#',
                [
                    'title_key' => 'notif.account_suspended_title',
                    'message_key' => 'notif.account_suspended_message'
                ]
            );
        }

        // [ADMIN TRIGGER 3] Notify Admin of Role Change
        if (auth()->check() && auth()->user()->role === 'admin') {
            \App\Services\NotificationService::send(
                auth()->user(),
                'Role User Diubah',
                "Anda mengubah role user {$user->name} menjadi {$user->role} (Status: {$user->status}).",
                'info',
                '/admin/users',
                [
                    'title_key' => 'notif.role_changed_title',
                    'message_key' => 'notif.role_changed_message',
                    'message_params' => ['name' => $user->name, 'role' => $user->role, 'status' => $user->status]
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'User status updated successfully',
            'user' => $user
        ]);
    }

    public function updateProfile(Request $request)
    {
        Log::info('Update Profile Request RECEIVED:', [
            'has_file_avatar' => $request->hasFile('avatar'),
            'all_inputs' => $request->all(),
            'files_global' => $_FILES ?? []
        ]);

        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'title' => 'nullable|string|max:100',
            'bio' => 'nullable|string|max:500',
            'avatar' => 'nullable|image|max:5120' // Max 5MB
        ]);

        Log::info('Update Profile Request:', [
            'has_file_avatar' => $request->hasFile('avatar'),
            'all_inputs' => $request->all(),
            'files_global' => $_FILES ?? []
        ]);

        // Handle Avatar Upload
        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                // ... (existing helper to extract path)
                $oldPath = str_replace(asset('storage/'), '', $user->avatar);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = asset('storage/' . $path);
        } elseif ($request->boolean('delete_avatar')) {
            // Handle Delete Avatar Request
            if ($user->avatar) {
                $oldPath = str_replace(asset('storage/'), '', $user->avatar);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
                $user->avatar = null;
            }
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->title = $validated['title'] ?? $user->title;
        $user->bio = $validated['bio'] ?? $user->bio;

        $user->save();

        // [TRIGGER 7] Profile Updated Notification
        \App\Services\NotificationService::send(
            $user,
            'Profil Diperbarui',
            'Data profil Anda berhasil diperbarui.',
            'info',
            '/profile',
            [
                'title_key' => 'notif.profile_updated_title',
                'message_key' => 'notif.profile_updated_message'
            ]
        );

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }
    public function updateUserXP(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|integer',
            'action' => 'required|in:add,remove,set'
        ]);

        if ($validated['action'] === 'add') {
            $user->xp_points += $validated['amount'];
        } elseif ($validated['action'] === 'remove') {
            $user->xp_points = max(0, $user->xp_points - $validated['amount']);
        } elseif ($validated['action'] === 'set') {
            $user->xp_points = max(0, $validated['amount']);
        }

        $user->syncLevel(); // Update level based on new XP
        $user->save();

        // [ADMIN TRIGGER 4] XP Updated
        if (auth()->check() && auth()->user()->role === 'admin') {
            \App\Services\NotificationService::send(
                auth()->user(),
                'XP User Diupdate',
                "Anda mengubah XP user {$user->name} ({$validated['action']} {$validated['amount']}).",
                'success',
                '/admin/users',
                [
                    'title_key' => 'notif.xp_updated_title',
                    'message_key' => 'notif.xp_updated_message',
                    'message_params' => ['name' => $user->name, 'action' => $validated['action'], 'amount' => $validated['amount']]
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'User XP updated successfully',
            'user' => $user->load('level')
        ]);
    }
}
