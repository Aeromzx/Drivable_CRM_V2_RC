<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RentExtras extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['rent_id', 'delivery', 'deliveryAddress', 'extras', 'extra_kilometers', 'delieryDistance', 'latitude', 'longitude'];

    protected $casts = [
         'extras' => 'array',
    ];

    public function rental()
    {
        return $this->belongsTo(Rentals::class, 'rent_id');
    }

    /**
     * Get the extras attribute, properly parsing JSON string from database
     */
    public function getExtrasAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Parse the JSON string from database to actual array/object
        try {
            return json_decode($value, true);
        } catch (\Exception $e) {
            \Log::warning('Failed to parse extras JSON for RentExtras ID: ' . $this->id, [
                'value' => $value,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
}
