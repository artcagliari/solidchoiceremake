import { supabaseAdmin } from "@/lib/supabaseServer";

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function requireAdmin(req: Request) {
  const token = getBearerToken(req);
  if (!token) return { ok: false as const, status: 401, error: "Sem token" };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false as const, status: 401, error: "Token inválido" };
  }

  const { data: isAdmin, error: adminErr } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminErr) {
    return { ok: false as const, status: 500, error: adminErr.message };
  }
  if (!isAdmin?.user_id) {
    return { ok: false as const, status: 403, error: "Acesso negado (não admin)" };
  }

  return { ok: true as const, user: data.user };
}


