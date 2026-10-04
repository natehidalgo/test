<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntegrationLog;
use Illuminate\Http\Request;

class AdminLogController extends Controller
{
    /**
     * Powers both the full Integration Logs page (?status / ?type filters,
     * ?search) and the Overview's "Flagged records" card (?status=failed).
     */
    public function index(Request $request)
    {
        $query = IntegrationLog::query();

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('integration_type', $request->type);
        }

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('log_code', 'like', "%{$term}%")
                    ->orWhere('reference_id', 'like', "%{$term}%")
                    ->orWhere('message', 'like', "%{$term}%");
            });
        }

        return response()->json(
            $query->latest('created_at')->paginate($request->integer('per_page', 30))
        );
    }
}
