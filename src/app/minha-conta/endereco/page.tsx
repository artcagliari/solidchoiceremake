"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function MinhaContaEnderecoPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const t = data.session?.access_token ?? null;
      if (!t) {
        router.replace("/login");
        return;
      }
      setToken(t);
      try {
        const res = await fetch("/api/account/address", {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const json = (await res.json()) as { item?: typeof address | null };
          const item = json.item;
          if (item) {
            setAddress({
              name: item.name ?? "",
              phone: item.phone ?? "",
              address: item.address ?? "",
              city: item.city ?? "",
              state: item.state ?? "",
              zip: item.zip ?? "",
              notes: item.notes ?? "",
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar endereço.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/account/address", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(address),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotice("Endereço salvo com sucesso.");
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
            <p className="badge inline-flex rounded-full px-3 py-2">Área do cliente</p>
            <h1 className="mt-4 text-3xl sm:text-4xl">Meu endereço</h1>
            <p className="mt-2 text-slate-200">
              Atualize os dados para facilitar seus próximos pedidos.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/minha-conta"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Meus pedidos
            </Link>
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
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Nome completo</span>
                <input
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Telefone</span>
                <input
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">CEP</span>
                <input
                  value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Endereço</span>
                <input
                  value={address.address}
                  onChange={(e) => setAddress({ ...address, address: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Cidade</span>
                <input
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Estado</span>
                <input
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-300">Complemento</span>
                <input
                  value={address.notes}
                  onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="cta rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar endereço"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
