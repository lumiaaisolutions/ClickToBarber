import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Logo size={72} />
      <div className="mt-8 text-xs uppercase tracking-[0.4em] text-accent">Error 404</div>
      <h1 className="font-display text-6xl mt-3">Sin filo aquí</h1>
      <p className="text-text-2 mt-3 max-w-md">No encontramos esta ruta. Quizá esa barbería no existe o ya cambió de calle.</p>
      <Link href="/" className="btn-gold px-6 py-3 rounded-full text-sm font-medium mt-8">Volver al inicio</Link>
    </div>
  );
}
