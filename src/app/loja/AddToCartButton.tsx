"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export function AddToCartButton({
  productId,
  size,
  box_option,
  className,
  children,
  disabled,
}: {
  productId: string;
  size?: string | null;
  box_option?: "com" | "sem" | null;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading || disabled) return;
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
        body: JSON.stringify({
          product_id: productId,
          quantity: 1,
          size: size ?? null,
          box_option: box_option ?? null,
        }),
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
    <button type="button" onClick={onClick} className={className} disabled={loading || disabled}>
      {loading ? "..." : children}
    </button>
  );
}


