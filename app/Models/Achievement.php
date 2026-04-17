<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Achievement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'icon',
        'criteria_type',
        'criteria_value',
        'points',
        'badge_url'
    ];

    protected $casts = [
        'title' => 'array',
        'description' => 'array',
        'points' => 'integer',
        'criteria_value' => 'integer',
    ];

    protected $appends = ['criteria'];

    public function getCriteriaAttribute()
    {
        return [
            'type' => $this->criteria_type,
            'target' => $this->criteria_value,
            'timeLimit' => 0, // Default as DB only stores value
            'contentType' => 'any',
            'courseId' => null
        ];
    }
}
