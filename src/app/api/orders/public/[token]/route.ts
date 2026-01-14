import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const token = String(params.token ?? "").trim();
    if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,total_cents,created_at,payment_link,public_token,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_state,shipping_zip,shipping_notes,order_items(id,quantity,product:products(id,name,hero_image,price_cents))"
      )
      .eq("public_token", token)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    return NextResponse.json({ item: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { token: string } }) {
  try {
    const token = String(params.token ?? "").trim();
    if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

    const body = (await req.json()) as Partial<{
      shipping_name: string;
      shipping_phone: string;
      shipping_address: string;
      shipping_city: string;
      shipping_state: string;
      shipping_zip: string;
      shipping_notes: string;
    }>;

    const patch = {
      shipping_name: (body.shipping_name ?? "").trim() || null,
      shipping_phone: (body.shipping_phone ?? "").trim() || null,
      shipping_address: (body.shipping_address ?? "").trim() || null,
      shipping_city: (body.shipping_city ?? "").trim() || null,
      shipping_state: (body.shipping_state ?? "").trim() || null,
      shipping_zip: (body.shipping_zip ?? "").trim() || null,
      shipping_notes: (body.shipping_notes ?? "").trim() || null,
    };

    const { error } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("public_token", token);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
