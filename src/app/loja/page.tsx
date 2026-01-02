import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { AddToCartButton } from "./AddToCartButton";
import { AdminOnlyLink } from "./AdminOnlyLink";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  price_cents: number | null;
  hero_image: string | null;
};

function priceLabel(price_cents: number | null) {
  if (typeof price_cents !== "number" || price_cents <= 0) return "Sob consulta";
  return `R$ ${(price_cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function LojaPage({
  searchParams,
}: {
  searchParams?: { cat?: string };
}) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,name,slug,category,price_cents,hero_image,created_at")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as unknown as Product[];

  const byCategory = new Map<string, Product[]>();
  for (const p of items) {
    const cat = (p.category ?? "Outros").trim() || "Outros";
    const list = byCategory.get(cat) ?? [];
    list.push(p);
    byCategory.set(cat, list);
  }

  const categories = Array.from(byCategory.keys()).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  const selectedCatRaw = typeof searchParams?.cat === "string" ? searchParams.cat : null;
  const selectedCat = selectedCatRaw ? selectedCatRaw.trim() : null;
  const isFiltered = Boolean(selectedCat);
  const visibleCategories = isFiltered
    ? selectedCat && byCategory.has(selectedCat)
      ? [selectedCat]
      : []
    : categories;

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero / header do catálogo */}
        <section className="section-shell overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-10">
          <p className="badge inline-flex rounded-full px-3 py-2">
            SEMANA 02 · CATÁLOGO VISUAL
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl">CATÁLOGO SOLID CHOICE</h1>
          <p className="mt-3 max-w-4xl text-sm sm:text-base text-slate-200">
            Vitrine curada por categoria. O catálogo é aberto: qualquer peça pode
            ser buscada direto do mercado interno chinês. Peça no WhatsApp se não
            encontrar aqui.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="https://wa.me/5554992739597?text=Quero%20importar%20com%20a%20Solid%20Choice"
              target="_blank"
              className="cta rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Falar com a Solid
            </Link>
            <AdminOnlyLink />
            <Link
              href="/carrinho"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Ver carrinho
            </Link>
            <Link
              href="/minha-conta"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Minhas compras
            </Link>
            <a
              href="#produtos"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Ver produtos
            </a>
            <Link
              href="/"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar para a landing
            </Link>
          </div>

          {isFiltered ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-300">
                Categoria:
              </span>
              <span className="badge rounded-full px-3 py-1 text-[11px]">
                {selectedCat}
              </span>
              <Link
                href="/loja"
                className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Ver todas categorias
              </Link>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-slate-200">
            Erro ao carregar produtos: {error.message}
          </div>
        ) : null}

        <div id="produtos" className="mt-10" />

        {visibleCategories.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
            {isFiltered
              ? "Categoria não encontrada."
              : "Nenhum produto cadastrado ainda."}
          </div>
        ) : (
          <div className="mt-6 space-y-10">
            {visibleCategories.map((cat) => {
              const all = byCategory.get(cat) ?? [];
              const products = isFiltered ? all : all.slice(0, 5);
              const canShowMore = !isFiltered && all.length > 5;
              return (
                <section key={cat} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                      {cat}
                    </h2>
                    {canShowMore ? (
                      <Link
                        href={`/loja?cat=${encodeURIComponent(cat)}`}
                        className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                      >
                        Ver mais
                      </Link>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {products.map((p) => {
                      const img = p.hero_image || "/assets/banner-facil.png";
                      const href = p.slug ? `/loja/${p.slug}` : "/loja";
                      return (
                        <div
                          key={p.id}
                          className="section-shell overflow-hidden rounded-2xl p-3"
                        >
                          <Link href={href} className="block">
                            <div className="relative h-40 w-full overflow-hidden rounded-xl bg-[#0c1428]">
                              <Image
                                src={img}
                                alt={p.name}
                                fill
                                sizes="(min-width: 1280px) 260px, (min-width: 768px) 50vw, 100vw"
                                className="object-cover"
                              />
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="line-clamp-1 text-sm font-semibold text-[#f2d3a8]">
                                {p.name}
                              </p>
                              <span className="text-[11px] uppercase tracking-[0.12em] text-slate-300">
                                {priceLabel(p.price_cents)}
                              </span>
                            </div>
                          </Link>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Link
                              href={href}
                              className="cta-secondary flex items-center justify-center rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                            >
                              Ver detalhes
                            </Link>
                            <AddToCartButton
                              productId={p.id}
                              className="cta rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
                            >
                              Adicionar
                            </AddToCartButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


