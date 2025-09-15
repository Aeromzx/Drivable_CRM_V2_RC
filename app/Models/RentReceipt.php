<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentReceipt extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['rent_id', 'receipt', 'sum', 'status', 'type'];

    protected $casts = [
        'receipt' => 'array',
    ];

    public function rental()
    {
        return $this->belongsTo(Rentals::class, 'rent_id');
    }
}
