<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Shared by both Customer Management (?role=customer) and
     * Staff & Rider Management (?role=staff or ?role=rider), since the
     * two pages differ only in which role they list and what extra
     * columns (order count vs. active task count) they show.
     */
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        } else {
            $query->whereIn('role', ['staff', 'rider']);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%");
            });
        }

        $query->withCount([
            'ordersAsCustomer as orders_count',
            'ordersAsRider as active_tasks_count' => fn ($q) => $q->whereNotIn('status', ['delivered', 'cancelled']),
        ])->withSum('ordersAsCustomer as total_spent', 'total_amount');

        return response()->json($query->get());
    }

    public function updateStatus(Request $request, User $user)
    {
        $request->validate([
            'status' => ['required', Rule::in(['active', 'suspended'])],
        ]);

        $user->update(['status' => $request->status]);

        return response()->json($user);
    }
}
