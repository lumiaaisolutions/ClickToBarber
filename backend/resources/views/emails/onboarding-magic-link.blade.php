<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Bienvenido a LUMIA</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; background:#FBF7EE; color:#1A1F1B; margin:0; padding:32px;">
  <div style="max-width:560px; margin:0 auto; background:#F5EFE0; padding:40px; border-radius:14px;">
    <h1 style="font-family: 'Cormorant Garamond', serif; font-style:italic; color:#1F3D2B; font-size:32px; margin:0 0 8px;">Bienvenido, {{ $user->name }}</h1>
    <p style="color:#4A4F45; line-height:1.6;">
      Tu cuenta de <strong>{{ $tenant->name }}</strong> en LUMIA está lista.
      Activa tu acceso de administrador con el siguiente enlace seguro:
    </p>
    <p style="text-align:center; margin:32px 0;">
      <a href="{{ $url }}" style="display:inline-block; background:#1F3D2B; color:#FBF7EE; padding:14px 32px; text-decoration:none; border-radius:8px; letter-spacing:0.04em; text-transform:uppercase; font-size:13px;">
        Activar mi cuenta
      </a>
    </p>
    <p style="color:#8A8B7E; font-size:13px; line-height:1.6;">
      Este enlace expira en {{ floor($ttl / 60) }} horas y sólo puede usarse una vez.
      Si no fuiste tú, ignora este mensaje.
    </p>
    <hr style="border:none; border-top:1px solid rgba(26,31,27,0.16); margin:32px 0;">
    <p style="color:#8A8B7E; font-size:12px; text-align:center;">
      LUMIA — Software para barberías premium · <a href="https://lumiaaisolutions.com" style="color:#B8935E;">lumiaaisolutions.com</a>
    </p>
  </div>
</body>
</html>
