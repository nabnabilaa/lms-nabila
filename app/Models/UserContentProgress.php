<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserContentProgress extends Model
{
    use HasFactory;

    protected $table = 'user_content_progress';

    protected $fillable = [
        'user_id',
        'content_id',
        'course_id',
        'completed',
        'completed_at',
        'quiz_score',
        'answers'
    ];

    protected $casts = [
        'completed' => 'boolean',
        'completed_at' => 'datetime',
        'quiz_score' => 'integer',
        'answers' => 'array'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function content()
    {
        return $this->belongsTo(Content::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
