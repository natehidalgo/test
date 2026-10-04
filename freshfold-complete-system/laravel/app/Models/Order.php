<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_PICKED_UP = 'picked_up';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_OUT_FOR_DELIVERY = 'out_for_delivery';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_PAYMENT_FAILED = 'payment_failed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'order_code',
        'customer_id',
        'service_id',
        'rider_id',
        'pickup_address',
        'pickup_schedule',
        'delivery_schedule',
        'load_estimate',
        'status',
        'total_amount',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'pickup_schedule' => 'datetime',
            'delivery_schedule' => 'datetime',
            'load_estimate' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    /**
     * Lets routes like /api/rider/tasks/{order} resolve using the public
     * order_code (e.g. ORD-20260910-0007) instead of the numeric id.
     */
    public function getRouteKeyName(): string
    {
        return 'order_code';
    }

    // Relationships

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function rider()
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    public function statusHistory()
    {
        return $this->hasMany(OrderStatusHistory::class)->latest('updated_at');
    }

    public function notifications()
    {
        return $this->hasMany(NotificationLog::class);
    }

    // Helpers

    public static function generateOrderCode(): string
    {
        return 'ORD-' . now()->format('Ymd') . '-' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    public function recordStatus(string $status, ?string $remarks = null, ?int $updatedBy = null): void
    {
        $this->statusHistory()->create([
            'status' => $status,
            'remarks' => $remarks,
            'updated_by' => $updatedBy,
            'updated_at' => now(),
        ]);

        $this->update(['status' => $status]);
    }
}
