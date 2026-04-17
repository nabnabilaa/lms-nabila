<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseDiscussion extends Model
{
    protected $fillable = [
        'course_id',
        'user_id',
        'title',
        'body',
        'replies',
        'likes',
        'dislikes',
        'is_resolved'
    ];

    protected $casts = [
        'replies' => 'array',
        'is_resolved' => 'boolean'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
