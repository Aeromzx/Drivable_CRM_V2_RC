<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Brands extends Model
{
    use HasFactory;

    protected $table = 'brands';
    protected $connection = 'mysql_live';

    protected $fillable = [
        'brandName',
        'iconName',
    ];

    public function models()
    {
        return $this->hasMany(Models::class, 'brand');
    }

    public function cars()
    {
        return $this->hasMany(Cars::class, 'brand');
    }
}

