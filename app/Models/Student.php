<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        "user_id",
        "name",
        "level",
        "total_xp",
        "current_streak"
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function achievements()
    {
        return $this->hasMany(UserAchievement::class);
    }
}
