<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use App\Models\Order;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    /**
     * Powers the Order Management table: search by order code/customer name,
     * filter by status, and the Overview's "orders needing assignment" list
     * (via ?status=pending).
     */
    public function index(Request $request)
    {
        $query = Order::query()->with(['customer', 'service', 'rider']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('order_code', 'like', "%{$term}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$term}%"));
            });
        }

        return response()->json(
            $query->latest()->paginate($request->integer('per_page', 20))
        );
    }

    public function show(Order $order)
    {
        $order->load(['customer', 'service', 'rider', 'payment', 'statusHistory']);

        return response()->json($order);
    }

    /**
     * Assigns a rider to a pending order — powers both the Overview's
     * quick "Assign" buttons and the dedicated Assignment page.
     */
    public function assign(Request $request, Order $order)
    {
        $request->validate([
            'rider_id' => ['required', 'exists:users,id'],
        ]);

        $order->update([
            'rider_id' => $request->rider_id,
            'status' => Order::STATUS_CONFIRMED,
        ]);

        $order->recordStatus(Order::STATUS_CONFIRMED, 'Rider assigned by admin', $request->user()->id);

        IntegrationLog::record(
            type: 'API',
            source: 'Admin Panel',
            event: 'order_assigned',
            status: 'success',
            referenceId: $order->order_code,
            httpStatus: 200,
            message: 'Rider assigned to order',
        );

        return response()->json($order->fresh(['rider']));
    }
}
