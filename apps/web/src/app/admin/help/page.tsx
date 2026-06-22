import { CalendarDays, Scissors, MessageCircle, CreditCard, Palette, HelpCircle, ArrowUpRight, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Ayuda — ClickToBarber" };

const HELP_CARDS = [
  {
    icon: CalendarDays,
    title: "Agenda y citas",
    description: "Cómo ver, crear, mover y cancelar citas desde el panel.",
    href: "#faq",
  },
  {
    icon: Scissors,
    title: "Servicios y personal",
    description: "Agrega barberos, define servicios con duración y precio.",
    href: "#faq",
  },
  {
    icon: MessageCircle,
    title: "Notificaciones WhatsApp",
    description: "Activa recordatorios automáticos para tus clientes.",
    href: "#faq",
  },
  {
    icon: CreditCard,
    title: "Mi plan y facturación",
    description: "Entiende tu plan, cambia de nivel o cancela cuando quieras.",
    href: "/admin/billing",
  },
  {
    icon: Palette,
    title: "Diseño de tu sitio",
    description: "Personaliza colores, tipografía y logo de tu barbería.",
    href: "/admin/identity",
  },
  {
    icon: HelpCircle,
    title: "Soporte directo",
    description: "¿No encuentras lo que buscas? Escríbenos y respondemos rápido.",
    href: "mailto:hola@lumiaaisolutions.com",
  },
];

const FAQS = [
  {
    q: "¿Cómo agrego a mis barberos?",
    a: "Ve a Personal en el menú lateral. Haz clic en «Nuevo barbero», llena nombre, email (opcional) y actívalo. El barbero puede iniciar sesión con su correo para ver su agenda.",
  },
  {
    q: "¿Cómo activo reservas en línea para mis clientes?",
    a: "Ve a Mi plan y asegúrate de tener el plan Starter o superior (incluye reservas online). Luego comparte tu link público: clicktobarber.com/b/tu-slug.",
  },
  {
    q: "¿Los clientes necesitan crear una cuenta?",
    a: "No. Entran a tu link, eligen servicio y hora, dejan su nombre y teléfono. Sin apps, sin registro, sin contraseñas.",
  },
  {
    q: "¿Cómo funciona el recordatorio por WhatsApp?",
    a: "Generamos un link wa.me con el mensaje prellenado. Tu cliente recibe un enlace que abre WhatsApp directamente. No necesita Meta Business — todo es un deep-link.",
  },
  {
    q: "¿Qué pasa cuando vence mi prueba de 15 días?",
    a: "El sistema te muestra una pantalla para activar tu plan. Elige el que más te convenga y paga con tarjeta vía Stripe. Tus datos nunca se borran.",
  },
  {
    q: "¿Puedo cambiar mi plan después de pagar?",
    a: "Sí, desde Mi plan puedes subir o bajar de nivel. Al subir, el cobro se proratea. Sin contratos ni permanencia.",
  },
  {
    q: "¿Cómo personalizo el diseño de mi sitio?",
    a: "Ve a Tu marca en el menú. Elige una paleta de colores, tipografía, densidad y estilo de esquinas. Los cambios se ven en vivo mientras editas.",
  },
  {
    q: "¿Puedo tener varias sucursales?",
    a: "Sí, con el plan Enterprise. Cada sucursal tiene su propio panel, barberos y catálogo. Contacta soporte para configurarlo.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-10 sm:space-y-14">
      <header>
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-3">Centro de ayuda</div>
        <h1 className="font-display font-bold tracking-tight text-3xl sm:text-4xl text-ink">¿En qué te ayudamos?</h1>
        <p className="text-ink-2 text-sm mt-3 max-w-lg">
          Encuentra respuestas rápidas, guías paso a paso y formas de contactarnos.
        </p>
      </header>

      {/* Help cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {HELP_CARDS.map(({ icon: Icon, title, description, href }) => (
          <a
            key={title}
            href={href}
            target={href.startsWith("mailto") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="group card-paper hover:border-primary/40 hover:shadow-[0_8px_24px_-8px_rgba(196,146,42,0.18)] transition-all duration-300 flex flex-col gap-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/15 shrink-0">
              <Icon size={18} strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-ink text-base leading-tight group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-xs text-ink-2 mt-1 leading-relaxed">{description}</p>
            </div>
            <div className="text-primary/60 group-hover:text-primary transition-colors self-end">
              <ArrowUpRight size={16} />
            </div>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <section id="faq">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-4">Preguntas frecuentes</div>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-ink mb-6">Lo que más nos preguntan</h2>

        <Card className="divide-y divide-line-fine p-0 overflow-hidden">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group p-5 sm:p-6">
              <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                <span className="font-semibold text-sm sm:text-base text-ink leading-snug">{q}</span>
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  className="shrink-0 mt-0.5 text-primary transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm text-ink-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </Card>
      </section>

      {/* Soporte directo */}
      <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-primary/8 to-accent/8 border border-primary/20">
        <h2 className="font-display font-bold text-xl text-ink mb-2">¿Necesitas más ayuda?</h2>
        <p className="text-sm text-ink-2 mb-5">
          Nuestro equipo responde de lunes a viernes, normalmente en menos de 4 horas.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:hola@lumiaaisolutions.com"
            className="btn btn-primary text-sm"
          >
            Enviar un correo
          </a>
          <a
            href="https://wa.me/5215500000000?text=Hola%2C%20necesito%20ayuda%20con%20ClickToBarber"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-sm"
          >
            WhatsApp <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </div>
  );
}
