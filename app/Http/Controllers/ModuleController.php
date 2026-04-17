<?php

namespace App\Http\Controllers;

use App\Models\Module;
use App\Models\Course;
use Illuminate\Http\Request;
use App\Notifications\NewModuleAdded;
use Illuminate\Support\Facades\Notification;

class ModuleController extends Controller
{
    public function store(Request $request, $courseId)
    {
        $course = Course::findOrFail($courseId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $module = new Module();
        $module->course_id = $course->id;
        $module->title = $validated['title'];
        $module->order = $course->modules()->max('order') + 1;
        $module->save();

        // Notify Students
        $students = $course->enrollments()->with('user')->get()->pluck('user');
        Notification::send($students, new NewModuleAdded($course->title, $module->title));

        return response()->json([
            'message' => 'Module created successfully',
            'module' => $module
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $module = Module::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $module->title = $validated['title'];
        $module->save();

        return response()->json([
            'message' => 'Module updated successfully',
            'module' => $module
        ]);
    }

    public function destroy($id)
    {
        $module = Module::findOrFail($id);
        $module->delete();

        return response()->json([
            'message' => 'Module deleted successfully'
        ]);
    }
}
