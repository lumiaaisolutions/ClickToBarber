"use client";

import { useState, useTransition } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

interface Status {
  token: string;
  submitted: boolean;
  submitted_at: string | null;
  stars: number;
  barber_name: string | null;
  client_first_name: string | null;
}

export function RatingClient({ initial }: { initial: Status }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(initial.submitted);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (stars < 1) {
      setError("Elige una calificación entre 1 y 5 estrellas.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/public/ratings/${initial.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          data?.error === "already_submitted"
            ? "Esta cita ya fue calificada antes."
            : "Error al enviar tu calificación.",
        );
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-md w-full text-center">
        <Logo className="mx-auto h-9 text-primary mb-10" />

        {submitted ? (
          <>
            <div className="w-14 h-14 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="font-display italic text-3xl sm:text-4xl text-ink mb-3">
              ¡Gracias{initial.client_first_name ? `, ${initial.client_first_name}` : ""}!
            </h1>
            <p className="text-ink-2 leading-relaxed">
              Tu opinión nos ayuda a seguir mejorando. Si tu corte fue 5★,
              compártelo con tus amigos — saber recomendar es saber elegir.
            </p>
          </>
        ) : (
          <>
            <div className="text-[10px] tracking-imperial text-accent-3 mb-3">
              ¿Cómo nos fue?
            </div>
            <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-[1.05] mb-3">
              {initial.client_first_name
                ? `Hola, ${initial.client_first_name}.`
                : "Tu opinión cuenta."}
            </h1>
            <p className="text-ink-2 mb-8">
              {initial.barber_name
                ? `¿Cómo te fue con ${initial.barber_name}?`
                : "Califica tu última visita."}
            </p>

            <form onSubmit={submit} className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = (hover || stars) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${n} estrellas`}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      onFocus={() => setHover(n)}
                      onBlur={() => setHover(0)}
                      onClick={() => setStars(n)}
                      className="p-1 rounded-full transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        size={36}
                        strokeWidth={1.5}
                        className={cn(
                          "transition-colors",
                          filled ? "text-accent fill-accent" : "text-ink-muted",
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Cuéntanos qué te pareció (opcional)…"
                className="input-boxed w-full resize-none"
              />

              {error && (
                <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending || stars < 1}
                className="btn btn-primary w-full justify-center disabled:opacity-50"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : null}
                Enviar calificación
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
