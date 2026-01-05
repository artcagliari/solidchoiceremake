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
  brand: string | null;
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
  searchParams?: { cat?: string; main?: string; brand?: string };
}) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,name,slug,category,brand,price_cents,hero_image,created_at")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as unknown as Product[];

  const mainRaw = typeof searchParams?.main === "string" ? searchParams.main : null;
  const main = mainRaw ? mainRaw.trim().toLowerCase() : null; // sneakers | vestuario
  const isMainSelected = main === "sneakers" || main === "vestuario";

  const selectedCatRaw =
    typeof searchParams?.cat === "string" ? searchParams.cat : null;
  const selectedCat = selectedCatRaw ? selectedCatRaw.trim() : null;

  const selectedBrandRaw =
    typeof searchParams?.brand === "string" ? searchParams.brand : null;
  const selectedBrand = selectedBrandRaw ? selectedBrandRaw.trim() : null;

  const isFootwearCategory = (cat: string) => {
    const c = cat.toLowerCase();
    return (
      c.includes("cal") ||
      c.includes("tenis") ||
      c.includes("tênis") ||
      c.includes("sneaker")
    );
  };

  const footwearProducts = items.filter((p) =>
    isFootwearCategory(p.category ?? "Calçado")
  );
  const clothingProducts = items.filter(
    (p) => !isFootwearCategory(p.category ?? "Outros")
  );

  const clothingByCategory = new Map<string, Product[]>();
  for (const p of clothingProducts) {
    const cat = (p.category ?? "Outros").trim() || "Outros";
    const list = clothingByCategory.get(cat) ?? [];
    list.push(p);
    clothingByCategory.set(cat, list);
  }
  const clothingCategories = Array.from(clothingByCategory.keys()).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const visibleClothingCategories =
    selectedCat && clothingByCategory.has(selectedCat)
      ? [selectedCat]
      : clothingCategories;

  const byBrand = new Map<string, Product[]>();
  for (const p of footwearProducts) {
    const b = (p.brand ?? "").trim() || "Outros";
    const list = byBrand.get(b) ?? [];
    list.push(p);
    byBrand.set(b, list);
  }
  const brands = Array.from(byBrand.keys()).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const visibleBrands =
    selectedBrand && byBrand.has(selectedBrand) ? [selectedBrand] : brands;

  // logos: por enquanto placeholder (sem texto). Depois podemos evoluir pra "brand_logo" no banco.
  const brandLogos: Record<string, string> = {
    nike: "/assets/iconsolid.png",
    adidas: "/assets/iconsolid.png",
    jordan: "/assets/iconsolid.png",
    "new balance": "/assets/iconsolid.png",
    asics: "/assets/iconsolid.png",
    puma: "/assets/iconsolid.png",
    vans: "/assets/iconsolid.png",
    converse: "/assets/iconsolid.png",
  };
  const resolveBrandLogo = (brand: string) => {
    const key = brand.trim().toLowerCase();
    return brandLogos[key] || "/assets/iconsolid.png";
  };

  const headerTitle =
    main === "sneakers"
      ? "SNEAKERS"
      : main === "vestuario"
      ? "VESTUÁRIO"
      : "CATÁLOGO SOLID CHOICE";

  const renderProductCard = (p: Product) => {
    const img = p.hero_image || "/assets/banner-facil.png";
    const href = p.slug ? `/loja/${p.slug}` : "/loja";
    return (
      <div key={p.id} className="section-shell overflow-hidden rounded-2xl p-3">
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
  };

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero / header do catálogo */}
        <section className="section-shell overflow-hidden rounded-3xl px-6 py-8 sm:px-10 sm:py-10">
          <p className="badge inline-flex rounded-full px-3 py-2">
            SEMANA 02 · CATÁLOGO VISUAL
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl">{headerTitle}</h1>
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
            {isMainSelected ? (
              <Link
                href="/loja"
                className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Voltar (categorias)
              </Link>
            ) : null}
            <Link
              href="/"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar para a landing
            </Link>
          </div>

          {isMainSelected && (selectedCat || selectedBrand) ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {selectedCat ? (
                <>
                  <span className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Categoria:
                  </span>
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {selectedCat}
                  </span>
                </>
              ) : null}
              {selectedBrand ? (
                <>
                  <span className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Marca:
                  </span>
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {selectedBrand}
                  </span>
                </>
              ) : null}
              <Link
                href={`/loja?main=${encodeURIComponent(main!)}`}
                className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Ver todas
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

        {/* Entrada: 2 categorias principais */}
        {!isMainSelected ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Link
              href="/loja?main=sneakers"
              className="section-shell group relative overflow-hidden rounded-3xl p-6 transition-transform hover:-translate-y-1"
            >
              <div className="pointer-events-none absolute inset-0 opacity-30">
                <Image src="/assets/banner-facil.png" alt="Sneakers" fill className="object-cover" />
              </div>
              <div className="relative z-10">
                <p className="badge inline-flex rounded-full px-3 py-2 text-[11px]">
                  Categoria principal
                </p>
                <h2 className="mt-4 text-4xl text-[#f2d3a8]">SNEAKERS</h2>
                <p className="mt-2 max-w-md text-sm text-slate-200">
                  Explore por marca e monte sua cotação.
                </p>
                <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-200">
                  Entrar
                </div>
              </div>
            </Link>

            <Link
              href="/loja?main=vestuario"
              className="section-shell group relative overflow-hidden rounded-3xl p-6 transition-transform hover:-translate-y-1"
            >
              <div className="pointer-events-none absolute inset-0 opacity-30">
                <Image src="/assets/banner-whats.png" alt="Vestuário" fill className="object-cover" />
              </div>
              <div className="relative z-10">
                <p className="badge inline-flex rounded-full px-3 py-2 text-[11px]">
                  Categoria principal
                </p>
                <h2 className="mt-4 text-4xl text-[#f2d3a8]">VESTUÁRIO</h2>
                <p className="mt-2 max-w-md text-sm text-slate-200">
                  Bermuda, camisa, calça e mais.
                </p>
                <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-200">
                  Entrar
                </div>
              </div>
            </Link>
          </div>
        ) : null}

        {/* Sneakers: marcas com botões de logo */}
        {main === "sneakers" ? (
          <>
            <div className="mt-8 section-shell rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Subcategorias
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#f2d3a8]">Marcas</h2>
                </div>
                {selectedBrand ? (
                  <Link
                    href="/loja?main=sneakers"
                    className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Ver todas marcas
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                {brands.map((b) => {
                  const active = selectedBrand === b;
                  return (
                    <Link
                      key={b}
                      href={`/loja?main=sneakers&brand=${encodeURIComponent(b)}`}
                      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border bg-black/20 transition ${
                        active
                          ? "border-[#f2d3a8]/60 ring-2 ring-[#f2d3a8]/20"
                          : "border-white/10 hover:border-white/20"
                      }`}
                      aria-label={b}
                      title={b}
                    >
                      <Image src={resolveBrandLogo(b)} alt={b} width={44} height={44} className="opacity-90" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {visibleBrands.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
                Nenhum sneaker cadastrado ainda.
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {visibleBrands.map((b) => {
                  const all = byBrand.get(b) ?? [];
                  const products = selectedBrand ? all : all.slice(0, 5);
                  const canShowMore = !selectedBrand && all.length > 5;
                  return (
                    <section key={b} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                          {b}
                        </h2>
                        {canShowMore ? (
                          <Link
                            href={`/loja?main=sneakers&brand=${encodeURIComponent(b)}`}
                            className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                          >
                            Ver mais
                          </Link>
                        ) : null}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {products.map(renderProductCard)}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        ) : null}

        {/* Vestuário: subcategorias como hoje */}
        {main === "vestuario" ? (
          visibleClothingCategories.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
              {selectedCat ? "Categoria não encontrada." : "Nenhum vestuário cadastrado ainda."}
            </div>
          ) : (
            <div className="mt-8 space-y-10">
              {visibleClothingCategories.map((cat) => {
                const all = clothingByCategory.get(cat) ?? [];
                const products = selectedCat ? all : all.slice(0, 5);
                const canShowMore = !selectedCat && all.length > 5;
                return (
                  <section key={cat} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                        {cat}
                      </h2>
                      {canShowMore ? (
                        <Link
                          href={`/loja?main=vestuario&cat=${encodeURIComponent(cat)}`}
                          className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                        >
                          Ver mais
                        </Link>
                      ) : null}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {products.map(renderProductCard)}
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : null}

        {/* Vazio geral quando não há produtos */}
        {!isMainSelected && items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
            Nenhum produto cadastrado ainda.
          </div>
        ) : null}
      </div>
    </div>
  );
}


