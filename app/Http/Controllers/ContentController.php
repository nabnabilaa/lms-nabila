<?php

namespace App\Http\Controllers;

use App\Models\Content;
use Illuminate\Http\Request;

class ContentController extends Controller
{
    public function store(Request $request, $moduleId)
    {
        $module = \App\Models\Module::findOrFail($moduleId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string',
            'content_url' => 'nullable|string',
            'duration_minutes' => 'nullable|integer',
            'body' => 'nullable|string', // Added body
        ]);

        $content = new Content();
        $content->module_id = $module->id;
        $content->title = $validated['title'];
        $content->type = $validated['type'];
        $content->content_url = $validated['content_url'] ?? null;
        $content->duration_minutes = $validated['duration_minutes'] ?? 0;
        $content->body = $validated['body'] ?? null; // Added body
        $content->order = $module->contents()->max('order') + 1;
        $content->save();

        return response()->json([
            'message' => 'Content created successfully',
            'content' => $content
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $content = Content::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'nullable|string',
            'content_url' => 'nullable|string',
            'duration_minutes' => 'nullable|integer',
            'description' => 'nullable|string',
            'body' => 'nullable|string', // Added body
        ]);

        $content->title = $validated['title'];
        if ($request->has('type'))
            $content->type = $validated['type'];
        if ($request->has('content_url'))
            $content->content_url = $validated['content_url'];
        if ($request->has('duration_minutes'))
            $content->duration_minutes = $validated['duration_minutes'];
        if ($request->has('description'))
            $content->description = $validated['description'];
        if ($request->has('body')) // Added body
            $content->body = $validated['body'];

        $content->save();

        return response()->json([
            'message' => 'Content updated successfully',
            'content' => $content
        ]);
    }

    public function destroy($id)
    {
        $content = Content::findOrFail($id);
        $content->delete();

        return response()->json([
            'message' => 'Content deleted successfully'
        ]);
    }

    /**
     * Update the body of a content item (used for Quiz Builder).
     */
    public function updateQuiz(Request $request, $id)
    {
        $content = Content::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'questions' => 'required|array',
            'questions.*.question' => 'required|string',
            'questions.*.type' => 'required|string',
        ]);

        // Update title if changed
        $content->title = $validated['title'];

        // Save quiz structure as JSON string in 'body'
        // We save the raw questions array, or the whole structure. 
        // The LessonPlayer expects an array of questions or the JSON string of it.
        $content->body = json_encode($validated['questions']);

        $content->save();

        return response()->json([
            'message' => 'Quiz updated successfully',
            'content' => $content
        ]);
    }

    /**
     * Get content details (for loading into Quiz Builder).
     */
    public function show($id)
    {
        $content = Content::findOrFail($id);
        return response()->json($content);
    }

    /**
     * Mark content as complete (Lesson or Quiz).
     */
    public function complete(Request $request, $id)
    {
        $content = Content::findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'completed' => 'required|boolean',
            'quiz_score' => 'nullable|numeric|min:0|max:100', // Ensure standard 0-100 scale
        ]);

        // Save Progress
        // Assuming 'user_content_progress' table is pivot or has model
        // We can use DB facade or Model if exists. let's check if UserContentProgress model exists. 
        // If not, we use DB table 'user_content_progress'.
        // Checking Controller context, likely using direct DB or relation.

        // Let's use DB for safety if Model is unknown, or check if relation exists on User/Content.
        // CourseController used 'user_content_progress' table string.

        $existing = \Illuminate\Support\Facades\DB::table('user_content_progress')
            ->where('user_id', $user->id)
            ->where('content_id', $id)
            ->first();

        if ($existing) {
            \Illuminate\Support\Facades\DB::table('user_content_progress')
                ->where('id', $existing->id)
                ->update([
                    'completed' => $validated['completed'],
                    'quiz_score' => $validated['quiz_score'] ?? $existing->quiz_score,
                    'updated_at' => now(),
                    'completed_at' => $validated['completed'] ? ($existing->completed_at ?? now()) : null
                ]);
        } else {
            \Illuminate\Support\Facades\DB::table('user_content_progress')->insert([
                'user_id' => $user->id,
                'content_id' => $id,
                'completed' => $validated['completed'],
                'quiz_score' => $validated['quiz_score'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
                'completed_at' => $validated['completed'] ? now() : null
            ]);
        }

        // Check Module Completion (Optional: trigger logic if all contents in module are done)

        // Check Course Completion
        // We can trigger a check to see if all modules are done -> update CourseEnrollment to 'completed'.
        $this->checkCourseCompletion($content->module->course_id, $user->id);

        return response()->json(['message' => 'Progress saved']);
    }

    private function checkCourseCompletion($courseId, $userId)
    {
        // Simple check: Count total contents vs completed contents
        $totalContents = \App\Models\Content::whereHas('module', function ($q) use ($courseId) {
            $q->where('course_id', $courseId);
        })->count();

        $completedContents = \Illuminate\Support\Facades\DB::table('user_content_progress')
            ->join('contents', 'user_content_progress.content_id', '=', 'contents.id')
            ->join('modules', 'contents.module_id', '=', 'modules.id')
            ->where('modules.course_id', $courseId)
            ->where('user_content_progress.user_id', $userId)
            ->where('user_content_progress.completed', true)
            ->count();

        if ($completedContents >= $totalContents && $totalContents > 0) {
            \App\Models\CourseEnrollment::where('user_id', $userId)
                ->where('course_id', $courseId)
                ->update(['status' => 'completed', 'completed_at' => now()]);

            // [TRIGGER 3] Notify Student: Course Completed
            \App\Services\NotificationService::send(
                $userId,
                'Selamat! Bootcamp Selesai! 🎉',
                "Anda telah menyelesaikan semua materi. Segera klaim sertifikat kompetensi Anda.",
                'success',
                "/courses/{$courseId}",
                [
                    'title_key' => 'notif.course_completed_title',
                    'message_key' => 'notif.course_completed_message'
                ]
            );

            // [INST TRIGGER 2 & 3] Notify Instructor: Student Completed Course
            $course = \App\Models\Course::find($courseId);
            $student = \App\Models\User::find($userId);

            // Check if course has instructor
            if ($course && $course->instructor_id) {
                // Determine Instructor User
                $instructorUser = null;
                // Try to load relation if set
                if ($course->instructor && $course->instructor->user) {
                    $instructorUser = $course->instructor->user;
                } else {
                    // Manual lookup if relation not eager loaded
                    $inst = \App\Models\Instructor::find($course->instructor_id);
                    if ($inst)
                        $instructorUser = \App\Models\User::find($inst->user_id);
                }

                if ($instructorUser) {
                    \App\Services\NotificationService::send(
                        $instructorUser,
                        'Siswa Lulus Bootcamp! 🎓',
                        "Siswa {$student->name} telah berhasil menyelesaikan kursus '{$course->title}'.",
                        'success',
                        "/instructor/students",
                        [
                            'title_key' => 'notif.student_completed_title',
                            'message_key' => 'notif.student_completed_message',
                            'message_params' => ['student' => $student->name, 'course' => $course->title]
                        ]
                    );
                }
            }
        }
    }
}
