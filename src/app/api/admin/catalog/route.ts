import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("catalog_nodes")
    .select("id,kind,parent_id,label,slug,logo_url,banner_url,sort_order,created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as {
      kind?: string;
      parent_id?: string | null;
      label?: string;
      slug?: string;
      logo_url?: string | null;
      banner_url?: string | null;
      sort_order?: number;
    };

    const kind = String(body.kind ?? "").trim();
    const label = String(body.label ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const parent_id = body.parent_id ? String(body.parent_id) : null;
    const logo_url = body.logo_url ? String(body.logo_url).trim() : null;
    const banner_url = body.banner_url ? String(body.banner_url).trim() : null;
    const sort_order = typeof body.sort_order === "number" ? Math.round(body.sort_order) : 0;

    if (!kind || !label || !slug) {
      return NextResponse.json({ error: "kind/label/slug obrigatórios" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("catalog_nodes")
      .insert({ kind, parent_id, label, slug, logo_url, banner_url, sort_order })
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
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as {
      id?: string;
      patch?: Partial<{
        kind: string;
        parent_id: string | null;
        label: string;
        slug: string;
        logo_url: string | null;
        banner_url: string | null;
        sort_order: number;
      }>;
    };

    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const patch = body.patch ?? {};
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k === "sort_order" && typeof v === "number") normalized[k] = Math.round(v);
      else if (k === "logo_url") normalized[k] = v ? String(v).trim() : null;
      else if (k === "banner_url") normalized[k] = v ? String(v).trim() : null;
      else if (v === null) normalized[k] = null;
      else if (typeof v === "string") normalized[k] = v.trim();
      else normalized[k] = v;
    }

    const { error } = await supabaseAdmin.from("catalog_nodes").update(normalized).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as { id?: string };
    const id = String(body.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const { error } = await supabaseAdmin.from("catalog_nodes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


