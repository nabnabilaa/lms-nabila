<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificateMapping extends Model
{
    use HasFactory;

    // Perhatikan "certificate_template_id" di sini (BUKAN template_id)
    protected $fillable = [
        "certificate_template_id", 
        "field_name", 
        "x_position", 
        "y_position", 
        "font_size", 
        "color"
    ];

    public function template()
    {
        return $this->belongsTo(CertificateTemplate::class, "certificate_template_id");
    }
}
