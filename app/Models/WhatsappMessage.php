<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappMessage extends Model
{
    protected $connection = 'mysql_live';

    protected $fillable = [
        'message_sid', 'from_number', 'to_number', 'body',
        'status', 'user_id', 'direction'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function findUserByPhoneNumber($phoneNumber)
    {
        $cleanNumber = str_replace('whatsapp:', '', $phoneNumber);

        return User::where('phone_number', $cleanNumber)
            ->orWhere('phone_number', str_replace('+', '', $cleanNumber))
            ->orWhere('phone_number', '+' . ltrim($cleanNumber, '+'))
            ->first();
    }
}
