import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ClientGallery } from "./ClientGallery";
import { AddToCartWithSize } from "../AddToCartWithSize";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number | null;
  category: string | null;
  sizes: string[] | null;
  colors: string[] | null;
  hero_image: string | null;
  images: string[] | null;
};

function priceLabel(price_cents: number | null) {
  if (typeof price_cents !== "number" || price_cents <= 0) return "Sob consulta";
  return `R$ ${(price_cents / 100).toFixed(2).replace(".", ",")}`;
}

function listOrEmpty(value: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,name,slug,description,price_cents,category,sizes,colors,hero_image,images"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="section-shell rounded-3xl p-8">
            <h1 className="text-2xl font-semibold">Produto não encontrado</h1>
            <p className="mt-2 text-slate-200">
              Esse item pode ter sido removido ou o link está incorreto.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/loja"
                className="cta rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Voltar pra loja
              </Link>
              <Link
                href="/"
                className="cta-secondary rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                Ir para landing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const product = data as unknown as Product;
  const hero = product.hero_image || "/assets/banner-facil.png";
  const images = listOrEmpty(product.images);
  const sizes = listOrEmpty(product.sizes);
  const colors = listOrEmpty(product.colors);
  const categoryLabel = (product.category ?? "").toLowerCase();
  const showBoxOption =
    categoryLabel.includes("cal") || categoryLabel.includes("sneaker");

  return (
    <div className="min-h-screen bg-[#0c1428] text-[#f2d3a8]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/loja"
              className="cta-secondary rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Voltar
            </Link>
            <Link
              href="/carrinho"
              className="cta rounded-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Carrinho
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.12em] text-slate-200">
            {product.category ?? "Produto"}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <ClientGallery hero={hero} images={images} name={product.name} />
          </div>

          <div className="section-shell rounded-3xl p-6">
            <h1 className="text-3xl font-semibold">{product.name}</h1>
            <p className="mt-2 text-slate-200">
              {product.description || "Sem descrição no momento."}
            </p>

            <div className="divider my-6" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/iconsolid.png"
                  alt="Solid"
                  width={28}
                  height={28}
                  className="rounded-full bg-[#f2d3a8] p-1"
                />
                <span className="text-xs uppercase tracking-[0.14em] text-slate-200">
                  Preço
                </span>
              </div>
              <span className="text-lg font-semibold text-[#f2d3a8]">
                {priceLabel(product.price_cents)}
              </span>
            </div>

            {colors.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {colors.length ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-200">
                      Cores
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <span
                          key={c}
                          className="badge rounded-full px-3 py-1 text-[11px]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6">
              <AddToCartWithSize
                productId={product.id}
                sizes={sizes}
                buttonClassName="cta w-full rounded-xl px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] disabled:opacity-60"
                selectClassName="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none"
                buttonText="Adicionar à cotação"
                sizeUi="chips"
                sizesTitle="Tamanhos"
                showBoxOption={showBoxOption}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


