<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;

class Content extends Model
{
    use HasFactory, HasTranslations;

    public $translatable = ['title', 'description', 'body'];

    public function toArray()
    {
        $attributes = parent::toArray();
        foreach ($this->getTranslatableAttributes() as $field) {
            $attributes[$field] = $this->getTranslations($field);
        }
        return $attributes;
    }

    protected $fillable = [
        'module_id',
        'title',
        'type', // 'video', 'article', 'quiz', 'assignment'
        'duration_minutes',
        'content_url', // Link to video or file
        'description',
        'body', // Markdown text or JSON for quizzes
        'order',
        'is_preview',
    ];

    protected $casts = [
        'title' => 'array',
        'description' => 'array',
        'body' => 'array',
        'duration_minutes' => 'integer',
        'is_preview' => 'boolean',
        'order' => 'integer',
    ];

    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    public function userProgress()
    {
        return $this->hasOne(UserContentProgress::class);
    }
}
