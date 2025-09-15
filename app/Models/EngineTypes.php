<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EngineTypes extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $table = 'engine_types';

    protected $fillable = [
        'name'
    ];
}
