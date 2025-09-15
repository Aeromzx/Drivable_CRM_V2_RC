<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chat extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['user_id', 'renter_id'];

    /**
     * Get the user associated with the chat.
     */
    public function user()
    {
        return $this->belongsTo(User_live::class);
    }

    /**
     * Get the renter associated with the chat.
     */
    public function renter()
    {
        return $this->belongsTo(Renter::class);
    }

    /**
     * Get the messages for the chat.
     */
    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Get the latest message for the chat.
     */
    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latest();
    }
}
