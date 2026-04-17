<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. COURSES
        // Convert data first
        $courses = DB::table('courses')->get();
        foreach ($courses as $course) {
            DB::table('courses')->where('id', $course->id)->update([
                'title' => json_encode(['id' => $course->title, 'en' => $course->title]),
                'description' => json_encode(['id' => $course->description ?? '', 'en' => $course->description ?? '']),
            ]);
        }
        // Change type
        Schema::table('courses', function (Blueprint $table) {
            $table->json('title')->change();
            $table->json('description')->nullable()->change();
        });

        // 2. MODULES
        $modules = DB::table('modules')->get();
        foreach ($modules as $module) {
            DB::table('modules')->where('id', $module->id)->update([
                'title' => json_encode(['id' => $module->title, 'en' => $module->title]),
            ]);
        }
        Schema::table('modules', function (Blueprint $table) {
            $table->json('title')->change();
        });

        // 3. CONTENTS
        $contents = DB::table('contents')->get();
        foreach ($contents as $content) {
            DB::table('contents')->where('id', $content->id)->update([
                'title' => json_encode(['id' => $content->title, 'en' => $content->title]),
                'description' => json_encode(['id' => $content->description ?? '', 'en' => $content->description ?? '']),
                'body' => json_encode(['id' => $content->body ?? '', 'en' => $content->body ?? '']),
            ]);
        }
        Schema::table('contents', function (Blueprint $table) {
            $table->json('title')->change();
            $table->json('description')->nullable()->change();
            $table->json('body')->nullable()->change();
        });

        // 4. COURSE_SESSIONS (If they have separate titles/descriptions that need translation)
        // Checking task.md and existing analysis, course_sessions also has title/description usually.
        // Let's check if 'course_sessions' table exists and has these fields.
        // Assuming yes based on InstructorDashboardPage showing sessions.
        if (Schema::hasTable('course_sessions')) {
            $sessions = DB::table('course_sessions')->get();
            foreach ($sessions as $session) {
                DB::table('course_sessions')->where('id', $session->id)->update([
                    'title' => json_encode(['id' => $session->title, 'en' => $session->title]),
                    'description' => json_encode(['id' => $session->description ?? '', 'en' => $session->description ?? '']),
                ]);
            }
            Schema::table('course_sessions', function (Blueprint $table) {
                $table->json('title')->change();
                $table->json('description')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert is complex (lossy), taking 'id' back as main string

        // COURSES
        $courses = DB::table('courses')->get();
        foreach ($courses as $course) {
            $title = json_decode($course->title, true)['id'] ?? $course->title;
            $desc = json_decode($course->description, true)['id'] ?? $course->description;
            DB::table('courses')->where('id', $course->id)->update([
                'title' => $title,
                'description' => $desc,
            ]);
        }
        Schema::table('courses', function (Blueprint $table) {
            $table->text('title')->change();
            $table->text('description')->nullable()->change();
        });

        // MODULES
        $modules = DB::table('modules')->get();
        foreach ($modules as $module) {
            $title = json_decode($module->title, true)['id'] ?? $module->title;
            DB::table('modules')->where('id', $module->id)->update([
                'title' => $title,
            ]);
        }
        Schema::table('modules', function (Blueprint $table) {
            $table->string('title')->change(); // Usually string
        });

        // CONTENTS
        $contents = DB::table('contents')->get();
        foreach ($contents as $content) {
            $title = json_decode($content->title, true)['id'] ?? $content->title;
            $desc = json_decode($content->description, true)['id'] ?? $content->description;
            $body = json_decode($content->body, true)['id'] ?? $content->body;
            DB::table('contents')->where('id', $content->id)->update([
                'title' => $title,
                'description' => $desc,
                'body' => $body,
            ]);
        }
        Schema::table('contents', function (Blueprint $table) {
            $table->string('title')->change();
            $table->text('description')->nullable()->change();
            $table->longText('body')->nullable()->change();
        });

        // SESSIONS
        if (Schema::hasTable('course_sessions')) {
            $sessions = DB::table('course_sessions')->get();
            foreach ($sessions as $session) {
                $title = json_decode($session->title, true)['id'] ?? $session->title;
                $desc = json_decode($session->description, true)['id'] ?? $session->description;
                DB::table('course_sessions')->where('id', $session->id)->update([
                    'title' => $title,
                    'description' => $desc,
                ]);
            }
            Schema::table('course_sessions', function (Blueprint $table) {
                $table->string('title')->change();
                $table->text('description')->nullable()->change();
            });
        }
    }
};
