<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PaymentController extends Controller
{
    /**
     * Creates a PayMongo Checkout Session for the given order and returns
     * the hosted checkout_url the frontend should redirect the customer to.
     *
     * PayMongo docs: https://developers.paymongo.com/reference/create-a-checkout-session
     */
    public function initiate(Request $request, Order $order)
    {
        abort_unless($order->customer_id === $request->user()->id, 403, 'This order does not belong to you.');

        if ($order->payment && $order->payment->payment_status === 'paid') {
            return response()->json(['message' => 'This order has already been paid.'], 422);
        }

        $amountInCentavos = (int) round($order->total_amount * 100);
        $frontendBase = config('services.paymongo.frontend_base_url');

        $response = Http::withBasicAuth(config('services.paymongo.secret_key'), '')
            ->post('https://api.paymongo.com/v1/checkout_sessions', [
                'data' => [
                    'attributes' => [
                        'send_email_receipt' => false,
                        'show_description' => true,
                        'show_line_items' => true,
                        'description' => "FreshFold order {$order->order_code}",
                        'reference_number' => $order->order_code,
                        'success_url' => "{$frontendBase}/track.html?order={$order->order_code}&payment=success",
                        'cancel_url' => "{$frontendBase}/book.html?payment=cancelled",
                        'payment_method_types' => ['gcash', 'card', 'paymaya'],
                        'line_items' => [[
                            'currency' => 'PHP',
                            'amount' => $amountInCentavos,
                            'name' => $order->service->name ?? 'Laundry service',
                            'quantity' => 1,
                        ]],
                    ],
                ],
            ]);

        if ($response->failed()) {
            IntegrationLog::record(
                type: 'API',
                source: 'PayMongo',
                event: 'checkout_session_create_failed',
                status: 'failed',
                referenceId: $order->order_code,
                httpStatus: $response->status(),
                message: $response->json('errors.0.detail', 'Could not create checkout session'),
            );

            return response()->json([
                'message' => 'Could not start payment right now. Please try again.',
            ], 502);
        }

        $session = $response->json('data');

        // Reserve a pending payment row keyed to the checkout session id, so
        // the webhook can find it later by reference_id.
        Payment::updateOrCreate(
            ['order_id' => $order->id],
            [
                'reference_id' => $session['id'],
                'amount_paid' => $order->total_amount,
                'payment_method' => null,
                'payment_status' => 'pending',
                'paid_at' => null,
            ]
        );

        IntegrationLog::record(
            type: 'API',
            source: 'PayMongo',
            event: 'checkout_session_created',
            status: 'success',
            referenceId: $session['id'],
            httpStatus: 200,
            message: "Checkout session created for {$order->order_code}",
        );

        return response()->json([
            'checkout_url' => $session['attributes']['checkout_url'],
            'checkout_session_id' => $session['id'],
        ]);
    }
}
