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
        Schema::table('certificates', function (Blueprint $table) {
            if (!Schema::hasColumn('certificates', 'mentor_review')) {
                $table->text('mentor_review')->nullable()->after('grade_breakdown');
            }
        });

        // Migrate existing data: Copy career_recommendation (legacy review) to mentor_review (input)
        // Only if mentor_review is empty
        DB::statement("UPDATE certificates SET mentor_review = career_recommendation WHERE mentor_review IS NULL AND career_recommendation IS NOT NULL");

        // Optional: Clear career_recommendation if you want it empty for the new "Career Path" output
        // But maybe safer to keep it for now in case it was used for display. 
        // Let's NOT clear it automatically, user can overwrite it with AI.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropColumn('mentor_review');
        });
    }
};
