import { RatingClient } from "@/components/client/RatingClient";

interface Status {
  token: string;
  submitted: boolean;
  submitted_at: string | null;
  stars: number;
  barber_name: string | null;
  client_first_name: string | null;
}

async function loadRating(token: string): Promise<Status | null> {
  const apiBase = process.env.BARBERPRO_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
  try {
    const res = await fetch(`${apiBase}/public/ratings/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Status;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function RatingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const initial = await loadRating(token);

  if (!initial) {
    return (
      <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display italic text-4xl text-ink mb-4">Enlace inválido</h1>
        <p className="text-ink-2 max-w-md">
          Este link de calificación no existe o ya fue usado. Si llegaste por
          error, ignora este mensaje.
        </p>
      </main>
    );
  }

  return <RatingClient initial={initial} />;
}
