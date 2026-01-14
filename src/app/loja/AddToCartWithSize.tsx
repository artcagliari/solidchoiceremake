"use client";

import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "./AddToCartButton";

export function AddToCartWithSize({
  productId,
  sizes,
  buttonClassName,
  selectClassName,
  buttonText = "Adicionar",
  sizeUi = "select",
  sizesTitle = "Tamanhos",
  showBoxOption = true,
}: {
  productId: string;
  sizes?: string[] | null;
  buttonClassName: string;
  selectClassName?: string;
  buttonText?: string;
  sizeUi?: "select" | "chips";
  sizesTitle?: string;
  showBoxOption?: boolean;
}) {
  const options = useMemo(
    () => (Array.isArray(sizes) ? sizes.map((s) => String(s).trim()).filter(Boolean) : []),
    [sizes]
  );
  const mustChoose = options.length > 0;
  const [size, setSize] = useState<string>("");
  const [boxOption, setBoxOption] = useState<"com" | "sem">("com");

  // No modo select, pré-seleciona o primeiro tamanho para não mostrar placeholder
  useEffect(() => {
    if (sizeUi !== "select") return;
    if (!mustChoose) return;
    if (size) return;
    setSize(options[0] ?? "");
  }, [mustChoose, options, size, sizeUi]);

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

      {showBoxOption ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-200">
            Caixa do item <span className="text-slate-400 font-normal">· sujeito a alteração de valor</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["com", "sem"] as const).map((opt) => {
              const active = boxOption === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBoxOption(opt)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    active ? "cta" : "cta-secondary hover:border-white/20"
                  }`}
                  aria-pressed={active}
                >
                  {opt === "com" ? "Com" : "Sem"}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-300">
            Atenção: A caixa não altera a proteção do produto em si — com ou sem, ele deverá chegar sem sofrer avarias.
          </p>
        </div>
      ) : null}

      <AddToCartButton
        productId={productId}
        size={mustChoose ? (size || null) : null}
        box_option={showBoxOption ? boxOption : null}
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

