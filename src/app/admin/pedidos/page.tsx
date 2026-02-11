"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  status: string | null;
  total_cents: number | null;
  email: string | null;
  created_at: string | null;
  payment_link?: string | null;
  public_token?: string | null;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_zip?: string | null;
  shipping_notes?: string | null;
  order_items?: Array<{
    id: string;
    quantity: number;
    product?: { id: string; name: string; hero_image?: string | null; slug?: string | null } | null;
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

const STATUS_OPTIONS = [
  "pending",
  "awaiting_payment",
  "paid",
  "confirmed",
  "shipping",
  "out_for_delivery",
  "delivered",
  "canceled",
];

export default function AdminPedidosPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({});

  const loadOrders = async (t: string) => {
    const res = await fetch("/api/admin/orders", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const json = (await res.json()) as { items?: Order[] };
    const items = Array.isArray(json.items) ? json.items : [];
    setOrders(items);
    setPaymentLinks((prev) => {
      const next = { ...prev };
      items.forEach((o) => {
        if (next[o.id] === undefined) next[o.id] = o.payment_link ?? "";
      });
      return next;
    });
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token;
      if (!t) {
        router.replace("/login");
        return;
      }
      setToken(t);
      try {
        await loadOrders(t);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro carregando pedidos.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const updateOrder = async (payload: { id: string; status?: string; payment_link?: string | null }) => {
    if (!token) return;
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadOrders(token);
      setNotice("Pedido atualizado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar pedido.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">Admin</p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Pedidos</h1>
            <p className="mt-2 text-slate-200">Organize os pedidos e gere links de pagamento.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar ao admin
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-slate-200">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-2xl border border-[#f2d3a8]/25 bg-[#f2d3a8]/10 px-4 py-3 text-sm text-slate-200">
            {notice}
          </div>
        ) : null}

        <div className="mt-8 section-shell rounded-3xl p-6">
          {loading ? (
            <p className="text-sm text-slate-200">Carregando...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-200">Nenhum pedido encontrado.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                        {statusLabel(o.status)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#f2d3a8] break-all">{o.id}</p>
                      <p className="mt-1 text-xs text-slate-300">{o.email ?? "sem e-mail"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total</p>
                      <p className="mt-1 text-sm font-semibold text-[#f2d3a8]">
                        {priceLabel(o.total_cents)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Status</span>
                      <select
                        value={o.status ?? "pending"}
                        onChange={(e) => updateOrder({ id: o.id, status: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-300">
                        Link de pagamento
                      </span>
                      <input
                        value={paymentLinks[o.id] ?? ""}
                        onChange={(e) =>
                          setPaymentLinks((prev) => ({ ...prev, [o.id]: e.target.value }))
                        }
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                        placeholder="Gerar link automaticamente"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateOrder({ id: o.id, status: "awaiting_payment" })}
                      className="cta rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    >
                      Gerar link
                    </button>
                    <button
                      type="button"
                      onClick={() => updateOrder({ id: o.id, payment_link: paymentLinks[o.id] ?? "" })}
                      className="cta-secondary rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                    >
                      Salvar link
                    </button>
                    {o.public_token ? (
                      <Link
                        href={`/pedido/${o.public_token}`}
                        className="cta-secondary rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                      >
                        Ver pedido
                      </Link>
                    ) : null}
                  </div>

                  {o.shipping_address || o.shipping_city ? (
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
                      <div className="font-semibold text-slate-100">Endereço</div>
                      <div>{o.shipping_name ?? "—"}</div>
                      <div>{o.shipping_phone ?? "—"}</div>
                      <div>{o.shipping_address ?? "—"}</div>
                      <div>
                        {o.shipping_city ?? "—"} / {o.shipping_state ?? "—"} - {o.shipping_zip ?? "—"}
                      </div>
                      {o.shipping_notes ? <div>{o.shipping_notes}</div> : null}
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
