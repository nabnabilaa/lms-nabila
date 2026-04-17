<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->boolean('is_qr_coupon')->default(false)->after('is_active');
            $table->integer('qr_rotation_minutes')->default(5)->after('is_qr_coupon');
            $table->string('qr_current_token', 64)->nullable()->after('qr_rotation_minutes');
            $table->timestamp('qr_token_expires_at')->nullable()->after('qr_current_token');
            $table->integer('min_completed_courses')->default(1)->after('qr_token_expires_at');
            $table->integer('min_active_days')->default(7)->after('min_completed_courses');
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn([
                'is_qr_coupon',
                'qr_rotation_minutes',
                'qr_current_token',
                'qr_token_expires_at',
                'min_completed_courses',
                'min_active_days'
            ]);
        });
    }
};
