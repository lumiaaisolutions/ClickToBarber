<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Billing\Services\CreateCheckoutSession;
use App\Domain\Subscriptions\Models\Plan;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint público para iniciar Stripe Checkout desde la landing.
 *
 * No crea tenant aún: el tenant se materializa cuando llega el webhook
 * checkout.session.completed (ver StripeWebhookController). Esto evita
 * crear cuentas para usuarios que abandonan el pago.
 */
final class CheckoutController extends Controller
{
    public function __construct(private CreateCheckoutSession $checkout) {}

    public function __invoke(Request $request): JsonResponse
    {
        $availablePlans = Plan::query()->where('code', '!=', 'free')->pluck('code')->all();

        $data = $request->validate([
            'plan'          => ['required', 'string', 'in:' . implode(',', $availablePlans)],
            'billing_cycle' => ['required', 'string', 'in:monthly,yearly'],
            'email'         => ['required', 'email', 'max:255'],
            'business_name' => ['required', 'string', 'min:2', 'max:120'],
        ]);

        $session = $this->checkout->execute([
            'plan_slug'     => $data['plan'],
            'billing_cycle' => $data['billing_cycle'],
            'email'         => $data['email'],
            'business_name' => $data['business_name'],
        ]);

        return response()->json([
            'session_id' => $session['session_id'],
            'url'        => $session['url'],
        ]);
    }
}
