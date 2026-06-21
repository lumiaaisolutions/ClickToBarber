&lt;?php

declare(strict_types=1);

namespace App\Domain\Identity\Rules;

use Illuminate\Validation\Rules\Password;

/**
 * Política de password de LUMIA — usar en provisión / reset / change.
 *
 *   $request->validate(['password' => StrongPassword::rule()]);
 */
final class StrongPassword
{
    public static function rule(): array
    {
        return [
            'required',
            'string',
            Password::min(10)->mixedCase()->numbers()->symbols()->uncompromised(),
        ];
    }
}
