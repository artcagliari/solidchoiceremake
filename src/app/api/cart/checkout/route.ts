import { NextResponse } from "next/server";
import crypto from "crypto";
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
      .select("id,quantity,size,box_option,product:products(id,name,price_cents)")
      .eq("cart_id", cartId);
    if (itemsErr) throw new Error(itemsErr.message);

    type NormalizedItem = {
      cart_item_id: string;
      product_id: string;
      name: string;
      size: string | null;
      box_option: string | null;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    };

    const normalized = (items ?? []).map((it: any): NormalizedItem => {
      const p = it.product as unknown as { id: string; name: string; price_cents: number | null };
      const qty = Number(it.quantity ?? 0);
      const price = typeof p.price_cents === "number" ? p.price_cents : 0;
      const size = (it as unknown as { size?: string | null }).size ?? null;
      const box_option = (it as unknown as { box_option?: string | null }).box_option ?? null;
      return {
        cart_item_id: it.id as string,
        product_id: p.id,
        name: p.name,
        size,
        box_option,
        quantity: qty,
        unit_price_cents: price,
        line_total_cents: price * qty,
      };
    }).filter((x: NormalizedItem): x is NormalizedItem => x.quantity > 0);

    if (normalized.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    const total_cents = normalized.reduce(
      (acc: number, x: NormalizedItem) => acc + x.line_total_cents,
      0
    );

    // cria pedido
    const public_token = crypto.randomUUID();
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: auth.user.id,
        status: "pending",
        total_cents,
        email: auth.user.email ?? null,
        source: "whatsapp",
        public_token,
      })
      .select("id")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    const order_id = order.id as string;

    const orderItemsPayloadFull = normalized.map((x: NormalizedItem) => ({
      order_id,
      product_id: x.product_id,
      size: x.size,
      box_option: x.box_option,
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
        msg.includes("line_total_cents") || msg.includes("unit_price_cents") || msg.includes("size");

      if (!isMissingCols) throw new Error(errFull.message);

      // tenta primeiro um payload "intermediário" com size (se existir) e sem preços
      const orderItemsPayloadMid = normalized.map((x) => ({
        order_id,
        product_id: x.product_id,
        size: x.size,
        box_option: x.box_option,
        quantity: x.quantity,
      }));

      const { error: errMid } = await supabaseAdmin
        .from("order_items")
        .insert(orderItemsPayloadMid);
      if (errMid) {
        const msg2 = errMid.message || "";
        const isMissingSize = msg2.includes("size");
        if (!isMissingSize) throw new Error(errMid.message);
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
    }

    // limpa carrinho
    const { error: clearErr } = await supabaseAdmin
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId);
    if (clearErr) throw new Error(clearErr.message);

    // monta mensagem do whatsapp
    const customerEmail = auth.user.email ?? "sem e-mail";
    const lines = [
      "Olá! Quero finalizar minha cotação com a Solid Choice.",
      "",
      `Cliente (e-mail): ${customerEmail}`,
      "",
      `Pedido: ${order_id}`,
      "",
      "Itens:",
      ...normalized.map((x) => {
        const sizePart = x.size ? ` · Tam: ${x.size}` : "";
        const boxPart = x.box_option ? ` · Caixa: ${x.box_option === "sem" ? "Sem" : "Com"}` : "";
        return `- ${x.name}${sizePart}${boxPart} x${x.quantity} (${formatCurrency(x.unit_price_cents)}) = ${formatCurrency(
          x.line_total_cents
        )}`;
      }),
      "",
      `Total: ${formatCurrency(total_cents)}`,
      "",
      "Pode me orientar nos próximos passos?",
    ];

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const order_public_url = public_token ? `${origin}/pedido/${public_token}` : null;
    if (order_public_url) {
      lines.push("", `Link do pedido: ${order_public_url}`);
    }

    const text = encodeURIComponent(lines.join("\n"));
    const whatsapp_url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

    return NextResponse.json({ ok: true, order_id, public_token, order_public_url, whatsapp_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


