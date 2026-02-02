import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-01-28.clover" });
}

function mapStatus(eventType: string) {
  const t = eventType.toLowerCase();
  if (t.includes("payment_intent.succeeded") || t.includes("checkout.session.completed")) {
    return "paid";
  }
  if (
    t.includes("payment_intent.payment_failed") ||
    t.includes("charge.failed") ||
    t.includes("checkout.session.expired")
  ) {
    return "canceled";
  }
  if (t.includes("checkout.session.async_payment_succeeded")) {
    return "paid";
  }
  if (t.includes("checkout.session.async_payment_failed")) {
    return "canceled";
  }
  return null;
}

export async function POST(req: Request) {
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET não configurada" }, { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
    }

    const payload = await req.text();
    const stripe = getStripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assinatura inválida";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const mappedStatus = mapStatus(event.type);
    const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent | Stripe.Charge;
    const orderId =
      (obj as Stripe.Checkout.Session).metadata?.order_id ||
      (obj as Stripe.PaymentIntent).metadata?.order_id ||
      (obj as Stripe.Checkout.Session).client_reference_id ||
      null;

    if (!orderId) {
      return NextResponse.json({ ok: true });
    }

    const gatewayOrderId =
      (obj as Stripe.Checkout.Session).id || (obj as Stripe.PaymentIntent).id || null;

    const patch: Record<string, any> = {
      gateway_provider: "stripe",
    };
    if (mappedStatus) patch.status = mappedStatus;
    if (gatewayOrderId) patch.gateway_order_id = gatewayOrderId;

    if (event.type === "checkout.session.completed") {
      const session = obj as Stripe.Checkout.Session;
      const shipping = session.shipping_details;
      const address = shipping?.address;
      if (shipping?.name) patch.shipping_name = shipping.name;
      if (shipping?.phone) patch.shipping_phone = shipping.phone;
      if (address?.line1 || address?.line2) {
        patch.shipping_address = [address.line1, address.line2].filter(Boolean).join(", ");
      }
      if (address?.city) patch.shipping_city = address.city;
      if (address?.state) patch.shipping_state = address.state;
      if (address?.postal_code) patch.shipping_zip = address.postal_code;
    }

    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
