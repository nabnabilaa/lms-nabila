<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('course_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
            $table->timestamp('enrolled_at')->useCurrent();
            $table->string('status')->default('active'); // active, completed, dropped
            $table->timestamp('completed_at')->nullable();
            $table->float('progress_percent')->default(0);
            $table->timestamps();

            // Unique constraint
            $table->unique(['user_id', 'course_id']);

            // Indexes
            $table->index('user_id');
            $table->index('course_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_enrollments');
    }
};
