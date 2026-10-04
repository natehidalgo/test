<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendOrderNotification;
use App\Models\IntegrationLog;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    /**
     * Handles PayMongo webhook events for the Checkout Session flow.
     * Docs: https://developers.paymongo.com/docs/webhooks
     *
     * Real payload shape (trimmed to what we use):
     * {
     *   "data": {
     *     "id": "evt_xxx",
     *     "attributes": {
     *       "type": "checkout_session.payment.paid",
     *       "data": {
     *         "id": "cs_xxx",                         // checkout session id
     *         "attributes": {
     *           "reference_number": "ORD-20260910-0007",
     *           "payments": [
     *             { "id": "pay_xxx", "attributes": { "amount": 38250, "source": { "type": "gcash" }, "status": "paid" } }
     *           ]
     *         }
     *       }
     *     }
     *   }
     * }
     */
    public function paymongo(Request $request)
    {
        $eventType = $request->input('data.attributes.type');
        $session = $request->input('data.attributes.data', []);
        $sessionId = $session['id'] ?? null;
        $referenceNumber = $session['attributes']['reference_number'] ?? null;
        $payments = $session['attributes']['payments'] ?? [];
        $firstPayment = $payments[0] ?? null;

        if (!$sessionId || !$referenceNumber) {
            IntegrationLog::record(
                type: 'Webhook',
                source: 'PayMongo',
                event: $eventType ?? 'unknown',
                status: 'failed',
                httpStatus: 400,
                message: 'Webhook payload missing checkout session id or reference_number',
            );

            return response()->json(['message' => 'Malformed webhook payload.'], 400);
        }

        $order = Order::where('order_code', $referenceNumber)->first();

        if (!$order) {
            IntegrationLog::record(
                type: 'Webhook',
                source: 'PayMongo',
                event: $eventType,
                status: 'failed',
                referenceId: $referenceNumber,
                httpStatus: 404,
                message: "order_id {$referenceNumber} does not exist",
            );

            return response()->json(['message' => 'Unknown order reference_number.'], 404);
        }

        $payment = Payment::where('order_id', $order->id)->first();

        // Duplicate event guard — PayMongo retries undelivered webhooks.
        if ($payment && $payment->payment_status === 'paid') {
            IntegrationLog::record(
                type: 'Webhook',
                source: 'PayMongo',
                event: $eventType,
                status: 'failed',
                referenceId: $sessionId,
                httpStatus: 409,
                message: "Duplicate webhook event; {$referenceNumber} already processed",
            );

            return response()->json([
                'status' => 'acknowledged',
                'message' => "Order {$referenceNumber} already processed. No action taken.",
            ]);
        }

        if ($eventType === 'checkout_session.payment.paid' && $firstPayment) {
            $amountPaid = ($firstPayment['attributes']['amount'] ?? 0) / 100;
            $method = $firstPayment['attributes']['source']['type'] ?? null;

            $payment?->update([
                'reference_id' => $firstPayment['id'],
                'amount_paid' => $amountPaid,
                'payment_method' => $method,
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]) ?? Payment::create([
                'order_id' => $order->id,
                'reference_id' => $firstPayment['id'],
                'amount_paid' => $amountPaid,
                'payment_method' => $method,
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);

            $order->recordStatus(Order::STATUS_CONFIRMED, 'Payment confirmed via PayMongo webhook');
            SendOrderNotification::dispatch($order, 'booking_confirmed');

            IntegrationLog::record(
                type: 'Webhook',
                source: 'PayMongo',
                event: $eventType,
                status: 'success',
                referenceId: $firstPayment['id'],
                httpStatus: 200,
                message: 'Payment confirmed and order updated',
            );

            return response()->json([
                'order_id' => $order->order_code,
                'order_status' => $order->status,
                'payment_reference' => $firstPayment['id'],
                'notification_event' => 'booking_confirmed',
            ]);
        }

        if (in_array($eventType, ['checkout_session.payment.failed', 'payment.failed'], true)) {
            $payment?->update(['payment_status' => 'failed']);
            $order->recordStatus(Order::STATUS_PAYMENT_FAILED, 'Payment declined by PayMongo');
            SendOrderNotification::dispatch($order, 'payment_failed');

            IntegrationLog::record(
                type: 'Webhook',
                source: 'PayMongo',
                event: $eventType,
                status: 'failed',
                referenceId: $sessionId,
                httpStatus: 200,
                message: 'Payment declined by provider; order marked "Payment Failed"',
            );

            return response()->json(['order_id' => $order->order_code, 'order_status' => $order->status]);
        }

        // Any other event type we don't act on yet (e.g. checkout_session.expired) —
        // acknowledge so PayMongo doesn't keep retrying, but log it for visibility.
        IntegrationLog::record(
            type: 'Webhook',
            source: 'PayMongo',
            event: $eventType ?? 'unknown',
            status: 'success',
            referenceId: $sessionId,
            httpStatus: 200,
            message: 'Event received but not acted on',
        );

        return response()->json(['status' => 'acknowledged']);
    }
}
