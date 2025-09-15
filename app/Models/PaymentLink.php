<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentLink extends Model
{
    protected $fillable = [
        'renter_id',
        'stripe_payment_link_id',
        'stripe_url',
        'amount',
        'currency',
        'description',
        'admin_note',
        'active',
        'email_sent',
        'email_sent_at',
        'created_by',
        'stripe_metadata'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'active' => 'boolean',
        'email_sent' => 'boolean',
        'email_sent_at' => 'datetime',
        'stripe_metadata' => 'array'
    ];

    public function renter(): BelongsTo
    {
        return $this->belongsTo(Renter::class, 'renter_id', 'id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }
}
