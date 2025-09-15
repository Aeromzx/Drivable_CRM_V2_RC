<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrackingLinks extends Model
{
    use HasFactory;

    protected $connection = 'mysql_live';
    protected $table = 'tracking_links';

    protected $fillable = [
        'name',
        'forwarding',
        'counter',
    ];
}
