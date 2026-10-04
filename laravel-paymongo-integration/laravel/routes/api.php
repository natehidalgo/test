<?php

use App\Http\Controllers\Api\Admin\AdminAssignmentController;
use App\Http\Controllers\Api\Admin\AdminLogController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminPaymentController;
use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminServiceController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RiderTaskController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Stage 1 — Auth routes
|--------------------------------------------------------------------------
*/

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    /*
    |----------------------------------------------------------------------
    | Stage 2 — Customer routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:customer')->group(function () {
        Route::post('/bookings', [BookingController::class, 'store']);
        Route::post('/orders/{order}/pay', [PaymentController::class, 'initiate']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{orderCode}', [OrderController::class, 'show']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    });

    /*
    |----------------------------------------------------------------------
    | Stage 3 — Rider routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:rider')->prefix('rider')->group(function () {
        Route::get('/tasks', [RiderTaskController::class, 'index']);
        Route::get('/tasks/history', [RiderTaskController::class, 'history']);
        Route::get('/tasks/{order}', [RiderTaskController::class, 'show']);
        Route::patch('/tasks/{order}/status', [RiderTaskController::class, 'updateStatus']);
    });

    /*
    |----------------------------------------------------------------------
    | Stage 4 — Admin routes
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('orders', [AdminOrderController::class, 'index']);
        Route::get('orders/{order}', [AdminOrderController::class, 'show']);
        Route::patch('orders/{order}/assign', [AdminOrderController::class, 'assign']);

        Route::get('assignment', [AdminAssignmentController::class, 'index']);

        Route::get('users', [AdminUserController::class, 'index']);
        Route::patch('users/{user}/status', [AdminUserController::class, 'updateStatus']);

        Route::get('services', [AdminServiceController::class, 'index']);
        Route::post('services', [AdminServiceController::class, 'store']);
        Route::patch('services/{service}', [AdminServiceController::class, 'update']);

        Route::get('payments', [AdminPaymentController::class, 'index']);
        Route::get('logs', [AdminLogController::class, 'index']);
        Route::get('reports', [AdminReportController::class, 'index']);
    });
});

/*
|--------------------------------------------------------------------------
| Stage 5 — Webhook (no auth — verified by signature instead)
|--------------------------------------------------------------------------
*/
Route::post('/webhooks/paymongo', [WebhookController::class, 'paymongo'])
    ->middleware('verify.webhook');
