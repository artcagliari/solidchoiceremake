import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function toArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id,name,slug,category,price_cents,brand,badge,description,hero_image,images,sizes,colors,catalog_node_id,created_at"
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim() || "Outros";
    const brand = String(body.brand ?? "").trim() || "Solid Choice";
    const catalog_node_id =
      typeof body.catalog_node_id === "string" && body.catalog_node_id.trim()
        ? body.catalog_node_id.trim()
        : null;
    const description = String(body.description ?? "").trim() || null;
    const badge = String(body.badge ?? "").trim() || category;

    const price_cents_raw = body.price_cents;
    const price_cents =
      typeof price_cents_raw === "number"
        ? Math.max(0, Math.round(price_cents_raw))
        : 0;

    const hero_image = (typeof body.hero_image === "string" && body.hero_image.trim()) || null;
    const images = toArray(body.images);
    const sizes = toArray(body.sizes);
    const colors = toArray(body.colors);

    if (!name) {
      return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
    }

    const slug = (typeof body.slug === "string" && body.slug.trim()) || slugify(name);

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        slug,
        category,
        brand,
        badge,
        description,
        price_cents,
        hero_image,
        images,
        sizes,
        colors,
        catalog_node_id,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const category = typeof body.category === "string" ? body.category.trim() : undefined;
    const brand = typeof body.brand === "string" ? body.brand.trim() : undefined;
    const badge = typeof body.badge === "string" ? body.badge.trim() : undefined;
    const description =
      typeof body.description === "string" ? body.description.trim() : undefined;

    const price_cents =
      typeof body.price_cents === "number" ? Math.max(0, Math.round(body.price_cents)) : undefined;

    const hero_image =
      typeof body.hero_image === "string" ? body.hero_image.trim() || null : undefined;
    const catalog_node_id =
      typeof body.catalog_node_id === "string" ? body.catalog_node_id.trim() || null : undefined;

    const images = body.images !== undefined ? toArray(body.images) : undefined;
    const sizes = body.sizes !== undefined ? toArray(body.sizes) : undefined;
    const colors = body.colors !== undefined ? toArray(body.colors) : undefined;

    const new_slug =
      typeof body.new_slug === "string" ? body.new_slug.trim() : undefined;

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (category !== undefined) patch.category = category;
    if (brand !== undefined) patch.brand = brand;
    if (badge !== undefined) patch.badge = badge;
    if (description !== undefined) patch.description = description || null;
    if (price_cents !== undefined) patch.price_cents = price_cents;
    if (hero_image !== undefined) patch.hero_image = hero_image;
    if (images !== undefined) patch.images = images;
    if (sizes !== undefined) patch.sizes = sizes;
    if (colors !== undefined) patch.colors = colors;
    if (catalog_node_id !== undefined) patch.catalog_node_id = catalog_node_id;

    if (new_slug !== undefined) {
      patch.slug = new_slug || (name ? slugify(name) : undefined);
    }

    const { error } = await supabaseAdmin.from("products").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    // evitar FK errors
    const { error: cartErr } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("product_id", id);
    if (cartErr) throw new Error(cartErr.message);

    const { error: orderErr } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("product_id", id);
    if (orderErr) throw new Error(orderErr.message);

    const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


