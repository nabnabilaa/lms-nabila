<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class Module extends Model
{
    use HasFactory, HasTranslations;

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
        'description',
        'type',
        'duration_minutes',
        'order',
    ];

    protected $casts = [
        'title' => 'array',
        'course_id' => 'integer',
        'duration_minutes' => 'integer',
        'order' => 'integer',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function contents()
    {
        return $this->hasMany(Content::class);
    }
}
