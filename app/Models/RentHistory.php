<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentHistory extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['rent_id', 'status'];

    public function rental()
    {
        return $this->belongsTo(Rentals::class, 'rent_id');
    }
}
