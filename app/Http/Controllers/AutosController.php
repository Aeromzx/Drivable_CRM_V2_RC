<?php

namespace App\Http\Controllers;

use App\Models\Cars;
use App\Models\Brands;
use App\Models\EngineTypes;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AutosController extends Controller
{
    public function index(Request $request)
    {
        try {
            $search = $request->get('search', '');
            $sortBy = $request->get('sort', 'newest');
            $status = $request->get('status', 'active');
            $brand = $request->get('brand', 'all');
            $page = $request->get('page', 1);
            $perPage = 20;

            // Base query with relationships
            $query = Cars::with([
                'renter.user',
                'images',
                'rentals' => function($q) {
                    $q->select('car_id', 'status', 'total_amount')
                      ->whereIn('status', [4, 5, 6, 10]); // Paid, Active, Completed, Rated
                }
            ]);

            // Search filter
            if (!empty($search)) {
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('model', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('renter.user', function($subQ) use ($search) {
                          $subQ->where('name', 'like', "%{$search}%");
                      })
                      ->orWhereHas('renter', function($subQ) use ($search) {
                          $subQ->where('company_name', 'like', "%{$search}%");
                      });
                });
            }

            // Status filter
            if ($status !== 'all') {
                if ($status === 'active') {
                    $query->where('deleted', 0);
                } elseif ($status === 'deleted') {
                    $query->where('deleted', 1);
                } elseif ($status === 'verified') {
                    $query->where('deleted', 0)
                          ->whereHas('renter', function($q) {
                              $q->where('verified', 1);
                          });
                } elseif ($status === 'unverified') {
                    $query->where('deleted', 0)
                          ->whereHas('renter', function($q) {
                              $q->where('verified', 0);
                          });
                }
            }

            // Brand filter
            if ($brand !== 'all') {
                $query->where('brand', $brand);
            }

            // Sorting
            switch ($sortBy) {
                case 'newest':
                    $query->orderBy('created_at', 'desc');
                    break;
                case 'oldest':
                    $query->orderBy('created_at', 'asc');
                    break;
                case 'title':
                    $query->orderBy('title', 'asc');
                    break;
                case 'price_high':
                    $query->orderBy('dailyRentMoThu', 'desc');
                    break;
                case 'price_low':
                    $query->orderBy('dailyRentMoThu', 'asc');
                    break;
                case 'year_new':
                    $query->orderBy('year', 'desc');
                    break;
                case 'year_old':
                    $query->orderBy('year', 'asc');
                    break;
                default:
                    $query->orderBy('created_at', 'desc');
            }

            // Paginate
            $cars = $query->paginate($perPage, ['*'], 'page', $page);

            // Calculate statistics
            $statistics = [
                'total_cars' => Cars::count(),
                'active_cars' => Cars::where('deleted', 0)->count(),
                'deleted_cars' => Cars::where('deleted', 1)->count(),
                'verified_cars' => Cars::where('deleted', 0)
                    ->whereHas('renter', function($q) {
                        $q->where('verified', 1);
                    })->count(),
                'unverified_cars' => Cars::where('deleted', 0)
                    ->whereHas('renter', function($q) {
                        $q->where('verified', 0);
                    })->count(),
                'total_rentals' => Cars::withCount(['rentals' => function($q) {
                    $q->whereIn('status', [4, 5, 6, 10]);
                }])->get()->sum('rentals_count'),
                'avg_price' => Cars::where('deleted', 0)->avg('dailyRentMoThu'),
            ];

            // Get brands for filter
            $brands = Brands::select('id', 'brandName')
                ->whereHas('cars', function($q) {
                    $q->where('deleted', 0);
                })
                ->orderBy('brandName')
                ->get();

            // Get engine types
            $engineTypes = EngineTypes::select('id', 'name')->orderBy('name')->get();

            // Get chart data
            $chartData = $this->getChartData();

            return Inertia::render('Autos', [
                'cars' => $cars,
                'search' => $search,
                'sortBy' => $sortBy,
                'status' => $status,
                'selectedBrand' => $brand,
                'statistics' => $statistics,
                'brands' => $brands,
                'engineTypes' => $engineTypes,
                'chartData' => $chartData,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching cars: ' . $e->getMessage());

            return Inertia::render('Autos', [
                'cars' => collect([]),
                'search' => $search ?? '',
                'sortBy' => $sortBy ?? 'newest',
                'status' => $status ?? 'all',
                'selectedBrand' => $brand ?? 'all',
                'statistics' => [
                    'total_cars' => 0,
                    'active_cars' => 0,
                    'deleted_cars' => 0,
                    'verified_cars' => 0,
                    'unverified_cars' => 0,
                    'total_rentals' => 0,
                    'avg_price' => 0,
                ],
                'brands' => collect([]),
                'engineTypes' => collect([]),
                'chartData' => null,
                'error' => 'Fehler beim Laden der Autos: ' . $e->getMessage()
            ]);
        }
    }

    private function getChartData()
    {
        try {
            // Get the first car creation date to determine the start of lifetime data
            $firstCar = Cars::orderBy('created_at', 'asc')->first();

            if (!$firstCar) {
                return [
                    'lifetimeGrowth' => [],
                    'last30Days' => []
                ];
            }

            $firstDate = $firstCar->created_at;
            $currentDate = now();

            // Lifetime growth data (monthly) - Fill all months between first car and now
            $lifetimeGrowthData = [];
            $tempDate = $firstDate->copy()->startOfMonth();

            while ($tempDate->lte($currentDate)) {
                $monthKey = $tempDate->format('Y-m');
                $monthName = $tempDate->format('M Y');

                // Get count for this month
                $count = Cars::whereBetween('created_at', [
                    $tempDate->copy()->startOfMonth(),
                    $tempDate->copy()->endOfMonth()
                ])->count();

                $lifetimeGrowthData[] = [
                    'month' => $monthKey,
                    'month_name' => $monthName,
                    'count' => $count,
                    'cumulative' => 0 // Will be calculated below
                ];

                $tempDate->addMonth();
            }

            // Calculate cumulative counts for lifetime growth
            $cumulative = 0;
            foreach ($lifetimeGrowthData as &$item) {
                $cumulative += $item['count'];
                $item['cumulative'] = $cumulative;
            }

            // Last 30 days growth data (daily) - Fill all days
            $thirtyDaysAgo = now()->subDays(30)->startOfDay();
            $last30DaysData = [];

            for ($i = 30; $i >= 0; $i--) {
                $date = now()->subDays($i)->startOfDay();
                $dateString = $date->format('Y-m-d');

                // Get count for this specific date
                $count = Cars::whereBetween('created_at', [
                    $date->copy()->startOfDay(),
                    $date->copy()->endOfDay()
                ])->count();

                $last30DaysData[] = [
                    'date' => $dateString,
                    'date_formatted' => $date->format('d.m'),
                    'count' => $count
                ];
            }

            return [
                'lifetimeGrowth' => $lifetimeGrowthData,
                'last30Days' => $last30DaysData
            ];

        } catch (\Exception $e) {
            Log::error('Error generating chart data: ' . $e->getMessage());
            return [
                'lifetimeGrowth' => [],
                'last30Days' => []
            ];
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $car = Cars::findOrFail($id);

            $validatedData = $request->validate([
                'title' => 'sometimes|string|max:255',
                'brand' => 'sometimes|integer', // Brand ID reference
                'year' => 'sometimes|integer|min:1900|max:' . (date('Y') + 1),
                'fuelType' => 'sometimes|integer|in:1,2,3,4',
                'gearType' => 'sometimes|string|in:Manuell,Automatik',
                'engineType' => 'sometimes|integer',
                'description' => 'sometimes|string',
                'dailyRentMoThu' => 'sometimes|numeric|min:0',
                'dailyRentFriSun' => 'sometimes|numeric|min:0',
                'weekendRent' => 'sometimes|numeric|min:0',
                'weeklyRent' => 'sometimes|numeric|min:0',
                'hourRent' => 'sometimes|numeric|min:0',
                'depositAmount' => 'sometimes|numeric|min:0',
                // 'verified' => 'sometimes|boolean', // TODO: Add when field exists in database
                'deleted' => 'sometimes|boolean',
            ]);

            $car->update($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Auto erfolgreich aktualisiert',
                'car' => $car->load(['renter.user', 'images'])
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating car: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Aktualisieren des Autos: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $car = Cars::findOrFail($id);

            // Soft delete by setting deleted = 1
            $car->update(['deleted' => 1]);

            return response()->json([
                'success' => true,
                'message' => 'Auto erfolgreich gelöscht'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting car: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Löschen des Autos: ' . $e->getMessage()
            ], 500);
        }
    }

    public function restore($id)
    {
        try {
            $car = Cars::findOrFail($id);

            // Restore by setting deleted = 0
            $car->update(['deleted' => 0]);

            return response()->json([
                'success' => true,
                'message' => 'Auto erfolgreich wiederhergestellt'
            ]);

        } catch (\Exception $e) {
            Log::error('Error restoring car: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Wiederherstellen des Autos: ' . $e->getMessage()
            ], 500);
        }
    }

    public function deleteImage($carId, $imageId)
    {
        try {
            $car = Cars::findOrFail($carId);
            $image = $car->images()->findOrFail($imageId);

            // Delete the image file if it exists
            $imagePath = storage_path('app/public/' . $image->image_path);
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }

            // Delete the image record
            $image->delete();

            // Reload the car with updated images
            $car = $car->fresh(['images']);

            return response()->json([
                'success' => true,
                'message' => 'Bild erfolgreich gelöscht',
                'car' => $car
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting car image: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Löschen des Bildes: ' . $e->getMessage()
            ], 500);
        }
    }
}
