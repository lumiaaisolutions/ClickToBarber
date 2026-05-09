import { ImagePlus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Galería — LUMIA" };

export default function GalleryPage() {
  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <header>
        <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Marketing</div>
        <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Galería de cortes</h1>
        <p className="text-ink-2 text-sm mt-3 leading-relaxed">
          Antes y después con consentimiento del cliente. Por defecto las fotos
          expiran en 180 días si el cliente no da consent permanente
          (cumple GDPR/LFPDPPP).
        </p>
      </header>

      <EmptyState
        icon={<ImagePlus size={20} />}
        title="Sube tu primer corte"
        description="Funcionalidad disponible vía API. UI con upload S3 y editor antes/después en el siguiente sprint."
      />

      <div className="card-paper p-5 sm:p-6 text-sm text-ink-2">
        <h3 className="font-display italic text-lg text-ink mb-2">Reglas</h3>
        <ul className="list-disc pl-5 space-y-1.5 text-xs leading-relaxed">
          <li>Subir foto requiere <code>client_consent = true</code> + texto firmado.</li>
          <li>Sin consent permanente, la foto se borra automáticamente a los 180 días.</li>
          <li>Sólo el admin del tenant puede publicar (<code>is_published = true</code>).</li>
          <li>El cliente puede pedir borrado en cualquier momento desde <code>/me</code>.</li>
        </ul>
      </div>
    </div>
  );
}
