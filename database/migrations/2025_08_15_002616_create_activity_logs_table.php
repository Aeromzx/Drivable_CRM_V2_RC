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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('action'); // 'created', 'updated', 'deleted', 'viewed', etc.
            $table->string('resource_type'); // 'Vermieter', 'Car', 'User', etc.
            $table->unsignedBigInteger('resource_id')->nullable(); // ID of affected resource
            $table->string('resource_name')->nullable(); // Human readable name
            $table->text('description'); // "Vermieter XY wurde verifiziert"
            $table->json('old_values')->nullable(); // Previous values for updates
            $table->json('new_values')->nullable(); // New values for updates
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
            $table->index(['resource_type', 'resource_id']);
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
