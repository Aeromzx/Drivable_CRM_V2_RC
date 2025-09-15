<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupons extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = [
        'rent_id',
        'code',
        'description',
        'discount_type',
        'discount_value',
        'max_uses',
        'used_count',
        'valid_from',
        'valid_until',
        'is_active'
    ];

    protected $casts = [
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'is_active' => 'boolean'
    ];

    public function rental()
    {
        return $this->belongsTo(Rentals::class, 'rent_id');
    }

    public function isValid()
    {
        return $this->is_active
            && $this->used_count < $this->max_uses
            && now()->between($this->valid_from, $this->valid_until);
    }

    public function calculateDiscount($rentalAmount)
    {
        if ($this->discount_type === 'percentage') {
            return $rentalAmount * ($this->discount_value / 100);
        }
        return $this->discount_value;
    }

    // Increment used count
    public function incrementUsage()
    {
        $this->increment('used_count');
    }
}
