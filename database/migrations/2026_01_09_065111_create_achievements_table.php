<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');

            $table->string('icon')->nullable();
            $table->string('criteria_type'); // modules_completed, quiz_score, etc
            $table->integer('criteria_value')->default(0);
            $table->integer('points')->default(0);
            $table->string('badge_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('achievements');
    }
};
