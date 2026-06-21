import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Política de Cookies — LUMIA",
};

export default function CookiesPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Política de Cookies" lastUpdated="2026-05-07">
      <p>
        Esta Política explica qué cookies y tecnologías similares usa{" "}
        <strong>LUMIA</strong>, para qué sirven y cómo gestionarlas.
      </p>

      <h2>1. Cookies estrictamente necesarias</h2>
      <p>No pueden desactivarse — sin ellas el Servicio no funciona.</p>
      <ul>
        <li>
          <code>bp_token</code> — sesión autenticada del portal admin (httpOnly,
          Secure, SameSite=Lax). Se borra al cerrar sesión.
        </li>
        <li>
          <code>bp_tenant</code> — slug del tenant activo (no httpOnly, sólo lectura
          en el cliente para mostrar branding correcto).
        </li>
        <li>
          <code>XSRF-TOKEN</code> — protección CSRF del backend Laravel cuando
          aplique.
        </li>
      </ul>

      <h2>2. Cookies de preferencias</h2>
      <ul>
        <li>
          <code>lumia:preload-shown</code> (sessionStorage) — recuerda si ya viste
          el preloader inicial en la sesión actual.
        </li>
        <li>
          Tema claro/oscuro y selección de modo si los activas.
        </li>
      </ul>

      <h2>3. Cookies analíticas</h2>
      <p>
        Actualmente no usamos cookies analíticas de terceros (Google Analytics,
        Hotjar). Las métricas se generan server-side y son agregadas/anónimas.
      </p>

      <h2>4. Cookies de marketing</h2>
      <p>No usamos cookies de marketing ni retargeting.</p>

      <h2>5. Cómo gestionarlas</h2>
      <p>
        Puedes borrar cookies desde tu navegador (Chrome / Firefox / Safari). Borrar{" "}
        <code>bp_token</code> equivale a cerrar sesión.
      </p>

      <h2>6. Cambios</h2>
      <p>
        Si añadimos cookies analíticas o de marketing en el futuro, mostraremos un
        banner de consentimiento conforme a GDPR / ePrivacy y actualizaremos esta
        política.
      </p>

      <h2>7. Contacto</h2>
      <p>
        <a href="mailto:privacy@lumiaaisolutions.com">privacy@lumiaaisolutions.com</a>
      </p>
    </LegalLayout>
  );
}
