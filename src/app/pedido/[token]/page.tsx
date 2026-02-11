"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type OrderItem = {
  id: string;
  quantity: number;
  product?: { id: string; name: string; hero_image?: string | null; price_cents?: number | null } | null;
};

type Order = {
  id: string;
  status: string | null;
  total_cents: number | null;
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
  order_items?: OrderItem[];
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

export default function PedidoPublicoPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [accountToken, setAccountToken] = useState<string | null>(null);

  const [shipping, setShipping] = useState({
    shipping_name: "",
    shipping_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: "",
    shipping_zip: "",
    shipping_notes: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/public/${token}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { item?: Order };
      const item = json.item ?? null;
      setOrder(item);
      if (item) {
        setShipping({
          shipping_name: item.shipping_name ?? "",
          shipping_phone: item.shipping_phone ?? "",
          shipping_address: item.shipping_address ?? "",
          shipping_city: item.shipping_city ?? "",
          shipping_state: item.shipping_state ?? "",
          shipping_zip: item.shipping_zip ?? "",
          shipping_notes: item.shipping_notes ?? "",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar pedido.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token ?? null;
      setAccountToken(t);
    };
    init();
  }, []);

  useEffect(() => {
    const loadAccountAddress = async () => {
      if (!accountToken) return;
      try {
        const res = await fetch("/api/account/address", {
          headers: { Authorization: `Bearer ${accountToken}` },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          item?: {
            name?: string | null;
            phone?: string | null;
            address?: string | null;
            city?: string | null;
            state?: string | null;
            zip?: string | null;
            notes?: string | null;
          } | null;
        };
        const item = json.item;
        if (!item) return;
        setShipping((prev) => ({
          shipping_name: prev.shipping_name || item.name || "",
          shipping_phone: prev.shipping_phone || item.phone || "",
          shipping_address: prev.shipping_address || item.address || "",
          shipping_city: prev.shipping_city || item.city || "",
          shipping_state: prev.shipping_state || item.state || "",
          shipping_zip: prev.shipping_zip || item.zip || "",
          shipping_notes: prev.shipping_notes || item.notes || "",
        }));
      } catch {
        // ignora falha de endereço da conta
      }
    };
    loadAccountAddress();
  }, [accountToken]);

  const saveShipping = async () => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      if (accountToken) {
        await fetch("/api/account/address", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accountToken}`,
          },
          body: JSON.stringify({
            name: shipping.shipping_name,
            phone: shipping.shipping_phone,
            address: shipping.shipping_address,
            city: shipping.shipping_city,
            state: shipping.shipping_state,
            zip: shipping.shipping_zip,
            notes: shipping.shipping_notes,
          }),
        });
      }
      const res = await fetch(`/api/orders/public/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shipping),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotice("Endereço salvo. Se já pagou, avise a equipe para confirmar.");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar endereço.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">Pedido</p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Finalizar compra</h1>
            <p className="mt-2 text-slate-200">
              Envie seus dados e acompanhe o status do pedido.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Ir pra loja
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
          ) : !order ? (
            <p className="text-sm text-slate-200">Pedido não encontrado.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    {statusLabel(order.status)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#f2d3a8] break-all">
                    {order.id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Total
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#f2d3a8]">
                    {priceLabel(order.total_cents)}
                  </p>
                </div>
              </div>

              {order.order_items?.length ? (
                <div className="mt-4 space-y-3">
                  {order.order_items.map((it) => {
                    const p = it.product;
                    const img = p?.hero_image || "/assets/banner-facil.png";
                    return (
                      <div
                        key={it.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                            <Image src={img} alt={p?.name ?? "Produto"} fill className="object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              {p?.name ?? "Produto"}
                            </p>
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

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Link de pagamento
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  Se o link já foi liberado pelo atendimento, você pode pagar aqui:
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {order.payment_link ? (
                    <a
                      href={order.payment_link}
                      target="_blank"
                      rel="noreferrer"
                      className="cta rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
                    >
                      Abrir pagamento
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Aguardando liberação do link.</span>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Dados de envio
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Nome completo</span>
                    <input
                      value={shipping.shipping_name}
                      onChange={(e) => setShipping({ ...shipping, shipping_name: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="Ex.: João da Silva"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Telefone</span>
                    <input
                      value={shipping.shipping_phone}
                      onChange={(e) => setShipping({ ...shipping, shipping_phone: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="(DDD) 99999-9999"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">CEP</span>
                    <input
                      value={shipping.shipping_zip}
                      onChange={(e) => setShipping({ ...shipping, shipping_zip: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="00000-000"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Endereço completo</span>
                    <input
                      value={shipping.shipping_address}
                      onChange={(e) => setShipping({ ...shipping, shipping_address: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="Rua, número, complemento"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Cidade</span>
                    <input
                      value={shipping.shipping_city}
                      onChange={(e) => setShipping({ ...shipping, shipping_city: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="Cidade"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">UF</span>
                    <input
                      value={shipping.shipping_state}
                      onChange={(e) => setShipping({ ...shipping, shipping_state: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="UF"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Observações</span>
                    <textarea
                      value={shipping.shipping_notes}
                      onChange={(e) => setShipping({ ...shipping, shipping_notes: e.target.value })}
                      className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                      placeholder="Referência, portaria, etc."
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={saveShipping}
                  disabled={saving}
                  className="cta mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar dados de envio"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
