<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rentals extends Model
{
    use HasFactory;
    protected $connection = 'mysql_live';

    const STATUS_REQUESTED = 0;
    const STATUS_CANCELLED = 1;
    const STATUS_ACCEPTED = 2;
    const STATUS_DECLINED = 3;
    const STATUS_PAID = 4;
    const STATUS_ACTIVE = 5;
    const STATUS_COMPLETED = 6;
    const STATUS_CANCELLED_BY_RENTER = 7;
    const STATUS_CANCELLED_BY_USER = 8;
    const STATUS_REFUNDED = 9;
    const STATUS_RATED = 10;

    protected $fillable = [
        'renter_id',
        'user_id',
        'car_id',
        'type',
        'start_date',
        'end_date',
        'start_hour',
        'end_hour',
        'default_kilometers',
        'status',
        'instant_rent',
        'daysBeforeRental1',
        'refundPercentage1',
        'daysBeforeRental2',
        'refundPercentage2',
        'daysBeforeRental3',
        'refundPercentage3',
        'rent_note',
        'cancelNote',
        'coupon_id',
        'payment_method_id',
        'payment_method_type',
        'platform_payment_intent_id',
        'connect_charge_id',
        'platform_charge_id',
        'refundable_amount',
        'payment_status',
        'platform_fee',
        'total_amount',
        'payment_type',
        'refunded_amount',
        'cashDownPayment',
        'refunded_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    // Bestehende Relationships
    public function rentHistory()
    {
        return $this->hasMany(RentHistory::class, 'rent_id');
    }

    public function rentRating()
    {
        return $this->hasMany(RentRating::class, 'rent_id');
    }

    public function rentReceipt()
    {
        return $this->hasMany(RentReceipt::class, 'rent_id');
    }

    public function rentExtras()
    {
        return $this->hasOne(RentExtras::class, 'rent_id');
    }

    public function car()
    {
        return $this->belongsTo(Cars::class, 'car_id');
    }

    public function renter()
    {
        return $this->belongsTo(Renter::class, 'renter_id');
    }

    public function user()
    {
        return $this->belongsTo(User_live::class, 'user_id');
    }

    public function coupon()
    {
        return $this->belongsTo(Coupons::class, 'coupon_id');
    }

    // NEUE RETARGETING RELATIONSHIPS
    public function rentalRetargeting()
    {
        return $this->hasMany(RentalRetargeting::class, 'rental_id');
    }

    public function rentalPaymentRetargeting()
    {
        return $this->hasMany(RentalPaymentRetargeting::class, 'rental_id');
    }

    public function stripeFees()
    {
        return $this->hasMany(RentalStripeFee::class, 'rental_id');
    }

    public function getTotalAmount()
    {
        if ($this->rentReceipt()->exists()) {
            return $this->rentReceipt()->first()->sum;
        }
        return 0;
    }
}
