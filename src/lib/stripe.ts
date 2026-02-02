import Stripe from "stripe";

type CreateCheckoutInput = {
  orderId: string;
  amountCents: number;
  items: Array<{ name: string; quantity: number; unit_price_cents: number }>;
  customer?: { name?: string | null; email?: string | null };
  origin?: string;
  publicToken?: string | null;
};

type CreateCheckoutResult = {
  payment_link: string | null;
  gateway_order_id: string | null;
  raw: unknown;
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

function getStripeClient() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
  });
}

function getPaymentMethods(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const raw = process.env.STRIPE_PAYMENT_METHODS;
  if (!raw) return ["card"];
  const allowed = new Set<Stripe.Checkout.SessionCreateParams.PaymentMethodType>([
    "card",
    "pix",
    "boleto",
  ]);
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Stripe.Checkout.SessionCreateParams.PaymentMethodType => allowed.has(s as any));
  return parsed.length > 0 ? parsed : ["card"];
}

export async function createStripeCheckout(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const origin = input.origin ?? "";
  const orderUrl = input.publicToken && origin ? `${origin}/pedido/${input.publicToken}` : null;
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: getPaymentMethods(),
    line_items: input.items.map((it) => ({
      quantity: it.quantity,
      price_data: {
        currency: "brl",
        unit_amount: it.unit_price_cents,
        product_data: {
          name: it.name,
        },
      },
    })),
    customer_email: input.customer?.email ?? undefined,
    success_url: orderUrl ?? `${origin}/pedido/${input.publicToken ?? ""}`,
    cancel_url: orderUrl ?? `${origin}/pedido/${input.publicToken ?? ""}`,
    metadata: { order_id: input.orderId },
    client_reference_id: input.orderId,
    payment_intent_data: {
      metadata: { order_id: input.orderId },
    },
  });

  return {
    payment_link: session.url ?? null,
    gateway_order_id: session.id,
    raw: session,
  };
}
