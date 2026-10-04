<?php

namespace App\Http\Middleware;

use App\Models\IntegrationLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyWebhookSignature
{
    /**
     * Verifies PayMongo's webhook signature.
     * Docs: https://developers.paymongo.com/docs/webhooks#verifying-webhook-source
     *
     * PayMongo sends a `Paymongo-Signature` header shaped like:
     *   t=1700000000,te=461f80129cc327d719...,li=454e9f8a9ca10c0b...
     *
     * - t  = unix timestamp the event was sent
     * - te = HMAC-SHA256 signature to use in TEST mode
     * - li = HMAC-SHA256 signature to use in LIVE mode
     *
     * The signed payload PayMongo actually signs is "{t}.{raw request body}",
     * hashed with your webhook's signing secret (found in the PayMongo
     * Dashboard under Developers > Webhooks, NOT your API secret key).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Paymongo-Signature');
        $secret = config('services.paymongo.webhook_secret');

        if (!$header || !$secret) {
            $this->logRejection($request, 'Missing Paymongo-Signature header or webhook secret not configured');
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $parts = [];
        foreach (explode(',', $header) as $pair) {
            [$key, $value] = array_pad(explode('=', $pair, 2), 2, null);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $isLive = config('services.paymongo.live_mode', false);
        $expectedSignature = $isLive ? ($parts['li'] ?? null) : ($parts['te'] ?? null);

        if (!$timestamp || !$expectedSignature) {
            $this->logRejection($request, 'Webhook signature header missing t or ' . ($isLive ? 'li' : 'te') . ' component');
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $signedPayload = $timestamp . '.' . $request->getContent();
        $computedSignature = hash_hmac('sha256', $signedPayload, $secret);

        if (!hash_equals($computedSignature, $expectedSignature)) {
            $this->logRejection($request, 'Webhook signature mismatch');
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        return $next($request);
    }

    private function logRejection(Request $request, string $message): void
    {
        IntegrationLog::record(
            type: 'Webhook',
            source: 'PayMongo',
            event: $request->input('data.attributes.type', 'unknown'),
            status: 'failed',
            httpStatus: 401,
            message: $message,
        );
    }
}
