<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'log_code',
        'integration_type',
        'source',
        'event',
        'reference_id',
        'status',
        'http_status_code',
        'message',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * Convenience method used throughout the app to record an integration
     * event without repeating the create() boilerplate everywhere.
     */
    public static function record(
        string $type,
        string $source,
        string $event,
        string $status,
        ?string $referenceId = null,
        ?int $httpStatus = null,
        ?string $message = null,
    ): self {
        return self::create([
            'log_code' => 'LOG-' . random_int(10000, 99999),
            'integration_type' => $type,
            'source' => $source,
            'event' => $event,
            'reference_id' => $referenceId,
            'status' => $status,
            'http_status_code' => $httpStatus,
            'message' => $message,
            'created_at' => now(),
        ]);
    }
}
