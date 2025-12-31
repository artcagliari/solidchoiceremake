"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export function ClientGallery({
  hero,
  images,
  name,
}: {
  hero: string;
  images: string[];
  name: string;
}) {
  const all = useMemo(() => {
    const cleaned = [hero, ...(images ?? [])].filter(Boolean);
    return Array.from(new Set(cleaned));
  }, [hero, images]);

  const [active, setActive] = useState(all[0] ?? hero);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <Image
          src={active}
          alt={name}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover"
        />
      </div>

      {all.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {all.slice(0, 10).map((src) => {
            const isActive = src === active;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setActive(src)}
                className={`relative aspect-square overflow-hidden rounded-xl border ${
                  isActive ? "border-[#f2d3a8]/60" : "border-white/10"
                } bg-black/20`}
              >
                <Image src={src} alt={name} fill className="object-cover" />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}


