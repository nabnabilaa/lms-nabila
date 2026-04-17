<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_content_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('content_id')->constrained('contents')->onDelete('cascade');
            $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
            $table->boolean('completed')->default(false);
            $table->timestamp('completed_at')->nullable();

            // TAMBAHKAN INI:
            $table->integer('last_position')->default(0)->comment('Last video position in seconds');

            $table->integer('quiz_score')->nullable();
            $table->json('answers')->nullable();
            $table->timestamps();

            // Unique constraint
            $table->unique(['user_id', 'content_id']);

            // Indexes
            $table->index(['user_id', 'course_id']);
            $table->index('completed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_content_progress');
    }
};
