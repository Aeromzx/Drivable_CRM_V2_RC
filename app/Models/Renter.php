<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Renter extends Model
{
    use HasFactory;

    protected $table = 'renters';
    protected $connection = 'mysql_live';

    protected $fillable = [
        'user_id',
        'profile_picture',
        'tax_number',
        'location_id',
        'country',
        'company_name',
        'company_address',
        'company_address_city',
        'company_address_street',
        'company_address_postcode',
        'longitude',
        'latitude',
        'companyDescription',
        'verified',
        'points',
        'wasRenter',
        'renterType',
        'availableStartTime',
        'availableEndTime',
        'paymentTypesCaution',
        'stripe_account_id',
        'stripe_enabled',
        'percentage',
        'allowCash',
        'allowDigitalPayment',
        'isSmallBusinessOwner',
        'strikes',
        'blockPayouts',
        'note',
        'location_ratings',
        'message'
    ];

    protected $casts = [
        'verified' => 'boolean',
        'wasRenter' => 'boolean', 
        'stripe_enabled' => 'boolean',
        'allowCash' => 'boolean',
        'allowDigitalPayment' => 'boolean',
        'isSmallBusinessOwner' => 'boolean',
        'blockPayouts' => 'boolean',
        'points' => 'integer',
        'strikes' => 'integer',
        'renterType' => 'integer',
        'percentage' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
        'location_ratings' => 'json'
    ];

    public function user()
    {
        return $this->belongsTo(User_live::class, 'user_id');
    }

    public function cars()
    {
        return $this->hasMany(Cars::class, 'rent_id');
    }

    public function chats()
    {
        return $this->hasMany(Chat::class);
    }
    
    public function rentals()
    {
        return $this->hasMany(Rentals::class, 'renter_id');
    }
}
