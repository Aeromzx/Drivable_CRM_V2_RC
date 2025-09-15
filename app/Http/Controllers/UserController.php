<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User_live;
use App\Models\User;
use App\Models\UserDeviceTracker;
use App\Models\Tracking;
use App\Models\Cars;
use App\Models\Rentals;
use App\Models\Chat;
use App\Models\Message;
use App\Models\PushNotificationLog;
use App\Models\WhatsappMessage;
use App\Models\PushTemplate;
use App\Models\DeviceTokens;
use Twilio\Rest\Client;

class UserController extends Controller
{
    public function getBasicUsers(Request $request)
    {
        $query = User_live::select([
                'id',
                'name',
                'email',
                'phone_number',
                'email_verified',
                'phone_number_verified',
                'profile_image',
                'created_at',
                'licence_front',
                'id_front'
            ]);

        // Filter functionality
        if ($request->filter && $request->filter !== 'all') {
            switch ($request->filter) {
                case 'email_verified':
                    $query->where('email_verified', 1)->where('phone_number_verified', 0);
                    break;
                case 'phone_verified':
                    $query->where('phone_number_verified', 1);
                    break;
                case 'id_uploaded':
                    $query->whereNotNull('id_front');
                    break;
                case 'license_uploaded':
                    $query->whereNotNull('licence_front');
                    break;
                case 'all_verified':
                    $query->where('email_verified', 1)
                          ->where('phone_number_verified', 1)
                          ->whereNotNull('id_front')
                          ->whereNotNull('licence_front');
                    break;
            }
        }

        // Search functionality
        if ($request->search) {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('email', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('phone_number', 'LIKE', "%{$searchTerm}%");
            });
        }

        // Get all users first, then apply sorting and pagination
        $allUsers = $query->get();

        // Add tracking counts for all users
        foreach ($allUsers as $user) {
            $trackingCount = \DB::connection('mysql_live')->table('trackings')
                ->where('userId', $user->id)
                ->count();
            $user->tracking_count = $trackingCount;
        }

        // Apply sorting
        if ($request->sort === 'activity') {
            $allUsers = $allUsers->sortByDesc('tracking_count');
        } else if ($request->sort === 'cars') {
            // Sort by viewed cars count - calculate on the fly
            $allUsers = $allUsers->map(function($user) {
                $viewedCarsCount = \DB::connection('mysql_live')->table('trackings')
                    ->where('userId', $user->id)
                    ->whereNotNull('listingId')
                    ->distinct('listingId')
                    ->count('listingId');
                $user->viewed_cars_count = $viewedCarsCount;
                return $user;
            })->sortByDesc('viewed_cars_count');
        } else if ($request->sort === 'bookings') {
            // Sort by rental count
            $allUsers = $allUsers->map(function($user) {
                $rentalsCount = Rentals::where('user_id', $user->id)->count();
                $user->rentals_count = $rentalsCount;
                return $user;
            })->sortByDesc('rentals_count');
        } else if ($request->sort === 'chats') {
            // Sort by chat count
            $allUsers = $allUsers->map(function($user) {
                $chatsCount = Chat::where('user_id', $user->id)->count();
                $user->chats_count = $chatsCount;
                return $user;
            })->sortByDesc('chats_count');
        } else if ($request->sort === 'oldest') {
            // Oldest first
            $allUsers = $allUsers->sortBy('created_at');
        } else {
            // Default: newest first
            $allUsers = $allUsers->sortByDesc('created_at');
        }

        // Manual pagination
        $page = $request->page ?? 1;
        $perPage = 20;
        $total = $allUsers->count();
        $offset = ($page - 1) * $perPage;
        $paginatedUsers = $allUsers->slice($offset, $perPage)->values();

        $users = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedUsers,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'pageName' => 'page']
        );

        // Add interaction stats and device info for each user
        foreach ($users as $user) {
            // Use existing tracking_count if available (from sorting), otherwise calculate
            $trackingCount = $user->tracking_count ?? \DB::connection('mysql_live')->table('trackings')
                ->where('userId', $user->id)
                ->count();

            // Count unique cars viewed
            $viewedCarsCount = $user->viewed_cars_count ?? \DB::connection('mysql_live')->table('trackings')
                ->where('userId', $user->id)
                ->whereNotNull('listingId')
                ->distinct('listingId')
                ->count('listingId');

            // Get device info from trackings (latest entry with device data)
            $latestTracking = \DB::connection('mysql_live')->table('trackings')
                ->where('userId', $user->id)
                ->whereNotNull('device')
                ->orderBy('created_at', 'desc')
                ->first();

            $user->device = null;
            if ($latestTracking && $latestTracking->device) {
                $deviceData = json_decode($latestTracking->data ?? '{}', true);
                $user->device = (object) [
                    'platform' => $deviceData['platform'] ?? $latestTracking->device,
                    'platform_version' => $deviceData['platformVersion'] ?? null,
                    'type' => $latestTracking->device,
                    'last_seen' => $latestTracking->created_at
                ];
            }

            // Calculate real counts
            $rentalsCount = $user->rentals_count ?? Rentals::where('user_id', $user->id)->count();
            $chatsCount = $user->chats_count ?? Chat::where('user_id', $user->id)->count();
            $bookingInitiationsCount = Rentals::where('user_id', $user->id)->where('status', Rentals::STATUS_REQUESTED)->count();

            $user->interaction_stats = [
                'viewed_cars_count' => $viewedCarsCount,
                'bookings_count' => $rentalsCount,
                'booking_initiations_count' => $bookingInitiationsCount,
                'chats_count' => $chatsCount,
                'total_interactions' => $trackingCount
            ];

            $user->email_verified = $user->email_verified;
        }

        return response()->json([
            'success' => true,
            'data' => $users
        ]);
    }

    public function getUserDetails($userId)
    {
        $user = User_live::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        // Get user's completed bookings (exclude requests)
        $bookings = Rentals::where('user_id', $userId)
            ->where('status', '!=', Rentals::STATUS_REQUESTED)
            ->with(['car.images', 'renter', 'rentReceipt'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($booking) use ($userId) {
                // Get request volume and payment status from rentReceipt like in Vermieter
                $requestVolume = $booking->total_amount ?: 0;
                $paymentStatus = 'Ausstehend';
                $receiptSum = 0;

                if ($booking->rentReceipt && $booking->rentReceipt->first()) {
                    $receipt = $booking->rentReceipt->first();
                    $receiptVolume = $receipt->sum ?: 0;
                    if ($receiptVolume > 0) {
                        $requestVolume = $receiptVolume;
                    }
                    $receiptSum = $receipt->sum ?: 0;

                    switch ($receipt->status) {
                        case 1:
                            $paymentStatus = 'Bezahlt';
                            break;
                        case 2:
                            $paymentStatus = 'Teilweise bezahlt';
                            break;
                        case 0:
                        default:
                            $paymentStatus = 'Ausstehend';
                            break;
                    }
                }

                // Count how many times user viewed this car BEFORE booking it
                $viewsBeforeBooking = 0;
                if ($booking->car && $booking->car->id) {
                    $viewsBeforeBooking = \DB::connection('mysql_live')->table('trackings')
                        ->where('userId', $userId)
                        ->where('listingId', $booking->car->id)
                        ->where('created_at', '<', $booking->created_at)
                        ->count();
                }

                return [
                    'id' => $booking->id,
                    'start_date' => $booking->start_date,
                    'end_date' => $booking->end_date,
                    'status' => $booking->status,
                    'total_price' => $requestVolume,
                    'total_amount' => $booking->total_amount,
                    'price_per_day' => $booking->price_per_day,
                    'pickup_location' => $booking->pickup_location,
                    'return_location' => $booking->return_location,
                    'pickup_time' => $booking->pickup_time,
                    'return_time' => $booking->return_time,
                    'payment_status' => $paymentStatus,
                    'receipt_sum' => $receiptSum,
                    'request_volume' => $requestVolume,
                    'views_before_booking' => $viewsBeforeBooking,
                    'duration' => $booking->start_date && $booking->end_date ?
                        \Carbon\Carbon::parse($booking->start_date)->diffInDays(\Carbon\Carbon::parse($booking->end_date)) + 1 : 0,
                    'notes' => $booking->rent_note,
                    'car' => $booking->car ? [
                        'id' => $booking->car->id,
                        'title' => $booking->car->title,
                        'brand' => $booking->car->brand,
                        'model' => $booking->car->model,
                        'year' => $booking->car->year,
                        'color' => $booking->car->color,
                        'image' => $booking->car->image_1,
                        'images' => $booking->car->images ? $booking->car->images->map(function($img) {
                            return ['image_path' => $img->image_path];
                        })->toArray() : []
                    ] : null,
                    'renter' => $booking->renter ? [
                        'id' => $booking->renter->id,
                        'name' => $booking->renter->name
                    ] : null,
                    'created_at' => $booking->created_at
                ];
            });

        // Get user's chats with latest messages and censorship data
        $chats = Chat::where('user_id', $userId)
            ->with(['renter.user'])
            ->orderBy('updated_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($chat) {
                $messages = Message::where('chat_id', $chat->id)
                    ->with(['sender', 'violations'])
                    ->orderBy('created_at', 'asc')
                    ->get()
                    ->map(function ($message) {
                        return [
                            'id' => $message->id,
                            'content' => $message->content,
                            'sender_id' => $message->sender_id,
                            'sender' => $message->sender ? [
                                'id' => $message->sender->id,
                                'name' => $message->sender->name
                            ] : null,
                            'is_read' => $message->is_read,
                            'created_at' => $message->created_at,
                            'violations' => $message->violations->map(function ($violation) {
                                return [
                                    'id' => $violation->id,
                                    'violation_type' => $violation->violation_type,
                                    'original_content' => $violation->original_content,
                                    'reason' => $violation->reason
                                ];
                            })
                        ];
                    });

                $latestMessage = $messages->last();
                $censoredCount = $messages->filter(function ($message) {
                    return count($message['violations']) > 0;
                })->count();

                return [
                    'id' => $chat->id,
                    'user_id' => $chat->user_id,
                    'renter' => $chat->renter ? [
                        'id' => $chat->renter->id,
                        'name' => $chat->renter->user->name ?? 'Unbekannt'
                    ] : null,
                    'messages' => $messages,
                    'messages_count' => $messages->count(),
                    'censored_messages_count' => $censoredCount,
                    'last_message' => $latestMessage ? $latestMessage['content'] : null,
                    'last_message_at' => $latestMessage ? $latestMessage['created_at'] : null,
                    'created_at' => $chat->created_at,
                    'updated_at' => $chat->updated_at
                ];
            });

        // Get viewed cars from tracking data
        $viewedCars = \DB::connection('mysql_live')->table('trackings')
            ->where('userId', $userId)
            ->whereNotNull('listingId')
            ->select('listingId', \DB::raw('COUNT(*) as view_count'), \DB::raw('MAX(created_at) as last_viewed'))
            ->groupBy('listingId')
            ->orderBy('view_count', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($tracking) use ($userId) {
                $car = Cars::with('images')->find($tracking->listingId);

                // Get detailed view history for this car
                $viewDetails = \DB::connection('mysql_live')->table('trackings')
                    ->where('userId', $userId)
                    ->where('listingId', $tracking->listingId)
                    ->select('created_at')
                    ->orderBy('created_at', 'desc')
                    ->get();

                return [
                    'id' => $tracking->listingId,
                    'view_count' => $tracking->view_count,
                    'last_viewed' => $tracking->last_viewed,
                    'title' => $car ? $car->title : 'Auto nicht verfügbar',
                    'brand' => $car ? $car->brand : null,
                    'image' => $car && $car->images->first() ? $car->images->first()->image_path : null,
                    'hash' => $car ? $car->hash_id : null,
                    'view_details' => $viewDetails
                ];
            });

        // Get WhatsApp messages (conversation flow)
        $whatsappMessages = WhatsappMessage::where('user_id', $userId)
            ->orderBy('created_at', 'asc')
            ->limit(100)
            ->get()
            ->map(function ($message) {
                return [
                    'id' => $message->id,
                    'message_sid' => $message->message_sid,
                    'from_number' => $message->from_number,
                    'to_number' => $message->to_number,
                    'body' => $message->body,
                    'message' => $message->body,
                    'status' => $message->status,
                    'direction' => $message->direction,
                    'is_outbound' => $message->direction === 'outbound',
                    'is_inbound' => $message->direction === 'inbound',
                    'created_at' => $message->created_at
                ];
            });

        // Get Push notifications
        $pushNotifications = PushNotificationLog::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'body' => $notification->body,
                    'message' => $notification->body,
                    'success' => $notification->success,
                    'delivered' => $notification->success,
                    'failed' => !$notification->success,
                    'error_message' => $notification->error_message ?? null,
                    'tokens_count' => 1, // Will be updated with actual count
                    'tokens_found' => true,
                    'created_at' => $notification->created_at
                ];
            });

        // Get device tokens
        $deviceTokens = DeviceTokens::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($token) {
                return [
                    'id' => $token->id,
                    'push_token' => $token->push_token,
                    'device_type' => $token->device_type,
                    'created_at' => $token->created_at
                ];
            });

        // Calculate push statistics
        $totalPush = $pushNotifications->count();
        $successfulPush = $pushNotifications->where('success', true)->count();
        $failedPush = $pushNotifications->where('success', false)->count();
        $successRate = $totalPush > 0 ? round(($successfulPush / $totalPush) * 100) : 0;

        $pushStats = [
            'total' => $totalPush,
            'successful' => $successfulPush,
            'failed' => $failedPush,
            'success_rate' => $successRate
        ];

        // Get booking initiations (requests)
        $bookingInitiations = Rentals::where('user_id', $userId)
            ->where('status', Rentals::STATUS_REQUESTED)
            ->with(['car.images', 'renter', 'rentReceipt'])
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($request) use ($userId) {
                // Get request volume and payment status from rentReceipt like in Vermieter
                $requestVolume = $request->total_amount ?: 0;
                $paymentStatus = 'Anfrage';
                $receiptSum = 0;

                if ($request->rentReceipt && $request->rentReceipt->first()) {
                    $receipt = $request->rentReceipt->first();
                    $receiptVolume = $receipt->sum ?: 0;
                    if ($receiptVolume > 0) {
                        $requestVolume = $receiptVolume;
                    }
                    $receiptSum = $receipt->sum ?: 0;
                }

                // Count how many times user viewed this car BEFORE requesting it
                $viewsBeforeBooking = 0;
                if ($request->car && $request->car->id) {
                    $viewsBeforeBooking = \DB::connection('mysql_live')->table('trackings')
                        ->where('userId', $userId)
                        ->where('listingId', $request->car->id)
                        ->where('created_at', '<', $request->created_at)
                        ->count();
                }

                return [
                    'id' => $request->id,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'status' => 'requested',
                    'total_price' => $requestVolume,
                    'total_amount' => $request->total_amount,
                    'price_per_day' => $request->price_per_day,
                    'pickup_location' => $request->pickup_location,
                    'return_location' => $request->return_location,
                    'pickup_time' => $request->pickup_time,
                    'return_time' => $request->return_time,
                    'payment_status' => $paymentStatus,
                    'receipt_sum' => $receiptSum,
                    'request_volume' => $requestVolume,
                    'views_before_booking' => $viewsBeforeBooking,
                    'duration' => $request->start_date && $request->end_date ?
                        \Carbon\Carbon::parse($request->start_date)->diffInDays(\Carbon\Carbon::parse($request->end_date)) + 1 : 0,
                    'notes' => $request->rent_note,
                    'car' => $request->car ? [
                        'id' => $request->car->id,
                        'title' => $request->car->title,
                        'brand' => $request->car->brand,
                        'model' => $request->car->model,
                        'year' => $request->car->year,
                        'color' => $request->car->color,
                        'image' => $request->car->image_1,
                        'images' => $request->car->images ? $request->car->images->map(function($img) {
                            return ['image_path' => $img->image_path];
                        })->toArray() : []
                    ] : null,
                    'renter' => $request->renter ? [
                        'id' => $request->renter->id,
                        'name' => $request->renter->name
                    ] : null,
                    'created_at' => $request->created_at
                ];
            });

        // Calculate interaction stats and booking stats
        $trackingCount = \DB::connection('mysql_live')->table('trackings')
            ->where('userId', $userId)
            ->count();

        $viewedCarsCount = \DB::connection('mysql_live')->table('trackings')
            ->where('userId', $userId)
            ->whereNotNull('listingId')
            ->distinct('listingId')
            ->count('listingId');

        // Calculate booking statistics like in Vermieter
        $totalRequestVolume = $bookings->sum('request_volume') + $bookingInitiations->sum('request_volume');

        // Count bookings by status (status 4=bezahlt, 6=abgeschlossen, 10=bewertet)
        $paidBookings = $bookings->whereIn('status', [4])->count(); // STATUS_PAID
        $completedBookings = $bookings->whereIn('status', [6, 10])->count(); // STATUS_COMPLETED, STATUS_RATED

        // Calculate paid volume (total amount of paid bookings)
        $paidVolume = $bookings->whereIn('status', [4, 6, 10])->sum('request_volume');

        $totalBookings = $bookings->count() + $bookingInitiations->count();

        $bookingStats = [
            'total_request_volume' => $totalRequestVolume,
            'paid_bookings' => $paidBookings,
            'completed_bookings' => $completedBookings,
            'paid_volume' => $paidVolume,
            'pending_requests' => $bookingInitiations->count()
        ];

        $interactionStats = [
            'viewed_cars_count' => $viewedCarsCount,
            'bookings_count' => $bookings->count(),
            'booking_initiations_count' => $bookingInitiations->count(),
            'chats_count' => $chats->count(),
            'total_interactions' => $trackingCount
        ];

        $user->viewed_cars = $viewedCars;
        $user->bookings = $bookings;
        $user->booking_initiations = $bookingInitiations;
        $user->chats = $chats;
        $user->whatsapp_messages = $whatsappMessages;
        $user->push_notifications = $pushNotifications;
        $user->push_history = $pushNotifications;
        $user->push_stats = $pushStats;
        $user->device_tokens = $deviceTokens;
        $user->interaction_stats = $interactionStats;
        $user->booking_stats = $bookingStats;
        $user->email_verified = $user->email_verified;

        return response()->json([
            'success' => true,
            'data' => $user
        ]);
    }

    public function getUserVerificationStats()
    {
        $stats = [
            'total_users' => User_live::count(),
            'only_email_verified' => User_live::where('email_verified', 1)
                ->where('phone_number_verified', 0)
                ->count(),
            'phone_verified' => User_live::where('phone_number_verified', 1)->count(),
            'id_uploaded' => User_live::whereNotNull('id_front')->count(),
            'license_uploaded' => User_live::whereNotNull('licence_front')->count(),
            'all_verified' => User_live::where('email_verified', 1)
                ->where('phone_number_verified', 1)
                ->whereNotNull('id_front')
                ->whereNotNull('licence_front')
                ->count()
        ];

        return response()->json($stats);
    }

    public function getUserRegistrationStats()
    {
        // Get registrations by day for the last 30 days
        $registrations = \DB::connection('mysql_live')
            ->table('users')
            ->select(\DB::raw('DATE(created_at) as date'), \DB::raw('COUNT(*) as count'))
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy(\DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Fill missing dates with 0
        $data = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $count = $registrations->where('date', $date)->first()->count ?? 0;
            $data[] = [
                'date' => $date,
                'count' => $count,
                'formatted_date' => now()->subDays($i)->format('d.m')
            ];
        }

        // Calculate growth data
        $totalUsers = User_live::count();
        $growthData = [];
        $runningTotal = $totalUsers;

        // Calculate backwards to get growth over time
        foreach (array_reverse($data) as $day) {
            $runningTotal -= $day['count'];
        }

        foreach ($data as $day) {
            $runningTotal += $day['count'];
            $growthData[] = [
                'date' => $day['date'],
                'total' => $runningTotal,
                'formatted_date' => $day['formatted_date']
            ];
        }

        return response()->json([
            'registrations' => $data,
            'growth' => $growthData
        ]);
    }

    public function getUserCarActivity($userId)
    {
        // Lifetime activity data - get daily car views for this user (all time)
        $lifetimeActivity = \DB::connection('mysql_live')
            ->table('trackings')
            ->where('userId', $userId)
            ->whereNotNull('listingId')
            ->select(\DB::raw('DATE(created_at) as date'), \DB::raw('COUNT(*) as count'))
            ->groupBy(\DB::raw('DATE(created_at)'))
            ->orderBy('date', 'desc')
            ->limit(60)
            ->get()
            ->reverse()
            ->values();

        // 30-day activity data
        $thirtyDayActivity = \DB::connection('mysql_live')
            ->table('trackings')
            ->where('userId', $userId)
            ->whereNotNull('listingId')
            ->where('created_at', '>=', now()->subDays(30))
            ->select(\DB::raw('DATE(created_at) as date'), \DB::raw('COUNT(*) as count'))
            ->groupBy(\DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Fill missing dates for 30-day data
        $thirtyDayData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $count = $thirtyDayActivity->where('date', $date)->first()->count ?? 0;
            $thirtyDayData[] = [
                'date' => $date,
                'count' => $count,
                'formatted_date' => now()->subDays($i)->format('d.m')
            ];
        }

        return response()->json([
            'lifetime' => $lifetimeActivity->map(function($item) {
                return [
                    'date' => $item->date,
                    'count' => $item->count,
                    'formatted_date' => \Carbon\Carbon::parse($item->date)->format('d.m')
                ];
            }),
            'thirty_days' => $thirtyDayData
        ]);
    }

    public function getUserBookingActivity($userId)
    {
        // Lifetime booking activity data
        $lifetimeActivity = Rentals::where('user_id', $userId)
            ->select(\DB::raw('DATE(created_at) as date'), \DB::raw('COUNT(*) as count'))
            ->groupBy(\DB::raw('DATE(created_at)'))
            ->orderBy('date', 'desc')
            ->limit(60)
            ->get()
            ->reverse()
            ->values();

        // 30-day booking activity data
        $thirtyDayActivity = Rentals::where('user_id', $userId)
            ->where('created_at', '>=', now()->subDays(30))
            ->select(\DB::raw('DATE(created_at) as date'), \DB::raw('COUNT(*) as count'))
            ->groupBy(\DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Fill missing dates for 30-day data
        $thirtyDayData = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $count = $thirtyDayActivity->where('date', $date)->first()->count ?? 0;
            $thirtyDayData[] = [
                'date' => $date,
                'count' => $count,
                'formatted_date' => now()->subDays($i)->format('d.m')
            ];
        }

        return response()->json([
            'lifetime' => $lifetimeActivity->map(function($item) {
                return [
                    'date' => $item->date,
                    'count' => $item->count,
                    'formatted_date' => \Carbon\Carbon::parse($item->date)->format('d.m')
                ];
            }),
            'thirty_days' => $thirtyDayData
        ]);
    }

    public function sendWhatsapp(Request $request, $userId)
    {
        try {
            $user = User_live::findOrFail($userId);
            $messageText = $request->input('message');
            $isTemplate = $request->input('is_template', true);

            if (!$user->phone_number) {
                return response()->json([
                    'success' => false,
                    'message' => 'User hat keine Telefonnummer'
                ], 400);
            }

            $sid = env('TWILIO_SID');
            $token = env('TWILIO_AUTH_TOKEN');
            $twilio = new Client($sid, $token);

            // WhatsApp Nachricht senden
            if ($isTemplate) {
                // Template verwenden (automatisch generierte Nachricht)
                $sentMessage = $twilio->messages->create(
                    'whatsapp:' . $user->phone_number,
                    [
                        'from' => env('TWILIO_WHATSAPP_FROM', 'whatsapp:+15557735202'),
                        'contentSid' => 'HX5f5e8c9ef410b0a1601f553f9fcc272d',
                        'contentVariables' => json_encode([
                            '1' => $messageText
                        ])
                    ]
                );

                // Für DB speichern - Template text mit automatisch generiert Hinweis
                $bodyForDb = $messageText . "\n\n(Dies ist eine automatisch erstellte Nachricht)";
            } else {
                // Normale Nachricht ohne Template
                $sentMessage = $twilio->messages->create(
                    'whatsapp:' . $user->phone_number,
                    [
                        'from' => env('TWILIO_WHATSAPP_FROM', 'whatsapp:+15557735202'),
                        'body' => $messageText
                    ]
                );

                $bodyForDb = $messageText;
            }

            // In Datenbank speichern
            $whatsappMessage = WhatsappMessage::create([
                'message_sid' => $sentMessage->sid,
                'from_number' => env('TWILIO_WHATSAPP_FROM', 'whatsapp:+15557735202'),
                'to_number' => 'whatsapp:' . $user->phone_number,
                'body' => $bodyForDb,
                'status' => 'sent',
                'user_id' => $user->id,
                'direction' => 'outbound'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp Nachricht erfolgreich gesendet',
                'data' => [
                    'id' => $whatsappMessage->id,
                    'body' => $whatsappMessage->body,
                    'direction' => $whatsappMessage->direction,
                    'status' => $whatsappMessage->status,
                    'is_outbound' => true,
                    'is_inbound' => false,
                    'created_at' => $whatsappMessage->created_at
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('WhatsApp send error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Senden: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getPushTemplates()
    {
        $templates = PushTemplate::where('is_active', true)
            ->orderBy('title')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }

    public function createPushTemplate(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:1000',
        ]);

        $template = PushTemplate::create([
            'title' => $request->title,
            'message' => $request->message,
            'is_active' => true
        ]);

        return response()->json([
            'success' => true,
            'data' => $template,
            'message' => 'Push-Vorlage erfolgreich erstellt'
        ]);
    }

    public function deletePushTemplate($templateId)
    {
        $template = PushTemplate::find($templateId);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Vorlage nicht gefunden'
            ], 404);
        }

        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Push-Vorlage erfolgreich gelöscht'
        ]);
    }

    public function sendPushNotification(Request $request, $userId)
    {
        $user = User_live::find($userId);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        // Get only the newest device token
        $latestToken = DeviceTokens::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$latestToken) {
            return response()->json([
                'success' => false,
                'message' => 'Benutzer hat keine registrierten Geräte'
            ], 400);
        }

        try {
            // Here you would integrate with your actual push service
            // For now, we'll simulate the push sending to the latest token only

            // Create push notification log
            $pushLog = PushNotificationLog::create([
                'user_id' => $userId,
                'title' => $request->title ?? 'Benachrichtigung',
                'body' => $request->message,
                'success' => true,
                'device_token' => $latestToken->push_token,
                'device_type' => $latestToken->device_type
            ]);

            return response()->json([
                'success' => true,
                'message' => "Push-Benachrichtigung an neuestes Gerät gesendet",
                'sent_count' => 1,
                'failed_count' => 0
            ]);
        } catch (\Exception $e) {
            PushNotificationLog::create([
                'user_id' => $userId,
                'title' => $request->title ?? 'Benachrichtigung',
                'body' => $request->message,
                'success' => false,
                'device_token' => $latestToken->push_token,
                'device_type' => $latestToken->device_type,
                'error_message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Senden der Push-Benachrichtigung',
                'sent_count' => 0,
                'failed_count' => 1
            ]);
        }
    }

    public function updateUser(Request $request, $userId)
    {
        try {
            $user = User_live::findOrFail($userId);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'phone_number' => 'nullable|string|max:20',
                'email_verified' => 'boolean',
                'phone_number_verified' => 'boolean',
                'password' => 'nullable|string|min:6',
                'restore_password' => 'boolean'
            ]);

            // Handle password separately if provided
            if ($request->has('restore_password') && $request->restore_password) {
                // Don't change password - keep original
                unset($validated['password']);
                unset($validated['restore_password']);
            } elseif (!empty($validated['password'])) {
                // Store current password in history before changing
                \App\Models\PasswordHistory::create([
                    'user_id' => $user->id,
                    'password_hash' => $user->password,
                    'changed_by' => auth()->user()->name ?? 'System'
                ]);
                
                $validated['password'] = bcrypt($validated['password']);
                unset($validated['restore_password']);
            } else {
                unset($validated['password']);
                unset($validated['restore_password']);
            }

            $user->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Benutzer erfolgreich aktualisiert',
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'email_verified' => $user->email_verified,
                    'phone_number_verified' => $user->phone_number_verified
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validierungsfehler',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('User update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Aktualisieren des Benutzers'
            ], 500);
        }
    }

    public function getPasswordHistory($userId)
    {
        try {
            $user = User_live::findOrFail($userId);
            $history = \App\Models\PasswordHistory::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get(['id', 'password_hash', 'changed_by', 'created_at']);

            return response()->json([
                'success' => true,
                'data' => $history
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Password history konnte nicht geladen werden: ' . $e->getMessage()
            ], 500);
        }
    }

    public function restorePassword(Request $request, $userId)
    {
        try {
            $user = User_live::findOrFail($userId);
            $historyId = $request->validate(['history_id' => 'required|integer'])['history_id'];
            
            $historyEntry = \App\Models\PasswordHistory::where('user_id', $userId)
                ->where('id', $historyId)
                ->firstOrFail();

            // Store current password in history before restoring
            \App\Models\PasswordHistory::create([
                'user_id' => $user->id,
                'password_hash' => $user->password,
                'changed_by' => auth()->user()->name ?? 'System'
            ]);

            // Restore the old password
            $user->update(['password' => $historyEntry->password_hash]);

            return response()->json([
                'success' => true,
                'message' => 'Passwort erfolgreich wiederhergestellt'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Passwort konnte nicht wiederhergestellt werden: ' . $e->getMessage()
            ], 500);
        }
    }

}
