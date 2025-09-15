<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Verifications extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $fillable = ['user_id', 'phone', 'email', 'code', 'expires_at'];

    protected $dates = ['expires_at'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

}


