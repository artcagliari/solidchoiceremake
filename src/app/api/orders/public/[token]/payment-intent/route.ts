import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { createStripePaymentIntent, retrieveStripePaymentIntent } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token: tokenParam } = await params;
    const token = String(tokenParam ?? "").trim();
    if (!token) return NextResponse.json({ error: "Token inválido" }, { status: 400 });

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,status,total_cents,email,public_token,gateway_order_id,gateway_provider")
      .eq("public_token", token)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    if (order.status && ["paid", "canceled"].includes(order.status)) {
      return NextResponse.json({ error: "Pedido não pode ser pago." }, { status: 400 });
    }

    let client_secret: string | null = null;
    let payment_intent_id = order.gateway_order_id;

    if (payment_intent_id) {
      const intent = await retrieveStripePaymentIntent(payment_intent_id);
      client_secret = intent.client_secret ?? null;
    } else {
      const intent = await createStripePaymentIntent({
        orderId: order.id,
        amountCents: Number(order.total_cents ?? 0),
        customerEmail: order.email,
      });
      payment_intent_id = intent.payment_intent_id;
      client_secret = intent.client_secret;
      const { error: updateErr } = await supabaseAdmin
        .from("orders")
        .update({
          gateway_provider: "stripe",
          gateway_order_id: payment_intent_id,
        })
        .eq("id", order.id);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!client_secret) {
      return NextResponse.json({ error: "Stripe não retornou client_secret." }, { status: 500 });
    }

    return NextResponse.json({ client_secret }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
