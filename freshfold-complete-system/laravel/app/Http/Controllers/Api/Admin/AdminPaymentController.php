<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;

class AdminPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with('order.customer');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('payment_status', $request->status);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('reference_id', 'like', "%{$term}%")
                    ->orWhereHas('order', fn ($o) => $o->where('order_code', 'like', "%{$term}%")
                        ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$term}%")));
            });
        }

        $payments = $query->latest()->paginate($request->integer('per_page', 20));

        return response()->json([
            'payments' => $payments,
            'summary' => [
                'collected_today' => Payment::where('payment_status', 'paid')
                    ->whereDate('paid_at', today())->sum('amount_paid'),
                'paid_count' => Payment::where('payment_status', 'paid')->count(),
                'failed_count' => Payment::where('payment_status', 'failed')->count(),
                'refunded_amount' => Payment::where('payment_status', 'refunded')->sum('amount_paid'),
            ],
        ]);
    }
}
