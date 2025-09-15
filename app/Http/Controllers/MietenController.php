<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Rentals;

class MietenController extends Controller
{
    public function index()
    {
        return Inertia::render('Mieten');
    }

    public function getRentalStats()
    {
        try {
            // Lade nur Statistik-Daten für bessere Performance
            $rentals = Rentals::select(['id', 'status', 'total_amount', 'refundable_amount', 'platform_fee', 'payment_status'])
                ->get();

            // Statistiken korrekt berechnen
            $totalVolume = 0;
            $completedRevenue = 0;
            $paidPlatformFee = 0;

            foreach ($rentals as $rental) {
                // Gesamtes Anfragevolumen - alle Mieten (bevorzuge refundable_amount)
                $amount = $rental->refundable_amount ?: $rental->total_amount;
                $totalVolume += $amount;

                // Completed Revenue - nur payment_status = completed
                if ($rental->payment_status === 'completed') {
                    $completedRevenue += $amount;
                    $paidPlatformFee += $rental->platform_fee;
                }
            }

            $statistics = [
                'total_rentals' => $rentals->count(),
                'average_amount' => $rentals->count() > 0 ? $totalVolume / $rentals->count() : 0,
                'total_amount' => $totalVolume,
                'total_platform_fee' => $paidPlatformFee,
                'completed_payments_amount' => $completedRevenue
            ];

            // Status Statistiken
            $statusStats = [
                'STATUS_REQUESTED' => $rentals->where('status', Rentals::STATUS_REQUESTED)->count(),
                'STATUS_CANCELLED' => $rentals->where('status', Rentals::STATUS_CANCELLED)->count(),
                'STATUS_ACCEPTED' => $rentals->where('status', Rentals::STATUS_ACCEPTED)->count(),
                'STATUS_DECLINED' => $rentals->where('status', Rentals::STATUS_DECLINED)->count(),
                'STATUS_PAID' => $rentals->where('status', Rentals::STATUS_PAID)->count(),
                'STATUS_ACTIVE' => $rentals->where('status', Rentals::STATUS_ACTIVE)->count(),
                'STATUS_COMPLETED' => $rentals->where('status', Rentals::STATUS_COMPLETED)->count(),
                'STATUS_CANCELLED_BY_RENTER' => $rentals->where('status', Rentals::STATUS_CANCELLED_BY_RENTER)->count(),
                'STATUS_CANCELLED_BY_USER' => $rentals->where('status', Rentals::STATUS_CANCELLED_BY_USER)->count(),
                'STATUS_REFUNDED' => $rentals->where('status', Rentals::STATUS_REFUNDED)->count(),
                'STATUS_RATED' => $rentals->where('status', Rentals::STATUS_RATED)->count()
            ];

            return response()->json([
                'statistics' => $statistics,
                'status_statistics' => $statusStats
            ]);

        } catch (\Exception $e) {
            // Fallback zu Mock-Daten wenn DB-Verbindung fehlschlägt
            return response()->json([
                'statistics' => [
                    'total_rentals' => 0,
                    'average_amount' => 0,
                    'total_amount' => 0,
                    'total_platform_fee' => 0,
                    'completed_payments_amount' => 0
                ],
                'status_statistics' => [
                    'STATUS_REQUESTED' => 0,
                    'STATUS_CANCELLED' => 0,
                    'STATUS_ACCEPTED' => 0,
                    'STATUS_DECLINED' => 0,
                    'STATUS_PAID' => 0,
                    'STATUS_ACTIVE' => 0,
                    'STATUS_COMPLETED' => 0,
                    'STATUS_CANCELLED_BY_RENTER' => 0,
                    'STATUS_CANCELLED_BY_USER' => 0,
                    'STATUS_REFUNDED' => 0,
                    'STATUS_RATED' => 0
                ]
            ]);
        }
    }

    public function getRentals(Request $request)
    {
        try {
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 50);
            $search = $request->get('search', '');
            $status = $request->get('status', -1);
            $sortBy = $request->get('sort', 'date_desc');

            // Base query mit Relationships
            $query = Rentals::with([
                'user',
                'renter',
                'car.images',
                'rentReceipt',
                'rentExtras',
                'rentalRetargeting',
                'rentalPaymentRetargeting'
            ]);

            // Suchfilter anwenden
            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user', function ($userQ) use ($search) {
                        $userQ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                        ->orWhereHas('renter', function ($renterQ) use ($search) {
                            $renterQ->where('company_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('car', function ($carQ) use ($search) {
                            $carQ->where('title', 'like', "%{$search}%");
                        })
                        ->orWhere('id', 'like', "%{$search}%")
                        ->orWhere('total_amount', 'like', "%{$search}%")
                        ->orWhere('refundable_amount', 'like', "%{$search}%")
                        ->orWhere('payment_status', 'like', "%{$search}%");
                });
            }

            // Status Filter
            if ($status >= 0) {
                $query->where('status', $status);
            } elseif ($status == -2) {
                // Aktive & Abgeschlossene
                $query->whereIn('status', [Rentals::STATUS_PAID, Rentals::STATUS_ACTIVE, Rentals::STATUS_COMPLETED, Rentals::STATUS_RATED]);
            }

            // Sortierung
            switch ($sortBy) {
                case 'date_asc':
                    $query->orderBy('created_at', 'asc');
                    break;
                case 'amount_desc':
                    $query->orderByRaw('COALESCE(total_amount, refundable_amount) DESC');
                    break;
                case 'amount_asc':
                    $query->orderByRaw('COALESCE(total_amount, refundable_amount) ASC');
                    break;
                case 'status':
                    $query->orderBy('status', 'asc');
                    break;
                case 'company':
                    $query->join('renters', 'rentals.landlord_id', '=', 'renters.id')
                        ->orderBy('renters.company_name', 'asc');
                    break;
                case 'renter':
                    $query->join('users', 'rentals.user_id', '=', 'users.id')
                        ->orderBy('users.name', 'asc');
                    break;
                default: // date_desc
                    $query->orderBy('created_at', 'desc');
                    break;
            }

            // Paginierung
            $rentals = $query->paginate($perPage, ['*'], 'page', $page);

            // Gruppiere nach created_at Datum
            $rentalsByDate = $rentals->getCollection()->groupBy(function ($rental) {
                return $rental->created_at->format('Y-m-d');
            })->map(function ($rentalsForDate) {
                return $rentalsForDate->map(function ($rental) {
                    return [
                        'id' => $rental->id,
                        'status' => $rental->status,
                        'start_date' => $rental->start_date,
                        'end_date' => $rental->end_date,
                        'total_amount' => $rental->total_amount ?: $rental->refundable_amount,
                        'platform_fee' => $rental->platform_fee,
                        'refundable_amount' => $rental->refundable_amount,
                        'payment_status' => $rental->payment_status,
                        'chat_messages_count' => $this->getChatMessagesCount($rental->user_id, $rental->renter_id),
                        'censored_messages_count' => $this->getCensoredMessagesCount($rental->user_id, $rental->renter_id),
                        'user' => $rental->user ? [
                            'id' => $rental->user->id,
                            'name' => $rental->user->name,
                            'email' => $rental->user->email
                        ] : null,
                        'renter' => $rental->renter ? [
                            'id' => $rental->renter->id,
                            'company_name' => $rental->renter->company_name
                        ] : null,
                        'car' => $rental->car ? [
                            'id' => $rental->car->id,
                            'title' => $rental->car->title,
                            'brand' => $rental->car->brand,
                            'model' => $rental->car->model,
                            'brand_info' => $rental->car->brand ? \App\Models\Brands::find($rental->car->brand) : null,
                            'images' => $rental->car->images->map(function ($image) {
                                return ['image_path' => $image->image_path];
                            })->toArray()
                        ] : null
                    ];
                })->toArray();
            })->toArray();

            return response()->json([
                'rentals' => $rentalsByDate,
                'pagination' => [
                    'current_page' => $rentals->currentPage(),
                    'per_page' => $rentals->perPage(),
                    'total' => $rentals->total(),
                    'last_page' => $rentals->lastPage(),
                    'from' => $rentals->firstItem(),
                    'to' => $rentals->lastItem()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'rentals' => [],
                'pagination' => [
                    'current_page' => 1,
                    'per_page' => 50,
                    'total' => 0,
                    'last_page' => 1,
                    'from' => 0,
                    'to' => 0
                ]
            ], 500);
        }
    }

    public function show($id)
    {
        try {
            $rental = Rentals::with([
                'user',
                'renter.user', // Load renter's user data for email/phone
                'car.images',
                'rentReceipt',
                'rentExtras',
                'rentHistory',
                'rentRating'
            ])->find($id);

            if (!$rental) {
                return response()->json(['error' => 'Rental not found'], 404);
            }

            // Load brand information if car exists
            if ($rental->car && $rental->car->brand) {
                $brand = \App\Models\Brands::find($rental->car->brand);
                if ($brand) {
                    $rental->car->brand_info = [
                        'id' => $brand->id,
                        'brandName' => $brand->brandName,
                        'iconName' => $brand->iconName
                    ];
                }
            }

            // Load additional user information if user exists (exactly like UserController)
            if ($rental->user) {
                $userId = $rental->user->id;

                // Load User_live data for additional user information
                $userLive = \App\Models\User_live::find($userId);

                // Calculate interaction stats exactly like in UserController
                $trackingCount = \DB::connection('mysql_live')->table('trackings')
                    ->where('userId', $userId)
                    ->count();

                $viewedCarsCount = \DB::connection('mysql_live')->table('trackings')
                    ->where('userId', $userId)
                    ->whereNotNull('listingId')
                    ->distinct('listingId')
                    ->count('listingId');

                // Get viewed cars from tracking data exactly like UserController
                $viewedCars = \DB::connection('mysql_live')->table('trackings')
                    ->where('userId', $userId)
                    ->whereNotNull('listingId')
                    ->select('listingId', \DB::raw('COUNT(*) as view_count'), \DB::raw('MAX(created_at) as last_viewed'))
                    ->groupBy('listingId')
                    ->orderBy('view_count', 'desc')
                    ->limit(10) // Only top 10 for the mieten view
                    ->get()
                    ->map(function ($tracking) use ($userId) {
                        $car = \App\Models\Cars::with('images')->find($tracking->listingId);

                        return [
                            'id' => $tracking->listingId,
                            'view_count' => $tracking->view_count,
                            'last_viewed' => $tracking->last_viewed,
                            'title' => $car ? $car->title : 'Auto nicht verfügbar',
                            'brand' => $car ? $car->brand : null,
                            'image' => $car && $car->images->first() ? $car->images->first()->image_path : null,
                            'hash' => $car ? $car->hash_id : null
                        ];
                    })->toArray();

                // Get all user bookings (all status) exactly like UserController bookings
                $allBookings = \App\Models\Rentals::with(['car.images', 'renter', 'rentReceipt'])
                    ->where('user_id', $userId)
                    ->where('id', '!=', $rental->id) // Exclude current rental
                    ->orderBy('created_at', 'desc')
                    ->limit(20)
                    ->get()
                    ->map(function ($booking) use ($userId) {
                        // Get request volume and payment status from rentReceipt like in UserController
                        $requestVolume = $booking->total_amount ?: 0;
                        $paymentStatus = 'Ausstehend';

                        if ($booking->rentReceipt && $booking->rentReceipt->first()) {
                            $receipt = $booking->rentReceipt->first();
                            $receiptVolume = $receipt->sum ?: 0;
                            if ($receiptVolume > 0) {
                                $requestVolume = $receiptVolume;
                            }

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

                        return [
                            'id' => $booking->id,
                            'status' => $booking->status,
                            'car_title' => $booking->car->title ?? 'Unbekanntes Auto',
                            'total_amount' => $requestVolume,
                            'payment_status' => $paymentStatus,
                            'created_at' => $booking->created_at
                        ];
                    })->toArray();

                // Add stats to user object
                $rental->user->viewed_cars_count = $viewedCarsCount;
                $rental->user->bookings_count = \App\Models\Rentals::where('user_id', $userId)->count() ?? 0;
                $rental->user->viewed_cars = $viewedCars;
                $rental->user->all_bookings = $allBookings;

                // Add interaction stats like in UserController
                $rental->user->interaction_stats = [
                    'viewed_cars_count' => $viewedCarsCount,
                    'bookings_count' => $rental->user->bookings_count,
                    'total_interactions' => $trackingCount
                ];

                // Add User_live data for profile image, verification status, and documents
                if ($userLive) {
                    $rental->user->profile_image = $userLive->profile_image;
                    $rental->user->email_verified = $userLive->email_verified;
                    $rental->user->phone_number_verified = $userLive->phone_number_verified;
                    $rental->user->licence_front = $userLive->licence_front;
                    $rental->user->licence_back = $userLive->licence_back;
                    $rental->user->id_front = $userLive->id_front;
                    $rental->user->id_back = $userLive->id_back;

                    // Get last login from tracking data (latest tracking entry)
                    $lastTracking = \DB::connection('mysql_live')->table('trackings')
                        ->where('userId', $userId)
                        ->orderBy('created_at', 'desc')
                        ->first();

                    $rental->user->last_login = $lastTracking ? $lastTracking->created_at : null;
                }
            }

            // Add landlord/renter statistics
            if ($rental->renter) {
                $renterId = $rental->renter->id;

                // Load renter user live data for profile image if available
                if ($rental->renter->user && $rental->renter->user->id) {
                    $renterUserLive = \App\Models\User_live::find($rental->renter->user->id);
                    if ($renterUserLive && $renterUserLive->profile_image) {
                        $rental->renter->user->profile_image = $renterUserLive->profile_image;
                    }
                }

                // Get all rentals for this renter
                $renterRentals = \App\Models\Rentals::where('renter_id', $renterId)->get();

                // Calculate statistics
                $totalRentals = $renterRentals->count();
                $completedRentals = $renterRentals->whereIn('status', [\App\Models\Rentals::STATUS_COMPLETED, \App\Models\Rentals::STATUS_RATED])->count();
                $activeRentals = $renterRentals->whereIn('status', [\App\Models\Rentals::STATUS_PAID, \App\Models\Rentals::STATUS_ACTIVE])->count();
                $acceptedRentals = $renterRentals->whereIn('status', [\App\Models\Rentals::STATUS_ACCEPTED, \App\Models\Rentals::STATUS_PAID, \App\Models\Rentals::STATUS_ACTIVE, \App\Models\Rentals::STATUS_COMPLETED, \App\Models\Rentals::STATUS_RATED])->count();
                $requestedRentals = $renterRentals->where('status', \App\Models\Rentals::STATUS_REQUESTED)->count();

                // Calculate revenue from completed rentals
                $totalRevenue = 0;
                foreach ($renterRentals as $lr) {
                    if (in_array($lr->status, [\App\Models\Rentals::STATUS_COMPLETED, \App\Models\Rentals::STATUS_RATED])) {
                        $totalRevenue += $lr->total_amount ?: $lr->refundable_amount ?: 0;
                    }
                }

                // Calculate rates
                $acceptanceRate = $requestedRentals > 0 ? ($acceptedRentals / ($requestedRentals + $acceptedRentals)) * 100 : 0;
                $completionRate = $acceptedRentals > 0 ? ($completedRentals / $acceptedRentals) * 100 : 0;

                // Add statistics to renter object
                $rental->renter->statistics = [
                    'total_rentals' => $totalRentals,
                    'completed_rentals' => $completedRentals,
                    'active_rentals' => $activeRentals,
                    'total_revenue' => $totalRevenue,
                    'acceptance_rate' => round($acceptanceRate, 1),
                    'completion_rate' => round($completionRate, 1)
                ];

                // Add all rentals for this renter (for the list) - Load with user relation
                $renterRentalsWithUser = \App\Models\Rentals::with('user')
                    ->where('renter_id', $renterId)
                    ->orderBy('created_at', 'desc')
                    ->take(10)
                    ->get();

                $rental->renter->all_rentals = $renterRentalsWithUser->map(function ($lr) {
                    return [
                        'id' => $lr->id,
                        'status' => $lr->status,
                        'total_amount' => $lr->total_amount ?: $lr->refundable_amount,
                        'created_at' => $lr->created_at,
                        'user_name' => $lr->user ? $lr->user->name : 'Unbekannt'
                    ];
                })->toArray();
            }

            return response()->json($rental);
        } catch (\Exception $e) {
            \Log::error('MietenController show error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, $id)
    {
        try {
            $rental = Rentals::find($id);

            if (!$rental) {
                return response()->json(['error' => 'Rental not found'], 404);
            }

            $newStatus = $request->input('status');

            // Validiere Status
            if (!in_array($newStatus, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])) {
                return response()->json(['error' => 'Invalid status'], 400);
            }

            $rental->status = $newStatus;
            $rental->save();

            return response()->json(['message' => 'Status successfully updated', 'rental' => $rental]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $rental = Rentals::find($id);

            if (!$rental) {
                return response()->json(['error' => 'Rental not found'], 404);
            }

            // Lösche zugehörige rent-invoice (RentReceipt)
            $rental->rentReceipt()->delete();

            // Lösche zugehörige Daten
            $rental->rentHistory()->delete();
            $rental->rentRating()->delete();
            $rental->rentExtras()->delete();
            $rental->rentalRetargeting()->delete();
            $rental->rentalPaymentRetargeting()->delete();
            $rental->stripeFees()->delete();

            // Lösche die Miete selbst
            $rental->delete();

            return response()->json(['message' => 'Rental successfully deleted']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    public function getRentalChat($id)
    {
        try {
            $rental = Rentals::with(['user', 'renter'])->find($id);

            if (!$rental) {
                return response()->json(['error' => 'Rental not found'], 404);
            }

            // Find chat between the rental's user and renter
            $chat = \App\Models\Chat::where('user_id', $rental->user_id)
                ->where('renter_id', $rental->renter_id)
                ->with([
                    'messages' => function ($query) {
                        $query->with(['sender', 'violations'])->orderBy('created_at', 'asc');
                    },
                    'user',
                    'renter.user'
                ])
                ->first();

            if (!$chat) {
                return response()->json([
                    'chat' => null,
                    'messages' => [],
                    'message' => 'Kein Chat zwischen diesem Mieter und Vermieter gefunden.'
                ]);
            }

            return response()->json([
                'chat' => $chat,
                'messages' => $chat->messages,
                'participants' => [
                    'user' => $chat->user,
                    'renter' => $chat->renter
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    // License Image API endpoint
    public function getLicenseImage($userId, $type)
    {
        try {
            $userLive = \App\Models\User_live::find($userId);

            if (!$userLive) {
                return response()->json(['error' => 'User not found'], 404);
            }

            $imageField = $type === 'front' ? 'licence_front' : 'licence_back';
            $imagePath = $userLive->$imageField;

            if (!$imagePath) {
                return response()->json(['error' => 'Image not found'], 404);
            }

            // Return the full URL for the license image
            $url = 'https://drivable.app/storage/' . $imagePath;

            return response()->json(['url' => $url]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    // ID Image API endpoint
    public function getIdImage($userId, $type)
    {
        try {
            $userLive = \App\Models\User_live::find($userId);

            if (!$userLive) {
                return response()->json(['error' => 'User not found'], 404);
            }

            $imageField = $type === 'front' ? 'id_front' : 'id_back';
            $imagePath = $userLive->$imageField;

            if (!$imagePath) {
                return response()->json(['error' => 'Image not found'], 404);
            }

            // Return the full URL for the ID image
            $url = 'https://drivable.app/storage/' . $imagePath;

            return response()->json(['url' => $url]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    // Censor Message endpoint (using correct models)
    public function censorMessage(Request $request, $messageId)
    {
        try {
            $message = \App\Models\Message::find($messageId);

            if (!$message) {
                return response()->json(['error' => 'Message not found'], 404);
            }

            // Create violation record using ContactViolation model
            $violation = \App\Models\ContactViolation::create([
                'message_id' => $messageId,
                'chat_id' => $message->chat_id,
                'user_id' => $message->sender_id,
                'violation_type' => $request->input('violation_type', 'manual_review'),
                'original_content' => $message->content,
                'filtered_content' => 'Diese Nachricht wurde zensiert.',
                'reviewed' => true
            ]);

            // Update message content to censored version
            $message->update([
                'content' => 'Diese Nachricht wurde zensiert.'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Nachricht wurde erfolgreich zensiert'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    // Uncensor Message endpoint (using correct models)
    public function uncensorMessage($messageId)
    {
        try {
            $message = \App\Models\Message::with('violations')->find($messageId);

            if (!$message) {
                return response()->json(['error' => 'Message not found'], 404);
            }

            // Find the violation record
            $violation = $message->violations->first();

            if (!$violation) {
                return response()->json(['error' => 'No active censorship found'], 404);
            }

            // Restore original content
            $message->update([
                'content' => $violation->original_content
            ]);

            // Delete the violation record
            $violation->delete();

            return response()->json([
                'success' => true,
                'message' => 'Nachricht wurde erfolgreich entzensiert'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    // Update rental dates
    public function update(Request $request, $id)
    {
        try {
            $rental = Rentals::findOrFail($id);

            $validatedData = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after:start_date',
                'start_time' => 'nullable|date_format:H:i',
                'end_time' => 'nullable|date_format:H:i'
            ]);

            $updateData = [
                'start_date' => $validatedData['start_date'],
                'end_date' => $validatedData['end_date']
            ];

            // Add times if provided
            if (isset($validatedData['start_time'])) {
                $updateData['start_time'] = $validatedData['start_time'];
            }
            
            if (isset($validatedData['end_time'])) {
                $updateData['end_time'] = $validatedData['end_time'];
            }

            $rental->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Mietzeitraum erfolgreich aktualisiert',
                'rental' => $rental
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Aktualisieren: ' . $e->getMessage()
            ], 500);
        }
    }

    // Helper method to get chat messages count
    private function getChatMessagesCount($userId, $renterId)
    {
        try {
            $chat = \App\Models\Chat::where('user_id', $userId)
                                  ->where('renter_id', $renterId)
                                  ->first();
            
            return $chat ? $chat->messages()->count() : 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    // Helper method to get censored messages count
    private function getCensoredMessagesCount($userId, $renterId)
    {
        try {
            $chat = \App\Models\Chat::where('user_id', $userId)
                                  ->where('renter_id', $renterId)
                                  ->first();
            
            if (!$chat) return 0;
            
            return \App\Models\ContactViolation::where('chat_id', $chat->id)->count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}
