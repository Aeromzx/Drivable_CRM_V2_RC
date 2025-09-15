<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordHistory extends Model
{
    protected $table = 'password_history';
    
    protected $fillable = [
        'user_id',
        'password_hash',
        'changed_by'
    ];
    
    public function user()
    {
        return $this->belongsTo(User_live::class, 'user_id');
    }
}
