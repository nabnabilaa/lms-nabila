<?php

use App\Http\Controllers\NotificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\InstructorController;
use App\Http\Controllers\CertificateReviewController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public Routes
Route::get('/coupons/check', [\App\Http\Controllers\CouponController::class, 'check']); // Public Validation
Route::post('/auth/register', [AuthController::class, 'register']); // NEW
Route::post('/auth/login', [AuthController::class, 'login']);

// Xendit Webhook (Production)
use App\Http\Controllers\PaymentController;
Route::post('/payment/xendit/webhook', [PaymentController::class, 'webhook']);
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');
Route::get('/instructors', [InstructorController::class, 'index']);
Route::get('/instructor/stats', [InstructorController::class, 'dashboardStats'])->middleware('auth:sanctum');
Route::get('/admin/stats', [InstructorController::class, 'adminStats'])->middleware('auth:sanctum');

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/profile', [AuthController::class, 'updateProfile']); // Profile Update

    // Security Routes
    Route::put('/user/password', [SecurityController::class, 'updatePassword']);
    Route::post('/user/two-factor-authentication', [SecurityController::class, 'enableTwoFactor']);
    Route::post('/user/confirmed-two-factor-authentication', [SecurityController::class, 'confirmTwoFactor']);
    Route::delete('/user/two-factor-authentication', [SecurityController::class, 'disableTwoFactor']);
    Route::get('/user/sessions', [SecurityController::class, 'sessions']);
    Route::delete('/user/sessions/{id}', [SecurityController::class, 'destroySession']);
    Route::post('/user/recovery-codes', [SecurityController::class, 'getRecoveryCodes']);

    Route::get('/users', [AuthController::class, 'users']); // New Route
    Route::put('/users/{id}/status', [AuthController::class, 'updateUserStatus']); // Admin Update User Status
    Route::put('/users/{id}/xp', [AuthController::class, 'updateUserXP']); // Admin Update User XP

    // Certificate Routes
    Route::get('/certificates/candidates/{courseId}', [CertificateReviewController::class, 'getCandidates']);
    Route::post('/certificates/{id}', [CertificateReviewController::class, 'update']);
    Route::post('/certificates/generate-ai', [CertificateReviewController::class, 'generateAI']); // New Route
    Route::get('/certificates', [CertificateController::class, 'index']); // Student viewing their certificates
    Route::get('/certificates/{id}', [CertificateController::class, 'show']); // View specific certificate

    Route::get('/contents/{id}', [ContentController::class, 'show']);
    Route::put('/contents/{id}/quiz', [ContentController::class, 'updateQuiz']);
    Route::post('/contents/{id}/complete', [ContentController::class, 'complete']); // New Progress Route

    // Student Progress
    // Admin Routes
    Route::put('/courses/{id}/certificate-template', [CourseController::class, 'updateCertificateTemplate']);
    Route::post('/courses/{id}/enroll', [\App\Http\Controllers\EnrollmentController::class, 'store']); // NEW Enrollment Route

    // Certificate Review Routes
    Route::get('/courses/{courseId}/certificates-candidates', [\App\Http\Controllers\CertificateReviewController::class, 'getCandidates']);
    Route::post('/courses/{courseId}/certificates/publish', [\App\Http\Controllers\CertificateReviewController::class, 'publish']);
    Route::put('/certificates/{id}', [\App\Http\Controllers\CertificateReviewController::class, 'update']);
    Route::post('/courses/{courseId}/certificates/import', [\App\Http\Controllers\CertificateReviewController::class, 'importCandidates']);
    Route::post('/certificates/generate', [App\Http\Controllers\CertificateController::class, 'generate']);

    // Discussion Routes
    Route::get('/courses/{id}/discussions', [\App\Http\Controllers\DiscussionController::class, 'index']);
    Route::post('/courses/{id}/discussions', [\App\Http\Controllers\DiscussionController::class, 'store']);
    Route::put('/discussions/{id}', [\App\Http\Controllers\DiscussionController::class, 'update']);
    Route::post('/discussions/{id}/reply', [\App\Http\Controllers\DiscussionController::class, 'reply']);
    Route::put('/discussions/{id}/replies/{replyId}', [\App\Http\Controllers\DiscussionController::class, 'updateReply']);
    Route::post('/discussions/{id}/vote', [\App\Http\Controllers\DiscussionController::class, 'toggleLike']);
    Route::delete('/discussions/{id}', [\App\Http\Controllers\DiscussionController::class, 'destroy']);
    Route::delete('/discussions/{id}/replies/{replyId}', [\App\Http\Controllers\DiscussionController::class, 'destroyReply']);
    Route::post('/discussions/{id}/resolve', [\App\Http\Controllers\DiscussionController::class, 'resolve']); // NEW
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/send', [NotificationController::class, 'send']); // NEW: Admin Send


    // [TAMBAHAN BARU]
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::get('/notifications/{id}', [NotificationController::class, 'show']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications', [NotificationController::class, 'destroyAll']);

    // Exclusive Coupon Routes
    Route::get('/coupons/eligibility', [\App\Http\Controllers\CouponController::class, 'checkEligibility']);
    Route::post('/coupons/claim-qr', [\App\Http\Controllers\CouponController::class, 'claimByQr']);
    Route::get('/coupons/qr', [\App\Http\Controllers\CouponController::class, 'qrCoupons']);

    // Admin QR Token Management
    Route::get('/coupons/{id}/qr-token', [\App\Http\Controllers\CouponController::class, 'getQrToken']);
    Route::post('/coupons/{id}/rotate-qr', [\App\Http\Controllers\CouponController::class, 'rotateQrToken']);

    // Daily Mission Routes
    Route::get('/daily-missions', [\App\Http\Controllers\DailyMissionController::class, 'index']);
    Route::get('/daily-missions/my', [\App\Http\Controllers\DailyMissionController::class, 'myMissions']);
    Route::get('/daily-missions/stats', [\App\Http\Controllers\DailyMissionController::class, 'stats']);
    Route::post('/daily-missions/{id}/progress', [\App\Http\Controllers\DailyMissionController::class, 'updateProgress']);
    Route::post('/daily-missions', [\App\Http\Controllers\DailyMissionController::class, 'store']);
    Route::put('/daily-missions/{id}', [\App\Http\Controllers\DailyMissionController::class, 'update']);
    Route::delete('/daily-missions/{id}', [\App\Http\Controllers\DailyMissionController::class, 'destroy']);
    Route::post('/daily-missions/{id}/toggle', [\App\Http\Controllers\DailyMissionController::class, 'toggleActive']);

    // Code Sandbox execution (proxied to Piston API)
    Route::post('/code/run', [\App\Http\Controllers\CodeExecutionController::class, 'run']);
});

// Course Routes
Route::get('/courses', [CourseController::class, 'index']);
Route::get('/courses/{id}', [CourseController::class, 'show']);
Route::get('/courses/{id}/modules', [CourseController::class, 'modules']);

// Protected Routes (Admin Management)
Route::middleware('auth:sanctum')->group(function () {
    // Course CRUD
    Route::post('/courses', [CourseController::class, 'store']);
    Route::put('/courses/{id}', [CourseController::class, 'update']);
    Route::delete('/courses/{id}', [CourseController::class, 'destroy']);

    // Module CRUD
    Route::post('/courses/{courseId}/modules', [\App\Http\Controllers\ModuleController::class, 'store']);
    Route::put('/modules/{id}', [\App\Http\Controllers\ModuleController::class, 'update']);
    Route::delete('/modules/{id}', [\App\Http\Controllers\ModuleController::class, 'destroy']);

    // Content CRUD
    Route::post('/modules/{moduleId}/contents', [ContentController::class, 'store']);
    Route::put('/contents/{id}', [ContentController::class, 'update']);
    Route::delete('/contents/{id}', [ContentController::class, 'destroy']);

    // Session CRUD
    Route::post('/courses/{courseId}/sessions', [\App\Http\Controllers\CourseSessionController::class, 'store']);
    Route::get('/course-sessions/code/{code}', [\App\Http\Controllers\CourseSessionController::class, 'findByCode']);
    Route::get('/course-sessions/{id}', [\App\Http\Controllers\CourseSessionController::class, 'show']);
    Route::put('/sessions/{id}', [\App\Http\Controllers\CourseSessionController::class, 'update']);
    Route::delete('/sessions/{id}', [\App\Http\Controllers\CourseSessionController::class, 'destroy']);

    // Resource CRUD
    Route::post('/courses/{courseId}/resources', [\App\Http\Controllers\ResourceController::class, 'store']);
    Route::put('/resources/{id}', [\App\Http\Controllers\ResourceController::class, 'update']);
    Route::delete('/resources/{id}', [\App\Http\Controllers\ResourceController::class, 'destroy']);

    // Achievement CRUD
    Route::apiResource('achievements', \App\Http\Controllers\AchievementController::class);

    // Coupon CRUD
    Route::apiResource('coupons', \App\Http\Controllers\CouponController::class)->except(['show']);
});

// DEBUG ROUTE
Route::middleware('auth:sanctum')->get('/debug-certs', function () {
    $user = \Illuminate\Support\Facades\Auth::user();
    $student = \App\Models\Student::where('user_id', $user->id)->first();

    return response()->json([
        'user_id' => $user->id,
        'user_name' => $user->name,
        'student_id' => $student ? $student->id : 'null',
        'student_user_id' => $student ? $student->user_id : 'null',
        'count_all_certs' => \App\Models\Certificate::count(),
        'my_certs_query_count' => \App\Models\Certificate::whereHas('student', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->count(),
        'first_cert_raw' => \App\Models\Certificate::first(),
        'my_certs_raw' => \App\Models\Certificate::whereHas('student', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->get(),
    ]);
});
