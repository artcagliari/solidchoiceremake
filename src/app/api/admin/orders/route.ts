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
      "id,user_id,status,total_cents,email,source,created_at,payment_link,public_token,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_state,shipping_zip,shipping_notes,order_items(id,quantity,product:products(id,name,hero_image,slug))"
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
    const body = (await req.json()) as {
      id?: string;
      status?: string;
      payment_link?: string | null;
    };
    const id = String(body.id ?? "").trim();
    const status = String(body.status ?? "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    if (!status && !body.payment_link) {
      return NextResponse.json({ error: "status ou payment_link obrigatório" }, { status: 400 });
    }

    const patch: { status?: string; payment_link?: string | null } = {};
    if (status) patch.status = status;
    if (body.payment_link !== undefined) {
      const link = String(body.payment_link ?? "").trim();
      patch.payment_link = link || null;
    }

    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


