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
  return { user: data.user, token } as const;
}

async function ensureCart(userId: string) {
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (findErr) throw new Error(findErr.message);
  const firstId = Array.isArray(existing) && existing.length ? existing[0]?.id : null;
  if (firstId) return firstId as string;

  const { data: created, error: createErr } = await supabaseAdmin
    .from("carts")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (createErr) throw new Error(createErr.message);
  return created.id as string;
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const cartId = await ensureCart(auth.user.id);
    const { data, error } = await supabaseAdmin
      .from("cart_items")
      .select(
        "id,quantity,product:products(id,name,price_cents,hero_image,slug,category)"
      )
      .eq("cart_id", cartId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cart_id: cartId, items: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as {
      product_id?: string;
      quantity?: number;
    };
    const product_id = body.product_id;
    const quantity = typeof body.quantity === "number" ? body.quantity : 1;

    if (!product_id) {
      return NextResponse.json({ error: "product_id obrigatório" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "quantity inválida" },
        { status: 400 }
      );
    }

    const cartId = await ensureCart(auth.user.id);

    const { data: existing, error: findErr } = await supabaseAdmin
      .from("cart_items")
      .select("id,quantity")
      .eq("cart_id", cartId)
      .eq("product_id", product_id)
      .maybeSingle();

    if (findErr) throw new Error(findErr.message);

    if (existing?.id) {
      const newQty = (existing.quantity as number) + quantity;
      const { error: updErr } = await supabaseAdmin
        .from("cart_items")
        .update({ quantity: newQty })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      return NextResponse.json({ ok: true, item_id: existing.id, quantity: newQty });
    }

    const { data: created, error: insErr } = await supabaseAdmin
      .from("cart_items")
      .insert({ cart_id: cartId, product_id, quantity })
      .select("id,quantity")
      .single();

    if (insErr) throw new Error(insErr.message);
    return NextResponse.json({ ok: true, item_id: created.id, quantity: created.quantity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as { item_id?: string; quantity?: number };
    const item_id = body.item_id;
    const quantity = body.quantity;
    if (!item_id) {
      return NextResponse.json({ error: "item_id obrigatório" }, { status: 400 });
    }
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ error: "quantity inválida" }, { status: 400 });
    }

    if (quantity === 0) {
      const { error: delErr } = await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("id", item_id);
      if (delErr) throw new Error(delErr.message);
      return NextResponse.json({ ok: true, deleted: true });
    }

    const { error: updErr } = await supabaseAdmin
      .from("cart_items")
      .update({ quantity })
      .eq("id", item_id);
    if (updErr) throw new Error(updErr.message);
    return NextResponse.json({ ok: true, quantity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as { item_id?: string };
    const item_id = body.item_id;
    if (!item_id) {
      return NextResponse.json({ error: "item_id obrigatório" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("cart_items").delete().eq("id", item_id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


