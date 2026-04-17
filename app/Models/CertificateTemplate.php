<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificateTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        "name", "background_url", "orientation", "is_active", 
        "primary_color", "signature_name", "signature_title", "config_json"
    ];

    public function mappings()
    {
        // Parameter ke-2 memastikan Laravel mencari kolom yang benar
        return $this->hasMany(CertificateMapping::class, "certificate_template_id");
    }
}
