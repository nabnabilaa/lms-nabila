<?php

namespace App\Http\Controllers;

use App\Models\DailyMission;
use App\Models\DailyMissionCompletion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DailyMissionController extends Controller
{
    /**
     * List missions
     * Admin: all missions
     * Student: active missions with progress
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if ($user->role === 'admin') {
            $missions = DailyMission::orderBy('created_at', 'desc')->get();

            // Add completion stats
            $missions->each(function ($mission) {
                $mission->total_completions = DailyMissionCompletion::where('daily_mission_id', $mission->id)
                    ->whereNotNull('completed_at')
                    ->count();
                $mission->total_participants = DailyMissionCompletion::where('daily_mission_id', $mission->id)
                    ->distinct('user_id')
                    ->count('user_id');
            });

            return response()->json(['missions' => $missions]);
        }

        // Student: active missions with user progress
        $missions = DailyMission::active()->orderBy('type')->orderBy('xp_reward', 'desc')->get();

        $missions->each(function ($mission) use ($user) {
            $completion = $mission->getUserProgress($user->id);
            $mission->user_progress = $completion->progress;
            $mission->is_completed = $completion->completed_at !== null;
            $mission->completed_at = $completion->completed_at;
        });

        return response()->json(['missions' => $missions]);
    }

    /**
     * Student: get today's active missions with progress
     */
    public function myMissions()
    {
        $user = auth()->user();
        if ($user->role !== 'student') {
            return response()->json([
                'missions' => [],
                'stats' => ['total_missions' => 0, 'completed' => 0, 'xp_earned_today' => 0, 'completion_rate' => 0],
            ]);
        }

        $today = now()->toDateString();

        $missions = DailyMission::active()->orderBy('type')->orderBy('xp_reward', 'desc')->get();

        $completedCount = 0;
        $totalXpEarned = 0;

        $missions->each(function ($mission) use ($user, $today, &$completedCount, &$totalXpEarned) {
            $completion = $mission->getUserProgress($user->id);
            $mission->user_progress = $completion->progress;
            $mission->is_completed = $completion->completed_at !== null;
            $mission->completed_at = $completion->completed_at;

            if ($mission->is_completed) {
                $completedCount++;
                $totalXpEarned += $mission->xp_reward;
            }
        });

        return response()->json([
            'missions' => $missions,
            'stats' => [
                'total_missions' => $missions->count(),
                'completed' => $completedCount,
                'xp_earned_today' => $totalXpEarned,
                'completion_rate' => $missions->count() > 0
                    ? round(($completedCount / $missions->count()) * 100)
                    : 0,
            ],
        ]);
    }

    /**
     * Student: get overall mission stats
     */
    public function stats()
    {
        $user = auth()->user();

        if ($user->role !== 'student') {
            return response()->json([
                'total_completed' => 0,
                'total_xp_earned' => 0,
                'mission_streak' => 0,
            ]);
        }

        $totalCompleted = DailyMissionCompletion::where('user_id', $user->id)
            ->whereNotNull('completed_at')
            ->count();

        $totalXpEarned = DailyMissionCompletion::where('user_id', $user->id)
            ->whereNotNull('completed_at')
            ->join('daily_missions', 'daily_mission_completions.daily_mission_id', '=', 'daily_missions.id')
            ->sum('daily_missions.xp_reward');

        $streakDays = 0;
        $checkDate = now()->toDateString();
        for ($i = 0; $i < 365; $i++) {
            $hasCompletion = DailyMissionCompletion::where('user_id', $user->id)
                ->whereNotNull('completed_at')
                ->where('date', $checkDate)
                ->exists();
            if ($hasCompletion) {
                $streakDays++;
                $checkDate = now()->subDays($i + 1)->toDateString();
            } else {
                break;
            }
        }

        return response()->json([
            'total_completed' => $totalCompleted,
            'total_xp_earned' => (int) $totalXpEarned,
            'mission_streak' => $streakDays,
        ]);
    }

    /**
     * Student: update progress on a manual mission or claim
     */
    public function updateProgress(Request $request, $id)
    {
        $user = auth()->user();

        if ($user->role !== 'student') {
            return response()->json(['message' => 'Hanya siswa yang dapat menyelesaikan misi.'], 403);
        }

        $mission = DailyMission::findOrFail($id);

        if (!$mission->isActive()) {
            return response()->json(['message' => 'Misi tidak aktif'], 400);
        }

        // For manual type: admin or student marks progress
        if ($mission->action_type === 'manual') {
            $completion = $mission->incrementProgress($user);

            return response()->json([
                'message' => $completion->completed_at ? 'Misi selesai! XP ditambahkan.' : 'Progress diperbarui.',
                'progress' => $completion->progress,
                'target' => $mission->action_target,
                'completed' => $completion->completed_at !== null,
                'xp_earned' => $completion->completed_at ? $mission->xp_reward : 0,
            ]);
        }

        return response()->json(['message' => 'Misi ini bukan tipe manual.'], 400);
    }

    // =====================
    // ADMIN CRUD
    // =====================

    /**
     * Admin: Create mission
     */
    public function store(Request $request)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:daily,weekly,special',
            'xp_reward' => 'required|integer|min:1|max:1000',
            'icon' => 'nullable|string|max:50',
            'action_type' => 'required|in:login,complete_lesson,complete_quiz,post_discussion,watch_session,manual',
            'action_target' => 'required|integer|min:1|max:100',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:starts_at',
        ]);

        $mission = DailyMission::create($validated);

        return response()->json(['message' => 'Misi berhasil dibuat.', 'mission' => $mission], 201);
    }

    /**
     * Admin: Update mission
     */
    public function update(Request $request, $id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $mission = DailyMission::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|required|in:daily,weekly,special',
            'xp_reward' => 'sometimes|required|integer|min:1|max:1000',
            'icon' => 'nullable|string|max:50',
            'action_type' => 'sometimes|required|in:login,complete_lesson,complete_quiz,post_discussion,watch_session,manual',
            'action_target' => 'sometimes|required|integer|min:1|max:100',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);

        $mission->update($validated);

        return response()->json(['message' => 'Misi berhasil diperbarui.', 'mission' => $mission]);
    }

    /**
     * Admin: Delete mission
     */
    public function destroy($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $mission = DailyMission::findOrFail($id);
        $mission->delete();

        return response()->json(['message' => 'Misi berhasil dihapus.']);
    }

    /**
     * Admin: Toggle active status
     */
    public function toggleActive($id)
    {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $mission = DailyMission::findOrFail($id);
        $mission->is_active = !$mission->is_active;
        $mission->save();

        return response()->json([
            'message' => $mission->is_active ? 'Misi diaktifkan.' : 'Misi dinonaktifkan.',
            'is_active' => $mission->is_active,
        ]);
    }
}
