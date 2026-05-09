"use client";

import { useState, useTransition } from "react";
import { Loader2, Gift, AlertTriangle, Check } from "lucide-react";
import { cn, fmtCents } from "@/lib/utils";

const PRESETS = [50000, 100000, 150000, 250000, 500000];

interface Errors { [k: string]: string }

export function GiftCardCheckoutClient({ slug, tenantName }: { slug: string; tenantName: string }) {
  const [valueCents, setValueCents] = useState<number>(100000);
  const [customMode, setCustomMode] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickPreset(n: number) {
    setCustomMode(false);
    setValueCents(n);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    const local: Errors = {};
    if (valueCents < 5000) local.value_cents = "Mínimo $50 MXN.";
    if (valueCents > 5000000) local.value_cents = "Máximo $50,000 MXN.";
    if (!senderName.trim()) local.sender_name = "Tu nombre es requerido.";
    if (!senderEmail.trim()) local.sender_email = "Tu email es requerido.";
    if (!recipientName.trim()) local.recipient_name = "Nombre de quien recibe.";
    if (!recipientEmail.trim()) local.recipient_email = "Email de quien recibe.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/public/giftcards/${encodeURIComponent(slug)}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value_cents: valueCents,
          sender_name: senderName.trim(),
          sender_email: senderEmail.trim(),
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          message: message.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url as string;
          return;
        }
        setGlobalError("Respuesta inesperada del servidor.");
      } else if (res.status === 422) {
        const data = await res.json().catch(() => null);
        const merged: Errors = {};
        if (data && typeof data === "object" && "errors" in data) {
          for (const [k, v] of Object.entries((data as { errors: Record<string, string[]> }).errors)) {
            merged[k] = Array.isArray(v) ? v[0] : String(v);
          }
        }
        setErrors(merged);
      } else if (res.status === 502) {
        setGlobalError("La pasarela de pago no respondió. Intenta de nuevo en unos segundos.");
      } else if (res.status === 404) {
        setGlobalError("Esta barbería no existe.");
      } else {
        setGlobalError("No se pudo procesar la compra. Intenta de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card-paper p-5 sm:p-7 space-y-4">
        <h2 className="font-display italic text-xl text-ink flex items-center gap-2">
          <Gift size={18} className="text-accent" /> Monto
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PRESETS.map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => pickPreset(n)}
              className={cn(
                "py-3 rounded-[10px] border text-sm transition",
                !customMode && valueCents === n
                  ? "border-primary bg-primary/8 text-primary font-medium"
                  : "border-line-medium text-ink-2 hover:border-primary/40 hover:text-primary",
              )}
            >
              {fmtCents(n)}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => setCustomMode((v) => !v)}
            className={cn(
              "text-xs tracking-imperial border px-3 py-2 rounded-[8px] transition",
              customMode ? "border-primary text-primary bg-primary/5" : "border-line-medium text-ink-2 hover:border-primary/40",
            )}
          >
            Otro monto
          </button>
          {customMode && (
            <div className="flex-1">
              <label className="text-[10px] tracking-imperial text-ink-muted block mb-1">
                Monto en MXN (mín. 50, máx. 50,000)
              </label>
              <input
                type="number"
                min={50}
                max={50000}
                value={Math.round(valueCents / 100)}
                onChange={(e) => setValueCents(Math.max(0, Math.round(Number(e.target.value) * 100)))}
                className="input-boxed font-mono text-right w-full"
              />
            </div>
          )}
        </div>
        {errors.value_cents && <p className="text-xs text-danger">{errors.value_cents}</p>}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-paper p-5 sm:p-6 space-y-3">
          <h2 className="font-display italic text-lg text-ink">Tus datos</h2>
          <Field label="Nombre" value={senderName} onChange={setSenderName} error={errors.sender_name} />
          <Field label="Email" type="email" value={senderEmail} onChange={setSenderEmail} error={errors.sender_email} />
        </div>
        <div className="card-paper p-5 sm:p-6 space-y-3">
          <h2 className="font-display italic text-lg text-ink">Quien recibe</h2>
          <Field label="Nombre" value={recipientName} onChange={setRecipientName} error={errors.recipient_name} />
          <Field label="Email" type="email" value={recipientEmail} onChange={setRecipientEmail} error={errors.recipient_email} placeholder="Le mandaremos el código aquí" />
        </div>
      </section>

      <section className="card-paper p-5 sm:p-6">
        <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">
          Mensaje (opcional, máx. 500 caracteres)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Feliz cumpleaños, mereces consentirte ✨"
          className="input-boxed w-full resize-none"
        />
        {errors.message && <p className="text-xs text-danger mt-1">{errors.message}</p>}
      </section>

      {globalError && (
        <div className="card-paper p-4 border-danger/30 text-danger text-sm flex items-center gap-2">
          <AlertTriangle size={14} /> {globalError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 card-paper p-5">
        <div>
          <div className="text-[10px] tracking-imperial text-ink-muted">Total a pagar</div>
          <div className="font-display text-3xl text-primary">{fmtCents(valueCents)}</div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary justify-center sm:min-w-[200px] disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Pagar y enviar
        </button>
      </div>

      <p className="text-[11px] text-ink-muted leading-relaxed">
        Al completar la compra, {tenantName} mandará por correo a tu persona
        favorita el código de la gift card. Vigencia: 12 meses desde la compra.
      </p>
    </form>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, error,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; error?: string }) {
  return (
    <div>
      <label className="text-[10px] tracking-imperial text-ink-muted block mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("input-boxed w-full", error && "border-danger/60")}
      />
      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
    </div>
  );
}
