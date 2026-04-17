<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create Instructors Table
        Schema::create('instructors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        // 2. Seed Instructors from existing Users (role='instructor') and existing Session references
        // We use raw SQL to ensure we catch everyone and avoid duplicates
        // Insert users who are 'instructor' OR are currently referenced in course_sessions
        $sql = "INSERT INTO instructors (user_id, created_at, updated_at)
                SELECT DISTINCT u.id, NOW(), NOW()
                FROM users u
                WHERE u.role = 'instructor'
                OR u.id IN (SELECT DISTINCT instructor_id FROM course_sessions)";

        // Check if course_sessions exists before trying to read from it (it should, but safety first)
        if (Schema::hasTable('course_sessions')) {
            // Execute Insert
            DB::statement($sql);

            // 3. Update Course Sessions Foreign Key
            Schema::table('course_sessions', function (Blueprint $table) {
                // Drop old FK to users
                $table->dropForeign(['instructor_id']);
            });

            // 4. Migrate Data: Convert UserID to InstructorID
            // Update course_sessions set instructor_id = associated instructor_id
            DB::statement("UPDATE course_sessions cs 
                            JOIN instructors i ON cs.instructor_id = i.user_id 
                            SET cs.instructor_id = i.id");

            // 5. Add new FK to instructors
            Schema::table('course_sessions', function (Blueprint $table) {
                $table->foreign('instructor_id')->references('id')->on('instructors')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instructors');
    }
};
