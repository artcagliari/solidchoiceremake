import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { defaultLandingContent } from "@/lib/landingContent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("landing_content")
      .select("content,updated_at")
      .eq("key", "default")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { content: defaultLandingContent, error: error.message },
        { status: 200 }
      );
    }

    const content = (data?.content ?? defaultLandingContent) as unknown;
    return NextResponse.json({ content, updated_at: data?.updated_at ?? null }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { content: defaultLandingContent, error: message },
      { status: 200 }
    );
  }
}


