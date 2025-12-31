"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export function AddToCartButton({
  productId,
  className,
  children,
}: {
  productId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
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
    <button type="button" onClick={onClick} className={className} disabled={loading}>
      {loading ? "..." : children}
    </button>
  );
}


