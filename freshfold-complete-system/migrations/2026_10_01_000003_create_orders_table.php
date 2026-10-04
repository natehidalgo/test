<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code')->unique();

            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services');
            $table->foreignId('rider_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('pickup_address');
            $table->dateTime('pickup_schedule');
            $table->dateTime('delivery_schedule')->nullable();
            $table->decimal('load_estimate', 6, 2)->nullable();

            $table->enum('status', [
                'pending',
                'confirmed',
                'picked_up',
                'processing',
                'out_for_delivery',
                'delivered',
                'payment_failed',
                'cancelled',
            ])->default('pending');

            $table->decimal('total_amount', 10, 2)->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
