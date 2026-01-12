"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type CartItem = {
  id: string;
  quantity: number;
  size?: string | null;
  product: {
    id: string;
    name: string;
    price_cents: number | null;
    hero_image: string | null;
    slug: string | null;
  } | null;
};

function priceLabel(price_cents: number | null) {
  if (typeof price_cents !== "number" || price_cents <= 0) return "Sob consulta";
  return `R$ ${(price_cents / 100).toFixed(2).replace(".", ",")}`;
}

export default function CarrinhoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const totalLabel = useMemo(() => {
    const totalCents = items.reduce((acc, it) => {
      const price = it.product?.price_cents ?? 0;
      const qty = it.quantity ?? 0;
      return acc + price * qty;
    }, 0);
    return priceLabel(totalCents);
  }, [items]);

  const getTokenOrRedirect = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      router.push("/login");
      return null;
    }
    return token;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      const res = await fetch("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro: ${res.status}`);
      }
      const json = (await res.json()) as { items: CartItem[] };
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar carrinho.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQty = async (item_id: string, quantity: number) => {
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id, quantity }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro: ${res.status}`);
      }
      await load();
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar a quantidade.");
    }
  };

  const removeItem = async (item_id: string) => {
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ item_id }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro: ${res.status}`);
      }
      await load();
    } catch (err) {
      console.error(err);
      alert("Não foi possível remover o item.");
    }
  };

  const checkout = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = await getTokenOrRedirect();
      if (!token) return;

      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro: ${res.status}`);
      }
      const json = (await res.json()) as { whatsapp_url?: string };
      if (!json.whatsapp_url) throw new Error("whatsapp_url não retornado.");
      window.location.href = json.whatsapp_url;
    } catch (err) {
      console.error(err);
      alert("Não foi possível finalizar no WhatsApp. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">
              Carrinho · Cotação
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Seu carrinho</h1>
            <p className="mt-2 text-slate-200">
              Ajuste as quantidades e finalize pelo WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar pra loja
            </Link>
            <Link
              href="/"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Landing
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-slate-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 section-shell rounded-3xl p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-200">Carregando...</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
              Seu carrinho está vazio.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => {
                const p = it.product;
                const img = p?.hero_image || "/assets/banner-facil.png";
                const href = p?.slug ? `/loja/${p.slug}` : "/loja";
                return (
                  <div
                    key={it.id}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Link href={href} className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        <Image src={img} alt={p?.name ?? "Produto"} fill className="object-cover" />
                      </Link>
                      <div>
                        <Link href={href} className="text-sm font-semibold text-[#f2d3a8] hover:underline">
                          {p?.name ?? "Produto"}
                        </Link>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                          {priceLabel(p?.price_cents ?? null)}
                        </p>
                        {it.size ? (
                          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                            Tamanho: {it.size}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="cta-secondary rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                        onClick={() => updateQty(it.id, Math.max(0, (it.quantity ?? 0) - 1))}
                      >
                        -
                      </button>
                      <span className="min-w-10 text-center text-sm text-slate-200">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        className="cta-secondary rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                        onClick={() => updateQty(it.id, (it.quantity ?? 0) + 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="cta-secondary rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                        onClick={() => removeItem(it.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="divider my-4" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-200">
                  <span className="uppercase tracking-[0.12em] text-slate-300">
                    Total:
                  </span>{" "}
                  <span className="font-semibold text-[#f2d3a8]">{totalLabel}</span>
                </div>
                <button
                  type="button"
                  className="cta rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                  onClick={checkout}
                  disabled={submitting}
                >
                  {submitting ? "Gerando WhatsApp..." : "Finalizar no WhatsApp"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


