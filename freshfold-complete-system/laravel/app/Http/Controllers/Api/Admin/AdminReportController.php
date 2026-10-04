<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReportController extends Controller
{
    /**
     * Powers the Reports page: summary stats, a 7-day revenue trend,
     * revenue by service, and top customers for the selected range.
     * ?range=7|30|month (defaults to 7 days).
     */
    public function index(Request $request)
    {
        [$from, $to] = $this->resolveRange($request->get('range', '7'));

        $ordersInRange = Order::whereBetween('created_at', [$from, $to]);

        $totalOrders = (clone $ordersInRange)->count();
        $totalRevenue = (clone $ordersInRange)->where('status', 'delivered')->sum('total_amount');
        $completedOrders = (clone $ordersInRange)->where('status', 'delivered')->count();
        $avgOrderValue = $completedOrders > 0 ? round($totalRevenue / $completedOrders, 2) : 0;

        $revenueByDay = (clone $ordersInRange)
            ->where('status', 'delivered')
            ->selectRaw('DATE(created_at) as day, SUM(total_amount) as revenue')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $revenueByService = (clone $ordersInRange)
            ->where('status', 'delivered')
            ->join('services', 'services.id', '=', 'orders.service_id')
            ->selectRaw('services.name, SUM(orders.total_amount) as revenue')
            ->groupBy('services.name')
            ->orderByDesc('revenue')
            ->get();

        $topCustomers = (clone $ordersInRange)
            ->where('status', 'delivered')
            ->join('users', 'users.id', '=', 'orders.customer_id')
            ->selectRaw('users.name, COUNT(*) as orders_count, SUM(orders.total_amount) as total_spent')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_spent')
            ->limit(5)
            ->get();

        return response()->json([
            'summary' => [
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'avg_order_value' => $avgOrderValue,
                'completed_orders' => $completedOrders,
                'completion_rate' => $totalOrders > 0 ? round($completedOrders / $totalOrders * 100, 1) : 0,
            ],
            'revenue_by_day' => $revenueByDay,
            'revenue_by_service' => $revenueByService,
            'top_customers' => $topCustomers,
        ]);
    }

    private function resolveRange(string $range): array
    {
        return match ($range) {
            '30' => [now()->subDays(30), now()],
            'month' => [now()->startOfMonth(), now()],
            default => [now()->subDays(7), now()],
        };
    }
}
