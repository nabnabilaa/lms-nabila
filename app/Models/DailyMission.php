<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class DailyMission extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'type',
        'xp_reward',
        'icon',
        'action_type',
        'action_target',
        'is_active',
        'starts_at',
        'expires_at',
    ];

    protected $casts = [
        'title' => 'array',
        'description' => 'array',
        'xp_reward' => 'integer',
        'action_target' => 'integer',
        'is_active' => 'boolean',
        'starts_at' => 'date',
        'expires_at' => 'date',
    ];

    // ---- Relationships ----

    public function completions()
    {
        return $this->hasMany(DailyMissionCompletion::class);
    }

    // ---- Scopes ----

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()->toDateString());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()->toDateString());
            });
    }

    // ---- Methods ----

    /**
     * Check if this mission is currently active and within date range
     */
    public function isActive(): bool
    {
        if (!$this->is_active)
            return false;
        if ($this->starts_at && now()->lt($this->starts_at))
            return false;
        if ($this->expires_at && now()->gt($this->expires_at->endOfDay()))
            return false;
        return true;
    }

    /**
     * Get or create user's progress record for today
     */
    public function getUserProgress($userId)
    {
        // Enforce Student Only Policy - Admins and Instructors don't have missions/XP
        $user = \App\Models\User::find($userId);
        if ($user && $user->role !== 'student') {
            return new DailyMissionCompletion(['progress' => 0]); // Return a dummy non-saved completion
        }

        $date = now()->toDateString();

        return DailyMissionCompletion::firstOrCreate(
            [
                'user_id' => $userId,
                'daily_mission_id' => $this->id,
                'date' => $date,
            ],
            ['progress' => 0]
        );
    }

    /**
     * Increment progress for a user, complete if target reached
     */
    public function incrementProgress($user, $amount = 1)
    {
        if ($user->role !== 'student') {
            return new DailyMissionCompletion(['progress' => 0]);
        }

        $completion = $this->getUserProgress($user->id);

        // Already completed today
        if ($completion->completed_at) {
            return $completion;
        }

        $completion->progress = min($completion->progress + $amount, $this->action_target);
        $completion->save();

        // Check if target reached
        if ($completion->progress >= $this->action_target) {
            return $this->completeForUser($user, $completion);
        }

        return $completion;
    }

    /**
     * Mark mission as completed and award XP
     */
    public function completeForUser($user, $completion = null)
    {
        if ($user->role !== 'student') {
            return new DailyMissionCompletion(['progress' => $this->action_target, 'completed_at' => now()]);
        }

        if (!$completion) {
            $completion = $this->getUserProgress($user->id);
        }

        if ($completion->completed_at) {
            return $completion; // Already completed
        }

        $completion->progress = $this->action_target;
        $completion->completed_at = now();
        $completion->save();

        // Award XP
        $user->increment('xp_points', $this->xp_reward);

        // Sync level
        $this->syncUserLevel($user);

        // Send notification (bilingual)
        // Store the raw english version in $titleText for fallback, but pass keys for translation
        $titleEn = is_array($this->title) ? ($this->title['en'] ?? $this->title['id'] ?? '') : $this->title;
        $titleId = is_array($this->title) ? ($this->title['id'] ?? '') : $this->title;

        // As a fallback string for DB, we can use Indonesian or English. We'll use ID to match the rest of the old behavior.
        \App\Services\NotificationService::send(
            $user,
            'Misi Selesai! 🎯',
            "Kamu menyelesaikan misi \"{$titleId}\" dan mendapat +{$this->xp_reward} XP!",
            'success',
            '/missions',
            [
                'title_key' => 'notif.mission_completed_title',
                'message_key' => 'notif.mission_completed_message',
                // Keep the raw title json object or extract just the string based on what frontend expects. 
                // Since our frontend common.json has `"mission_completed_message": "You completed the mission \"{{mission}}\" and gained +{{xp}} XP!"`
                // Let's pass the Title JSON so the frontend `getTrans()` can translate the variable?
                // Wait, frontend `common.json` translation `{{mission}}` relies on string interpolation.
                // We should pass the title object directly to `message_params` if the frontend's `getTrans` handles variables correctly, OR
                // pass a JSON string of the title object so the frontend can parse it.
                // Let's pass the raw JSON encoded title so frontend can handle it.
                'message_params' => [
                    'mission' => is_array($this->title) ? json_encode($this->title) : $this->title,
                    'xp' => $this->xp_reward
                ]
            ]
        );

        return $completion;
    }

    /**
     * Sync user level after XP change
     */
    private function syncUserLevel($user)
    {
        $newLevel = DB::table('levels')
            ->where('min_xp', '<=', $user->xp_points)
            ->orderBy('min_xp', 'desc')
            ->first();

        if ($newLevel && $user->level_id !== $newLevel->id) {
            $user->level_id = $newLevel->id;
            $user->save();
        }
    }
}
