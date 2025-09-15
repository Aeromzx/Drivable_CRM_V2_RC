<?php

namespace App\Http\Controllers;

use App\Models\Chat;
use App\Models\Message;
use App\Models\ContactViolation;
use App\Models\User_live;
use App\Models\Renter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use DB;

class ChatController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $filter = $request->get('filter', 'all'); // all, censored, active
        
        // Log page access
        $currentUser = auth()->user();
        if ($currentUser) {
            \App\Models\ActivityLog::log(
                'accessed',
                'Chat-Seite',
                null,
                'Chat-Übersicht',
                "Chat-Seite wurde von {$currentUser->name} aufgerufen" . 
                ($search ? " (Suche: '{$search}')" : '') . 
                " (Filter: {$filter})"
            );
        }
        
        try {
            $query = Chat::with(['user', 'renter.user', 'latestMessage.sender'])
                ->withCount(['messages', 'messages as censored_messages_count' => function($q) {
                    $q->whereHas('violations');
                }]);
            
            // Search functionality
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->whereHas('user', function($userQuery) use ($search) {
                        $userQuery->where('name', 'LIKE', '%' . $search . '%')
                                 ->orWhere('email', 'LIKE', '%' . $search . '%');
                    })
                    ->orWhereHas('renter.user', function($renterUserQuery) use ($search) {
                        $renterUserQuery->where('name', 'LIKE', '%' . $search . '%')
                                       ->orWhere('email', 'LIKE', '%' . $search . '%');
                    })
                    ->orWhereHas('renter', function($renterQuery) use ($search) {
                        $renterQuery->where('company_name', 'LIKE', '%' . $search . '%');
                    });
                });
            }
            
            // Filter functionality
            if ($filter === 'censored') {
                $query->whereHas('messages.violations');
            } elseif ($filter === 'active') {
                $query->whereHas('messages', function($q) {
                    $q->where('created_at', '>=', now()->subDays(7));
                });
            }
            
            $chats = $query->orderBy('updated_at', 'desc')
                          ->paginate(15)
                          ->appends($request->query());
            
            // Statistics
            $stats = [
                'total_chats' => Chat::count(),
                'active_chats' => Chat::whereHas('messages', function($q) {
                    $q->where('created_at', '>=', now()->subDays(7));
                })->count(),
                'chats_with_violations' => Chat::whereHas('messages.violations')->count(),
                'total_violations' => ContactViolation::where('reviewed', 0)->count(),
                'recent_violations' => ContactViolation::where('created_at', '>=', now()->subDays(1))->count()
            ];
            
            return Inertia::render('Chat', [
                'chats' => $chats,
                'search' => $search,
                'filter' => $filter,
                'statistics' => $stats
            ]);
            
        } catch (\Exception $e) {
            return Inertia::render('Chat', [
                'chats' => (object)[
                    'data' => [],
                    'last_page' => 1,
                    'from' => 0,
                    'to' => 0,
                    'total' => 0,
                    'links' => []
                ],
                'search' => $search,
                'filter' => $filter,
                'statistics' => [
                    'total_chats' => 0,
                    'active_chats' => 0,
                    'chats_with_violations' => 0,
                    'total_violations' => 0,
                    'recent_violations' => 0
                ],
                'error' => 'Fehler beim Laden der Chats: ' . $e->getMessage()
            ]);
        }
    }
    
    public function show(Chat $chat)
    {
        $chat->load([
            'user', 
            'renter.user', 
            'messages' => function($query) {
                $query->with(['sender', 'violations'])->orderBy('created_at', 'asc');
            }
        ]);
        
        // Log the view action
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'viewed',
            'Chat',
            $chat->id,
            "Chat zwischen {$chat->user->name} und {$chat->renter->company_name}",
            "Chat-Details wurden von {$currentUser->name} angezeigt"
        );
        
        return response()->json([
            'chat' => $chat
        ]);
    }
    
    public function uncensorMessage(Message $message)
    {
        try {
            // Find the violation for this message
            $violation = ContactViolation::where('message_id', $message->id)->first();
            
            if (!$violation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keine Zensur-Verletzung für diese Nachricht gefunden'
                ], 404);
            }
            
            // Restore original content
            $message->update([
                'content' => $violation->original_content
            ]);
            
            // Mark violation as reviewed
            $violation->update([
                'reviewed' => true
            ]);
            
            // Log the action
            $currentUser = auth()->user();
            \App\Models\ActivityLog::log(
                'uncensored',
                'Message',
                $message->id,
                "Nachricht in Chat {$message->chat_id}",
                "Nachricht wurde von {$currentUser->name} entzenisiert"
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Nachricht wurde erfolgreich entzensiert',
                'updated_message' => $message->fresh(['sender', 'violations'])
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Entzensieren: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function censorMessage(Message $message, Request $request)
    {
        try {
            $validated = $request->validate([
                'violation_type' => 'required|string|max:255',
                'reason' => 'nullable|string|max:1000'
            ]);
            
            // Store original content if not already stored
            $originalContent = $message->content;
            
            // Update message content
            $message->update([
                'content' => 'Diese Nachricht wurde zensiert.'
            ]);
            
            // Create or update violation record
            ContactViolation::updateOrCreate(
                ['message_id' => $message->id],
                [
                    'user_id' => $message->sender_id,
                    'chat_id' => $message->chat_id,
                    'violation_type' => $validated['violation_type'],
                    'original_content' => $originalContent,
                    'filtered_content' => 'Diese Nachricht wurde zensiert.',
                    'reviewed' => true
                ]
            );
            
            // Log the action
            $currentUser = auth()->user();
            \App\Models\ActivityLog::log(
                'censored',
                'Message',
                $message->id,
                "Nachricht in Chat {$message->chat_id}",
                "Nachricht wurde von {$currentUser->name} zensiert (Grund: {$validated['violation_type']})"
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Nachricht wurde erfolgreich zensiert',
                'updated_message' => $message->fresh(['sender', 'violations'])
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Zensieren: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getViolations(Request $request)
    {
        $search = $request->get('search', '');
        $reviewed = $request->get('reviewed', 'all'); // all, reviewed, unreviewed
        
        $query = ContactViolation::with(['user', 'chat', 'message.sender']);
        
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('original_content', 'LIKE', '%' . $search . '%')
                  ->orWhere('violation_type', 'LIKE', '%' . $search . '%')
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('name', 'LIKE', '%' . $search . '%');
                  });
            });
        }
        
        if ($reviewed === 'reviewed') {
            $query->where('reviewed', true);
        } elseif ($reviewed === 'unreviewed') {
            $query->where('reviewed', false);
        }
        
        $violations = $query->orderBy('created_at', 'desc')
                           ->paginate(20)
                           ->appends($request->query());
        
        return response()->json([
            'violations' => $violations
        ]);
    }
}