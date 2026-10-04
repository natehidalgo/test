<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'service_id' => ['required', 'exists:services,id'],
            'pickup_address' => ['required', 'string', 'max:255'],
            'pickup_schedule' => ['required', 'date', 'after:now'],
            'delivery_schedule' => ['nullable', 'date', 'after:pickup_schedule'],
            'load_estimate' => ['nullable', 'numeric', 'min:0.5', 'max:50'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'service_id.exists' => 'That service type is not available.',
            'pickup_schedule.after' => 'Pickup schedule must be in the future.',
        ];
    }
}
