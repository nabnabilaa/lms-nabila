<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('course_sessions', function (Blueprint $table) {
            $table->enum('meeting_type', ['external', 'internal'])->default('external')->after('meeting_url');
            $table->string('room_id')->nullable()->unique()->after('meeting_type');
        });
    }

    public function down(): void
    {
        Schema::table('course_sessions', function (Blueprint $table) {
            $table->dropColumn(['meeting_type', 'room_id']);
        });
    }
};
