<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('course_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
            $table->foreignId('instructor_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('meeting_url')->nullable(); // Was meeting_link
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->integer('duration')->nullable()->comment('Duration in minutes');
            $table->integer('xp_reward')->default(50);
            $table->timestamps();

            // Indexes
            $table->index(['course_id', 'start_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_sessions');
    }
};
