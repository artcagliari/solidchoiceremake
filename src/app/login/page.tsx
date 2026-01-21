"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "Entrar" : "Criar conta"),
    [mode]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (data.session) router.replace("/loja");
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setNeedsEmailConfirm(false);
    setResetMode(false);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/loja");
        return;
      }

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Se email confirmation estiver desligado, o user já entra; se estiver ligado, ele precisa confirmar.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.push("/loja");
      } else {
        setNeedsEmailConfirm(true);
        setInfo(
          "Conta criada! Agora confirme seu e-mail para ativar a conta. Depois, volte e faça login."
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro inesperado ao autenticar.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    setError(null);
    setInfo(null);
    setNeedsEmailConfirm(false);
    setResetMode(true);
    setLoading(true);
    try {
      if (!email) throw new Error("Digite seu e-mail para receber o link.");
      const redirectTo = `${window.location.origin}/reset-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setInfo(
        "Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e spam."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível enviar o e-mail.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setNeedsEmailConfirm(true);
      setInfo("Reenviamos o e-mail de confirmação. Verifique sua caixa de entrada e spam.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível reenviar o e-mail.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-md px-6 py-14">
        <div className="section-shell rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <Link
              href="/"
              className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar
            </Link>
          </div>

          <p className="mt-2 text-sm text-slate-200">
            {mode === "login"
              ? "Faça login para montar sua cotação e acompanhar pedidos."
              : "Crie sua conta de cliente para montar sua cotação."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                E-mail
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#f2d3a8]/40"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-200">
                Senha
              </span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#f2d3a8]/40"
                placeholder="mínimo 6 caracteres"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </label>

            {mode === "login" ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={sendPasswordReset}
                  disabled={loading}
                  className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                >
                  Esqueci minha senha
                </button>
                {resetMode ? (
                  <Link
                    href="/reset-senha"
                    className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Abrir tela de reset
                  </Link>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-slate-200">
                {error}
              </div>
            ) : null}

            {info ? (
              <div className="rounded-xl border border-[#f2d3a8]/25 bg-[#f2d3a8]/10 px-4 py-3 text-sm text-slate-200">
                {info}
                {needsEmailConfirm ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="https://mail.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                    >
                      Abrir Gmail
                    </a>
                    <a
                      href="https://outlook.live.com/mail/"
                      target="_blank"
                      rel="noreferrer"
                      className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                    >
                      Abrir Outlook
                    </a>
                    <button
                      type="button"
                      onClick={resendConfirmation}
                      disabled={loading || !email}
                      className="cta rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                    >
                      Reenviar confirmação
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                    >
                      Ir para login
                    </button>
                  </div>
                ) : null}
                {resetMode ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="https://mail.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                    >
                      Abrir Gmail
                    </a>
                    <a
                      href="https://outlook.live.com/mail/"
                      target="_blank"
                      rel="noreferrer"
                      className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                    >
                      Abrir Outlook
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="cta w-full rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="divider my-6" />

          <div className="flex items-center justify-between gap-3 text-sm text-slate-200">
            <span>
              {mode === "login" ? "Não tem conta?" : "Já tem conta?"}
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              {mode === "login" ? "Criar conta" : "Fazer login"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Admins acessam o painel após login (se estiverem na tabela{" "}
          <span className="text-slate-200">admin_users</span>).
        </p>
      </div>
    </div>
  );
}


