<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();

            $table->enum('channel', ['sms', 'email', 'in_app']);
            $table->string('event');
            $table->string('recipient');
            $table->enum('status', ['sent', 'failed', 'retrying'])->default('sent');
            $table->unsignedTinyInteger('attempts')->default(1);
            $table->dateTime('sent_at')->nullable();

            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications_log');
    }
};
