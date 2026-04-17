<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\DatabaseMessage;

class GenericNotification extends Notification
{
    use Queueable;

    public $title;
    public $body;
    public $type; // 'info', 'success', 'warning', 'error'
    public $actionUrl;
    public $meta; // Array for extra data (related_id, etc)

    /**
     * Create a new notification instance.
     *
     * @param string $title - Notification Title (fallback text)
     * @param string $body - Notification Message (fallback text)
     * @param string $type - 'info', 'success', 'warning', 'error'
     * @param string|null $actionUrl - Optional link
     * @param array $meta - Optional metadata, supports i18n keys:
     *   - title_key: i18n key for title (e.g. 'notif.welcome_title')
     *   - title_params: array of interpolation params for title
     *   - message_key: i18n key for message (e.g. 'notif.welcome_message')
     *   - message_params: array of interpolation params for message
     */
    public function __construct($title, $body, $type = 'info', $actionUrl = null, $meta = [])
    {
        $this->title = $title;
        $this->body = $body;
        $this->type = $type;
        $this->actionUrl = $actionUrl;
        $this->meta = $meta;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via($notifiable)
    {
        return ['database']; // Default to database only for now
    }

    /**
     * Build the common data payload.
     */
    private function buildPayload()
    {
        $data = [
            'title' => $this->title,
            'message' => $this->body,
            'type' => $this->type,
            'action_url' => $this->actionUrl,
            'meta' => $this->meta,
        ];

        // Hoist i18n keys from meta to top level for easy frontend access
        if (!empty($this->meta['title_key'])) {
            $data['title_key'] = $this->meta['title_key'];
            $data['title_params'] = $this->meta['title_params'] ?? [];
        }
        if (!empty($this->meta['message_key'])) {
            $data['message_key'] = $this->meta['message_key'];
            $data['message_params'] = $this->meta['message_params'] ?? [];
        }

        return $data;
    }

    /**
     * Get the array representation of the notification for the database.
     */
    public function toDatabase($notifiable)
    {
        return array_merge($this->buildPayload(), [
            'timestamp' => now()->toISOString()
        ]);
    }

    /**
     * Fallback for toArray if other drivers are added later.
     */
    public function toArray($notifiable)
    {
        return $this->buildPayload();
    }
}
