<?php

declare(strict_types=1);

namespace App\Http\Webhooks\Controllers;

use App\Domain\Billing\Actions\ProvisionTenant;
use App\Domain\Billing\Models\Subscription;
use App\Domain\Billing\Models\WebhookEvent;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Webhook handler para Stripe.
 *
 * Firma HMAC validada por middleware `webhook:stripe` antes de llegar aquí.
 * Idempotencia garantizada por UNIQUE(provider, event_id) en webhook_events.
 *
 * Eventos manejados:
 *   - checkout.session.completed → ProvisionTenant
 *   - invoice.payment_failed     → marca subscription past_due
 *   - customer.subscription.deleted → suspende (downgrade a free)
 *   - customer.subscription.updated → actualiza status/cycle/period
 */
final class StripeWebhookController extends Controller
{
    public function __construct(private ProvisionTenant $provisionTenant) {}

    public function __invoke(Request $request): JsonResponse
    {
        $event = $request->json()->all();
        $eventId = (string) ($event['id'] ?? '');
        $eventType = (string) ($event['type'] ?? '');

        if ($eventId === '') {
            return response()->json(['error' => 'missing_event_id'], 400);
        }

        // Idempotencia: si ya existe el event_id, ack sin reprocesar.
        $record = WebhookEvent::query()->firstOrCreate(
            ['provider' => 'stripe', 'event_id' => $eventId],
            [
                'event_type'  => $eventType,
                'payload'     => $event,
                'received_at' => now(),
                'status'      => 'pending',
            ],
        );

        if ($record->status === 'processed') {
            return response()->json(['ok' => true, 'idempotent' => true]);
        }

        try {
            match ($eventType) {
                'checkout.session.completed'           => $this->handleCheckoutCompleted($event['data']['object'] ?? []),
                'customer.subscription.updated'        => $this->handleSubscriptionUpdated($event['data']['object'] ?? []),
                'customer.subscription.deleted'        => $this->handleSubscriptionDeleted($event['data']['object'] ?? []),
                'customer.subscription.trial_will_end' => $this->handleTrialWillEnd($event['data']['object'] ?? []),
                'invoice.paid'                         => $this->handleInvoicePaid($event['data']['object'] ?? []),
                'invoice.payment_failed'               => $this->handlePaymentFailed($event['data']['object'] ?? []),
                'invoice.payment_action_required'      => $this->handlePaymentActionRequired($event['data']['object'] ?? []),
                'invoice.upcoming'                     => $this->handleInvoiceUpcoming($event['data']['object'] ?? []),
                default => null,
            };

            $record->forceFill([
                'status'       => 'processed',
                'processed_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            $record->forceFill([
                'status' => 'failed',
                'error'  => substr($e->getMessage(), 0, 1000),
            ])->save();

            logger()->error('Stripe webhook processing failed', [
                'event_id' => $eventId,
                'type'     => $eventType,
                'error'    => $e->getMessage(),
            ]);

            // 500 → Stripe reintenta automáticamente
            return response()->json(['error' => 'processing_failed'], 500);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Stripe envía la session completa. Buscamos plan_slug en metadata
     * y email en customer_details.email.
     *
     * @param array<string,mixed> $session
     */
    private function handleCheckoutCompleted(array $session): void
    {
        $metadata = (array) ($session['metadata'] ?? []);
        $purpose = (string) ($metadata['purpose'] ?? 'tenant_onboarding');

        if ($purpose === 'gift_card') {
            $this->materializeGiftCardFromSession($session, $metadata);
            return;
        }

        if ($purpose === 'membership_subscription') {
            $this->materializeMembershipFromSession($session, $metadata);
            return;
        }

        $customerDetails = (array) ($session['customer_details'] ?? []);
        $email = (string) ($customerDetails['email']
            ?? $session['customer_email']
            ?? '');
        $businessName = (string) ($metadata['business_name'] ?? 'Mi barbería');
        $planSlug = (string) ($metadata['plan_slug'] ?? 'starter');
        $cycle = $this->detectCycle($session);

        if ($email === '') {
            throw new \RuntimeException('checkout.session.completed sin email');
        }

        $this->provisionTenant->execute([
            'email'                 => $email,
            'business_name'         => $businessName,
            'plan_slug'             => $planSlug,
            'billing_cycle'         => $cycle,
            'stripe_customer_id'    => (string) ($session['customer'] ?? ''),
            'stripe_subscription_id' => (string) ($session['subscription'] ?? ''),
        ]);
    }

    /** @param array<string,mixed> $session @param array<string,mixed> $metadata */
    private function materializeGiftCardFromSession(array $session, array $metadata): void
    {
        $tenantId = (string) ($metadata['tenant_id'] ?? '');
        if ($tenantId === '') return;

        $valueCents = (int) ($session['amount_total'] ?? 0);
        if ($valueCents <= 0) return;

        $card = \App\Domain\Memberships\Models\GiftCard::create([
            'tenant_id'       => $tenantId,
            'code'            => \App\Domain\Memberships\Models\GiftCard::newCode(),
            'value_cents'     => $valueCents,
            'balance_cents'   => $valueCents,
            'currency'        => strtoupper((string) ($session['currency'] ?? 'mxn')),
            'recipient_email' => (string) ($metadata['recipient_email'] ?? ''),
            'recipient_name'  => (string) ($metadata['recipient_name'] ?? ''),
            'message'         => (string) ($metadata['message'] ?? '') ?: null,
            'expires_at'      => now()->addYear(),
        ]);

        $tenantName = optional(\App\Domain\Tenancy\Models\Tenant::query()
            ->withoutGlobalScopes()->find($tenantId))->name ?? 'tu barbería';

        try {
            $value = '$' . number_format($card->value_cents / 100, 0);
            $sender = (string) ($metadata['sender_name'] ?? '');
            \Illuminate\Support\Facades\Mail::raw(
                "{$sender} te regaló una gift card de {$tenantName}.\n\n"
                . "Código: {$card->code}\nMonto: {$value} {$card->currency}\n\n"
                . ($card->message ? "Mensaje: {$card->message}\n\n" : '')
                . 'Úsala en tu próxima visita.',
                fn ($m) => $m->to($card->recipient_email, $card->recipient_name)
                    ->subject("Tienes una gift card de {$tenantName}"),
            );
        } catch (\Throwable $e) {
            logger()->warning('webhook gift card email failed', ['err' => $e->getMessage()]);
        }
    }

    /** @param array<string,mixed> $session @param array<string,mixed> $metadata */
    private function materializeMembershipFromSession(array $session, array $metadata): void
    {
        $userId = (int) ($metadata['user_id'] ?? 0);
        $membershipId = (int) ($metadata['membership_id'] ?? 0);
        $tenantId = (string) ($metadata['tenant_id'] ?? '');
        if ($userId === 0 || $membershipId === 0 || $tenantId === '') return;

        \App\Domain\Memberships\Models\ClientMembership::query()->updateOrCreate(
            ['tenant_id' => $tenantId, 'user_id' => $userId, 'membership_id' => $membershipId],
            [
                'services_used_this_period' => 0,
                'current_period_starts_on'  => today(),
                'current_period_ends_on'    => today()->addMonth(),
                'status'                    => 'active',
                'stripe_subscription_id'    => (string) ($session['subscription'] ?? ''),
            ],
        );
    }

    /** @param array<string,mixed> $sub */
    private function handleSubscriptionUpdated(array $sub): void
    {
        $subId = (string) ($sub['id'] ?? '');
        if ($subId === '') {
            return;
        }

        $row = Subscription::query()->where('stripe_subscription_id', $subId)->first();
        if (! $row) {
            return;
        }

        $row->forceFill([
            'status' => $this->mapStripeStatus((string) ($sub['status'] ?? '')),
            'current_period_starts_at' => isset($sub['current_period_start'])
                ? now()->createFromTimestamp((int) $sub['current_period_start'])
                : $row->current_period_starts_at,
            'current_period_ends_at' => isset($sub['current_period_end'])
                ? now()->createFromTimestamp((int) $sub['current_period_end'])
                : $row->current_period_ends_at,
        ])->save();
    }

    /** @param array<string,mixed> $sub */
    private function handleSubscriptionDeleted(array $sub): void
    {
        $subId = (string) ($sub['id'] ?? '');
        Subscription::query()
            ->where('stripe_subscription_id', $subId)
            ->update([
                'status'      => Subscription::STATUS_CANCELED,
                'canceled_at' => now(),
            ]);
    }

    /**
     * invoice.paid → renovación de membership: resetea contador del cliente.
     */
    private function handleInvoicePaid(array $invoice): void
    {
        $subId = (string) ($invoice['subscription'] ?? '');
        if ($subId === '') return;

        $cm = \App\Domain\Memberships\Models\ClientMembership::query()
            ->where('stripe_subscription_id', $subId)
            ->first();
        if ($cm) {
            $cm->forceFill([
                'services_used_this_period' => 0,
                'current_period_starts_on'  => today(),
                'current_period_ends_on'    => today()->addMonth(),
                'status'                    => 'active',
            ])->save();
        }
    }

    /** @param array<string,mixed> $invoice */
    private function handlePaymentFailed(array $invoice): void
    {
        $subId = (string) ($invoice['subscription'] ?? '');
        if ($subId === '') {
            return;
        }

        Subscription::query()
            ->where('stripe_subscription_id', $subId)
            ->update(['status' => Subscription::STATUS_PAST_DUE]);

        $this->notifyAdmin($subId, 'billing_payment_failed', [
            'amount_due' => $invoice['amount_due'] ?? 0,
            'attempt'    => $invoice['attempt_count'] ?? 1,
        ]);
    }

    /** @param array<string,mixed> $invoice */
    private function handlePaymentActionRequired(array $invoice): void
    {
        $subId = (string) ($invoice['subscription'] ?? '');
        if ($subId === '') {
            return;
        }

        // Stripe ya está pidiendo SCA al cliente. Notificamos al admin para
        // que sepa por qué su próxima factura puede tardar en pagarse.
        $this->notifyAdmin($subId, 'billing_action_required', [
            'amount' => $invoice['amount_due'] ?? 0,
            'hosted_invoice_url' => $invoice['hosted_invoice_url'] ?? null,
        ]);
    }

    /** @param array<string,mixed> $invoice */
    private function handleInvoiceUpcoming(array $invoice): void
    {
        $subId = (string) ($invoice['subscription'] ?? '');
        if ($subId === '') {
            return;
        }

        $this->notifyAdmin($subId, 'billing_upcoming', [
            'amount' => $invoice['amount_due'] ?? 0,
            'period_end' => $invoice['period_end'] ?? null,
        ]);
    }

    /** @param array<string,mixed> $sub */
    private function handleTrialWillEnd(array $sub): void
    {
        $subId = (string) ($sub['id'] ?? '');
        if ($subId === '') {
            return;
        }
        $this->notifyAdmin($subId, 'billing_trial_ending', [
            'trial_end' => $sub['trial_end'] ?? null,
        ]);
    }

    /**
     * Manda WhatsApp al admin del tenant con el evento de billing.
     * Best-effort: si no hay phone o el envío falla, sólo log.
     */
    private function notifyAdmin(string $stripeSubscriptionId, string $template, array $params): void
    {
        $sub = Subscription::query()
            ->where('stripe_subscription_id', $stripeSubscriptionId)
            ->first();
        if (! $sub) {
            return;
        }

        $admin = \App\Domain\Identity\Models\User::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $sub->tenant_id)
            ->where('role', \App\Domain\Identity\Models\User::ROLE_ADMIN)
            ->first();

        if (! $admin || ! $admin->phone) {
            logger()->info("Billing event: {$template}", ['tenant' => $sub->tenant_id, ...$params]);
            return;
        }

        try {
            app(\App\Domain\Notifications\Services\SendWhatsapp::class)->execute(
                tenantId: $sub->tenant_id,
                to: (string) $admin->phone,
                template: $template,
                params: $params,
                userId: $admin->id,
            );
        } catch (\Throwable $e) {
            logger()->warning("notifyAdmin {$template} falló", ['error' => $e->getMessage()]);
        }
    }

    private function detectCycle(array $session): string
    {
        // Si Stripe no incluye el price en la session, default monthly.
        $items = $session['line_items']['data'] ?? [];
        $first = $items[0] ?? null;
        $interval = $first['price']['recurring']['interval'] ?? 'month';

        return $interval === 'year' ? 'yearly' : 'monthly';
    }

    private function mapStripeStatus(string $stripeStatus): string
    {
        return match ($stripeStatus) {
            'active', 'past_due', 'canceled', 'trialing', 'incomplete' => $stripeStatus,
            default => Subscription::STATUS_ACTIVE,
        };
    }
}
