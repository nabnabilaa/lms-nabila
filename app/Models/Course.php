<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
// Pastikan model CourseDiscussion di-import jika perlu, atau gunakan full namespace
use App\Models\CourseDiscussion;
use Spatie\Translatable\HasTranslations;

class Course extends Model
{
    use HasFactory, HasTranslations;

    public $translatable = ['title', 'description'];

    public function toArray()
    {
        $attributes = parent::toArray();
        foreach ($this->getTranslatableAttributes() as $field) {
            $attributes[$field] = $this->getTranslations($field);
        }
        return $attributes;
    }

    protected $fillable = [
        'title',
        'description',
        'instructor_id',
        'difficulty',
        'rating',
        'duration_minutes',
        'is_active',
        'is_premium', // Added
        'price',      // Added
        'certificate_template',
        'certificate_config',
        'promoted_coupon_code', // [NEW] For Course-specific QR Promo
    ];

    protected $casts = [
        'title' => 'array',
        'description' => 'array',
        'is_active' => 'boolean',
        'is_premium' => 'boolean',
        'price' => 'decimal:2',
        'rating' => 'float',
        'duration_minutes' => 'integer',
        'instructor_id' => 'integer',
        'certificate_config' => 'array', // Cast JSON to array
    ];

    public function instructor()
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function modules()
    {
        return $this->hasMany(Module::class)->orderBy('order');
    }

    public function enrollments()
    {
        return $this->hasMany(CourseEnrollment::class);
    }

    public function resources()
    {
        return $this->hasMany(Resource::class);
    }

    // --- BAGIAN INI YANG PERLU DIUBAH ---
    public function discussions()
    {
        // Ganti Discussion::class menjadi CourseDiscussion::class
        return $this->hasMany(CourseDiscussion::class);
    }

    public function sessions()
    {
        return $this->hasMany(CourseSession::class);
    }

    public function promotedCoupon()
    {
        return $this->belongsTo(Coupon::class, 'promoted_coupon_code', 'code');
    }
}