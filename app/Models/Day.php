<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Day extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'title',
        'description',
        'day_number',
        'date', // For cohort-based courses
    ];

    protected $casts = [
        'day_number' => 'integer',
        'date' => 'date',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
