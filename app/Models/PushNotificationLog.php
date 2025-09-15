<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushNotificationLog extends Model
{
    use HasFactory;

    protected $table = 'push_notifications_log';
    protected $connection = 'mysql_live'; // Wichtig: Live-DB Connection

    protected $fillable = [
        'user_id',
        'title',
        'body',
        'data',
        'tokens_found',
        'tokens_count',
        'device_tokens',
        'responses',
        'success',
        'error_message',
    ];

    protected $casts = [
        'data' => 'array',
        'device_tokens' => 'array',
        'responses' => 'array',
        'tokens_found' => 'boolean',
        'success' => 'boolean',
        'tokens_count' => 'integer',
    ];

    /**
     * Beziehung zum User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User_live::class, 'user_id', 'id');
    }

    /**
     * Scope für erfolgreiche Push Notifications
     */
    public function scopeSuccessful($query)
    {
        return $query->where('success', true);
    }

    /**
     * Scope für fehlgeschlagene Push Notifications
     */
    public function scopeFailed($query)
    {
        return $query->where('success', false);
    }

    /**
     * Scope für Notifications ohne Token
     */
    public function scopeNoTokens($query)
    {
        return $query->where('tokens_found', false);
    }
}
