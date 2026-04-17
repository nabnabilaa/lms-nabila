<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained('modules')->onDelete('cascade');
            $table->string('title');
            $table->date('date')->nullable();
            $table->integer('order_index')->default(0);
            $table->timestamps();

            // Indexes
            $table->index(['module_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('days');
    }
};
