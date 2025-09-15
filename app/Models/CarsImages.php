<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarsImages extends Model
{
    protected $connection = 'mysql_live';
    protected $fillable = ['car_id', 'image_path', 'image_position'];

    public function car()
    {
        return $this->belongsTo(Cars::class, 'car_id');
    }
}
