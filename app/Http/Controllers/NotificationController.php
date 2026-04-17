<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $notifications = $user->notifications()->latest()->take(20)->get();
        $unreadCount = $user->unreadNotifications->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount
        ]);
    }

    // [BARU] Tandai semua dibaca
    public function markAllRead()
    {
        auth()->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'All marked as read']);
    }

    // [BARU] Tandai satu notifikasi dibaca
    public function markAsRead($id)
    {
        $notification = auth()->user()->notifications()->where('id', $id)->first();
        if ($notification) {
            $notification->markAsRead();
        }
        return response()->json(['message' => 'Marked as read']);
    }

    // [BARU] Hapus semua notifikasi
    public function destroyAll()
    {
        auth()->user()->notifications()->delete();
        return response()->json(['message' => 'All notifications deleted']);
    }

    // Show single notification detail
    public function show($id)
    {
        $notification = auth()->user()->notifications()->where('id', $id)->first();
        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }
        // Auto mark as read when viewed
        if (!$notification->read_at) {
            $notification->markAsRead();
        }
        return response()->json($notification);
    }

    // Delete single notification
    public function destroy($id)
    {
        $notification = auth()->user()->notifications()->where('id', $id)->first();
        if (!$notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }
        $notification->delete();
        return response()->json(['message' => 'Notification deleted']);
    }

    /**
     * Send Notification (Admin/Manual Trigger)
     */
    public function send(Request $request)
    {
        // Simple authorization check (Admin only)
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string',
            'body' => 'required|string',
            'type' => 'nullable|string|in:info,success,warning,error',
            'action_url' => 'nullable|string',
            'target_user_id' => 'nullable|exists:users,id',
            'target_role' => 'nullable|in:learner,instructor,admin',
            'broadcast' => 'nullable|boolean'
        ]);

        $type = $validated['type'] ?? 'info';
        $actionUrl = $validated['action_url'] ?? null;
        $count = 0;

        if ($request->broadcast) {
            \App\Services\NotificationService::broadcast($validated['title'], $validated['body'], $type, $actionUrl);
            $count = \App\Models\User::where('status', '!=', 'suspended')->count();
        } elseif ($request->target_role) {
            \App\Services\NotificationService::sendToRole($validated['target_role'], $validated['title'], $validated['body'], $type, $actionUrl);
            $count = \App\Models\User::where('role', $validated['target_role'])->count();
        } elseif ($request->target_user_id) {
            \App\Services\NotificationService::send($validated['target_user_id'], $validated['title'], $validated['body'], $type, $actionUrl);
            $count = 1;
        } else {
            return response()->json(['message' => 'No target specified'], 400);
        }

        return response()->json(['message' => "Notification sent to {$count} users."]);
    }
}