import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { defaultLandingContent } from "@/lib/landingContent";
import { requireAdmin } from "../_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("landing_content")
    .select("content,updated_at")
    .eq("key", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ content: defaultLandingContent, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ content: data?.content ?? defaultLandingContent, updated_at: data?.updated_at ?? null }, { status: 200 });
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as { content?: unknown };
    if (!body || body.content === undefined) {
      return NextResponse.json({ error: "content obrigatório" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("landing_content")
      .upsert({ key: "default", content: body.content }, { onConflict: "key" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


