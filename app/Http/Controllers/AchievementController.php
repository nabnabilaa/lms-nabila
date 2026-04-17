<?php

namespace App\Http\Controllers;

use App\Models\Achievement;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $achievements = Achievement::orderBy('created_at', 'desc')->get();
        return response()->json($achievements);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'icon' => 'required|string',
            'points' => 'required|integer|min:0',
            'criteria_type' => 'required|string',
            'criteria_value' => 'required|string',
            'badge_url' => 'nullable|string'
        ]);

        $achievement = Achievement::create($validated);

        // [ADMIN TRIGGER 4] Badge Created
        if (auth()->check() && auth()->user()->role === 'admin') {
            \App\Services\NotificationService::send(
                auth()->user(),
                'Badge Baru Dibuat 🏅',
                "Badge '{$validated['title']}' telah berhasil dibuat.",
                'success',
                '/admin/gamification',
                [
                    'title_key' => 'notif.badge_created_title',
                    'message_key' => 'notif.badge_created_message',
                    'message_params' => ['badge' => $validated['title']]
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Achievement created successfully',
            'achievement' => $achievement
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $achievement = Achievement::findOrFail($id);
        return response()->json($achievement);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $achievement = Achievement::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'icon' => 'sometimes|required|string',
            'points' => 'sometimes|required|integer|min:0',
            'criteria_type' => 'sometimes|required|string',
            'criteria_value' => 'sometimes|required|string',
            'badge_url' => 'nullable|string'
        ]);

        $achievement->update($validated);

        // [ADMIN TRIGGER 4] Badge Updated
        if (auth()->check() && auth()->user()->role === 'admin') {
            \App\Services\NotificationService::send(
                auth()->user(),
                'Badge Diperbarui 🏅',
                "Badge '{$achievement->title}' telah diperbarui.",
                'success',
                '/admin/gamification',
                [
                    'title_key' => 'notif.badge_updated_title',
                    'message_key' => 'notif.badge_updated_message',
                    'message_params' => ['badge' => $achievement->title]
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Achievement updated successfully',
            'achievement' => $achievement
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $achievement = Achievement::findOrFail($id);
        $achievement->delete();

        return response()->json([
            'success' => true,
            'message' => 'Achievement deleted successfully'
        ]);
    }
}
