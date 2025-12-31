"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClientActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Falha ao adicionar: ${res.status}`);
      }

      router.push("/carrinho");
    } catch (err) {
      console.error(err);
      alert("Não foi possível adicionar ao carrinho. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={addToCart}
      className="cta w-full rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
      disabled={loading}
    >
      {loading ? "Adicionando..." : "Adicionar à cotação"}
    </button>
  );
}


