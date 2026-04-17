<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Certificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'certificate_id', // Unique hash ID
        'student_id',
        'course_id',
        'issued_at',
        'certificate_template_id',
        'file_url', // Path to generated PDF
        'final_score',
        'grade_breakdown',
        'strengths',
        'improvements',
        'career_recommendation',
        'mentor_review', // NEW
        'is_published',   // NEW
        'grade'           // NEW
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'grade_breakdown' => 'array',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function template()
    {
        return $this->belongsTo(CertificateTemplate::class, 'certificate_template_id');
    }
}
