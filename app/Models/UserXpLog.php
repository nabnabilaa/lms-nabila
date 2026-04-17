<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserXpLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'xp_amount',
        'action',
        'description',
        'reference_id',
        'reference_type',
        'created_at', // Important for seeding history
        'updated_at'
    ];

    protected $casts = [
        'xp_amount' => 'integer',
        'reference_id' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
