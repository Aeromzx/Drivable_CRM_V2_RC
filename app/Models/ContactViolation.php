<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactViolation extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_id',
        'chat_id',
        'message_id',
        'violation_type',
        'original_content',
        'filtered_content',
        'reviewed',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'reviewed' => 'boolean',
    ];

    /**
     * Get the user that owns the violation.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the chat where the violation occurred.
     */
    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    /**
     * Get the message containing the violation.
     */
    public function message()
    {
        return $this->belongsTo(Message::class);
    }
}
