<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tracking extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';
    protected $table = 'trackings';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'device',
        'data',
        'coordinates',
        'listingId',
        'userId'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'data' => 'array',
        'coordinates' => 'array',
    ];
}
