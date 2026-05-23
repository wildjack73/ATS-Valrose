import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST : ajoute une assignation coach (semaine, jour, session, coach).
 * body: { semaine_id, jour, session, coach_id }
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = (await request.json()) as {
    semaine_id?: string;
    jour?: string;
    session?: string;
    coach_id?: string;
  };
  if (!body.semaine_id || !body.jour || !body.session) {
    return NextResponse.json(
      { error: "semaine_id, jour et session sont requis" },
      { status: 400 },
    );
  }
  const { data, error } = await getSupabaseAdmin()
    .from("stage_organisations")
    .insert({
      semaine_id: body.semaine_id,
      jour: body.jour,
      session: body.session,
      coach_id: body.coach_id ?? null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[stage-org POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
