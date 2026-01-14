"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AdminOnlyLink({
  variant = "pill",
  className,
  children,
  title,
}: {
  variant?: "pill" | "icon";
  className?: string;
  children?: React.ReactNode;
  title?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setVisible(false);
        return;
      }

      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { isAdmin?: boolean };
      setVisible(Boolean(json.isAdmin));
    };
    run();
  }, []);

  if (!visible) return null;

  const defaultPillClass =
    "cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]";
  const cls = className ?? defaultPillClass;

  return (
    <Link
      href="/admin"
      className={cls}
      title={title ?? (variant === "icon" ? "Painel admin" : undefined)}
      aria-label={title ?? (variant === "icon" ? "Painel admin" : undefined)}
    >
      {children ?? "Painel admin"}
    </Link>
  );
}


