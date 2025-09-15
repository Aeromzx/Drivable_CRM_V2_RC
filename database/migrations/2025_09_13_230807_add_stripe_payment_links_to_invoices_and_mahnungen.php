<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add Stripe payment link fields to invoices table
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('stripe_payment_link_id')->nullable()->after('notes');
            $table->text('stripe_payment_link_url')->nullable()->after('stripe_payment_link_id');
        });

        // Add Stripe payment link fields to mahnungen table
        Schema::table('mahnungen', function (Blueprint $table) {
            $table->string('stripe_payment_link_id')->nullable()->after('payment_deadline_days');
            $table->text('stripe_payment_link_url')->nullable()->after('stripe_payment_link_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['stripe_payment_link_id', 'stripe_payment_link_url']);
        });

        Schema::table('mahnungen', function (Blueprint $table) {
            $table->dropColumn(['stripe_payment_link_id', 'stripe_payment_link_url']);
        });
    }
};
