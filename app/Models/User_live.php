<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class User_live extends Model
{
    use HasFactory;

    protected $connection = 'mysql_live';
    protected $table = 'users';

    protected $fillable = [
        'name',
        'email',
        'email_verified',
        'profile_image',
        'phone_number',
        'phone_number_verified',
        'password',
        'google_id',
        'apple_id',
        'renter_id',
        'licence_front',
        'licence_back',
        'id_front',
        'id_back',
        'stripe_customer_id'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
}
