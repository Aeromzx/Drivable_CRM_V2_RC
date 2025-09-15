<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'user_id',
        'action', 
        'resource_type',
        'resource_id',
        'resource_name',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent'
    ];
    
    protected $casts = [
        'old_values' => 'json',
        'new_values' => 'json',
    ];
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public static function log($action, $resourceType, $resourceId, $resourceName, $description, $oldValues = null, $newValues = null)
    {
        $user = auth()->user();
        if (!$user) return;
        
        return self::create([
            'user_id' => $user->id,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'resource_name' => $resourceName,
            'description' => $description,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
    }
}
