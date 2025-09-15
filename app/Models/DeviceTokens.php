<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeviceTokens extends Model
{
    use HasFactory;

    protected $connection = 'mysql_live';
    protected $fillable = ['user_id', 'guest_user_id', 'push_token', 'device_type'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
