import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ isAdmin: false }, { status: 200 });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return NextResponse.json({ isAdmin: false }, { status: 200 });

    const { data: row } = await supabaseAdmin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    return NextResponse.json({ isAdmin: Boolean(row?.user_id) }, { status: 200 });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}


