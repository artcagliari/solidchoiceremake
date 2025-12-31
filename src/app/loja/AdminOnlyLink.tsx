"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function AdminOnlyLink() {
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

  return (
    <Link
      href="/admin"
      className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
    >
      Painel admin
    </Link>
  );
}


