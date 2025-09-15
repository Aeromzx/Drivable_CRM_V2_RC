<?php
// app/Models/RentalPaymentRetargeting.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentalPaymentRetargeting extends Model
{
    use HasFactory;

    protected $table = 'rental_payment_retargeting';
    protected $connection = 'mysql_live'; // Wichtig: Live-DB Connection

    protected $fillable = [
        'rental_id',
        'pushes_sent',
        'push_sent_at',
        'push_text',
        'completed',
    ];

    protected $casts = [
        'push_sent_at' => 'datetime',
        'completed' => 'boolean',
    ];

    public function rental(): BelongsTo
    {
        return $this->belongsTo(Rentals::class, 'rental_id');
    }
}
