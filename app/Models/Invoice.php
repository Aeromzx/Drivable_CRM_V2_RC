<?php
// app/Models/Invoice.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'customer_name',
        'customer_email',
        'customer_address',
        'invoice_date',
        'due_date',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'total_amount',
        'status',
        'mahnung_status',
        'paid_date',
        'notes',
        'stripe_payment_link_id',
        'stripe_payment_link_url'
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2'
    ];

    /**
     * Status constants
     */
    const STATUS_DRAFT = 'draft';
    const STATUS_SENT = 'sent';
    const STATUS_PAID = 'paid';
    const STATUS_OVERDUE = 'overdue';
    const STATUS_COLLECTION = 'collection';

    /**
     * Mahnung status constants
     */
    const MAHNUNG_STATUS_NONE = 'none';
    const MAHNUNG_STATUS_DUE = 'due';
    const MAHNUNG_STATUS_REMINDED_1 = 'reminded_1';
    const MAHNUNG_STATUS_REMINDED_2 = 'reminded_2';
    const MAHNUNG_STATUS_REMINDED_3 = 'reminded_3';
    const MAHNUNG_STATUS_COLLECTION = 'collection';
    const MAHNUNG_STATUS_PAID_AFTER_REMINDER = 'paid_after_reminder';

    /**
     * Get the invoice items
     */
    public function items()
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('position');
    }

    /**
     * Get all Mahnungen for this invoice
     */
    public function mahnungen()
    {
        return $this->hasMany(Mahnung::class)->orderBy('mahnstufe');
    }

    /**
     * Get the latest Mahnung
     */
    public function latestMahnung()
    {
        return $this->hasOne(Mahnung::class)->latestOfMany('mahnstufe');
    }

    /**
     * Get active (unsettled) Mahnung
     */
    public function activeMahnung()
    {
        return $this->hasOne(Mahnung::class)->where('status', '!=', 'paid')->orderBy('mahnstufe', 'desc');
    }

    /**
     * Check if invoice is overdue
     */
    public function isOverdue()
    {
        return $this->due_date &&
            Carbon::parse($this->due_date)->isPast() &&
            $this->status !== self::STATUS_PAID;
    }

    /**
     * Get formatted invoice date
     */
    public function getFormattedInvoiceDateAttribute()
    {
        return $this->invoice_date ? $this->invoice_date->format('d.m.Y') : null;
    }

    /**
     * Get formatted due date
     */
    public function getFormattedDueDateAttribute()
    {
        return $this->due_date ? $this->due_date->format('d.m.Y') : null;
    }

    /**
     * Get formatted paid date
     */
    public function getFormattedPaidDateAttribute()
    {
        return $this->paid_date ? $this->paid_date->format('d.m.Y') : null;
    }

    /**
     * Get formatted total amount
     */
    public function getFormattedTotalAmountAttribute()
    {
        return number_format($this->total_amount, 2, ',', '.') . ' €';
    }

    /**
     * Get status in German
     */
    public function getStatusTextAttribute()
    {
        $statusTexts = [
            self::STATUS_DRAFT => 'Entwurf',
            self::STATUS_SENT => 'Versendet',
            self::STATUS_PAID => 'Bezahlt',
            self::STATUS_OVERDUE => 'Überfällig',
            self::STATUS_COLLECTION => 'Zu Inkasso abgegeben'
        ];

        return $statusTexts[$this->status] ?? 'Unbekannt';
    }

    /**
     * Get mahnung status in German
     */
    public function getMahnungStatusTextAttribute()
    {
        $statusTexts = [
            self::MAHNUNG_STATUS_NONE => 'Keine Mahnung',
            self::MAHNUNG_STATUS_DUE => 'Mahnung fällig',
            self::MAHNUNG_STATUS_REMINDED_1 => '1. Mahnung',
            self::MAHNUNG_STATUS_REMINDED_2 => '2. Mahnung',
            self::MAHNUNG_STATUS_REMINDED_3 => 'Letzte Mahnung',
            self::MAHNUNG_STATUS_COLLECTION => 'Inkasso',
            self::MAHNUNG_STATUS_PAID_AFTER_REMINDER => 'Nach Mahnung bezahlt'
        ];

        return $statusTexts[$this->mahnung_status] ?? 'Unbekannt';
    }

    /**
     * Check if invoice needs reminder (Mahnung)
     */
    public function needsReminder()
    {
        return $this->isOverdue() && 
               $this->status !== self::STATUS_PAID && 
               $this->mahnung_status === self::MAHNUNG_STATUS_NONE;
    }

    /**
     * Get days overdue
     */
    public function getDaysOverdueAttribute()
    {
        if (!$this->due_date || $this->status === self::STATUS_PAID) {
            return 0;
        }

        return max(0, Carbon::now()->diffInDays(Carbon::parse($this->due_date), false));
    }

    /**
     * Update mahnung status when Mahnung is created/updated
     */
    public function updateMahnungStatus()
    {
        $latestMahnung = $this->latestMahnung;
        
        if (!$latestMahnung) {
            if ($this->isOverdue() && $this->status !== self::STATUS_PAID) {
                $this->mahnung_status = self::MAHNUNG_STATUS_DUE;
            } else {
                $this->mahnung_status = self::MAHNUNG_STATUS_NONE;
            }
        } else {
            // Update based on latest Mahnung
            switch ($latestMahnung->mahnstufe) {
                case 1:
                    $this->mahnung_status = self::MAHNUNG_STATUS_REMINDED_1;
                    break;
                case 2:
                    $this->mahnung_status = self::MAHNUNG_STATUS_REMINDED_2;
                    break;
                case 3:
                    $this->mahnung_status = self::MAHNUNG_STATUS_REMINDED_3;
                    break;
                case 4:
                    $this->mahnung_status = self::MAHNUNG_STATUS_COLLECTION;
                    break;
            }

            // If invoice was paid after reminder
            if ($this->status === self::STATUS_PAID && $this->mahnung_status !== self::MAHNUNG_STATUS_NONE) {
                $this->mahnung_status = self::MAHNUNG_STATUS_PAID_AFTER_REMINDER;
            }
        }

        $this->save();
    }

    /**
     * Scope to get overdue invoices
     */
    public function scopeOverdue($query)
    {
        return $query->where('due_date', '<', now())
            ->where('status', '!=', self::STATUS_PAID);
    }

    /**
     * Scope to get paid invoices
     */
    public function scopePaid($query)
    {
        return $query->where('status', self::STATUS_PAID);
    }

    /**
     * Scope to get pending invoices
     */
    public function scopePending($query)
    {
        return $query->whereIn('status', [self::STATUS_DRAFT, self::STATUS_SENT]);
    }

    /**
     * Create Stripe Payment Link for this invoice
     */
    public function createStripePaymentLink()
    {
        try {
            $stripe = new \Stripe\StripeClient(config('services.stripe.secret'));
            
            $lineItems = [];
            
            // Add invoice items
            foreach ($this->items as $item) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => $item->description,
                        ],
                        'unit_amount' => (int)($item->unit_price * 100), // Convert to cents
                    ],
                    'quantity' => (int)$item->quantity,
                ];
            }
            
            // For Payment Links, we include tax in the unit amount directly
            // instead of using separate tax rates (Stripe Payment Links limitation)
            if ($this->tax_rate > 0) {
                // Recalculate line items with tax included
                foreach ($lineItems as &$lineItem) {
                    $unitAmountWithoutTax = $lineItem['price_data']['unit_amount'];
                    $unitAmountWithTax = (int)($unitAmountWithoutTax * (1 + $this->tax_rate / 100));
                    $lineItem['price_data']['unit_amount'] = $unitAmountWithTax;
                    $lineItem['price_data']['product_data']['name'] .= ' (inkl. ' . number_format($this->tax_rate, 0) . '% USt.)';
                }
            }
            
            $paymentLink = $stripe->paymentLinks->create([
                'line_items' => $lineItems,
                'metadata' => [
                    'invoice_id' => $this->id,
                    'invoice_number' => $this->invoice_number,
                    'customer_name' => $this->customer_name,
                ],
                'after_completion' => [
                    'type' => 'redirect',
                    'redirect' => [
                        'url' => url('/payment-success?invoice=' . $this->invoice_number),
                    ],
                ],
            ]);
            
            // Update invoice with payment link details
            $this->update([
                'stripe_payment_link_id' => $paymentLink->id,
                'stripe_payment_link_url' => $paymentLink->url,
            ]);
            
            return $paymentLink;
            
        } catch (\Exception $e) {
            \Log::error('Failed to create Stripe Payment Link for invoice ' . $this->invoice_number . ': ' . $e->getMessage(), [
                'invoice_id' => $this->id,
                'invoice_number' => $this->invoice_number,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line_items' => $lineItems ?? [],
                'stripe_config' => [
                    'secret_configured' => !empty(config('services.stripe.secret')),
                    'secret_preview' => substr(config('services.stripe.secret'), 0, 10) . '...'
                ]
            ]);
            return null;
        }
    }

    /**
     * Generate QR code for payment link as Base64 for DomPDF
     */
    public function getPaymentQrCode()
    {
        if (!$this->stripe_payment_link_url) {
            return null;
        }
        
        try {
            // Generate QR code as SVG for DomPDF (no additional extensions needed)
            $qrCode = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
                ->size(120)
                ->margin(1)
                ->generate($this->stripe_payment_link_url);
            
            // Return as data URL for inline embedding
            return 'data:image/svg+xml;base64,' . base64_encode($qrCode);
        } catch (\Exception $e) {
            \Log::error('Failed to generate QR code for invoice ' . $this->invoice_number . ': ' . $e->getMessage());
            return null;
        }
    }
}
