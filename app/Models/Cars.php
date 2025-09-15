<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cars extends Model
{
    use HasFactory;

    protected $table = 'cars';
    protected $connection = 'mysql_live';

    protected $fillable = [
        'type', 'brand', 'model', 'year', 'fuelType', 'engineType', 'gearType',
        'power', 'acceleration', 'topSpeed', 'street', 'postalCode', 'city',
        'latitude', 'longitude', 'offerDelivery', 'deliveryRange', 'pricePerKm',
        'dailyRentMoThu', 'dailyRentFriSun', 'weekendRent', 'weeklyRent', 'hourRent', 'activateHourRents',
        'requireDeposit', 'depositAmount', 'paymentMethods', 'sofortmieteEnabled', 'driveType',
        'rents', 'minimumAge', 'minimumLicenceYears', 'tankRule', 'rentalType',
        'minRentalPeriod', 'includedKm', 'extraKmPrice', 'title', 'description',
        'cancellationPolicy', 'daysBeforeRental1', 'refundPercentage1', 'abroadActive',
        'daysBeforeRental2', 'refundPercentage2', 'daysBeforeRental3', 'refundPercentage3', 'rent_id', 'extras',
        'color', 'hourKm', 'dayKm', 'uuid', 'deleted', 'minDeliveryRange', 'hash_id',
        'acceptsVehicleDeposit', 'deductibleAmount', 'kmPackages', 'monthRent'
    ];

    protected $casts = [
        'paymentMethods' => 'json',
        'offerDelivery' => 'boolean',
        'requireDeposit' => 'boolean',
        'sofortmieteEnabled' => 'boolean',
    ];

    public function images()
    {
        return $this->hasMany(CarsImages::class, 'car_id')->orderBy('image_position', 'asc');
    }

    public function extras()
    {
        return $this->hasMany(CarExtras::class, 'car_id');
    }

    public function renter()
    {
        return $this->belongsTo(Renter::class, 'rent_id');
    }

    public function blockedDates()
    {
        return $this->hasMany(CarBlocked::class, 'car_id');
    }

    public function rentals()
    {
        return $this->hasMany(Rentals::class, 'car_id');
    }
}
