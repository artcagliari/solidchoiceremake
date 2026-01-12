"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "./AddToCartButton";

export function AddToCartWithSize({
  productId,
  sizes,
  buttonClassName,
  selectClassName,
  buttonText = "Adicionar",
  sizeUi = "select",
  sizesTitle = "Tamanhos",
}: {
  productId: string;
  sizes?: string[] | null;
  buttonClassName: string;
  selectClassName?: string;
  buttonText?: string;
  sizeUi?: "select" | "chips";
  sizesTitle?: string;
}) {
  const options = useMemo(
    () => (Array.isArray(sizes) ? sizes.map((s) => String(s).trim()).filter(Boolean) : []),
    [sizes]
  );
  const mustChoose = options.length > 0;
  const [size, setSize] = useState<string>("");

  return (
    <div className="space-y-2">
      {mustChoose && sizeUi === "select" ? (
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className={
            selectClassName ??
            "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.12em] text-slate-200 outline-none"
          }
        >
          <option value="">Selecione o tamanho</option>
          {options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ) : null}

      {mustChoose && sizeUi === "chips" ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
            {sizesTitle}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map((s) => {
              const active = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(active ? "" : s)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    active
                      ? "cta"
                      : "cta-secondary hover:border-white/20"
                  }`}
                  aria-pressed={active}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <AddToCartButton
        productId={productId}
        size={mustChoose ? (size || null) : null}
        className={buttonClassName}
        disabled={mustChoose && !size}
      >
        {buttonText}
      </AddToCartButton>
      {mustChoose && !size ? (
        <p className="text-[11px] text-slate-300">Escolha um tamanho para adicionar.</p>
      ) : null}
    </div>
  );
}

