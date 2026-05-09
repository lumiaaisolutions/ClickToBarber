"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check, Loader2, Lock, AlertTriangle } from "lucide-react";
import { fmtCents, cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price_cents: number;
  cost_cents: number | null;
  currency: string;
  stock: number;
  stock_min: number;
  low_stock: boolean;
  is_active: boolean;
}

type FormState = {
  name: string;
  sku: string;
  description: string;
  price_cents: number;
  cost_cents: number | null;
  stock: number;
  stock_min: number;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  sku: "",
  description: "",
  price_cents: 30000,
  cost_cents: null,
  stock: 0,
  stock_min: 5,
  is_active: true,
};

export function ProductsClient({
  initial,
  canWrite,
}: {
  initial: Product[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(form: FormState) {
    setError(null);
    const isCreate = editing === "new";
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description || null,
      price_cents: Number(form.price_cents),
      cost_cents: form.cost_cents !== null ? Number(form.cost_cents) : null,
      stock: Number(form.stock),
      stock_min: Number(form.stock_min),
      is_active: form.is_active,
    };

    startTransition(async () => {
      const url = isCreate
        ? "/api/admin/products"
        : `/api/admin/products/${(editing as Product).id}`;
      const method = isCreate ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { message?: string; errors?: Record<string, string[]> }
          | null;
        const firstErr = json?.errors ? Object.values(json.errors)[0]?.[0] : null;
        setError(firstErr ?? json?.message ?? "Error al guardar.");
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove(p: Product) {
    if (!confirm(`¿Eliminar el producto "${p.name}"?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("No se pudo eliminar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-imperial text-accent-3 mb-3">Inventario</div>
          <h1 className="font-display italic text-3xl sm:text-5xl text-ink leading-tight">Productos</h1>
          <p className="text-ink-2 text-sm mt-3">{initial.length} productos en stock para POS.</p>
        </div>
        {canWrite ? (
          <button
            onClick={() => setEditing("new")}
            className="btn btn-primary self-start sm:self-auto"
          >
            <Plus size={14} /> Añadir producto
          </button>
        ) : (
          <div className="text-xs text-ink-muted inline-flex items-center gap-1.5">
            <Lock size={12} /> sólo lectura
          </div>
        )}
      </header>

      {error && (
        <div className="p-3 rounded-[10px] bg-danger/8 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {initial.map((p) => (
          <article key={p.id} className="card-paper p-4 sm:p-5 group flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="font-display italic text-lg sm:text-xl text-ink truncate">
                  {p.name}
                </h2>
                <div className="text-[10px] text-ink-muted font-mono mt-1">{p.sku}</div>
              </div>
              {p.low_stock && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 shrink-0">
                  <AlertTriangle size={10} /> Bajo
                </span>
              )}
            </div>
            {p.description && (
              <p className="text-xs text-ink-2 leading-snug mb-3 line-clamp-2">{p.description}</p>
            )}
            <hr className="hairline my-3" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] text-ink-muted uppercase tracking-wider">Precio</div>
                <div className="font-display italic text-xl text-primary tabular-nums">
                  {fmtCents(p.price_cents, p.currency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-ink-muted uppercase tracking-wider">Stock</div>
                <div
                  className={cn(
                    "font-display italic text-xl tabular-nums",
                    p.low_stock ? "text-warning" : "text-ink",
                  )}
                >
                  {p.stock}{" "}
                  <span className="text-ink-muted text-xs">/ min {p.stock_min}</span>
                </div>
              </div>
            </div>
            {canWrite && (
              <div className="mt-4 pt-3 border-t border-line-fine flex items-center gap-2">
                <button
                  onClick={() => setEditing(p)}
                  className="btn btn-ghost text-xs py-1.5 px-3"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => remove(p)}
                  className="btn btn-ghost text-xs py-1.5 px-3 text-danger hover:!border-danger"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {editing && (
        <ProductFormModal
          initial={editing === "new" ? null : editing}
          pending={pending}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
          onSubmit={save}
        />
      )}
    </div>
  );
}

function ProductFormModal({
  initial,
  pending,
  onCancel,
  onSubmit,
}: {
  initial: Product | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (f: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          name: initial.name,
          sku: initial.sku,
          description: initial.description ?? "",
          price_cents: initial.price_cents,
          cost_cents: initial.cost_cents,
          stock: initial.stock,
          stock_min: initial.stock_min,
          is_active: initial.is_active,
        }
      : EMPTY,
  );

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:px-4 sm:py-6 bg-ink/40 backdrop-blur-sm overflow-y-auto"
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="card-paper w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-8 my-auto"
      >
        <header className="flex items-start justify-between mb-5 sm:mb-7 gap-3">
          <div className="min-w-0">
            <div className="text-[10px] tracking-imperial text-accent-3 mb-1">
              {initial ? "Editar" : "Nuevo"}
            </div>
            <h2 className="font-display italic text-2xl sm:text-3xl text-ink truncate">
              {initial ? initial.name : "Nuevo producto"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-ink-muted hover:text-ink p-1 shrink-0"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
            <Field label="Nombre">
              <input
                className="input-boxed"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />
            </Field>
            <Field label="SKU">
              <input
                className="input-boxed font-mono text-sm"
                value={form.sku}
                onChange={(e) => update("sku", e.target.value.toUpperCase())}
                required
              />
            </Field>
          </div>

          <Field label="Descripción">
            <textarea
              className="input-boxed"
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio (centavos)">
              <input
                type="number"
                min={0}
                className="input-boxed font-mono"
                value={form.price_cents}
                onChange={(e) => update("price_cents", Number(e.target.value))}
              />
            </Field>
            <Field label="Costo (centavos)">
              <input
                type="number"
                min={0}
                className="input-boxed font-mono"
                value={form.cost_cents ?? ""}
                onChange={(e) =>
                  update(
                    "cost_cents",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock actual">
              <input
                type="number"
                min={0}
                className="input-boxed font-mono"
                value={form.stock}
                onChange={(e) => update("stock", Number(e.target.value))}
              />
            </Field>
            <Field label="Stock mínimo">
              <input
                type="number"
                min={0}
                className="input-boxed font-mono"
                value={form.stock_min}
                onChange={(e) => update("stock_min", Number(e.target.value))}
              />
            </Field>
          </div>

          <Field label="Estado">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update("is_active", e.target.checked)}
              />
              <span className="text-sm">Disponible para venta</span>
            </label>
          </Field>
        </div>

        <div className="mt-7 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary disabled:opacity-50"
          >
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-imperial text-ink-muted mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}
