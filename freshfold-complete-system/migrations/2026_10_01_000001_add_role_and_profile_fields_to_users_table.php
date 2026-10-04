<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Assumes the default Laravel `users` table migration already exists
     * (0001_01_01_000000_create_users_table.php). This migration adds the
     * fields FreshFold needs on top of it: role, phone, and account status.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['customer', 'staff', 'rider', 'admin'])
                ->default('customer')
                ->after('email');
            $table->string('phone')->nullable()->after('role');
            $table->enum('status', ['active', 'suspended'])
                ->default('active')
                ->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'status']);
        });
    }
};
