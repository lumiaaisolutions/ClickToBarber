<?php

declare(strict_types=1);

namespace App\Mail;

use App\Domain\Identity\Models\User;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OnboardingMagicLink extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Tenant $tenant,
        public string $token,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '¡Bienvenido a LUMIA, ' . $this->tenant->name . '!',
        );
    }

    public function content(): Content
    {
        $frontend = (string) env('FRONTEND_URL', 'http://localhost:3000');
        $url = $frontend . '/auth/magic?token=' . $this->token;

        return new Content(
            view: 'emails.onboarding-magic-link',
            with: [
                'user'   => $this->user,
                'tenant' => $this->tenant,
                'url'    => $url,
                'ttl'    => (int) config('security.magic_links.ttl_minutes', 1440),
            ],
        );
    }
}
