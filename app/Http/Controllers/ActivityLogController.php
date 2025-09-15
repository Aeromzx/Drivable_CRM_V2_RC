<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('user')->orderBy('created_at', 'desc');
        
        // Search functionality
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('resource_name', 'like', "%{$search}%")
                  ->orWhere('resource_type', 'like', "%{$search}%")
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }
        
        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->get('action'));
        }
        
        // Filter by resource type
        if ($request->filled('resource_type')) {
            $query->where('resource_type', $request->get('resource_type'));
        }
        
        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->get('user_id'));
        }
        
        // Filter by date range
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->get('date_from'));
        }
        
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->get('date_to') . ' 23:59:59');
        }
        
        $logs = $query->paginate(50);
        
        // Get filter options
        $actions = ActivityLog::distinct('action')->pluck('action')->sort();
        $resourceTypes = ActivityLog::distinct('resource_type')->pluck('resource_type')->sort();
        $users = \App\Models\User::orderBy('name')->get(['id', 'name', 'email']);
        
        return response()->json([
            'logs' => $logs,
            'actions' => $actions,
            'resource_types' => $resourceTypes,
            'users' => $users
        ]);
    }
}
