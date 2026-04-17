<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\GenericNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send notification to a specific User or User ID or Collection of Users.
     *
     * @param mixed $target User instance, User ID, or Collection of Users
     * @param string $title
     * @param string $body
     * @param string $type
     * @param string|null $actionUrl
     * @param array $meta
     */
    public static function send($target, $title, $body, $type = 'info', $actionUrl = null, $meta = [])
    {
        // Resolve Target
        $users = collect();

        if ($target instanceof \Illuminate\Support\Collection) {
            $users = $target;
        } elseif (is_array($target)) {
            $users = User::whereIn('id', $target)->get();
        } elseif ($target instanceof User) {
            $users = collect([$target]);
        } elseif (is_numeric($target)) {
            // User ID
            $user = User::find($target);
            if ($user)
                $users->push($user);
        }

        if ($users->isEmpty()) {
            Log::warning("NotificationService: No users found for target.", ['title' => $title]);
            return false;
        }

        // Send via Queue
        Notification::send($users, new GenericNotification($title, $body, $type, $actionUrl, $meta));

        return true;
    }

    /**
     * Send notification to all users with a specific Role.
     *
     * @param string $role 'learner', 'instructor', 'admin'
     * @param string $title
     * @param string $body
     * @param string $type
     * @param string|null $actionUrl
     * @param array $meta
     */
    public static function sendToRole($role, $title, $body, $type = 'info', $actionUrl = null, $meta = [])
    {
        $users = User::where('role', $role)->get();

        if ($users->count() === 0) {
            Log::info("NotificationService: No users found for role: {$role}");
            return false;
        }

        return self::send($users, $title, $body, $type, $actionUrl, $meta);
    }

    /**
     * Broadcast notification to ALL active users.
     */
    public static function broadcast($title, $body, $type = 'info', $actionUrl = null, $meta = [])
    {
        // Sending to all active users (exclude suspended)
        $users = User::where('status', '!=', 'suspended')->get(); // Adjust status check as per DB
        return self::send($users, $title, $body, $type, $actionUrl, $meta);
    }
}
