<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VermieterCrm extends Model
{
    protected $table = 'vermieter_crm';
    
    protected $fillable = [
        'name',
        'ansprechpartner',
        'telefon',
        'email',
        'webseite',
        'land',
        'beschreibung',
        'status',
        'position'
    ];
    
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
