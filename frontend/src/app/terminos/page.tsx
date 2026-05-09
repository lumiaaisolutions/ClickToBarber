import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Términos y Condiciones — LUMIA",
  description: "Términos de servicio del software LUMIA para barberías.",
};

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Términos y Condiciones" lastUpdated="2026-05-07">
      <p>
        Estos Términos rigen el uso de <strong>LUMIA</strong> ("el Servicio"), software
        SaaS para gestión de barberías propiedad de LUMIA AI Solutions.
      </p>

      <h2>1. Aceptación</h2>
      <p>
        Al crear una cuenta o usar el Servicio aceptas estos Términos. Si actúas en
        nombre de un negocio, declaras tener autoridad para vincularlo.
      </p>

      <h2>2. Suscripción y pago</h2>
      <p>
        El Servicio se provee bajo modelo de suscripción mensual o anual a través de
        Stripe o MercadoPago. Los pagos son recurrentes hasta que se cancele la
        suscripción desde el portal de cliente. No hay reembolsos por períodos
        parciales ya facturados.
      </p>
      <p>
        El plan Free tiene funciones limitadas y puede ser modificado o
        descontinuado con 30 días de aviso.
      </p>

      <h2>3. Uso aceptable</h2>
      <ul>
        <li>No usar el Servicio para actividades ilegales o que vulneren derechos de terceros.</li>
        <li>No realizar ingeniería inversa, scraping masivo o ataques al Servicio.</li>
        <li>Mantener la confidencialidad de las credenciales; eres responsable del uso de tu cuenta.</li>
        <li>Cumplir con la legislación de protección de datos al cargar información de tus clientes finales.</li>
      </ul>

      <h2>4. Datos del cliente</h2>
      <p>
        Los datos que cargues (clientes finales, citas, finanzas) son tuyos. LUMIA
        actúa como Encargado de Tratamiento. Puedes exportarlos en cualquier momento
        desde el portal admin (sección <em>Suscripción → Exportar datos</em>) y
        solicitar la eliminación completa en cualquier momento.
      </p>

      <h2>5. Disponibilidad</h2>
      <p>
        Trabajamos para mantener el Servicio disponible 99.5% del tiempo en cómputo
        mensual. No garantizamos disponibilidad ininterrumpida. Mantenimientos
        programados se anuncian con 48h de antelación.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        El Servicio se entrega "tal cual". LUMIA no es responsable por pérdidas
        indirectas, lucro cesante o daños emergentes derivados del uso o
        imposibilidad de uso del Servicio. La responsabilidad máxima se limita al
        importe pagado durante los últimos 12 meses.
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos. Cambios materiales se notifican por email
        con 30 días de antelación. El uso continuado tras la entrada en vigor
        implica aceptación.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por la legislación de México. Cualquier disputa se
        somete a los tribunales competentes de la Ciudad de México, sin perjuicio de
        derechos del consumidor.
      </p>

      <h2>9. Contacto</h2>
      <p>
        <a href="mailto:legal@lumiaaisolutions.com">legal@lumiaaisolutions.com</a>
      </p>
    </LegalLayout>
  );
}
