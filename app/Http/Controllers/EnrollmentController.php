<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Student;
use App\Notifications\NewEnrolledStudent;
use App\Notifications\CourseMilestone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use App\Services\Payment\XenditService;
use App\Models\Coupon;
use Illuminate\Support\Str;

class EnrollmentController extends Controller
{
    public function store(Request $request, $courseId)
    {
        $user = auth()->user();
        if ($user->role !== 'learner') {
            // For simplicity, allow anyone to enroll or restrict to learners?
            // Let's restrict to learners or auto-create student profile.
        }

        $course = Course::findOrFail($courseId);

        // Check availability/status if needed
        if (!$course->is_active) {
            return response()->json(['message' => 'Course is not active'], 400);
        }

        // Check existing enrollment
        $existing = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->first();

        if ($existing) {
            // Check if pending payment
            if ($existing->payment_status === 'pending' && $existing->payment_url) {
                return response()->json([
                    'message' => 'Payment pending',
                    'payment_url' => $existing->payment_url
                ], 200);
            }
            return response()->json(['message' => 'Already enrolled'], 400);
        }

        // PREMIUM COURSE CHECK
        if ($course->is_premium && $course->price > 0) {
            $xenditService = new XenditService();
            $externalId = 'ENR-' . $user->id . '-' . $course->id . '-' . time();

            // Calculate final price with coupon discount
            $originalPrice = $course->price;
            $finalPrice = $originalPrice;
            $appliedCoupon = null;
            $couponCode = $request->input('coupon_code');

            if ($couponCode) {
                $coupon = Coupon::where('code', strtoupper($couponCode))->first();
                if ($coupon && $coupon->isValid()) {
                    $appliedCoupon = $coupon;
                    if ($coupon->type === 'fixed') {
                        $finalPrice = max(0, $originalPrice - $coupon->value);
                    } else { // percent
                        $finalPrice = max(0, $originalPrice - ($originalPrice * $coupon->value / 100));
                    }
                }
            }

            // If price is 0 after discount, treat as free enrollment
            if ($finalPrice <= 0) {
                $enrollment = new CourseEnrollment();
                $enrollment->user_id = $user->id;
                $enrollment->course_id = $courseId;
                $enrollment->enrolled_at = now();
                $enrollment->status = 'active';
                $enrollment->progress_percent = 0;
                $enrollment->payment_status = 'paid';
                $enrollment->coupon_code = $appliedCoupon?->code;
                $enrollment->save();

                // Increment coupon usage
                if ($appliedCoupon) {
                    $appliedCoupon->increment('used_count');
                }

                return response()->json([
                    'message' => 'Enrolled successfully (100% discount)',
                    'enrollment' => $enrollment
                ], 201);
            }

            $description = "Payment for Course: " . $course->title;
            if ($appliedCoupon) {
                $description .= " (Coupon: " . $appliedCoupon->code . ")";
            }

            // Redirect back to course page after success
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $successRedirectUrl = $frontendUrl . "/courses/" . $course->id . "?payment=success";

            try {
                $invoice = $xenditService->createInvoice(
                    $externalId,
                    $finalPrice, // Use discounted price!
                    $user->email,
                    $description,
                    $successRedirectUrl
                );

                // Create Pending Enrollment
                $enrollment = new CourseEnrollment();
                $enrollment->user_id = $user->id;
                $enrollment->course_id = $courseId;
                $enrollment->enrolled_at = now();
                $enrollment->status = 'active';
                $enrollment->progress_percent = 0;

                // Payment Fields
                $enrollment->payment_status = 'pending';
                $enrollment->payment_id = $invoice['id'];
                $enrollment->payment_url = $invoice['invoice_url'];
                $enrollment->xendit_external_id = $externalId;
                $enrollment->coupon_code = $appliedCoupon?->code;
                $enrollment->original_price = $originalPrice;
                $enrollment->final_price = $finalPrice;

                $enrollment->save();

                // Increment coupon usage when payment is initiated
                if ($appliedCoupon) {
                    $appliedCoupon->increment('used_count');
                }

                return response()->json([
                    'message' => 'Payment required',
                    'payment_url' => $invoice['invoice_url'],
                    'is_premium' => true,
                    'original_price' => $originalPrice,
                    'final_price' => $finalPrice,
                    'coupon_applied' => $appliedCoupon?->code
                ], 200);

            } catch (\Exception $e) {
                return response()->json(['message' => 'Payment Gateway Error: ' . $e->getMessage()], 500);
            }
        }

        // FREE COURSE FLOW
        $enrollment = new CourseEnrollment();
        $enrollment->user_id = $user->id;
        $enrollment->course_id = $courseId;
        $enrollment->enrolled_at = now();
        $enrollment->status = 'active';
        $enrollment->progress_percent = 0;
        $enrollment->payment_status = 'paid'; // Free is always paid
        $enrollment->save();

        // [INST TRIGGER 4] Notify Instructor: New Student
        if ($course->instructor) {
            $instructorUser = $course->instructor->user; // Access User model via Instructor model
            if ($instructorUser) {
                \App\Services\NotificationService::send(
                    $instructorUser,
                    'Siswa Baru Bergabung! 👨‍🎓',
                    "Siswa {$user->name} baru saja mendaftar di kursus '{$course->title}'.",
                    'info',
                    "/instructor/students",
                    [
                        'title_key' => 'notif.new_student_title',
                        'message_key' => 'notif.new_student_message',
                        'message_params' => ['student' => $user->name, 'course' => $course->title]
                    ]
                );
            }
        }

        // [TRIGGER 2] Notify Student: Course Bootcamp Enrolled
        \App\Services\NotificationService::send(
            $user,
            'Berhasil Mendaftar ke Bootcamp!',
            "Anda telah terdaftar di kelas {$course->title}. Selamat belajar!",
            'success',
            "/courses/{$courseId}",
            [
                'title_key' => 'notif.enrolled_title',
                'message_key' => 'notif.enrolled_message',
                'message_params' => ['course' => $course->title]
            ]
        );

        return response()->json([
            'message' => 'Enrolled successfully',
            'enrollment' => $enrollment
        ], 201);
    }
}
