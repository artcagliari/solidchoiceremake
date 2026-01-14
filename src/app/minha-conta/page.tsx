"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  status: string | null;
  total_cents: number | null;
  created_at: string | null;
  payment_link?: string | null;
  public_token?: string | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    product?: {
      id: string;
      name: string;
      hero_image: string | null;
      slug: string | null;
      price_cents: number | null;
    } | null;
  }>;
};

function priceLabel(price_cents: number | null | undefined) {
  if (typeof price_cents !== "number" || price_cents <= 0) return "Sob consulta";
  return `R$ ${(price_cents / 100).toFixed(2).replace(".", ",")}`;
}

function statusLabel(status: string | null) {
  const s = (status ?? "pending").toLowerCase();
  if (s === "awaiting_payment") return "AGUARDANDO PAGAMENTO";
  if (s === "paid") return "PAGO";
  if (s === "confirmed") return "CONFIRMADO";
  if (s === "shipping") return "EM SEPARAÇÃO";
  if (s === "out_for_delivery") return "SAIU PARA ENTREGA";
  if (s === "delivered") return "ENTREGUE";
  if (s === "canceled") return "CANCELADO";
  return "PENDENTE";
}

export default function MinhaContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/orders/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as { items?: Order[] };
        setOrders(Array.isArray(json.items) ? json.items : []);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar seus pedidos.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">
              Área do cliente
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Minhas compras</h1>
            <p className="mt-2 text-slate-200">
              Aqui você acompanha o status dos seus pedidos.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Ir pra loja
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
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
              Você ainda não tem compras confirmadas.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                        {statusLabel(o.status)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#f2d3a8] break-all">
                        {o.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                        Total
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#f2d3a8]">
                        {priceLabel(o.total_cents)}
                      </p>
                    </div>
                  </div>

                  {o.payment_link || o.public_token ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.public_token ? (
                        <Link
                          href={`/pedido/${o.public_token}`}
                          className="cta-secondary rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                        >
                          Abrir pedido
                        </Link>
                      ) : null}
                      {o.payment_link ? (
                        <a
                          href={o.payment_link}
                          target="_blank"
                          rel="noreferrer"
                          className="cta rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                        >
                          Pagar agora
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {o.order_items?.length ? (
                    <div className="mt-4 space-y-3">
                      {o.order_items.map((it) => {
                        const p = it.product;
                        const img = p?.hero_image || "/assets/banner-facil.png";
                        const href = p?.slug ? `/loja/${p.slug}` : "/loja";
                        return (
                          <div
                            key={it.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Link
                                href={href}
                                className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/20"
                              >
                                <Image
                                  src={img}
                                  alt={p?.name ?? "Produto"}
                                  fill
                                  className="object-cover"
                                />
                              </Link>
                              <div>
                                <Link
                                  href={href}
                                  className="text-sm font-semibold text-slate-100 hover:underline"
                                >
                                  {p?.name ?? "Produto"}
                                </Link>
                                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                                  {priceLabel(p?.price_cents ?? null)}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                              x{it.quantity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


