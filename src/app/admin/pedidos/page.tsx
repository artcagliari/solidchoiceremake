"use client";

import { useEffect, useState, useMemo } from "react";
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
  if (s === "awaiting_payment") return "Aguardando pagamento";
  if (s === "paid") return "Pago";
  if (s === "confirmed") return "Confirmado";
  if (s === "shipping") return "Em separação";
  if (s === "out_for_delivery") return "Saiu para entrega";
  if (s === "delivered") return "Entregue";
  if (s === "canceled") return "Cancelado";
  return "Pendente";
}

function statusBucket(status: string | null) {
  const s = (status ?? "pending").toLowerCase();
  if (["paid", "confirmed"].includes(s)) return "paid_flow";
  if (["shipping", "out_for_delivery"].includes(s)) return "shipping_flow";
  if (s === "delivered") return "delivered";
  if (s === "canceled") return "canceled";
  if (s === "awaiting_payment") return "awaiting_payment";
  return "pending";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "awaiting_payment", label: "Aguardando pagamento" },
  { value: "paid", label: "Pago" },
  { value: "confirmed", label: "Confirmado" },
  { value: "shipping", label: "Em separação" },
  { value: "out_for_delivery", label: "Saiu para entrega" },
  { value: "delivered", label: "Entregue" },
  { value: "canceled", label: "Cancelado" },
];

const FILTER_TABS = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendentes" },
  { id: "awaiting_payment", label: "Aguardando pag." },
  { id: "paid", label: "Pagos" },
  { id: "in_progress", label: "Em andamento" },
  { id: "delivered", label: "Entregues" },
  { id: "canceled", label: "Cancelados" },
];

export default function AdminPedidosPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filter !== "all") {
      if (filter === "in_progress") {
        list = list.filter((o) =>
          ["confirmed", "shipping", "out_for_delivery"].includes((o.status ?? "").toLowerCase())
        );
      } else {
        list = list.filter((o) => (o.status ?? "").toLowerCase() === filter);
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.email ?? "").toLowerCase().includes(q) ||
          (o.shipping_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filter, search]);

  const financeRows = useMemo(() => {
    const rows = [
      { key: "pending", label: "Pendentes" },
      { key: "awaiting_payment", label: "Aguardando pagamento" },
      { key: "paid_flow", label: "Pagos/Confirmados" },
      { key: "shipping_flow", label: "Em separação/Entrega" },
      { key: "delivered", label: "Entregues" },
      { key: "canceled", label: "Cancelados" },
    ] as const;

    return rows.map((row) => {
      const items = orders.filter((o) => statusBucket(o.status) === row.key);
      const total = items.reduce((acc, o) => acc + (typeof o.total_cents === "number" ? o.total_cents : 0), 0);
      return { ...row, count: items.length, total };
    });
  }, [orders]);

  const financeSummary = useMemo(() => {
    const totalOrders = orders.length;
    const gross = orders.reduce(
      (acc, o) => acc + (typeof o.total_cents === "number" ? o.total_cents : 0),
      0
    );
    const awaiting = financeRows.find((r) => r.key === "awaiting_payment");
    const paid = financeRows.find((r) => r.key === "paid_flow");
    const delivered = financeRows.find((r) => r.key === "delivered");
    return {
      totalOrders,
      gross,
      awaitingCount: awaiting?.count ?? 0,
      awaitingTotal: awaiting?.total ?? 0,
      paidCount: paid?.count ?? 0,
      paidTotal: paid?.total ?? 0,
      deliveredCount: delivered?.count ?? 0,
      deliveredTotal: delivered?.total ?? 0,
    };
  }, [orders, financeRows]);

  const loadOrders = async (t: string) => {
    const res = await fetch("/api/admin/orders", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const json = (await res.json()) as { items?: Order[] };
    setOrders(Array.isArray(json.items) ? json.items : []);
  };

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

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

  const updateOrder = async (payload: { id: string; status?: string }) => {
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
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar pedido.";
      setError(msg);
    }
  };

  const buildWhatsAppMessage = (o: Order) => {
    const orderUrl = o.public_token && origin ? `${origin}/pedido/${o.public_token}` : "";
    const payUrl = (o.payment_link ?? "").trim();
    const lines = [
      "Olá! Seguem os dados do seu pedido na Solid Choice.",
      "",
      `Pedido: ${o.id}`,
      orderUrl ? `Link do pedido: ${orderUrl}` : null,
      payUrl ? `Link de pagamento: ${payUrl}` : null,
      "",
      "Assim que o pagamento for confirmado, o status será atualizado.",
    ].filter(Boolean) as string[];
    return lines.join("\n");
  };

  const copyWhatsApp = async (o: Order) => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage(o));
      setNotice("Mensagem copiada. Cole no WhatsApp e envie ao cliente.");
      setTimeout(() => setNotice(null), 3500);
    } catch {
      alert("Não foi possível copiar.");
    }
  };

  const generateLink = async (o: Order) => {
    await updateOrder({ id: o.id, status: "awaiting_payment" });
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">Admin</p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Pedidos</h1>
            <p className="mt-2 text-slate-200">
              Gerencie pedidos, gere links de pagamento e envie mensagens ao cliente.
            </p>
          </div>
          <Link
            href="/admin"
            className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Voltar ao admin
          </Link>
        </header>

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
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                        filter === tab.id
                          ? "cta"
                          : "border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:max-w-xs">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    Pesquisa por pedido
                  </label>
                  <input
                    type="search"
                    placeholder="ID, e-mail ou nome..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Pedidos (total)</p>
                  <p className="mt-2 text-xl font-semibold text-[#f2d3a8]">{financeSummary.totalOrders}</p>
                  <p className="mt-1 text-xs text-slate-400">{priceLabel(financeSummary.gross)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Aguardando pagamento</p>
                  <p className="mt-2 text-xl font-semibold text-amber-300">{financeSummary.awaitingCount}</p>
                  <p className="mt-1 text-xs text-slate-400">{priceLabel(financeSummary.awaitingTotal)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Pagos/Confirmados</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-300">{financeSummary.paidCount}</p>
                  <p className="mt-1 text-xs text-slate-400">{priceLabel(financeSummary.paidTotal)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Entregues</p>
                  <p className="mt-2 text-xl font-semibold text-sky-300">{financeSummary.deliveredCount}</p>
                  <p className="mt-1 text-xs text-slate-400">{priceLabel(financeSummary.deliveredTotal)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                  Tabela de preços por status
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                      <tr>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Qtd pedidos</th>
                        <th className="px-2 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      {financeRows.map((row) => (
                        <tr key={row.key} className="border-t border-white/10">
                          <td className="px-2 py-2">{row.label}</td>
                          <td className="px-2 py-2">{row.count}</td>
                          <td className="px-2 py-2">{priceLabel(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredOrders.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Nenhum pedido corresponde aos filtros.
                  </p>
                ) : (
                  filteredOrders.map((o) => {
                    const isExpanded = expandedId === o.id;
                    const status = (o.status ?? "pending").toLowerCase();
                    const hasPaymentLink = Boolean((o.payment_link ?? "").trim());

                    return (
                      <div
                        key={o.id}
                        className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                      >
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 p-4 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : o.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  status === "canceled"
                                    ? "bg-red-500/20 text-red-300"
                                    : status === "delivered"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : status === "paid" || status === "confirmed"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-slate-500/20 text-slate-300"
                                }`}
                              >
                                {statusLabel(o.status)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(o.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold text-[#f2d3a8]">
                              {o.id}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {o.email ?? o.shipping_name ?? "—"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-[#f2d3a8]">
                              {priceLabel(o.total_cents)}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400">
                              Total
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={o.status ?? "pending"}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateOrder({ id: o.id, status: e.target.value });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-100 outline-none"
                            >
                              {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {!hasPaymentLink && status === "pending" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  generateLink(o);
                                }}
                                className="cta rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                              >
                                Gerar link
                              </button>
                            )}
                            {hasPaymentLink && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyWhatsApp(o);
                                }}
                                className="cta-secondary rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                              >
                                Copiar p/ WhatsApp
                              </button>
                            )}
                            {o.public_token && (
                              <Link
                                href={`/pedido/${o.public_token}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="cta-secondary rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                              >
                                Ver pedido
                              </Link>
                            )}
                            <span
                              className={`inline-block w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            >
                              ▼
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/10 bg-black/20 p-4 space-y-4">
                            {o.order_items && o.order_items.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                  Itens
                                </p>
                                <ul className="space-y-1.5">
                                  {o.order_items.map((it) => (
                                    <li
                                      key={it.id}
                                      className="flex justify-between text-sm text-slate-200"
                                    >
                                      <span>{it.product?.name ?? "Produto"} x{it.quantity}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {(o.shipping_address || o.shipping_city || o.shipping_name) && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                  Endereço de entrega
                                </p>
                                <div className="text-sm text-slate-200 space-y-0.5">
                                  {o.shipping_name && <p>{o.shipping_name}</p>}
                                  {o.shipping_phone && <p>{o.shipping_phone}</p>}
                                  {o.shipping_address && <p>{o.shipping_address}</p>}
                                  {(o.shipping_city || o.shipping_state || o.shipping_zip) && (
                                    <p>
                                      {o.shipping_city ?? ""} / {o.shipping_state ?? ""} - {o.shipping_zip ?? ""}
                                    </p>
                                  )}
                                  {o.shipping_notes && (
                                    <p className="text-slate-400">{o.shipping_notes}</p>
                                  )}
                                </div>
                              </div>
                            )}
                            {o.payment_link && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                  Link de pagamento
                                </p>
                                <a
                                  href={o.payment_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#f2d3a8] underline break-all"
                                >
                                  {o.payment_link}
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
