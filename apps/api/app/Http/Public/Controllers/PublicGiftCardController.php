<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Memberships\Models\GiftCard;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Compra pública de gift cards.
 *
 *  POST /api/public/giftcards/{slug}/checkout
 *  GET  /api/public/giftcards/{slug}/{code}
 *
 * En modo mock (dev) la gift card se crea inmediatamente y se notifica al
 * destinatario. En modo Stripe real, esta capa devuelve la URL de Stripe
 * Checkout (mode=payment) con metadata {purpose: gift_card, ...}; la gift
 * card final se materializa en el webhook checkout.session.completed.
 */
final class PublicGiftCardController extends Controller
{
    public function checkout(Request $request, string $slug): JsonResponse
    {
        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->first();
        if (! $tenant) return response()->json(['error' => 'tenant_not_found'], 404);

        $data = $request->validate([
            'value_cents'     => ['required', 'integer', 'min:5000', 'max:5000000'], // 50 - 50,000 MXN
            'sender_name'     => ['required', 'string', 'max:120'],
            'sender_email'    => ['required', 'email', 'max:255'],
            'recipient_name'  => ['required', 'string', 'max:120'],
            'recipient_email' => ['required', 'email', 'max:255'],
            'message'         => ['nullable', 'string', 'max:500'],
        ]);

        $driver = config('services.stripe.driver', env('STRIPE_DRIVER', 'mock'));
        $isMock = $driver === 'mock' || ! config('services.stripe.secret');
        $frontend = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $successUrl = "{$frontend}/b/{$slug}/gift/success";
        $cancelUrl  = "{$frontend}/b/{$slug}/gift?cancelled=1";

        if ($isMock) {
            $card = $this->createCard($tenant->id, $data, balanceImmediate: true);
            $this->emailRecipient($tenant->name, $card, $data);
            return response()->json([
                'session_id' => 'cs_mock_gift_' . $card->code,
                'url'        => "{$successUrl}?code={$card->code}&mock=1",
                'gift_code'  => $card->code,
            ]);
        }

        // Real Stripe Checkout (mode=payment). El webhook crea la GiftCard
        // y dispara el email cuando recibimos checkout.session.completed.
        $secret = (string) config('services.stripe.secret');
        $response = \Illuminate\Support\Facades\Http::asForm()
            ->withBasicAuth($secret, '')
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode'                  => 'payment',
                'success_url'           => $successUrl . '?code={CHECKOUT_SESSION_ID}',
                'cancel_url'            => $cancelUrl,
                'customer_email'        => $data['sender_email'],
                'line_items[0][price_data][currency]'      => 'mxn',
                'line_items[0][price_data][unit_amount]'   => $data['value_cents'],
                'line_items[0][price_data][product_data][name]' => "Gift card · {$tenant->name}",
                'line_items[0][quantity]' => 1,
                'metadata[purpose]'         => 'gift_card',
                'metadata[tenant_id]'       => $tenant->id,
                'metadata[tenant_slug]'     => $slug,
                'metadata[recipient_email]' => $data['recipient_email'],
                'metadata[recipient_name]'  => $data['recipient_name'],
                'metadata[sender_name]'     => $data['sender_name'],
                'metadata[message]'         => substr($data['message'] ?? '', 0, 250),
            ]);

        if ($response->failed()) {
            logger()->warning('Stripe gift checkout failed', ['body' => $response->body()]);
            return response()->json(['error' => 'stripe_failed'], 502);
        }
        $body = $response->json();
        return response()->json([
            'session_id' => (string) ($body['id'] ?? ''),
            'url'        => (string) ($body['url'] ?? ''),
        ]);
    }

    public function lookup(string $slug, string $code): JsonResponse
    {
        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', $slug)->first();
        if (! $tenant) return response()->json(['error' => 'tenant_not_found'], 404);

        $gc = GiftCard::query()->where('tenant_id', $tenant->id)->where('code', $code)->first();
        if (! $gc) return response()->json(['error' => 'not_found'], 404);

        return response()->json([
            'code'             => $gc->code,
            'value_cents'      => $gc->value_cents,
            'balance_cents'    => $gc->balance_cents,
            'currency'         => $gc->currency,
            'recipient_name'   => $gc->recipient_name,
            'expires_at'       => $gc->expires_at?->toIso8601String(),
            'usable'           => $gc->isUsable(),
        ]);
    }

    private function createCard(string $tenantId, array $data, bool $balanceImmediate): GiftCard
    {
        return GiftCard::create([
            'tenant_id'       => $tenantId,
            'code'            => GiftCard::newCode(),
            'value_cents'     => $data['value_cents'],
            'balance_cents'   => $balanceImmediate ? $data['value_cents'] : 0,
            'currency'        => 'MXN',
            'recipient_email' => $data['recipient_email'],
            'recipient_name'  => $data['recipient_name'],
            'message'         => $data['message'] ?? null,
            'expires_at'      => now()->addYear(),
        ]);
    }

    private function emailRecipient(string $tenantName, GiftCard $card, array $data): void
    {
        try {
            $value = '$' . number_format($card->value_cents / 100, 0);
            $expires = $card->expires_at?->format('d/m/Y') ?? 'sin fecha límite';
            $msg = $data['message'] ?? '';

            Mail::raw(
                "{$data['sender_name']} te regaló una gift card de {$tenantName}.\n\n"
                . "Código:  {$card->code}\n"
                . "Monto:   {$value} {$card->currency}\n"
                . "Vence:   {$expires}\n\n"
                . ($msg !== '' ? "Mensaje: {$msg}\n\n" : '')
                . "Úsala al pagar tu próxima visita.",
                fn ($m) => $m->to($data['recipient_email'], $data['recipient_name'])
                    ->subject("Tienes una gift card de {$tenantName}"),
            );
        } catch (\Throwable $e) {
            logger()->warning('Gift card email failed', ['err' => $e->getMessage()]);
        }
    }
}
