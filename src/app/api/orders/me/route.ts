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

export async function GET(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,status,total_cents,created_at,order_items(id,quantity,product:products(id,name,hero_image,slug,price_cents))"
      )
      .eq("user_id", auth.user.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


