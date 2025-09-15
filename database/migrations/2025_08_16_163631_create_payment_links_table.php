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
        Schema::create('payment_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('renter_id');
            $table->string('stripe_payment_link_id')->unique();
            $table->string('stripe_url');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('description')->nullable();
            $table->text('admin_note')->nullable();
            $table->boolean('active')->default(true);
            $table->boolean('email_sent')->default(false);
            $table->timestamp('email_sent_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->json('stripe_metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_links');
    }
};
