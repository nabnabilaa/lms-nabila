<?php

namespace App\Http\Controllers;

use App\Models\Resource;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\CourseEnrollment;
use App\Notifications\NewResourceAdded;
use Illuminate\Support\Facades\Notification;

class ResourceController extends Controller
{
    public function store(Request $request, $courseId)
    {
        $course = Course::findOrFail($courseId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:10240', // Max 10MB
        ]);

        $path = $request->file('file')->store('resources', 'public');
        $size = $request->file('file')->getSize();

        // Convert size to human readable
        $sizeStr = $this->formatSize($size);

        $resource = new Resource();
        $resource->course_id = $course->id;
        $resource->title = $validated['title'];
        $resource->type = $request->file('file')->getClientOriginalExtension();
        $resource->url = '/storage/' . $path;
        $resource->file_size = $sizeStr;
        $resource->save();

        // Notify Students
        $students = $course->enrollments()->with('user')->get()->pluck('user');
        Notification::send($students, new NewResourceAdded($course->title, $resource->title));

        return response()->json([
            'message' => 'Resource uploaded successfully',
            'resource' => $resource
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $resource = Resource::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $resource->title = $validated['title'];
        $resource->save();

        return response()->json([
            'message' => 'Resource updated successfully',
            'resource' => $resource
        ]);
    }

    public function destroy($id)
    {
        $resource = Resource::findOrFail($id);
        // Optionally delete file from storage
        // Storage::disk('public')->delete(str_replace('/storage/', '', $resource->url));
        $resource->delete();

        return response()->json([
            'message' => 'Resource deleted successfully'
        ]);
    }

    private function formatSize($bytes)
    {
        if ($bytes >= 1073741824) {
            $bytes = number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            $bytes = number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            $bytes = number_format($bytes / 1024, 2) . ' KB';
        } elseif ($bytes > 1) {
            $bytes = $bytes . ' bytes';
        } elseif ($bytes == 1) {
            $bytes = $bytes . ' byte';
        } else {
            $bytes = '0 bytes';
        }

        return $bytes;
    }
}
