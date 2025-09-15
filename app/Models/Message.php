<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['chat_id', 'sender_id', 'content', 'is_read'];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_read' => 'boolean',
    ];

    /**
     * Get the chat that owns the message.
     */
    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    /**
     * Get the sender of the message.
     */
    public function sender()
    {
        return $this->belongsTo(User_live::class, 'sender_id');
    }
    
    /**
     * Get the violations for this message.
     */
    public function violations()
    {
        return $this->hasMany(ContactViolation::class);
    }
    
    /**
     * Check if this message is censored.
     */
    public function isCensored()
    {
        return $this->violations()->exists() && $this->content === 'Diese Nachricht wurde zensiert.';
    }
}
