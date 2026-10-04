<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status_update' => [
                'required',
                Rule::in(['picked_up', 'processing', 'out_for_delivery', 'delivered', 'issue_reported']),
            ],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}
