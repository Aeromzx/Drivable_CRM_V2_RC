<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Models extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $table = 'models';

    protected $fillable = [
        'brand_id',
        'modelName',
    ];

    public function brand()
    {
        return $this->belongsTo(Brands::class);
    }
}
