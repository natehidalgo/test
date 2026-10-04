<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;

class AdminAssignmentController extends Controller
{
    /**
     * Powers the Assignment page: unassigned orders on one side, rider
     * availability (with their current active task count) on the other.
     */
    public function index()
    {
        $unassignedOrders = Order::with('service')
            ->where('status', Order::STATUS_PENDING)
            ->whereNull('rider_id')
            ->orderBy('pickup_schedule')
            ->get();

        $riders = User::where('role', 'rider')
            ->where('status', 'active')
            ->withCount([
                'ordersAsRider as active_tasks_count' => function ($q) {
                    $q->whereNotIn('status', ['delivered', 'cancelled']);
                },
            ])
            ->get(['id', 'name']);

        return response()->json([
            'unassigned_orders' => $unassignedOrders,
            'riders' => $riders,
        ]);
    }
}
