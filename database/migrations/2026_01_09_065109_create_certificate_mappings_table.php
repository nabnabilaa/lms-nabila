<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create("certificate_mappings", function (Blueprint $table) {
            $table->id();
            $table->foreignId("certificate_template_id")->constrained("certificate_templates")->onDelete("cascade");
            
            // Kolom Layout Visual (Agar cocok dengan Seeder)
            $table->string("field_name"); 
            $table->integer("x_position")->default(0);
            $table->integer("y_position")->default(0);
            $table->integer("font_size")->default(12);
            $table->string("color")->default("#000000");
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists("certificate_mappings");
    }
};
