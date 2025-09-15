<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = [
        'title',
        'description',
        'amount',
        'vat_amount',
        'vat_rate',
        'net_amount',
        'category',
        'expense_date',
        'invoice_number',
        'supplier',
        'receipt_path',
        'currency',
        'metadata',
        'is_deductible',
        'user_id'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'expense_date' => 'date',
        'metadata' => 'array',
        'is_deductible' => 'boolean'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function calculateVatAmount(): float
    {
        return round($this->net_amount * ($this->vat_rate / 100), 2);
    }

    public function calculateTotalAmount(): float
    {
        return $this->net_amount + $this->vat_amount;
    }
}
