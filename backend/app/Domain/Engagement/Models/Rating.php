<?php

declare(strict_types=1);

namespace App\Domain\Engagement\Models;

use App\Domain\Identity\Models\User;
use App\Domain\Staff\Models\Barber;
use App\Infrastructure\Persistence\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Rating extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'appointment_id', 'user_id', 'barber_id',
        'stars', 'comment', 'public_token', 'submitted_at', 'is_published',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'is_published' => 'boolean',
            'stars'        => 'integer',
        ];
    }

    public static function newToken(): string
    {
        return Str::random(40);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function barber(): BelongsTo
    {
        return $this->belongsTo(Barber::class);
    }
}
