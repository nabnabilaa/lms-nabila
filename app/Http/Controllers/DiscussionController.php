<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Course;
use App\Models\User;
use App\Notifications\NewDiscussionPost;
use App\Notifications\NewDiscussionReply;
use App\Notifications\DiscussionLiked;
use App\Notifications\DiscussionSolved;
use Illuminate\Support\Facades\Notification;

class DiscussionController extends Controller
{
    public function index($courseId)
    {
        $userId = auth()->id();
        $discussions = \App\Models\CourseDiscussion::where('course_id', $courseId)
            ->with('user:id,name,avatar')
            ->latest()
            ->get()
            ->map(function ($discussion) use ($userId) {
                $discussion->is_liked = \App\Models\CourseDiscussionLike::where('user_id', $userId)
                    ->where('course_discussion_id', $discussion->id)
                    ->exists();
                return $discussion;
            });

        return response()->json($discussions);
    }

    public function store(Request $request, $courseId)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $discussion = \App\Models\CourseDiscussion::create([
            'course_id' => $courseId,
            'user_id' => auth()->id(),
            'title' => $validated['title'],
            'body' => $validated['body'],
            'replies' => [], // Init empty array
            'likes' => 0,
            'dislikes' => 0,
            'is_resolved' => false
        ]);

        $discussion->save(); // Already created, but to be safe or if using create

        // [INST TRIGGER 5] Notify Instructor: New Discussion
        $course = Course::find($courseId);
        if ($course && $course->instructor_id) {
            $instructor = \App\Models\Instructor::find($course->instructor_id);
            if ($instructor && $instructor->user) {
                // $instructor->user->notify(new NewDiscussionPost(auth()->user()->name, $discussion->title));
                \App\Services\NotificationService::send(
                    $instructor->user,
                    'Diskusi Baru 💬',
                    auth()->user()->name . " memulai diskusi di '" . $course->title . "': " . $discussion->title,
                    'info',
                );
            }
        }

        // [ADMIN TRIGGER 1] Notify Admins: New Discussion
        $admins = \App\Models\User::where('role', 'admin')->get();
        if ($admins->isNotEmpty()) {
            \App\Services\NotificationService::send(
                $admins,
                'Diskusi Baru 💬',
                auth()->user()->name . " membuat diskusi baru: " . $discussion->title,
                'info',
                "/courses/{$courseId}"
            );
        }

        return response()->json($discussion->load('user:id,name,avatar'), 201);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $discussion = \App\Models\CourseDiscussion::findOrFail($id);

        if ($discussion->user_id != auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $discussion->update([
            'title' => $validated['title'],
            'body' => $validated['body']
        ]);

        return response()->json($discussion->load('user:id,name,avatar'));
    }

    public function reply(Request $request, $id)
    {
        $request->validate(['body' => 'required|string']);

        $discussion = \App\Models\CourseDiscussion::findOrFail($id);
        $replies = $discussion->replies ?? [];

        $newReply = [
            'id' => uniqid(),
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'user_avatar' => auth()->user()->avatar,
            'body' => $request->body,
            'created_at' => now()->toIso8601String(),
            'parent_id' => $request->parent_id ?? null,
            'reply_to_user_name' => $request->reply_to_user_name ?? null
        ];

        $replies[] = $newReply;
        $discussion->replies = $replies;
        $discussion->save();

        // Notify Reviewing User (Discussion Owner) if different
        if ($discussion->user_id !== auth()->id()) {
            $discussion->load('user');
            if ($discussion->user) {
                // $discussion->user->notify(new NewDiscussionReply(auth()->user()->name, $discussion->title));
                \App\Services\NotificationService::send(
                    $discussion->user,
                    'Balasan Baru ↩️',
                    auth()->user()->name . " membalas diskusi Anda: " . $discussion->title,
                    'info',
                    "/courses/{$discussion->course_id}"
                );
            }
        }

        // Notify Parent Reply Author (if nested reply)
        if ($request->parent_id) {
            $parentReply = collect($replies)->firstWhere('id', $request->parent_id);
            if ($parentReply && isset($parentReply['user_id'])) {
                $parentUserId = $parentReply['user_id'];
                // Check if Parent Author is NOT me AND NOT the discussion owner (already notified above)
                if ($parentUserId !== auth()->id() && $parentUserId !== $discussion->user_id) {
                    $parentUser = \App\Models\User::find($parentUserId);
                    if ($parentUser) {
                        \App\Services\NotificationService::send(
                            $parentUser,
                            'Balasan Baru ↩️',
                            auth()->user()->name . " membalas komentar Anda di diskusi: " . $discussion->title,
                            'info',
                            "/courses/{$discussion->course_id}"
                        );
                    }
                }
            }
        }

        return response()->json($discussion->load('user:id,name,avatar'));
    }

    public function updateReply(Request $request, $id, $replyId)
    {
        $request->validate(['body' => 'required|string']);

        $discussion = \App\Models\CourseDiscussion::findOrFail($id);
        $replies = $discussion->replies ?? [];
        $updated = false;

        $replies = array_map(function ($reply) use ($replyId, $request, &$updated) {
            if ($reply['id'] === $replyId) {
                if ($reply['user_id'] != auth()->id()) {
                    abort(403, 'Unauthorized');
                }
                $reply['body'] = $request->body;
                $updated = true;
            }
            return $reply;
        }, $replies);

        if (!$updated) {
            return response()->json(['message' => 'Reply not found'], 404);
        }

        $discussion->replies = $replies;
        $discussion->save();

        return response()->json($discussion);
    }

    public function toggleLike($id)
    {
        $discussion = \App\Models\CourseDiscussion::findOrFail($id);
        $userId = auth()->id();

        $existingLike = \App\Models\CourseDiscussionLike::where('user_id', $userId)
            ->where('course_discussion_id', $id)
            ->first();

        if ($existingLike) {
            $existingLike->delete();
            $discussion->decrement('likes');
            $isLiked = false;
        } else {
            \App\Models\CourseDiscussionLike::create([
                'user_id' => $userId,
                'course_discussion_id' => $id
            ]);
            $discussion->increment('likes');
            $isLiked = true;

            // Notify Discussion Owner
            if ($discussion->user_id !== $userId) {
                $discussion->load('user');
                if ($discussion->user) {
                    // $discussion->user->notify(new DiscussionLiked(auth()->user()->name, $discussion->title));
                    \App\Services\NotificationService::send(
                        $discussion->user,
                        'Menyukai Diskusi Anda 👍',
                        auth()->user()->name . " menyukai diskusi Anda: " . $discussion->title,
                        'success',
                        "/courses/{$discussion->course_id}"
                    );
                }
            }
        }

        return response()->json([
            'likes' => $discussion->likes,
            'is_liked' => $isLiked
        ]);
    }
    public function destroy($id)
    {
        $discussion = \App\Models\CourseDiscussion::findOrFail($id);

        if ($discussion->user_id != auth()->id()) {
            abort(403, 'Unauthorized');
        }

        $discussion->delete();
        return response()->json(['message' => 'Discussion deleted']);
    }

    public function destroyReply($id, $replyId)
    {
        $discussion = \App\Models\CourseDiscussion::findOrFail($id);
        $replies = $discussion->replies ?? [];
        $originalCount = count($replies);

        // Find and remove the reply checking ownership
        $newReplies = [];
        $foundAndAuthorized = false;

        foreach ($replies as $reply) {
            if ($reply['id'] === $replyId) {
                if ($reply['user_id'] != auth()->id() && !in_array(auth()->user()->role, ['admin', 'instructor'])) {
                    abort(403, 'Unauthorized');
                }
                $foundAndAuthorized = true;
                continue; // Skip adding this one to new array
            }
            $newReplies[] = $reply;
        }

        if (!$foundAndAuthorized) {
            return response()->json(['message' => 'Reply not found'], 404);
        }

        $discussion->replies = $newReplies;
        $discussion->save();

        return response()->json($discussion);
    }
    public function resolve($id)
    {
        $discussion = \App\Models\CourseDiscussion::findOrFail($id);

        // Authorization: Only Instructor or Admin (or maybe the student who asked?)
        // Let's assume Instructor or Admin for 'Solved' status usually.
        // Or if student says "My question is answered".
        // Let's allow Owner, Instructor, Admin.

        $user = auth()->user();
        if ($user->id !== $discussion->user_id && $user->role !== 'admin' && $user->role !== 'instructor') {
            // Check if user is the instructor of the course
            $course = $discussion->course; // Assuming relation exists
            if (!$course || ($course->instructor->user_id ?? -1) !== $user->id) {
                abort(403, 'Unauthorized');
            }
        }

        $discussion->is_resolved = true;
        $discussion->save();

        // Notify Student (if resolved by someone else)
        if ($discussion->user_id !== $user->id) {
            $discussion->load('user');
            if ($discussion->user) {
                // $discussion->user->notify(new DiscussionSolved($discussion->title));
                \App\Services\NotificationService::send(
                    $discussion->user,
                    'Diskusi Terpecahkan ✅',
                    "Diskusi Anda '{$discussion->title}' telah ditandai selesai.",
                    'success',
                    "/courses/{$discussion->course_id}"
                );
            }
        }

        return response()->json(['message' => 'Discussion resolved', 'discussion' => $discussion]);
    }
}
