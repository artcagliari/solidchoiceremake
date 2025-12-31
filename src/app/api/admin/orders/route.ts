import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id,user_id,status,total_cents,email,source,created_at,order_items(id,quantity,product:products(id,name,hero_image,slug))"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json()) as { id?: string; status?: string };
    const id = String(body.id ?? "").trim();
    const status = String(body.status ?? "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    if (!status) return NextResponse.json({ error: "status obrigatório" }, { status: 400 });

    const { error } = await supabaseAdmin.from("orders").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


