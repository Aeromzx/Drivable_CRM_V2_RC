<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Mahnung;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function handleWebhook(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $endpointSecret = config('services.stripe.webhook.secret');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\UnexpectedValueException $e) {
            // Invalid payload
            Log::error('Invalid payload in Stripe webhook: ' . $e->getMessage());
            return response('Invalid payload', 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            // Invalid signature
            Log::error('Invalid signature in Stripe webhook: ' . $e->getMessage());
            return response('Invalid signature', 400);
        }

        // Handle the event
        switch ($event->type) {
            case 'checkout.session.completed':
                $this->handlePaymentCompleted($event->data->object);
                break;
            
            case 'payment_intent.succeeded':
                $this->handlePaymentSucceeded($event->data->object);
                break;

            default:
                Log::info('Received unknown Stripe webhook event type: ' . $event->type);
        }

        return response('Webhook handled', 200);
    }

    private function handlePaymentCompleted($session)
    {
        Log::info('Payment completed for session: ' . $session->id, ['session' => $session]);

        // Extract metadata to identify invoice or mahnung
        $metadata = $session->metadata ?? [];
        
        if (isset($metadata['invoice_id'])) {
            $this->markInvoiceAsPaid($metadata['invoice_id']);
        } elseif (isset($metadata['mahnung_id'])) {
            $this->markMahnungAsPaid($metadata['mahnung_id']);
        }
    }

    private function handlePaymentSucceeded($paymentIntent)
    {
        Log::info('Payment succeeded for payment intent: ' . $paymentIntent->id, ['payment_intent' => $paymentIntent]);

        // Extract metadata to identify invoice or mahnung
        $metadata = $paymentIntent->metadata ?? [];
        
        if (isset($metadata['invoice_id'])) {
            $this->markInvoiceAsPaid($metadata['invoice_id']);
        } elseif (isset($metadata['mahnung_id'])) {
            $this->markMahnungAsPaid($metadata['mahnung_id']);
        }
    }

    private function markInvoiceAsPaid($invoiceId)
    {
        try {
            $invoice = Invoice::find($invoiceId);
            if (!$invoice) {
                Log::error('Invoice not found for payment: ' . $invoiceId);
                return;
            }

            $invoice->status = Invoice::STATUS_PAID;
            $invoice->paid_date = now();
            $invoice->save();

            // Update mahnung status
            $invoice->updateMahnungStatus();

            Log::info('Invoice marked as paid: ' . $invoice->invoice_number);
        } catch (\Exception $e) {
            Log::error('Error marking invoice as paid: ' . $e->getMessage(), ['invoice_id' => $invoiceId]);
        }
    }

    private function markMahnungAsPaid($mahnungId)
    {
        try {
            $mahnung = Mahnung::with('invoice')->find($mahnungId);
            if (!$mahnung) {
                Log::error('Mahnung not found for payment: ' . $mahnungId);
                return;
            }

            // Mark mahnung as paid
            $mahnung->status = Mahnung::STATUS_PAID;
            $mahnung->save();

            // Also mark the invoice as paid
            $invoice = $mahnung->invoice;
            $invoice->status = Invoice::STATUS_PAID;
            $invoice->paid_date = now();
            $invoice->save();

            // Update mahnung status
            $invoice->updateMahnungStatus();

            // Mark all other mahnungen for this invoice as paid
            Mahnung::where('invoice_id', $invoice->id)
                  ->where('id', '!=', $mahnung->id)
                  ->update(['status' => Mahnung::STATUS_PAID]);

            Log::info('Mahnung and invoice marked as paid: ' . $mahnung->mahnung_number);
        } catch (\Exception $e) {
            Log::error('Error marking mahnung as paid: ' . $e->getMessage(), ['mahnung_id' => $mahnungId]);
        }
    }
}