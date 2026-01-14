"use client";

import Image from "next/image";
import Link from "next/link";
import { AdminOnlyLink } from "./AdminOnlyLink";

function IconButton({
  href,
  title,
  children,
  external,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls =
    "cta-secondary inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-200 transition hover:border-white/20";
  return (
    <Link
      href={href}
      className={cls}
      title={title}
      aria-label={title}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {children}
    </Link>
  );
}

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M6 6h15l-2 8H8L6 6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6 6 5.2 3.5H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 20a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 9 20Zm9 0a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 18 20Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4 20c1.8-4 14.2-4 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M4 11.5 12 4l8 7.5V20a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 20v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 21.5v-6.5h5v6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" fill="currentColor" />
    </svg>
  );
}

function IconWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M20 11.6A8.3 8.3 0 0 1 7.4 18L4 19l1-3.2A8.3 8.3 0 1 1 20 11.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.9c.2-.4.5-.4.8-.4h.2c.2 0 .4.1.5.3l.6 1.4c.1.3.1.5 0 .7l-.4.5c-.1.2-.1.4 0 .5.6 1 1.5 1.8 2.5 2.4.2.1.4.1.5 0l.5-.4c.2-.1.5-.2.7 0l1.4.6c.2.1.3.3.3.5v.2c0 .3 0 .6-.4.8-.4.3-1.1.6-1.8.5-1.2-.1-2.7-.9-4.2-2.4-1.5-1.5-2.3-3-2.4-4.2-.1-.7.2-1.4.5-1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function StoreHeader({
  title,
  isMainSelected,
}: {
  title: string;
  isMainSelected: boolean;
}) {
  return (
    <div className="sticky top-4 z-40">
      <div className="section-shell rounded-full px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/loja" className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-black/20">
              <Image src="/assets/iconsolid.png" alt="Solid Choice" fill className="object-contain p-2" />
            </div>
            <div className="hidden sm:block">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">
                Loja
              </p>
              <p className="max-w-[420px] truncate text-sm font-semibold text-[#f2d3a8]">
                {title}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {isMainSelected ? (
              <IconButton href="/loja" title="Voltar (categorias)">
                <IconGrid />
              </IconButton>
            ) : null}

            <IconButton
              href="https://wa.me/5554992739597?text=Quero%20importar%20com%20a%20Solid%20Choice"
              title="Falar com a Solid"
              external
            >
              <IconWhatsapp />
            </IconButton>

            <IconButton href="/carrinho" title="Carrinho">
              <IconCart />
            </IconButton>

            <IconButton href="/minha-conta" title="Perfil / Minhas compras">
              <IconUser />
            </IconButton>

            <AdminOnlyLink
              variant="icon"
              className="cta-secondary inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-200 transition hover:border-white/20"
              title="Painel admin"
            >
              <span className="text-xs font-semibold">ADM</span>
            </AdminOnlyLink>

            <IconButton href="/" title="Voltar para a landing">
              <IconHome />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

