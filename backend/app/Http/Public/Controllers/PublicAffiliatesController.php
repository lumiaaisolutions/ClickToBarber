<?php

declare(strict_types=1);

namespace App\Http\Public\Controllers;

use App\Domain\Affiliates\Models\Affiliate;
use App\Domain\Affiliates\Services\StripeConnectService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Programa de afiliados — self-service.
 *
 *  POST /api/public/affiliates/signup           { name, email }            → crea Affiliate, email con código
 *  POST /api/public/affiliates/dashboard        { code }                   → stats por código (auth ligero por código secreto)
 *
 * El `code` (AFF-XXXXXX, ~10^14 combinaciones) actúa como token de acceso
 * personal al dashboard. Se entrega por email al darse de alta y nunca se
 * expone en la URL del navegador (siempre vía body POST).
 */
final class PublicAffiliatesController extends Controller
{
    public function __construct(private StripeConnectService $connect) {}

    public function signup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower($data['email']);
        $existing = Affiliate::query()->where('email', $email)->first();

        // No revelamos si ya existe — siempre 200 + reenviamos código por email.
        $aff = $existing ?: Affiliate::create([
            'name'           => $data['name'],
            'email'          => $email,
            'code'           => Affiliate::newCode(),
            'commission_pct' => 30,
            'is_active'      => true,
        ]);

        $this->emailCode($aff);

        return response()->json([
            'ok'      => true,
            'message' => 'Te enviamos por correo tu código privado de acceso al dashboard.',
        ]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^AFF-[A-Z0-9]+$/', 'max:20'],
        ]);

        $aff = Affiliate::query()->where('code', $data['code'])->first();
        if (! $aff) return response()->json(['error' => 'not_found'], 404);
        if (! $aff->is_active) return response()->json(['error' => 'inactive'], 403);

        $row = DB::table('affiliate_referrals')
            ->where('affiliate_id', $aff->id)
            ->selectRaw('COUNT(*) as cnt, COALESCE(SUM(total_commission_paid_cents),0) as paid, COALESCE(SUM(mrr_cents_at_signup),0) as mrr_total')
            ->first();

        $referrals = DB::table('affiliate_referrals as ar')
            ->leftJoin('tenants as t', 't.id', '=', 'ar.tenant_id')
            ->where('ar.affiliate_id', $aff->id)
            ->orderByDesc('ar.signed_up_at')
            ->limit(50)
            ->get(['t.name as tenant_name', 'ar.mrr_cents_at_signup', 'ar.total_commission_paid_cents', 'ar.signed_up_at']);

        $shareUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/')
            . '/?aff=' . $aff->code;

        return response()->json([
            'affiliate' => [
                'name'                  => $aff->name,
                'email'                 => $aff->email,
                'code'                  => $aff->code,
                'commission_pct'        => $aff->commission_pct,
                'is_active'             => $aff->is_active,
                'stripe_payouts_enabled' => $aff->stripe_payouts_enabled,
                'stripe_connected'      => (bool) $aff->stripe_account_id,
            ],
            'stats' => [
                'tenants_referred'      => (int) ($row->cnt ?? 0),
                'commission_paid_cents' => (int) ($row->paid ?? 0),
                'mrr_referred_cents'    => (int) ($row->mrr_total ?? 0),
            ],
            'share_url' => $shareUrl,
            'referrals' => $referrals->map(fn ($r) => [
                'tenant_name'                 => $r->tenant_name ?? '(eliminado)',
                'mrr_cents_at_signup'         => (int) ($r->mrr_cents_at_signup ?? 0),
                'total_commission_paid_cents' => (int) ($r->total_commission_paid_cents ?? 0),
                'signed_up_at'                => $r->signed_up_at,
            ]),
        ]);
    }

    public function connectStart(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^AFF-[A-Z0-9]+$/', 'max:20'],
        ]);
        $aff = Affiliate::query()->where('code', $data['code'])->first();
        if (! $aff || ! $aff->is_active) return response()->json(['error' => 'not_found'], 404);

        $frontend = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $url = $this->connect->onboardLink(
            $aff,
            returnUrl:  "{$frontend}/affiliates?connect=ok",
            refreshUrl: "{$frontend}/affiliates?connect=refresh",
        );

        return response()->json(['url' => $url]);
    }

    public function connectRefresh(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^AFF-[A-Z0-9]+$/', 'max:20'],
        ]);
        $aff = Affiliate::query()->where('code', $data['code'])->first();
        if (! $aff) return response()->json(['error' => 'not_found'], 404);

        $enabled = $this->connect->refreshStatus($aff);
        return response()->json(['stripe_payouts_enabled' => $enabled]);
    }

    private function emailCode(Affiliate $aff): void
    {
        try {
            $frontend = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
            Mail::raw(
                "Hola {$aff->name},\n\n"
                . "Tu código privado de afiliado LUMIA es:\n\n"
                . "    {$aff->code}\n\n"
                . "Úsalo para entrar a tu dashboard en {$frontend}/affiliates\n\n"
                . "Tu link único de referido (compártelo con barberías que quieran probar LUMIA):\n"
                . "    {$frontend}/?aff={$aff->code}\n\n"
                . "Comisión por referido activo: {$aff->commission_pct}% del MRR cada mes.\n\n"
                . "El código es personal — guárdalo bien.",
                fn ($m) => $m->to($aff->email, $aff->name)
                    ->subject('Tu código de afiliado LUMIA'),
            );
        } catch (\Throwable $e) {
            logger()->warning('Affiliate code email failed', ['err' => $e->getMessage()]);
        }
    }
}
