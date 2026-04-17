<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Student;

use Illuminate\Http\Request;
use App\Notifications\NewCourseSubmission;
use App\Notifications\CourseRevision;
use App\Models\User;
use Illuminate\Support\Facades\Notification;

class CourseController extends Controller
{
    public function index()
    {
        $userId = auth('sanctum')->id();

        // Get all active courses with instructor & modules count
        // Also load enrollment status for the current user
        $courses = Course::with('instructor')
            ->with([
                'modules' => function ($q) {
                    $q->with('contents')->orderBy('order');
                },
                'sessions.instructor.user',
                'resources',
                'discussions' => function ($q) {
                    $q->with('user')->latest();
                },
            ])
            ->withCount(['modules', 'enrollments'])
            ->when($userId, function ($query) use ($userId) {
                $query->with([
                    'enrollments' => function ($q) use ($userId) {
                        $q->where('user_id', $userId);
                    }
                ]);
            })
            ->when(request('search'), function ($query) {
                $search = request('search');
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->where('is_active', true)
            ->get();

        return response()->json($courses);
    }

    public function show($id)
    {
        $userId = auth('sanctum')->id();

        $course = Course::with([
            'instructor',
            'modules' => function ($q) use ($userId) {
                $q->with([
                    'contents' => function ($q2) use ($userId) {
                        $q2->orderBy('order');
                        if ($userId) {
                            $q2->with([
                                'userProgress' => function ($q3) use ($userId) {
                                    $q3->where('user_id', $userId);
                                }
                            ]);
                        }
                    }
                ])->orderBy('order');
            },
            'resources',
            'promotedCoupon', // [NEW]
            'discussions' => function ($q) {
                $q->latest()->limit(5);
            }
        ])
            ->withCount('modules')
            ->when($userId, function ($query) use ($userId) {
                $query->with([
                    'enrollments' => function ($q) use ($userId) {
                        $q->where('user_id', $userId);
                    }
                ]);
            })
            ->findOrFail($id);

        $userCertificate = null;
        if ($userId) {
            $student = \App\Models\Student::where('user_id', $userId)->first();
            if ($student) {
                // Cari sertifikat user di kursus ini
                $userCertificate = \App\Models\Certificate::where('course_id', $id)
                    ->where('student_id', $student->id)
                    ->select('certificate_id', 'created_at', 'grade', 'issued_at', 'is_published')
                    ->first();
            }
        }

        $response = $course->toArray();
        $response['user_certificate'] = $userCertificate; // Frontend membaca ini

        // Append eligibility for promoted coupon
        if (isset($response['promoted_coupon'])) {
            $isEligible = false;
            if ($userId) {
                $user = auth('sanctum')->user();
                if ($user->role === 'admin' || $user->role === 'instructor') {
                    $isEligible = true;
                } else if ($course->promotedCoupon) {
                    $isEligible = $course->promotedCoupon->isUserEligible($user);
                }
            }
            $response['promoted_coupon']['is_eligible'] = $isEligible;
        }

        return response()->json($response);
    }

    public function modules($id)
    {
        $course = Course::findOrFail($id);
        return response()->json($course->modules);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'instructor_id' => 'nullable|exists:users,id',
            'thumbnail' => 'nullable|image|max:2048', // Optional
            'is_premium' => 'boolean',
            'price' => 'numeric|min:0'
        ]);

        $course = new Course();
        $course->title = $validated['title'];
        $course->description = $validated['description'] ?? '';
        $course->instructor_id = $validated['instructor_id'] ?? auth()->id();
        $course->is_active = true;

        $course->is_premium = $request->boolean('is_premium', false);
        $course->price = $request->input('price', 0);
        $course->promoted_coupon_code = $request->input('promoted_coupon_code'); // [NEW]

        // Handle thumbnail upload if present
        if ($request->hasFile('thumbnail')) {
            $path = $request->file('thumbnail')->store('thumbnails', 'public');
            $course->thumbnail = '/storage/' . $path;
        }

        $course->save();
        $course->load('instructor'); // Load relationship for notification

        // Get instructor name for notifications
        $instructorName = $course->instructor->name ?? 'Unknown';

        // [ADMIN TRIGGER 2] Notify Admins: Course Created
        $admins = User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            \App\Services\NotificationService::send(
                $admins,
                'Kursus Baru Dibuat 📘',
                "Instructor {$instructorName} membuat kursus baru: {$course->title}",
                'info',
                "/courses/{$course->id}",
                [
                    'title_key' => 'notif.course_created_admin_title',
                    'message_key' => 'notif.course_created_admin_message',
                    'message_params' => ['instructor' => $instructorName, 'course' => $course->title]
                ]
            );
        }

        // [INST TRIGGER 1] Course Created
        \App\Services\NotificationService::send(
            auth()->user(),
            'Kursus Berhasil Dibuat',
            "Kursus '{$course->title}' telah berhasil dibuat dan menunggu tinjauan admin (jika perlu).",
            'success',
            "/courses/{$course->id}",
            [
                'title_key' => 'notif.course_created_title',
                'message_key' => 'notif.course_created_message',
                'message_params' => ['course' => $course->title]
            ]
        );

        return response()->json([
            'message' => 'Course created successfully',
            'course' => $course
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $course = Course::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'instructor_id' => 'nullable|exists:users,id',
            'thumbnail' => 'nullable|image|max:2048',
        ]);

        $course->title = $validated['title'];
        $course->description = $validated['description'] ?? $course->description;

        if (isset($validated['instructor_id'])) {
            $course->instructor_id = $validated['instructor_id'];
        }

        $course->is_premium = $request->boolean('is_premium', $course->is_premium);
        $course->price = $request->input('price', $course->price);
        $course->promoted_coupon_code = $request->input('promoted_coupon_code', $course->promoted_coupon_code); // [NEW]

        if ($request->hasFile('thumbnail')) {
            $path = $request->file('thumbnail')->store('thumbnails', 'public');
            $course->thumbnail = '/storage/' . $path;
        }

        // Detect Changes
        $changes = [];
        if ($course->isDirty('title'))
            $changes[] = 'Judul';
        if ($course->isDirty('description'))
            $changes[] = 'Deskripsi';
        if ($course->isDirty('instructor_id'))
            $changes[] = 'Instructor';
        if ($course->isDirty('thumbnail'))
            $changes[] = 'Thumbnail';

        $changesStr = empty($changes) ? 'Data' : implode(', ', $changes);

        $course->save();
        $course->load('instructor'); // Load relationship for notification

        // Get instructor name for notifications
        $instructorName = $course->instructor->name ?? 'Unknown';

        // [ADMIN TRIGGER 7 & INST TRIGGER 8] Notify Admins & Instructor
        $actor = auth()->user();
        $isAdmin = $actor->role === 'admin';
        $isInstructor = $actor->role === 'instructor';

        $admins = User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            $msg = $isAdmin
                ? "Admin {$actor->name} memperbarui kursus: {$course->title}"
                : "Instructor {$instructorName} memperbarui kursus: {$course->title}";

            \App\Services\NotificationService::send(
                $admins,
                'Kursus Diperbarui ✏️',
                $msg,
                'info',
                "/courses/{$course->id}",
                [
                    'title_key' => 'notif.course_updated_admin_title',
                    'message_key' => 'notif.course_updated_admin_message',
                    'message_params' => ['actor' => $actor->name, 'course' => $course->title]
                ]
            );
        }

        // Notify Instructor (if Admin updated)
        if ($isAdmin && $course->instructor_id) {
            $inst = \App\Models\Instructor::find($course->instructor_id);
            if ($inst && $inst->user) {
                \App\Services\NotificationService::send(
                    $inst->user,
                    'Kursus Anda Diedit Admin ⚠️',
                    "Admin {$actor->name} telah melakukan perubahan pada kursus Anda: {$course->title}. Periksa perubahan tersebut.",
                    'warning',
                    "/courses/{$course->id}",
                    [
                        'title_key' => 'notif.course_edited_by_admin_title',
                        'message_key' => 'notif.course_edited_by_admin_message',
                        'message_params' => ['admin' => $actor->name, 'course' => $course->title]
                    ]
                );
            }
        } else {
            // [INST TRIGGER 1] Self Notification (if Instructor updated)
            \App\Services\NotificationService::send(
                auth()->user(),
                'Kursus Diperbarui',
                "Perubahan berhasil disimpan. Bagian yang diubah: {$changesStr}.",
                'success',
                "/courses/{$course->id}",
                [
                    'title_key' => 'notif.course_updated_title',
                    'message_key' => 'notif.course_updated_message',
                    'message_params' => ['changes' => $changesStr]
                ]
            );
        }

        return response()->json([
            'message' => 'Course updated successfully',
            'course' => $course
        ]);
    }

    public function destroy($id)
    {
        $course = Course::findOrFail($id);
        $title = $course->title;
        $course->delete();

        // [ADMIN TRIGGER 7 & INST TRIGGER 8] Notify Admins & Instructor
        $actor = auth()->user();
        $isAdmin = $actor->role === 'admin';

        $admins = User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            \App\Services\NotificationService::send(
                $admins,
                'Kursus Dihapus 🗑️',
                "Kursus '{$title}' telah dihapus oleh " . ($isAdmin ? "Admin {$actor->name}" : "Instructor"),
                'warning',
                '/admin/courses',
                [
                    'title_key' => 'notif.course_deleted_admin_title',
                    'message_key' => 'notif.course_deleted_admin_message',
                    'message_params' => ['course' => $title, 'actor' => $actor->name]
                ]
            );
        }

        if ($isAdmin) {
            if ($course->instructor_id) {
                $inst = \App\Models\Instructor::find($course->instructor_id);
                if ($inst && $inst->user) {
                    \App\Services\NotificationService::send(
                        $inst->user,
                        'Kursus Anda Dihapus Admin 🚨',
                        "Kursus Anda '{$title}' telah dihapus oleh Admin {$actor->name}.",
                        'error',
                        '/instructor/dashboard',
                        [
                            'title_key' => 'notif.course_deleted_by_admin_title',
                            'message_key' => 'notif.course_deleted_by_admin_message',
                            'message_params' => ['course' => $title, 'admin' => $actor->name]
                        ]
                    );
                }
            }
        } else {
            // [INST TRIGGER 1] Self Notification
            \App\Services\NotificationService::send(
                auth()->user(),
                'Kursus Dihapus',
                "Kursus '{$title}' telah berhasil dihapus permanen.",
                'warning',
                '/instructor/dashboard',
                [
                    'title_key' => 'notif.course_deleted_title',
                    'message_key' => 'notif.course_deleted_message',
                    'message_params' => ['course' => $title]
                ]
            );
        }

        return response()->json([
            'message' => 'Course deleted successfully'
        ]);
    }

    public function updateCertificateTemplate(Request $request, $id)
    {
        $course = Course::findOrFail($id);

        $validated = $request->validate([
            'template' => 'required|array', // JSON structure of the certificate design
        ]);

        $course->certificate_template = json_encode($validated['template']);
        $course->certificate_template = json_encode($validated['template']);
        $course->save();

        // [ADMIN TRIGGER 8] Certificate Template Updated
        if (auth()->user()->role === 'admin') {
            \App\Services\NotificationService::send(
                auth()->user(),
                'Template Sertifikat Diedit 📜',
                "Template sertifikat untuk kursus '{$course->title}' telah diperbarui.",
                'success',
                "/courses/{$course->id}",
                [
                    'title_key' => 'notif.cert_template_updated_title',
                    'message_key' => 'notif.cert_template_updated_message',
                    'message_params' => ['course' => $course->title]
                ]
            );
        }

        return response()->json([
            'message' => 'Certificate template updated successfully',
            'course' => $course
        ]);
    }
}
