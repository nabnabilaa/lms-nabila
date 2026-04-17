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
        Schema::table('certificates', function (Blueprint $table) {
            // Check if column exists before adding it to avoid errors if repeated
            if (!Schema::hasColumn('certificates', 'strengths')) {
                $table->text('strengths')->nullable()->after('grade_breakdown');
            }
            if (!Schema::hasColumn('certificates', 'improvements')) {
                $table->text('improvements')->nullable()->after('strengths');
            }
            // career_recommendation might already exist, but let's be sure
            if (!Schema::hasColumn('certificates', 'career_recommendation')) {
                $table->text('career_recommendation')->nullable()->after('improvements');
            }
            // Add verified if missing
            if (!Schema::hasColumn('certificates', 'verified')) {
                $table->boolean('verified')->default(false)->after('final_score');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropColumn(['strengths', 'improvements']);
            // We don't drop career_recommendation or verified as they might be core legacy
        });
    }
};
