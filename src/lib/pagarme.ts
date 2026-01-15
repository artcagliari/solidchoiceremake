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

const PAGARME_API_BASE = process.env.PAGARME_API_BASE || "https://api.pagar.me/core/v5";
const PAGARME_SECRET_KEY =
  process.env.PAGARME_SECRET_KEY ||
  process.env.PAGARME_API_KEY ||
  process.env.PAGARME_SECRET;

const CHECKOUT_PATH = process.env.PAGARME_CHECKOUT_PATH || "/checkouts";

function authHeader() {
  if (!PAGARME_SECRET_KEY) {
    throw new Error("PAGARME_SECRET_KEY não configurada");
  }
  const token = Buffer.from(`${PAGARME_SECRET_KEY}:`).toString("base64");
  return `Basic ${token}`;
}

function pickLink(data: any) {
  if (!data) return null;
  return (
    data.checkout_url ||
    data.url ||
    data.payment_url ||
    data.payment_link ||
    data?.checkout?.url ||
    null
  );
}

function pickId(data: any) {
  if (!data) return null;
  return data.id || data.checkout_id || data.order_id || null;
}

export async function createPagarmeCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  const origin = input.origin ?? "";
  const orderUrl = input.publicToken && origin ? `${origin}/pedido/${input.publicToken}` : null;

  const payload: Record<string, any> = {
    items: input.items.map((it) => ({
      amount: it.unit_price_cents,
      description: it.name,
      quantity: it.quantity,
    })),
    metadata: { order_id: input.orderId },
    customer: {
      name: input.customer?.name ?? "Cliente Solid Choice",
      email: input.customer?.email ?? undefined,
    },
    payment_methods: ["pix", "credit_card", "boleto"],
    success_url: orderUrl ?? undefined,
    cancel_url: orderUrl ?? undefined,
  };

  const res = await fetch(`${PAGARME_API_BASE}${CHECKOUT_PATH}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message = typeof json?.message === "string" ? json.message : text;
    throw new Error(message || `Erro Pagar.me: ${res.status}`);
  }

  return {
    payment_link: pickLink(json),
    gateway_order_id: pickId(json),
    raw: json,
  };
}
