<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
            $table->foreignId('module_id')->nullable()->constrained('modules')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type')->default('pdf'); // pdf, zip, link
            $table->string('url'); // Was file_path
            $table->string('file_size')->nullable();
            $table->integer('download_count')->default(0);
            $table->timestamps();

            $table->index('course_id');
            $table->index('module_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};
