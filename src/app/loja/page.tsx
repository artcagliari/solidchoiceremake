import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { AddToCartButton } from "./AddToCartButton";
import { AdminOnlyLink } from "./AdminOnlyLink";

export const dynamic = "force-dynamic";

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "product-images";

function normalizePublicStorageUrl(url?: string | null) {
  if (!url) return url;
  if (url.includes("/storage/v1/object/public/")) return url;
  return url.replace(
    /\/storage\/v1\/object\/([^/]+)\//g,
    "/storage/v1/object/public/$1/"
  );
}

type Product = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  brand: string | null;
  catalog_node_id?: string | null;
  price_cents: number | null;
  hero_image: string | null;
  sizes?: string[] | null;
};

type CatalogNode = {
  id: string;
  kind: "main" | "subcategory" | "brand" | "line" | "clothing_brand";
  parent_id: string | null;
  label: string;
  slug: string;
  logo_url: string | null;
  banner_url?: string | null;
  sort_order: number;
};

function priceLabel(price_cents: number | null) {
  if (typeof price_cents !== "number" || price_cents <= 0) return "Sob consulta";
  return `R$ ${(price_cents / 100).toFixed(2).replace(".", ",")}`;
}

export default async function LojaPage({
  searchParams,
}: {
  searchParams?: Promise<{ cat?: string; main?: string; brand?: string; line?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id,name,slug,category,brand,catalog_node_id,price_cents,hero_image,sizes,created_at")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as unknown as Product[];
  // Normaliza URLs antigas do Storage (sem /public/)
  for (const p of items) {
    p.hero_image = normalizePublicStorageUrl(p.hero_image) ?? null;
  }

  const mainRaw = typeof sp?.main === "string" ? sp.main : null;
  const main = mainRaw ? mainRaw.trim().toLowerCase() : null; // sneakers | vestuario

  const selectedCatRaw =
    typeof sp?.cat === "string" ? sp.cat : null;
  const selectedCat = selectedCatRaw ? selectedCatRaw.trim() : null;

  const selectedBrandRaw =
    typeof sp?.brand === "string" ? sp.brand : null;
  const selectedBrand = selectedBrandRaw ? selectedBrandRaw.trim() : null;

  const selectedLineRaw =
    typeof sp?.line === "string" ? sp.line : null;
  const selectedLine = selectedLineRaw ? selectedLineRaw.trim() : null;

  // Novo catálogo (se existir no Supabase). Fallback para o esquema antigo caso não exista.
  let catalog: CatalogNode[] = [];
  let hasCatalog = false;
  try {
    const { data: catData, error: catError } = await supabaseAdmin
      .from("catalog_nodes")
      .select("id,kind,parent_id,label,slug,logo_url,banner_url,sort_order");
    if (!catError && Array.isArray(catData)) {
      catalog = (catData as unknown as CatalogNode[]).map((n) => ({
        ...n,
        logo_url: normalizePublicStorageUrl(n.logo_url) ?? null,
        banner_url: normalizePublicStorageUrl(n.banner_url ?? null) ?? null,
      }));
      hasCatalog = true;
    }
  } catch {
    hasCatalog = false;
  }

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
    hasCatalog && main
      ? (catalog.find((n) => n.kind === "main" && n.slug === main)?.label ?? "CATÁLOGO SOLID CHOICE").toUpperCase()
      : main === "sneakers"
      ? "SNEAKERS"
      : main === "vestuario"
      ? "VESTUÁRIO"
      : "CATÁLOGO SOLID CHOICE";

  // Helpers do catálogo
  const findBySlug = (kind: CatalogNode["kind"], slug: string) =>
    catalog.find((n) => n.kind === kind && n.slug === slug) ?? null;
  const childrenOf = (parentId: string, kind?: CatalogNode["kind"]) =>
    catalog
      .filter((n) => n.parent_id === parentId && (!kind || n.kind === kind))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const selectedMainNode = hasCatalog && main ? findBySlug("main", main) : null;
  const isMainSelected = hasCatalog ? !!selectedMainNode : main === "sneakers" || main === "vestuario";
  const mainHasBrands = hasCatalog
    ? !!selectedMainNode && childrenOf(selectedMainNode.id, "brand").length > 0
    : main === "sneakers";

  const hrefMain = (m: string) => `/loja?main=${encodeURIComponent(m)}`;
  const hrefVestBrand = (brandSlug: string) => {
    if (!selectedMainNode) return "/loja";
    if (!selectedCat) return hrefMain(selectedMainNode.slug);
    if (selectedBrand === brandSlug) {
      return `/loja?main=${encodeURIComponent(selectedMainNode.slug)}&cat=${encodeURIComponent(selectedCat)}`;
    }
    return `/loja?main=${encodeURIComponent(selectedMainNode.slug)}&cat=${encodeURIComponent(selectedCat)}&brand=${encodeURIComponent(brandSlug)}`;
  };

  const renderProductCard = (p: Product) => {
    const img = p.hero_image || "/assets/banner-facil.png";
    const href = p.slug ? `/loja/${p.slug}` : "/loja";
    const hasSizes = Array.isArray(p.sizes) && p.sizes.filter(Boolean).length > 0;
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

        <div className="mt-3 grid gap-2">
          <Link
            href={href}
            className="cta-secondary flex items-center justify-center rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
          >
            Ver detalhes
          </Link>
          {hasSizes ? (
            <Link
              href={href}
              className="cta flex items-center justify-center rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
            >
              Escolher tamanho
            </Link>
          ) : (
            <AddToCartButton
              productId={p.id}
              size={null}
              className="cta rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em]"
            >
              Adicionar
            </AddToCartButton>
          )}
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
              {selectedLine ? (
                <>
                  <span className="text-xs uppercase tracking-[0.12em] text-slate-300">
                    Linha:
                  </span>
                  <span className="badge rounded-full px-3 py-1 text-[11px]">
                    {selectedLine}
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

        {/* Entrada: categorias principais */}
        {!isMainSelected ? (
          <div className="mt-8 grid gap-6">
            {(() => {
              const mains = hasCatalog
                ? catalog
                    .filter((n) => n.kind === "main")
                    .slice()
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                : [];

              if (hasCatalog && mains.length) {
                return (
                  <>
                    {mains.map((m) => {
                      const banner = m.banner_url || "/assets/banner-facil.png";
                      const remote = /^https?:\/\//i.test(banner);
                      const title = (m.label ?? m.slug ?? "Categoria").toUpperCase();
                      const subtitle =
                        m.slug === "sneakers"
                          ? "Explore por marca e monte sua cotação."
                          : m.slug === "vestuario"
                          ? "Bermuda, camisa, calça e mais."
                          : "Explore os produtos dessa categoria.";

                      return (
                        <Link
                          key={m.id}
                          href={`/loja?main=${encodeURIComponent(m.slug)}`}
                          className="section-shell group relative overflow-hidden rounded-3xl p-6 transition-transform hover:-translate-y-1"
                        >
                          <div className="pointer-events-none absolute inset-0 opacity-30">
                            {remote ? (
                              <img
                                src={banner}
                                alt={m.label}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Image
                                src={banner}
                                alt={m.label}
                                fill
                                sizes="100vw"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="relative z-10">
                            <p className="badge inline-flex rounded-full px-3 py-2 text-[11px]">
                              Categoria principal
                            </p>
                            <h2 className="mt-4 text-4xl text-[#f2d3a8]">{title}</h2>
                            <p className="mt-2 max-w-md text-sm text-slate-200">
                              {subtitle}
                            </p>
                            <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-200">
                              Entrar
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </>
                );
              }

              // fallback antigo (se não houver catalog_nodes)
              const sneakersBanner = "/assets/banner-facil.png";
              const vestBanner = "/assets/banner-whats.png";
              const sneakersRemote = /^https?:\/\//i.test(sneakersBanner);
              const vestRemote = /^https?:\/\//i.test(vestBanner);
              return (
                <>
                  <Link
                    href="/loja?main=sneakers"
                    className="section-shell group relative overflow-hidden rounded-3xl p-6 transition-transform hover:-translate-y-1"
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-30">
                      {sneakersRemote ? (
                        <img
                          src={sneakersBanner}
                          alt="Sneakers"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={sneakersBanner}
                          alt="Sneakers"
                          fill
                          sizes="100vw"
                          className="object-cover"
                        />
                      )}
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
                      {vestRemote ? (
                        <img
                          src={vestBanner}
                          alt="Vestuário"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={vestBanner}
                          alt="Vestuário"
                          fill
                          sizes="100vw"
                          className="object-cover"
                        />
                      )}
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
                </>
              );
            })()}
          </div>
        ) : null}

        {/* Fluxo tipo Sneakers: marcas com botões de logo */}
        {mainHasBrands ? (
          <>
            {hasCatalog ? (() => {
              const mainNode = selectedMainNode;
              const brandNodes = mainNode ? childrenOf(mainNode.id, "brand") : [];
              const brandNode = selectedBrand ? findBySlug("brand", selectedBrand) : null;
              const lineNodes = brandNode ? childrenOf(brandNode.id, "line") : [];
              const lineNode = selectedLine ? findBySlug("line", selectedLine) : null;

              const productsByLine = new Map<string, Product[]>();
              for (const p of items) {
                if (!p.catalog_node_id) continue;
                const list = productsByLine.get(p.catalog_node_id) ?? [];
                list.push(p);
                productsByLine.set(p.catalog_node_id, list);
              }

              return (
                <>
                  {/* Grid de marcas (logo) - estilo loja grande */}
                  <div className="mt-8 section-shell rounded-3xl p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                          Marcas
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-[#f2d3a8]">Escolha uma marca</h2>
                      </div>
                      {selectedBrand ? (
                        <Link
                          href={mainNode ? `/loja?main=${encodeURIComponent(mainNode.slug)}` : "/loja"}
                          className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                        >
                          Ver todas marcas
                        </Link>
                      ) : null}
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
                      {brandNodes.map((b) => {
                        const active = selectedBrand === b.slug;
                        const logo = b.logo_url || "/assets/iconsolid.png";
                        const isRemote = /^https?:\/\//i.test(logo);
                        return (
                          <Link
                            key={b.id}
                            href={`/loja?main=${encodeURIComponent(mainNode?.slug ?? "sneakers")}&brand=${encodeURIComponent(b.slug)}`}
                            className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border bg-black/20 p-4 transition ${
                              active
                                ? "border-[#f2d3a8]/60 ring-2 ring-[#f2d3a8]/20"
                                : "border-white/10 hover:border-white/20"
                            }`}
                            aria-label={b.label}
                            title={b.label}
                          >
                            {isRemote ? (
                              <img
                                src={logo}
                                alt={b.label}
                                className="h-16 w-16 object-contain opacity-95"
                              />
                            ) : (
                              <Image
                                src={logo}
                                alt={b.label}
                                width={72}
                                height={72}
                                className="opacity-95"
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  {/* Linhas só aparecem depois que clicar na marca (botão interativo) */}
                  {brandNode ? (
                    <div className="mt-6 section-shell rounded-3xl p-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                            {brandNode.label}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-[#f2d3a8]">
                            Linhas
                          </h3>
                        </div>
                        {selectedLine ? (
                          <Link
                            href={`/loja?main=${encodeURIComponent(mainNode?.slug ?? "sneakers")}&brand=${encodeURIComponent(brandNode.slug)}`}
                            className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                          >
                            Ver todas linhas
                          </Link>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {lineNodes.map((l) => {
                          const active = selectedLine === l.slug;
                          return (
                            <Link
                              key={l.id}
                              href={`/loja?main=${encodeURIComponent(mainNode?.slug ?? "sneakers")}&brand=${encodeURIComponent(brandNode.slug)}&line=${encodeURIComponent(l.slug)}`}
                              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                                active ? "cta" : "cta-secondary"
                              }`}
                            >
                              {l.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* Produtos: só aparecem depois de escolher a Linha */}
                  {brandNode && lineNode ? (
                    (() => {
                      const all = productsByLine.get(lineNode.id) ?? [];
                      return all.length === 0 ? null : (
                        <div className="mt-8 space-y-4">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                              {brandNode.label} · {lineNode.label}
                            </h2>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {all.map(renderProductCard)}
                          </div>
                        </div>
                      );
                    })()
                  ) : brandNode ? (
                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-6 text-sm text-slate-200">
                      Agora escolha uma <b>Linha</b> para ver os modelos.
                    </div>
                  ) : null}
                </>
              );
            })() : (
              /* Fallback antigo (por brand string) */
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

                  <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {brands.map((b) => {
                      const active = selectedBrand === b;
                      return (
                        <Link
                          key={b}
                          href={`/loja?main=sneakers&brand=${encodeURIComponent(b)}`}
                          className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border bg-black/20 p-4 transition ${
                            active
                              ? "border-[#f2d3a8]/60 ring-2 ring-[#f2d3a8]/20"
                              : "border-white/10 hover:border-white/20"
                          }`}
                          aria-label={b}
                          title={b}
                        >
                          <Image
                            src={resolveBrandLogo(b)}
                            alt={b}
                            width={72}
                            height={72}
                            className="opacity-95"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* No fallback antigo, só mostra produtos depois de escolher a marca */}
            {selectedBrand ? (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                    {selectedBrand}
                  </h2>
                  <Link
                    href="/loja?main=sneakers"
                    className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Trocar marca
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {(byBrand.get(selectedBrand) ?? []).map(renderProductCard)}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* Catálogo por subcategorias (qualquer main sem marcas) */}
        {isMainSelected && !mainHasBrands ? (
          hasCatalog ? (() => {
            const mainNode = selectedMainNode;
            const subNodes = mainNode ? childrenOf(mainNode.id, "subcategory") : [];
            const selectedSub = selectedCat ? findBySlug("subcategory", selectedCat) : null;

            const byNode = new Map<string, Product[]>();
            for (const p of items) {
              if (!p.catalog_node_id) continue;
              const list = byNode.get(p.catalog_node_id) ?? [];
              list.push(p);
              byNode.set(p.catalog_node_id, list);
            }

            const visibleSubs = selectedSub ? [selectedSub] : subNodes;
            return visibleSubs.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-sm text-slate-200">
                Nenhuma subcategoria cadastrada ainda.
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {visibleSubs.map((s) => {
                  const all = byNode.get(s.id) ?? [];
                  const clothingBrandNodes =
                    mainNode ? childrenOf(mainNode.id, "clothing_brand") : [];
                  const clothingBrandLabelBySlug = new Map(
                    clothingBrandNodes.map((n) => [n.slug, n.label])
                  );

                  const filteredAll =
                    selectedSub && selectedBrand
                      ? all.filter(
                          (p) =>
                            (p.brand ?? "").trim().toLowerCase() ===
                            (clothingBrandLabelBySlug.get(selectedBrand) ?? "").trim().toLowerCase()
                        )
                      : all;

                  const products = selectedSub ? filteredAll : all.slice(0, 5);
                  const canShowMore = !selectedSub && all.length > 5;
                  if (all.length === 0) return null;
                  return (
                    <section key={s.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold uppercase tracking-[0.12em] text-slate-200">
                          {s.label}
                        </h2>
                        {canShowMore ? (
                          <Link
                            href={`/loja?main=${encodeURIComponent(mainNode?.slug ?? "vestuario")}&cat=${encodeURIComponent(s.slug)}`}
                            className="cta-secondary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                          >
                            Ver mais
                          </Link>
                        ) : null}
                      </div>

                      {/* Quando clicou em "Ver mais", aparece filtro de marca */}
                      {selectedSub ? (
                        <div className="section-shell rounded-2xl p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">
                              Filtrar por marca
                            </p>
                            <Link
                              href={`/loja?main=${encodeURIComponent(mainNode?.slug ?? "vestuario")}&cat=${encodeURIComponent(s.slug)}`}
                              className="cta-secondary rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                            >
                              Limpar
                            </Link>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {clothingBrandNodes.map((b) => {
                              const active = selectedBrand === b.slug;
                              return (
                                <Link
                                  key={b.id}
                                  href={hrefVestBrand(b.slug)}
                                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                                    active ? "cta" : "cta-secondary"
                                  }`}
                                >
                                  {b.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {products.map(renderProductCard)}
                      </div>
                    </section>
                  );
                })}
              </div>
            );
          })() : (
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
          )
        ) : null}

        {/* Vazio geral quando não há produtos */}
        {!isMainSelected && items.length === 0 ? (
          null
        ) : null}
      </div>
    </div>
  );
}


