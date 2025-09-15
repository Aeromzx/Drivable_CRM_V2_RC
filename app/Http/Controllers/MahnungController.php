<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Mahnung;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Barryvdh\DomPDF\Facade\Pdf;
use Spatie\Browsershot\Browsershot;
use Carbon\Carbon;
use Exception;

class MahnungController extends Controller
{
    /**
     * Get all Mahnungen for an invoice
     */
    public function getInvoiceMahnungen($invoiceId)
    {
        try {
            $invoice = Invoice::with(['mahnungen' => function ($query) {
                $query->orderBy('mahnstufe');
            }])->findOrFail($invoiceId);

            return response()->json([
                'success' => true,
                'invoice' => $invoice,
                'mahnungen' => $invoice->mahnungen,
                'next_mahnstufe' => Mahnung::getNextMahnstufe($invoiceId)
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Mahnungen: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all Mahnungen (overview)
     */
    public function index(Request $request)
    {
        try {
            $query = Mahnung::with(['invoice'])
                ->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by mahnstufe
            if ($request->has('mahnstufe') && $request->mahnstufe) {
                $query->where('mahnstufe', $request->mahnstufe);
            }

            // Filter by date range
            if ($request->has('date_from') && $request->date_from) {
                $query->where('mahnung_date', '>=', $request->date_from);
            }

            if ($request->has('date_to') && $request->date_to) {
                $query->where('mahnung_date', '<=', $request->date_to);
            }

            // Search by invoice number or customer name
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->whereHas('invoice', function ($q) use ($search) {
                    $q->where('invoice_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%");
                });
            }

            $mahnungen = $query->paginate(50);

            return response()->json([
                'success' => true,
                'mahnungen' => $mahnungen
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Mahnungen: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new Mahnung - KOMPLETT NEU MIT DB STATEMENTS
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => 'required|exists:invoices,id',
            'notes' => 'nullable|string|max:1000',
            'payment_deadline_days' => 'nullable|integer|min:1|max:90'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validierungsfehler',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $invoice = Invoice::findOrFail($request->invoice_id);

            // Check if invoice can receive a Mahnung
            if ($invoice->status === Invoice::STATUS_PAID) {
                throw new Exception('Bezahlte Rechnungen können nicht gemahnt werden');
            }

            // Get next Mahnstufe
            $nextMahnstufe = Mahnung::getNextMahnstufe($request->invoice_id);
            if (!$nextMahnstufe) {
                throw new Exception('Keine weitere Mahnung möglich');
            }

            // Calculate values
            $daysOverdue = max(0, Carbon::now()->diffInDays(Carbon::parse($invoice->due_date), false));
            $interestRate = 9.12;
            $originalAmount = $invoice->total_amount;
            $interestAmount = round($originalAmount * ($interestRate / 100) / 365 * $daysOverdue, 2);
            $reminderFees = [1 => 5.00, 2 => 10.00, 3 => 15.00, 4 => 25.00];
            $reminderFee = $reminderFees[$nextMahnstufe];
            $totalAmount = $originalAmount + $interestAmount + $reminderFee;

            // Generate Mahnung number
            $mahnungNumber = "M{$nextMahnstufe}-{$invoice->invoice_number}-" . date('Y');

            // DIREKT IN DB ERSTELLEN
            $mahnungId = DB::table('mahnungen')->insertGetId([
                'invoice_id' => $request->invoice_id,
                'mahnung_number' => $mahnungNumber,
                'mahnstufe' => $nextMahnstufe,
                'mahnung_date' => Carbon::now(),
                'due_date' => Carbon::now()->addDays($request->payment_deadline_days ?? 5),
                'original_amount' => $originalAmount,
                'late_fee' => 0.00,
                'interest_rate' => $interestRate,
                'interest_amount' => $interestAmount,
                'reminder_fee' => $reminderFee,
                'total_amount' => $totalAmount,
                'status' => 'draft',
                'notes' => $request->notes,
                'payment_deadline_days' => $request->payment_deadline_days ?? 5,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now()
            ]);

            \Log::info('Mahnung created in DB with ID: ' . $mahnungId);

            // CREATE STRIPE PAYMENT LINK
            try {
                \Stripe\Stripe::setApiKey(config('services.stripe.secret'));

                $paymentLink = \Stripe\PaymentLink::create([
                    'line_items' => [
                        [
                            'price_data' => [
                                'currency' => 'eur',
                                'product_data' => [
                                    'name' => "Mahnung {$nextMahnstufe} - {$mahnungNumber}",
                                    'description' => 'Mahnung für Rechnung: ' . $invoice->invoice_number,
                                ],
                                'unit_amount' => intval($totalAmount * 100),
                            ],
                            'quantity' => 1,
                        ],
                    ],
                    'metadata' => [
                        'mahnung_id' => $mahnungId,
                        'invoice_id' => $invoice->id,
                        'type' => 'mahnung',
                    ],
                ]);

                // UPDATE PAYMENT LINK IN DB
                DB::table('mahnungen')
                    ->where('id', $mahnungId)
                    ->update([
                        'stripe_payment_link_id' => $paymentLink->id,
                        'stripe_payment_link_url' => $paymentLink->url,
                        'updated_at' => Carbon::now()
                    ]);

            } catch (\Exception $e) {
                \Log::error('Stripe Payment Link creation failed for Mahnung ' . $mahnungId . ': ' . $e->getMessage());
                \Log::error('Stack trace: ' . $e->getTraceAsString());
            }

            // Update invoice mahnung status
            $invoice->updateMahnungStatus();

            DB::commit();

            // GET MAHNUNG FROM DB
            $mahnung = Mahnung::with('invoice')->find($mahnungId);

            return response()->json([
                'success' => true,
                'message' => "Mahnung Stufe {$nextMahnstufe} wurde erfolgreich erstellt",
                'mahnung' => $mahnung
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update Mahnung
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'due_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string|max:1000',
            'late_fee' => 'nullable|numeric|min:0',
            'reminder_fee' => 'nullable|numeric|min:0',
            'payment_deadline_days' => 'nullable|integer|min:1|max:90'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validierungsfehler',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $mahnung = Mahnung::findOrFail($id);

            // Only allow editing of draft Mahnungen
            if ($mahnung->status !== Mahnung::STATUS_DRAFT) {
                throw new Exception('Nur Entwürfe können bearbeitet werden');
            }

            // Update fields
            if ($request->has('due_date')) {
                $mahnung->due_date = $request->due_date;
            }

            if ($request->has('notes')) {
                $mahnung->notes = $request->notes;
            }

            if ($request->has('late_fee')) {
                $mahnung->late_fee = $request->late_fee;
                $mahnung->total_amount = $mahnung->calculateTotalAmount();
            }

            if ($request->has('reminder_fee')) {
                $mahnung->reminder_fee = $request->reminder_fee;
                $mahnung->total_amount = $mahnung->calculateTotalAmount();
            }

            if ($request->has('payment_deadline_days')) {
                $mahnung->payment_deadline_days = $request->payment_deadline_days;
                $mahnung->due_date = Carbon::parse($mahnung->mahnung_date)->addDays($request->payment_deadline_days);
                $mahnung->total_amount = $mahnung->calculateTotalAmount();
            }

            $mahnung->save();

            return response()->json([
                'success' => true,
                'message' => 'Mahnung wurde erfolgreich aktualisiert',
                'mahnung' => $mahnung->load('invoice')
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send Mahnung (mark as sent)
     */
    public function send(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $mahnung = Mahnung::findOrFail($id);

            if ($mahnung->status !== Mahnung::STATUS_DRAFT) {
                throw new Exception('Nur Entwürfe können versendet werden');
            }

            $mahnung->status = Mahnung::STATUS_SENT;
            $mahnung->sent_date = Carbon::now();
            $mahnung->save();

            // Update invoice status
            $mahnung->invoice->updateMahnungStatus();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $mahnung->mahnstufe_text . ' wurde erfolgreich versendet',
                'mahnung' => $mahnung->load('invoice')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark Mahnung as paid
     */
    public function markAsPaid(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $mahnung = Mahnung::findOrFail($id);

            $mahnung->status = Mahnung::STATUS_PAID;
            $mahnung->save();

            // Also mark invoice as paid
            $invoice = $mahnung->invoice;
            $invoice->status = Invoice::STATUS_PAID;
            $invoice->paid_date = Carbon::now();
            $invoice->updateMahnungStatus();

            // Mark all other Mahnungen for this invoice as paid
            Mahnung::where('invoice_id', $invoice->id)
                ->where('id', '!=', $mahnung->id)
                ->update(['status' => Mahnung::STATUS_PAID]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Mahnung und Rechnung wurden als bezahlt markiert',
                'mahnung' => $mahnung->load('invoice')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel Mahnung
     */
    public function cancel(Request $request, $id)
    {
        try {
            $mahnung = Mahnung::findOrFail($id);

            if ($mahnung->status === Mahnung::STATUS_PAID) {
                throw new Exception('Bezahlte Mahnungen können nicht storniert werden');
            }

            $mahnung->status = Mahnung::STATUS_CANCELLED;
            $mahnung->save();

            return response()->json([
                'success' => true,
                'message' => 'Mahnung wurde storniert',
                'mahnung' => $mahnung->load('invoice')
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete Mahnung (only drafts)
     */
    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $mahnung = Mahnung::findOrFail($id);

            if ($mahnung->status !== Mahnung::STATUS_DRAFT) {
                throw new Exception('Nur Entwürfe können gelöscht werden');
            }

            $invoice = $mahnung->invoice;
            $mahnung->delete();

            // Update invoice mahnung status
            $invoice->updateMahnungStatus();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Mahnung wurde gelöscht'
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function getDashboardStats()
    {
        try {
            $stats = [
                'total_mahnungen' => Mahnung::count(),
                'draft_mahnungen' => Mahnung::where('status', Mahnung::STATUS_DRAFT)->count(),
                'sent_mahnungen' => Mahnung::where('status', Mahnung::STATUS_SENT)->count(),
                'overdue_mahnungen' => Mahnung::overdue()->count(),
                'paid_mahnungen' => Mahnung::where('status', Mahnung::STATUS_PAID)->count(),
                'total_mahnung_amount' => Mahnung::where('status', '!=', Mahnung::STATUS_CANCELLED)->sum('total_amount'),
                'by_mahnstufe' => [
                    1 => Mahnung::where('mahnstufe', 1)->count(),
                    2 => Mahnung::where('mahnstufe', 2)->count(),
                    3 => Mahnung::where('mahnstufe', 3)->count(),
                    4 => Mahnung::where('mahnstufe', 4)->count(),
                ],
                'invoices_needing_reminder' => Invoice::where('status', '!=', Invoice::STATUS_PAID)
                    ->where('due_date', '<', Carbon::now())
                    ->whereIn('mahnung_status', [Invoice::MAHNUNG_STATUS_NONE, Invoice::MAHNUNG_STATUS_DUE])
                    ->count()
            ];

            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Statistiken: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get invoices that need reminders
     */
    public function getInvoicesNeedingReminder()
    {
        try {
            $invoices = Invoice::where('status', '!=', Invoice::STATUS_PAID)
                ->where('due_date', '<', Carbon::now())
                ->whereIn('mahnung_status', [
                    Invoice::MAHNUNG_STATUS_NONE,
                    Invoice::MAHNUNG_STATUS_DUE
                ])
                ->with(['latestMahnung'])
                ->orderBy('due_date', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'invoices' => $invoices
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Laden der Rechnungen: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate PDF for Mahnung
     */
    public function generatePDF($id)
    {
        try {
            $mahnung = Mahnung::with(['invoice', 'invoice.items'])->findOrFail($id);

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
                'mahnung' => $mahnung,
                'invoice' => $mahnung->invoice,
                'company' => $companyData
            ];

            // Generate HTML from Blade template
            $html = view('mahnungen.pdf', $data)->render();

            // Generate PDF using Browsershot only
            $pdf = Browsershot::html($html)
                ->setNodeBinary('/var/browsershot/bin/node')
                ->setNpmBinary('/var/browsershot/bin/npm')
                ->addChromiumArguments(['no-sandbox', 'disable-dev-shm-usage', 'disable-gpu'])
                ->format('A4')
                ->margins(0, 0, 0, 0)
                ->showBackground()
                ->waitUntilNetworkIdle()
                ->pdf();

            return response($pdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="mahnung-drivable-' . $mahnung->mahnung_number . '.pdf"',
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Fehler beim Generieren der PDF: ' . $e->getMessage()
            ], 500);
        }
    }
}
