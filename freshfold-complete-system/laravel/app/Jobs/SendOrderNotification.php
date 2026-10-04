<?php

namespace App\Jobs;

use App\Models\IntegrationLog;
use App\Models\NotificationLog;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendOrderNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Matches the Validation & Error Handling section: retry up to 3 times
     * with backoff before marking a notification undelivered.
     */
    public int $tries = 3;

    public array $backoff = [10, 30, 60]; // seconds between attempts

    public function __construct(
        public Order $order,
        public string $event,
    ) {}

    public function handle(): void
    {
        $order->loadMissing('customer');
        $recipient = $this->order->customer->phone ?? $this->order->customer->email ?? null;

        if (!$recipient) {
            $this->logOutcome('failed', 0, 'No recipient phone/email on file for this customer');
            return;
        }

        try {
            // Swap this for a real SMS/email provider call, e.g.:
            //   Notification::route('vonage', $recipient)->notify(new OrderStatusNotification($this->order));
            // Left as a stub here since no provider is wired up yet.
            $this->sendViaProvider($recipient);

            NotificationLog::create([
                'order_id' => $this->order->id,
                'channel' => 'sms',
                'event' => $this->event,
                'recipient' => $recipient,
                'status' => 'sent',
                'attempts' => $this->attempts(),
                'sent_at' => now(),
            ]);

            $this->logOutcome('success', 200, $this->messageFor($this->event));
        } catch (\Throwable $e) {
            if ($this->attempts() >= $this->tries) {
                NotificationLog::create([
                    'order_id' => $this->order->id,
                    'channel' => 'sms',
                    'event' => $this->event,
                    'recipient' => $recipient,
                    'status' => 'failed',
                    'attempts' => $this->attempts(),
                ]);

                $this->logOutcome('failed', 503, 'SMS provider timeout; retries exhausted');
            } else {
                $this->logOutcome(
                    'failed',
                    503,
                    "SMS provider timeout; retry scheduled (attempt {$this->attempts()} of {$this->tries})"
                );

                $this->release($this->backoff[$this->attempts() - 1] ?? 60);
            }
        }
    }

    /**
     * Placeholder for the actual provider call. Throws to simulate the
     * retry path being exercised — replace with a real HTTP call once a
     * provider (e.g. Semaphore, Twilio) is chosen.
     */
    private function sendViaProvider(string $recipient): void
    {
        // Intentionally left as a stub.
    }

    private function messageFor(string $event): string
    {
        return match ($event) {
            'booking_created' => 'Booking confirmation sent to customer',
            'booking_confirmed' => 'SMS notification sent to customer',
            'order_status_changed' => 'Customer notified of status change',
            'payment_failed' => 'Customer notified of failed payment',
            default => 'Notification sent to customer',
        };
    }

    private function logOutcome(string $status, int $httpStatus, string $message): void
    {
        IntegrationLog::record(
            type: 'Messaging',
            source: 'Notification Service',
            event: $this->event,
            status: $status,
            referenceId: $this->order->order_code,
            httpStatus: $httpStatus,
            message: $message,
        );
    }
}
