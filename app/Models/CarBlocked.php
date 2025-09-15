<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CarBlocked extends Model
{
    use HasFactory;
    protected $table = 'car_blocked';
    protected $connection = 'mysql_live';

    protected $fillable = [
        'car_id',
        'type',
        'from_rent',
        'start_date',
        'end_date',
        'start_hour',
        'end_hour',
    ];

    protected $casts = [
        'type' => 'integer',
        'from_rent' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function car()
    {
        return $this->belongsTo(Cars::class, 'car_id');
    }
}
