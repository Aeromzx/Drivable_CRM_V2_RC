<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MailList extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    protected $table = 'mail_list';

    protected $fillable = [
        'name',
        'mail',
    ];

}
