import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("name,badge,price_cents,hero_image,category,slug")
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      return NextResponse.json(
        { error: error.message, items: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}


