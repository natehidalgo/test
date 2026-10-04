<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookingRequest;
use App\Jobs\SendOrderNotification;
use App\Models\IntegrationLog;
use App\Models\Order;
use App\Models\Service;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function store(StoreBookingRequest $request)
    {
        $service = Service::findOrFail($request->service_id);
        $loadEstimate = $request->load_estimate ?? 1;
        $estimatedTotal = round($service->rate_per_kg * $loadEstimate, 2);

        $order = DB::transaction(function () use ($request, $service, $loadEstimate, $estimatedTotal) {
            $order = Order::create([
                'order_code' => Order::generateOrderCode(),
                'customer_id' => $request->user()->id,
                'service_id' => $service->id,
                'pickup_address' => $request->pickup_address,
                'pickup_schedule' => $request->pickup_schedule,
                'delivery_schedule' => $request->delivery_schedule,
                'load_estimate' => $loadEstimate,
                'status' => Order::STATUS_PENDING,
                'total_amount' => $estimatedTotal,
                'remarks' => $request->remarks,
            ]);

            $order->recordStatus(Order::STATUS_PENDING, 'Booking submitted by customer', $request->user()->id);

            return $order;
        });

        IntegrationLog::record(
            type: 'API',
            source: 'Customer App',
            event: 'booking_created',
            status: 'success',
            referenceId: $order->order_code,
            httpStatus: 201,
            message: 'Booking successfully created',
        );

        SendOrderNotification::dispatch($order, 'booking_created');

        return response()->json([
            'order_id' => $order->order_code,
            'order_status' => $order->status,
            'created_at' => $order->created_at,
            'estimated_price' => $order->total_amount,
        ], 201);
    }
}
