<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Coupon;
use Carbon\Carbon;

class CouponSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. General Public Coupon
        Coupon::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'type' => 'percent',
                'value' => 10,
                'max_uses' => 1000,
                'is_active' => true,
                'expires_at' => Carbon::now()->addYear(),
            ]
        );

        // 2. Exclusive Veteran Coupon (QR Code Target)
        Coupon::updateOrCreate(
            ['code' => 'EXCLUSIVE_VETERAN'],
            [
                'type' => 'percent',
                'value' => 50, // Diskon Besar!
                'max_uses' => 999999, // Unlimited uses for eligible users
                'is_active' => true,
                'expires_at' => Carbon::now()->addYears(5),
            ]
        );

        // 3. Flat Discount
        Coupon::updateOrCreate(
            ['code' => 'KAMISHEMAT'],
            [
                'type' => 'fixed',
                'value' => 50000,
                'max_uses' => 50,
                'is_active' => true,
                'expires_at' => Carbon::now()->addMonth(),
            ]
        );
    }
}
