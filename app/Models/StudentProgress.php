<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentProgress extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course_id',
        'module_id',
        'status', // 'not_started', 'in_progress', 'completed'
        'completed_at',
        'last_accessed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
        'last_accessed_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }
}
