<?php

namespace App\Http\Controllers;

use App\Models\Renter;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VermieterController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $tab = $request->get('tab', 'verified'); // Default: verifiziert
        $sortBy = $request->get('sort', 'newest'); // Default: neueste zuerst

        // Log page access
        $currentUser = auth()->user();
        if ($currentUser) {
            \App\Models\ActivityLog::log(
                'accessed',
                'Vermieter-Seite',
                null,
                'Vermieter-Übersicht',
                "Vermieter-Seite wurde von {$currentUser->name} aufgerufen" .
                ($search ? " (Suche: '{$search}')" : '') .
                " (Tab: {$tab})"
            );
        }

        try {
            $query = Renter::with(['user', 'cars.images'])->withCount('rentals');

            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('company_name', 'LIKE', '%' . $search . '%')
                      ->orWhereHas('user', function($userQuery) use ($search) {
                          $userQuery->where('name', 'LIKE', '%' . $search . '%')
                                    ->orWhere('email', 'LIKE', '%' . $search . '%');
                      });
                });
            }

            // Filter nach Verifizierungsstatus
            if ($tab === 'verified') {
                $query->where('verified', 1);
            } elseif ($tab === 'stripe_verified') {
                // Stripe verifiziert aber nicht CRM verifiziert
                $query->where('verified', 0)
                      ->where('stripe_enabled', 1)
                      ->whereNotNull('stripe_account_id')
                      ->where('stripe_account_id', '!=', '');
            } else {
                // Unverified - alle nicht vollständig verifizierten (inkl. Stripe-verifizierte)
                $query->where('verified', 0);
            }

            // Stripe-verifizierte immer zuerst, wenn im unverified Tab
            if ($tab === 'unverified' || $tab === null) {
                $query->orderByRaw('
                    CASE
                        WHEN verified = 0 AND stripe_enabled = 1 AND stripe_account_id IS NOT NULL AND stripe_account_id != "" THEN 0
                        ELSE 1
                    END
                ');
            }

            // Sortierung anwenden
            switch ($sortBy) {
                case 'newest':
                    $query->orderByDesc('created_at');
                    break;
                case 'oldest':
                    $query->orderBy('created_at', 'asc');
                    break;
                case 'most_rentals':
                    // Nach Anzahl Mieten sortieren (inklusive aller Status)
                    $query->withCount('rentals')
                          ->orderByDesc('rentals_count')
                          ->orderByDesc('created_at'); // Fallback bei gleicher Anzahl
                    break;
                case 'most_revenue':
                    // Nach Gesamtumsatz sortieren (nur abgeschlossene Mieten)
                    $query->withSum(['rentals as total_revenue' => function($query) {
                        $query->where('status', \App\Models\Rentals::STATUS_COMPLETED);
                    }], 'total_amount')
                    ->orderByDesc('total_revenue')
                    ->orderByDesc('created_at'); // Fallback bei gleichem Umsatz
                    break;
                case 'most_active':
                    // Nach aktuell aktiven Mieten sortieren
                    $query->withCount(['rentals as active_rentals_count' => function($query) {
                        $query->where('status', \App\Models\Rentals::STATUS_ACTIVE);
                    }])
                    ->orderByDesc('active_rentals_count')
                    ->orderByDesc('created_at'); // Fallback
                    break;
                case 'most_cars':
                    // Nach Anzahl Autos sortieren (nur aktive, nicht gelöschte)
                    $query->withCount(['cars as active_cars_count' => function($query) {
                        $query->where(function($q) {
                            $q->where('deleted', '!=', 1)
                              ->orWhereNull('deleted');
                        });
                    }])
                    ->orderByDesc('active_cars_count')
                    ->orderByDesc('created_at'); // Fallback bei gleicher Anzahl
                    break;
                case 'alphabetical':
                    // Nach Firmenname oder User-Name alphabetisch
                    $query->orderByRaw('COALESCE(company_name, (SELECT name FROM users WHERE users.id = renters.user_id)) ASC');
                    break;
                default:
                    $query->orderByDesc('created_at');
                    break;
            }

            $vermieter = $query->paginate(30)->appends($request->query());

            // Debug: Log rental counts for verification
            if ($sortBy === 'most_rentals' && $vermieter->count() > 0) {
                \Log::info('Rental counts for sorting verification:', [
                    'sort_by' => $sortBy,
                    'sample_renters' => $vermieter->take(3)->map(function($renter) {
                        return [
                            'id' => $renter->id,
                            'name' => $renter->company_name ?: $renter->user?->name,
                            'rentals_count' => $renter->rentals_count ?? 0
                        ];
                    })
                ]);
            }

            // Zähler für Tabs
            $verifiedCount = Renter::where('verified', 1)->count();
            $stripeVerifiedCount = Renter::where('verified', 0)
                ->where('stripe_enabled', 1)
                ->whereNotNull('stripe_account_id')
                ->where('stripe_account_id', '!=', '')
                ->count();
            $unverifiedCount = Renter::where('verified', 0)
                ->where(function($q) {
                    $q->where('stripe_enabled', '!=', 1)
                      ->orWhereNull('stripe_account_id')
                      ->orWhere('stripe_account_id', '');
                })->count();

            // Alle Statistiken berechnen
            $stats = $this->calculateStatistics();

            // Cross-Tab Suche (wenn search vorhanden)
            $crossTabResults = null;
            if ($search) {
                $crossTabResults = [];

                // Check other tabs for search results
                $otherTabs = [];
                if ($tab !== 'verified') $otherTabs['verified'] = 'Verifizierten';
                if ($tab !== 'stripe_verified') $otherTabs['stripe_verified'] = 'Stripe-Verifizierten';
                if ($tab !== 'unverified') $otherTabs['unverified'] = 'Nicht-Verifizierten';

                foreach ($otherTabs as $tabKey => $tabLabel) {
                    $query = Renter::with(['user'])
                        ->where(function($q) use ($search) {
                            $q->where('company_name', 'LIKE', '%' . $search . '%')
                              ->orWhereHas('user', function($userQuery) use ($search) {
                                  $userQuery->where('name', 'LIKE', '%' . $search . '%')
                                            ->orWhere('email', 'LIKE', '%' . $search . '%');
                              });
                        });

                    if ($tabKey === 'verified') {
                        $query->where('verified', 1);
                    } elseif ($tabKey === 'stripe_verified') {
                        $query->where('verified', 0)
                              ->where('stripe_enabled', 1)
                              ->whereNotNull('stripe_account_id')
                              ->where('stripe_account_id', '!=', '');
                    } else {
                        // Unverified - alle nicht vollständig verifizierten (inkl. Stripe-verifizierte)
                        $query->where('verified', 0);
                    }

                    $count = $query->count();
                    if ($count > 0) {
                        $crossTabResults[] = [
                            'count' => $count,
                            'tab' => $tabKey,
                            'tabLabel' => $tabLabel
                        ];
                    }
                }

                if (empty($crossTabResults)) {
                    $crossTabResults = null;
                }
            }

            return Inertia::render('Vermieter', [
                'vermieter' => $vermieter,
                'search' => $search,
                'currentTab' => $tab,
                'currentSort' => $sortBy,
                'verifiedCount' => $verifiedCount,
                'stripeVerifiedCount' => $stripeVerifiedCount,
                'unverifiedCount' => $unverifiedCount,
                'statistics' => $stats,
                'crossTabResults' => $crossTabResults
            ]);
        } catch (\Exception $e) {
            // Fallback bei DB-Verbindungsproblemen
            return Inertia::render('Vermieter', [
                'vermieter' => (object)[
                    'data' => [],
                    'last_page' => 1,
                    'from' => 0,
                    'to' => 0,
                    'total' => 0,
                    'links' => []
                ],
                'search' => $search,
                'currentTab' => $tab,
                'currentSort' => $sortBy,
                'verifiedCount' => 0,
                'stripeVerifiedCount' => 0,
                'unverifiedCount' => 0,
                'statistics' => [
                    'renters' => ['verified' => 0, 'unverified' => 0, 'total' => 0],
                    'cars' => ['verified' => 0, 'total' => 0, 'unverified' => 0, 'deleted' => 0],
                    'averagePrices' => ['monday_thursday' => 0, 'friday_sunday' => 0, 'weekend' => 0, 'weekly' => 0, 'total_average' => 0],
                    'topBrands' => []
                ],
                'crossTabResults' => null,
                'error' => 'Fehler beim Laden der Vermieter: ' . $e->getMessage()
            ]);
        }
    }

    public function show(Renter $renter)
    {
        $renter->load(['user', 'cars.images']);

        // Statistiken hinzufügen
        $stats = [
            'total_rentals' => \App\Models\Rentals::where('renter_id', $renter->id)->count(),
            'completed_rentals' => \App\Models\Rentals::where('renter_id', $renter->id)->where('status', 6)->count(),
            'active_rentals' => \App\Models\Rentals::where('renter_id', $renter->id)->where('status', 5)->count(),
            'pending_requests' => \App\Models\Rentals::where('renter_id', $renter->id)->where('status', 0)->count(),
            'total_revenue' => \App\Models\Rentals::where('renter_id', $renter->id)
                ->where('status', 6)
                ->sum('total_amount') ?? 0.0,
        ];

        // Engine Types und Brands für Dropdowns laden
        $engineTypes = \App\Models\EngineTypes::all();
        $brands = \App\Models\Brands::all();

        // Mieten des Vermieters laden mit erweiterten Daten
        $rentals = \App\Models\Rentals::with(['car.images', 'user', 'rentReceipt'])
            ->where('renter_id', $renter->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($rental) {
                // Get request volume and payment status from multiple sources
                $requestVolume = $rental->total_amount ?: 0; // Fallback auf total_amount
                $paymentStatus = 'Ausstehend';
                $receiptSum = 0;

                // First, check rent_receipt for detailed status
                if ($rental->rentReceipt && $rental->rentReceipt->first()) {
                    $receipt = $rental->rentReceipt->first();
                    $receiptVolume = $receipt->sum ?: 0; // Das echte Anfragevolumen aus rent_receipt!
                    if ($receiptVolume > 0) {
                        $requestVolume = $receiptVolume; // Verwende rent_receipt Wert wenn vorhanden
                    }
                    $receiptSum = $receipt->sum ?: 0;

                    // Determine payment status based on receipt status
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

                // If no rent_receipt or status is still pending, check Stripe and rental status
                if ($paymentStatus === 'Ausstehend') {
                    // Check Stripe payment status
                    if ($rental->payment_status === 'succeeded' || $rental->payment_status === 'paid') {
                        $paymentStatus = 'Bezahlt';
                    } elseif ($rental->payment_status === 'requires_payment_method' || $rental->payment_status === 'requires_action') {
                        $paymentStatus = 'Fehlgeschlagen';
                    } elseif ($rental->payment_status === 'processing') {
                        $paymentStatus = 'In Bearbeitung';
                    }

                    // Also check rental status for additional context
                    if ($rental->status == \App\Models\Rentals::STATUS_PAID ||
                        $rental->status == \App\Models\Rentals::STATUS_ACTIVE ||
                        $rental->status == \App\Models\Rentals::STATUS_COMPLETED) {
                        $paymentStatus = 'Bezahlt';
                    }
                }

                // Add computed fields to rental data
                $rental->request_volume = $requestVolume;
                $rental->payment_status = $paymentStatus;
                $rental->receipt_sum = $receiptSum;

                return $rental;
            });

        // Rental Status Statistiken
        $rentalStats = [
            'total' => $rentals->count(),
            'requested' => $rentals->where('status', \App\Models\Rentals::STATUS_REQUESTED)->count(),
            'accepted' => $rentals->where('status', \App\Models\Rentals::STATUS_ACCEPTED)->count(),
            'paid' => $rentals->where('status', \App\Models\Rentals::STATUS_PAID)->count(),
            'active' => $rentals->where('status', \App\Models\Rentals::STATUS_ACTIVE)->count(),
            'completed' => $rentals->where('status', \App\Models\Rentals::STATUS_COMPLETED)->count(),
            'cancelled' => $rentals->whereIn('status', [
                \App\Models\Rentals::STATUS_CANCELLED,
                \App\Models\Rentals::STATUS_DECLINED,
                \App\Models\Rentals::STATUS_CANCELLED_BY_RENTER,
                \App\Models\Rentals::STATUS_CANCELLED_BY_USER
            ])->count(),
        ];

        // Chart-Daten für Rental-Verlauf erstellen
        $chartData = $this->generateRentalChartData($renter->id);

        // Chat-Daten laden
        $chats = \App\Models\Chat::with(['user', 'messages' => function($query) {
            $query->with(['sender', 'violations'])->orderBy('created_at', 'desc');
        }, 'latestMessage.sender'])
        ->where('renter_id', $renter->id)
        ->withCount(['messages', 'messages as censored_messages_count' => function($q) {
            $q->whereHas('violations');
        }])
        ->orderBy('updated_at', 'desc')
        ->get();

        // Chat-Statistiken berechnen
        $chatStats = [
            'total_chats' => $chats->count(),
            'total_messages' => $chats->sum('messages_count'),
            'total_censored_messages' => $chats->sum('censored_messages_count'),
            'chats_with_violations' => $chats->where('censored_messages_count', '>', 0)->count(),
            'active_chats' => $chats->where('updated_at', '>=', now()->subDays(7))->count(),
            'recent_violations' => \App\Models\ContactViolation::whereIn('message_id',
                \App\Models\Message::whereIn('chat_id', $chats->pluck('id'))
                    ->where('created_at', '>=', now()->subDays(1))
                    ->pluck('id')
            )->count()
        ];

        // Log the view action
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'viewed',
            'Vermieter',
            $renter->id,
            $renter->company_name ?: $renter->user->name,
            "Vermieter-Details von {$renter->company_name} wurden von {$currentUser->name} angezeigt"
        );

        return response()->json([
            'renter' => $renter,
            'stats' => $stats,
            'engineTypes' => $engineTypes,
            'brands' => $brands,
            'rentals' => $rentals,
            'rentalStats' => $rentalStats,
            'chartData' => $chartData,
            'chats' => $chats,
            'chatStats' => $chatStats
        ]);
    }

    public function update(Request $request, Renter $renter)
    {
        $validated = $request->validate([
            'company_name' => 'nullable|string|max:255',
            'company_address_street' => 'nullable|string|max:255',
            'company_address_city' => 'nullable|string|max:255',
            'company_address_postcode' => 'nullable|string|max:255',
            'longitude' => 'nullable|numeric',
            'latitude' => 'nullable|numeric',
            'companyDescription' => 'nullable|string',
            'renterType' => 'nullable|integer',
            'stripe_account_id' => 'nullable|string|max:255',
            'allowCash' => 'boolean',
            'allowDigitalPayment' => 'boolean',
            'isSmallBusinessOwner' => 'boolean',
            'strikes' => 'nullable|integer|min:0|max:3',
            'blockPayouts' => 'boolean',
            'note' => 'nullable|string',
            'message' => 'nullable|string|max:500'
        ]);

        // Ensure message is never null - set to empty string if null
        if (array_key_exists('message', $validated) && is_null($validated['message'])) {
            $validated['message'] = '';
        }

        $oldValues = $renter->getOriginal();
        $renter->update($validated);
        $newValues = $renter->fresh()->toArray();

        // Log the update
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'updated',
            'Vermieter',
            $renter->id,
            $renter->company_name ?: $renter->user->name,
            "Vermieter {$renter->company_name} wurde von {$currentUser->name} aktualisiert",
            $oldValues,
            $newValues
        );

        return response()->json([
            'message' => 'Vermieter erfolgreich aktualisiert',
            'renter' => $renter->fresh()
        ]);
    }

    public function verify(Renter $renter)
    {
        // Prüfen ob Vermieter verifiziert werden kann
        if (!$renter->stripe_account_id || !$renter->stripe_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Vermieter kann nicht verifiziert werden. Stripe Account ID muss gesetzt und Stripe aktiviert sein.'
            ], 422);
        }

        $renter->update([
            'verified' => 1
        ]);

        // Log the verification
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'verified',
            'Vermieter',
            $renter->id,
            $renter->company_name ?: $renter->user->name,
            "Vermieter {$renter->company_name} wurde von {$currentUser->name} verifiziert"
        );

        return response()->json([
            'success' => true,
            'message' => 'Vermieter wurde erfolgreich verifiziert!',
            'renter' => $renter->fresh()
        ]);
    }

    public function unverify(Renter $renter)
    {
        $renter->update([
            'verified' => 0
        ]);

        // Log the unverification
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'unverified',
            'Vermieter',
            $renter->id,
            $renter->company_name ?: $renter->user->name,
            "Vermieter {$renter->company_name} wurde von {$currentUser->name} entverifiziert"
        );

        return response()->json([
            'success' => true,
            'message' => 'Vermieter wurde entverifiziert!',
            'renter' => $renter->fresh()
        ]);
    }

    public function canVerify(Renter $renter)
    {
        $canVerify = !empty($renter->stripe_account_id) && $renter->stripe_enabled == 1;

        return response()->json([
            'canVerify' => $canVerify,
            'hasStripeAccount' => !empty($renter->stripe_account_id),
            'stripeEnabled' => $renter->stripe_enabled == 1
        ]);
    }

    private function calculateStatistics()
    {
        try {
            // Vermieter Statistiken
            $verifiedRenters = Renter::where('verified', 1)->count();
            $unverifiedRenters = Renter::where('verified', 0)->count();

            // Fahrzeug Statistiken - mit try-catch für DB-Probleme
            try {
                // Nur nicht-gelöschte Autos berücksichtigen (deleted != 1)
                $activeCarsQuery = \App\Models\Cars::where(function($query) {
                    $query->where('deleted', '!=', 1)
                          ->orWhereNull('deleted');
                });

                $verifiedCars = $activeCarsQuery->clone()->whereHas('renter', function($query) {
                    $query->where('verified', 1);
                })->count();

                $totalActiveCars = $activeCarsQuery->count();
                $deletedCars = \App\Models\Cars::where('deleted', 1)->count();

                // Durchschnittspreise berechnen - alle Preistypen
                $avgPrices = [
                    'monday_thursday' => $activeCarsQuery->clone()->whereNotNull('dailyRentMoThu')->avg('dailyRentMoThu'),
                    'friday_sunday' => $activeCarsQuery->clone()->whereNotNull('dailyRentFriSun')->avg('dailyRentFriSun'),
                    'weekend' => $activeCarsQuery->clone()->whereNotNull('weekendRent')->avg('weekendRent'),
                    'weekly' => $activeCarsQuery->clone()->whereNotNull('weeklyRent')->avg('weeklyRent'),
                    'total_average' => $activeCarsQuery->clone()->where(function($q) {
                        $q->whereNotNull('dailyRentMoThu')
                          ->orWhereNotNull('dailyRentFriSun')
                          ->orWhereNotNull('weekendRent')
                          ->orWhereNotNull('weeklyRent');
                    })->selectRaw('AVG(COALESCE(dailyRentMoThu, 0) + COALESCE(dailyRentFriSun, 0) + COALESCE(weekendRent, 0) + COALESCE(weeklyRent, 0))/4')->value('AVG(COALESCE(dailyRentMoThu, 0) + COALESCE(dailyRentFriSun, 0) + COALESCE(weekendRent, 0) + COALESCE(weeklyRent, 0))/4')
                ];

                // Top Marken (mit Anzahl) - nur aktive Autos, joined mit brands table
                $topBrands = \App\Models\Cars::where(function($query) {
                        $query->where('deleted', '!=', 1)
                              ->orWhereNull('deleted');
                    })
                    ->join('brands', 'cars.brand', '=', 'brands.id')
                    ->select('brands.brandName as brand', 'brands.iconName', \DB::raw('count(*) as count'))
                    ->whereNotNull('cars.brand')
                    ->where('cars.brand', '!=', '')
                    ->groupBy('brands.brandName', 'brands.iconName')
                    ->orderBy('count', 'desc')
                    ->limit(20)
                    ->get()
                    ->toArray();

            } catch (\Exception $e) {
                // Fallback für Car-Statistiken
                $verifiedCars = 0;
                $totalActiveCars = 0;
                $deletedCars = 0;
                $avgPrices = [
                    'monday_thursday' => 0,
                    'friday_sunday' => 0,
                    'weekend' => 0,
                    'weekly' => 0,
                    'total_average' => 0
                ];
                $topBrands = [];
            }

            return [
                'renters' => [
                    'verified' => $verifiedRenters,
                    'unverified' => $unverifiedRenters,
                    'total' => $verifiedRenters + $unverifiedRenters
                ],
                'cars' => [
                    'verified' => $verifiedCars,
                    'total' => $totalActiveCars,
                    'unverified' => $totalActiveCars - $verifiedCars,
                    'deleted' => $deletedCars
                ],
                'averagePrices' => $avgPrices,
                'topBrands' => $topBrands
            ];

        } catch (\Exception $e) {
            // Vollständiger Fallback
            return [
                'renters' => ['verified' => 0, 'unverified' => 0, 'total' => 0],
                'cars' => ['verified' => 0, 'total' => 0, 'unverified' => 0, 'deleted' => 0],
                'averagePrices' => ['monday_thursday' => 0, 'friday_sunday' => 0, 'weekend' => 0, 'weekly' => 0, 'total_average' => 0],
                'topBrands' => []
            ];
        }
    }

    public function updateCar(Request $request, \App\Models\Cars $car)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'brand' => 'nullable|integer',
            'model' => 'nullable|string|max:255',
            'year' => 'nullable|integer|min:1900|max:2030',
            'fuelType' => 'nullable|integer|in:1,2,3,4',
            'gearType' => 'nullable|string|in:Manuell,Automatik',
            'engineType' => 'nullable|integer',
            'description' => 'nullable|string',
            'dailyRentMoThu' => 'nullable|numeric|min:0',
            'dailyRentFriSun' => 'nullable|numeric|min:0',
            'weekendRent' => 'nullable|numeric|min:0',
            'weeklyRent' => 'nullable|numeric|min:0',
            'hourRent' => 'nullable|numeric|min:0',
            'depositAmount' => 'nullable|numeric|min:0',
        ]);

        // Custom validation for brand and engineType gegen mysql_live connection
        if (!empty($validated['brand'])) {
            $brandExists = \App\Models\Brands::find($validated['brand']);
            if (!$brandExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ungültige Marke ausgewählt'
                ], 422);
            }
        }

        if (!empty($validated['engineType'])) {
            $engineExists = \App\Models\EngineTypes::find($validated['engineType']);
            if (!$engineExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ungültiger Motortyp ausgewählt'
                ], 422);
            }
        }

        $oldValues = $car->getOriginal();
        $car->update($validated);
        $newValues = $car->fresh()->toArray();

        // Log the car update
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'updated',
            'Auto',
            $car->id,
            $car->title ?: "{$car->brand} {$car->model}",
            "Auto {$car->title} wurde von {$currentUser->name} bearbeitet",
            $oldValues,
            $newValues
        );

        return response()->json([
            'success' => true,
            'message' => 'Auto erfolgreich gespeichert',
            'car' => $car->fresh(['images'])
        ]);
    }

    public function deleteCarImage(\App\Models\Cars $car, \App\Models\CarsImages $image)
    {
        // Prüfen ob das Bild zu diesem Auto gehört
        if ($image->car_id !== $car->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bild gehört nicht zu diesem Auto'
            ], 403);
        }

        $deletedPosition = $image->image_position;
        $imagePath = $image->image_path;

        // Bild löschen
        $image->delete();

        // Alle nachfolgenden Bilder um eine Position nach vorne rücken
        \App\Models\CarsImages::where('car_id', $car->id)
            ->where('image_position', '>', $deletedPosition)
            ->decrement('image_position');

        // Log the image deletion
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'deleted',
            'Auto-Bild',
            $car->id,
            $car->title ?: "{$car->brand} {$car->model}",
            "Bild Position {$deletedPosition} von Auto {$car->title} wurde von {$currentUser->name} gelöscht"
        );

        // Aktualisierte Bilder zurückgeben
        $updatedCar = $car->fresh(['images']);

        return response()->json([
            'success' => true,
            'message' => 'Bild erfolgreich gelöscht',
            'car' => $updatedCar
        ]);
    }

    public function softDeleteCar(\App\Models\Cars $car)
    {
        $car->update(['deleted' => 1]);

        // Log the soft deletion
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'soft_deleted',
            'Auto',
            $car->id,
            $car->title ?: "{$car->brand} {$car->model}",
            "Auto {$car->title} wurde von {$currentUser->name} gelöscht (Soft Delete)"
        );

        return response()->json([
            'success' => true,
            'message' => 'Auto wurde erfolgreich gelöscht',
            'car' => $car->fresh(['images'])
        ]);
    }

    public function restoreCar(\App\Models\Cars $car)
    {
        $car->update(['deleted' => 0]);

        // Log the restoration
        $currentUser = auth()->user();
        \App\Models\ActivityLog::log(
            'restored',
            'Auto',
            $car->id,
            $car->title ?: "{$car->brand} {$car->model}",
            "Auto {$car->title} wurde von {$currentUser->name} wiederhergestellt"
        );

        return response()->json([
            'success' => true,
            'message' => 'Auto wurde erfolgreich wiederhergestellt',
            'car' => $car->fresh(['images'])
        ]);
    }

    public function refreshRentals(Request $request, Renter $renter)
    {
        // Get filter parameters
        $statusFilter = $request->get('status');
        $paymentFilter = $request->get('payment');
        $search = $request->get('search');

        // Build query with filters
        $query = \App\Models\Rentals::with(['car.images', 'user', 'rentReceipt'])
            ->where('renter_id', $renter->id);

        // Apply status filter
        if ($statusFilter && $statusFilter !== 'all') {
            switch ($statusFilter) {
                case 'active':
                    $query->where('status', \App\Models\Rentals::STATUS_ACTIVE);
                    break;
                case 'completed':
                    $query->where('status', \App\Models\Rentals::STATUS_COMPLETED);
                    break;
                case 'requested':
                    $query->where('status', \App\Models\Rentals::STATUS_REQUESTED);
                    break;
                case 'cancelled':
                    $query->whereIn('status', [
                        \App\Models\Rentals::STATUS_CANCELLED,
                        \App\Models\Rentals::STATUS_DECLINED,
                        \App\Models\Rentals::STATUS_CANCELLED_BY_RENTER,
                        \App\Models\Rentals::STATUS_CANCELLED_BY_USER
                    ]);
                    break;
            }
        }

        // Apply search filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->whereHas('car', function($carQuery) use ($search) {
                    $carQuery->where('title', 'LIKE', '%' . $search . '%')
                             ->orWhere('model', 'LIKE', '%' . $search . '%');
                })
                ->orWhereHas('user', function($userQuery) use ($search) {
                    $userQuery->where('name', 'LIKE', '%' . $search . '%')
                              ->orWhere('email', 'LIKE', '%' . $search . '%');
                });
            });
        }

        $rentals = $query->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($rental) {
                // Get request volume and payment status from multiple sources
                $requestVolume = $rental->total_amount ?: 0; // Fallback auf total_amount
                $paymentStatus = 'Ausstehend';
                $receiptSum = 0;

                // First, check rent_receipt for detailed status
                if ($rental->rentReceipt && $rental->rentReceipt->first()) {
                    $receipt = $rental->rentReceipt->first();
                    $receiptVolume = $receipt->sum ?: 0; // Das echte Anfragevolumen aus rent_receipt!
                    if ($receiptVolume > 0) {
                        $requestVolume = $receiptVolume; // Verwende rent_receipt Wert wenn vorhanden
                    }
                    $receiptSum = $receipt->sum ?: 0;

                    // Determine payment status based on receipt status
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

                // If no rent_receipt or status is still pending, check Stripe and rental status
                if ($paymentStatus === 'Ausstehend') {
                    // Check Stripe payment status
                    if ($rental->payment_status === 'succeeded' || $rental->payment_status === 'paid') {
                        $paymentStatus = 'Bezahlt';
                    } elseif ($rental->payment_status === 'requires_payment_method' || $rental->payment_status === 'requires_action') {
                        $paymentStatus = 'Fehlgeschlagen';
                    } elseif ($rental->payment_status === 'processing') {
                        $paymentStatus = 'In Bearbeitung';
                    }

                    // Also check rental status for additional context
                    if ($rental->status == \App\Models\Rentals::STATUS_PAID ||
                        $rental->status == \App\Models\Rentals::STATUS_ACTIVE ||
                        $rental->status == \App\Models\Rentals::STATUS_COMPLETED) {
                        $paymentStatus = 'Bezahlt';
                    }
                }

                // Add computed fields to rental data
                $rental->request_volume = $requestVolume;
                $rental->payment_status = $paymentStatus;
                $rental->receipt_sum = $receiptSum;

                return $rental;
            });

        // Apply payment filter after data processing
        if ($paymentFilter && $paymentFilter !== 'all') {
            $rentals = $rentals->filter(function ($rental) use ($paymentFilter) {
                switch ($paymentFilter) {
                    case 'paid':
                        return $rental->payment_status === 'Bezahlt';
                    case 'pending':
                        return $rental->payment_status === 'Ausstehend';
                    case 'partial':
                        return $rental->payment_status === 'Teilweise bezahlt';
                    default:
                        return true;
                }
            });
        }

        return response()->json([
            'rentals' => $rentals->values() // Reset array keys after filtering
        ]);
    }

    private function generateRentalChartData($renterId)
    {
        // Get rentals from the last 12 months
        $startDate = now()->subMonths(11)->startOfMonth();
        $endDate = now()->endOfMonth();

        $rentals = \App\Models\Rentals::where('renter_id', $renterId)
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->get();

        // Initialize data arrays for the last 12 months
        $months = [];
        $requestData = [];
        $completedData = [];
        $revenueData = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthLabel = $date->format('M Y');

            $months[] = $monthLabel;

            // Count requests for this month
            $monthlyRequests = $rentals->filter(function($rental) use ($date) {
                return $rental->created_at->format('Y-m') === $date->format('Y-m');
            })->count();

            // Count completed rentals for this month
            $monthlyCompleted = $rentals->filter(function($rental) use ($date) {
                return $rental->created_at->format('Y-m') === $date->format('Y-m')
                    && $rental->status == \App\Models\Rentals::STATUS_COMPLETED;
            })->count();

            // Calculate revenue for this month (from completed rentals)
            $monthlyRevenue = $rentals->filter(function($rental) use ($date) {
                return $rental->created_at->format('Y-m') === $date->format('Y-m')
                    && $rental->status == \App\Models\Rentals::STATUS_COMPLETED;
            })->sum('total_amount') ?: 0;

            $requestData[] = $monthlyRequests;
            $completedData[] = $monthlyCompleted;
            $revenueData[] = round($monthlyRevenue, 2);
        }

        return [
            'months' => $months,
            'requests' => $requestData,
            'completed' => $completedData,
            'revenue' => $revenueData
        ];
    }

    public function uncensorMessage(\App\Models\Message $message)
    {
        try {
            // Find the violation for this message
            $violation = \App\Models\ContactViolation::where('message_id', $message->id)->first();

            if (!$violation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keine Zensur-Verletzung für diese Nachricht gefunden'
                ], 404);
            }

            // Store original content for logging
            $originalContent = $violation->original_content;

            // Restore original content
            $message->update([
                'content' => $originalContent
            ]);

            // DELETE the violation completely (not just mark as reviewed)
            $violation->delete();

            // Log the action
            $currentUser = auth()->user();
            \App\Models\ActivityLog::log(
                'uncensored',
                'Message',
                $message->id,
                "Nachricht in Chat {$message->chat_id}",
                "Nachricht wurde von {$currentUser->name} entzensiert und Violation gelöscht. Original: {$originalContent}"
            );

            return response()->json([
                'success' => true,
                'message' => 'Nachricht wurde erfolgreich entzensiert und freigegeben',
                'updated_message' => $message->fresh(['sender', 'violations'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Entzensieren: ' . $e->getMessage()
            ], 500);
        }
    }

    public function censorMessage(\App\Models\Message $message, Request $request)
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
            \App\Models\ContactViolation::updateOrCreate(
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

    public function summarizeChats(Request $request, Renter $renter)
    {
        try {
            // Alle Vermieter-Daten für komplette Analyse laden
            $renter->load(['user', 'cars.images']);

            // Rental-Daten laden
            $rentals = \App\Models\Rentals::with(['user', 'car'])
                ->where('renter_id', $renter->id)
                ->orderBy('created_at', 'desc')
                ->get();

            // Chat-Daten laden
            $chats = \App\Models\Chat::with(['user', 'messages' => function($query) {
                $query->with(['sender', 'violations'])->orderBy('created_at', 'asc');
            }])
            ->where('renter_id', $renter->id)
            ->get();

            // Vermieter-Basisdaten sammeln
            $vermieterData = [
                'basic_info' => [
                    'company_name' => $renter->company_name ?? $renter->user->name,
                    'email' => $renter->user->email,
                    'verified' => $renter->verified ? 'Ja' : 'Nein',
                    'stripe_enabled' => $renter->stripe_enabled ? 'Ja' : 'Nein',
                    'member_since' => $renter->created_at->format('Y-m-d'),
                    'address' => trim(($renter->company_address_street ?? '') . ' ' .
                               ($renter->company_address_postcode ?? '') . ' ' .
                               ($renter->company_address_city ?? '')),
                    'phone' => $renter->company_phone ?? 'Nicht angegeben'
                ],
                'cars' => [
                    'total_cars' => $renter->cars->count(),
                    'active_cars' => $renter->cars->where('deleted', '!=', 1)->count(),
                    'deleted_cars' => $renter->cars->where('deleted', 1)->count(),
                    'car_analysis' => $this->analyzeAllCars($renter->cars)
                ],
                'rentals' => [
                    'total_rentals' => $rentals->count(),
                    'completed_rentals' => $rentals->where('status', \App\Models\Rentals::STATUS_COMPLETED)->count(),
                    'active_rentals' => $rentals->where('status', \App\Models\Rentals::STATUS_ACTIVE)->count(),
                    'cancelled_rentals' => $rentals->whereIn('status', [
                        \App\Models\Rentals::STATUS_CANCELLED_BY_RENTER,
                        \App\Models\Rentals::STATUS_CANCELLED_BY_USER
                    ])->count(),
                    'pending_requests' => $rentals->where('status', \App\Models\Rentals::STATUS_REQUESTED)->count(),
                    'total_revenue' => $rentals->where('status', \App\Models\Rentals::STATUS_COMPLETED)->sum('total_price'),
                    'rental_analysis' => $this->analyzeAllRentals($rentals)
                ],
                'chats' => []
            ];

            // Intelligente Chat-Zusammenfassung (ALLE Daten berücksichtigt)
            $chatSummary = $this->createChatSummary($chats);
            $vermieterData['chat_analysis'] = $chatSummary;

            // OpenAI API für komplette Vermieter-Analyse aufrufen
            $openaiResponse = $this->callOpenAIForFullAnalysis($vermieterData, $renter);

            return response()->json([
                'success' => true,
                'summary' => $openaiResponse,
                'total_chats' => $chats->count(),
                'total_rentals' => $rentals->count(),
                'total_cars' => $renter->cars->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen der Zusammenfassung: ' . $e->getMessage()
            ], 500);
        }
    }

    private function callOpenAI($chatData, $renter)
    {
        $apiKey = config('app.openai_api_key');

        if (!$apiKey) {
            throw new \Exception('OpenAI API Key nicht konfiguriert. Bitte OPENAI_API_KEY in .env setzen.');
        }

        $companyName = $renter->company_name ?: $renter->user->name;

        $prompt = "Analysiere die folgenden Chat-Konversationen für den Vermieter '{$companyName}' und erstelle eine detaillierte Zusammenfassung auf Deutsch.

Fokussiere dich auf:
1. Häufige Probleme und Beschwerden
2. Kommunikationsmuster zwischen Vermieter und Mietern
3. Zensierte Nachrichten und deren Gründe
4. Verbesserungsvorschläge für die Kundenbeziehung
5. Auffällige Verhaltensweisen oder wiederkehrende Themen

Chat-Daten: " . json_encode($chatData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $data = [
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Du bist ein Experte für Kundenservice-Analyse und Chat-Auswertung. Antworte auf Deutsch und strukturiere deine Antwort klar und professionell.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'max_tokens' => 2000,
            'temperature' => 0.7
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \Exception('OpenAI API Fehler: HTTP ' . $httpCode . ' - ' . $response);
        }

        $result = json_decode($response, true);

        if (!$result || !isset($result['choices'][0]['message']['content'])) {
            throw new \Exception('Ungültige Antwort von OpenAI API');
        }

        return $result['choices'][0]['message']['content'];
    }

    private function callOpenAIForFullAnalysis($vermieterData, $renter)
    {
        $apiKey = config('app.openai_api_key');

        if (!$apiKey) {
            throw new \Exception('OpenAI API Key nicht konfiguriert. Bitte OPENAI_API_KEY in .env setzen.');
        }

        $companyName = $renter->company_name ?: $renter->user->name;

        $prompt = "Analysiere den folgenden Autovermieter '{$companyName}' auf Basis aller verfügbaren Daten und erstelle eine detaillierte Charakteranalyse auf Deutsch.

FOKUSSIERE DICH AUF:

🏢 **VERMIETER-CHARAKTER & PERSÖNLICHKEIT:**
- Wie professionell/seriös ist dieser Vermieter?
- Welche Persönlichkeit zeigt er in der Kommunikation?
- Ist er kundenorientiert oder eher schwierig?
- Verhaltensauffälligkeiten oder Besonderheiten

🚗 **GESCHÄFTSVERHALTEN:**
- Wie gut pflegt er seine Fahrzeuge? (Anzahl Bilder, Beschreibungen)
- Welche Art von Autos vermietet er? (Luxus vs. Budget)
- Preisgestaltung - fair oder überteuert?
- Geschäftsmodell und Strategie erkennbar?

💬 **KOMMUNIKATIONSSTIL:**
- Wie kommuniziert er mit Mietern?
- Konflikte oder Probleme in Chats?
- Reaktionsgeschwindigkeit und Hilfsbereitschaft
- Gibt es wiederkehrende Kommunikationsprobleme?

📊 **MIET-VERHALTEN:**
- Nimmt er Buchungen schnell an oder zögerlich?
- Wie viele Stornierungen vs. erfolgreiche Mieten?
- Problematische Muster bei Buchungsannahmen?
- Bevorzugte Kundentypen erkennbar?

⚠️ **PROBLEME & RISIKEN:**
- Welche konkreten Probleme hat dieser Vermieter?
- Rote Flaggen in der Kommunikation?
- Verbesserungsmöglichkeiten
- Risiko für die Plattform?

🎯 **EMPFEHLUNGEN:**
- Soll man diesem Vermieter vertrauen?
- Konkrete Handlungsempfehlungen
- Support-Bedarf oder Überwachung nötig?

VERMIETER-DATEN: " . json_encode($vermieterData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $data = [
            'model' => 'gpt-4-turbo-preview',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Du bist ein Experte für Vermieter-Analysen und Charakterbewertungen. Du analysierst Autovermieter basierend auf ihrem Geschäftsverhalten, ihrer Kommunikation und ihren Daten. Antworte auf Deutsch und sei ehrlich - auch bei negativen Einschätzungen. Strukturiere deine Antwort klar mit Emojis und Überschriften.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ],
            'max_tokens' => 2000,
            'temperature' => 0.6
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \Exception('OpenAI API Fehler: HTTP ' . $httpCode . ' - ' . $response);
        }

        $result = json_decode($response, true);

        if (!$result || !isset($result['choices'][0]['message']['content'])) {
            throw new \Exception('Ungültige Antwort von OpenAI API');
        }

        return $result['choices'][0]['message']['content'];
    }

    private function createChatSummary($chats)
    {
        if ($chats->isEmpty()) {
            return [
                'total_chats' => 0,
                'summary' => 'Keine Chats vorhanden',
                'communication_patterns' => 'Keine Kommunikationsdaten verfügbar'
            ];
        }

        $totalMessages = 0;
        $totalCensored = 0;
        $vermieterMessages = 0;
        $userMessages = 0;
        $communicationPatterns = [];
        $problems = [];
        $topicAnalysis = [];
        $responseTimeAnalysis = [];

        foreach ($chats as $chat) {
            $chatMessages = $chat->messages;
            $totalMessages += $chatMessages->count();

            foreach ($chatMessages as $message) {
                // Zensierte Nachrichten zählen
                if ($message->violations->count() > 0) {
                    $totalCensored++;
                    foreach ($message->violations as $violation) {
                        $problems[] = [
                            'type' => $violation->violation_type,
                            'reason' => $violation->reason,
                            'user' => $chat->user->name ?? 'Unbekannt'
                        ];
                    }
                }

                // Message-Autor analysieren
                if ($message->sender_id === $chat->user_id) {
                    $userMessages++;
                } else {
                    $vermieterMessages++;
                }

                // Inhaltliche Analyse (Keywords)
                $content = strtolower($message->content);
                if (str_contains($content, 'preis') || str_contains($content, 'kosten')) {
                    $topicAnalysis['pricing'] = ($topicAnalysis['pricing'] ?? 0) + 1;
                }
                if (str_contains($content, 'stornierung') || str_contains($content, 'absage')) {
                    $topicAnalysis['cancellation'] = ($topicAnalysis['cancellation'] ?? 0) + 1;
                }
                if (str_contains($content, 'problem') || str_contains($content, 'defekt')) {
                    $topicAnalysis['problems'] = ($topicAnalysis['problems'] ?? 0) + 1;
                }
                if (str_contains($content, 'danke') || str_contains($content, 'super')) {
                    $topicAnalysis['positive'] = ($topicAnalysis['positive'] ?? 0) + 1;
                }
            }
        }

        // Kommunikationsstil bewerten
        $responseRatio = $vermieterMessages > 0 ? round($userMessages / $vermieterMessages, 2) : 0;
        $censorshipRate = $totalMessages > 0 ? round(($totalCensored / $totalMessages) * 100, 1) : 0;

        return [
            'total_chats' => $chats->count(),
            'total_messages' => $totalMessages,
            'vermieter_messages' => $vermieterMessages,
            'user_messages' => $userMessages,
            'response_ratio' => $responseRatio,
            'censored_messages' => $totalCensored,
            'censorship_rate' => $censorshipRate,
            'problem_types' => array_count_values(array_column($problems, 'type')),
            'topic_analysis' => $topicAnalysis,
            'communication_assessment' => [
                'responsiveness' => $responseRatio < 2 ? 'Sehr responsiv' : ($responseRatio < 5 ? 'Moderat responsiv' : 'Wenig responsiv'),
                'problem_rate' => $censorshipRate < 5 ? 'Niedrig' : ($censorshipRate < 15 ? 'Moderat' : 'Hoch'),
                'conversation_initiator' => $userMessages > $vermieterMessages ? 'Meist User' : 'Ausgewogen'
            ],
            'recent_issues' => array_slice($problems, -5), // Letzte 5 Probleme
            'sample_interactions' => $this->getSampleInteractions($chats) // Beispiel-Gespräche
        ];
    }

    private function getSampleInteractions($chats)
    {
        $samples = [];

        foreach ($chats->take(3) as $chat) {
            $conversation = [];
            foreach ($chat->messages->take(4) as $message) {
                $conversation[] = [
                    'from' => $message->sender_id === $chat->user_id ? 'User' : 'Vermieter',
                    'message' => strlen($message->content) > 100 ? substr($message->content, 0, 100) . '...' : $message->content,
                    'censored' => $message->violations->count() > 0
                ];
            }

            if (!empty($conversation)) {
                $samples[] = [
                    'user' => $chat->user->name ?? 'Unbekannt',
                    'conversation' => $conversation
                ];
            }
        }

        return $samples;
    }

    private function analyzeAllCars($cars)
    {
        if ($cars->isEmpty()) {
            return ['summary' => 'Keine Fahrzeuge vorhanden'];
        }

        $brandAnalysis = [];
        $priceAnalysis = [];
        $yearAnalysis = [];
        $imageQuality = [];

        foreach ($cars as $car) {
            $brand = \App\Models\Brands::find($car->brand);
            $brandName = $brand->brandName ?? 'Unbekannt';
            $brandAnalysis[$brandName] = ($brandAnalysis[$brandName] ?? 0) + 1;

            $priceRange = $car->price_per_day < 50 ? 'Budget' :
                         ($car->price_per_day < 100 ? 'Mittel' : 'Premium');
            $priceAnalysis[$priceRange] = ($priceAnalysis[$priceRange] ?? 0) + 1;

            $ageCategory = $car->year >= 2020 ? 'Sehr neu' :
                          ($car->year >= 2015 ? 'Modern' : 'Älter');
            $yearAnalysis[$ageCategory] = ($yearAnalysis[$ageCategory] ?? 0) + 1;

            $imageQuality[] = [
                'car' => $car->title,
                'image_count' => $car->images->count(),
                'quality_rating' => $car->images->count() >= 5 ? 'Gut' :
                                   ($car->images->count() >= 3 ? 'Okay' : 'Schlecht')
            ];
        }

        return [
            'brand_diversity' => array_keys($brandAnalysis),
            'most_common_brand' => !empty($brandAnalysis) ? array_keys($brandAnalysis, max($brandAnalysis))[0] : 'Keine',
            'price_segments' => $priceAnalysis,
            'age_distribution' => $yearAnalysis,
            'average_price' => round($cars->avg('price_per_day'), 2),
            'image_quality_assessment' => [
                'well_documented' => count(array_filter($imageQuality, fn($item) => $item['quality_rating'] === 'Gut')),
                'poorly_documented' => count(array_filter($imageQuality, fn($item) => $item['quality_rating'] === 'Schlecht')),
                'avg_images_per_car' => round($cars->avg(fn($car) => $car->images->count()), 1)
            ],
            'business_strategy' => $this->assessBusinessStrategy($priceAnalysis, $brandAnalysis, $cars)
        ];
    }

    private function analyzeAllRentals($rentals)
    {
        if ($rentals->isEmpty()) {
            return ['summary' => 'Keine Mieten vorhanden'];
        }

        $statusAnalysis = [];
        $monthlyTrends = [];
        $customerPatterns = [];
        $problemPatterns = [];

        foreach ($rentals as $rental) {
            $statusAnalysis[$rental->status] = ($statusAnalysis[$rental->status] ?? 0) + 1;

            $month = $rental->created_at->format('Y-m');
            $monthlyTrends[$month] = ($monthlyTrends[$month] ?? 0) + 1;

            $customerName = $rental->user->name ?? 'Unbekannt';
            $customerPatterns[$customerName] = ($customerPatterns[$customerName] ?? 0) + 1;

            if (in_array($rental->status, [\App\Models\Rentals::STATUS_CANCELLED_BY_RENTER, \App\Models\Rentals::STATUS_CANCELLED_BY_USER])) {
                $problemPatterns[] = [
                    'customer' => $customerName,
                    'reason' => 'Cancellation',
                    'date' => $rental->created_at->format('Y-m-d')
                ];
            }
        }

        $successRate = round(($statusAnalysis[\App\Models\Rentals::STATUS_COMPLETED] ?? 0) / $rentals->count() * 100, 1);
        $cancellationRate = round((($statusAnalysis[\App\Models\Rentals::STATUS_CANCELLED_BY_RENTER] ?? 0) +
                                  ($statusAnalysis[\App\Models\Rentals::STATUS_CANCELLED_BY_USER] ?? 0)) / $rentals->count() * 100, 1);

        return [
            'success_rate' => $successRate,
            'cancellation_rate' => $cancellationRate,
            'response_to_requests' => $this->calculateResponsePattern($rentals),
            'customer_loyalty' => array_filter($customerPatterns, fn($count) => $count > 1),
            'seasonal_patterns' => $this->analyzeSeasonality($monthlyTrends),
            'problem_indicators' => [
                'frequent_cancellations' => $cancellationRate > 20,
                'low_completion_rate' => $successRate < 70,
                'recent_problems' => array_slice($problemPatterns, -3)
            ],
            'revenue_patterns' => [
                'avg_rental_value' => round($rentals->where('status', \App\Models\Rentals::STATUS_COMPLETED)->avg('total_price'), 2),
                'monthly_revenue_trend' => $this->calculateRevenueTrend($rentals)
            ]
        ];
    }

    private function assessBusinessStrategy($priceAnalysis, $brandAnalysis, $cars)
    {
        $strategy = [];

        if (($priceAnalysis['Premium'] ?? 0) > ($priceAnalysis['Budget'] ?? 0)) {
            $strategy[] = 'Fokus auf Luxus-/Premium-Segment';
        } else {
            $strategy[] = 'Fokus auf Budget-/Massenmarkt';
        }

        if (count($brandAnalysis) > 5) {
            $strategy[] = 'Diversifizierte Marken-Portfolio';
        } else {
            $strategy[] = 'Spezialisierung auf wenige Marken';
        }

        return implode(', ', $strategy);
    }

    private function calculateResponsePattern($rentals)
    {
        $pending = $rentals->where('status', \App\Models\Rentals::STATUS_REQUESTED)->count();
        $total = $rentals->count();

        if ($pending > ($total * 0.3)) {
            return 'Langsame Reaktion auf Anfragen';
        } elseif ($pending > ($total * 0.1)) {
            return 'Moderate Reaktionsgeschwindigkeit';
        } else {
            return 'Schnelle Reaktion auf Anfragen';
        }
    }

    private function analyzeSeasonality($monthlyTrends)
    {
        if (empty($monthlyTrends)) return 'Keine Daten';

        $maxMonth = array_keys($monthlyTrends, max($monthlyTrends))[0];
        $minMonth = array_keys($monthlyTrends, min($monthlyTrends))[0];

        return "Beste Saison: $maxMonth, Schwächste: $minMonth";
    }

    private function calculateRevenueTrend($rentals)
    {
        $completed = $rentals->where('status', \App\Models\Rentals::STATUS_COMPLETED);

        if ($completed->count() < 2) return 'Zu wenig Daten';

        $recent = $completed->where('created_at', '>=', now()->subMonths(3))->avg('total_price');
        $older = $completed->where('created_at', '<', now()->subMonths(3))->avg('total_price');

        if ($recent > $older * 1.1) {
            return 'Steigende Umsätze';
        } elseif ($recent < $older * 0.9) {
            return 'Fallende Umsätze';
        } else {
            return 'Stabile Umsätze';
        }
    }

    /**
     * Get Stripe dashboard data for a Vermieter
     */
    public function getStripeDashboard(Request $request, Renter $renter)
    {
        try {
            if (!$renter->stripe_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Stripe-Konto mit diesem Vermieter verbunden.'
                ], 400);
            }

            $stripe = new \Stripe\StripeClient(config('app.stripe_secret_key'));

            // Get account information
            $account = $stripe->accounts->retrieve($renter->stripe_account_id);

            // Get balance
            $balance = $stripe->balance->retrieve([], ['stripe_account' => $renter->stripe_account_id]);

            // Get all transactions (no date limit)
            $transactions = $stripe->balanceTransactions->all([
                'limit' => 100
            ], ['stripe_account' => $renter->stripe_account_id]);

            // Get all payouts
            $payouts = $stripe->payouts->all([
                'limit' => 100
            ], ['stripe_account' => $renter->stripe_account_id]);

            // Get existing payment links (with error handling)
            $paymentLinks = null;
            try {
                // Get all payment links (active and inactive) to show history
                $paymentLinks = $stripe->paymentLinks->all([
                    'limit' => 50
                    // Remove 'active' filter to get all links
                ], ['stripe_account' => $renter->stripe_account_id]);
            } catch (\Exception $e) {
                // Log error but continue without payment links
                error_log("Stripe Payment Links API error: " . $e->getMessage());
            }

            // Calculate total available balance in euros
            $availableBalance = 0;
            foreach ($balance->available as $available) {
                if ($available->currency === 'eur') {
                    $availableBalance = $available->amount / 100; // Convert from cents
                    break;
                }
            }

            // Calculate pending balance in euros
            $pendingBalance = 0;
            foreach ($balance->pending as $pending) {
                if ($pending->currency === 'eur') {
                    $pendingBalance += $pending->amount / 100; // Convert from cents
                }
            }

            // Format transaction data
            $formattedTransactions = [];
            foreach ($transactions->data as $transaction) {
                $formattedTransactions[] = [
                    'id' => $transaction->id,
                    'amount' => $transaction->amount / 100, // Convert from cents
                    'currency' => strtoupper($transaction->currency),
                    'type' => $transaction->type,
                    'description' => $transaction->description,
                    'status' => $transaction->status,
                    'created' => date('d.m.Y H:i', $transaction->created),
                    'fee' => $transaction->fee / 100 // Convert from cents
                ];
            }

            // Format payout data
            $formattedPayouts = [];
            foreach ($payouts->data as $payout) {
                $formattedPayouts[] = [
                    'id' => $payout->id,
                    'amount' => $payout->amount / 100, // Convert from cents
                    'currency' => strtoupper($payout->currency),
                    'status' => $payout->status,
                    'arrival_date' => $payout->arrival_date ? date('d.m.Y', $payout->arrival_date) : null,
                    'created' => date('d.m.Y H:i', $payout->created)
                ];
            }

            // Get payment links from our database (with admin notes)
            $dbPaymentLinks = \App\Models\PaymentLink::where('renter_id', $renter->id)
                ->orderBy('created_at', 'desc')
                ->get();

            // Format payment links data (combine DB and Stripe data)
            $formattedPaymentLinks = [];
            foreach ($dbPaymentLinks as $dbLink) {
                $formattedPaymentLinks[] = [
                    'id' => $dbLink->stripe_payment_link_id,
                    'db_id' => $dbLink->id,
                    'url' => $dbLink->stripe_url,
                    'active' => $dbLink->active,
                    'created' => $dbLink->created_at->format('d.m.Y H:i'),
                    'amount' => $dbLink->amount,
                    'currency' => $dbLink->currency,
                    'description' => $dbLink->description,
                    'admin_note' => $dbLink->admin_note,
                    'email_sent' => $dbLink->email_sent,
                    'email_sent_at' => $dbLink->email_sent_at?->format('d.m.Y H:i'),
                    'created_by' => $dbLink->created_by,
                    'metadata' => $dbLink->stripe_metadata
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'account_id' => $account->id,
                    'account_type' => $account->type,
                    'country' => $account->country,
                    'default_currency' => $account->default_currency,
                    'details_submitted' => $account->details_submitted,
                    'charges_enabled' => $account->charges_enabled,
                    'payouts_enabled' => $account->payouts_enabled,
                    'available_balance' => $availableBalance,
                    'pending_balance' => $pendingBalance,
                    'total_balance' => $availableBalance + $pendingBalance,
                    'transactions' => $formattedTransactions,
                    'payouts' => $formattedPayouts,
                    'payment_links' => $formattedPaymentLinks
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Stripe-Daten: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create Stripe Express Dashboard link for the renter
     */
    public function createDashboardLink(Request $request, Renter $renter)
    {
        try {
            if (!$renter->stripe_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Stripe-Konto mit diesem Vermieter verbunden.'
                ], 400);
            }

            $stripe = new \Stripe\StripeClient(config('app.stripe_secret_key'));

            // Create Express Dashboard link
            $dashboardLink = $stripe->accounts->createLoginLink($renter->stripe_account_id);

            // Log the dashboard link creation
            $currentUser = auth()->user();
            if ($currentUser) {
                \App\Models\ActivityLog::log(
                    'accessed',
                    'Stripe Dashboard',
                    $renter->id,
                    'Stripe-Dashboard',
                    "Express Dashboard Link für {$renter->company_name} erstellt"
                );
            }

            return response()->json([
                'success' => true,
                'dashboard_url' => $dashboardLink->url,
                'message' => 'Dashboard-Link erfolgreich erstellt'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen des Dashboard-Links: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Request bank transfer for negative balance
     */
    public function requestBankTransfer(Request $request, Renter $renter)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'reason' => 'string|max:255'
            ]);

            if (!$renter->stripe_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Stripe-Konto mit diesem Vermieter verbunden.'
                ], 400);
            }

            $amount = $request->amount;
            $reason = $request->reason ?: 'Negative balance adjustment';

            // Log the transfer request
            $currentUser = auth()->user();
            if ($currentUser) {
                \App\Models\ActivityLog::log(
                    'requested',
                    'Bank Transfer',
                    $renter->id,
                    'Stripe-Dashboard',
                    "Überweisungsanfrage über €{$amount} für {$renter->company_name} erstellt - Grund: {$reason}"
                );
            }

            // Create admin notification (you can implement this later)
            // \App\Models\AdminNotification::create([...]);

            // Send email to vermieter (you can implement this later)
            // Mail::to($renter->user->email)->send(new BankTransferRequest($renter, $amount));

            return response()->json([
                'success' => true,
                'message' => 'Überweisungsanfrage wurde erstellt und Admin-Team benachrichtigt'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen der Überweisungsanfrage: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manual balance adjustment for admin
     */
    public function manualBalanceAdjustment(Request $request, Renter $renter)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric',
                'reason' => 'required|string|max:255'
            ]);

            if (!$renter->stripe_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Stripe-Konto mit diesem Vermieter verbunden.'
                ], 400);
            }

            $amount = $request->amount;
            $reason = $request->reason;
            $amountInCents = intval($amount * 100);

            $stripe = new \Stripe\StripeClient(config('app.stripe_secret_key'));

            if ($amount > 0) {
                // Create a positive adjustment (credit)
                $transfer = $stripe->transfers->create([
                    'amount' => $amountInCents,
                    'currency' => 'eur',
                    'destination' => $renter->stripe_account_id,
                    'description' => "Manual balance adjustment: {$reason}"
                ]);
                $actionType = 'credited';
            } else {
                // For negative adjustments, we would need to reverse/charge
                // This is more complex and might require different handling
                return response()->json([
                    'success' => false,
                    'message' => 'Negative Anpassungen sind derzeit nicht über diese Methode möglich. Bitte verwenden Sie das Stripe Dashboard.'
                ], 400);
            }

            // Log the manual adjustment
            $currentUser = auth()->user();
            if ($currentUser) {
                \App\Models\ActivityLog::log(
                    $actionType,
                    'Manual Balance Adjustment',
                    $renter->id,
                    'Stripe-Dashboard',
                    "Manuelle Saldo-Korrektur: €{$amount} für {$renter->company_name} - Grund: {$reason} - Durchgeführt von: {$currentUser->name}"
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Manuelle Saldo-Korrektur wurde erfolgreich durchgeführt',
                'transfer_id' => $transfer->id ?? null
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler bei der manuellen Saldo-Korrektur: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create payment link for negative balance (Alternative method)
     */
    public function createPaymentLink(Request $request, Renter $renter)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:1',
                'description' => 'string|max:255',
                'admin_note' => 'string|max:500',
                'send_email' => 'boolean'
            ]);

            if (!$renter->stripe_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Stripe-Konto mit diesem Vermieter verbunden.'
                ], 400);
            }

            $stripe = new \Stripe\StripeClient(config('app.stripe_secret_key'));

            // Create payment link directly on connected account to avoid connect fees
            $paymentLink = $stripe->paymentLinks->create([
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => $request->description ?: 'Kontoguthaben Ausgleich',
                            'description' => "Ausgleich für negativen Kontostand - {$renter->company_name}"
                        ],
                        'unit_amount' => intval($request->amount * 100), // Convert to cents
                    ],
                    'quantity' => 1,
                ]],
                'after_completion' => [
                    'type' => 'redirect',
                    'redirect' => [
                        'url' => route('dashboard') . '?payment=success'
                    ]
                ],
                'metadata' => [
                    'renter_id' => $renter->id,
                    'type' => $request->admin_note ? 'custom' : 'balance_adjustment',
                    'admin_note' => $request->admin_note
                ]
            ], [
                'stripe_account' => $renter->stripe_account_id
            ]);

            $currentUser = auth()->user();

            // Save to database
            $dbPaymentLink = \App\Models\PaymentLink::create([
                'renter_id' => $renter->id,
                'stripe_payment_link_id' => $paymentLink->id,
                'stripe_url' => $paymentLink->url,
                'amount' => $request->amount,
                'currency' => 'EUR',
                'description' => $request->description ?: 'Kontoguthaben Ausgleich',
                'admin_note' => $request->admin_note,
                'active' => true,
                'email_sent' => false,
                'created_by' => $currentUser->id ?? null,
                'stripe_metadata' => $paymentLink->metadata->toArray()
            ]);

            $emailSent = false;

            // Send email if requested
            if ($request->send_email && $renter->user && $renter->user->email) {
                try {
                    $this->sendPaymentLinkEmail($renter, $paymentLink, $request->description, $request->admin_note);

                    // Update email status
                    $dbPaymentLink->update([
                        'email_sent' => true,
                        'email_sent_at' => now()
                    ]);
                    $emailSent = true;
                } catch (\Exception $emailError) {
                    // Log email error but don't fail the whole operation
                    error_log("Failed to send payment link email: " . $emailError->getMessage());
                }
            }

            // Log the payment link creation
            if ($currentUser) {
                \App\Models\ActivityLog::log(
                    'created',
                    'Zahlungslink',
                    $renter->id,
                    'Stripe-Dashboard',
                    "Zahlungslink über €{$request->amount} für {$renter->company_name} erstellt" .
                    ($emailSent ? ' (E-Mail gesendet)' : '') .
                    ($request->admin_note ? " - Notiz: {$request->admin_note}" : '')
                );
            }

            return response()->json([
                'success' => true,
                'payment_link' => $paymentLink->url,
                'payment_link_id' => $paymentLink->id,
                'email_sent' => $emailSent,
                'message' => 'Zahlungslink erfolgreich erstellt' . ($emailSent ? ' und E-Mail gesendet' : '')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen des Zahlungslinks: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send payment link via email
     */
    private function sendPaymentLinkEmail($renter, $paymentLink, $description, $adminNote, $isResend = false)
    {
        $subject = "💰 Zahlungsaufforderung - {$renter->company_name}" . ($isResend ? " (Erinnerung)" : "");
        $amount = ($paymentLink->line_items->data[0]->price->unit_amount ?? 0) / 100;

        $body = "
Sehr geehrte Damen und Herren von {$renter->company_name},

hiermit fordern wir Sie zur Zahlung des folgenden Betrags auf:

💰 Fälliger Betrag: €" . number_format($amount, 2, ',', '.') . "
" . ($adminNote ? "
📄 Grund der Zahlungsaufforderung:
{$adminNote}
" : "") . "

Bitte begleichen Sie den ausstehenden Betrag über den folgenden sicheren Zahlungslink:

🔗 Zur Zahlung: {$paymentLink->url}

" . ($isResend ? "Die Zahlung ist bis zum nächstmöglichen Zeitpunkt zu leisten." : "Die Zahlung ist umgehend fällig.") . " Bei Rückfragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Drivable Team

---
Diese E-Mail wurde automatisch generiert. Bei Rückfragen kontaktieren Sie uns bitte direkt.
        ";

        // Force SMTP configuration with hardcoded values from .env
        \Illuminate\Support\Facades\Config::set('mail.default', 'smtp');
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.host', 'smtp.strato.de');
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.port', 465);
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.encryption', 'ssl');
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.username', 'info@drivable.app');
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.password', $_ENV['MAIL_PASSWORD'] ?? getenv('MAIL_PASSWORD'));
        \Illuminate\Support\Facades\Config::set('mail.from.address', 'info@drivable.app');
        \Illuminate\Support\Facades\Config::set('mail.from.name', 'Drivable Team');

        try {
            \Illuminate\Support\Facades\Mail::raw($body, function ($message) use ($renter, $subject) {
                $message->to($renter->user->email)
                        ->subject($subject)
                        ->from('info@drivable.app', 'Drivable Team');
            });

            return true;
        } catch (\Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
            throw new \Exception("E-Mail konnte nicht gesendet werden: " . $e->getMessage());
        }
    }

    /**
     * Delete/deactivate payment link
     */
    public function deletePaymentLink(Request $request, Renter $renter, $paymentLinkId)
    {
        try {
            if (!$renter->stripe_account_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Stripe-Konto mit diesem Vermieter verbunden.'
                ], 400);
            }

            $stripe = new \Stripe\StripeClient(config('app.stripe_secret_key'));

            // Update payment link to inactive in Stripe
            $paymentLink = $stripe->paymentLinks->update($paymentLinkId, [
                'active' => false
            ], ['stripe_account' => $renter->stripe_account_id]);

            // Update in our database too
            \App\Models\PaymentLink::where('stripe_payment_link_id', $paymentLinkId)
                ->where('renter_id', $renter->id)
                ->update(['active' => false]);

            // Log the deletion
            $currentUser = auth()->user();
            if ($currentUser) {
                \App\Models\ActivityLog::log(
                    'deleted',
                    'Payment Link',
                    $renter->id,
                    'Stripe-Dashboard',
                    "Payment Link {$paymentLinkId} für {$renter->company_name} deaktiviert von {$currentUser->name}"
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment Link erfolgreich deaktiviert'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Löschen des Payment Links: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send existing payment link via email retroactively
     */
    public function sendPaymentLinkEmailRetroactive(Request $request, Renter $renter, $paymentLinkId)
    {
        try {
            // Find payment link in our database
            $dbPaymentLink = \App\Models\PaymentLink::where('stripe_payment_link_id', $paymentLinkId)
                ->where('renter_id', $renter->id)
                ->first();

            if (!$dbPaymentLink) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment Link nicht in der Datenbank gefunden.'
                ], 404);
            }

            if (!$renter->user || !$renter->user->email) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keine E-Mail-Adresse für diesen Vermieter verfügbar.'
                ], 400);
            }

            // Allow resending emails (remove the restriction)
            $isResend = $dbPaymentLink->email_sent;

            // Create a mock Stripe payment link object for the email function
            $mockPaymentLink = (object) [
                'url' => $dbPaymentLink->stripe_url,
                'line_items' => (object) [
                    'data' => [
                        (object) [
                            'price' => (object) [
                                'unit_amount' => $dbPaymentLink->amount * 100
                            ]
                        ]
                    ]
                ]
            ];

            try {
                $this->sendPaymentLinkEmail($renter, $mockPaymentLink, $dbPaymentLink->description, $dbPaymentLink->admin_note, $isResend);

                // Update email status (always update timestamp, even for resends)
                $dbPaymentLink->update([
                    'email_sent' => true,
                    'email_sent_at' => now()
                ]);

                // Log the email sending
                $currentUser = auth()->user();
                if ($currentUser) {
                    \App\Models\ActivityLog::log(
                        'sent',
                        'Payment Link Email',
                        $renter->id,
                        'Stripe-Dashboard',
                        "E-Mail für Payment Link {$paymentLinkId} an {$renter->company_name} " .
                        ($isResend ? 'erneut' : 'nachträglich') . " gesendet von {$currentUser->name}"
                    );
                }

                return response()->json([
                    'success' => true,
                    'message' => 'E-Mail erfolgreich ' . ($isResend ? 'erneut ' : '') . 'gesendet'
                ]);

            } catch (\Exception $emailError) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fehler beim Senden der E-Mail: ' . $emailError->getMessage()
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim E-Mail-Versand: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user account details for a Vermieter
     */
    public function updateUser(Request $request, Renter $renter)
    {
        try {
            $user = $renter->user;
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kein Benutzer mit diesem Vermieter verbunden.'
                ], 404);
            }

            \Log::info('Debug updateUser: Renter ID: ' . $renter->id . ', User ID: ' . $user->id . ', Current Email: ' . $user->email);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'phone_number' => 'nullable|string|max:20'
            ]);

            $oldData = [
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number
            ];

            $user->update($validated);

            $currentUser = auth()->user();
            if ($currentUser) {
                \App\Models\ActivityLog::log(
                    'updated',
                    'User Account',
                    $renter->id,
                    'User-Bearbeiten',
                    "Benutzerdaten für {$renter->company_name} aktualisiert von {$currentUser->name}. " .
                    "Änderungen: " . json_encode([
                        'old' => $oldData,
                        'new' => $validated
                    ])
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Benutzerdaten erfolgreich aktualisiert',
                'user' => $user->fresh()
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validierungsfehler',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Aktualisieren der Benutzerdaten: ' . $e->getMessage()
            ], 500);
        }
    }
}
