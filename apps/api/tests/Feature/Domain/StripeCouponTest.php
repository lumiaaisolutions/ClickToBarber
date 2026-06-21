<?php

declare(strict_types=1);

use App\Domain\Billing\Services\IssueStripeCoupon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

it('IssueStripeCoupon en mock driver devuelve coupon_id mock', function () {
    config(['services.stripe.driver' => 'mock', 'services.stripe.secret' => '']);
    $r = app(IssueStripeCoupon::class)->execute('cus_test', 15000);
    expect($r['mocked'])->toBeTrue()
        ->and($r['coupon_id'])->toStartWith('mock_');
});

it('IssueStripeCoupon en stripe driver hace POST a /v1/coupons', function () {
    config(['services.stripe.driver' => 'stripe', 'services.stripe.secret' => 'sk_test_xxx']);

    Http::fake([
        'api.stripe.com/v1/coupons'      => Http::response(['id' => 'coupon_real_123'], 200),
        'api.stripe.com/v1/customers/*'  => Http::response([], 200),
    ]);

    $r = app(IssueStripeCoupon::class)->execute('cus_real', 25000);
    expect($r['mocked'])->toBeFalse()
        ->and($r['coupon_id'])->toBe('coupon_real_123');

    Http::assertSent(function ($req) {
        return str_contains((string) $req->url(), '/coupons') && $req->method() === 'POST';
    });
});
