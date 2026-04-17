<?php

namespace App\Http\Controllers;

use App\Models\CourseSession;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CourseSessionController extends Controller
{
    public function store(Request $request, $courseId)
    {
        $course = Course::findOrFail($courseId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'instructor_id' => 'nullable', // Relax validation
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'meeting_url' => 'nullable|url',
            'meeting_type' => 'nullable|in:external,internal',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:255', // Added type validation
        ]);

        $session = new CourseSession();
        $session->course_id = $course->id;
        $session->title = $validated['title'];

        // Resolve Instructor ID
        if (auth()->user()->role === 'instructor') {
            $inst = \App\Models\Instructor::where('user_id', auth()->id())->first();
            $session->instructor_id = $inst ? $inst->id : null;
        } else {
            $session->instructor_id = $validated['instructor_id'] ?? null;
        }
        $session->type = $validated['type'] ?? 'Live'; // Added type assignment
        $session->start_time = $validated['start_time'];
        $session->end_time = $validated['end_time'];
        $session->description = $validated['description'] ?? null;

        // Handle meeting type and room generation
        $meetingType = $validated['meeting_type'] ?? 'external';
        $session->meeting_type = $meetingType;

        if ($meetingType === 'internal') {
            // 1. Ensure Internal UUID (room_id)
            $session->room_id = (string) Str::uuid();

            // 2. Handle User-Facing Code (meeting_code)
            $inputCode = $request->input('meeting_code') ?? $request->input('room_id');

            if ($inputCode && strlen($inputCode) <= 20) {
                $session->meeting_code = $inputCode;
            } else {
                // Generate random 9-char code
                $random = strtolower(Str::random(9));
                $session->meeting_code = substr($random, 0, 3) . '-' . substr($random, 3, 3) . '-' . substr($random, 6, 3);
            }
            $session->meeting_url = null;
        } else {
            $session->meeting_url = $validated['meeting_url'] ?? null;
            $session->room_id = null;
            $session->meeting_code = null;
        }

        // Auto-calculate Duration
        if ($session->start_time && $session->end_time) {
            $session->duration = \Carbon\Carbon::parse($session->start_time)->diffInMinutes(\Carbon\Carbon::parse($session->end_time));
        }

        $session->save();

        // [TRIGGER 10] Notify Enrolled Students: New Session Live
        // Get all enrolled users
        $enrolledUserIds = \App\Models\CourseEnrollment::where('course_id', $course->id)
            ->where('status', 'active') // Only active students
            ->pluck('user_id');

        if ($enrolledUserIds->isNotEmpty()) {
            \App\Services\NotificationService::send(
                $enrolledUserIds->toArray(),
                'Sesi Live Baru Dijadwalkan!',
                "Instruktur telah menjadwalkan sesi '{$session->title}' pada " . \Carbon\Carbon::parse($session->start_time)->translatedFormat('d F H:i') . ".",
                'info',
                "/courses/{$courseId}"
            );
        }

        // [INST TRIGGER 7] Notify Instructor: Session Created
        \App\Services\NotificationService::send(
            auth()->user(),
            'Sesi Live Terjadwal ✅',
            "Sesi '{$session->title}' berhasil dibuat untuk tanggal " . \Carbon\Carbon::parse($session->start_time)->translatedFormat('d F H:i') . ".",
            'success',
            "/courses/{$courseId}"
        );

        return response()->json([
            'message' => 'Session created successfully',
            'session' => $session
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $session = CourseSession::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'instructor_id' => 'nullable', // Relaxed
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'meeting_url' => 'nullable|url',
            'meeting_type' => 'nullable|in:external,internal',
            'description' => 'nullable|string',
            'type' => 'nullable|string|max:255',
        ]);

        $session->title = $validated['title'];

        if (auth()->user()->role === 'instructor') {
            $inst = \App\Models\Instructor::where('user_id', auth()->id())->first();
            if ($inst)
                $session->instructor_id = $inst->id;
        } elseif (isset($validated['instructor_id'])) {
            $session->instructor_id = $validated['instructor_id'];
        }
        $session->type = $validated['type'] ?? $session->type ?? 'Live'; // Update Type
        $session->start_time = $validated['start_time'];
        $session->end_time = $validated['end_time'];
        $session->description = $validated['description'] ?? null;

        // Handle meeting type and room generation
        $meetingType = $validated['meeting_type'] ?? $session->meeting_type ?? 'external';
        $session->meeting_type = $meetingType;

        if ($meetingType === 'internal') {
            // 1. Keep/Ensure Internal UUID
            if (!$session->room_id || strlen($session->room_id) < 20) {
                $session->room_id = (string) Str::uuid();
            }

            // 2. Update Code if provided
            $inputCode = $request->input('meeting_code') ?? $request->input('room_id');
            if ($inputCode && strlen($inputCode) <= 20) {
                $session->meeting_code = $inputCode;
            } elseif (!$session->meeting_code) {
                $random = strtolower(Str::random(9));
                $session->meeting_code = substr($random, 0, 3) . '-' . substr($random, 3, 3) . '-' . substr($random, 6, 3);
            }

            $session->meeting_url = null;
        } else {
            $session->meeting_url = $validated['meeting_url'] ?? null;
            $session->room_id = null;
            $session->meeting_code = null;
        }

        // Auto-calculate Duration
        if ($session->start_time && $session->end_time) {
            $session->duration = \Carbon\Carbon::parse($session->start_time)->diffInMinutes(\Carbon\Carbon::parse($session->end_time));
        }

        $session->save();

        // [INST TRIGGER] Notify Instructor: Session Updated
        \App\Services\NotificationService::send(
            auth()->user(),
            'Sesi Diperbarui ✏️',
            "Perubahan pada sesi '{$session->title}' telah disimpan.",
            'success',
            "/courses/{$session->course_id}"
        );

        return response()->json([
            'message' => 'Session updated successfully',
            'session' => $session
        ]);
    }

    public function destroy($id)
    {
        $session = CourseSession::findOrFail($id);
        $session->delete();

        return response()->json([
            'message' => 'Session deleted successfully'
        ]);
    }

    public function show($id)
    {
        // Find by room_id (UUID)
        $session = CourseSession::where('room_id', $id)->first();

        // If not found, try by ID (Primary Key)
        if (!$session) {
            $session = CourseSession::find($id);
        }

        if (!$session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        return response()->json([
            'data' => $session
        ]);
    }

    public function findByCode($code)
    {
        $session = CourseSession::where('meeting_code', $code)->first();

        if (!$session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        return response()->json([
            'data' => $session
        ]);
    }
}
