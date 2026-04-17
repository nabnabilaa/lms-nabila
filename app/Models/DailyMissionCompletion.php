<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyMissionCompletion extends Model
{
    protected $fillable = [
        'user_id',
        'daily_mission_id',
        'progress',
        'completed_at',
        'date',
    ];

    protected $casts = [
        'progress' => 'integer',
        'completed_at' => 'datetime',
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function mission()
    {
        return $this->belongsTo(DailyMission::class, 'daily_mission_id');
    }
}
