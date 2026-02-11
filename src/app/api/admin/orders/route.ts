import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { createStripePaymentIntent } from "@/lib/stripe";
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
      "id,user_id,status,total_cents,email,source,created_at,payment_link,public_token,gateway_provider,gateway_order_id,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_state,shipping_zip,shipping_notes,order_items(id,quantity,product:products(id,name,hero_image,slug))"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    // Mensagem mais clara se for erro de permissão
    if (auth.status === 403) {
      return NextResponse.json(
        { error: "Acesso negado. Seu usuário precisa estar na tabela admin_users do Supabase." },
        { status: 403 }
      );
    }
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

    const patch: {
      status?: string;
      payment_link?: string | null;
      gateway_provider?: string | null;
      gateway_order_id?: string | null;
    } = {};
    if (status) patch.status = status;
    if (body.payment_link !== undefined) {
      const link = String(body.payment_link ?? "").trim();
      patch.payment_link = link || null;
    }

    // Gera link automaticamente quando o admin coloca em "aguardando pagamento"
    if (status === "awaiting_payment" && !patch.payment_link) {
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select(
          "id,total_cents,email,public_token,gateway_order_id,order_items(quantity,product:products(name,price_cents))"
        )
        .eq("id", id)
        .single();
      if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

      const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "";

      const publicToken = order.public_token;
      if (!publicToken) {
        return NextResponse.json({ error: "Pedido sem token público." }, { status: 500 });
      }

      if (!order.gateway_order_id) {
        try {
          const intent = await createStripePaymentIntent({
            orderId: order.id,
            amountCents: Number(order.total_cents ?? 0),
            customerEmail: order.email,
          });
          patch.gateway_order_id = intent.payment_intent_id;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro ao criar pagamento no Stripe";
          return NextResponse.json({ error: msg }, { status: 500 });
        }
      }

      patch.payment_link = `${origin}/pagamento/${publicToken}`;
      patch.gateway_provider = "stripe";
    }

    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


