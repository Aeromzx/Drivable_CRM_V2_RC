<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentalStripeFee extends Model
{
    protected $connection = 'mysql_live';
    protected $fillable = [
        'rental_id',
        'stripe_fee',
        'net_amount',
        'stripe_charge_id',
        'currency',
        'stripe_metadata',
        'is_processed',
        'processed_at'
    ];

    protected $casts = [
        'stripe_fee' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'stripe_metadata' => 'array',
        'is_processed' => 'boolean',
        'processed_at' => 'datetime'
    ];

    public function rental(): BelongsTo
    {
        return $this->belongsTo(Rentals::class, 'rental_id');
    }
}
