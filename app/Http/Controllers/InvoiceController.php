<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;
use Spatie\Browsershot\Browsershot;
use Carbon\Carbon;

class InvoiceController extends Controller
{
    /**
     * Display a listing of invoices
     */
    public function index()
    {
        try {
            $invoices = Invoice::with(['items', 'mahnungen'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($invoice) {
                    // Update mahnung status before returning
                    $invoice->updateMahnungStatus();
                    return [
                        'id' => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'customer_name' => $invoice->customer_name,
                        'customer_email' => $invoice->customer_email,
                        'customer_address' => $invoice->customer_address,
                        'invoice_date' => $invoice->invoice_date,
                        'due_date' => $invoice->due_date,
                        'subtotal' => $invoice->subtotal,
                        'tax_rate' => $invoice->tax_rate,
                        'tax_amount' => $invoice->tax_amount,
                        'total_amount' => $invoice->total_amount,
                        'status' => $invoice->status,
                        'mahnung_status' => $invoice->mahnung_status,
                        'paid_date' => $invoice->paid_date,
                        'notes' => $invoice->notes,
                        'stripe_payment_link_id' => $invoice->stripe_payment_link_id,
                        'stripe_payment_link_url' => $invoice->stripe_payment_link_url,
                        'created_at' => $invoice->created_at,
                        'items' => $invoice->items->map(function ($item) {
                            return [
                                'id' => $item->id,
                                'position' => $item->position,
                                'quantity' => $item->quantity,
                                'unit' => $item->unit,
                                'description' => $item->description,
                                'unit_price' => $item->unit_price,
                                'total_price' => $item->total_price
                            ];
                        }),
                        'mahnungen' => $invoice->mahnungen->map(function ($mahnung) {
                            return [
                                'id' => $mahnung->id,
                                'mahnung_number' => $mahnung->mahnung_number,
                                'mahnstufe' => $mahnung->mahnstufe,
                                'mahnung_date' => $mahnung->mahnung_date,
                                'due_date' => $mahnung->due_date,
                                'status' => $mahnung->status,
                                'total_amount' => $mahnung->total_amount
                            ];
                        })
                    ];
                });

            return response()->json($invoices);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Rechnungen: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created invoice
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'customer_name' => 'required|string|max:255',
                'customer_email' => 'nullable|email|max:255',
                'customer_address' => 'nullable|string',
                'invoice_date' => 'required|date',
                'due_date' => 'nullable|date|after_or_equal:invoice_date',
                'items' => 'required|array|min:1',
                'items.*.quantity' => 'required|numeric|min:0',
                'items.*.unit' => 'required|string|max:50',
                'items.*.description' => 'required|string|max:255',
                'items.*.unit_price' => 'required|numeric|min:0',
                'subtotal' => 'required|numeric|min:0',
                'tax_rate' => 'required|numeric|min:0|max:100',
                'tax_amount' => 'required|numeric|min:0',
                'total_amount' => 'required|numeric|min:0',
                'status' => 'nullable|in:draft,sent,paid,overdue',
                'paid_date' => 'nullable|date',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validierungsfehler',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Generate invoice number
            $invoiceNumber = $this->generateInvoiceNumber();

            // Create invoice
            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_address' => $request->customer_address,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'subtotal' => $request->subtotal,
                'tax_rate' => $request->tax_rate,
                'tax_amount' => $request->tax_amount,
                'total_amount' => $request->total_amount,
                'status' => $request->status ?? 'draft',
                'paid_date' => $request->paid_date,
                'notes' => $request->notes
            ]);

            // Create invoice items
            foreach ($request->items as $itemData) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'position' => $itemData['position'] ?? 1,
                    'quantity' => $itemData['quantity'],
                    'unit' => $itemData['unit'],
                    'description' => $itemData['description'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => $itemData['total_price']
                ]);
            }

            // Create Stripe Payment Link automatically for all invoices except paid ones
            if ($invoice->status !== Invoice::STATUS_PAID) {
                $invoice->createStripePaymentLink();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Rechnung erfolgreich erstellt',
                'invoice' => $invoice->load('items')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen der Rechnung: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified invoice
     */
    public function show($id)
    {
        try {
            $invoice = Invoice::with('items')->findOrFail($id);

            return response()->json([
                'success' => true,
                'invoice' => $invoice
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Rechnung nicht gefunden'
            ], 404);
        }
    }

    /**
     * Update the specified invoice
     */
    public function update(Request $request, $id)
    {
        try {
            $invoice = Invoice::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'customer_name' => 'required|string|max:255',
                'customer_email' => 'nullable|email|max:255',
                'customer_address' => 'nullable|string',
                'invoice_date' => 'required|date',
                'due_date' => 'nullable|date|after_or_equal:invoice_date',
                'items' => 'required|array|min:1',
                'items.*.quantity' => 'required|numeric|min:0',
                'items.*.unit' => 'required|string|max:50',
                'items.*.description' => 'required|string|max:255',
                'items.*.unit_price' => 'required|numeric|min:0',
                'subtotal' => 'required|numeric|min:0',
                'tax_rate' => 'required|numeric|min:0|max:100',
                'tax_amount' => 'required|numeric|min:0',
                'total_amount' => 'required|numeric|min:0',
                'status' => 'nullable|in:draft,sent,paid,overdue',
                'paid_date' => 'nullable|date',
                'notes' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validierungsfehler',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Update invoice
            $invoice->update([
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_address' => $request->customer_address,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'subtotal' => $request->subtotal,
                'tax_rate' => $request->tax_rate,
                'tax_amount' => $request->tax_amount,
                'total_amount' => $request->total_amount,
                'status' => $request->status ?? 'draft',
                'paid_date' => $request->paid_date,
                'notes' => $request->notes
            ]);

            // Delete existing items and create new ones
            InvoiceItem::where('invoice_id', $invoice->id)->delete();

            foreach ($request->items as $itemData) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'position' => $itemData['position'] ?? 1,
                    'quantity' => $itemData['quantity'],
                    'unit' => $itemData['unit'],
                    'description' => $itemData['description'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => $itemData['total_price']
                ]);
            }

            // Create Stripe Payment Link if none exists and status is not paid
            if (!$invoice->stripe_payment_link_url && $invoice->status !== Invoice::STATUS_PAID) {
                $invoice->createStripePaymentLink();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Rechnung erfolgreich aktualisiert',
                'invoice' => $invoice->load('items')
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Aktualisieren der Rechnung: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified invoice
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $invoice = Invoice::findOrFail($id);

            // Delete invoice items first
            InvoiceItem::where('invoice_id', $invoice->id)->delete();

            // Delete invoice
            $invoice->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Rechnung erfolgreich gelöscht'
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Löschen der Rechnung: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate PDF for invoice
     */
    public function generatePDF($id)
    {
        try {
            $invoice = Invoice::with('items')->findOrFail($id);

            // Company data (adjust to your needs)
            $companyData = [
                'name' => 'Panzof & Kazmin GbR',
                'address' => 'Alte Dorfstraße 95',
                'city' => '63594, Hasselroth',
                'phone' => '+49 174 86477 92',
                'email' => 'info@drivable.app',
                'website' => 'www.drivable.app',
                'bank' => 'Raiffeisenbank',
                'iban' => 'DE48 5066 3699 0000 3844 29',
                'bic' => 'GENODEF1RDB',
                'tax_id' => 'DE359064646',
                'ceo' => 'Dario Panzof & Egor Kazmin'
            ];

            $data = [
                'invoice' => $invoice,
                'company' => $companyData
            ];

            // Generate PDF using Browsershot only
            $html = view('invoices.pdf', $data)->render();
            
            $pdf = Browsershot::html($html)
                ->setNodeBinary('/var/browsershot/bin/node')
                ->setNpmBinary('/var/browsershot/bin/npm')
                ->addChromiumArguments(['no-sandbox', 'disable-dev-shm-usage', 'disable-gpu'])
                ->format('A4')
                ->margins(15, 15, 15, 15)
                ->showBackground()
                ->waitUntilNetworkIdle()
                ->pdf();
            
            return response($pdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="invoice-drivable-' . $invoice->invoice_number . '.pdf"',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Generieren der PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update invoice status
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:draft,sent,paid,overdue,collection',
                'paid_date' => 'nullable|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ungültiger Status',
                    'errors' => $validator->errors()
                ], 422);
            }

            $invoice = Invoice::findOrFail($id);
            $invoice->status = $request->status;
            if ($request->status === 'paid' && $request->paid_date) {
                $invoice->paid_date = $request->paid_date;
            } elseif ($request->status !== 'paid') {
                $invoice->paid_date = null;
            }
            $invoice->save();

            return response()->json([
                'success' => true,
                'message' => 'Status erfolgreich aktualisiert'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Aktualisieren des Status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique invoice number
     */
    private function generateInvoiceNumber()
    {
        $year = date('Y');
        $lastInvoice = Invoice::where('invoice_number', 'LIKE', $year . '-%')
            ->orderBy('invoice_number', 'desc')
            ->first();

        if ($lastInvoice) {
            $lastNumber = intval(substr($lastInvoice->invoice_number, -4));
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $year . '-' . $newNumber;
    }

    /**
     * Get invoice statistics
     */
    public function getStatistics()
    {
        try {
            $totalInvoices = Invoice::count();
            $totalAmount = Invoice::sum('total_amount');
            $paidAmount = Invoice::where('status', 'paid')->sum('total_amount');
            $pendingAmount = Invoice::whereIn('status', ['sent', 'draft'])->sum('total_amount');
            $overdueAmount = Invoice::where('status', 'overdue')->sum('total_amount');

            $statusCounts = Invoice::select('status')
                ->selectRaw('COUNT(*) as count')
                ->groupBy('status')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->status => $item->count];
                });

            return response()->json([
                'success' => true,
                'statistics' => [
                    'total_invoices' => $totalInvoices,
                    'total_amount' => round($totalAmount, 2),
                    'paid_amount' => round($paidAmount, 2),
                    'pending_amount' => round($pendingAmount, 2),
                    'overdue_amount' => round($overdueAmount, 2),
                    'status_counts' => $statusCounts
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Statistiken: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a new Mahnung for an invoice
     */
    public function createMahnung(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'mahnstufe' => 'nullable|integer|min:1|max:4'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validierungsfehler',
                    'errors' => $validator->errors()
                ], 422);
            }

            $invoice = Invoice::findOrFail($id);

            if ($invoice->status === 'paid') {
                return response()->json([
                    'success' => false,
                    'message' => 'Mahnung kann nicht für bezahlte Rechnung erstellt werden'
                ], 400);
            }

            // Get requested or next possible Mahnstufe
            $requestedMahnstufe = $request->mahnstufe;
            $nextMahnstufe = \App\Models\Mahnung::getNextMahnstufe($id);
            
            if ($requestedMahnstufe) {
                // Allow creating specific Mahnstufe only if it's the next logical step or higher
                if ($nextMahnstufe && $requestedMahnstufe < $nextMahnstufe) {
                    return response()->json([
                        'success' => false,
                        'message' => "Mahnstufe {$requestedMahnstufe} ist bereits vorhanden. Nächste mögliche Mahnstufe: {$nextMahnstufe}"
                    ], 400);
                }
                $mahnungStufe = $requestedMahnstufe;
            } else {
                // Use next logical Mahnstufe
                if (!$nextMahnstufe) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Keine weitere Mahnung möglich für diese Rechnung'
                    ], 400);
                }
                $mahnungStufe = $nextMahnstufe;
            }

            // Create new Mahnung manually with requested Mahnstufe
            $mahnung = new \App\Models\Mahnung();
            $mahnung->invoice_id = $id;
            $mahnung->mahnung_number = \App\Models\Mahnung::generateMahnungNumber($invoice->invoice_number, $mahnungStufe);
            $mahnung->mahnstufe = $mahnungStufe;
            $mahnung->mahnung_date = Carbon::now();
            
            // Set payment deadline to 5 days for all Mahnstufen
            $paymentDays = 5;
            $mahnung->due_date = Carbon::now()->addDays($paymentDays);
            $mahnung->original_amount = $invoice->total_amount;
            $mahnung->interest_rate = \App\Models\Mahnung::DEFAULT_INTEREST_RATE;
            
            // Calculate interest amount based on days overdue
            $daysOverdue = max(0, Carbon::now()->diffInDays(Carbon::parse($invoice->due_date), false));
            $mahnung->interest_amount = $mahnung->calculateInterestAmount($daysOverdue);
            
            $mahnung->reminder_fee = \App\Models\Mahnung::DEFAULT_REMINDER_FEES[$mahnungStufe] ?? 15.00;
            $mahnung->late_fee = 0;
            $mahnung->total_amount = $mahnung->calculateTotalAmount();
            $mahnung->status = \App\Models\Mahnung::STATUS_DRAFT;
            $mahnung->payment_deadline_days = $paymentDays;
            
            $mahnung->save();

            // Create Stripe Payment Link for Mahnung
            try {
                \Stripe\Stripe::setApiKey(config('services.stripe.secret'));

                $paymentLink = \Stripe\PaymentLink::create([
                    'line_items' => [
                        [
                            'price_data' => [
                                'currency' => 'eur',
                                'product_data' => [
                                    'name' => "Mahnung {$mahnungStufe} - {$mahnung->mahnung_number}",
                                    'description' => 'Mahnung für Rechnung: ' . $invoice->invoice_number,
                                ],
                                'unit_amount' => intval($mahnung->total_amount * 100),
                            ],
                            'quantity' => 1,
                        ],
                    ],
                    'metadata' => [
                        'mahnung_id' => $mahnung->id,
                        'invoice_id' => $invoice->id,
                        'type' => 'mahnung',
                    ],
                ]);

                // Update Mahnung with payment link
                $mahnung->stripe_payment_link_id = $paymentLink->id;
                $mahnung->stripe_payment_link_url = $paymentLink->url;
                $mahnung->save();

            } catch (\Exception $e) {
                \Log::error('Stripe Payment Link creation failed for Mahnung ' . $mahnung->mahnung_number . ': ' . $e->getMessage());
            }

            // Update invoice mahnung status
            $invoice->updateMahnungStatus();

            return response()->json([
                'success' => true,
                'message' => "Mahnung Stufe {$mahnungStufe} erfolgreich erstellt",
                'mahnung' => $mahnung->load('invoice')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen der Mahnung: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create Stripe Payment Link for invoice
     */
    public function createPaymentLink($id)
    {
        try {
            $invoice = Invoice::with('items')->findOrFail($id);

            if ($invoice->status === Invoice::STATUS_PAID) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bezahlte Rechnungen benötigen keinen Payment Link'
                ], 422);
            }

            // E-Mail-Validierung entfernt - Payment Links werden immer erstellt

            if ($invoice->stripe_payment_link_url) {
                return response()->json([
                    'success' => true,
                    'message' => 'Payment Link bereits vorhanden',
                    'payment_link_url' => $invoice->stripe_payment_link_url
                ]);
            }

            $paymentLink = $invoice->createStripePaymentLink();

            if ($paymentLink) {
                return response()->json([
                    'success' => true,
                    'message' => 'Payment Link erfolgreich erstellt',
                    'payment_link_url' => $invoice->stripe_payment_link_url
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Fehler beim Erstellen des Payment Links. Prüfen Sie die Logs für Details.'
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Erstellen des Payment Links: ' . $e->getMessage()
            ], 500);
        }
    }
}