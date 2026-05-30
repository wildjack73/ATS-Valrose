import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PostBody {
  nom?: string;
  couleur?: string | null;
}

/** POST /api/admin/coaches — crée un nouveau coach */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const nom = body.nom?.trim();
  if (!nom) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  // Place le nouveau en queue (order_idx max + 10)
  const { data: maxRow } = await supa
    .from("coaches")
    .select("order_idx")
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();
  const order_idx = ((maxRow?.order_idx as number | undefined) ?? 0) + 10;

  const { data, error } = await supa
    .from("coaches")
    .insert({
      nom,
      couleur: body.couleur || null,
      actif: true,
      order_idx,
    })
    .select("*")
    .single();

  if (error) {
    console.error("POST coaches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, coach: data });
}
