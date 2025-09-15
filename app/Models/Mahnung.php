<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Mahnung extends Model
{
    use HasFactory;

    protected $table = 'mahnungen';

    protected $fillable = [
        'invoice_id',
        'mahnung_number',
        'mahnstufe',
        'mahnung_date',
        'due_date',
        'original_amount',
        'late_fee',
        'total_amount',
        'interest_rate',
        'interest_amount',
        'reminder_fee',
        'status',
        'sent_date',
        'notes',
        'payment_deadline_days',
        'stripe_payment_link_id',
        'stripe_payment_link_url'
    ];

    protected $casts = [
        'mahnung_date' => 'date',
        'due_date' => 'date',
        'sent_date' => 'date',
        'original_amount' => 'decimal:2',
        'late_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'interest_amount' => 'decimal:2',
        'reminder_fee' => 'decimal:2',
        'payment_deadline_days' => 'integer'
    ];

    /**
     * Mahnstufe constants (German dunning process levels)
     */
    const MAHNSTUFE_ERSTE = 1;      // 1. Mahnung (First reminder)
    const MAHNSTUFE_ZWEITE = 2;     // 2. Mahnung (Second reminder)
    const MAHNSTUFE_LETZTE = 3;     // Letzte Mahnung (Final reminder)
    const MAHNSTUFE_INKASSO = 4;    // Inkassoverfahren (Collection process)

    /**
     * Status constants
     */
    const STATUS_DRAFT = 'draft';
    const STATUS_SENT = 'sent';
    const STATUS_PAID = 'paid';
    const STATUS_ESCALATED = 'escalated';
    const STATUS_CANCELLED = 'cancelled';

    /**
     * Default German law compliant values
     */
    const DEFAULT_PAYMENT_DEADLINE_DAYS = 5; // Standard: 5 days
    const DEFAULT_INTEREST_RATE = 9.12; // Basiszinssatz + 9% für Verbraucher (2024)
    const DEFAULT_REMINDER_FEES = [
        1 => 5.00,   // 1. Mahnung: 5€
        2 => 10.00,  // 2. Mahnung: 10€
        3 => 15.00,  // 3. Mahnung: 15€
        4 => 25.00   // Inkasso: 25€
    ];

    /**
     * Relationship to Invoice
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the previous Mahnung for this invoice
     */
    public function previousMahnung()
    {
        return $this->where('invoice_id', $this->invoice_id)
                   ->where('mahnstufe', '<', $this->mahnstufe)
                   ->orderBy('mahnstufe', 'desc')
                   ->first();
    }

    /**
     * Get all Mahnungen for this invoice
     */
    public function allMahnungenForInvoice()
    {
        return $this->where('invoice_id', $this->invoice_id)
                   ->orderBy('mahnstufe', 'asc')
                   ->get();
    }

    /**
     * Generate Mahnung number
     */
    public static function generateMahnungNumber($invoiceNumber, $mahnstufe)
    {
        return "M{$mahnstufe}-{$invoiceNumber}-" . date('Y');
    }

    /**
     * Calculate interest amount based on German law
     */
    public function calculateInterestAmount($daysOverdue)
    {
        if ($daysOverdue <= 0 || $this->original_amount <= 0) {
            return 0;
        }

        // German law: Verzugszinsen = (Basiszinssatz + 9%) / 365 * Tage * Betrag
        $yearlyRate = $this->interest_rate / 100;
        $dailyRate = $yearlyRate / 365;

        return round($this->original_amount * $dailyRate * $daysOverdue, 2);
    }

    /**
     * Calculate total amount including fees and interest
     */
    public function calculateTotalAmount()
    {
        return $this->original_amount +
               $this->late_fee +
               $this->interest_amount +
               $this->reminder_fee;
    }

    /**
     * Get Mahnstufe text in German
     */
    public function getMahnstufeTextAttribute()
    {
        $texts = [
            self::MAHNSTUFE_ERSTE => '1. Mahnung',
            self::MAHNSTUFE_ZWEITE => '2. Mahnung',
            self::MAHNSTUFE_LETZTE => 'Letzte Mahnung',
            self::MAHNSTUFE_INKASSO => 'Inkassoverfahren'
        ];

        return $texts[$this->mahnstufe] ?? 'Unbekannt';
    }

    /**
     * Get status text in German
     */
    public function getStatusTextAttribute()
    {
        $texts = [
            self::STATUS_DRAFT => 'Entwurf',
            self::STATUS_SENT => 'Versendet',
            self::STATUS_PAID => 'Bezahlt',
            self::STATUS_ESCALATED => 'Eskaliert',
            self::STATUS_CANCELLED => 'Storniert'
        ];

        return $texts[$this->status] ?? 'Unbekannt';
    }

    /**
     * Get formatted amounts
     */
    public function getFormattedOriginalAmountAttribute()
    {
        return number_format($this->original_amount, 2, ',', '.') . ' €';
    }

    public function getFormattedTotalAmountAttribute()
    {
        return number_format($this->total_amount, 2, ',', '.') . ' €';
    }

    public function getFormattedReminderFeeAttribute()
    {
        return number_format($this->reminder_fee, 2, ',', '.') . ' €';
    }

    public function getFormattedInterestAmountAttribute()
    {
        return number_format($this->interest_amount, 2, ',', '.') . ' €';
    }

    /**
     * Get formatted dates
     */
    public function getFormattedMahnungDateAttribute()
    {
        return $this->mahnung_date ? $this->mahnung_date->format('d.m.Y') : null;
    }

    public function getFormattedDueDateAttribute()
    {
        return $this->due_date ? $this->due_date->format('d.m.Y') : null;
    }

    public function getFormattedSentDateAttribute()
    {
        return $this->sent_date ? $this->sent_date->format('d.m.Y') : null;
    }

    /**
     * Check if this Mahnung is overdue
     */
    public function isOverdue()
    {
        return $this->due_date &&
               Carbon::parse($this->due_date)->isPast() &&
               $this->status !== self::STATUS_PAID;
    }

    /**
     * Calculate days overdue
     */
    public function getDaysOverdueAttribute()
    {
        if (!$this->due_date || $this->status === self::STATUS_PAID) {
            return 0;
        }

        return max(0, Carbon::now()->diffInDays(Carbon::parse($this->due_date), false));
    }

    /**
     * Scopes
     */
    public function scopeOverdue($query)
    {
        return $query->where('due_date', '<', now())
                    ->where('status', '!=', self::STATUS_PAID);
    }

    public function scopeByMahnstufe($query, $mahnstufe)
    {
        return $query->where('mahnstufe', $mahnstufe);
    }

    public function scopeSent($query)
    {
        return $query->where('status', self::STATUS_SENT);
    }

    public function scopePaid($query)
    {
        return $query->where('status', self::STATUS_PAID);
    }

    /**
     * Get Mahnstufe text in German
     */
    public function getMahnstufeText()
    {
        $texts = [
            1 => '1. Mahnung',
            2 => '2. Mahnung',
            3 => 'Letzte Mahnung',
            4 => 'Inkasso-Ankündigung'
        ];

        return $texts[$this->mahnstufe] ?? "Mahnung Stufe {$this->mahnstufe}";
    }

    /**
     * Get next possible Mahnstufe for an invoice
     */
    public static function getNextMahnstufe($invoiceId)
    {
        $lastMahnung = self::where('invoice_id', $invoiceId)
                          ->orderBy('mahnstufe', 'desc')
                          ->first();

        if (!$lastMahnung) {
            return self::MAHNSTUFE_ERSTE;
        }

        // Don't allow creating new Mahnung if last one is not sent yet
        if ($lastMahnung->status === self::STATUS_DRAFT) {
            return null;
        }

        // Don't allow creating new Mahnung if last one was paid
        if ($lastMahnung->status === self::STATUS_PAID) {
            return null;
        }

        $nextStufe = $lastMahnung->mahnstufe + 1;

        return $nextStufe <= self::MAHNSTUFE_INKASSO ? $nextStufe : null;
    }

    /**
     * Create next Mahnung for an invoice
     */
    public static function createNextMahnung($invoiceId, $userId = null)
    {
        $invoice = Invoice::find($invoiceId);
        if (!$invoice) {
            throw new \Exception('Rechnung nicht gefunden');
        }

        $nextMahnstufe = self::getNextMahnstufe($invoiceId);
        if (!$nextMahnstufe) {
            throw new \Exception('Keine weitere Mahnung möglich');
        }

        $daysOverdue = max(0, Carbon::now()->diffInDays(Carbon::parse($invoice->due_date), false));

        $mahnung = new self();
        $mahnung->invoice_id = $invoiceId;
        $mahnung->mahnung_number = self::generateMahnungNumber($invoice->invoice_number, $nextMahnstufe);
        $mahnung->mahnstufe = $nextMahnstufe;
        $mahnung->mahnung_date = Carbon::now();
        $mahnung->due_date = Carbon::now()->addDays(self::DEFAULT_PAYMENT_DEADLINE_DAYS);
        $mahnung->original_amount = $invoice->total_amount;
        $mahnung->interest_rate = self::DEFAULT_INTEREST_RATE;
        $mahnung->interest_amount = $mahnung->calculateInterestAmount($daysOverdue);
        $mahnung->reminder_fee = self::DEFAULT_REMINDER_FEES[$nextMahnstufe];
        $mahnung->late_fee = 0; // Can be set manually if needed
        $mahnung->total_amount = $mahnung->calculateTotalAmount();
        $mahnung->status = self::STATUS_DRAFT;
        $mahnung->payment_deadline_days = self::DEFAULT_PAYMENT_DEADLINE_DAYS;

        $mahnung->save();

        return $mahnung;
    }

    /**
     * Create Stripe Payment Link for this Mahnung
     */
    public function createStripePaymentLink()
    {
        try {
            \Stripe\Stripe::setApiKey(config('services.stripe.secret'));

            $lineItems = [];

            // Add original invoice items
            foreach ($this->invoice->items as $item) {
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

            // Add reminder fee
            if ($this->reminder_fee > 0) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => 'Mahngebühr (' . $this->getMahnstufeText() . ')',
                        ],
                        'unit_amount' => (int)($this->reminder_fee * 100),
                    ],
                    'quantity' => 1,
                ];
            }

            // Add interest
            if ($this->interest_amount > 0) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => 'Verzugszinsen (' . $this->interest_rate . '% p.a.)',
                        ],
                        'unit_amount' => (int)($this->interest_amount * 100),
                    ],
                    'quantity' => 1,
                ];
            }

            // Add late fee if applicable
            if ($this->late_fee > 0) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => 'Zusätzliche Gebühr',
                        ],
                        'unit_amount' => (int)($this->late_fee * 100),
                    ],
                    'quantity' => 1,
                ];
            }

            // For Payment Links, we include tax in the unit amount directly
            // instead of using separate tax rates (Stripe Payment Links limitation)
            if ($this->invoice->tax_rate > 0) {
                // Recalculate line items with tax included
                foreach ($lineItems as &$lineItem) {
                    $unitAmountWithoutTax = $lineItem['price_data']['unit_amount'];
                    $unitAmountWithTax = (int)($unitAmountWithoutTax * (1 + $this->invoice->tax_rate / 100));
                    $lineItem['price_data']['unit_amount'] = $unitAmountWithTax;
                    $lineItem['price_data']['product_data']['name'] .= ' (inkl. ' . number_format($this->invoice->tax_rate, 0) . '% USt.)';
                }
            }

            $paymentLink = \Stripe\PaymentLink::create([
                'line_items' => $lineItems,
                'metadata' => [
                    'mahnung_id' => $this->id,
                    'mahnung_number' => $this->mahnung_number,
                    'invoice_id' => $this->invoice_id,
                    'invoice_number' => $this->invoice->invoice_number,
                    'customer_name' => $this->invoice->customer_name,
                    'mahnstufe' => $this->mahnstufe,
                ],
                'after_completion' => [
                    'type' => 'redirect',
                    'redirect' => [
                        'url' => url('/payment-success?mahnung=' . $this->mahnung_number),
                    ],
                ],
            ]);

            // Update mahnung with payment link details
            $this->stripe_payment_link_id = $paymentLink->id;
            $this->stripe_payment_link_url = $paymentLink->url;
            $this->save();

            return $paymentLink;

        } catch (\Exception $e) {
            \Log::error('Failed to create Stripe Payment Link for mahnung ' . $this->mahnung_number . ': ' . $e->getMessage());
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
            \Log::error('Failed to generate QR code for mahnung ' . $this->mahnung_number . ': ' . $e->getMessage());
            return null;
        }
    }
}
