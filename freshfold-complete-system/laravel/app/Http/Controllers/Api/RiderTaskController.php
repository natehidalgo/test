<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Jobs\SendOrderNotification;
use App\Models\IntegrationLog;
use App\Models\Order;
use Illuminate\Http\Request;

class RiderTaskController extends Controller
{
    /**
     * Today's assigned tasks for the authenticated rider.
     * Powers the Tasks Dashboard. A "task" here is really an order the rider
     * is on the hook for — its current status decides whether it shows as a
     * pickup still to do, a delivery still to do, or already completed today.
     */
    public function index(Request $request)
    {
        $orders = $request->user()
            ->ordersAsRider()
            ->with(['service', 'customer'])
            ->whereIn('status', ['confirmed', 'picked_up', 'processing', 'out_for_delivery', 'delivered'])
            ->whereDate('pickup_schedule', today())
            ->orderBy('pickup_schedule')
            ->get()
            ->map(fn (Order $order) => $this->toTaskPayload($order));

        return response()->json($orders);
    }

    /**
     * Single task detail — powers the Task Detail / Status Update screen.
     */
    public function show(Request $request, Order $order)
    {
        $this->authorizeRiderOwnsOrder($request, $order);

        $order->load(['service', 'customer']);

        return response()->json($this->toTaskPayload($order, withCustomerContact: true));
    }

    /**
     * Updates an order's status from the rider app. Maps to the sample
     * "status_update" payload from the Sample Payload section.
     */
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order)
    {
        $this->authorizeRiderOwnsOrder($request, $order);

        if ($request->status_update === 'issue_reported') {
            $order->recordStatus($order->status, $request->remarks, $request->user()->id);

            IntegrationLog::record(
                type: 'API',
                source: 'Rider App',
                event: 'issue_reported',
                status: 'success',
                referenceId: $order->order_code,
                httpStatus: 200,
                message: $request->remarks ?? 'Rider reported an issue',
            );

            return response()->json([
                'order_id' => $order->order_code,
                'order_status' => $order->status,
                'notification_event' => 'issue_reported',
            ]);
        }

        $order->recordStatus($request->status_update, $request->remarks, $request->user()->id);

        IntegrationLog::record(
            type: 'API',
            source: 'Rider App',
            event: 'order_status_update',
            status: 'success',
            referenceId: $order->order_code,
            httpStatus: 200,
            message: 'Status updated to "' . $request->status_update . '"',
        );

        SendOrderNotification::dispatch($order, 'order_status_changed');

        return response()->json([
            'order_id' => $order->order_code,
            'order_status' => $order->status,
            'status_updated_at' => now(),
            'notification_event' => 'order_status_changed',
        ]);
    }

    /**
     * Completed tasks and reported issues — powers Task History.
     */
    public function history(Request $request)
    {
        $orders = $request->user()
            ->ordersAsRider()
            ->with(['service', 'customer', 'statusHistory'])
            ->where(function ($q) {
                $q->where('status', 'delivered')
                    ->orWhereHas('statusHistory', fn ($h) => $h->where('remarks', 'like', '%issue%'));
            })
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Order $order) => $this->toTaskPayload($order));

        return response()->json($orders);
    }

    private function authorizeRiderOwnsOrder(Request $request, Order $order): void
    {
        abort_unless($order->rider_id === $request->user()->id, 403, 'This task is not assigned to you.');
    }

    private function toTaskPayload(Order $order, bool $withCustomerContact = false): array
    {
        $type = in_array($order->status, ['confirmed', 'pending']) ? 'pickup' : 'delivery';

        $payload = [
            'order_id' => $order->order_code,
            'type' => $type,
            'status' => $order->status,
            'service' => $order->service?->name,
            'load_estimate' => $order->load_estimate,
            'address' => $order->pickup_address,
            'pickup_schedule' => $order->pickup_schedule,
            'delivery_schedule' => $order->delivery_schedule,
            'remarks' => $order->remarks,
        ];

        if ($withCustomerContact) {
            $payload['customer'] = [
                'name' => $order->customer?->name,
                'phone' => $order->customer?->phone,
            ];
        }

        return $payload;
    }
}
