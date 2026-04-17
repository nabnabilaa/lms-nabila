<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations; // Import

class CourseSession extends Model
{
    use HasFactory, HasTranslations; // Trait

    public $translatable = ['title', 'description'];

    public function toArray()
    {
        $attributes = parent::toArray();
        foreach ($this->getTranslatableAttributes() as $field) {
            $attributes[$field] = $this->getTranslations($field);
        }
        return $attributes;
    }

    protected $fillable = [
        'course_id',
        'title',
        'type', // Added type
        'description',
        'start_time',
        'end_time',
        'meeting_url',
        'meeting_type',
        'room_id', // Internal UUID
        'meeting_code', // User-facing Short Code
        'instructor_id',
    ];

    protected $casts = [
        'title' => 'array',
        'description' => 'array',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function instructor()
    {
        return $this->belongsTo(Instructor::class, 'instructor_id');
    }
}
