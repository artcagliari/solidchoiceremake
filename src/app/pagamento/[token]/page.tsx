"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  status: string | null;
  total_cents: number | null;
  payment_link?: string | null;
  public_token?: string | null;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_zip?: string | null;
  shipping_notes?: string | null;
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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function PaymentForm({
  token,
  clientSecret,
  order,
  accountToken,
  shipping,
  setShipping,
}: {
  token: string;
  clientSecret: string;
  order: Order | null;
  accountToken: string | null;
  shipping: {
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip: string;
    shipping_notes: string;
  };
  setShipping: React.Dispatch<
    React.SetStateAction<{
      shipping_name: string;
      shipping_phone: string;
      shipping_address: string;
      shipping_city: string;
      shipping_state: string;
      shipping_zip: string;
      shipping_notes: string;
    }>
  >;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const missing =
    !shipping.shipping_name ||
    !shipping.shipping_phone ||
    !shipping.shipping_address ||
    !shipping.shipping_city ||
    !shipping.shipping_state ||
    !shipping.shipping_zip;

  const saveShipping = async () => {
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
    await fetch(`/api/orders/public/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shipping),
    });
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    setNotice(null);
    try {
      if (missing) {
        throw new Error("Preencha todos os campos obrigatórios de endereço.");
      }
      await saveShipping();

      const origin = window.location.origin;
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${origin}/pedido/${token}`,
        },
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Erro ao processar pagamento.");
      }
      setNotice("Pagamento enviado. Aguarde a confirmação.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao pagar.";
      setError(msg);
    } finally {
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="mt-6 space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-slate-200">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-[#f2d3a8]/25 bg-[#f2d3a8]/10 px-4 py-3 text-sm text-slate-200">
          {notice}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-200">Dados de envio</p>
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
            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Endereço</span>
            <input
              value={shipping.shipping_address}
              onChange={(e) => setShipping({ ...shipping, shipping_address: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
              placeholder="Rua, número, bairro"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Cidade</span>
            <input
              value={shipping.shipping_city}
              onChange={(e) => setShipping({ ...shipping, shipping_city: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Estado</span>
            <input
              value={shipping.shipping_state}
              onChange={(e) => setShipping({ ...shipping, shipping_state: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Complemento</span>
            <input
              value={shipping.shipping_notes}
              onChange={(e) => setShipping({ ...shipping, shipping_notes: e.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
              placeholder="Apto, bloco, referência"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-200">Pagamento</p>
        <div className="mt-4">
          <PaymentElement />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || paying || missing}
        className="cta rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
      >
        {paying ? "Processando..." : "Finalizar pagamento"}
      </button>

      {order?.public_token ? (
        <div className="text-xs text-slate-300">
          Se precisar, volte para o pedido:{" "}
          <Link href={`/pedido/${order.public_token}`} className="underline">
            abrir pedido
          </Link>
        </div>
      ) : null}
    </form>
  );
}

export default function PagamentoPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
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

  useEffect(() => {
    const init = async () => {
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
        const intentRes = await fetch(`/api/orders/public/${token}/payment-intent`, {
          method: "POST",
        });
        if (!intentRes.ok) throw new Error(await intentRes.text());
        const intentJson = (await intentRes.json()) as { client_secret?: string };
        setClientSecret(intentJson.client_secret ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar pagamento.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    const loadAccount = async () => {
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token ?? null;
      setAccountToken(t);
      if (!t) return;
      const res = await fetch("/api/account/address", {
        headers: { Authorization: `Bearer ${t}` },
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
    };
    loadAccount();
  }, []);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: "night",
            },
          }
        : undefined,
    [clientSecret]
  );

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="badge inline-flex rounded-full px-3 py-2">Pagamento</p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Finalize seu pagamento</h1>
            <p className="mt-2 text-slate-200">Complete seus dados e pague com segurança.</p>
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
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total</p>
                  <p className="mt-1 text-sm font-semibold text-[#f2d3a8]">
                    {priceLabel(order.total_cents)}
                  </p>
                </div>
              </div>

              {clientSecret && options ? (
                <Elements stripe={stripePromise} options={options}>
                  <PaymentForm
                    token={token}
                    clientSecret={clientSecret}
                    order={order}
                    accountToken={accountToken}
                    shipping={shipping}
                    setShipping={setShipping}
                  />
                </Elements>
              ) : (
                <p className="mt-6 text-sm text-slate-200">
                  Não foi possível iniciar o pagamento.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
