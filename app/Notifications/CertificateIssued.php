<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CertificateIssued extends Notification
{
    use Queueable;

    public $studentName;
    public $courseTitle;
    public $grade;

    /**
     * Create a new notification instance.
     */
    public function __construct($studentName, $courseTitle, $grade)
    {
        $this->studentName = $studentName;
        $this->courseTitle = $courseTitle;
        $this->grade = $grade;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New Certificate Issued',
            'message' => "Student {$this->studentName} has been issued a certificate for {$this->courseTitle} with grade {$this->grade}.",
            'type' => 'info',
            'url' => '/admin/certificates'
        ];
    }
}
