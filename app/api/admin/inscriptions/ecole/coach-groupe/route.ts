import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/admin/inscriptions/ecole/coach-groupe
 * body: { inscription_ids: string[], coach_id: string | null }
 * Affecte (ou retire) un coach à plusieurs élèves École d'un coup — utilisé par
 * la vue « Groupes École » pour affecter un coach à tout un créneau.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = (await request.json()) as {
    inscription_ids?: unknown;
    coach_id?: unknown;
  };
  const ids = Array.isArray(body.inscription_ids)
    ? body.inscription_ids.map(String).filter(Boolean)
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "inscription_ids requis" },
      { status: 400 },
    );
  }
  const coachId = body.coach_id ? String(body.coach_id).trim() || null : null;

  const { error } = await getSupabaseAdmin()
    .from("inscriptions_ecole")
    .update({ coach_id: coachId })
    .in("id", ids);
  if (error) {
    console.error("[coach-groupe POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: ids.length });
}
