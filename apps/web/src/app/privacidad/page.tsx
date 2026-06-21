import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Política de Privacidad — LUMIA",
  description: "Cómo LUMIA recolecta, usa y protege tus datos personales.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Política de Privacidad" lastUpdated="2026-05-07">
      <p>
        Esta Política describe cómo <strong>LUMIA AI Solutions</strong> recolecta,
        usa y protege los datos personales tuyos y de tus clientes finales.
      </p>

      <h2>1. Datos que recolectamos</h2>
      <h3>Del administrador (tú)</h3>
      <ul>
        <li>Email, nombre, teléfono, contraseña hasheada (nunca en claro).</li>
        <li>Datos de facturación (procesados por Stripe / MercadoPago).</li>
        <li>Logs de acceso y uso para seguridad y soporte.</li>
      </ul>
      <h3>De tus clientes finales</h3>
      <ul>
        <li>Nombre, email, teléfono — éstos los cargas tú al crear citas.</li>
        <li>Historial de citas, servicios y pagos.</li>
        <li>Teléfono y notas se almacenan <strong>cifrados en reposo</strong> con AES-256.</li>
      </ul>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Operar el Servicio (agendar, notificar por WhatsApp, cobrar).</li>
        <li>Soporte y prevención de fraude.</li>
        <li>Métricas agregadas y anónimas para mejorar el producto.</li>
      </ul>
      <p>
        <strong>No vendemos tus datos ni los de tus clientes</strong>. No los
        compartimos con terceros excepto los procesadores estrictamente necesarios:
        Stripe, MercadoPago, Meta WhatsApp, Twilio, AWS / GCP para hosting.
      </p>

      <h2>3. Tus derechos (GDPR / LFPDPPP)</h2>
      <p>
        Como titular de datos puedes ejercer los derechos ARCO/GDPR:
      </p>
      <ul>
        <li><strong>Acceso</strong>: descargar todos tus datos en formato JSON desde el portal.</li>
        <li><strong>Rectificación</strong>: editar tus datos directamente.</li>
        <li><strong>Cancelación / Borrado</strong>: solicitar la eliminación con un clic.</li>
        <li><strong>Oposición</strong>: opt-out de comunicaciones no transaccionales.</li>
        <li><strong>Portabilidad</strong>: exportación en formato estándar.</li>
      </ul>
      <p>
        El admin de cada barbería tiene endpoints para tus clientes finales en
        <code>/admin/billing → Datos GDPR</code>.
      </p>

      <h2>4. Retención</h2>
      <p>
        Los datos se conservan mientras la suscripción esté activa. Tras cancelación,
        se mantienen 90 días por si reactivas. Pasado ese período, se eliminan
        permanentemente excepto registros que la ley exige conservar (facturas: 5
        años en México).
      </p>

      <h2>5. Seguridad</h2>
      <ul>
        <li>Cifrado TLS 1.2+ en tránsito.</li>
        <li>Cifrado AES-256 en reposo para datos sensibles (teléfonos, notas).</li>
        <li>Aislamiento por tenant a nivel de motor de base de datos (Row Level Security).</li>
        <li>Tokens API con rotación cada 7 días.</li>
        <li>Auditoría de acceso registrada con request_id y trazabilidad completa.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        Ver nuestra <a href="/cookies">Política de Cookies</a>.
      </p>

      <h2>7. Contacto del DPO</h2>
      <p>
        <a href="mailto:privacy@lumiaaisolutions.com">privacy@lumiaaisolutions.com</a>
      </p>
    </LegalLayout>
  );
}
