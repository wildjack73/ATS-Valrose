import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/admin/groupes-ecole/[id]/membres
 * body: { inscription_id: string }
 * Ajoute une inscription école au groupe.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: groupeId } = await params;
  const body = (await request.json()) as { inscription_id?: string };
  if (!body.inscription_id) {
    return NextResponse.json(
      { error: "inscription_id requis" },
      { status: 400 },
    );
  }
  const { error } = await getSupabaseAdmin()
    .from("inscriptions_groupes")
    .insert({
      groupe_id: groupeId,
      inscription_id: body.inscription_id,
    });
  if (error) {
    console.error("[membres POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/groupes-ecole/[id]/membres?inscription_id=xxx
 * Retire une inscription du groupe.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id: groupeId } = await params;
  const url = new URL(request.url);
  const inscriptionId = url.searchParams.get("inscription_id");
  if (!inscriptionId) {
    return NextResponse.json(
      { error: "inscription_id requis" },
      { status: 400 },
    );
  }
  const { error } = await getSupabaseAdmin()
    .from("inscriptions_groupes")
    .delete()
    .eq("groupe_id", groupeId)
    .eq("inscription_id", inscriptionId);
  if (error) {
    console.error("[membres DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
