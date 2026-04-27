<?php

declare(strict_types=1);

namespace App\Http\Client\Controllers;

use App\Domain\Appointments\Exceptions\SlotAlreadyBooked;
use App\Domain\Appointments\Services\BookAppointment;
use App\Http\Client\Requests\BookAppointmentRequest;
use App\Http\Client\Resources\AppointmentResource;

final class BookAppointmentController
{
    public function __construct(private BookAppointment $book) {}

    public function __invoke(BookAppointmentRequest $request)
    {
        try {
            $appointment = $this->book->execute($request->toDto());
        } catch (SlotAlreadyBooked $e) {
            return response()->json([
                'error'   => 'slot_taken',
                'message' => $e->getMessage(),
            ], 409);
        }

        return (new AppointmentResource($appointment))
            ->response()
            ->setStatusCode(201);
    }
}
