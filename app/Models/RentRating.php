<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentRating extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['user_id', 'renter_id', 'rent_id', 'rating', 'stars'];

    public function rental()
    {
        return $this->belongsTo(Rentals::class, 'rent_id');
    }

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function renter() {
        return $this->belongsTo(Renter::class);
    }
}
