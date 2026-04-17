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
        // Add premium columns to 'courses'
        Schema::table('courses', function (Blueprint $table) {
            $table->boolean('is_premium')->default(false)->after('description');
            $table->decimal('price', 12, 2)->default(0)->after('is_premium');
        });

        // Add payment columns to 'course_enrollments'
        Schema::table('course_enrollments', function (Blueprint $table) {
            // payment_status: 'paid', 'pending', 'failed', 'expired'
            $table->string('payment_status')->default('paid')->after('status');
            // For free courses, it is 'paid' immediately. For premium, starts as 'pending'.

            $table->string('payment_id')->nullable()->after('payment_status'); // Xendit Invoice ID
            $table->string('payment_url')->nullable()->after('payment_id'); // Xendit Invoice URL
            $table->string('xendit_external_id')->nullable()->after('payment_url'); // Our internal tracking ID for Xendit

            // Coupon columns
            $table->string('coupon_code')->nullable()->after('xendit_external_id');
            $table->decimal('original_price', 12, 2)->nullable()->after('coupon_code');
            $table->decimal('final_price', 12, 2)->nullable()->after('original_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['is_premium', 'price']);
        });

        Schema::table('course_enrollments', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'payment_id', 'payment_url', 'xendit_external_id', 'coupon_code', 'original_price', 'final_price']);
        });
    }
};
