<?php

// This file normally already exists in a fresh Laravel install with
// entries for postmark/resend/slack/etc. Add this block to your existing
// config/services.php rather than replacing the whole file.

return [

    // ... keep Laravel's existing entries above this line ...

    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'public_key' => env('PAYMONGO_PUBLIC_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
        'live_mode' => env('PAYMONGO_LIVE_MODE', false),
        // Base URL of the HTML/CSS/JS frontend, used to build the
        // success_url / cancel_url PayMongo redirects back to.
        'frontend_base_url' => env('FRONTEND_BASE_URL', 'http://localhost:5500'),
    ],

];
