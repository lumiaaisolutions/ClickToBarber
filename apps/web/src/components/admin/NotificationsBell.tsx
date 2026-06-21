"use client";

import { useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

interface Payload {
  unread_count: number;
  unread: Notification[];
  recent: Notification[];
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      const res = await fetch("/api/admin/notifications");
      if (!stop && res.ok) setData(await res.json());
    }
    load();
    const id = setInterval(load, 60_000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  async function markAll() {
    await fetch("/api/admin/notifications/read", { method: "POST" });
    setData((d) => d ? { ...d, unread_count: 0, unread: [] } : d);
  }

  async function markOne(id: number) {
    await fetch(`/api/admin/notifications/${id}/read`, { method: "POST" });
    setData((d) => {
      if (!d) return d;
      const item = d.unread.find((n) => n.id === id);
      return {
        unread_count: Math.max(0, d.unread_count - 1),
        unread: d.unread.filter((n) => n.id !== id),
        recent: item ? [{ ...item, read_at: new Date().toISOString() }, ...d.recent].slice(0, 20) : d.recent,
      };
    });
  }

  const count = data?.unread_count ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones (${count} sin leer)`}
        className="relative w-9 h-9 rounded-full bg-bg-vellum border border-line-medium hover:border-primary/40 text-ink-2 hover:text-primary transition-all flex items-center justify-center"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-bg-canvas text-[10px] font-mono flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] card-paper shadow-2xl overflow-hidden">
            <header className="px-4 py-3 border-b border-line-fine flex items-center justify-between">
              <span className="font-display italic text-ink">Notificaciones</span>
              {count > 0 && (
                <button onClick={markAll} className="text-[10px] tracking-imperial text-primary hover-spread inline-flex items-center gap-1">
                  <Check size={10} /> Marcar todas
                </button>
              )}
            </header>

            <ul className="max-h-[60vh] overflow-y-auto">
              {data && data.unread.length === 0 && data.recent.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-ink-muted">Sin notificaciones</li>
              )}
              {data?.unread.map((n) => (
                <Item key={n.id} n={n} unread onRead={() => markOne(n.id)} />
              ))}
              {data?.recent.map((n) => (
                <Item key={n.id} n={n} />
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Item({ n, unread, onRead }: { n: Notification; unread?: boolean; onRead?: () => void }) {
  const inner = (
    <>
      {unread && <span className="absolute left-2 top-3 w-1.5 h-1.5 rounded-full bg-primary" />}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-display italic text-ink truncate">{n.title}</div>
          {n.body && <div className="text-xs text-ink-2 mt-0.5 line-clamp-2">{n.body}</div>}
          <div className="text-[10px] text-ink-muted mt-1.5">
            {new Date(n.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
          </div>
        </div>
        {unread && (
          <button onClick={(e) => { e.preventDefault(); onRead?.(); }} className="text-ink-muted hover:text-ink p-1" aria-label="Marcar leída">
            <X size={11} />
          </button>
        )}
      </div>
    </>
  );

  const baseClass = "relative block px-4 py-3 border-b border-line-fine last:border-0 hover:bg-bg-vellum/50 transition-colors pl-6";

  return n.url ? (
    <li>
      <Link href={n.url} className={baseClass} onClick={() => onRead?.()}>{inner}</Link>
    </li>
  ) : (
    <li className={baseClass}>{inner}</li>
  );
}
