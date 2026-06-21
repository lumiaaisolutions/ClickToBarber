import { WalkInQueueClient } from "@/components/client/WalkInQueueClient";

export const dynamic = "force-dynamic";

interface QueueStatus {
  tenant: { name: string; slug: string };
  waiting: number;
  estimated_minutes: number;
  queue: Array<{ position: number; first_name: string; arrived_at: string }>;
}

async function loadStatus(slug: string): Promise<QueueStatus | null> {
  const apiBase =
    process.env.BARBERPRO_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
  try {
    const res = await fetch(`${apiBase}/public/queue/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as QueueStatus;
  } catch {
    return null;
  }
}

export default async function QueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initial = await loadStatus(slug);

  if (!initial) {
    return (
      <main className="min-h-screen bg-bg-canvas flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display italic text-3xl text-ink mb-3">Barbería no encontrada</h1>
        <p className="text-ink-2">Verifica el código QR o el link.</p>
      </main>
    );
  }

  return <WalkInQueueClient slug={slug} initial={initial} />;
}
