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
      .from("user_addresses")
      .select("name,phone,address,city,state,zip,notes,updated_at")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data ?? null }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as Partial<{
      name: string;
      phone: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      notes: string;
    }>;

    const payload = {
      user_id: auth.user.id,
      name: (body.name ?? "").trim() || null,
      phone: (body.phone ?? "").trim() || null,
      address: (body.address ?? "").trim() || null,
      city: (body.city ?? "").trim() || null,
      state: (body.state ?? "").trim() || null,
      zip: (body.zip ?? "").trim() || null,
      notes: (body.notes ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("user_addresses")
      .upsert(payload, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
