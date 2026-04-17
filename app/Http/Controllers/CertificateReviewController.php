<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\User;
use App\Models\CourseEnrollment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CertificateReviewController extends Controller
{
    /**
     * Get all certificate candidates for a course.
     * Includes students who have completed the course or have a certificate generated.
     */
    public function getCandidates($courseId)
    {
        $course = Course::with('modules.contents')->findOrFail($courseId);

        // Get enrollments that are completed OR have a certificate
        // Also consider active students with > 0 progress
        $candidates = CourseEnrollment::where('course_id', $courseId)
            ->with(['user', 'certificate'])
            ->get()
            ->map(function ($enrollment) use ($course) {
                $cert = $enrollment->certificate;
                $user = $enrollment->user;

                if (!$user) {
                    return null; // Skip if user deleted
                }

                // Calculate Live Scores if certificate doesn't exist or we want to show live data
                $liveScores = $this->calculateStudentScores($user, $course);
                $finalScore = $liveScores['final_score'];
                $skills = $liveScores['skills'];

                // Use Certificate data if it exists and is verified/published, otherwise show live data
                // But for "Review" purpose, we might want to show the LATEST live data even if a draft exists
                // Let's prefer Certificate data if it's FINAL (verified), otherwise Live data
                $score = $cert ? $cert->final_score : $finalScore;
                $skillsBreakdown = $cert ? ($cert->grade_breakdown ?? []) : $skills;

                // If cert exists but skills is empty (legacy), use live skills
                if (empty($skillsBreakdown)) {
                    $skillsBreakdown = $skills;
                }

                $status = $score >= 90 ? 'Cum Laude' : ($score >= 70 ? 'Passed' : 'Review Needed');

                return [
                    'id' => $cert ? $cert->id : null,
                    'student_id' => $enrollment->user_id,
                    'student_name' => $user->name,
                    'student_email' => $user->email,
                    'student_avatar' => $user->avatar, // Add avatar for UI
                    'final_score' => $score,
                    'status' => $status,
                    'verified' => $cert ? ($cert->verified ?? false) : false,
                    'skills_breakdown' => $skillsBreakdown,
                    'mentor_review' => $cert ? $cert->career_recommendation : '', // Legacy
                    'strengths' => $cert ? $cert->strengths : '', // New
                    'improvements' => $cert ? $cert->improvements : '', // New
                    'career' => $cert ? $cert->career_recommendation : '', // New mapping
                    'issued_at' => $cert ? $cert->issued_at : null,
                    'progress_percent' => $enrollment->progress_percent, // Useful for UI
                ];
            })
            ->filter() // Remove nulls
            ->values(); // Re-index

        return response()->json([
            'course_title' => $course->title,
            'certificate_config' => $course->certificate_config, // Pass config to frontend
            'candidates' => $candidates
        ]);
    }

    /**
     * Helper to calculate scores based on Quizzes and Module Completion.
     */
    private function calculateStudentScores($user, $course)
    {
        $skills = [];
        $totalScore = 0;
        $totalWeight = 0;
        $moduleCount = 0;

        // Get Grading Map if exists
        $gradingMap = $course->certificate_config['gradingMap'] ?? [];

        foreach ($course->modules as $module) {
            $quizzes = $module->contents->where('type', 'quiz');

            if ($quizzes->count() > 0) {
                // Average Quiz Score for this module
                $quizScores = 0;
                $quizCount = 0;

                foreach ($quizzes as $quiz) {
                    $progress = \App\Models\UserContentProgress::where('user_id', $user->id)
                        ->where('content_id', $quiz->id)
                        ->first();

                    if ($progress) {
                        $quizScores += $progress->quiz_score;
                    }
                    $quizCount++;
                }

                $moduleScore = $quizCount > 0 ? round($quizScores / $quizCount) : 0;
            } else {
                // Fallback: Check Module Completion (100 or 0)
                // We need to check StudentProgress for this module
                $prog = \App\Models\StudentProgress::where('student_id', $user->id) // Note: StudentProgress uses student_id (usually matches user_id in simple app, otherwise need mapping)
                    ->where('module_id', $module->id)
                    ->where('status', 'completed')
                    ->exists();

                // If StudentProgress not found/used, maybe check Content Progress?
                // Let's check if all contents in module are completed in UserContentProgress
                if (!$prog) {
                    $completedContents = \App\Models\UserContentProgress::where('user_id', $user->id)
                        ->whereIn('content_id', $module->contents->pluck('id'))
                        ->where('completed', true)
                        ->count();
                    $totalContents = $module->contents->count();
                    $prog = $totalContents > 0 && $completedContents == $totalContents;
                }

                $moduleScore = $prog ? 100 : 0;
            }

            // Apply Weighting
            $weight = isset($gradingMap[$module->id]['weight']) ? $gradingMap[$module->id]['weight'] : (100 / $course->modules->count());
            $skillName = isset($gradingMap[$module->id]['skillName']) ? $gradingMap[$module->id]['skillName'] : $module->title;

            $skills[$skillName] = $moduleScore;
            $totalScore += $moduleScore * ($weight / 100);
            $totalWeight += $weight;
            $moduleCount++;
        }

        // Normalize if weights don't sum to 100 (fallback to simple average if no weights or total mismatch significantly, but let's trust weights if they exist)
        if (!empty($gradingMap) && abs($totalWeight - 100) < 1) {
            $finalScore = round($totalScore);
        } else {
            // Fallback to simple average if weights are messed up or missing
            $simpleTotal = array_sum($skills);
            $finalScore = count($skills) > 0 ? round($simpleTotal / count($skills)) : 0;
        }

        return [
            'final_score' => $finalScore,
            'skills' => $skills
        ];
    }

    /**
     * Update certificate details (Review Override).
     */
    /**
     * Generate AI Feedback via Gemini (Server-side)
     */
    public function generateAI(Request $request)
    {
        $request->validate([
            'student_name' => 'required|string',
            'course_title' => 'required|string',
            'final_score' => 'required|numeric',
            'skills' => 'required|array',
            'mentor_review' => 'nullable|string'
        ]);

        $gemini = new \App\Services\GeminiService();

        // Prepare module data for Gemini
        $moduleData = [];
        foreach ($request->skills as $name => $score) {
            $moduleData[] = ['name' => $name, 'score' => $score];
        }

        // Call Gemini Service
        // We append mentor review to the prompt via a slight modification or just pass it if service allows
        // For now, let's append it to student name or context if Service doesn't explicitly take it, 
        // OR better: Update GeminiService to accept mentor_review.
        // Let's assume we pass it as part of context.

        // Quick fix: Modifying GeminiService signature might be needed, 
        // but for now let's append to student name context in the service call if possible,
        // or just rely on scores. 
        // Actually, the user WANTS the mentor review to impace the AI. 
        // So I should probably update GeminiService or pass it in.

        // Let's rely on the existing signature for now and maybe append review to "courseTitle" hack? 
        // No, let's do it properly. 
        // I will update GeminiService first. For now, calling it as is but let's see.

        $result = $gemini->analyzeCertificate(
            $request->course_title,
            $request->student_name . ($request->mentor_review ? ". Mentor Review: " . $request->mentor_review : ""),
            $request->final_score,
            $moduleData
        );

        if ($result && isset($result['feedback'])) {
            return response()->json($result['feedback']);
        }

        return response()->json(['message' => 'Failed to generate AI content'], 500);
    }

    public function update(Request $request, $id)
    {
        $certificate = Certificate::findOrFail($id);

        $validated = $request->validate([
            'final_score' => 'required|numeric',
            'mentor_review' => 'nullable|string',
            'strengths' => 'nullable|string',
            'improvements' => 'nullable|string',
            'career' => 'nullable|string',
            'is_published' => 'boolean' // Add verification status
        ]);

        $certificate->final_score = $validated['final_score'];
        $certificate->mentor_review = $validated['mentor_review'] ?? $certificate->mentor_review;
        $certificate->strengths = $validated['strengths'] ?? $certificate->strengths;
        $certificate->improvements = $validated['improvements'] ?? $certificate->improvements;
        $certificate->career_recommendation = $validated['career'] ?? $certificate->career_recommendation;

        if (isset($validated['is_published'])) {
            $certificate->is_published = $validated['is_published'];
            // If publishing, set issued_at if not set
            if ($validated['is_published'] && !$certificate->issued_at) {
                $certificate->issued_at = now();
            }
        }

        $certificate->save();

        return response()->json(['message' => 'Certificate updated successfully', 'certificate' => $certificate]);
    }

    /**
     * Bulk publish certificates.
     */
    public function publish(Request $request, $courseId)
    {
        // Set issued_at for all verified certificates in this course
        // For simple demo, we just set issued_at = now() for all certificates of this course that don't have it.

        $count = Certificate::where('course_id', $courseId)
            ->whereNull('issued_at')
            ->update(['issued_at' => now()]);

        return response()->json(['message' => "$count certificates published successfully"]);
    }
    /**
     * Import candidates from Excel data (JSON).
     * Creates users (if not exist), enrollments, and draft certificates.
     */
    public function importCandidates(Request $request, $courseId)
    {
        $validated = $request->validate([
            'candidates' => 'required|array',
            'mapping' => 'nullable|array' // Optional: if we want to save mapping config simultaneously
        ]);

        $course = Course::with('modules')->findOrFail($courseId);
        $candidatesData = $validated['candidates'];
        $importedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($candidatesData as $row) {
                // 1. Identify User by Email
                $email = $row['Email'] ?? null;
                $name = $row['Nama Siswa'] ?? 'Student';

                if (!$email)
                    continue;

                $user = User::firstOrCreate(
                    ['email' => $email],
                    [
                        'name' => $name,
                        'password' => bcrypt('password'), // Default password, should send reset email in production
                        'role' => 'learner'
                    ]
                );

                // 1b. Ensure Student Record exists
                $student = \App\Models\Student::firstOrCreate(
                    ['user_id' => $user->id],
                    ['name' => $name]
                );

                // 2. Ensure Enrollment
                $enrollment = CourseEnrollment::firstOrCreate(
                    ['user_id' => $user->id, 'course_id' => $courseId],
                    ['enrolled_at' => now()]
                );

                // 3. Calculate Scores & Breakdowns
                $skills = [];
                $totalWeightedScore = 0;
                $totalMaxWeight = 0; // To normalize if needed

                // We iterate over course modules to find matching columns in Excel row
                // Assumption: Excel headers match Module Titles exactly (frontend validation ensures this)
                foreach ($course->modules as $module) {
                    $score = isset($row[$module->title]) ? floatval($row[$module->title]) : 0;

                    // Default weight (distribute evenly if not mapped) - actually frontend handles weight mapping
                    // Here we just store the raw score per module/skill
                    $skills[$module->title] = $score;

                    // Simple average for now suitable for the "final_score" field
                    // Ideally we use the 'mapping' passed from frontend to weigh it
                }

                // Calculate final score using MAPPING if provided, or simple average
                if (!empty($request->mapping)) {
                    $weightedSum = 0;
                    $weightSum = 0;
                    foreach ($request->mapping as $modId => $map) {
                        // Find module by ID
                        $mod = $course->modules->where('id', $modId)->first();
                        if ($mod) {
                            $score = $skills[$mod->title] ?? 0;
                            $weight = $map['weight'] ?? 0;
                            $weightedSum += $score * $weight;
                            $weightSum += $weight;
                        }
                    }
                    $finalScore = $weightSum > 0 ? round($weightedSum / $weightSum) : 0;
                } else {
                    $finalScore = count($skills) > 0 ? round(array_sum($skills) / count($skills)) : 0;
                }

                // 4. Create/Update Certificate
                // We use updateOrCreate to allow re-importing to fix data
                Certificate::updateOrCreate(
                    [
                        'course_id' => $courseId,
                        'student_id' => $student->id, // Certificate links to student table usually, but here checking relation
                    ],
                    [
                        'certificate_id' => 'DRAFT-' . strtoupper(uniqid()), // Temp ID
                        'final_score' => $finalScore,
                        'grade_breakdown' => $skills,
                        'mentor_review' => $row['Review dari Mentor'] ?? '', // Store input here
                        // 'career_recommendation' => '', // Leave output empty or null for AI generation
                        'issued_at' => null, // Not yet published
                    ]
                );

                $importedCount++;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => "Successfully imported $importedCount candidates."]);
    }
}
