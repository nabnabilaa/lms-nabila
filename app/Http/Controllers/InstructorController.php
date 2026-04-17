<?php

namespace App\Http\Controllers;

use App\Models\Instructor;
use Illuminate\Http\Request;

class InstructorController extends Controller
{
    public function index()
    {
        // Return instructors with user details
        return Instructor::with('user')->get();
    }

    public function dashboardStats()
    {
        $user = auth()->user();
        $instructorId = $user->id;

        // 1. Total Students (Unique users enrolled in courses taught by this instructor)
        $totalStudents = \App\Models\CourseEnrollment::whereHas('course', function ($q) use ($instructorId) {
            $q->where('instructor_id', $instructorId);
        })->distinct('user_id')->count('user_id');

        // 2. Active Classes
        $activeClasses = \App\Models\Course::where('instructor_id', $instructorId)
            ->where('is_active', true)
            ->count();

        // 3. Teaching Hours (Sum of duration_minutes of all courses / 60)
        $totalMinutes = \App\Models\Course::where('instructor_id', $instructorId)
            ->sum('duration_minutes');
        $teachingHours = round($totalMinutes / 60, 1);

        // 4. Total Enrollments (Raw count of enrollment records)
        $totalEnrollments = \App\Models\CourseEnrollment::whereHas('course', function ($q) use ($instructorId) {
            $q->where('instructor_id', $instructorId);
        })->count();

        // 5. Monthly Enrollment Trend (Last 6 Months)
        $monthlyTrend = [];
        // We want array of integers: [jan_count, feb_count, ... ]
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = now()->subMonths($i)->startOfMonth();
            $monthEnd = now()->subMonths($i)->endOfMonth();

            $count = \App\Models\CourseEnrollment::whereHas('course', function ($q) use ($instructorId) {
                $q->where('instructor_id', $instructorId);
            })
                ->whereBetween('enrolled_at', [$monthStart, $monthEnd])
                ->count();

            $monthlyTrend[] = $count;
        }

        return response()->json([
            'total_students' => $totalStudents,
            'active_classes' => $activeClasses,
            'teaching_hours' => $teachingHours,
            'total_enrollments' => $totalEnrollments,
            'monthly_trend' => $monthlyTrend
        ]);
    }

    /**
     * Admin Dashboard Stats - counts ALL enrollments across the entire platform.
     */
    public function adminStats()
    {
        // 1. Total Enrollments (ALL courses, ALL instructors)
        $totalEnrollments = \App\Models\CourseEnrollment::count();

        // 2. Monthly Enrollment Trend (Last 6 Months) - uses enrolled_at for accuracy
        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthStart = now()->subMonths($i)->startOfMonth();
            $monthEnd = now()->subMonths($i)->endOfMonth();

            $count = \App\Models\CourseEnrollment::whereBetween('enrolled_at', [$monthStart, $monthEnd])->count();

            $monthlyTrend[] = $count;
        }

        return response()->json([
            'total_enrollments' => $totalEnrollments,
            'monthly_trend' => $monthlyTrend
        ]);
    }
}
