"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Check, Scissors, User, Clock, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import type { PublicTenant, PublicBarber, PublicService } from "@/lib/api";
import { api, ApiError } from "@/lib/api";
import { fmtCents, fmtTime, WEEKDAYS_ES } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Step = "service" | "barber" | "datetime" | "details" | "done";

interface Slot { starts_at: string; ends_at: string; available: boolean }

export function BookingFlow({
  tenant,
  barbers,
  services,
}: {
  tenant: PublicTenant;
  barbers: PublicBarber[];
  services: PublicService[];
}) {
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<PublicService | null>(null);
  const [barber, setBarber] = useState<PublicBarber | null>(null);
  const [date, setDate] = useState<string>(() => isoDate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pending, startTransition] = useTransition();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ id: number } | null>(null);
  const [client, setClient] = useState({ name: "", email: "", phone: "" });

  const stepIndex = useMemo(() => ["service","barber","datetime","details","done"].indexOf(step), [step]);

  async function loadSlots(b: PublicBarber, s: PublicService, d: string) {
    setLoadingSlots(true);
    try {
      const json = await api<{ slots: Slot[] }>(
        `/client/availability?barber_id=${b.id}&service_id=${s.id}&date=${d}`,
        { tenant: tenant.slug },
      );
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function pickService(s: PublicService) {
    setService(s); setStep("barber");
  }
  async function pickBarber(b: PublicBarber) {
    setBarber(b);
    if (service) await loadSlots(b, service, date);
    setStep("datetime");
  }
  async function pickDate(d: string) {
    setDate(d); setSlot(null);
    if (barber && service) await loadSlots(barber, service, d);
  }

  function submit() {
    if (!barber || !service || !slot) return;
    setBookingError(null);
    startTransition(async () => {
      try {
        const created = await api<{ data: { id: number } }>(
          "/client/appointments",
          {
            method: "POST",
            tenant: tenant.slug,
            body: {
              barber_id:    barber.id,
              service_id:   service.id,
              starts_at:    slot.starts_at,
              client_name:  client.name,
              client_email: client.email,
              client_phone: client.phone,
            },
          },
        );
        setConfirmed({ id: created.data.id });
        setStep("done");
      } catch (e) {
        setBookingError(e instanceof ApiError ? `Error ${e.status}` : "Error inesperado");
      }
    });
  }

  return (
    <section className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Stepper current={stepIndex} />

        <div className="mt-10 card-premium p-6 sm:p-10 min-h-[420px]">
          <AnimatePresence mode="wait">
            {step === "service" && (
              <Pane key="service" title="Elige tu servicio" icon={<Scissors size={20} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => pickService(s)}
                      className="text-left p-4 rounded-xl border border-border-medium hover:border-accent hover:bg-accent/5 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium group-hover:text-accent-2 transition">{s.name}</div>
                          <div className="text-xs text-text-2 mt-1">{s.description}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-xl text-accent">{fmtCents(s.price_cents)}</div>
                          <div className="text-xs text-text-muted flex items-center gap-1 justify-end">
                            <Clock size={11} /> {s.duration_minutes} min
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Pane>
            )}

            {step === "barber" && service && (
              <Pane key="barber" title="¿Con qué barbero?" icon={<User size={20} />} onBack={() => setStep("service")}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {barbers.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => pickBarber(b)}
                      className="p-4 rounded-xl border border-border-medium hover:border-accent hover:bg-accent/5 transition flex flex-col items-center text-center group"
                    >
                      {b.avatar ? (
                        <img src={b.avatar} alt={b.name} className="w-16 h-16 rounded-full object-cover mb-3 ring-2 ring-border-medium group-hover:ring-accent transition" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-bg-overlay mb-3" />
                      )}
                      <div className="font-medium group-hover:text-accent-2 transition">{b.name}</div>
                      <div className="text-xs text-text-muted mt-1">
                        {b.specialties.slice(0, 2).join(" · ")}
                      </div>
                    </button>
                  ))}
                </div>
              </Pane>
            )}

            {step === "datetime" && barber && service && (
              <Pane key="datetime" title="Fecha y hora" icon={<CalendarDays size={20} />} onBack={() => setStep("barber")}>
                <DatePicker value={date} onChange={pickDate} tz={tenant.timezone} />

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-3">Horarios disponibles</div>
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-text-2 text-sm py-8 justify-center"><Loader2 className="animate-spin" size={16} /> Calculando…</div>
                  ) : slots.length === 0 ? (
                    <div className="text-text-muted text-sm py-8 text-center">No hay slots disponibles para esta fecha.</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.starts_at}
                          disabled={!s.available}
                          onClick={() => { setSlot(s); setStep("details"); }}
                          className={cn(
                            "py-2.5 rounded-lg text-sm font-mono tabular-nums transition",
                            s.available
                              ? "border border-border-medium hover:border-accent hover:bg-accent/10"
                              : "opacity-30 cursor-not-allowed line-through",
                          )}
                        >
                          {fmtTime(s.starts_at, tenant.timezone)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Pane>
            )}

            {step === "details" && service && barber && slot && (
              <Pane key="details" title="Tus datos" icon={<User size={20} />} onBack={() => setStep("datetime")}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                  <Summary label="Servicio" value={service.name} />
                  <Summary label="Precio" value={fmtCents(service.price_cents)} />
                  <Summary label="Barbero" value={barber.name} />
                  <Summary label="Inicio" value={fmtTime(slot.starts_at, tenant.timezone)} />
                </div>

                <hr className="divider-gold mb-6" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nombre" value={client.name} onChange={(v) => setClient({...client, name: v})} placeholder="Carlos Mendoza" />
                  <Input label="Email"  value={client.email} onChange={(v) => setClient({...client, email: v})} placeholder="tu@email.com" type="email" />
                  <Input label="WhatsApp" value={client.phone} onChange={(v) => setClient({...client, phone: v})} placeholder="+5215500001111" className="sm:col-span-2" />
                </div>

                <div className="mt-6 p-4 rounded-xl bg-bg-overlay/50 border border-border-medium text-sm">
                  Se cobrará un depósito de <span className="font-mono text-accent">{fmtCents(Math.round(service.price_cents * tenant.deposit_pct / 100))}</span> ({tenant.deposit_pct}%) para asegurar tu cita.
                </div>

                {bookingError && (
                  <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/40 text-danger text-sm">
                    {bookingError}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={pending || !client.name || !client.email || !client.phone}
                  className="mt-6 w-full btn-gold py-4 rounded-full text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {pending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Confirmar reserva
                </button>
              </Pane>
            )}

            {step === "done" && confirmed && (
              <Pane key="done" title="¡Cita reservada!" icon={<Check size={20} />}>
                <div className="text-center py-8">
                  <div className="mx-auto w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mb-6">
                    <Check className="text-success" size={36} />
                  </div>
                  <div className="font-display text-2xl mb-2">Te enviamos un WhatsApp</div>
                  <div className="text-text-2 max-w-md mx-auto">
                    Confirmamos tu cita #{confirmed.id} y te recordaremos 2h antes con botones para
                    confirmar, reagendar o cancelar.
                  </div>
                  <button
                    onClick={() => { setStep("service"); setService(null); setBarber(null); setSlot(null); setConfirmed(null); setClient({name:"",email:"",phone:""}); }}
                    className="mt-8 btn-ghost px-6 py-3 rounded-full text-sm"
                  >
                    Reservar otra cita
                  </button>
                </div>
              </Pane>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Pane({ title, icon, onBack, children }: { title: string; icon?: React.ReactNode; onBack?: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">{icon}</div>
          <h2 className="font-display text-2xl">{title}</h2>
        </div>
        {onBack && (
          <button onClick={onBack} className="btn-ghost px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Atrás
          </button>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function Stepper({ current }: { current: number }) {
  const labels = ["Servicio", "Barbero", "Hora", "Datos", "Listo"];
  return (
    <div className="flex items-center justify-between gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex-1 flex items-center gap-2">
          <div
            className={cn(
              "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition",
              i < current && "bg-accent text-bg-void",
              i === current && "bg-accent text-bg-void ring-4 ring-accent/20",
              i > current && "bg-bg-overlay text-text-muted border border-border-medium",
            )}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          <div className={cn("text-xs hidden sm:block", i <= current ? "text-text" : "text-text-muted")}>{l}</div>
          {i < labels.length - 1 && <div className={cn("flex-1 h-px", i < current ? "bg-accent" : "bg-border-medium")} />}
        </div>
      ))}
    </div>
  );
}

function DatePicker({ value, onChange, tz }: { value: string; onChange: (d: string) => void; tz: string }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
      {days.map((d) => {
        const iso = isoDate(d);
        const sel = iso === value;
        return (
          <button
            key={iso}
            onClick={() => onChange(iso)}
            className={cn(
              "shrink-0 px-3 py-3 rounded-xl border text-center min-w-[68px] transition",
              sel ? "bg-accent text-bg-void border-accent" : "border-border-medium hover:border-accent",
            )}
          >
            <div className="text-[10px] uppercase opacity-70">{WEEKDAYS_ES[d.getDay()]}</div>
            <div className="font-display text-xl tabular-nums">{d.getDate()}</div>
            <div className="text-[10px] opacity-70">{d.toLocaleDateString("es-MX", { month: "short", timeZone: tz })}</div>
          </button>
        );
      })}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", className }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="mt-1 w-full px-4 py-3 rounded-xl bg-bg-overlay/60 border border-border-medium focus:border-accent focus:outline-none text-text placeholder:text-text-muted transition"
      />
    </label>
  );
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
