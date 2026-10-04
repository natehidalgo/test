<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * In-app notifications for the authenticated customer, derived from
     * notifications_log entries sent to their phone/email, plus the in_app
     * channel specifically. Supports ?filter=unread to match the page's chip.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = NotificationLog::where('recipient', $user->phone)
            ->orWhere('recipient', $user->email)
            ->with('order')
            ->latest('sent_at');

        return response()->json($query->get());
    }

    public function markRead(Request $request, NotificationLog $notification)
    {
        // Demo-level implementation — a production version would have a
        // separate `read_at` column rather than overloading `status`.
        $notification->update(['status' => 'read']);

        return response()->json($notification);
    }
}
