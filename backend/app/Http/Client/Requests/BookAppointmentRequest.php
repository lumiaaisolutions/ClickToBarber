<?php

declare(strict_types=1);

namespace App\Http\Client\Requests;

use App\Domain\Appointments\DTOs\BookAppointmentInput;
use App\Domain\Tenancy\CurrentTenant;
use Illuminate\Foundation\Http\FormRequest;

final class BookAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'barber_id'    => ['required', 'integer', 'exists:barbers,id'],
            'service_id'   => ['required', 'integer', 'exists:services,id'],
            'starts_at'    => ['required', 'date', 'after:now'],
            'client_name'  => ['required', 'string', 'max:120'],
            'client_email' => ['required', 'email', 'max:160'],
            'client_phone' => ['required', 'string', 'min:8', 'max:30'],
            'notes'        => ['nullable', 'string', 'max:500'],
            'referral_code' => ['nullable', 'string', 'max:24'],
        ];
    }

    public function toDto(): BookAppointmentInput
    {
        $tenant = app(CurrentTenant::class)->require();

        return new BookAppointmentInput(
            tenantId:     $tenant->id,
            barberId:     (int) $this->input('barber_id'),
            serviceId:    (int) $this->input('service_id'),
            clientName:   $this->string('client_name')->toString(),
            clientEmail:  $this->string('client_email')->toString(),
            clientPhone:  $this->string('client_phone')->toString(),
            startsAt:     $this->string('starts_at')->toString(),
            notes:        $this->input('notes'),
            referralCode: $this->input('referral_code'),
        );
    }
}
