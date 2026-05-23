import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUTS_VALIDES = ["en_attente", "paye", "annule"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as { statut?: string };
  if (!body.statut || !STATUTS_VALIDES.includes(body.statut as never)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  const { error } = await getSupabaseAdmin()
    .from("inscriptions_stages")
    .update({ statut: body.statut })
    .eq("id", id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Échec mise à jour" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
