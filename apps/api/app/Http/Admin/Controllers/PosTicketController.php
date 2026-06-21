<?php

declare(strict_types=1);

namespace App\Http\Admin\Controllers;

use App\Domain\Appointments\Models\Appointment;
use App\Domain\Catalog\Models\Product;
use App\Domain\Catalog\Models\Service;
use App\Domain\Catalog\Models\StockMovement;
use App\Domain\Marketing\Models\Coupon;
use App\Domain\Memberships\Models\GiftCard;
use App\Domain\Payments\Models\Payment;
use App\Domain\PointOfSale\Models\Ticket;
use App\Domain\PointOfSale\Models\TicketItem;
use App\Domain\Tenancy\CurrentTenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * POST /api/admin/pos/tickets — cierra una venta.
 *
 * Body:
 *   {
 *     barber_id: int,
 *     appointment_id?: int,
 *     items: [{ kind: 'service'|'product', id: int, qty: int }],
 *     coupon_code?: string,
 *     gift_card_code?: string,
 *     payment_method: 'cash'|'card'|'transfer',
 *     tip_cents?: int,
 *     tip_split?: [{ barber_id, amount_cents }]
 *   }
 */
final class PosTicketController extends Controller
{
    public function __construct(private CurrentTenant $current) {}

    public function store(Request $request): JsonResponse
    {
        $this->guardWrite($request);
        $tenant = $this->current->require();

        $data = $request->validate([
            'barber_id'        => ['required', 'integer'],
            'appointment_id'   => ['nullable', 'integer'],
            'items'            => ['required', 'array', 'min:1'],
            'items.*.kind'     => ['required', 'in:service,product'],
            'items.*.id'       => ['required', 'integer'],
            'items.*.qty'      => ['required', 'integer', 'min:1'],
            'coupon_code'      => ['nullable', 'string', 'max:24'],
            'gift_card_code'   => ['nullable', 'string', 'max:24'],
            'payment_method'   => ['required', 'in:cash,card,transfer'],
            'tip_cents'        => ['nullable', 'integer', 'min:0'],
            'tip_split'        => ['nullable', 'array'],
        ]);

        return DB::transaction(function () use ($tenant, $data, $request) {
            $subtotal = 0;
            $itemsResolved = [];

            foreach ($data['items'] as $line) {
                if ($line['kind'] === 'service') {
                    $svc = Service::query()->forTenant($tenant->id)->findOrFail($line['id']);
                    $unit = $svc->price_cents;
                    $subtotal += $unit * $line['qty'];
                    $itemsResolved[] = [
                        'kind' => 'service', 'item_id' => $svc->id, 'name' => $svc->name,
                        'unit' => $unit, 'qty' => $line['qty'],
                    ];
                } else {
                    $p = Product::query()->forTenant($tenant->id)->findOrFail($line['id']);
                    if ($p->stock < $line['qty']) {
                        abort(response()->json(['error' => 'out_of_stock', 'product' => $p->id], 422));
                    }
                    $unit = $p->price_cents;
                    $subtotal += $unit * $line['qty'];
                    $itemsResolved[] = [
                        'kind' => 'product', 'item_id' => $p->id, 'name' => $p->name,
                        'unit' => $unit, 'qty' => $line['qty'], 'product' => $p,
                    ];
                }
            }

            // Cupón
            $discount = 0;
            $coupon = null;
            if (! empty($data['coupon_code'])) {
                $coupon = Coupon::query()->where('tenant_id', $tenant->id)
                    ->where('code', $data['coupon_code'])
                    ->whereNull('redeemed_at')
                    ->where(function ($q) {
                        $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                    })->first();
                if (! $coupon) {
                    abort(response()->json(['error' => 'invalid_coupon'], 422));
                }
                $discount = $coupon->discount_cents
                    ?? (int) round($subtotal * (($coupon->discount_pct ?? 0) / 100));
            }

            // Gift card
            $gcApplied = 0;
            $giftCard = null;
            if (! empty($data['gift_card_code'])) {
                $giftCard = GiftCard::query()->where('tenant_id', $tenant->id)
                    ->where('code', $data['gift_card_code'])->first();
                if (! $giftCard || ! $giftCard->isUsable()) {
                    abort(response()->json(['error' => 'invalid_gift_card'], 422));
                }
            }

            $tip = (int) ($data['tip_cents'] ?? 0);
            $afterDiscount = max(0, $subtotal - $discount);

            if ($giftCard) {
                $gcApplied = $giftCard->redeem($afterDiscount);
                $afterDiscount -= $gcApplied;
            }

            $total = $afterDiscount + $tip;

            $ticket = Ticket::create([
                'tenant_id'      => $tenant->id,
                'barber_id'      => $data['barber_id'],
                'appointment_id' => $data['appointment_id'] ?? null,
                'subtotal_cents' => $subtotal,
                'discount_cents' => $discount + $gcApplied,
                'tip_cents'      => $tip,
                'total_cents'    => $total,
                'payment_method' => $data['payment_method'],
                'coupon_id'      => $coupon?->id,
                'status'         => 'closed',
                'closed_at'      => now(),
            ]);

            foreach ($itemsResolved as $line) {
                TicketItem::create([
                    'tenant_id'        => $tenant->id,
                    'ticket_id'        => $ticket->id,
                    'item_type'        => $line['kind'],
                    'item_id'          => $line['item_id'],
                    'item_name'        => $line['name'],
                    'unit_price_cents' => $line['unit'],
                    'quantity'         => $line['qty'],
                    'total_cents'      => $line['unit'] * $line['qty'],
                ]);

                if ($line['kind'] === 'product') {
                    $p = $line['product'];
                    $p->decrement('stock', $line['qty']);
                    StockMovement::create([
                        'tenant_id' => $tenant->id, 'product_id' => $p->id,
                        'type' => 'sale', 'qty' => -$line['qty'],
                        'reason' => "ticket #{$ticket->id}",
                    ]);
                }
            }

            if ($coupon) {
                $coupon->forceFill(['redeemed_at' => now()])->save();
            }

            if ($tip > 0) {
                $splits = ! empty($data['tip_split']) ? $data['tip_split']
                    : [['barber_id' => $data['barber_id'], 'amount_cents' => $tip]];
                foreach ($splits as $split) {
                    DB::table('tip_splits')->insert([
                        'tenant_id'      => $tenant->id,
                        'appointment_id' => $data['appointment_id'] ?? null,
                        'barber_id'      => $split['barber_id'],
                        'amount_cents'   => $split['amount_cents'],
                        'earned_on'      => today(),
                        'created_at'     => now(),
                        'updated_at'     => now(),
                    ]);
                }
            }

            Payment::create([
                'tenant_id'      => $tenant->id,
                'appointment_id' => $data['appointment_id'] ?? null,
                'ticket_id'      => $ticket->id,
                'amount_cents'   => $total,
                'currency'       => 'MXN',
                'provider'       => $data['payment_method'],
                'purpose'        => 'service_pos',
                'status'         => 'succeeded',
                'paid_at'        => now(),
            ]);

            if (! empty($data['appointment_id'])) {
                $appt = Appointment::query()->withoutGlobalScopes()->find($data['appointment_id']);
                if ($appt && $appt->status->value !== 'completed') {
                    app(\App\Domain\Appointments\Services\CompleteAppointment::class)
                        ->execute($appt->id, 'pos:' . $request->user()->id);
                }
            }

            return response()->json([
                'ticket_id'      => $ticket->id,
                'subtotal_cents' => $subtotal,
                'discount_cents' => $discount + $gcApplied,
                'tip_cents'      => $tip,
                'total_cents'    => $total,
                'gift_card_applied' => $gcApplied,
            ], 201);
        });
    }

    private function guardWrite(Request $request): void
    {
        $u = $request->user();
        if (! $u || ! in_array($u->role, ['admin', 'manager', 'receptionist', 'platform_owner'], true)) {
            abort(response()->json(['error' => 'role_forbidden'], 403));
        }
    }
}
