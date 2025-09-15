<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CarExtras extends Model
{
    use HasFactory;

    protected $table = 'car_extras';
    protected $connection = 'mysql_live';

    protected $fillable = ['car_id', 'name', 'description', 'price'];

    public function car()
    {
        return $this->belongsTo(Cars::class, 'car_id');
    }

}
