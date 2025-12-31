import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function requireUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) return { error: "Sem token", status: 401 as const };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: "Token inválido", status: 401 as const };
  return { user: data.user } as const;
}

const WHATSAPP_NUMBER = "5554992739597";

function formatCurrency(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Busca carrinho
    const { data: carts, error: cartErr } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    if (cartErr) throw new Error(cartErr.message);
    const cartId =
      Array.isArray(carts) && carts.length ? (carts[0]?.id as string) : null;
    if (!cartId) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("cart_items")
      .select("id,quantity,product:products(id,name,price_cents)")
      .eq("cart_id", cartId);
    if (itemsErr) throw new Error(itemsErr.message);

    const normalized = (items ?? []).map((it) => {
      const p = it.product as unknown as { id: string; name: string; price_cents: number | null };
      const qty = Number(it.quantity ?? 0);
      const price = typeof p.price_cents === "number" ? p.price_cents : 0;
      return {
        cart_item_id: it.id as string,
        product_id: p.id,
        name: p.name,
        quantity: qty,
        unit_price_cents: price,
        line_total_cents: price * qty,
      };
    }).filter((x) => x.quantity > 0);

    if (normalized.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    const total_cents = normalized.reduce((acc, x) => acc + x.line_total_cents, 0);

    // cria pedido
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: auth.user.id,
        status: "pending",
        total_cents,
        email: auth.user.email ?? null,
        source: "whatsapp",
      })
      .select("id")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    const order_id = order.id as string;

    const orderItemsPayloadFull = normalized.map((x) => ({
      order_id,
      product_id: x.product_id,
      quantity: x.quantity,
      unit_price_cents: x.unit_price_cents,
      line_total_cents: x.line_total_cents,
    }));

    const tryInsertItems = async () => {
      const { error } = await supabaseAdmin.from("order_items").insert(orderItemsPayloadFull);
      return error;
    };

    const errFull = await tryInsertItems();
    if (errFull) {
      // fallback para schemas mais simples (sem unit_price_cents/line_total_cents)
      const msg = errFull.message || "";
      const isMissingCols =
        msg.includes("line_total_cents") || msg.includes("unit_price_cents");

      if (!isMissingCols) throw new Error(errFull.message);

      const orderItemsPayloadMinimal = normalized.map((x) => ({
        order_id,
        product_id: x.product_id,
        quantity: x.quantity,
      }));

      const { error: errMin } = await supabaseAdmin
        .from("order_items")
        .insert(orderItemsPayloadMinimal);
      if (errMin) throw new Error(errMin.message);
    }

    // limpa carrinho
    const { error: clearErr } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId);
    if (clearErr) throw new Error(clearErr.message);

    // monta mensagem do whatsapp
    const lines = [
      "Olá! Quero finalizar minha cotação com a Solid Choice.",
      "",
      `Pedido: ${order_id}`,
      "",
      "Itens:",
      ...normalized.map(
        (x) =>
          `- ${x.name} x${x.quantity} (${formatCurrency(x.unit_price_cents)}) = ${formatCurrency(
            x.line_total_cents
          )}`
      ),
      "",
      `Total: ${formatCurrency(total_cents)}`,
      "",
      "Pode me orientar nos próximos passos?",
    ];

    const text = encodeURIComponent(lines.join("\n"));
    const whatsapp_url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

    return NextResponse.json({ ok: true, order_id, whatsapp_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


