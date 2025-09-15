<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Problems extends Model
{
    use HasFactory;

    protected $table = 'problems';
    protected $connection = 'mysql_live';

    protected $fillable = [
        'rent_id',
        'user_id',
        'name',
        'email',
        'category',
        'message'
    ];

}
