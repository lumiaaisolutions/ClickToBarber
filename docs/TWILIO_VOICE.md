# Twilio Voice — fallback de voz

Llamada saliente con TTS (Polly.Mia es-MX) como **fallback** del flujo
anti no-show cuando el cliente no responde a los mensajes WhatsApp.

## Componentes

| Archivo | Rol |
|---|---|
| `app/Domain/Notifications/Contracts/VoiceClient.php` | Interface `call($to, $say)` |
| `app/Infrastructure/Integrations/Twilio/TwilioVoiceClient.php` | Driver real (POST `/Calls.json` con TwiML inline) + fallback "log" |
| `app/Domain/Notifications/Services/PlaceVoiceCall.php` | Service con CircuitBreaker (`twilio_voice`) + log a `notification_logs` |
| `app/Domain/Notifications/Jobs/AutoCancelUnconfirmedAppointment.php` | Llama `voice` cuando `TWILIO_DRIVER=twilio` |

## Configuración (.env)

```bash
TWILIO_DRIVER=log              # log | twilio
TWILIO_SID=ACxxxxxxxxxxxxxxxx
TWILIO_TOKEN=<auth_token>
TWILIO_FROM=+15555550100       # número Twilio en E.164
```

Sin keys, el driver default es `log` y nunca llama de verdad — solo
escribe a `storage/logs/laravel.log`. Útil en dev.

## Flujo

1. T-2h: WhatsApp con quick reply (Confirmar/Reagendar/Cancelar).
2. T-1h: si la cita sigue `pending_confirmation`,
   `AutoCancelUnconfirmedAppointment`:
   - Cancela cita + marca depósito retenido.
   - Manda WhatsApp `cancelled`.
   - **Si `TWILIO_DRIVER=twilio`**: llama al número del cliente con
     un TTS bilingüe español que confirma la cancelación.

## Anti abuso

- Una sola llamada por cita (lock distribuido en Cache::lock).
- TwiML repite el mensaje 2 veces y cuelga (sin menus, sin recursión).
- `MachineDetection=Enable` para no dejar mensaje en buzón sin valor.
- Circuit breaker `twilio_voice` desactiva las llamadas si la
  integración falla N veces en M minutos.

## Estado

✅ Cliente real funcional con TwiML inline (sin endpoint propio).
✅ Cableado a `AutoCancelUnconfirmedAppointment`.
🔴 No hay opción de "Press 1 to confirm" interactivo (intencional para
   MVP — la llamada es informativa, la confirmación va por WhatsApp).
