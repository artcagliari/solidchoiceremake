import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function mapStatus(input?: string | null) {
  const s = (input ?? "").toLowerCase();
  if (["paid", "approved", "authorized", "captured"].includes(s)) return "paid";
  if (["canceled", "failed", "refused"].includes(s)) return "canceled";
  return null;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    const expected = process.env.PAGARME_WEBHOOK_TOKEN ?? "";
    if (expected && token !== expected) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const text = await req.text();
    const payload = text ? JSON.parse(text) : {};
    const event = payload.type || payload.event || payload?.data?.type || "";
    const data = payload.data || payload.object || payload;

    const externalStatus = data?.status || data?.charge?.status || data?.order?.status || "";
    const mappedStatus =
      mapStatus(externalStatus) ||
      (typeof event === "string" && event.includes("paid") ? "paid" : null);

    const metaOrderId = data?.metadata?.order_id || data?.order?.metadata?.order_id || null;
    const externalOrderId = data?.order?.id || data?.order_id || data?.id || null;

    if (!metaOrderId && !externalOrderId) {
      return NextResponse.json({ ok: true });
    }

    const patch: Record<string, any> = {
      gateway_provider: "pagarme",
    };
    if (mappedStatus) patch.status = mappedStatus;
    if (externalOrderId) patch.gateway_order_id = externalOrderId;

    let query = supabaseAdmin.from("orders").update(patch);
    if (metaOrderId) {
      query = query.eq("id", metaOrderId);
    } else if (externalOrderId) {
      query = query.eq("gateway_order_id", externalOrderId);
    }

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
