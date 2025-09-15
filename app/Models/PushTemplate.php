<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PushTemplate extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'message', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}