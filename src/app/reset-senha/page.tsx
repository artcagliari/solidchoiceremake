"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetSenhaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const run = async () => {
      // Quando o usuário abre o link do e-mail, o supabase-js captura o token da URL e cria uma session.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setInfo(
          "Abra esta página pelo link enviado no seu e-mail (reset de senha)."
        );
      }
      setLoading(false);
    };
    run();
  }, []);

  const save = async () => {
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error("Sessão não encontrada. Abra o link do e-mail novamente.");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setInfo("Senha atualizada! Agora você pode fazer login.");
      // Opcional: deslogar para forçar login com nova senha
      await supabase.auth.signOut();
      window.setTimeout(() => router.push("/login"), 900);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar senha.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-md px-6 py-14">
        <div className="section-shell rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Redefinir senha</h1>
            <Link
              href="/login"
              className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar
            </Link>
          </div>

          <p className="mt-2 text-sm text-slate-200">
            Defina sua nova senha e volte para o login.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-slate-200">Carregando...</p>
          ) : (
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Nova senha
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  minLength={6}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#f2d3a8]/40"
                  placeholder="mínimo 6 caracteres"
                  autoComplete="new-password"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                  Confirmar senha
                </span>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  minLength={6}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#f2d3a8]/40"
                  placeholder="repita a senha"
                  autoComplete="new-password"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-slate-200">
                  {error}
                </div>
              ) : null}

              {info ? (
                <div className="rounded-xl border border-[#f2d3a8]/25 bg-[#f2d3a8]/10 px-4 py-3 text-sm text-slate-200">
                  {info}
                </div>
              ) : null}

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="cta w-full rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar nova senha"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


