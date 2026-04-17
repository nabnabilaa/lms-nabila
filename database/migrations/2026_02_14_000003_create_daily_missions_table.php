<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('daily_missions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['daily', 'weekly', 'special'])->default('daily');
            $table->integer('xp_reward')->default(10);
            $table->string('icon')->nullable(); // emoji or icon key
            $table->string('action_type')->default('manual');
            // action_type values: login, complete_lesson, complete_quiz, post_discussion, watch_session, manual
            $table->integer('action_target')->default(1); // how many times action must be done
            $table->boolean('is_active')->default(true);
            $table->date('starts_at')->nullable();
            $table->date('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('daily_mission_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('daily_mission_id')->constrained()->onDelete('cascade');
            $table->integer('progress')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->date('date')->default(now()->toDateString()); // track per-day for daily missions
            $table->timestamps();

            $table->unique(['user_id', 'daily_mission_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_mission_completions');
        Schema::dropIfExists('daily_missions');
    }
};
