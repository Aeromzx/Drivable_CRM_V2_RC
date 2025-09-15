<?php
// app/Models/RentalRetargeting.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RentalRetargeting extends Model
{
    use HasFactory;

    protected $table = 'rental_retargeting';
    protected $connection = 'mysql_live'; // Wichtig: Live-DB Connection

    protected $fillable = [
        'rental_id',
        'pushes_sent',
        'last_push_at',
        'last_push_text',
        'completed',
    ];

    protected $casts = [
        'last_push_at' => 'datetime',
        'completed' => 'boolean',
    ];

    public function rental(): BelongsTo
    {
        return $this->belongsTo(Rentals::class, 'rental_id');
    }
}
