<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        "name",
        "email",
        "password",
        "role",
        "status",
        "xp_points",
        "level_id",
        "bio",
        "title",
        "avatar",
        "two_factor_secret",
        "two_factor_recovery_codes",
        "two_factor_confirmed_at"
    ];

    protected $hidden = [
        "password",
        "remember_token",
        "two_factor_secret",
        "two_factor_recovery_codes"
    ];

    protected $casts = [
        "email_verified_at" => "datetime",
        "password" => "hashed",
        "xp_points" => "integer",
        "two_factor_confirmed_at" => "datetime",
        "two_factor_secret" => "encrypted",
        "two_factor_recovery_codes" => "encrypted",
    ];

    public function level()
    {
        return $this->belongsTo(Level::class);
    }

    public function xp_logs()
    {
        return $this->hasMany(UserXpLog::class);
    }

    public function achievements()
    {
        return $this->belongsToMany(Achievement::class, 'user_achievements')
            ->withPivot('unlocked_at')
            ->withTimestamps();
    }

    public function enrolledCourses()
    {
        return $this->belongsToMany(Course::class, 'course_enrollments')
            ->withPivot('progress_percent', 'status')
            ->withTimestamps();
    }
    public function syncLevel()
    {
        $correctLevel = Level::where('min_xp', '<=', $this->xp_points)
            ->orderBy('min_xp', 'desc')
            ->first();

        if ($correctLevel && $this->level_id !== $correctLevel->id) {
            $oldLevel = Level::find($this->level_id);
            $this->level_id = $correctLevel->id;
            $this->save();
            $this->load('level'); // Reload relation

            // [TRIGGER 6] Level Up Notification
            // Notify only if it's an UPGRADE (or initial)
            if (!$oldLevel || $correctLevel->min_xp > $oldLevel->min_xp) {
                \App\Services\NotificationService::send(
                    $this,
                    'Level Up! 🌟',
                    "Selamat! Anda telah naik ke level {$correctLevel->name}.",
                    'success',
                    '/profile',
                    [
                        'title_key' => 'notif.level_up_title',
                        'message_key' => 'notif.level_up_message',
                        'message_params' => [
                            'level' => is_array($correctLevel->name) ? ($correctLevel->name['id'] ?? $correctLevel->name['en'] ?? '') : $correctLevel->name
                        ]
                    ]
                );
            }
        }
    }

    /**
     * Scan and unlock achievements based on real progress.
     */
    public function scanAchievements()
    {
        // 1. Check Course Completions (Master Badges)
        $completedCourses = $this->enrolledCourses()
            ->wherePivot('status', 'completed')
            ->get();

        foreach ($completedCourses as $course) {
            // Find badge for this course
            // Seeder uses: "Master: {Title}"
            // Or criteria_type = 'course_completion' & criteria_value = course_id
            $badge = \App\Models\Achievement::where('criteria_type', 'course_completion')
                ->where('criteria_value', $course->id)
                ->first();

            if ($badge) {
                $this->grantAchievement($badge);
            }
        }

        // 2. Check General Stats (e.g. First Step)
        if ($this->enrolledCourses()->count() >= 1) {
            $badge = \App\Models\Achievement::where('criteria_type', 'enrollment_count')
                ->where('criteria_value', 1)->first();
            if ($badge)
                $this->grantAchievement($badge);
        }

        // 3. XP Hunter (1000 XP)
        if ($this->xp_points >= 1000) {
            $badge = \App\Models\Achievement::where('criteria_type', 'xp_total')
                ->where('criteria_value', 1000)->first();
            if ($badge)
                $this->grantAchievement($badge);
        }
    }

    private function grantAchievement($badge)
    {
        // Check if already has it
        if ($this->achievements()->where('achievement_id', $badge->id)->exists()) {
            return;
        }

        // Grant it
        $this->achievements()->attach($badge->id, ['unlocked_at' => now()]);

        // Notify
        $badgeTitleId = is_array($badge->title) ? ($badge->title['id'] ?? '') : (is_string($badge->title) ? json_decode($badge->title, true)['id'] ?? $badge->title : $badge->title);
        \App\Services\NotificationService::send(
            $this,
            'Achievement Unlocked! 🏆',
            "Selamat! Anda mendapatkan badge '{$badgeTitleId}'.",
            'success',
            '/profile',
            [
                'title_key' => 'notif.achievement_unlocked_title',
                'message_key' => 'notif.achievement_unlocked_message',
                'message_params' => [
                    'badge' => is_array($badge->title) ? json_encode($badge->title) : $badge->title
                ]
            ]
        );
    }
}
