<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('course_id')->constrained()->onDelete('cascade');
            $table->foreignId("certificate_template_id")->nullable()->constrained("certificate_templates")->onDelete("set null");
            $table->string('certificate_id')->unique();
            $table->integer('total_score')->default(0);
            $table->decimal("final_score", 5, 2)->default(0);
            $table->json("grade_breakdown")->nullable();
            $table->string('grade')->default('A');
            $table->boolean('is_published')->default(false);
            $table->text('admin_prompt')->nullable();
            $table->text('strengths')->nullable();
            $table->text('improvements')->nullable();
            $table->text('career_recommendation')->nullable();
            $table->string('template_style')->default('modern');
            $table->string('file_url')->nullable();
            $table->timestamp('issued_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('certificates');
    }
};
