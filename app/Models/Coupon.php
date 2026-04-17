<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'type',
        'value',
        'max_uses',
        'used_count',
        'expires_at',
        'is_active',
        // QR fields
        'is_qr_coupon',
        'qr_rotation_minutes',
        'qr_current_token',
        'qr_token_expires_at',
        'min_completed_courses',
        'min_active_days',
        'eligible_user_ids'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'qr_token_expires_at' => 'datetime',
        'is_active' => 'boolean',
        'is_qr_coupon' => 'boolean',
        'max_uses' => 'integer',
        'used_count' => 'integer',
        'qr_rotation_minutes' => 'integer',
        'min_completed_courses' => 'integer',
        'min_active_days' => 'integer',
        'value' => 'decimal:2',
        'eligible_user_ids' => 'array'
    ];

    /**
     * Check if coupon is valid.
     */
    public function isValid()
    {
        if (!$this->is_active)
            return false;
        if ($this->expires_at && now()->gt($this->expires_at))
            return false;
        if ($this->max_uses && $this->used_count >= $this->max_uses)
            return false;
        return true;
    }

    /**
     * Calculate discount amount.
     */
    public function calculateDiscount($originalPrice)
    {
        if ($this->type === 'fixed') {
            return min($this->value, $originalPrice);
        } elseif ($this->type === 'percent') {
            return $originalPrice * ($this->value / 100);
        }
        return 0;
    }

    /**
     * Generate and save a new QR token.
     */
    public function rotateQrToken()
    {
        $this->qr_current_token = hash('sha256', Str::random(40) . now()->timestamp);
        $this->qr_token_expires_at = now()->addMinutes($this->qr_rotation_minutes ?: 5);
        $this->save();
        return $this->qr_current_token;
    }

    /**
     * Validate a scanned QR token.
     */
    public function isQrValid($token)
    {
        if (!$this->is_qr_coupon || !$this->isValid())
            return false;
        if ($this->qr_current_token !== $token)
            return false;
        if ($this->qr_token_expires_at && now()->gt($this->qr_token_expires_at))
            return false;
        return true;
    }

    /**
     * Check if a user is eligible for this QR coupon.
     */
    public function isUserEligible($user)
    {
        // 1. Check if user is explicitly whitelisted
        if (is_array($this->eligible_user_ids) && in_array($user->id, $this->eligible_user_ids)) {
            return true;
        }

        // 2. Otherwise, check default conditions
        // Check completed courses
        $completedCourses = \App\Models\CourseEnrollment::where('user_id', $user->id)
            ->where('status', 'completed')
            ->count();

        if ($completedCourses < $this->min_completed_courses)
            return false;

        // Check active days
        $activeDays = \DB::table('daily_logins')
            ->where('user_id', $user->id)
            ->count();

        if ($activeDays < $this->min_active_days)
            return false;

        return true;
    }
}
