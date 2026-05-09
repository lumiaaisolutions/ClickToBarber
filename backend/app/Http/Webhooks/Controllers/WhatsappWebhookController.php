<?php

declare(strict_types=1);

namespace App\Http\Webhooks\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Appointments\Services\CancelAppointment;
use App\Domain\Appointments\Services\ConfirmAppointment;
use App\Domain\Billing\Models\WebhookEvent;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Webhook Meta Cloud API para WhatsApp.
 *
 * GET  /api/webhooks/whatsapp  → verificación inicial (hub.challenge).
 * POST /api/webhooks/whatsapp  → eventos: mensajes entrantes, status updates,
 *                                respuestas a botones (confirm/reschedule/cancel).
 *
 * NOTA: el GET no se valida con HMAC; usa hub.verify_token contra
 * config('services.meta_whatsapp.webhook_verify_token'). El POST sí pasa por
 * el middleware webhook:meta (X-Hub-Signature-256), pero esta ruta lo permite
 * para ambos métodos — la validación interna decide.
 */
final class WhatsappWebhookController extends Controller
{
    public function __construct(
        private ConfirmAppointment $confirm,
        private CancelAppointment $cancel,
    ) {}

    public function __invoke(Request $request): Response
    {
        if ($request->isMethod('GET')) {
            return $this->handleVerification($request);
        }

        return $this->handleEvent($request);
    }

    private function handleVerification(Request $request): Response
    {
        $mode      = $request->query('hub_mode');
        $token     = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        $expected = (string) config('services.meta_whatsapp.webhook_verify_token');

        if ($mode === 'subscribe' && $expected !== '' && hash_equals($expected, (string) $token)) {
            return response((string) $challenge, 200);
        }

        return response('forbidden', 403);
    }

    private function handleEvent(Request $request): JsonResponse
    {
        $payload = $request->json()->all();

        // Idempotencia: cada `messages[*].id` es único; usamos el primero como event_id.
        $eventId = $this->extractEventId($payload);
        if ($eventId === null) {
            return response()->json(['ok' => true, 'reason' => 'no_event_id']);
        }

        $record = WebhookEvent::query()->firstOrCreate(
            ['provider' => 'meta', 'event_id' => $eventId],
            [
                'event_type'  => 'whatsapp.event',
                'payload'     => $payload,
                'received_at' => now(),
                'status'      => 'pending',
            ],
        );

        if ($record->status === 'processed') {
            return response()->json(['ok' => true, 'idempotent' => true]);
        }

        try {
            $this->processButtonReplies($payload);

            $record->forceFill([
                'status'       => 'processed',
                'processed_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            $record->forceFill([
                'status' => 'failed',
                'error'  => substr($e->getMessage(), 0, 1000),
            ])->save();

            logger()->error('WhatsApp webhook failed', [
                'event_id' => $eventId,
                'error'    => $e->getMessage(),
            ]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Mete-Cloud envía:
     * { entry: [{ changes: [{ value: { messages: [{ button: { payload: "confirm:42" }, from: "5215..." }] } }] }] }
     */
    private function processButtonReplies(array $payload): void
    {
        $entries = $payload['entry'] ?? [];
        foreach ($entries as $entry) {
            foreach (($entry['changes'] ?? []) as $change) {
                $messages = $change['value']['messages'] ?? [];
                foreach ($messages as $msg) {
                    $btnPayload = $msg['button']['payload'] ?? null;
                    if (! $btnPayload || ! is_string($btnPayload)) {
                        continue;
                    }

                    [$action, $appointmentId] = array_pad(explode(':', $btnPayload, 2), 2, null);
                    $appointmentId = (int) $appointmentId;
                    if ($appointmentId <= 0) {
                        continue;
                    }

                    $appointment = Appointment::query()
                        ->withoutGlobalScopes()
                        ->find($appointmentId);

                    if (! $appointment) {
                        continue;
                    }

                    match ($action) {
                        'confirm'    => $this->confirm->execute($appointment->id, 'whatsapp_button'),
                        'cancel'     => $this->cancel->execute($appointment->id, 'cliente canceló por WhatsApp', 'client', false),
                        'reschedule' => null, // El frontend público maneja el reagende; aquí sólo logueamos.
                        default      => null,
                    };
                }
            }
        }
    }

    private function extractEventId(array $payload): ?string
    {
        $first = $payload['entry'][0]['changes'][0]['value']['messages'][0]['id']
            ?? $payload['entry'][0]['changes'][0]['value']['statuses'][0]['id']
            ?? null;

        return is_string($first) ? $first : null;
    }
}
