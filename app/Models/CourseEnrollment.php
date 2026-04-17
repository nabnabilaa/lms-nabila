<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'enrolled_at',
        'completed_at',
        'status', // 'active', 'completed', 'dropped'
        'progress_percent',
        'payment_status',
        'payment_id',
        'payment_url',
        'xendit_external_id',
        'coupon_code',
        'original_price',
        'final_price'
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'completed_at' => 'datetime',
        'progress_percent' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function certificate()
    {
        return $this->hasOne(Certificate::class, 'student_id', 'user_id')
            ->where('course_id', $this->course_id);
    }
}
