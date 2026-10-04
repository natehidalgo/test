<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_logs', function (Blueprint $table) {
            $table->id();
            $table->string('log_code')->unique(); // e.g. LOG-10231

            $table->enum('integration_type', ['API', 'Webhook', 'Messaging']);
            $table->string('source'); // e.g. Customer App, Payment Gateway, Rider App
            $table->string('event');  // e.g. booking_created, payment.success
            $table->string('reference_id')->nullable();

            $table->enum('status', ['success', 'failed']);
            $table->unsignedSmallInteger('http_status_code')->nullable();
            $table->text('message')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['status', 'integration_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
    }
};
