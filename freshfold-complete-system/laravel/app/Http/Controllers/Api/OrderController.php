<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * List the authenticated customer's orders.
     * Powers both the Dashboard's "active order" card and the Order History page.
     * Supports ?status=active|completed to match the history page's filter chips.
     */
    public function index(Request $request)
    {
        $query = $request->user()
            ->ordersAsCustomer()
            ->with(['service', 'rider', 'payment'])
            ->latest();

        if ($request->status === 'active') {
            $query->whereNotIn('status', ['delivered', 'cancelled']);
        } elseif ($request->status === 'completed') {
            $query->where('status', 'delivered');
        }

        return response()->json($query->get());
    }

    /**
     * Full detail for one order — powers the Order Tracking page.
     */
    public function show(Request $request, string $orderCode)
    {
        $order = $request->user()
            ->ordersAsCustomer()
            ->with(['service', 'rider', 'payment', 'statusHistory'])
            ->where('order_code', $orderCode)
            ->firstOrFail();

        return response()->json($order);
    }
}
